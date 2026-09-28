import { describe, expect, it } from 'vitest';
import { createGrowspaceDevice } from '../../services/types';
import {
  createEnvironmentDraftState,
  editEnvironmentDraft,
  environmentSaveVerdict,
  hasEnvironmentDraftDiverged,
  planEnvironmentWrite,
  planVisionWrite,
  reseedEnvironmentDraftState,
  transitionEnvironmentDraft,
} from './environment-draft';

function device() {
  return createGrowspaceDevice({
    deviceId: 'tent-1',
    name: 'Tent 1',
    rows: 4,
    plantsPerRow: 4,
    environmentAttributes: {
      temperatureSensor: 'sensor.legacy_temperature',
      humiditySensors: ['sensor.current_humidity'],
      soilMoistureMin: 25,
      soilMoistureMax: 60,
      stressThreshold: 0.8,
    },
  });
}

describe('Shared Environment Draft', () => {
  it('constructs a complete default read model with no write intent', () => {
    const state = createEnvironmentDraftState();
    expect(state.values.selectedGrowspaceId).toBe('');
    expect(state.values.temperatureSensors).toEqual([]);
    expect(state.values.soilMoistureMin).toBeNull();
    expect(state.values.visionMidHours).toBe(6);
    expect(state.values.growlightConfig.power).toBe(100);
    expect(state.dirty.size).toBe(0);
    expect(hasEnvironmentDraftDiverged(state)).toBe(false);
  });

  it('seeds canonical values and legacy sensor fallbacks without write intent', () => {
    const state = createEnvironmentDraftState(device());
    expect(state.values.selectedGrowspaceId).toBe('tent-1');
    expect(state.values.temperatureSensors).toEqual(['sensor.legacy_temperature']);
    expect(state.values.humiditySensors).toEqual(['sensor.current_humidity']);
    expect(state.values.soilMoistureMin).toBe(25);
    expect(state.values.soilMoistureMax).toBe(60);
    expect(state.values.stressThreshold).toBe(0.8);
    expect(state.dirty.size).toBe(0);
    expect(hasEnvironmentDraftDiverged(state)).toBe(false);
  });

  it('keeps clear intent distinct from divergence after editing back', () => {
    const initial = createEnvironmentDraftState(device());
    const edited = editEnvironmentDraft(initial, {
      temperatureSensors: [],
      co2Sensor: '',
      sensorCoordinates: {},
    });
    expect([...edited.dirty].sort()).toEqual([
      'co2Sensor',
      'sensorCoordinates',
      'temperatureSensors',
    ]);
    expect(hasEnvironmentDraftDiverged(edited)).toBe(true);

    const back = editEnvironmentDraft(edited, {
      temperatureSensors: ['sensor.legacy_temperature'],
    });
    expect(back.dirty.has('temperatureSensors')).toBe(true);
    expect(hasEnvironmentDraftDiverged(back)).toBe(false);
    expect(initial.dirty.size).toBe(0);
  });

  it('closes one moisture edit over the complete atomic group', () => {
    const state = editEnvironmentDraft(createEnvironmentDraftState(device()), {
      soilMoistureMin: 30,
    });
    expect([...state.dirty].sort()).toEqual(['soilMoistureMax', 'soilMoistureMin']);
    expect(state.values.soilMoistureMax).toBe(60);
  });

  it('reseed clears write intent after success; an unchanged state retains it for retry', () => {
    const edited = editEnvironmentDraft(createEnvironmentDraftState(device()), {
      stressThreshold: 0,
    });
    expect(edited.values.stressThreshold).toBe(0);
    expect(edited.dirty.has('stressThreshold')).toBe(true);
    const afterFailure = edited;
    expect(afterFailure.dirty.has('stressThreshold')).toBe(true);

    const refreshed = reseedEnvironmentDraftState(device());
    expect(refreshed.dirty.size).toBe(0);
    expect(hasEnvironmentDraftDiverged(refreshed)).toBe(false);
  });

  it('plans only dirty buffered fields, retaining empty clear values and target identity', () => {
    const initial = createEnvironmentDraftState(device());
    const edited = editEnvironmentDraft(initial, {
      co2Sensor: '',
      lightSensors: [],
      sensorCoordinates: {},
    });
    expect(planEnvironmentWrite(edited)).toEqual([
      {
        kind: 'configure-environment',
        growspaceId: 'tent-1',
        fields: { co2Sensor: '', lightSensors: [], sensorCoordinates: {} },
      },
    ]);
    expect(initial.dirty.size).toBe(0);
  });

  it('plans a complete moisture pair or clear and blocks a half-value', () => {
    const changed = editEnvironmentDraft(createEnvironmentDraftState(device()), {
      soilMoistureMin: 30,
    });
    expect(planEnvironmentWrite(changed)[0]).toMatchObject({
      fields: { soilMoistureMin: 30, soilMoistureMax: 60 },
    });
    const cleared = editEnvironmentDraft(changed, {
      soilMoistureMin: null,
      soilMoistureMax: null,
    });
    expect(planEnvironmentWrite(cleared)[0]).toMatchObject({
      fields: { soilMoistureMin: null, soilMoistureMax: null },
    });
    const invalid = editEnvironmentDraft(changed, { soilMoistureMax: null });
    expect(environmentSaveVerdict(invalid.values, invalid.dirty)).toEqual({
      ok: false,
      reason: 'moisture-band',
    });
  });

  it('orders exhaust after the buffered command and excludes unrelated dedicated fields', () => {
    const state = editEnvironmentDraft(createEnvironmentDraftState(device()), {
      exhaustFanConfig: {
        ...createEnvironmentDraftState(device()).values.exhaustFanConfig,
        enabled: true,
      },
      visionEnabled: true,
      humidifierControlEnabled: true,
    });
    const plan = planEnvironmentWrite(state);
    expect(plan.map((command) => command.kind)).toEqual([
      'configure-environment',
      'configure-exhaust',
    ]);
    expect(plan[0]).toMatchObject({ fields: {} });
    expect(plan[1]).toMatchObject({ config: { enabled: true } });
  });

  it('plans a full Vision command after any Vision edit and none when clean', () => {
    const clean = createEnvironmentDraftState(device());
    expect(planVisionWrite(clean)).toBeNull();
    const edited = editEnvironmentDraft(clean, { visionMidHours: 8 });
    expect(planVisionWrite(edited)).toEqual({
      growspaceId: 'tent-1',
      config: {
        visionEnabled: false,
        visionEarlyOffset: 60,
        visionMidHours: 8,
        visionLateOffset: 60,
      },
    });
    expect(planEnvironmentWrite(edited)[0]).toMatchObject({ fields: {} });
  });

  it('reports immediate humidity commands only for those edits', () => {
    const initial = createEnvironmentDraftState(device());
    const unrelated = transitionEnvironmentDraft(initial, { stressThreshold: 0 });
    expect(unrelated.immediate).toEqual([]);
    const toggled = transitionEnvironmentDraft(unrelated.state, {
      humidifierControlEnabled: true,
      dehumidifierControlEnabled: false,
    });
    expect(toggled.immediate).toEqual([
      { kind: 'humidifier', growspaceId: 'tent-1', enabled: true },
      { kind: 'dehumidifier', growspaceId: 'tent-1', enabled: false },
    ]);
    expect(toggled.state.values.humidifierControlEnabled).toBe(true);
    expect(planEnvironmentWrite(toggled.state)[0]).toMatchObject({
      fields: { stressThreshold: 0 },
    });
  });
});
