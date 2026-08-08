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

export type HistoryRange = '1h' | '6h' | '24h' | '7d';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const RANGE_DURATION_MS: Record<HistoryRange, number> = {
  '1h': 60 * 60 * 1000,
  '6h': 6 * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
};

/** Milliseconds spanned by a Time Range Selector range. */
export function durationMillisForRange(range: HistoryRange): number {
  return RANGE_DURATION_MS[range] ?? RANGE_DURATION_MS['24h'];
}

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
  key: string,
  history: HistorySensorState[],
  startTimeMs: number,
  nowMs: number
): EnvSeriesPoint[] {
  const points: EnvSeriesPoint[] = [];

  const seed = _stateAtWindowStart(history, startTimeMs);
  if (seed) {
    const seedValue = ChartUtils.normalizeSensorValue(seed, key);
    if (seedValue !== undefined) points.push({ time: startTimeMs, value: seedValue });
  }

  for (const h of history) {
    const time = new Date(h.last_changed).getTime();
    if (time <= startTimeMs) continue;
    const value = ChartUtils.normalizeSensorValue(h, key);
    if (value !== undefined) points.push({ time, value });
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
  reduced: { min: number; max: number }
): { min: number; max: number } {
  if (descriptor.axis !== 'auto') return { ...descriptor.axis };

  const { min, max } = reduced;
  if (max === min && descriptor.chartType !== ChartType.STEP) {
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
  range: HistoryRange,
  now: Date
): EnvSeries[] {
  const nowMs = now.getTime();
  const startTimeMs = nowMs - durationMillisForRange(range);

  const series: EnvSeries[] = [];

  for (const key of metricKeys) {
    const descriptor = descriptors[key];
    if (!descriptor) continue;

    const history = histories[key] ?? [];
    if (history.length === 0) continue;

    const points = _pointsForMetric(key, history, startTimeMs, nowMs);
    if (points.length === 0) continue;

    const reduced = _reduce(points);
    const bounds = _axisBounds(descriptor, reduced);

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
