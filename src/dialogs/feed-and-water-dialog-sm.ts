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

export type WateringSub = { kind: 'idle' } | { kind: 'submitting' };
export type InventorySub = { kind: 'idle' } | { kind: 'editing' };
export type PresetsSub = { kind: 'idle' } | { kind: 'editing' };

export interface WateringDraft {
  volume: number;
  presetId: string;
}

const DEFAULT_WATERING_DRAFT: WateringDraft = { volume: 1.0, presetId: '' };

export interface WateringTabState {
  sub: WateringSub;
  draft: WateringDraft;
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
  | { type: 'SetToast'; message: string | undefined }
  | { type: 'WateringVolumeChanged'; volume: number }
  | { type: 'WateringPresetChanged'; presetId: string }
  | { type: 'WateringSubmitRequested' }
  | { type: 'WateringSubmitCompleted' };

// ─── Initial state ────────────────────────────────────────────────────────────

export function createInitialSM(): SM {
  return {
    activeTab: 'watering',
    tabs: {
      watering: { sub: { kind: 'idle' }, draft: { ...DEFAULT_WATERING_DRAFT } },
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

    case 'WateringVolumeChanged':
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          watering: { ...sm.tabs.watering, draft: { ...sm.tabs.watering.draft, volume: event.volume } },
        },
      };

    case 'WateringPresetChanged':
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          watering: { ...sm.tabs.watering, draft: { ...sm.tabs.watering.draft, presetId: event.presetId } },
        },
      };

    case 'WateringSubmitRequested': {
      if (sm.tabs.watering.sub.kind === 'submitting') return sm;
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          watering: { ...sm.tabs.watering, sub: { kind: 'submitting' } },
        },
      };
    }

    case 'WateringSubmitCompleted': {
      if (sm.tabs.watering.sub.kind !== 'submitting') return sm;
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          watering: { sub: { kind: 'idle' }, draft: { ...DEFAULT_WATERING_DRAFT } },
        },
      };
    }

    default:
      return sm;
  }
}
