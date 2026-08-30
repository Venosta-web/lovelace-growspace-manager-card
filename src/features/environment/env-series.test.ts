import { describe, it, expect } from 'vitest';
import { computeEnvSeries } from './env-series';
import { computeMetricDescriptors } from '../../slices/metric-descriptors';
import { ChartType, METRIC_CONFIG, MetricKey, StatusLevel, STATUS_COLORS } from './constants';
import { token } from '../../styles/variables';
import type { HistorySensorState, SensorHistories } from './types';
import type { DeviceSnapshot } from '../../slices/device-state';
import type { GrowspaceDevice } from '../../services/types';

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

function metricHistory(key: MetricKey, ...entries: HistorySensorState[]): SensorHistories {
  return { [key]: entries };
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
    expect(series.color).toBe(token['--danger-chip']);
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

  it('centres a flat line in the metric minimum span so it does not draw on an edge', () => {
    const [series] = computeTemperature(temperatureHistory(reading(120, '20'), reading(60, '20')));

    expect(series.min).toBe(18);
    expect(series.max).toBe(22);
  });

  it('centres a narrow range in the metric minimum span', () => {
    const [series] = computeTemperature(temperatureHistory(reading(120, '20'), reading(60, '22')));

    expect(series.min).toBe(19);
    expect(series.max).toBe(23);
  });

  it('does not widen a range that already meets the metric minimum span', () => {
    const [series] = computeTemperature(temperatureHistory(reading(120, '20'), reading(60, '24')));

    expect(series.min).toBe(20);
    expect(series.max).toBe(24);
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

  it('skips a key the descriptor table does not know', () => {
    const histories = { not_a_metric: [reading(30, '800')] };

    expect(computeEnvSeries(DESCRIPTORS, histories, ['not_a_metric'], windowOf(24))).toEqual([]);
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

    expect(series.map((s) => s.id)).toEqual([MetricKey.CO2, MetricKey.TEMPERATURE]);
  });
});

describe('computeEnvSeries — VPD', () => {
  const descriptors = computeMetricDescriptors(
    null,
    {},
    {
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
    }
  );

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

describe('computeEnvSeries — optimal bands', () => {
  const vpdDescriptors = computeMetricDescriptors(
    null,
    {},
    {
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
    }
  );

  function entry(entityId: string, minutesAgo: number, state: string): HistorySensorState {
    return { ...reading(minutesAgo, state), entity_id: entityId };
  }

  function vpdSeries(histories: SensorHistories) {
    return computeEnvSeries(vpdDescriptors, histories, [MetricKey.VPD], windowOf(1))[0];
  }

  it('steps the VPD band at lights-on, and labels the segment under now', () => {
    const series = vpdSeries({
      [MetricKey.VPD]: [entry('sensor.tent_vpd', 50, '1.5'), entry('sensor.tent_vpd', 20, '1.5')],
      // Before the first ON event getIsDay infers night; after it, day.
      [MetricKey.LIGHT]: [entry('light.tent', 30, 'on')],
    });

    expect(series.guideBands).toEqual([
      {
        id: 'vpd-optimal',
        segments: [
          {
            startTime: NOW.getTime() - HOUR_MS,
            endTime: NOW.getTime() - 30 * 60 * 1000,
            min: 0.4,
            max: 0.6,
          },
          {
            startTime: NOW.getTime() - 30 * 60 * 1000,
            endTime: NOW.getTime(),
            min: 1,
            max: 2,
          },
        ],
        current: { min: 1, max: 2 },
      },
    ]);
  });

  it('spans the window with one segment when day and night agree', () => {
    const flat = computeMetricDescriptors(
      null,
      {},
      { attributes: { vpd_target_min: 0.8, vpd_target_max: 1.2 } }
    );
    const [series] = computeEnvSeries(
      flat,
      {
        [MetricKey.VPD]: [entry('sensor.tent_vpd', 50, '1.0'), entry('sensor.tent_vpd', 20, '1.1')],
        [MetricKey.LIGHT]: [entry('light.tent', 30, 'on')],
      },
      [MetricKey.VPD],
      windowOf(1)
    );

    expect(series.guideBands?.[0].segments).toEqual([
      { startTime: NOW.getTime() - HOUR_MS, endTime: NOW.getTime(), min: 0.8, max: 1.2 },
    ]);
  });

  it('contains the band in full when the data never reached it', () => {
    const series = vpdSeries({
      [MetricKey.VPD]: [entry('sensor.tent_vpd', 50, '1.5'), entry('sensor.tent_vpd', 20, '1.5')],
      [MetricKey.LIGHT]: [entry('light.tent', 120, 'on')],
    });

    // Day band is 1–2 and every reading sat at 1.5; the axis still shows both bounds.
    expect(series.min).toBeLessThan(1);
    expect(series.max).toBeGreaterThan(2);
    // Legend copy reports the readings, not the axis widened around that band.
    expect({ min: series.observedMin, max: series.observedMax }).toEqual({ min: 1.5, max: 1.5 });
  });

  it('contains the data in full when it ran outside the band', () => {
    const series = vpdSeries({
      [MetricKey.VPD]: [entry('sensor.tent_vpd', 50, '0.2'), entry('sensor.tent_vpd', 20, '3.4')],
      [MetricKey.LIGHT]: [entry('light.tent', 120, 'on')],
    });

    // Anchoring on the band alone would have flattened these readings against an edge.
    expect(series.min).toBeLessThan(0.2);
    expect(series.max).toBeGreaterThan(3.4);
  });

  it('draws a device-configured moisture band with no photoperiod to consult', () => {
    const device = {
      deviceId: 'g1',
      name: 'Tent',
      biologicalMetrics: { granularStage: 'veg' },
      environmentAttributes: {
        soilMoistureBand: { min: 40, max: 65, is_custom: true },
        soilMoistureBandCompatible: true,
      },
    } as unknown as GrowspaceDevice;
    const descriptors = computeMetricDescriptors(null, {}, undefined, device);

    const [series] = computeEnvSeries(
      descriptors,
      { [MetricKey.SOIL_MOISTURE]: [entry('sensor.tent_moisture', 30, '52')] },
      [MetricKey.SOIL_MOISTURE],
      windowOf(1)
    );

    expect(series.guideBands?.[0].current).toEqual({ min: 40, max: 65 });
    expect(series.min).toBeLessThan(40);
    expect(series.max).toBeGreaterThan(65);
  });

  it('keeps the existing union-and-pad bounds when a guide band is narrower than the floor', () => {
    const device = {
      deviceId: 'g1',
      name: 'Tent',
      biologicalMetrics: { granularStage: 'veg' },
      environmentAttributes: {
        soilMoistureBand: { min: 50, max: 52, is_custom: true },
        soilMoistureBandCompatible: true,
      },
    } as unknown as GrowspaceDevice;
    const descriptors = computeMetricDescriptors(null, {}, undefined, device);

    const [series] = computeEnvSeries(
      descriptors,
      { [MetricKey.SOIL_MOISTURE]: [entry('sensor.tent_moisture', 30, '51')] },
      [MetricKey.SOIL_MOISTURE],
      windowOf(1)
    );

    // The 50..52 union receives the existing 8% guide pad. Applying the
    // metric's 20-point minimum span here would replace these bounds.
    expect(series.min).toBeCloseTo(49.84);
    expect(series.max).toBeCloseTo(52.16);
  });

  it('leaves a metric with no configured target exactly as it was', () => {
    const [series] = computeTemperature(temperatureHistory(reading(50, '20'), reading(20, '24')));

    expect(series.guideBands).toBeUndefined();
    expect({ min: series.min, max: series.max }).toEqual({ min: 20, max: 24 });
  });
});

describe('computeEnvSeries — setpoints', () => {
  function entry(entityId: string, minutesAgo: number, state: string): HistorySensorState {
    return { ...reading(minutesAgo, state), entity_id: entityId };
  }

  function deviceWith(environment: Record<string, unknown>): GrowspaceDevice {
    return {
      deviceId: 'g1',
      name: 'Tent',
      biologicalMetrics: { granularStage: 'flower_mid' },
      environmentAttributes: environment,
      irrigationConfig: {},
    } as unknown as GrowspaceDevice;
  }

  const fanConfig = {
    enabled: true,
    min_speed: 20,
    max_speed: 100,
    temperature_target: 24,
    temperature_tolerance: 1.5,
    humidity_target: 60,
    humidity_tolerance: 5,
    vpd_target: 1.2,
    vpd_tolerance: 0.15,
    critical_temp_low: null,
    critical_temp_high: null,
    critical_temp_hysteresis: 1,
    stage_vpd_enabled: false,
    stage_vpd_overrides: {},
  };

  function temperatureSeries(environment: Record<string, unknown>, histories: SensorHistories) {
    const descriptors = computeMetricDescriptors(null, {}, undefined, deviceWith(environment));
    return computeEnvSeries(descriptors, histories, [MetricKey.TEMPERATURE], windowOf(1))[0];
  }

  it('spans the window with one segment for a setpoint that does not step', () => {
    const series = temperatureSeries(
      { exhaustFanConfig: fanConfig },
      temperatureHistory(reading(50, '22'), reading(20, '23'))
    );

    expect(series.guideLines).toEqual([
      {
        id: 'exhaust-fan-target',
        segments: [{ startTime: NOW.getTime() - HOUR_MS, endTime: NOW.getTime(), value: 24 }],
        current: 24,
        tolerance: 1.5,
      },
    ]);
  });

  it('contains the setpoint and its deadband in full when the data never reached them', () => {
    const series = temperatureSeries(
      { exhaustFanConfig: fanConfig },
      temperatureHistory(reading(50, '18'), reading(20, '19'))
    );

    expect(series.max).toBeGreaterThan(24 + 1.5);
  });

  it('steps a period-indexed hysteresis setpoint at lights-on', () => {
    const descriptors = computeMetricDescriptors(
      null,
      {},
      undefined,
      deviceWith({
        humidifierControlEnabled: true,
        humidifierThresholds: {
          flower_mid: { day: { on: 1.6, off: 1.4 }, night: { on: 1.2, off: 1.0 } },
        },
      })
    );

    const [series] = computeEnvSeries(
      descriptors,
      {
        [MetricKey.VPD]: [entry('sensor.tent_vpd', 50, '1.3'), entry('sensor.tent_vpd', 20, '1.5')],
        [MetricKey.LIGHT]: [entry('light.tent', 30, 'on')],
      },
      [MetricKey.VPD],
      windowOf(1)
    );

    expect(series.guideLines?.map((line) => line.id)).toEqual(['humidifier-on', 'humidifier-off']);
    expect(series.guideLines?.[0].segments).toEqual([
      { startTime: NOW.getTime() - HOUR_MS, endTime: NOW.getTime() - 30 * 60 * 1000, value: 1.2 },
      { startTime: NOW.getTime() - 30 * 60 * 1000, endTime: NOW.getTime(), value: 1.6 },
    ]);
    // The label reads the segment in force now, not the one the window opened on.
    expect(series.guideLines?.[0].current).toBe(1.6);
  });

  it('reports a band and its setpoints separately, so neither is drawn as the other', () => {
    const descriptors = computeMetricDescriptors(
      null,
      {},
      { attributes: { vpd_target_min: 0.8, vpd_target_max: 1.4 } },
      deviceWith({
        humidifierControlEnabled: true,
        humidifierThresholds: { flower_mid: { day: { on: 1.6, off: 1.4 } } },
      })
    );

    const [series] = computeEnvSeries(
      descriptors,
      { [MetricKey.VPD]: [entry('sensor.tent_vpd', 30, '1.1')] },
      [MetricKey.VPD],
      windowOf(1)
    );

    expect(series.guideBands?.map((band) => band.id)).toEqual(['vpd-optimal']);
    expect(series.guideLines?.map((line) => line.id)).toEqual(['humidifier-on', 'humidifier-off']);
  });

  it('carries no tolerance for a setpoint whose source declares no deadband', () => {
    const series = temperatureSeries(
      { exhaustFanConfig: { ...fanConfig, temperature_tolerance: 0 } },
      temperatureHistory(reading(50, '22'), reading(20, '23'))
    );

    expect(series.guideLines?.[0]).not.toHaveProperty('tolerance');
  });

  it('leaves a metric with no configured setpoint exactly as it was', () => {
    const [series] = computeTemperature(temperatureHistory(reading(50, '20'), reading(20, '24')));

    expect(series.guideLines).toBeUndefined();
    expect({ min: series.min, max: series.max }).toEqual({ min: 20, max: 24 });
  });
});

describe('computeEnvSeries — limits', () => {
  function temperatureWithLimit(limit: number) {
    const device = {
      deviceId: 'g1',
      name: 'Tent',
      biologicalMetrics: { granularStage: 'veg' },
      environmentAttributes: {
        circulationFanConfig: {
          critical_temp_low: null,
          critical_temp_high: limit,
        },
      },
      irrigationConfig: {},
    } as unknown as GrowspaceDevice;
    const descriptors = computeMetricDescriptors(null, {}, undefined, device);
    return computeEnvSeries(
      descriptors,
      temperatureHistory(reading(50, '20'), reading(20, '24')),
      [MetricKey.TEMPERATURE],
      windowOf(1)
    )[0];
  }

  it('carries a Limit in value space without unioning it into the axis', () => {
    const series = temperatureWithLimit(100);

    expect({ min: series.min, max: series.max }).toEqual({ min: 20, max: 24 });
    expect(series.guideLimits).toEqual([
      {
        id: 'circulation-critical-temperature-high',
        side: 'upper',
        status: 'danger',
        segments: [
          {
            startTime: NOW.getTime() - HOUR_MS,
            endTime: NOW.getTime(),
            value: 100,
          },
        ],
        current: 100,
      },
    ]);
  });

  it('keeps an in-range Limit in the same unchanged data domain', () => {
    const series = temperatureWithLimit(22);

    expect({ min: series.min, max: series.max }).toEqual({ min: 20, max: 24 });
    expect(series.guideLimits?.[0].current).toBe(22);
  });
});
describe('computeEnvSeries — descriptor-owned chart shape and axes', () => {
  it.each([
    [MetricKey.OPTIMAL, 'on', ChartType.STEP, 0, 1],
    [MetricKey.DEHUMIDIFIER, 'drying', ChartType.STEP, 0, 1],
    [MetricKey.HUMIDIFIER, '6', ChartType.LINE, 0, 10],
    [MetricKey.IRRIGATION, 'on', ChartType.STEP, 0, 1],
    [MetricKey.DRAIN, 'off', ChartType.STEP, 0, 1],
    [MetricKey.LIGHT, 'on', ChartType.STEP, 0, 1],
  ])(
    'shapes %s as a %s series on its fixed axis',
    (key, state, chartType, expectedMin, expectedMax) => {
      const [series] = computeEnvSeries(
        DESCRIPTORS,
        metricHistory(key, reading(30, state)),
        [key],
        windowOf(24)
      );

      expect(series.chartType).toBe(chartType);
      expect({ min: series.min, max: series.max }).toEqual({
        min: expectedMin,
        max: expectedMax,
      });
    }
  );

  it('normalizes non-percentage light as binary values', () => {
    const [series] = computeEnvSeries(
      DESCRIPTORS,
      metricHistory(MetricKey.LIGHT, reading(30, 'on'), reading(20, 'off'), reading(10, '50')),
      [MetricKey.LIGHT],
      windowOf(24)
    );

    expect(series.points.map((point) => point.value)).toEqual([1, 1, 0, 1, 1]);
  });

  it('carries optimal reasons into point metadata and forward to now', () => {
    const optimal = {
      ...reading(30, 'off'),
      attributes: { reasons: ['Temperature high', 'VPD low'] },
    };
    const [series] = computeEnvSeries(
      DESCRIPTORS,
      metricHistory(MetricKey.OPTIMAL, optimal),
      [MetricKey.OPTIMAL],
      windowOf(24)
    );

    expect(series.points[1].meta).toEqual({ reasons: ['Temperature high', 'VPD low'] });
    expect(series.points[series.points.length - 1].meta).toEqual({
      reasons: ['Temperature high', 'VPD low'],
    });
  });

  it('pads one flat auto-scaled line to its metric minimum span', () => {
    const [series] = computeTemperature(temperatureHistory(reading(30, '20')));

    expect({ min: series.min, max: series.max }).toEqual({ min: 18, max: 22 });
  });

  it('makes a narrow CO2 wobble look steady while preserving its observed range', () => {
    const [series] = computeEnvSeries(
      DESCRIPTORS,
      metricHistory(MetricKey.CO2, reading(30, '414'), reading(10, '435')),
      [MetricKey.CO2],
      windowOf(24)
    );

    expect({ min: series.min, max: series.max }).toEqual({ min: 224.5, max: 624.5 });
    expect({ min: series.observedMin, max: series.observedMax }).toEqual({ min: 414, max: 435 });
  });

  it('leaves a genuinely wide CO2 swing on its observed bounds', () => {
    const [series] = computeEnvSeries(
      DESCRIPTORS,
      metricHistory(MetricKey.CO2, reading(30, '400'), reading(10, '800')),
      [MetricKey.CO2],
      windowOf(24)
    );

    expect({ min: series.min, max: series.max }).toEqual({ min: 400, max: 800 });
  });

  it('does not pad a flat step series', () => {
    const stepDescriptor = {
      ...DESCRIPTORS[MetricKey.IRRIGATION],
      axis: 'auto' as const,
    };
    const [series] = computeEnvSeries(
      { [MetricKey.IRRIGATION]: stepDescriptor },
      metricHistory(MetricKey.IRRIGATION, reading(30, 'on')),
      [MetricKey.IRRIGATION],
      windowOf(24)
    );

    expect({ min: series.min, max: series.max }).toEqual({ min: 1, max: 1 });
  });

  it('does not pad a flat combined series', () => {
    const [series] = computeEnvSeries(
      DESCRIPTORS,
      temperatureHistory(reading(30, '20')),
      [MetricKey.TEMPERATURE],
      { ...windowOf(24), isCombined: true }
    );

    expect({ min: series.min, max: series.max }).toEqual({ min: 20, max: 20 });
  });
});

describe('computeEnvSeries — fan and light value spaces', () => {
  it('shapes an HA fan as percentage values on a fixed 0–100 axis', () => {
    const descriptors = computeMetricDescriptors(snapshot('exhaustFans', 'fan.tent_exhaust'), {});
    const history = {
      [MetricKey.EXHAUST]: [{ ...reading(30, 'on'), attributes: { percentage: 45 } }],
    };

    const [series] = computeEnvSeries(descriptors, history, [MetricKey.EXHAUST], windowOf(24));

    expect(series.unit).toBe('%');
    expect(series.points.map((point) => point.value)).toEqual([45, 45, 45]);
    expect({ min: series.min, max: series.max }).toEqual({ min: 0, max: 100 });
  });

  it('shapes an HA circulation fan from device configuration before a snapshot exists', () => {
    const device = {
      deviceId: 'g1',
      name: 'Tent',
      environmentAttributes: { circulationFanEntities: ['fan.tent_circulation'] },
    } as unknown as GrowspaceDevice;
    const descriptors = computeMetricDescriptors(null, {}, undefined, device);
    const history = {
      [MetricKey.CIRCULATION_FAN]: [{ ...reading(30, 'on'), attributes: { percentage: 65 } }],
    };

    const [series] = computeEnvSeries(
      descriptors,
      history,
      [MetricKey.CIRCULATION_FAN],
      windowOf(24)
    );

    expect(series.unit).toBe('%');
    expect(series.points.map((point) => point.value)).toEqual([65, 65, 65]);
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
    expect(percentage.chartType).toBe(ChartType.STEP);
    expect({ min: percentage.min, max: percentage.max }).toEqual({ min: 0, max: 100 });
    expect(raw.points.map((point) => point.value)).toEqual([0, 0, 1, 1]);
    expect(raw.chartType).toBe(ChartType.STEP);
    expect({ min: raw.min, max: raw.max }).toEqual({ min: 0, max: 1 });
  });
});

describe('computeEnvSeries — multi-sensor metrics', () => {
  const STATES = {
    'sensor.t1': { state: '20', attributes: { friendly_name: 'Room 1' } },
    'sensor.t2': { state: '22', attributes: { friendly_name: 'Room 2' } },
    'sensor.t3': { state: '24', attributes: { friendly_name: 'Room 3' } },
  };

  function deviceWith(...entityIds: string[]): GrowspaceDevice {
    return {
      deviceId: 'g1',
      name: 'Tent',
      overviewEntityId: 'sensor.tent_overview',
      environmentAttributes: { temperatureSensors: entityIds },
    } as unknown as GrowspaceDevice;
  }

  function descriptorsFor(...entityIds: string[]) {
    return computeMetricDescriptors(null, STATES, undefined, deviceWith(...entityIds));
  }

  function temperatureFor(histories: SensorHistories, ...entityIds: string[]) {
    return computeEnvSeries(
      descriptorsFor(...entityIds),
      histories,
      [MetricKey.TEMPERATURE],
      windowOf(24)
    );
  }

  it('renders one series for a single-sensor metric, keyed by the metric alone', () => {
    const series = temperatureFor(temperatureHistory(reading(30, '21')), 'sensor.t1');

    expect(series).toHaveLength(1);
    expect(series[0].id).toBe(MetricKey.TEMPERATURE);
    expect(series[0].title).toBe('Temperature');
    expect(series[0].color).toBe(METRIC_CONFIG[MetricKey.TEMPERATURE].color);
    // Absent marker: a lone series is drawn with the metric's gradient fill.
    expect(series[0].sensor).toBeUndefined();
  });

  it('splits a two-sensor metric into one titled, tinted series per sensor', () => {
    const base = METRIC_CONFIG[MetricKey.TEMPERATURE].color;
    const series = temperatureFor(
      {
        'sensor.t1': [reading(30, '20')],
        'sensor.t2': [reading(30, '25')],
      },
      'sensor.t1',
      'sensor.t2'
    );

    expect(series.map((s) => s.id)).toEqual(['temperature:sensor.t1', 'temperature:sensor.t2']);
    expect(series.map((s) => s.title)).toEqual(['Temperature (Room 1)', 'Temperature (Room 2)']);
    expect(series.map((s) => s.color)).toEqual([base, `color-mix(in srgb, ${base}, white 20%)`]);
    expect(series.map((s) => s.sensor)).toEqual([
      { entityId: 'sensor.t1', name: 'Room 1' },
      { entityId: 'sensor.t2', name: 'Room 2' },
    ]);
  });

  it('deviates each further sensor progressively toward white', () => {
    const base = METRIC_CONFIG[MetricKey.TEMPERATURE].color;
    const series = temperatureFor(
      {
        'sensor.t1': [reading(30, '20')],
        'sensor.t2': [reading(30, '25')],
        'sensor.t3': [reading(30, '30')],
      },
      'sensor.t1',
      'sensor.t2',
      'sensor.t3'
    );

    expect(series.map((s) => s.color)).toEqual([
      base,
      `color-mix(in srgb, ${base}, white 20%)`,
      `color-mix(in srgb, ${base}, white 40%)`,
    ]);
  });

  it('reduces each sensor against its own history', () => {
    const series = temperatureFor(
      {
        'sensor.t1': [reading(120, '18'), reading(60, '20')],
        'sensor.t2': [reading(120, '25'), reading(60, '30')],
      },
      'sensor.t1',
      'sensor.t2'
    );

    expect({ min: series[0].min, max: series[0].max }).toEqual({ min: 17, max: 21 });
    expect({ min: series[0].observedMin, max: series[0].observedMax }).toEqual({
      min: 18,
      max: 20,
    });
    expect({ min: series[1].min, max: series[1].max }).toEqual({ min: 25, max: 30 });
  });

  it('drops an unavailable sensor without shifting the colours of the rest', () => {
    const base = METRIC_CONFIG[MetricKey.TEMPERATURE].color;
    const series = temperatureFor(
      {
        'sensor.t1': [reading(30, 'unavailable')],
        'sensor.t2': [reading(30, '25')],
      },
      'sensor.t1',
      'sensor.t2'
    );

    expect(series.map((s) => s.id)).toEqual(['temperature:sensor.t2']);
    // The tint is positional on the descriptor, so a sensor that reports nothing
    // does not repaint the ones that do.
    expect(series[0].color).toBe(`color-mix(in srgb, ${base}, white 20%)`);
  });

  it('leaves a multi-sensor VPD metric on its per-sensor colours, without status bands', () => {
    const base = METRIC_CONFIG[MetricKey.VPD].color;
    const device = {
      deviceId: 'g1',
      name: 'Tent',
      environmentAttributes: { vpdSensors: ['sensor.v1', 'sensor.v2'] },
    } as unknown as GrowspaceDevice;
    const descriptors = computeMetricDescriptors(null, {}, undefined, device);

    const series = computeEnvSeries(
      descriptors,
      {
        'sensor.v1': [reading(30, '1.2')],
        'sensor.v2': [reading(30, '1.4')],
      },
      [MetricKey.VPD],
      windowOf(24)
    );

    expect(series.map((s) => s.color)).toEqual([base, `color-mix(in srgb, ${base}, white 20%)`]);
    expect(series.every((s) => s.vpdBands === undefined)).toBe(true);
  });

  it('reads a multi-sensor history by entity id, not by a composite key', () => {
    const composite = temperatureFor(
      { 'temperature:sensor.t1': [reading(30, '20')] },
      'sensor.t1',
      'sensor.t2'
    );
    const structural = temperatureFor(
      { 'sensor.t1': [reading(30, '20')] },
      'sensor.t1',
      'sensor.t2'
    );

    expect(composite).toHaveLength(0);
    expect(structural.map((s) => s.id)).toEqual(['temperature:sensor.t1']);
  });

  it('skips a sensor whose history has not arrived', () => {
    const series = temperatureFor({ 'sensor.t2': [reading(30, '25')] }, 'sensor.t1', 'sensor.t2');

    expect(series.map((s) => s.id)).toEqual(['temperature:sensor.t2']);
  });
});
