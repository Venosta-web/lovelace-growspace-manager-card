/**
 * Unit tests for the Crop Steering Dialog State Machine.
 *
 * Pure transition tests — no DOM, no Lit.
 */

import { describe, it, expect } from 'vitest';
import {
  createInitialSM,
  transition,
  requestTabSwitch,
  discardAndSwitch,
  isSettingsDirty,
  isActiveTabDirty,
  type DialogSM,
  type Phase,
} from './crop-steering-dialog-sm';
import { createGrowspaceDevice } from '../services/types';
import type { ECTargetRange } from '../services/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeDevice(
  overrides: Partial<Parameters<typeof createGrowspaceDevice>[0]> = {}
) {
  return createGrowspaceDevice({ deviceId: 'gs1', name: 'Tent 1', ...overrides });
}

function makeDeviceWithPhase(phase: Phase) {
  return makeDevice({
    irrigationConfig: {
      irrigationTimes: [],
      drainTimes: [],
      activeSteeringPhase: phase,
    },
  });
}

function makeDeviceWithRanges(ranges: ECTargetRange[]) {
  return makeDevice({
    irrigationConfig: { irrigationTimes: [], drainTimes: [], ecTargetRanges: ranges },
  });
}

// ─── createInitialSM ──────────────────────────────────────────────────────────

describe('createInitialSM', () => {
  it('starts on diagnostics tab', () => {
    expect(createInitialSM().activeTab).toBe('diagnostics');
  });

  it('starts with idle status', () => {
    expect(createInitialSM().status.kind).toBe('idle');
  });

  it('starts with no toast', () => {
    expect(createInitialSM().toast).toBeUndefined();
  });

  it('diagnostics tab sub is always idle', () => {
    expect(createInitialSM().tabs.diagnostics.sub.kind).toBe('idle');
  });

  it('settings tab sub starts idle', () => {
    expect(createInitialSM().tabs.settings.sub.kind).toBe('idle');
  });

  it('seeds phase from device activeSteeringPhase', () => {
    const sm = createInitialSM(makeDeviceWithPhase('p3'));
    expect(sm.tabs.settings.draft.phase).toBe('p3');
  });

  it('defaults phase to p2 when device has no activeSteeringPhase', () => {
    const sm = createInitialSM(makeDevice());
    expect(sm.tabs.settings.draft.phase).toBe('p2');
  });

  it('seeds EC ranges from device ecTargetRanges', () => {
    const ranges: ECTargetRange[] = [
      { stage: 'seedling', minEc: 0.5, maxEc: 0.8 },
      { stage: 'veg', minEc: 1.0, maxEc: 1.4 },
      { stage: 'flower_early', minEc: 1.5, maxEc: 1.8 },
      { stage: 'flower_mid', minEc: 1.6, maxEc: 2.0 },
      { stage: 'flower_late', minEc: 1.2, maxEc: 1.6 },
    ];
    const sm = createInitialSM(makeDeviceWithRanges(ranges));
    expect(sm.tabs.settings.draft.ecTargetRanges).toEqual(ranges);
  });

  it('defaults EC ranges to all-zero when device has none', () => {
    const sm = createInitialSM(makeDevice());
    const ranges = sm.tabs.settings.draft.ecTargetRanges;
    expect(ranges).toHaveLength(5);
    expect(ranges.every((r) => r.minEc === 0 && r.maxEc === 0)).toBe(true);
  });
});

// ─── Tab navigation ───────────────────────────────────────────────────────────

describe('SWITCH_TAB', () => {
  it('moves to the specified tab', () => {
    const sm = transition(createInitialSM(), { type: 'SWITCH_TAB', tab: 'settings' });
    expect(sm.activeTab).toBe('settings');
  });

  it('clears confirm-discard status when switching', () => {
    const sm: DialogSM = {
      ...createInitialSM(),
      status: { kind: 'confirm-discard', pendingTab: 'settings' },
    };
    const next = transition(sm, { type: 'SWITCH_TAB', tab: 'settings' });
    expect(next.status.kind).toBe('idle');
  });

  it('can navigate back to diagnostics', () => {
    let sm = transition(createInitialSM(), { type: 'SWITCH_TAB', tab: 'settings' });
    sm = transition(sm, { type: 'SWITCH_TAB', tab: 'diagnostics' });
    expect(sm.activeTab).toBe('diagnostics');
  });
});

describe('REQUEST_TAB', () => {
  it('enters confirm-discard with the pending tab', () => {
    const sm = transition(createInitialSM(), { type: 'REQUEST_TAB', tab: 'settings' });
    expect(sm.status.kind).toBe('confirm-discard');
    if (sm.status.kind === 'confirm-discard') {
      expect(sm.status.pendingTab).toBe('settings');
    }
  });

  it('does not change activeTab', () => {
    const sm = transition(createInitialSM(), { type: 'REQUEST_TAB', tab: 'settings' });
    expect(sm.activeTab).toBe('diagnostics');
  });
});

describe('CANCEL_TAB_SWITCH', () => {
  it('clears confirm-discard and stays on current tab', () => {
    let sm = transition(createInitialSM(), { type: 'REQUEST_TAB', tab: 'settings' });
    sm = transition(sm, { type: 'CANCEL_TAB_SWITCH' });
    expect(sm.status.kind).toBe('idle');
    expect(sm.activeTab).toBe('diagnostics');
  });
});

describe('requestTabSwitch', () => {
  it('switches directly when active tab is clean', () => {
    const device = makeDevice();
    const sm = createInitialSM(device);
    const next = requestTabSwitch(sm, 'settings', device);
    expect(next.activeTab).toBe('settings');
    expect(next.status.kind).toBe('idle');
  });

  it('returns sm unchanged when switching to the same tab', () => {
    const device = makeDevice();
    const sm = createInitialSM(device);
    const next = requestTabSwitch(sm, 'diagnostics', device);
    expect(next).toBe(sm);
  });

  it('enters confirm-discard when settings tab is dirty', () => {
    const device = makeDeviceWithPhase('p1');
    let sm = createInitialSM(device);
    sm = transition(sm, { type: 'SWITCH_TAB', tab: 'settings' });
    sm = transition(sm, { type: 'REQUEST_PHASE_CHANGE', phase: 'p2' });
    sm = transition(sm, { type: 'CONFIRM_PHASE_CHANGE' });
    sm = transition(sm, { type: 'PHASE_SAVE_RESOLVED' });
    // phase is now p2 but device has p1 → dirty
    const next = requestTabSwitch(sm, 'diagnostics', device);
    expect(next.status.kind).toBe('confirm-discard');
  });
});

describe('discardAndSwitch', () => {
  it('returns sm unchanged when status is not confirm-discard', () => {
    const device = makeDevice();
    const sm = createInitialSM(device);
    expect(discardAndSwitch(sm, device)).toBe(sm);
  });

  it('resets settings draft to device state and switches tab', () => {
    const device = makeDeviceWithPhase('p1');
    let sm = createInitialSM(device);
    sm = transition(sm, { type: 'SWITCH_TAB', tab: 'settings' });
    // mutate draft
    sm = transition(sm, {
      type: 'UPDATE_EC_TARGETS_DRAFT',
      ranges: [
        { stage: 'seedling', minEc: 9, maxEc: 9 },
        { stage: 'veg', minEc: 9, maxEc: 9 },
        { stage: 'flower_early', minEc: 9, maxEc: 9 },
        { stage: 'flower_mid', minEc: 9, maxEc: 9 },
        { stage: 'flower_late', minEc: 9, maxEc: 9 },
      ],
    });
    sm = transition(sm, { type: 'REQUEST_TAB', tab: 'diagnostics' });
    const next = discardAndSwitch(sm, device);
    expect(next.activeTab).toBe('diagnostics');
    expect(next.status.kind).toBe('idle');
    expect(next.tabs.settings.draft.ecTargetRanges.every((r) => r.minEc === 0)).toBe(true);
  });
});

// ─── Phase change flow ────────────────────────────────────────────────────────

describe('REQUEST_PHASE_CHANGE', () => {
  it('enters confirm-phase sub-state with the pending phase', () => {
    let sm = transition(createInitialSM(), { type: 'SWITCH_TAB', tab: 'settings' });
    sm = transition(sm, { type: 'REQUEST_PHASE_CHANGE', phase: 'p3' });
    expect(sm.tabs.settings.sub.kind).toBe('confirm-phase');
    if (sm.tabs.settings.sub.kind === 'confirm-phase') {
      expect(sm.tabs.settings.sub.pending).toBe('p3');
    }
  });
});

describe('CANCEL_PHASE_CHANGE', () => {
  it('returns settings sub to idle without changing draft', () => {
    let sm = transition(createInitialSM(), { type: 'SWITCH_TAB', tab: 'settings' });
    sm = transition(sm, { type: 'REQUEST_PHASE_CHANGE', phase: 'p3' });
    sm = transition(sm, { type: 'CANCEL_PHASE_CHANGE' });
    expect(sm.tabs.settings.sub.kind).toBe('idle');
    expect(sm.tabs.settings.draft.phase).toBe('p2');
  });
});

describe('CONFIRM_PHASE_CHANGE', () => {
  it('transitions to phase-applying and commits the phase to the draft', () => {
    let sm = transition(createInitialSM(), { type: 'SWITCH_TAB', tab: 'settings' });
    sm = transition(sm, { type: 'REQUEST_PHASE_CHANGE', phase: 'p1' });
    sm = transition(sm, { type: 'CONFIRM_PHASE_CHANGE' });
    expect(sm.tabs.settings.sub.kind).toBe('phase-applying');
    expect(sm.tabs.settings.draft.phase).toBe('p1');
  });

  it('is a no-op when sub is not confirm-phase', () => {
    const sm = createInitialSM();
    const next = transition(sm, { type: 'CONFIRM_PHASE_CHANGE' });
    expect(next).toBe(sm);
  });
});

describe('PHASE_SAVE_RESOLVED', () => {
  it('returns settings sub to idle', () => {
    let sm = transition(createInitialSM(), { type: 'SWITCH_TAB', tab: 'settings' });
    sm = transition(sm, { type: 'REQUEST_PHASE_CHANGE', phase: 'p1' });
    sm = transition(sm, { type: 'CONFIRM_PHASE_CHANGE' });
    sm = transition(sm, { type: 'PHASE_SAVE_RESOLVED' });
    expect(sm.tabs.settings.sub.kind).toBe('idle');
  });
});

describe('PHASE_SAVE_FAILED', () => {
  it('enters error sub-state with source phase and message', () => {
    let sm = transition(createInitialSM(), { type: 'SWITCH_TAB', tab: 'settings' });
    sm = transition(sm, { type: 'REQUEST_PHASE_CHANGE', phase: 'p1' });
    sm = transition(sm, { type: 'CONFIRM_PHASE_CHANGE' });
    sm = transition(sm, { type: 'PHASE_SAVE_FAILED', message: 'Network error' });
    expect(sm.tabs.settings.sub.kind).toBe('error');
    if (sm.tabs.settings.sub.kind === 'error') {
      expect(sm.tabs.settings.sub.source).toBe('phase');
      expect(sm.tabs.settings.sub.message).toBe('Network error');
    }
  });
});

// ─── EC target range flow ─────────────────────────────────────────────────────

describe('UPDATE_EC_TARGETS_DRAFT', () => {
  it('replaces the ecTargetRanges in the settings draft', () => {
    const ranges: ECTargetRange[] = [
      { stage: 'seedling', minEc: 0.5, maxEc: 0.9 },
      { stage: 'veg', minEc: 1.0, maxEc: 1.5 },
      { stage: 'flower_early', minEc: 1.4, maxEc: 1.8 },
      { stage: 'flower_mid', minEc: 1.5, maxEc: 2.0 },
      { stage: 'flower_late', minEc: 1.2, maxEc: 1.6 },
    ];
    const sm = transition(createInitialSM(), { type: 'UPDATE_EC_TARGETS_DRAFT', ranges });
    expect(sm.tabs.settings.draft.ecTargetRanges).toEqual(ranges);
  });

  it('does not affect the phase', () => {
    const sm = transition(createInitialSM(), {
      type: 'UPDATE_EC_TARGETS_DRAFT',
      ranges: [
        { stage: 'seedling', minEc: 1, maxEc: 2 },
        { stage: 'veg', minEc: 1, maxEc: 2 },
        { stage: 'flower_early', minEc: 1, maxEc: 2 },
        { stage: 'flower_mid', minEc: 1, maxEc: 2 },
        { stage: 'flower_late', minEc: 1, maxEc: 2 },
      ],
    });
    expect(sm.tabs.settings.draft.phase).toBe('p2');
  });
});

describe('SET_EC_APPLYING', () => {
  it('enters ec-applying sub-state', () => {
    const sm = transition(createInitialSM(), { type: 'SET_EC_APPLYING', applying: true });
    expect(sm.tabs.settings.sub.kind).toBe('ec-applying');
  });

  it('returns to idle when applying is false', () => {
    let sm = transition(createInitialSM(), { type: 'SET_EC_APPLYING', applying: true });
    sm = transition(sm, { type: 'SET_EC_APPLYING', applying: false });
    expect(sm.tabs.settings.sub.kind).toBe('idle');
  });
});

describe('EC_SAVE_RESOLVED', () => {
  it('returns settings sub to idle', () => {
    let sm = transition(createInitialSM(), { type: 'SET_EC_APPLYING', applying: true });
    sm = transition(sm, { type: 'EC_SAVE_RESOLVED' });
    expect(sm.tabs.settings.sub.kind).toBe('idle');
  });
});

describe('EC_SAVE_FAILED', () => {
  it('enters error sub-state with source ec and message', () => {
    let sm = transition(createInitialSM(), { type: 'SET_EC_APPLYING', applying: true });
    sm = transition(sm, { type: 'EC_SAVE_FAILED', message: 'Save failed' });
    expect(sm.tabs.settings.sub.kind).toBe('error');
    if (sm.tabs.settings.sub.kind === 'error') {
      expect(sm.tabs.settings.sub.source).toBe('ec');
      expect(sm.tabs.settings.sub.message).toBe('Save failed');
    }
  });
});

// ─── Toast ────────────────────────────────────────────────────────────────────

describe('SET_TOAST', () => {
  it('sets toast message', () => {
    const sm = transition(createInitialSM(), { type: 'SET_TOAST', message: 'Saved!' });
    expect(sm.toast).toBe('Saved!');
  });

  it('clears toast when message is undefined', () => {
    let sm = transition(createInitialSM(), { type: 'SET_TOAST', message: 'Saved!' });
    sm = transition(sm, { type: 'SET_TOAST', message: undefined });
    expect(sm.toast).toBeUndefined();
  });
});

// ─── RESET_FROM_DEVICE ────────────────────────────────────────────────────────

describe('RESET_FROM_DEVICE', () => {
  it('re-seeds phase and EC ranges from the new device', () => {
    const device = makeDeviceWithPhase('p3');
    let sm = createInitialSM();
    sm = transition(sm, { type: 'RESET_FROM_DEVICE', device });
    expect(sm.tabs.settings.draft.phase).toBe('p3');
  });

  it('preserves activeTab', () => {
    let sm = transition(createInitialSM(), { type: 'SWITCH_TAB', tab: 'settings' });
    sm = transition(sm, { type: 'RESET_FROM_DEVICE', device: makeDevice() });
    expect(sm.activeTab).toBe('settings');
  });
});

// ─── isSettingsDirty ─────────────────────────────────────────────────────────

describe('isSettingsDirty', () => {
  it('returns false when draft matches device phase and empty EC ranges', () => {
    const device = makeDevice();
    const sm = createInitialSM(device);
    expect(isSettingsDirty(sm, device)).toBe(false);
  });

  it('returns true when phase differs from device', () => {
    const device = makeDeviceWithPhase('p1');
    let sm = createInitialSM(device);
    sm = transition(sm, { type: 'REQUEST_PHASE_CHANGE', phase: 'p3' });
    sm = transition(sm, { type: 'CONFIRM_PHASE_CHANGE' });
    sm = transition(sm, { type: 'PHASE_SAVE_RESOLVED' });
    expect(isSettingsDirty(sm, device)).toBe(true);
  });

  it('returns true when EC ranges differ from device', () => {
    const ranges: ECTargetRange[] = [
      { stage: 'seedling', minEc: 0.5, maxEc: 0.8 },
      { stage: 'veg', minEc: 1.0, maxEc: 1.4 },
      { stage: 'flower_early', minEc: 1.5, maxEc: 1.8 },
      { stage: 'flower_mid', minEc: 1.6, maxEc: 2.0 },
      { stage: 'flower_late', minEc: 1.2, maxEc: 1.6 },
    ];
    const device = makeDeviceWithRanges(ranges);
    let sm = createInitialSM(device);
    sm = transition(sm, {
      type: 'UPDATE_EC_TARGETS_DRAFT',
      ranges: ranges.map((r) => ({ ...r, minEc: r.minEc + 0.5 })),
    });
    expect(isSettingsDirty(sm, device)).toBe(true);
  });

  it('returns false when EC ranges match device', () => {
    const ranges: ECTargetRange[] = [
      { stage: 'seedling', minEc: 0.5, maxEc: 0.8 },
      { stage: 'veg', minEc: 1.0, maxEc: 1.4 },
      { stage: 'flower_early', minEc: 1.5, maxEc: 1.8 },
      { stage: 'flower_mid', minEc: 1.6, maxEc: 2.0 },
      { stage: 'flower_late', minEc: 1.2, maxEc: 1.6 },
    ];
    const device = makeDeviceWithRanges(ranges);
    const sm = createInitialSM(device);
    expect(isSettingsDirty(sm, device)).toBe(false);
  });
});

// ─── isActiveTabDirty ────────────────────────────────────────────────────────

describe('isActiveTabDirty', () => {
  it('returns false on diagnostics tab (always clean)', () => {
    const device = makeDevice();
    expect(isActiveTabDirty(createInitialSM(device), device)).toBe(false);
  });

  it('delegates to isSettingsDirty when on settings tab', () => {
    const device = makeDeviceWithPhase('p1');
    let sm = createInitialSM(device);
    sm = transition(sm, { type: 'SWITCH_TAB', tab: 'settings' });
    sm = transition(sm, { type: 'REQUEST_PHASE_CHANGE', phase: 'p2' });
    sm = transition(sm, { type: 'CONFIRM_PHASE_CHANGE' });
    sm = transition(sm, { type: 'PHASE_SAVE_RESOLVED' });
    expect(isActiveTabDirty(sm, device)).toBe(true);
  });
});

// ─── Immutability ─────────────────────────────────────────────────────────────

describe('immutability', () => {
  it('every transition returns a new object reference', () => {
    const sm = createInitialSM();
    const events: Parameters<typeof transition>[1][] = [
      { type: 'SWITCH_TAB', tab: 'settings' },
      { type: 'REQUEST_PHASE_CHANGE', phase: 'p1' },
      { type: 'CANCEL_PHASE_CHANGE' },
      { type: 'UPDATE_EC_TARGETS_DRAFT', ranges: [] },
      { type: 'SET_TOAST', message: 'hi' },
    ];
    for (const event of events) {
      const next = transition(sm, event);
      expect(next).not.toBe(sm);
    }
  });

  it('unknown event type returns the same reference', () => {
    const sm = createInitialSM();
    const next = transition(sm, { type: 'UNKNOWN_EVENT' } as Parameters<typeof transition>[1]);
    expect(next).toBe(sm);
  });
});
