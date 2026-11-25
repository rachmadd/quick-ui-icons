// Generates @quick-ui/icons (packages/react/src) from the built SVGs in icons/.
//
//   node scripts/generate.mjs            write packages/react/src
//   node scripts/generate.mjs --check    write nothing; exit 1 if src would change
//
// Two entry points with the same names: `@quick-ui/icons` from icons/ (rounded)
// and `@quick-ui/icons/sharp` from icons/sharp/. Each icon is one module whose
// function picks its outline, fill or duotone drawing by `variant`, so an app
// ships only the icons it imports. Two-tone isn't built.
//
// src/ is gitignored: `pnpm build` and `pnpm icons:ci` run this before tsc.

import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises"
import { dirname, join, relative } from "node:path"
import { fileURLToPath } from "node:url"
import { loadIcons } from "./lib/source.mjs"
import { emitBarrel, emitIconFile, emitWrapper, exportNames } from "./lib/emit.mjs"

const ROOT = fileURLToPath(new URL("..", import.meta.url))
const OUT = join(ROOT, "packages", "react", "src")

const ENTRY_POINTS = [
  { label: "rounded", icons: "icons", dir: "", wrapperFromIcon: "../icon.js", wrapperFromBarrel: "./icon.js" },
  { label: "sharp", icons: "icons/sharp", dir: "sharp", wrapperFromIcon: "../../icon.js", wrapperFromBarrel: "../icon.js" },
]

const color = (code, text) => `\x1b[${code}m${text}\x1b[0m`

/** Fails with the names involved if two icons would export the same binding. */
function assertUniqueExports(icons, label) {
  const owner = new Map()
  for (const { name } of icons) {
    for (const exported of exportNames(name)) {
      if (owner.has(exported))
        throw new Error(`${label}: ${name} and ${owner.get(exported)} both export ${exported}`)
      owner.set(exported, name)
    }
  }
}

/** Fails if the two entry points don't export exactly the same icons. */
function assertSameNames(sets) {
  const [a, b] = sets.map(({ icons }) => new Set(icons.map(({ name }) => name)))
  const onlyA = [...a].filter((n) => !b.has(n))
  const onlyB = [...b].filter((n) => !a.has(n))
  if (onlyA.length || onlyB.length)
    throw new Error(`rounded and sharp differ. Only rounded: ${onlyA.join(", ") || "none"}. Only sharp: ${onlyB.join(", ") || "none"}.`)
}

const pathBytes = (drawing) =>
  drawing.elements.reduce((sum, { attrs }) => sum + (attrs.find(([k]) => k === "d")?.[1].length ?? 0), 0)

/** Bytes of path data written, counting a drawing shared by two variants once. */
const emittedBytes = ({ drawings }) =>
  [...new Map(Object.values(drawings).map((d) => [JSON.stringify(d), d])).values()].reduce((s, d) => s + pathBytes(d), 0)

/** Every file the package source should hold, as Map<relative path, text>. */
async function buildFiles() {
  const files = new Map([["icon.tsx", emitWrapper()]])
  const sets = []
  for (const entry of ENTRY_POINTS) {
    const icons = await loadIcons(join(ROOT, entry.icons), entry.icons)
    assertUniqueExports(icons, entry.label)
    for (const icon of icons) {
      const source = `${entry.icons}/{stroke,fill,duotone}/${icon.name}.svg`
      files.set(join(entry.dir, "icons", `${icon.name}.tsx`), emitIconFile(icon, { source, wrapperImport: entry.wrapperFromIcon }))
    }
    const names = icons.map(({ name }) => name)
    files.set(join(entry.dir, "index.ts"), emitBarrel(names, { source: `${entry.icons}/`, wrapperImport: entry.wrapperFromBarrel }))
    sets.push({ ...entry, icons })
  }
  assertSameNames(sets)
  return { files, sets }
}

async function listExisting(dir) {
  const entries = await readdir(dir, { recursive: true, withFileTypes: true }).catch(() => [])
  return entries.filter((e) => e.isFile()).map((e) => relative(dir, join(e.parentPath, e.name)))
}

async function check(files) {
  const existing = new Set(await listExisting(OUT))
  const problems = []
  for (const [path, text] of files) {
    if (!existing.has(path)) problems.push(`missing  ${path}`)
    else if ((await readFile(join(OUT, path), "utf8")) !== text) problems.push(`differs  ${path}`)
  }
  for (const path of existing) if (!files.has(path)) problems.push(`extra    ${path}`)
  return problems
}

async function write(files) {
  // A clean slate, so an icon removed from icons/ can't linger as a stale module.
  await rm(OUT, { recursive: true, force: true })
  for (const [path, text] of files) {
    await mkdir(dirname(join(OUT, path)), { recursive: true })
    await writeFile(join(OUT, path), text, "utf8")
  }
}

function summary(sets, fileCount) {
  const lines = sets.map(({ label, icons }) => {
    const source = icons.reduce((s, i) => s + i.sourceBytes, 0)
    const emitted = icons.reduce((s, i) => s + emittedBytes(i), 0)
    const saved = (100 * (1 - emitted / source)).toFixed(1)
    return `  ${label}: ${icons.length} icons, path data ${source.toLocaleString("en")} B -> ${emitted.toLocaleString("en")} B (-${saved}%)`
  })
  return [`${fileCount} files in packages/react/src`, ...lines].join("\n")
}

async function main() {
  const { files, sets } = await buildFiles()
  if (process.argv.includes("--check")) {
    const problems = await check(files)
    if (problems.length) {
      console.error(problems.slice(0, 20).map((p) => `  ${color(33, p)}`).join("\n"))
      if (problems.length > 20) console.error(`  …and ${problems.length - 20} more`)
      console.error(`\npackages/react/src is out of date. Run: node scripts/generate.mjs`)
      process.exit(1)
    }
    console.log(color(32, `In sync: ${summary(sets, files.size)}`))
    return
  }
  await write(files)
  console.log(`Wrote ${summary(sets, files.size)}`)
}

main().catch((error) => {
  console.error(color(31, error.message))
  process.exit(1)
})
