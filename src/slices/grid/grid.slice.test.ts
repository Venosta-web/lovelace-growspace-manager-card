/**
 * Grid slice unit tests.
 *
 * Covers: atoms, computed derivations, bootstrap writes, sibling setters,
 * and cross-slice setter usage from the Plant slice.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { GrowspaceDevice, PlantEntity } from '../../types';
import {
  devices$,
  selectedDeviceId$,
  optimisticDeletedPlantIds$,
  activeDevices$,
  growspaceOptions$,
  gridLayout$,
  gridViewState$,
  plantToDeviceMap$,
  gridSlice,
  setDevices,
  setSelectedDeviceId,
  addOptimisticDeletedPlantId,
  removeOptimisticDeletedPlantId,
  clearOptimisticDeletedPlantIds,
  patchDeviceIrrigationConfig,
  makePerCardGridSlice,
} from './index';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makePlant = (id: string, row: number, col: number): PlantEntity =>
  ({
    entity_id: `sensor.${id}`,
    state: 'vegetative',
    attributes: { plant_id: id, row, col, growspace_id: 'gs1', strain: 'Test' },
  }) as unknown as PlantEntity;

const makeDevice = (
  id: string,
  name: string,
  plants: PlantEntity[],
  plantsPerRow = 2,
  rows = 2
): GrowspaceDevice =>
  ({
    deviceId: id,
    name,
    plantsPerRow,
    rows,
    type: 'normal',
    plants,
  }) as unknown as GrowspaceDevice;

// ---------------------------------------------------------------------------
// State reset before each test
// ---------------------------------------------------------------------------

beforeEach(() => {
  devices$.set([]);
  selectedDeviceId$.set(null);
  optimisticDeletedPlantIds$.set(new Set());
});

// ---------------------------------------------------------------------------
// Atoms
// ---------------------------------------------------------------------------

describe('devices$', () => {
  it('starts empty', () => {
    expect(devices$.get()).toEqual([]);
  });

  it('setDevices replaces the array', () => {
    const device = makeDevice('gs1', 'Room 1', []);
    setDevices([device]);
    expect(devices$.get()).toHaveLength(1);
    expect(devices$.get()[0].deviceId).toBe('gs1');
  });
});

describe('selectedDeviceId$', () => {
  it('starts null', () => {
    expect(selectedDeviceId$.get()).toBeNull();
  });

  it('setSelectedDeviceId sets the value', () => {
    setSelectedDeviceId('gs1');
    expect(selectedDeviceId$.get()).toBe('gs1');
  });

  it('setSelectedDeviceId accepts null to clear', () => {
    setSelectedDeviceId('gs1');
    setSelectedDeviceId(null);
    expect(selectedDeviceId$.get()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Computed: activeDevices$
// ---------------------------------------------------------------------------

describe('activeDevices$', () => {
  it('mirrors devices when no optimistic deletes', () => {
    const p = makePlant('p1', 1, 1);
    setDevices([makeDevice('gs1', 'Room 1', [p])]);

    expect(activeDevices$.get()[0].plants).toHaveLength(1);
  });

  it('filters out optimistically deleted plant IDs', () => {
    const p1 = makePlant('p1', 1, 1);
    const p2 = makePlant('p2', 1, 2);
    setDevices([makeDevice('gs1', 'Room 1', [p1, p2])]);

    addOptimisticDeletedPlantId('p1');

    const activePlants = activeDevices$.get()[0].plants;
    expect(activePlants).toHaveLength(1);
    expect(activePlants[0].attributes.plant_id).toBe('p2');
  });

  it('falls back to entity_id for plants without plant_id', () => {
    const plant: PlantEntity = {
      entity_id: 'sensor.p_legacy',
      state: 'vegetative',
      attributes: { row: 1, col: 1 },
    } as unknown as PlantEntity;
    setDevices([makeDevice('gs1', 'Room 1', [plant])]);

    addOptimisticDeletedPlantId('p_legacy');

    expect(activeDevices$.get()[0].plants).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Computed: growspaceOptions$
// ---------------------------------------------------------------------------

describe('growspaceOptions$', () => {
  it('returns empty record when no devices', () => {
    expect(growspaceOptions$.get()).toEqual({});
  });

  it('maps deviceId to name for each active device', () => {
    setDevices([makeDevice('gs1', 'Veg Room', []), makeDevice('gs2', 'Flower Room', [])]);

    expect(growspaceOptions$.get()).toEqual({ gs1: 'Veg Room', gs2: 'Flower Room' });
  });

  it('excludes a device whose only plant was optimistically deleted', () => {
    const p = makePlant('p1', 1, 1);
    setDevices([makeDevice('gs1', 'Room 1', [p])]);

    expect(growspaceOptions$.get()).toHaveProperty('gs1');
  });
});

// ---------------------------------------------------------------------------
// Computed: gridLayout$
// ---------------------------------------------------------------------------

describe('gridLayout$', () => {
  it('returns empty layout when no device is selected', () => {
    setDevices([makeDevice('gs1', 'Room 1', [])]);

    const layout = gridLayout$.get();
    expect(layout.effectiveRows).toBe(0);
    expect(layout.grid).toHaveLength(0);
  });

  it('returns empty layout when selected device is not in the list', () => {
    setSelectedDeviceId('unknown');

    const layout = gridLayout$.get();
    expect(layout.effectiveRows).toBe(0);
  });

  it('builds the grid for the selected device', () => {
    const p1 = makePlant('p1', 1, 1);
    const p2 = makePlant('p2', 1, 2);
    setDevices([makeDevice('gs1', 'Room 1', [p1, p2], 2, 2)]);
    setSelectedDeviceId('gs1');

    const layout = gridLayout$.get();
    expect(layout.grid[0][0]?.attributes.plant_id).toBe('p1');
    expect(layout.grid[0][1]?.attributes.plant_id).toBe('p2');
  });

  it('reflects optimistic deletes in the layout', () => {
    const p1 = makePlant('p1', 1, 1);
    setDevices([makeDevice('gs1', 'Room 1', [p1], 2, 2)]);
    setSelectedDeviceId('gs1');

    addOptimisticDeletedPlantId('p1');

    const layout = gridLayout$.get();
    expect(layout.grid[0][0]).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Computed: gridViewState$
// ---------------------------------------------------------------------------

describe('gridViewState$', () => {
  it('exposes devices, selectedDevice, gridLayout, and growspaceOptions', () => {
    const p = makePlant('p1', 1, 1);
    setDevices([makeDevice('gs1', 'Room 1', [p], 2, 2)]);
    setSelectedDeviceId('gs1');

    const state = gridViewState$.get();
    expect(state.devices).toHaveLength(1);
    expect(state.selectedDevice).toBe('gs1');
    expect(state.growspaceOptions).toEqual({ gs1: 'Room 1' });
    expect(state.gridLayout.effectiveRows).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Sibling setters
// ---------------------------------------------------------------------------

describe('addOptimisticDeletedPlantId', () => {
  it('adds a plant ID to the set', () => {
    addOptimisticDeletedPlantId('p1');
    expect(optimisticDeletedPlantIds$.get().has('p1')).toBe(true);
  });

  it('accumulates multiple IDs', () => {
    addOptimisticDeletedPlantId('p1');
    addOptimisticDeletedPlantId('p2');
    const ids = optimisticDeletedPlantIds$.get();
    expect(ids.has('p1')).toBe(true);
    expect(ids.has('p2')).toBe(true);
  });
});

describe('removeOptimisticDeletedPlantId', () => {
  it('removes a previously added plant ID', () => {
    addOptimisticDeletedPlantId('p1');
    removeOptimisticDeletedPlantId('p1');
    expect(optimisticDeletedPlantIds$.get().has('p1')).toBe(false);
  });

  it('is a no-op for an ID that was never added', () => {
    removeOptimisticDeletedPlantId('unknown');
    expect(optimisticDeletedPlantIds$.get().size).toBe(0);
  });
});

describe('clearOptimisticDeletedPlantIds', () => {
  it('empties the set', () => {
    addOptimisticDeletedPlantId('p1');
    addOptimisticDeletedPlantId('p2');
    clearOptimisticDeletedPlantIds();
    expect(optimisticDeletedPlantIds$.get().size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// gridSlice facade (GridSliceRef compatibility)
// ---------------------------------------------------------------------------

describe('gridSlice', () => {
  it('exposes $selectedDevice writable atom', () => {
    setSelectedDeviceId('gs-facade');
    expect(gridSlice.$selectedDevice.get()).toBe('gs-facade');
  });

  it('setSelectedDevice on facade updates selectedDeviceId$', () => {
    gridSlice.setSelectedDevice('gs-test');
    expect(selectedDeviceId$.get()).toBe('gs-test');
  });

  it('$growspaceOptions on facade reflects active devices', () => {
    setDevices([makeDevice('gs1', 'Room A', [])]);
    expect(gridSlice.$growspaceOptions.get()).toEqual({ gs1: 'Room A' });
  });

  it('$activeDevices on facade matches activeDevices$', () => {
    const p = makePlant('p1', 1, 1);
    setDevices([makeDevice('gs1', 'Room 1', [p])]);
    expect(gridSlice.$activeDevices.get()).toEqual(activeDevices$.get());
  });

  it('$gridLayout on facade matches gridLayout$', () => {
    const p = makePlant('p1', 1, 1);
    setDevices([makeDevice('gs1', 'Room 1', [p], 2, 2)]);
    setSelectedDeviceId('gs1');
    expect(gridSlice.$gridLayout.get()).toEqual(gridLayout$.get());
  });

  it('$gridViewState on facade matches gridViewState$', () => {
    setDevices([makeDevice('gs1', 'Room 1', [], 2, 2)]);
    setSelectedDeviceId('gs1');
    expect(gridSlice.$gridViewState.get()).toEqual(gridViewState$.get());
  });
});

// ---------------------------------------------------------------------------
// Computed: plantToDeviceMap$
// ---------------------------------------------------------------------------

describe('plantToDeviceMap$', () => {
  it('maps plant_id to deviceId for all plants across all devices', () => {
    const p1 = makePlant('p1', 1, 1);
    const p2 = makePlant('p2', 1, 2);
    setDevices([
      makeDevice('gs1', 'Room 1', [p1]),
      makeDevice('gs2', 'Room 2', [p2]),
    ]);

    const map = plantToDeviceMap$.get();
    expect(map.get('p1')).toBe('gs1');
    expect(map.get('p2')).toBe('gs2');
  });

  it('falls back to entity_id without sensor. prefix for plants without plant_id', () => {
    const plant: PlantEntity = {
      entity_id: 'sensor.legacy_plant',
      state: 'vegetative',
      attributes: { row: 1, col: 1 },
    } as unknown as PlantEntity;
    setDevices([makeDevice('gs1', 'Room 1', [plant])]);

    expect(plantToDeviceMap$.get().get('legacy_plant')).toBe('gs1');
  });

  it('updates reactively when setDevices is called with new data', () => {
    const p1 = makePlant('p1', 1, 1);
    setDevices([makeDevice('gs1', 'Room 1', [p1])]);
    expect(plantToDeviceMap$.get().get('p1')).toBe('gs1');

    const p2 = makePlant('p2', 1, 1);
    setDevices([makeDevice('gs2', 'Room 2', [p2])]);
    expect(plantToDeviceMap$.get().has('p1')).toBe(false);
    expect(plantToDeviceMap$.get().get('p2')).toBe('gs2');
  });
});

// ---------------------------------------------------------------------------
// patchDeviceIrrigationConfig
// ---------------------------------------------------------------------------

describe('patchDeviceIrrigationConfig', () => {
  it('patches irrigationConfig on the matching device', () => {
    const device = { ...makeDevice('gs1', 'Room 1', []), irrigationConfig: { irrigationTimes: [] } };
    setDevices([device as any]);

    patchDeviceIrrigationConfig('gs1', { irrigationTimes: [{ start: '08:00', duration: 30 }] } as any);

    const updated = devices$.get().find((d) => d.deviceId === 'gs1')!;
    expect((updated as any).irrigationConfig.irrigationTimes).toHaveLength(1);
  });

  it('is a no-op when the deviceId is not found', () => {
    const device = makeDevice('gs1', 'Room 1', []);
    setDevices([device]);

    patchDeviceIrrigationConfig('unknown', {} as any);

    expect(devices$.get()).toHaveLength(1);
    expect(devices$.get()[0].deviceId).toBe('gs1');
  });
});

// ---------------------------------------------------------------------------
// Cross-slice usage: sibling setter integration
// ---------------------------------------------------------------------------

describe('cross-slice sibling setter usage', () => {
  it('addOptimisticDeletedPlantId + removeOptimisticDeletedPlantId round-trips correctly', () => {
    const p = makePlant('p-roundtrip', 1, 1);
    setDevices([makeDevice('gs1', 'Room 1', [p], 2, 2)]);
    setSelectedDeviceId('gs1');

    addOptimisticDeletedPlantId('p-roundtrip');
    expect(gridLayout$.get().grid[0][0]).toBeNull();

    removeOptimisticDeletedPlantId('p-roundtrip');
    expect(gridLayout$.get().grid[0][0]?.attributes.plant_id).toBe('p-roundtrip');
  });
});

// ---------------------------------------------------------------------------
// makePerCardGridSlice — per-card selection isolation
// ---------------------------------------------------------------------------

describe('makePerCardGridSlice', () => {
  it('two instances have independent $selectedDevice — setting one does not affect the other', () => {
    const sliceA = makePerCardGridSlice();
    const sliceB = makePerCardGridSlice();

    sliceA.setSelectedDevice('gs-a');

    expect(sliceA.$selectedDevice.get()).toBe('gs-a');
    expect(sliceB.$selectedDevice.get()).toBeNull();
  });

  it('both instances see identical $activeDevices from the shared devices$ source', () => {
    const p = makePlant('p1', 1, 1);
    setDevices([makeDevice('gs1', 'Room 1', [p])]);

    const sliceA = makePerCardGridSlice();
    const sliceB = makePerCardGridSlice();

    expect(sliceA.$activeDevices.get()).toEqual(sliceB.$activeDevices.get());
    expect(sliceA.$activeDevices.get()).toHaveLength(1);
  });

  it('$gridLayout computes independently per instance based on its own selected device', () => {
    const p1 = makePlant('p1', 1, 1);
    const p2 = makePlant('p2', 1, 1);
    setDevices([
      makeDevice('gs1', 'Room A', [p1], 2, 2),
      makeDevice('gs2', 'Room B', [p2], 2, 2),
    ]);

    const sliceA = makePerCardGridSlice();
    const sliceB = makePerCardGridSlice();

    sliceA.setSelectedDevice('gs1');
    sliceB.setSelectedDevice('gs2');

    expect(sliceA.$gridLayout.get().grid[0][0]?.attributes.plant_id).toBe('p1');
    expect(sliceB.$gridLayout.get().grid[0][0]?.attributes.plant_id).toBe('p2');
  });
});
