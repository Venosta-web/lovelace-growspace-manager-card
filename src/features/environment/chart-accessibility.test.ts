import { describe, expect, it } from 'vitest';
import { accessibleChartSummary } from './chart-accessibility';

describe('accessibleChartSummary', () => {
  it('names a chart, its window, range, average and current value', () => {
    expect(
      accessibleChartSummary('Temperature', '24h', [
        {
          name: 'Temperature',
          min: 20,
          max: 24,
          average: 22,
          current: '23.5 °C',
          unit: '°C',
        },
      ])
    ).toBe('Temperature, 24h window. range 20.0 °C to 24.0 °C, average 22.0 °C, current 23.5 °C.');
  });

  it('names every metric in a combined chart', () => {
    const summary = accessibleChartSummary('Environment metrics', '6h', [
      { name: 'Temperature', min: 20, max: 24, average: 22, current: '23.5 °C', unit: '°C' },
      { name: 'Humidity', min: 50, max: 60, average: 55, current: '58.0%', unit: '%' },
    ]);

    expect(summary).toContain('Temperature: range 20.0 °C to 24.0 °C');
    // Unit spacing is one decision for the whole Env Graph family (#855): the
    // summary hugs a percent sign the way the header and the axis do.
    expect(summary).toContain('Humidity: range 50.0% to 60.0%');
  });

  it('says when a chart has no data', () => {
    expect(accessibleChartSummary('Tank level', '1h', [])).toBe('Tank level, 1h window, no data.');
  });
});
