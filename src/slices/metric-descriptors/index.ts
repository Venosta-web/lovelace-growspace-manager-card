/**
 * Metric Descriptor module — the single owner of the per-`MetricKey` facts that a
 * header chip and an Env Graph must agree on: display title, colour, unit, icon,
 * chart type and axis scale.
 *
 * Public API (pure computation):
 *   computeMetricDescriptors() — derive the descriptor table.
 *
 * Like `computeHeaderMetrics`, this module reads no atoms and no injected `hass` —
 * everything it needs is passed in. It currently needs nothing: the temperature
 * descriptor is static. Later slices add explicit data parameters as the facts they
 * carry stop being static (ADR-0030).
 *
 * Scope, per ADR-0030's landing order: **temperature only**. A key with no
 * descriptor is not yet migrated, and consumers fall back to their existing
 * derivation for it. Widened by:
 *   #468 — fan and light unit/axis overrides (adds a `hass.states` snapshot param)
 *   #469 — step-vs-line chart type and fixed axes
 *   #470 — VPD day/night threshold table (adds an EnvSnapshot param)
 *   #471 — multi-sensor series refs, replacing `':'`-joined history keys
 */

import { ChartType, METRIC_CONFIG, MetricKey } from '../../features/environment/constants';

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

/** Everything a chip or a graph must know about one metric. */
export interface MetricDescriptor {
  key: string;
  title: string;
  color: string;
  unit: string;
  icon: string;
  chartType: ChartType;
  axis: MetricAxis;
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
export function computeMetricDescriptors(): Record<string, MetricDescriptor> {
  const temperature = METRIC_CONFIG[MetricKey.TEMPERATURE];

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
  };
}
