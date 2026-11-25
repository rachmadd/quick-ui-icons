# Quick UI Icons

The icon set for Quick UI. **2,013 icons, drawn on one 24px grid** with a 2px
stroke.

Quick UI uses two styles: the rounded outline, and the rounded fill for anything
active, such as a selected tab or a pressed toggle. The repo still holds the
other styles it came with:

| Style | Icons | Used by Quick UI |
| --- | --- | --- |
| `stroke` | 2,013 | Yes, the default |
| `two-tone` | 2,013 | No |
| `duotone` | 2,013 | No |
| `fill` | 2,013 | Yes, for active states |

Each drawing also comes with sharp corners, which Quick UI doesn't use, so the
repo holds 16,104 SVGs in total.

67 icons come in a `square-` form and 72 in a `circle-` form, which wrap the
base drawing in a container.

The plan is to choose the style with a prop on each icon, instead of importing
it from a different entry point. That prop isn't built yet. Today
`packages/react` exports one entry point per style.

Nothing is published yet, and every package is private.

## Layout

```
raw/<name>/          Figma exports. The source of truth.
icons/               SVGs built from raw/. Don't edit them.
components/icons/    React components built from icons/. Don't edit them.
pipeline/            The build, the linter and the checks.
packages/            @quick-ui/icons (packages/react) and the other packages.
app/, components/    The site that browses the set. It still carries Keyline's
                     name and domain until a later task rebrands it.
```

`pipeline/README.md` explains the build and the drawing rules. Before you open a
PR, run `pnpm icons:ci`. CI also runs `pnpm lint` and `pnpm build`.

## Credits

Quick UI Icons is based on [Keyline Icons](https://keylineicons.com)
([keyline-icons/keyline-icons](https://github.com/keyline-icons/keyline-icons)),
which is MIT licensed. The drawings and the pipeline are theirs. Keyline's
copyright notice stays in [LICENSE](LICENSE) and in the header of every
generated file, and new icons come from their repo through the `upstream`
remote.

We change the name, the package names and the repo metadata, and we narrow the
set Quick UI uses to the rounded `stroke` and `fill` styles. The style prop
will be ours too, once it's built.

## License

MIT. See [LICENSE](LICENSE). Keyline's license doesn't grant rights in the name
"Keyline Icons", so we don't use it as a product or package name.
