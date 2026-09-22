import { fixture, html } from '@open-wc/testing-helpers';
import { describe, expect, it } from 'vitest';
import { IrrigationRecipeLibrary } from '../../src/features/irrigation/components/irrigation-recipe-library';
import type {
  RecipeFieldVM,
  RecipeLibraryViewModel,
  RecipeRowVM,
} from '../../src/features/irrigation/viewmodels/recipe-library.viewmodel';
import type { IrrigationRecipe } from '../../src/services/types';

if (!customElements.get('irrigation-recipe-library')) {
  customElements.define('irrigation-recipe-library', IrrigationRecipeLibrary);
}

function row(over: Partial<RecipeRowVM> = {}): RecipeRowVM {
  return {
    id: 'r1',
    name: 'Flower week 3',
    kind: 'crop_steering',
    kindLabel: 'Crop steering',
    provenanceLabel: 'Flower · week 3',
    plumbingLabel: '5 L coco @ 11 ml/s',
    createdAtLabel: '4 Aug 2026, 09:00',
    selected: false,
    ...over,
  };
}

function field(over: Partial<RecipeFieldVM> = {}): RecipeFieldVM {
  return {
    field: 'p1_shot_volume_percent',
    label: 'P1 shot size',
    type: 'number',
    value: 4,
    changed: false,
    unit: '% of pot',
    ...over,
  };
}

const RECIPE = {
  id: 'r1',
  name: 'Flower week 3',
  kind: 'crop_steering',
} as unknown as IrrigationRecipe;

function makeVm(over: Partial<RecipeLibraryViewModel> = {}): RecipeLibraryViewModel {
  return {
    rows: [row()],
    selected: null,
    fields: [],
    editing: false,
    nameDraft: 'Flower week 3',
    canSave: false,
    errorMessage: null,
    deleteConfirm: null,
    busy: false,
    toast: undefined,
    ...over,
  };
}

async function mount(vm: RecipeLibraryViewModel): Promise<IrrigationRecipeLibrary> {
  return fixture<IrrigationRecipeLibrary>(
    html`<irrigation-recipe-library .vm=${vm}></irrigation-recipe-library>`
  );
}

function root(el: IrrigationRecipeLibrary): ShadowRoot {
  return el.shadowRoot!;
}

/** Capture one Library Intent, or null when it never fires. */
function intent(el: HTMLElement, type: string): { detail: unknown | null } {
  const captured: { detail: unknown | null } = { detail: null };
  el.addEventListener(type, (e) => {
    captured.detail = (e as CustomEvent).detail ?? {};
  });
  return captured;
}

describe('irrigation-recipe-library — the list', () => {
  it('lists every recipe with its kind and provenance', async () => {
    const el = await mount(makeVm({ rows: [row(), row({ id: 'r2', name: 'Veg timer' })] }));

    const items = root(el).querySelectorAll('.list-item');
    expect(items).toHaveLength(2);
    expect(items[0].textContent).toContain('Flower week 3');
    expect(items[0].textContent).toContain('Crop steering');
    expect(items[0].textContent).toContain('Flower · week 3');
    expect(items[0].textContent).toContain('5 L coco @ 11 ml/s');
  });

  it('an empty library explains where recipes come from', async () => {
    const el = await mount(makeVm({ rows: [] }));

    expect(root(el).querySelector('[data-empty]')?.textContent).toContain(
      'No recipes saved yet'
    );
  });

  it('clicking a row asks to open it', async () => {
    const el = await mount(makeVm());
    const captured = intent(el, 'recipe-selected');

    root(el).querySelector<HTMLButtonElement>('[data-recipe-id="r1"]')!.click();

    expect(captured.detail).toEqual({ recipeId: 'r1' });
  });
});

describe('irrigation-recipe-library — the detail', () => {
  const detailVm = (over: Partial<RecipeLibraryViewModel> = {}) =>
    makeVm({ selected: RECIPE, fields: [field()], ...over });

  it('shows the recipe name and its provenance line', async () => {
    const el = await mount(detailVm());

    expect(root(el).querySelector('[data-recipe-name]')?.textContent).toContain(
      'Flower week 3'
    );
    const provenance = root(el).querySelector('[data-provenance]')?.textContent ?? '';
    expect(provenance).toContain('Crop steering');
    expect(provenance).toContain('Flower · week 3');
  });

  it('shows stored values read-only until an edit is started', async () => {
    const el = await mount(detailVm());

    expect(root(el).querySelector('input')).toBeNull();
    expect(root(el).querySelector('[data-field] .field-static')?.textContent).toContain('4');
  });

  it('offers rename-and-edit and delete', async () => {
    const el = await mount(detailVm());

    expect(root(el).querySelector('.btn-edit-recipe')).not.toBeNull();
    expect(root(el).querySelector('.btn-delete-recipe')).not.toBeNull();
  });

  it('asks to go back to the library', async () => {
    const el = await mount(detailVm());
    const captured = intent(el, 'recipe-back-to-list');

    root(el).querySelector<HTMLButtonElement>('.btn-back')!.click();

    expect(captured.detail).toEqual({});
  });

  it('asks to delete, naming the recipe', async () => {
    const el = await mount(detailVm());
    const captured = intent(el, 'recipe-delete-requested');

    root(el).querySelector<HTMLButtonElement>('.btn-delete-recipe')!.click();

    expect(captured.detail).toEqual({ recipeId: 'r1', name: 'Flower week 3' });
  });
});

describe('irrigation-recipe-library — the edit form', () => {
  const editVm = (over: Partial<RecipeLibraryViewModel> = {}) =>
    makeVm({ selected: RECIPE, fields: [field()], editing: true, canSave: true, ...over });

  it('renders the name and the values as inputs', async () => {
    const el = await mount(editVm());

    const name = root(el).querySelector<HTMLInputElement>('.recipe-name-input')!;
    expect(name.value).toBe('Flower week 3');
    expect(root(el).querySelector<HTMLInputElement>('[data-field] input')!.value).toBe('4');
  });

  it('reports a changed value as a number', async () => {
    const el = await mount(editVm());
    const captured = intent(el, 'recipe-value-changed');

    const input = root(el).querySelector<HTMLInputElement>('[data-field] input')!;
    input.value = '7.5';
    input.dispatchEvent(new Event('input'));

    expect(captured.detail).toEqual({ field: 'p1_shot_volume_percent', value: 7.5 });
  });

  it('reports an emptied nullable field as null, never as zero', async () => {
    const el = await mount(
      editVm({ fields: [field({ field: 'pore_ec_target_min', value: 1.2 })] })
    );
    const captured = intent(el, 'recipe-value-changed');

    const input = root(el).querySelector<HTMLInputElement>('[data-field] input')!;
    input.value = '';
    input.dispatchEvent(new Event('input'));

    expect(captured.detail).toEqual({ field: 'pore_ec_target_min', value: null });
  });

  it('marks a changed field', async () => {
    const el = await mount(editVm({ fields: [field({ changed: true })] }));

    expect(root(el).querySelector('.field-label')?.classList.contains('changed')).toBe(true);
  });

  it('does not offer a save with nothing to save', async () => {
    const el = await mount(editVm({ canSave: false }));

    expect(root(el).querySelector<HTMLButtonElement>('.btn-save-recipe')!.disabled).toBe(true);
  });

  it('disables the form while a save is in flight', async () => {
    const el = await mount(editVm({ busy: true }));

    expect(root(el).querySelector<HTMLInputElement>('.recipe-name-input')!.disabled).toBe(true);
    expect(root(el).querySelector<HTMLButtonElement>('.btn-save-recipe')!.disabled).toBe(true);
  });

  it('shows a refusal verbatim', async () => {
    const el = await mount(
      editVm({ errorMessage: 'media_type is not part of a crop_steering recipe.' })
    );

    expect(root(el).querySelector('[data-save-error]')?.textContent).toContain(
      'media_type is not part of a crop_steering recipe.'
    );
  });
});

describe('irrigation-recipe-library — the delete confirmation', () => {
  const confirmVm = (referencingPrograms: string[]) =>
    makeVm({
      deleteConfirm: { id: 'r1', name: 'Flower week 3', referencingPrograms },
    });

  it('names the recipe and says what survives the delete', async () => {
    const el = await mount(confirmVm([]));

    const text = root(el).querySelector('[data-delete-confirm]')!.textContent ?? '';
    expect(text).toContain('Delete "Flower week 3"?');
    expect(text).toContain('keep the settings it gave them');
  });

  it('says nothing about programs when none reference the recipe', async () => {
    const el = await mount(confirmVm([]));

    expect(root(el).querySelector('[data-referencing-programs]')).toBeNull();
  });

  it('names one referencing program', async () => {
    const el = await mount(confirmVm(['Autoflower run']));

    expect(root(el).querySelector('[data-referencing-programs]')?.textContent).toContain(
      'Autoflower run'
    );
  });

  it('names every referencing program, and still offers the delete', async () => {
    const el = await mount(confirmVm(['Autoflower run', 'Photo run']));

    const text = root(el).querySelector('[data-referencing-programs]')!.textContent ?? '';
    expect(text).toContain('Autoflower run, Photo run');
    // Never refused: a slot with no recipe holds, it does not water wrongly.
    expect(root(el).querySelector<HTMLButtonElement>('.btn-delete-confirm')!.disabled).toBe(
      false
    );
  });

  it('confirming and cancelling both report an intent', async () => {
    const el = await mount(confirmVm([]));
    const confirmed = intent(el, 'recipe-delete-confirmed');
    const cancelled = intent(el, 'recipe-delete-cancelled');

    root(el).querySelector<HTMLButtonElement>('.btn-delete-confirm')!.click();
    root(el).querySelector<HTMLButtonElement>('.btn-delete-cancel')!.click();

    expect(confirmed.detail).toEqual({});
    expect(cancelled.detail).toEqual({});
  });
});
