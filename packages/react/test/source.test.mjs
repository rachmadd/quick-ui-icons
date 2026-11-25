// Unit tests for the generator's SVG reader (scripts/lib/source.mjs).

import { test } from "node:test"
import assert from "node:assert/strict"
import { parseSvg, roundPathData } from "../../../scripts/lib/source.mjs"
import { roundPathSafely } from "../../../scripts/lib/precision.mjs"

test("roundPathSafely keeps a tiny segment's direction (sharp brain-side's 0.02-unit stub)", () => {
  // At 2 decimals this stub's first control point lands on its start and its
  // direction swings from -30° to 0°, which turns its butt cap into a tick.
  const stub = "M4.043 6.971C4.049 6.967 4.056 6.964 4.062 6.96"
  assert.notEqual(roundPathSafely(stub).d, roundPathData(stub))
  assert.equal(roundPathSafely(stub).kept, 1)
})

test("roundPathSafely rounds ordinary subpaths to 2 decimals, each on its own", () => {
  const path = "M11.5386 2.8073L14.87 8.5744M4.043 6.971C4.049 6.967 4.056 6.964 4.062 6.96"
  const { d, kept } = roundPathSafely(path)
  assert.ok(d.startsWith("M11.54 2.81L14.87 8.57M"))
  assert.equal(kept, 1)
})

test("roundPathSafely refuses relative commands", () => {
  assert.throws(() => roundPathSafely("M0 0l1 1"), /absolute/)
})

test("roundPathData keeps 2 decimals and drops trailing zeros", () => {
  assert.equal(roundPathData("M11.5386 2.8073L14.87 8.5744"), "M11.54 2.81L14.87 8.57")
  assert.equal(roundPathData("M6 9L12 15L18 9"), "M6 9L12 15L18 9")
  assert.equal(roundPathData("C1.10000 2 3.999 4"), "C1.1 2 4 4")
})

test("roundPathData handles signs, negative zero, exponents and glued negatives", () => {
  assert.equal(roundPathData("M-0.004 0.001"), "M0 0")
  assert.equal(roundPathData("M1-2.456"), "M1-2.46")
  assert.equal(roundPathData("M2 1.0000000000000002"), "M2 1")
  assert.equal(roundPathData("M1e-5 3"), "M0 3")
})

test("roundPathData refuses arcs and anything rounding would fuse", () => {
  assert.throws(() => roundPathData("M0 0a1 1 0 011 1"), /arc/)
  assert.throws(() => roundPathData("M0.001.5 1"), /merge/)
})

test("parseSvg reads root attributes and paths, and drops what the wrapper sets", () => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
  <path d="M1.234 2Z" fill-opacity="0.4"/>
</svg>`
  assert.deepEqual(parseSvg(svg, "t"), {
    root: [["fill", "none"], ["stroke", "currentColor"]],
    elements: [{ tag: "path", attrs: [["d", "M1.23 2Z"], ["fill-opacity", "0.4"]] }],
  })
})

test("parseSvg refuses what it can't render faithfully", () => {
  const wrap = (body, viewBox = "0 0 24 24") => `<svg viewBox="${viewBox}">${body}</svg>`
  assert.throws(() => parseSvg(wrap(`<circle r="2"/>`), "t"), /only <path>/)
  assert.throws(() => parseSvg(wrap(`<path d="M0 0"/>`, "0 0 16 16"), "t"), /viewBox/)
  assert.throws(() => parseSvg(wrap(""), "t"), /no <path>/)
  assert.throws(() => parseSvg(wrap(`<path d='M0 0'/>`), "t"), /can't read attributes/)
})
