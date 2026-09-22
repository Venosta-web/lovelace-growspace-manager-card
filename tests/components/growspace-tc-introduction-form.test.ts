import { expect, test, describe } from 'vitest';
import { fixture } from '@open-wc/testing-helpers';

import { GrowspaceTcIntroductionForm } from '../../src/features/tc/components/growspace-tc-introduction-form';
import { GrowspaceTcPhenotypePicker } from '../../src/features/tc/components/growspace-tc-phenotype-picker';
import type { IntroductionDraft, PhenotypeOption } from '../../src/slices/tc';

if (!customElements.get('growspace-tc-phenotype-picker')) {
  customElements.define('growspace-tc-phenotype-picker', GrowspaceTcPhenotypePicker);
}
if (!customElements.get('growspace-tc-introduction-form')) {
  customElements.define('growspace-tc-introduction-form', GrowspaceTcIntroductionForm);
}

const PHENOTYPES: PhenotypeOption[] = [
  { id: 'Blue Dream|Pheno 2', name: 'Blue Dream — Pheno 2' },
  { id: 'Gelato 33|Cut A', name: 'Gelato 33 — Cut A' },
];

async function render(phenotypes = PHENOTYPES): Promise<GrowspaceTcIntroductionForm> {
  const element = await fixture<GrowspaceTcIntroductionForm>(
    '<growspace-tc-introduction-form></growspace-tc-introduction-form>'
  );
  element.phenotypes = phenotypes;
  await element.updateComplete;
  return element;
}

const picker = (element: GrowspaceTcIntroductionForm): GrowspaceTcPhenotypePicker =>
  element.shadowRoot?.querySelector('growspace-tc-phenotype-picker') as GrowspaceTcPhenotypePicker;

async function choose(
  element: GrowspaceTcIntroductionForm,
  option: PhenotypeOption
): Promise<void> {
  picker(element).dispatchEvent(
    new CustomEvent('phenotype-selected', {
      detail: option,
      bubbles: true,
      composed: true,
    })
  );
  await element.updateComplete;
}

function field(element: GrowspaceTcIntroductionForm, index: number): HTMLInputElement {
  return Array.from(element.shadowRoot?.querySelectorAll('input[type="number"]') ?? [])[
    index
  ] as HTMLInputElement;
}

async function type(input: HTMLInputElement, value: string): Promise<void> {
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

async function submit(element: GrowspaceTcIntroductionForm): Promise<IntroductionDraft> {
  const requested = new Promise<CustomEvent<{ draft: IntroductionDraft }>>((resolve) =>
    element.addEventListener(
      'introduction-requested',
      (event) => resolve(event as CustomEvent<{ draft: IntroductionDraft }>),
      { once: true }
    )
  );
  element.shadowRoot
    ?.querySelector('form')
    ?.dispatchEvent(new Event('submit', { cancelable: true }));
  return (await requested).detail.draft;
}

describe('GrowspaceTcIntroductionForm', () => {
  test('cannot be submitted before a phenotype is chosen', async () => {
    const element = await render();

    const button = element.shadowRoot?.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(element.shadowRoot?.textContent).toContain('No phenotype chosen yet');
  });

  test('records the ID and the name the grower was looking at', async () => {
    const element = await render();

    await choose(element, PHENOTYPES[1]);
    const draft = await submit(element);

    expect(draft.phenotype_id).toBe('Gelato 33|Cut A');
    expect(draft.phenotype_name).toBe('Gelato 33 — Cut A');
  });

  test('sends an interval for both stages', async () => {
    const element = await render();
    await choose(element, PHENOTYPES[0]);

    await type(field(element, 0), '28');
    await type(field(element, 1), '14');
    const draft = await submit(element);

    expect(draft.replate_interval_days).toEqual({ multiplication: 28, rooting: 14 });
  });

  test('leaves an uncounted first vessel null rather than zero', async () => {
    const element = await render();
    await choose(element, PHENOTYPES[0]);

    const draft = await submit(element);

    expect(draft.plantlet_count).toBeNull();
  });

  test('records a count of zero as zero', async () => {
    const element = await render();
    await choose(element, PHENOTYPES[0]);

    await type(field(element, 2), '0');
    const draft = await submit(element);

    expect(draft.plantlet_count).toBe(0);
  });

  test('starts the first vessel in multiplication and can start it in rooting', async () => {
    const element = await render();
    await choose(element, PHENOTYPES[0]);

    expect((await submit(element)).stage).toBe('multiplication');

    const select = element.shadowRoot?.querySelector('select') as HTMLSelectElement;
    select.value = 'rooting';
    select.dispatchEvent(new Event('change'));
    await element.updateComplete;

    expect((await submit(element)).stage).toBe('rooting');
  });

  test('shows a backend rejection without discarding the draft', async () => {
    const element = await render();
    await choose(element, PHENOTYPES[0]);
    element.error = 'Rooting interval must be between 1 and 365.';
    await element.updateComplete;

    expect(element.shadowRoot?.querySelector('.error')?.textContent).toContain('Rooting interval');
    expect((await submit(element)).phenotype_id).toBe('Blue Dream|Pheno 2');
  });
});

describe('GrowspaceTcPhenotypePicker', () => {
  async function renderPicker(phenotypes: PhenotypeOption[]): Promise<GrowspaceTcPhenotypePicker> {
    const element = await fixture<GrowspaceTcPhenotypePicker>(
      '<growspace-tc-phenotype-picker></growspace-tc-phenotype-picker>'
    );
    element.phenotypes = phenotypes;
    await element.updateComplete;
    return element;
  }

  test('emits both halves of the reference', async () => {
    const element = await renderPicker(PHENOTYPES);

    const chosen = new Promise<CustomEvent>((resolve) =>
      element.addEventListener('phenotype-selected', (e) => resolve(e as CustomEvent), {
        once: true,
      })
    );
    (element.shadowRoot?.querySelector('li button') as HTMLButtonElement).click();

    expect((await chosen).detail).toEqual(PHENOTYPES[0]);
  });

  test('filters the list', async () => {
    const element = await renderPicker(PHENOTYPES);

    const search = element.shadowRoot?.querySelector('input[type="search"]') as HTMLInputElement;
    search.value = 'gelato';
    search.dispatchEvent(new Event('input'));
    await element.updateComplete;

    const options = Array.from(element.shadowRoot?.querySelectorAll('li button') ?? []);
    expect(options).toHaveLength(1);
    expect(options[0]?.textContent).toContain('Gelato 33 — Cut A');
  });

  test('blames the empty library rather than the search box', async () => {
    const element = await renderPicker([]);

    expect(element.shadowRoot?.textContent).toContain('no phenotypes to reference yet');
    expect(element.shadowRoot?.textContent).not.toContain('No phenotype matches');
  });

  test('says when a search matched nothing', async () => {
    const element = await renderPicker(PHENOTYPES);

    const search = element.shadowRoot?.querySelector('input[type="search"]') as HTMLInputElement;
    search.value = 'nothing like this';
    search.dispatchEvent(new Event('input'));
    await element.updateComplete;

    expect(element.shadowRoot?.textContent).toContain('No phenotype matches');
  });

  test('caps a long list and says how much it left out', async () => {
    const many = Array.from({ length: 35 }, (_, index) => ({
      id: `Strain ${index}|default`,
      name: `Strain ${index}`,
    }));
    const element = await renderPicker(many);

    expect(element.shadowRoot?.querySelectorAll('li button')).toHaveLength(30);
    expect(element.shadowRoot?.textContent).toContain('5 more match');
  });
});
