import { describe, it, expect } from 'vitest';
import { atom } from 'nanostores';
import { createRecipeLibraryViewModel } from './recipe-library.viewmodel';
import {
  createInitialSM,
  transition,
  type RecipeLibraryEvent,
  type RecipeLibrarySM,
} from '../../../dialogs/recipe-library-sm';
import type {
  CropSteeringRecipeValues,
  IrrigationRecipe,
  ScheduleRecipeValues,
} from '../../../services/types';

const CROP_STEERING: CropSteeringRecipeValues = {
  lights_on_time: '06:00:00',
  p0_duration_minutes: 60,
  p2_stop_before_lights_off_minutes: 120,
  target_vwc_percent: 55,
  maintenance_dryback_percent: 2,
  p1_shot_volume_percent: 4,
  p1_shot_interval_minutes: 15,
  p2_shot_volume_percent: 3,
  p2_shot_interval_minutes: 20,
  auto_light_tracking: false,
  dynamic_shot_enabled: true,
  dynamic_aggressiveness: 1,
  dynamic_recovery: 0.1,
  dynamic_shot_size_floor: 0.5,
  dynamic_interval_ceiling: 1.5,
  pore_ec_target_min: null,
  pore_ec_target_max: null,
  ec_modulation_enabled: false,
};

const SCHEDULE: ScheduleRecipeValues = {
  irrigation_times: [{ time: '08:00:00', duration: 30 }],
  drain_times: [],
  irrigation_duration: 30,
  drain_duration: null,
  daily_volume_cap_liters: 12.5,
  max_cycles_per_day: 6,
  skip_during_dark: true,
};

function steeringRecipe(over: Partial<IrrigationRecipe> = {}): IrrigationRecipe {
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
    cropSteering: CROP_STEERING,
    schedule: null,
    createdAt: '2026-08-04T09:00:00+00:00',
    ...over,
  };
}

function scheduleRecipe(over: Partial<IrrigationRecipe> = {}): IrrigationRecipe {
  return steeringRecipe({
    id: 'r2',
    name: 'Veg timer',
    kind: 'schedule',
    cropSteering: null,
    schedule: SCHEDULE,
    ...over,
  });
}

/** Build the VM over a library and a walked SM. */
function vmOf(recipes: IrrigationRecipe[], ...events: RecipeLibraryEvent[]) {
  const sm = events.reduce<RecipeLibrarySM>(
    (acc, event) => transition(acc, event),
    createInitialSM()
  );
  return createRecipeLibraryViewModel(atom(sm), atom(recipes)).get();
}

describe('recipe library VM — the list', () => {
  it('lists every recipe with its kind and provenance', () => {
    const vm = vmOf([steeringRecipe(), scheduleRecipe()]);

    expect(vm.rows.map((r) => r.name)).toEqual(['Flower week 3', 'Veg timer']);
    expect(vm.rows[0].kindLabel).toBe('Crop steering');
    expect(vm.rows[1].kindLabel).toBe('Schedule');
    expect(vm.rows[0].provenanceLabel).toBe('Flower · week 3');
    expect(vm.rows[0].plumbingLabel).toBe('5 L coco @ 11 ml/s');
  });

  it('lists both kinds — the library is not a growspace, so nothing is gated', () => {
    const vm = vmOf([steeringRecipe(), scheduleRecipe()]);

    expect(vm.rows).toHaveLength(2);
  });

  it('names no provenance stage when the recipe was authored with no live cohort', () => {
    const vm = vmOf([
      steeringRecipe({
        provenance: { ...steeringRecipe().provenance, stage: null, week: 0 },
      }),
    ]);

    expect(vm.rows[0].provenanceLabel).toBeNull();
  });

  it('an empty library renders no rows and nothing selected', () => {
    const vm = vmOf([]);

    expect(vm.rows).toEqual([]);
    expect(vm.selected).toBeNull();
  });

  it('marks the open recipe as selected', () => {
    const vm = vmOf([steeringRecipe(), scheduleRecipe()], {
      type: 'RecipeSelected',
      id: 'r2',
    });

    expect(vm.rows.map((r) => r.selected)).toEqual([false, true]);
    expect(vm.selected?.id).toBe('r2');
  });

  it('a selection whose recipe has left the library falls back to the list', () => {
    const vm = vmOf([steeringRecipe()], { type: 'RecipeSelected', id: 'gone' });

    expect(vm.selected).toBeNull();
  });
});

describe('recipe library VM — the fields', () => {
  it('shows the half the kind names, labelled and united', () => {
    const vm = vmOf([steeringRecipe()], { type: 'RecipeSelected', id: 'r1' });
    const shot = vm.fields.find((f) => f.field === 'p1_shot_volume_percent');

    expect(shot).toMatchObject({
      label: 'P1 shot size',
      type: 'number',
      value: 4,
      unit: '% of pot',
      changed: false,
    });
  });

  it('shows the schedule half for a schedule recipe', () => {
    const vm = vmOf([scheduleRecipe()], { type: 'RecipeSelected', id: 'r2' });

    expect(vm.fields.map((f) => f.field)).toContain('max_cycles_per_day');
    expect(vm.fields.map((f) => f.field)).not.toContain('p1_shot_volume_percent');
  });

  it('reads the half the kind declares, not whichever one is populated', () => {
    // A corrupt entry the library would refuse to store: kind says one half,
    // the other is present. Showing an empty form beats editing the wrong one.
    const vm = vmOf([steeringRecipe({ cropSteering: null, schedule: SCHEDULE })], {
      type: 'RecipeSelected',
      id: 'r1',
    });

    expect(vm.fields).toEqual([]);
  });

  it('a changed field shows the draft value and is marked as changed', () => {
    const vm = vmOf(
      [steeringRecipe()],
      { type: 'EditStarted', recipe: steeringRecipe() },
      { type: 'ValueChanged', field: 'p1_shot_volume_percent', value: 7.5 }
    );
    const shot = vm.fields.find((f) => f.field === 'p1_shot_volume_percent');

    expect(shot).toMatchObject({ value: 7.5, changed: true });
    // Its neighbour still reads what the recipe stores — the edit is sparse.
    expect(vm.fields.find((f) => f.field === 'p2_shot_volume_percent')).toMatchObject({
      value: 3,
      changed: false,
    });
  });
});

describe('recipe library VM — the form', () => {
  it('is not editing until an edit is started', () => {
    const vm = vmOf([steeringRecipe()], { type: 'RecipeSelected', id: 'r1' });

    expect(vm.editing).toBe(false);
    expect(vm.nameDraft).toBe('Flower week 3');
    expect(vm.canSave).toBe(false);
  });

  it('an untouched form has nothing to save', () => {
    const vm = vmOf([steeringRecipe()], { type: 'EditStarted', recipe: steeringRecipe() });

    expect(vm.editing).toBe(true);
    expect(vm.canSave).toBe(false);
  });

  it('a rename is savable', () => {
    const vm = vmOf(
      [steeringRecipe()],
      { type: 'EditStarted', recipe: steeringRecipe() },
      { type: 'NameChanged', name: 'Flower week 4' }
    );

    expect(vm.nameDraft).toBe('Flower week 4');
    expect(vm.canSave).toBe(true);
  });

  it('a value change alone is savable', () => {
    const vm = vmOf(
      [steeringRecipe()],
      { type: 'EditStarted', recipe: steeringRecipe() },
      { type: 'ValueChanged', field: 'target_vwc_percent', value: 61 }
    );

    expect(vm.canSave).toBe(true);
  });

  it('a blank name is not savable', () => {
    const vm = vmOf(
      [steeringRecipe()],
      { type: 'EditStarted', recipe: steeringRecipe() },
      { type: 'NameChanged', name: '  ' }
    );

    expect(vm.canSave).toBe(false);
  });

  it('is busy while a save is in flight', () => {
    const vm = vmOf(
      [steeringRecipe()],
      { type: 'EditStarted', recipe: steeringRecipe() },
      { type: 'NameChanged', name: 'Flower week 4' },
      { type: 'SaveRequested' }
    );

    expect(vm.busy).toBe(true);
  });

  it('surfaces a refusal verbatim, with the typing kept', () => {
    const vm = vmOf(
      [steeringRecipe()],
      { type: 'EditStarted', recipe: steeringRecipe() },
      { type: 'NameChanged', name: 'Flower week 4' },
      { type: 'SaveRequested' },
      { type: 'SaveFailed', message: 'media_type is not part of a crop_steering recipe.' }
    );

    expect(vm.errorMessage).toBe('media_type is not part of a crop_steering recipe.');
    expect(vm.editing).toBe(true);
    expect(vm.nameDraft).toBe('Flower week 4');
  });
});

describe('recipe library VM — deleting', () => {
  it('a pending delete names the recipe', () => {
    const vm = vmOf([steeringRecipe()], {
      type: 'DeleteRequested',
      id: 'r1',
      name: 'Flower week 3',
    });

    expect(vm.deleteConfirm).toEqual({
      id: 'r1',
      name: 'Flower week 3',
      referencingPrograms: [],
    });
  });

  it('names no referencing programs while no programs exist', () => {
    const vm = vmOf([steeringRecipe()], {
      type: 'DeleteRequested',
      id: 'r1',
      name: 'Flower week 3',
    });

    // The seam is here and empty; #107 supplies the source. An empty list is
    // not "referenced by nothing" — the UI simply omits the sentence.
    expect(vm.deleteConfirm?.referencingPrograms).toEqual([]);
  });

  it('is busy while the delete is in flight', () => {
    const vm = vmOf(
      [steeringRecipe()],
      { type: 'DeleteRequested', id: 'r1', name: 'Flower week 3' },
      { type: 'DeleteConfirmed' }
    );

    expect(vm.busy).toBe(true);
    expect(vm.deleteConfirm).toBeNull();
  });
});
