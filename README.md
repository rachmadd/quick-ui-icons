# Quick UI Icons

The icon set for Quick UI. **2,013 icons, drawn on one 24px grid** with a 2px
stroke, in four styles, each with rounded and sharp corners.

| Style | Icons | What it is |
| --- | --- | --- |
| `stroke` | 2,013 | 2px outlines. The default. |
| `two-tone` | 2,013 | The outline over a flat plate at reduced opacity. |
| `duotone` | 2,013 | No outline: a grey body with the detail at full strength. |
| `fill` | 2,013 | Solid, with the detail knocked out of the shape. |

Every style comes with rounded corners and with sharp ones, so the repo holds
16,104 SVGs in total.

67 icons come in a `square-` form and 72 in a `circle-` form, which wrap the
base drawing in a container.

## The package

`@quick-ui/icons` (`packages/react`) is the React package. It isn't published
yet. Today it has one entry point per style and corner treatment:
`@quick-ui/icons`, `/two-tone`, `/duotone` and `/fill`, and the same four under
`/sharp`.

Coming, not built yet: a `variant` prop to choose the style, and two entry
points for the corners, `@quick-ui/icons` for rounded and `@quick-ui/icons/sharp`
for sharp.

## Layout

```
raw/<name>/          Figma exports. The source of truth.
icons/               SVGs built from raw/, rounded and sharp. Don't edit them.
packages/react/      @quick-ui/icons. Its src/ is built from icons/.
data/                Search tags, aliases, categories and descriptions.
pipeline/            The build, the linter and the checks.
tools/               Scripts that drew past batches of icons.
```

`pipeline/README.md` explains the build and the drawing rules. Before you open a
PR, run `pnpm icons:ci` and `pnpm build`. CI runs both.

## Credits

Quick UI Icons is based on [Keyline Icons](https://keylineicons.com)
([keyline-icons/keyline-icons](https://github.com/keyline-icons/keyline-icons)),
which is MIT licensed. The drawings and the pipeline are theirs. Keyline's
copyright notice stays in [LICENSE](LICENSE), and new icons come from their repo
through the `upstream` remote.

We changed the name, the package name and the repo metadata. We removed
Keyline's website, its shadcn registry, and its React Native, CLI, MCP and Figma
plugin packages, and moved the icon metadata to `data/`. The `variant` prop
will be ours too, once it's built.

## License

MIT. See [LICENSE](LICENSE). Keyline's license doesn't grant rights in the name
"Keyline Icons", so we don't use it as a product or package name.
