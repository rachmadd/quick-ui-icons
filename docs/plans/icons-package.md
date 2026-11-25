# Plan: `@quick-ui/icons` with a `variant` prop

This is the owner's brief from 2026-11-25, recorded so each phase can be
checked against it. Each phase gets its own branch and PR, and work stops at
the end of every phase until the owner approves the next one. Logs and
measurements go in `.work/`, which is gitignored.

## Status

| Phase | What | Status |
| --- | --- | --- |
| 0 | Audit, no code | Done on `phase-0-audit`, PR #2. The report is in the PR, and a local copy is in `.work/phase-0.md`. Waiting on the owner's decisions |
| 1 | Generator and package | Not started |
| 2 | Tree-shaking and size | Not started |
| 3 | Built-in subset for Quick UI | Not started |
| 4 | "Slightly rounder" trial | Not started |
| 5 | Apply the rounding | Only if phase 4 is approved |
| 6 | Release readiness, no publishing | Not started |

## Goal

One React component per icon. The style is chosen with a prop instead of one
import per style:

```tsx
import { StarIcon } from '@quick-ui/icons'

<StarIcon />                 // outline
<StarIcon variant="fill" />
<StarIcon variant="duotone" />
```

- Styles: outline, fill and duotone only, all rounded. Sharp and two-tone
  aren't built, though their sources stay in the repo. "Outline" is the
  `stroke` style in `icons/`.
- Every icon tree-shakes on its own: an app that imports one icon ships that
  icon's three styles and nothing else.
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

## Phases

**0. Audit (no code).** The source format, with a count of each primitive per
style. How the current pipeline builds the React package, and what can be
reused. Path data precision and bytes per style. Icons whose styles differ in
which names exist. A recommended file layout, and anything in the goal that
looks wrong.

**1. The generator and the package.** `scripts/generate.*` reads the outline,
fill and duotone sources and writes one function per icon taking `variant`,
named `{Name}Icon` with a plain `{Name}` alias. Generated files get a header
saying they're generated, with Keyline's MIT notice. Coordinates are rounded
(2 decimals unless phase 0 says otherwise), with the bytes saved reported and
a sample rendered at 24px and 48px. TypeScript types, ESM only,
`sideEffects: false`, `"private": true`. Tests: every icon renders all three
variants with the right root attributes, the variant defaults to outline,
props pass through, `aria-hidden` can be overridden, and running the
generator again leaves no diff.

**2. Prove tree-shaking and size.** Fixtures that import 1, 3 and 30 icons,
built with Vite (Rollup) and a Next.js production build, with bytes and
gzipped bytes recorded for each. The same set compared against
`@keyline-icons/react` importing the same icons in outline and fill. A check
that unused icons are absent from the output, not only small. The dev-mode
cost recorded. A size test that fails if one icon goes over its measured
budget.

**3. The built-in subset for Quick UI.** A generator output that writes Quick
UI's `packages/react/src/components/icons/icons.tsx` from this set's data. It
contains only the shapes listed in that repo's
`docs/plans/tasks/T23-icons.md` ("Every built-in icon"), each a plain
component with no `variant` prop, except where the table names a fill shape
(the rating star, the radio dot). The output goes to `.work/built-in/icons.tsx`
along with a note on how quick-ui should take it in. The quick-ui repo isn't
edited.

**4. "Slightly rounder", as a trial.** Rounder corners on about 35 common
icons, with every style of an icon keeping the same shape. A gallery shows
original and rounder side by side, at 16, 24 and 48px, in light and dark. The
work stops there for the owner to decide whether to go on, and by how much.

**5. Apply the rounding (only if phase 4 is approved).** The rounding goes
through the generator, so it can be reproduced from the upstream sources. A
before-and-after of every icon flags where the change goes wrong (crossed
strokes, lost detail, a fill that no longer matches its outline). Each one is
fixed or excluded, and listed.

**6. Release readiness (no publishing).** A README covering usage, the
`variant` prop and the credits, following Quick UI's writing guide
(`docs/plans/06-docs-style-guide.md` in quick-ui). A sync script that pulls a
new upstream Keyline release, runs the generator and reports new, changed and
removed icons. A CHANGELOG. Nothing is published, versioned or tagged, and the
report says what's left for the owner to do.

## Not in scope

- `variant="auto"` (filling an icon when its parent is pressed or selected).
  The owner hasn't decided, so ask before adding it.
- Any change to the quick-ui repo.
- An icon browsing website.
