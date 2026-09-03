import { describe, it, expect, vi, afterEach } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import type { CropSteeringRecipeValues, IrrigationRecipe } from '../../../services/types';

// The two mutations the editor can cause. The atoms stay real: the library is
// what the editor reads, and the reply-driven upsert is the slice's own tested
// behaviour, not this container's.
vi.mock('../../../slices/irrigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../slices/irrigation')>()),
  updateIrrigationRecipe: vi.fn().mockResolvedValue(undefined),
  removeIrrigationRecipe: vi.fn().mockResolvedValue(undefined),
}));
import {
  irrigationRecipes$,
  removeIrrigationRecipe as sliceRemove,
  setIrrigationRecipes,
  updateIrrigationRecipe as sliceUpdate,
} from '../../../slices/irrigation';

import type { RecipeLibraryDialog } from './recipe-library-dialog.container';
import './recipe-library-dialog.container';

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
    cropSteering: CROP_STEERING,
    schedule: null,
    createdAt: '2026-08-04T09:00:00+00:00',
    ...over,
  };
}

afterEach(() => {
  document.body.innerHTML = '';
  setIrrigationRecipes([]);
  vi.mocked(sliceUpdate)
    .mockClear()
    .mockResolvedValue(undefined as never);
  vi.mocked(sliceRemove).mockClear().mockResolvedValue(undefined);
});

async function mount(recipes: IrrigationRecipe[]): Promise<RecipeLibraryDialog> {
  setIrrigationRecipes(recipes);
  const el = await fixture<RecipeLibraryDialog>(
    html`<recipe-library-dialog .open=${true}></recipe-library-dialog>`
  );
  await el.updateComplete;
  return el;
}

/**
 * Fire a Library Intent from the editor element the container listens on, and
 * let the effect the resulting status starts settle.
 */
async function intent(el: RecipeLibraryDialog, type: string, detail?: unknown): Promise<void> {
  const editor = el.shadowRoot!.querySelector('irrigation-recipe-library')!;
  editor.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  await el.updateComplete;
  await new Promise((resolve) => setTimeout(resolve, 0));
  await el.updateComplete;
}

describe('recipe-library-dialog — reading the library', () => {
  it('renders from irrigationRecipes$ without fetching — the payload already carries it', async () => {
    const el = await mount([recipe()]);

    const editor = el.shadowRoot!.querySelector('irrigation-recipe-library')!;
    expect((editor as unknown as { vm: { rows: unknown[] } }).vm.rows).toHaveLength(1);
  });

  it('renders nothing when closed', async () => {
    setIrrigationRecipes([recipe()]);
    const el = await fixture<RecipeLibraryDialog>(
      html`<recipe-library-dialog .open=${false}></recipe-library-dialog>`
    );

    expect(el.shadowRoot!.querySelector('irrigation-recipe-library')).toBeNull();
  });
});

describe('recipe-library-dialog — saving an edit', () => {
  it('sends a rename with no values', async () => {
    const el = await mount([recipe()]);

    await intent(el, 'recipe-edit-started', { recipeId: 'r1' });
    await intent(el, 'recipe-name-changed', { name: 'Flower week 4' });
    await intent(el, 'recipe-save-requested');

    expect(sliceUpdate).toHaveBeenCalledWith({ recipeId: 'r1', name: 'Flower week 4' });
  });

  it('sends changed values under the half the kind names, with no name', async () => {
    const el = await mount([recipe()]);

    await intent(el, 'recipe-edit-started', { recipeId: 'r1' });
    await intent(el, 'recipe-value-changed', {
      field: 'p1_shot_volume_percent',
      value: 7.5,
    });
    await intent(el, 'recipe-save-requested');

    expect(sliceUpdate).toHaveBeenCalledWith({
      recipeId: 'r1',
      cropSteering: { p1_shot_volume_percent: 7.5 },
    });
  });

  it('sends a schedule recipe under the schedule half', async () => {
    const el = await mount([
      recipe({
        kind: 'schedule',
        cropSteering: null,
        schedule: {
          irrigation_times: [],
          drain_times: [],
          irrigation_duration: null,
          drain_duration: null,
          daily_volume_cap_liters: null,
          max_cycles_per_day: 6,
          skip_during_dark: true,
        },
      }),
    ]);

    await intent(el, 'recipe-edit-started', { recipeId: 'r1' });
    await intent(el, 'recipe-value-changed', { field: 'max_cycles_per_day', value: 4 });
    await intent(el, 'recipe-save-requested');

    expect(sliceUpdate).toHaveBeenCalledWith({
      recipeId: 'r1',
      schedule: { max_cycles_per_day: 4 },
    });
  });

  it('surfaces a refusal in the form rather than losing the typing', async () => {
    vi.mocked(sliceUpdate).mockRejectedValueOnce(
      new Error('media_type is not part of a crop_steering recipe.')
    );
    const el = await mount([recipe()]);

    await intent(el, 'recipe-edit-started', { recipeId: 'r1' });
    await intent(el, 'recipe-name-changed', { name: 'Flower week 4' });
    await intent(el, 'recipe-save-requested');

    const vm = (
      el.shadowRoot!.querySelector('irrigation-recipe-library') as unknown as {
        vm: { errorMessage: string | null; nameDraft: string };
      }
    ).vm;
    expect(vm.errorMessage).toBe('media_type is not part of a crop_steering recipe.');
    expect(vm.nameDraft).toBe('Flower week 4');
  });
});

describe('recipe-library-dialog — deleting', () => {
  it('asks before deleting', async () => {
    const el = await mount([recipe()]);

    await intent(el, 'recipe-delete-requested', { recipeId: 'r1', name: 'Flower week 3' });

    expect(sliceRemove).not.toHaveBeenCalled();
    const vm = (
      el.shadowRoot!.querySelector('irrigation-recipe-library') as unknown as {
        vm: { deleteConfirm: unknown };
      }
    ).vm;
    expect(vm.deleteConfirm).toMatchObject({ id: 'r1', name: 'Flower week 3' });
  });

  it('deletes once confirmed', async () => {
    const el = await mount([recipe()]);

    await intent(el, 'recipe-delete-requested', { recipeId: 'r1', name: 'Flower week 3' });
    await intent(el, 'recipe-delete-confirmed');

    expect(sliceRemove).toHaveBeenCalledWith('r1');
  });

  it('deletes nothing when cancelled', async () => {
    const el = await mount([recipe()]);

    await intent(el, 'recipe-delete-requested', { recipeId: 'r1', name: 'Flower week 3' });
    await intent(el, 'recipe-delete-cancelled');

    expect(sliceRemove).not.toHaveBeenCalled();
  });

  it('reports a failed delete without losing the recipe', async () => {
    vi.mocked(sliceRemove).mockRejectedValueOnce(new Error('not found'));
    const el = await mount([recipe()]);

    await intent(el, 'recipe-delete-requested', { recipeId: 'r1', name: 'Flower week 3' });
    await intent(el, 'recipe-delete-confirmed');

    const vm = (
      el.shadowRoot!.querySelector('irrigation-recipe-library') as unknown as {
        vm: { toast: string | undefined; rows: unknown[] };
      }
    ).vm;
    expect(vm.toast).toBe('not found');
    expect(vm.rows).toHaveLength(1);
    expect(irrigationRecipes$.get()).toHaveLength(1);
  });
});
