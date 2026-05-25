/**
 * UI slice — unit tests.
 *
 * Covers each atom's default value and each mutator's effect.
 * No Lit components, no store, no mocks needed — atoms are pure nanostores.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ViewMode, GridOverlayMode as GridOverlayModeEnum } from '../../constants';
import {
  viewMode$,
  isLoading$,
  activeDialog$,
  isEditMode$,
  selectedPlants$,
  focusedPlantIndex$,
  menuOpen$,
  notification$,
  error$,
  defaultApplied$,
  gridOverlayMode$,
  language$,
  pendingDeepLinkPlantId$,
  flowerFlipDismissed$,
  isCompactView$,
  cardViewState$,
  setViewMode,
  setGridOverlayMode,
  openDialog,
  closeDialog,
  setEditMode,
  togglePlantSelection,
  selectAllPlants,
  clearPlantSelection,
  deselectPlants,
  showToast,
  clearToast,
  setError,
  setLanguage,
  setPendingDeepLink,
  dismissFlowerFlip,
} from './index';
import { gridInteraction$, cancel } from '../grid-interaction';
import type { ActiveDialogState } from '../../store/ui/dialog-types';

// ---------------------------------------------------------------------------
// Reset atoms before each test so tests are isolated
// ---------------------------------------------------------------------------

beforeEach(() => {
  viewMode$.set(ViewMode.STANDARD);
  isLoading$.set(true);
  activeDialog$.set({ type: 'NONE' });
  isEditMode$.set(false);
  selectedPlants$.set(new Set());
  focusedPlantIndex$.set(-1);
  menuOpen$.set(false);
  notification$.set(null);
  error$.set(null);
  defaultApplied$.set(false);
  gridOverlayMode$.set(GridOverlayModeEnum.NONE);
  language$.set('en');
  pendingDeepLinkPlantId$.set(null);
  flowerFlipDismissed$.set({});
  cancel();
});

// ---------------------------------------------------------------------------
// viewMode$ + isCompactView$
// ---------------------------------------------------------------------------

describe('viewMode$', () => {
  it('defaults to STANDARD', () => {
    expect(viewMode$.get()).toBe(ViewMode.STANDARD);
  });

  it('setViewMode updates viewMode$', () => {
    setViewMode(ViewMode.COMPACT);
    expect(viewMode$.get()).toBe(ViewMode.COMPACT);
  });
});

describe('isCompactView$', () => {
  it('is false when viewMode is STANDARD', () => {
    expect(isCompactView$.get()).toBe(false);
  });

  it('is true when viewMode is COMPACT', () => {
    setViewMode(ViewMode.COMPACT);
    expect(isCompactView$.get()).toBe(true);
  });

  it('is false when viewMode switches back from COMPACT', () => {
    setViewMode(ViewMode.COMPACT);
    setViewMode(ViewMode.STANDARD);
    expect(isCompactView$.get()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// activeDialog$ + openDialog / closeDialog
// ---------------------------------------------------------------------------

describe('activeDialog$', () => {
  it('defaults to NONE', () => {
    expect(activeDialog$.get()).toEqual({ type: 'NONE' });
  });

  it('openDialog sets the dialog state', () => {
    const dialog: ActiveDialogState = {
      type: 'LOGBOOK',
      payload: { growspaceId: 'gs1' },
    };
    openDialog(dialog);
    expect(activeDialog$.get()).toEqual(dialog);
  });

  it('closeDialog resets to NONE', () => {
    openDialog({ type: 'LOGBOOK', payload: { growspaceId: 'gs1' } });
    closeDialog();
    expect(activeDialog$.get()).toEqual({ type: 'NONE' });
  });
});

// ---------------------------------------------------------------------------
// gridOverlayMode$
// ---------------------------------------------------------------------------

describe('gridOverlayMode$', () => {
  it('defaults to NONE', () => {
    expect(gridOverlayMode$.get()).toBe(GridOverlayModeEnum.NONE);
  });

  it('setGridOverlayMode updates the atom', () => {
    setGridOverlayMode(GridOverlayModeEnum.VPD);
    expect(gridOverlayMode$.get()).toBe(GridOverlayModeEnum.VPD);
  });
});

// ---------------------------------------------------------------------------
// isEditMode$ — side-effects on exit
// ---------------------------------------------------------------------------

describe('setEditMode', () => {
  it('entering edit mode sets isEditMode$ to true', () => {
    setEditMode(true);
    expect(isEditMode$.get()).toBe(true);
  });

  it('exiting edit mode clears selectedPlants$', () => {
    setEditMode(true);
    selectedPlants$.set(new Set(['p1', 'p2']));
    setEditMode(false);
    expect(selectedPlants$.get().size).toBe(0);
  });

  it('exiting edit mode cancels any active grid interaction', () => {
    setEditMode(true);
    gridInteraction$.set({ status: 'selected', plantId: 'p1' });
    setEditMode(false);
    expect(gridInteraction$.get().status).toBe('idle');
  });
});

// ---------------------------------------------------------------------------
// Plant selection
// ---------------------------------------------------------------------------

describe('togglePlantSelection', () => {
  it('adds a plant ID when it is not selected', () => {
    togglePlantSelection('p1');
    expect(selectedPlants$.get().has('p1')).toBe(true);
  });

  it('removes a plant ID when it is already selected', () => {
    selectedPlants$.set(new Set(['p1']));
    togglePlantSelection('p1');
    expect(selectedPlants$.get().has('p1')).toBe(false);
  });

  it('handles multiple independent selections', () => {
    togglePlantSelection('p1');
    togglePlantSelection('p2');
    expect(selectedPlants$.get()).toEqual(new Set(['p1', 'p2']));
  });
});

describe('selectAllPlants', () => {
  it('replaces the selection with all provided IDs', () => {
    togglePlantSelection('old');
    selectAllPlants(['a', 'b', 'c']);
    expect(selectedPlants$.get()).toEqual(new Set(['a', 'b', 'c']));
  });
});

describe('clearPlantSelection', () => {
  it('empties the selection', () => {
    selectedPlants$.set(new Set(['p1', 'p2']));
    clearPlantSelection();
    expect(selectedPlants$.get().size).toBe(0);
  });
});

describe('deselectPlants', () => {
  it('removes only the specified IDs', () => {
    selectedPlants$.set(new Set(['p1', 'p2', 'p3']));
    deselectPlants(['p1', 'p3']);
    expect(selectedPlants$.get()).toEqual(new Set(['p2']));
  });
});


// ---------------------------------------------------------------------------
// Toast / notification
// ---------------------------------------------------------------------------

describe('showToast', () => {
  it('sets notification$ with message and type', () => {
    showToast('Hello!', 'success');
    expect(notification$.get()).toEqual({ message: 'Hello!', type: 'success' });
  });

  it('defaults type to info', () => {
    showToast('Info message');
    expect(notification$.get()?.type).toBe('info');
  });

  it('includes optional action', () => {
    const cb = () => {};
    showToast('With action', 'info', { label: 'Undo', callback: cb });
    expect(notification$.get()?.action?.label).toBe('Undo');
  });
});

describe('clearToast', () => {
  it('sets notification$ to null', () => {
    showToast('msg');
    clearToast();
    expect(notification$.get()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Misc atoms
// ---------------------------------------------------------------------------

describe('setError', () => {
  it('sets error$ to a string', () => {
    setError('Something went wrong');
    expect(error$.get()).toBe('Something went wrong');
  });

  it('clears error$ when passed null', () => {
    setError('err');
    setError(null);
    expect(error$.get()).toBeNull();
  });
});

describe('setLanguage', () => {
  it('updates language$', () => {
    setLanguage('nl');
    expect(language$.get()).toBe('nl');
  });
});

describe('setPendingDeepLink', () => {
  it('sets a plant ID', () => {
    setPendingDeepLink('plant-42');
    expect(pendingDeepLinkPlantId$.get()).toBe('plant-42');
  });

  it('clears with null', () => {
    setPendingDeepLink('plant-42');
    setPendingDeepLink(null);
    expect(pendingDeepLinkPlantId$.get()).toBeNull();
  });
});

describe('dismissFlowerFlip', () => {
  it('records the dismissed flower start for a growspace', () => {
    dismissFlowerFlip('gs1', '2026-01-01');
    expect(flowerFlipDismissed$.get().gs1).toBe('2026-01-01');
  });

  it('can dismiss multiple growspaces independently', () => {
    dismissFlowerFlip('gs1', '2026-01-01');
    dismissFlowerFlip('gs2', '2026-03-15');
    const dismissed = flowerFlipDismissed$.get();
    expect(dismissed.gs1).toBe('2026-01-01');
    expect(dismissed.gs2).toBe('2026-03-15');
  });
});

// ---------------------------------------------------------------------------
// cardViewState$ — derived view combining all relevant atoms
// ---------------------------------------------------------------------------

describe('cardViewState$', () => {
  it('includes all required fields with correct defaults', () => {
    const state = cardViewState$.get();
    expect(state).toMatchObject({
      viewMode: ViewMode.STANDARD,
      isLoading: true,
      isEditMode: false,
      isCompact: false,
      activeDialog: { type: 'NONE' },
      notification: null,
      focusedPlantIndex: -1,
      overlayMode: GridOverlayModeEnum.NONE,
    });
    expect(state.selectedPlants).toBeInstanceOf(Set);
    expect(state.selectedPlants.size).toBe(0);
  });

  it('reflects viewMode changes', () => {
    setViewMode(ViewMode.COMPACT);
    expect(cardViewState$.get().viewMode).toBe(ViewMode.COMPACT);
    expect(cardViewState$.get().isCompact).toBe(true);
  });

  it('reflects selectedPlants changes', () => {
    togglePlantSelection('p1');
    expect(cardViewState$.get().selectedPlants.has('p1')).toBe(true);
  });

  it('reflects overlayMode changes', () => {
    setGridOverlayMode(GridOverlayModeEnum.VPD);
    expect(cardViewState$.get().overlayMode).toBe(GridOverlayModeEnum.VPD);
  });
});
