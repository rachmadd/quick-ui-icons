# Changelog

All notable changes to `@quick-ui/icons`. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/).

## Unreleased

The first release of `@quick-ui/icons`, Quick UI's fork of Keyline Icons 3.0.

### Added

- 2,013 icons on a 24px grid, each one component with a `variant` prop:
  `"outline"` (the default), `"fill"` or `"duotone"`.
- Rounded corners from `@quick-ui/icons`, and sharp corners from
  `@quick-ui/icons/sharp` under the same names.
- Every icon exported as `{Name}Icon` and as `{Name}`, the same component.
- One module per icon, with `sideEffects: false`, so an app ships only the
  icons it imports. Each icon also has its own path:
  `@quick-ui/icons/icons/star` and `@quick-ui/icons/sharp/icons/star`.
- `IconProps` and `IconVariant` types.

### Compared with @keyline-icons/react

- One component per icon instead of one import per style: `/fill` and
  `/duotone` become `variant="fill"` and `variant="duotone"`.
- No `size` prop. Size icons with a class, with `width` and `height`, or
  with CSS on a parent.
- No two-tone style.
- Keyline's deprecated names for renamed icons are gone. For example, use
  `TextAlignStartIcon` instead of `AlignLeftIcon`.
- React 19 or later is required.
- Path data is rounded to 2 decimals, which moves a point by at most 0.005
  units. Where rounding would turn the end of a short stroke, the path keeps
  more precision.
