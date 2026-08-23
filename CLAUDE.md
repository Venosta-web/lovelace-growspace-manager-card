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
3. **Respect the data-flow layering.** Components never call `hass` directly for growspace
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
npm run format       # prettier --write
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

Treat a shared link as read-only: never run `npm ci`, `npm install`, `npm rebuild`,
`patch-package`, or dependency postinstall tooling through it. When changing dependencies,
unlink `node_modules`, run `npm ci` in the worktree, and keep that real directory private.
Vite's optimiser cache and browser-test reports live under the checkout-local `.cache/`,
not under `node_modules`, and the Vitest commands use Vite's runner config loader so it does
not create `node_modules/.vite-temp`. Concurrent worktrees therefore do not contend on
writable test caches.

This policy was measured for issue #706 on 2026-08-22: the dereferenced dependency tree was
465 MB on ext4, a warm offline `npm ci` took 2.4 s, and the hash + dry-run guard took
0.47 s. Lockfile changes were uncommon (two on `dev`'s first-parent history in the
preceding 90 days and no additional changes back to 180 days), making guarded sharing the
common path without accepting drift.

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
