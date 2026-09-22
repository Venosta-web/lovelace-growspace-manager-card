import { fixture, html } from '@open-wc/testing-helpers';
import { describe, expect, it } from 'vitest';
import { IrrigationRecipesTab } from '../../src/features/irrigation/components/irrigation-recipes-tab';
import type {
  RecipeOptionVM,
  RecipesTabViewModel,
} from '../../src/features/irrigation/viewmodels/recipes-tab.viewmodel';

if (!customElements.get('irrigation-recipes-tab')) {
  customElements.define('irrigation-recipes-tab', IrrigationRecipesTab);
}

function option(over: Partial<RecipeOptionVM> = {}): RecipeOptionVM {
  return {
    id: 'r1',
    name: 'Flower week 3',
    provenanceLabel: 'Flower · week 3',
    plumbingLabel: '7.5 L rockwool @ 13.5 ml/s',
    mediaType: 'rockwool',
    matchesCurrentStage: true,
    ...over,
  };
}

function makeVm(over: Partial<RecipesTabViewModel> = {}): RecipesTabViewModel {
  return {
    applied: null,
    runningKind: 'crop_steering',
    context: { stage: 'flower', week: 3 },
    options: [option()],
    hiddenByKindCount: 0,
    selectedRecipeId: 'r1',
    selected: option(),
    mediaMismatch: null,
    applyWarning: null,
    nameDraft: '',
    canSave: false,
    busy: false,
    ...over,
  };
}

async function mount(over: Partial<RecipesTabViewModel> = {}): Promise<IrrigationRecipesTab> {
  const element = await fixture<IrrigationRecipesTab>(html`
    <irrigation-recipes-tab .vm=${makeVm(over)}></irrigation-recipes-tab>
  `);
  await element.updateComplete;
  return element;
}

/** Rendered copy with template whitespace collapsed, so assertions read as prose. */
function text(element: IrrigationRecipesTab, selector: string): string {
  return (element.shadowRoot!.querySelector(selector)?.textContent ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

describe('IrrigationRecipesTab — applied recipe', () => {
  it('says so plainly when no recipe was ever applied', async () => {
    const element = await mount();
    expect(element.shadowRoot!.textContent).toContain('No recipe has been applied');
    expect(element.shadowRoot!.querySelector('[data-drift]')).toBeNull();
  });

  it('shows the applied recipe, when it was applied, and that it still matches', async () => {
    const element = await mount({
      applied: {
        id: 'r1',
        name: 'Flower week 3',
        appliedAtLabel: 'Aug 10, 07:15',
        drift: 'in-sync',
      },
    });

    expect(text(element, '.applied-name')).toBe('Flower week 3');
    expect(text(element, '.applied-when')).toContain('Aug 10, 07:15');
    expect(element.shadowRoot!.querySelector('[data-drift]')!.getAttribute('data-drift')).toBe(
      'in-sync'
    );
  });

  it('flags drift once the settings have been hand-tuned since', async () => {
    const element = await mount({
      applied: { id: 'r1', name: 'Flower week 3', appliedAtLabel: null, drift: 'drifted' },
    });

    expect(element.shadowRoot!.querySelector('[data-drift]')!.getAttribute('data-drift')).toBe(
      'drifted'
    );
    expect(text(element, '[data-drift]')).toContain('Drifted');
  });

  it('names a recipe that has since left the library rather than showing a bare id', async () => {
    const element = await mount({
      applied: { id: 'gone', name: null, appliedAtLabel: null, drift: 'unknown' },
    });

    expect(text(element, '.applied-name')).toContain('no longer in the library');
  });

  it('shows the backend apply notice verbatim', async () => {
    const element = await mount({
      applyWarning: "Recipe 'X' was authored in rockwool and applied to a coco growspace.",
    });

    expect(text(element, '[data-apply-warning]')).toContain('authored in rockwool');
  });
});

describe('IrrigationRecipesTab — picker', () => {
  it('marks the pre-selected recipe and badges the one matching this week', async () => {
    const element = await mount();
    const row = element.shadowRoot!.querySelector('[data-recipe-id="r1"]')!;

    expect(row.classList.contains('selected')).toBe(true);
    expect(row.textContent).toContain('This week');
    expect(row.textContent).toContain('Flower · week 3');
  });

  it('emits recipe-selected when another recipe is picked', async () => {
    const element = await mount({
      options: [option(), option({ id: 'r2', name: 'Veg', matchesCurrentStage: false })],
    });
    let picked: string | undefined;
    element.addEventListener('recipe-selected', (e) => {
      picked = (e as CustomEvent<{ recipeId: string }>).detail.recipeId;
    });

    element.shadowRoot!.querySelector<HTMLButtonElement>('[data-recipe-id="r2"]')!.click();

    expect(picked).toBe('r2');
  });

  it('emits recipe-apply-requested with the resolved selection', async () => {
    const element = await mount();
    let applied: string | null | undefined;
    element.addEventListener('recipe-apply-requested', (e) => {
      applied = (e as CustomEvent<{ recipeId: string | null }>).detail.recipeId;
    });

    element.shadowRoot!.querySelector<HTMLButtonElement>('.btn-apply-recipe')!.click();

    expect(applied).toBe('r1');
  });

  it('explains the recipes the running kind excludes instead of hiding them silently', async () => {
    const element = await mount({ hiddenByKindCount: 2 });

    expect(text(element, '[data-hidden-by-kind]')).toContain('2 recipes are not listed');
  });

  it('warns before a cross-media apply and still offers the button', async () => {
    const element = await mount({ mediaMismatch: { authored: 'coco', target: 'rockwool' } });

    expect(text(element, '[data-media-mismatch]')).toContain('applied unscaled');
    expect(
      element.shadowRoot!.querySelector<HTMLButtonElement>('.btn-apply-recipe')!.disabled
    ).toBe(false);
  });

  it('offers an empty state instead of a dead Apply button', async () => {
    const element = await mount({ options: [], selectedRecipeId: null, selected: null });

    expect(element.shadowRoot!.querySelector('.btn-apply-recipe')).toBeNull();
    expect(element.shadowRoot!.textContent).toContain('No crop-steering recipes saved yet');
  });
});

describe('IrrigationRecipesTab — save form', () => {
  it('refuses to submit an unnamed recipe', async () => {
    const element = await mount();

    expect(element.shadowRoot!.querySelector<HTMLButtonElement>('.btn-save-recipe')!.disabled).toBe(
      true
    );
  });

  it('emits recipe-name-changed as the grower types', async () => {
    const element = await mount();
    let name: string | undefined;
    element.addEventListener('recipe-name-changed', (e) => {
      name = (e as CustomEvent<{ name: string }>).detail.name;
    });

    const input = element.shadowRoot!.querySelector<HTMLInputElement>('.recipe-name-input')!;
    input.value = 'Veg week 2';
    input.dispatchEvent(new Event('input'));

    expect(name).toBe('Veg week 2');
  });

  it('emits recipe-save-requested once the name is present', async () => {
    const element = await mount({ nameDraft: 'Veg week 2', canSave: true });
    let saved = false;
    element.addEventListener('recipe-save-requested', () => {
      saved = true;
    });

    element.shadowRoot!.querySelector<HTMLButtonElement>('.btn-save-recipe')!.click();

    expect(saved).toBe(true);
  });

  it('disables both gestures while a mutation is in flight', async () => {
    const element = await mount({ nameDraft: 'Veg', canSave: true, busy: true });

    expect(element.shadowRoot!.querySelector<HTMLButtonElement>('.btn-save-recipe')!.disabled).toBe(
      true
    );
    expect(
      element.shadowRoot!.querySelector<HTMLButtonElement>('.btn-apply-recipe')!.disabled
    ).toBe(true);
  });
});
