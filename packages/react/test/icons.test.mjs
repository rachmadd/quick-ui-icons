// Tests for the built package (packages/react/dist). Run `pnpm test`, which
// builds first.
//
// Expected values are read straight from the SVGs in icons/ with the small
// parser below, not with the generator's own code, so a generator bug can't
// make its own expectation.

import { test } from "node:test"
import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import * as rounded from "../dist/index.js"
import * as sharp from "../dist/sharp/index.js"

const ROOT = fileURLToPath(new URL("../../..", import.meta.url))
const SRC = join(ROOT, "packages", "react", "src")
const ENTRY_POINTS = [
  { label: "rounded", icons: join(ROOT, "icons"), module: rounded },
  { label: "sharp", icons: join(ROOT, "icons", "sharp"), module: sharp },
]
const VARIANTS = { outline: "stroke", fill: "fill", duotone: "duotone" }
const WRAPPER_ATTRS = {
  xmlns: "http://www.w3.org/2000/svg",
  viewBox: "0 0 24 24",
  width: "24",
  height: "24",
  "aria-hidden": "true",
  focusable: "false",
}
const MAX_ROUNDING_ERROR = 0.005 + 1e-9
const NUMBER = /-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi

const pascal = (name) => name.split("-").map((p) => p[0].toUpperCase() + p.slice(1)).join("")
const names = (dir) => readdirSync(join(dir, "stroke")).filter((f) => f.endsWith(".svg")).map((f) => f.slice(0, -4)).sort()
const render = (Component, props = {}) => renderToStaticMarkup(createElement(Component, props))
const sorted = (obj) => JSON.stringify(Object.fromEntries(Object.entries(obj).sort(([a], [b]) => a.localeCompare(b))))

/** Attributes as a plain object, with numeric strings normalized ("2.0" == "2"). */
function attrMap(chunk) {
  const pairs = [...chunk.matchAll(/([\w:-]+)="([^"]*)"/g)].map(([, k, v]) => [k, /^-?[\d.]+$/.test(v) ? String(Number(v)) : v])
  return Object.fromEntries(pairs)
}

/** { root, paths } from an SVG string, markup or source alike. */
function parse(svg) {
  const root = attrMap(svg.match(/<svg\b([^>]*)>/)[1])
  const paths = [...svg.matchAll(/<path\b([^>]*?)\/?>/g)].map(([, chunk]) => attrMap(chunk))
  return { root, paths }
}

/**
 * Same commands in the same order, and every number within the rounding error.
 * Most numbers have 2 decimals; a subpath whose cap would turn keeps 3 or its
 * original data (scripts/lib/precision.mjs), still within the same error.
 */
function samePath(rendered, source) {
  const skeleton = (d) => d.replace(NUMBER, "#")
  if (skeleton(rendered) !== skeleton(source)) return false
  const a = rendered.match(NUMBER) ?? []
  const b = source.match(NUMBER) ?? []
  return a.every((n, i) => Math.abs(Number(n) - Number(b[i])) <= MAX_ROUNDING_ERROR)
}

/** Problems with one rendered variant, compared with its source SVG. */
function compare(markup, sourceSvg) {
  const got = parse(markup)
  const want = parse(sourceSvg)
  const wantRoot = { ...want.root, ...WRAPPER_ATTRS }
  const problems = []
  if (sorted(got.root) !== sorted(wantRoot)) problems.push(`root ${JSON.stringify(got.root)} != ${JSON.stringify(wantRoot)}`)
  if (got.paths.length !== want.paths.length) problems.push(`${got.paths.length} paths, source has ${want.paths.length}`)
  got.paths.forEach(({ d, ...rest }, i) => {
    const { d: wantD, ...wantRest } = want.paths[i] ?? {}
    if (!samePath(d ?? "", wantD ?? "")) problems.push(`path ${i} d differs beyond rounding`)
    if (sorted(rest) !== sorted(wantRest)) problems.push(`path ${i} attrs ${JSON.stringify(rest)} != ${JSON.stringify(wantRest)}`)
  })
  return problems
}

for (const { label, icons, module } of ENTRY_POINTS) {
  test(`${label}: every icon renders all three variants like its source SVG`, () => {
    const failures = []
    for (const name of names(icons)) {
      const Component = module[`${pascal(name)}Icon`]
      if (typeof Component !== "function") {
        failures.push(`${name}: ${pascal(name)}Icon is not exported`)
        continue
      }
      for (const [variant, folder] of Object.entries(VARIANTS)) {
        const source = readFileSync(join(icons, folder, `${name}.svg`), "utf8")
        for (const problem of compare(render(Component, { variant }), source)) failures.push(`${name} ${variant}: ${problem}`)
      }
    }
    assert.deepEqual(failures.slice(0, 10), [], `${failures.length} failures`)
  })

  test(`${label}: variant defaults to outline`, () => {
    const failures = names(icons).filter((name) => {
      const Component = module[`${pascal(name)}Icon`]
      return render(Component) !== render(Component, { variant: "outline" })
    })
    assert.deepEqual(failures, [])
  })
}

test("both entry points export the same names, as {Name}Icon and the {Name} alias", () => {
  const roundedNames = Object.keys(rounded).sort()
  assert.deepEqual(Object.keys(sharp).sort(), roundedNames)
  assert.equal(roundedNames.length, names(join(ROOT, "icons")).length * 2)
  assert.equal(rounded.Star, rounded.StarIcon)
  assert.equal(sharp.Star, sharp.StarIcon)
  assert.notEqual(rounded.StarIcon, sharp.StarIcon)
})

test("props pass through to the <svg>, after the icon's own defaults", () => {
  const markup = render(rounded.StarIcon, {
    className: "size-4 text-red-500",
    id: "star",
    "data-testid": "rating",
    style: { color: "red" },
    width: 16,
    height: 16,
    strokeWidth: 1.5,
  })
  const { root } = parse(markup)
  assert.equal(root.class, "size-4 text-red-500")
  assert.equal(root.id, "star")
  assert.equal(root["data-testid"], "rating")
  assert.equal(root.style, "color:red")
  assert.equal(root.width, "16")
  assert.equal(root.height, "16")
  assert.equal(root["stroke-width"], "1.5")
})

test("aria-hidden can be overridden to label an icon", () => {
  const { root } = parse(render(rounded.StarIcon, { "aria-hidden": false, role: "img", "aria-label": "Favorite" }))
  assert.equal(root["aria-hidden"], "false")
  assert.equal(root.role, "img")
  assert.equal(root["aria-label"], "Favorite")
})

test("variant never reaches the DOM", () => {
  for (const variant of Object.keys(VARIANTS)) {
    assert.doesNotMatch(render(rounded.StarIcon, { variant }), /variant/)
    assert.doesNotMatch(render(rounded.ChevronDownIcon, { variant }), /variant/)
  }
})

test("every generated file carries the generated header and Keyline's notice, and no 'use client'", () => {
  const files = readdirSync(SRC, { recursive: true }).filter((f) => /\.tsx?$/.test(f))
  // One module per icon in each entry point, two barrels and the wrapper.
  assert.equal(files.length, names(join(ROOT, "icons")).length * 2 + 3)
  const bad = files.filter((file) => {
    const text = readFileSync(join(SRC, file), "utf8")
    const [first, second] = text.split("\n")
    return (
      !first.startsWith("// Generated by scripts/generate.mjs") ||
      !second.includes("Copyright (c) 2026 Keyline Icons") ||
      text.includes("use client")
    )
  })
  assert.deepEqual(bad, [])
})

test("running the generator leaves no diff", () => {
  const result = spawnSync(process.execPath, [join(ROOT, "scripts", "generate.mjs"), "--check"], { encoding: "utf8" })
  assert.equal(result.status, 0, result.stderr)
})
