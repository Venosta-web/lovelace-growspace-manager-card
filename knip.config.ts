import type { KnipConfig } from 'knip';

/**
 * Dead-code gate (#992), run by `npm run lint:unused` as part of `npm run lint`.
 *
 * ESLint's no-unused-vars sees one file at a time, so a module nothing imports
 * looks as alive as any other: base-dialog-layout sat in the tree for eight
 * months, spec and all, collecting accessibility and mobile fixes (#915).
 *
 * The gate is three knip runs with three different ideas of "used":
 *
 * - `knip --production --files`: every module under src/ must be reachable
 *   from what the card ships. Knip follows src/index.ts (the Rollup input)
 *   and every literal `import()` behind it, so the LAZY_CHUNKS dialogs, the
 *   card editors and each card's customElements.define are all covered. A
 *   spec does NOT count here: a module that only its own test imports is
 *   exactly the base-dialog-layout case.
 * - `knip --exports`: every export must have an importer, and here a test
 *   does count, so an export kept as a testing seam is fine. What this
 *   catches is `export` on something only its own file uses, and re-exports
 *   nobody reads through.
 * - `knip --dependencies` (#1000): every package in package.json must be
 *   imported or run somewhere, and every package imported must be listed.
 *   That "somewhere" is the whole repository, not just src/: a package only
 *   the release scripts or the E2E suite use is used. So knip has to see
 *   those entry points too, which is what `entry` and `playwright` are for.
 *
 * Real exceptions go below, each with its reason. Don't silence a finding
 * with a JSDoc tag or a CLI flag: if it's intended, it belongs in this file.
 */
const config: KnipConfig = {
  entry: [
    // `npm run tokens:generate` and `tokens:check` transpile this in memory and
    // import it as a data URL, which static analysis can't follow.
    'src/styles/tokens.ts',
    // Started by path, as `node scripts/<name>.mjs` from package.json and the
    // workflows, or spawned by another script (e2e-runtime-harness runs
    // verify-e2e-bundle, the one thing that uses dotenv outside tests/e2e).
    // Not a production entry, so `--production --files` ignores them.
    'scripts/*.mjs',
  ],
  // tests/e2e is part of this package, not a workspace of its own. Its
  // package.json is never installed: the harness runs `npm --prefix tests/e2e
  // run test` purely for the scripts, and every import resolves up to the root
  // node_modules. The file stays because it has no `"type"`, which keeps the
  // Playwright config CommonJS (it reads __dirname); root's `"type": "module"`
  // would break it. Pointing the plugin at the config is what makes knip see
  // the config itself and its globalSetup.
  playwright: { config: ['tests/e2e/playwright.config.ts'] },
  project: ['src/**/*.ts!', '!src/**/*.{test,spec}.ts!'],
  ignoreFiles: [
    // Build-time source: variables.generated.ts is what ships.
    'src/styles/tokens.ts',
    // Test tooling for the contract-fixture suite (tests/contract), kept under
    // src/ so co-located schema tests can use it too. Never shipped by design.
    'src/contract-fixture/key-set-diff.ts',
  ],
  ignoreIssues: {
    // SubareaResponseSchema aliases SubareaSchema on purpose, so that every
    // subarea command reads `<Command>ResponseSchema` at its call site.
    'src/slices/subarea/schema.ts': ['duplicates'],
  },
};

export default config;
