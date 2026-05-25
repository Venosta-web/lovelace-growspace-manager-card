# Reorganize the frontend around domain Slices, one hassCall seam, and one mutate primitive

The card grew a horizontal store/actions/dispatcher + per-domain `*API extends BaseAPI` + monolithic `schemas/api-schema.ts` stack. The action modules and API classes were shallow pass-throughs: their interface was nearly as wide as their implementation, and understanding "what happens when a Plant Grid Cell is clicked" required bouncing across 4+ files. We decided to demolish that stack and replace it with **domain Slices** (Plant, Grid, Irrigation, Environment, Logbook, Strain, Camera, Subarea, AIInsight, GridInteraction, UI), a single **`hassCall(command, params, schema)`** seam to Home Assistant, and a single **`mutate(action)`** primitive that owns optimistic updates, undo, and sync. Each slice exports atoms (read) and typed mutators (write); actions and schemas are private to the slice. Slices replace `store/*`, `services/api/*`, and `schemas/api-schema.ts` — those directories are deleted at the end of the migration. See [`CONTEXT.md`](../../CONTEXT.md#architecture) for the vocabulary.

## Considered Options

- **Keep dispatcher + BaseAPI as facades, just reorganize files** — rejected as cosmetic; doesn't fix the shallowness.
- **Per-card slices** (one slice per Lovelace card) — rejected because cards share most data (plants, env, irrigation); slices would cross-import heavily.
- **Redux-style action registry where `mutate()` infers optimistic/inverse from action type** — rejected as re-introducing the same shallow-layer trap; slices providing `optimistic` + `inverse` + `apply` directly is deeper and simpler.
- **mutate() accepts multi-slice action arrays for atomicity** — rejected; cross-slice mutations live in the primary-write slice and use sibling setters. Keeps the primitive small.

## Consequences

- Migration is slice-by-slice on a branch; old `store/` and new `slices/` coexist until the last card switches imports.
- `undo-redo-manager.ts` and `sync-service.ts` are folded into `mutate()` and deleted as standalone services.
- The `hassCall` seam is the only mockable transport in tests; per-domain API mocks go away.
- Schemas move from one 472-LOC file into per-slice `schema.ts` files. Importing a single schema no longer drags in the whole API.
