/**
 * Program Library SM — unit tests.
 *
 * The plan is the draft, so the tests are mostly about one thing: that a cell
 * edit changes exactly the cell it names and that the grid a grower is looking
 * at is the grid that gets saved.
 */

import { describe, expect, it } from 'vitest';
import {
  DEFAULT_WEEK_ROWS,
  createInitialSM,
  draftForNewProgram,
  draftFromProgram,
  transition,
  type ProgramDraft,
  type ProgramLibraryEvent,
  type ProgramLibrarySM,
} from './program-library-sm';
import type { IrrigationProgram } from '../services/types';

const PROGRAM: IrrigationProgram = {
  id: 'p1',
  name: 'Full run',
  slots: [
    { stage: 'veg', week: 1, recipeId: 'r-veg' },
    { stage: 'flower', week: 3, recipeId: 'r-flower' },
  ],
  createdAt: '2026-08-06T09:00:00+00:00',
};

function walk(...events: ProgramLibraryEvent[]): ProgramLibrarySM {
  return events.reduce<ProgramLibrarySM>((sm, event) => transition(sm, event), createInitialSM());
}

function draftOf(sm: ProgramLibrarySM): ProgramDraft {
  const status = sm.status;
  if (status.kind !== 'editing' && status.kind !== 'applying' && status.kind !== 'error') {
    throw new Error(`no draft in status ${status.kind}`);
  }
  return status.draft;
}

describe('program library SM — opening a plan', () => {
  it('seeds the draft from what the program stores', () => {
    const draft = draftFromProgram(PROGRAM);

    expect(draft.id).toBe('p1');
    expect(draft.name).toBe('Full run');
    expect(draft.slots).toEqual(PROGRAM.slots);
  });

  it('opens one week row past the last slot, so the plan can always be continued', () => {
    expect(draftFromProgram(PROGRAM).weekRows).toBe(4);
    expect(
      draftFromProgram({ ...PROGRAM, slots: [{ stage: 'flower', week: 8, recipeId: 'r' }] })
        .weekRows
    ).toBe(9);
  });

  it('a new plan has no id — the backend assigns identity', () => {
    const draft = draftForNewProgram();

    expect(draft.id).toBeNull();
    expect(draft.slots).toEqual([]);
    expect(draft.weekRows).toBe(DEFAULT_WEEK_ROWS);
    // Veg and flower, because that is where a run is planned.
    expect(draft.extraStages).toEqual(['veg', 'flower']);
  });

  it('creating clears the selection — the plan is not in the library yet', () => {
    const sm = walk({ type: 'ProgramSelected', id: 'p1' }, { type: 'CreateStarted' });

    expect(sm.selectedId).toBeNull();
    expect(draftOf(sm).id).toBeNull();
  });
});

describe('program library SM — editing the plan', () => {
  it('setting a cell adds exactly that slot', () => {
    const sm = walk(
      { type: 'EditStarted', program: { ...PROGRAM, slots: [] } },
      { type: 'SlotChanged', stage: 'flower', week: 2, recipeId: 'r-a' }
    );

    expect(draftOf(sm).slots).toEqual([{ stage: 'flower', week: 2, recipeId: 'r-a' }]);
  });

  it('clearing a cell removes the slot rather than blanking it', () => {
    const sm = walk(
      { type: 'EditStarted', program: PROGRAM },
      { type: 'SlotChanged', stage: 'veg', week: 1, recipeId: null }
    );

    expect(draftOf(sm).slots).toEqual([{ stage: 'flower', week: 3, recipeId: 'r-flower' }]);
  });

  it('changing a cell replaces that slot and leaves every other alone', () => {
    const sm = walk(
      { type: 'EditStarted', program: PROGRAM },
      { type: 'SlotChanged', stage: 'veg', week: 1, recipeId: 'r-new' }
    );

    expect(draftOf(sm).slots).toEqual([
      { stage: 'flower', week: 3, recipeId: 'r-flower' },
      { stage: 'veg', week: 1, recipeId: 'r-new' },
    ]);
  });

  it('filling the last row opens the next one', () => {
    const sm = walk(
      { type: 'EditStarted', program: { ...PROGRAM, slots: [] } },
      { type: 'SlotChanged', stage: 'flower', week: DEFAULT_WEEK_ROWS, recipeId: 'r-a' }
    );

    expect(draftOf(sm).weekRows).toBe(DEFAULT_WEEK_ROWS + 1);
  });

  it('adding a week extends the grid without touching the plan', () => {
    const sm = walk({ type: 'EditStarted', program: PROGRAM }, { type: 'WeekAdded' });

    expect(draftOf(sm).weekRows).toBe(5);
    expect(draftOf(sm).slots).toEqual(PROGRAM.slots);
  });
});

describe('program library SM — stage columns', () => {
  it('opens a column for a stage the plan does not use yet', () => {
    const sm = walk(
      { type: 'EditStarted', program: PROGRAM },
      { type: 'StageOpened', stage: 'seedling' }
    );

    expect(draftOf(sm).extraStages).toEqual(['seedling']);
  });

  it('refuses a stage no growspace could ever resolve to', () => {
    const sm = walk(
      { type: 'EditStarted', program: PROGRAM },
      { type: 'StageOpened', stage: 'drying' }
    );

    expect(draftOf(sm).extraStages).toEqual([]);
  });

  it('closes an empty column', () => {
    const sm = walk(
      { type: 'EditStarted', program: PROGRAM },
      { type: 'StageOpened', stage: 'seedling' },
      { type: 'StageClosed', stage: 'seedling' }
    );

    expect(draftOf(sm).extraStages).toEqual([]);
  });

  it('refuses to close a column holding slots — a column never takes plan with it', () => {
    const sm = walk(
      { type: 'EditStarted', program: PROGRAM },
      { type: 'StageClosed', stage: 'veg' }
    );

    expect(draftOf(sm).slots).toEqual(PROGRAM.slots);
  });

  it('stops carrying an opened column once the slots imply it', () => {
    const sm = walk(
      { type: 'CreateStarted' },
      { type: 'SlotChanged', stage: 'veg', week: 1, recipeId: 'r-a' }
    );

    expect(draftOf(sm).extraStages).toEqual(['flower']);
  });
});

describe('program library SM — saving', () => {
  it('refuses to save a blank name', () => {
    const sm = walk(
      { type: 'EditStarted', program: { ...PROGRAM, name: '' } },
      { type: 'SaveRequested' }
    );

    expect(sm.status.kind).toBe('editing');
  });

  it('saves a plan with no slots — every week holding is a real plan', () => {
    const sm = walk(
      { type: 'EditStarted', program: { ...PROGRAM, slots: [] } },
      { type: 'SaveRequested' }
    );

    expect(sm.status.kind).toBe('applying');
  });

  it('selects the saved program, so a newly created one lands on its own detail', () => {
    const sm = walk(
      { type: 'CreateStarted' },
      { type: 'NameChanged', name: 'Full run' },
      { type: 'SaveRequested' },
      { type: 'SaveResolved', id: 'p-new' }
    );

    expect(sm.selectedId).toBe('p-new');
    expect(sm.status.kind).toBe('idle');
    expect(sm.toast).toBe('Program saved');
  });

  it('keeps the plan on screen when the backend refuses it', () => {
    const sm = walk(
      { type: 'EditStarted', program: PROGRAM },
      { type: 'SlotChanged', stage: 'flower', week: 5, recipeId: 'r-a' },
      { type: 'SaveRequested' },
      { type: 'SaveFailed', message: 'Slot 2 names week 0, which is not a week.' }
    );

    expect(sm.status.kind).toBe('error');
    expect(draftOf(sm).slots).toHaveLength(3);
  });

  it('a keystroke after a refusal leaves the error behind', () => {
    const sm = walk(
      { type: 'EditStarted', program: PROGRAM },
      { type: 'SaveRequested' },
      { type: 'SaveFailed', message: 'nope' },
      { type: 'NameChanged', name: 'Full run v2' }
    );

    expect(sm.status.kind).toBe('editing');
  });
});

describe('program library SM — deleting', () => {
  it('confirms before deleting and returns to the list afterwards', () => {
    const sm = walk(
      { type: 'ProgramSelected', id: 'p1' },
      { type: 'DeleteRequested', id: 'p1', name: 'Full run' },
      { type: 'DeleteConfirmed' },
      { type: 'DeleteResolved' }
    );

    expect(sm.selectedId).toBeNull();
    expect(sm.toast).toBe('Deleted "Full run"');
  });

  it('cancelling deletes nothing', () => {
    const sm = walk(
      { type: 'DeleteRequested', id: 'p1', name: 'Full run' },
      { type: 'DeleteCancelled' }
    );

    expect(sm.status.kind).toBe('idle');
  });

  it('surfaces a failed delete as a toast and stays put', () => {
    const sm = walk(
      { type: 'ProgramSelected', id: 'p1' },
      { type: 'DeleteRequested', id: 'p1', name: 'Full run' },
      { type: 'DeleteConfirmed' },
      { type: 'DeleteFailed', message: 'boom' }
    );

    expect(sm.selectedId).toBe('p1');
    expect(sm.toast).toBe('boom');
  });
});
