# Icon pipeline

Turns raw Figma exports into the SVGs in `icons/` and the React package in
`packages/react`, then checks them against the variant architecture. Plain Node
ESM, no dependencies.

```bash
pnpm icons:build       # raw/ -> icons/
pnpm icons:lint        # check icons/
pnpm icons:react       # icons/ -> packages/react/src (scripts/generate.mjs, not committed)
pnpm readmes:check     # check the counts typed into the READMEs against icons/
pnpm readmes:fix       # rewrite those counts in place
pnpm icons:figma       # check the Figma file against raw/ (two steps, see below)
pnpm icons:ci          # sync checks, README counts, lint, typecheck (for CI)
pnpm build             # compile packages/react to dist/
pnpm test              # build, then render, size and tree-shaking tests
pnpm size:budget       # rerecord per-icon size budgets after an intended change
pnpm built-in          # quick-ui's built-in icons file, to .work/built-in/icons.tsx
node fixtures/bundle-size/measure.mjs   # Vite and Next bundle sizes (not in CI)
```

`icons:figma` is deliberately not in `icons:ci`: it needs the Figma file, which CI does not have. Everything else here reads
`icons/`, so a defect that exists only in the design file passes every check.
Run `icons:figma` after a drawing session:

```bash
pnpm icons:figma --emit          # prints a snippet
                                 # run it through the Figma plugin API, save the output
pnpm icons:figma digest.txt      # diff that against raw/
```

The set is past what one plugin return can carry, so the snippet works in
chunks. It stops short of the limit and ends with `#NEXT=<name>`; put that name
in its `AFTER`, run it again, and append each run to the same file until no
`#NEXT` comes back. A file that still ends in one is refused rather than
diffed, because a part-digest otherwise reports every icon it never reached as
deleted from Figma.

`build.mjs --check` writes nothing and exits non-zero if `icons/` no longer
matches `raw/`; `icons:ci` runs it first. `packages/react/src` isn't committed,
so there is nothing to check it against: `icons:ci`, `pnpm build` and the
package's `prepublishOnly` all regenerate it from `icons/` before `tsc` reads
it, which means a stale module can't reach a build. `scripts/generate.mjs
--check` still works locally, against whatever is on disk, and `pnpm test`
runs it.

## Layout

```
raw/<name>/*.svg              Figma exports, untouched
icons/<style>/<name>.svg      generated, rounded: do not hand-edit
icons/sharp/<style>/<name>.svg  generated, sharp: do not hand-edit
data/                         icon metadata: search tags, aliases, categories,
                              descriptions, renames
pipeline/
  lib/geom.mjs                path parsing, exact bboxes, closed-subpath detection
  lib/svg.mjs                 SVG reader + normalizer
  build.mjs                   raw/ -> icons/
  lint.mjs                    geometry + coverage rules
  check-readmes.mjs           README counts against icons/
  check-figma.mjs             the Figma file against raw/
  parallel.mjs                runs the last icons:ci checks at once
scripts/
  generate.mjs                icons/ -> packages/react/src
  lib/source.mjs              reads icons/
  lib/precision.mjs           rounds path data to 2 decimals, more where a stroke end would turn
  lib/emit.mjs                writes the wrapper, icon modules and barrels
  generate-built-in.mjs       quick-ui's built-in icons.tsx, from built-in-icons.mjs
  lib/emit-built-in.mjs       writes that file in quick-ui's Prettier style
  size-budget.mjs             records each icon's gzipped size budget for the size test
  lib/size.mjs                measures icon modules minified and gzipped
fixtures/bundle-size/         Vite and Next apps importing 1, 3 and 30 icons (see its README)
```

`scripts/generate.mjs` is a restatement, not a transform: it emits one module
per icon, for rounded and for sharp, whose function picks its outline, fill or
duotone drawing by `variant`. Two-tone isn't built. The only change to the
drawing is rounding path data to 2 decimals, at most 0.005 units. Each
drawing spreads its own root attributes rather than a shared preset, because
some drawings in `icons/stroke/` carry no stroke of their own — `square-half`
and the other fraction sectors are solid by definition — and painting one on
would outline every knockout.

Styles are `stroke`, `two-tone`, `duotone`, `fill`, and each has a sharp twin
under `icons/sharp/<style>/`. Every name lives in all eight folders (the parity
rule, below): the folder is the disambiguator, so `square-arrow-down` is one
name with eight files, matching how other sets split styles by package.

## What `build` does

Figma exports carry attributes that must never ship. Each is removed for a reason:

| Removed | Why |
| --- | --- |
| `preserveAspectRatio="none"` | lets the icon **distort** when width and height differ |
| `overflow="visible"` | permits painting outside the viewBox |
| `style="display:block"` | presentation belongs to the consumer |
| `id="Vector"`, `id="Container"` | Figma layer names leaking into output |
| `<g>` wrappers | no semantic value |

It then rewrites every concrete paint to `currentColor`, hoists
`stroke` / `stroke-width` / `stroke-linecap` / `stroke-linejoin` onto the root,
and preserves `fill-opacity` and `stroke-opacity`, so two-tone and duotone keep
their muted layer.

Two details worth knowing:

- **`stroke-linejoin="round"` is added.** No Figma export carried it. Corners are
  currently hand-rounded with béziers, which works at stroke-width 2 but freezes
  the corner radius — a real join scales with stroke width, a drawn one doesn't.
  Declaring the join is what makes a `strokeWidth` prop safe to expose.
- **Fill-only shapes get an explicit `stroke="none"`.** Once the root carries a
  stroke, a shape that had none would otherwise inherit one. This is the
  two-tone plate, the duotone's grey body and the filled body of any mixed
  fill/stroke icon.
- **Shapes carrying both paints are split in two.** A two-tone drawn in Figma as
  one vector with a muted fill and a full-strength stroke ships as two paths:
  the plate, then the outline. They are different things that happen to share a
  contour, and a consumer cannot restyle or animate a tone that is not its own
  element. Rendering is unchanged — one element paints fill then stroke, and two
  adjacent elements do the same in the same order. It costs about 3% in bytes.
- **Neighbouring shapes that paint identically are merged.** Three bars drawn as
  three layers become one path with three subpaths, so output does not depend on
  whether anyone flattened in Figma. A shape *enclosing* another never merges
  (that is a container holding a glyph) and neither do overlapping fills (one
  winding rule across both would let them cancel).

## What `lint` checks

Geometry, measured from the path data — cubic extrema solved exactly, so a
rounded vertex is measured at the curve rather than at its endpoints or control
points:

| Rule | Severity | Checks |
| --- | --- | --- |
| `VIEWBOX` | error | exactly `0 0 24 24` |
| `COLOR` | error | no paint other than `currentColor` / `none` |
| `EXPORT` | error | no `preserveAspectRatio`, ids, groups, or unflattened primitives |
| `JOIN` | error | stroked icons declare `stroke-linejoin` |
| `LAYERS` | error | no shape carries both a fill and a stroke |
| `PADDING` | error | at least 1 unit of clearance on every side |
| `COVERAGE` | error | every name has all four styles in both corner treatments (below) |
| `SOLID` | error | the stroke style is drawn with stroke, not a filled silhouette (a drawing that is nothing but dots is exempt: a dot is filled at every size, so `more-*` has no stroke to carry) |
| `DUOTONE` | error | two-tone and duotone: two tones present, secondary at exactly 0.4 |
| `CONSISTENCY` | error | every style of an icon shares the stroke's bounds |
| `OPTICAL` | warn | the drawing sits at its optical shape's size; else true extent above the floor, box within the ceiling |
| `SPACING` | warn | 2 units of painted clearance between separate elements |
| `RADIUS` | warn | corner radii land on the set's ladder |
| `DOT` | warn | filled dots land on the dot ladder (below) |
| `CENTERING` | warn | opposing paddings equal; and, separately, within 1 unit |
| `ARC` | warn | `A` commands, whose bounds are approximated |

### Spacing

Measured between **painted** edges, not paths. A 2-unit stroke puts a unit of
ink either side of its own line, so two paths three units apart leave only one
unit of daylight. Distance is taken segment to segment — a straight edge is
stored as two endpoints, and sampling vertices alone would measure to the far
end of an edge instead of to the edge.

Gaps and overlaps are measured at different granularities, because they fail
differently:

- a **gap** under 2 units is wrong wherever it appears, so subpaths are compared
  individually. Whether three bars ship as three `<path>`s or one path with
  three subpaths is a grouping decision, and the daylight between them is the
  same either way.
- **overlapping ink** is only wrong between separate elements. Inside one
  element it is nearly always a deliberate join — an arrow's head meeting its
  own shaft — so per-subpath overlap just reports the drawing back at you.

Two pairs are skipped either way: outlines that cross (a composite, not two
neighbours) and a filled shape that wholly contains another (a muted plate is
a backdrop, not a neighbour). Only the tightest pair per icon is
reported — an icon that crowds in one place usually crowds in several, and
listing every pair buries the icon that needs redrawing.

### Corner radius

The set's ladder, in grid units:

```
0.5  small chamfers        1.5  tight corners        4  panels, brackets
1    inner insets          3    square containers    5  large rounded forms
```

This deliberately differs from the other set's guide, which specifies 2 for shapes of
8 units or more and 1 below. `4` and `3` account for over 700 of this set's
corners, so it is a house voice rather than drift, and the rule enforces the
ladder instead of the guide. What it catches is a corner landing *near* a ladder
value without hitting it — `3.92`, `4.14`, `0.57` — which is always a shape
nudged off the grid rather than a decision.

Only corners where two straight edges meet through a fillet are measured. A
curve arriving into a fillet is a dome or a lozenge, whose radius is the drawing
itself rather than a corner treatment. And an open run of exactly three
segments, a curve between two straight runs of at most a unit, is a sharp free
arc with its two stubs rather than a corner: a free arc end takes a unit of
tangent so its butt cap paints where the round cap's disc reached, and a lone
quarter arc between two such stubs would otherwise read as a corner of the
arc's own radius (`circle-progress-quarter` at 10). Closed rings are not
exempted, because the flats between `settings`' gear teeth are under a unit
and are real fillet edges.

**The ladder is not closed under the +1 an outline adds.** A muted plate or a
solid is the stroke drawing outlined by one unit, and outlining raises every
corner radius by one. So a shape that is itself on the ladder can still produce
a plate that is not: `git-connection`'s node box was a correct `1.5`, and its
plate came out at `2.5`. Pick from the radii whose successor is also on the
ladder — `0.5`, `1`, `2`, `3`, `4` — for anything that gains a filled style.
`1.5` and `5` are safe only on a shape that stays an outline.

The level-indicator family is the standing exception (2026-08-30): its filled
styles' inner solids are the stroke drawing's painted contour, and the
stroke's inner square corners are a shipped `1.5`, so the solids carry `2.5`
by arithmetic. The rule skips exactly that value on exactly those names
(`LEVEL` and `DASHED_LEVEL`, non-stroke styles) rather than widening the
ladder — a `2.5` anywhere else is still drift.

Two consequences worth knowing when reading a `RADIUS` report:

- the rule measures line-curve-line, so a fillet that *ends* a path is invisible
  to it. `git-fork`'s second elbow sat at `2.769` unreported while its first was
  flagged at `3.231`. Fixing only what is reported can leave one connector
  turning two different corners.
- an elbow has two radii, and they can disagree. Several git corners were
  elliptical — `3.34` by `3.03` — which is why they measured at values nobody
  would choose. Rebuild from the corner vertex at the target radius rather than
  nudging control points, or the arc stays elliptical at a tidier size.

### Dot size

The circle ladder, in painted diameter, and each size means a role rather than
being a free choice:

```
2  mark   punctuation on a glyph — an exclamation's period, the tittle of
          `info`, `signal`'s origin. One stroke width, so it reads as a
          thickening of the drawing's own line.
3  bead   a dot that is its own element — an ellipsis dot, `tag`'s eyelet,
          `lock`'s keyhole, a cart wheel too small to show a hole.
8  node   a dot as an object or a badge — a git node, `bell-dot`. Drawn as an
          r=3 ring: a solid 8 is a blob, and it is the 6-unit modifier box
          painted with the house stroke, which is where 8 comes from.
```

Both filled sizes are drawn as filled circles, and a filled circle paints its own
width — so the diameter *is* the measurement, with no stroke to add. Only those
two are enforced. A node is a stroked circle, and no measurement separates one
from a truck's wheel or a compass bezel, so a rule over them would fire on
drawings that are not dots at all.

**`2.67` is not a third size, it is a bead at its ceiling.** A bead packed into a
box is capped by its wall and neighbour gaps: for three in a row inside a
20-unit body, `A >= 6 + d/2` and `A <= 10 - d` collapse to `1.5d <= 4`, so
`d <= 8/3`. That is where the contained `more-*` dots sit. A box with different
walls caps at a different number, and that case wants an exemption written down
rather than a wider tolerance.

**The dice are that exemption.** They sat at `8/3` until 17 Sep 2026, when Zafar
asked for full beads of 3 and took the cost as an exception: three pips of 3 in
the 16 units inside the box leave four gaps of 1.75, so `PIP_GAP` holds the seven
`dice-*` to 1.75 instead of 2 (`dice-6-horizontal` keeps 2 between its rows).

Above 4 units a filled circle is a drawn object — `map-pin`'s knocked-out hole,
`circle-user`'s head, a petal — and answers to its drawing, not to this ladder.

One consequence worth knowing: a dot drawn as a *stroked hairline circle* paints
solid, and paints two units wider than its path. That is how `lock`'s keyhole and
`shopping-cart`'s wheels shipped at 4 across while measuring r=1, and neither the
`SOLID` rule nor a scan of filled subpaths could see them. If a dot measures off
the ladder by exactly 2, suspect the construction before the size.

### Optical size

A drawing is sized by the **shape it reads as**, not by the box it happens to
occupy. A disc has to run wider than a square to carry the same weight, because
its corners are missing — so the classes carry different sizes:

```
circle      22 x 22          square    20 x 20
horizontal  22 x 18          vertical  18 x 22
  narrow    22 x 16            narrow  16 x 22
```

These are measurements, not preferences: 93 of 97 round forms already sat at 22
and 86 of 94 boxes at 20. The circle-to-square ratio, 22/20 = 1.10, is the
standard optical compensation for a disc against a box — so the set was already
doing this by habit.

**Only the long axis is enforced on the rectangles.** Their short axis is where
an object's own proportion legitimately lives, and the envelope guidance already
governs it: go past 3 units of padding only when the object is honestly narrow.
The **narrow** row is that permission written down — 22x16 for objects narrower
than the house rectangle. It exists because forcing the alternative was worse: at
18 wide a phone takes exactly `file`'s ink box and reads as a tablet. `NARROW`
lists the fifteen drawings allowed it.

**Classification is by corner reach** — how far the box's corners sit from the
nearest ink. Fullness cannot do the job, because a drawing of four corner
brackets empties its box exactly as a disc does. Corner reach is cleanly bimodal
across the set: 104 icons at 1.5–2.0, which is what a rounded square's r=4 ink
corner leaves, and 129 at 4.5–5.0, which is `r(√2 − 1)` for a disc of r=11.
Nothing legitimate falls between, so the thresholds are the measurement rather
than a judgement.

A drawing that reads as **none** of the four — a diagonal, a loose arrangement of
strokes — falls back to the floor-and-ceiling band below, which is all a bounding
box can say about it.

The floor measures the drawing's **true extent** — the largest distance between
any two points — because that is how big a glyph reads. A diagonal arrow drawn
at 14x14 spans 19 units along its own axis, and diagonal glyphs are deliberately
drawn smaller so they do not look oversized next to axis-aligned ones. Measuring
their bounding box punishes exactly that compensation.

**A sharp drawing may span `2 × (1 − 0.414)` less than the floor asks.** A
sharp diagonal free end is cut back so its butt corners land on the round cap's
box, which puts its chisel face 0.586 short of where the disc's tip reached
along the arm; a drawing read along its diagonal, `x`, spans 1.17 less than its
rounded sibling while painting exactly the same box. The floor measures the
hull, so it allows that much on sharp and no more.

The ceiling still measures the bounding box, since overflowing the canvas is a
question about the box rather than about how the glyph reads.

`SIZE_KNOWN` holds the drawings that classify into a shape and are deliberately
not at its size, grouped by reason: compact marks (a caret is punctuation, not an
object, `double-check` sits on half-units so its odd 21 still centres, and
`question` is drawn 10 x 16 with the other marks rather than the 22 its narrow
box asks for), the
media controls (sized as a set against each other — `play` is not among them, it
grew to 18 x 22 and is on-system), diagram glyphs (a git node is sized by what it
contains), the two drawings with proportions the ladder cannot hold (`bell` and
`paperclip`), the four diagonal arrows (the classifier reads a corner-to-corner
shaft as a box; the spread floor is what really governs them, and their hull of
19.0 clears it), `repeat` and `repeat-1` (read as a circle only because they are
180-degree symmetric, so both pairs of corners agree and `hi - lo` falls under
the test's 1.5; `refresh-cw` and `rotate-cw` are the same idea drawn as a real
circle at the same 20 x 20 and escape only because an arrowhead fills one
corner — so the family, `shuffle` included, is what sets the size), `mouse`
(his capsule at 12 by 18 on the path, 14 by 20 painted, which he asked back for
on 17 Sep 2026 after it had been run to 22 for this rule), and four
answered objects — `credit-card` is honestly shallower
than a square, `octagon-alert` covers ~360 units at 20 against a
disc's ~380 at 22 and would be far too heavy at 22, `user` is pinned by
`H = W/2 + 2`, and `settings` cannot be scaled at all: its 16 tooth fillets are
absolute tokens, so growing the gear is a redraw rather than a resize.
`flower` sets six petals on an equilateral hexagon, so it keeps the plain
`hexagon`'s proportion: 22 tall makes it 20 wide, and 22 wide would stand it
past the canvas.

### Chevrons are exempt from the optical floor

Every `chevron-*` icon is one repeated unit, so the unit has to be sized by the
tightest arrangement it appears in. That is `chevrons-up-down`, where two units
point away from each other. Above about 12 units wide their ends close up and
the pair stops reading as two chevrons — it reads as a diamond.

The floor wants more than that. A chevron has no depth to borrow from, so its
true extent is just its width, and clearing 15.5 would need a unit 13.5 wide —
comfortably inside the range that produces the diamond. The family uses 12 and
takes the warning.

### Punctuation is exempt from the optical floor

`PUNCTUATION` (`accent-grave`, `comma`) is drawn at the size it sits at beside
text, the compact marks' size. Run to the 15.5 floor each becomes a different
mark: a comma or a backtick 16 tall reads as a quote. Ladder dots are lifted
from the floor the same way.

### CENTERING has two tiers, and the strict one is the real standard

The 1-unit tier is the old one, and on its own it was misleading: it exists so
that a glyph whose extent is genuinely odd can park its spare unit somewhere,
and it kept getting read as a unit of licence for any placement. The `map-pin`
compounds shipped 2 units of padding on the left against 1 on the right, at a
skew of exactly 1, and the build stayed silent.

So the strict tier asks for what the set actually does — **opposing paddings
equal, no allowance**. Measured over 381 icons, only 19 fail it, and they are
listed by name in `SKEW_KNOWN` rather than covered by a threshold, so nothing
new joins them by accident. `bell-*` and `user-*` are answered there (a narrow
body that cannot reach its own ink corner, and `user`'s H = W/2 + 2); the rest
are silenced pending a decision, not blessed.

An odd extent is not a defence. 21 units centres perfectly well if the drawing
sits on half-units, and where it genuinely cannot, the extent is the thing to
fix — see *A linter threshold is a floor, not a target* in the skill.

The tolerance is 0.05 rather than `EPS`, because `plus` sits 0.01 out on a known
rounding artefact and fillet tangent points quantise at a similar scale. A real
placement error is a whole unit, so nothing is missed in between.

### Nothing measures where a glyph sits inside its container

`CENTERING` reads the whole icon's bounding box, and a container is centred by
construction, so the drawing inside it can sit anywhere and the build stays
green. `play` sat 0.22 to the left in all six of its contained variants and
nothing said so; it took someone looking at the six tiles side by side.

Centring it by the box did not settle it either. A right-pointing triangle
carries its mass on the flat edge and tapers to a point — its centroid is at
10.6 where its box centre is 12 — so box-centred it still reads left-heavy. It
ships **half a unit right of centre**, painted 3.96 against the left wall and
2.96 against the right, one unit more daylight on the left. That number was set
by eye.

This is `play` and nothing else. Every other contained glyph is centred by its
box, and the asymmetry here is deliberate, invisible to the linter, and exactly
the kind of thing a later tidy-up would undo.

### An open container is exempt from CONSISTENCY and CENTERING

`navigation` has a frame that is open in the outline — an arc that stops short
of the bottom. The gap is the drawing rather than a shape left unfinished, and
both `circle-` and `square-` forms are affected. (`cursor-gauge` was the other
one; it was the same icon under a second name and has been folded into this.)

Two rules read that gap as a defect, because both infer the drawing's extent
from its bounding box:

- `CONSISTENCY` assumes a fill is the outline filled to its own edge, and that
  holds only when the outline already encloses the shape. A solid built from an
  open arc has to close it, so it covers more ground than the outline does.
- `CENTERING` measures padding on all four sides. On the open side the box stops
  where the outline stops rather than where the container would be, so it
  reports the gap as a glyph pushed to one side. `circle-navigation` leaves 1
  unit above and 3 below, yet reads as centred, because the eye completes the
  arc where the box cannot.

Matched on an explicit list of names, so nothing else inherits either exemption
by accident. The failures the rules exist to catch — a *smaller* fill, a glyph
genuinely shoved into a corner — are unaffected.

### Level indicators are exempt from three rules

`circle-full/half/quarter/three-quarter`, their `square-` counterparts,
`signal-low/medium/high`, `tally-1` to `tally-4` and the chevron levels
`chevrons-up-1`, `-2` and `chevrons-down-1`, `-2` exist to show a *partial*
state. The tallies keep `tally-5`'s strokes where they stand and count from the
left; centred, `tally-1` would be `pipe` and `tally-2` two bars. `circle-quarter`'s
outline is a 7x7 wedge in one corner and its solid is the whole disc; that is
the icon, not a mistake. Three rules assume a glyph fills its canvas and that
every style covers the same ground, so they are skipped for these:

| Rule | Why it would fire |
| --- | --- |
| `CONSISTENCY` | the solid legitimately covers far more than the outline |
| `CENTERING` | a partial state is meant to sit off to one side |
| `OPTICAL` | a quarter is meant to be a quarter of the size |

Everything else still applies. They are held to the same paint, padding,
spacing and coverage rules as any other icon, and the exemption is matched on
an explicit list of names rather than inferred, so a new icon cannot fall into
it by accident.

### Centering

This measures the bounding box, but the design guide asks for centring by visual
weight — so it is an approximation and carries a full unit of slack. On a 24
grid with integer coordinates, a glyph whose total extent is odd cannot sit
centred and the spare unit has to fall on one side. Only offsets beyond a unit
mean the glyph is genuinely pushed to one side.

## The coverage rule

Every name ships all four styles in both corners. That is the parity rule,
settled for 1.0.0: every name owes every style, "even at the cost of
duplicating the same icon in the same color and same shape". The Figma sets
hold all eight variants, so `raw/` exports them and no cell of `icons/` is
empty. What is still measured, never chosen, is which styles are *drawn* and
which are the agreed fallback:

> A drawn filled style needs a face the stroke closes. A face comes from
> either the glyph enclosing area, or from a square/circle container.

```
open glyph   + no container   ->  stroke drawn, the other three fall back
open glyph   + square/circle  ->  all four drawn: the container is the face
closed glyph + no container   ->  all four drawn
closed glyph + square/circle  ->  all four drawn
```

An open glyph's fallbacks:

- **Fill** is a copy of the stroke.
- **Two-tone** and **duotone** grey one part and leave the rest at full
  strength. A muted tone needs no face: a *stroke* at 0.4 works as well as a
  fill, and `DUOTONE` counts `stroke-opacity` alongside `fill-opacity` for
  exactly that reason. `signal-low` and `signal-medium` grey the bars above the
  current level; the 16 `*-dashed-panel` icons grey the panel and leave the
  arrow at full strength, which suits a shape that already reads as a boundary.
  `cursor-dashed-panel` is the exception in that family: its glyph *is*
  fillable, so its filled styles are drawn.
- A drawing with no second part to grey (`x`, `percent`, `more-*`) ships its
  two-tone and duotone as the stroke drawing too.

Fillability is **measured, never guessed from the name**: `enclosesArea` in
`lib/geom.mjs` asks whether any closed subpath of the outline encloses 8 square
units or more. The threshold ignores incidental closed dots, a lock's keyhole or
an alert's period, which are closed but are not what makes a glyph fillable. It
misses a face closed by another of the drawing's own strokes rather than by a
closed subpath: `flag`'s pole is its left edge, `plane`'s silhouette is shut by
its fuselage, a `book`'s spine rolls through its own starting point, and
`buildings` runs its ground line twice. Those are closed, and their filled
styles are drawn.

This distinction is easy to get wrong by eye. `bar-chart` is
`M4 9V22M12 2V22M20 16V22`: three open strokes with no interior. It *looks*
fillable; it isn't. So its fill is its stroke, its two-tone and duotone grey
two of the bars, and the containered `square-bar-chart` and `circle-bar-chart`
carry the drawn filled styles. `triangle-alert`, by contrast, closes around a
real interior, so all four of its styles are drawn.

`COVERAGE` enforces the parity half: an error when a name is missing any style,
or a whole corner treatment, whatever its shape. Which styles are drawn and
which are copies is the drawing's half, and is not linted: read it off the
measure above.

### A compound measures open, and its base decides

Measuring the outline has one blind spot, and the modifier convention causes it.
A compound cuts a gap in the base rather than stacking on top, so the base's
outline stops being closed. `smartphone` is a closed rounded rect;
`smartphone-check` is the same phone with its bottom-right corner opened for the
tick, and no subpath closes. Measured literally it is an open-stroke glyph,
although its fill paints a 195-unit region.

Read a compound's fillability off its base, by suffix only, so a container
prefix never grants it: `smartphone-check` draws its filled styles because
`smartphone` does, and `bar-chart-down` falls back because `bar-chart` is three
open strokes. The linter made this lookup while it still flagged a fill on an
open glyph; parity dropped that flag, and the lookup went with it.

### A counter is not a fillable body

`at`'s bowl encloses 50 square units, so `enclosesArea` is right that the glyph
closes. What it closes around is the counter of a letterform-derived mark, which
is white by definition. Fill it and the @ becomes a ring with a blob in it;
mute it and the blob reads as a highlight rather than a second tone, because
there is no second *part* to tone against. Both were drawn and both were
rejected on sight, so `at`, `percent` and `heading-6` take the open glyph's
fallback: their fill is the stroke drawing, and their two-tone and duotone
follow the open glyph's rule above. The linter used to excuse their filled
styles by name (`COUNTER`); parity asks every name for every style, so this
paragraph is now the record of the decision.

Read it narrowly. It is the distinction the set already makes for `question`
and the other marks, which simply have no closed counter to expose it; it is not
a waiver for objects. A body that encloses a region still has its filled styles
drawn, and every other rule still applies to `at`.

### A dashed level indicator's fill is its stroke

`circle-half`'s stroke variant is a *solid* wedge, not an outline, because a
progress indicator has to show a filled portion to read as progress. So the
styles do not vary the glyph at all, they vary what sits behind it: stroke has
nothing, two-tone and duotone mute a disc, fill draws the ring.

A dashed container is a stroke by definition, so it is already present and
unmuted in the stroke variant. A fill adds nothing and lands byte-for-byte
identical, and since parity `circle-dashed-*` and `square-dashed-*` ship it
anyway, as that copy. `circle-dashed-check` arrived at the same shape.

`COVERAGE` asks them for the fill like any other name; `DASHED_LEVEL` now only
lets their filled styles' inner solids carry 2.5 (*Corner radius*, above).

A useful consequence: since the wedge stays solid it also stays the same size,
and every dashed level reuses its solid sibling's path unchanged. An outlined
wedge would have cleared the ring by only 1 instead of 2 — the outline puts a
unit of ink outside the path — and would have had to shrink to fit.

## Settled decisions

Recorded 8 Aug 2026. These are what the linter enforces — change the rule here
and in `lint.mjs` together, never one alone.

**Every icon comes in all four styles.** The founding answer was no, with
obligation derived from geometry; the parity rule reversed it at 1.0.0, and
geometry now decides which styles are drawn rather than which exist (the
coverage rule above). A container is still never the route to a fill:
`smartphone` and `lock` carry their filled styles directly and have no
container, and `cursor` carries its own as well as shipping `circle-cursor` and
`square-cursor`.

**Containers apply only to simple glyphs.** No `square-user-check`. Wrapping an
already-compound icon crowds the 24-unit grid: the modifier would have to shrink
below what a 2px stroke can render legibly. Compounds carry the four styles
directly. The other set takes the same position.

**The muted tone is `0.4`**, in two-tone and duotone alike. Raised from `0.2`,
where the muted layer was too faint on light backgrounds to read as a second
tone, which is what made the all-muted drawings of the time look like a disabled
state. Enforced by `SECONDARY_OPACITY` in `lint.mjs`; a stale `0.2` export now
fails the build.

**Two-tone is the outline drawing plus a muted fill behind it** (it was called
duotone until 0.9.0). Never the solid at reduced opacity, and the outline stays
at full strength. `lock` was already the correct model; `user` and `circle` were
not. **Duotone**, from 1.0.0, has no outline: a grey body and black detail,
decided per icon.

**Modifiers sit in a fixed place.** A compound is a base glyph plus a small
modifier (`user-check`, `user-lock`), and the modifier takes one fixed place
per family, usually the bottom-right corner, at a fixed size, defined once in
the Figma component so it cannot drift. Where it overlaps the base, cut a knockout gap equal to the stroke width
rather than stacking — the solid `circle-user` already does this with
`fill-rule="evenodd"`.

> Not linted. The placement was left a drawing convention until compounds
> existed in every style to test a check against; they have since 1.0.0, and
> no check has been written yet.

## What `check-readmes` checks

Nine numbers, spread across `README.md` and `packages/react/README.md`: the
icon count, the four per-style counts, the SVG total and the two container
counts, plus the icon count the React package repeats.

They are the only counts in the project that are *prose*, so upstream they sat
at 414 icons and 1,059 SVGs while the set grew past 500. Nothing failed and nothing
warned; the first line of the repo's front page was simply wrong.

Two things about how it is written:

- **It matches the sentence, not the digits.** Each claim is a regex with one
  capture group around the number, so a reworded line reports `MISSING` rather
  than quietly ceasing to be checked. That failure is not fixable by `--fix` and
  is not meant to be: the pattern has to follow the new wording.
- **`--fix` substitutes digits and touches nothing else.** It also keeps the
  formatting it found, so `1,286 SVGs` stays comma'd and a bare table cell stays
  bare. A generated README would invite someone to correct a stale number by
  rewriting the paragraph around it; this cannot.

Adding a claim is one row in `CLAIMS`.

## What `check-figma` checks

Every variant is reduced to a **segment-set signature** on both sides, and the
two are diffed. Every segment the geometry draws — with its Bezier controls — is
written in one canonical spelling, bucketed by paint, deduplicated, sorted and
hashed.

| | |
|---|---|
| the signature differs | **real.** The two are not the same drawing |
| a stroke is not `CENTER`-aligned | **real.** SVG strokes are always centred, so anything else renders in Figma differently from what ships — and on an *open* subpath `INSIDE` renders as nothing at all |
| a variant is missing | **real.** One side has a style the other does not |

Bounds are still reported, but only inside the message, so a hit reads as
something rather than a bare "differs".

This replaced a digest of layer count, subpath count and painted bounds. That
digest passed **176 drifted variants**, because all three can hold still while
the drawing moves. `git-check`'s duotone stored its ring at r=4 — the *plate's*
radius — instead of the r=3 centreline: same outer bounds as the plate beside it,
same counts, but painted the ring overshot the plate and the stem's cap landed
inside the muted fill as a black notch. `git-commit-horizontal`'s duotone still
had both side bars in its geometry and rendered neither, because the layer
carried `strokeAlign: INSIDE`.

A signature over the geometry has to ignore the four ways Figma and `raw/`
disagree without meaning anything. Each of these cost a false-positive round:

- **Direction.** Figma may store a segment end-to-start. Canonical spelling.
- **Grouping.** Figma's vector network splits polylines at shared vertices, and
  `build` merges sibling layers. Segments pool per paint bucket, not per subpath
  or per layer.
- **Float32.** Figma stores `11.995` as `11.994999885`. Rounding to 0.1 lands
  both on one value; 0.01 does not, because they straddle a boundary.
- **Duplicates.** `raw/` often closes a shape with `V<y>Z`, a run back to the
  start that Figma leaves to `Z`. A set that ignores duplicates reconciles them.

Paint buckets are keyed by what is painted, not how it is layered, which is what
absorbs the `<path fill stroke>` vs two-stacked-layers disagreement: a path
carrying both contributes to both buckets.

What it deliberately does *not* ignore is connectivity. An earlier attempt
compared bare point sets and gave all four of `file-arrow-{up,down,left,right}`
the same signature — same four vertices, different joins — so an arrow pointing
the wrong way would have sailed through.

One measurement trap is baked in: the Figma side takes bounds from
`absoluteRenderBounds`, not from `x`/`width` plus half a stroke. The latter
assumes every stroke is centre-aligned, which is exactly the property this file
lost once and no longer guarantees on its own.

`NOSTROKE` is the one nothing else catches. `PhoneIcon` resolves
art as `art[style] ?? art.stroke` and render `null` when that misses too, so an
icon with no stroke does not fail — it disappears. Stroke being the base of
every icon is what makes it a safe fallback, and what makes its absence a bug
rather than a gap.

Because a rename is the expected cause, a failure reports the likely new name:
same tokens in a different order first, then the longest shared prefix.

New demos are picked up automatically — any `export const <X>_ICON_NAMES` under
`lib/` is checked, so this does not need editing when a page is added.

## Adding icons

1. In Figma, select the **Components** page and Export → SVG.
2. Drop the result into `raw/`.
3. `pnpm icons:lint` and fix what it reports.
4. `pnpm icons:build`, then `pnpm readmes:fix` if the counts moved.
5. `pnpm icons:ci` and `pnpm build`, then commit `raw/`, `icons/` and the
   READMEs together.
6. Add the new name's search tags, aliases, category and description to the
   files in `data/`.

Figma exports component-set variants as one folder per set, with the variant
properties as the filename:

```
raw/arrow-down/Container=regular, Style=stroke.svg   ->  icons/stroke/arrow-down.svg
raw/arrow-down/Container=square, Style=fill.svg      ->  icons/fill/square-arrow-down.svg
raw/arrow-down/Container=circle, Style=duotone.svg   ->  icons/duotone/circle-arrow-down.svg
```

The build reads the icon name from the folder and the container/style from the
filename, so there is no renaming step. Hand-authored icons can still go
straight into `raw/<style>/<name>.svg`; defining the same icon in both layouts
fails the build rather than letting one silently win.

The component sets have carried a third property, `Corners`, since 29 Aug 2026,
and the build reads it: `Container=…, Style=…, Corners=….svg`, with the
property optional so a set drawn before the axis still lands. Sharp goes to
`icons/sharp/<style>/<name>.svg` — its own namespace rather than a suffix on
the name, so every rounded import that predates the axis still resolves and
`[element]-[modifier]` goes on meaning what it says.

This paragraph used to say the pipeline did not parse the property and to
strip `, Corners=regular` from every filename by hand, which was true for four
days and is a renaming step nobody needs now.

> Export from the Components page, not the catalogue. The catalogue's frames
> carry no style information — that is what the component sets encode.

## Releases

Nothing is published yet. Every package.json is `"private": true` and
`.github/workflows/publish.yml` is disabled. Upstream's release process (tags,
`build-history`, `ship`, the Paper and Figma storefronts) was removed with the
site; it is in git history and in the upstream repo if it's needed again.
Never publish or push a tag without the owner's approval.
