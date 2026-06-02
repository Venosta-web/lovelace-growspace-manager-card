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
import type { NutrientStock } from '../slices/nutrient';

// ─── Tab IDs ──────────────────────────────────────────────────────────────────

export type TabId = 'watering' | 'inventory' | 'presets';

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

// ─── Per-tab sub-states ───────────────────────────────────────────────────────

export type WateringSub = { kind: 'idle' } | { kind: 'submitting' };

export type InventorySub =
  | { kind: 'idle' }
  | { kind: 'editing'; draft: NutrientStockDraft }
  | { kind: 'applying'; draft: NutrientStockDraft }
  | { kind: 'error'; draft: NutrientStockDraft; message: string }
  | { kind: 'confirm-delete'; id: string; name: string };

export interface NutrientPresetDraft {
  name: string;
  stage?: string;
  week?: number;
  ec_target?: number | null;
  ph_target?: number | null;
  nutrients: { nutrient_id: string; dose_ml_l: number }[];
}

export type PresetsSub =
  | { kind: 'idle' }
  | { kind: 'editing'; draft: NutrientPresetDraft }
  | { kind: 'applying'; draft: NutrientPresetDraft }
  | { kind: 'error'; draft: NutrientPresetDraft; message: string }
  | { kind: 'confirm-delete'; id: string; name: string };

export interface WateringDraft {
  volume: number;
  presetId: string;
}

const DEFAULT_WATERING_DRAFT: WateringDraft = { volume: 1.0, presetId: '' };

export interface WateringTabState {
  sub: WateringSub;
  draft: WateringDraft;
  adHocOpen: boolean;
}

export interface InventoryTabState {
  selectedId: string | null;
  sub: InventorySub;
}

export interface PresetsTabState {
  selectedId: string | null;
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
  | { type: 'AdHocToggled' }
  | { type: 'WateringVolumeChanged'; volume: number }
  | { type: 'WateringPresetChanged'; presetId: string }
  | { type: 'WateringSubmitRequested' }
  | { type: 'WateringSubmitCompleted' }
  // Inventory
  | { type: 'ItemSelected'; id: string }
  | { type: 'BackToList' }
  | { type: 'NewItemRequested' }
  | { type: 'EditStarted'; draft: NutrientStockDraft }
  | { type: 'StockDraftChanged'; field: keyof NutrientStockDraft; value: string | number }
  | { type: 'SaveRequested' }
  | { type: 'SaveResolved' }
  | { type: 'SaveFailed'; message: string }
  | { type: 'ErrorDismissed' }
  | { type: 'DeleteRequested'; id: string; name: string }
  | { type: 'DeleteConfirmed' }
  | { type: 'DeleteResolved' }
  | { type: 'DeleteCancelled' }
  // Presets
  | { type: 'PresetItemSelected'; id: string }
  | { type: 'PresetBackToList' }
  | { type: 'PresetNewItemRequested' }
  | { type: 'PresetEditStarted'; draft: NutrientPresetDraft }
  | { type: 'PresetDraftChanged'; field: keyof Omit<NutrientPresetDraft, 'nutrients'>; value: string | number | null | undefined }
  | { type: 'PresetNutrientRowAdded' }
  | { type: 'PresetNutrientRowRemoved'; index: number }
  | { type: 'PresetNutrientRowUpdated'; index: number; patch: Partial<{ nutrient_id: string; dose_ml_l: number }> }
  | { type: 'PresetSaveRequested' }
  | { type: 'PresetSaveResolved' }
  | { type: 'PresetSaveFailed'; message: string }
  | { type: 'PresetErrorDismissed' }
  | { type: 'PresetDeleteRequested'; id: string; name: string }
  | { type: 'PresetDeleteConfirmed' }
  | { type: 'PresetDeleteResolved' }
  | { type: 'PresetDeleteCancelled' };

// ─── Initial state ────────────────────────────────────────────────────────────

export function createInitialSM(): SM {
  return {
    activeTab: 'watering',
    tabs: {
      watering: { sub: { kind: 'idle' }, draft: { ...DEFAULT_WATERING_DRAFT }, adHocOpen: false },
      inventory: { selectedId: null, sub: { kind: 'idle' } },
      presets: { selectedId: null, sub: { kind: 'idle' } },
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

function emptyPresetDraft(): NutrientPresetDraft {
  return { name: '', nutrients: [] };
}

function emptyStockDraft(): NutrientStockDraft {
  return { name: '', current_ml: 0, initial_ml: 0, brand: '', stockType: 'base', npk: '', dose_ml_l: 0, notes: '' };
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
          [sm.activeTab]: { selectedId: null, sub: { kind: 'idle' } },
        },
      };
    }

    case 'DiscardCancelled': {
      if (sm.status.kind !== 'confirm-discard') return sm;
      return { ...sm, status: { kind: 'idle' } };
    }

    case 'SetToast':
      return { ...sm, toast: event.message };

    case 'AdHocToggled':
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          watering: { ...sm.tabs.watering, adHocOpen: !sm.tabs.watering.adHocOpen },
        },
      };

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
          watering: { sub: { kind: 'idle' }, draft: { ...DEFAULT_WATERING_DRAFT }, adHocOpen: false },
        },
      };
    }

    // ─── Inventory ─────────────────────────────────────────────────────────

    case 'ItemSelected': {
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          inventory: { selectedId: event.id, sub: { kind: 'idle' } },
        },
      };
    }

    case 'BackToList': {
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          inventory: { selectedId: null, sub: { kind: 'idle' } },
        },
      };
    }

    case 'NewItemRequested': {
      if (sm.tabs.inventory.sub.kind === 'editing') return sm;
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          inventory: { selectedId: null, sub: { kind: 'editing', draft: emptyStockDraft() } },
        },
      };
    }

    case 'EditStarted': {
      const inv = sm.tabs.inventory;
      if (inv.selectedId === null && inv.sub.kind !== 'editing') return sm;
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          inventory: { ...inv, sub: { kind: 'editing', draft: event.draft } },
        },
      };
    }

    case 'StockDraftChanged': {
      const inv = sm.tabs.inventory;
      if (inv.sub.kind !== 'editing') return sm;
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          inventory: {
            ...inv,
            sub: { kind: 'editing', draft: { ...inv.sub.draft, [event.field]: event.value } },
          },
        },
      };
    }

    case 'SaveRequested': {
      const inv = sm.tabs.inventory;
      if (inv.sub.kind !== 'editing') return sm;
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          inventory: { ...inv, sub: { kind: 'applying', draft: inv.sub.draft } },
        },
      };
    }

    case 'SaveResolved': {
      const inv = sm.tabs.inventory;
      if (inv.sub.kind !== 'applying') return sm;
      return {
        ...sm,
        toast: 'Saved',
        tabs: {
          ...sm.tabs,
          inventory: { selectedId: null, sub: { kind: 'idle' } },
        },
      };
    }

    case 'SaveFailed': {
      const inv = sm.tabs.inventory;
      if (inv.sub.kind !== 'applying') return sm;
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          inventory: { ...inv, sub: { kind: 'error', draft: inv.sub.draft, message: event.message } },
        },
      };
    }

    case 'ErrorDismissed': {
      const inv = sm.tabs.inventory;
      if (inv.sub.kind !== 'error') return sm;
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          inventory: { ...inv, sub: { kind: 'editing', draft: inv.sub.draft } },
        },
      };
    }

    case 'DeleteRequested': {
      const inv = sm.tabs.inventory;
      if (inv.sub.kind === 'editing' || inv.sub.kind === 'applying') return sm;
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          inventory: { ...inv, sub: { kind: 'confirm-delete', id: event.id, name: event.name } },
        },
      };
    }

    case 'DeleteConfirmed': {
      const inv = sm.tabs.inventory;
      if (inv.sub.kind !== 'confirm-delete') return sm;
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          inventory: { ...inv, sub: { kind: 'applying', draft: emptyStockDraft() } },
        },
      };
    }

    case 'DeleteResolved': {
      const inv = sm.tabs.inventory;
      if (inv.sub.kind !== 'applying') return sm;
      return {
        ...sm,
        toast: 'Deleted',
        tabs: {
          ...sm.tabs,
          inventory: { selectedId: null, sub: { kind: 'idle' } },
        },
      };
    }

    case 'DeleteCancelled': {
      const inv = sm.tabs.inventory;
      if (inv.sub.kind !== 'confirm-delete') return sm;
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          inventory: { ...inv, sub: { kind: 'idle' } },
        },
      };
    }

    // ─── Presets ────────────────────────────────────────────────────────────

    case 'PresetItemSelected': {
      return {
        ...sm,
        tabs: { ...sm.tabs, presets: { selectedId: event.id, sub: { kind: 'idle' } } },
      };
    }

    case 'PresetBackToList': {
      return {
        ...sm,
        tabs: { ...sm.tabs, presets: { selectedId: null, sub: { kind: 'idle' } } },
      };
    }

    case 'PresetNewItemRequested': {
      if (sm.tabs.presets.sub.kind === 'editing') return sm;
      return {
        ...sm,
        tabs: { ...sm.tabs, presets: { selectedId: null, sub: { kind: 'editing', draft: emptyPresetDraft() } } },
      };
    }

    case 'PresetEditStarted': {
      const presets = sm.tabs.presets;
      if (presets.selectedId === null && presets.sub.kind !== 'editing') return sm;
      return {
        ...sm,
        tabs: { ...sm.tabs, presets: { ...presets, sub: { kind: 'editing', draft: event.draft } } },
      };
    }

    case 'PresetDraftChanged': {
      const presets = sm.tabs.presets;
      if (presets.sub.kind !== 'editing') return sm;
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          presets: { ...presets, sub: { kind: 'editing', draft: { ...presets.sub.draft, [event.field]: event.value } } },
        },
      };
    }

    case 'PresetNutrientRowAdded': {
      const presets = sm.tabs.presets;
      if (presets.sub.kind !== 'editing') return sm;
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          presets: {
            ...presets,
            sub: { kind: 'editing', draft: { ...presets.sub.draft, nutrients: [...presets.sub.draft.nutrients, { nutrient_id: '', dose_ml_l: 0 }] } },
          },
        },
      };
    }

    case 'PresetNutrientRowRemoved': {
      const presets = sm.tabs.presets;
      if (presets.sub.kind !== 'editing') return sm;
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          presets: {
            ...presets,
            sub: { kind: 'editing', draft: { ...presets.sub.draft, nutrients: presets.sub.draft.nutrients.filter((_, i) => i !== event.index) } },
          },
        },
      };
    }

    case 'PresetNutrientRowUpdated': {
      const presets = sm.tabs.presets;
      if (presets.sub.kind !== 'editing') return sm;
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          presets: {
            ...presets,
            sub: {
              kind: 'editing',
              draft: {
                ...presets.sub.draft,
                nutrients: presets.sub.draft.nutrients.map((row, i) => i === event.index ? { ...row, ...event.patch } : row),
              },
            },
          },
        },
      };
    }

    case 'PresetSaveRequested': {
      const presets = sm.tabs.presets;
      if (presets.sub.kind !== 'editing') return sm;
      return {
        ...sm,
        tabs: { ...sm.tabs, presets: { ...presets, sub: { kind: 'applying', draft: presets.sub.draft } } },
      };
    }

    case 'PresetSaveResolved': {
      const presets = sm.tabs.presets;
      if (presets.sub.kind !== 'applying') return sm;
      return {
        ...sm,
        toast: 'Saved',
        tabs: { ...sm.tabs, presets: { selectedId: null, sub: { kind: 'idle' } } },
      };
    }

    case 'PresetSaveFailed': {
      const presets = sm.tabs.presets;
      if (presets.sub.kind !== 'applying') return sm;
      return {
        ...sm,
        tabs: { ...sm.tabs, presets: { ...presets, sub: { kind: 'error', draft: presets.sub.draft, message: event.message } } },
      };
    }

    case 'PresetErrorDismissed': {
      const presets = sm.tabs.presets;
      if (presets.sub.kind !== 'error') return sm;
      return {
        ...sm,
        tabs: { ...sm.tabs, presets: { ...presets, sub: { kind: 'editing', draft: presets.sub.draft } } },
      };
    }

    case 'PresetDeleteRequested': {
      const presets = sm.tabs.presets;
      if (presets.sub.kind === 'editing' || presets.sub.kind === 'applying') return sm;
      return {
        ...sm,
        tabs: { ...sm.tabs, presets: { ...presets, sub: { kind: 'confirm-delete', id: event.id, name: event.name } } },
      };
    }

    case 'PresetDeleteConfirmed': {
      const presets = sm.tabs.presets;
      if (presets.sub.kind !== 'confirm-delete') return sm;
      return {
        ...sm,
        tabs: { ...sm.tabs, presets: { ...presets, sub: { kind: 'applying', draft: emptyPresetDraft() } } },
      };
    }

    case 'PresetDeleteResolved': {
      const presets = sm.tabs.presets;
      if (presets.sub.kind !== 'applying') return sm;
      return {
        ...sm,
        toast: 'Deleted',
        tabs: { ...sm.tabs, presets: { selectedId: null, sub: { kind: 'idle' } } },
      };
    }

    case 'PresetDeleteCancelled': {
      const presets = sm.tabs.presets;
      if (presets.sub.kind !== 'confirm-delete') return sm;
      return {
        ...sm,
        tabs: { ...sm.tabs, presets: { ...presets, sub: { kind: 'idle' } } },
      };
    }

    default:
      return sm;
  }
}
