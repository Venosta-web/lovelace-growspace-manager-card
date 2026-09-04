import { expect, test, describe, beforeEach } from 'vitest';
import { fixture } from '@open-wc/testing-helpers';

import { GrowspaceTcMediumLibrary } from '../../src/features/tc/components/growspace-tc-medium-library';
import { CultureMediumSchema, type CultureMedium } from '../../src/slices/tc';

if (!customElements.get('growspace-tc-medium-library')) {
  customElements.define('growspace-tc-medium-library', GrowspaceTcMediumLibrary);
}

const aVersion = (version: number, overrides: Record<string, unknown> = {}) => ({
  version,
  created_at: `2026-0${version}-04T09:12:00+00:00`,
  base_salts: 'MS',
  additives: [{ name: 'myo-inositol', amount: 100, unit: 'mg/L' }],
  hormones: [{ name: 'BAP', amount: 0.5 * version, unit: 'mg/L' }],
  agar_g_per_l: 7,
  sugar_g_per_l: 30,
  ph_target: 5.8,
  notes: '',
  ...overrides,
});

const aMedium = (overrides: Record<string, unknown> = {}): CultureMedium =>
  CultureMediumSchema.parse({
    id: 'medium-1',
    name: 'MS multiplication',
    created_at: '2026-01-04T09:12:00+00:00',
    updated_at: '2026-02-04T09:12:00+00:00',
    current_version: 2,
    versions: [aVersion(1), aVersion(2)],
    ...overrides,
  });

async function render(media: CultureMedium[]): Promise<GrowspaceTcMediumLibrary> {
  const element = await fixture<GrowspaceTcMediumLibrary>(
    '<growspace-tc-medium-library></growspace-tc-medium-library>'
  );
  element.media = media;
  await element.updateComplete;
  return element;
}

function textOf(element: GrowspaceTcMediumLibrary): string {
  return element.shadowRoot?.textContent ?? '';
}

function buttonWith(element: GrowspaceTcMediumLibrary, label: string): HTMLButtonElement {
  const button = [...(element.shadowRoot?.querySelectorAll('button') ?? [])].find((candidate) =>
    candidate.textContent?.includes(label)
  );
  expect(button, `no button labelled ${label}`).toBeDefined();
  return button as HTMLButtonElement;
}

let events: CustomEvent[] = [];

beforeEach(() => {
  events = [];
});

function record(element: GrowspaceTcMediumLibrary): void {
  for (const type of ['medium-create-requested', 'medium-edit-requested', 'medium-delete-requested'])
    element.addEventListener(type, (event) => events.push(event as CustomEvent));
}

describe('GrowspaceTcMediumLibrary', () => {
  test('says the library is empty rather than rendering an empty list', async () => {
    const element = await render([]);

    expect(element.shadowRoot?.querySelector('ul')).toBeNull();
    expect(textOf(element)).toContain('No culture media yet');
  });

  test('shows the current formulation, not the oldest one', async () => {
    const element = await render([aMedium()]);

    expect(textOf(element)).toContain('BAP 1 mg/L');
    expect(textOf(element)).not.toContain('BAP 0.5 mg/L');
    expect(textOf(element)).toContain('Version 2');
  });

  test('keeps the version history behind a disclosure, and names its size', async () => {
    const element = await render([aMedium()]);

    expect(element.shadowRoot?.querySelector('.history')).toBeNull();
    expect(textOf(element)).toContain('Show version history (2)');
  });

  test('renders every version, newest first, with the current one marked', async () => {
    const element = await render([aMedium()]);

    buttonWith(element, 'Show version history').click();
    await element.updateComplete;

    const entries = [...(element.shadowRoot?.querySelectorAll('.history li') ?? [])];
    expect(entries).toHaveLength(2);
    expect(entries[0].textContent).toContain('Version 2');
    expect(entries[0].classList.contains('current')).toBe(true);
    // The forked-from formulation is still readable, unchanged — the whole
    // point of immutable versions (TC ADR-0004).
    expect(entries[1].textContent).toContain('Version 1');
    expect(entries[1].textContent).toContain('BAP 0.5 mg/L');
    expect(entries[1].classList.contains('current')).toBe(false);
  });

  test('opens the history of one medium without opening the others', async () => {
    const element = await render([aMedium(), aMedium({ id: 'medium-2', name: 'B5 rooting' })]);

    buttonWith(element, 'Show version history').click();
    await element.updateComplete;

    expect(element.shadowRoot?.querySelectorAll('.history')).toHaveLength(1);
  });

  test('says "None" where a medium carries no hormones', async () => {
    const element = await render([
      aMedium({ current_version: 1, versions: [aVersion(1, { hormones: [] })] }),
    ]);

    expect(textOf(element)).toContain('None');
  });

  test('asks for a new medium rather than creating one itself', async () => {
    const element = await render([]);
    record(element);

    buttonWith(element, 'Add medium').click();

    expect(events.map((event) => event.type)).toEqual(['medium-create-requested']);
  });

  test('names the medium in its edit and delete intents', async () => {
    const element = await render([aMedium()]);
    record(element);

    buttonWith(element, 'Edit').click();
    buttonWith(element, 'Delete').click();

    expect(events.map((event) => [event.type, event.detail])).toEqual([
      ['medium-edit-requested', { id: 'medium-1' }],
      ['medium-delete-requested', { id: 'medium-1' }],
    ]);
  });

  test('falls back to the raw stamp when a date cannot be read', async () => {
    const element = await render([
      aMedium({ current_version: 1, versions: [aVersion(1, { created_at: 'not a date' })] }),
    ]);

    buttonWith(element, 'Show version history').click();
    await element.updateComplete;

    expect(textOf(element)).toContain('not a date');
  });
});
