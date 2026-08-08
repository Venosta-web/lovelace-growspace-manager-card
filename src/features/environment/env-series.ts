/**
 * Env Series builder — the pure derivation behind an Env Graph (ADR-0030).
 *
 * Turns a Metric Descriptor table plus raw sensor histories into value-space
 * series: domain units and timestamps, with the value range the axis should span.
 * **No pixels and no SVG paths** — geometry belongs to the rendering component,
 * which owns the chart's width and height.
 *
 * Scope, per ADR-0030's landing order: a metric is derived here only when the
 * descriptor table carries it. Multi-sensor (`'metric:entity'`) history keys are
 * not handled yet — that is #471 — so callers must keep those on their existing
 * derivation.
 */

import { ChartType } from './constants';
import type { HistorySensorState, SensorHistories } from './types';
import type { MetricDescriptor } from '../../slices/metric-descriptors';
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
    const value = ChartUtils.normalizeSensorValue(state, key, undefined, descriptor.unit);
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

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Derive value-space series for `metricKeys`.
 *
 * A key is skipped when it has no descriptor or no history. The returned order
 * follows `metricKeys`.
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

    const history = histories[key] ?? [];
    if (history.length === 0) continue;

    const points = _pointsForMetric(descriptor, history, startTimeMs, nowMs);
    if (points.length === 0) continue;

    const reduced = _reduce(points);
    const bounds = _axisBounds(descriptor, reduced, isCombined);

    series.push({
      id: key,
      title: descriptor.title,
      color: descriptor.color,
      unit: descriptor.unit,
      icon: descriptor.icon,
      points,
      min: bounds.min,
      max: bounds.max,
      avg: reduced.avg,
      chartType: descriptor.chartType,
    });
  }

  return series;
}
