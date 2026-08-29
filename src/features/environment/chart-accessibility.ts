export interface AccessibleChartSeries {
  name: string;
  min: number;
  max: number;
  average: number;
  current: string;
  unit?: string;
  decimals?: number;
}

function formatStatistic(value: number, unit: string, decimals: number): string {
  return `${value.toFixed(decimals)}${unit ? ` ${unit}` : ''}`;
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
    ({ name, min, max, average, current, unit = '', decimals = 1 }) => {
      const metric = series.length === 1 && name === chartName ? '' : `${name}: `;
      return `${metric}range ${formatStatistic(min, unit, decimals)} to ${formatStatistic(max, unit, decimals)}, average ${formatStatistic(average, unit, decimals)}, current ${current}`;
    }
  );

  return `${chartName}, ${window} window. ${descriptions.join('. ')}.`;
}
