# Plan: `@quick-ui/icons` with a `variant` prop

This is the owner's brief from 2026-11-25, recorded so each phase can be
checked against it. Each phase gets its own branch and PR, and work stops at
the end of every phase until the owner approves the next one. Logs and
measurements go in `.work/`, which is gitignored.

## Status

| Phase | What | Status |
| --- | --- | --- |
| 0 | Audit, no code | Done on `phase-0-audit`, PR #2. The report is in the PR, and a local copy is in `.work/phase-0.md`. Every decision is made (see Decisions) |
| 1 | Generator and package | Done on `phase-1-generator`, PR #3. The report is in the PR, and a local copy is in `.work/phase-1.md`. Waiting on the owner |
| 2 | Tree-shaking and size | Done on `phase-2-size`, PR #4. The report is in the PR, and a local copy is in `.work/phase-2.md`. Waiting on the owner |
| 3 | Built-in subset for Quick UI | Done on `phase-3-built-in`, PR #5. The report is in the PR, and a local copy is in `.work/phase-3.md`. Waiting on the owner |
| 4 | "Slightly rounder" trial | Not started |
| 5 | Apply the rounding | Only if phase 4 is approved |
| 6 | Release readiness, no publishing | Not started |

## Goal

One React component per icon. The style is chosen with a prop instead of one
import per style, and the corner treatment is chosen by the import path:

```tsx
import { StarIcon } from '@quick-ui/icons'        // rounded
import { StarIcon } from '@quick-ui/icons/sharp'  // sharp, same names

<StarIcon />                 // outline
<StarIcon variant="fill" />
<StarIcon variant="duotone" />
```

- Styles: outline, fill and duotone. "Outline" is the `stroke` style in
  `icons/`.
- Corners: rounded from `@quick-ui/icons`, sharp from `@quick-ui/icons/sharp`.
  Both entry points export the same names with the same `variant` prop.
- Two-tone isn't built. Its sources stay in `raw/` and `icons/two-tone/` for
  now (see the decisions below).
- Every icon tree-shakes on its own: an app that imports one icon from one
  entry point ships that icon's three styles in that corner treatment and
  nothing else.
- Each icon is a 24px grid, colored with `currentColor`, `aria-hidden` by
  default, and takes every `<svg>` prop. It has no `'use client'`, so server
  components can render it.
- Quick UI sizes icons through CSS, so there's no size prop beyond what
  `<svg>` props give. Phase 0 checks whether Keyline's `size` prop should
  stay.
- An earlier measurement, with Bun and minified: a plain `export function`
  per icon that picks its style at runtime kept unused icons out of the
  bundle, at about 40 B gzipped per used icon over importing both styles
  directly. Use that shape with `sideEffects: false` unless phase 0 finds a
  better one.

## Decisions

Recorded with the date and the reason, so a later phase doesn't reopen them.

- **2026-11-25: sharp ships, chosen by import path, not by prop.** The owner
  wants people to choose between sharp and rounded. A `corners` prop is
  decided at runtime, so the bundler can't drop the treatment an app doesn't
  use. Every icon would ship six drawings instead of three, and the sharp
  modules are 83 to 88% the size of the rounded ones. Corners are also an
  app-wide choice, while `variant` changes per instance (outline at rest,
  fill when active). Because both entry points export the same names, an app
  switches by changing the import path or with one bundler alias.
- **2026-11-25: two-tone is dropped from the package.** Its sources stay for
  now. Removing them from `raw/` and the pipeline would be a separate cleanup
  PR, and only if the owner asks. Without them, the upstream sync script
  would have to filter two-tone out of each Keyline release.

- **2026-11-25: Keyline's 10 deprecated rename aliases are dropped.**
  `@quick-ui/icons` has no users yet, so they would only carry Keyline's
  history. `data/icon-renames.json` stays for our own future renames.
- **2026-11-25: generated files get a two-line `//` header.** It says the
  file is generated and carries "Copyright (c) 2026 Keyline Icons, MIT". A
  plain `//` comment is stripped by minifiers, while a `/*! */` or
  `@license` comment would ship one copy of the notice per imported icon.
  The full text stays in `packages/react/LICENSE`. The phase 3 `icons.tsx`
  keeps the full MIT text, because the registry copies that file alone.
- **2026-11-25: one file per icon, per entry point,** with a barrel for each:
  `src/icons/star.tsx`, `src/sharp/icons/star.tsx`, plus a shared
  `src/icon.tsx`. With `sideEffects: false`, an unused icon is an unused
  module, and Next.js can rewrite barrel imports to single files in dev.
- **2026-11-25: the generator is `scripts/generate.mjs`.** It replaces
  `pipeline/build-react.mjs`, which is deleted once phase 1 lands.

- **2026-11-25: the 79 closed icons whose duotone is the outline ship as
  drawn.** Examples are `star`, `circle`, `folder` and `bookmark`. They're
  listed in `.work/phase-0-data.json` (`copies.duotoneEqualsStrokeOnly`) so
  proper duotones can be drawn in Figma later. The generator doesn't
  substitute the fill, because that would hide the gap instead of fixing it.

- **2026-11-25: no `size` prop.** Icons take plain `<svg>` props only and
  default to `width="24" height="24"`. They're sized with `className`, with
  `width` and `height`, or with CSS from a parent such as `[&_svg]:size-4`,
  which is how Quick UI's components already do it. `size` would only repeat
  `width` and `height`, and CSS would override it inside Quick UI components
  without any warning. The README in phase 6 shows how to size icons and
  notes the difference from lucide and Keyline.

Every phase 0 question is answered.

- **2026-11-25 (phase 1): rounding is 2 decimals, adaptive at stroke ends.**
  Plain 2-decimal rounding visibly turned the butt cap on 10 sharp drawings,
  among them a 0.02-unit stub in `brain-side` that grew a tick. So a subpath
  whose open end would turn by more than 1° keeps 3 decimals, or its
  original data. That's 218 of 48,317 subpaths, and the savings stay at
  27.5% (rounded) and 25.9% (sharp). `scripts/lib/precision.mjs` has the
  rule.
- **2026-11-26 (phase 3, waiting for the owner to confirm): Rating's star is the
  outline.** T23's table names the fill set, but Rating paints one star drawing
  with CSS fill and stroke. The fill drawing's own `fill="currentColor"` beats
  that CSS, so empty stars would render full. The radio dot stays the fill
  drawing. One line in `scripts/built-in-icons.mjs` switches the star back.
- **2026-11-26: the package requires React 19** (`peerDependencies.react`
  is `>=19`). Quick UI is on 19.2, only 19 is tested, and an icon passes
  `ref` through as a prop, which React 18 doesn't do for function
  components.
- **2026-11-26: every icon in Quick UI will come from this set.** That covers
  the site, the examples and the blocks, which T23 Part B moves to
  `@keyline-icons/react` for now, as well as the packages' built-in icons
  from phase 3. The switch happens in quick-ui, once `@quick-ui/icons` can
  be installed there. Phase 6 lists what that needs. Nothing in the plan
  blocks it. Every icon name quick-ui imports from Keyline today (129, checked
  2026-11-26) is exported here under the same name. No quick-ui file passes
  Keyline's `size` prop. Of Keyline 2.6.0's exports, 17 aren't here. All 17 are its
  deprecated aliases for renamed icons (`AlignLeft` is `TextAlignStart`),
  which phase 0 dropped.

## Phases

**0. Audit (no code).** The source format, with a count of each primitive per
style. How the current pipeline builds the React package, and what can be
reused. Path data precision and bytes per style. Icons whose styles differ in
which names exist. A recommended file layout, and anything in the goal that
looks wrong.

**1. The generator and the package.** `scripts/generate.*` reads the outline,
fill and duotone sources, rounded and sharp, and writes two entry points,
`@quick-ui/icons` and `@quick-ui/icons/sharp`. Each has one function per icon
taking `variant`, named `{Name}Icon` with a plain `{Name}` alias, and the same
names in both. Today's other entry points, including two-tone, go. Generated files get a header
saying they're generated, with Keyline's MIT notice. Coordinates are rounded
(2 decimals unless phase 0 says otherwise), with the bytes saved reported and
a sample rendered at 24px and 48px. TypeScript types, ESM only,
`sideEffects: false`, `"private": true`. Tests: every icon renders all three
variants in both entry points with the right root attributes, both entry
points export the same names, the variant defaults to outline,
props pass through, `aria-hidden` can be overridden, and running the
generator again leaves no diff.

**2. Prove tree-shaking and size.** Fixtures that import 1, 3 and 30 icons,
built with Vite (Rollup) and a Next.js production build, with bytes and
gzipped bytes recorded for each. The same set compared against
`@keyline-icons/react` importing the same icons in outline and fill. A check
that unused icons are absent from the output, not only small, and that an app
importing from one entry point ships nothing from the other. Both entry
points are measured. The dev-mode cost recorded. A size test that fails if one
icon goes over its measured budget.

**3. The built-in subset for Quick UI.** A generator output that writes Quick
UI's `packages/react/src/components/icons/icons.tsx` from this set's data. It
contains only the shapes listed in that repo's
`docs/plans/tasks/T23-icons.md` ("Every built-in icon"), each a plain
component with no `variant` prop, except where the table names a fill shape
(the rating star, the radio dot). The output goes to `.work/built-in/icons.tsx`
along with a note on how quick-ui should take it in. The quick-ui repo isn't
edited.

**4. "Slightly rounder", as a trial.** Rounder corners on about 35 common
icons in the rounded set only, with every style of an icon keeping the same
shape. Sharp isn't touched. A gallery shows
original and rounder side by side, at 16, 24 and 48px, in light and dark. The
work stops there for the owner to decide whether to go on, and by how much.

**5. Apply the rounding (only if phase 4 is approved).** The rounding goes
through the generator to the rounded set only, so it can be reproduced from
the upstream sources and sharp stays as drawn. A
before-and-after of every icon flags where the change goes wrong (crossed
strokes, lost detail, a fill that no longer matches its outline). Each one is
fixed or excluded, and listed.

**6. Release readiness (no publishing).** A README covering usage, the
`variant` prop, the two entry points and the credits, following Quick UI's writing guide
(`docs/plans/06-docs-style-guide.md` in quick-ui). A sync script that pulls a
new upstream Keyline release, runs the generator and reports new, changed and
removed icons. A CHANGELOG. Nothing is published, versioned or tagged, and the
report says what's left for the owner to do.

## Not in scope

- `variant="auto"` (filling an icon when its parent is pressed or selected).
  The owner hasn't decided, so ask before adding it.
- Any change to the quick-ui repo.
- An icon browsing website.
