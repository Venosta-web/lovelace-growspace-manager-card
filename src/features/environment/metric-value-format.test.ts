/**
 * The one owner of how an [[Env Graph]] prints a metric's value (#855).
 *
 * Every readout on one chart — the header, the scrub, the value axis, the
 * [[Guide Mark]] labels, the combined legend, the [[Curated Combo]] pane cap and
 * the accessible summary — resolves through this module, so a single reading
 * cannot be printed six ways on one chart.
 */
import { describe, expect, it } from 'vitest';
import { MetricKey } from './constants';
import {
  formatMeasurement,
  formatObservedRange,
  formatReading,
  formatScaleMark,
} from './metric-value-format';

describe('formatMeasurement', () => {
  it('hugs a percent sign to its number and stands a word unit apart', () => {
    expect(formatMeasurement(58, '%')).toBe('58.0%');
    expect(formatMeasurement(22, '°C')).toBe('22.0 °C');
  });

  it("takes the caller's precision where a metric reads finer than one decimal", () => {
    // Pore EC moves in hundredths; a chart that reads it that way says so.
    expect(formatMeasurement(2.456, 'mS/cm', 2)).toBe('2.46 mS/cm');
  });
});

describe('formatScaleMark', () => {
  it('keeps a decimal only where the number is small enough to carry one', () => {
    // A scale mark is a value the trace is read against rather than a reading,
    // so it keeps a decimal only where one is signal: `1.2 kPa` and
    // `2.4 mS/cm` say something `30.0 °C` does not.
    expect(formatScaleMark(1.24, 'kPa')).toBe('1.2 kPa');
    expect(formatScaleMark(2.44, 'mS/cm')).toBe('2.4 mS/cm');
    expect(formatScaleMark(26.4, '°C')).toBe('26 °C');
  });

  it('prints a percent whole, however small', () => {
    // A percentage already carries a hundred steps of resolution, so a decimal
    // on one is noise at either end of the scale.
    expect(formatScaleMark(80, '%')).toBe('80%');
    expect(formatScaleMark(8.4, '%')).toBe('8%');
  });
});

describe('formatReading', () => {
  const localize = (key: string) =>
    ({
      'environment_chart.on': 'ON',
      'environment_chart.off': 'OFF',
      'environment_chart.optimal': 'Optimal',
      'environment_chart.not_optimal': 'Not Optimal',
    })[key] ?? key;

  it('reads a binary metric as its localized state, never as a number', () => {
    // The defect `formatSeriesValue` was written to fix: an irrigation chart
    // showing `1.0 state` under an `On` header.
    expect(formatReading({ id: MetricKey.IRRIGATION, unit: 'state' }, { value: 1 }, localize)).toBe(
      'ON'
    );
    expect(formatReading({ id: MetricKey.DRAIN, unit: 'state' }, { value: 0 }, localize)).toBe(
      'OFF'
    );
  });

  it('names why an optimal reading was not optimal, when the point says why', () => {
    const optimal = { id: MetricKey.OPTIMAL, unit: 'state' };

    expect(formatReading(optimal, { value: 1 }, localize)).toBe('Optimal');
    expect(formatReading(optimal, { value: 0, meta: { reasons: 'VPD too high' } }, localize)).toBe(
      'VPD too high'
    );
    expect(formatReading(optimal, { value: 0 }, localize)).toBe('Not Optimal');
  });

  it('reads a multi-level actuator by the state it reports, not by its speed', () => {
    // `state` is the unit an exhaust fan's speed carries too, which is why the
    // binary test is on the metric and not on the unit.
    expect(
      formatReading(
        { id: MetricKey.EXHAUST, unit: 'state' },
        { value: 6, meta: { state: 'High' } },
        localize
      )
    ).toBe('High');
    expect(
      formatReading(
        { id: MetricKey.HUMIDIFIER, unit: 'state' },
        { value: 2, meta: { state: 'Low' } },
        localize
      )
    ).toBe('Low');
  });

  it('reads a continuous metric to one decimal in its own unit', () => {
    expect(formatReading({ id: MetricKey.TEMPERATURE, unit: '°C' }, { value: 22 }, localize)).toBe(
      '22.0 °C'
    );
    expect(formatReading({ id: MetricKey.HUMIDITY, unit: '%' }, { value: 58 }, localize)).toBe(
      '58.0%'
    );
  });
});

describe('formatObservedRange', () => {
  const localize = (key: string) =>
    ({ 'environment_chart.on': 'ON', 'environment_chart.off': 'OFF' })[key] ?? key;

  it("reads a binary metric's observed domain as its states, not as 0.0–1.0", () => {
    // The combined-graph legend reintroduced exactly the defect the header
    // readout was written to fix.
    const irrigation = { id: MetricKey.IRRIGATION, unit: 'state' };

    expect(formatObservedRange(irrigation, 0, 1, localize)).toBe('OFF–ON');
    expect(formatObservedRange(irrigation, 0, 0, localize)).toBe('OFF');
    expect(formatObservedRange(irrigation, 1, 1, localize)).toBe('ON');
  });

  it('names the unit once, spaced the way every other readout spaces it', () => {
    expect(formatObservedRange({ id: MetricKey.TEMPERATURE, unit: '°C' }, 20, 24.5, localize)).toBe(
      '20.0–24.5 °C'
    );
    expect(formatObservedRange({ id: MetricKey.HUMIDITY, unit: '%' }, 50, 60, localize)).toBe(
      '50.0–60.0%'
    );
  });
});
