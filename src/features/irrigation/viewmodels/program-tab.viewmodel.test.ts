/**
 * Program Tab ViewModel — unit tests.
 *
 * Two properties carry most of these. First, the progression is **read**: every
 * state and every hold cause the backend can send arrives with its own heading
 * and the backend's own sentence, and the VM invents none of it. Second, "what
 * next week holds" is a question about the plan rather than about the payload,
 * and it has to survive a stage handover.
 */

import { describe, expect, it } from 'vitest';
import { atom } from 'nanostores';
import {
  createProgramTabViewModel,
  driftedFieldLabels,
  nextInstruction,
} from './program-tab.viewmodel';
import {
  createInitialSM,
  transition,
  type DialogEvent,
  type DialogSM,
} from '../../../dialogs/irrigation-dialog-sm';
import { createGrowspaceDevice } from '../../../services/types';
import type {
  CropSteeringRecipeValues,
  GrowspaceDevice,
  IrrigationProgram,
  IrrigationProgramState,
  IrrigationRecipe,
  IrrigationStrategy,
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
  auto_light_tracking: true,
  dynamic_shot_enabled: true,
  dynamic_aggressiveness: 1,
  dynamic_recovery: 0.1,
  dynamic_shot_size_floor: 0.5,
  dynamic_interval_ceiling: 1.5,
  pore_ec_target_min: 2,
  pore_ec_target_max: 3,
  ec_modulation_enabled: true,
};

function recipe(over: Partial<IrrigationRecipe> = {}): IrrigationRecipe {
  return {
    id: 'r-flower',
    name: 'Flower generative',
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

function programState(over: Partial<IrrigationProgramState> = {}): IrrigationProgramState {
  return {
    programId: 'p1',
    name: 'Full run',
    stage: 'flower',
    week: 3,
    slot: { stage: 'flower', week: 3, recipeId: 'r-flower' },
    recipe: recipe(),
    autoAdvance: false,
    progression: {
      state: 'up_to_date',
      hold: null,
      detail: "Irrigation recipe 'Flower generative' is the one this growspace is running.",
    },
    ...over,
  };
}

function strategy(over: Partial<IrrigationStrategy> = {}): IrrigationStrategy {
  return {
    enabled: true,
    lightsOnTime: '06:00:00',
    p0DurationMinutes: 60,
    p2StopBeforeLightsOffMinutes: 120,
    targetVwcPercent: 55,
    maintenanceDrybackPercent: 2,
    shotDurationSeconds: 30,
    shotIntervalMinutes: 15,
    p1ShotIntervalMinutes: 15,
    p2ShotIntervalMinutes: 20,
    autoLightTracking: true,
    dynamicShotEnabled: true,
    dynamicAggressiveness: 1,
    dynamicRecovery: 0.1,
    dynamicShotSizeFloor: 0.5,
    dynamicIntervalCeiling: 1.5,
    poreEcTargetMin: 2,
    poreEcTargetMax: 3,
    ecModulationEnabled: true,
    irrigationProgramId: 'p1',
    ...over,
  };
}

function device(over: Partial<GrowspaceDevice> = {}): GrowspaceDevice {
  return createGrowspaceDevice({
    deviceId: 'gs1',
    name: 'Tent 1',
    irrigationStrategy: strategy(),
    irrigationProgram: programState(),
    ...over,
  });
}

function vmOf(
  dev: GrowspaceDevice | undefined,
  programs: IrrigationProgram[] = [PROGRAM],
  recipes: IrrigationRecipe[] = [recipe(), recipe({ id: 'r-veg', name: 'Veg feed' })],
  ...events: DialogEvent[]
) {
  const sm = events.reduce<DialogSM>((acc, event) => transition(acc, event), createInitialSM());
  return createProgramTabViewModel(atom(sm), atom(programs), atom(recipes), atom(dev)).get();
}

describe('program tab VM — nothing assigned', () => {
  it('reports no binding and no position', () => {
    const vm = vmOf(
      device({
        irrigationStrategy: strategy({ irrigationProgramId: null }),
        irrigationProgram: null,
      })
    );

    expect(vm.assignedProgramId).toBeNull();
    expect(vm.position).toBeNull();
    expect(vm.progression).toBeNull();
  });

  it('still lists every program so one can be picked', () => {
    const vm = vmOf(
      device({
        irrigationStrategy: strategy({ irrigationProgramId: null }),
        irrigationProgram: null,
      })
    );

    expect(vm.options).toEqual([{ id: 'p1', name: 'Full run', spanLabel: 'Veg 1 · Flower 1–3' }]);
  });
});

describe('program tab VM — the current position', () => {
  it('names the stage, the week and the recipe that week calls for', () => {
    const vm = vmOf(device());

    expect(vm.position).toEqual({
      stageLabel: 'Flower',
      week: 3,
      recipeName: 'Flower generative',
      missing: false,
    });
  });

  it('a week with no slot has a position and no recipe', () => {
    const vm = vmOf(
      device({
        irrigationProgram: programState({
          week: 2,
          slot: null,
          recipe: null,
          progression: { state: 'held', hold: 'no_slot', detail: 'defines no slot' },
        }),
      })
    );

    expect(vm.position).toMatchObject({ week: 2, recipeName: null, missing: false });
  });

  it('a slot naming a deleted recipe is not the same as a gap', () => {
    const vm = vmOf(
      device({
        irrigationProgram: programState({
          recipe: null,
          progression: { state: 'held', hold: 'recipe_missing', detail: 'no longer exists' },
        }),
      })
    );

    expect(vm.position?.missing).toBe(true);
  });

  it('a growspace with no live plants has no week of the plan', () => {
    const vm = vmOf(
      device({
        irrigationProgram: programState({
          stage: null,
          week: 0,
          slot: null,
          recipe: null,
          progression: { state: 'held', hold: 'no_position', detail: 'no live plants' },
        }),
      })
    );

    expect(vm.position?.stageLabel).toBeNull();
  });
});

describe('program tab VM — what the plan holds next', () => {
  it('answers with the following week when the plan defines one', () => {
    const vm = vmOf(
      device({ irrigationProgram: programState({ week: 2, slot: null, recipe: null }) })
    );

    expect(vm.next).toEqual({
      stageLabel: 'Flower',
      week: 3,
      recipeName: 'Flower generative',
      isNextWeek: true,
    });
  });

  it('crosses the stage handover rather than reporting nothing', () => {
    const vm = vmOf(
      device({
        irrigationProgram: programState({ stage: 'veg', week: 1, slot: null, recipe: null }),
      })
    );

    // Veg week 2 does not exist; flower week 1 is what actually comes next.
    expect(vm.next).toMatchObject({ stageLabel: 'Flower', week: 1, isNextWeek: false });
  });

  it('says the plan is finished when nothing follows', () => {
    const vm = vmOf(device({ irrigationProgram: programState({ stage: 'flower', week: 9 }) }));

    expect(vm.next).toBeNull();
  });

  it('skips over the gaps rather than stopping at them', () => {
    expect(
      nextInstruction(
        [
          { stage: 'flower', week: 1, recipeId: 'a' },
          { stage: 'flower', week: 6, recipeId: 'b' },
        ],
        'flower',
        2
      )
    ).toEqual({ stage: 'flower', week: 6, recipeId: 'b' });
  });
});

describe('program tab VM — the progression, read not derived', () => {
  const CASES: [string, string, string][] = [
    ['up_to_date', '', 'Following the program'],
    ['available', '', "This week's recipe is ready"],
    ['due', '', 'Applying this week’s recipe'],
    ['held', 'no_position', 'Holding — no live plants'],
    ['held', 'no_slot', 'Holding — this week has no recipe'],
    ['held', 'program_complete', 'Program complete'],
    ['held', 'recipe_missing', 'Holding — the recipe was deleted'],
    ['held', 'drifted', 'Holding — settings were changed'],
    ['held', 'not_applicable', 'Holding — this recipe cannot be applied here'],
  ];

  it.each(CASES)('names %s/%s distinctly', (state, hold, title) => {
    const vm = vmOf(
      device({
        irrigationProgram: programState({
          progression: {
            state: state as never,
            hold: (hold === '' ? null : hold) as never,
            detail: 'the backend sentence',
          },
        }),
      })
    );

    expect(vm.progression?.title).toBe(title);
    expect(vm.progression?.detail).toBe('the backend sentence');
  });

  it('every heading is distinct, which is why the causes are named at all', () => {
    const titles = CASES.map(([, , title]) => title);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it('falls back to the backend sentence for an answer it does not recognise', () => {
    const vm = vmOf(
      device({
        irrigationProgram: programState({
          progression: { state: null, hold: null, detail: 'something new happened' },
        }),
      })
    );

    expect(vm.progression?.title).toBe('Irrigation program');
    expect(vm.progression?.detail).toBe('something new happened');
  });
});

describe('program tab VM — the available prompt', () => {
  it('offers this week’s recipe while auto-advance is off', () => {
    const vm = vmOf(
      device({
        irrigationProgram: programState({
          progression: { state: 'available', hold: null, detail: 'calls for' },
        }),
      })
    );

    expect(vm.available).toEqual({
      recipeId: 'r-flower',
      name: 'Flower generative',
      stageLabel: 'Flower',
      week: 3,
    });
  });

  it('offers nothing while the growspace already holds the slot’s recipe', () => {
    expect(vmOf(device()).available).toBeNull();
  });

  it('offers nothing while the program is holding', () => {
    const vm = vmOf(
      device({
        irrigationProgram: programState({
          slot: null,
          recipe: null,
          progression: { state: 'held', hold: 'no_slot', detail: 'no slot' },
        }),
      })
    );

    expect(vm.available).toBeNull();
  });
});

describe('program tab VM — drift', () => {
  it('names the fields that differ from the applied recipe', () => {
    const vm = vmOf(
      device({
        irrigationStrategy: strategy({ appliedRecipeId: 'r-flower', targetVwcPercent: 70 }),
        irrigationProgram: programState({
          autoAdvance: true,
          progression: { state: 'held', hold: 'drifted', detail: 'no longer match' },
        }),
      })
    );

    expect(vm.drift).toEqual({ fields: ['Target VWC'], appliedRecipeName: 'Flower generative' });
  });

  it('names nothing rather than guessing when it can see no difference', () => {
    const vm = vmOf(
      device({
        irrigationStrategy: strategy({ appliedRecipeId: 'r-flower' }),
        irrigationProgram: programState({
          autoAdvance: true,
          progression: { state: 'held', hold: 'drifted', detail: 'no longer match' },
        }),
      })
    );

    // The backend's verdict came from a field whose unit depends on the
    // growspace. The card says so by saying nothing, never by disagreeing.
    expect(vm.drift?.fields).toEqual([]);
  });

  it('is absent for every hold that is not drift', () => {
    const vm = vmOf(
      device({
        irrigationProgram: programState({
          progression: { state: 'held', hold: 'no_slot', detail: 'no slot' },
        }),
      })
    );

    expect(vm.drift).toBeNull();
  });

  it('never compares the shot sizes — a percent and pump seconds are not the same number', () => {
    const labels = driftedFieldLabels(
      recipe(),
      strategy({ p1ShotVolumePercent: 99, p2ShotVolumePercent: 99 }),
      undefined
    );

    expect(labels).toEqual([]);
  });

  it('compares a schedule recipe against the config instead', () => {
    const labels = driftedFieldLabels(
      recipe({
        kind: 'schedule',
        cropSteering: null,
        schedule: {
          irrigation_times: [],
          drain_times: [],
          irrigation_duration: 30,
          drain_duration: 20,
          daily_volume_cap_liters: null,
          max_cycles_per_day: null,
          skip_during_dark: true,
        },
      }),
      undefined,
      { irrigationTimes: [], drainTimes: [], irrigationDuration: 45, skipDuringDark: true }
    );

    expect(labels).toEqual(['Irrigation duration']);
  });

  it('treats a value the backend did not send as unchanged', () => {
    // An older backend that omits a field has not had it edited by anybody.
    const partial = strategy();
    delete (partial as Partial<IrrigationStrategy>).targetVwcPercent;

    expect(driftedFieldLabels(recipe(), partial, undefined)).toEqual([]);
  });
});

describe('program tab VM — assigning', () => {
  it('opens on what the growspace is bound to', () => {
    const vm = vmOf(device());

    expect(vm.selectedProgramId).toBe('p1');
    expect(vm.canAssign).toBe(false);
  });

  it('a pick that differs from the binding is assignable', () => {
    const vm = vmOf(device(), [PROGRAM, { ...PROGRAM, id: 'p2', name: 'Short run' }], undefined, {
      type: 'SELECT_PROGRAM',
      programId: 'p2',
    });

    expect(vm.selectedProgramId).toBe('p2');
    expect(vm.canAssign).toBe(true);
  });

  it('picking "no program" on a bound growspace is an unbind', () => {
    const vm = vmOf(device(), [PROGRAM], undefined, {
      type: 'SELECT_PROGRAM',
      programId: null,
    });

    expect(vm.selectedProgramId).toBeNull();
    expect(vm.canAssign).toBe(true);
  });

  it('a pick whose program has left the library falls back to the binding', () => {
    const vm = vmOf(device(), [PROGRAM], undefined, {
      type: 'SELECT_PROGRAM',
      programId: 'gone',
    });

    expect(vm.selectedProgramId).toBe('p1');
  });
});

describe('program tab VM — the auto-advance confirmation', () => {
  it('says which recipe turning it on will apply, before anything is written', () => {
    const vm = vmOf(device(), [PROGRAM], undefined, {
      type: 'SET_PROGRAM_CONFIRM',
      confirm: { kind: 'enable-auto-advance' },
    });

    expect(vm.confirm?.title).toBe('Turn on auto-advance?');
    expect(vm.confirm?.message).toContain('Flower generative');
    expect(vm.confirm?.message).toContain('flower week 3');
  });

  it('names the holds that still apply, so the promise is not overstated', () => {
    const vm = vmOf(device(), [PROGRAM], undefined, {
      type: 'SET_PROGRAM_CONFIRM',
      confirm: { kind: 'enable-auto-advance' },
    });

    expect(vm.confirm?.message).toContain('a week with no recipe');
    expect(vm.confirm?.message).toContain('settings you have changed');
  });

  it('stays general when the week calls for nothing', () => {
    const vm = vmOf(
      device({ irrigationProgram: programState({ slot: null, recipe: null }) }),
      [PROGRAM],
      undefined,
      { type: 'SET_PROGRAM_CONFIRM', confirm: { kind: 'enable-auto-advance' } }
    );

    expect(vm.confirm?.message).toContain('the recipe this week calls for');
  });

  it('is absent until it is raised', () => {
    expect(vmOf(device()).confirm).toBeNull();
  });
});
