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

/** The caller's localizer, injected so this formatter stays pure. */
export type LocalizeChartSummary = (
  key: string,
  params?: Record<string, string | number>
) => string;

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
  series: AccessibleChartSeries[],
  localize: LocalizeChartSummary
): string {
  if (series.length === 0) {
    return localize('environment_chart.accessible_no_data', { chart: chartName, window });
  }

  const descriptions = series.map(
    ({ name, min, max, average, current, unit = '', decimals = 1, range }) => {
      const isOnlyNamedSeries = series.length === 1 && name === chartName;
      if (range) {
        return localize(
          isOnlyNamedSeries
            ? 'environment_chart.accessible_series_range'
            : 'environment_chart.accessible_named_series_range',
          { metric: name, range, current }
        );
      }

      const statistic = (value: number) => formatMeasurement(value, unit, decimals);
      return localize(
        isOnlyNamedSeries
          ? 'environment_chart.accessible_series'
          : 'environment_chart.accessible_named_series',
        {
          metric: name,
          minimum: statistic(min),
          maximum: statistic(max),
          average: statistic(average),
          current,
        }
      );
    }
  );

  return localize('environment_chart.accessible_summary', {
    chart: chartName,
    window,
    descriptions: descriptions.join(' '),
  });
}
