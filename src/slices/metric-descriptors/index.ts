/**
 * Metric Descriptor module — the single owner of the per-`MetricKey` facts that a
 * header chip and an Env Graph must agree on: display title, colour, unit, icon,
 * chart type and axis scale.
 *
 * Public API (pure computation):
 *   computeMetricDescriptors() — derive the descriptor table.
 *
 * Like `computeHeaderMetrics`, this module reads no atoms and no injected `hass` —
 * everything it needs is passed in. Fan entity modes are derived from DeviceEntry
 * entity ids; only the light unit reads the supplied states snapshot (ADR-0030).
 *
 * Scope, per ADR-0030's landing order: **temperature, fan, and light**. A key with no
 * descriptor is not yet migrated, and consumers fall back to their existing
 * derivation for it. Widened by:
 *   #468 — fan and light unit/axis overrides (adds a `hass.states` snapshot param)
 *   #469 — step-vs-line chart type and fixed axes
 *   #470 — VPD day/night threshold table (adds an EnvSnapshot param)
 *   #471 — multi-sensor series refs, replacing `':'`-joined history keys
 */

import { ChartType, METRIC_CONFIG, MetricKey } from '../../features/environment/constants';
import {
  classifyFanEntity,
  fanReadingToAxisScale,
  type DeviceEntry,
  type DeviceSnapshot,
} from '../device-state';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * How a metric's value axis is bounded.
 *
 * `'auto'` — scale to the data, with the single-value padding rule applied.
 * `{ min, max }` — fixed bounds (fan scales, light %, binary/step metrics).
 */
export type MetricAxis = 'auto' | { min: number; max: number };

/** Everything a chip or a graph must know about one metric. */
export interface MetricDescriptor {
  key: string;
  title: string;
  color: string;
  unit: string;
  icon: string;
  chartType: ChartType;
  axis: MetricAxis;
  /** Entity context used to normalize history values for this migration slice. */
  entityId?: string;
}

type HassStates = Record<
  string,
  { state: string; attributes?: Record<string, unknown> } | undefined
>;

function _firstEntityId(entry: DeviceEntry | null | undefined): string | undefined {
  return entry?.entityIds[0];
}

function _fanDescriptor(
  key: MetricKey.EXHAUST | MetricKey.CIRCULATION_FAN,
  entry: DeviceEntry | null | undefined
): MetricDescriptor {
  const config = METRIC_CONFIG[key];
  const entityId = _firstEntityId(entry);
  // The classifier's type facet is id-derived. Passing no state is deliberate:
  // fan unit and axis selection must not touch the states snapshot.
  const kind = entityId ? classifyFanEntity(entityId, undefined).kind : 'speed-sensor';

  return {
    key,
    title: config.title,
    color: config.color,
    unit: kind === 'ha-fan' ? '%' : config.unit,
    icon: config.icon,
    chartType: ChartType.LINE,
    axis: fanReadingToAxisScale(kind),
    entityId,
  };
}

function _lightDescriptor(
  entry: DeviceEntry | null | undefined,
  hassStates: HassStates
): MetricDescriptor {
  const config = METRIC_CONFIG[MetricKey.LIGHT];
  const entityId = _firstEntityId(entry);
  const entityUnit = entityId
    ? (hassStates[entityId]?.attributes?.unit_of_measurement as string | undefined)
    : undefined;
  const isPercentage = entityUnit === '%';

  return {
    key: MetricKey.LIGHT,
    title: config.title,
    color: config.color,
    unit: isPercentage ? '%' : config.unit,
    icon: config.icon,
    chartType: isPercentage ? ChartType.LINE : ChartType.STEP,
    axis: isPercentage ? { min: 0, max: 100 } : { min: 0, max: 1 },
    entityId,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build the descriptor table, keyed by `MetricKey`.
 *
 * Only migrated metrics appear. Callers treat an absent key as "not migrated"
 * rather than as an error.
 */
export function computeMetricDescriptors(
  deviceSnapshot: DeviceSnapshot | null = null,
  hassStates: HassStates = {}
): Record<string, MetricDescriptor> {
  const temperature = METRIC_CONFIG[MetricKey.TEMPERATURE];

  return {
    [MetricKey.TEMPERATURE]: {
      key: MetricKey.TEMPERATURE,
      title: temperature.title,
      color: temperature.color,
      unit: temperature.unit,
      icon: temperature.icon,
      chartType: ChartType.LINE,
      axis: 'auto',
    },
    [MetricKey.EXHAUST]: _fanDescriptor(MetricKey.EXHAUST, deviceSnapshot?.exhaustFans),
    [MetricKey.CIRCULATION_FAN]: _fanDescriptor(
      MetricKey.CIRCULATION_FAN,
      deviceSnapshot?.circulationFans
    ),
    [MetricKey.LIGHT]: _lightDescriptor(deviceSnapshot?.lightSensors, hassStates),
  };
}
