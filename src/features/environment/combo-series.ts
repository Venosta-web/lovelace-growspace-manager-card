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
 * sample: it is the **time-weighted mean** of the metric across its bucket.
 * That is why the reading is taken as held until the sensor next reports rather
 * than averaged point-by-point: a fan that sat at speed 10 for 58 minutes and
 * dropped to 0 for two did not run at half duty.
 *
 * A metric with a fixed axis reports that mean as **duty** — a percentage of its
 * own full scale — because that is what a grower reads an actuator by. One that
 * scales to its data has no full scale to be a percentage of, so it reports the
 * mean in its own unit. Both are the same pane: bars under a peak cap.
 */

import { computeEnvSeries, type EnvSeriesPoint } from './env-series';
import type { ComboSecondary } from './constants';
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
  /**
   * `'%'` where the metric has a full scale to be a duty of, and the metric's
   * own unit where it has none.
   *
   * Duty is a fraction of a full scale, which only a fixed axis states. An
   * auto-scaled metric has no full scale, so its bars carry the reading itself
   * — the bucket mean in watts or mS/cm. The pane is the same pane either way:
   * bars under a peak cap, with the cap as the scale.
   */
  unit: string;
  bars: ComboIntervalBar[];
  /**
   * What full pane height is worth, and what the pane's cap reads. The scale
   * *is* the cap, the way `tank-water-chart` reasons about its usage pane, so
   * it is derived here rather than recomputed by whoever draws the bars.
   *
   * Duty is a percentage of a full scale, so it has a ceiling of its own and is
   * read against it: a `%` pane spans 0–100. That is what makes the two duty
   * panes of one combo comparable with each other, and a pane comparable with
   * itself across time ranges. A pane carrying a reading in its own unit has no
   * such ceiling — holding back headroom there would shrink every bar for
   * nothing — so its tallest bar spends the box. A configured `limit` displaces
   * both. Whichever applies, a bar above it still has to fit, so the tallest
   * wins.
   */
  scale: number;
  /**
   * The metric this pane's bars are read *against*, when it reports a delta.
   *
   * Carried as a title rather than a key because it exists to name the pane —
   * the derivation is already done by the time anyone reads it.
   */
  baselineTitle?: string;
  /**
   * The configured value the pane is read against, when the growspace declares
   * one. Where it is present it, and not the metric's own ceiling, is what
   * `scale` resolves to: the whole point of the pane is whether the bars cross
   * it.
   */
  limit?: number;
}

/** The window an interval pane is bucketed over. */
export interface ComboIntervalWindow {
  startTimeMs: number;
  nowMs: number;
  /** How many buckets the window is cut into. */
  barCount: number;
  /**
   * The configured threshold the bars are read against, resolved by the caller
   * from the recipe's `limitOf`. Absent where the recipe names none.
   */
  limit?: number;
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
 * The metric's points over the window, or `undefined` when the growspace has no
 * sensor for it.
 *
 * A history outlives the configuration that produced it — the store caches per
 * metric key and stops refetching rather than clearing — so the sensor list
 * decides, not the presence of data. Duty for a fan the growspace no longer has
 * is a stale claim rather than context, and the combo degrades to its primary
 * alone.
 */
function _pointsFor(
  descriptors: Record<string, MetricDescriptor>,
  histories: SensorHistories,
  metricKey: string,
  window: { startTimeMs: number; nowMs: number }
): EnvSeriesPoint[] | undefined {
  if (!descriptors[metricKey]?.sensors.length) return undefined;
  const [series] = computeEnvSeries(descriptors, histories, [metricKey], window);
  return series?.points;
}

/**
 * Derive the interval pane for `secondary`, or `undefined` when there is
 * nothing to draw.
 */
export function computeComboIntervalPane(
  descriptors: Record<string, MetricDescriptor>,
  histories: SensorHistories,
  secondary: ComboSecondary,
  { startTimeMs, nowMs, barCount, limit }: ComboIntervalWindow
): ComboIntervalPane | undefined {
  const descriptor = descriptors[secondary.metric];
  if (!descriptor) return undefined;

  const points = _pointsFor(descriptors, histories, secondary.metric, { startTimeMs, nowMs });
  if (!points) return undefined;

  // A delta needs both halves. One of them missing is not a delta of zero, so
  // the pane goes rather than asserting the substrate is in balance.
  const baseline = descriptors[secondary.relativeTo ?? ''];
  let baselinePoints: EnvSeriesPoint[] | undefined;
  if (secondary.relativeTo) {
    baselinePoints = _pointsFor(descriptors, histories, secondary.relativeTo, {
      startTimeMs,
      nowMs,
    });
    if (!baselinePoints) return undefined;
  }

  // Duty is a fraction of the metric's own full scale, which only a fixed axis
  // states. An auto-scaled metric has no full scale to be a percentage of, so
  // it reports the reading itself rather than a percentage of nothing — and a
  // delta always does, because the difference of two duties is percentage
  // points and not duty.
  const fullScale =
    secondary.relativeTo || descriptor.axis === 'auto'
      ? undefined
      : descriptor.axis.max || undefined;

  const bucketMs = (nowMs - startTimeMs) / barCount;
  const bars: ComboIntervalBar[] = [];
  for (let i = 0; i < barCount; i++) {
    const startTime = startTimeMs + i * bucketMs;
    const endTime = startTime + bucketMs;
    const mean = _meanOverBucket(points, startTime, endTime);
    if (mean === undefined) continue;

    if (baselinePoints) {
      const against = _meanOverBucket(baselinePoints, startTime, endTime);
      if (against === undefined) continue;
      bars.push({ startTime, endTime, value: mean - against });
      continue;
    }
    bars.push({ startTime, endTime, value: fullScale ? (mean / fullScale) * 100 : mean });
  }

  const peak = bars.reduce((highest, bar) => Math.max(highest, bar.value), 0);
  const pane: ComboIntervalPane = {
    key: secondary.metric,
    title: descriptor.title,
    color: descriptor.color,
    unit: fullScale ? '%' : descriptor.unit,
    bars,
    // Duty already states what full is, so the pane is read against 0-100
    // rather than against whatever the metric happened to reach: peak-scaled, a
    // fan holding 55% and a fan pinned at 100% are the same wall of full-height
    // bars. A reading in its own unit has no such ceiling and keeps the peak; a
    // configured limit displaces both. A bar above the ceiling still has to
    // fit, so the tallest of them wins.
    scale: Math.max(peak, fullScale ? 100 : 0, limit ?? 0),
  };
  if (baseline) pane.baselineTitle = baseline.title;
  if (limit !== undefined) pane.limit = limit;
  return pane;
}
