# CLAUDE.md

Operating manual for the **Growspace Manager** Lovelace card — a Lit + TypeScript
frontend for the `growspace_manager` Home Assistant integration. This file is the
hub; for specifics see:

- **[CONTEXT.md](./CONTEXT.md)** — domain glossary (cards, chips, phase windows, irrigation modes…)
- **[DESIGN.md](./DESIGN.md)** — visual design system
- **[AGENTS.md](./AGENTS.md)** — Playwright e2e testing details

## Gotchas (read first)

1. **Never hand-edit the bundle.** `dist/growspace-manager-card.js` and the committed
   root `growspace-manager-card.js` (~3.8MB) are build artifacts. Make changes in `src/`
   and run `npm run build`. Editing the bundle directly is always wrong.
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
all pass. Run `npm run test:e2e` only when touching interaction or visual flows.

Unit tests run in **real Chromium** (vitest browser mode via `@vitest/browser-playwright`),
not jsdom, and include **pixelmatch screenshot tests** — rendering changes can shift
snapshots. Tests are picked up from `tests/{unit,cards,components}/` and co-located
`src/**/*.{test,spec}.ts`.

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
  error — prefix with `_` to intentionally ignore. `no-explicit-any` is a warning; avoid `any`.
- TypeScript `strict` mode, Lit decorators (`experimentalDecorators`, `useDefineForClassFields: false`).
