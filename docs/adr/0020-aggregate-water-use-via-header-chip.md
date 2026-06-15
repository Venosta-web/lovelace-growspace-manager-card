# Aggregate water use surfaces via a header chip reading the server figure

A growspace's calendar-day water use (`waterUsage.litersToday`) is surfaced through a
**Tank-Derived Water Chip** in the secondary header strip, reading the backend figure
directly, rather than by relaxing the pump-gated "Liters today" analytics KPI. The
chip's visibility keys off the server figure's presence (`litersToday != null`, which
already encodes [[Tank-Derived Water Mode]] — the backend supplies the field only when no
flow/drain sensors are configured) plus a `tanks.length > 0` guard, not a client
re-derivation of the flow/drain predicate. Clicking it opens the existing
[[Tank Water Chart]] via [[Custom Graph Routing]] on `MetricKey.WATER`; that routing was
already wired, so the only missing piece was a chip producing `WATER` into
`activeEnvGraphs`.

## Context

`litersToday` rendered in exactly one place — the analytics tab's "Liters today" KPI,
gated on `hasPump`. `hasPump` (a pump entity is configured) is independent of
Tank-Derived Water Mode, so a gravity-fed tank grower (tanks, no pump, no flow/drain
sensors) got a meaningful backend figure that never surfaced. The backend already
populates the figure for that grower (`view_model_builder.py`), so this is a frontend
gating mismatch, not a backend gap — and it is **not** blocked on the `#471` aggregation
work.

## Considered Options

- **Relax the pump gate on the KPI** — rejected: drags the sibling pump-only KPIs
  (per-plant/day, water efficiency, avg runoff) into a pumpless grower's view, where they
  are empty or meaningless.
- **Retire the client-derived figure now** — rejected: larger blast radius (analytics-tab
  ViewModel + tests), and the server figure is not yet the richer one (manual-on-top
  aggregation lands with `#471`).

## Consequences

- Two calendar-day "water today" figures coexist: the chip reads the server figure; the
  Water Analytics tab's "Consumed today" KPI re-derives the same figure client-side from
  tank `waterHistory`. This duplication is **deliberate and temporary** — do not "fix" it
  by deleting one until the consolidation follow-up. Consolidating both onto the server
  figure is deferred until `#471`'s manual-on-top aggregation lands (at which point the
  server figure becomes strictly richer than the client re-derivation).
- `computeHeaderMetrics` must receive `litersToday` as a new trailing optional input
  (it takes discrete inputs, not the whole `waterUsage`); both call sites
  (`growspace-header.container.ts`, `growspace-subarea-card.ts`) thread it through.
