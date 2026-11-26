# @quick-ui/icons

2,169 icons on one 24px grid, as React components. Each one comes in outline,
fill and duotone, with rounded or sharp corners.

```bash
npm i @quick-ui/icons
```

It needs React 19.

## Usage

```tsx
import { BellIcon } from '@quick-ui/icons'

export function NotificationsButton() {
  return (
    <button type="button" aria-label="Notifications">
      <BellIcon className="size-5" />
    </button>
  )
}
```

## Variants

`variant` picks the drawing. It defaults to `"outline"`.

```tsx
import { StarIcon } from '@quick-ui/icons'

export function Stars() {
  return (
    <>
      <StarIcon />
      <StarIcon variant="fill" />
      <StarIcon variant="duotone" />
    </>
  )
}
```

A common pattern is the outline at rest and the fill when something is on:

```tsx
import { HeartIcon } from '@quick-ui/icons'

export function LikeButton({ liked, onToggle }: { liked: boolean; onToggle: () => void }) {
  return (
    <button type="button" aria-label="Like" aria-pressed={liked} onClick={onToggle}>
      <HeartIcon variant={liked ? 'fill' : 'outline'} className="size-5" />
    </button>
  )
}
```

Open shapes such as chevrons, arrows and `x` have nothing to fill, so they look
the same in every variant. Don't use `variant` alone to show state on those:
change the color or the icon too. A few closed shapes, `star` among them, have
no duotone drawing yet, and `duotone` gives their outline.

## Rounded or sharp

Rounded is the default. The sharp drawings have the same names under `/sharp`:

```tsx
import { BellIcon } from '@quick-ui/icons/sharp'
```

Pick one for the whole app. To switch, change the import path. Nothing else in
your code changes.

## Size and color

An icon is 24px unless you size it. Use a class, `width` and `height`, or CSS
on a parent:

```tsx
<BellIcon className="size-4" />
<BellIcon width={16} height={16} />
```

There's no `size` prop. CSS wins over `width` and `height`, so a parent rule
like `[&_svg]:size-4` sizes every icon inside it.

Icons draw in `currentColor`, so they take the text color around them:

```tsx
<BellIcon className="text-red-600" />
```

`strokeWidth` changes the weight of the strokes. The default is 2:

```tsx
<BellIcon strokeWidth={1.5} />
```

## Accessibility

Every icon renders `aria-hidden="true"`, because an icon usually sits next to
text or inside a button that has its own label. Give an icon-only button an
`aria-label`, as in the examples above. Screen readers have nothing else to
announce.

When the icon itself carries meaning, label it:

```tsx
<CircleAlertIcon aria-hidden={false} role="img" aria-label="Warning" />
```

## Server components

Icons have no `'use client'`, no hooks and no context, so server components can
render them. Rendered on the server, they add no JavaScript to the page.

## Bundle size

Each icon is its own module, and the package is marked `sideEffects: false`.
An app ships only the icons it imports, each with its three variants. In a
Vite 7 or Next 16 production build, each icon after the first adds about
210 B gzipped.

You can also import one icon's module directly:

```tsx
import { StarIcon } from '@quick-ui/icons/icons/star'
import { StarIcon as SharpStarIcon } from '@quick-ui/icons/sharp/icons/star'
```

## Names

Each icon is exported twice, as `StarIcon` and `Star`. They're the same
component. The name is the icon's name in PascalCase: `arrow-up-right` is
`ArrowUpRightIcon`. shadcn/ui's components import the `…Icon` form, and the one
they spell differently is `Loader2Icon`, which is `LoaderCircleIcon` here.

Prefer the `…Icon` names. A few short names, such as `Image`, `Link` and `Map`,
would shadow a browser global in your file.

### Coming from @keyline-icons/react

The names are Keyline's. Swap the import, turn `/fill` and `/duotone` imports
into `variant`, and turn `size` into a class:

```tsx
// Before
import { BellIcon } from '@keyline-icons/react'
import { BellIcon as BellFillIcon } from '@keyline-icons/react/fill'

<BellFillIcon size={16} />

// After
import { BellIcon } from '@quick-ui/icons'

<BellIcon variant="fill" className="size-4" />
```

Keyline's deprecated names for renamed icons aren't here. Use the new name, for
example `TextAlignStartIcon` for `AlignLeftIcon`. There's no two-tone style.

## API reference

| Prop | Type | Default |
| --- | --- | --- |
| `variant` | `'outline' \| 'fill' \| 'duotone'` | `'outline'` |
| Any `<svg>` prop | `SVGProps<SVGSVGElement>`, `ref` included | |

The `<svg>` starts with `viewBox="0 0 24 24"`, `width` and `height` of 24,
`aria-hidden="true"`, `focusable="false"`, and the drawing's own fill and
stroke. Your props come after these, so any of them can be overridden. The
types are exported as `IconProps` and `IconVariant`.

## License

MIT. Based on [Keyline Icons](https://keylineicons.com)
([keyline-icons/keyline-icons](https://github.com/keyline-icons/keyline-icons)),
also MIT, whose drawings these are. Keyline's license doesn't grant rights in
the name "Keyline Icons".
