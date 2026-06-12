# Deepen HeaderMetrics to cover device chips and subareas via snapshot adapters; delete MetricsUtils

Two parallel paths compute the header's `{hero, chips}`: the pure, atom-sourced [[HeaderMetrics module]] (`src/slices/header-metrics/`, 671 LOC + 951-LOC test suite) and the legacy `MetricsUtils` (`src/utils/metrics-utils.ts`, 1,121 LOC, zero tests, reads `hass.states` directly from UI components). HeaderMetrics couldn't cover device chips (they need device entity state — blocked on the DeviceState slice, issue #144) or the subarea view ([[EnvSnapshot]] was growspace-scoped, and a subarea's sensor set is independently configured). So every chip change touched both paths, the legacy path leaked `hass` into the header container and subarea card, and the subarea card grew a private `_resolveCalculatedVpdIds` duplicating `computeSubareaMetrics`'s VPD entity resolution "so the history cache keys match". `MetricsUtils` fails the deletion test today — its 1,121 LOC would reappear across 8 importers — which is exactly why the fix is to deepen the module that replaces it, not to delete it in place.

## Decision

Deepen the [[HeaderMetrics module]] until it is the only header derivation, then delete `MetricsUtils`:

1. **Device chips join `HeaderMetricsResult`.** `computeHeaderMetrics` gains a `deviceSnapshot: DeviceSnapshot | null` input and the result gains `deviceChips`. The chips keep the legacy `MetricKey`s (`LIGHT`, `EXHAUST`, `CIRCULATION_FAN`, `HUMIDIFIER`, `DEHUMIDIFIER`) so `hidden_chips` configs and graph toggling are unaffected. The DeviceState slice's `DeviceEntry` (entityIds, aggregated value, multiValues, icon) is already chip-shaped; [[Fan Entity Mode]] detection (ADR-0008) stays in the slice's normalizers.

2. **The Environment and DeviceState slices become subarea-aware via an adapter split.** Each slice's compute splits into a shared read-and-aggregate core (explicit sensor lists → snapshot) behind two thin entity-resolution adapters: a **growspace adapter** (slug/overview-entity resolution, growspace calculated-VPD fallback) and a **subarea adapter** (direct `environment_config` lists, per-temp/hum-pair subarea calculated-VPD resolution). Two adapters = a real seam. New atoms `subareaEnvSnapshots$` and `subareaDeviceSnapshots$` are keyed by subareaId. Both scopes share the existing snapshot types — fields without configured sensors are null, already the types' convention — so `computeHeaderMetrics` works unchanged for the subarea view (with empty plant/irrigation inputs; dominant-stage and irrigation chips simply don't render).

3. **`sync-service` feeds the subarea snapshots**, iterating the Subarea slice's `subareas$` alongside devices — symmetric with how growspace snapshots flow today. The subarea card must ensure its subarea is hydrated into `subareas$` (it already fetches it to render).

4. **The subarea card's history fetching reads `SensorReadings.entityIds` from the snapshot** instead of re-resolving from `environment_config`. This deletes `_resolveCalculatedVpdIds` and makes the chip-display / history-cache-key consistency structural rather than a comment-enforced invariant.

5. **Phased landing**, each phase independently shippable: **P1** device chips into the result, main header container drops `MetricsUtils`; **P2** adapter split + subarea atoms + subarea card migration (including history keys); **P3** repoint the `HeaderChip`/`DominantStageInfo` type imports (5 UI components + `chip-filter.ts`) to `header-metrics/index.ts` and delete `metrics-utils.ts`.

The legacy `envAttrs` return value of `MetricsUtils.computeHeaderMetrics` dies with it — no caller consumes it (`history-store` reads `device.environmentAttributes` directly).

## Considered alternatives

- **Separate `deriveDeviceChips()` composed by each consumer** — keeps `computeHeaderMetrics`'s input list shorter, but leaves the hero/chips/deviceChips composition knowledge in every consumer (header container today, subarea card tomorrow). Rejected: the module exists to be the one place that knows what the header shows.
- **Synthetic `GrowspaceDevice` wrapping a subarea's `environment_config`** — no new seam, but the growspace adapter's slug/overview/VPD-fallback resolution would run against entity IDs that don't exist, silently producing nulls, and the fake device lies about its type to every reader. Rejected.
- **Port `computeSubareaMetrics` into the Environment slice as a parallel subarea compute** — gets `hass` out of the card but keeps two independent aggregation implementations that must stay in sync; the duplication that caused this friction would survive the move. Rejected.
- **Narrow `SubareaEnvSnapshot` type** — tighter, but creates a second shape `computeHeaderMetrics` must accept, and every new sensor category needs adding in two places. Rejected; null-for-unconfigured already expresses the subset.
- **Single-branch landing** — avoids interim dual-path states but spans slices, sync-service, the header container, the subarea card, and 5 type-import sites in one hard-to-review diff. Rejected for three shippable phases.

## Consequences

- 1,121 untested LOC (`metrics-utils.ts`) retired; all header derivation lands behind the HeaderMetrics interface and its existing fixture-builder test suite. New behaviour (device chips, subarea context) is testable with atoms alone — no `hass` mocking.
- The header container and subarea card stop reading `hass.states` for metrics — completing the "cards never reach into `hass`" rule (ADR-0001) for the header domain.
- Issue #144 (DeviceState slice) closes; the dangling `[[DeviceState slice]]` reference in CONTEXT.md is replaced by the [[DeviceSnapshot]] entry.
- Pixelmatch screenshot re-baselining is contained per phase (P1: main header; P2: subarea card).
- CONTEXT.md's [[EnvSnapshot]] entry no longer reads "one snapshot per growspace — not per subarea"; the adapter split and `subareaEnvSnapshots$` are documented there.
