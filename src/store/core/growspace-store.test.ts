import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GrowspaceStore } from './growspace-store';
import { GrowspaceSharedStore } from './growspace-shared-store';
import { setDevices, optimisticDeletedPlantIds$ } from '../../slices/grid';
import { nutrientPresets$, ipmPresets$, nutrientInventory$ } from '../../slices/nutrient';
import * as plantSlice from '../../slices/plant';

vi.mock('../../slices/plant', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../../slices/plant')>();
  return { ...mod, updatePlant: vi.fn() };
});

function makeStore() {
  const shared = new GrowspaceSharedStore();
  const store = new GrowspaceStore(shared);
  return { store, shared };
}

function makeHass(overrides: Record<string, unknown> = {}) {
  return { language: 'en', states: {}, ...overrides } as any;
}

describe('GrowspaceStore – computed atoms', () => {
  let store: GrowspaceStore;

  beforeEach(() => {
    ({ store } = makeStore());
  });

  afterEach(() => {
    setDevices([]);
    nutrientPresets$.set(null);
    ipmPresets$.set(null);
    nutrientInventory$.set(null);
  });

  it('$plantCardViewState exposes isEditMode, selectedPlants, devices, nutrientPresets', () => {
    const state = store.$plantCardViewState.get();
    expect(state).toHaveProperty('isEditMode');
    expect(state).toHaveProperty('selectedPlants');
    expect(state).toHaveProperty('devices');
    expect(state).toHaveProperty('nutrientPresets');
  });

  it('$plantCardViewState defaults nutrientPresets to {} when atom is null', () => {
    nutrientPresets$.set(null);
    expect(store.$plantCardViewState.get().nutrientPresets).toEqual({});
  });

  it('$sharedCardViewState exposes grid and ui', () => {
    const state = store.$sharedCardViewState.get();
    expect(state).toHaveProperty('grid');
    expect(state).toHaveProperty('ui');
  });

  it('$viewStandardState exposes devices', () => {
    const device = { deviceId: 'gs1', name: 'GS1', plants: [] } as any;
    setDevices([device]);
    expect(store.$viewStandardState.get().devices).toHaveLength(1);
  });

  it('$headerState exposes devices, nutrientInventory, history', () => {
    const state = store.$headerState.get();
    expect(state).toHaveProperty('devices');
    expect(state).toHaveProperty('nutrientInventory');
    expect(state).toHaveProperty('history');
  });

  it('$mainCardState exposes grid, ui, strainLibrary', () => {
    const state = store.$mainCardState.get();
    expect(state).toHaveProperty('grid');
    expect(state).toHaveProperty('ui');
    expect(state).toHaveProperty('strainLibrary');
  });

  it('$dialogHostState defaults nutrientPresets and ipmPresets to {} when atoms are null', () => {
    nutrientPresets$.set(null);
    ipmPresets$.set(null);
    const state = store.$dialogHostState.get();
    expect(state.nutrientPresets).toEqual({});
    expect(state.ipmPresets).toEqual({});
  });
});

describe('GrowspaceStore – initialize and destroy', () => {
  let store: GrowspaceStore;

  beforeEach(() => {
    ({ store } = makeStore());
  });

  it('initialize sets hass and calls updateHass', () => {
    const updateSpy = vi.spyOn(store, 'updateHass');
    const hass = makeHass();
    store.initialize(hass);
    expect(store.hass).toBe(hass);
    expect(updateSpy).toHaveBeenCalledWith(hass);
  });

  it('destroy calls history.destroy and eventBus.clear', () => {
    const historySpy = vi.spyOn(store.history, 'destroy');
    const busSpy = vi.spyOn(store.eventBus, 'clear');
    store.destroy();
    expect(historySpy).toHaveBeenCalledOnce();
    expect(busSpy).toHaveBeenCalledOnce();
  });

  it('destroy unsubscribes from shared stale events', () => {
    const refreshCb = vi.fn().mockResolvedValue(undefined);
    store.setRefreshCallback(refreshCb);
    store.destroy();
    (store as any)._shared._handleEvent({});
    expect(refreshCb).not.toHaveBeenCalled();
  });
});

describe('GrowspaceStore – updateHass', () => {
  let store: GrowspaceStore;
  let shared: GrowspaceSharedStore;

  beforeEach(() => {
    ({ store, shared } = makeStore());
  });

  it('propagates hass to shared store', () => {
    const sharedSpy = vi.spyOn(shared, 'updateHass');
    const hass = makeHass();
    store.updateHass(hass);
    expect(sharedSpy).toHaveBeenCalledWith(hass);
    expect(store.hass).toBe(hass);
  });

  it('updates ui language when hass.language differs', () => {
    const spy = vi.spyOn(store.ui, 'setLanguage');
    store.updateHass(makeHass({ language: 'de' }));
    expect(spy).toHaveBeenCalledWith('de');
  });

  it('does not update ui language when hass.language is unchanged', () => {
    store.ui.$language.set('en');
    const spy = vi.spyOn(store.ui, 'setLanguage');
    store.updateHass(makeHass({ language: 'en' }));
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('GrowspaceStore – refreshData', () => {
  let store: GrowspaceStore;

  beforeEach(() => {
    ({ store } = makeStore());
  });

  afterEach(() => {
    setDevices([]);
    optimisticDeletedPlantIds$.set(new Set());
  });

  it('calls refreshCallback when one is set', async () => {
    const refreshCb = vi.fn().mockResolvedValue(undefined);
    store.setRefreshCallback(refreshCb);
    await store.refreshData();
    expect(refreshCb).toHaveBeenCalledOnce();
  });

  it('does nothing when no refreshCallback is set', async () => {
    await expect(store.refreshData()).resolves.not.toThrow();
  });
});

describe('GrowspaceStore – _pruneOptimisticDeletions', () => {
  let store: GrowspaceStore;

  beforeEach(() => {
    ({ store } = makeStore());
    store.setRefreshCallback(vi.fn().mockResolvedValue(undefined));
  });

  afterEach(() => {
    setDevices([]);
    optimisticDeletedPlantIds$.set(new Set());
  });

  it('removes optimistic IDs that no longer appear in any device plants', async () => {
    optimisticDeletedPlantIds$.set(new Set(['gone-plant']));
    setDevices([]);
    await store.refreshData();
    expect(optimisticDeletedPlantIds$.get().has('gone-plant')).toBe(false);
  });

  it('keeps optimistic IDs that still appear in device plants', async () => {
    const plant = { entity_id: 'sensor.keep-plant', attributes: { plant_id: 'keep-plant' } } as any;
    setDevices([{ deviceId: 'gs1', name: 'GS1', plants: [plant] } as any]);
    optimisticDeletedPlantIds$.set(new Set(['keep-plant']));
    await store.refreshData();
    expect(optimisticDeletedPlantIds$.get().has('keep-plant')).toBe(true);
  });

  it('does nothing when optimistic set is empty', async () => {
    optimisticDeletedPlantIds$.set(new Set());
    await store.refreshData();
    expect(optimisticDeletedPlantIds$.get().size).toBe(0);
  });
});

describe('GrowspaceStore – handleDeviceChange', () => {
  let store: GrowspaceStore;

  beforeEach(() => {
    ({ store } = makeStore());
  });

  it('handleDeviceChange sets selected device on grid', () => {
    store.handleDeviceChange('gs2');
    expect(store.grid.$selectedDevice.get()).toBe('gs2');
  });
});

describe('GrowspaceStore – updateGrid', () => {
  let store: GrowspaceStore;

  beforeEach(() => {
    ({ store } = makeStore());
    store.setRefreshCallback(vi.fn().mockResolvedValue(undefined));
  });

  it('calls refreshData', () => {
    const refreshSpy = vi.spyOn(store, 'refreshData');
    store.updateGrid();
    expect(refreshSpy).toHaveBeenCalledOnce();
  });
});

describe('GrowspaceStore – movePlant', () => {
  let store: GrowspaceStore;

  beforeEach(() => {
    ({ store } = makeStore());
    store.setRefreshCallback(vi.fn().mockResolvedValue(undefined));
  });

  it('calls updatePlant and then updateGrid on success', async () => {
    vi.mocked(plantSlice.updatePlant).mockResolvedValue(undefined as any);
    const gridSpy = vi.spyOn(store, 'updateGrid');
    const plant = { entity_id: 'sensor.p1', attributes: { plant_id: 'p1' } } as any;
    await store.movePlant(plant, 1, 2);
    expect(plantSlice.updatePlant).toHaveBeenCalledWith('p1', { row: 1, col: 2 });
    expect(gridSpy).toHaveBeenCalledOnce();
  });

  it('uses entity_id fallback when plant_id is absent', async () => {
    vi.mocked(plantSlice.updatePlant).mockResolvedValue(undefined as any);
    const plant = { entity_id: 'sensor.my-plant', attributes: {} } as any;
    await store.movePlant(plant, 0, 0);
    expect(plantSlice.updatePlant).toHaveBeenCalledWith('my-plant', expect.any(Object));
  });

  it('logs error and skips updateGrid when updatePlant rejects', async () => {
    vi.mocked(plantSlice.updatePlant).mockRejectedValue(new Error('move failed'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
    const gridSpy = vi.spyOn(store, 'updateGrid');
    const plant = { entity_id: 'sensor.p1', attributes: { plant_id: 'p1' } } as any;
    await store.movePlant(plant, 0, 0);
    expect(consoleSpy).toHaveBeenCalled();
    expect(gridSpy).not.toHaveBeenCalled();
  });
});
