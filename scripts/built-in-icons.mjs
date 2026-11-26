// The shapes Quick UI's components draw themselves, for
// scripts/generate-built-in.mjs.
//
// Copied from the table "Every built-in icon" in quick-ui's
// docs/plans/tasks/T23-icons.md (33 shapes, as of 2026-11-26). `component` is
// the name quick-ui uses, `icon` this set's name for the shape, and `variant`
// which drawing. When quick-ui's table changes, change this list to match and
// regenerate.
//
// Rating's star and the radio dot are fill drawings, as the table says. They
// paint with fill="currentColor" on the path, so a component colours them with
// `color` (text-* classes), not with fill-* or stroke-* classes on the <svg>,
// which the path's own fill overrides. docs/built-in-icons.md says what that
// means for Rating.

export const BUILT_IN_ICONS = [
  { component: "ArrowDownIcon", icon: "arrow-down", variant: "outline" },
  { component: "ArrowUpDownIcon", icon: "arrow-up-down", variant: "outline" },
  { component: "ArrowUpIcon", icon: "arrow-up", variant: "outline" },
  { component: "CalendarIcon", icon: "calendar", variant: "outline" },
  { component: "CheckIcon", icon: "check", variant: "outline" },
  { component: "ChevronDownIcon", icon: "chevron-down", variant: "outline" },
  { component: "ChevronLeftIcon", icon: "chevron-left", variant: "outline" },
  { component: "ChevronRightIcon", icon: "chevron-right", variant: "outline" },
  { component: "ChevronUpIcon", icon: "chevron-up", variant: "outline" },
  { component: "CircleAlertIcon", icon: "circle-alert", variant: "outline" },
  { component: "CircleCheckIcon", icon: "circle-check", variant: "outline" },
  { component: "CloseIcon", icon: "x", variant: "outline" },
  { component: "CopyIcon", icon: "copy", variant: "outline" },
  { component: "DotIcon", icon: "circle", variant: "fill", note: "The radio item's dot." },
  { component: "EllipsisIcon", icon: "more-horizontal", variant: "outline" },
  { component: "EyeIcon", icon: "eye", variant: "outline" },
  { component: "EyeOffIcon", icon: "eye-off", variant: "outline" },
  { component: "FileArchiveIcon", icon: "file-zip", variant: "outline" },
  { component: "FileAudioIcon", icon: "file-audio", variant: "outline" },
  { component: "FileIcon", icon: "file", variant: "outline" },
  { component: "FileImageIcon", icon: "file-image", variant: "outline" },
  { component: "FileTextIcon", icon: "file-text", variant: "outline" },
  { component: "FileVideoIcon", icon: "file-video", variant: "outline" },
  { component: "InfoIcon", icon: "info", variant: "outline" },
  { component: "MinusIcon", icon: "minus", variant: "outline" },
  { component: "MoveHorizontalIcon", icon: "move-horizontal", variant: "outline", note: "NumberField's scrub cursor." },
  { component: "PauseIcon", icon: "pause", variant: "outline" },
  { component: "PlayIcon", icon: "play", variant: "outline" },
  { component: "PlusIcon", icon: "plus", variant: "outline" },
  { component: "SpinnerIcon", icon: "loader-circle", variant: "outline", note: "Three quarters of a circle, which Spinner turns." },
  { component: "StarIcon", icon: "star", variant: "fill", note: "Rating's star, coloured with `color`." },
  { component: "TriangleAlertIcon", icon: "triangle-alert", variant: "outline" },
  { component: "UploadIcon", icon: "upload", variant: "outline" },
]
