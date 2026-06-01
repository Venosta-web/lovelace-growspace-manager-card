/**
 * Unit tests for the Nutrient Dialog State Machine.
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
  type NutrientStockDraft,
  type NutrientPresetDraft,
} from './nutrient-dialog-sm';
import type { NutrientStock } from '../slices/nutrient';

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

function withPresetsTab(): SM {
  return transition(idle(), { type: 'TabSelected', tab: 'presets' });
}

function withPresetsItemSelected(id = 'p1'): SM {
  return transition(withPresetsTab(), { type: 'ItemSelected', id });
}

function withPresetsEditing(id = 'p1', draft?: Partial<NutrientPresetDraft>): SM {
  return transition(withPresetsItemSelected(id), {
    type: 'EditStarted',
    draft: {
      name: 'Veg Week 1',
      stage: 'veg',
      week: 1,
      ec_target: 1.2,
      ph_target: 6.0,
      nutrients: [{ nutrient_id: 'n1', dose_ml_l: 2 }],
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
  it('starts on inventory tab', () => {
    expect(idle().activeTab).toBe('inventory');
  });

  it('starts with idle status', () => {
    expect(idle().status.kind).toBe('idle');
  });

  it('starts with no toast', () => {
    expect(idle().toast).toBeUndefined();
  });

  it('starts with no item selected in inventory', () => {
    expect(idle().tabs.inventory.selectedId).toBeNull();
  });

  it('starts with idle sub in inventory', () => {
    expect(idle().tabs.inventory.sub.kind).toBe('idle');
  });

  it('starts with no item selected in presets', () => {
    expect(idle().tabs.presets.selectedId).toBeNull();
  });

  it('starts with idle sub in presets', () => {
    expect(idle().tabs.presets.sub.kind).toBe('idle');
  });
});

// ─── TabSelected ──────────────────────────────────────────────────────────────

describe('TabSelected', () => {
  it('switches to presets when clean', () => {
    const sm = transition(idle(), { type: 'TabSelected', tab: 'presets' });
    expect(sm.activeTab).toBe('presets');
  });

  it('switches back to inventory from presets', () => {
    let sm = transition(idle(), { type: 'TabSelected', tab: 'presets' });
    sm = transition(sm, { type: 'TabSelected', tab: 'inventory' });
    expect(sm.activeTab).toBe('inventory');
  });

  it('resets selectedId when switching tabs', () => {
    const sm = transition(withInventoryItemSelected(), { type: 'TabSelected', tab: 'presets' });
    expect(sm.tabs.inventory.selectedId).toBeNull();
  });

  it('does not mutate other tab state', () => {
    const before = withPresetsItemSelected();
    const after = transition(before, { type: 'TabSelected', tab: 'inventory' });
    expect(after.tabs.inventory).toBe(before.tabs.inventory);
  });

  it('fires confirm-discard instead of switching when current tab is dirty', () => {
    const sm = transition(withInventoryEditing(), { type: 'TabSelected', tab: 'presets' });
    expect(sm.status).toEqual({ kind: 'confirm-discard', pendingTab: 'presets' });
    expect(sm.activeTab).toBe('inventory');
  });

  it('is a no-op when already on the same tab', () => {
    const before = idle();
    const after = transition(before, { type: 'TabSelected', tab: 'inventory' });
    expect(after).toBe(before);
  });
});

// ─── DiscardConfirmed / DiscardCancelled ──────────────────────────────────────

describe('DiscardConfirmed', () => {
  it('switches to the pending tab', () => {
    let sm = withInventoryEditing();
    sm = transition(sm, { type: 'TabSelected', tab: 'presets' });
    sm = transition(sm, { type: 'DiscardConfirmed' });
    expect(sm.activeTab).toBe('presets');
  });

  it('clears the dirty editing sub and resets selectedId', () => {
    let sm = withInventoryEditing();
    sm = transition(sm, { type: 'TabSelected', tab: 'presets' });
    sm = transition(sm, { type: 'DiscardConfirmed' });
    expect(sm.tabs.inventory.sub.kind).toBe('idle');
    expect(sm.tabs.inventory.selectedId).toBeNull();
  });

  it('restores idle status after discarding', () => {
    let sm = withInventoryEditing();
    sm = transition(sm, { type: 'TabSelected', tab: 'presets' });
    sm = transition(sm, { type: 'DiscardConfirmed' });
    expect(sm.status.kind).toBe('idle');
  });

  it('is a no-op when status is not confirm-discard', () => {
    const before = idle();
    const after = transition(before, { type: 'DiscardConfirmed' });
    expect(after).toBe(before);
  });
});

describe('DiscardCancelled', () => {
  it('stays on the current tab', () => {
    let sm = withInventoryEditing();
    sm = transition(sm, { type: 'TabSelected', tab: 'presets' });
    sm = transition(sm, { type: 'DiscardCancelled' });
    expect(sm.activeTab).toBe('inventory');
  });

  it('restores idle status', () => {
    let sm = withInventoryEditing();
    sm = transition(sm, { type: 'TabSelected', tab: 'presets' });
    sm = transition(sm, { type: 'DiscardCancelled' });
    expect(sm.status.kind).toBe('idle');
  });

  it('preserves the editing sub', () => {
    let sm = withInventoryEditing();
    sm = transition(sm, { type: 'TabSelected', tab: 'presets' });
    sm = transition(sm, { type: 'DiscardCancelled' });
    expect(sm.tabs.inventory.sub.kind).toBe('editing');
  });

  it('is a no-op when status is not confirm-discard', () => {
    const before = idle();
    const after = transition(before, { type: 'DiscardCancelled' });
    expect(after).toBe(before);
  });
});

// ─── ItemSelected ─────────────────────────────────────────────────────────────

describe('ItemSelected', () => {
  it('sets selectedId on the active tab', () => {
    const sm = transition(idle(), { type: 'ItemSelected', id: 'n1' });
    expect(sm.tabs.inventory.selectedId).toBe('n1');
  });

  it('sets selectedId on the presets tab when presets is active', () => {
    const sm = transition(withPresetsTab(), { type: 'ItemSelected', id: 'p1' });
    expect(sm.tabs.presets.selectedId).toBe('p1');
  });

  it('does not affect the other tab', () => {
    const before = idle();
    const after = transition(before, { type: 'ItemSelected', id: 'n1' });
    expect(after.tabs.presets).toBe(before.tabs.presets);
  });

  it('sub remains idle after selecting', () => {
    const sm = transition(idle(), { type: 'ItemSelected', id: 'n1' });
    expect(sm.tabs.inventory.sub.kind).toBe('idle');
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

  it('does not affect the other tab', () => {
    const before = withPresetsItemSelected();
    const after = transition(before, { type: 'BackToList' });
    expect(after.tabs.inventory).toBe(before.tabs.inventory);
  });
});

// ─── NewItemRequested ─────────────────────────────────────────────────────────

describe('NewItemRequested', () => {
  it('sets sub to editing with an empty stock draft on inventory tab', () => {
    const sm = transition(idle(), { type: 'NewItemRequested' });
    expect(sm.tabs.inventory.sub.kind).toBe('editing');
    if (sm.tabs.inventory.sub.kind === 'editing') {
      expect(sm.tabs.inventory.sub.draft).toMatchObject({ name: '', current_ml: 0, initial_ml: 0 });
    }
  });

  it('sets sub to editing with an empty preset draft on presets tab', () => {
    const sm = transition(withPresetsTab(), { type: 'NewItemRequested' });
    expect(sm.tabs.presets.sub.kind).toBe('editing');
    if (sm.tabs.presets.sub.kind === 'editing') {
      expect(sm.tabs.presets.sub.draft).toMatchObject({ name: '', nutrients: [] });
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
  it('sets sub to editing with the provided stock draft', () => {
    const sm = withInventoryEditing('n1');
    expect(sm.tabs.inventory.sub.kind).toBe('editing');
    if (sm.tabs.inventory.sub.kind === 'editing') {
      expect(sm.tabs.inventory.sub.draft).toMatchObject({ name: 'Cal-Mag' });
    }
  });

  it('sets sub to editing with the provided preset draft', () => {
    const sm = withPresetsEditing('p1');
    expect(sm.tabs.presets.sub.kind).toBe('editing');
    if (sm.tabs.presets.sub.kind === 'editing') {
      expect(sm.tabs.presets.sub.draft).toMatchObject({ name: 'Veg Week 1' });
    }
  });

  it('is a no-op when no item is selected (selectedId is null) and not new', () => {
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
  it('updates a field in the stock draft', () => {
    let sm = withInventoryEditing();
    sm = transition(sm, { type: 'StockDraftChanged', field: 'name', value: 'New Name' });
    if (sm.tabs.inventory.sub.kind === 'editing') {
      expect((sm.tabs.inventory.sub.draft as NutrientStockDraft).name).toBe('New Name');
    }
  });

  it('does not affect the presets tab', () => {
    const before = withInventoryEditing();
    const after = transition(before, { type: 'StockDraftChanged', field: 'name', value: 'X' });
    expect(after.tabs.presets).toBe(before.tabs.presets);
  });

  it('is a no-op when not editing', () => {
    const before = withInventoryItemSelected();
    const after = transition(before, { type: 'StockDraftChanged', field: 'name', value: 'X' });
    expect(after).toBe(before);
  });
});

// ─── PresetDraftChanged ───────────────────────────────────────────────────────

describe('PresetDraftChanged', () => {
  it('updates a scalar field in the preset draft', () => {
    let sm = withPresetsEditing();
    sm = transition(sm, { type: 'PresetDraftChanged', field: 'name', value: 'Week 2' });
    if (sm.tabs.presets.sub.kind === 'editing') {
      expect((sm.tabs.presets.sub.draft as NutrientPresetDraft).name).toBe('Week 2');
    }
  });

  it('does not affect the inventory tab', () => {
    const before = withPresetsEditing();
    const after = transition(before, { type: 'PresetDraftChanged', field: 'name', value: 'X' });
    expect(after.tabs.inventory).toBe(before.tabs.inventory);
  });

  it('is a no-op when not editing', () => {
    const before = withPresetsItemSelected();
    const after = transition(before, { type: 'PresetDraftChanged', field: 'name', value: 'X' });
    expect(after).toBe(before);
  });
});

// ─── PresetNutrientRowAdded ───────────────────────────────────────────────────

describe('PresetNutrientRowAdded', () => {
  it('appends an empty nutrient row to the preset draft', () => {
    let sm = withPresetsEditing();
    sm = transition(sm, { type: 'PresetNutrientRowAdded' });
    if (sm.tabs.presets.sub.kind === 'editing') {
      const draft = sm.tabs.presets.sub.draft as NutrientPresetDraft;
      expect(draft.nutrients).toHaveLength(2);
      expect(draft.nutrients[1]).toEqual({ nutrient_id: '', dose_ml_l: 0 });
    }
  });

  it('is a no-op when not editing a preset', () => {
    const before = withPresetsItemSelected();
    const after = transition(before, { type: 'PresetNutrientRowAdded' });
    expect(after).toBe(before);
  });
});

// ─── PresetNutrientRowRemoved ─────────────────────────────────────────────────

describe('PresetNutrientRowRemoved', () => {
  it('removes the nutrient row at the given index', () => {
    let sm = withPresetsEditing('p1', {
      nutrients: [
        { nutrient_id: 'n1', dose_ml_l: 2 },
        { nutrient_id: 'n2', dose_ml_l: 1 },
      ],
    });
    sm = transition(sm, { type: 'PresetNutrientRowRemoved', index: 0 });
    if (sm.tabs.presets.sub.kind === 'editing') {
      const draft = sm.tabs.presets.sub.draft as NutrientPresetDraft;
      expect(draft.nutrients).toHaveLength(1);
      expect(draft.nutrients[0].nutrient_id).toBe('n2');
    }
  });

  it('is a no-op when not editing', () => {
    const before = withPresetsItemSelected();
    const after = transition(before, { type: 'PresetNutrientRowRemoved', index: 0 });
    expect(after).toBe(before);
  });
});

// ─── PresetNutrientRowUpdated ─────────────────────────────────────────────────

describe('PresetNutrientRowUpdated', () => {
  it('merges partial updates into the nutrient row at the given index', () => {
    let sm = withPresetsEditing();
    sm = transition(sm, { type: 'PresetNutrientRowUpdated', index: 0, patch: { dose_ml_l: 3.5 } });
    if (sm.tabs.presets.sub.kind === 'editing') {
      const draft = sm.tabs.presets.sub.draft as NutrientPresetDraft;
      expect(draft.nutrients[0].dose_ml_l).toBe(3.5);
      expect(draft.nutrients[0].nutrient_id).toBe('n1');
    }
  });

  it('is a no-op when not editing', () => {
    const before = withPresetsItemSelected();
    const after = transition(before, { type: 'PresetNutrientRowUpdated', index: 0, patch: { dose_ml_l: 5 } });
    expect(after).toBe(before);
  });
});

// ─── SaveRequested ────────────────────────────────────────────────────────────

describe('SaveRequested', () => {
  it('moves inventory sub from editing to applying', () => {
    const sm = transition(withInventoryEditing(), { type: 'SaveRequested' });
    expect(sm.tabs.inventory.sub.kind).toBe('applying');
  });

  it('moves presets sub from editing to applying', () => {
    const sm = transition(withPresetsEditing(), { type: 'SaveRequested' });
    expect(sm.tabs.presets.sub.kind).toBe('applying');
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
  it('moves inventory sub from applying to error', () => {
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

  it('is a no-op when not applying', () => {
    const before = withInventoryItemSelected();
    const after = transition(before, { type: 'DeleteResolved' });
    expect(after).toBe(before);
  });
});

// ─── DeleteCancelled ──────────────────────────────────────────────────────────

describe('DeleteCancelled', () => {
  it('returns sub to idle', () => {
    let sm = transition(withInventoryItemSelected(), { type: 'DeleteRequested', id: 'n1', name: 'Cal-Mag' });
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

// ─── SetToast ─────────────────────────────────────────────────────────────────

describe('SetToast', () => {
  it('sets a toast message', () => {
    const sm = transition(idle(), { type: 'SetToast', message: 'Saved!' });
    expect(sm.toast).toBe('Saved!');
  });

  it('clears a toast message', () => {
    let sm = transition(idle(), { type: 'SetToast', message: 'Saved!' });
    sm = transition(sm, { type: 'SetToast', message: undefined });
    expect(sm.toast).toBeUndefined();
  });
});

// ─── isTabDirty ───────────────────────────────────────────────────────────────

describe('isTabDirty', () => {
  it('returns false when sub is idle', () => {
    expect(isTabDirty(idle(), 'inventory')).toBe(false);
  });

  it('returns false when sub is confirm-delete', () => {
    const sm = transition(withInventoryItemSelected(), { type: 'DeleteRequested', id: 'n1', name: 'X' });
    expect(isTabDirty(sm, 'inventory')).toBe(false);
  });

  it('returns true when sub is editing', () => {
    expect(isTabDirty(withInventoryEditing(), 'inventory')).toBe(true);
  });

  it('returns true for presets tab when presets is editing', () => {
    expect(isTabDirty(withPresetsEditing(), 'presets')).toBe(true);
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

  it('returns false when initial_ml is zero (avoid division by zero)', () => {
    expect(isLowStock(aStock({ current_ml: 0, initial_ml: 0 }))).toBe(false);
  });
});

// ─── Full drill-down lifecycle ────────────────────────────────────────────────

describe('full drill-down lifecycle', () => {
  it('inventory: list → select → edit → save → back to list', () => {
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

  it('inventory: list → select → delete → confirm → back to list', () => {
    let sm = transition(idle(), { type: 'ItemSelected', id: 'n1' });
    sm = transition(sm, { type: 'DeleteRequested', id: 'n1', name: 'Cal-Mag' });
    expect(sm.tabs.inventory.sub.kind).toBe('confirm-delete');

    sm = transition(sm, { type: 'DeleteConfirmed' });
    expect(sm.tabs.inventory.sub.kind).toBe('applying');

    sm = transition(sm, { type: 'DeleteResolved' });
    expect(sm.tabs.inventory.selectedId).toBeNull();
  });

  it('tab switch blocked by dirty guard → confirm discard → switch succeeds', () => {
    let sm = withInventoryEditing();
    sm = transition(sm, { type: 'TabSelected', tab: 'presets' });
    expect(sm.status.kind).toBe('confirm-discard');
    expect(sm.activeTab).toBe('inventory');

    sm = transition(sm, { type: 'DiscardConfirmed' });
    expect(sm.activeTab).toBe('presets');
    expect(sm.tabs.inventory.sub.kind).toBe('idle');
  });
});
