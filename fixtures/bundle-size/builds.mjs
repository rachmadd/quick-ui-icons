// Production builds: one Vite (Rollup) build and one `next build` per
// scenario, each measured on its own so no chunk is shared between scenarios.

import { mkdir, rm, writeFile } from "node:fs/promises"
import { createRequire } from "node:module"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import { iconsSource } from "./scenarios.mjs"
import { jsFiles, measureFiles, run } from "./lib.mjs"

const NEXT_ENV = { NEXT_TELEMETRY_DISABLED: "1" }

/** Loads a package installed in the run directory, not in this repo. */
export async function importFrom(runDir, name) {
  const path = createRequire(join(runDir, "package.json")).resolve(name)
  return import(pathToFileURL(path).href)
}

/** Writes the small Vite and Next apps the scenarios plug into. */
export async function writeApps(runDir) {
  const vite = join(runDir, "vite")
  await mkdir(join(vite, "src"), { recursive: true })
  await writeFile(join(vite, "index.html"), `<!doctype html><div id="root"></div><script type="module" src="/src/main.jsx"></script>\n`)
  await writeFile(
    join(vite, "src", "main.jsx"),
    `import { createRoot } from "react-dom/client"\nimport { Icons } from "./icons.jsx"\n\ncreateRoot(document.getElementById("root")).render(<Icons />)\n`
  )

  const next = join(runDir, "next")
  await mkdir(join(next, "app"), { recursive: true })
  await writeFile(join(next, "app", "layout.jsx"), `export default function Layout({ children }) {\n  return <html lang="en"><body>{children}</body></html>\n}\n`)
  await writeFile(join(next, "app", "page.jsx"), `import { Icons } from "./icons.jsx"\n\nexport default function Page() {\n  return <Icons />\n}\n`)
  await writeNextConfig(runDir, { optimize: false })
}

/**
 * `optimize` adds @quick-ui/icons to experimental.optimizePackageImports, which
 * makes Next import each icon's own module instead of the barrel. Only dev
 * mode is measured both ways; production tree-shakes either way.
 */
export async function writeNextConfig(runDir, { optimize }) {
  const experimental = optimize ? `\n  experimental: { optimizePackageImports: ["@quick-ui/icons"] },` : ""
  await writeFile(
    join(runDir, "next", "next.config.mjs"),
    `const root = ${JSON.stringify(runDir)}\n\nexport default {\n  turbopack: { root },\n  outputFileTracingRoot: root,${experimental}\n}\n`
  )
}

export async function viteBuild(runDir, scenario) {
  const root = join(runDir, "vite")
  const outDir = join(runDir, "out", "vite", scenario.id)
  await writeFile(join(root, "src", "icons.jsx"), iconsSource(scenario))
  const { build } = await importFrom(runDir, "vite")
  await build({
    root,
    configFile: false,
    logLevel: "error",
    esbuild: { jsx: "automatic" },
    build: { outDir, emptyOutDir: true },
  })
  return measureFiles(await jsFiles(outDir))
}

/** `client` puts "use client" on the icons module; without it they render on the server. */
export async function nextBuild(runDir, scenario, { client }) {
  const root = join(runDir, "next")
  await writeFile(join(root, "app", "icons.jsx"), iconsSource(scenario, { client }))
  await rm(join(root, ".next"), { recursive: true, force: true })
  const nextBin = join(runDir, "node_modules", "next", "dist", "bin", "next")
  await run(process.execPath, [nextBin, "build"], { cwd: root, env: NEXT_ENV })
  return measureFiles(await jsFiles(join(root, ".next", "static", "chunks")))
}

export { NEXT_ENV }
