/**
 * Env Series builder — the pure derivation behind an Env Graph (ADR-0030).
 *
 * Turns a Metric Descriptor table plus raw sensor histories into value-space
 * series: domain units and timestamps, with the value range the axis should span.
 * **No pixels and no SVG paths** — geometry belongs to the rendering component,
 * which owns the chart's width and height.
 *
 * A metric is derived here only when the descriptor table carries it. That table
 * covers every metric the card knows, so an absent key means "not a metric".
 *
 * [[Guide Mark]]s come from the same table's [[Metric Target]]s, so the VPD status
 * bands and the [[Optimal Band]] drawn over them classify against one set of
 * numbers (ADR-0050). The value range this module reports is the **union of the
 * data and the bands**: anchoring on a target alone flattens real readings
 * against an axis edge, and ignoring it clips the target out of the frame.
 *
 * Multi-sensor grouping is carried structurally: a descriptor's `sensors` decide
 * how many series a metric has, in what order, and what each is called. This
 * module never parses a history key and never scans the map to discover which
 * sensors exist — it asks `metricHistoryKeys` for the key each sensor's data is
 * filed under, the same function `history-store` files it with (#473).
 */

import { ChartType, MetricKey, StatusLevel, STATUS_COLORS } from './constants';
import type { HistorySensorState, SensorHistories } from './types';
import {
  isLimit,
  isOptimalBand,
  metricHistoryKeys,
  targetForPeriod,
} from '../../slices/metric-descriptors';
import type {
  MetricDescriptor,
  MetricSensorRef,
  MetricTarget,
} from '../../slices/metric-descriptors';
import { ChartUtils } from '../../utils/chart-utils';
import type { NormalizedHistoryPoint } from '../../adapters/hass-types';

/**
 * How far past the union of the data and its bands an auto-scaled axis reaches,
 * as a fraction of that union.
 *
 * A band edge drawn exactly on the frame edge reads as a clipped mark rather
 * than as the bound it is, so the pad exists to keep it inboard. It applies only
 * where a band is drawn; a metric with no target keeps the bounds it had.
 */
const GUIDE_BAND_AXIS_PAD = 0.08;

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

/**
 * One interval of an [[Optimal Band]], with the bounds in force over it.
 *
 * A band whose source is period-indexed has one of these per photoperiod, which
 * is how the mark steps at lights-on and lights-off (ADR-0048); one whose source
 * is not has a single interval spanning the window. Value and time space only —
 * the chart turns these into geometry.
 */
export interface EnvGuideBandSegment {
  startTime: number;
  endTime: number;
  min: number;
  max: number;
}

/** An [[Optimal Band]] resolved against this series' window. */
export interface EnvGuideBand {
  id: string;
  segments: EnvGuideBandSegment[];
  /**
   * The bounds under the window's current time — its right edge.
   *
   * A stepped mark has no single value to name, so this is the segment its
   * inline labels read, per ADR-0048.
   */
  current: { min: number; max: number };
}

/** One metric's history, shaped for rendering but still in domain units. */
export interface EnvSeries {
  id: string;
  title: string;
  color: string;
  /**
   * The metric's own colour, which is not always `color`: a VPD trace takes the
   * colour of its current status, and a [[Guide Mark]] drawn in that would
   * change colour as the reading crossed the very bound it marks.
   */
  metricColor: string;
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
   * The [[Optimal Band]]s this series' axis was widened to contain, absent when
   * the metric has no configured target. Present for any metric that has one —
   * `vpdBands` above is a different thing, the VPD trace's own status colouring.
   */
  guideBands?: EnvGuideBand[];
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
  nowMs: number,
  entityId?: string
): EnvSeriesPoint[] {
  const key = descriptor.key;
  const points: EnvSeriesPoint[] = [];

  const pointFor = (state: HistorySensorState, time: number): EnvSeriesPoint | undefined => {
    const value = ChartUtils.normalizeSensorValue(
      state,
      key,
      entityId ?? descriptor.entityId,
      descriptor.unit
    );
    if (value === undefined) return undefined;
    const reasons = state.attributes?.reasons;
    return reasons === undefined ? { time, value } : { time, value, meta: { reasons } };
  };

  const seed = _stateAtWindowStart(history, startTimeMs);
  if (seed) {
    const point = pointFor(seed, startTimeMs);
    if (point) points.push(point);
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
  isCombined: boolean,
  guideBands: EnvGuideBand[]
): { min: number; max: number } {
  if (descriptor.axis !== 'auto') return { ...descriptor.axis };

  let { min, max } = reduced;
  for (const band of guideBands) {
    for (const segment of band.segments) {
      if (segment.min < min) min = segment.min;
      if (segment.max > max) max = segment.max;
    }
  }

  if (guideBands.length > 0) {
    // The union of the data and the band, never either alone: anchoring on the
    // target flattens real readings against an axis edge, and ignoring it clips
    // the target out of the frame. `crop-steering-day-chart` reached the same
    // rule for its EC scale first.
    const pad = (max - min) * GUIDE_BAND_AXIS_PAD || 1;
    return { min: min - pad, max: max + pad };
  }

  if (!isCombined && max === min && descriptor.chartType !== ChartType.STEP) {
    return { min: min - 1, max: max + 1 };
  }
  return { min, max };
}

/**
 * The photoperiods covering the window, as contiguous intervals.
 *
 * Built from the light history's own transition times rather than sampled, so a
 * mark that steps at lights-on steps exactly there. An absent light history is
 * one all-day interval, the same default `ChartUtils.getIsDay` takes.
 */
function _photoperiods(
  lightHistory: NormalizedHistoryPoint[],
  startTimeMs: number,
  nowMs: number
): { startTime: number; endTime: number; isDay: boolean }[] {
  const boundaries = [startTimeMs];
  for (const point of lightHistory) {
    if (point.time > startTimeMs && point.time < nowMs) boundaries.push(point.time);
  }

  const periods: { startTime: number; endTime: number; isDay: boolean }[] = [];
  for (let i = 0; i < boundaries.length; i++) {
    const startTime = boundaries[i];
    const endTime = boundaries[i + 1] ?? nowMs;
    if (endTime <= startTime) continue;

    const isDay = ChartUtils.getIsDay(startTime, lightHistory);
    const previous = periods[periods.length - 1];
    // A light history can report the same state twice; that is not a transition.
    if (previous && previous.isDay === isDay) previous.endTime = endTime;
    else periods.push({ startTime, endTime, isDay });
  }

  return periods;
}

/** Whether a target's bounds differ between day and night, and so step. */
function _stepsWithPhotoperiod(target: MetricTarget): boolean {
  if (isOptimalBand(target)) {
    return target.day.min !== target.night.min || target.day.max !== target.night.max;
  }
  return target.day !== target.night;
}

/** Resolve the metric's [[Optimal Band]]s against the window's photoperiods. */
function _guideBands(
  targets: MetricTarget[],
  photoperiods: { startTime: number; endTime: number; isDay: boolean }[],
  startTimeMs: number,
  nowMs: number
): EnvGuideBand[] {
  return targets.filter(isOptimalBand).map((target) => {
    const segments: EnvGuideBandSegment[] = _stepsWithPhotoperiod(target)
      ? photoperiods.map((period) => ({
          startTime: period.startTime,
          endTime: period.endTime,
          ...targetForPeriod(target, period.isDay),
        }))
      : [{ startTime: startTimeMs, endTime: nowMs, ...target.day }];

    const atNow = segments[segments.length - 1] ?? { min: target.day.min, max: target.day.max };
    return { id: target.id, segments, current: { min: atNow.min, max: atNow.max } };
  });
}

/**
 * Where a value sits against a metric's targets: outside a [[Limit]] is danger,
 * outside the [[Optimal Band]] is warning, inside both is optimal.
 *
 * This is the VPD rule, generalised — it reads the normalised targets rather
 * than a VPD-shaped record, so the status bands and the guide marks drawn over
 * them cannot resolve from different numbers (ADR-0050).
 */
function _targetStatus(targets: MetricTarget[], value: number, isDay: boolean): StatusLevel {
  for (const target of targets) {
    if (!isLimit(target)) continue;
    const bound = targetForPeriod(target, isDay);
    if (target.side === 'lower' ? value < bound : value > bound) return StatusLevel.DANGER;
  }
  for (const target of targets) {
    if (!isOptimalBand(target)) continue;
    const bounds = targetForPeriod(target, isDay);
    if (value < bounds.min || value > bounds.max) return StatusLevel.WARNING;
  }
  return StatusLevel.OPTIMAL;
}

function _vpdBands(
  points: EnvSeriesPoint[],
  targets: MetricTarget[],
  lightHistory: EnvSeriesPoint[]
): VpdBand[] {
  if (points.length < 2) return [];

  const bands: VpdBand[] = [];
  let startTime = points[0].time;
  let status = _targetStatus(
    targets,
    points[0].value,
    ChartUtils.getIsDay(points[0].time, lightHistory)
  );

  for (let i = 1; i < points.length; i++) {
    const point = points[i];
    const pointStatus = _targetStatus(
      targets,
      point.value,
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

  const keys = metricHistoryKeys(
    key,
    sensors.map((sensor) => sensor.entityId)
  );

  return sensors.map((sensor, index) => ({
    // The series *id* is still `'metric:entity'`: it is a graph identity, which
    // `$activeEnvGraphs` membership and the graph-toggle events are keyed by.
    // The history key is a different thing, and comes from the shared function.
    id: `${key}:${sensor.entityId}`,
    historyKey: keys[index].historyKey,
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

  const points = _pointsForMetric(descriptor, history, startTimeMs, nowMs, spec.sensor?.entityId);
  if (points.length === 0) return undefined;

  const reduced = _reduce(points);
  const targets = descriptor.targets ?? [];
  // Status bands describe *the* VPD trace; a multi-sensor VPD metric draws one
  // trace per sensor, which stay on the metric colour rather than each claiming
  // to be the growspace's status.
  const statusTargets = key === MetricKey.VPD && !spec.sensor ? targets : undefined;
  // The light history is what makes a period-indexed mark step, so it is read
  // whenever the status bands need it or a target actually varies by period.
  const lightHistory =
    statusTargets || targets.some(_stepsWithPhotoperiod)
      ? ChartUtils.normalizeHistory(histories[MetricKey.LIGHT] ?? [], MetricKey.LIGHT)
      : [];
  const guideBands = _guideBands(
    targets,
    _photoperiods(lightHistory, startTimeMs, nowMs),
    startTimeMs,
    nowMs
  );
  const bounds = _axisBounds(descriptor, reduced, isCombined, guideBands);
  const vpdBands = statusTargets ? _vpdBands(points, statusTargets, lightHistory) : undefined;

  let color = spec.color;
  if (statusTargets) {
    const lastPoint = points[points.length - 1];
    // Preserve the legacy current-status rule: absent light history means day;
    // otherwise the latest light state decides the series/header colour.
    const currentIsDay =
      lightHistory.length === 0 || lightHistory[lightHistory.length - 1].value === 1;
    color = STATUS_COLORS[_targetStatus(statusTargets, lastPoint.value, currentIsDay)];
  }

  return {
    id: spec.id,
    title: spec.title,
    color,
    metricColor: spec.color,
    unit: descriptor.unit,
    icon: descriptor.icon,
    points,
    min: bounds.min,
    max: bounds.max,
    avg: reduced.avg,
    chartType: descriptor.chartType,
    ...(vpdBands ? { vpdBands } : {}),
    ...(guideBands.length > 0 ? { guideBands } : {}),
    ...(spec.sensor ? { sensor: spec.sensor } : {}),
  };
}
