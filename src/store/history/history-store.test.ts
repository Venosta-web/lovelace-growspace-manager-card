import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GrowspaceHistoryStore } from './history-store';
import type { DataService } from '../../services/data-service';
import type { GrowspaceDataStore } from '../core/data-store';
import type { GrowspaceDevice } from '../../types';
import { atom } from 'nanostores';
import { setDevices } from '../../slices/grid';

const makeStore = () => {
  const mockDataStore = {} as unknown as GrowspaceDataStore;
  const mockDataService = {} as DataService;
  const $selectedDevice = atom<string | null>(null);
  return new GrowspaceHistoryStore(mockDataService, mockDataStore, $selectedDevice);
};

describe('GrowspaceHistoryStore.$analyticsViewState', () => {
  let store: GrowspaceHistoryStore;

  beforeEach(() => {
    store = makeStore();
  });

  it('exposes a $analyticsViewState atom', () => {
    expect(store.$analyticsViewState).toBeDefined();
    expect(typeof store.$analyticsViewState.get).toBe('function');
  });

  it('contains historyLoading, historyLoaded, activeEnvGraphs, linkedGraphGroups, combinedHistory, graphRanges', () => {
    const state = store.$analyticsViewState.get();
    expect(state).toHaveProperty('historyLoading');
    expect(state).toHaveProperty('historyLoaded');
    expect(state).toHaveProperty('activeEnvGraphs');
    expect(state).toHaveProperty('linkedGraphGroups');
    expect(state).toHaveProperty('combinedHistory');
    expect(state).toHaveProperty('graphRanges');
  });

  it('updates when historyLoaded flips to true', () => {
    store.$historyLoaded.set(true);
    expect(store.$analyticsViewState.get().historyLoaded).toBe(true);
  });

  it('updates when combinedHistory changes via historyCache', () => {
    store.$historyCache.set({ temperature: [{ value: '22', last_changed: '2024-01-01' } as any] });
    const state = store.$analyticsViewState.get();
    expect(state.combinedHistory.temperature).toHaveLength(1);
  });

  it('updates when graphRanges changes', () => {
    store.$graphRanges.set({ gs1: '7d' as any });
    expect(store.$analyticsViewState.get().graphRanges).toEqual({ gs1: '7d' });
  });
});

describe('GrowspaceHistoryStore.$headerHistoryState', () => {
  let store: GrowspaceHistoryStore;

  beforeEach(() => {
    store = makeStore();
  });

  it('exposes a $headerHistoryState atom', () => {
    expect(store.$headerHistoryState).toBeDefined();
    expect(typeof store.$headerHistoryState.get).toBe('function');
  });

  it('contains historyCache, historyLoading, activeEnvGraphs, linkedGraphGroups', () => {
    const state = store.$headerHistoryState.get();
    expect(state).toHaveProperty('historyCache');
    expect(state).toHaveProperty('historyLoading');
    expect(state).toHaveProperty('activeEnvGraphs');
    expect(state).toHaveProperty('linkedGraphGroups');
  });

  it('reflects initial values', () => {
    const state = store.$headerHistoryState.get();
    expect(state.historyLoading).toBe(false);
    expect(state.activeEnvGraphs).toBeInstanceOf(Set);
    expect(state.activeEnvGraphs.size).toBe(0);
    expect(state.linkedGraphGroups).toEqual([]);
  });

  it('updates when historyLoading changes', () => {
    store.$historyLoading.set(true);
    expect(store.$headerHistoryState.get().historyLoading).toBe(true);
  });

  it('updates when activeEnvGraphs changes', () => {
    store.$activeEnvGraphs.set(new Set(['temperature', 'humidity']));
    const state = store.$headerHistoryState.get();
    expect(state.activeEnvGraphs.has('temperature')).toBe(true);
    expect(state.activeEnvGraphs.size).toBe(2);
  });

  it('updates when linkedGraphGroups changes', () => {
    store.$linkedGraphGroups.set([['temperature', 'humidity']]);
    expect(store.$headerHistoryState.get().linkedGraphGroups).toEqual([
      ['temperature', 'humidity'],
    ]);
  });
});

// ---------------------------------------------------------------------------
// Transport behavior tests (migrated from tests/unit/services/api/history-api.spec.ts)
// These tests verify store-observable behavior, not DataService internals.
// ---------------------------------------------------------------------------

const TEMP_ENTITY = 'sensor.tent1_temperature';

const makeTransportStore = (getHistoryStats: ReturnType<typeof vi.fn>) => {
  const mockDataService = {
    getHistoryStats,
    hass: { states: {} },
  } as unknown as DataService;

  const device = {
    deviceId: 'dev1',
    name: 'Tent 1',
    environmentAttributes: { temperatureSensor: TEMP_ENTITY },
  } as unknown as GrowspaceDevice;

  setDevices([device]);
  const mockDataStore = {} as unknown as GrowspaceDataStore;
  const $selectedDevice = atom<string | null>('dev1');
  return new GrowspaceHistoryStore(mockDataService, mockDataStore, $selectedDevice);
};

describe('GrowspaceHistoryStore - history transport', () => {
  afterEach(() => {
    setDevices([]);
  });

  beforeEach(() => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {});
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);
  });

  it('fetch success: $historyCache is populated and $historyLoaded becomes true', async () => {
    const point = { entity_id: TEMP_ENTITY, state: '22', last_changed: '2024-01-01T00:00:00Z', last_updated: '2024-01-01T00:00:00Z', attributes: {} };
    const getHistoryStats = vi.fn().mockResolvedValue({ [TEMP_ENTITY]: [point] });
    const store = makeTransportStore(getHistoryStats);

    await store.loadHistoryOnDemand();

    expect(store.$historyCache.get()['temperature']).toHaveLength(1);
    expect(store.$historyCache.get()['temperature'][0].state).toBe('22');
    expect(store.$historyLoaded.get()).toBe(true);
    expect(store.$historyLoading.get()).toBe(false);
  });

  it('WS fallback to REST: store receives data when getHistoryStats falls back internally', async () => {
    // DataService.getHistoryStats resolves via REST fallback — the store only sees the resolved value
    const point = { entity_id: TEMP_ENTITY, state: '18', last_changed: '2024-01-02T00:00:00Z', last_updated: '2024-01-02T00:00:00Z', attributes: {} };
    const getHistoryStats = vi.fn().mockResolvedValue({ [TEMP_ENTITY]: [point] });
    const store = makeTransportStore(getHistoryStats);

    await store.loadHistoryOnDemand();

    expect(store.$historyCache.get()['temperature']).toHaveLength(1);
    expect(store.$historyLoaded.get()).toBe(true);
  });

  it('fetch error: $historyError is set and $historyLoaded stays false', async () => {
    const getHistoryStats = vi.fn().mockRejectedValue(new Error('Transport failure'));
    const store = makeTransportStore(getHistoryStats);

    await store.loadHistoryOnDemand();

    expect(store.$historyError.get()).toContain('Transport failure');
    expect(store.$historyLoaded.get()).toBe(false);
    expect(store.$historyLoading.get()).toBe(false);
  });

  it('loadHistoryOnDemand is a no-op when already loaded', async () => {
    const getHistoryStats = vi.fn().mockResolvedValue({});
    const store = makeTransportStore(getHistoryStats);
    store.$historyLoaded.set(true);

    await store.loadHistoryOnDemand();

    expect(getHistoryStats).not.toHaveBeenCalled();
  });

  it('loadHistoryOnDemand is a no-op when already loading', async () => {
    const getHistoryStats = vi.fn().mockResolvedValue({});
    const store = makeTransportStore(getHistoryStats);
    store.$historyLoading.set(true);

    await store.loadHistoryOnDemand();

    expect(getHistoryStats).not.toHaveBeenCalled();
  });
});
