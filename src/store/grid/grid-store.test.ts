import { describe, it, expect, beforeEach } from 'vitest';
import { atom } from 'nanostores';
import { GrowspaceGridStore } from './grid-store';
import type { GrowspaceDataStore } from '../core/data-store';
import type { GrowspaceDevice, PlantEntity } from '../../types';

const makePlant = (id: string, row: number, col: number): PlantEntity =>
  ({
    entity_id: `sensor.${id}`,
    state: 'vegetative',
    attributes: { plant_id: id, row, col, growspace_id: 'gs1', strain: 'Test' },
  } as unknown as PlantEntity);

const makeDevice = (id: string, plants: PlantEntity[]): GrowspaceDevice =>
  ({
    deviceId: id,
    name: id,
    plantsPerRow: 2,
    rows: 2,
    plants,
  } as unknown as GrowspaceDevice);

describe('GrowspaceGridStore.$gridViewState', () => {
  let mockDataStore: Pick<
    GrowspaceDataStore,
    '$devices' | '$optimisticDeletedPlantIds'
  >;
  let store: GrowspaceGridStore;

  beforeEach(() => {
    mockDataStore = {
      $devices: atom<GrowspaceDevice[]>([]),
      $optimisticDeletedPlantIds: atom<Set<string>>(new Set()),
    };
    store = new GrowspaceGridStore(mockDataStore as GrowspaceDataStore);
  });

  it('exposes a $gridViewState atom', () => {
    expect(store.$gridViewState).toBeDefined();
    expect(typeof store.$gridViewState.get).toBe('function');
  });

  it('contains devices, gridLayout, growspaceOptions, and selectedDevice', () => {
    const plant = makePlant('p1', 0, 0);
    const device = makeDevice('gs1', [plant]);
    mockDataStore.$devices.set([device]);
    store.$selectedDevice.set('gs1');

    const state = store.$gridViewState.get();

    expect(state.devices).toHaveLength(1);
    expect(state.devices[0].deviceId).toBe('gs1');
    expect(state.selectedDevice).toBe('gs1');
    expect(state.growspaceOptions).toEqual({ gs1: 'gs1' });
    expect(state.gridLayout.grid).toHaveLength(2);
  });

  it('updates devices, gridLayout, and growspaceOptions together when devices change', () => {
    const plant1 = makePlant('p1', 0, 0);
    const device1 = makeDevice('gs1', [plant1]);
    mockDataStore.$devices.set([device1]);
    store.$selectedDevice.set('gs1');

    const plant2 = makePlant('p2', 0, 1);
    const device2 = makeDevice('gs2', [plant2]);
    mockDataStore.$devices.set([device1, device2]);

    const state = store.$gridViewState.get();
    expect(state.devices).toHaveLength(2);
    expect(state.growspaceOptions).toHaveProperty('gs2');
  });

  it('excludes optimistically deleted plants from devices in gridViewState', () => {
    const plant = makePlant('p1', 0, 0);
    const device = makeDevice('gs1', [plant]);
    mockDataStore.$devices.set([device]);
    store.$selectedDevice.set('gs1');
    mockDataStore.$optimisticDeletedPlantIds.set(new Set(['p1']));

    const state = store.$gridViewState.get();
    expect(state.devices[0].plants).toHaveLength(0);
  });

  it('returns empty grid when no device is selected', () => {
    const device = makeDevice('gs1', []);
    mockDataStore.$devices.set([device]);

    const state = store.$gridViewState.get();
    expect(state.selectedDevice).toBeNull();
    expect(state.gridLayout.grid).toHaveLength(0);
    expect(state.gridLayout.effectiveRows).toBe(0);
  });
});
