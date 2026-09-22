import { expect, test, describe } from 'vitest';
import { fixture } from '@open-wc/testing-helpers';

import { GrowspaceTcMediumForm } from '../../src/features/tc/components/growspace-tc-medium-form';
import { CultureMediumSchema, type CultureMedium } from '../../src/slices/tc';

if (!customElements.get('growspace-tc-medium-form')) {
  customElements.define('growspace-tc-medium-form', GrowspaceTcMediumForm);
}

const aMedium = (overrides: Record<string, unknown> = {}): CultureMedium =>
  CultureMediumSchema.parse({
    id: 'medium-1',
    name: 'MS multiplication',
    created_at: '2026-01-04T09:12:00+00:00',
    updated_at: '2026-02-04T09:12:00+00:00',
    current_version: 1,
    versions: [
      {
        version: 1,
        created_at: '2026-01-04T09:12:00+00:00',
        base_salts: 'MS',
        additives: [],
        hormones: [{ name: 'BAP', amount: 1, unit: 'mg/L' }],
        agar_g_per_l: 7,
        sugar_g_per_l: 30,
        ph_target: 5.8,
        notes: '',
      },
    ],
    ...overrides,
  });

async function render(medium?: CultureMedium): Promise<GrowspaceTcMediumForm> {
  const element = await fixture<GrowspaceTcMediumForm>(
    '<growspace-tc-medium-form></growspace-tc-medium-form>'
  );
  element.medium = medium;
  await element.updateComplete;
  return element;
}

function fieldAfter(element: GrowspaceTcMediumForm, label: string): HTMLInputElement {
  const found = [...(element.shadowRoot?.querySelectorAll('label') ?? [])].find((candidate) =>
    candidate.textContent?.trim().startsWith(label)
  );
  expect(found, `no field labelled ${label}`).toBeDefined();
  return found!.querySelector('input, textarea') as HTMLInputElement;
}

function type(field: HTMLInputElement, value: string): void {
  field.value = value;
  field.dispatchEvent(new Event('input', { bubbles: true }));
}

function buttonWith(element: GrowspaceTcMediumForm, label: string): HTMLButtonElement {
  const button = [...(element.shadowRoot?.querySelectorAll('button') ?? [])].find(
    (candidate) => candidate.textContent?.trim() === label
  );
  expect(button, `no button labelled ${label}`).toBeDefined();
  return button as HTMLButtonElement;
}

async function submit(element: GrowspaceTcMediumForm): Promise<CustomEvent | undefined> {
  let saved: CustomEvent | undefined;
  element.addEventListener('medium-save-requested', (event) => {
    saved = event as CustomEvent;
  });
  element.shadowRoot?.querySelector('form')?.requestSubmit();
  await element.updateComplete;
  return saved;
}

describe('GrowspaceTcMediumForm', () => {
  test('starts a new medium on defaults nobody has to retype', async () => {
    const element = await render();

    expect(fieldAfter(element, 'Name').value).toBe('');
    expect(fieldAfter(element, 'pH target').value).toBe('5.8');
    expect(element.shadowRoot?.textContent).toContain('New culture medium');
  });

  test('starts an edit from the version a new plating would pin', async () => {
    const element = await render(aMedium());

    expect(fieldAfter(element, 'Name').value).toBe('MS multiplication');
    expect(fieldAfter(element, 'Base salts').value).toBe('MS');
    expect(element.shadowRoot?.textContent).toContain('Edit culture medium');
  });

  test('emits the whole draft flat, with the id it is editing', async () => {
    const element = await render(aMedium());
    type(fieldAfter(element, 'pH target'), '5.6');

    const saved = await submit(element);

    expect(saved?.detail.id).toBe('medium-1');
    expect(saved?.detail.draft).toMatchObject({
      name: 'MS multiplication',
      base_salts: 'MS',
      ph_target: 5.6,
      hormones: [{ name: 'BAP', amount: 1, unit: 'mg/L' }],
    });
  });

  test('sends no id when creating, so the container cannot mistake it for an edit', async () => {
    const element = await render();
    type(fieldAfter(element, 'Name'), 'B5 rooting');

    const saved = await submit(element);

    expect(saved?.detail.id).toBeUndefined();
    expect(saved?.detail.draft.name).toBe('B5 rooting');
  });

  test('says that saving a changed formulation records a new version', async () => {
    const element = await render(aMedium());

    type(fieldAfter(element, 'Agar (g/L)'), '8');
    await element.updateComplete;

    expect(element.shadowRoot?.textContent).toContain('Saving records a new version');
  });

  test('says that a rename records no new version', async () => {
    const element = await render(aMedium());

    type(fieldAfter(element, 'Name'), 'MS multi');
    await element.updateComplete;

    expect(element.shadowRoot?.textContent).toContain('records no new version');
  });

  test('promises nothing about versions while creating one', async () => {
    const element = await render();

    expect(element.shadowRoot?.textContent).not.toContain('new version');
  });

  test('adds and removes hormone rows', async () => {
    const element = await render(aMedium());

    buttonWith(element, 'Add entry').click();
    await element.updateComplete;
    expect(element.shadowRoot?.querySelectorAll('.component-row')).toHaveLength(2);

    element.shadowRoot?.querySelectorAll<HTMLButtonElement>('.component-row button')[0].click();
    await element.updateComplete;

    const saved = await submit(element);
    expect(saved?.detail.draft.hormones).toEqual([{ name: '', amount: 0, unit: 'mg/L' }]);
  });

  test('keeps the draft when the backend rejects it', async () => {
    const element = await render(aMedium());
    type(fieldAfter(element, 'Name'), 'MS multi');

    element.error = 'A culture medium named “B5” already exists.';
    await element.updateComplete;

    expect(element.shadowRoot?.querySelector('[role="alert"]')?.textContent).toContain(
      'already exists'
    );
    expect(fieldAfter(element, 'Name').value).toBe('MS multi');
  });

  test('does not re-seed the draft on an unrelated re-render', async () => {
    const element = await render(aMedium());
    type(fieldAfter(element, 'Name'), 'MS multi');

    element.saving = true;
    await element.updateComplete;

    expect(fieldAfter(element, 'Name').value).toBe('MS multi');
  });

  test('asks to be closed rather than closing itself', async () => {
    const element = await render(aMedium());
    let cancelled = false;
    element.addEventListener('medium-cancel-requested', () => {
      cancelled = true;
    });

    buttonWith(element, 'Cancel').click();

    expect(cancelled).toBe(true);
  });
});
