// Dev-mode cost. Dev servers don't tree-shake, so what matters is how much of
// the icon package they load for a page that uses a few icons.
//
// Vite pre-bundles each dependency into node_modules/.vite/deps once; that is
// the JS the browser fetches. Next (Turbopack) compiles on request, so the
// page's scripts are fetched and summed, and the compile time is read from its
// log.

import { spawn } from "node:child_process"
import { readFile, rm, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { setTimeout as sleep } from "node:timers/promises"
import { iconsSource } from "./scenarios.mjs"
import { importFrom, NEXT_ENV, writeNextConfig } from "./builds.mjs"
import { jsFiles, measureFiles } from "./lib.mjs"

const POLL_MS = 250
const DEV_TIMEOUT_MS = 180_000

async function waitFor(check, what) {
  const deadline = Date.now() + DEV_TIMEOUT_MS
  while (Date.now() < deadline) {
    const value = await check()
    if (value) return value
    await sleep(POLL_MS)
  }
  throw new Error(`timed out waiting for ${what}`)
}

/** The pre-bundled dependency JS Vite's dev server serves for this scenario. */
export async function viteDev(runDir, scenario) {
  const root = join(runDir, "vite")
  const cacheDir = join(runDir, "out", "vite-dev-cache", scenario.id)
  await rm(cacheDir, { recursive: true, force: true })
  await writeFile(join(root, "src", "icons.jsx"), iconsSource(scenario))
  const { createServer } = await importFrom(runDir, "vite")
  const server = await createServer({
    root,
    cacheDir,
    configFile: false,
    logLevel: "error",
    esbuild: { jsx: "automatic" },
    server: { port: 0, strictPort: false },
  })
  try {
    await server.listen()
    const base = server.resolvedUrls.local[0]
    await fetch(new URL("/src/main.jsx", base))
    await fetch(new URL("/src/icons.jsx", base))
    const metadata = join(cacheDir, "deps", "_metadata.json")
    const wanted = scenario.entry ? [scenario.entry, ...(scenario.set === "keyline" ? ["@keyline-icons/react/fill"] : [])] : ["react-dom/client"]
    await waitFor(async () => {
      const meta = JSON.parse(await readFile(metadata, "utf8").catch(() => "{}"))
      return wanted.every((id) => meta.optimized?.[id])
    }, `Vite to pre-bundle ${wanted.join(", ")}`)
    return measureFiles(await jsFiles(join(cacheDir, "deps")))
  } finally {
    await server.close()
  }
}

function scriptUrls(html, base) {
  return [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(([, src]) => new URL(src, base).href)
}

/** The client JS a Next dev page loads, and how long the first compile took. */
export async function nextDev(runDir, scenario, { optimize, port }) {
  const root = join(runDir, "next")
  await writeFile(join(root, "app", "icons.jsx"), iconsSource(scenario, { client: true }))
  await writeNextConfig(runDir, { optimize })
  await rm(join(root, ".next"), { recursive: true, force: true })
  const nextBin = join(runDir, "node_modules", "next", "dist", "bin", "next")
  const child = spawn(process.execPath, [nextBin, "dev", "--port", String(port)], { cwd: root, env: { ...process.env, ...NEXT_ENV } })
  let log = ""
  child.stdout.on("data", (d) => (log += d))
  child.stderr.on("data", (d) => (log += d))
  try {
    await waitFor(() => /Ready in/.test(log), "next dev to start")
    const base = `http://localhost:${port}/`
    const html = await (await fetch(base)).text()
    // Next logs the request after responding, so wait for the line.
    await waitFor(() => /GET \/ 200 in /.test(log), "next dev to log the request")
    const compiled = log.match(/GET \/ 200 in (.+)/)[1].replace(/\x1b\[[0-9;]*m/g, "").trim()
    let bytes = 0
    for (const url of scriptUrls(html, base)) bytes += (await (await fetch(url)).arrayBuffer()).byteLength
    return { bytes, compiled, scripts: scriptUrls(html, base).length }
  } finally {
    child.kill("SIGTERM")
    await sleep(500)
    if (child.exitCode === null) child.kill("SIGKILL")
    await writeNextConfig(runDir, { optimize: false })
  }
}
