/**
 * Program Library State Machine
 *
 * Pure module — no Lit, no DOM, no hassCall. All interaction state for the
 * standalone [[Irrigation Program]] editor lives here. The container calls
 * `transition(sm, event)` and replaces its single `@state() _sm`.
 *
 * Does NOT satisfy DialogStateMachine, for the same reason `RecipeLibrarySM`
 * does not: the editor has no navigation tabs with per-tab draft state. Its
 * shape is flat.
 *
 * The draft is the **whole plan**, because `save_irrigation_program` replaces a
 * program's whole slot list rather than merging into it. Editing one cell and
 * sending only that cell would silently delete every other slot, so the draft
 * carries what the grid is showing and the save sends exactly that.
 *
 * Two things the grid shows are not slots and so are held beside them: the
 * stages the grower has opened a column for before filling any of it, and how
 * many week rows are on screen. Both are presentation the grower controls; a
 * stage with no slots is nothing to save, and the run-order sort the backend
 * applies would drop it on the next read anyway.
 */

import type { IrrigationProgram, ProgramSlot } from '../services/types';
import { PROGRAM_STAGES } from '../slices/irrigation/schema';

// ─── Draft ────────────────────────────────────────────────────────────────────

/** How many week rows a plan with no slots opens on. */
export const DEFAULT_WEEK_ROWS = 4;

/**
 * The plan as the grid is showing it.
 *
 * `id` is null for a program being created — the backend assigns the identity,
 * so there is nothing to invent locally and nothing to send.
 */
export interface ProgramDraft {
  id: string | null;
  name: string;
  /** The plan itself. A cleared cell is an absent slot, never a blank one. */
  slots: ProgramSlot[];
  /**
   * Stages given a column that hold no slot yet. Kept apart from the stages the
   * slots imply so that opening a column is undoable and saving is unaffected.
   */
  extraStages: string[];
  /** How many week rows the grid shows. Always at least one past the last slot. */
  weekRows: number;
}

// ─── Status ───────────────────────────────────────────────────────────────────

export type ProgramLibraryStatus =
  | { kind: 'idle' }
  | { kind: 'editing'; draft: ProgramDraft }
  | { kind: 'applying'; draft: ProgramDraft }
  | { kind: 'error'; draft: ProgramDraft; message: string }
  | { kind: 'confirm-delete'; id: string; name: string }
  | { kind: 'deleting'; id: string; name: string };

export interface ProgramLibrarySM {
  /** The program whose detail is open, or null for the list. */
  selectedId: string | null;
  status: ProgramLibraryStatus;
  toast: string | undefined;
}

// ─── Events ───────────────────────────────────────────────────────────────────

export type ProgramLibraryEvent =
  | { type: 'ProgramSelected'; id: string }
  | { type: 'BackToList' }
  | { type: 'CreateStarted' }
  | { type: 'EditStarted'; program: IrrigationProgram }
  | { type: 'EditCancelled' }
  | { type: 'NameChanged'; name: string }
  /** `recipeId` null empties the cell — a gap, which is a real instruction. */
  | { type: 'SlotChanged'; stage: string; week: number; recipeId: string | null }
  | { type: 'StageOpened'; stage: string }
  | { type: 'StageClosed'; stage: string }
  | { type: 'WeekAdded' }
  | { type: 'SaveRequested' }
  | { type: 'SaveResolved'; id: string }
  | { type: 'SaveFailed'; message: string }
  | { type: 'DeleteRequested'; id: string; name: string }
  | { type: 'DeleteConfirmed' }
  | { type: 'DeleteCancelled' }
  | { type: 'DeleteResolved' }
  | { type: 'DeleteFailed'; message: string }
  | { type: 'SET_TOAST'; message: string | undefined };

// ─── Initial state ────────────────────────────────────────────────────────────

export function createInitialSM(): ProgramLibrarySM {
  return { selectedId: null, status: { kind: 'idle' }, toast: undefined };
}

function maxWeek(slots: ProgramSlot[]): number {
  return slots.reduce((max, slot) => Math.max(max, slot.week), 0);
}

/**
 * Week rows for a plan: one past its last slot, so there is always somewhere to
 * extend into and the run visibly has an end rather than stopping at the edge
 * of the table.
 */
function weekRowsFor(slots: ProgramSlot[]): number {
  return Math.max(maxWeek(slots) + 1, DEFAULT_WEEK_ROWS);
}

/** Open an edit form seeded from the plan the program currently stores. */
export function draftFromProgram(program: IrrigationProgram): ProgramDraft {
  return {
    id: program.id,
    name: program.name,
    slots: [...program.slots],
    extraStages: [],
    weekRows: weekRowsFor(program.slots),
  };
}

/**
 * A new plan. It opens on veg and flower with no slots — the two stages a whole
 * run is planned in — rather than on all five, because a column per live stage
 * would put clone and mother in front of every grower who will never use them.
 * Both are closable and the other three are one click away.
 */
export function draftForNewProgram(): ProgramDraft {
  return {
    id: null,
    name: '',
    slots: [],
    extraStages: ['veg', 'flower'],
    weekRows: DEFAULT_WEEK_ROWS,
  };
}

// ─── Transition ───────────────────────────────────────────────────────────────

/** The statuses that own a draft, and so survive a field edit. */
function draftOf(status: ProgramLibraryStatus): ProgramDraft | null {
  return status.kind === 'editing' || status.kind === 'error' ? status.draft : null;
}

/** Replace one cell, keeping the draft's own slot order stable. */
function withSlot(
  draft: ProgramDraft,
  stage: string,
  week: number,
  recipeId: string | null
): ProgramSlot[] {
  const without = draft.slots.filter((slot) => !(slot.stage === stage && slot.week === week));
  return recipeId === null ? without : [...without, { stage, week, recipeId }];
}

export function transition(sm: ProgramLibrarySM, event: ProgramLibraryEvent): ProgramLibrarySM {
  switch (event.type) {
    case 'ProgramSelected':
      return { ...sm, selectedId: event.id, status: { kind: 'idle' } };

    case 'BackToList':
      return { ...sm, selectedId: null, status: { kind: 'idle' } };

    case 'CreateStarted':
      // No selection: a program being created is not in the library yet, so the
      // detail must render from the draft rather than from a stored program.
      return { ...sm, selectedId: null, status: { kind: 'editing', draft: draftForNewProgram() } };

    case 'EditStarted':
      return {
        ...sm,
        selectedId: event.program.id,
        status: { kind: 'editing', draft: draftFromProgram(event.program) },
      };

    case 'EditCancelled':
      return { ...sm, status: { kind: 'idle' } };

    case 'NameChanged': {
      const draft = draftOf(sm.status);
      if (draft === null) return sm;
      // Leaving `error` on the first keystroke: the message described the plan
      // that was rejected, and the grower has just changed it.
      return { ...sm, status: { kind: 'editing', draft: { ...draft, name: event.name } } };
    }

    case 'SlotChanged': {
      const draft = draftOf(sm.status);
      if (draft === null) return sm;
      const slots = withSlot(draft, event.stage, event.week, event.recipeId);
      return {
        ...sm,
        status: {
          kind: 'editing',
          draft: {
            ...draft,
            slots,
            // Filling the last row opens the next one, so the plan never has to
            // be extended before it can be continued.
            weekRows: Math.max(draft.weekRows, weekRowsFor(slots)),
            // A stage that now holds a slot no longer needs to be carried as an
            // opened-but-empty column; the slots imply it.
            extraStages: draft.extraStages.filter(
              (stage) => !slots.some((slot) => slot.stage === stage)
            ),
          },
        },
      };
    }

    case 'StageOpened': {
      const draft = draftOf(sm.status);
      if (draft === null) return sm;
      if (!(PROGRAM_STAGES as readonly string[]).includes(event.stage)) return sm;
      if (draft.extraStages.includes(event.stage)) return sm;
      if (draft.slots.some((slot) => slot.stage === event.stage)) return sm;
      return {
        ...sm,
        status: {
          kind: 'editing',
          draft: { ...draft, extraStages: [...draft.extraStages, event.stage] },
        },
      };
    }

    case 'StageClosed': {
      const draft = draftOf(sm.status);
      if (draft === null) return sm;
      // Only an empty column closes. A stage holding slots is closed by
      // emptying its cells, so a column can never take part of the plan with it.
      if (draft.slots.some((slot) => slot.stage === event.stage)) return sm;
      return {
        ...sm,
        status: {
          kind: 'editing',
          draft: { ...draft, extraStages: draft.extraStages.filter((s) => s !== event.stage) },
        },
      };
    }

    case 'WeekAdded': {
      const draft = draftOf(sm.status);
      if (draft === null) return sm;
      return {
        ...sm,
        status: { kind: 'editing', draft: { ...draft, weekRows: draft.weekRows + 1 } },
      };
    }

    case 'SaveRequested': {
      const draft = draftOf(sm.status);
      // A blank name is refused by the backend; not offering it is cheaper than
      // surfacing that refusal. An empty plan is allowed — a program with no
      // slots holds every week, which is a legitimate thing to save and edit.
      if (draft === null || draft.name.trim() === '') return sm;
      return { ...sm, status: { kind: 'applying', draft } };
    }

    case 'SaveResolved':
      if (sm.status.kind !== 'applying') return sm;
      // Selecting the saved id is what carries a newly created program from the
      // draft it was built in to the stored program the detail now reads.
      return {
        ...sm,
        selectedId: event.id,
        status: { kind: 'idle' },
        toast: 'Program saved',
      };

    case 'SaveFailed':
      if (sm.status.kind !== 'applying') return sm;
      // The draft is kept, so a refusal the grower can act on — a slot the
      // backend would not take — leaves the plan they built on screen.
      return {
        ...sm,
        status: { kind: 'error', draft: sm.status.draft, message: event.message },
      };

    case 'DeleteRequested':
      return { ...sm, status: { kind: 'confirm-delete', id: event.id, name: event.name } };

    case 'DeleteConfirmed':
      if (sm.status.kind !== 'confirm-delete') return sm;
      return { ...sm, status: { kind: 'deleting', id: sm.status.id, name: sm.status.name } };

    case 'DeleteCancelled':
      return { ...sm, status: { kind: 'idle' } };

    case 'DeleteResolved':
      if (sm.status.kind !== 'deleting') return sm;
      // Back to the list: the program the detail was showing is gone.
      return {
        ...sm,
        selectedId: null,
        status: { kind: 'idle' },
        toast: `Deleted "${sm.status.name}"`,
      };

    case 'DeleteFailed':
      if (sm.status.kind !== 'deleting') return sm;
      return { ...sm, status: { kind: 'idle' }, toast: event.message };

    case 'SET_TOAST':
      return { ...sm, toast: event.message };
  }
}
