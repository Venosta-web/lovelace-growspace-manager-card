# Create a History slice, overturning ADR-0005's no-History-slice clause

ADR-0005 ruled that History gets no slice: *"No atoms → no slice. If a domain has no reactive state for cards to subscribe to, it does not need a slice — it needs co-located `hassCall` functions … `history-api.spec.ts` tests pure transport. Those functions live inside the existing `store/history/history-store` … no History slice is created."*

That premise is false against the current code. `src/store/history/history-store.ts` (706 LOC) is **not** pure transport: it exposes three computed read-models — `$combinedHistory`, `$headerHistoryState`, `$analyticsViewState` — derived from a `$historyCache` atom, and **at least four components subscribe to them** (`growspace-analytics.container`, `growspace-analytics-card`, `growspace-header.container`, `growspace-subarea-card`, plus the strain-editor view). By ADR-0005's *own* "atoms → slice" rule, History qualifies. Whether the rule was wrong when written or the store grew read-models since, the "no reactive state" justification no longer holds.

The class is also exactly the shape the slice migration ([[ADR-0001]]) exists to dissolve: a per-card class holding a `DataService` reference, a device-change subscription, its own localStorage cache, and derived state computed off a private atom — the same shallow store-class pattern already retired for Grid, UI, and others.

## Decision

Overturn ADR-0005's History clause and create a **[[History slice]]** (`src/slices/history/`).

- It owns module-level `historyCache$` plus the three computed read-models (`$combinedHistory`, `$headerHistoryState`, `$analyticsViewState`) and the transport functions (`fetchHistory`, `fetchBatchHistory`, `fetchHistoryStats`) on the [[hassCall seam]]. This deletes `history-api.ts` and removes History's dependency on `DataService` — a prerequisite for deleting `DataService` entirely (the #1/#3 endgame).
- **Per-card derivation via a factory.** The read-models depend on the selected device, and a standalone analytics or subarea card can display a different device than the main card. A module-level singleton would reintroduce the cross-card clobbering [[ADR-0006]] fixed for the grid. So History mirrors that resolution: shared module-level source atoms (`historyCache$`) + a `makePerCardHistorySlice()` factory that holds the per-card `$selectedDevice` and derives the device-dependent read-models locally.
- **Keep the localStorage cache** (unlike the [[library cache]], removed in [[ADR-0017]]). History's localStorage is **stale-while-revalidate**: it paints the cached graph immediately, then *always* fetches fresh and never marks the cached data as authoritative (the store's own comment: *"Don't mark as fully loaded — localStorage data serves as a [placeholder]"*). It improves perceived load without ever suppressing a fetch, so it does not carry the staleness hazard that justified dropping the library cache.

The 706-LOC `GrowspaceHistoryStore` class is deleted; `GrowspaceStore.history` is wired to the slice (or its per-card factory output), matching how `GrowspaceStore.grid` consumes `makePerCardGridSlice()`.

## Considered alternatives

- **Honor ADR-0005 — keep transport in `history-store`, just swap `DataService` for `hassCall`.** Rejected: it preserves the 706-LOC per-card class and its three subscribed read-models outside the slice architecture, leaving History the lone domain with reactive state that cards subscribe to but that lives in a `store/` class. The whole point of #1 is to delete those classes.
- **History slice as a module-level singleton (no factory).** Rejected for the exact regression [[ADR-0006]] documented: two cards on one dashboard showing different devices would share one selected-device and clobber each other's history view.
- **Drop the localStorage cache for consistency with [[ADR-0017]].** Rejected: the two caches are different in kind. The library cache *suppresses* fetches (serving data stale for up to 24h); History's is stale-while-revalidate and always refetches. Removing it would regress perceived load with no correctness benefit.

## Consequences

- ADR-0005 stands except its History clause; this ADR supersedes that one point. The `Slice` glossary entry and the absorption note in `CONTEXT.md` are updated accordingly.
- `history-api.ts` is deleted and History transport moves onto `hassCall` — one of the six API classes whose removal lets `DataService` be deleted.
- A new per-card factory (`makePerCardHistorySlice`) joins `makePerCardGridSlice` as the second instance of the per-card-over-shared-atoms pattern; if a third appears, consider extracting the pattern.
- Components subscribing to the old `store.history.$*` atoms repoint to the slice's read-models; the per-card device selection is threaded the same way the grid slice already is.
