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
 * entity ids; the light unit reads the supplied states snapshot, and VPD thresholds
 * read the supplied overview-entity snapshot (ADR-0030).
 *
 * Scope, per ADR-0030's landing order: **temperature, fan, light, VPD, and the
 * step-vs-line shape and fixed axes of the binary metrics**. A key with no
 * descriptor is not yet migrated, and consumers fall back to their existing
 * derivation for it.
 *
 * Since #471 a descriptor also carries the sensors backing its metric, as
 * structured `{ entityId, name }` refs — the grouping consumers used to
 * rediscover by splitting `':'`-joined history keys.
 */

import { ChartType, METRIC_CONFIG, MetricKey } from '../../features/environment/constants';
import { DEFAULTS } from '../../lib/constants';
import {
  classifyFanEntity,
  fanReadingToAxisScale,
  type DeviceEntry,
  type DeviceSnapshot,
} from '../device-state';
import { resolveMetricEntityIds } from './metric-entities';
import type { GrowspaceDevice } from '../../services/types';

export { resolveMetricEntityIds } from './metric-entities';

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

export interface VpdThresholdRange {
  targetMin: number;
  targetMax: number;
  dangerMin: number;
  dangerMax: number;
}

export interface VpdThresholds {
  day: VpdThresholdRange;
  night: VpdThresholdRange;
}

/**
 * One sensor backing a metric.
 *
 * `name` is resolved here, once, so a consumer never has to look a friendly name
 * up for itself — the reason the descriptor takes a states snapshot at all.
 */
export interface MetricSensorRef {
  entityId: string;
  name: string;
}

/** Everything a chip or a graph must know about one metric. */
export interface MetricDescriptor {
  key: string;
  title: string;
  color: string;
  unit: string;
  icon: string;
  chartType: ChartType;
  axis: MetricAxis;
  vpdThresholds?: VpdThresholds;
  /** Entity context used to normalize history values for this migration slice. */
  entityId?: string;
  /**
   * The sensors backing this metric, in presentation order. More than one means
   * the metric renders one series per sensor. Empty when no device was supplied.
   */
  sensors: MetricSensorRef[];
}

export interface OverviewEntitySnapshot {
  attributes?: Record<string, unknown>;
}

function _vpdThresholds(overviewEntity?: OverviewEntitySnapshot): VpdThresholds {
  const attrs = overviewEntity?.attributes ?? {};
  const day = {
    targetMin: Number(attrs.day_vpd_target_min ?? attrs.vpd_target_min ?? DEFAULTS.VPD.TARGET_MIN),
    targetMax: Number(attrs.day_vpd_target_max ?? attrs.vpd_target_max ?? DEFAULTS.VPD.TARGET_MAX),
    dangerMin: Number(attrs.day_vpd_danger_min ?? attrs.vpd_danger_min ?? DEFAULTS.VPD.DANGER_MIN),
    dangerMax: Number(attrs.day_vpd_danger_max ?? attrs.vpd_danger_max ?? DEFAULTS.VPD.DANGER_MAX),
  };

  return {
    day,
    // Missing night values intentionally inherit the resolved day values, including
    // legacy keys and defaults.
    night: {
      targetMin: Number(attrs.night_vpd_target_min ?? day.targetMin),
      targetMax: Number(attrs.night_vpd_target_max ?? day.targetMax),
      dangerMin: Number(attrs.night_vpd_danger_min ?? day.dangerMin),
      dangerMax: Number(attrs.night_vpd_danger_max ?? day.dangerMax),
    },
  };
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
    sensors: [],
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
    sensors: [],
  };
}

function _descriptor(
  key: MetricKey,
  chartType: ChartType,
  axis: MetricAxis,
  unit?: string
): MetricDescriptor {
  const config = METRIC_CONFIG[key];
  return {
    key,
    title: config.title,
    color: config.color,
    unit: unit ?? config.unit,
    icon: config.icon,
    chartType,
    axis,
    sensors: [],
  };
}

/**
 * The sensors backing `key`, named for display.
 *
 * Resolution is shared with `history-store` (see `metric-entities.ts`) so a
 * descriptor's sensor list and the histories fetched for that metric always
 * describe the same entities.
 */
function _sensorsForMetric(
  entityIds: string[],
  hassStates: HassStates
): MetricSensorRef[] {
  return entityIds.map((entityId) => ({
    entityId,
    name: (hassStates[entityId]?.attributes?.friendly_name as string | undefined) || entityId,
  }));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build the descriptor table, keyed by `MetricKey`.
 *
 * Only migrated metrics appear. Callers treat an absent key as "not migrated"
 * rather than as an error.
 *
 * `device` supplies the metric→entity mapping. Without it, and without an
 * override, the descriptors carry no sensors and a consumer sees every metric as
 * single-sensor.
 *
 * `metricSensorIds` lets a view context that resolves its own entities — the
 * subarea card, whose four hero metrics come from its own `SensorReadings` and
 * not from the parent growspace's config — declare them. A view must pass the
 * same lists it keyed its histories by, since the two are read together.
 */
export function computeMetricDescriptors(
  deviceSnapshot: DeviceSnapshot | null = null,
  hassStates: HassStates = {},
  overviewEntity?: OverviewEntitySnapshot,
  device?: GrowspaceDevice | null,
  metricSensorIds?: Record<string, string[]>
): Record<string, MetricDescriptor> {
  const table = _descriptorTable(deviceSnapshot, hassStates, overviewEntity);

  for (const [key, descriptor] of Object.entries(table)) {
    const entityIds =
      metricSensorIds?.[key] ?? (device ? resolveMetricEntityIds(device, key, hassStates) : []);
    descriptor.sensors = _sensorsForMetric(entityIds, hassStates);
  }

  return table;
}

function _descriptorTable(
  deviceSnapshot: DeviceSnapshot | null,
  hassStates: HassStates,
  overviewEntity?: OverviewEntitySnapshot
): Record<string, MetricDescriptor> {
  return {
    [MetricKey.TEMPERATURE]: _descriptor(MetricKey.TEMPERATURE, ChartType.LINE, 'auto'),
    [MetricKey.OPTIMAL]: _descriptor(MetricKey.OPTIMAL, ChartType.STEP, { min: 0, max: 1 }),
    [MetricKey.DEHUMIDIFIER]: _descriptor(MetricKey.DEHUMIDIFIER, ChartType.STEP, {
      min: 0,
      max: 1,
    }),
    [MetricKey.HUMIDIFIER]: _descriptor(MetricKey.HUMIDIFIER, ChartType.LINE, { min: 0, max: 10 }),
    [MetricKey.IRRIGATION]: _descriptor(MetricKey.IRRIGATION, ChartType.STEP, { min: 0, max: 1 }),
    [MetricKey.DRAIN]: _descriptor(MetricKey.DRAIN, ChartType.STEP, { min: 0, max: 1 }),
    [MetricKey.VPD]: {
      ..._descriptor(MetricKey.VPD, ChartType.LINE, 'auto'),
      vpdThresholds: _vpdThresholds(overviewEntity),
    },
    [MetricKey.EXHAUST]: _fanDescriptor(MetricKey.EXHAUST, deviceSnapshot?.exhaustFans),
    [MetricKey.CIRCULATION_FAN]: _fanDescriptor(
      MetricKey.CIRCULATION_FAN,
      deviceSnapshot?.circulationFans
    ),
    [MetricKey.LIGHT]: _lightDescriptor(deviceSnapshot?.lightSensors, hassStates),
  };
}
