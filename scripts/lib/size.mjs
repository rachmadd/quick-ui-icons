// What each icon costs once minified and gzipped, measured on the built
// package (packages/react/dist). Used by scripts/size-budget.mjs to record the
// budget and by the size test to enforce it.
//
// Each icon module is minified on its own with esbuild, as a bundler would
// after tree-shaking, and gzipped. Its imports (react/jsx-runtime and the
// shared wrapper) stay imports, so the number is the icon's own cost; the
// wrapper is measured once, separately.

import { readdir, readFile } from "node:fs/promises"
import { join } from "node:path"
import { gzipSync } from "node:zlib"
import { transform } from "esbuild"

/** Recorded budget = measured size × this, rounded up. Room for tooling noise, not for growth. */
export const ALLOWANCE = 1.05

async function minifiedGzip(file) {
  const { code } = await transform(await readFile(file, "utf8"), { minify: true, format: "esm", legalComments: "none" })
  return gzipSync(code, { level: 9 }).length
}

async function measureDir(dir) {
  const files = (await readdir(dir)).filter((f) => f.endsWith(".js")).sort()
  const sizes = await Promise.all(files.map((f) => minifiedGzip(join(dir, f))))
  return Object.fromEntries(files.map((f, i) => [f.slice(0, -3), sizes[i]]))
}

/** { wrapper, rounded: { name: bytes }, sharp: { name: bytes } }, gzipped bytes after minifying. */
export async function measureIconSizes(distDir) {
  return {
    wrapper: await minifiedGzip(join(distDir, "icon.js")),
    rounded: await measureDir(join(distDir, "icons")),
    sharp: await measureDir(join(distDir, "sharp", "icons")),
  }
}

export const budgetFor = (bytes) => Math.ceil(bytes * ALLOWANCE)
