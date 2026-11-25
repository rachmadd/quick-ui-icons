# Bundle-size fixture

Measures what an app ships when it imports 1, 3 or 30 icons. It builds every
case with Vite 7 (Rollup) and with a Next 16 production build, and compares
`@quick-ui/icons` with `@keyline-icons/react` 2.6.0, the version Quick UI
uses today.

```bash
node fixtures/bundle-size/measure.mjs               # everything, about a minute
node fixtures/bundle-size/measure.mjs --skip-dev    # production builds only
node fixtures/bundle-size/measure.mjs --skip-next   # Vite only
```

The script runs these steps:

1. Builds `packages/react` and packs it with `pnpm pack`, so it measures the
   files npm would ship.
2. Installs that tarball and the versions pinned in `package.json` into
   `.work/phase-2/run/`. That folder is gitignored and nothing heavy is
   committed.
3. Builds each scenario on its own and measures the JS. The number that
   matters is the difference from a baseline app with no icons.
4. Looks for every icon in the output by its path data. An icon that wasn't
   imported must be absent, not just small. Every imported icon must be
   present.
5. Measures dev mode. That's the pre-bundled dependency JS for Vite, and the
   client JS a page loads for Next, which also logs its compile time.
6. Writes `.work/phase-2/results.json` and `results.md`.

Each scenario renders every icon in outline and in fill, which is how Quick UI
uses icons. `@quick-ui/icons` does that with one import and the `variant`
prop. Keyline needs an import from `@keyline-icons/react` and another from
`@keyline-icons/react/fill`. The 30 icons are in `scenarios.mjs`.

It's not in CI, because installing Next and building 23 apps takes too long
for every push. CI runs the faster check in
`packages/react/test/size.test.mjs`. That test enforces a size budget per icon
and bundles the barrel with esbuild, to prove that importing one icon ships
no other.
