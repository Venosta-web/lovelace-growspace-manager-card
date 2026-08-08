/**
 * Metric Descriptor module — the single owner of the per-`MetricKey` facts that a
 * header chip and an Env Graph must agree on: display title, colour, unit, icon,
 * chart type and axis scale.
 *
 * Public API (pure computation):
 *   computeMetricDescriptors() — derive the descriptor table.
 *
 * Like `computeHeaderMetrics`, this module reads no atoms and no injected `hass` —
 * everything it needs is passed in. VPD thresholds are read from the supplied
 * overview-entity snapshot (ADR-0030).
 *
 * Scope, per ADR-0030's landing order: **temperature and VPD**. A key with no
 * descriptor is not yet migrated, and consumers fall back to their existing
 * derivation for it. Widened by:
 *   #468 — fan and light unit/axis overrides (adds a `hass.states` snapshot param)
 *   #469 — step-vs-line chart type and fixed axes
 *   #470 — VPD day/night threshold table (adds an overview-entity snapshot param)
 *   #471 — multi-sensor series refs, replacing `':'`-joined history keys
 */

import { ChartType, METRIC_CONFIG, MetricKey } from '../../features/environment/constants';
import { DEFAULTS } from '../../lib/constants';

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
  overviewEntity?: OverviewEntitySnapshot
): Record<string, MetricDescriptor> {
  const temperature = METRIC_CONFIG[MetricKey.TEMPERATURE];
  const vpd = METRIC_CONFIG[MetricKey.VPD];

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
    [MetricKey.VPD]: {
      key: MetricKey.VPD,
      title: vpd.title,
      color: vpd.color,
      unit: vpd.unit,
      icon: vpd.icon,
      chartType: ChartType.LINE,
      axis: 'auto',
      vpdThresholds: _vpdThresholds(overviewEntity),
    },
  };
}
