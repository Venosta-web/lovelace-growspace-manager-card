import { describe, it, expect } from 'vitest';
import { computeMetricDescriptors } from './index';
import { ChartType, METRIC_CONFIG, MetricKey } from '../../features/environment/constants';
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
    });
  });

  it('omits metrics that have not been migrated yet', () => {
    const descriptors = computeMetricDescriptors();

    // Consumers treat an absent key as "still on the legacy derivation".
    expect(descriptors[MetricKey.VPD]).toBeUndefined();
    expect(descriptors[MetricKey.HUMIDITY]).toBeUndefined();
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
