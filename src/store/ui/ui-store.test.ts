import { describe, it, expect, beforeEach } from 'vitest';
import { GrowspaceUIStore } from './ui-store';
import { showToast, notification$ } from '../../slices/ui';

describe('GrowspaceUIStore.$cardViewState includes selectedPlants', () => {
  let store: GrowspaceUIStore;

  beforeEach(() => {
    store = new GrowspaceUIStore();
  });

  it('cardViewState exposes selectedPlants', () => {
    const state = store.$cardViewState.get();
    expect(state).toHaveProperty('selectedPlants');
    expect(state.selectedPlants).toBeInstanceOf(Set);
    expect(state.selectedPlants.size).toBe(0);
  });

  it('cardViewState.selectedPlants updates when plants are selected', () => {
    store.togglePlantSelection('plant-1');
    const state = store.$cardViewState.get();
    expect(state.selectedPlants.has('plant-1')).toBe(true);
  });

  it('cardViewState.selectedPlants updates when selection is cleared', () => {
    store.togglePlantSelection('plant-1');
    store.clearPlantSelection();
    const state = store.$cardViewState.get();
    expect(state.selectedPlants.size).toBe(0);
  });

  it('cardViewState still includes all original fields', () => {
    const state = store.$cardViewState.get();
    expect(state).toHaveProperty('viewMode');
    expect(state).toHaveProperty('isLoading');
    expect(state).toHaveProperty('isEditMode');
    expect(state).toHaveProperty('isCompact');
    expect(state).toHaveProperty('activeDialog');
    expect(state).toHaveProperty('notification');
    expect(state).toHaveProperty('focusedPlantIndex');
    expect(state).toHaveProperty('selectedPlants');
  });

  it('cardViewState exposes overlayMode', () => {
    const state = store.$cardViewState.get();
    expect(state).toHaveProperty('overlayMode');
  });

  it('cardViewState.overlayMode updates when $gridOverlayMode changes', () => {
    store.setGridOverlayMode('vpd' as any);
    expect(store.$cardViewState.get().overlayMode).toBe('vpd');
  });
});

// ---------------------------------------------------------------------------
// Shared notification atom — slices/ui.showToast must reach the toast container
// ---------------------------------------------------------------------------

describe('GrowspaceUIStore.$notification is the same atom as slices/ui notification$', () => {
  let store: GrowspaceUIStore;

  beforeEach(() => {
    store = new GrowspaceUIStore();
    notification$.set(null);
    store.$notification.set(null);
  });

  it('store.$notification and notification$ are the same atom — slice showToast is visible to the toast container', () => {
    showToast('AI rate limit reached — please wait a moment before trying again', 'error');
    expect(store.$notification.get()).not.toBeNull();
    expect(store.$notification.get()?.message).toContain('rate limit');
  });

  it('store.showToast updates notification$ that the slice can also read', () => {
    store.showToast('Test toast', 'success');
    expect(notification$.get()).not.toBeNull();
    expect(notification$.get()?.message).toBe('Test toast');
  });
});
