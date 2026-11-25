<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
# Quick UI Icons

Quick UI's icon set, forked from Keyline Icons (MIT). It holds 2,013 icons on a
24px grid, the pipeline that builds them, the site that browses them and the
packages. `@quick-ui/icons` (`packages/react`) is the package that will ship.
Quick UI uses the rounded `stroke` and `fill` styles.

## Where things live

- `raw/<name>/` holds the Figma exports and is the source of truth.
- `pipeline/` builds everything else from `raw/`. `pipeline/README.md` explains
  the build and the drawing rules.
- These are generated, so never edit them by hand: `icons/`, `components/icons/`,
  `packages/*/src/`, `packages/*/icons.json`, `registry.json`, `registry/` and
  `previews/`. Change `raw/` or the generator, then rebuild.
- `app/`, `components/` and `lib/` are the site. It still uses Keyline's name
  and domain.

Run `pnpm icons:ci` before you finish. CI also runs `pnpm lint` and
`pnpm build`.

## Rules

- Never publish a package, push a tag or create a release without the owner's
  approval. Every package.json is `"private": true` and the publish workflow is
  disabled. Leave both as they are unless the owner asks.
- Keep Keyline's notice ("Copyright (c) 2026 Keyline Icons") in `LICENSE`, in
  each `packages/*/LICENSE`, and in every generated file's header. The
  generators don't write a header yet. When one is added, it has to carry this
  notice.
- Don't use "Keyline Icons" as a product or package name. Use it only to credit
  them.
- The `upstream` remote is Keyline's repo. Fetch from it to pick up new icons,
  but don't merge without the owner's approval, and never push to it.
- Ask the owner before any choice with a real trade-off.

## Commits

Use `type: description`, where type is one of `feat`, `fix`, `refactor`, `docs`,
`test`, `chore`, `perf` or `ci`. Write the subject in the imperative, and use
the body to say why.
