import { expect, test, describe } from 'vitest';
import { fixture } from '@open-wc/testing-helpers';

import { GrowspaceTcWorklist } from '../../src/features/tc/components/growspace-tc-worklist';
import { worklistEntries, type CultureLine, type WorklistEntry } from '../../src/slices/tc';
import { CultureLineSchema, CultureSchema } from '../../src/slices/tc/schema';

if (!customElements.get('growspace-tc-worklist')) {
  customElements.define('growspace-tc-worklist', GrowspaceTcWorklist);
}

const aCulture = (overrides: Record<string, unknown> = {}) =>
  CultureSchema.parse({
    id: 'culture-1',
    line_id: 'line-1',
    stage: 'multiplication',
    status: 'active',
    started_at: '2026-01-04T09:12:00+00:00',
    last_replated_at: '2026-01-04T09:12:00+00:00',
    plantlet_count: 6,
    location: 'Shelf A',
    replate_due_at: '2026-02-03T09:12:00',
    ...overrides,
  });

const aLine = (overrides: Record<string, unknown> = {}): CultureLine =>
  CultureLineSchema.parse({
    id: 'line-1',
    phenotype: {
      id: 'Blue Dream|Pheno 2',
      name_snapshot: 'Blue Dream — Pheno 2',
      snapshot_at: '2026-01-04T09:12:00+00:00',
    },
    replate_interval_days: { multiplication: 30, rooting: 21 },
    created_at: '2026-01-04T09:12:00+00:00',
    updated_at: '2026-01-04T09:12:00+00:00',
    archived_at: null,
    cultures: [aCulture()],
    ...overrides,
  });

const TODAY = new Date(2026, 1, 3, 12, 0, 0);

async function render(
  entries: WorklistEntry[],
  names: Array<[string, string]> = [],
  locations: string[] = []
): Promise<GrowspaceTcWorklist> {
  const element = await fixture<GrowspaceTcWorklist>('<growspace-tc-worklist></growspace-tc-worklist>');
  element.entries = entries;
  element.names = new Map(names);
  element.locations = locations;
  await element.updateComplete;
  return element;
}

const textOf = (element: GrowspaceTcWorklist): string => element.shadowRoot?.textContent ?? '';

const rows = (element: GrowspaceTcWorklist): Element[] =>
  Array.from(element.shadowRoot?.querySelectorAll('li.entry') ?? []);

async function click(element: GrowspaceTcWorklist, text: string): Promise<void> {
  const button = Array.from(element.shadowRoot?.querySelectorAll('button') ?? []).find(
    (candidate) => (candidate.textContent ?? '').includes(text)
  );
  (button as HTMLButtonElement).click();
  await element.updateComplete;
}

describe('GrowspaceTcWorklist', () => {
  test('leads with what is due and overdue, and hides the merely upcoming', async () => {
    const overdue = aLine({ cultures: [aCulture({ replate_due_at: '2026-01-20T09:12:00' })] });
    const upcoming = aLine({
      id: 'line-2',
      cultures: [aCulture({ id: 'culture-2', replate_due_at: '2026-03-20T09:12:00' })],
    });

    const element = await render(worklistEntries([overdue, upcoming], TODAY));

    expect(rows(element)).toHaveLength(1);
    expect(textOf(element)).toContain('14 days overdue');
    expect(textOf(element)).toContain('1 of 2 vessels');
  });

  test('shows the upcoming ones when asked', async () => {
    const upcoming = aLine({ cultures: [aCulture({ replate_due_at: '2026-02-10T09:12:00' })] });
    const element = await render(worklistEntries([upcoming], TODAY));

    expect(rows(element)).toHaveLength(0);
    await click(element, 'Show upcoming too');

    expect(rows(element)).toHaveLength(1);
    expect(textOf(element)).toContain('Due in 7 days');
  });

  test('says due today rather than "0 days"', async () => {
    const element = await render(worklistEntries([aLine()], TODAY));

    expect(textOf(element)).toContain('Due today');
  });

  test('marks overdue and due differently, and marks upcoming not at all', async () => {
    const lines = [
      aLine({ cultures: [aCulture({ replate_due_at: '2026-01-20T09:12:00' })] }),
      aLine({ id: 'line-2', cultures: [aCulture({ id: 'culture-2' })] }),
      aLine({
        id: 'line-3',
        cultures: [aCulture({ id: 'culture-3', replate_due_at: '2026-02-20T09:12:00' })],
      }),
    ];
    const element = await render(worklistEntries(lines, TODAY));
    await click(element, 'Show upcoming too');

    expect(rows(element).map((row) => row.className)).toEqual([
      'entry overdue',
      'entry due',
      'entry scheduled',
    ]);
  });

  test('filters by the location the grower picked', async () => {
    const lines = [
      aLine(),
      aLine({
        id: 'line-2',
        cultures: [aCulture({ id: 'culture-2', location: 'Shelf B' })],
      }),
    ];
    const element = await render(worklistEntries(lines, TODAY), [], ['Shelf A', 'Shelf B']);

    const select = element.shadowRoot?.querySelector('select') as HTMLSelectElement;
    select.value = 'Shelf B';
    select.dispatchEvent(new Event('change'));
    await element.updateComplete;

    expect(rows(element)).toHaveLength(1);
    expect(textOf(element)).toContain('Shelf B');
  });

  test('says a filter emptied the list rather than that nothing is due', async () => {
    const element = await render(worklistEntries([aLine()], TODAY), [], ['Shelf A', 'Shelf B']);
    const select = element.shadowRoot?.querySelector('select') as HTMLSelectElement;
    select.value = 'Shelf B';
    select.dispatchEvent(new Event('change'));
    await element.updateComplete;

    expect(textOf(element)).toContain('No vessel matches that filter');
  });

  test('says nothing is due when nothing is', async () => {
    const element = await render([]);

    expect(textOf(element)).toContain('Every vessel still has time');
  });

  test('names a line by the resolved phenotype, falling back to its snapshot', async () => {
    const element = await render(worklistEntries([aLine()], TODAY), [
      ['line-1', 'Blue Dream — renamed'],
    ]);

    expect(textOf(element)).toContain('Blue Dream — renamed');

    const unresolved = await render(worklistEntries([aLine()], TODAY));
    expect(textOf(unresolved)).toContain('Blue Dream — Pheno 2');
  });

  test('offers all five acts and names the vessel each is for', async () => {
    const element = await render(worklistEntries([aLine()], TODAY));
    const requested: unknown[] = [];
    element.addEventListener('culture-action-requested', (event) =>
      requested.push((event as CustomEvent).detail)
    );

    for (const label of ['Replate', 'Move to rooting', 'Add note', 'Discard', 'Graduate']) {
      await click(element, label);
    }

    expect(requested).toEqual([
      { cultureId: 'culture-1', action: 'replate' },
      { cultureId: 'culture-1', action: 'move_to_rooting' },
      { cultureId: 'culture-1', action: 'note' },
      { cultureId: 'culture-1', action: 'discard' },
      { cultureId: 'culture-1', action: 'graduate' },
    ]);
  });

  test('says a vessel was never counted rather than showing a zero', async () => {
    const element = await render(
      worklistEntries([aLine({ cultures: [aCulture({ plantlet_count: null })] })], TODAY)
    );

    expect(textOf(element)).toContain('Not counted');
  });
});
