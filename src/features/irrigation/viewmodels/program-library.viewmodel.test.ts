/**
 * Program Library ViewModel — unit tests.
 *
 * The grid is what this surface exists for, so most of these are about the same
 * property from different angles: every `(stage, week)` position is present,
 * and a position the plan says nothing about is present *as an empty one*.
 */

import { describe, expect, it } from 'vitest';
import { atom } from 'nanostores';
import {
  buildProgramGrid,
  createProgramLibraryViewModel,
  programSpanLabel,
} from './program-library.viewmodel';
import {
  createInitialSM,
  draftForNewProgram,
  transition,
  type ProgramLibraryEvent,
  type ProgramLibrarySM,
} from '../../../dialogs/program-library-sm';
import type { IrrigationProgram, IrrigationRecipe } from '../../../services/types';

function recipe(id: string, name: string): IrrigationRecipe {
  return {
    id,
    name,
    kind: 'crop_steering',
    provenance: {
      mediaType: 'coco',
      litersPerPot: 5,
      pumpFlowRateMlPerSec: 11,
      stage: 'flower',
      week: 3,
    },
    cropSteering: null,
    schedule: null,
    createdAt: '2026-08-04T09:00:00+00:00',
  };
}

const RECIPES = [recipe('r-veg', 'Veg feed'), recipe('r-flower', 'Flower generative')];

const PROGRAM: IrrigationProgram = {
  id: 'p1',
  name: 'Full run',
  slots: [
    { stage: 'veg', week: 1, recipeId: 'r-veg' },
    { stage: 'flower', week: 1, recipeId: 'r-flower' },
    { stage: 'flower', week: 3, recipeId: 'r-flower' },
  ],
  createdAt: '2026-08-06T09:00:00+00:00',
};

function vmOf(
  programs: IrrigationProgram[],
  recipes: IrrigationRecipe[],
  ...events: ProgramLibraryEvent[]
) {
  const sm = events.reduce<ProgramLibrarySM>(
    (acc, event) => transition(acc, event),
    createInitialSM()
  );
  return createProgramLibraryViewModel(atom(sm), atom(programs), atom(recipes)).get();
}

describe('program library VM — the list', () => {
  it('reports each plan as the run it covers, not as a slot count alone', () => {
    const vm = vmOf([PROGRAM], RECIPES);

    expect(vm.rows[0].spanLabel).toBe('Veg 1 · Flower 1–3');
    expect(vm.rows[0].slotCount).toBe(3);
  });

  it('orders the span by run order, whatever order the slots arrived in', () => {
    expect(
      programSpanLabel([
        { stage: 'flower', week: 2, recipeId: 'r' },
        { stage: 'seedling', week: 1, recipeId: 'r' },
        { stage: 'veg', week: 4, recipeId: 'r' },
      ])
    ).toBe('Seedling 1 · Veg 4 · Flower 2');
  });

  it('a plan with no slots has no span to report', () => {
    expect(programSpanLabel([])).toBeNull();
  });
});

describe('program library VM — the grid', () => {
  it('renders a cell for every position, filled or not', () => {
    const grid = buildProgramGrid(
      { id: 'p1', name: 'Full run', slots: PROGRAM.slots, extraStages: [], weekRows: 4 },
      RECIPES
    );

    expect(grid.columns.map((c) => c.stage)).toEqual(['veg', 'flower']);
    expect(grid.weeks).toEqual([1, 2, 3, 4]);
    expect(grid.rows).toHaveLength(4);
    expect(grid.rows.every((row) => row.length === 2)).toBe(true);
  });

  it('a week the plan says nothing about is an empty cell, not a missing row', () => {
    const grid = buildProgramGrid(
      { id: 'p1', name: 'Full run', slots: PROGRAM.slots, extraStages: [], weekRows: 4 },
      RECIPES
    );

    // Flower week 2 sits between two filled weeks and is the whole point.
    const flowerWeek2 = grid.rows[1][1];
    expect(flowerWeek2).toEqual({
      stage: 'flower',
      week: 2,
      recipeId: null,
      recipeName: null,
      missing: false,
    });
  });

  it('starts every stage at week 1 even when its first slot is later', () => {
    const grid = buildProgramGrid(
      {
        id: 'p1',
        name: 'Late start',
        slots: [{ stage: 'flower', week: 3, recipeId: 'r-flower' }],
        extraStages: [],
        weekRows: 4,
      },
      RECIPES
    );

    expect(grid.rows[0][0].week).toBe(1);
    expect(grid.rows[0][0].recipeId).toBeNull();
  });

  it('names the recipe each filled cell points at', () => {
    const grid = buildProgramGrid(
      { id: 'p1', name: 'Full run', slots: PROGRAM.slots, extraStages: [], weekRows: 4 },
      RECIPES
    );

    expect(grid.rows[0][0].recipeName).toBe('Veg feed');
    expect(grid.rows[2][1].recipeName).toBe('Flower generative');
  });

  it('tells a deleted recipe apart from a gap — the plan says something, and it is gone', () => {
    const grid = buildProgramGrid(
      {
        id: 'p1',
        name: 'Full run',
        slots: [{ stage: 'flower', week: 1, recipeId: 'r-gone' }],
        extraStages: [],
        weekRows: 2,
      },
      RECIPES
    );

    expect(grid.rows[0][0]).toMatchObject({ recipeId: 'r-gone', recipeName: null, missing: true });
    expect(grid.rows[1][0]).toMatchObject({ recipeId: null, missing: false });
  });

  it('shows a column for a stage opened but not yet filled', () => {
    const grid = buildProgramGrid(
      { ...draftForNewProgram(), extraStages: ['veg', 'flower'] },
      RECIPES
    );

    expect(grid.columns.map((c) => c.stage)).toEqual(['veg', 'flower']);
    expect(grid.columns.every((c) => c.closable)).toBe(true);
  });

  it('marks a column holding slots as not closable', () => {
    const grid = buildProgramGrid(
      { id: 'p1', name: 'Full run', slots: PROGRAM.slots, extraStages: ['clone'], weekRows: 2 },
      RECIPES
    );

    expect(grid.columns.find((c) => c.stage === 'veg')?.closable).toBe(false);
    expect(grid.columns.find((c) => c.stage === 'clone')?.closable).toBe(true);
  });

  it('orders columns by run order regardless of when they were opened', () => {
    const grid = buildProgramGrid(
      {
        id: null,
        name: '',
        slots: [{ stage: 'flower', week: 1, recipeId: 'r-flower' }],
        extraStages: ['seedling', 'veg'],
        weekRows: 2,
      },
      RECIPES
    );

    expect(grid.columns.map((c) => c.stage)).toEqual(['seedling', 'veg', 'flower']);
  });
});

describe('program library VM — the form', () => {
  it('offers both recipe kinds — a plan is not a growspace', () => {
    const vm = vmOf(
      [PROGRAM],
      [...RECIPES, { ...recipe('r-sched', 'Veg timer'), kind: 'schedule' as const }],
      { type: 'EditStarted', program: PROGRAM }
    );

    expect(vm.recipeOptions.map((o) => o.name)).toEqual([
      'Veg feed',
      'Flower generative',
      'Veg timer',
    ]);
    expect(vm.recipeOptions[2].kindLabel).toBe('Schedule');
  });

  it('offers only the stages the plan has no column for', () => {
    const vm = vmOf([PROGRAM], RECIPES, { type: 'EditStarted', program: PROGRAM });

    expect(vm.openableStages.map((s) => s.stage)).toEqual(['seedling', 'clone', 'mother']);
  });

  it('cannot save an unchanged plan', () => {
    const vm = vmOf([PROGRAM], RECIPES, { type: 'EditStarted', program: PROGRAM });

    expect(vm.canSave).toBe(false);
  });

  it('can save once a cell changes', () => {
    const vm = vmOf(
      [PROGRAM],
      RECIPES,
      { type: 'EditStarted', program: PROGRAM },
      { type: 'SlotChanged', stage: 'flower', week: 2, recipeId: 'r-flower' }
    );

    expect(vm.canSave).toBe(true);
  });

  it('counts emptying a cell as a change', () => {
    const vm = vmOf(
      [PROGRAM],
      RECIPES,
      { type: 'EditStarted', program: PROGRAM },
      { type: 'SlotChanged', stage: 'veg', week: 1, recipeId: null }
    );

    expect(vm.canSave).toBe(true);
  });

  it('cannot save a new plan until it is named', () => {
    const unnamed = vmOf([PROGRAM], RECIPES, { type: 'CreateStarted' });
    expect(unnamed.canSave).toBe(false);

    const named = vmOf(
      [PROGRAM],
      RECIPES,
      { type: 'CreateStarted' },
      {
        type: 'NameChanged',
        name: 'New run',
      }
    );
    expect(named.canSave).toBe(true);
  });

  it('reports a creating form even though nothing is selected', () => {
    const vm = vmOf([PROGRAM], RECIPES, { type: 'CreateStarted' });

    expect(vm.creating).toBe(true);
    expect(vm.selected).toBeNull();
    expect(vm.grid).not.toBeNull();
  });

  it('is busy while a save is in flight', () => {
    const vm = vmOf(
      [PROGRAM],
      RECIPES,
      { type: 'EditStarted', program: PROGRAM },
      { type: 'SlotChanged', stage: 'flower', week: 2, recipeId: 'r-flower' },
      { type: 'SaveRequested' }
    );

    expect(vm.busy).toBe(true);
  });

  it('falls back to the list when the open program leaves the library', () => {
    const vm = vmOf([], RECIPES, { type: 'ProgramSelected', id: 'p1' });

    expect(vm.selected).toBeNull();
    expect(vm.grid).toBeNull();
  });

  it('surfaces the backend refusal verbatim', () => {
    const vm = vmOf(
      [PROGRAM],
      RECIPES,
      { type: 'EditStarted', program: PROGRAM },
      { type: 'SaveRequested' },
      { type: 'SaveFailed', message: 'Slot 1 names dry, which is not a live stage.' }
    );

    expect(vm.errorMessage).toBe('Slot 1 names dry, which is not a live stage.');
  });
});
