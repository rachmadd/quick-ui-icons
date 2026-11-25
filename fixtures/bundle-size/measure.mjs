// Measures what apps ship when they import 1, 3 and 30 icons, from
// @quick-ui/icons (rounded and sharp) and from @keyline-icons/react 2.6.0.
//
//   node fixtures/bundle-size/measure.mjs [--skip-next] [--skip-dev]
//
// It builds and packs packages/react the way npm would ship it, installs that
// tarball with this fixture's pinned dependencies in .work/phase-2/run, and
// writes .work/phase-2/results.json and results.md. Takes a few minutes; it's
// not part of CI. See README.md.

import { mkdir, readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { nextBuild, viteBuild, writeApps } from "./builds.mjs"
import { nextDev, viteDev } from "./dev.mjs"
import { checkContents, fingerprints, run } from "./lib.mjs"
import { scenarios } from "./scenarios.mjs"

const HERE = fileURLToPath(new URL(".", import.meta.url))
const ROOT = join(HERE, "..", "..")
const OUT = join(ROOT, ".work", "phase-2")
const RUN = join(OUT, "run")
const DEV_PORT = 3417
const skip = (flag) => process.argv.includes(flag)
const log = (message) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${message}`)

async function packAndInstall() {
  log("building and packing packages/react")
  await run("pnpm", ["build"], { cwd: ROOT })
  await mkdir(RUN, { recursive: true })
  const packed = await run("pnpm", ["pack", "--pack-destination", OUT], { cwd: join(ROOT, "packages", "react") })
  const tarball = packed.trim().split("\n").filter((l) => l.endsWith(".tgz")).pop()
  const pkg = JSON.parse(await readFile(join(HERE, "package.json"), "utf8"))
  const withPackage = { ...pkg, dependencies: { ...pkg.dependencies, "@quick-ui/icons": `file:${tarball}` } }
  await writeFile(join(RUN, "package.json"), JSON.stringify(withPackage, null, 2))
  // Its own workspace, so pnpm doesn't treat the run as part of this repo, and
  // esbuild (Vite's) may run its install script, which pnpm 11+ blocks by default.
  await writeFile(join(RUN, "pnpm-workspace.yaml"), "packages: []\nallowBuilds:\n  esbuild: true\n")
  log("installing fixture dependencies")
  await run("pnpm", ["install", "--force"], { cwd: RUN })
  return tarball
}

/** Bytes and gzip relative to the baseline, plus the icon-content check. */
function row(scenario, result, baseline, prints) {
  const contents = scenario.set === "keyline" ? null : checkContents(result.text, scenario, prints)
  return {
    scenario: scenario.id,
    bytes: result.bytes,
    gzip: result.gzip,
    deltaBytes: result.bytes - baseline.bytes,
    deltaGzip: result.gzip - baseline.gzip,
    contents,
  }
}

async function productionBuilds(prints, kind, build) {
  const list = scenarios()
  const baseline = await build(list[0])
  const rows = [row(list[0], baseline, baseline, prints)]
  for (const scenario of list.slice(1)) {
    log(`${kind}: ${scenario.id}`)
    rows.push(row(scenario, await build(scenario), baseline, prints))
  }
  return rows
}

async function devCosts() {
  const pick = (id) => scenarios().find((s) => s.id === id)
  const ids = ["base", "quick-30", "quick-sharp-30", "keyline-30"]
  const vite = []
  for (const id of ids) {
    log(`vite dev: ${id}`)
    const { bytes, gzip, files } = await viteDev(RUN, pick(id))
    vite.push({ scenario: id, bytes, gzip, files })
  }
  const next = []
  if (!skip("--skip-next")) {
    for (const [id, optimize] of [["base", false], ["quick-30", false], ["quick-30", true], ["keyline-30", false]]) {
      log(`next dev: ${id}${optimize ? " (optimizePackageImports)" : ""}`)
      next.push({ scenario: id, optimizePackageImports: optimize, ...(await nextDev(RUN, pick(id), { optimize, port: DEV_PORT })) })
    }
  }
  return { vite, next }
}

const kb = (n) => `${(n / 1024).toFixed(1)} KB`
const signed = (n) => `${n >= 0 ? "+" : ""}${n.toLocaleString("en")}`

function table(title, rows) {
  const head = `### ${title}\n\n| Scenario | JS | gzip | + JS over base | + gzip over base | Unused icons found | Imported icons missing |\n| --- | ---: | ---: | ---: | ---: | --- | --- |\n`
  const body = rows
    .map((r) => {
      const leaked = r.contents ? `${r.contents.leaked.length} of ${r.contents.checked} checked` : "not checked"
      const missing = r.contents ? String(r.contents.missing.length) : "–"
      return `| ${r.scenario} | ${kb(r.bytes)} | ${kb(r.gzip)} | ${signed(r.deltaBytes)} B | ${signed(r.deltaGzip)} B | ${leaked} | ${missing} |`
    })
    .join("\n")
  return `${head}${body}\n`
}

function devTable({ vite, next }) {
  const viteRows = vite.map((r) => `| ${r.scenario} | ${kb(r.bytes)} | ${kb(r.gzip)} | ${r.files} |`).join("\n")
  const nextRows = next
    .map((r) => `| ${r.scenario}${r.optimizePackageImports ? " + optimizePackageImports" : ""} | ${kb(r.bytes)} | ${r.scripts} | ${r.compiled} |`)
    .join("\n")
  return (
    `### Vite dev: pre-bundled dependency JS\n\n| Scenario | JS | gzip | Files |\n| --- | ---: | ---: | ---: |\n${viteRows}\n\n` +
    (next.length ? `### Next dev: client JS the page loads\n\n| Scenario | JS | Scripts | First compile |\n| --- | ---: | ---: | --- |\n${nextRows}\n` : "")
  )
}

async function main() {
  const tarball = await packAndInstall()
  await writeApps(RUN)
  const prints = await fingerprints(join(ROOT, "packages", "react", "src"))
  const results = { date: new Date().toISOString(), tarball, icons: prints.length / 2 }

  results.vite = await productionBuilds(prints, "vite", (s) => viteBuild(RUN, s))
  if (!skip("--skip-next")) {
    results.nextClient = await productionBuilds(prints, "next client", (s) => nextBuild(RUN, s, { client: true }))
    const server = scenarios().filter((s) => ["base", "quick-30", "keyline-30"].includes(s.id))
    const base = await nextBuild(RUN, server[0], { client: false })
    // Rendered on the server, no icon should reach client JS, imported or not.
    const none = (s) => ({ ...s, entry: null, names: [], set: s.set === "keyline" ? "keyline" : "quick" })
    results.nextServer = [row(none(server[0]), base, base, prints)]
    for (const s of server.slice(1)) {
      log(`next server components: ${s.id}`)
      results.nextServer.push(row(none(s), await nextBuild(RUN, s, { client: false }), base, prints))
    }
  }
  if (!skip("--skip-dev")) results.dev = await devCosts()

  const markdown = [
    `# Bundle size, ${results.date.slice(0, 10)}`,
    table("Vite 7 production build", results.vite),
    results.nextClient && table("Next 16 production build, icons in a client component", results.nextClient),
    results.nextServer && table("Next 16 production build, icons in a server component (client JS)", results.nextServer),
    results.dev && devTable(results.dev),
  ]
    .filter(Boolean)
    .join("\n")
  await writeFile(join(OUT, "results.json"), JSON.stringify(results, (k, v) => (k === "text" ? undefined : v), 2))
  await writeFile(join(OUT, "results.md"), markdown)
  console.log(markdown)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
