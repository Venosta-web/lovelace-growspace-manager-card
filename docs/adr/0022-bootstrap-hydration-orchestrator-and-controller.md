# Bootstrap hydration lives in a standalone orchestrator + a per-card controller, not in a slice

ADR-0001 reorganized the card around domain [[Slice]]s, one [[hassCall seam]], and one [[mutate]] primitive, and folded *mutation* sync into `mutate()`. It never said where **bootstrap hydration** — fetching one growspace payload and fanning it out into every slice's atoms — lives once the legacy [[DataService]] and `sync-service.ts` are retired. Today that fan-out is `sync-service.ts`'s `updateDevicesState`, which runs on the [[DataService]] read path and is owned by the old `store/core/growspace-store.ts`. The write path already migrated (slice mutators call the seam directly); the read/bootstrap path did not, which is the sole reason the six `*API extends BaseAPI` classes and `base-api.ts` survive.

The slices already expect a central pump: nearly every slice documents its setter as `// Bootstrap write (called by SyncService when fresh data arrives)` (`setDevices`, `setPlants`, `setEnvSnapshot`, `setIrrigationConfig`, `setTankLevels`, `setSubareaEnvSnapshot`, …). The setter seam is built; only its caller is wrong.

## Decision

Split `sync-service.ts`'s two conflated responsibilities and retire the legacy read stack:

- **[[Hydration orchestrator]]** (`services/hydrate.ts`) — app-global. `hydrate(collection, hassStates)` transforms the raw WS collection **once** (via the surviving `GrowspaceAdapter.transformGrowspace`) and fans out to every slice's existing bootstrap setter. Pure of Lit and of `hass` injection (takes a `hass.states` snapshot as an argument), so it is tested with a fake collection and no host. This is where the decomposition's leverage lands. It becomes the **single writer** of the device list, subsuming both `sync-service`'s fan-out *and* the Growspace slice's current self-contained `fetchGrowspaceData` (which today transforms and writes only `growspaceDevices$`).
- **[[Bootstrap controller]]** (`src/controllers/`) — per-card Lit `ReactiveController`. Owns the per-card concerns: card config, default-growspace auto-select (`_defaultApplied`), the watched-entity optimization set, the loading flag, and the in-flight fetch guard. On a `hass` change it fetches the collection over the [[hassCall seam]] (`growspace_manager/get_data`, or a thin slice fn that *returns* the collection rather than the current `void` one) and passes it to `hydrate`. Peer to `hass-subscription-controller` / `polling.controller`.
- **Transport** is the [[hassCall seam]] only. [[DataService]], the six `*API` classes, `base-api.ts`, and `sync-service.ts` are deleted once nothing imports them.

Caching follows ADR-0005 unchanged: the Growspace slice's `fetchGrowspaceData` already dropped `GrowspaceAPI`'s 30s TTL cache ("atoms are the cache"); the only dedupe preserved is the in-flight guard, which the Bootstrap controller owns. All fetches funnel through that one controller, so no other code path calls `fetchGrowspaceData` directly.

## Considered Options

- **Fold hydration into the Growspace slice** (via the [[Cross-slice mutation]] pattern) — rejected. Cross-slice mutation is for a primary write touching 1–2 siblings (transplant → Plant + Grid). Bootstrap fans out to ~7 slices; folding it into Growspace would make that slice import every sibling's setters — a hub/god-slice that re-couples what the slice split separated.
- **Distribute hydration into each slice** (each slice parses the raw payload and fills its own atoms) — rejected, and contradicted by the existing code: there is deliberately *one* parse and one fan-out. N parsers re-walk the same payload and scatter the "what does a growspace payload contain" knowledge across slices.
- **Keep `sync-service.ts` as the orchestrator, just repoint it off DataService** — rejected as half a fix: it leaves app-global hydration and per-card UI state (auto-select, loading, watched entities) conflated in one 238-line service still owned by the old store. The split is the point.
- **Re-introduce a TTL cache in the orchestrator** — rejected; contradicts ADR-0005. Atoms are the cache; the in-flight guard is sufficient once fetches funnel through one controller.

## Consequences

- `services/hydrate.ts` and a per-card Bootstrap controller are new; both run in parallel with the legacy path during migration (strangler), so each step leaves a green build.
- The test surface splits: `hydrate()` gets a pure payload-in → atoms-out test (no DataService mock, no host); the Bootstrap controller gets a host-driven test for auto-select/loading. The 238-line service entangled with the old store stops being the only place to test bootstrap.
- Completes ADR-0001 for the read/bootstrap path. Deleting [[DataService]] requires migrating its remaining callers (old `store/*`, `action-context`, three UI files) to slices — the same incremental store→slice work ADR-0001 already entails; this ADR fixes the *destination*, not the size, of that work.
- The `*API extends BaseAPI` classes and `base-api.ts` become deletable once the read gaps (`getIrrigationAnalytics`, `getStrainRecommendation`, the `getHistory*` family in `history-store`) move onto the seam.
- The payload transform (`GrowspaceAdapter.transformGrowspace`) is **not** orphaned by the retirement — it lives in the adapter and survives; `GrowspaceAPI.getGrowspaceDevices` is a duplicate of it that dies with the class. The orchestrator calls the adapter directly.
- The migration exposes a pre-existing duplication to reconcile: the device list is held in **two atoms** — `growspaceDevices$` (Growspace slice, written by the slice's `fetchGrowspaceData`) and `devices$` (Grid slice, written by `sync-service` via `setDevices`). Making the orchestrator the single writer is the moment to collapse these to one (or have it feed both during migration); this ADR does not mandate which atom wins, only that one writer owns the fan-out.

## Implementation decisions (resolved in #327)

These were left open by the ADR and settled during the Step 2 build:

**Device atom reconciliation:** `devices$` (Grid slice, `GrowspaceDevice[]`) is the canonical atom. `growspaceDevices$` (Growspace slice, `GrowspaceDevice[] | null`) is retired. The `null` loading sentinel is never read outside the Growspace slice itself — the Bootstrap controller's `loading` property covers that signal. The Growspace slice's optimistic mutators still write `growspaceDevices$` temporarily; their migration to `devices$` is a follow-up, not part of this step. The `hydrate()` orchestrator writes only `devices$`.

**`hydrate()` signature:** `hydrate(collection: Record<string, GrowspaceAPIResponse>, hassStates: HassEntities): Set<string>`. Returns the watched-entity ID set as a byproduct of the fan-out (discovered while iterating devices/subareas). The Bootstrap controller stores and uses this set for the entity-change optimization. Pure of Lit and `hass` injection; `hassStates` is passed as a snapshot argument. Reads `subareasGrowspaceId$` / `subareas$` atoms internally to resolve the subarea list (the "prefer hydrated subareas over payload subareas" invariant belongs in the fan-out, not in callers).

**Fetch transport:** A new `fetchRawCollection(): Promise<Record<string, GrowspaceAPIResponse>>` export on the Growspace slice wraps `hassCall('growspace_manager/get_data', …)` and returns the raw payload without transforming or writing atoms. The Bootstrap controller calls this; no direct `hassCall` in controller code.

**Bootstrap controller shape:** Lit `ReactiveController` (`src/controllers/bootstrap.controller.ts`). Constructor takes `(host, gridSliceRef, cardConfig)`. Owns: `_lastHassRef`, `_isFetching`, `_lastCollection`, `_watchedEntities`, `_defaultApplied`, `loading: boolean` (plain property, calls `host.requestUpdate()`). Two internal paths on `updateHass(hass)`: (1) no collection yet → `fetchRawCollection()` → `hydrate(collection, hass.states)` → cache collection; (2) collection cached, watched entity changed → `hydrate(_lastCollection, hass.states)` without re-fetching.

**First card wired:** `growspace-grid-card`. Parallel-run is a card-level bypass: replace `this.store.updateHass(this.hass)` call sites with `this._bootstrapController.updateHass(this.hass)`. `GrowspaceStore` and `SyncService` remain unchanged for all other cards.

**Test placement (ADR-0004):** `src/services/hydrate.test.ts` — pure unit test, fake collection + fake `hassStates`, no host. `tests/controllers/bootstrap.controller.test.ts` — host-driven, covers auto-select and loading flag.
