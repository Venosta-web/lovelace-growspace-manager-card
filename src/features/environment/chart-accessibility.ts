import { formatMeasurement } from './metric-value-format';

export interface AccessibleChartSeries {
  name: string;
  min: number;
  max: number;
  average: number;
  current: string;
  unit?: string;
  decimals?: number;
  /**
   * The observed domain, where the caller has one that numbers cannot express.
   *
   * A binary metric's trace runs 0 to 1, and a screen reader told an irrigation
   * chart ranged "0.0 to 1.0" learns nothing a sighted reader learns. Given
   * one, the summary reports it verbatim and drops the average: the mean of a
   * switch is a duty fraction, which is not what this sentence is for.
   */
  range?: string;
}

/**
 * Turn the values already derived for a chart into one stable accessible name.
 *
 * The SVG is intentionally exposed as one image rather than as hundreds of
 * anonymous paths, lines and circles. A screen reader gets the same essentials
 * a sighted reader gets at a glance: metric, window, observed range, average and
 * latest reading.
 */
export function accessibleChartSummary(
  chartName: string,
  window: string,
  series: AccessibleChartSeries[]
): string {
  if (series.length === 0) return `${chartName}, ${window} window, no data.`;

  const descriptions = series.map(
    ({ name, min, max, average, current, unit = '', decimals = 1, range }) => {
      const metric = series.length === 1 && name === chartName ? '' : `${name}: `;
      if (range) return `${metric}range ${range}, current ${current}`;

      const statistic = (value: number) => formatMeasurement(value, unit, decimals);
      return `${metric}range ${statistic(min)} to ${statistic(max)}, average ${statistic(average)}, current ${current}`;
    }
  );

  return `${chartName}, ${window} window. ${descriptions.join('. ')}.`;
}
