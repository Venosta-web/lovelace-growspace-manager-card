/**
 * Crop Steering Dialog State Machine
 *
 * Pure module — no Lit, no DOM. All interaction state for CropSteeringDialog lives here.
 * The component calls `transition(sm, event)` and replaces its single `@state() _sm`.
 *
 * Structure:
 *   DialogSM
 *     .activeTab          — 'diagnostics' (read-only) | 'settings' (draft + phase confirm)
 *     .status             — root-level tab-switch dirty guard
 *     .toast              — transient feedback message
 *     .tabs               — one typed state object per tab
 */

import type { GrowspaceDevice } from '../types';
import type { ECTargetRange } from '../services/types';

// ─── Shared ───────────────────────────────────────────────────────────────────

export type Phase = 'p1' | 'p2' | 'p3';

export type TabId = 'diagnostics' | 'settings';

// ─── Diagnostics tab ──────────────────────────────────────────────────────────

export interface DiagnosticsTabState {
  sub: { kind: 'idle' };
}

// ─── Settings tab ─────────────────────────────────────────────────────────────

export interface SettingsDraft {
  phase: Phase;
  ecTargetRanges: ECTargetRange[];
}

export type SettingsSubState =
  | { kind: 'idle' }
  | { kind: 'confirm-phase'; pending: Phase }
  | { kind: 'phase-applying' }
  | { kind: 'ec-applying' }
  | { kind: 'error'; source: 'phase' | 'ec'; message: string };

export interface SettingsTabState {
  draft: SettingsDraft;
  sub: SettingsSubState;
}

// ─── Root SM ──────────────────────────────────────────────────────────────────

export interface TabStates {
  diagnostics: DiagnosticsTabState;
  settings: SettingsTabState;
}

export type DialogStatus = { kind: 'idle' } | { kind: 'confirm-discard'; pendingTab: TabId };

export interface DialogSM {
  activeTab: TabId;
  tabs: TabStates;
  status: DialogStatus;
  toast: string | undefined;
}

// ─── Events ───────────────────────────────────────────────────────────────────

export type DialogEvent =
  // ── Navigation ──
  | { type: 'REQUEST_TAB'; tab: TabId }
  | { type: 'SWITCH_TAB'; tab: TabId }
  | { type: 'DISCARD_AND_SWITCH' }
  | { type: 'CANCEL_TAB_SWITCH' }

  // ── Phase ──
  | { type: 'REQUEST_PHASE_CHANGE'; phase: Phase }
  | { type: 'CONFIRM_PHASE_CHANGE' }
  | { type: 'CANCEL_PHASE_CHANGE' }
  | { type: 'PHASE_SAVE_RESOLVED' }
  | { type: 'PHASE_SAVE_FAILED'; message: string }

  // ── EC Targets ──
  | { type: 'UPDATE_EC_TARGETS_DRAFT'; ranges: ECTargetRange[] }
  | { type: 'SET_EC_APPLYING'; applying: boolean }
  | { type: 'EC_SAVE_RESOLVED' }
  | { type: 'EC_SAVE_FAILED'; message: string }

  // ── Global ──
  | { type: 'SET_TOAST'; message: string | undefined }
  | { type: 'RESET_FROM_DEVICE'; device: GrowspaceDevice };

// ─── Default EC ranges ────────────────────────────────────────────────────────

const EC_STAGES = ['seedling', 'veg', 'flower_early', 'flower_mid', 'flower_late'] as const;

function defaultEcTargetRanges(): ECTargetRange[] {
  return EC_STAGES.map((stage) => ({ stage, minEc: 0, maxEc: 0 }));
}

function ecRangesFromDevice(device: GrowspaceDevice): ECTargetRange[] {
  const ranges = device.irrigationConfig?.ecTargetRanges;
  if (!ranges || ranges.length === 0) return defaultEcTargetRanges();
  return EC_STAGES.map((stage) => {
    const found = ranges.find((r) => r.stage === stage);
    return found ?? { stage, minEc: 0, maxEc: 0 };
  });
}

function defaultTabs(): TabStates {
  return {
    diagnostics: { sub: { kind: 'idle' } },
    settings: {
      draft: { phase: 'p2', ecTargetRanges: defaultEcTargetRanges() },
      sub: { kind: 'idle' },
    },
  };
}

// ─── Initial state ────────────────────────────────────────────────────────────

export function createInitialSM(device?: GrowspaceDevice): DialogSM {
  const sm: DialogSM = {
    activeTab: 'diagnostics',
    tabs: defaultTabs(),
    status: { kind: 'idle' },
    toast: undefined,
  };
  if (device) {
    return applyDeviceToSM(sm, device);
  }
  return sm;
}

function applyDeviceToSM(sm: DialogSM, device: GrowspaceDevice): DialogSM {
  const phase: Phase =
    (device.irrigationConfig?.activeSteeringPhase as Phase | undefined) ??
    sm.tabs.settings.draft.phase;
  const ecTargetRanges = ecRangesFromDevice(device);

  return {
    ...sm,
    tabs: {
      ...sm.tabs,
      settings: {
        ...sm.tabs.settings,
        draft: { phase, ecTargetRanges },
      },
    },
  };
}

// ─── Dirty predicates ─────────────────────────────────────────────────────────

export function isSettingsDirty(sm: DialogSM, device: GrowspaceDevice): boolean {
  const d = sm.tabs.settings.draft;
  const devicePhase =
    (device.irrigationConfig?.activeSteeringPhase as Phase | undefined) ?? 'p2';
  if (d.phase !== devicePhase) return true;

  const deviceRanges = device.irrigationConfig?.ecTargetRanges ?? [];
  if (deviceRanges.length === 0) {
    return d.ecTargetRanges.some((r) => r.minEc !== 0 || r.maxEc !== 0);
  }
  return d.ecTargetRanges.some((dr) => {
    const deviceRange = deviceRanges.find((r) => r.stage === dr.stage);
    return !deviceRange || deviceRange.minEc !== dr.minEc || deviceRange.maxEc !== dr.maxEc;
  });
}

export function isActiveTabDirty(sm: DialogSM, device: GrowspaceDevice): boolean {
  if (sm.activeTab === 'settings') return isSettingsDirty(sm, device);
  return false;
}

// ─── Draft reset helper ───────────────────────────────────────────────────────

function resetSettingsDraft(sm: DialogSM, device: GrowspaceDevice): TabStates {
  const phase: Phase =
    (device.irrigationConfig?.activeSteeringPhase as Phase | undefined) ??
    sm.tabs.settings.draft.phase;
  return {
    ...sm.tabs,
    settings: {
      draft: { phase, ecTargetRanges: ecRangesFromDevice(device) },
      sub: { kind: 'idle' },
    },
  };
}

// ─── Convenience wrappers ─────────────────────────────────────────────────────

export function requestTabSwitch(sm: DialogSM, tab: TabId, device: GrowspaceDevice): DialogSM {
  if (sm.activeTab === tab) return sm;
  if (isActiveTabDirty(sm, device)) {
    return transition(sm, { type: 'REQUEST_TAB', tab });
  }
  return transition(sm, { type: 'SWITCH_TAB', tab });
}

export function discardAndSwitch(sm: DialogSM, device: GrowspaceDevice): DialogSM {
  if (sm.status.kind !== 'confirm-discard') return sm;
  const tabs = resetSettingsDraft(sm, device);
  return {
    ...sm,
    activeTab: sm.status.pendingTab,
    status: { kind: 'idle' },
    tabs,
  };
}

// ─── Transition ───────────────────────────────────────────────────────────────

export function transition(sm: DialogSM, event: DialogEvent): DialogSM {
  switch (event.type) {
    // ── Navigation ──────────────────────────────────────────────────────────

    case 'REQUEST_TAB':
      return { ...sm, status: { kind: 'confirm-discard', pendingTab: event.tab } };

    case 'SWITCH_TAB':
      return { ...sm, activeTab: event.tab, status: { kind: 'idle' } };

    case 'DISCARD_AND_SWITCH': {
      if (sm.status.kind !== 'confirm-discard') return sm;
      return { ...sm, activeTab: sm.status.pendingTab, status: { kind: 'idle' } };
    }

    case 'CANCEL_TAB_SWITCH':
      return { ...sm, status: { kind: 'idle' } };

    // ── Phase ────────────────────────────────────────────────────────────────

    case 'REQUEST_PHASE_CHANGE':
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          settings: {
            ...sm.tabs.settings,
            sub: { kind: 'confirm-phase', pending: event.phase },
          },
        },
      };

    case 'CONFIRM_PHASE_CHANGE': {
      const sub = sm.tabs.settings.sub;
      if (sub.kind !== 'confirm-phase') return sm;
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          settings: {
            ...sm.tabs.settings,
            draft: { ...sm.tabs.settings.draft, phase: sub.pending },
            sub: { kind: 'phase-applying' },
          },
        },
      };
    }

    case 'CANCEL_PHASE_CHANGE':
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          settings: { ...sm.tabs.settings, sub: { kind: 'idle' } },
        },
      };

    case 'PHASE_SAVE_RESOLVED':
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          settings: { ...sm.tabs.settings, sub: { kind: 'idle' } },
        },
      };

    case 'PHASE_SAVE_FAILED':
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          settings: {
            ...sm.tabs.settings,
            sub: { kind: 'error', source: 'phase', message: event.message },
          },
        },
      };

    // ── EC Targets ───────────────────────────────────────────────────────────

    case 'UPDATE_EC_TARGETS_DRAFT':
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          settings: {
            ...sm.tabs.settings,
            draft: { ...sm.tabs.settings.draft, ecTargetRanges: event.ranges },
          },
        },
      };

    case 'SET_EC_APPLYING':
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          settings: {
            ...sm.tabs.settings,
            sub: event.applying ? { kind: 'ec-applying' } : { kind: 'idle' },
          },
        },
      };

    case 'EC_SAVE_RESOLVED':
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          settings: { ...sm.tabs.settings, sub: { kind: 'idle' } },
        },
      };

    case 'EC_SAVE_FAILED':
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          settings: {
            ...sm.tabs.settings,
            sub: { kind: 'error', source: 'ec', message: event.message },
          },
        },
      };

    // ── Global ───────────────────────────────────────────────────────────────

    case 'SET_TOAST':
      return { ...sm, toast: event.message };

    case 'RESET_FROM_DEVICE':
      return applyDeviceToSM(sm, event.device);

    default:
      return sm;
  }
}
