import { expect, test, describe } from 'vitest';
import { fixture } from '@open-wc/testing-helpers';

import { GrowspaceTcCultureBoard } from '../../src/features/tc/components/growspace-tc-culture-board';
import { CultureLineSchema, type CultureLine, type PhenotypeResolution } from '../../src/slices/tc';

if (!customElements.get('growspace-tc-culture-board')) {
  customElements.define('growspace-tc-culture-board', GrowspaceTcCultureBoard);
}

const aCulture = (overrides: Record<string, unknown> = {}) => ({
  id: 'culture-1',
  line_id: 'line-1',
  stage: 'multiplication',
  status: 'active',
  started_at: '2026-01-04T09:12:00+00:00',
  last_replated_at: '2026-01-04T09:12:00+00:00',
  plantlet_count: 6,
  location: 'Shelf A',
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

async function render(
  lines: CultureLine[],
  resolutions: Array<[string, PhenotypeResolution]> = [],
  showArchived = false
): Promise<GrowspaceTcCultureBoard> {
  const element = await fixture<GrowspaceTcCultureBoard>(
    '<growspace-tc-culture-board></growspace-tc-culture-board>'
  );
  element.lines = lines;
  element.resolutions = new Map(resolutions);
  element.showArchived = showArchived;
  await element.updateComplete;
  return element;
}

const textOf = (element: GrowspaceTcCultureBoard): string => element.shadowRoot?.textContent ?? '';

const lineItems = (element: GrowspaceTcCultureBoard): Element[] =>
  Array.from(element.shadowRoot?.querySelectorAll('li.line') ?? []);

async function click(element: GrowspaceTcCultureBoard, text: string): Promise<void> {
  const button = Array.from(element.shadowRoot?.querySelectorAll('button') ?? []).find(
    (candidate) => (candidate.textContent ?? '').includes(text)
  );
  (button as HTMLButtonElement).click();
  await element.updateComplete;
}

describe('GrowspaceTcCultureBoard — lines', () => {
  test('renders each line with its intervals', async () => {
    const element = await render(
      [aLine()],
      [['line-1', { status: 'resolved', name: 'Blue Dream — Pheno 2' }]]
    );

    expect(lineItems(element)).toHaveLength(1);
    expect(textOf(element)).toContain('Blue Dream — Pheno 2');
    expect(textOf(element)).toContain('30 days');
    expect(textOf(element)).toContain('21 days');
  });

  test('shows a line by the resolved name, not by its snapshot', async () => {
    const element = await render(
      [aLine()],
      [['line-1', { status: 'resolved', name: 'Blue Dream — Renamed' }]]
    );

    expect(textOf(element)).toContain('Blue Dream — Renamed');
    expect(textOf(element)).not.toContain('Blue Dream — Pheno 2');
  });

  test('says so when the board is empty', async () => {
    const element = await render([]);

    expect(textOf(element)).toContain('No culture lines yet');
  });
});

describe('GrowspaceTcCultureBoard — vessels', () => {
  test('shows a line`s vessels with stage, status, count and location', async () => {
    const element = await render([aLine()]);

    await click(element, 'Show vessels');

    const table = element.shadowRoot?.querySelector('table.cultures');
    const row = table?.querySelector('tbody tr')?.textContent ?? '';
    expect(row).toContain('Multiplication');
    expect(row).toContain('Active');
    expect(row).toContain('6');
    expect(row).toContain('Shelf A');
  });

  test('distinguishes an uncounted vessel from an empty one', async () => {
    const element = await render([
      aLine({
        cultures: [aCulture({ plantlet_count: null }), aCulture({ id: 'c2', plantlet_count: 0 })],
      }),
    ]);

    await click(element, 'Show vessels');

    const rows = Array.from(element.shadowRoot?.querySelectorAll('tbody tr') ?? []);
    expect(rows[0]?.textContent).toContain('Not counted');
    expect(rows[1]?.textContent).toContain('0');
  });
});

describe('GrowspaceTcCultureBoard — missing phenotype', () => {
  const missing: Array<[string, PhenotypeResolution]> = [
    ['line-1', { status: 'missing', name: 'Blue Dream — Pheno 2' }],
  ];

  test('names the line from its snapshot and says the reference is gone', async () => {
    const element = await render([aLine()], missing);

    expect(lineItems(element)).toHaveLength(1);
    expect(textOf(element)).toContain('Blue Dream — Pheno 2');
    expect(textOf(element)).toContain('no longer in your strain library');
    expect(element.shadowRoot?.querySelector('li.line.missing')).toBeTruthy();
  });

  test('offers both ways out', async () => {
    const element = await render([aLine()], missing);

    const relink = new Promise((resolve) =>
      element.addEventListener('line-relink-requested', resolve, { once: true })
    );
    await click(element, 'Re-link phenotype');
    expect(((await relink) as CustomEvent).detail).toEqual({ id: 'line-1' });

    const archive = new Promise((resolve) =>
      element.addEventListener('line-archive-requested', resolve, { once: true })
    );
    await click(element, 'Archive');
    expect(((await archive) as CustomEvent).detail).toEqual({ id: 'line-1', archived: true });
  });

  test('claims nothing while the strain library has not loaded', async () => {
    const element = await render(
      [aLine()],
      [['line-1', { status: 'unresolved', name: 'Blue Dream — Pheno 2' }]]
    );

    expect(textOf(element)).toContain('Blue Dream — Pheno 2');
    expect(textOf(element)).not.toContain('no longer in your strain library');
    expect(element.shadowRoot?.querySelector('li.line.missing')).toBeNull();
  });

  test('treats a line it was given no verdict for as unresolved', async () => {
    const element = await render([aLine()]);

    expect(textOf(element)).toContain('Blue Dream — Pheno 2');
    expect(element.shadowRoot?.querySelector('li.line.missing')).toBeNull();
  });
});

describe('GrowspaceTcCultureBoard — archived lines', () => {
  const archived = aLine({ id: 'line-2', archived_at: '2026-03-30T08:05:00+00:00' });

  test('hides archived lines by default but says how many there are', async () => {
    const element = await render([aLine(), archived]);

    expect(lineItems(element)).toHaveLength(1);
    expect(textOf(element)).toContain('Show archived (1)');
  });

  test('shows them when asked, still counting them', async () => {
    const element = await render([aLine(), archived], [], true);

    expect(lineItems(element)).toHaveLength(2);
    expect(textOf(element)).toContain('Hide archived (1)');
    expect(element.shadowRoot?.querySelector('li.line.archived')).toBeTruthy();
  });

  test('offers to restore an archived line rather than to archive it again', async () => {
    const element = await render([archived], [], true);

    const event = new Promise((resolve) =>
      element.addEventListener('line-archive-requested', resolve, { once: true })
    );
    await click(element, 'Restore');

    expect(((await event) as CustomEvent).detail).toEqual({ id: 'line-2', archived: false });
  });

  test('asks for an Introduction through an intent', async () => {
    const element = await render([]);

    const event = new Promise((resolve) =>
      element.addEventListener('line-introduce-requested', resolve, { once: true })
    );
    await click(element, 'Introduce');

    expect(await event).toBeTruthy();
  });
});
