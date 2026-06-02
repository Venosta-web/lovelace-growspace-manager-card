# ADR-0008: Runtime Fan Entity Mode Detection for Chip Display and Graph Scale

**Status:** Accepted

## Context

The fan chip (exhaust and circulation fan) previously displayed a hardcoded On/Off value regardless of what entity type was configured. Home Assistant supports three meaningfully different entity types that can be assigned to a fan slot:

1. **HA fan entities** (`fan.*` domain) — stateful `on`/`off` with a `percentage` attribute (0–100) representing actual speed. The `state` field alone is insufficient; you need `attributes.percentage`.
2. **Speed sensors** (numeric state, non-`fan.*` domain) — report a 0–10 dimensionless speed index directly as the state string.
3. **Binary devices** (switches, input booleans) — only `on`/`off`, no speed information.

`SENSOR_CHART_DEFAULTS` for `exhaust` and `circulation_fan` hardcoded `{ min: 0, max: 10, unit: 'state' }`, which is wrong for percentage fans (should be 0–100, unit `%`) and causes the graph tooltip to render binary `ON`/`OFF` instead of the actual speed value.

`ChartUtils.normalizeSensorValue` only received `{ state: string }` and could not read `attributes.percentage`, so HA fan entities were normalized as `on→1 / off→0` — a binary representation that loses all speed information.

## Decision

Detect fan entity mode at runtime using `hass.states[entityId]`:

- **Primary signal:** entity domain. If `entity_id.startsWith('fan.')`, treat as HA fan entity.
- **Secondary signal:** if state parses as a finite float that is not 0 or 1, treat as speed sensor (0–10).
- **Fallback:** binary On/Off.

**Chip display** (`computeDeviceSnapshot` / `getAggregateState` in `metrics-utils.ts`):
- HA fan entity: `state === 'off'` → `"Off"`, otherwise `"${attributes.percentage}%"`.
- Speed sensor: raw integer string (e.g. `"5"`).
- Binary: `"On"` / `"Off"`.

**Graph normalization** (`ChartUtils.normalizeSensorValue`):
- Extend first param to `{ state: string; attributes?: Record<string, unknown> }` (matches raw HA history point shape already).
- Add optional `entityDomain` param. For `fan.*`, return `Number(attributes?.percentage ?? 0)`.
- All other fan types continue through the existing float-parse path.

**Graph scale** (`env-chart.ts` series builder):
- For `EXHAUST` and `CIRCULATION_FAN` series, look up the configured entity ID from `this.device`, inspect its domain in `hass.states`, and inject `{ min: 0, max: 100, unit: '%', binary: false }` (HA fan) or `{ min: 0, max: 10, unit: '', binary: false }` (speed sensor) or `{ binary: true }` (binary) — bypassing the static `SENSOR_CHART_DEFAULTS` for those two metrics.

## Alternatives Considered

**Static SENSOR_CHART_DEFAULTS flag (rejected):** Add a per-user config flag to choose scale. Adds config friction for something that can be inferred automatically from the entity type HA already exposes.

**Separate MetricKeys for each fan type (rejected):** Add `EXHAUST_FAN_PERCENT`, `EXHAUST_FAN_SPEED`, etc. Breaks the existing chip layout, drag-to-link graph groups, and history key space for existing users.

**Read percentage in normalizeSensorValue without domain check (rejected):** If `attributes.percentage` exists, use it. This would misclassify any non-fan entity that happens to have a `percentage` attribute (e.g. humidity sensors with a `humidity` device class also sometimes carry this attribute name).
