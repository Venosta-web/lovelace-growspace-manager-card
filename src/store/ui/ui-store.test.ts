import { describe, it, expect, beforeEach } from 'vitest';
import { GrowspaceUIStore } from './ui-store';
import { showToast, notification$ } from '../../slices/ui';
import { ViewMode } from '../../constants';

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
// Per-instance view mode — two cards on one dashboard expand independently.
// Regression: expanding card N used to flip a page-global atom, expanding all
// cards at once. View mode (and everything derived from it) must be per-store.
// ---------------------------------------------------------------------------

describe('GrowspaceUIStore view mode is owned per instance', () => {
  let cardA: GrowspaceUIStore;
  let cardB: GrowspaceUIStore;

  beforeEach(() => {
    cardA = new GrowspaceUIStore();
    cardB = new GrowspaceUIStore();
  });

  it('does not share the $viewMode atom between instances', () => {
    expect(cardA.$viewMode).not.toBe(cardB.$viewMode);
  });

  it('setViewMode on one card leaves the other unchanged', () => {
    cardA.setViewMode(ViewMode.HEADER);
    expect(cardA.$viewMode.get()).toBe(ViewMode.HEADER);
    expect(cardB.$viewMode.get()).toBe(ViewMode.STANDARD);
  });

  it('toggleHeaderExpansion on one card does not expand the other', () => {
    // Both start expanded (STANDARD); collapse only card A to HEADER.
    cardA.toggleHeaderExpansion();
    expect(cardA.$viewMode.get()).toBe(ViewMode.HEADER);
    expect(cardB.$viewMode.get()).toBe(ViewMode.STANDARD);

    // Re-expanding card A still leaves card B alone.
    cardA.toggleHeaderExpansion();
    expect(cardA.$viewMode.get()).toBe(ViewMode.STANDARD);
    expect(cardB.$viewMode.get()).toBe(ViewMode.STANDARD);
  });

  it('$layoutSpec follows each card own view mode', () => {
    cardA.setViewMode(ViewMode.HEADER);
    // HEADER layout renders header only; STANDARD renders header + chart + grid.
    expect(cardA.$layoutSpec.get().slots).toEqual(['header']);
    expect(cardB.$layoutSpec.get().slots).toContain('grid');
  });

  it('$isCompactView is per instance', () => {
    cardA.setViewMode(ViewMode.COMPACT);
    expect(cardA.$isCompactView.get()).toBe(true);
    expect(cardB.$isCompactView.get()).toBe(false);
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
