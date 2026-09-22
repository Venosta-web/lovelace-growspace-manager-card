/**
 * Metric Descriptor module — the single owner of the per-`MetricKey` facts that a
 * header chip and an Env Graph must agree on: display title, colour, unit, icon,
 * chart type, axis scale, minimum meaningful span and [[Metric Target]]s.
 *
 * Public API (pure computation):
 *   computeMetricDescriptors() — derive the descriptor table.
 *
 * Like `computeHeaderMetrics`, this module reads no atoms and no injected `hass` —

 * everything it needs is passed in. Fan entity modes are derived from DeviceEntry
 * entity ids; the light unit reads the supplied states snapshot, and the VPD
 * targets read the supplied overview-entity snapshot (ADR-0030).
 *
 * The table covers **every metric in `METRIC_CONFIG`** — that set is closed, and
 * `history-store` only ever fetches within it, so a key with no descriptor is a
 * key with no history either. Consumers may treat an absent descriptor as "no
 * such metric" rather than as "not migrated yet".
 *
 * Since #471 a descriptor also carries the sensors backing its metric, as
 * structured `{ entityId, name }` refs — the grouping consumers used to
 * rediscover by splitting `':'`-joined history keys.
 *
 * Since #49 it also carries `targets` — the normalised guide-mark records of
 * `metric-targets.ts`, which **absorbed** the raw VPD-only threshold field this
 * table used to expose (ADR-0050). Resolving them reads
 * `biologicalMetrics.granularStage` off the `device` this function already
 * receives, because the feed-EC band and the appliance switching thresholds are
 * per stage, and a target that ignores the stage is the wrong number rather
 * than a coarse one.
 */

import { ChartType, METRIC_CONFIG, MetricKey } from '../../features/environment/constants';
import {
  classifyFanEntity,
  fanReadingToAxisScale,
  type DeviceEntry,
  type DeviceSnapshot,
} from '../device-state';
import { resolveMetricEntityIds } from './metric-entities';
import { computeMetricTargets } from './metric-targets';
import type { MetricTarget, OverviewEntitySnapshot } from './metric-targets';
import type { GrowspaceDevice } from '../../services/types';

export { resolveMetricEntityIds, metricHistoryKeys } from './metric-entities';
export type { MetricHistoryKey } from './metric-entities';
export {
  GuideMarkKind,
  computeMetricTargets,
  isLimit,
  isOptimalBand,
  isSetpoint,
  targetForPeriod,
} from './metric-targets';
export type {
  LimitTarget,
  MetricTarget,
  MetricTargetBounds,
  OptimalBandTarget,
  OverviewEntitySnapshot,
  SetpointTarget,
} from './metric-targets';

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
  /** Smallest range an unmarked auto axis displays, in this metric's unit. */
  minimumSpan: number;
  /**
   * The normalised guide-mark records for this metric (ADR-0050), empty when
   * nothing is configured. It **absorbed** the raw VPD-only threshold field this
   * descriptor used to carry: a raw field beside a normalised collection
   * guarantees VPD is drawn from one and every other metric from the other.
   */
  targets: MetricTarget[];
  /** The entity whose reading shape decides how history values normalize (fan, light). */
  entityId?: string;
  /**
   * The sensors backing this metric, in presentation order. More than one means
   * the metric renders one series per sensor. Empty when no device was supplied.
   */
  sensors: MetricSensorRef[];
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
    minimumSpan: config.minimumSpan,
    entityId,
    sensors: [],
    targets: [],
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
    // A light's reported value is held until Home Assistant records its next
    // state change. Percentage entities therefore need the same step-after
    // interpolation as binary lights; a line would invent gradual dimming
    // between two discrete brightness updates.
    chartType: ChartType.STEP,
    axis: isPercentage ? { min: 0, max: 100 } : { min: 0, max: 1 },
    minimumSpan: config.minimumSpan,
    entityId,
    sensors: [],
    targets: [],
  };
}

function _descriptor(
  key: string,
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
    minimumSpan: config.minimumSpan,
    sensors: [],
    targets: [],
  };
}

/**
 * The sensors backing `key`, named for display.
 *
 * Resolution is shared with `history-store` (see `metric-entities.ts`) so a
 * descriptor's sensor list and the histories fetched for that metric always
 * describe the same entities.
 */
function _sensorsForMetric(entityIds: string[], hassStates: HassStates): MetricSensorRef[] {
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
  const table = _descriptorTable(deviceSnapshot, hassStates);

  for (const [key, descriptor] of Object.entries(table)) {
    const entityIds =
      metricSensorIds?.[key] ?? (device ? resolveMetricEntityIds(device, key, hassStates) : []);
    descriptor.sensors = _sensorsForMetric(entityIds, hassStates);
    descriptor.targets = computeMetricTargets(key, device, overviewEntity);

    // A snapshot can legitimately lag behind configuration during bootstrap.
    // Fan type is stable and encoded in the configured entity id, so do not
    // degrade an HA fan to the generic speed-sensor value space while waiting
    // for its first live state snapshot.
    if (
      (key === MetricKey.EXHAUST || key === MetricKey.CIRCULATION_FAN) &&
      !descriptor.entityId &&
      entityIds[0]
    ) {
      const kind = classifyFanEntity(entityIds[0], undefined).kind;
      descriptor.entityId = entityIds[0];
      descriptor.unit = kind === 'ha-fan' ? '%' : METRIC_CONFIG[key].unit;
      descriptor.axis = fanReadingToAxisScale(kind);
    }
  }

  return table;
}

/**
 * The axis a metric gets from its `METRIC_CONFIG` entry alone.
 *
 * A step metric spans the binary 0..1 range; the humidifier's speed scale is the
 * one plain metric with bounds of its own. Everything else scales to its data.
 */
function _defaultAxis(key: string, chartType: ChartType): MetricAxis {
  if (key === MetricKey.HUMIDIFIER) return { min: 0, max: 10 };
  return chartType === ChartType.STEP ? { min: 0, max: 1 } : 'auto';
}

function _descriptorTable(
  deviceSnapshot: DeviceSnapshot | null,
  hassStates: HassStates
): Record<string, MetricDescriptor> {
  const table: Record<string, MetricDescriptor> = {};

  // Every metric the card knows is a metric of `METRIC_CONFIG`, and most need
  // nothing beyond it — so the table is generated from it, and only the metrics
  // whose facts depend on the device or its states get a case below.
  for (const [key, config] of Object.entries(METRIC_CONFIG)) {
    const chartType = config.type ?? ChartType.LINE;
    table[key] = _descriptor(key, chartType, _defaultAxis(key, chartType));
  }

  table[MetricKey.EXHAUST] = _fanDescriptor(MetricKey.EXHAUST, deviceSnapshot?.exhaustFans);
  table[MetricKey.CIRCULATION_FAN] = _fanDescriptor(
    MetricKey.CIRCULATION_FAN,
    deviceSnapshot?.circulationFans
  );
  table[MetricKey.LIGHT] = _lightDescriptor(deviceSnapshot?.lightSensors, hassStates);

  return table;
}
