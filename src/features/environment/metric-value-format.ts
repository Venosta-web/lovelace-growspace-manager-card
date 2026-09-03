/**
 * The one owner of how an [[Env Graph]] prints a metric's value.
 *
 * Pure of `hass` injection, consistent with the ADR-0030 split: it formats
 * values it is handed and looks nothing up.
 */
import { MetricKey, SENSOR_CHART_DEFAULTS } from './constants';
import type { GraphDataPoint } from './types';

/** All this module needs to know about the metric a value belongs to. */
export interface FormattableMetric {
  id: string;
  unit: string;
}

/** The caller's localizer, handed in rather than reached for. */
export type LocalizeValue = (key: string) => string;

/**
 * The one unit-spacing decision.
 *
 * A percent sign is punctuation on the number and hugs it; a unit that reads as
 * a word — `°C`, `kPa`, `mS/cm`, `L` — stands apart from it.
 */
function withUnit(text: string, unit: string): string {
  if (!unit) return text;
  return unit === '%' ? `${text}%` : `${text} ${unit}`;
}

/**
 * A measurement: what the metric read, or a statistic of what it read.
 *
 * One decimal by default, because that is the resolution a grower reads an
 * environment sensor at. A chart whose metric moves finer than that — pore EC in
 * hundredths — says so by asking for it.
 */
export function formatMeasurement(value: number, unit: string, decimals = 1): string {
  return withUnit(value.toFixed(decimals), unit);
}

/**
 * A scale mark: a value the trace is read *against* — a [[Guide Mark]] label, a
 * value-axis cap, a [[Curated Combo]] pane cap.
 *
 * It is a scale rather than a measurement, so it keeps a decimal only where the
 * number is small enough for that decimal to carry information — and never on a
 * percentage, which already reads to a hundredth of its own full scale.
 */
export function formatScaleMark(value: number, unit: string): string {
  if (unit === '%') return withUnit(value.toFixed(0), unit);
  return withUnit(value.toFixed(Math.abs(value) < 10 ? 1 : 0), unit);
}

/**
 * Whether a metric reads as on/off rather than as a number.
 *
 * `unit === 'state'` is deliberately not part of the test: `exhaust`,
 * `humidifier` and `circulation_fan` carry that unit for a multi-level speed,
 * which they report through `meta.state`.
 */
export function isBinaryMetric(id: string, unit: string): boolean {
  return (
    SENSOR_CHART_DEFAULTS[id]?.binary === true ||
    id === MetricKey.OPTIMAL ||
    id === MetricKey.DEHUMIDIFIER ||
    id === MetricKey.IRRIGATION ||
    id === MetricKey.DRAIN ||
    (id === MetricKey.LIGHT && unit !== '%')
  );
}

/** The one readout for a point on a trace. */
export function formatReading(
  metric: FormattableMetric,
  point: Pick<GraphDataPoint, 'value' | 'meta'>,
  localize: LocalizeValue
): string {
  const meta = point.meta as Record<string, unknown> | undefined;

  if (isBinaryMetric(metric.id, metric.unit)) {
    if (metric.id === MetricKey.OPTIMAL) {
      return point.value === 1
        ? localize('environment_chart.optimal')
        : (meta?.reasons as string) || localize('environment_chart.not_optimal');
    }
    return localize(point.value === 1 ? 'environment_chart.on' : 'environment_chart.off');
  }

  if ((metric.id === MetricKey.EXHAUST || metric.id === MetricKey.HUMIDIFIER) && meta?.state) {
    return meta.state as string;
  }

  return formatMeasurement(point.value, metric.unit);
}

/**
 * The observed domain a trace covers, as the combined-graph legend reads it.
 *
 * A binary metric names the states it was seen in rather than the numbers they
 * are carried as — a legend saying `0.0–1.0 state` is the same defect the
 * header readout was written to fix, arrived at down a second path.
 */
export function formatObservedRange(
  metric: FormattableMetric,
  min: number,
  max: number,
  localize: LocalizeValue
): string {
  if (isBinaryMetric(metric.id, metric.unit)) {
    const low = formatReading(metric, { value: min }, localize);
    const high = formatReading(metric, { value: max }, localize);
    return low === high ? low : `${low}–${high}`;
  }

  return withUnit(`${min.toFixed(1)}–${max.toFixed(1)}`, metric.unit);
}
