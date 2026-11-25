// Deletes packages/react/dist before tsc compiles into it.
//
// tsc only adds and overwrites files, so without this a module that no longer
// exists in src (an icon removed upstream, or the old per-style entry points)
// would stay in dist and ship.
import { rm } from "node:fs/promises"
import { fileURLToPath } from "node:url"

await rm(fileURLToPath(new URL("../packages/react/dist", import.meta.url)), { recursive: true, force: true })
