/**
 * Metric Targets — the normalised records a [[Guide Mark]] is drawn from
 * (ADR-0050).
 *
 * The values an Env Graph guides on live in five shapes across five places on
 * `GrowspaceDevice`. This module is where they become one thing a chart can
 * draw, typed by ADR-0048's guide-mark kind so that "normalised" means something
 * more than "put in an array".
 *
 * Two rules the shape encodes:
 *
 * - **Every target is period-indexed**, because some sources are. A source that
 *   does not vary with the photoperiod resolves `day` and `night` to the same
 *   numbers, so a consumer never asks whether this particular target steps — it
 *   compares the two and steps only when they differ.
 * - **The records carry numbers, not strings.** Formatting a bound with its unit
 *   is the chart's job; this module stays pure of localisation.
 *
 * Only the [[Optimal Band]] kind is constructed for its own sake today. The VPD
 * danger bounds are normalised as [[Limit]]s because absorbing `vpdThresholds`
 * has to be lossless — the VPD status bands classify against them — but nothing
 * draws a Limit mark yet, and no [[Setpoint]] record is built at all. Both
 * arrive with their own tickets.
 */

import { MetricKey } from '../../features/environment/constants';
import { DEFAULTS } from '../../lib/constants';
import type { GrowspaceDevice } from '../../services/types';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * The three marks a target renders as (ADR-0048).
 *
 * The kind is a fact about the configuration rather than about the chart: a
 * controller's `{on, off}` hysteresis pair is two setpoints and never a band,
 * because it describes what the controller does and not where the grower wants
 * the metric to sit.
 */
export enum GuideMarkKind {
  OPTIMAL_BAND = 'optimal-band',
  SETPOINT = 'setpoint',
  LIMIT = 'limit',
}

export interface MetricTargetBounds {
  min: number;
  max: number;
}

/** A region the grower wants the metric to stay inside. */
export interface OptimalBandTarget {
  kind: GuideMarkKind.OPTIMAL_BAND;
  /** Stable within one metric — what a chart keys its mark and its label by. */
  id: string;
  day: MetricTargetBounds;
  night: MetricTargetBounds;
}

/** A boundary the metric should not cross; `side` says which way is bad. */
export interface LimitTarget {
  kind: GuideMarkKind.LIMIT;
  id: string;
  side: 'lower' | 'upper';
  day: number;
  night: number;
}

export type MetricTarget = OptimalBandTarget | LimitTarget;

export interface OverviewEntitySnapshot {
  attributes?: Record<string, unknown>;
}

export function isOptimalBand(target: MetricTarget): target is OptimalBandTarget {
  return target.kind === GuideMarkKind.OPTIMAL_BAND;
}

export function isLimit(target: MetricTarget): target is LimitTarget {
  return target.kind === GuideMarkKind.LIMIT;
}

/** The bounds or value this target holds during one photoperiod. */
export function targetForPeriod<T extends MetricTarget>(target: T, isDay: boolean): T['day'] {
  return isDay ? target.day : target.night;
}

// ---------------------------------------------------------------------------
// Per-metric normalisation
// ---------------------------------------------------------------------------

interface VpdThresholdRange {
  targetMin: number;
  targetMax: number;
  dangerMin: number;
  dangerMax: number;
}

function _vpdThresholds(overviewEntity?: OverviewEntitySnapshot): {
  day: VpdThresholdRange;
  night: VpdThresholdRange;
} {
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

/**
 * VPD is the one metric whose target is period-indexed, and the only one that
 * always has one: the day/night table resolves to defaults when the grower has
 * configured nothing.
 */
function _vpdTargets(overviewEntity?: OverviewEntitySnapshot): MetricTarget[] {
  const { day, night } = _vpdThresholds(overviewEntity);

  return [
    {
      kind: GuideMarkKind.OPTIMAL_BAND,
      id: 'vpd-optimal',
      day: { min: day.targetMin, max: day.targetMax },
      night: { min: night.targetMin, max: night.targetMax },
    },
    {
      kind: GuideMarkKind.LIMIT,
      id: 'vpd-danger-low',
      side: 'lower',
      day: day.dangerMin,
      night: night.dangerMin,
    },
    {
      kind: GuideMarkKind.LIMIT,
      id: 'vpd-danger-high',
      side: 'upper',
      day: day.dangerMax,
      night: night.dangerMax,
    },
  ];
}

/** A band that does not vary with the photoperiod, dropped when it is degenerate. */
function _flatBand(
  id: string,
  min: number | null | undefined,
  max: number | null | undefined
): MetricTarget[] {
  if (min === null || min === undefined || max === null || max === undefined) return [];
  if (!(max > min)) return [];

  const bounds = { min, max };
  return [{ kind: GuideMarkKind.OPTIMAL_BAND, id, day: bounds, night: bounds }];
}

function _soilMoistureTargets(device: GrowspaceDevice): MetricTarget[] {
  const environment = device.environmentAttributes;
  // The band is stored in percent and the backend reports whether the configured
  // sensor actually reads in percent. An incompatible sensor would put the band
  // at a number that means nothing on that trace, so it is not a target at all.
  if (environment?.soilMoistureBandCompatible !== true) return [];

  const band = environment.soilMoistureBand;
  return _flatBand('soil-moisture-band', band?.min, band?.max);
}

function _poreEcTargets(device: GrowspaceDevice): MetricTarget[] {
  const strategy = device.irrigationStrategy;
  return _flatBand('pore-ec-band', strategy?.poreEcTargetMin, strategy?.poreEcTargetMax);
}

/**
 * The feed-EC band is per growth stage, so the descriptor resolves it against the
 * growspace's `granularStage` — a target that ignores the stage is the wrong
 * number rather than a coarse one (ADR-0050).
 */
function _feedEcTargets(device: GrowspaceDevice): MetricTarget[] {
  const stage = device.biologicalMetrics?.granularStage;
  const range = (device.irrigationConfig?.ecTargetRanges ?? []).find((r) => r.stage === stage);
  if (!range) return [];

  // A stage the grower never configured still yields a row, as 0/0. `_flatBand`
  // drops it for being degenerate rather than anchoring an axis on 0 mS/cm.
  return _flatBand('feed-ec-band', range.minEc, range.maxEc);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * The targets configured for one metric, normalised.
 *
 * A metric with nothing configured returns an empty list, which is the whole of
 * what "no guide marks" means downstream — there is no second place to look.
 */
export function computeMetricTargets(
  key: string,
  device?: GrowspaceDevice | null,
  overviewEntity?: OverviewEntitySnapshot
): MetricTarget[] {
  if (key === MetricKey.VPD) return _vpdTargets(overviewEntity);
  if (!device) return [];

  switch (key) {
    case MetricKey.SOIL_MOISTURE:
      return _soilMoistureTargets(device);
    case MetricKey.PORE_EC:
      return _poreEcTargets(device);
    case MetricKey.FEED_EC:
      return _feedEcTargets(device);
    default:
      return [];
  }
}
