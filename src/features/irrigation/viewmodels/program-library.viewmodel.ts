/**
 * Program Library ViewModel (ADR-0019)
 *
 * The pure derivation behind the standalone [[Irrigation Program]] editor — the
 * library as an object in its own right, and one plan as the grid a grower
 * builds it in.
 *
 * The grid is the whole point of this surface. A program is a plan for a run,
 * and a run is `(stage, week)`; laying it out as a table with a cell for every
 * position is what makes a **gap visible**. A list of the slots that exist
 * would show the same plan and hide the thing that matters most — that week 4
 * has no instruction, which is exactly what makes the tent hold rather than
 * water on last week's numbers ([[Program Hold]]).
 *
 * Like the [[Recipe Library Editor]] beside it, this takes **no growspace**: a
 * program exists whether or not any tent is bound to it, so nothing here filters
 * or orders by one. Which growspace runs which plan is the Program Tab's
 * question.
 */

import { computed, type ReadableAtom } from 'nanostores';
import type { IrrigationProgram, IrrigationRecipe, ProgramSlot } from '../../../services/types';
import type { ProgramDraft, ProgramLibrarySM } from '../../../dialogs/program-library-sm';
import { PROGRAM_STAGES } from '../../../slices/irrigation/schema';

/** One row of the library list. */
export interface ProgramRowVM {
  id: string;
  name: string;
  /** "Veg 1–4 · Flower 1–8" — the run the plan covers, or null when empty. */
  spanLabel: string | null;
  /** How many weeks the plan actually names a recipe for. */
  slotCount: number;
  createdAtLabel: string | null;
  selected: boolean;
}

/** One cell of the plan grid — one `(stage, week)` position. */
export interface ProgramCellVM {
  stage: string;
  week: number;
  /** The slot's recipe id, or null when this position is a gap. */
  recipeId: string | null;
  /** The recipe's name, null for a gap, and null too when it was deleted. */
  recipeName: string | null;
  /**
   * True when the cell names a recipe the library no longer holds. Distinct
   * from a gap in what it means — the plan says something, and the something it
   * says is gone — even though both hold.
   */
  missing: boolean;
}

/** One column of the grid. */
export interface ProgramStageColumnVM {
  stage: string;
  label: string;
  /** Whether the column may be closed: only while it holds no slot. */
  closable: boolean;
}

/** The plan as a table: a column per stage, a row per week. */
export interface ProgramGridVM {
  columns: ProgramStageColumnVM[];
  /** 1-indexed week numbers, one per row. */
  weeks: number[];
  /** `rows[weekIndex][columnIndex]` — every position, gaps included. */
  rows: ProgramCellVM[][];
}

/** A recipe the grid's cell pickers can offer. */
export interface ProgramRecipeOptionVM {
  id: string;
  name: string;
  /** "Crop steering" / "Schedule" — both kinds are offered, see below. */
  kindLabel: string;
}

/** The delete confirmation for one program. */
export interface ProgramDeleteConfirmVM {
  id: string;
  name: string;
}

/** Complete render input for `<irrigation-program-library>`. */
export interface ProgramLibraryViewModel {
  /** Every saved program, name-ordered. Empty → the library's empty state. */
  rows: ProgramRowVM[];
  /** The program whose detail is open, or null for the list. */
  selected: IrrigationProgram | null;
  /** True while the plan form is open (including after a refused save). */
  editing: boolean;
  /** True when the open form is building a program that does not exist yet. */
  creating: boolean;
  /** The name in the form; the stored name when not editing. */
  nameDraft: string;
  /** The plan, as the grid renders it. Null when the list is showing. */
  grid: ProgramGridVM | null;
  /** Every saved recipe, name-ordered, for the cell pickers. */
  recipeOptions: ProgramRecipeOptionVM[];
  /** Stages not yet given a column, in run order. */
  openableStages: ProgramStageColumnVM[];
  /** Whether the form has something worth saving. */
  canSave: boolean;
  /** The backend's refusal from the last save, verbatim, or null. */
  errorMessage: string | null;
  /** The pending delete confirmation, or null. */
  deleteConfirm: ProgramDeleteConfirmVM | null;
  /** A mutation is in flight — the form and the buttons disable. */
  busy: boolean;
  toast: string | undefined;
}

const STAGE_LABELS: Record<string, string> = {
  seedling: 'Seedling',
  clone: 'Clone',
  mother: 'Mother',
  veg: 'Veg',
  flower: 'Flower',
};

const KIND_LABELS: Record<string, string> = {
  crop_steering: 'Crop steering',
  schedule: 'Schedule',
};

export function programStageLabel(stage: string): string {
  return STAGE_LABELS[stage] ?? stage;
}

/** Run order, as the backend sorts slots by. Unknown stages sort last. */
function stageRank(stage: string): number {
  const index = (PROGRAM_STAGES as readonly string[]).indexOf(stage);
  return index === -1 ? PROGRAM_STAGES.length : index;
}

/** Timestamp formatting, matching the recipe library's. */
function formatTimestamp(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * "Veg 1–4 · Flower 1–8" — the weeks each stage of the plan actually covers.
 *
 * The span, not the count, because a plan is read as a run: first and last week
 * is what a grower recognises their own grow in. It deliberately says nothing
 * about the gaps inside the span; the grid is where those are read.
 */
export function programSpanLabel(slots: ProgramSlot[]): string | null {
  if (slots.length === 0) return null;
  const byStage = new Map<string, number[]>();
  for (const slot of slots) {
    const weeks = byStage.get(slot.stage) ?? [];
    weeks.push(slot.week);
    byStage.set(slot.stage, weeks);
  }
  return [...byStage.entries()]
    .sort((a, b) => stageRank(a[0]) - stageRank(b[0]))
    .map(([stage, weeks]) => {
      const first = Math.min(...weeks);
      const last = Math.max(...weeks);
      const span = first === last ? `${first}` : `${first}–${last}`;
      return `${programStageLabel(stage)} ${span}`;
    })
    .join(' · ');
}

function toRow(program: IrrigationProgram, selectedId: string | null): ProgramRowVM {
  return {
    id: program.id,
    name: program.name,
    spanLabel: programSpanLabel(program.slots),
    slotCount: program.slots.length,
    createdAtLabel: formatTimestamp(program.createdAt),
    selected: program.id === selectedId,
  };
}

/**
 * The grid for one draft: a column per stage the plan uses or the grower has
 * opened, a row per week, and a cell for every position in between.
 *
 * Nothing is elided. A stage's cells run from week 1 even when its first slot
 * is week 3, because "this plan does nothing for the first two weeks of veg" is
 * a statement about the plan and not an absence of one.
 */
export function buildProgramGrid(draft: ProgramDraft, recipes: IrrigationRecipe[]): ProgramGridVM {
  const stagesWithSlots = new Set(draft.slots.map((slot) => slot.stage));
  const columns: ProgramStageColumnVM[] = [...new Set([...stagesWithSlots, ...draft.extraStages])]
    .sort((a, b) => stageRank(a) - stageRank(b))
    .map((stage) => ({
      stage,
      label: programStageLabel(stage),
      closable: !stagesWithSlots.has(stage),
    }));

  const weeks = Array.from({ length: draft.weekRows }, (_, i) => i + 1);
  const byPosition = new Map(draft.slots.map((slot) => [`${slot.stage}:${slot.week}`, slot]));
  const recipeNames = new Map(recipes.map((r) => [r.id, r.name]));

  const rows = weeks.map((week) =>
    columns.map(({ stage }) => {
      const slot = byPosition.get(`${stage}:${week}`);
      const name = slot ? (recipeNames.get(slot.recipeId) ?? null) : null;
      return {
        stage,
        week,
        recipeId: slot?.recipeId ?? null,
        recipeName: name,
        missing: slot !== undefined && name === null,
      };
    })
  );

  return { columns, weeks, rows };
}

/** True when the draft says something different from the program it came from. */
function isDirty(draft: ProgramDraft, stored: IrrigationProgram | null): boolean {
  if (stored === null) return draft.name.trim() !== '' || draft.slots.length > 0;
  if (draft.name.trim() !== stored.name) return true;
  if (draft.slots.length !== stored.slots.length) return true;
  const key = (slot: ProgramSlot) => `${slot.stage}:${slot.week}:${slot.recipeId}`;
  const before = new Set(stored.slots.map(key));
  return draft.slots.some((slot) => !before.has(key(slot)));
}

/**
 * Pure factory: SM atom + the two global libraries → one editor VM atom.
 *
 * It reads the recipe library as well as the program one because a slot stores
 * a recipe **id and nothing else**: without the library a cell could show which
 * recipe it points at only as an opaque identifier, and a recipe deleted out
 * from under a slot would be indistinguishable from a gap.
 *
 * Both recipe kinds are offered in every cell. The kind gate on the Recipe tab
 * asks what *this growspace* can be given right now; a plan is not a growspace,
 * and a program that runs schedule weeks before crop-steering ones is a
 * legitimate plan the backend stores without complaint.
 */
export function createProgramLibraryViewModel(
  $sm: ReadableAtom<ProgramLibrarySM>,
  $programs: ReadableAtom<IrrigationProgram[]>,
  $recipes: ReadableAtom<IrrigationRecipe[]>
): ReadableAtom<ProgramLibraryViewModel> {
  return computed([$sm, $programs, $recipes], (sm, programs, recipes) => {
    const status = sm.status;
    // A selection whose program has left the library (deleted in another
    // session) falls back to the list rather than showing an empty detail.
    const selected = programs.find((p) => p.id === sm.selectedId) ?? null;

    const draft =
      status.kind === 'editing' || status.kind === 'applying' || status.kind === 'error'
        ? status.draft
        : null;

    const busy = status.kind === 'applying' || status.kind === 'deleting';
    const openStages = new Set(
      draft ? [...draft.slots.map((s) => s.stage), ...draft.extraStages] : []
    );

    return {
      rows: programs.map((p) => toRow(p, sm.selectedId)),
      selected,
      editing: status.kind === 'editing' || status.kind === 'error',
      creating: draft !== null && draft.id === null,
      nameDraft: draft ? draft.name : (selected?.name ?? ''),
      grid: draft ? buildProgramGrid(draft, recipes) : null,
      recipeOptions: recipes.map((r) => ({
        id: r.id,
        name: r.name,
        kindLabel: KIND_LABELS[r.kind] ?? r.kind,
      })),
      openableStages: PROGRAM_STAGES.filter(
        (stage) => draft !== null && !openStages.has(stage)
      ).map((stage) => ({ stage, label: programStageLabel(stage), closable: true })),
      canSave:
        draft !== null &&
        draft.name.trim() !== '' &&
        isDirty(draft, draft.id === null ? null : selected),
      errorMessage: status.kind === 'error' ? status.message : null,
      deleteConfirm: status.kind === 'confirm-delete' ? { id: status.id, name: status.name } : null,
      busy,
      toast: sm.toast,
    };
  });
}
