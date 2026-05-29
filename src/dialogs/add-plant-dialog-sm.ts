/**
 * Add Plant Dialog State Machine
 *
 * Pure module — no Lit, no DOM, no hassCall. All interaction state for
 * AddPlantDialog lives here. The component calls `transition(sm, event)`
 * and replaces its single `@state() _sm`.
 *
 * Structure:
 *   SM
 *     .activeTab          — which tab is visible ('add' | 'clone' | 'seedling')
 *     .status             — root-level async status
 *     .toast              — transient message
 *     .tabs               — one typed state object per tab (draft + sub)
 */

// ─── Tab IDs ──────────────────────────────────────────────────────────────────

export type TabId = 'add' | 'clone' | 'seedling';

// ─── Add tab ──────────────────────────────────────────────────────────────────

export interface AddDraft {
  strain: string;
  strainQuery: string;
  phenotype: string;
  addToLibrary: boolean;
  sourceType: 'seed' | 'clone';
  siblingPlantId: string | null;
  row: number;
  col: number;
  // Date fields — all carried; component selects which to render by growspaceName
  seedlingStart: string;
  vegStart: string;
  flowerStart: string;
  motherStart: string;
  cloneStart: string;
  dryStart: string;
  cureStart: string;
}

export type AddSubState =
  | { kind: 'step-identity' }
  | { kind: 'step-source' }
  | { kind: 'step-schedule' };

export interface AddTabState {
  draft: AddDraft;
  sub: AddSubState;
}

// ─── Transplant tabs (clone + seedling share this shape) ──────────────────────

export interface TransplantDraft {
  selectedPlantId: string | null;
  row: number;
  col: number;
}

export interface TransplantTabState {
  draft: TransplantDraft;
  sub: { kind: 'idle' };
}

// ─── Root SM ──────────────────────────────────────────────────────────────────

export interface TabStates {
  add: AddTabState;
  clone: TransplantTabState;
  seedling: TransplantTabState;
}

export type Status =
  | { kind: 'idle' }
  | { kind: 'applying' }
  | { kind: 'done' }
  | { kind: 'error'; message: string };

export interface SM {
  activeTab: TabId;
  tabs: TabStates;
  status: Status;
  toast: string | undefined;
}

// ─── Events ───────────────────────────────────────────────────────────────────

type AddDraftField = keyof AddDraft;
type TransplantDraftField = keyof TransplantDraft;

export type SMEvent =
  // Navigation
  | { type: 'TabSelected'; tab: TabId }
  // Wizard (add tab only)
  | { type: 'WizardAdvanced' }
  | { type: 'WizardBacked' }
  // Draft mutations — typed by tab
  | { type: 'DraftFieldChanged'; tab: 'add'; field: AddDraftField; value: AddDraft[AddDraftField] }
  | { type: 'DraftFieldChanged'; tab: 'clone'; field: TransplantDraftField; value: TransplantDraft[TransplantDraftField] }
  | { type: 'DraftFieldChanged'; tab: 'seedling'; field: TransplantDraftField; value: TransplantDraft[TransplantDraftField] }
  // Sibling pre-fill (carries derived fields only, not PlantEntity)
  | { type: 'SiblingPlantSelected'; strain: string; phenotype: string; cloneStart: string }
  // Save lifecycle
  | { type: 'SaveRequested' }
  | { type: 'SaveResolved' }
  | { type: 'SaveFailed'; message: string }
  | { type: 'StatusReset' }
  // Toast
  | { type: 'SetToast'; message: string | undefined };

// ─── Initial state ────────────────────────────────────────────────────────────

function defaultAddDraft(row: number, col: number): AddDraft {
  return {
    strain: '',
    strainQuery: '',
    phenotype: '',
    addToLibrary: false,
    sourceType: 'seed',
    siblingPlantId: null,
    row,
    col,
    seedlingStart: '',
    vegStart: '',
    flowerStart: '',
    motherStart: '',
    cloneStart: '',
    dryStart: '',
    cureStart: '',
  };
}

function defaultTransplantDraft(row: number, col: number): TransplantDraft {
  return { selectedPlantId: null, row, col };
}

export function createInitialSM({ row, col }: { row: number; col: number }): SM {
  return {
    activeTab: 'add',
    tabs: {
      add: { draft: defaultAddDraft(row, col), sub: { kind: 'step-identity' } },
      clone: { draft: defaultTransplantDraft(row, col), sub: { kind: 'idle' } },
      seedling: { draft: defaultTransplantDraft(row, col), sub: { kind: 'idle' } },
    },
    status: { kind: 'idle' },
    toast: undefined,
  };
}

// ─── Transition ───────────────────────────────────────────────────────────────

export function transition(sm: SM, event: SMEvent): SM {
  switch (event.type) {
    case 'TabSelected': {
      const addSub: AddSubState =
        event.tab === 'add' ? { kind: 'step-identity' } : sm.tabs.add.sub;
      return {
        ...sm,
        activeTab: event.tab,
        tabs: {
          ...sm.tabs,
          add: { ...sm.tabs.add, sub: addSub },
        },
      };
    }

    case 'WizardAdvanced': {
      const { sub, draft } = sm.tabs.add;
      if (sub.kind === 'step-identity') {
        if (!draft.strain) return sm;
        return setAddSub(sm, { kind: 'step-source' });
      }
      if (sub.kind === 'step-source') {
        return setAddSub(sm, { kind: 'step-schedule' });
      }
      return sm;
    }

    case 'WizardBacked': {
      const { sub } = sm.tabs.add;
      if (sub.kind === 'step-source') return setAddSub(sm, { kind: 'step-identity' });
      if (sub.kind === 'step-schedule') return setAddSub(sm, { kind: 'step-source' });
      return sm;
    }

    case 'DraftFieldChanged': {
      if (event.tab === 'add') {
        return {
          ...sm,
          tabs: {
            ...sm.tabs,
            add: {
              ...sm.tabs.add,
              draft: { ...sm.tabs.add.draft, [event.field]: event.value },
            },
          },
        };
      }
      if (event.tab === 'clone') {
        return {
          ...sm,
          tabs: {
            ...sm.tabs,
            clone: {
              ...sm.tabs.clone,
              draft: { ...sm.tabs.clone.draft, [event.field]: event.value },
            },
          },
        };
      }
      // seedling
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          seedling: {
            ...sm.tabs.seedling,
            draft: { ...sm.tabs.seedling.draft, [event.field]: event.value },
          },
        },
      };
    }

    case 'SiblingPlantSelected': {
      const current = sm.tabs.add.draft;
      const isDeselect =
        current.strain === event.strain &&
        current.phenotype === event.phenotype &&
        current.cloneStart === event.cloneStart &&
        current.siblingPlantId !== null;

      if (isDeselect) {
        return {
          ...sm,
          tabs: {
            ...sm.tabs,
            add: {
              ...sm.tabs.add,
              draft: { ...current, siblingPlantId: null },
            },
          },
        };
      }

      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          add: {
            ...sm.tabs.add,
            draft: {
              ...current,
              strain: event.strain,
              strainQuery: event.strain,
              phenotype: event.phenotype,
              cloneStart: event.cloneStart,
              siblingPlantId: event.strain,
            },
          },
        },
      };
    }

    case 'SaveRequested':
      return { ...sm, status: { kind: 'applying' } };

    case 'SaveResolved':
      return { ...sm, status: { kind: 'done' } };

    case 'SaveFailed':
      return { ...sm, status: { kind: 'error', message: event.message }, toast: event.message };

    case 'StatusReset':
      return { ...sm, status: { kind: 'idle' } };

    case 'SetToast':
      return { ...sm, toast: event.message };

    default:
      return sm;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function setAddSub(sm: SM, sub: AddSubState): SM {
  return {
    ...sm,
    tabs: { ...sm.tabs, add: { ...sm.tabs.add, sub } },
  };
}
