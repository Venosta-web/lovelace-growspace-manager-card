import { describe, expect, it } from 'vitest';
import {
  createEnvironmentDraftState,
  editEnvironmentDraft,
  planEnvironmentWrite,
} from './environment-draft';
import {
  applyTankConfigChange,
  executeEnvironmentWritePlan,
  type EnvironmentChangeAdapter,
} from './environment-change';

function recorder(calls: string[]): EnvironmentChangeAdapter {
  return {
    async configureEnvironment(payload) {
      calls.push(`environment:${JSON.stringify(payload)}`);
    },
    async configureExhaustFan(payload) {
      calls.push(`exhaust:${JSON.stringify(payload)}`);
    },
  };
}

function validState() {
  return editEnvironmentDraft(createEnvironmentDraftState(), {
    selectedGrowspaceId: 'tent-1',
    temperatureSensors: ['sensor.temp'],
    humiditySensors: ['sensor.rh'],
  });
}

describe('Environment command adapter', () => {
  it('maps a sparse plan to the released Home Assistant wire form', async () => {
    const calls: string[] = [];
    const state = editEnvironmentDraft(validState(), {
      co2Sensor: '',
      stressThreshold: 0,
      soilMoistureMin: null,
      soilMoistureMax: null,
    });
    await executeEnvironmentWritePlan(planEnvironmentWrite(state), recorder(calls));
    expect(JSON.parse(calls[0].slice('environment:'.length))).toEqual({
      growspace_id: 'tent-1',
      temperature_sensors: ['sensor.temp'],
      humidity_sensors: ['sensor.rh'],
      co2_sensor: null,
      stress_threshold: 0,
      soil_moisture_min: null,
      soil_moisture_max: null,
    });
    expect(calls).toHaveLength(1);
  });

  it('omits null stress and mold values for released GSM and sends complete numeric bands', async () => {
    const calls: string[] = [];
    const state = editEnvironmentDraft(validState(), {
      stressThreshold: null,
      moldThreshold: null,
      soilMoistureMin: 25,
      soilMoistureMax: 65,
      lightSensors: [],
      sensorCoordinates: {},
    });
    await executeEnvironmentWritePlan(planEnvironmentWrite(state), recorder(calls));
    const payload = JSON.parse(calls[0].slice('environment:'.length));
    expect(payload).toMatchObject({
      growspace_id: 'tent-1',
      soil_moisture_min: 25,
      soil_moisture_max: 65,
      light_sensors: [],
      sensor_coordinates: {},
    });
    expect(payload).not.toHaveProperty('stress_threshold');
    expect(payload).not.toHaveProperty('mold_threshold');
  });

  it('executes exhaust second', async () => {
    const calls: string[] = [];
    const state = editEnvironmentDraft(validState(), {
      exhaustFanConfig: { ...validState().values.exhaustFanConfig, enabled: true },
    });
    await executeEnvironmentWritePlan(planEnvironmentWrite(state), recorder(calls));
    expect(calls.map((call) => call.split(':')[0])).toEqual(['environment', 'exhaust']);
    expect(JSON.parse(calls[1].slice('exhaust:'.length))).toMatchObject({
      growspace_id: 'tent-1',
      enabled: true,
    });
  });

  it('keeps the Irrigation Dialog tank-only command independent of the shared draft', async () => {
    const calls: string[] = [];
    await applyTankConfigChange(
      {
        growspaceId: 'tent-1',
        irrigationTanks: [
          {
            sensorEntity: 'sensor.reservoir',
            name: 'Reservoir',
            warningLevel: 20,
            volumeLiters: 80,
            staleAfterMinutes: 0,
            fillLevel: 62,
            isWarning: false,
          },
        ],
      },
      recorder(calls)
    );
    expect(JSON.parse(calls[0].slice('environment:'.length))).toEqual({
      growspace_id: 'tent-1',
      irrigation_tanks: [
        {
          sensor_entity: 'sensor.reservoir',
          name: 'Reservoir',
          warning_level: 20,
          volume_liters: 80,
          stale_after_minutes: 0,
        },
      ],
    });
    expect(calls).toHaveLength(1);
  });

  it('stops after a failed buffered call, retaining the draft for retry', async () => {
    const state = editEnvironmentDraft(validState(), {
      exhaustFanConfig: { ...validState().values.exhaustFanConfig, enabled: true },
    });
    const plan = planEnvironmentWrite(state);
    const calls: string[] = [];
    const adapter = recorder(calls);
    adapter.configureEnvironment = async () => {
      calls.push('environment');
      throw new Error('offline');
    };
    await expect(executeEnvironmentWritePlan(plan, adapter)).rejects.toThrow('offline');
    expect(calls).toEqual(['environment']);
    expect(state.dirty.has('exhaustFanConfig')).toBe(true);
  });

  it('retries both idempotent commands after an exhaust failure', async () => {
    const state = editEnvironmentDraft(validState(), {
      exhaustFanConfig: { ...validState().values.exhaustFanConfig, enabled: true },
    });
    const plan = planEnvironmentWrite(state);
    const calls: string[] = [];
    const adapter = recorder(calls);
    adapter.configureExhaustFan = async () => {
      calls.push('exhaust');
      throw new Error('offline');
    };
    await expect(executeEnvironmentWritePlan(plan, adapter)).rejects.toThrow('offline');
    expect(calls.map((call) => call.split(':')[0])).toEqual(['environment', 'exhaust']);
    expect(state.dirty.has('exhaustFanConfig')).toBe(true);
    await executeEnvironmentWritePlan(plan, recorder(calls));
    expect(calls.map((call) => call.split(':')[0])).toEqual([
      'environment',
      'exhaust',
      'environment',
      'exhaust',
    ]);
  });
});
