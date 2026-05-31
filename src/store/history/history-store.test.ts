import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
import { GrowspaceHistoryStore } from './history-store';
import type { DataService } from '../../services/data-service';
import type { GrowspaceDevice } from '../../types';
import { atom } from 'nanostores';
import { setDevices } from '../../slices/grid';

const makeStore = () => {
  const mockDataService = {} as DataService;
  const $selectedDevice = atom<string | null>(null);
  return new GrowspaceHistoryStore(mockDataService, $selectedDevice);
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
  const $selectedDevice = atom<string | null>('dev1');
  return new GrowspaceHistoryStore(mockDataService, $selectedDevice);
};

describe('GrowspaceHistoryStore - history transport', () => {
  afterEach(() => {
    setDevices([]);
  });

  beforeEach(() => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { });
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

// ---------------------------------------------------------------------------
// Action methods
// ---------------------------------------------------------------------------

describe('GrowspaceHistoryStore - action methods', () => {
  let store: GrowspaceHistoryStore;

  beforeEach(() => {
    store = makeStore();
  });

  it('setHistoryData updates the cache for the given metric', () => {
    const data = [{ value: '22', last_changed: '2024-01-01T00:00:00Z' } as any];
    store.setHistoryData('temperature', data);
    expect(store.$historyCache.get()['temperature']).toHaveLength(1);
  });

  it('updateLastTimestamp records last_updated when present', () => {
    const data = [{ last_updated: '2024-01-01T12:00:00Z', last_changed: '' } as any];
    store.updateLastTimestamp('temperature', data);
    expect(store.$lastTimestamps.get()['temperature']).toBe('2024-01-01T12:00:00Z');
  });

  it('updateLastTimestamp falls back to last_changed when last_updated absent', () => {
    const data = [{ last_changed: '2024-01-01T08:00:00Z' } as any];
    store.updateLastTimestamp('humidity', data);
    expect(store.$lastTimestamps.get()['humidity']).toBe('2024-01-01T08:00:00Z');
  });

  it('updateLastTimestamp is a no-op for empty arrays', () => {
    store.updateLastTimestamp('temperature', []);
    expect(store.$lastTimestamps.get()['temperature']).toBeUndefined();
  });

  it('clearHistoryCache resets cache, timestamps, loaded, and error', () => {
    store.setHistoryData('temperature', [{ value: '22' } as any]);
    store.$historyLoaded.set(true);
    store.$historyError.set('some error');

    store.clearHistoryCache();

    expect(store.$historyCache.get()).toEqual({});
    expect(store.$lastTimestamps.get()).toEqual({});
    expect(store.$historyLoaded.get()).toBe(false);
    expect(store.$historyError.get()).toBeNull();
  });

  it('setGraphRange stores the range and marks history as not loaded', () => {
    store.$historyLoaded.set(true);
    store.setGraphRange('dev1', '7d');
    expect(store.$graphRanges.get()['dev1']).toBe('7d');
    expect(store.$historyLoaded.get()).toBe(false);
  });

  it('getGraphRange returns 24h when deviceId is null', () => {
    expect(store.getGraphRange(null)).toBe('24h');
  });

  it('getGraphRange returns 24h when no range stored for device', () => {
    expect(store.getGraphRange('unknown-device')).toBe('24h');
  });

  it('getGraphRange returns stored range for device', () => {
    store.setGraphRange('dev1', '1h');
    expect(store.getGraphRange('dev1')).toBe('1h');
  });

  it('toggleEnvGraph adds the metric and returns true when not active', () => {
    const result = store.toggleEnvGraph('temperature');
    expect(result).toBe(true);
    expect(store.$activeEnvGraphs.get().has('temperature')).toBe(true);
  });

  it('toggleEnvGraph removes the metric and returns false when already active', () => {
    store.$activeEnvGraphs.set(new Set(['temperature']));
    const result = store.toggleEnvGraph('temperature');
    expect(result).toBe(false);
    expect(store.$activeEnvGraphs.get().has('temperature')).toBe(false);
  });

  it('getHistoryForMetric returns null when metric not in cache', () => {
    expect(store.getHistoryForMetric('temperature')).toBeNull();
  });

  it('getHistoryForMetric returns data when metric is in cache', () => {
    const data = [{ value: '22' } as any];
    store.setHistoryData('temperature', data);
    expect(store.getHistoryForMetric('temperature')).toEqual(data);
  });
});

// ---------------------------------------------------------------------------
// Graph linking / unlinking
// ---------------------------------------------------------------------------

describe('GrowspaceHistoryStore - graph linking', () => {
  let store: GrowspaceHistoryStore;

  beforeEach(() => {
    store = makeStore();
  });

  it('linkGraphs creates a new group and activates both metrics', () => {
    store.linkGraphs('temperature', 'humidity');
    const groups = store.$linkedGraphGroups.get();
    expect(groups).toHaveLength(1);
    expect(groups[0]).toEqual(expect.arrayContaining(['temperature', 'humidity']));
    expect(store.$activeEnvGraphs.get().has('temperature')).toBe(true);
    expect(store.$activeEnvGraphs.get().has('humidity')).toBe(true);
  });

  it('linkGraphs merges into an existing group when one metric already belongs', () => {
    store.linkGraphs('temperature', 'humidity');
    store.linkGraphs('humidity', 'vpd');
    const groups = store.$linkedGraphGroups.get();
    expect(groups).toHaveLength(1);
    expect(groups[0]).toEqual(expect.arrayContaining(['temperature', 'humidity', 'vpd']));
  });

  it('unlinkGraphGroup removes the group at the given index', () => {
    store.linkGraphs('temperature', 'humidity');
    store.unlinkGraphGroup(0);
    expect(store.$linkedGraphGroups.get()).toHaveLength(0);
  });

  it('unlinkGraphGroup ignores out-of-range indices', () => {
    store.linkGraphs('temperature', 'humidity');
    store.unlinkGraphGroup(5);
    expect(store.$linkedGraphGroups.get()).toHaveLength(1);
  });

  it('unlinkGraphMetric removes a metric and drops resulting single-member groups', () => {
    store.linkGraphs('temperature', 'humidity');
    store.unlinkGraphMetric('temperature');
    // humidity alone would be a single-member group — should be dropped
    expect(store.$linkedGraphGroups.get()).toHaveLength(0);
  });

  it('unlinkGraphMetric keeps groups that still have two or more members', () => {
    store.linkGraphs('temperature', 'humidity');
    store.linkGraphs('humidity', 'vpd'); // merges into same group: [temperature, humidity, vpd]
    store.unlinkGraphMetric('temperature');
    // humidity + vpd still form a valid group
    expect(store.$linkedGraphGroups.get()).toHaveLength(1);
    expect(store.$linkedGraphGroups.get()[0]).toEqual(expect.arrayContaining(['humidity', 'vpd']));
  });

  it('clearAllLinks empties all groups', () => {
    store.linkGraphs('temperature', 'humidity');
    store.clearAllLinks();
    expect(store.$linkedGraphGroups.get()).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// localStorage: loading on device selection
// ---------------------------------------------------------------------------

describe('GrowspaceHistoryStore - localStorage', () => {
  afterEach(() => {
    setDevices([]);
    vi.restoreAllMocks();
  });

  it('loads valid cached data from localStorage on device selection', () => {
    const point = {
      value: '22',
      last_changed: '2024-01-01T00:00:00Z',
      last_updated: '2024-01-01T00:00:00Z',
    };
    const stored = {
      version: 1,
      timestamp: Date.now(),
      history: { temperature: [point] },
      timestamps: { temperature: '2024-01-01T00:00:00Z' },
    };
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(JSON.stringify(stored));

    const device = {
      deviceId: 'dev1',
      name: 'Tent 1',
      environmentAttributes: {},
    } as unknown as GrowspaceDevice;
    setDevices([device]);
    const $selectedDevice = atom<string | null>('dev1');
    const store = new GrowspaceHistoryStore({} as DataService, $selectedDevice);

    expect(store.$historyCache.get()['temperature']).toHaveLength(1);
    expect(store.$lastTimestamps.get()['temperature']).toBe('2024-01-01T00:00:00Z');
    // Not marked as fully loaded — preview only, fresh fetch will follow
    expect(store.$historyLoaded.get()).toBe(false);
  });

  it('discards expired localStorage data and removes the key', () => {
    const stored = {
      version: 1,
      timestamp: Date.now() - 25 * 60 * 60 * 1000, // 25 hours ago
      history: { temperature: [] },
      timestamps: {},
    };
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(JSON.stringify(stored));
    const removeSpy = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { });

    const device = {
      deviceId: 'dev1',
      name: 'Tent 1',
      environmentAttributes: {},
    } as unknown as GrowspaceDevice;
    setDevices([device]);
    const $selectedDevice = atom<string | null>('dev1');
    new GrowspaceHistoryStore({} as DataService, $selectedDevice);

    expect(removeSpy).toHaveBeenCalled();
  });

  it('handles malformed localStorage JSON without throwing', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue('{not valid json}');

    const $selectedDevice = atom<string | null>('dev1');
    expect(() => new GrowspaceHistoryStore({} as DataService, $selectedDevice)).not.toThrow();
  });

  it('loads cached data that has no timestamps field gracefully', () => {
    const stored = {
      version: 1,
      timestamp: Date.now(),
      history: { temperature: [] },
      // intentionally no `timestamps` field
    };
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(JSON.stringify(stored));

    const device = {
      deviceId: 'dev1',
      name: 'Tent 1',
      environmentAttributes: {},
    } as unknown as GrowspaceDevice;
    setDevices([device]);
    const $selectedDevice = atom<string | null>('dev1');
    const store = new GrowspaceHistoryStore({} as DataService, $selectedDevice);

    expect(store.$lastTimestamps.get()).toEqual({});
  });

  it('swallows storage errors from localStorage.setItem', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceeded');
    });

    const point = {
      value: '22',
      last_changed: '2024-01-01T00:00:00Z',
      last_updated: '2024-01-01T00:00:00Z',
    };
    const getHistoryStats = vi.fn().mockResolvedValue({ [TEMP_ENTITY]: [point] });
    const device = {
      deviceId: 'dev1',
      name: 'Tent 1',
      environmentAttributes: { temperatureSensor: TEMP_ENTITY },
    } as unknown as GrowspaceDevice;
    setDevices([device]);
    const $selectedDevice = atom<string | null>('dev1');
    const store = new GrowspaceHistoryStore(
      { getHistoryStats, hass: { states: {} } } as unknown as DataService,
      $selectedDevice
    );

    await expect(store.loadHistoryOnDemand()).resolves.not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// _mergeDeltaData (via private access)
// ---------------------------------------------------------------------------

describe('GrowspaceHistoryStore - _mergeDeltaData', () => {
  let store: GrowspaceHistoryStore;

  beforeEach(() => {
    store = makeStore();
  });

  it('sets data directly when no existing data for the metric', () => {
    const data = [{ value: '22', last_updated: '2024-01-01T01:00:00Z', last_changed: '' } as any];
    (store as any)._mergeDeltaData('temperature', data);
    expect(store.$historyCache.get()['temperature']).toHaveLength(1);
    expect(store.$lastTimestamps.get()['temperature']).toBe('2024-01-01T01:00:00Z');
  });

  it('appends newer data points to existing cache', () => {
    const existing = [{ value: '20', last_updated: '2024-01-01T00:00:00Z', last_changed: '' } as any];
    store.setHistoryData('temperature', existing);
    const delta = [{ value: '22', last_updated: '2024-01-01T01:00:00Z', last_changed: '' } as any];
    (store as any)._mergeDeltaData('temperature', delta);
    expect(store.$historyCache.get()['temperature']).toHaveLength(2);
  });

  it('ignores delta points that are not newer than existing data', () => {
    const existing = [{ value: '20', last_updated: '2024-01-01T01:00:00Z', last_changed: '' } as any];
    store.setHistoryData('temperature', existing);
    const olderDelta = [{ value: '18', last_updated: '2024-01-01T00:00:00Z', last_changed: '' } as any];
    (store as any)._mergeDeltaData('temperature', olderDelta);
    expect(store.$historyCache.get()['temperature']).toHaveLength(1);
  });

  it('uses last_changed timestamp when last_updated is absent in a delta point', () => {
    const existing = [{ value: '20', last_changed: '2024-01-01T00:00:00Z' } as any];
    store.setHistoryData('temperature', existing);
    // delta point has only last_changed (no last_updated)
    const delta = [{ value: '22', last_changed: '2024-01-01T01:00:00Z' } as any];
    (store as any)._mergeDeltaData('temperature', delta);
    expect(store.$historyCache.get()['temperature']).toHaveLength(2);
  });

  it('filters delta using last_changed when delta lacks last_updated but existing has it', () => {
    const existing = [{ value: '20', last_updated: '2024-01-01T00:00:00Z', last_changed: '' } as any];
    store.setHistoryData('temperature', existing);
    const delta = [{ value: '22', last_changed: '2024-01-01T01:00:00Z' } as any];
    (store as any)._mergeDeltaData('temperature', delta);
    expect(store.$historyCache.get()['temperature']).toHaveLength(2);
  });

  it('discards an older delta point that uses only last_changed for its timestamp', () => {
    const existing = [{ value: '20', last_updated: '2024-01-01T02:00:00Z', last_changed: '' } as any];
    store.setHistoryData('temperature', existing);
    // delta has only last_changed and it's OLDER than existing — should be discarded
    const olderDelta = [{ value: '18', last_changed: '2024-01-01T00:00:00Z' } as any];
    (store as any)._mergeDeltaData('temperature', olderDelta);
    expect(store.$historyCache.get()['temperature']).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// calculateTimeRange & _getIntervalForRange (private, tested directly)
// ---------------------------------------------------------------------------

describe('GrowspaceHistoryStore - calculateTimeRange', () => {
  let store: GrowspaceHistoryStore;

  beforeEach(() => {
    store = makeStore();
  });

  it.each<[string, number]>([
    ['1h', 60 * 60 * 1000],
    ['6h', 6 * 60 * 60 * 1000],
    ['24h', 24 * 60 * 60 * 1000],
    ['7d', 7 * 24 * 60 * 60 * 1000],
  ])('range %s produces a window approximately %i ms wide', (range, expectedMs) => {
    const { start, end } = (store as any).calculateTimeRange(range);
    const elapsed = end.getTime() - start.getTime();
    expect(elapsed).toBeGreaterThanOrEqual(expectedMs - 100);
    expect(elapsed).toBeLessThanOrEqual(expectedMs + 100);
  });
});

describe('GrowspaceHistoryStore - _getIntervalForRange', () => {
  let store: GrowspaceHistoryStore;

  beforeEach(() => {
    store = makeStore();
  });

  it.each<[string, number]>([
    ['7d', 240],
    ['24h', 30],
    ['6h', 15],
    ['1h', 5],
    ['unknown', 15],
  ])('range %s returns interval %i', (range, expected) => {
    expect((store as any)._getIntervalForRange(range)).toBe(expected);
  });
});

// ---------------------------------------------------------------------------
// getEntityIdsForMetric / getEntityIdForMetric (private, tested directly)
// ---------------------------------------------------------------------------

describe('GrowspaceHistoryStore - getEntityIdsForMetric', () => {
  let store: GrowspaceHistoryStore;

  beforeEach(() => {
    store = makeStore();
  });

  it('returns plural sensor ids when temperatureSensors array is present', () => {
    const device = {
      deviceId: 'dev1',
      name: 'Tent 1',
      environmentAttributes: {
        temperatureSensors: ['sensor.tent1_temp1', 'sensor.tent1_temp2'],
      },
    } as unknown as GrowspaceDevice;
    const ids = (store as any).getEntityIdsForMetric(device, 'temperature');
    expect(ids).toEqual(['sensor.tent1_temp1', 'sensor.tent1_temp2']);
  });

  it('derives optimal entity id from overviewEntityId slug', () => {
    const device = {
      deviceId: 'dev1',
      name: 'Tent 1',
      overviewEntityId: 'sensor.tent_1_overview',
      environmentAttributes: {},
    } as unknown as GrowspaceDevice;
    const ids = (store as any).getEntityIdsForMetric(device, 'optimal');
    expect(ids).toEqual(['binary_sensor.tent_1_optimal_conditions']);
  });

  it('uses cure-specific optimal entity id for cure devices', () => {
    const device = {
      deviceId: 'dev1',
      name: 'Cure',
      environmentAttributes: {},
    } as unknown as GrowspaceDevice;
    const ids = (store as any).getEntityIdsForMetric(device, 'optimal');
    expect(ids).toEqual(['binary_sensor.cure_optimal_curing']);
  });

  it('uses dry-specific optimal entity id for dry devices', () => {
    const device = {
      deviceId: 'dev1',
      name: 'Dry',
      environmentAttributes: {},
    } as unknown as GrowspaceDevice;
    const ids = (store as any).getEntityIdsForMetric(device, 'optimal');
    expect(ids).toEqual(['binary_sensor.dry_optimal_drying']);
  });

  it('returns empty array for an unknown metric key', () => {
    const device = {
      deviceId: 'dev1',
      name: 'Tent 1',
      environmentAttributes: {},
    } as unknown as GrowspaceDevice;
    const ids = (store as any).getEntityIdsForMetric(device, 'completely_unknown_metric');
    expect(ids).toEqual([]);
  });

  it('reads environmentAttributes from snake_case environment_attributes fallback', () => {
    const device = {
      deviceId: 'dev1',
      name: 'Tent 1',
      // no camelCase environmentAttributes — use snake_case
      environment_attributes: { temperatureSensor: 'sensor.temp' },
    } as unknown as GrowspaceDevice;
    const ids = (store as any).getEntityIdsForMetric(device, 'temperature');
    expect(ids).toEqual(['sensor.temp']);
  });

  it('returns empty array when device has no environment attributes at all', () => {
    const device = {
      deviceId: 'dev1',
      name: 'Tent 1',
      // neither environmentAttributes nor environment_attributes
    } as unknown as GrowspaceDevice;
    const ids = (store as any).getEntityIdsForMetric(device, 'temperature');
    expect(ids).toEqual([]);
  });

  it('skips irrigation entity when value is not a string', () => {
    const device = {
      deviceId: 'dev1',
      name: 'Tent 1',
      irrigationConfig: { irrigationPumpEntity: 42 }, // numeric, not a string
      environmentAttributes: {},
    } as unknown as GrowspaceDevice;
    const ids = (store as any).getEntityIdsForMetric(device, 'irrigation');
    expect(ids).toEqual([]);
  });

  it('returns the calculated VPD entity when it exists in hass states', () => {
    const calculatedId = 'sensor.tent_1_calculated_vpd';
    const mockDataService = {
      hass: { states: { [calculatedId]: { state: '1.2' } } },
    } as unknown as DataService;
    const storeWithHass = new GrowspaceHistoryStore(mockDataService, atom<string | null>(null));

    const device = {
      deviceId: 'dev1',
      name: 'Tent 1',
      environmentAttributes: {},
    } as unknown as GrowspaceDevice;
    const ids = (storeWithHass as any).getEntityIdsForMetric(device, 'vpd');
    expect(ids).toEqual([calculatedId]);
  });

  it('returns irrigation pump entity from camelCase irrigationConfig key', () => {
    const device = {
      deviceId: 'dev1',
      name: 'Tent 1',
      irrigationConfig: { irrigationPumpEntity: 'switch.irrigation_pump' },
      environmentAttributes: {},
    } as unknown as GrowspaceDevice;
    const ids = (store as any).getEntityIdsForMetric(device, 'irrigation');
    expect(ids).toEqual(['switch.irrigation_pump']);
  });

  it('falls back to snake_case key when camelCase irrigationConfig key is absent', () => {
    const device = {
      deviceId: 'dev1',
      name: 'Tent 1',
      irrigationConfig: { irrigation_pump_entity: 'switch.irrigation_pump' },
      environmentAttributes: {},
    } as unknown as GrowspaceDevice;
    const ids = (store as any).getEntityIdsForMetric(device, 'irrigation');
    expect(ids).toEqual(['switch.irrigation_pump']);
  });

  it('getEntityIdForMetric returns null when no entity found', () => {
    const device = {
      deviceId: 'dev1',
      name: 'Tent 1',
      environmentAttributes: {},
    } as unknown as GrowspaceDevice;
    expect((store as any).getEntityIdForMetric(device, 'temperature')).toBeNull();
  });

  it('getEntityIdForMetric returns the first entity when multiple exist', () => {
    const device = {
      deviceId: 'dev1',
      name: 'Tent 1',
      environmentAttributes: {
        temperatureSensors: ['sensor.temp1', 'sensor.temp2'],
      },
    } as unknown as GrowspaceDevice;
    expect((store as any).getEntityIdForMetric(device, 'temperature')).toBe('sensor.temp1');
  });
});

// ---------------------------------------------------------------------------
// _fetchHistory: overviewEntityId and composite key branches
// ---------------------------------------------------------------------------

describe('GrowspaceHistoryStore - _fetchHistory branches', () => {
  afterEach(() => {
    setDevices([]);
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { });
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);
  });

  it('includes overviewEntityId in the fetch set', async () => {
    const overviewEntityId = 'sensor.tent1_overview';
    const getHistoryStats = vi.fn().mockResolvedValue({});
    const device = {
      deviceId: 'dev1',
      name: 'Tent 1',
      overviewEntityId,
      environmentAttributes: {},
    } as unknown as GrowspaceDevice;
    setDevices([device]);
    const $selectedDevice = atom<string | null>('dev1');
    const store = new GrowspaceHistoryStore(
      { getHistoryStats, hass: { states: {} } } as unknown as DataService,
      $selectedDevice
    );

    await store.loadHistoryOnDemand();

    const [entities] = getHistoryStats.mock.calls[0] as [string[], ...unknown[]];
    expect(entities).toContain(overviewEntityId);
  });

  it('handles null batchResults from getHistoryStats gracefully', async () => {
    const getHistoryStats = vi.fn().mockResolvedValue(null);
    const device = {
      deviceId: 'dev1',
      name: 'Tent 1',
      environmentAttributes: { temperatureSensor: TEMP_ENTITY },
    } as unknown as GrowspaceDevice;
    setDevices([device]);
    const $selectedDevice = atom<string | null>('dev1');
    const store = new GrowspaceHistoryStore(
      { getHistoryStats, hass: { states: {} } } as unknown as DataService,
      $selectedDevice
    );
    await store.loadHistoryOnDemand();
    expect(store.$historyLoaded.get()).toBe(true); // completed without error
    expect(store.$historyCache.get()).toEqual({});
  });

  it('skips non-composite active graph keys when building the entity set', async () => {
    const getHistoryStats = vi.fn().mockResolvedValue({});
    const device = {
      deviceId: 'dev1',
      name: 'Tent 1',
      environmentAttributes: { temperatureSensor: TEMP_ENTITY },
    } as unknown as GrowspaceDevice;
    setDevices([device]);
    const $selectedDevice = atom<string | null>('dev1');
    const store = new GrowspaceHistoryStore(
      { getHistoryStats, hass: { states: {} } } as unknown as DataService,
      $selectedDevice
    );
    // A plain (non-composite, no ':') graph key should be ignored in the composite-key loop
    store.$activeEnvGraphs.set(new Set(['temperature']));

    await store.loadHistoryOnDemand();

    const [entities] = getHistoryStats.mock.calls[0] as [string[], ...unknown[]];
    // Only TEMP_ENTITY from the metric loop; 'temperature' key has no ':'
    expect(entities).toContain(TEMP_ENTITY);
    expect(entities).not.toContain('temperature');
  });

  it('uses metric:entityId composite key when device has plural sensors', async () => {
    const entity1 = 'sensor.tent1_temp1';
    const entity2 = 'sensor.tent1_temp2';
    const point = {
      value: '22',
      last_changed: '2024-01-01T00:00:00Z',
      last_updated: '2024-01-01T00:00:00Z',
    };
    const getHistoryStats = vi.fn().mockResolvedValue({ [entity1]: [point], [entity2]: [point] });
    const device = {
      deviceId: 'dev1',
      name: 'Tent 1',
      environmentAttributes: { temperatureSensors: [entity1, entity2] },
    } as unknown as GrowspaceDevice;
    setDevices([device]);
    const $selectedDevice = atom<string | null>('dev1');
    const store = new GrowspaceHistoryStore(
      { getHistoryStats, hass: { states: {} } } as unknown as DataService,
      $selectedDevice
    );

    await store.loadHistoryOnDemand();

    expect(store.$historyCache.get()[`temperature:${entity1}`]).toHaveLength(1);
    expect(store.$historyCache.get()[`temperature:${entity2}`]).toHaveLength(1);
  });

  it('includes composite key entities in the fetch set', async () => {
    const compositeEntityId = 'sensor.extra_device_temp';
    const getHistoryStats = vi.fn().mockResolvedValue({});
    const device = {
      deviceId: 'dev1',
      name: 'Tent 1',
      environmentAttributes: {},
    } as unknown as GrowspaceDevice;
    setDevices([device]);
    const $selectedDevice = atom<string | null>('dev1');
    const store = new GrowspaceHistoryStore(
      { getHistoryStats, hass: { states: {} } } as unknown as DataService,
      $selectedDevice
    );
    store.$activeEnvGraphs.set(new Set([`temperature:${compositeEntityId}`]));

    await store.loadHistoryOnDemand();

    const [entities] = getHistoryStats.mock.calls[0] as [string[], ...unknown[]];
    expect(entities).toContain(compositeEntityId);
  });
});

// ---------------------------------------------------------------------------
// Auto-refresh lifecycle and delta fetch
// ---------------------------------------------------------------------------

describe('GrowspaceHistoryStore - auto-refresh lifecycle', () => {
  afterEach(() => {
    setDevices([]);
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  beforeEach(() => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { });
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);
  });

  it('startAutoRefresh is idempotent', () => {
    const store = makeStore();
    store.startAutoRefresh();
    store.startAutoRefresh();
    store.stopAutoRefresh();
  });

  it('destroy stops refresh and unsubscribes from device changes', () => {
    const $selectedDevice = atom<string | null>(null);
    const store = new GrowspaceHistoryStore({} as DataService, $selectedDevice);
    store.startAutoRefresh();
    expect(() => store.destroy()).not.toThrow();
  });

  it('_saveToStorage is a no-op when no device is selected', () => {
    const store = new GrowspaceHistoryStore({} as DataService, atom<string | null>(null));
    expect(() => (store as any)._saveToStorage()).not.toThrow();
  });

  it('delta fetch fires after 5 minutes and merges newer data', async () => {
    vi.useFakeTimers();

    const existingPoint = {
      value: '20',
      last_changed: '2024-01-01T00:00:00Z',
      last_updated: '2024-01-01T00:00:00Z',
    };
    const newPoint = {
      value: '22',
      last_changed: '2024-01-01T01:00:00Z',
      last_updated: '2024-01-01T01:00:00Z',
    };
    const compositeEntityId = 'sensor.extra_temp';
    const getHistoryStats = vi.fn().mockResolvedValue({
      [TEMP_ENTITY]: [newPoint],
      [compositeEntityId]: [newPoint],
    });

    const device = {
      deviceId: 'dev1',
      name: 'Tent 1',
      environmentAttributes: { temperatureSensor: TEMP_ENTITY },
    } as unknown as GrowspaceDevice;
    setDevices([device]);
    const $selectedDevice = atom<string | null>('dev1');
    const store = new GrowspaceHistoryStore(
      { getHistoryStats, hass: { states: {} } } as unknown as DataService,
      $selectedDevice
    );

    // Seed cache and timestamps so delta fetch takes the incremental path
    store.setHistoryData('temperature', [existingPoint] as any);
    store.$lastTimestamps.setKey('temperature', '2024-01-01T00:00:00Z');

    // Also seed a composite key timestamp to cover the composite keys delta path
    const compositeKey = `temperature:${compositeEntityId}`;
    store.$activeEnvGraphs.set(new Set([compositeKey]));
    store.$lastTimestamps.setKey(compositeKey, '2024-01-01T00:00:00Z');

    store.startAutoRefresh();
    await vi.advanceTimersByTimeAsync(5 * 60 * 1000 + 100);

    store.stopAutoRefresh();

    expect(store.$historyCache.get()['temperature']).toHaveLength(2);
    expect(store.$historyCache.get()['temperature'][1].value).toBe('22');
  });

  it('delta fetch returns early when selected device is null', async () => {
    vi.useFakeTimers();
    const getHistoryStats = vi.fn().mockResolvedValue({});
    const $selectedDevice = atom<string | null>(null); // no device
    const store = new GrowspaceHistoryStore(
      { getHistoryStats, hass: { states: {} } } as unknown as DataService,
      $selectedDevice
    );
    store.startAutoRefresh();
    await vi.advanceTimersByTimeAsync(5 * 60 * 1000 + 100);
    store.stopAutoRefresh();
    expect(getHistoryStats).not.toHaveBeenCalled();
  });

  it('delta fetch returns early when selected device is not in the devices list', async () => {
    vi.useFakeTimers();
    const getHistoryStats = vi.fn().mockResolvedValue({});
    setDevices([]); // device list is empty
    const $selectedDevice = atom<string | null>('dev1');
    const store = new GrowspaceHistoryStore(
      { getHistoryStats, hass: { states: {} } } as unknown as DataService,
      $selectedDevice
    );
    store.startAutoRefresh();
    await vi.advanceTimersByTimeAsync(5 * 60 * 1000 + 100);
    store.stopAutoRefresh();
    expect(getHistoryStats).not.toHaveBeenCalled();
  });

  it('delta fetch returns early when entitiesToFetch is empty', async () => {
    vi.useFakeTimers();

    const getHistoryStats = vi.fn().mockResolvedValue({});
    const device = {
      deviceId: 'dev1',
      name: 'Tent 1',
      environmentAttributes: { temperatureSensor: TEMP_ENTITY },
    } as unknown as GrowspaceDevice;
    setDevices([device]);
    const $selectedDevice = atom<string | null>('dev1');
    const store = new GrowspaceHistoryStore(
      { getHistoryStats, hass: { states: {} } } as unknown as DataService,
      $selectedDevice
    );

    // Timestamps present (so hasAnyTimestamps=true) but none match a known metric key
    store.$lastTimestamps.set({ unrelated_key: '2024-01-01T00:00:00Z' });

    store.startAutoRefresh();
    await vi.advanceTimersByTimeAsync(5 * 60 * 1000 + 100);
    store.stopAutoRefresh();

    expect(getHistoryStats).not.toHaveBeenCalled();
  });

  it('delta fetch handles null batchResults gracefully', async () => {
    vi.useFakeTimers();

    const getHistoryStats = vi.fn().mockResolvedValue(null);
    const device = {
      deviceId: 'dev1',
      name: 'Tent 1',
      environmentAttributes: { temperatureSensor: TEMP_ENTITY },
    } as unknown as GrowspaceDevice;
    setDevices([device]);
    const $selectedDevice = atom<string | null>('dev1');
    const store = new GrowspaceHistoryStore(
      { getHistoryStats, hass: { states: {} } } as unknown as DataService,
      $selectedDevice
    );

    store.$lastTimestamps.setKey('temperature', '2024-01-01T00:00:00Z');
    store.startAutoRefresh();
    await vi.advanceTimersByTimeAsync(5 * 60 * 1000 + 100);
    store.stopAutoRefresh();

    expect(store.$historyCache.get()['temperature']).toBeUndefined();
  });

  it('delta fetch uses composite key (metric:entityId) when device has plural sensors', async () => {
    vi.useFakeTimers();

    const entity1 = 'sensor.tent1_temp1';
    const entity2 = 'sensor.tent1_temp2';
    const newPoint = {
      value: '22',
      last_changed: '2024-01-01T01:00:00Z',
      last_updated: '2024-01-01T01:00:00Z',
    };
    const getHistoryStats = vi.fn().mockResolvedValue({
      [entity1]: [newPoint],
      [entity2]: [newPoint],
    });

    const device = {
      deviceId: 'dev1',
      name: 'Tent 1',
      environmentAttributes: { temperatureSensors: [entity1, entity2] },
    } as unknown as GrowspaceDevice;
    setDevices([device]);
    const $selectedDevice = atom<string | null>('dev1');
    const store = new GrowspaceHistoryStore(
      { getHistoryStats, hass: { states: {} } } as unknown as DataService,
      $selectedDevice
    );

    // Seed composite-key timestamps so the delta loop picks them up
    store.$lastTimestamps.setKey(`temperature:${entity1}`, '2024-01-01T00:00:00Z');
    store.$lastTimestamps.setKey(`temperature:${entity2}`, '2024-01-01T00:00:00Z');

    store.startAutoRefresh();
    await vi.advanceTimersByTimeAsync(5 * 60 * 1000 + 100);
    store.stopAutoRefresh();

    expect(getHistoryStats).toHaveBeenCalled();
    const [entities] = getHistoryStats.mock.calls[0] as [string[], ...unknown[]];
    expect(entities).toContain(entity1);
    expect(entities).toContain(entity2);
  });

  it('delta fetch does not call _mergeDeltaData when batchResults have no data for an entity', async () => {
    vi.useFakeTimers();

    // Return no key for the entity — exercises the `|| []` fallback and `deltaData.length > 0` false branch
    const getHistoryStats = vi.fn().mockResolvedValue({});
    const device = {
      deviceId: 'dev1',
      name: 'Tent 1',
      overviewEntityId: 'sensor.tent1_overview', // also covers overviewEntityId branch
      environmentAttributes: { temperatureSensor: TEMP_ENTITY },
    } as unknown as GrowspaceDevice;
    setDevices([device]);
    const $selectedDevice = atom<string | null>('dev1');
    const store = new GrowspaceHistoryStore(
      { getHistoryStats, hass: { states: {} } } as unknown as DataService,
      $selectedDevice
    );

    store.$lastTimestamps.setKey('temperature', '2024-01-01T00:00:00Z');
    store.startAutoRefresh();
    await vi.advanceTimersByTimeAsync(5 * 60 * 1000 + 100);
    store.stopAutoRefresh();

    // Cache should be unchanged (no merge occurred)
    expect(store.$historyCache.get()['temperature']).toBeUndefined();
  });

  it('delta fetch skips composite keys that have no matching timestamp', async () => {
    vi.useFakeTimers();

    const getHistoryStats = vi.fn().mockResolvedValue({ [TEMP_ENTITY]: [] });
    const device = {
      deviceId: 'dev1',
      name: 'Tent 1',
      environmentAttributes: { temperatureSensor: TEMP_ENTITY },
    } as unknown as GrowspaceDevice;
    setDevices([device]);
    const $selectedDevice = atom<string | null>('dev1');
    const store = new GrowspaceHistoryStore(
      { getHistoryStats, hass: { states: {} } } as unknown as DataService,
      $selectedDevice
    );

    store.$lastTimestamps.setKey('temperature', '2024-01-01T00:00:00Z');
    // Composite key in active graphs but NO matching timestamp — should not be fetched
    store.$activeEnvGraphs.set(new Set(['temperature:sensor.extra', 'temperature']));

    store.startAutoRefresh();
    await vi.advanceTimersByTimeAsync(5 * 60 * 1000 + 100);
    store.stopAutoRefresh();

    const [entities] = getHistoryStats.mock.calls[0] as [string[], ...unknown[]];
    expect(entities).not.toContain('sensor.extra');
  });

  it('delta fetch error is caught and does not propagate', async () => {
    vi.useFakeTimers();

    const getHistoryStats = vi.fn().mockRejectedValue(new Error('network error'));
    const device = {
      deviceId: 'dev1',
      name: 'Tent 1',
      environmentAttributes: { temperatureSensor: TEMP_ENTITY },
    } as unknown as GrowspaceDevice;
    setDevices([device]);
    const $selectedDevice = atom<string | null>('dev1');
    const store = new GrowspaceHistoryStore(
      { getHistoryStats, hass: { states: {} } } as unknown as DataService,
      $selectedDevice
    );

    store.$lastTimestamps.setKey('temperature', '2024-01-01T00:00:00Z');
    store.startAutoRefresh();

    await expect(vi.advanceTimersByTimeAsync(5 * 60 * 1000 + 100)).resolves.not.toThrow();
    store.stopAutoRefresh();
  });

  it('delta fetch falls back to full fetch when no timestamps exist', async () => {
    vi.useFakeTimers();

    const point = {
      value: '20',
      last_changed: '2024-01-01T00:00:00Z',
      last_updated: '2024-01-01T00:00:00Z',
    };
    const getHistoryStats = vi.fn().mockResolvedValue({ [TEMP_ENTITY]: [point] });

    const device = {
      deviceId: 'dev1',
      name: 'Tent 1',
      environmentAttributes: { temperatureSensor: TEMP_ENTITY },
    } as unknown as GrowspaceDevice;
    setDevices([device]);
    const $selectedDevice = atom<string | null>('dev1');
    const store = new GrowspaceHistoryStore(
      { getHistoryStats, hass: { states: {} } } as unknown as DataService,
      $selectedDevice
    );

    // No timestamps — delta should fall back to full fetch
    store.startAutoRefresh();
    await vi.advanceTimersByTimeAsync(5 * 60 * 1000 + 100);

    store.stopAutoRefresh();

    expect(getHistoryStats).toHaveBeenCalled();
  });

  it('visibility change triggers delta fetch when tab is visible', async () => {
    const getHistoryStats = vi.fn().mockResolvedValue({ [TEMP_ENTITY]: [] });

    const device = {
      deviceId: 'dev1',
      name: 'Tent 1',
      environmentAttributes: { temperatureSensor: TEMP_ENTITY },
    } as unknown as GrowspaceDevice;
    setDevices([device]);
    const $selectedDevice = atom<string | null>('dev1');
    const store = new GrowspaceHistoryStore(
      { getHistoryStats, hass: { states: {} } } as unknown as DataService,
      $selectedDevice
    );
    store.$lastTimestamps.setKey('temperature', '2024-01-01T00:00:00Z');

    store.startAutoRefresh();

    Object.defineProperty(document, 'hidden', { value: false, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));

    // Flush promises so the async delta fetch can run
    await new Promise((resolve) => setTimeout(resolve, 0));

    store.stopAutoRefresh();

    expect(getHistoryStats).toHaveBeenCalled();
  });
});
