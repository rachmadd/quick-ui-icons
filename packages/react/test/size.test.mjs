// Size and tree-shaking checks on the built package (packages/react/dist).
//
// Budgets live in size-budget.json, written by scripts/size-budget.mjs. An icon
// over its budget fails here; if the growth is intended, rerun that script and
// commit the new budget with the change that caused it.

import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { gzipSync } from "node:zlib"
import { build } from "esbuild"
import { measureIconSizes } from "../../../scripts/lib/size.mjs"

const ROOT = fileURLToPath(new URL("../../..", import.meta.url))
const DIST = join(ROOT, "packages", "react", "dist")
const SRC = join(ROOT, "packages", "react", "src")
const BUDGET = JSON.parse(readFileSync(new URL("./size-budget.json", import.meta.url), "utf8"))
/** What bundling adds around one icon and the wrapper: the jsx-runtime import and module glue. */
const BUNDLE_OVERHEAD = 96
const UPDATE = "If the change is intended, run `pnpm build && node scripts/size-budget.mjs` and commit the budget."

const sizes = await measureIconSizes(DIST)

for (const set of ["rounded", "sharp"]) {
  test(`${set}: every icon is within its size budget`, () => {
    const over = Object.entries(sizes[set])
      .filter(([name, bytes]) => !(name in BUDGET[set]) || bytes > BUDGET[set][name])
      .map(([name, bytes]) => `${name}: ${bytes} B, budget ${BUDGET[set][name] ?? "none"}`)
    const stale = Object.keys(BUDGET[set]).filter((name) => !(name in sizes[set]))
    assert.deepEqual(over, [], `${over.length} icons over budget or without one. ${UPDATE}`)
    assert.deepEqual(stale, [], `budgets for icons that no longer exist. ${UPDATE}`)
  })
}

test("the shared wrapper is within its size budget", () => {
  assert.ok(sizes.wrapper <= BUDGET.wrapper, `wrapper is ${sizes.wrapper} B, budget ${BUDGET.wrapper}. ${UPDATE}`)
})

/** Every icon's path strings, per entry point, from the generated source. */
function drawings() {
  const out = []
  for (const [set, dir] of [["rounded", "icons"], ["sharp", join("sharp", "icons")]]) {
    for (const file of readdirSync(join(SRC, dir))) {
      const text = readFileSync(join(SRC, dir, file), "utf8")
      out.push({ set, name: file.replace(/\.tsx$/, ""), paths: [...text.matchAll(/ d="([^"]+)"/g)].map(([, d]) => d) })
    }
  }
  return out
}
const ALL = drawings()

/** Bundles an app importing `names` from one entry point, minified, with React left external. */
async function bundle(set, names) {
  const entry = set === "rounded" ? join(DIST, "index.js") : join(DIST, "sharp", "index.js")
  const imports = names.map((n) => `${n.split("-").map((p) => p[0].toUpperCase() + p.slice(1)).join("")}Icon`)
  const result = await build({
    stdin: { contents: `import { ${imports.join(", ")} } from ${JSON.stringify(entry)}\nexport default [${imports.join(", ")}]\n`, resolveDir: ROOT },
    bundle: true,
    minify: true,
    format: "esm",
    write: false,
    external: ["react", "react/jsx-runtime"],
    logLevel: "silent",
  })
  return result.outputFiles[0].text
}

/**
 * The icons whose drawings a bundle contains. An icon counts when its longest
 * path is in the bundle and isn't merely part of an imported icon's path
 * (`dot` is a piece of `info`'s circle).
 */
function contained(text, set, names) {
  const importedPaths = ALL.filter((d) => d.set === set && names.includes(d.name)).flatMap((d) => d.paths)
  return ALL.filter((d) => {
    const longest = [...d.paths].sort((a, b) => b.length - a.length)[0]
    if (!text.includes(longest)) return false
    const isImported = d.set === set && names.includes(d.name)
    return isImported || !importedPaths.some((p) => p.includes(longest))
  }).map((d) => `${d.set}:${d.name}`)
}

for (const set of ["rounded", "sharp"]) {
  test(`${set}: importing one icon from the barrel ships that icon and no other`, async () => {
    const text = await bundle(set, ["star"])
    assert.deepEqual(contained(text, set, ["star"]), [`${set}:star`])
    const budget = BUDGET[set].star + BUDGET.wrapper + BUNDLE_OVERHEAD
    const gzip = gzipSync(text, { level: 9 }).length
    assert.ok(gzip <= budget, `one icon bundles to ${gzip} B gzipped, budget ${budget} B`)
  })

  test(`${set}: importing three icons ships exactly those three`, async () => {
    const names = ["star", "check", "calendar"]
    const text = await bundle(set, names)
    assert.deepEqual(contained(text, set, names).sort(), names.map((n) => `${set}:${n}`).sort())
  })
}
