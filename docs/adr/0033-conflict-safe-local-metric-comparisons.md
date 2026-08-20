# Serialize durable Metric Comparisons with browser locks

Metric Comparisons are user-specific growspace preferences, so the card persists a versioned record keyed by Home Assistant user and growspace rather than writing shared dashboard configuration. The record contains `schema_version`, a monotonic `record_revision`, and stable `{ id, metrics }` comparisons. Durable mutations acquire a Web Lock scoped to that key, reread and validate the session baseline revision and original group, then atomically replace the JSON record and advance its revision only when data changes; storage events update other tabs. This prevents two dashboard tabs from silently overwriting concurrent comparison edits, which plain `localStorage` read/check/write cannot guarantee.

When durable storage, `crypto.randomUUID()`, the Home Assistant user ID, or Web Locks are unavailable, comparisons remain in shared page-memory for the current session and the card announces the limitation once. It does not fall back to an anonymous key, collision-prone durable IDs, or persistence that claims conflict detection it cannot enforce. New code writes only Metric Comparisons; a one-release read adapter may import valid legacy runtime link groups, after which the legacy group APIs are removed.

## Considered Options

- Shared Lovelace configuration was rejected because comparisons are personal reading preferences and must not alter another user's dashboard.
- Unlocked browser storage was rejected because cross-tab baseline checks are not atomic and can lose a confirmed edit.
- Backend persistence was deferred because the preference is local to the card and does not need cross-device synchronization; it can be reconsidered if that requirement changes.
