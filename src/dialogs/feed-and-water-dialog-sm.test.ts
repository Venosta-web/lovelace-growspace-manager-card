/**
 * Unit tests for the Feed & Water Dialog State Machine.
 *
 * Pure transition tests — no DOM, no Lit, no hassCall.
 */

import { describe, it, expect } from 'vitest';
import {
  createInitialSM,
  transition,
  isTabDirty,
  isLowStock,
  type SM,
  type TabId,
  type WateringDraft,
  type NutrientStockDraft,
} from './feed-and-water-dialog-sm';
import type { NutrientStock } from '../slices/nutrient';
import type { DialogStateMachine } from './dialog-sm';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function idle(): SM {
  return createInitialSM();
}

function withInventoryItemSelected(id = 'n1'): SM {
  return transition(idle(), { type: 'ItemSelected', id });
}

function withInventoryEditing(id = 'n1', draft?: Partial<NutrientStockDraft>): SM {
  return transition(withInventoryItemSelected(id), {
    type: 'EditStarted',
    draft: {
      name: 'Cal-Mag',
      current_ml: 500,
      initial_ml: 1000,
      brand: 'GH',
      stockType: 'calmag',
      npk: '0-0-0',
      dose_ml_l: 2,
      notes: '',
      ...draft,
    },
  });
}

function aStock(overrides: Partial<NutrientStock> = {}): NutrientStock {
  return {
    nutrient_id: 'n1',
    name: 'Cal-Mag',
    current_ml: 500,
    initial_ml: 1000,
    last_updated: '2026-01-01',
    brand: 'GH',
    type: 'calmag',
    npk: '0-0-0',
    dose_ml_l: 2,
    notes: '',
    ...overrides,
  };
}

// ─── createInitialSM ─────────────────────────────────────────────────────────

describe('createInitialSM', () => {
  it('starts on watering tab', () => {
    expect(idle().activeTab).toBe('watering');
  });

  it('starts with idle status', () => {
    expect(idle().status.kind).toBe('idle');
  });

  it('starts with no toast', () => {
    expect(idle().toast).toBeUndefined();
  });

  it('starts with all tabs in idle sub-state', () => {
    const sm = idle();
    expect(sm.tabs.watering.sub.kind).toBe('idle');
    expect(sm.tabs.inventory.sub.kind).toBe('idle');
    expect(sm.tabs.presets.sub.kind).toBe('idle');
  });

  it('starts with no item selected in inventory', () => {
    expect(idle().tabs.inventory.selectedId).toBeNull();
  });

  it('satisfies DialogStateMachine type contract', () => {
    const sm: DialogStateMachine<TabId, SM['tabs']> = idle();
    expect(sm).toBeDefined();
  });
});

// ─── TabSelected ──────────────────────────────────────────────────────────────

describe('TabSelected', () => {
  it('switches to a different tab when nothing is dirty', () => {
    const sm = transition(idle(), { type: 'TabSelected', tab: 'inventory' });
    expect(sm.activeTab).toBe('inventory');
    expect(sm.status.kind).toBe('idle');
  });

  it('is a no-op when selecting the already-active tab', () => {
    const before = idle();
    const after = transition(before, { type: 'TabSelected', tab: 'watering' });
    expect(after).toBe(before);
  });

  it('switches through all three tabs in sequence', () => {
    let sm = idle();
    sm = transition(sm, { type: 'TabSelected', tab: 'inventory' });
    expect(sm.activeTab).toBe('inventory');
    sm = transition(sm, { type: 'TabSelected', tab: 'presets' });
    expect(sm.activeTab).toBe('presets');
    sm = transition(sm, { type: 'TabSelected', tab: 'watering' });
    expect(sm.activeTab).toBe('watering');
  });

  it('enters confirm-discard when active tab is dirty', () => {
    const base = { ...withInventoryEditing(), activeTab: 'inventory' as const };
    const sm = transition(base, { type: 'TabSelected', tab: 'presets' });
    expect(sm.status.kind).toBe('confirm-discard');
    if (sm.status.kind === 'confirm-discard') {
      expect(sm.status.pendingTab).toBe('presets');
    }
  });

  it('does not switch tab yet when entering confirm-discard', () => {
    const base = { ...withInventoryEditing(), activeTab: 'inventory' as const };
    const sm = transition(base, { type: 'TabSelected', tab: 'presets' });
    expect(sm.activeTab).toBe('inventory');
  });

  it('is a no-op when status is already confirm-discard', () => {
    const base = { ...withInventoryEditing(), activeTab: 'inventory' as const };
    const withConfirm = transition(base, { type: 'TabSelected', tab: 'presets' });
    const again = transition(withConfirm, { type: 'TabSelected', tab: 'watering' });
    expect(again).toBe(withConfirm);
  });
});

// ─── DiscardConfirmed ─────────────────────────────────────────────────────────

describe('DiscardConfirmed', () => {
  it('switches to the pending tab', () => {
    const base = { ...withInventoryEditing(), activeTab: 'inventory' as const };
    const withConfirm = transition(base, { type: 'TabSelected', tab: 'presets' });
    const sm = transition(withConfirm, { type: 'DiscardConfirmed' });
    expect(sm.activeTab).toBe('presets');
  });

  it('resets status to idle', () => {
    const base = { ...withInventoryEditing(), activeTab: 'inventory' as const };
    const withConfirm = transition(base, { type: 'TabSelected', tab: 'presets' });
    const sm = transition(withConfirm, { type: 'DiscardConfirmed' });
    expect(sm.status.kind).toBe('idle');
  });

  it('resets the previously-dirty tab to idle sub-state', () => {
    const base = { ...withInventoryEditing(), activeTab: 'inventory' as const };
    const withConfirm = transition(base, { type: 'TabSelected', tab: 'presets' });
    const sm = transition(withConfirm, { type: 'DiscardConfirmed' });
    expect(sm.tabs.inventory.sub.kind).toBe('idle');
  });

  it('is a no-op when status is idle', () => {
    const before = idle();
    const after = transition(before, { type: 'DiscardConfirmed' });
    expect(after).toBe(before);
  });
});

// ─── DiscardCancelled ─────────────────────────────────────────────────────────

describe('DiscardCancelled', () => {
  it('resets status to idle', () => {
    const base = { ...withInventoryEditing(), activeTab: 'inventory' as const };
    const withConfirm = transition(base, { type: 'TabSelected', tab: 'presets' });
    const sm = transition(withConfirm, { type: 'DiscardCancelled' });
    expect(sm.status.kind).toBe('idle');
  });

  it('stays on the current tab', () => {
    const base = { ...withInventoryEditing(), activeTab: 'inventory' as const };
    const withConfirm = transition(base, { type: 'TabSelected', tab: 'presets' });
    const sm = transition(withConfirm, { type: 'DiscardCancelled' });
    expect(sm.activeTab).toBe('inventory');
  });

  it('preserves the dirty sub-state', () => {
    const base = { ...withInventoryEditing(), activeTab: 'inventory' as const };
    const withConfirm = transition(base, { type: 'TabSelected', tab: 'presets' });
    const sm = transition(withConfirm, { type: 'DiscardCancelled' });
    expect(sm.tabs.inventory.sub.kind).toBe('editing');
  });

  it('is a no-op when status is idle', () => {
    const before = idle();
    const after = transition(before, { type: 'DiscardCancelled' });
    expect(after).toBe(before);
  });
});

// ─── SetToast ─────────────────────────────────────────────────────────────────

describe('SetToast', () => {
  it('sets a toast message', () => {
    const sm = transition(idle(), { type: 'SetToast', message: 'Saved' });
    expect(sm.toast).toBe('Saved');
  });

  it('clears a toast message', () => {
    const withToast = transition(idle(), { type: 'SetToast', message: 'Saved' });
    const sm = transition(withToast, { type: 'SetToast', message: undefined });
    expect(sm.toast).toBeUndefined();
  });
});

// ─── isTabDirty ───────────────────────────────────────────────────────────────

describe('isTabDirty', () => {
  it('returns false for idle tab', () => {
    expect(isTabDirty(idle(), 'inventory')).toBe(false);
  });

  it('returns true for editing tab', () => {
    expect(isTabDirty(withInventoryEditing(), 'inventory')).toBe(true);
  });

  it('returns false for non-editing tabs', () => {
    expect(isTabDirty(idle(), 'watering')).toBe(false);
    expect(isTabDirty(idle(), 'presets')).toBe(false);
  });
});

// ─── WateringDraft initial state ──────────────────────────────────────────────

describe('WateringDraft initial state', () => {
  it('starts with volume 1.0', () => {
    const draft: WateringDraft = idle().tabs.watering.draft;
    expect(draft.volume).toBe(1.0);
  });

  it('starts with empty presetId', () => {
    const draft: WateringDraft = idle().tabs.watering.draft;
    expect(draft.presetId).toBe('');
  });
});

// ─── WateringVolumeChanged ────────────────────────────────────────────────────

describe('WateringVolumeChanged', () => {
  it('updates draft.volume', () => {
    const sm = transition(idle(), { type: 'WateringVolumeChanged', volume: 2.5 });
    expect(sm.tabs.watering.draft.volume).toBe(2.5);
  });

  it('does not change sub.kind', () => {
    const sm = transition(idle(), { type: 'WateringVolumeChanged', volume: 2.5 });
    expect(sm.tabs.watering.sub.kind).toBe('idle');
  });

  it('does not affect other tabs', () => {
    const sm = transition(idle(), { type: 'WateringVolumeChanged', volume: 3.0 });
    expect(sm.tabs.inventory.sub.kind).toBe('idle');
    expect(sm.tabs.presets.sub.kind).toBe('idle');
  });

  it('keeps most recent volume on repeated changes', () => {
    let sm = transition(idle(), { type: 'WateringVolumeChanged', volume: 1.5 });
    sm = transition(sm, { type: 'WateringVolumeChanged', volume: 4.0 });
    expect(sm.tabs.watering.draft.volume).toBe(4.0);
  });
});

// ─── WateringPresetChanged ────────────────────────────────────────────────────

describe('WateringPresetChanged', () => {
  it('updates draft.presetId', () => {
    const sm = transition(idle(), { type: 'WateringPresetChanged', presetId: 'preset-abc' });
    expect(sm.tabs.watering.draft.presetId).toBe('preset-abc');
  });

  it('does not change sub.kind', () => {
    const sm = transition(idle(), { type: 'WateringPresetChanged', presetId: 'preset-abc' });
    expect(sm.tabs.watering.sub.kind).toBe('idle');
  });

  it('can clear the preset by setting empty string', () => {
    let sm = transition(idle(), { type: 'WateringPresetChanged', presetId: 'preset-abc' });
    sm = transition(sm, { type: 'WateringPresetChanged', presetId: '' });
    expect(sm.tabs.watering.draft.presetId).toBe('');
  });
});

// ─── WateringSubmitRequested ──────────────────────────────────────────────────

describe('WateringSubmitRequested', () => {
  it('sets sub.kind to submitting', () => {
    const sm = transition(idle(), { type: 'WateringSubmitRequested' });
    expect(sm.tabs.watering.sub.kind).toBe('submitting');
  });

  it('is a no-op when already submitting', () => {
    const submitting = transition(idle(), { type: 'WateringSubmitRequested' });
    const again = transition(submitting, { type: 'WateringSubmitRequested' });
    expect(again).toBe(submitting);
  });

  it('preserves draft on submit', () => {
    let sm = transition(idle(), { type: 'WateringVolumeChanged', volume: 3.0 });
    sm = transition(sm, { type: 'WateringPresetChanged', presetId: 'p1' });
    sm = transition(sm, { type: 'WateringSubmitRequested' });
    expect(sm.tabs.watering.draft.volume).toBe(3.0);
    expect(sm.tabs.watering.draft.presetId).toBe('p1');
  });
});

// ─── WateringSubmitCompleted ──────────────────────────────────────────────────

describe('WateringSubmitCompleted', () => {
  it('resets sub.kind to idle', () => {
    const submitting = transition(idle(), { type: 'WateringSubmitRequested' });
    const sm = transition(submitting, { type: 'WateringSubmitCompleted' });
    expect(sm.tabs.watering.sub.kind).toBe('idle');
  });

  it('resets draft to defaults', () => {
    let sm = transition(idle(), { type: 'WateringVolumeChanged', volume: 3.0 });
    sm = transition(sm, { type: 'WateringPresetChanged', presetId: 'p1' });
    sm = transition(sm, { type: 'WateringSubmitRequested' });
    sm = transition(sm, { type: 'WateringSubmitCompleted' });
    expect(sm.tabs.watering.draft.volume).toBe(1.0);
    expect(sm.tabs.watering.draft.presetId).toBe('');
  });

  it('is a no-op when not submitting', () => {
    const before = idle();
    const after = transition(before, { type: 'WateringSubmitCompleted' });
    expect(after).toBe(before);
  });
});

// ─── isTabDirty (inventory applying) ─────────────────────────────────────────

describe('isTabDirty — inventory applying', () => {
  it('returns true when inventory sub is applying', () => {
    const sm = transition(withInventoryEditing(), { type: 'SaveRequested' });
    expect(isTabDirty(sm, 'inventory')).toBe(true);
  });

  it('returns false when inventory sub is confirm-delete', () => {
    const sm = transition(withInventoryItemSelected(), { type: 'DeleteRequested', id: 'n1', name: 'X' });
    expect(isTabDirty(sm, 'inventory')).toBe(false);
  });
});

// ─── ItemSelected ─────────────────────────────────────────────────────────────

describe('ItemSelected', () => {
  it('sets selectedId on inventory tab', () => {
    const sm = transition(idle(), { type: 'ItemSelected', id: 'n1' });
    expect(sm.tabs.inventory.selectedId).toBe('n1');
  });

  it('sub remains idle after selecting', () => {
    const sm = transition(idle(), { type: 'ItemSelected', id: 'n1' });
    expect(sm.tabs.inventory.sub.kind).toBe('idle');
  });

  it('does not affect other tabs', () => {
    const before = idle();
    const after = transition(before, { type: 'ItemSelected', id: 'n1' });
    expect(after.tabs.watering).toBe(before.tabs.watering);
    expect(after.tabs.presets).toBe(before.tabs.presets);
  });
});

// ─── BackToList ───────────────────────────────────────────────────────────────

describe('BackToList', () => {
  it('clears selectedId', () => {
    const sm = transition(withInventoryItemSelected(), { type: 'BackToList' });
    expect(sm.tabs.inventory.selectedId).toBeNull();
  });

  it('resets sub to idle', () => {
    const sm = transition(withInventoryEditing(), { type: 'BackToList' });
    expect(sm.tabs.inventory.sub.kind).toBe('idle');
  });

  it('does not affect other tabs', () => {
    const before = withInventoryItemSelected();
    const after = transition(before, { type: 'BackToList' });
    expect(after.tabs.watering).toBe(before.tabs.watering);
    expect(after.tabs.presets).toBe(before.tabs.presets);
  });
});

// ─── NewItemRequested ─────────────────────────────────────────────────────────

describe('NewItemRequested', () => {
  it('sets sub to editing with an empty stock draft', () => {
    const sm = transition(idle(), { type: 'NewItemRequested' });
    expect(sm.tabs.inventory.sub.kind).toBe('editing');
    if (sm.tabs.inventory.sub.kind === 'editing') {
      expect(sm.tabs.inventory.sub.draft).toMatchObject({ name: '', current_ml: 0, initial_ml: 0 });
    }
  });

  it('selectedId is null when creating a new item', () => {
    const sm = transition(idle(), { type: 'NewItemRequested' });
    expect(sm.tabs.inventory.selectedId).toBeNull();
  });

  it('is a no-op if already editing', () => {
    const before = withInventoryEditing();
    const after = transition(before, { type: 'NewItemRequested' });
    expect(after).toBe(before);
  });
});

// ─── EditStarted ──────────────────────────────────────────────────────────────

describe('EditStarted', () => {
  it('sets sub to editing with the provided draft', () => {
    const sm = withInventoryEditing('n1');
    expect(sm.tabs.inventory.sub.kind).toBe('editing');
    if (sm.tabs.inventory.sub.kind === 'editing') {
      expect(sm.tabs.inventory.sub.draft).toMatchObject({ name: 'Cal-Mag' });
    }
  });

  it('is a no-op when selectedId is null and not already editing', () => {
    const before = idle();
    const after = transition(before, {
      type: 'EditStarted',
      draft: { name: 'X', current_ml: 0, initial_ml: 0, brand: '', stockType: 'base', npk: '', dose_ml_l: 0, notes: '' },
    });
    expect(after).toBe(before);
  });
});

// ─── StockDraftChanged ────────────────────────────────────────────────────────

describe('StockDraftChanged', () => {
  it('updates a field in the draft', () => {
    let sm = withInventoryEditing();
    sm = transition(sm, { type: 'StockDraftChanged', field: 'name', value: 'New Name' });
    if (sm.tabs.inventory.sub.kind === 'editing') {
      expect(sm.tabs.inventory.sub.draft.name).toBe('New Name');
    }
  });

  it('does not affect other tabs', () => {
    const before = withInventoryEditing();
    const after = transition(before, { type: 'StockDraftChanged', field: 'name', value: 'X' });
    expect(after.tabs.watering).toBe(before.tabs.watering);
    expect(after.tabs.presets).toBe(before.tabs.presets);
  });

  it('is a no-op when not editing', () => {
    const before = withInventoryItemSelected();
    const after = transition(before, { type: 'StockDraftChanged', field: 'name', value: 'X' });
    expect(after).toBe(before);
  });
});

// ─── SaveRequested ────────────────────────────────────────────────────────────

describe('SaveRequested', () => {
  it('moves inventory sub from editing to applying', () => {
    const sm = transition(withInventoryEditing(), { type: 'SaveRequested' });
    expect(sm.tabs.inventory.sub.kind).toBe('applying');
  });

  it('preserves the draft during applying', () => {
    const sm = transition(withInventoryEditing('n1', { name: 'Bloom' }), { type: 'SaveRequested' });
    if (sm.tabs.inventory.sub.kind === 'applying') {
      expect(sm.tabs.inventory.sub.draft.name).toBe('Bloom');
    }
  });

  it('is a no-op when not editing', () => {
    const before = withInventoryItemSelected();
    const after = transition(before, { type: 'SaveRequested' });
    expect(after).toBe(before);
  });
});

// ─── SaveResolved ─────────────────────────────────────────────────────────────

describe('SaveResolved', () => {
  it('resets inventory sub to idle after applying', () => {
    let sm = withInventoryEditing();
    sm = transition(sm, { type: 'SaveRequested' });
    sm = transition(sm, { type: 'SaveResolved' });
    expect(sm.tabs.inventory.sub.kind).toBe('idle');
  });

  it('clears selectedId — returns user to master list', () => {
    let sm = withInventoryEditing();
    sm = transition(sm, { type: 'SaveRequested' });
    sm = transition(sm, { type: 'SaveResolved' });
    expect(sm.tabs.inventory.selectedId).toBeNull();
  });

  it('sets a success toast', () => {
    let sm = withInventoryEditing();
    sm = transition(sm, { type: 'SaveRequested' });
    sm = transition(sm, { type: 'SaveResolved' });
    expect(sm.toast).toBeTruthy();
  });

  it('is a no-op when not applying', () => {
    const before = withInventoryItemSelected();
    const after = transition(before, { type: 'SaveResolved' });
    expect(after).toBe(before);
  });
});

// ─── SaveFailed ───────────────────────────────────────────────────────────────

describe('SaveFailed', () => {
  it('moves inventory sub from applying to error with message', () => {
    let sm = withInventoryEditing();
    sm = transition(sm, { type: 'SaveRequested' });
    sm = transition(sm, { type: 'SaveFailed', message: 'Network error' });
    expect(sm.tabs.inventory.sub.kind).toBe('error');
    if (sm.tabs.inventory.sub.kind === 'error') {
      expect(sm.tabs.inventory.sub.message).toBe('Network error');
    }
  });

  it('is a no-op when not applying', () => {
    const before = withInventoryItemSelected();
    const after = transition(before, { type: 'SaveFailed', message: 'err' });
    expect(after).toBe(before);
  });
});

// ─── ErrorDismissed ───────────────────────────────────────────────────────────

describe('ErrorDismissed', () => {
  it('resets sub from error back to editing', () => {
    let sm = withInventoryEditing();
    sm = transition(sm, { type: 'SaveRequested' });
    sm = transition(sm, { type: 'SaveFailed', message: 'err' });
    sm = transition(sm, { type: 'ErrorDismissed' });
    expect(sm.tabs.inventory.sub.kind).toBe('editing');
  });

  it('is a no-op when not in error', () => {
    const before = withInventoryItemSelected();
    const after = transition(before, { type: 'ErrorDismissed' });
    expect(after).toBe(before);
  });
});

// ─── DeleteRequested ──────────────────────────────────────────────────────────

describe('DeleteRequested', () => {
  it('moves inventory sub to confirm-delete', () => {
    const sm = transition(withInventoryItemSelected(), { type: 'DeleteRequested', id: 'n1', name: 'Cal-Mag' });
    expect(sm.tabs.inventory.sub).toEqual({ kind: 'confirm-delete', id: 'n1', name: 'Cal-Mag' });
  });

  it('is a no-op when editing', () => {
    const before = withInventoryEditing();
    const after = transition(before, { type: 'DeleteRequested', id: 'n1', name: 'Cal-Mag' });
    expect(after).toBe(before);
  });

  it('is a no-op when applying', () => {
    const applying = transition(withInventoryEditing(), { type: 'SaveRequested' });
    const after = transition(applying, { type: 'DeleteRequested', id: 'n1', name: 'Cal-Mag' });
    expect(after).toBe(applying);
  });
});

// ─── DeleteConfirmed ──────────────────────────────────────────────────────────

describe('DeleteConfirmed', () => {
  it('moves sub from confirm-delete to applying', () => {
    let sm = transition(withInventoryItemSelected(), { type: 'DeleteRequested', id: 'n1', name: 'Cal-Mag' });
    sm = transition(sm, { type: 'DeleteConfirmed' });
    expect(sm.tabs.inventory.sub.kind).toBe('applying');
  });

  it('is a no-op when not in confirm-delete', () => {
    const before = withInventoryItemSelected();
    const after = transition(before, { type: 'DeleteConfirmed' });
    expect(after).toBe(before);
  });
});

// ─── DeleteResolved ───────────────────────────────────────────────────────────

describe('DeleteResolved', () => {
  it('resets sub to idle and clears selectedId', () => {
    let sm = transition(withInventoryItemSelected(), { type: 'DeleteRequested', id: 'n1', name: 'Cal-Mag' });
    sm = transition(sm, { type: 'DeleteConfirmed' });
    sm = transition(sm, { type: 'DeleteResolved' });
    expect(sm.tabs.inventory.sub.kind).toBe('idle');
    expect(sm.tabs.inventory.selectedId).toBeNull();
  });

  it('sets a deleted toast', () => {
    let sm = transition(withInventoryItemSelected(), { type: 'DeleteRequested', id: 'n1', name: 'Cal-Mag' });
    sm = transition(sm, { type: 'DeleteConfirmed' });
    sm = transition(sm, { type: 'DeleteResolved' });
    expect(sm.toast).toBeTruthy();
  });

  it('is a no-op when not applying', () => {
    const before = withInventoryItemSelected();
    const after = transition(before, { type: 'DeleteResolved' });
    expect(after).toBe(before);
  });
});

// ─── DeleteCancelled ──────────────────────────────────────────────────────────

describe('DeleteCancelled', () => {
  it('returns sub to idle', () => {
    let sm = transition(withInventoryItemSelected('n1'), { type: 'DeleteRequested', id: 'n1', name: 'Cal-Mag' });
    sm = transition(sm, { type: 'DeleteCancelled' });
    expect(sm.tabs.inventory.sub.kind).toBe('idle');
  });

  it('preserves selectedId', () => {
    let sm = transition(withInventoryItemSelected('n1'), { type: 'DeleteRequested', id: 'n1', name: 'Cal-Mag' });
    sm = transition(sm, { type: 'DeleteCancelled' });
    expect(sm.tabs.inventory.selectedId).toBe('n1');
  });

  it('is a no-op when not in confirm-delete', () => {
    const before = withInventoryItemSelected();
    const after = transition(before, { type: 'DeleteCancelled' });
    expect(after).toBe(before);
  });
});

// ─── isLowStock ───────────────────────────────────────────────────────────────

describe('isLowStock', () => {
  it('returns false at 100% fill', () => {
    expect(isLowStock(aStock({ current_ml: 1000, initial_ml: 1000 }))).toBe(false);
  });

  it('returns false at 26% fill', () => {
    expect(isLowStock(aStock({ current_ml: 260, initial_ml: 1000 }))).toBe(false);
  });

  it('returns true at exactly 25% fill', () => {
    expect(isLowStock(aStock({ current_ml: 250, initial_ml: 1000 }))).toBe(true);
  });

  it('returns true below 25% fill', () => {
    expect(isLowStock(aStock({ current_ml: 100, initial_ml: 1000 }))).toBe(true);
  });

  it('returns false when initial_ml is zero', () => {
    expect(isLowStock(aStock({ current_ml: 0, initial_ml: 0 }))).toBe(false);
  });
});

// ─── Full drill-down lifecycle ────────────────────────────────────────────────

describe('full inventory drill-down lifecycle', () => {
  it('list → select → edit → save → back to list', () => {
    let sm = idle();
    expect(sm.tabs.inventory.selectedId).toBeNull();

    sm = transition(sm, { type: 'ItemSelected', id: 'n1' });
    expect(sm.tabs.inventory.selectedId).toBe('n1');
    expect(sm.tabs.inventory.sub.kind).toBe('idle');

    sm = transition(sm, {
      type: 'EditStarted',
      draft: { name: 'Cal-Mag', current_ml: 500, initial_ml: 1000, brand: '', stockType: 'calmag', npk: '', dose_ml_l: 2, notes: '' },
    });
    expect(sm.tabs.inventory.sub.kind).toBe('editing');

    sm = transition(sm, { type: 'SaveRequested' });
    expect(sm.tabs.inventory.sub.kind).toBe('applying');

    sm = transition(sm, { type: 'SaveResolved' });
    expect(sm.tabs.inventory.sub.kind).toBe('idle');
    expect(sm.tabs.inventory.selectedId).toBeNull();
  });

  it('list → select → delete → confirm → back to list', () => {
    let sm = transition(idle(), { type: 'ItemSelected', id: 'n1' });
    sm = transition(sm, { type: 'DeleteRequested', id: 'n1', name: 'Cal-Mag' });
    expect(sm.tabs.inventory.sub.kind).toBe('confirm-delete');

    sm = transition(sm, { type: 'DeleteConfirmed' });
    expect(sm.tabs.inventory.sub.kind).toBe('applying');

    sm = transition(sm, { type: 'DeleteResolved' });
    expect(sm.tabs.inventory.selectedId).toBeNull();
  });

  it('tab switch blocked by dirty guard → confirm discard → switch succeeds', () => {
    let sm = transition(idle(), { type: 'TabSelected', tab: 'inventory' });
    sm = transition(sm, { type: 'ItemSelected', id: 'n1' });
    sm = transition(sm, {
      type: 'EditStarted',
      draft: { name: 'Cal-Mag', current_ml: 500, initial_ml: 1000, brand: '', stockType: 'calmag', npk: '', dose_ml_l: 2, notes: '' },
    });

    sm = transition(sm, { type: 'TabSelected', tab: 'presets' });
    expect(sm.status.kind).toBe('confirm-discard');
    expect(sm.activeTab).toBe('inventory');

    sm = transition(sm, { type: 'DiscardConfirmed' });
    expect(sm.activeTab).toBe('presets');
    expect(sm.tabs.inventory.sub.kind).toBe('idle');
    expect(sm.tabs.inventory.selectedId).toBeNull();
  });
});
