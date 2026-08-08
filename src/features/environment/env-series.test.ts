import { describe, it, expect } from 'vitest';
import { computeEnvSeries } from './env-series';
import { computeMetricDescriptors } from '../../slices/metric-descriptors';
import { ChartType, MetricKey } from './constants';
import type { HistorySensorState, SensorHistories } from './types';
import type { DeviceSnapshot } from '../../slices/device-state';

const DESCRIPTORS = computeMetricDescriptors();
const NOW = new Date('2026-05-01T12:00:00.000Z');
const HOUR_MS = 60 * 60 * 1000;

/** A history entry `minutesAgo` before NOW. */
function reading(minutesAgo: number, state: string): HistorySensorState {
  return {
    entity_id: 'sensor.tent_temperature',
    state,
    attributes: {},
    last_changed: new Date(NOW.getTime() - minutesAgo * 60 * 1000).toISOString(),
  };
}

function temperatureHistory(...entries: HistorySensorState[]): SensorHistories {
  return { [MetricKey.TEMPERATURE]: entries };
}

function windowOf(hours: number) {
  return { startTimeMs: NOW.getTime() - hours * HOUR_MS, nowMs: NOW.getTime() };
}

function computeTemperature(histories: SensorHistories, hours = 24) {
  return computeEnvSeries(DESCRIPTORS, histories, [MetricKey.TEMPERATURE], windowOf(hours));
}

function snapshot(
  field: 'lightSensors' | 'exhaustFans' | 'circulationFans',
  entityId: string
): DeviceSnapshot {
  return {
    lightSensors: null,
    exhaustFans: null,
    circulationFans: null,
    humidifiers: null,
    dehumidifiers: null,
    [field]: { entityIds: [entityId], value: undefined, icon: '' },
  };
}

describe('computeEnvSeries — temperature', () => {
  it('carries the descriptor display facts onto the series', () => {
    const [series] = computeTemperature(temperatureHistory(reading(30, '21.5')));

    expect(series.id).toBe(MetricKey.TEMPERATURE);
    expect(series.title).toBe('Temperature');
    expect(series.unit).toBe('°C');
    expect(series.color).toBe('#ff5252');
    expect(series.chartType).toBe(ChartType.LINE);
  });

  it('returns value-space points only — no path and no pixel coordinates', () => {
    const [series] = computeTemperature(temperatureHistory(reading(30, '21.5')));

    expect(series).not.toHaveProperty('path');
    expect(series).not.toHaveProperty('vpdSegments');
    expect(series.points.every((p) => Number.isFinite(p.time) && Number.isFinite(p.value))).toBe(
      true
    );
  });

  it('reduces min, max and avg across the window', () => {
    const [series] = computeTemperature(
      temperatureHistory(reading(180, '18'), reading(120, '24'), reading(60, '21'))
    );

    expect(series.min).toBe(18);
    expect(series.max).toBe(24);
    // The window-start seed repeats the first reading, and the last value is
    // carried forward to now: 18(seed), 18, 24, 21, 21(now).
    expect(series.avg).toBeCloseTo((18 + 18 + 24 + 21 + 21) / 5, 5);
  });

  it('seeds the window start from the last reading before it', () => {
    // The 20°C reading predates the 1h window; it must still anchor the left edge.
    const [series] = computeTemperature(
      temperatureHistory(reading(300, '20'), reading(30, '25')),
      1
    );

    const windowStart = NOW.getTime() - HOUR_MS;
    expect(series.points[0]).toEqual({ time: windowStart, value: 20 });
  });

  it('carries the last value forward to now', () => {
    const [series] = computeTemperature(temperatureHistory(reading(90, '19')));

    const last = series.points[series.points.length - 1];
    expect(last.time).toBe(NOW.getTime());
    expect(last.value).toBe(19);
  });

  it('pads a flat line by one unit either side so it does not draw on an edge', () => {
    const [series] = computeTemperature(
      temperatureHistory(reading(120, '20'), reading(60, '20'))
    );

    expect(series.min).toBe(19);
    expect(series.max).toBe(21);
  });

  it('does not pad a range that already spans values', () => {
    const [series] = computeTemperature(
      temperatureHistory(reading(120, '20'), reading(60, '22'))
    );

    expect(series.min).toBe(20);
    expect(series.max).toBe(22);
  });

  it('skips unparseable and unavailable readings', () => {
    const [series] = computeTemperature(
      temperatureHistory(reading(120, '20'), reading(90, 'unavailable'), reading(60, '22'))
    );

    // Seed(20), 20, [unavailable dropped], 22, carried-forward 22.
    expect(series.points.map((p) => p.value)).toEqual([20, 20, 22, 22]);
  });

  it('emits a seed point at the window start even when the reading is inside the window', () => {
    // Matches the legacy derivation: the first in-window reading is both the seed
    // (stamped at the window start) and its own point at its real timestamp.
    const [series] = computeTemperature(temperatureHistory(reading(120, '20')), 24);

    const windowStart = NOW.getTime() - 24 * HOUR_MS;
    expect(series.points.map((p) => p.time)).toEqual([
      windowStart,
      NOW.getTime() - 120 * 60 * 1000,
      NOW.getTime(),
    ]);
  });

  it('returns nothing for a metric with no history', () => {
    expect(computeTemperature({})).toEqual([]);
    expect(computeTemperature(temperatureHistory())).toEqual([]);
  });

  it('returns nothing for a metric with history but no readings in or before the window', () => {
    const future: HistorySensorState = {
      ...reading(0, 'unknown'),
    };
    expect(computeTemperature(temperatureHistory(future))).toEqual([]);
  });

  it('skips a metric that has no descriptor yet', () => {
    const histories = { [MetricKey.VPD]: [reading(30, '1.2')] };

    expect(computeEnvSeries(DESCRIPTORS, histories, [MetricKey.VPD], windowOf(24))).toEqual([]);
  });

  it('preserves the requested metric order', () => {
    const histories = {
      [MetricKey.TEMPERATURE]: [reading(30, '21')],
      [MetricKey.VPD]: [reading(30, '1.2')],
    };

    const series = computeEnvSeries(
      DESCRIPTORS,
      histories,
      [MetricKey.VPD, MetricKey.TEMPERATURE],
      windowOf(24)
    );

    // VPD has no descriptor yet, so temperature is all that survives.
    expect(series.map((s) => s.id)).toEqual([MetricKey.TEMPERATURE]);
  });
});

describe('computeEnvSeries — fan and light value spaces', () => {
  it('shapes an HA fan as percentage values on a fixed 0–100 axis', () => {
    const descriptors = computeMetricDescriptors(snapshot('exhaustFans', 'fan.tent_exhaust'), {});
    const history = {
      [MetricKey.EXHAUST]: [
        { ...reading(30, 'on'), attributes: { percentage: 45 } },
      ],
    };

    const [series] = computeEnvSeries(
      descriptors,
      history,
      [MetricKey.EXHAUST],
      windowOf(24)
    );

    expect(series.unit).toBe('%');
    expect(series.points.map((point) => point.value)).toEqual([1, 45, 45]);
    expect({ min: series.min, max: series.max }).toEqual({ min: 0, max: 100 });
  });

  it('shapes a speed-sensor fan on the fixed 0–10 axis', () => {
    const descriptors = computeMetricDescriptors(
      snapshot('circulationFans', 'sensor.tent_circulation_speed'),
      {}
    );
    const history = { [MetricKey.CIRCULATION_FAN]: [reading(30, '6')] };

    const [series] = computeEnvSeries(
      descriptors,
      history,
      [MetricKey.CIRCULATION_FAN],
      windowOf(24)
    );

    expect(series.unit).toBe('');
    expect(series.points.map((point) => point.value)).toEqual([6, 6, 6]);
    expect({ min: series.min, max: series.max }).toEqual({ min: 0, max: 10 });
  });

  it('keeps percentage light numeric and raw light binary', () => {
    const deviceSnapshot = snapshot('lightSensors', 'sensor.tent_light');
    const percentDescriptors = computeMetricDescriptors(deviceSnapshot, {
      'sensor.tent_light': { state: '50', attributes: { unit_of_measurement: '%' } },
    });
    const rawDescriptors = computeMetricDescriptors(deviceSnapshot, {
      'sensor.tent_light': { state: 'on', attributes: {} },
    });
    const histories = {
      [MetricKey.LIGHT]: [reading(60, 'off'), reading(30, '50')],
    };

    const [percentage] = computeEnvSeries(
      percentDescriptors,
      histories,
      [MetricKey.LIGHT],
      windowOf(24)
    );
    const [raw] = computeEnvSeries(rawDescriptors, histories, [MetricKey.LIGHT], windowOf(24));

    expect(percentage.points.map((point) => point.value)).toEqual([50, 50]);
    expect(percentage.chartType).toBe(ChartType.LINE);
    expect({ min: percentage.min, max: percentage.max }).toEqual({ min: 0, max: 100 });
    expect(raw.points.map((point) => point.value)).toEqual([0, 0, 1, 1]);
    expect(raw.chartType).toBe(ChartType.STEP);
    expect({ min: raw.min, max: raw.max }).toEqual({ min: 0, max: 1 });
  });
});
