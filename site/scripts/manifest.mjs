// Builds the site's icon manifest from icons/ and data/: one entry per icon
// with its category, description and every search term, so the page needs no
// regular expressions at runtime.
//
//   node site/scripts/manifest.mjs   -> site/src/generated/manifest.json

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = fileURLToPath(new URL("../..", import.meta.url))
const OUT = join(ROOT, "site", "src", "generated", "manifest.json")
const readJson = async (file) => JSON.parse(await readFile(join(ROOT, "data", file), "utf8"))

const pascal = (name) =>
  name
    .split("-")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join("")

/**
 * The name with a `square-` or `circle-` container removed, when the base it
 * names exists and isn't listed as a name that only looks like a container
 * (the same rule as pipeline/check-readmes.mjs).
 */
function baseName(name, names, notContainers) {
  if (notContainers.has(name)) return name
  const match = name.match(/^(square|circle)-(.+)$/)
  return match && names.has(match[2]) ? match[2] : name
}

async function main() {
  const files = await readdir(join(ROOT, "icons", "stroke"))
  const names = files.filter((f) => f.endsWith(".svg")).map((f) => f.slice(0, -4)).sort()
  const nameSet = new Set(names)

  const { keywords } = await readJson("icon-keywords.json")
  const { usage } = await readJson("icon-usage.json")
  const { aliases, names: otherNames } = await readJson("icon-aliases.json")
  const { categories, other } = await readJson("icon-categories.json")
  const notContainers = new Set((await readJson("icon-not-containers.json")).names)

  const aliasRules = aliases.map((rule) => ({ test: new RegExp(rule.match), terms: rule.terms }))
  const categoryRules = categories.map((c) => ({ ...c, test: new RegExp(c.match) }))

  const icons = names.map((name) => {
    const base = baseName(name, nameSet, notContainers)
    const terms = new Set([
      ...(keywords[name] ?? keywords[base] ?? []),
      ...aliasRules.filter((r) => r.test.test(name)).flatMap((r) => r.terms),
      ...(otherNames[name] ?? []),
    ])
    terms.delete(name)
    return {
      name,
      component: `${pascal(name)}Icon`,
      base,
      category: categoryRules.find((c) => c.test.test(base))?.label ?? other.label,
      usage: usage[name] ?? usage[base] ?? "",
      terms: [...terms],
    }
  })

  const used = new Set(icons.map((i) => i.category))
  const shelves = [...categories, other]
    .filter((c) => used.has(c.label))
    .map(({ label, icon, blurb }) => ({ label, icon, blurb: blurb ?? "" }))

  await mkdir(join(ROOT, "site", "src", "generated"), { recursive: true })
  await writeFile(OUT, JSON.stringify({ categories: shelves, icons }))
  const uncategorized = icons.filter((i) => i.category === other.label).length
  console.log(`Wrote ${icons.length} icons in ${shelves.length} categories to site/src/generated/manifest.json (${uncategorized} in ${other.label})`)
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
