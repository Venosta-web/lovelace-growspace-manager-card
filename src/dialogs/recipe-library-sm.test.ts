import { describe, it, expect } from 'vitest';
import {
  createInitialSM,
  draftFromRecipe,
  transition,
  type RecipeLibrarySM,
} from './recipe-library-sm';
import type { IrrigationRecipe } from '../services/types';

function recipe(over: Partial<IrrigationRecipe> = {}): IrrigationRecipe {
  return {
    id: 'r1',
    name: 'Flower week 3',
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
    ...over,
  };
}

/** Walk the SM to the edit form for `r1`. */
function editing(): RecipeLibrarySM {
  return transition(createInitialSM(), { type: 'EditStarted', recipe: recipe() });
}

describe('recipe library SM — navigation', () => {
  it('starts on the list with nothing selected', () => {
    const sm = createInitialSM();

    expect(sm.selectedId).toBeNull();
    expect(sm.status).toEqual({ kind: 'idle' });
  });

  it('selecting a recipe opens its detail', () => {
    const sm = transition(createInitialSM(), { type: 'RecipeSelected', id: 'r1' });

    expect(sm.selectedId).toBe('r1');
  });

  it('going back to the list clears the selection and any open form', () => {
    const sm = transition(editing(), { type: 'BackToList' });

    expect(sm.selectedId).toBeNull();
    expect(sm.status).toEqual({ kind: 'idle' });
  });
});

describe('recipe library SM — editing', () => {
  it('an edit form opens seeded with the stored name and no value changes', () => {
    const sm = editing();

    expect(sm.status).toEqual({
      kind: 'editing',
      draft: { id: 'r1', name: 'Flower week 3', values: {} },
    });
  });

  it('the draft stays sparse — only what was actually changed', () => {
    let sm = editing();
    sm = transition(sm, { type: 'ValueChanged', field: 'p1_shot_volume_percent', value: 7.5 });

    expect(sm.status.kind).toBe('editing');
    expect(sm.status.kind === 'editing' && sm.status.draft.values).toEqual({
      p1_shot_volume_percent: 7.5,
    });
  });

  it('a rename carries no values at all', () => {
    let sm = editing();
    sm = transition(sm, { type: 'NameChanged', name: 'Flower week 4' });

    expect(sm.status.kind === 'editing' && sm.status.draft).toEqual({
      id: 'r1',
      name: 'Flower week 4',
      values: {},
    });
  });

  it('field edits outside an open form are ignored', () => {
    const sm = createInitialSM();

    expect(transition(sm, { type: 'NameChanged', name: 'x' })).toBe(sm);
    expect(transition(sm, { type: 'ValueChanged', field: 'target_vwc_percent', value: 1 })).toBe(
      sm
    );
  });

  it('cancelling drops the draft', () => {
    let sm = editing();
    sm = transition(sm, { type: 'NameChanged', name: 'Renamed' });
    sm = transition(sm, { type: 'EditCancelled' });

    expect(sm.status).toEqual({ kind: 'idle' });
  });
});

describe('recipe library SM — saving', () => {
  it('a save moves to applying, carrying the draft the effect will send', () => {
    let sm = editing();
    sm = transition(sm, { type: 'NameChanged', name: 'Flower week 4' });
    sm = transition(sm, { type: 'SaveRequested' });

    expect(sm.status.kind).toBe('applying');
    expect(sm.status.kind === 'applying' && sm.status.draft.name).toBe('Flower week 4');
  });

  it('a blank name is not offered to the backend', () => {
    let sm = editing();
    sm = transition(sm, { type: 'NameChanged', name: '   ' });
    const before = sm;

    expect(transition(sm, { type: 'SaveRequested' })).toBe(before);
  });

  it('a resolved save returns to the detail with a toast', () => {
    let sm = transition(editing(), { type: 'SaveRequested' });
    sm = transition(sm, { type: 'SaveResolved' });

    expect(sm.status).toEqual({ kind: 'idle' });
    expect(sm.toast).toBe('Recipe saved');
  });

  it("a refused save keeps the grower's typing on screen with the reason", () => {
    let sm = transition(editing(), { type: 'NameChanged', name: 'Flower week 4' });
    sm = transition(sm, { type: 'SaveRequested' });
    sm = transition(sm, { type: 'SaveFailed', message: 'liters_per_pot is not part of…' });

    expect(sm.status.kind).toBe('error');
    expect(sm.status.kind === 'error' && sm.status.draft.name).toBe('Flower week 4');
    expect(sm.status.kind === 'error' && sm.status.message).toBe('liters_per_pot is not part of…');
  });

  it('typing after a refusal leaves the error behind', () => {
    let sm = transition(editing(), { type: 'SaveRequested' });
    sm = transition(sm, { type: 'SaveFailed', message: 'nope' });
    sm = transition(sm, { type: 'NameChanged', name: 'Flower week 4' });

    expect(sm.status.kind).toBe('editing');
  });
});

describe('recipe library SM — deleting', () => {
  it('a delete asks first', () => {
    const sm = transition(createInitialSM(), {
      type: 'DeleteRequested',
      id: 'r1',
      name: 'Flower week 3',
    });

    expect(sm.status).toEqual({ kind: 'confirm-delete', id: 'r1', name: 'Flower week 3' });
  });

  it('confirming moves to deleting, and resolving returns to the list', () => {
    let sm = transition(createInitialSM(), { type: 'RecipeSelected', id: 'r1' });
    sm = transition(sm, { type: 'DeleteRequested', id: 'r1', name: 'Flower week 3' });
    sm = transition(sm, { type: 'DeleteConfirmed' });
    expect(sm.status.kind).toBe('deleting');

    sm = transition(sm, { type: 'DeleteResolved' });

    // The recipe the detail was showing is gone, so the detail cannot stay.
    expect(sm.selectedId).toBeNull();
    expect(sm.status).toEqual({ kind: 'idle' });
    expect(sm.toast).toBe('Deleted "Flower week 3"');
  });

  it('cancelling deletes nothing', () => {
    let sm = transition(createInitialSM(), {
      type: 'DeleteRequested',
      id: 'r1',
      name: 'Flower week 3',
    });
    sm = transition(sm, { type: 'DeleteCancelled' });

    expect(sm.status).toEqual({ kind: 'idle' });
  });

  it('confirming outside a confirmation is ignored', () => {
    const sm = createInitialSM();

    expect(transition(sm, { type: 'DeleteConfirmed' })).toBe(sm);
  });

  it('a failed delete surfaces the reason and leaves the recipe selected', () => {
    let sm = transition(createInitialSM(), { type: 'RecipeSelected', id: 'r1' });
    sm = transition(sm, { type: 'DeleteRequested', id: 'r1', name: 'Flower week 3' });
    sm = transition(sm, { type: 'DeleteConfirmed' });
    sm = transition(sm, { type: 'DeleteFailed', message: 'not found' });

    expect(sm.selectedId).toBe('r1');
    expect(sm.status).toEqual({ kind: 'idle' });
    expect(sm.toast).toBe('not found');
  });
});

describe('recipe library SM — draft seeding', () => {
  it('seeds from the recipe and never from its values', () => {
    expect(draftFromRecipe(recipe({ name: 'Veg timer' }))).toEqual({
      id: 'r1',
      name: 'Veg timer',
      values: {},
    });
  });
});

describe('recipe library SM — reapplying a revision', () => {
  const offer = {
    recipeId: 'r1',
    revision: 2,
    zones: [
      {
        growspaceId: 'A',
        zoneId: 'default',
        label: 'A',
        revision: 1,
        drifted: false,
        autoAdvance: false,
        selected: true,
      },
      {
        growspaceId: 'B',
        zoneId: 'default',
        label: 'B',
        revision: 1,
        drifted: true,
        autoAdvance: false,
        selected: false,
      },
    ],
  };
  function offered(): RecipeLibrarySM {
    return transition(transition(editing(), { type: 'SaveRequested' }), {
      type: 'SaveResolved',
      offer,
    });
  }
  it('opens the offer only when an in-flight save resolves with affected zones', () => {
    expect(offered().status).toEqual({ kind: 'reapply', offer });
    const idle = createInitialSM();
    expect(transition(idle, { type: 'SaveResolved', offer })).toBe(idle);
  });
  it('keeps a shared zone id scoped to its growspace', () => {
    const sm = transition(offered(), {
      type: 'ReapplyToggled',
      growspaceId: 'B',
      zoneId: 'default',
    });
    expect(sm.status).toMatchObject({ offer: { zones: [{ selected: true }, { selected: true }] } });
  });
  it('refuses an empty selection and ignores selection while applying', () => {
    const sm = transition(offered(), {
      type: 'ReapplyToggled',
      growspaceId: 'A',
      zoneId: 'default',
    });
    expect(transition(sm, { type: 'ReapplyRequested' })).toBe(sm);
    const running = transition(offered(), { type: 'ReapplyRequested' });
    expect(transition(running, { type: 'ReapplyDismissed' })).toBe(running);
    expect(
      transition(running, { type: 'ReapplyToggled', growspaceId: 'A', zoneId: 'default' })
    ).toBe(running);
  });
  it('keeps only failed zones selected for retry and closes after success', () => {
    const running = transition(offered(), { type: 'ReapplyRequested' });
    const failure = { ...offer.zones[0], error: 'Unavailable' };
    expect(transition(running, { type: 'ReapplyResolved', failures: [failure] }).status).toEqual({
      kind: 'reapply',
      offer: { ...offer, zones: [failure] },
    });
    expect(transition(running, { type: 'ReapplyResolved', failures: [] }).status).toEqual({
      kind: 'idle',
    });
  });
});
