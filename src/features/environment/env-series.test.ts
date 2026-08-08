import { describe, it, expect } from 'vitest';
import { computeEnvSeries } from './env-series';
import { computeMetricDescriptors } from '../../slices/metric-descriptors';
import { ChartType, MetricKey, StatusLevel, STATUS_COLORS } from './constants';
import type { HistorySensorState, SensorHistories } from './types';

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
    const [series] = computeTemperature(temperatureHistory(reading(120, '20'), reading(60, '20')));

    expect(series.min).toBe(19);
    expect(series.max).toBe(21);
  });

  it('does not pad a range that already spans values', () => {
    const [series] = computeTemperature(temperatureHistory(reading(120, '20'), reading(60, '22')));

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
    const histories = { [MetricKey.CO2]: [reading(30, '800')] };

    expect(computeEnvSeries(DESCRIPTORS, histories, [MetricKey.CO2], windowOf(24))).toEqual([]);
  });

  it('preserves the requested metric order', () => {
    const histories = {
      [MetricKey.TEMPERATURE]: [reading(30, '21')],
      [MetricKey.CO2]: [reading(30, '800')],
    };

    const series = computeEnvSeries(
      DESCRIPTORS,
      histories,
      [MetricKey.CO2, MetricKey.TEMPERATURE],
      windowOf(24)
    );

    // CO2 has no descriptor yet, so temperature is all that survives.
    expect(series.map((s) => s.id)).toEqual([MetricKey.TEMPERATURE]);
  });
});

describe('computeEnvSeries — VPD', () => {
  const descriptors = computeMetricDescriptors({
    attributes: {
      day_vpd_target_min: 1,
      day_vpd_target_max: 2,
      day_vpd_danger_min: 0.5,
      day_vpd_danger_max: 2.5,
      night_vpd_target_min: 0.4,
      night_vpd_target_max: 0.6,
      night_vpd_danger_min: 0.2,
      night_vpd_danger_max: 0.8,
    },
  });

  function vpdReading(minutesAgo: number, state: string): HistorySensorState {
    return { ...reading(minutesAgo, state), entity_id: 'sensor.tent_vpd' };
  }

  function lightReading(minutesAgo: number, state: string): HistorySensorState {
    return { ...reading(minutesAgo, state), entity_id: 'light.tent' };
  }

  it('returns status bands with time boundaries and no pixel geometry', () => {
    const [series] = computeEnvSeries(
      descriptors,
      {
        [MetricKey.VPD]: [
          vpdReading(50, '1.0'),
          vpdReading(40, '1.5'),
          vpdReading(30, '2.2'),
          vpdReading(20, '3.0'),
        ],
        [MetricKey.LIGHT]: [lightReading(120, 'on')],
      },
      [MetricKey.VPD],
      windowOf(1)
    );

    expect(series.vpdBands).toEqual([
      {
        status: StatusLevel.OPTIMAL,
        startTime: NOW.getTime() - HOUR_MS,
        endTime: NOW.getTime() - 30 * 60 * 1000,
      },
      {
        status: StatusLevel.WARNING,
        startTime: NOW.getTime() - 30 * 60 * 1000,
        endTime: NOW.getTime() - 20 * 60 * 1000,
      },
      {
        status: StatusLevel.DANGER,
        startTime: NOW.getTime() - 20 * 60 * 1000,
        endTime: NOW.getTime(),
      },
    ]);
    expect(series.vpdBands?.every((band) => !('x' in band) && !('y' in band))).toBe(true);
    expect(series).not.toHaveProperty('vpdSegments');
  });

  it('uses ChartUtils day/night inference for every historical VPD point', () => {
    const [series] = computeEnvSeries(
      descriptors,
      {
        [MetricKey.VPD]: [vpdReading(50, '1.5'), vpdReading(20, '1.5')],
        // Before the first ON event getIsDay infers night; after it, day.
        [MetricKey.LIGHT]: [lightReading(30, 'on')],
      },
      [MetricKey.VPD],
      windowOf(1)
    );

    expect(series.vpdBands).toEqual([
      {
        status: StatusLevel.DANGER,
        startTime: NOW.getTime() - HOUR_MS,
        endTime: NOW.getTime() - 20 * 60 * 1000,
      },
      {
        status: StatusLevel.OPTIMAL,
        startTime: NOW.getTime() - 20 * 60 * 1000,
        endTime: NOW.getTime(),
      },
    ]);
    expect(series.color).toBe(STATUS_COLORS[StatusLevel.OPTIMAL]);
  });

  it('returns no bands when fewer than two value-space points survive', () => {
    const [series] = computeEnvSeries(
      descriptors,
      { [MetricKey.VPD]: [vpdReading(0, 'unknown')] },
      [MetricKey.VPD],
      windowOf(1)
    );

    expect(series).toBeUndefined();
  });
});
