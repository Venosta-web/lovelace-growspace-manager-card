/**
 * Regression net for metric → entity resolution and history-key naming.
 *
 * The resolution cases came from `history-store.test.ts`, where they exercised
 * the store's private `getEntityIdsForMetric`. That method retired in #473 —
 * the store resolves nothing itself now — so the cases follow the behaviour
 * down to the module that owns it, unchanged.
 */

import { describe, it, expect } from 'vitest';
import { resolveMetricEntityIds, metricHistoryKeys } from './metric-entities';
import type { GrowspaceDevice } from '../../services/types';

const makeDevice = (overrides: Record<string, unknown>): GrowspaceDevice =>
  ({ deviceId: 'dev1', name: 'Tent 1', ...overrides }) as unknown as GrowspaceDevice;

describe('resolveMetricEntityIds', () => {
  it('returns plural sensor ids when temperatureSensors array is present', () => {
    const device = makeDevice({
      environmentAttributes: {
        temperatureSensors: ['sensor.tent1_temp1', 'sensor.tent1_temp2'],
      },
    });
    expect(resolveMetricEntityIds(device, 'temperature')).toEqual([
      'sensor.tent1_temp1',
      'sensor.tent1_temp2',
    ]);
  });

  it('derives optimal entity id from overviewEntityId slug', () => {
    const device = makeDevice({
      overviewEntityId: 'sensor.tent_1_overview',
      environmentAttributes: {},
    });
    expect(resolveMetricEntityIds(device, 'optimal')).toEqual([
      'binary_sensor.tent_1_optimal_conditions',
    ]);
  });

  it('uses cure-specific optimal entity id for cure devices', () => {
    const device = makeDevice({ name: 'Cure', environmentAttributes: {} });
    expect(resolveMetricEntityIds(device, 'optimal')).toEqual([
      'binary_sensor.cure_optimal_curing',
    ]);
  });

  it('uses dry-specific optimal entity id for dry devices', () => {
    const device = makeDevice({ name: 'Dry', environmentAttributes: {} });
    expect(resolveMetricEntityIds(device, 'optimal')).toEqual(['binary_sensor.dry_optimal_drying']);
  });

  it('returns empty array for an unknown metric key', () => {
    const device = makeDevice({ environmentAttributes: {} });
    expect(resolveMetricEntityIds(device, 'completely_unknown_metric')).toEqual([]);
  });

  it('reads environmentAttributes from snake_case environment_attributes fallback', () => {
    const device = makeDevice({
      environment_attributes: { temperatureSensor: 'sensor.temp' },
    });
    expect(resolveMetricEntityIds(device, 'temperature')).toEqual(['sensor.temp']);
  });

  it('returns empty array when device has no environment attributes at all', () => {
    expect(resolveMetricEntityIds(makeDevice({}), 'temperature')).toEqual([]);
  });

  it('skips irrigation entity when value is not a string', () => {
    const device = makeDevice({
      irrigationConfig: { irrigationPumpEntity: 42 },
      environmentAttributes: {},
    });
    expect(resolveMetricEntityIds(device, 'irrigation')).toEqual([]);
  });

  it('returns the calculated VPD entity when it exists in the states snapshot', () => {
    const calculatedId = 'sensor.tent_1_calculated_vpd';
    const device = makeDevice({ environmentAttributes: {} });
    expect(resolveMetricEntityIds(device, 'vpd', { [calculatedId]: { state: '1.2' } })).toEqual([
      calculatedId,
    ]);
  });

  it('does not invent a calculated VPD entity that the states snapshot lacks', () => {
    const device = makeDevice({ environmentAttributes: {} });
    expect(resolveMetricEntityIds(device, 'vpd', {})).toEqual([]);
  });

  it('returns irrigation pump entity from camelCase irrigationConfig key', () => {
    const device = makeDevice({
      irrigationConfig: { irrigationPumpEntity: 'switch.irrigation_pump' },
      environmentAttributes: {},
    });
    expect(resolveMetricEntityIds(device, 'irrigation')).toEqual(['switch.irrigation_pump']);
  });

  it('falls back to snake_case key when camelCase irrigationConfig key is absent', () => {
    const device = makeDevice({
      irrigationConfig: { irrigation_pump_entity: 'switch.irrigation_pump' },
      environmentAttributes: {},
    });
    expect(resolveMetricEntityIds(device, 'irrigation')).toEqual(['switch.irrigation_pump']);
  });

  it.each([
    ['energy', { energySensors: ['sensor.energy1', 'sensor.energy2'] }],
    ['power', { powerSensors: ['sensor.power1'] }],
    ['ph', { phSensors: ['sensor.ph1'] }],
    ['feed_ec', { feedEcSensors: ['sensor.feed_ec1'] }],
  ])('returns the %s array when the primary key is already plural', (metric, envAttrs) => {
    const device = makeDevice({ environmentAttributes: envAttrs });
    expect(resolveMetricEntityIds(device, metric)).toEqual(Object.values(envAttrs)[0]);
  });

  it('extracts sensorEntity from tank objects for irrigation_tank_level', () => {
    const device = makeDevice({
      environmentAttributes: {
        irrigationTanks: [
          { sensorEntity: 'sensor.tank1_level', name: 'Tank 1' },
          { sensorEntity: 'sensor.tank2_level', name: 'Tank 2' },
        ],
      },
    });
    expect(resolveMetricEntityIds(device, 'irrigation_tank_level')).toEqual([
      'sensor.tank1_level',
      'sensor.tank2_level',
    ]);
  });
});

describe('metricHistoryKeys', () => {
  it('files a single-sensor metric under the metric key', () => {
    expect(metricHistoryKeys('temperature', ['sensor.temp'])).toEqual([
      { entityId: 'sensor.temp', historyKey: 'temperature' },
    ]);
  });

  it('files each sensor of a multi-sensor metric under its own entity id', () => {
    expect(metricHistoryKeys('temperature', ['sensor.temp1', 'sensor.temp2'])).toEqual([
      { entityId: 'sensor.temp1', historyKey: 'sensor.temp1' },
      { entityId: 'sensor.temp2', historyKey: 'sensor.temp2' },
    ]);
  });

  it('mints no composite keys', () => {
    const keys = metricHistoryKeys('temperature', ['sensor.temp1', 'sensor.temp2']);
    expect(keys.every(({ historyKey }) => !historyKey.includes(':'))).toBe(true);
  });

  it('preserves the given order, which decides series order and colour', () => {
    const keys = metricHistoryKeys('ph', ['sensor.b', 'sensor.a', 'sensor.c']);
    expect(keys.map((k) => k.entityId)).toEqual(['sensor.b', 'sensor.a', 'sensor.c']);
  });

  it('returns nothing for a metric with no backing entity', () => {
    expect(metricHistoryKeys('temperature', [])).toEqual([]);
  });
});
