# Env Graph Derivation Moves Behind Metric Descriptors + Env Series (Value Space, No Pixels)

`env-chart.ts` (1,145 lines) fuses three concerns inside one Lit component: semantic
resolution (which entity backs a `MetricKey`, its unit, step-vs-line, axis scale), statistical
reduction (min/max/avg), and geometry (SVG path strings, and pixel-space x/y for VPD
segments) — the latter against a hardcoded `800 × 200` repeated in `willUpdate` and `render`.
The derivation has no seam of its own, so its 73 tests reach into private fields **105 times**
(`(element as any)._renderSeries`, `._computeGraphSeries`, `._renderYAxisHTML`), with names
like *"should verify complex `_computeGraphSeries` branches"* and outright duplicates — tests
that exist because the only way to reach the derivation is through the element.

Two further facts made this more than a tidy-up. The component reads `hass.states` in four
places, contradicting an invariant CONTEXT.md states twice ([[EnvSnapshot]] is "the single
place that reads `hass.states` for environmental sensors"; the [[HeaderMetrics module]]
"never touches `hass`/`hass.states`"). And `history-store` already owns metric→entity
resolution (`METRIC_ENTITY_KEYS` / `getEntityIdsForMetric`), but flattens `(metric, entityId)`
into the string key `'soil_moisture:sensor.x'` — which `_computeGraphSeries` then re-parses by
splitting on `':'` and rescanning `Object.keys(sensorHistory)` to rediscover the grouping.

**Decision:** split the derivation into two modules, both with real seams.

- **[[Metric Descriptor]]** (`slices/metric-descriptors/`) — `computeMetricDescriptors()` returns,
  per `MetricKey`: structured `{ entityId, name }` series,
  display unit, colour, title, chart type, axis scale, and the day/night VPD threshold table.
  It becomes the single owner of metric→entity resolution, subsuming `METRIC_ENTITY_KEYS` /
  `getEntityIdsForMetric`.
- **[[Env Series]]** (`features/environment/env-series.ts`) — `computeEnvSeries(descriptors,
  histories, range, now)` returns value-space series (`points`, `min`/`max`/`avg`, `chartType`,
  `vpdBands`) in domain units and timestamps. **No pixels, no path strings.**
  `<growspace-env-chart>` owns width/height and produces SVG at render.

Three consumers make the descriptor seam real rather than hypothetical: `history-store` (which
entities to fetch), the [[HeaderMetrics module]] (chip and hero display), and Env Series (graph
shaping). One table then decides unit, colour and axis — so a [[Chip]] and its own [[Env Graph]]
cannot disagree, which they can today.

## Considered Options

- **Lift `_computeGraphSeries` out unchanged, still returning `path` strings.** Smallest move,
  but geometry stays inside the tested surface, so path-string assertions remain the test and
  the `800 × 200` coupling survives the refactor. Rejected.
- **Widen `EnvSnapshot` and `DeviceSnapshot` to carry everything the builder needs.** No new
  module, but it reopens ADR-0018's deliberate choice that a growspace's hero values are
  backend-aggregated scalars with no per-sensor breakdown. Rejected.
- **Let each chart host assemble the descriptor from atoms it already subscribes to.** Cheapest,
  but all three chart hosts would assemble it independently — reinstating the duplication this
  ADR exists to remove. Rejected.
- **Collapse to a single module, descriptors as a private internal seam.** Defensible while the
  builder is the only consumer; rejected once `history-store` and HeaderMetrics were accepted
  as consumers, which makes it two real adapters rather than one hypothetical seam.

## Consequences

- **Metric Descriptor takes explicit data parameters and reads no atoms**, following
  `computeHeaderMetrics(envSnapshot, plants, …)` — the module it is a peer of. Parameters are
  added as each metric family lands and the facts stop being static; at temperature-only it
  needs none. A `growspaceId` argument was considered and rejected: it would force an atom
  read inside the function and cost the module its store-free testability.
- **Metric Descriptor is pure of `hass` *injection*, not free of `hass.states`.** It takes a
  states snapshot as an argument once it needs one (from #468 onward) — the
  `computeEnvSnapshot(device, hassStates)` / [[Hydration orchestrator]] shape, not the
  atom-only HeaderMetrics shape. This is forced:
  three inputs sit on no atom today — the day/night VPD threshold table (`EnvSnapshot` carries
  only the resolved `vpdStatus`), the light sensor's `unit_of_measurement` (`DeviceSnapshot`
  holds the display string `"70%"`, not the unit), and per-sensor `friendly_name` for
  multi-sensor titles. Fan metrics need no state lookup: `DeviceEntry.entityIds` supplies the
  entities and [[Fan Entity Mode]]'s type facet is id-derived.
- **No conflict with ADR-0005.** That ADR keeps *transport* (`getHistory` / `getBatchHistory` /
  `getHistoryStats`) in `history-store`; metric→entity mapping is not transport.
- **The duplicated VPD threshold table is resolved; the two derivations are not merged.** The
  Environment slice's `_resolveVpdStatus` answers "status *now*"; the chart needs a threshold
  *function* over historical points with `ChartUtils.getIsDay` deciding day/night per point.
  Both remain — the Metric Descriptor owns the table they share.
- **Descriptor inputs differ by `viewContext`.** The growspace adapter leaves the four hero
  metrics' `SensorReadings` null; the subarea adapter populates them.
- **Landing order** (both forms coexist in the component during migration, as the decomposed
  dialogs do): (1) descriptor module + builder wired to the chart, temperature only —
  `history-store` and HeaderMetrics keep their own tables meanwhile; (2) remaining metrics
  (unit/axis overrides → step detection → VPD bands → composite keys); (3) repoint
  `history-store` fetch; (4) repoint HeaderMetrics. Steps 3 and 4 carry their own blast radius
  (what gets fetched; visible chip shifts) and are deliberately not bundled with the chart work.
- **Test migration:** the existing 1,684-line spec stays untouched as a characterization net
  during migration — it is the only proof rendering did not change. As each metric lands on the
  builder, that metric's private-reaching tests are deleted and replaced by value-space
  assertions. End state: `env-series.spec` covers derivation; `env-chart.spec` keeps only
  genuinely component-level behaviour (scrolling, tooltip RAF, resize observers, event dispatch,
  no-data render).
