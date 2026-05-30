import { describe, it, expect } from 'vitest';
import {
  aPlant,
  aGrowspace,
  anEnvSnapshot,
  aGrowspaceDevice,
  anECRampPoint,
  anECRampCurve,
  anIrrigationConfig,
  aRecommendation,
  anAIBriefing,
} from '.';
import { PlantStage, PlantSex } from '../../src/features/plants/types';
import { EnvSnapshotSchema } from '../../src/slices/environment/schema';
import { AIBriefingSchema, RecommendationSchema } from '../../src/slices/ai-insight/schema';

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

  it('defaults irrigation monitoring group to realistic sensor readings', () => {
    const snap = anEnvSnapshot();
    expect(snap.feedEc?.avg).toBe(1.8);
    expect(snap.runoffEc?.avg).toBe(1.9);
    expect(snap.ph?.avg).toBe(6.2);
    expect(snap.substrateEc?.avg).toBe(2.1);
    expect(snap.drainVolume?.avg).toBe(0.5);
    expect(snap.irrigationFlow?.avg).toBe(2.3);
    expect(snap.power?.avg).toBe(420);
    expect(snap.energy?.avg).toBe(5.6);
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
  it('returns a GrowspaceDevice with required fields and two default plants', () => {
    const device = aGrowspaceDevice();
    expect(device.deviceId).toBe('test_tent');
    expect(device.name).toBe('Test Tent');
    expect(device.rows).toBe(2);
    expect(device.plantsPerRow).toBe(4);
    expect(device.plants).toHaveLength(2);
    expect(device.plants[0].attributes.strain).toBe('Gorilla Glue');
    expect(device.plants[1].attributes.strain).toBe('Blue Dream');
    expect(device.stats.totalPlants).toBe(2);
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

describe('anECRampPoint', () => {
  it('returns a point with day and target_ec', () => {
    const point = anECRampPoint();
    expect(point.day).toBe(1);
    expect(point.target_ec).toBe(0.8);
  });

  it('merges overrides', () => {
    const point = anECRampPoint({ day: 7, target_ec: 1.2 });
    expect(point.day).toBe(7);
    expect(point.target_ec).toBe(1.2);
  });
});

describe('anECRampCurve', () => {
  it('returns a curve with id, name, stage and points', () => {
    const curve = anECRampCurve();
    expect(curve.id).toBe('test-curve');
    expect(curve.name).toBe('Test Curve');
    expect(curve.stage).toBe('flower');
    expect(curve.points.length).toBeGreaterThan(0);
  });

  it('merges overrides without clobbering points', () => {
    const pts = [anECRampPoint({ day: 3, target_ec: 1.0 })];
    const curve = anECRampCurve({ id: 'custom', points: pts });
    expect(curve.id).toBe('custom');
    expect(curve.points).toHaveLength(1);
  });
});

describe('anIrrigationConfig', () => {
  it('returns a config with empty schedule lists by default', () => {
    const cfg = anIrrigationConfig();
    expect(cfg.irrigationTimes).toEqual([]);
    expect(cfg.drainTimes).toEqual([]);
  });

  it('merges overrides', () => {
    const cfg = anIrrigationConfig({ soilTriggerPercent: 25, maxCyclesPerDay: 6 });
    expect(cfg.soilTriggerPercent).toBe(25);
    expect(cfg.maxCyclesPerDay).toBe(6);
    expect(cfg.irrigationTimes).toEqual([]);
  });
});

describe('aRecommendation', () => {
  it('passes RecommendationSchema validation', () => {
    expect(() => RecommendationSchema.parse(aRecommendation())).not.toThrow();
  });

  it('supports filtering by impact', () => {
    const high = aRecommendation({ impact: 'high' });
    const low = aRecommendation({ impact: 'low' });
    expect(high.impact).toBe('high');
    expect(low.impact).toBe('low');
  });
});

describe('anAIBriefing', () => {
  it('passes AIBriefingSchema validation', () => {
    expect(() => AIBriefingSchema.parse(anAIBriefing())).not.toThrow();
  });

  it('includes at least one high-impact recommendation by default', () => {
    const briefing = anAIBriefing();
    expect(briefing.recommendations.some((r) => r.impact === 'high')).toBe(true);
  });

  it('merges overrides', () => {
    const briefing = anAIBriefing({ ai_available: false, summary_text: 'AI offline' });
    expect(briefing.ai_available).toBe(false);
    expect(briefing.summary_text).toBe('AI offline');
  });
});
