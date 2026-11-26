// Generates quick-ui's built-in icons file from this set.
//
//   node scripts/generate-built-in.mjs [--out <file>]
//
// Writes the shapes listed in scripts/built-in-icons.mjs as plain components,
// in the style of quick-ui's packages/react/src/components/icons/icons.tsx.
// The default output is .work/built-in/icons.tsx: this repo never edits
// quick-ui. docs/built-in-icons.md says how quick-ui takes the file in.

import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { BUILT_IN_ICONS } from "./built-in-icons.mjs"
import { emitBuiltIn } from "./lib/emit-built-in.mjs"
import { parseSvg, VARIANTS } from "./lib/source.mjs"

const ROOT = fileURLToPath(new URL("..", import.meta.url))
const DEFAULT_OUT = join(ROOT, ".work", "built-in", "icons.tsx")

function outPath() {
  const at = process.argv.indexOf("--out")
  if (at === -1) return DEFAULT_OUT
  const value = process.argv[at + 1]
  if (!value) throw new Error("--out needs a file path")
  return resolve(value)
}

async function drawingFor({ icon, variant }) {
  const folder = VARIANTS.find((v) => v.variant === variant)?.folder
  if (!folder) throw new Error(`${icon}: unknown variant "${variant}"`)
  const file = join(ROOT, "icons", folder, `${icon}.svg`)
  const source = await readFile(file, "utf8").catch(() => {
    throw new Error(`${icon}: no icons/${folder}/${icon}.svg. Check its name in scripts/built-in-icons.mjs`)
  })
  return parseSvg(source, `icons/${folder}/${icon}.svg`)
}

async function main() {
  const components = new Set()
  for (const { component } of BUILT_IN_ICONS) {
    if (components.has(component)) throw new Error(`${component} is listed twice`)
    components.add(component)
  }
  const entries = await Promise.all(BUILT_IN_ICONS.map(async (entry) => ({ entry, drawing: await drawingFor(entry) })))
  const out = outPath()
  await mkdir(dirname(out), { recursive: true })
  await writeFile(out, emitBuiltIn(entries), "utf8")
  console.log(`Wrote ${entries.length} built-in icons to ${out}`)
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
