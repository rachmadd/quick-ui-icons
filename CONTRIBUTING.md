# Contributing

This is a small project with a strict drawing standard, so the most useful thing
to know up front is where the rules live and which files you're allowed to edit.

## Generated files

**`icons/` and `packages/react/src/` are generated. Don't edit them.**
`packages/react/src/` isn't even committed: `pnpm build` and `pnpm icons:ci`
generate it. The source of truth is `raw/`, and the rest is built from it:

```
raw/<name>/*.svg  ->  icons/[sharp/]<style>/<name>.svg  ->  packages/react/src/*.tsx
```

A hand-edit to a generated file passes review, gets committed, and is destroyed
the next time anyone runs the build. `pnpm icons:ci` catches it.

## Setup

Node 20.9 or newer, and pnpm.

```bash
pnpm install
```

## Before you open a pull request

```bash
pnpm icons:ci
pnpm build
```

`icons:ci` runs the sync checks for `icons/` and the React modules, the README
counts, the geometry linter and `tsc` over `packages/react`. `build` compiles
the package. CI runs both, so what passes locally passes on GitHub.

`pnpm icons:figma` sits outside CI on purpose: it compares the Figma file
against `raw/`, and CI has no Figma file. Run it by hand if you touched the
drawings.

## Adding an icon

Read `pipeline/README.md` first, particularly **Adding icons** and **The
coverage rule**. The standard is measured: the ink envelope, the corner-radius
table, the circle sizes, the 2-unit gap between elements, the 6-unit modifier
box. The linter tells you the number it wanted and which rule it came from.

The parts that catch people out:

- Every name ships all four styles, in both corner treatments, but which ones
  are drawn isn't a choice. A filled style needs a face the stroke closes, from
  the glyph's own enclosed area or from a square or circle container.
  `bar-chart` is three open strokes, so its fill is its stroke, and its
  two-tone and duotone grey two of the bars. That's correct, not a gap.
- Draw it in Figma and export, instead of writing path data by hand.
  `raw/README.md` covers the export layout.
- Check it at 16px. A glyph that reads at 96 and fills in at 16 isn't finished.
- Give it search tags, aliases, a category and a description in `data/`.

## Commits

Use `type: description`, where type is one of `feat`, `fix`, `refactor`, `docs`,
`test`, `chore`, `perf` or `ci`. Write the subject in the imperative, and use
the body to say why, what you measured against and what you ruled out.

## Reporting things

Open an issue. For a drawing that looks wrong, a screenshot at the size it looks
wrong at is worth more than a description. Say which style and which corner
treatment you were using.

## License

By contributing you agree that your work is licensed under the MIT license in
[LICENSE](LICENSE).
