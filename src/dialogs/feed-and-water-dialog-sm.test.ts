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
  type SM,
  type TabId,
  type WateringDraft,
} from './feed-and-water-dialog-sm';
import type { DialogStateMachine } from './dialog-sm';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function idle(): SM {
  return createInitialSM();
}

function withInventoryEditing(): SM {
  const sm = idle();
  return {
    ...sm,
    tabs: {
      ...sm.tabs,
      inventory: { sub: { kind: 'editing' } },
    },
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
