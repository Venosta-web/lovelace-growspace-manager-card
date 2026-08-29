import { describe, it, expect } from 'vitest';
import {
  computeMetricDescriptors,
  GuideMarkKind,
  isLimit,
  isOptimalBand,
  isSetpoint,
  resolveMetricEntityIds,
} from './index';
import type { MetricDescriptor } from './index';
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

function optimalBand({ targets }: Pick<MetricDescriptor, 'targets'>) {
  return targets.find(isOptimalBand);
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
      targets: [],
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
      targets: [],
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

  it('normalises the day and night VPD window into one optimal band and two limits', () => {
    const targets = overview({
      day_vpd_target_min: 1,
      day_vpd_target_max: 2,
      day_vpd_danger_min: 0.5,
      day_vpd_danger_max: 2.5,
      night_vpd_target_min: 0.4,
      night_vpd_target_max: 0.6,
      night_vpd_danger_min: 0.2,
      night_vpd_danger_max: 0.8,
    })[MetricKey.VPD].targets;

    expect(targets).toEqual([
      {
        kind: GuideMarkKind.OPTIMAL_BAND,
        id: 'vpd-optimal',
        day: { min: 1, max: 2 },
        night: { min: 0.4, max: 0.6 },
      },
      {
        kind: GuideMarkKind.LIMIT,
        id: 'vpd-danger-low',
        side: 'lower',
        day: 0.5,
        night: 0.2,
      },
      {
        kind: GuideMarkKind.LIMIT,
        id: 'vpd-danger-high',
        side: 'upper',
        day: 2.5,
        night: 0.8,
      },
    ]);
  });

  it('exposes no raw VPD threshold field beside the normalised targets', () => {
    const descriptor = overview({ vpd_target_min: 0.9 })[MetricKey.VPD];

    expect(Object.keys(descriptor)).not.toContain('vpdThresholds');
  });

  it('falls day thresholds back through legacy values to defaults', () => {
    const legacy = optimalBand(
      overview({
        vpd_target_min: 0.9,
        vpd_target_max: 1.3,
        vpd_danger_min: 0.3,
        vpd_danger_max: 1.7,
      })[MetricKey.VPD]
    );
    const defaults = optimalBand(computeMetricDescriptors()[MetricKey.VPD]);

    expect(legacy?.day).toEqual({ min: 0.9, max: 1.3 });
    expect(defaults?.day).toEqual({
      min: DEFAULTS.VPD.TARGET_MIN,
      max: DEFAULTS.VPD.TARGET_MAX,
    });
  });

  it('falls each missing night threshold back to its resolved day value', () => {
    const targets = overview({
      day_vpd_target_min: 1,
      vpd_target_max: 2,
      day_vpd_danger_min: 0.5,
      vpd_danger_max: 2.5,
      night_vpd_target_max: 1.8,
    })[MetricKey.VPD].targets;

    expect(optimalBand({ targets })?.night).toEqual({ min: 1, max: 1.8 });
    expect(targets.filter(isLimit).map((limit) => limit.night)).toEqual([0.5, 2.5]);
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

  it('derives the light unit and axis while preserving held-state interpolation', () => {
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
      chartType: ChartType.STEP,
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

describe('computeMetricDescriptors — device-sourced optimal bands', () => {
  function device(overrides: Record<string, unknown>): GrowspaceDevice {
    return {
      deviceId: 'g1',
      name: 'Tent',
      biologicalMetrics: { granularStage: 'flower_mid' },
      environmentAttributes: {},
      irrigationConfig: {},
      ...overrides,
    } as unknown as GrowspaceDevice;
  }

  function targetsFor(key: string, overrides: Record<string, unknown>) {
    return computeMetricDescriptors(null, {}, undefined, device(overrides))[key].targets;
  }

  it('has no targets for a metric with nothing configured', () => {
    expect(targetsFor(MetricKey.TEMPERATURE, {})).toEqual([]);
    expect(targetsFor(MetricKey.SOIL_MOISTURE, {})).toEqual([]);
    expect(targetsFor(MetricKey.PORE_EC, {})).toEqual([]);
    expect(targetsFor(MetricKey.FEED_EC, {})).toEqual([]);
  });

  it('normalises the applied moisture band, which does not vary by photoperiod', () => {
    const targets = targetsFor(MetricKey.SOIL_MOISTURE, {
      environmentAttributes: {
        soilMoistureBand: { min: 40, max: 65, is_custom: true },
        soilMoistureBandCompatible: true,
      },
    });

    expect(targets).toEqual([
      {
        kind: GuideMarkKind.OPTIMAL_BAND,
        id: 'soil-moisture-band',
        day: { min: 40, max: 65 },
        night: { min: 40, max: 65 },
      },
    ]);
  });

  it('drops the moisture band when the sensor does not read in percent', () => {
    expect(
      targetsFor(MetricKey.SOIL_MOISTURE, {
        environmentAttributes: {
          soilMoistureBand: { min: 40, max: 65, is_custom: true },
          soilMoistureBandCompatible: false,
        },
      })
    ).toEqual([]);
  });

  it('normalises the pore EC target band from the irrigation strategy', () => {
    expect(
      targetsFor(MetricKey.PORE_EC, {
        irrigationStrategy: { poreEcTargetMin: 3, poreEcTargetMax: 5.5 },
      })
    ).toEqual([
      {
        kind: GuideMarkKind.OPTIMAL_BAND,
        id: 'pore-ec-band',
        day: { min: 3, max: 5.5 },
        night: { min: 3, max: 5.5 },
      },
    ]);
  });

  it('resolves the feed EC band against the growspace stage, not the first row', () => {
    const ranges = {
      irrigationConfig: {
        ecTargetRanges: [
          { stage: 'veg', minEc: 1.4, maxEc: 1.8 },
          { stage: 'flower_mid', minEc: 2.6, maxEc: 3.2 },
        ],
      },
    };

    expect(optimalBand({ targets: targetsFor(MetricKey.FEED_EC, ranges) })).toMatchObject({
      day: { min: 2.6, max: 3.2 },
    });
    expect(
      optimalBand({
        targets: computeMetricDescriptors(
          null,
          {},
          undefined,
          device({ ...ranges, biologicalMetrics: { granularStage: 'veg' } })
        )[MetricKey.FEED_EC].targets,
      })
    ).toMatchObject({ day: { min: 1.4, max: 1.8 } });
  });

  it('drops a stage row the grower never configured', () => {
    expect(
      targetsFor(MetricKey.FEED_EC, {
        irrigationConfig: {
          ecTargetRanges: [{ stage: 'flower_mid', minEc: 0, maxEc: 0 }],
        },
      })
    ).toEqual([]);
  });
});

describe('computeMetricDescriptors — controller setpoints', () => {
  function fanConfig(overrides: Record<string, unknown> = {}) {
    return {
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
      ...overrides,
    };
  }

  function device(environment: Record<string, unknown>, stage = 'flower_mid'): GrowspaceDevice {
    return {
      deviceId: 'g1',
      name: 'Tent',
      biologicalMetrics: { granularStage: stage },
      environmentAttributes: environment,
      irrigationConfig: {},
    } as unknown as GrowspaceDevice;
  }

  function targetsFor(key: string, environment: Record<string, unknown>, stage?: string) {
    return computeMetricDescriptors(null, {}, undefined, device(environment, stage))[key].targets;
  }

  it('normalises a fan target and its tolerance as a setpoint, never as a band', () => {
    const targets = targetsFor(MetricKey.TEMPERATURE, {
      exhaustFanConfig: fanConfig(),
    });

    expect(targets).toEqual([
      {
        kind: GuideMarkKind.SETPOINT,
        id: 'exhaust-fan-target',
        day: 24,
        night: 24,
        tolerance: 1.5,
      },
    ]);
    expect(targets.filter(isOptimalBand)).toEqual([]);
  });

  it('marks every signal the exhaust fan holds, since its demand is combined', () => {
    const environment = { exhaustFanConfig: fanConfig() };

    expect(targetsFor(MetricKey.HUMIDITY, environment)).toMatchObject([{ day: 60, tolerance: 5 }]);
    expect(targetsFor(MetricKey.VPD, environment).filter(isSetpoint)).toMatchObject([
      { id: 'exhaust-fan-target', day: 1.2, tolerance: 0.15 },
    ]);
  });

  it('marks only the signal a circulation fan actually regulates on', () => {
    const environment = {
      circulationFanConfig: fanConfig({ regulation_mode: 'vpd' }),
    };

    expect(targetsFor(MetricKey.TEMPERATURE, environment)).toEqual([]);
    expect(targetsFor(MetricKey.HUMIDITY, environment)).toEqual([]);
    expect(targetsFor(MetricKey.VPD, environment).filter(isSetpoint)).toMatchObject([
      { id: 'circulation-fan-target', day: 1.2 },
    ]);
  });

  it('marks nothing for a fan that is switched off', () => {
    expect(
      targetsFor(MetricKey.TEMPERATURE, { exhaustFanConfig: fanConfig({ enabled: false }) })
    ).toEqual([]);
  });

  it('carries no tolerance when the controller declares no deadband', () => {
    expect(
      targetsFor(MetricKey.TEMPERATURE, {
        exhaustFanConfig: fanConfig({ temperature_tolerance: 0 }),
      })
    ).toEqual([{ kind: GuideMarkKind.SETPOINT, id: 'exhaust-fan-target', day: 24, night: 24 }]);
  });

  it('drops an untouched target rather than marking a setpoint at zero', () => {
    expect(
      targetsFor(MetricKey.TEMPERATURE, { exhaustFanConfig: fanConfig({ temperature_target: 0 }) })
    ).toEqual([]);
  });

  it('renders both fans regulating one metric as two separately named setpoints', () => {
    const targets = targetsFor(MetricKey.TEMPERATURE, {
      exhaustFanConfig: fanConfig({ temperature_target: 26 }),
      circulationFanConfig: fanConfig({ regulation_mode: 'temperature', temperature_target: 24 }),
    });

    expect(targets.map((target) => target.id)).toEqual([
      'circulation-fan-target',
      'exhaust-fan-target',
    ]);
    expect(targets).toMatchObject([{ day: 24 }, { day: 26 }]);
  });

  it('normalises a hysteresis pair into two period-indexed setpoints, never a band', () => {
    const targets = targetsFor(MetricKey.VPD, {
      humidifierControlEnabled: true,
      humidifierThresholds: {
        flower_mid: { day: { on: 1.6, off: 1.4 }, night: { on: 1.2, off: 1.0 } },
      },
    }).filter(isSetpoint);

    expect(targets).toEqual([
      { kind: GuideMarkKind.SETPOINT, id: 'humidifier-on', day: 1.6, night: 1.2 },
      { kind: GuideMarkKind.SETPOINT, id: 'humidifier-off', day: 1.4, night: 1.0 },
    ]);
  });

  it('resolves a hysteresis pair against the growspace stage, not the first row', () => {
    const environment = {
      dehumidifierControlEnabled: true,
      dehumidifierThresholds: {
        veg: { day: { on: 0.6, off: 0.7 }, night: { on: 0.65, off: 0.75 } },
        flower_mid: { day: { on: 1.25, off: 1.35 }, night: { on: 0.9, off: 1.0 } },
      },
    };

    expect(targetsFor(MetricKey.VPD, environment).filter(isSetpoint)).toMatchObject([
      { id: 'dehumidifier-on', day: 1.25 },
      { id: 'dehumidifier-off', day: 1.35 },
    ]);
    expect(targetsFor(MetricKey.VPD, environment, 'veg').filter(isSetpoint)).toMatchObject([
      { id: 'dehumidifier-on', day: 0.6 },
      { id: 'dehumidifier-off', day: 0.7 },
    ]);
  });

  it('draws nothing for a stage the grower never configured', () => {
    expect(
      targetsFor(
        MetricKey.VPD,
        {
          humidifierControlEnabled: true,
          humidifierThresholds: {
            veg: { day: { on: 1.0, off: 0.8 }, night: { on: 0.85, off: 0.65 } },
          },
        },
        'flower_late'
      ).filter(isSetpoint)
    ).toEqual([]);
  });

  it('falls a missing night threshold back to its day value', () => {
    expect(
      targetsFor(MetricKey.VPD, {
        humidifierControlEnabled: true,
        humidifierThresholds: { flower_mid: { day: { on: 1.6, off: 1.4 } } },
      }).filter(isSetpoint)
    ).toMatchObject([
      { id: 'humidifier-on', day: 1.6, night: 1.6 },
      { id: 'humidifier-off', day: 1.4, night: 1.4 },
    ]);
  });

  it('marks nothing for an appliance the card does not control', () => {
    expect(
      targetsFor(MetricKey.VPD, {
        humidifierControlEnabled: false,
        humidifierThresholds: {
          flower_mid: { day: { on: 1.6, off: 1.4 }, night: { on: 1.2, off: 1.0 } },
        },
      }).filter(isSetpoint)
    ).toEqual([]);
  });

  it('carries a control setpoint beside the VPD window and its danger bounds', () => {
    const targets = targetsFor(MetricKey.VPD, {
      exhaustFanConfig: fanConfig(),
      humidifierControlEnabled: true,
      humidifierThresholds: {
        flower_mid: { day: { on: 1.6, off: 1.4 }, night: { on: 1.2, off: 1.0 } },
      },
    });

    // Every mark keeps its own kind and its own id, so a chart can tell four
    // separately configured facts apart rather than reconciling them.
    expect(targets.map((target) => [target.kind, target.id])).toEqual([
      [GuideMarkKind.OPTIMAL_BAND, 'vpd-optimal'],
      [GuideMarkKind.LIMIT, 'vpd-danger-low'],
      [GuideMarkKind.LIMIT, 'vpd-danger-high'],
      [GuideMarkKind.SETPOINT, 'humidifier-on'],
      [GuideMarkKind.SETPOINT, 'humidifier-off'],
      [GuideMarkKind.SETPOINT, 'exhaust-fan-target'],
    ]);
    expect(new Set(targets.map((target) => target.id)).size).toBe(targets.length);
  });

  it('leaves a metric no controller regulates untouched', () => {
    expect(targetsFor(MetricKey.CO2, { exhaustFanConfig: fanConfig() })).toEqual([]);
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
