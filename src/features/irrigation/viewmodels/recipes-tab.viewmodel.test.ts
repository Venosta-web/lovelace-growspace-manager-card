import { describe, it, expect } from 'vitest';
import { atom } from 'nanostores';
import {
  authoringContext,
  createRecipesTabViewModel,
  sortByProvenance,
  type AuthoringContext,
} from './recipes-tab.viewmodel';
import { createInitialSM, transition, type DialogSM } from '../../../dialogs/irrigation-dialog-sm';
import { createGrowspaceDevice } from '../../../services/types';
import type {
  BiologicalMetrics,
  GrowspaceDevice,
  IrrigationRecipe,
  IrrigationStrategy,
} from '../../../services/types';

function recipe(over: Partial<IrrigationRecipe> = {}): IrrigationRecipe {
  return {
    id: 'r1',
    name: 'Recipe',
    kind: 'crop_steering',
    provenance: {
      mediaType: 'coco',
      litersPerPot: 5,
      pumpFlowRateMlPerSec: 11,
      stage: 'flower',
      week: 3,
    },
    createdAt: '2026-08-04T09:00:00+00:00',
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
    maintenanceDrybackPercent: 3,
    shotDurationSeconds: 12,
    shotIntervalMinutes: 20,
    ...over,
  };
}

function bio(over: Partial<BiologicalMetrics> = {}): BiologicalMetrics {
  return {
    vpdStatus: 'ok',
    vpdTargetMin: 0,
    vpdTargetMax: 0,
    vpdDangerMin: 0,
    vpdDangerMax: 0,
    granularStage: 'flower_mid',
    isDay: true,
    vegWeek: 0,
    flowerWeek: 3,
    ...over,
  };
}

function device(over: Partial<GrowspaceDevice> = {}): GrowspaceDevice {
  return createGrowspaceDevice({
    deviceId: 'gs1',
    name: 'Tent',
    biologicalMetrics: bio(),
    irrigationStrategy: strategy(),
    ...over,
  });
}

function vmFor(
  recipes: IrrigationRecipe[],
  dev: GrowspaceDevice = device(),
  sm: DialogSM = createInitialSM()
) {
  return createRecipesTabViewModel(
    atom<DialogSM>(sm),
    atom<IrrigationRecipe[]>(recipes),
    atom<GrowspaceDevice | undefined>(dev)
  ).get();
}

describe('recipes-tab.viewmodel – authoring context', () => {
  it.each([
    ['flower_early', 'flower', 3],
    ['flower_mid', 'flower', 3],
    ['flower_late', 'flower', 3],
  ])('collapses %s onto the flower stage and its week', (granularStage, stage, week) => {
    expect(authoringContext(device({ biologicalMetrics: bio({ granularStage }) }))).toEqual({
      stage,
      week,
    });
  });

  it('reads veg week for a veg growspace', () => {
    const dev = device({ biologicalMetrics: bio({ granularStage: 'veg', vegWeek: 2 }) });
    expect(authoringContext(dev)).toEqual({ stage: 'veg', week: 2 });
  });

  it.each(['seedling', 'clone', 'mother'])(
    'names %s but claims no week — vegWeek is not its age',
    (granularStage) => {
      const dev = device({ biologicalMetrics: bio({ granularStage, vegWeek: 9 }) });
      expect(authoringContext(dev)).toEqual({ stage: granularStage, week: null });
    }
  );

  it.each(['dry', 'cure', 'empty', 'unknown'])(
    'resolves %s to no stage — a recipe cannot be authored there',
    (granularStage) => {
      const dev = device({ biologicalMetrics: bio({ granularStage }) });
      expect(authoringContext(dev)).toEqual({ stage: null, week: null });
    }
  );
});

describe('recipes-tab.viewmodel – provenance ordering', () => {
  const flowerW3 = recipe({ id: 'exact', name: 'Zulu', provenance: { ...recipe().provenance } });
  const flowerW5 = recipe({
    id: 'near',
    name: 'Alpha',
    provenance: { ...recipe().provenance, week: 5 },
  });
  const vegW1 = recipe({
    id: 'other-stage',
    name: 'Bravo',
    provenance: { ...recipe().provenance, stage: 'veg', week: 1 },
  });
  const context: AuthoringContext = { stage: 'flower', week: 3 };

  it('puts an exact stage+week match first, even against an earlier name', () => {
    expect(sortByProvenance([flowerW5, vegW1, flowerW3], context).map((r) => r.id)).toEqual([
      'exact',
      'near',
      'other-stage',
    ]);
  });

  it('orders same-stage recipes by how many weeks separate them', () => {
    const w8 = recipe({ id: 'far', name: 'Aaa', provenance: { ...recipe().provenance, week: 8 } });
    expect(sortByProvenance([w8, flowerW5], context).map((r) => r.id)).toEqual(['near', 'far']);
  });

  it('never removes a recipe — a mismatched stage still appears', () => {
    expect(sortByProvenance([vegW1], context)).toHaveLength(1);
  });

  it('falls back to name order when the growspace has no stage to match', () => {
    expect(
      sortByProvenance([flowerW3, flowerW5, vegW1], { stage: null, week: null }).map((r) => r.name)
    ).toEqual(['Alpha', 'Bravo', 'Zulu']);
  });
});

describe('recipes-tab.viewmodel – kind gating', () => {
  it('offers only crop-steering recipes while crop steering is running', () => {
    const vm = vmFor([recipe({ id: 'cs' }), recipe({ id: 'sched', kind: 'schedule' })]);
    expect(vm.runningKind).toBe('crop_steering');
    expect(vm.options.map((o) => o.id)).toEqual(['cs']);
    expect(vm.hiddenByKindCount).toBe(1);
  });

  it('offers only schedule recipes when the strategy is disabled', () => {
    const dev = device({ irrigationStrategy: strategy({ enabled: false }) });
    const vm = vmFor([recipe({ id: 'cs' }), recipe({ id: 'sched', kind: 'schedule' })], dev);
    expect(vm.runningKind).toBe('schedule');
    expect(vm.options.map((o) => o.id)).toEqual(['sched']);
    expect(vm.hiddenByKindCount).toBe(1);
  });
});

describe('recipes-tab.viewmodel – selection', () => {
  it('pre-selects the best provenance match before the grower picks anything', () => {
    const vm = vmFor([
      recipe({ id: 'far', name: 'Aaa', provenance: { ...recipe().provenance, week: 9 } }),
      recipe({ id: 'exact', name: 'Zzz' }),
    ]);
    expect(vm.selectedRecipeId).toBe('exact');
    expect(vm.selected?.matchesCurrentStage).toBe(true);
  });

  it('an explicit pick wins over the pre-selection', () => {
    const sm = transition(createInitialSM(), { type: 'SELECT_RECIPE', recipeId: 'far' });
    const vm = vmFor(
      [
        recipe({ id: 'far', name: 'Aaa', provenance: { ...recipe().provenance, week: 9 } }),
        recipe({ id: 'exact', name: 'Zzz' }),
      ],
      device(),
      sm
    );
    expect(vm.selectedRecipeId).toBe('far');
  });

  it('falls back to the pre-selection when the picked recipe is no longer offered', () => {
    const sm = transition(createInitialSM(), { type: 'SELECT_RECIPE', recipeId: 'gone' });
    const vm = vmFor([recipe({ id: 'exact' })], device(), sm);
    expect(vm.selectedRecipeId).toBe('exact');
  });

  it('selects nothing when the library offers no applicable recipe', () => {
    const vm = vmFor([recipe({ kind: 'schedule' })]);
    expect(vm.options).toEqual([]);
    expect(vm.selectedRecipeId).toBeNull();
    expect(vm.selected).toBeNull();
  });
});

describe('recipes-tab.viewmodel – applied stamp', () => {
  it('reports no stamp when no recipe was ever applied', () => {
    expect(vmFor([recipe()]).applied).toBeNull();
  });

  it('names the applied recipe, when it was applied, and that it still matches', () => {
    const dev = device({
      irrigationStrategy: strategy({
        appliedRecipeId: 'r1',
        recipeAppliedAt: '2026-08-10T07:15:00+00:00',
      }),
      appliedRecipeDrifted: false,
    });
    const applied = vmFor([recipe({ id: 'r1', name: 'Flower week 3' })], dev).applied;
    expect(applied?.name).toBe('Flower week 3');
    expect(applied?.drift).toBe('in-sync');
    expect(applied?.appliedAtLabel).not.toBeNull();
  });

  it('reports drift when the growspace no longer matches the recipe', () => {
    const dev = device({
      irrigationStrategy: strategy({ appliedRecipeId: 'r1' }),
      appliedRecipeDrifted: true,
    });
    expect(vmFor([recipe()], dev).applied?.drift).toBe('drifted');
  });

  it('keeps the stamp but drops the name when the recipe left the library', () => {
    const dev = device({
      irrigationStrategy: strategy({ appliedRecipeId: 'deleted' }),
      appliedRecipeDrifted: null,
    });
    const applied = vmFor([recipe()], dev).applied;
    expect(applied?.id).toBe('deleted');
    expect(applied?.name).toBeNull();
    expect(applied?.drift).toBe('unknown');
  });
});

describe('recipes-tab.viewmodel – media mismatch and save form', () => {
  it('names both media when the selected recipe was authored in another one', () => {
    const dev = device({
      irrigationStrategy: strategy({
        substrateProfile: { mediaType: 'rockwool', litersPerPot: 7.5 },
      }),
    });
    expect(
      vmFor([recipe({ provenance: { ...recipe().provenance, mediaType: 'coco' } })], dev)
        .mediaMismatch
    ).toEqual({ authored: 'coco', target: 'rockwool' });
  });

  it('reports no mismatch when the media agree', () => {
    const dev = device({
      irrigationStrategy: strategy({ substrateProfile: { mediaType: 'coco', litersPerPot: 5 } }),
    });
    expect(vmFor([recipe()], dev).mediaMismatch).toBeNull();
  });

  it('refuses to save an unnamed recipe and allows a named one', () => {
    expect(vmFor([]).canSave).toBe(false);
    const named = transition(createInitialSM(), { type: 'UPDATE_RECIPE_NAME', name: '  Veg  ' });
    expect(vmFor([], device(), named).canSave).toBe(true);
  });

  it('carries the backend apply notice through verbatim', () => {
    const sm = transition(createInitialSM(), {
      type: 'SET_RECIPE_APPLY_WARNING',
      warning: 'authored in coco and applied to a rockwool growspace',
    });
    expect(vmFor([], device(), sm).applyWarning).toBe(
      'authored in coco and applied to a rockwool growspace'
    );
  });
});
