// Reads the built SVGs in icons/ into plain data for the generator.
//
// icons/ is already normalized by pipeline/build.mjs: paints are currentColor,
// stroke attributes sit on the root, fill-only shapes carry stroke="none", and
// every shape is a <path>. This module only parses that and rounds the path
// data. It refuses anything it doesn't expect, so a new kind of export fails
// here by name instead of shipping half-rendered.

import { readdir, readFile } from "node:fs/promises"
import { join } from "node:path"
import { roundPathData, roundPathSafely } from "./precision.mjs"

/** The styles the package builds, mapped to their folder in icons/. */
export const VARIANTS = [
  { variant: "outline", folder: "stroke" },
  { variant: "fill", folder: "fill" },
  { variant: "duotone", folder: "duotone" },
]

const VIEW_BOX = "0 0 24 24"
/** Root attributes the shared <svg> wrapper supplies itself. */
const ROOT_DROP = new Set(["xmlns", "width", "height", "viewBox"])
const ATTR = /([\w:-]+)="([^"]*)"/g
const ELEMENT = /<([a-zA-Z]+)\b([^>]*?)\/?>/g

/** `name="value"` pairs. Throws on anything else, so an attribute is never dropped silently. */
function readAttrs(chunk, label) {
  const leftover = chunk.replace(ATTR, "").replace(/[\s/]/g, "")
  if (leftover) throw new Error(`${label}: can't read attributes near "${leftover.slice(0, 40)}"`)
  return [...chunk.matchAll(ATTR)].map(([, key, value]) => [key, value])
}

export { roundPathData }

/**
 * One SVG as { root, elements }. `root` holds the presentation attributes
 * (fill, stroke, stroke-width…) in source order; each element is
 * { tag: "path", attrs } with `d` rounded.
 */
export function parseSvg(source, label) {
  const open = source.match(/<svg\b([^>]*)>/)
  if (!open) throw new Error(`${label}: no <svg> root`)
  const rootAttrs = readAttrs(open[1], label)
  const viewBox = rootAttrs.find(([key]) => key === "viewBox")?.[1]
  if (viewBox !== VIEW_BOX) throw new Error(`${label}: viewBox is "${viewBox}", expected "${VIEW_BOX}"`)

  const elements = [...source.matchAll(ELEMENT)]
    .filter(([, tag]) => tag !== "svg")
    .map(([, tag, chunk]) => {
      if (tag !== "path") throw new Error(`${label}: <${tag}> found, but only <path> is supported`)
      const attrs = readAttrs(chunk, label).map(([key, value]) => {
        if (key !== "d") return [key, value]
        try {
          return [key, roundPathSafely(value).d]
        } catch (error) {
          throw new Error(`${label}: ${error.message}`)
        }
      })
      return { tag, attrs }
    })
  if (elements.length === 0) throw new Error(`${label}: no <path> elements`)

  return { root: rootAttrs.filter(([key]) => !ROOT_DROP.has(key)), elements }
}

async function listNames(dir) {
  const files = await readdir(dir)
  return files.filter((f) => f.endsWith(".svg")).map((f) => f.slice(0, -4)).sort()
}

/** Throws, listing the names, if the three style folders don't hold the same icons. */
function assertParity(namesByFolder, label) {
  const [first, ...rest] = Object.entries(namesByFolder)
  const expected = new Set(first[1])
  for (const [folder, names] of rest) {
    const got = new Set(names)
    const missing = [...expected].filter((n) => !got.has(n))
    const extra = [...got].filter((n) => !expected.has(n))
    if (missing.length || extra.length) {
      throw new Error(
        `${label}: ${folder}/ differs from ${first[0]}/. ` +
          `Missing: ${missing.join(", ") || "none"}. Extra: ${extra.join(", ") || "none"}.`
      )
    }
  }
}

/**
 * Every icon in one corner treatment, as
 * [{ name, sourceBytes, drawings: { outline, fill, duotone } }], sorted by name.
 * `iconsDir` is icons/ or icons/sharp/.
 */
export async function loadIcons(iconsDir, label) {
  const namesByFolder = {}
  for (const { folder } of VARIANTS) namesByFolder[folder] = await listNames(join(iconsDir, folder))
  assertParity(namesByFolder, label)

  const names = namesByFolder[VARIANTS[0].folder]
  return Promise.all(
    names.map(async (name) => {
      const drawings = {}
      let sourceBytes = 0
      for (const { variant, folder } of VARIANTS) {
        const source = await readFile(join(iconsDir, folder, `${name}.svg`), "utf8")
        for (const [, d] of source.matchAll(/\sd="([^"]*)"/g)) sourceBytes += d.length
        drawings[variant] = parseSvg(source, `${label}/${folder}/${name}.svg`)
      }
      return { name, sourceBytes, drawings }
    })
  )
}
