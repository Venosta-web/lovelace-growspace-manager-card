/**
 * Feed & Water Dialog State Machine
 *
 * Pure module — no Lit, no DOM, no hassCall. All interaction state for
 * FeedAndWaterDialog lives here. The component calls `transition(sm, event)`
 * and replaces its single `@state() _sm`.
 *
 * Satisfies DialogStateMachine.
 *
 * Structure:
 *   SM
 *     .activeTab          — 'watering' | 'inventory' | 'presets'
 *     .tabs               — per-tab state stubs (content added in follow-on issues)
 *     .status             — root confirm-discard guard
 *     .toast              — transient feedback message
 */

import type { DialogStateMachine } from './dialog-sm';

// ─── Tab IDs ──────────────────────────────────────────────────────────────────

export type TabId = 'watering' | 'inventory' | 'presets';

// ─── Per-tab sub-states ───────────────────────────────────────────────────────

export type WateringSub = { kind: 'idle' } | { kind: 'editing' };
export type InventorySub = { kind: 'idle' } | { kind: 'editing' };
export type PresetsSub = { kind: 'idle' } | { kind: 'editing' };

export interface WateringTabState {
  sub: WateringSub;
}

export interface InventoryTabState {
  sub: InventorySub;
}

export interface PresetsTabState {
  sub: PresetsSub;
}

export interface TabStates {
  watering: WateringTabState;
  inventory: InventoryTabState;
  presets: PresetsTabState;
}

// ─── Root SM ──────────────────────────────────────────────────────────────────

export type Status =
  | { kind: 'idle' }
  | { kind: 'confirm-discard'; pendingTab: TabId };

export interface SM extends DialogStateMachine<TabId, TabStates> {
  activeTab: TabId;
  tabs: TabStates;
  status: Status;
  toast: string | undefined;
}

// ─── Events ───────────────────────────────────────────────────────────────────

export type SMEvent =
  | { type: 'TabSelected'; tab: TabId }
  | { type: 'DiscardConfirmed' }
  | { type: 'DiscardCancelled' }
  | { type: 'SetToast'; message: string | undefined };

// ─── Initial state ────────────────────────────────────────────────────────────

export function createInitialSM(): SM {
  return {
    activeTab: 'watering',
    tabs: {
      watering: { sub: { kind: 'idle' } },
      inventory: { sub: { kind: 'idle' } },
      presets: { sub: { kind: 'idle' } },
    },
    status: { kind: 'idle' },
    toast: undefined,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function isTabDirty(sm: SM, tab: TabId): boolean {
  return sm.tabs[tab].sub.kind === 'editing';
}

// ─── Transition ───────────────────────────────────────────────────────────────

export function transition(sm: SM, event: SMEvent): SM {
  switch (event.type) {
    case 'TabSelected': {
      if (event.tab === sm.activeTab) return sm;
      if (sm.status.kind !== 'idle') return sm;
      if (isTabDirty(sm, sm.activeTab)) {
        return { ...sm, status: { kind: 'confirm-discard', pendingTab: event.tab } };
      }
      return { ...sm, activeTab: event.tab };
    }

    case 'DiscardConfirmed': {
      if (sm.status.kind !== 'confirm-discard') return sm;
      const { pendingTab } = sm.status;
      return {
        ...sm,
        activeTab: pendingTab,
        status: { kind: 'idle' },
        tabs: {
          ...sm.tabs,
          [sm.activeTab]: { sub: { kind: 'idle' } },
        },
      };
    }

    case 'DiscardCancelled': {
      if (sm.status.kind !== 'confirm-discard') return sm;
      return { ...sm, status: { kind: 'idle' } };
    }

    case 'SetToast':
      return { ...sm, toast: event.message };

    default:
      return sm;
  }
}
