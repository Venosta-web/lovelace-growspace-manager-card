import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  GrowspaceHistoryStore,
  getHistory,
  getBatchHistory,
  getHistoryStats,
} from './history-store';
import type { GrowspaceDevice } from '../../types';
import { atom } from 'nanostores';
import { setDevices } from '../../slices/grid';
import * as hassCallModule from '../../services/hass-call';

vi.mock('../../services/hass-call', () => ({
  callApi: vi.fn(),
  hassCall: vi.fn(),
  getHass: vi.fn(),
  setHass: vi.fn(),
}));

// Clear call history between every test so stale calls don't bleed across describe blocks.
beforeEach(() => {
  vi.mocked(hassCallModule.hassCall).mockReset();
  vi.mocked(hassCallModule.callApi).mockReset();
  vi.mocked(hassCallModule.getHass).mockReset();
});

const makeStore = () => {
  const $selectedDevice = atom<string | null>(null);
  return new GrowspaceHistoryStore($selectedDevice);
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

const makeTransportStore = () => {
  const device = {
    deviceId: 'dev1',
    name: 'Tent 1',
    environmentAttributes: { temperatureSensor: TEMP_ENTITY },
  } as unknown as GrowspaceDevice;

  setDevices([device]);
  const $selectedDevice = atom<string | null>('dev1');
  return new GrowspaceHistoryStore($selectedDevice);
};

describe('GrowspaceHistoryStore - history transport', () => {
  afterEach(() => {
    setDevices([]);
    vi.mocked(hassCallModule.hassCall).mockReset();
    vi.mocked(hassCallModule.callApi).mockReset();
  });

  beforeEach(() => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {});
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);
  });

  it('fetch success: $historyCache is populated and $historyLoaded becomes true', async () => {
    vi.mocked(hassCallModule.hassCall).mockResolvedValueOnce({
      [TEMP_ENTITY]: [{ s: '22', lu: '2024-01-01T00:00:00.000Z', a: {} }],
    });
    const store = makeTransportStore();

    await store.loadHistoryOnDemand();

    expect(store.$historyCache.get()['temperature']).toHaveLength(1);
    expect(store.$historyCache.get()['temperature'][0].state).toBe('22');
    expect(store.$historyLoaded.get()).toBe(true);
    expect(store.$historyLoading.get()).toBe(false);
  });

  it('WS fallback to REST: store receives data when WS fails but REST succeeds', async () => {
    const point = {
      entity_id: TEMP_ENTITY,
      state: '18',
      last_changed: '2024-01-02T00:00:00Z',
      last_updated: '2024-01-02T00:00:00Z',
      attributes: {},
    };
    vi.mocked(hassCallModule.hassCall).mockRejectedValueOnce(new Error('WS failed'));
    vi.mocked(hassCallModule.callApi).mockResolvedValueOnce([[point]]);
    const store = makeTransportStore();

    await store.loadHistoryOnDemand();

    expect(store.$historyCache.get()['temperature']).toHaveLength(1);
    expect(store.$historyLoaded.get()).toBe(true);
  });

  it('fetch error: $historyError is set and $historyLoaded stays false when both transports fail', async () => {
    vi.mocked(hassCallModule.hassCall).mockRejectedValue(new Error('WS Transport failure'));
    vi.mocked(hassCallModule.callApi).mockRejectedValue(new Error('REST Transport failure'));
    const store = makeTransportStore();

    await store.loadHistoryOnDemand();

    expect(store.$historyError.get()).toBeTruthy();
    expect(store.$historyLoaded.get()).toBe(false);
    expect(store.$historyLoading.get()).toBe(false);
  });

  it('loadHistoryOnDemand is a no-op when already loaded', async () => {
    const store = makeTransportStore();
    store.$historyLoaded.set(true);

    await store.loadHistoryOnDemand();

    expect(hassCallModule.hassCall).not.toHaveBeenCalled();
  });

  it('loadHistoryOnDemand is a no-op when already loading', async () => {
    const store = makeTransportStore();
    store.$historyLoading.set(true);

    await store.loadHistoryOnDemand();

    expect(hassCallModule.hassCall).not.toHaveBeenCalled();
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
      version: 3,
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
    const store = new GrowspaceHistoryStore($selectedDevice);

    expect(store.$historyCache.get()['temperature']).toHaveLength(1);
    expect(store.$lastTimestamps.get()['temperature']).toBe('2024-01-01T00:00:00Z');
    // Not marked as fully loaded — preview only, fresh fetch will follow
    expect(store.$historyLoaded.get()).toBe(false);
  });

  it('discards expired localStorage data and removes the key', () => {
    const stored = {
      version: 2,
      timestamp: Date.now() - 25 * 60 * 60 * 1000, // 25 hours ago
      history: { temperature: [] },
      timestamps: {},
    };
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(JSON.stringify(stored));
    const removeSpy = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {});

    const device = {
      deviceId: 'dev1',
      name: 'Tent 1',
      environmentAttributes: {},
    } as unknown as GrowspaceDevice;
    setDevices([device]);
    const $selectedDevice = atom<string | null>('dev1');
    new GrowspaceHistoryStore($selectedDevice);

    expect(removeSpy).toHaveBeenCalled();
  });

  it('discards a v1 cache keyed by the retired composite scheme, leaving no stale keys', () => {
    const point = {
      value: '22',
      last_changed: '2024-01-01T00:00:00Z',
      last_updated: '2024-01-01T00:00:00Z',
    };
    const stored = {
      version: 1,
      timestamp: Date.now(),
      history: {
        'temperature:sensor.tent1_temp1': [point],
        'temperature:sensor.tent1_temp2': [point],
      },
      timestamps: { 'temperature:sensor.tent1_temp1': '2024-01-01T00:00:00Z' },
    };
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(JSON.stringify(stored));
    const removeSpy = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {});

    const device = {
      deviceId: 'dev1',
      name: 'Tent 1',
      environmentAttributes: {},
    } as unknown as GrowspaceDevice;
    setDevices([device]);
    const store = new GrowspaceHistoryStore(atom<string | null>('dev1'));

    expect(removeSpy).toHaveBeenCalled();
    expect(store.$historyCache.get()).toEqual({});
    // No stale timestamp survives, so the next refresh is a full fetch rather
    // than a delta anchored to a key nothing writes any more.
    expect(store.$lastTimestamps.get()).toEqual({});
    expect(store.$historyLoaded.get()).toBe(false);
  });

  it('discards a v2 cache whose fan history can only represent on as one percent', () => {
    const stored = {
      version: 2,
      timestamp: Date.now(),
      history: {
        circulation_fan: [
          {
            entity_id: 'fan.circulation',
            state: 'on',
            attributes: {},
            last_changed: '2024-01-01T00:00:00Z',
          },
        ],
      },
      timestamps: { circulation_fan: '2024-01-01T00:00:00Z' },
    };
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(JSON.stringify(stored));
    const removeSpy = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {});

    const device = {
      deviceId: 'dev1',
      name: 'Tent 1',
      environmentAttributes: {},
    } as unknown as GrowspaceDevice;
    setDevices([device]);
    const store = new GrowspaceHistoryStore(atom<string | null>('dev1'));

    expect(removeSpy).toHaveBeenCalled();
    expect(store.$historyCache.get()).toEqual({});
  });

  it('handles malformed localStorage JSON without throwing', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue('{not valid json}');

    const $selectedDevice = atom<string | null>('dev1');
    expect(() => new GrowspaceHistoryStore($selectedDevice)).not.toThrow();
  });

  it('loads cached data that has no timestamps field gracefully', () => {
    const stored = {
      version: 3,
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
    const store = new GrowspaceHistoryStore($selectedDevice);

    expect(store.$lastTimestamps.get()).toEqual({});
  });

  it('swallows storage errors from localStorage.setItem', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceeded');
    });

    vi.mocked(hassCallModule.hassCall).mockResolvedValueOnce({
      [TEMP_ENTITY]: [{ s: '22', lu: '2024-01-01T00:00:00.000Z', a: {} }],
    });
    const device = {
      deviceId: 'dev1',
      name: 'Tent 1',
      environmentAttributes: { temperatureSensor: TEMP_ENTITY },
    } as unknown as GrowspaceDevice;
    setDevices([device]);
    const $selectedDevice = atom<string | null>('dev1');
    const store = new GrowspaceHistoryStore($selectedDevice);

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
    const existing = [
      { value: '20', last_updated: '2024-01-01T00:00:00Z', last_changed: '' } as any,
    ];
    store.setHistoryData('temperature', existing);
    const delta = [{ value: '22', last_updated: '2024-01-01T01:00:00Z', last_changed: '' } as any];
    (store as any)._mergeDeltaData('temperature', delta);
    expect(store.$historyCache.get()['temperature']).toHaveLength(2);
  });

  it('ignores delta points that are not newer than existing data', () => {
    const existing = [
      { value: '20', last_updated: '2024-01-01T01:00:00Z', last_changed: '' } as any,
    ];
    store.setHistoryData('temperature', existing);
    const olderDelta = [
      { value: '18', last_updated: '2024-01-01T00:00:00Z', last_changed: '' } as any,
    ];
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
    const existing = [
      { value: '20', last_updated: '2024-01-01T00:00:00Z', last_changed: '' } as any,
    ];
    store.setHistoryData('temperature', existing);
    const delta = [{ value: '22', last_changed: '2024-01-01T01:00:00Z' } as any];
    (store as any)._mergeDeltaData('temperature', delta);
    expect(store.$historyCache.get()['temperature']).toHaveLength(2);
  });

  it('discards an older delta point that uses only last_changed for its timestamp', () => {
    const existing = [
      { value: '20', last_updated: '2024-01-01T02:00:00Z', last_changed: '' } as any,
    ];
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
// _fetchHistory: overviewEntityId and composite key branches
// ---------------------------------------------------------------------------

describe('GrowspaceHistoryStore - _fetchHistory branches', () => {
  afterEach(() => {
    setDevices([]);
    vi.restoreAllMocks();
    vi.mocked(hassCallModule.hassCall).mockReset();
    vi.mocked(hassCallModule.callApi).mockReset();
  });

  beforeEach(() => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {});
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);
  });

  it('includes overviewEntityId in the fetch set', async () => {
    vi.mocked(hassCallModule.hassCall).mockResolvedValue({});
    const overviewEntityId = 'sensor.tent1_overview';
    const device = {
      deviceId: 'dev1',
      name: 'Tent 1',
      overviewEntityId,
      environmentAttributes: {},
    } as unknown as GrowspaceDevice;
    setDevices([device]);
    const $selectedDevice = atom<string | null>('dev1');
    const store = new GrowspaceHistoryStore($selectedDevice);

    await store.loadHistoryOnDemand();

    const [, wsParams] = vi.mocked(hassCallModule.hassCall).mock.calls[0] as [
      string,
      { entity_ids: string[] },
      unknown,
    ];
    expect(wsParams.entity_ids).toContain(overviewEntityId);
  });

  it('handles empty batchResults from getHistoryStats gracefully', async () => {
    vi.mocked(hassCallModule.hassCall).mockResolvedValue({});
    const device = {
      deviceId: 'dev1',
      name: 'Tent 1',
      environmentAttributes: { temperatureSensor: TEMP_ENTITY },
    } as unknown as GrowspaceDevice;
    setDevices([device]);
    const $selectedDevice = atom<string | null>('dev1');
    const store = new GrowspaceHistoryStore($selectedDevice);
    await store.loadHistoryOnDemand();
    expect(store.$historyLoaded.get()).toBe(true); // completed without error
    // Implementation writes empty-array placeholders for all resolved metric keys
    expect(store.$historyCache.get()['temperature']).toEqual([]);
    expect(store.$historyError.get()).toBeFalsy();
  });

  it('keys a plural-sensor metric by entity id, never by a composite key', async () => {
    const entity1 = 'sensor.tent1_temp1';
    const entity2 = 'sensor.tent1_temp2';
    vi.mocked(hassCallModule.hassCall).mockResolvedValue({
      [entity1]: [{ s: '22', lu: '2024-01-01T00:00:00.000Z', a: {} }],
      [entity2]: [{ s: '22', lu: '2024-01-01T00:00:00.000Z', a: {} }],
    });
    const device = {
      deviceId: 'dev1',
      name: 'Tent 1',
      environmentAttributes: { temperatureSensors: [entity1, entity2] },
    } as unknown as GrowspaceDevice;
    setDevices([device]);
    const $selectedDevice = atom<string | null>('dev1');
    const store = new GrowspaceHistoryStore($selectedDevice);

    await store.loadHistoryOnDemand();

    const cache = store.$historyCache.get();
    expect(cache[entity1]).toHaveLength(1);
    expect(cache[entity2]).toHaveLength(1);
    expect(Object.keys(cache).filter((k) => k.includes(':'))).toEqual([]);
  });

  it('keys a single-sensor metric by the metric key, which every consumer reads', async () => {
    vi.mocked(hassCallModule.hassCall).mockResolvedValue({
      [TEMP_ENTITY]: [{ s: '22', lu: '2024-01-01T00:00:00.000Z', a: {} }],
    });
    const device = {
      deviceId: 'dev1',
      name: 'Tent 1',
      environmentAttributes: { temperatureSensor: TEMP_ENTITY },
    } as unknown as GrowspaceDevice;
    setDevices([device]);
    const store = new GrowspaceHistoryStore(atom<string | null>('dev1'));

    await store.loadHistoryOnDemand();

    expect(store.$historyCache.get().temperature).toHaveLength(1);
    expect(store.$historyCache.get()[TEMP_ENTITY]).toBeUndefined();
  });

  it('fetches power, energy, ph, and feed_ec entities when they are configured', async () => {
    vi.mocked(hassCallModule.hassCall).mockResolvedValue({});
    const powerEntity = 'sensor.power1';
    const energyEntity = 'sensor.energy1';
    const phEntity = 'sensor.ph1';
    const feedEcEntity = 'sensor.feed_ec1';
    const device = {
      deviceId: 'dev1',
      name: 'Tent 1',
      environmentAttributes: {
        powerSensors: [powerEntity],
        energySensors: [energyEntity],
        phSensors: [phEntity],
        feedEcSensors: [feedEcEntity],
      },
    } as unknown as GrowspaceDevice;
    setDevices([device]);
    const $selectedDevice = atom<string | null>('dev1');
    const store = new GrowspaceHistoryStore($selectedDevice);

    await store.loadHistoryOnDemand();

    const [, wsParams] = vi.mocked(hassCallModule.hassCall).mock.calls[0] as [
      string,
      { entity_ids: string[] },
      unknown,
    ];
    expect(wsParams.entity_ids).toContain(powerEntity);
    expect(wsParams.entity_ids).toContain(energyEntity);
    expect(wsParams.entity_ids).toContain(phEntity);
    expect(wsParams.entity_ids).toContain(feedEcEntity);
  });

  it('derives the fetch set from the device alone — active graphs do not add entities', async () => {
    vi.mocked(hassCallModule.hassCall).mockResolvedValue({});
    const device = {
      deviceId: 'dev1',
      name: 'Tent 1',
      environmentAttributes: { temperatureSensor: TEMP_ENTITY },
    } as unknown as GrowspaceDevice;
    setDevices([device]);
    const store = new GrowspaceHistoryStore(atom<string | null>('dev1'));
    // Graph identities are still `'metric:entity'` strings; they are a UI
    // concern and no longer steer what gets fetched (#473).
    store.$activeEnvGraphs.set(new Set(['temperature', 'temperature:sensor.extra_device_temp']));

    await store.loadHistoryOnDemand();

    const [, wsParams] = vi.mocked(hassCallModule.hassCall).mock.calls[0] as [
      string,
      { entity_ids: string[] },
      unknown,
    ];
    // Temperature plus the always-derived `optimal` binary sensor — and nothing
    // contributed by the active graph set.
    expect(wsParams.entity_ids).toEqual([TEMP_ENTITY, 'binary_sensor.tent_1_optimal_conditions']);
    expect(wsParams.entity_ids).not.toContain('sensor.extra_device_temp');
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
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {});
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
    const store = new GrowspaceHistoryStore($selectedDevice);
    store.startAutoRefresh();
    expect(() => store.destroy()).not.toThrow();
  });

  it('_saveToStorage is a no-op when no device is selected', () => {
    const store = new GrowspaceHistoryStore(atom<string | null>(null));
    expect(() => (store as any)._saveToStorage()).not.toThrow();
  });

  it('delta fetch fires after 5 minutes and merges newer data', async () => {
    vi.useFakeTimers();

    const existingPoint = {
      value: '20',
      last_changed: '2024-01-01T00:00:00Z',
      last_updated: '2024-01-01T00:00:00Z',
    };
    // getHistoryStats maps compact WS format {s, lu} → HistorySensorState {state, last_changed, last_updated}
    const newPoint = {
      state: '22',
      last_changed: '2024-01-01T01:00:00.000Z',
      last_updated: '2024-01-01T01:00:00.000Z',
    };
    const compositeEntityId = 'sensor.extra_temp';
    vi.mocked(hassCallModule.hassCall).mockResolvedValue({
      [TEMP_ENTITY]: [{ s: '22', lu: '2024-01-01T01:00:00.000Z', a: {} }],
      [compositeEntityId]: [{ s: '22', lu: '2024-01-01T01:00:00.000Z', a: {} }],
    });

    const device = {
      deviceId: 'dev1',
      name: 'Tent 1',
      environmentAttributes: { temperatureSensor: TEMP_ENTITY },
    } as unknown as GrowspaceDevice;
    setDevices([device]);
    const $selectedDevice = atom<string | null>('dev1');
    const store = new GrowspaceHistoryStore($selectedDevice);

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
    expect(store.$historyCache.get()['temperature'][1]).toMatchObject(newPoint);
  });

  it('delta fetch returns early when selected device is null', async () => {
    vi.useFakeTimers();
    const $selectedDevice = atom<string | null>(null); // no device
    const store = new GrowspaceHistoryStore($selectedDevice);
    store.startAutoRefresh();
    await vi.advanceTimersByTimeAsync(5 * 60 * 1000 + 100);
    store.stopAutoRefresh();
    expect(hassCallModule.hassCall).not.toHaveBeenCalled();
  });

  it('delta fetch returns early when selected device is not in the devices list', async () => {
    vi.useFakeTimers();
    setDevices([]); // device list is empty
    const $selectedDevice = atom<string | null>('dev1');
    const store = new GrowspaceHistoryStore($selectedDevice);
    store.startAutoRefresh();
    await vi.advanceTimersByTimeAsync(5 * 60 * 1000 + 100);
    store.stopAutoRefresh();
    expect(hassCallModule.hassCall).not.toHaveBeenCalled();
  });

  it('delta fetch returns early when entitiesToFetch is empty', async () => {
    vi.useFakeTimers();

    const device = {
      deviceId: 'dev1',
      name: 'Tent 1',
      environmentAttributes: { temperatureSensor: TEMP_ENTITY },
    } as unknown as GrowspaceDevice;
    setDevices([device]);
    const $selectedDevice = atom<string | null>('dev1');
    const store = new GrowspaceHistoryStore($selectedDevice);

    // Timestamps present (so hasAnyTimestamps=true) but none match a known metric key
    store.$lastTimestamps.set({ unrelated_key: '2024-01-01T00:00:00Z' });

    store.startAutoRefresh();
    await vi.advanceTimersByTimeAsync(5 * 60 * 1000 + 100);
    store.stopAutoRefresh();

    expect(hassCallModule.hassCall).not.toHaveBeenCalled();
  });

  it('delta fetch handles empty batchResults gracefully', async () => {
    vi.useFakeTimers();

    vi.mocked(hassCallModule.hassCall).mockResolvedValue({});
    const device = {
      deviceId: 'dev1',
      name: 'Tent 1',
      environmentAttributes: { temperatureSensor: TEMP_ENTITY },
    } as unknown as GrowspaceDevice;
    setDevices([device]);
    const $selectedDevice = atom<string | null>('dev1');
    const store = new GrowspaceHistoryStore($selectedDevice);

    store.$lastTimestamps.setKey('temperature', '2024-01-01T00:00:00Z');
    store.startAutoRefresh();
    await vi.advanceTimersByTimeAsync(5 * 60 * 1000 + 100);
    store.stopAutoRefresh();

    expect(store.$historyCache.get()['temperature']).toBeUndefined();
  });

  it('delta fetch keys a plural-sensor metric by entity id', async () => {
    vi.useFakeTimers();

    const entity1 = 'sensor.tent1_temp1';
    const entity2 = 'sensor.tent1_temp2';
    vi.mocked(hassCallModule.hassCall).mockResolvedValue({
      [entity1]: [{ s: '22', lu: '2024-01-01T01:00:00.000Z', a: {} }],
      [entity2]: [{ s: '22', lu: '2024-01-01T01:00:00.000Z', a: {} }],
    });

    const device = {
      deviceId: 'dev1',
      name: 'Tent 1',
      environmentAttributes: { temperatureSensors: [entity1, entity2] },
    } as unknown as GrowspaceDevice;
    setDevices([device]);
    const $selectedDevice = atom<string | null>('dev1');
    const store = new GrowspaceHistoryStore($selectedDevice);

    store.$lastTimestamps.setKey(entity1, '2024-01-01T00:00:00Z');
    store.$lastTimestamps.setKey(entity2, '2024-01-01T00:00:00Z');

    store.startAutoRefresh();
    await vi.advanceTimersByTimeAsync(5 * 60 * 1000 + 100);
    store.stopAutoRefresh();

    expect(hassCallModule.hassCall).toHaveBeenCalled();
    const [, wsParams] = vi.mocked(hassCallModule.hassCall).mock.calls[0] as [
      string,
      { entity_ids: string[] },
      unknown,
    ];
    expect(wsParams.entity_ids).toContain(entity1);
    expect(wsParams.entity_ids).toContain(entity2);
    expect(store.$historyCache.get()[entity1]).toHaveLength(1);
    expect(store.$historyCache.get()[entity2]).toHaveLength(1);
  });

  it('delta fetch asks for the same metric entities the initial fetch did', async () => {
    vi.useFakeTimers();
    vi.mocked(hassCallModule.hassCall).mockResolvedValue({});

    const temp1 = 'sensor.tent1_temp1';
    const temp2 = 'sensor.tent1_temp2';
    const device = {
      deviceId: 'dev1',
      name: 'Tent 1',
      environmentAttributes: {
        temperatureSensors: [temp1, temp2],
        humiditySensor: 'sensor.tent1_humidity',
      },
    } as unknown as GrowspaceDevice;
    setDevices([device]);
    const store = new GrowspaceHistoryStore(atom<string | null>('dev1'));

    await store.loadHistoryOnDemand();
    const [, initialParams] = vi.mocked(hassCallModule.hassCall).mock.calls[0] as [
      string,
      { entity_ids: string[] },
      unknown,
    ];

    // Every key the initial fetch wrote now carries a timestamp, so the delta
    // covers the same metrics rather than falling through to a full refetch.
    Object.keys(store.$historyCache.get()).forEach((key) =>
      store.$lastTimestamps.setKey(key, '2024-01-01T00:00:00Z')
    );

    store.startAutoRefresh();
    await vi.advanceTimersByTimeAsync(5 * 60 * 1000 + 100);
    store.stopAutoRefresh();

    const [, deltaParams] = vi.mocked(hassCallModule.hassCall).mock.calls[1] as [
      string,
      { entity_ids: string[] },
      unknown,
    ];
    expect([...deltaParams.entity_ids].sort()).toEqual([...initialParams.entity_ids].sort());
    expect(deltaParams.entity_ids).toContain(temp1);
    expect(deltaParams.entity_ids).toContain(temp2);
  });

  it('delta fetch does not call _mergeDeltaData when batchResults have no data for an entity', async () => {
    vi.useFakeTimers();

    vi.mocked(hassCallModule.hassCall).mockResolvedValue({});
    const device = {
      deviceId: 'dev1',
      name: 'Tent 1',
      overviewEntityId: 'sensor.tent1_overview', // also covers overviewEntityId branch
      environmentAttributes: { temperatureSensor: TEMP_ENTITY },
    } as unknown as GrowspaceDevice;
    setDevices([device]);
    const $selectedDevice = atom<string | null>('dev1');
    const store = new GrowspaceHistoryStore($selectedDevice);

    store.$lastTimestamps.setKey('temperature', '2024-01-01T00:00:00Z');
    store.startAutoRefresh();
    await vi.advanceTimersByTimeAsync(5 * 60 * 1000 + 100);
    store.stopAutoRefresh();

    // Cache should be unchanged (no merge occurred)
    expect(store.$historyCache.get()['temperature']).toBeUndefined();
  });

  it('delta fetch skips composite keys that have no matching timestamp', async () => {
    vi.useFakeTimers();

    vi.mocked(hassCallModule.hassCall).mockResolvedValue({ [TEMP_ENTITY]: [] });
    const device = {
      deviceId: 'dev1',
      name: 'Tent 1',
      environmentAttributes: { temperatureSensor: TEMP_ENTITY },
    } as unknown as GrowspaceDevice;
    setDevices([device]);
    const $selectedDevice = atom<string | null>('dev1');
    const store = new GrowspaceHistoryStore($selectedDevice);

    store.$lastTimestamps.setKey('temperature', '2024-01-01T00:00:00Z');
    // Composite key in active graphs but NO matching timestamp — should not be fetched
    store.$activeEnvGraphs.set(new Set(['temperature:sensor.extra', 'temperature']));

    store.startAutoRefresh();
    await vi.advanceTimersByTimeAsync(5 * 60 * 1000 + 100);
    store.stopAutoRefresh();

    const [, wsParams] = vi.mocked(hassCallModule.hassCall).mock.calls[0] as [
      string,
      { entity_ids: string[] },
      unknown,
    ];
    expect(wsParams.entity_ids).not.toContain('sensor.extra');
  });

  it('delta fetch error is caught and does not propagate', async () => {
    vi.useFakeTimers();

    vi.mocked(hassCallModule.hassCall).mockRejectedValue(new Error('WS error'));
    vi.mocked(hassCallModule.callApi).mockRejectedValue(new Error('REST error'));
    const device = {
      deviceId: 'dev1',
      name: 'Tent 1',
      environmentAttributes: { temperatureSensor: TEMP_ENTITY },
    } as unknown as GrowspaceDevice;
    setDevices([device]);
    const $selectedDevice = atom<string | null>('dev1');
    const store = new GrowspaceHistoryStore($selectedDevice);

    store.$lastTimestamps.setKey('temperature', '2024-01-01T00:00:00Z');
    store.startAutoRefresh();

    await expect(vi.advanceTimersByTimeAsync(5 * 60 * 1000 + 100)).resolves.not.toThrow();
    store.stopAutoRefresh();
  });

  it('delta fetch falls back to full fetch when no timestamps exist', async () => {
    vi.useFakeTimers();

    vi.mocked(hassCallModule.hassCall).mockResolvedValue({
      [TEMP_ENTITY]: [{ s: '20', lu: '2024-01-01T00:00:00.000Z', a: {} }],
    });

    const device = {
      deviceId: 'dev1',
      name: 'Tent 1',
      environmentAttributes: { temperatureSensor: TEMP_ENTITY },
    } as unknown as GrowspaceDevice;
    setDevices([device]);
    const $selectedDevice = atom<string | null>('dev1');
    const store = new GrowspaceHistoryStore($selectedDevice);

    // No timestamps — delta should fall back to full fetch
    store.startAutoRefresh();
    await vi.advanceTimersByTimeAsync(5 * 60 * 1000 + 100);

    store.stopAutoRefresh();

    expect(hassCallModule.hassCall).toHaveBeenCalled();
  });

  it('visibility change triggers delta fetch when tab is visible', async () => {
    vi.mocked(hassCallModule.hassCall).mockResolvedValue({ [TEMP_ENTITY]: [] });

    const device = {
      deviceId: 'dev1',
      name: 'Tent 1',
      environmentAttributes: { temperatureSensor: TEMP_ENTITY },
    } as unknown as GrowspaceDevice;
    setDevices([device]);
    const $selectedDevice = atom<string | null>('dev1');
    const store = new GrowspaceHistoryStore($selectedDevice);
    store.$lastTimestamps.setKey('temperature', '2024-01-01T00:00:00Z');

    store.startAutoRefresh();

    Object.defineProperty(document, 'hidden', { value: false, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));

    // Flush promises so the async delta fetch can run
    await new Promise((resolve) => setTimeout(resolve, 0));

    store.stopAutoRefresh();

    expect(hassCallModule.hassCall).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Seam-based reads: getHistory, getBatchHistory, getHistoryStats
// These functions call the hassCall seam directly, not DataService/HistoryAPI.
// ---------------------------------------------------------------------------

const HISTORY_ENTITY = 'sensor.tent1_temperature';
const HISTORY_POINT = {
  entity_id: HISTORY_ENTITY,
  state: '22',
  last_changed: '2024-01-01T00:00:00Z',
  last_updated: '2024-01-01T00:00:00Z',
  attributes: {},
};

describe('getHistory', () => {
  beforeEach(() => {
    vi.mocked(hassCallModule.callApi).mockReset();
  });

  it('calls callApi with the history REST path for a single entity', async () => {
    vi.mocked(hassCallModule.callApi).mockResolvedValueOnce([[HISTORY_POINT]]);
    const start = new Date('2024-01-01T00:00:00Z');

    await getHistory(HISTORY_ENTITY, start);

    expect(hassCallModule.callApi).toHaveBeenCalledWith(
      'GET',
      expect.stringContaining(HISTORY_ENTITY)
    );
  });

  it('returns the first entity array from the REST response', async () => {
    vi.mocked(hassCallModule.callApi).mockResolvedValueOnce([[HISTORY_POINT]]);
    const start = new Date('2024-01-01T00:00:00Z');

    const result = await getHistory(HISTORY_ENTITY, start);

    expect(result).toHaveLength(1);
    expect(result[0].state).toBe('22');
  });

  it('throws when callApi fails', async () => {
    vi.mocked(hassCallModule.callApi).mockRejectedValueOnce(new Error('network'));
    const start = new Date('2024-01-01T00:00:00Z');

    await expect(getHistory(HISTORY_ENTITY, start)).rejects.toThrow('network');
  });

  it('includes end_time in the path when endTime is provided', async () => {
    vi.mocked(hassCallModule.callApi).mockResolvedValueOnce([]);
    const start = new Date('2024-01-01T00:00:00Z');
    const end = new Date('2024-01-02T00:00:00Z');

    await getHistory(HISTORY_ENTITY, start, end);

    expect(hassCallModule.callApi).toHaveBeenCalledWith(
      'GET',
      expect.stringContaining('end_time=')
    );
  });
});

describe('getBatchHistory', () => {
  beforeEach(() => {
    vi.mocked(hassCallModule.callApi).mockReset();
  });

  it('calls callApi with all entity ids joined in the path', async () => {
    vi.mocked(hassCallModule.callApi).mockResolvedValueOnce([]);
    const start = new Date('2024-01-01T00:00:00Z');

    await getBatchHistory([HISTORY_ENTITY, 'sensor.humidity'], start);

    expect(hassCallModule.callApi).toHaveBeenCalledWith(
      'GET',
      expect.stringContaining(HISTORY_ENTITY)
    );
  });

  it('returns a map of entity_id to state arrays', async () => {
    vi.mocked(hassCallModule.callApi).mockResolvedValueOnce([[HISTORY_POINT]]);
    const start = new Date('2024-01-01T00:00:00Z');

    const result = await getBatchHistory([HISTORY_ENTITY], start);

    expect(result[HISTORY_ENTITY]).toHaveLength(1);
    expect(result[HISTORY_ENTITY][0].state).toBe('22');
  });

  it('returns empty object for empty entity list', async () => {
    const start = new Date('2024-01-01T00:00:00Z');

    const result = await getBatchHistory([], start);

    expect(result).toEqual({});
    expect(hassCallModule.callApi).not.toHaveBeenCalled();
  });

  it('throws when callApi fails', async () => {
    vi.mocked(hassCallModule.callApi).mockRejectedValueOnce(new Error('network'));
    const start = new Date('2024-01-01T00:00:00Z');

    await expect(getBatchHistory([HISTORY_ENTITY], start)).rejects.toThrow('network');
  });
});

describe('getHistoryStats', () => {
  const WS_RESPONSE = {
    [HISTORY_ENTITY]: [{ s: '22', lu: '2024-01-01T00:00:00.000Z', a: {} }],
  };

  beforeEach(() => {
    vi.mocked(hassCallModule.hassCall).mockReset();
    vi.mocked(hassCallModule.callApi).mockReset();
  });

  it('calls hassCall with the history stats WS command', async () => {
    vi.mocked(hassCallModule.hassCall).mockResolvedValueOnce({ [HISTORY_ENTITY]: [HISTORY_POINT] });
    const start = new Date('2024-01-01T00:00:00Z');

    await getHistoryStats([HISTORY_ENTITY], start);

    expect(hassCallModule.hassCall).toHaveBeenCalledWith(
      'growspace_manager/get_history_stats',
      expect.objectContaining({ entity_ids: [HISTORY_ENTITY] }),
      expect.anything()
    );
  });

  it('maps compact WS format to HistorySensorState[]', async () => {
    vi.mocked(hassCallModule.hassCall).mockResolvedValueOnce(WS_RESPONSE);
    const start = new Date('2024-01-01T00:00:00Z');

    const result = await getHistoryStats([HISTORY_ENTITY], start);

    expect(result[HISTORY_ENTITY]).toHaveLength(1);
    expect(result[HISTORY_ENTITY][0].state).toBe('22');
    expect(result[HISTORY_ENTITY][0].entity_id).toBe(HISTORY_ENTITY);
  });

  it('falls back to REST batch when WS hassCall fails', async () => {
    vi.mocked(hassCallModule.hassCall).mockRejectedValueOnce(new Error('WS failed'));
    vi.mocked(hassCallModule.callApi).mockResolvedValueOnce([[HISTORY_POINT]]);
    const start = new Date('2024-01-01T00:00:00Z');

    const result = await getHistoryStats([HISTORY_ENTITY], start);

    expect(hassCallModule.callApi).toHaveBeenCalled();
    expect(result[HISTORY_ENTITY]).toHaveLength(1);
  });

  it('throws when both WS and REST fallback fail', async () => {
    vi.mocked(hassCallModule.hassCall).mockRejectedValueOnce(new Error('WS failed'));
    vi.mocked(hassCallModule.callApi).mockRejectedValueOnce(new Error('REST failed'));
    const start = new Date('2024-01-01T00:00:00Z');

    await expect(getHistoryStats([HISTORY_ENTITY], start)).rejects.toThrow();
  });

  it('returns empty object for empty entity list', async () => {
    const start = new Date('2024-01-01T00:00:00Z');

    const result = await getHistoryStats([], start);

    expect(result).toEqual({});
    expect(hassCallModule.hassCall).not.toHaveBeenCalled();
  });
});
