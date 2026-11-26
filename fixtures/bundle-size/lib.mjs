// Helpers shared by the fixture builds: sizing output, running commands, and
// telling which icons a bundle contains.

import { spawn } from "node:child_process"
import { readdir, readFile, stat } from "node:fs/promises"
import { join } from "node:path"
import { gzipSync } from "node:zlib"

/** Every .js file under `dir`, recursively. */
export async function jsFiles(dir) {
  const entries = await readdir(dir, { recursive: true, withFileTypes: true }).catch(() => [])
  return entries.filter((e) => e.isFile() && e.name.endsWith(".js")).map((e) => join(e.parentPath, e.name))
}

/** Total bytes and total gzipped bytes (each file gzipped on its own, as served). */
export async function measureFiles(files) {
  let bytes = 0
  let gzip = 0
  const texts = []
  for (const file of files) {
    const buffer = await readFile(file)
    bytes += buffer.length
    gzip += gzipSync(buffer, { level: 9 }).length
    texts.push(buffer.toString("utf8"))
  }
  return { bytes, gzip, files: files.length, text: texts.join("\n") }
}

export const fileSize = async (file) => (await stat(file)).size

/** Runs a command; resolves with its output, rejects with it on a non-zero exit. */
export function run(command, args, { cwd, env = {} } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, env: { ...process.env, ...env } })
    let output = ""
    child.stdout.on("data", (d) => (output += d))
    child.stderr.on("data", (d) => (output += d))
    child.on("error", reject)
    child.on("close", (code) =>
      code === 0 ? resolve(output) : reject(new Error(`${command} ${args.join(" ")} exited ${code}\n${output.slice(-3000)}`))
    )
  })
}

/**
 * Each icon's longest path string, for both entry points, read from the
 * generated package source. A bundle contains an icon if it contains that
 * string, which minifiers leave untouched.
 */
export async function fingerprints(srcDir) {
  const out = []
  for (const [entry, dir] of [["@quick-ui/icons", "icons"], ["@quick-ui/icons/sharp", "sharp/icons"]]) {
    for (const file of await readdir(join(srcDir, dir))) {
      const text = await readFile(join(srcDir, dir, file), "utf8")
      const paths = [...text.matchAll(/ d="([^"]+)"/g)].map(([, d]) => d)
      const longest = [...paths].sort((a, b) => b.length - a.length)[0]
      out.push({ entry, name: file.replace(/\.tsx$/, ""), fingerprint: longest, paths })
    }
  }
  return out
}

/**
 * Which @quick-ui/icons drawings a bundle contains that the scenario didn't
 * import, and which imported ones are missing. A fingerprint that also
 * appears inside an imported icon's path data can't tell the two apart, so
 * it's skipped and counted: rounded and sharp often draw open glyphs
 * identically, and `dot` and `loader-circle` are pieces of the circle in
 * `info` and `clock`.
 */
export function checkContents(text, scenario, prints) {
  const imported = (p) => p.entry === scenario.entry && scenario.names.includes(p.name)
  const importedPaths = prints.filter(imported).flatMap((p) => p.paths)
  const importedPrints = { has: (fingerprint) => importedPaths.some((d) => d.includes(fingerprint)) }
  const missing = prints.filter((p) => imported(p) && !text.includes(p.fingerprint)).map((p) => `${p.entry}:${p.name}`)
  let checked = 0
  let ambiguous = 0
  const leaked = []
  for (const p of prints) {
    if (imported(p)) continue
    if (importedPrints.has(p.fingerprint)) {
      ambiguous++
      continue
    }
    checked++
    if (text.includes(p.fingerprint)) leaked.push(`${p.entry}:${p.name}`)
  }
  return { checked, ambiguous, leaked, missing }
}
