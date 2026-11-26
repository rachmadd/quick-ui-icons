# Quick UI Icons

Quick UI's icon set, forked from Keyline Icons (MIT). It holds 2,013 icons on a
24px grid in four styles (`stroke`, `two-tone`, `duotone`, `fill`), each with
rounded and sharp corners, so eight styles in all. It also holds the pipeline
that builds them and one package, `@quick-ui/icons` (`packages/react`). There is
no site.

In progress: one component per icon with a `variant` prop (outline, fill,
duotone), rounded from `@quick-ui/icons` and sharp from
`@quick-ui/icons/sharp`, with no two-tone. It's built in phases from
`docs/plans/icons-package.md`, which also records the decisions.
Each phase gets its own branch and PR. Stop at the end of each one and wait for
the owner.

## Where things live

- `raw/<name>/` holds the Figma exports and is the source of truth.
- `icons/` (rounded) and `icons/sharp/` are built from `raw/` by
  `pipeline/build.mjs`.
- `packages/react/src/` is built from `icons/` and `icons/sharp/` by
  `scripts/generate.mjs` during `pnpm build`, `pnpm test` and `pnpm icons:ci`.
  It's gitignored, not committed. Tests are in `packages/react/test/`.
- `packages/react/test/size-budget.json` holds each icon's size budget. The
  size test fails if an icon grows past it. After an intended change, run
  `pnpm size:budget` and commit the new budget with the change.
- `fixtures/bundle-size/` measures real Vite and Next bundles. Run it by hand;
  it isn't in CI.
- `icons/` and `packages/react/src/` are generated, so never edit them by hand.
  Change `raw/` or the generator, then rebuild.
- `data/` holds the icon metadata: search tags, aliases, categories,
  descriptions and renames. A future icon browser on quick-ui.com reads it.
  Edit it by hand.
- `pipeline/README.md` explains the build and the drawing rules.
- `docs/plans/` holds the owner's briefs and their status.
- `.work/` holds logs and measurements. It's gitignored, so put anything the
  owner needs into the PR as well.

Run `pnpm icons:ci`, `pnpm build` and `pnpm test` before you finish. CI runs
all three.

## Rules

- Never publish a package, push a tag or create a release without the owner's
  approval. Every package.json is `"private": true` and the publish workflow is
  disabled. Leave both as they are unless the owner asks.
- Keep Keyline's notice ("Copyright (c) 2026 Keyline Icons") in `LICENSE`, in
  `packages/react/LICENSE`, and in every generated file's header.
  `scripts/lib/emit.mjs` writes that header, and a test fails without it.
- Don't use "Keyline Icons" as a product or package name. Use it only to credit
  them.
- The `upstream` remote is Keyline's repo. Fetch from it to pick up new icons,
  but don't merge without the owner's approval, and never push to it. Upstream
  still has the site and the packages this fork removed, so a merge would bring
  them back.
- Ask the owner before any choice with a real trade-off.

## Commits

Use `type: description`, where type is one of `feat`, `fix`, `refactor`, `docs`,
`test`, `chore`, `perf` or `ci`. Write the subject in the imperative, and use
the body to say why.
