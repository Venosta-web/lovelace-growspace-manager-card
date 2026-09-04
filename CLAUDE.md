# CLAUDE.md

Operating manual for the **Growspace Manager** Lovelace card — a Lit + TypeScript
frontend for the `growspace_manager` Home Assistant integration. This file is the
hub; for specifics see:

- **[CONTEXT.md](./CONTEXT.md)** — domain glossary (cards, chips, phase windows, irrigation modes…)
- **[DESIGN.md](./DESIGN.md)** — visual design system
- **[AGENTS.md](./AGENTS.md)** — Playwright e2e testing details

## Gotchas (read first)

1. **Never hand-edit bundles.** `dist/growspace-manager-card.js`, its lazy chunks,
   sourcemaps, and their root copies are build artifacts. They are gitignored during normal
   development and produced by `npm run build`. Semantic-release force-adds every dist
   JavaScript asset to the tagged release commit for HACS, then a cleanup commit removes them
   from branch tracking. Make changes in `src/`; never commit or hand-edit a bundle.
2. **Interactions are store-driven, not `tap_action`.** Plant grid cells, hero cards, and
   chips dispatch through the nanostores state machine — not generic Lovelace
   `tap_action`/`hold_action`. Don't wire up the Lovelace action model for these.
3. **The entry bundle is self-contained; the lazy chunks bind back to it.**
   `dist/growspace-manager-card.js` carries the registration and the render path
   for all 8 cards, so the stale chunk set HACS leaves behind when it rewrites
   only the entry costs the dialogs, not the whole dashboard.
   `preserveEntrySignatures: false` in `rollup.config.js` is what keeps the eager
   graph in the entry instead of a re-export facade, and
   `scripts/lazy-chunk-entry-binding.mjs` rewrites every chunk's import of the
   entry into a dynamic one against `window.__growspaceEntryUrl` — Home Assistant
   loads the entry with a cache-busting query, and a static import would resolve
   to a second copy and define every element twice.
   `npm run validate:hacs-release` fails the build if either half regresses.
4. **Respect the data-flow layering.** Components never call `hass` directly for growspace
   data. The flow is **API service → store action → atom → card**. Reaching into `hass`
   from a component to fetch/mutate growspace data bypasses the store and breaks reactivity.

## Commands

```bash
npm run build        # rollup -> dist/, then copies to root bundle
npm run build:dev    # build + copy bundle into ../../config/www (for a running HA)
npm test             # vitest unit tests (alias: test:unit)
npm run test:unit:watch
npm run test:coverage
npm run test:e2e     # build + Playwright e2e against HA (see AGENTS.md)
npm run lint         # eslint src/**/*.{ts,js}
npm run format       # prettier --write over src/, tests/ and root config
npm run format:check # same scope, read-only (.prettierignore excludes markdown)
```

**Before declaring a change done:** `npm run lint`, `npm test`, and `npm run build` must
all pass.

When you change anything in `tests/e2e/` (specs, fixtures, page objects): run
`npm run test:ha` against a real HA instance. If `tests/e2e/fixtures/e2e-setup.ts` was
modified, re-run the setup script first (see **[AGENTS.md](./AGENTS.md)**).

Unit tests run in **real Chromium** (vitest browser mode via `@vitest/browser-playwright`),
not jsdom, and include **pixelmatch screenshot tests** — rendering changes can shift
snapshots. Tests are picked up from `tests/{unit,cards,components}/` and co-located
`src/**/*.{test,spec}.ts`.

### Fresh workspace setup

A fresh clone (or a fresh container hosting one, e.g. Home Assistant core's devcontainer
with this repo cloned in as a sibling folder) has neither `node_modules` nor its git hooks
wired up:

```bash
npm ci                               # required before lint/test/build work at all
prek install                         # or: pre-commit install
prek install --hook-type commit-msg  # not installed by the plain form above, despite
                                      # default_install_hook_types in .pre-commit-config.yaml
```

Standalone worktrees install their own `node_modules` with `npm ci`. Worktrees created by
the sibling `growspace_manager_workspace` hub **share the main card checkout's
`node_modules` only while their `package-lock.json` SHA-256 hashes are identical**. The hub
also runs `npm ci --dry-run` and requires a zero-add/change/remove plan before linking it.
If either check fails, the link is removed and that worktree must run its own `npm ci`;
dependency drift therefore fails closed instead of silently using another branch's
hoisting or peer-dependency resolution.

That link is established once, at worktree setup, and nothing re-establishes the agreement
afterwards — the source checkout can install a new dependency, or a worktree branch can
change its own lockfile. So this repo re-checks the cheap half itself, in
`scripts/shared-dependency-link.mjs`: `npm test` runs a `pretest` guard that refuses when
`node_modules` is a link whose source checkout's `package-lock.json` no longer matches this
checkout's, and `preinstall` refuses to install *through* a link at all, because deleting
it is how a worktree stops being hub-managed and that should be a deliberate act. Both are
inert when `node_modules` is a real directory or absent, so the main checkout and CI are
unaffected, and neither ever creates, repairs, or removes a link — the fix they print is
`rm node_modules && npm ci`.

Never run dependency-mutating npm commands through a shared link. That is a rule, not a
guarantee — the mechanics split in two. Measured: `npm ci` and `npm install` delete the link and put a private install in its place, leaving the main checkout's tree
untouched. `npm rebuild`, `patch-package`, and dependency postinstalls leave the link
intact and **write straight through into the main checkout's dependency tree**. That second
class never runs the root package's `preinstall` script, so **no npm hook can catch it**;
the risk is accepted and unguardable, not covered. If it happens, repair it with `npm ci`
in the main card checkout. When changing dependencies deliberately, unlink `node_modules`,
run `npm ci` in the worktree, and keep that real directory private.

Vite's optimiser cache and browser-test reports live under the checkout-local `.cache/`,
not under `node_modules`, and the Vitest commands use Vite's runner config loader so it does
not create `node_modules/.vite-temp`. Concurrent worktrees therefore do not contend on
writable test caches.

The decision, the measurements behind it (465 MB tree, 2.4 s warm private `npm ci`, 0.47 s
guard, two lockfile changes on `dev` in 90 days), and the accepted risk are recorded in the
hub's ADR — `growspace_manager_workspace/docs/adr/0001-guarded-shared-card-dependencies.md`
([online](https://github.com/Venosta-web/growspace_manager_workspace/blob/main/docs/adr/0001-guarded-shared-card-dependencies.md)),
from issue #706. It also sets the ownership boundary this repo works under: **the hub heals,
the card detects.** Hub setup may create, re-link, or remove a shared link; a check on this
side may refuse to run against a mismatched tree, but must never create or repair a link —
sharing one checkout's dependencies with another is hub policy.

## Architecture

Entry point `src/index.ts` registers all 8 cards in `window.customCards` and logs
`__VERSION__` (injected at build from `package.json`).

```
src/
  index.ts                  entry — registration + exports
  growspace-manager-card.ts main card (+ -editor, growspace-env-chart at src root)
  cards/                    7 standalone cards (grid, analytics, ai-insight, tank,
                            subarea, logbook, carousel) + editors/
  store/                    nanostores state machine — *-actions.ts mutate atoms
    core/                   dispatcher, registry, data-store
    grid/ growspace/ plant/ system/ ui/ history/
  services/                 backend access layer
    api/                    per-domain APIs extending BaseAPI (callService / callWS)
    data-service.ts sync-service.ts undo-redo-manager.ts
  schemas/api-schema.ts     zod validation of backend responses (~187 schemas)
  features/                 environment, plants, shared, ui
  dialogs/                  modal dialogs
  localize/                 i18n (languages/)
  controllers/ adapters/ lib/ utils/ styles/ context.ts
```

Cards subscribe to store atoms via `@nanostores/lit`. The store uses lazy init — it only
activates when it has subscribers.

## Backend contract

This card is the frontend for the **`growspace_manager`** integration (sibling vendor repo).

- Every service call (domain `growspace_manager`) and WebSocket command (e.g.
  `growspace_manager/get_strain_library`) needs a matching handler in that integration.
- When a feature spans both repos, **the component side lands first** — the card can't call
  a service that doesn't exist yet.
- `src/schemas/api-schema.ts` (zod) validates all responses at this boundary; update the
  schema when the backend payload changes.

## Code style

- **Prettier**: single quotes, semicolons, 2-space indent, width 100, ES5 trailing commas.
- **ESLint**: `standard` + `@typescript-eslint/recommended` + prettier. Unused vars are an
  error — prefix with `_` to intentionally ignore. `no-explicit-any` is a warning; avoid `any`
  in shipped code. Test files (`*.{test,spec}.ts`) are exempt from `no-explicit-any` — they may
  use `any` to reach component internals (`(el as any)._private`) and build partial mocks.
- TypeScript `strict` mode, Lit decorators (`experimentalDecorators`, `useDefineForClassFields: false`).
