import { describe, it, expect, beforeEach } from 'vitest';
import { GrowspaceStore } from './growspace-store';
import { ViewMode } from '../../constants';

describe('GrowspaceStore.$headerActionsState', () => {
  let store: GrowspaceStore;

  beforeEach(() => {
    store = new GrowspaceStore();
  });

  it('exposes $headerActionsState as a computed atom', () => {
    expect(store.$headerActionsState).toBeDefined();
    expect(typeof store.$headerActionsState.get).toBe('function');
  });

  it('includes viewMode, isEditMode, selectedPlants, selectedDevice', () => {
    const state = store.$headerActionsState.get();
    expect(state).toHaveProperty('viewMode');
    expect(state).toHaveProperty('isEditMode');
    expect(state).toHaveProperty('selectedPlants');
    expect(state).toHaveProperty('selectedDevice');
  });

  it('reflects default values', () => {
    const state = store.$headerActionsState.get();
    expect(state.viewMode).toBe(ViewMode.STANDARD);
    expect(state.isEditMode).toBe(false);
    expect(state.selectedPlants).toBeInstanceOf(Set);
    expect(state.selectedPlants.size).toBe(0);
    expect(state.selectedDevice).toBeNull();
  });

  it('updates when viewMode changes', () => {
    store.ui.$viewMode.set(ViewMode.COMPACT);
    expect(store.$headerActionsState.get().viewMode).toBe(ViewMode.COMPACT);
  });

  it('updates when isEditMode changes', () => {
    store.ui.$isEditMode.set(true);
    expect(store.$headerActionsState.get().isEditMode).toBe(true);
  });

  it('updates when selectedPlants changes', () => {
    store.ui.$selectedPlants.set(new Set(['p1', 'p2']));
    expect(store.$headerActionsState.get().selectedPlants.size).toBe(2);
  });

  it('updates when selectedDevice changes', () => {
    store.data.$selectedDevice.set('gs1');
    expect(store.$headerActionsState.get().selectedDevice).toBe('gs1');
  });
});
