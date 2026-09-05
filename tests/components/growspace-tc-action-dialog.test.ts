import { expect, test, describe } from 'vitest';
import { fixture } from '@open-wc/testing-helpers';

import { GrowspaceTcActionDialog } from '../../src/features/tc/components/growspace-tc-action-dialog';
import type {
  Culture,
  CultureMedium,
  MaintenanceAction,
  MaintenanceActionType,
  MaintenanceRequest,
} from '../../src/slices/tc';
import { CultureSchema, MaintenanceActionSchema } from '../../src/slices/tc/schema';

if (!customElements.get('growspace-tc-action-dialog')) {
  customElements.define('growspace-tc-action-dialog', GrowspaceTcActionDialog);
}

const aCulture = (overrides: Record<string, unknown> = {}): Culture =>
  CultureSchema.parse({
    id: 'culture-1',
    line_id: 'line-1',
    stage: 'multiplication',
    status: 'active',
    started_at: '2026-01-04T09:12:00+00:00',
    last_replated_at: '2026-01-04T09:12:00+00:00',
    plantlet_count: 6,
    location: 'Shelf A',
    replate_due_at: '2026-02-03T09:12:00+00:00',
    ...overrides,
  });

const aMedium = (overrides: Record<string, unknown> = {}): CultureMedium =>
  ({
    id: 'medium-1',
    name: 'MS + BAP 1.0',
    created_at: '2026-01-04T09:12:00+00:00',
    updated_at: '2026-01-04T09:12:00+00:00',
    current_version: 2,
    versions: [],
    ...overrides,
  }) as CultureMedium;

const anAction = (overrides: Record<string, unknown> = {}): MaintenanceAction =>
  MaintenanceActionSchema.parse({
    id: 'action-1',
    culture_id: 'culture-1',
    line_id: 'line-1',
    action: 'note',
    recorded_at: '2026-02-03T09:20:00+00:00',
    note: '',
    medium_id: null,
    medium_version: null,
    vessels: [],
    reason: null,
    stage: null,
    ...overrides,
  });

async function render(
  action: MaintenanceActionType,
  options: {
    media?: CultureMedium[];
    culture?: Culture;
    history?: MaintenanceAction[];
  } = {}
): Promise<GrowspaceTcActionDialog> {
  const element = await fixture<GrowspaceTcActionDialog>(
    '<growspace-tc-action-dialog></growspace-tc-action-dialog>'
  );
  element.action = action;
  element.culture = options.culture ?? aCulture();
  element.lineName = 'Blue Dream — Pheno 2';
  element.media = options.media ?? [aMedium()];
  element.history = options.history ?? [];
  await element.updateComplete;
  return element;
}

const textOf = (element: GrowspaceTcActionDialog): string => element.shadowRoot?.textContent ?? '';

const inputs = (element: GrowspaceTcActionDialog, selector: string): HTMLInputElement[] =>
  Array.from(element.shadowRoot?.querySelectorAll(selector) ?? []);

async function type(input: HTMLInputElement | HTMLTextAreaElement, value: string): Promise<void> {
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

async function click(element: GrowspaceTcActionDialog, text: string): Promise<void> {
  const button = Array.from(element.shadowRoot?.querySelectorAll('button') ?? []).find(
    (candidate) => (candidate.textContent ?? '').includes(text)
  );
  (button as HTMLButtonElement).click();
  await element.updateComplete;
}

async function submit(element: GrowspaceTcActionDialog): Promise<MaintenanceRequest | undefined> {
  let request: MaintenanceRequest | undefined;
  element.addEventListener('maintenance-requested', (event) => {
    request = (event as CustomEvent<{ request: MaintenanceRequest }>).detail.request;
  });
  (element.shadowRoot?.querySelector('form') as HTMLFormElement).requestSubmit();
  await element.updateComplete;
  return request;
}

describe('GrowspaceTcActionDialog — replate', () => {
  test('starts from the vessel it is replating', async () => {
    const element = await render('replate');

    const counts = inputs(element, 'input[type="number"]');
    expect(counts[0].value).toBe('6');
    expect(inputs(element, 'input:not([type="number"])')[0].value).toBe('Shelf A');
  });

  test('pins the current version of the medium the grower picked', async () => {
    const element = await render('replate', {
      media: [aMedium(), aMedium({ id: 'medium-2', name: 'MS rooting', current_version: 5 })],
    });
    const select = element.shadowRoot?.querySelector('select') as HTMLSelectElement;
    select.value = 'medium-2';
    select.dispatchEvent(new Event('change'));
    await element.updateComplete;

    const request = await submit(element);

    expect(request).toMatchObject({
      action: 'replate',
      draft: { medium_id: 'medium-2', medium_version: 5 },
    });
  });

  test('divides into further vessels, and can take one back', async () => {
    const element = await render('replate');

    await click(element, 'Divide into another vessel');
    expect(inputs(element, 'input[type="number"]')).toHaveLength(2);

    const request = await submit(element);
    expect((request as { draft: { vessels: unknown[] } }).draft.vessels).toHaveLength(2);

    await click(element, 'Remove');
    expect(inputs(element, 'input[type="number"]')).toHaveLength(1);
  });

  test('leaves an uncounted vessel uncounted rather than zero', async () => {
    const element = await render('replate');
    await type(inputs(element, 'input[type="number"]')[0], '');

    const request = await submit(element);

    expect((request as { draft: { vessels: Array<{ plantlet_count: number | null }> } }).draft
      .vessels[0].plantlet_count).toBeNull();
  });

  test('refuses to record when there is no medium to pin', async () => {
    const element = await render('replate', { media: [] });

    expect(textOf(element)).toContain('No culture medium to pour from yet');
    const record = element.shadowRoot?.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(record.disabled).toBe(true);
  });
});

describe('GrowspaceTcActionDialog — the other four acts', () => {
  test('sends a discard with its reason', async () => {
    const element = await render('discard');
    const select = element.shadowRoot?.querySelector('select') as HTMLSelectElement;
    select.value = 'spent';
    select.dispatchEvent(new Event('change'));
    await element.updateComplete;

    const request = await submit(element);

    expect(request).toEqual({ action: 'discard', cultureId: 'culture-1', reason: 'spent', note: '' });
  });

  test('says a discard keeps the vessel in history', async () => {
    expect(textOf(await render('discard'))).toContain('stays in your history');
  });

  test('says a move to rooting does not re-plate the vessel', async () => {
    expect(textOf(await render('move_to_rooting'))).toContain('stays on the medium it is already on');
  });

  test('says a graduation is an ending and no bridge yet', async () => {
    expect(textOf(await render('graduate'))).toContain('not wired up yet');
  });

  test('will not record an empty note', async () => {
    const element = await render('note');
    const record = element.shadowRoot?.querySelector('button[type="submit"]') as HTMLButtonElement;

    expect(record.disabled).toBe(true);

    await type(element.shadowRoot?.querySelector('textarea') as HTMLTextAreaElement, 'Vitrified.');
    await element.updateComplete;

    expect(await submit(element)).toEqual({
      action: 'note',
      cultureId: 'culture-1',
      note: 'Vitrified.',
    });
  });

  test('carries an optional note on the acts that do not need one', async () => {
    const element = await render('graduate');
    await type(element.shadowRoot?.querySelector('textarea') as HTMLTextAreaElement, 'Dome.');
    await element.updateComplete;

    expect(await submit(element)).toEqual({
      action: 'graduate',
      cultureId: 'culture-1',
      note: 'Dome.',
    });
  });
});

describe('GrowspaceTcActionDialog — the vessel`s history', () => {
  test('reads each act as a sentence, naming the medium a replate pinned', async () => {
    const element = await render('note', {
      history: [
        anAction({
          action: 'replate',
          medium_id: 'medium-1',
          medium_version: 2,
          vessels: [{ culture_id: 'culture-1', plantlet_count: 5, location: 'Shelf A' }],
        }),
        anAction({ id: 'action-2', action: 'discard', reason: 'contamination' }),
        anAction({ id: 'action-3', action: 'move_to_rooting', stage: 'rooting' }),
      ],
    });

    await click(element, "Show this vessel's history");

    expect(textOf(element)).toContain('Replated onto MS + BAP 1.0, version 2');
    expect(textOf(element)).toContain('Discarded — Contamination');
    expect(textOf(element)).toContain('Moved to rooting');
  });

  test('counts the vessels a division produced', async () => {
    const element = await render('note', {
      history: [
        anAction({
          action: 'replate',
          medium_id: 'medium-1',
          medium_version: 2,
          vessels: [
            { culture_id: 'culture-1', plantlet_count: 5, location: 'Shelf A' },
            { culture_id: 'culture-2', plantlet_count: 4, location: 'Shelf B' },
          ],
        }),
      ],
    });

    await click(element, "Show this vessel's history");

    expect(textOf(element)).toContain('divided into 2 vessels');
  });

  test('names a medium that has since been deleted rather than showing its ID', async () => {
    const element = await render('note', {
      history: [anAction({ action: 'replate', medium_id: 'gone', medium_version: 1 })],
    });

    await click(element, "Show this vessel's history");

    expect(textOf(element)).toContain('a medium no longer in the library');
    expect(textOf(element)).not.toContain('gone');
  });

  test('says a vessel has no history rather than showing an empty list', async () => {
    const element = await render('note');

    await click(element, "Show this vessel's history");

    expect(textOf(element)).toContain('Nothing recorded against this vessel yet');
  });
});
