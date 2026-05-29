/**
 * Seeds & Genetics Tab State Machine
 *
 * Pure module — no Lit, no DOM, no hassCall, no hass.states.
 * All interaction state for SeedsGeneticsTab lives here.
 * The component calls `transition(sm, event)` and replaces its single `@state() _sm`.
 *
 * Structure:
 *   SeedsSM
 *     .activeView  — which sub-view is visible
 *     .views       — one typed state object per sub-view (draft + sub-state)
 *     .status      — root-level overlay (always idle — no discard guard)
 *     .toast       — transient message
 */

// ─── View IDs ─────────────────────────────────────────────────────────────────

export type ViewId = 'list' | 'add-batch' | 'log-pollination' | 'harvest';

// ─── Shared async sub-state ───────────────────────────────────────────────────

export type AsyncSub =
  | { kind: 'idle' }
  | { kind: 'applying' }
  | { kind: 'error'; message: string };

// ─── List view ────────────────────────────────────────────────────────────────

export type ListSubState =
  | { kind: 'idle' }
  | { kind: 'confirm-delete-batch'; batchId: string }
  | { kind: 'confirm-delete-pollination'; eventId: string }
  | { kind: 'sow'; batchId: string; growspaceId: string; quantity: number; sub: { kind: 'idle' } | { kind: 'applying' } };

export interface ListViewState {
  sub: ListSubState;
}

// ─── Add-batch view (add + edit) ──────────────────────────────────────────────

export interface BatchDraft {
  strainName: string;
  breeder: string;
  quantity: number;
  acquisitionDate: string;
  generation: string;
  parent1Key: string;
  parent2Key: string;
  notes: string;
}

export interface AddBatchViewState {
  editingBatchId: string | null;
  draft: BatchDraft;
  sub: AsyncSub;
}

// ─── Log-pollination view (log + edit) ────────────────────────────────────────

export interface PollinationDraft {
  date: string;
  donorPlantId: string;
  receiverPlantId: string;
  notes: string;
  donorActivePlantsOnly: boolean;
}

export interface LogPollinationViewState {
  editingEventId: string | null;
  draft: PollinationDraft;
  sub: AsyncSub;
}

// ─── Harvest view ─────────────────────────────────────────────────────────────

export interface HarvestDraft {
  quantity: number;
  notes: string;
}

export interface HarvestViewState {
  eventId: string;
  draft: HarvestDraft;
  sub: AsyncSub;
}

// ─── View state map ───────────────────────────────────────────────────────────

export interface ViewStates {
  list: ListViewState;
  'add-batch': AddBatchViewState;
  'log-pollination': LogPollinationViewState;
  harvest: HarvestViewState;
}

// ─── Root SM ──────────────────────────────────────────────────────────────────

export interface SeedsSM {
  activeView: ViewId;
  views: ViewStates;
  status: { kind: 'idle' };
  toast: string | undefined;
}

// ─── Events ───────────────────────────────────────────────────────────────────

export type SeedsEvent =
  // Navigation
  | { type: 'BEGIN_ADD_BATCH' }
  | { type: 'BEGIN_EDIT_BATCH'; batchId: string; draft: BatchDraft }
  | { type: 'BEGIN_LOG_POLLINATION' }
  | { type: 'BEGIN_EDIT_POLLINATION'; eventId: string; draft: PollinationDraft }
  | { type: 'BEGIN_HARVEST'; eventId: string }
  | { type: 'NAVIGATE_BACK' }
  // Draft updates
  | { type: 'UPDATE_BATCH_DRAFT'; partial: Partial<BatchDraft> }
  | { type: 'UPDATE_POLLINATION_DRAFT'; partial: Partial<PollinationDraft> }
  | { type: 'UPDATE_HARVEST_DRAFT'; partial: Partial<HarvestDraft> }
  // Async lifecycle
  | { type: 'SAVE_REQUESTED' }
  | { type: 'SAVE_RESOLVED' }
  | { type: 'SAVE_FAILED'; message: string }
  // Sow form
  | { type: 'SOW_OPENED'; batchId: string; defaultGrowspaceId: string }
  | { type: 'SOW_CANCELLED' }
  | { type: 'SOW_FIELD_CHANGED'; partial: { growspaceId?: string; quantity?: number } }
  // Delete confirmations
  | { type: 'DELETE_BATCH_REQUESTED'; batchId: string }
  | { type: 'DELETE_POLLINATION_REQUESTED'; eventId: string }
  | { type: 'DELETE_CONFIRMED' }
  | { type: 'DELETE_CANCELLED' }
  // Global
  | { type: 'SET_TOAST'; message: string | undefined };

// ─── Default drafts ───────────────────────────────────────────────────────────

function defaultBatchDraft(): BatchDraft {
  return {
    strainName: '',
    breeder: '',
    quantity: 1,
    acquisitionDate: '',
    generation: 'F1',
    parent1Key: '',
    parent2Key: '',
    notes: '',
  };
}

function defaultPollinationDraft(): PollinationDraft {
  return {
    date: '',
    donorPlantId: '',
    receiverPlantId: '',
    notes: '',
    donorActivePlantsOnly: true,
  };
}

function defaultHarvestDraft(): HarvestDraft {
  return { quantity: 1, notes: '' };
}

function defaultViews(): ViewStates {
  return {
    list: { sub: { kind: 'idle' } },
    'add-batch': { editingBatchId: null, draft: defaultBatchDraft(), sub: { kind: 'idle' } },
    'log-pollination': {
      editingEventId: null,
      draft: defaultPollinationDraft(),
      sub: { kind: 'idle' },
    },
    harvest: { eventId: '', draft: defaultHarvestDraft(), sub: { kind: 'idle' } },
  };
}

// ─── Initial state ────────────────────────────────────────────────────────────

export interface SeedsSMSeed {
  initialView?: 'log-pollination';
  prefilledReceiverId?: string;
}

export function createInitialSM(seed?: SeedsSMSeed): SeedsSM {
  const views = defaultViews();
  let activeView: ViewId = 'list';

  if (seed?.initialView === 'log-pollination') {
    activeView = 'log-pollination';
    if (seed.prefilledReceiverId) {
      views['log-pollination'] = {
        ...views['log-pollination'],
        draft: { ...views['log-pollination'].draft, receiverPlantId: seed.prefilledReceiverId },
      };
    }
  }

  return { activeView, views, status: { kind: 'idle' }, toast: undefined };
}

// ─── Validation helpers ───────────────────────────────────────────────────────

export function validateBatchDraft(draft: BatchDraft): string | undefined {
  if (!draft.strainName || !draft.breeder || !draft.acquisitionDate || !draft.generation) {
    return 'Please fill in all required fields.';
  }
  return undefined;
}

export function validatePollinationDraft(draft: PollinationDraft): string | undefined {
  if (!draft.donorPlantId || !draft.receiverPlantId || !draft.date) {
    return 'Please fill in all required fields.';
  }
  return undefined;
}

export function validateHarvestDraft(draft: HarvestDraft, eventId: string): string | undefined {
  if (!eventId || !draft.quantity) {
    return 'Please fill in all required fields.';
  }
  return undefined;
}

// ─── Transition function ──────────────────────────────────────────────────────

/** Pure state machine transition. Returns a new SM without mutating the input. */
export function transition(sm: SeedsSM, event: SeedsEvent): SeedsSM {
  switch (event.type) {
    // ── Navigation ──────────────────────────────────────────────────────────

    case 'BEGIN_ADD_BATCH':
      return {
        ...sm,
        activeView: 'add-batch',
        views: {
          ...sm.views,
          'add-batch': { editingBatchId: null, draft: defaultBatchDraft(), sub: { kind: 'idle' } },
        },
      };

    case 'BEGIN_EDIT_BATCH':
      return {
        ...sm,
        activeView: 'add-batch',
        views: {
          ...sm.views,
          'add-batch': {
            editingBatchId: event.batchId,
            draft: event.draft,
            sub: { kind: 'idle' },
          },
        },
      };

    case 'BEGIN_LOG_POLLINATION':
      return {
        ...sm,
        activeView: 'log-pollination',
        views: {
          ...sm.views,
          'log-pollination': {
            editingEventId: null,
            draft: defaultPollinationDraft(),
            sub: { kind: 'idle' },
          },
        },
      };

    case 'BEGIN_EDIT_POLLINATION':
      return {
        ...sm,
        activeView: 'log-pollination',
        views: {
          ...sm.views,
          'log-pollination': {
            editingEventId: event.eventId,
            draft: event.draft,
            sub: { kind: 'idle' },
          },
        },
      };

    case 'BEGIN_HARVEST':
      return {
        ...sm,
        activeView: 'harvest',
        views: {
          ...sm.views,
          harvest: { eventId: event.eventId, draft: defaultHarvestDraft(), sub: { kind: 'idle' } },
        },
      };

    case 'NAVIGATE_BACK': {
      const views = { ...sm.views };
      if (sm.activeView === 'add-batch') {
        views['add-batch'] = {
          editingBatchId: null,
          draft: defaultBatchDraft(),
          sub: { kind: 'idle' },
        };
      } else if (sm.activeView === 'log-pollination') {
        views['log-pollination'] = {
          editingEventId: null,
          draft: defaultPollinationDraft(),
          sub: { kind: 'idle' },
        };
      } else if (sm.activeView === 'harvest') {
        views.harvest = { eventId: '', draft: defaultHarvestDraft(), sub: { kind: 'idle' } };
      }
      return { ...sm, activeView: 'list', views };
    }

    // ── Draft updates ────────────────────────────────────────────────────────

    case 'UPDATE_BATCH_DRAFT':
      return {
        ...sm,
        views: {
          ...sm.views,
          'add-batch': {
            ...sm.views['add-batch'],
            draft: { ...sm.views['add-batch'].draft, ...event.partial },
          },
        },
      };

    case 'UPDATE_POLLINATION_DRAFT':
      return {
        ...sm,
        views: {
          ...sm.views,
          'log-pollination': {
            ...sm.views['log-pollination'],
            draft: { ...sm.views['log-pollination'].draft, ...event.partial },
          },
        },
      };

    case 'UPDATE_HARVEST_DRAFT':
      return {
        ...sm,
        views: {
          ...sm.views,
          harvest: {
            ...sm.views.harvest,
            draft: { ...sm.views.harvest.draft, ...event.partial },
          },
        },
      };

    // ── Async lifecycle ──────────────────────────────────────────────────────

    case 'SAVE_REQUESTED': {
      const view = sm.activeView;
      if (view === 'list') return sm;
      return {
        ...sm,
        views: {
          ...sm.views,
          [view]: { ...sm.views[view], sub: { kind: 'applying' } },
        },
      };
    }

    case 'SAVE_RESOLVED': {
      if (sm.activeView === 'list') return sm;
      return transition(sm, { type: 'NAVIGATE_BACK' });
    }

    case 'SAVE_FAILED': {
      const view = sm.activeView;
      if (view === 'list') return sm;
      return {
        ...sm,
        views: {
          ...sm.views,
          [view]: { ...sm.views[view], sub: { kind: 'error', message: event.message } },
        },
      };
    }

    // ── Sow form ─────────────────────────────────────────────────────────────

    case 'SOW_OPENED':
      return {
        ...sm,
        views: {
          ...sm.views,
          list: {
            sub: {
              kind: 'sow',
              batchId: event.batchId,
              growspaceId: event.defaultGrowspaceId,
              quantity: 1,
              sub: { kind: 'idle' },
            },
          },
        },
      };

    case 'SOW_CANCELLED':
      return { ...sm, views: { ...sm.views, list: { sub: { kind: 'idle' } } } };

    case 'SOW_FIELD_CHANGED': {
      const sub = sm.views.list.sub;
      if (sub.kind !== 'sow') return sm;
      return {
        ...sm,
        views: {
          ...sm.views,
          list: {
            sub: {
              ...sub,
              ...(event.partial.growspaceId !== undefined && {
                growspaceId: event.partial.growspaceId,
              }),
              ...(event.partial.quantity !== undefined && { quantity: event.partial.quantity }),
            },
          },
        },
      };
    }

    // ── Delete confirmations ─────────────────────────────────────────────────

    case 'DELETE_BATCH_REQUESTED':
      return {
        ...sm,
        views: {
          ...sm.views,
          list: { sub: { kind: 'confirm-delete-batch', batchId: event.batchId } },
        },
      };

    case 'DELETE_POLLINATION_REQUESTED':
      return {
        ...sm,
        views: {
          ...sm.views,
          list: { sub: { kind: 'confirm-delete-pollination', eventId: event.eventId } },
        },
      };

    case 'DELETE_CONFIRMED':
    case 'DELETE_CANCELLED':
      return { ...sm, views: { ...sm.views, list: { sub: { kind: 'idle' } } } };

    // ── Global ───────────────────────────────────────────────────────────────

    case 'SET_TOAST':
      return { ...sm, toast: event.message };

    default:
      return sm;
  }
}
