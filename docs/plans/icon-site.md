# Plan: a basic icon site

The owner's request from 2026-11-26: "setup a basic web for me to see every
icons, and give some usage documentation." This is separate from the phased
package plan in `icons-package.md`. That plan left an icon website out of
scope, and this request brings a basic one in.

## Status

| What | Status |
| --- | --- |
| Icon browser and usage docs in `site/` | Built on `icon-site`, stacked on the Keyline 3.1.0 sync (PR #7). Waiting on the owner |
| Hosting | Not decided. It runs locally, and `pnpm site:build` makes a static build that any static host can serve |

## What it is

- **A Vite + React app in `site/`** that renders the real `@quick-ui/icons`
  components from `packages/react/src`, so the site shows exactly what the
  package ships.
- **The icon browser:** every icon, with search by name, keywords and aliases
  from `data/`, a category filter, variant (outline, fill, duotone), corners
  (rounded, sharp) and size. Selecting an icon shows all its drawings, its
  description and category, and copyable import, JSX and SVG.
- **The docs:** installing, variants, rounded or sharp, size and color,
  accessibility, server components, names, and moving from
  `@keyline-icons/react`, with live examples. It follows Quick UI's writing
  guide.

## Not in it (yet)

- Hosting and a domain. A future icon browser on quick-ui.com was always meant
  to read `data/`, and this site can grow into it.
- Per-icon pages and URLs, an icon request flow, or downloads beyond copying.
