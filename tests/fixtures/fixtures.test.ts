import { describe, it, expect } from 'vitest';
import { aPlant, aGrowspace, anEnvSnapshot, aGrowspaceDevice } from '.';
import { PlantStage, PlantSex } from '../../src/features/plants/types';
import { EnvSnapshotSchema } from '../../src/slices/environment/schema';

describe('aPlant', () => {
  it('returns a PlantEntity with required fields', () => {
    const plant = aPlant();
    expect(plant.entity_id).toBe('sensor.gorilla_glue_4');
    expect(plant.attributes.plant_id).toBe('test-plant-uuid-1');
    expect(plant.attributes.stage).toBe(PlantStage.VEG);
    expect(plant.attributes.sex).toBe(PlantSex.FEMALE);
    expect(plant.attributes.growspace_id).toBe('test_tent');
  });

  it('merges overrides', () => {
    const plant = aPlant({ strain: 'Blue Dream', veg_days: 30 });
    expect(plant.attributes.strain).toBe('Blue Dream');
    expect(plant.attributes.veg_days).toBe(30);
    expect(plant.attributes.phenotype).toBe('#4');
  });
});

describe('aGrowspace', () => {
  it('returns the seed shape with required fields', () => {
    const gs = aGrowspace();
    expect(gs.growspaceId).toBe('test_tent');
    expect(gs.name).toBe('Test Tent');
    expect(gs.rows).toBe(4);
    expect(gs.cols).toBe(4);
  });

  it('merges overrides', () => {
    const gs = aGrowspace({ growspaceId: 'veg_room', name: 'Veg Room', rows: 2, cols: 3 });
    expect(gs.growspaceId).toBe('veg_room');
    expect(gs.rows).toBe(2);
    expect(gs.cols).toBe(3);
  });
});

describe('anEnvSnapshot', () => {
  it('produces a snapshot that passes Zod schema validation', () => {
    expect(() => EnvSnapshotSchema.parse(anEnvSnapshot())).not.toThrow();
  });

  it('defaults substrate sensor group to realistic readings', () => {
    const snap = anEnvSnapshot();
    expect(snap.soilMoisture).toEqual({ avg: 65, perSensor: [65], entityIds: ['sensor.test_tent_soil_moisture'] });
    expect(snap.substrateTemperature).toEqual({ avg: 22.0, perSensor: [22.0], entityIds: ['sensor.test_tent_substrate_temp'] });
  });

  it('defaults irrigation monitoring fields to null', () => {
    const snap = anEnvSnapshot();
    expect(snap.feedEc).toBeNull();
    expect(snap.runoffEc).toBeNull();
    expect(snap.energy).toBeNull();
  });

  it('merges overrides and still passes schema', () => {
    const snap = anEnvSnapshot({
      temperature: 28,
      vpdStatus: 'warning',
      soilMoisture: { avg: 45, perSensor: [45], entityIds: ['sensor.soil_1'] },
    });
    expect(snap.temperature).toBe(28);
    expect(snap.vpdStatus).toBe('warning');
    expect(snap.soilMoisture?.avg).toBe(45);
    expect(() => EnvSnapshotSchema.parse(snap)).not.toThrow();
  });
});

describe('aGrowspaceDevice', () => {
  it('returns a GrowspaceDevice with required fields', () => {
    const device = aGrowspaceDevice();
    expect(device.deviceId).toBe('test_tent');
    expect(device.name).toBe('Test Tent');
    expect(device.plants).toEqual([]);
    expect(device.rows).toBe(3);
    expect(device.plantsPerRow).toBe(3);
  });

  it('merges overrides', () => {
    const device = aGrowspaceDevice({ deviceId: 'veg_room', name: 'Veg Room', rows: 4, plantsPerRow: 5 });
    expect(device.deviceId).toBe('veg_room');
    expect(device.name).toBe('Veg Room');
    expect(device.rows).toBe(4);
    expect(device.plantsPerRow).toBe(5);
  });

  it('has a valid irrigationConfig by default', () => {
    const device = aGrowspaceDevice();
    expect(device.irrigationConfig).toBeDefined();
    expect(device.irrigationConfig.irrigationTimes).toEqual([]);
  });
});
