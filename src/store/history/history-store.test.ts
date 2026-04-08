import { describe, it, expect, beforeEach } from 'vitest';
import { GrowspaceHistoryStore } from './history-store';
import type { DataService } from '../../data-service';
import type { GrowspaceDataStore } from '../core/data-store';
import { atom } from 'nanostores';

const makeStore = () => {
  const mockDataStore = {
    $selectedDevice: atom<string | null>(null),
  } as unknown as GrowspaceDataStore;
  const mockDataService = {} as DataService;
  return new GrowspaceHistoryStore(mockDataService, mockDataStore);
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
    expect(store.$headerHistoryState.get().linkedGraphGroups).toEqual([['temperature', 'humidity']]);
  });
});
