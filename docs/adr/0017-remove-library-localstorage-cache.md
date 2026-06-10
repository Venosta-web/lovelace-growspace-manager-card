# Remove the library localStorage cache instead of migrating it

The legacy `src/store/plant/library-actions.ts` wraps four fetches in a hand-rolled localStorage cache with per-key TTLs: strain library 24h, nutrient presets 30m, IPM presets 30m, nutrient inventory 5m. Each `fetch*` checks localStorage, returns the cached value when it is younger than the TTL (skipping the network entirely unless `force` is passed), and writes the fresh result back. All four are fetched **eagerly on card boot** (`growspace-manager-card.ts`).

Migrating the `library` dispatcher group onto slices raised the question: does this cache move into the slices, or go away? [[ADR-0001]] and [[ADR-0005]] already answer the spirit of it — ADR-0005: *"Replaces `DataService` cache layer — atoms are the cache."* Slice atoms already cache within a session; the localStorage layer only adds **cross-reload** persistence, and it does so by *suppressing* fetches.

## Decision

**Remove the library localStorage cache** rather than carry it into the slices, split by consumer:

- **Nutrient presets, IPM presets, nutrient inventory** are dialog-only (irrigation/nutrient dialogs); nothing on the main view reads them. Make them **lazy** — fetch on dialog open, atom-cached for the session. Delete their localStorage blocks *and* their eager boot fetches. A user who never opens those dialogs now does zero fetches (vs three on every boot today); a user who opens one gets always-fresh data.
- **Strain library** is consumed eagerly by the main grid (strain names/colors, provided via `strainLibraryContext`). Keep the eager boot fetch and atom caching, but **drop localStorage persistence**. The fetch is cheap (confirmed: not a measurable cold-load cost), so one WS round-trip per reload is an acceptable price for always-fresh data and deleting the cache code.

End state: zero localStorage caching in the library domain; atoms are the only cache, matching ADR-0005.

## Considered alternatives

- **Migrate the localStorage cache into the slices as-is.** Rejected: it is a suppress-on-read cache — a strain edited in another tab/session stays stale for up to 24h, presets up to 30m. That staleness hazard is exactly what "atoms are the cache" was meant to retire, and persisting server data in localStorage with long TTLs is the wrong default for a multi-client HA dashboard.
- **Keep a thin localStorage hydration shim for the strain library only** (cold-boot optimization). Rejected because the strain fetch is cheap; the persistence would buy a negligible perceived-load win at the cost of the staleness hazard and extra code. (Had the fetch been large/slow, this would have been the answer.)
- **Convert it to stale-while-revalidate** (paint cached, then always refetch) — the pattern the [[History slice]] keeps ([[ADR-0016]]). Rejected for the library specifically: the dialog-only data has no perceived-load problem to solve (the dialog opens on demand and can show a brief loading state), and the strain library's eager fetch already resolves before first meaningful paint. Stale-while-revalidate is justified for History's heavy graph data, not here.

## Consequences

- `library-actions.ts`'s cache logic is deleted; call sites call the Strain / Nutrient slice fetchers directly.
- The three dialog-only fetches move from boot to dialog-open, reducing boot network work for the common case.
- This is a deliberate, documented contrast with [[ADR-0016]]: the library cache is removed because it *suppresses* fetches; History's localStorage is kept because it is stale-while-revalidate and never does. The distinguishing test for any future cache: *does it ever serve stale data in place of a fetch?* If yes, it does not belong.
