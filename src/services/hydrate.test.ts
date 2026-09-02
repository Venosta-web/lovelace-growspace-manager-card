import { describe, it, expect, beforeEach, vi } from 'vitest';
import { hydrate } from './hydrate';
import { devices$, setDevices } from '../slices/grid';
import { setPlants } from '../slices/plant';
import { setIrrigationConfig, setIrrigationRecipes, setTankLevels } from '../slices/irrigation';

vi.mock('../slices/device-state', () => ({
  setDeviceSnapshot: vi.fn(),
  setSubareaDeviceSnapshot: vi.fn(),
  deviceSnapshots$: { get: () => new Map() },
  subareaDeviceSnapshots$: { get: () => new Map() },
  deviceSnapshotEntityIds: vi.fn(() => []),
}));

vi.mock('../slices/environment', () => ({
  setEnvSnapshot: vi.fn(),
  setSubareaEnvSnapshot: vi.fn(),
  subareaEnvSnapshots$: { get: () => new Map() },
  envSnapshotEntityIds: vi.fn(() => []),
}));

vi.mock('../slices/irrigation', () => ({
  setIrrigationConfig: vi.fn(),
  setIrrigationRecipes: vi.fn(),
  setIrrigationStrategy: vi.fn(),
  setTankLevels: vi.fn(),
}));

vi.mock('../slices/plant', () => ({
  setPlants: vi.fn(),
}));

const minimalCollection = {
  'gs-1': {
    identity: { growspace_id: 'gs-1', name: 'Tent A', type: 'flower' },
  },
};

beforeEach(() => {
  setDevices([]);
  vi.clearAllMocks();
});

describe('hydrate()', () => {
  it('writes the transformed device list to devices$', () => {
    hydrate(minimalCollection as never, {});

    const result = devices$.get();
    expect(result).toHaveLength(1);
    expect(result[0].deviceId).toBe('gs-1');
    expect(result[0].name).toBe('Tent A');
  });

  it('calls setPlants with plants derived from the grid sub-object', () => {
    const collection = {
      'gs-1': {
        identity: { growspace_id: 'gs-1', name: 'Tent A', type: 'flower' },
        grid: {
          grid: {
            '0-0': {
              entity_id: 'sensor.plant_1',
              row: 0,
              col: 0,
              strain: 'OG',
              phenotype: 'A',
              stage: 'flower',
            },
          },
        },
      },
    };

    hydrate(collection as never, {});

    expect(setPlants).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ entity_id: 'sensor.plant_1' })])
    );
  });

  it('calls setIrrigationConfig when device has irrigationConfig', () => {
    const collection = {
      'gs-1': {
        identity: { growspace_id: 'gs-1', name: 'Tent A', type: 'flower' },
        irrigation: { irrigation_config: { irrigation_pump_entity: 'switch.pump' } },
      },
    };

    hydrate(collection as never, {});

    expect(setIrrigationConfig).toHaveBeenCalledWith(
      'gs-1',
      expect.objectContaining({ irrigationPumpEntity: 'switch.pump' })
    );
    expect(setTankLevels).toHaveBeenCalledWith('gs-1', []);
  });

  it('returns a Set of watched entity IDs from plant entity_ids', () => {
    const collection = {
      'gs-1': {
        identity: { growspace_id: 'gs-1', name: 'Tent A', type: 'flower' },
        grid: {
          grid: {
            '0-0': {
              entity_id: 'sensor.plant_1',
              row: 0,
              col: 0,
              strain: 'OG',
              phenotype: 'A',
              stage: 'flower',
            },
          },
        },
      },
    };

    const watched = hydrate(collection as never, {});

    expect(watched).toBeInstanceOf(Set);
    expect(watched.has('sensor.plant_1')).toBe(true);
  });
});

describe('hydrate() — the global Irrigation Recipe library', () => {
  const recipe = {
    id: 'r1',
    name: 'Flower week 3',
    kind: 'crop_steering',
    provenance: {
      media_type: 'coco',
      liters_per_pot: 5,
      pump_flow_rate_ml_per_sec: 11,
      stage: 'flower',
      week: 3,
    },
    crop_steering: null,
    schedule: null,
    created_at: '2026-08-04T09:00:00+00:00',
  };

  it('sets it once, not per growspace — every payload carries the same list', () => {
    const collection = {
      'gs-1': {
        identity: { growspace_id: 'gs-1', name: 'Tent A', type: 'flower' },
        irrigation: { recipes: { r1: recipe } },
      },
      'gs-2': {
        identity: { growspace_id: 'gs-2', name: 'Tent B', type: 'flower' },
        irrigation: { recipes: { r1: recipe } },
      },
    };

    hydrate(collection as never, {});

    expect(setIrrigationRecipes).toHaveBeenCalledTimes(1);
    expect(setIrrigationRecipes).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'r1', name: 'Flower week 3' }),
    ]);
  });

  it('sets an empty library — no recipes saved yet is a real answer', () => {
    hydrate(
      {
        'gs-1': {
          identity: { growspace_id: 'gs-1', name: 'Tent A', type: 'flower' },
          irrigation: { recipes: {} },
        },
      } as never,
      {}
    );

    expect(setIrrigationRecipes).toHaveBeenCalledWith([]);
  });

  it('leaves the library alone when the backend predates the feature', () => {
    hydrate(minimalCollection as never, {});

    expect(setIrrigationRecipes).not.toHaveBeenCalled();
  });
});
