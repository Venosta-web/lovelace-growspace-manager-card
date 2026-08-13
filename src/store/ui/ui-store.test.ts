import { describe, it, expect, beforeEach } from 'vitest';
import { GrowspaceUIStore } from './ui-store';
import { showToast, notification$ } from '../../slices/ui';
import { ViewMode } from '../../constants';
import type { PlantEntity } from '../../types';

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
// Per-instance grid overlay mode — two cards on one dashboard switch the grid
// overlay (vpd / ec / none) independently. Regression: changing the overlay on
// card N used to flip a page-global slice atom, changing it on every card.
// ---------------------------------------------------------------------------

describe('GrowspaceUIStore grid overlay mode is owned per instance', () => {
  let cardA: GrowspaceUIStore;
  let cardB: GrowspaceUIStore;

  beforeEach(() => {
    cardA = new GrowspaceUIStore();
    cardB = new GrowspaceUIStore();
  });

  it('does not share the $gridOverlayMode atom between instances', () => {
    expect(cardA.$gridOverlayMode).not.toBe(cardB.$gridOverlayMode);
  });

  it('setGridOverlayMode on one card leaves the other unchanged', () => {
    cardA.setGridOverlayMode('vpd' as any);
    expect(cardA.$gridOverlayMode.get()).toBe('vpd');
    expect(cardB.$gridOverlayMode.get()).toBe('none');
  });

  it('$cardViewState.overlayMode reflects this card own overlay mode', () => {
    cardA.setGridOverlayMode('vpd' as any);
    expect(cardA.$cardViewState.get().overlayMode).toBe('vpd');
    expect(cardB.$cardViewState.get().overlayMode).toBe('none');
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

describe('GrowspaceUIStore guided task state', () => {
  const plants = [
    {
      entity_id: 'sensor.one',
      attributes: { plant_id: 'one', row: 0, col: 0, strain: 'One' },
    },
    {
      entity_id: 'sensor.two',
      attributes: { plant_id: 'two', row: 0, col: 1, strain: 'Two' },
    },
  ] as PlantEntity[];

  it('keeps tasks mutually exclusive', () => {
    const store = new GrowspaceUIStore();
    expect(store.startCompare(0)).toBe(true);
    expect(store.startSelectPlants()).toBe(false);
    expect(store.startArrange(plants, 4)).toBe(false);
    expect(store.$taskState.get().kind).toBe('compare');
  });

  it('drafts an occupied-cell swap and Cancel restores the previous view without writes', () => {
    const store = new GrowspaceUIStore();
    store.setViewMode(ViewMode.HEADER);
    store.startArrange(plants, 4);
    store.pickArrangementPlant('one', 'One');
    store.placeArrangementPlant(0, 1, { one: 'One', two: 'Two' });

    const task = store.$taskState.get();
    expect(task.kind).toBe('arrange');
    if (task.kind === 'arrange') {
      expect(task.draft).toEqual({ one: { row: 0, col: 1 }, two: { row: 0, col: 0 } });
      expect(task.original).toEqual({ one: { row: 0, col: 0 }, two: { row: 0, col: 1 } });
    }

    store.exitTask(false);
    expect(store.$taskState.get()).toEqual({ kind: 'idle' });
    expect(store.$viewMode.get()).toBe(ViewMode.HEADER);
    expect(store.$announcement.get().message).toContain('cancelled');
  });

  it('Select plants makes activation selection-scoped and clears selection on Done', () => {
    const store = new GrowspaceUIStore();
    store.startSelectPlants();
    store.togglePlantSelection('one');
    expect(store.$isEditMode.get()).toBe(true);
    expect(store.$selectedPlants.get()).toEqual(new Set(['one']));

    store.exitTask(true);
    expect(store.$isEditMode.get()).toBe(false);
    expect(store.$selectedPlants.get().size).toBe(0);
  });

  it('announces Compare membership and enforces the four-reading limit', () => {
    const store = new GrowspaceUIStore();
    store.startCompare(2);
    for (const metric of ['a', 'b', 'c', 'd', 'e']) {
      store.toggleComparisonMetric(metric, metric.toUpperCase(), true, null);
    }
    const task = store.$taskState.get();
    expect(task.kind).toBe('compare');
    if (task.kind === 'compare') {
      expect(task.draftMetrics).toEqual(['a', 'b', 'c', 'd']);
      expect(task.error).toContain('2 to 4');
    }
    expect(store.$announcement.get().message).toContain('2 to 4');
  });

  it('freezes Compare draft editing while a save is in flight', () => {
    const store = new GrowspaceUIStore();
    store.startCompare(2);
    store.toggleComparisonMetric('temperature', 'Temperature', true, null);
    store.setCompareStatus('saving');

    store.toggleComparisonMetric('humidity', 'Humidity', true, null);
    store.beginComparisonEdit('other', ['co2', 'vpd'], 3);

    const task = store.$taskState.get();
    expect(task.kind).toBe('compare');
    if (task.kind === 'compare') {
      expect(task.draftMetrics).toEqual(['temperature']);
      expect(task.comparisonId).toBeNull();
      expect(task.status).toBe('saving');
    }
  });

  it('puts down a plant in its original cell without changing the arrangement', () => {
    const store = new GrowspaceUIStore();
    store.startArrange(plants, 4);
    store.pickArrangementPlant('one', 'One');
    store.placeArrangementPlant(0, 0, { one: 'One', two: 'Two' });

    const task = store.$taskState.get();
    expect(task.kind).toBe('arrange');
    if (task.kind === 'arrange') {
      expect(task.draft).toEqual(task.original);
      expect(task.pickedPlantId).toBeNull();
    }
    expect(store.$announcement.get().message).toContain('arrangement is unchanged');
  });
});
