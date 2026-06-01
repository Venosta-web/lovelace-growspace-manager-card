/**
 * Nutrient Dialog State Machine
 *
 * Pure module — no Lit, no DOM, no hassCall. All interaction state for
 * NutrientDialog lives here. The component calls `transition(sm, event)`
 * and replaces its single `@state() _sm`.
 *
 * Satisfies DialogStateMachine.
 *
 * Structure:
 *   SM
 *     .activeTab          — 'inventory' | 'presets'
 *     .tabs               — per-tab state (selectedId + sub)
 *     .status             — root confirm-discard guard
 *     .toast              — transient feedback message
 */

import type { NutrientStock } from '../slices/nutrient';

// ─── Tab IDs ──────────────────────────────────────────────────────────────────

export type TabId = 'inventory' | 'presets';

// ─── Drafts ───────────────────────────────────────────────────────────────────

export interface NutrientStockDraft {
  name: string;
  current_ml: number;
  initial_ml: number;
  brand: string;
  stockType: string;
  npk: string;
  dose_ml_l: number;
  notes: string;
}

export interface NutrientPresetDraft {
  name: string;
  stage?: string;
  week?: number;
  ec_target?: number | null;
  ph_target?: number | null;
  nutrients: { nutrient_id: string; dose_ml_l: number }[];
}

// ─── Per-tab sub-states ───────────────────────────────────────────────────────

export type InventorySub =
  | { kind: 'idle' }
  | { kind: 'editing'; draft: NutrientStockDraft }
  | { kind: 'applying'; draft: NutrientStockDraft }
  | { kind: 'error'; draft: NutrientStockDraft; message: string }
  | { kind: 'confirm-delete'; id: string; name: string };

export type PresetsSub =
  | { kind: 'idle' }
  | { kind: 'editing'; draft: NutrientPresetDraft }
  | { kind: 'applying'; draft: NutrientPresetDraft }
  | { kind: 'error'; draft: NutrientPresetDraft; message: string }
  | { kind: 'confirm-delete'; id: string; name: string };

export interface InventoryTabState {
  selectedId: string | null;
  sub: InventorySub;
}

export interface PresetsTabState {
  selectedId: string | null;
  sub: PresetsSub;
}

export interface TabStates {
  inventory: InventoryTabState;
  presets: PresetsTabState;
}

// ─── Root SM ──────────────────────────────────────────────────────────────────

export type Status =
  | { kind: 'idle' }
  | { kind: 'confirm-discard'; pendingTab: TabId };

export interface SM {
  activeTab: TabId;
  tabs: TabStates;
  status: Status;
  toast: string | undefined;
}

// ─── Events ───────────────────────────────────────────────────────────────────

export type SMEvent =
  // Navigation
  | { type: 'TabSelected'; tab: TabId }
  | { type: 'DiscardConfirmed' }
  | { type: 'DiscardCancelled' }
  // Master list
  | { type: 'ItemSelected'; id: string }
  | { type: 'BackToList' }
  | { type: 'NewItemRequested' }
  // Detail → edit
  | { type: 'EditStarted'; draft: NutrientStockDraft | NutrientPresetDraft }
  // Stock draft mutations
  | { type: 'StockDraftChanged'; field: keyof NutrientStockDraft; value: string | number }
  // Preset draft mutations
  | { type: 'PresetDraftChanged'; field: keyof Omit<NutrientPresetDraft, 'nutrients'>; value: string | number | null | undefined }
  | { type: 'PresetNutrientRowAdded' }
  | { type: 'PresetNutrientRowRemoved'; index: number }
  | { type: 'PresetNutrientRowUpdated'; index: number; patch: Partial<{ nutrient_id: string; dose_ml_l: number }> }
  // Save lifecycle
  | { type: 'SaveRequested' }
  | { type: 'SaveResolved' }
  | { type: 'SaveFailed'; message: string }
  | { type: 'ErrorDismissed' }
  // Delete lifecycle
  | { type: 'DeleteRequested'; id: string; name: string }
  | { type: 'DeleteConfirmed' }
  | { type: 'DeleteResolved' }
  | { type: 'DeleteCancelled' }
  // Toast
  | { type: 'SetToast'; message: string | undefined };

// ─── Initial state ────────────────────────────────────────────────────────────

function emptyInventoryTab(): InventoryTabState {
  return { selectedId: null, sub: { kind: 'idle' } };
}

function emptyPresetsTab(): PresetsTabState {
  return { selectedId: null, sub: { kind: 'idle' } };
}

export function createInitialSM(): SM {
  return {
    activeTab: 'inventory',
    tabs: {
      inventory: emptyInventoryTab(),
      presets: emptyPresetsTab(),
    },
    status: { kind: 'idle' },
    toast: undefined,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function isTabDirty(sm: SM, tab: TabId): boolean {
  const sub = sm.tabs[tab].sub;
  return sub.kind === 'editing' || sub.kind === 'applying';
}

export function isLowStock(stock: NutrientStock): boolean {
  if (stock.initial_ml === 0) return false;
  return stock.current_ml / stock.initial_ml <= 0.25;
}

function emptyStockDraft(): NutrientStockDraft {
  return { name: '', current_ml: 0, initial_ml: 0, brand: '', stockType: 'base', npk: '', dose_ml_l: 0, notes: '' };
}

function emptyPresetDraft(): NutrientPresetDraft {
  return { name: '', nutrients: [] };
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
      return {
        ...sm,
        activeTab: event.tab,
        tabs: {
          ...sm.tabs,
          [sm.activeTab]: { ...sm.tabs[sm.activeTab], selectedId: null },
        },
      };
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
          [sm.activeTab]: { selectedId: null, sub: { kind: 'idle' } },
        },
      };
    }

    case 'DiscardCancelled': {
      if (sm.status.kind !== 'confirm-discard') return sm;
      return { ...sm, status: { kind: 'idle' } };
    }

    case 'ItemSelected': {
      const tab = sm.activeTab;
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          [tab]: { ...sm.tabs[tab], selectedId: event.id, sub: { kind: 'idle' } },
        },
      };
    }

    case 'BackToList': {
      const tab = sm.activeTab;
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          [tab]: { selectedId: null, sub: { kind: 'idle' } },
        },
      };
    }

    case 'NewItemRequested': {
      const tab = sm.activeTab;
      if (sm.tabs[tab].sub.kind === 'editing') return sm;
      const draft = tab === 'inventory' ? emptyStockDraft() : emptyPresetDraft();
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          [tab]: { selectedId: null, sub: { kind: 'editing', draft } },
        },
      };
    }

    case 'EditStarted': {
      const tab = sm.activeTab;
      if (sm.tabs[tab].selectedId === null && sm.tabs[tab].sub.kind !== 'editing') return sm;
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          [tab]: { ...sm.tabs[tab], sub: { kind: 'editing', draft: event.draft } },
        },
      };
    }

    case 'StockDraftChanged': {
      const tabState = sm.tabs.inventory;
      if (tabState.sub.kind !== 'editing') return sm;
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          inventory: {
            ...tabState,
            sub: {
              kind: 'editing',
              draft: { ...(tabState.sub.draft as NutrientStockDraft), [event.field]: event.value },
            },
          },
        },
      };
    }

    case 'PresetDraftChanged': {
      const tabState = sm.tabs.presets;
      if (tabState.sub.kind !== 'editing') return sm;
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          presets: {
            ...tabState,
            sub: {
              kind: 'editing',
              draft: { ...(tabState.sub.draft as NutrientPresetDraft), [event.field]: event.value },
            },
          },
        },
      };
    }

    case 'PresetNutrientRowAdded': {
      const tabState = sm.tabs.presets;
      if (tabState.sub.kind !== 'editing') return sm;
      const draft = tabState.sub.draft as NutrientPresetDraft;
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          presets: {
            ...tabState,
            sub: {
              kind: 'editing',
              draft: { ...draft, nutrients: [...draft.nutrients, { nutrient_id: '', dose_ml_l: 0 }] },
            },
          },
        },
      };
    }

    case 'PresetNutrientRowRemoved': {
      const tabState = sm.tabs.presets;
      if (tabState.sub.kind !== 'editing') return sm;
      const draft = tabState.sub.draft as NutrientPresetDraft;
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          presets: {
            ...tabState,
            sub: {
              kind: 'editing',
              draft: { ...draft, nutrients: draft.nutrients.filter((_, i) => i !== event.index) },
            },
          },
        },
      };
    }

    case 'PresetNutrientRowUpdated': {
      const tabState = sm.tabs.presets;
      if (tabState.sub.kind !== 'editing') return sm;
      const draft = tabState.sub.draft as NutrientPresetDraft;
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          presets: {
            ...tabState,
            sub: {
              kind: 'editing',
              draft: {
                ...draft,
                nutrients: draft.nutrients.map((row, i) =>
                  i === event.index ? { ...row, ...event.patch } : row
                ),
              },
            },
          },
        },
      };
    }

    case 'SaveRequested': {
      const tab = sm.activeTab;
      const tabState = sm.tabs[tab];
      if (tabState.sub.kind !== 'editing') return sm;
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          [tab]: { ...tabState, sub: { kind: 'applying', draft: tabState.sub.draft } },
        },
      };
    }

    case 'SaveResolved': {
      const tab = sm.activeTab;
      const tabState = sm.tabs[tab];
      if (tabState.sub.kind !== 'applying') return sm;
      return {
        ...sm,
        toast: 'Saved',
        tabs: {
          ...sm.tabs,
          [tab]: { selectedId: null, sub: { kind: 'idle' } },
        },
      };
    }

    case 'SaveFailed': {
      const tab = sm.activeTab;
      const tabState = sm.tabs[tab];
      if (tabState.sub.kind !== 'applying') return sm;
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          [tab]: {
            ...tabState,
            sub: { kind: 'error', draft: tabState.sub.draft, message: event.message },
          },
        },
      };
    }

    case 'ErrorDismissed': {
      const tab = sm.activeTab;
      const tabState = sm.tabs[tab];
      if (tabState.sub.kind !== 'error') return sm;
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          [tab]: { ...tabState, sub: { kind: 'editing', draft: tabState.sub.draft } },
        },
      };
    }

    case 'DeleteRequested': {
      const tab = sm.activeTab;
      const tabState = sm.tabs[tab];
      if (tabState.sub.kind === 'editing' || tabState.sub.kind === 'applying') return sm;
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          [tab]: { ...tabState, sub: { kind: 'confirm-delete', id: event.id, name: event.name } },
        },
      };
    }

    case 'DeleteConfirmed': {
      const tab = sm.activeTab;
      const tabState = sm.tabs[tab];
      if (tabState.sub.kind !== 'confirm-delete') return sm;
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          [tab]: { ...tabState, sub: { kind: 'applying', draft: tab === 'inventory' ? emptyStockDraft() : emptyPresetDraft() } },
        },
      };
    }

    case 'DeleteResolved': {
      const tab = sm.activeTab;
      const tabState = sm.tabs[tab];
      if (tabState.sub.kind !== 'applying') return sm;
      return {
        ...sm,
        toast: 'Deleted',
        tabs: {
          ...sm.tabs,
          [tab]: { selectedId: null, sub: { kind: 'idle' } },
        },
      };
    }

    case 'DeleteCancelled': {
      const tab = sm.activeTab;
      const tabState = sm.tabs[tab];
      if (tabState.sub.kind !== 'confirm-delete') return sm;
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          [tab]: { ...tabState, sub: { kind: 'idle' } },
        },
      };
    }

    case 'SetToast':
      return { ...sm, toast: event.message };

    default:
      return sm;
  }
}
