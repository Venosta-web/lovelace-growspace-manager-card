/**
 * Curated Combo derivation — the subordinate pane of a two-pane combo (ADR-0049).
 *
 * A combo's primary pane is an ordinary [[Env Graph]], derived by
 * `computeEnvSeries` and drawn by `<growspace-env-chart>`. This module owns the
 * other half: turning an [[Interval Metric]]'s history into the bars that pane
 * shows. Value space only — no pixels and no SVG paths, the same split ADR-0030
 * draws for Env Series.
 *
 * An interval metric's value is an aggregate over a bucket, so a bar is not a
 * sample: it is the **time-weighted mean** of the metric across its bucket,
 * reported as duty — a percentage of the metric's own full scale. That is why
 * the reading is taken as held until the sensor next reports rather than
 * averaged point-by-point: a fan that sat at speed 10 for 58 minutes and
 * dropped to 0 for two did not run at half duty.
 */

import { computeEnvSeries, type EnvSeriesPoint } from './env-series';
import type { MetricDescriptor } from '../../slices/metric-descriptors';
import type { SensorHistories } from './types';

/** One bucket of an [[Interval Metric]], in time space and percent of full scale. */
export interface ComboIntervalBar {
  startTime: number;
  endTime: number;
  /** Duty over the bucket: 0 is idle, 100 is pinned at the metric's full scale. */
  value: number;
}

/** The subordinate pane of a [[Curated Combo]], ready for geometry. */
export interface ComboIntervalPane {
  key: string;
  title: string;
  color: string;
  /** Always percent: duty is what an interval secondary reports. */
  unit: string;
  bars: ComboIntervalBar[];
  /**
   * The tallest bar's value. The cap *is* the pane's scale, the way
   * `tank-water-chart` reasons about its usage pane, so it is derived here
   * rather than recomputed by whoever draws the bars.
   */
  peak: number;
}

/** The window an interval pane is bucketed over. */
export interface ComboIntervalWindow {
  startTimeMs: number;
  nowMs: number;
  /** How many buckets the window is cut into. */
  barCount: number;
}

/**
 * The metric's mean value over `[start, end)`, or `undefined` when no reading
 * covers the bucket.
 *
 * Each point holds until the next one, so the mean is weighted by how long each
 * reading was in force. A bucket the sensor never covered is absent rather than
 * zero: no data is not idle.
 */
function _meanOverBucket(points: EnvSeriesPoint[], start: number, end: number): number | undefined {
  let weighted = 0;
  let covered = 0;

  for (let i = 0; i < points.length; i++) {
    const from = Math.max(points[i].time, start);
    const to = Math.min(points[i + 1]?.time ?? end, end);
    if (to <= from) continue;
    weighted += points[i].value * (to - from);
    covered += to - from;
  }

  return covered > 0 ? weighted / covered : undefined;
}

/**
 * Derive the interval pane for `metricKey`, or `undefined` when there is
 * nothing to draw.
 */
export function computeComboIntervalPane(
  descriptors: Record<string, MetricDescriptor>,
  histories: SensorHistories,
  metricKey: string,
  { startTimeMs, nowMs, barCount }: ComboIntervalWindow
): ComboIntervalPane | undefined {
  const descriptor = descriptors[metricKey];
  if (!descriptor) return undefined;
  // A history outlives the configuration that produced it — the store caches
  // per metric key and stops refetching rather than clearing — so the sensor
  // list decides, not the presence of data. Duty for a fan the growspace no
  // longer has is a stale claim rather than context, and the combo degrades to
  // its primary alone.
  if (descriptor.sensors.length === 0) return undefined;

  const [series] = computeEnvSeries(descriptors, histories, [metricKey], { startTimeMs, nowMs });
  if (!series) return undefined;

  // Duty is a fraction of the metric's own full scale, which only a fixed axis
  // states. An auto-scaled metric has no full scale to be a percentage of.
  const fullScale = descriptor.axis === 'auto' ? undefined : descriptor.axis.max;
  if (!fullScale) return undefined;

  const bucketMs = (nowMs - startTimeMs) / barCount;
  const bars: ComboIntervalBar[] = [];
  for (let i = 0; i < barCount; i++) {
    const startTime = startTimeMs + i * bucketMs;
    const endTime = startTime + bucketMs;
    const mean = _meanOverBucket(series.points, startTime, endTime);
    if (mean === undefined) continue;
    bars.push({ startTime, endTime, value: (mean / fullScale) * 100 });
  }

  return {
    key: metricKey,
    title: descriptor.title,
    color: descriptor.color,
    unit: '%',
    bars,
    peak: bars.reduce((highest, bar) => Math.max(highest, bar.value), 0),
  };
}
