# Quick UI Icons

The icon set for Quick UI. **2,169 icons, drawn on one 24px grid** with a 2px
stroke, in four styles, each with rounded and sharp corners.

| Style | Icons | What it is |
| --- | --- | --- |
| `stroke` | 2,169 | 2px outlines. The default. |
| `two-tone` | 2,169 | The outline over a flat plate at reduced opacity. |
| `duotone` | 2,169 | No outline: a grey body with the detail at full strength. |
| `fill` | 2,169 | Solid, with the detail knocked out of the shape. |

Every style comes with rounded corners and with sharp ones, so the repo holds
17,352 SVGs in total.

67 icons come in a `square-` form and 72 in a `circle-` form, which wrap the
base drawing in a container.

## The package

`@quick-ui/icons` (`packages/react`) is the React package. It isn't published
yet. Each icon is one component, and its `variant` prop picks the outline, fill
or duotone drawing. Rounded corners come from `@quick-ui/icons` and sharp ones
from `@quick-ui/icons/sharp`, under the same names:

```tsx
import { BellIcon } from '@quick-ui/icons'

<BellIcon variant="fill" className="size-4" />
```

The package doesn't include two-tone, though its drawings stay in `raw/` and
`icons/`. [packages/react/README.md](packages/react/README.md) covers usage.

## Layout

```
raw/<name>/          Figma exports. The source of truth.
icons/               SVGs built from raw/, rounded and sharp. Don't edit them.
packages/react/      @quick-ui/icons. Its src/ is built from icons/.
data/                Search tags, aliases, categories and descriptions.
pipeline/            The build, the linter and the checks.
```

`pipeline/README.md` explains the build and the drawing rules. Before you open a
PR, run `pnpm icons:ci`, `pnpm build` and `pnpm test`. CI runs all three.

To pick up a new Keyline release, run `pnpm sync:upstream`. It copies the
release's drawings into `raw/`, rebuilds, and lists the icons that are new,
changed or removed, with the steps that follow. It doesn't commit anything.

## Credits

Quick UI Icons is based on [Keyline Icons](https://keylineicons.com)
([keyline-icons/keyline-icons](https://github.com/keyline-icons/keyline-icons)),
which is MIT licensed. The drawings and the pipeline are theirs. Keyline's
copyright notice stays in [LICENSE](LICENSE), and new icons come from their repo
through the `upstream` remote.

We changed the name, the package name and the repo metadata. We removed
Keyline's website, its shadcn registry, and its React Native, CLI, MCP and Figma
plugin packages, and moved the icon metadata to `data/`. The package's shape is
ours: one component per icon with a `variant` prop, and the generator that
builds it.

## License

MIT. See [LICENSE](LICENSE). Keyline's license doesn't grant rights in the name
"Keyline Icons", so we don't use it as a product or package name.
