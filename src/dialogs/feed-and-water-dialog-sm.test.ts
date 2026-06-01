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
} from './feed-and-water-dialog-sm';
import type { DialogStateMachine } from './dialog-sm';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function idle(): SM {
  return createInitialSM();
}

function withWateringEditing(): SM {
  const sm = idle();
  return {
    ...sm,
    tabs: {
      ...sm.tabs,
      watering: { sub: { kind: 'editing' } },
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
    const sm = transition(withWateringEditing(), { type: 'TabSelected', tab: 'inventory' });
    expect(sm.status.kind).toBe('confirm-discard');
    if (sm.status.kind === 'confirm-discard') {
      expect(sm.status.pendingTab).toBe('inventory');
    }
  });

  it('does not switch tab yet when entering confirm-discard', () => {
    const sm = transition(withWateringEditing(), { type: 'TabSelected', tab: 'inventory' });
    expect(sm.activeTab).toBe('watering');
  });

  it('is a no-op when status is already confirm-discard', () => {
    const dirty = withWateringEditing();
    const withConfirm = transition(dirty, { type: 'TabSelected', tab: 'inventory' });
    const again = transition(withConfirm, { type: 'TabSelected', tab: 'presets' });
    expect(again).toBe(withConfirm);
  });
});

// ─── DiscardConfirmed ─────────────────────────────────────────────────────────

describe('DiscardConfirmed', () => {
  it('switches to the pending tab', () => {
    const dirty = withWateringEditing();
    const withConfirm = transition(dirty, { type: 'TabSelected', tab: 'inventory' });
    const sm = transition(withConfirm, { type: 'DiscardConfirmed' });
    expect(sm.activeTab).toBe('inventory');
  });

  it('resets status to idle', () => {
    const dirty = withWateringEditing();
    const withConfirm = transition(dirty, { type: 'TabSelected', tab: 'inventory' });
    const sm = transition(withConfirm, { type: 'DiscardConfirmed' });
    expect(sm.status.kind).toBe('idle');
  });

  it('resets the previously-dirty tab to idle sub-state', () => {
    const dirty = withWateringEditing();
    const withConfirm = transition(dirty, { type: 'TabSelected', tab: 'inventory' });
    const sm = transition(withConfirm, { type: 'DiscardConfirmed' });
    expect(sm.tabs.watering.sub.kind).toBe('idle');
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
    const dirty = withWateringEditing();
    const withConfirm = transition(dirty, { type: 'TabSelected', tab: 'inventory' });
    const sm = transition(withConfirm, { type: 'DiscardCancelled' });
    expect(sm.status.kind).toBe('idle');
  });

  it('stays on the current tab', () => {
    const dirty = withWateringEditing();
    const withConfirm = transition(dirty, { type: 'TabSelected', tab: 'inventory' });
    const sm = transition(withConfirm, { type: 'DiscardCancelled' });
    expect(sm.activeTab).toBe('watering');
  });

  it('preserves the dirty sub-state', () => {
    const dirty = withWateringEditing();
    const withConfirm = transition(dirty, { type: 'TabSelected', tab: 'inventory' });
    const sm = transition(withConfirm, { type: 'DiscardCancelled' });
    expect(sm.tabs.watering.sub.kind).toBe('editing');
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
    expect(isTabDirty(idle(), 'watering')).toBe(false);
  });

  it('returns true for editing tab', () => {
    expect(isTabDirty(withWateringEditing(), 'watering')).toBe(true);
  });

  it('returns false for non-active tabs', () => {
    expect(isTabDirty(idle(), 'inventory')).toBe(false);
    expect(isTabDirty(idle(), 'presets')).toBe(false);
  });
});
