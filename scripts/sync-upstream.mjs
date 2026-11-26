// Pulls a Keyline release's drawings into raw/, rebuilds, and reports what
// changed for @quick-ui/icons.
//
//   pnpm sync:upstream            the newest upstream tag
//   pnpm sync:upstream v3.1.0     a given tag or ref
//
// It fetches from the `upstream` remote, replaces raw/ with that release's
// raw/, runs pipeline/build.mjs and scripts/generate.mjs, and writes a report
// to .work/sync/<ref>.md: icons that are new, changed or removed in the six
// drawings the package ships (outline, fill and duotone, rounded and sharp).
//
// It never commits, merges or pushes. Review with `git diff`, follow the
// report's next steps, and commit raw/ and icons/ together. To undo:
// `git checkout -- raw icons && git clean -fd raw icons`.

import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { BUILT_IN_ICONS } from "./built-in-icons.mjs"

const ROOT = fileURLToPath(new URL("..", import.meta.url))
const SHIPPED = ["icons/stroke", "icons/fill", "icons/duotone", "icons/sharp/stroke", "icons/sharp/fill", "icons/sharp/duotone"]
const GUARDED = ["raw", "icons", "data"]
const REMOTE = "upstream"

const git = (...args) => execFileSync("git", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 28 })
const node = (script) => execFileSync(process.execPath, [script], { cwd: ROOT, stdio: "inherit" })

function assertClean() {
  const dirty = git("status", "--porcelain", "--", ...GUARDED).trim()
  if (dirty) throw new Error(`${GUARDED.join("/, ")}/ have uncommitted changes. Commit or stash them first:\n${dirty.split("\n").slice(0, 10).join("\n")}`)
}

/** The ref to sync: the argument, or the newest v* tag on the upstream remote. */
function resolveRef() {
  git("fetch", "--quiet", "--tags", REMOTE)
  const wanted = process.argv[2]
  if (wanted) return wanted
  const tags = git("tag", "--list", "v*", "--sort=-v:refname").trim().split("\n").filter(Boolean)
  if (!tags.length) throw new Error(`no v* tags after fetching ${REMOTE}`)
  return tags[0]
}

/** name -> hash of its six shipped drawings, from icons/. */
async function snapshot() {
  const out = new Map()
  for (const dir of SHIPPED) {
    const files = await readdir(join(ROOT, dir)).catch(() => [])
    for (const file of files.filter((f) => f.endsWith(".svg"))) {
      const name = file.slice(0, -4)
      const hash = out.get(name) ?? createHash("sha256")
      hash.update(dir).update(await readFile(join(ROOT, dir, file)))
      out.set(name, hash)
    }
  }
  return new Map([...out].map(([name, hash]) => [name, hash.digest("hex")]))
}

/** Replaces raw/ with the ref's raw/, so drawings deleted upstream go too. */
async function replaceRaw(ref) {
  await rm(join(ROOT, "raw"), { recursive: true, force: true })
  const archive = execFileSync("git", ["archive", "--format=tar", ref, "raw"], { cwd: ROOT, maxBuffer: 1 << 30 })
  execFileSync("tar", ["-x", "-C", ROOT], { input: archive })
}

function compare(before, after) {
  const added = [...after.keys()].filter((n) => !before.has(n)).sort()
  const removed = [...before.keys()].filter((n) => !after.has(n)).sort()
  const changed = [...after.keys()].filter((n) => before.has(n) && before.get(n) !== after.get(n)).sort()
  return { added, removed, changed }
}

/** Renames upstream added that data/icon-renames.json doesn't have yet. */
function newRenames(ref) {
  const ours = JSON.parse(git("show", "HEAD:data/icon-renames.json")).renames
  let theirs = []
  try {
    theirs = JSON.parse(git("show", `${ref}:lib/icon-renames.json`)).renames
  } catch {
    return null
  }
  const known = new Set(ours.map((r) => `${r.from}>${r.to}`))
  return theirs.filter((r) => !known.has(`${r.from}>${r.to}`))
}

async function missingKeywords(names) {
  const keywords = JSON.parse(await readFile(join(ROOT, "data", "icon-keywords.json"), "utf8"))
  const known = new Set(Object.keys(keywords.keywords ?? keywords))
  return names.filter((n) => !known.has(n))
}

/** How many of `names` upstream already has keywords for, in its lib/icon-keywords.json. */
function upstreamKeywords(ref, names) {
  try {
    const theirs = JSON.parse(git("show", `${ref}:lib/icon-keywords.json`))
    const known = new Set(Object.keys(theirs.keywords ?? theirs))
    return names.filter((n) => known.has(n)).length
  } catch {
    return 0
  }
}

const list = (names) => (names.length ? names.map((n) => `\`${n}\``).join(", ") : "none")

function report({ ref, base, counts, diff, renames, noKeywords, upstreamHas }) {
  const builtIn = BUILT_IN_ICONS.filter((e) => diff.changed.includes(e.icon) || diff.removed.includes(e.icon))
  const steps = [
    "Review the drawings: `git diff --stat raw icons`, and look at the new ones.",
    "`pnpm icons:lint` and fix what it reports, then `pnpm icons:ci`.",
    diff.added.length || diff.changed.length || diff.removed.length ? "`pnpm size:budget`, so the size test knows the new and changed icons." : null,
    diff.added.length || diff.removed.length ? "`pnpm readmes:fix`, because the icon counts in the READMEs moved." : null,
    noKeywords.length
      ? `Add search keywords, aliases and categories in \`data/\` for the new icons. Upstream has keywords for ${upstreamHas} of them in \`${ref}:lib/icon-keywords.json\` to start from.`
      : null,
    renames?.length ? "Copy the new renames into `data/icon-renames.json`, and rename any use of the old names." : null,
    builtIn.length ? "`pnpm built-in`, then copy the file to quick-ui (see docs/built-in-icons.md)." : null,
    "`pnpm build && pnpm test`, add a CHANGELOG entry, and commit raw/, icons/ and data/ together.",
  ].filter(Boolean)
  return [
    `# Sync from Keyline ${ref}`,
    "",
    `From ${base} to ${ref}: ${counts.before} icons before, ${counts.after} after.`,
    "",
    `- **New (${diff.added.length}):** ${list(diff.added)}`,
    `- **Changed (${diff.changed.length}):** ${list(diff.changed)}`,
    `- **Removed (${diff.removed.length}):** ${list(diff.removed)}${diff.removed.length ? ". Removing an export is a breaking change." : ""}`,
    `- **Built-in icons affected (${builtIn.length}):** ${list(builtIn.map((e) => e.component))}`,
    `- **New upstream renames:** ${renames === null ? "upstream has no lib/icon-renames.json at this ref" : renames.length ? renames.map((r) => `\`${r.from}\` → \`${r.to}\` (${r.version})`).join(", ") : "none"}`,
    `- **New icons without keywords in data/ (${noKeywords.length}):** ${list(noKeywords)}`,
    "",
    "## Next steps",
    "",
    ...steps.map((s, i) => `${i + 1}. ${s}`),
    "",
  ].join("\n")
}

async function main() {
  assertClean()
  const ref = resolveRef()
  const base = git("describe", "--tags", "--always", "HEAD").trim()
  console.log(`Syncing raw/ from ${REMOTE} ${ref}`)
  const before = await snapshot()
  await replaceRaw(ref)
  node(join("pipeline", "build.mjs"))
  node(join("scripts", "generate.mjs"))
  const after = await snapshot()
  const diff = compare(before, after)
  const text = report({
    ref,
    base,
    counts: { before: before.size, after: after.size },
    diff,
    renames: newRenames(ref),
    noKeywords: await missingKeywords(diff.added),
    upstreamHas: upstreamKeywords(ref, await missingKeywords(diff.added)),
  })
  const out = join(ROOT, ".work", "sync", `${ref.replace(/[^\w.-]/g, "_")}.md`)
  await mkdir(join(ROOT, ".work", "sync"), { recursive: true })
  await writeFile(out, text)
  const short = text.replace(/((?:`[^`]+`, ){12})(?:`[^`]+`(?:, )?)+/g, (_, head) => `${head}and more`)
  console.log(`\n${short}\nFull report: ${out}`)
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
