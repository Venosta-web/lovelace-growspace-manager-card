import { describe, it, expect } from 'vitest';
import { computeMetricDescriptors, resolveMetricEntityIds } from './index';
import type { GrowspaceDevice } from '../../services/types';
import { ChartType, METRIC_CONFIG, MetricKey } from '../../features/environment/constants';
import { DEFAULTS } from '../../lib/constants';
import type { DeviceSnapshot } from '../device-state';

function snapshot(overrides: Partial<DeviceSnapshot>): DeviceSnapshot {
  return {
    lightSensors: null,
    exhaustFans: null,
    circulationFans: null,
    humidifiers: null,
    dehumidifiers: null,
    ...overrides,
  };
}

function entry(entityId: string) {
  return { entityIds: [entityId], value: undefined, icon: '' };
}

function overview(attributes: Record<string, unknown>) {
  return computeMetricDescriptors(null, {}, { attributes });
}

describe('computeMetricDescriptors', () => {
  it('describes temperature as an auto-scaled line', () => {
    const descriptor = computeMetricDescriptors()[MetricKey.TEMPERATURE];

    expect(descriptor).toEqual({
      key: MetricKey.TEMPERATURE,
      title: METRIC_CONFIG[MetricKey.TEMPERATURE].title,
      color: METRIC_CONFIG[MetricKey.TEMPERATURE].color,
      unit: METRIC_CONFIG[MetricKey.TEMPERATURE].unit,
      icon: METRIC_CONFIG[MetricKey.TEMPERATURE].icon,
      chartType: ChartType.LINE,
      axis: 'auto',
      sensors: [],
    });
  });

  it('describes every metric the card knows', () => {
    const descriptors = computeMetricDescriptors();

    expect(Object.keys(descriptors).sort()).toEqual(Object.keys(METRIC_CONFIG).sort());
  });

  it('has no descriptor for a key that is not a metric', () => {
    expect(computeMetricDescriptors()['not_a_metric']).toBeUndefined();
  });

  it('takes the display facts of a plain metric straight from its config', () => {
    const descriptor = computeMetricDescriptors()[MetricKey.HUMIDITY];

    expect(descriptor).toEqual({
      key: MetricKey.HUMIDITY,
      title: METRIC_CONFIG[MetricKey.HUMIDITY].title,
      color: METRIC_CONFIG[MetricKey.HUMIDITY].color,
      unit: METRIC_CONFIG[MetricKey.HUMIDITY].unit,
      icon: METRIC_CONFIG[MetricKey.HUMIDITY].icon,
      chartType: ChartType.LINE,
      axis: 'auto',
      sensors: [],
    });
  });

  it.each([
    [MetricKey.CO2, ChartType.LINE, 'auto'],
    [MetricKey.SOIL_MOISTURE, ChartType.LINE, 'auto'],
    [MetricKey.FEED_EC, ChartType.LINE, 'auto'],
    [MetricKey.IRRIGATION, ChartType.STEP, { min: 0, max: 1 }],
    [MetricKey.DRAIN, ChartType.STEP, { min: 0, max: 1 }],
    [MetricKey.OPTIMAL, ChartType.STEP, { min: 0, max: 1 }],
    [MetricKey.DEHUMIDIFIER, ChartType.STEP, { min: 0, max: 1 }],
    [MetricKey.HUMIDIFIER, ChartType.LINE, { min: 0, max: 10 }],
  ])('shapes %s as a %s series on the axis its values need', (key, chartType, axis) => {
    const descriptor = computeMetricDescriptors()[key];

    expect(descriptor.chartType).toBe(chartType);
    expect(descriptor.axis).toEqual(axis);
  });

  it('reads explicit day and night VPD thresholds from the overview entity', () => {
    const descriptor = overview({
      day_vpd_target_min: 1,
      day_vpd_target_max: 2,
      day_vpd_danger_min: 0.5,
      day_vpd_danger_max: 2.5,
      night_vpd_target_min: 0.4,
      night_vpd_target_max: 0.6,
      night_vpd_danger_min: 0.2,
      night_vpd_danger_max: 0.8,
    })[MetricKey.VPD];

    expect(descriptor.vpdThresholds).toEqual({
      day: { targetMin: 1, targetMax: 2, dangerMin: 0.5, dangerMax: 2.5 },
      night: { targetMin: 0.4, targetMax: 0.6, dangerMin: 0.2, dangerMax: 0.8 },
    });
  });

  it('falls day thresholds back through legacy values to defaults', () => {
    const legacy = overview({
      vpd_target_min: 0.9,
      vpd_target_max: 1.3,
      vpd_danger_min: 0.3,
      vpd_danger_max: 1.7,
    })[MetricKey.VPD].vpdThresholds;
    const defaults = computeMetricDescriptors()[MetricKey.VPD].vpdThresholds;

    expect(legacy?.day).toEqual({
      targetMin: 0.9,
      targetMax: 1.3,
      dangerMin: 0.3,
      dangerMax: 1.7,
    });
    expect(defaults?.day).toEqual({
      targetMin: DEFAULTS.VPD.TARGET_MIN,
      targetMax: DEFAULTS.VPD.TARGET_MAX,
      dangerMin: DEFAULTS.VPD.DANGER_MIN,
      dangerMax: DEFAULTS.VPD.DANGER_MAX,
    });
  });

  it('falls each missing night threshold back to its resolved day value', () => {
    const thresholds = overview({
      day_vpd_target_min: 1,
      vpd_target_max: 2,
      day_vpd_danger_min: 0.5,
      vpd_danger_max: 2.5,
      night_vpd_target_max: 1.8,
    })[MetricKey.VPD].vpdThresholds;

    expect(thresholds?.night).toEqual({
      targetMin: 1,
      targetMax: 1.8,
      dangerMin: 0.5,
      dangerMax: 2.5,
    });
  });

  it.each([
    [MetricKey.OPTIMAL, ChartType.STEP, { min: 0, max: 1 }],
    [MetricKey.DEHUMIDIFIER, ChartType.STEP, { min: 0, max: 1 }],
    [MetricKey.HUMIDIFIER, ChartType.LINE, { min: 0, max: 10 }],
    [MetricKey.IRRIGATION, ChartType.STEP, { min: 0, max: 1 }],
    [MetricKey.DRAIN, ChartType.STEP, { min: 0, max: 1 }],
  ])('describes %s with its chart shape and fixed axis', (key, chartType, axis) => {
    expect(computeMetricDescriptors()[key]).toMatchObject({ key, chartType, axis });
  });

  it('derives fan units and axes from entity ids without reading states', () => {
    const states = new Proxy(
      {},
      {
        get() {
          throw new Error('fan descriptors must not read entity state');
        },
      }
    );
    const descriptors = computeMetricDescriptors(
      snapshot({
        exhaustFans: entry('fan.tent_exhaust'),
        circulationFans: entry('sensor.tent_circulation_speed'),
      }),
      states
    );

    expect(descriptors[MetricKey.EXHAUST]).toMatchObject({
      unit: '%',
      axis: { min: 0, max: 100 },
      chartType: ChartType.LINE,
      entityId: 'fan.tent_exhaust',
    });
    expect(descriptors[MetricKey.CIRCULATION_FAN]).toMatchObject({
      unit: '',
      axis: { min: 0, max: 10 },
      chartType: ChartType.LINE,
      entityId: 'sensor.tent_circulation_speed',
    });
  });

  it('derives the light unit and axis from its configured entity state', () => {
    const deviceSnapshot = snapshot({ lightSensors: entry('sensor.tent_light') });

    const percentage = computeMetricDescriptors(deviceSnapshot, {
      'sensor.tent_light': {
        state: '70',
        attributes: { unit_of_measurement: '%' },
      },
    });
    expect(percentage[MetricKey.LIGHT]).toMatchObject({
      unit: '%',
      axis: { min: 0, max: 100 },
      chartType: ChartType.LINE,
      entityId: 'sensor.tent_light',
    });

    const raw = computeMetricDescriptors(deviceSnapshot, {
      'sensor.tent_light': { state: 'on', attributes: {} },
    });
    expect(raw[MetricKey.LIGHT]).toMatchObject({
      unit: METRIC_CONFIG[MetricKey.LIGHT].unit,
      axis: { min: 0, max: 1 },
      chartType: ChartType.STEP,
    });
  });
});

describe('computeMetricDescriptors — sensors', () => {
  const device = {
    deviceId: 'g1',
    name: 'Tent',
    overviewEntityId: 'sensor.tent_overview',
    environmentAttributes: {
      temperatureSensors: ['sensor.t1', 'sensor.t2'],
    },
  } as unknown as GrowspaceDevice;

  const states = {
    'sensor.t1': { state: '20', attributes: { friendly_name: 'Room 1' } },
    'sensor.t2': { state: '22', attributes: {} },
  };

  it('carries every sensor backing a metric, named for display', () => {
    const descriptor = computeMetricDescriptors(null, states, undefined, device)[
      MetricKey.TEMPERATURE
    ];

    expect(descriptor.sensors).toEqual([
      { entityId: 'sensor.t1', name: 'Room 1' },
      // No friendly name — the entity id is the name a consumer shows.
      { entityId: 'sensor.t2', name: 'sensor.t2' },
    ]);
  });

  it('resolves a single-sensor metric to one sensor', () => {
    const single = {
      ...device,
      environmentAttributes: { temperatureSensor: 'sensor.t1' },
    } as unknown as GrowspaceDevice;

    expect(
      computeMetricDescriptors(null, states, undefined, single)[MetricKey.TEMPERATURE].sensors
    ).toEqual([{ entityId: 'sensor.t1', name: 'Room 1' }]);
  });

  it('carries no sensors without a device, so consumers see single-sensor metrics', () => {
    const descriptors = computeMetricDescriptors(null, states);

    expect(descriptors[MetricKey.TEMPERATURE].sensors).toEqual([]);
    expect(descriptors[MetricKey.VPD].sensors).toEqual([]);
  });

  it('lets a view context declare the entities it keyed its own histories by', () => {
    const descriptors = computeMetricDescriptors(null, states, undefined, device, {
      [MetricKey.TEMPERATURE]: ['sensor.sub1', 'sensor.sub2'],
    });

    // The subarea view reads its own sensors, not the parent growspace's.
    expect(descriptors[MetricKey.TEMPERATURE].sensors.map((s) => s.entityId)).toEqual([
      'sensor.sub1',
      'sensor.sub2',
    ]);
    // A metric the view did not declare still resolves from the device.
    expect(descriptors[MetricKey.VPD].sensors.map((s) => s.entityId)).toEqual(
      resolveMetricEntityIds(device, MetricKey.VPD, states)
    );
  });

  it('resolves the same entities history fetching does', () => {
    const descriptor = computeMetricDescriptors(null, states, undefined, device)[
      MetricKey.TEMPERATURE
    ];

    // Both sides of the seam must agree on the entity list, or a graph silently
    // renders the wrong history (ADR-0030).
    expect(descriptor.sensors.map((s) => s.entityId)).toEqual(
      resolveMetricEntityIds(device, MetricKey.TEMPERATURE, states)
    );
  });
});
