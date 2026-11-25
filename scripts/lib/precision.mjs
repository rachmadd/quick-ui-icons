// Rounds path data as far as it can without turning any segment.
//
// Two decimals move a point by at most 0.005 units, which is invisible on a
// long segment but not on a tiny one. Sharp `brain-side` has a 0.02-unit stub
// whose butt cap fills a corner: at 2 decimals its first control point lands
// on its start, its direction swings from -30° to 0°, and the cap shows as a
// tick. So each subpath is rounded to the fewest decimals that keep the
// directions its caps are drawn along within MAX_TURN of the original.
// MAX_TURN is 1°: a 2-unit butt cap turned by 1° moves its corners about 0.017
// units, 0.035px at 48px.

/** Decimal places tried in order. 2 moves a point at most 0.005 units (0.01px at 48px). */
export const PLACES = [2, 3]
const MAX_TURN = (1 * Math.PI) / 180
const EPS = 1e-9
const ABSOLUTE_ONLY = /^[MLHVCZ0-9.,\s\-e]*$/
const NUMBER = /-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi
const COMMAND = /([MLHVCZ])([^MLHVCZ]*)/g

const countNumbers = (d) => (d.match(NUMBER) ?? []).length

/**
 * Rounds every number in a path string to `places`, keeping its separators.
 *
 * Throws on arcs, whose flags can be written without separators (`a1 1 0 011 1`)
 * and would be misread as one number, and on any input where rounding would
 * fuse two numbers (`0.001.5` would become `00.5`). Neither occurs in icons/
 * today; the checks keep a future export from being corrupted quietly.
 */
export function roundPathData(d, places = PLACES[0]) {
  if (/[Aa]/.test(d)) throw new Error(`arc commands aren't supported: ${d.slice(0, 40)}`)
  const rounded = d.replace(NUMBER, (n) => String(Number(Number(n).toFixed(places))))
  if (countNumbers(rounded) !== countNumbers(d)) throw new Error(`rounding would merge numbers in: ${d.slice(0, 40)}`)
  return rounded
}

/** Cubic segments [p0, c1, c2, p3] for one subpath; a line is a cubic with its controls on its ends. */
function segments(d) {
  const segs = []
  let at = [0, 0]
  let start = [0, 0]
  const lineTo = (to) => {
    segs.push([at, at, to, to])
    at = to
  }
  for (const [, cmd, rest] of d.matchAll(COMMAND)) {
    const n = (rest.match(NUMBER) ?? []).map(Number)
    if (cmd === "M") {
      at = [n[0], n[1]]
      start = at
      for (let i = 2; i < n.length; i += 2) lineTo([n[i], n[i + 1]])
    } else if (cmd === "L") for (let i = 0; i < n.length; i += 2) lineTo([n[i], n[i + 1]])
    else if (cmd === "H") for (const x of n) lineTo([x, at[1]])
    else if (cmd === "V") for (const y of n) lineTo([at[0], y])
    else if (cmd === "C")
      for (let i = 0; i < n.length; i += 6) {
        const to = [n[i + 4], n[i + 5]]
        segs.push([at, [n[i], n[i + 1]], [n[i + 2], n[i + 3]], to])
        at = to
      }
    else if (cmd === "Z") {
      if (at[0] !== start[0] || at[1] !== start[1]) lineTo(start)
      at = start
    }
  }
  return segs
}

const minus = (a, b) => [a[0] - b[0], a[1] - b[1]]
const isPoint = ([x, y]) => Math.hypot(x, y) <= EPS

/** Direction leaving p0 and arriving at p3, from the nearest control point not on top of the end. */
function ends([p0, c1, c2, p3]) {
  const leaving = [c1, c2, p3].map((p) => minus(p, p0)).find((v) => !isPoint(v))
  const arriving = [c2, c1, p0].map((p) => minus(p3, p)).find((v) => !isPoint(v))
  return [leaving, arriving]
}

/** Angle between two directions; a segment that collapses to a point counts as a full turn. */
function turn(a, b) {
  if (!a || !b) return a || b ? Math.PI : 0
  const diff = Math.abs(Math.atan2(a[1], a[0]) - Math.atan2(b[1], b[0]))
  return Math.min(diff, 2 * Math.PI - diff)
}

/**
 * Whether rounding keeps the directions a cap is drawn along: where an open
 * subpath starts and where it ends. Everywhere else a direction change can't
 * show. Joins are round and fills only follow the points, which move at most
 * 0.005 units. A closed subpath has no caps.
 */
function keepsCapDirections(original, rounded) {
  if (/Z\s*$/.test(original)) return true
  const before = segments(original)
  const after = segments(rounded)
  if (before.length !== after.length) return false
  if (before.length === 0) return true
  const last = before.length - 1
  return (
    turn(ends(before[0])[0], ends(after[0])[0]) <= MAX_TURN &&
    turn(ends(before[last])[1], ends(after[last])[1]) <= MAX_TURN
  )
}

/**
 * Rounds `d` subpath by subpath: 2 decimals where that keeps its cap
 * directions, else 3, else the subpath is left exactly as it was. Returns the
 * path and how many subpaths kept more than 2 decimals.
 */
export function roundPathSafely(d) {
  if (!ABSOLUTE_ONLY.test(d)) throw new Error(`only absolute M L H V C Z paths are supported: ${d.slice(0, 40)}`)
  let kept = 0
  const parts = d.split(/(?=M)/).map((part) => {
    for (const places of PLACES) {
      const rounded = roundPathData(part, places)
      if (keepsCapDirections(part, rounded)) {
        if (places !== PLACES[0]) kept++
        return rounded
      }
    }
    kept++
    return part
  })
  return { d: parts.join(""), kept }
}
