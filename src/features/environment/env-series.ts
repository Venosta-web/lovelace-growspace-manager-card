/**
 * Env Series builder — the pure derivation behind an Env Graph (ADR-0030).
 *
 * Turns a Metric Descriptor table plus raw sensor histories into value-space
 * series: domain units and timestamps, with the value range the axis should span.
 * **No pixels and no SVG paths** — geometry belongs to the rendering component,
 * which owns the chart's width and height.
 *
 * Scope, per ADR-0030's landing order: a metric is derived here only when the
 * descriptor table carries it.
 *
 * Multi-sensor grouping is carried structurally: a descriptor's `sensors` decide
 * how many series a metric has, in what order, and what each is called. The
 * histories map is still keyed by `'metric:entity'` strings, so this module
 * composes that key — it never parses one, and never scans the map to discover
 * which sensors exist. The key scheme itself retires in #473.
 */

import { ChartType, MetricKey, StatusLevel, STATUS_COLORS } from './constants';
import type { HistorySensorState, SensorHistories } from './types';
import type { MetricDescriptor, MetricSensorRef } from '../../slices/metric-descriptors';
import { ChartUtils } from '../../utils/chart-utils';
import { BINARY_ON_STATES } from '../../lib/types/hass';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface EnvSeriesPoint {
  time: number;
  value: number;
  meta?: unknown;
}

/** A status-coloured time interval. It deliberately carries no chart geometry. */
export interface VpdBand {
  status: StatusLevel;
  startTime: number;
  endTime: number;
}

/** One metric's history, shaped for rendering but still in domain units. */
export interface EnvSeries {
  id: string;
  title: string;
  color: string;
  unit: string;
  icon: string;
  points: EnvSeriesPoint[];
  /** Lower bound of the value axis (already padded for the flat-line case). */
  min: number;
  /** Upper bound of the value axis. */
  max: number;
  avg: number;
  chartType: ChartType;
  vpdBands?: VpdBand[];
  /**
   * The sensor this series traces, present only when its metric has more than
   * one. Consumers that draw multi-sensor metrics differently — a flat fill
   * rather than a gradient — read this instead of inspecting the series id.
   */
  sensor?: MetricSensorRef;
}

/**
 * The window a series is derived over.
 *
 * Passed in rather than derived from a [[Time Range Selector]] range so that the
 * caller's window and the window the trace is drawn against cannot drift apart —
 * points seeded at one window start and a path drawn against another would be a
 * silently misaligned trace.
 */
export interface EnvSeriesWindow {
  startTimeMs: number;
  nowMs: number;
  /** Combined charts preserve a flat data range rather than padding it by ±1. */
  isCombined?: boolean;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * The last state at or before `startTimeMs`, which seeds the trace's left edge so
 * a line does not begin mid-chart when the sensor reported before the window.
 */
function _stateAtWindowStart(
  history: HistorySensorState[],
  startTimeMs: number
): HistorySensorState | undefined {
  let seed = history[0];
  for (const h of history) {
    if (new Date(h.last_changed).getTime() > startTimeMs) break;
    seed = h;
  }
  return seed;
}

function _pointsForMetric(
  descriptor: MetricDescriptor,
  history: HistorySensorState[],
  startTimeMs: number,
  nowMs: number
): EnvSeriesPoint[] {
  const key = descriptor.key;
  const points: EnvSeriesPoint[] = [];

  const pointFor = (state: HistorySensorState, time: number): EnvSeriesPoint | undefined => {
    const value = ChartUtils.normalizeSensorValue(state, key, descriptor.entityId, descriptor.unit);
    if (value === undefined) return undefined;
    const reasons = state.attributes?.reasons;
    return reasons === undefined ? { time, value } : { time, value, meta: { reasons } };
  };

  const seed = _stateAtWindowStart(history, startTimeMs);
  if (seed) {
    // Preserve the legacy left-edge seed: every recognized binary-on state is
    // carried in as 1 before metric-specific normalization is considered.
    if (BINARY_ON_STATES.includes(seed.state)) {
      points.push({ time: startTimeMs, value: 1 });
    } else {
      const point = pointFor(seed, startTimeMs);
      if (point) points.push(point);
    }
  }

  for (const h of history) {
    const time = new Date(h.last_changed).getTime();
    if (time <= startTimeMs) continue;
    const point = pointFor(h, time);
    if (point) points.push(point);
  }

  // Carry the last known value forward to "now" so the trace reaches the right
  // edge rather than stopping at the sensor's most recent report.
  if (points.length > 0) {
    const last = points[points.length - 1];
    points.push({ time: nowMs, value: last.value, meta: last.meta });
  }

  return points;
}

/** Single pass over the points — avoids spreading a large array into Math.min/max. */
function _reduce(points: EnvSeriesPoint[]): { min: number; max: number; avg: number } {
  let min = points[0].value;
  let max = points[0].value;
  let sum = 0;
  for (const p of points) {
    if (p.value < min) min = p.value;
    if (p.value > max) max = p.value;
    sum += p.value;
  }
  return { min, max, avg: sum / points.length };
}

/**
 * Resolve the axis bounds a series renders against. A flat auto-scaled line is
 * widened by ±1 so it draws through the middle of the chart instead of along an
 * edge; step metrics keep their bounds, which are meaningful as-is.
 */
function _axisBounds(
  descriptor: MetricDescriptor,
  reduced: { min: number; max: number },
  isCombined: boolean
): { min: number; max: number } {
  if (descriptor.axis !== 'auto') return { ...descriptor.axis };

  const { min, max } = reduced;
  if (!isCombined && max === min && descriptor.chartType !== ChartType.STEP) {
    return { min: min - 1, max: max + 1 };
  }
  return { min, max };
}

function _vpdStatus(
  value: number,
  thresholds: NonNullable<MetricDescriptor['vpdThresholds']>,
  isDay: boolean
): StatusLevel {
  const range = isDay ? thresholds.day : thresholds.night;
  if (value < range.dangerMin || value > range.dangerMax) return StatusLevel.DANGER;
  if (value < range.targetMin || value > range.targetMax) return StatusLevel.WARNING;
  return StatusLevel.OPTIMAL;
}

function _vpdBands(
  points: EnvSeriesPoint[],
  thresholds: NonNullable<MetricDescriptor['vpdThresholds']>,
  lightHistory: EnvSeriesPoint[]
): VpdBand[] {
  if (points.length < 2) return [];

  const bands: VpdBand[] = [];
  let startTime = points[0].time;
  let status = _vpdStatus(
    points[0].value,
    thresholds,
    ChartUtils.getIsDay(points[0].time, lightHistory)
  );

  for (let i = 1; i < points.length; i++) {
    const point = points[i];
    const pointStatus = _vpdStatus(
      point.value,
      thresholds,
      ChartUtils.getIsDay(point.time, lightHistory)
    );
    if (pointStatus !== status) {
      bands.push({ status, startTime, endTime: point.time });
      startTime = point.time;
      status = pointStatus;
    }
  }

  const endTime = points[points.length - 1].time;
  if (endTime > startTime) bands.push({ status, startTime, endTime });
  return bands;
}

/**
 * How one metric splits into series.
 *
 * A single-sensor metric has one, keyed and titled by the metric itself. A
 * multi-sensor metric has one per sensor, each named after its sensor and tinted
 * away from the metric colour so the traces stay distinguishable.
 */
interface SeriesSpec {
  id: string;
  historyKey: string;
  title: string;
  color: string;
  sensor?: MetricSensorRef;
}

function _seriesSpecs(descriptor: MetricDescriptor, key: string): SeriesSpec[] {
  const sensors = descriptor.sensors ?? [];
  if (sensors.length < 2) {
    return [{ id: key, historyKey: key, title: descriptor.title, color: descriptor.color }];
  }

  return sensors.map((sensor, index) => ({
    // The `'metric:entity'` history key is composed here, never parsed. It also
    // remains the series id, which `$activeEnvGraphs` membership and the
    // graph-toggle events are keyed by. Retired in #473.
    id: `${key}:${sensor.entityId}`,
    historyKey: `${key}:${sensor.entityId}`,
    title: `${descriptor.title} (${sensor.name})`,
    color:
      index === 0
        ? descriptor.color
        : `color-mix(in srgb, ${descriptor.color}, white ${index * 20}%)`,
    sensor,
  }));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Derive value-space series for `metricKeys`.
 *
 * A key is skipped when it has no descriptor or no history, and contributes one
 * series per sensor when its descriptor carries several. The returned order
 * follows `metricKeys`, then descriptor sensor order.
 */
export function computeEnvSeries(
  descriptors: Record<string, MetricDescriptor>,
  histories: SensorHistories,
  metricKeys: string[],
  window: EnvSeriesWindow
): EnvSeries[] {
  const { startTimeMs, nowMs, isCombined = false } = window;

  const series: EnvSeries[] = [];

  for (const key of metricKeys) {
    const descriptor = descriptors[key];
    if (!descriptor) continue;

    for (const spec of _seriesSpecs(descriptor, key)) {
      const built = _buildSeries(descriptor, spec, histories, {
        startTimeMs,
        nowMs,
        isCombined,
      });
      if (built) series.push(built);
    }
  }

  return series;
}

function _buildSeries(
  descriptor: MetricDescriptor,
  spec: SeriesSpec,
  histories: SensorHistories,
  window: { startTimeMs: number; nowMs: number; isCombined: boolean }
): EnvSeries | undefined {
  const { startTimeMs, nowMs, isCombined } = window;
  const key = descriptor.key;

  const history = histories[spec.historyKey] ?? [];
  if (history.length === 0) return undefined;

  const points = _pointsForMetric(descriptor, history, startTimeMs, nowMs);
  if (points.length === 0) return undefined;

  const reduced = _reduce(points);
  const bounds = _axisBounds(descriptor, reduced, isCombined);
  // Status bands describe *the* VPD trace; a multi-sensor VPD metric draws one
  // trace per sensor, which stay on the metric colour rather than each claiming
  // to be the growspace's status.
  const vpdThresholds =
    key === MetricKey.VPD && !spec.sensor ? descriptor.vpdThresholds : undefined;
  const lightHistory = vpdThresholds
    ? ChartUtils.normalizeHistory(histories[MetricKey.LIGHT] ?? [], MetricKey.LIGHT)
    : [];
  const vpdBands = vpdThresholds ? _vpdBands(points, vpdThresholds, lightHistory) : undefined;

  let color = spec.color;
  if (vpdThresholds) {
    const lastPoint = points[points.length - 1];
    // Preserve the legacy current-status rule: absent light history means day;
    // otherwise the latest light state decides the series/header colour.
    const currentIsDay =
      lightHistory.length === 0 || lightHistory[lightHistory.length - 1].value === 1;
    color = STATUS_COLORS[_vpdStatus(lastPoint.value, vpdThresholds, currentIsDay)];
  }

  return {
    id: spec.id,
    title: spec.title,
    color,
    unit: descriptor.unit,
    icon: descriptor.icon,
    points,
    min: bounds.min,
    max: bounds.max,
    avg: reduced.avg,
    chartType: descriptor.chartType,
    ...(vpdBands ? { vpdBands } : {}),
    ...(spec.sensor ? { sensor: spec.sensor } : {}),
  };
}
