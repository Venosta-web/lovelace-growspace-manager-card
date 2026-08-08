/**
 * Metric Descriptor module — the single owner of the per-`MetricKey` facts that a
 * header chip and an Env Graph must agree on: display title, colour, unit, icon,
 * chart type and axis scale.
 *
 * Public API (pure computation):
 *   computeMetricDescriptors() — derive the descriptor table.
 *
 * Like `computeHeaderMetrics`, this module reads no atoms and no injected `hass` —
 * everything it needs is passed in. The light unit is supplied by the caller because
 * it decides whether light is a percentage line or a binary step trace (ADR-0030).
 *
 * Scope, per ADR-0030's landing order: **temperature and axis/shape metrics**. A key with no
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

export interface MetricDescriptorInputs {
  lightUnit?: string;
}

function _descriptor(
  key: MetricKey,
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
  inputs: MetricDescriptorInputs = {}
): Record<string, MetricDescriptor> {
  const lightIsPercentage = inputs.lightUnit === '%';

  return {
    [MetricKey.TEMPERATURE]: _descriptor(MetricKey.TEMPERATURE, ChartType.LINE, 'auto'),
    [MetricKey.OPTIMAL]: _descriptor(MetricKey.OPTIMAL, ChartType.STEP, { min: 0, max: 1 }),
    [MetricKey.DEHUMIDIFIER]: _descriptor(MetricKey.DEHUMIDIFIER, ChartType.STEP, {
      min: 0,
      max: 1,
    }),
    [MetricKey.HUMIDIFIER]: _descriptor(MetricKey.HUMIDIFIER, ChartType.LINE, { min: 0, max: 10 }),
    [MetricKey.IRRIGATION]: _descriptor(MetricKey.IRRIGATION, ChartType.STEP, { min: 0, max: 1 }),
    [MetricKey.DRAIN]: _descriptor(MetricKey.DRAIN, ChartType.STEP, { min: 0, max: 1 }),
    [MetricKey.LIGHT]: _descriptor(
      MetricKey.LIGHT,
      lightIsPercentage ? ChartType.LINE : ChartType.STEP,
      lightIsPercentage ? { min: 0, max: 100 } : { min: 0, max: 1 },
      lightIsPercentage ? '%' : undefined
    ),
  };
}
