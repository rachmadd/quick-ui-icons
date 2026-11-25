// What each fixture app imports. Every scenario renders each icon in outline
// and in fill, because that's how Quick UI uses them: outline at rest, fill
// when active. @quick-ui/icons does that with one import and a prop; Keyline
// needs an import from each of two entry points.

/** 30 common UI icons, present under the same name in both sets. */
export const ICONS = [
  "star", "check", "chevron-down", "x", "plus", "minus", "heart", "bell", "home", "settings",
  "user", "search", "calendar", "file", "bin", "pen", "eye", "copy", "upload", "download",
  "lock", "mail", "folder", "image", "menu", "info", "circle-alert", "triangle-alert", "clock", "link",
]
export const COUNTS = [1, 3, 30]

export const pascal = (name) =>
  name
    .split("-")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join("")

/** Every scenario, the baseline first. `entry` is the module the icons come from. */
export function scenarios() {
  const list = [{ id: "base", set: "none", entry: null, names: [] }]
  for (const count of COUNTS) {
    const names = ICONS.slice(0, count)
    list.push({ id: `quick-${count}`, set: "quick", entry: "@quick-ui/icons", names })
    list.push({ id: `quick-sharp-${count}`, set: "quick", entry: "@quick-ui/icons/sharp", names })
    list.push({ id: `keyline-${count}`, set: "keyline", entry: "@keyline-icons/react", names })
  }
  return list
}

const wrap = (body) => `export function Icons() {\n  return (\n    <>\n${body || "      {null}"}\n    </>\n  )\n}\n`

function quickSource({ entry, names }) {
  const components = names.map((n) => `${pascal(n)}Icon`)
  const body = components.map((c) => `      <${c} />\n      <${c} variant="fill" />`).join("\n")
  return `import { ${components.join(", ")} } from "${entry}"\n\n` + wrap(body)
}

function keylineSource({ names }) {
  const outline = names.map((n) => pascal(n))
  const fill = names.map((n) => `${pascal(n)} as ${pascal(n)}Fill`)
  const body = names.map((n) => `      <${pascal(n)} />\n      <${pascal(n)}Fill />`).join("\n")
  return (
    `import { ${outline.join(", ")} } from "@keyline-icons/react"\n` +
    `import { ${fill.join(", ")} } from "@keyline-icons/react/fill"\n\n` +
    wrap(body)
  )
}

/** The module that renders a scenario's icons, as `export function Icons()`. */
export function iconsSource(scenario, { client = false } = {}) {
  const directive = client ? `"use client"\n\n` : ""
  if (scenario.set === "quick") return directive + quickSource(scenario)
  if (scenario.set === "keyline") return directive + keylineSource(scenario)
  return directive + wrap("")
}
