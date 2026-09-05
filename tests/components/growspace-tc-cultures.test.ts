import { expect, test, describe, vi, beforeEach } from 'vitest';
import { fixture } from '@open-wc/testing-helpers';

import { hassCall } from '../../src/services/hass-call';
import { GrowspaceTcCultures } from '../../src/features/tc/containers/growspace-tc-cultures.container';
import { strainLibrary$ } from '../../src/slices/strain';
import { cultureMedia$, resetTcPresence, type CultureLine } from '../../src/slices/tc';
import {
  WS_TC_LIST_CULTURE_LINES,
  WS_TC_MAINTENANCE_HISTORY,
  WS_TC_RELINK_PHENOTYPE,
  WS_TC_REPLATE,
} from '../../src/slices/tc';

vi.mock('../../src/services/hass-call', () => ({
  hassCall: vi.fn(),
  callService: vi.fn(),
  callFetch: vi.fn(),
  setHass: vi.fn(),
}));

const hassCallMock = vi.mocked(hassCall);

if (!customElements.get('growspace-tc-cultures')) {
  customElements.define('growspace-tc-cultures', GrowspaceTcCultures);
}

const aLine = (overrides: Record<string, unknown> = {}): CultureLine =>
  ({
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
    cultures: [],
    ...overrides,
  }) as CultureLine;

const aCulture = (overrides: Record<string, unknown> = {}) => ({
  id: 'culture-1',
  line_id: 'line-1',
  stage: 'multiplication',
  status: 'active',
  started_at: '2026-01-04T09:12:00+00:00',
  last_replated_at: '2026-01-04T09:12:00+00:00',
  plantlet_count: 6,
  location: 'Shelf A',
  // Long past, so the vessel is overdue whenever this suite runs and the
  // worklist's default filter keeps it.
  replate_due_at: '2020-02-03T09:12:00+00:00',
  ...overrides,
});

/** The `get_strain_library` reply that yields one phenotype. */
const A_LIBRARY = {
  strains: {
    'Blue Dream': { meta: {}, phenotypes: { 'Pheno 2': {} } },
  },
};

/**
 * Answer each WebSocket command the container issues.
 *
 * The board and the strain library are fetched independently, so a test says
 * what each of them does rather than sharing one mock resolution.
 */
function answer(options: {
  lines?: CultureLine[];
  library?: unknown | Error;
  history?: unknown[];
}): void {
  hassCallMock.mockImplementation(async (command: string) => {
    if (command === WS_TC_LIST_CULTURE_LINES) {
      return { culture_lines: options.lines ?? [] };
    }
    if (command === WS_TC_MAINTENANCE_HISTORY) {
      return { actions: options.history ?? [] };
    }
    if (options.library instanceof Error) throw options.library;
    return options.library ?? { strains: {} };
  });
}

async function render(maintenance = false): Promise<GrowspaceTcCultures> {
  const element = await fixture<GrowspaceTcCultures>(
    '<growspace-tc-cultures></growspace-tc-cultures>'
  );
  element.maintenance = maintenance;
  await vi.waitFor(() =>
    expect((element as unknown as { _loading: boolean })._loading).toBe(false)
  );
  await element.updateComplete;
  const board = element.shadowRoot?.querySelector('growspace-tc-culture-board');
  await (board as unknown as { updateComplete: Promise<unknown> })?.updateComplete;
  return element;
}

const board = (element: GrowspaceTcCultures) =>
  element.shadowRoot?.querySelector('growspace-tc-culture-board');

const boardText = (element: GrowspaceTcCultures): string =>
  board(element)?.shadowRoot?.textContent ?? '';

const worklist = (element: GrowspaceTcCultures) =>
  element.shadowRoot?.querySelector('growspace-tc-worklist');

const dialog = (element: GrowspaceTcCultures) =>
  element.shadowRoot?.querySelector('growspace-tc-action-dialog');

async function requestAction(
  element: GrowspaceTcCultures,
  action: string,
  cultureId = 'culture-1'
): Promise<void> {
  board(element)?.dispatchEvent(
    new CustomEvent('culture-action-requested', {
      detail: { cultureId, action },
      bubbles: true,
      composed: true,
    })
  );
  await vi.waitFor(() => expect(dialog(element)).toBeTruthy());
  await element.updateComplete;
}

beforeEach(() => {
  resetTcPresence();
  strainLibrary$.set([]);
  localStorage.clear();
  vi.clearAllMocks();
});

describe('GrowspaceTcCultures — the phenotype join', () => {
  test('shows a resolved line under the library`s current name', async () => {
    answer({ lines: [aLine()], library: A_LIBRARY });

    const element = await render();

    expect(boardText(element)).toContain('Blue Dream — Pheno 2');
    expect(boardText(element)).not.toContain('no longer in your strain library');
  });

  test('reports a deleted phenotype as missing, from its snapshot', async () => {
    answer({ lines: [aLine()], library: { strains: {} } });

    const element = await render();

    expect(boardText(element)).toContain('Blue Dream — Pheno 2');
    expect(boardText(element)).toContain('no longer in your strain library');
  });

  test('accuses nothing of being missing when the library could not be fetched', async () => {
    answer({ lines: [aLine()], library: new Error('offline') });

    const element = await render();

    expect(boardText(element)).toContain('Blue Dream — Pheno 2');
    expect(boardText(element)).not.toContain('no longer in your strain library');
  });

  test('renders the board even though the library failed', async () => {
    answer({ lines: [aLine()], library: new Error('offline') });

    const element = await render();

    expect(board(element)?.shadowRoot?.querySelectorAll('li.line')).toHaveLength(1);
    expect(element.shadowRoot?.querySelector('.error')).toBeNull();
  });

  test('surfaces a board fetch failure', async () => {
    hassCallMock.mockImplementation(async (command: string) => {
      if (command === WS_TC_LIST_CULTURE_LINES) throw new Error('board is down');
      return { strains: {} };
    });

    const element = await render();

    expect(element.shadowRoot?.querySelector('.error')?.textContent).toContain('board is down');
  });
});

describe('GrowspaceTcCultures — repairing a reference', () => {
  test('re-links through the picker, sending the ID and the name', async () => {
    answer({ lines: [aLine()], library: A_LIBRARY });
    const element = await render();

    board(element)?.dispatchEvent(
      new CustomEvent('line-relink-requested', {
        detail: { id: 'line-1' },
        bubbles: true,
        composed: true,
      })
    );
    await element.updateComplete;

    const picker = element.shadowRoot?.querySelector('growspace-tc-phenotype-picker');
    expect(picker).toBeTruthy();

    hassCallMock.mockResolvedValueOnce({
      line: aLine({
        phenotype: {
          id: 'Gelato 33|Cut B',
          name_snapshot: 'Gelato 33 — Cut B',
          snapshot_at: '2026-03-30T08:05:00+00:00',
        },
      }),
    });
    picker?.dispatchEvent(
      new CustomEvent('phenotype-selected', {
        detail: { id: 'Gelato 33|Cut B', name: 'Gelato 33 — Cut B' },
        bubbles: true,
        composed: true,
      })
    );
    await vi.waitFor(() =>
      expect(hassCallMock).toHaveBeenCalledWith(
        WS_TC_RELINK_PHENOTYPE,
        {
          line_id: 'line-1',
          phenotype_id: 'Gelato 33|Cut B',
          phenotype_name: 'Gelato 33 — Cut B',
        },
        expect.anything()
      )
    );
  });

  test('archives a line without dropping it from the board', async () => {
    answer({ lines: [aLine()], library: A_LIBRARY });
    const element = await render();

    hassCallMock.mockResolvedValueOnce({
      line: aLine({ archived_at: '2026-03-30T08:05:00+00:00' }),
    });
    board(element)?.dispatchEvent(
      new CustomEvent('line-archive-requested', {
        detail: { id: 'line-1', archived: true },
        bubbles: true,
        composed: true,
      })
    );
    await vi.waitFor(() => expect(hassCallMock).toHaveBeenCalledTimes(3));
    await element.updateComplete;
    await (board(element) as unknown as { updateComplete: Promise<unknown> })?.updateComplete;

    expect(boardText(element)).toContain('Show archived (1)');
  });
});

describe('GrowspaceTcCultures — the introduction', () => {
  test('opens the form with the library`s phenotypes in it', async () => {
    answer({ lines: [], library: A_LIBRARY });
    const element = await render();

    board(element)?.dispatchEvent(
      new CustomEvent('line-introduce-requested', { bubbles: true, composed: true })
    );
    await element.updateComplete;

    const form = element.shadowRoot?.querySelector('growspace-tc-introduction-form');
    expect((form as unknown as { phenotypes: unknown[] }).phenotypes).toEqual([
      { id: 'Blue Dream|Pheno 2', name: 'Blue Dream — Pheno 2' },
    ]);
  });

  test('keeps the form open holding the draft when the backend rejects it', async () => {
    answer({ lines: [], library: A_LIBRARY });
    const element = await render();

    board(element)?.dispatchEvent(
      new CustomEvent('line-introduce-requested', { bubbles: true, composed: true })
    );
    await element.updateComplete;

    hassCallMock.mockRejectedValueOnce(new Error('Rooting interval must be between 1 and 365.'));
    element.shadowRoot?.querySelector('growspace-tc-introduction-form')?.dispatchEvent(
      new CustomEvent('introduction-requested', {
        detail: { draft: { phenotype_id: 'x' } },
        bubbles: true,
        composed: true,
      })
    );
    await vi.waitFor(() =>
      expect(
        (
          element.shadowRoot?.querySelector('growspace-tc-introduction-form') as unknown as {
            error: string;
          }
        )?.error
      ).toContain('Rooting interval')
    );
  });
});

describe('GrowspaceTcCultures — the worklist', () => {
  test('lands on the worklist, above the board', async () => {
    answer({ lines: [aLine({ cultures: [aCulture()] })], library: A_LIBRARY });

    const element = await render(true);

    const children = Array.from(element.shadowRoot?.querySelectorAll('*') ?? []).map(
      (node) => node.localName
    );
    expect(children.indexOf('growspace-tc-worklist')).toBeGreaterThan(-1);
    expect(children.indexOf('growspace-tc-worklist')).toBeLessThan(
      children.indexOf('growspace-tc-culture-board')
    );
  });

  test('builds the worklist from the board it fetched', async () => {
    answer({ lines: [aLine({ cultures: [aCulture()] })], library: A_LIBRARY });

    const element = await render(true);

    const entries = (worklist(element) as unknown as { entries: Array<{ urgency: string }> })
      .entries;
    expect(entries).toHaveLength(1);
    expect(entries[0].urgency).toBe('overdue');
  });

  test('offers the shelves in use as the worklist`s filter', async () => {
    answer({
      lines: [aLine({ cultures: [aCulture(), aCulture({ id: 'c2', location: 'Shelf B' })] })],
      library: A_LIBRARY,
    });

    const element = await render(true);

    expect((worklist(element) as unknown as { locations: string[] }).locations).toEqual([
      'Shelf A',
      'Shelf B',
    ]);
  });

  test('renders no worklist and no action buttons when TC cannot serve them', async () => {
    answer({ lines: [aLine({ cultures: [aCulture()] })], library: A_LIBRARY });

    const element = await render(false);

    expect(worklist(element)).toBeNull();
    expect((board(element) as unknown as { actionable: boolean }).actionable).toBe(false);
  });
});

describe('GrowspaceTcCultures — recording an act', () => {
  test('opens a dialog over the vessel and fetches its history', async () => {
    answer({
      lines: [aLine({ cultures: [aCulture()] })],
      library: A_LIBRARY,
      history: [
        {
          id: 'action-1',
          culture_id: 'culture-1',
          line_id: 'line-1',
          action: 'note',
          recorded_at: '2026-02-03T09:20:00+00:00',
          note: 'Looking good.',
          medium_id: null,
          medium_version: null,
          vessels: [],
          reason: null,
          stage: null,
        },
      ],
    });
    const element = await render(true);

    await requestAction(element, 'replate');

    expect(hassCallMock).toHaveBeenCalledWith(
      WS_TC_MAINTENANCE_HISTORY,
      { culture_id: 'culture-1' },
      expect.anything()
    );
    await vi.waitFor(() =>
      expect((dialog(element) as unknown as { history: unknown[] }).history).toHaveLength(1)
    );
    expect((dialog(element) as unknown as { lineName: string }).lineName).toBe(
      'Blue Dream — Pheno 2'
    );
  });

  test('hands the dialog the media the replate can pin', async () => {
    answer({ lines: [aLine({ cultures: [aCulture()] })], library: A_LIBRARY });
    cultureMedia$.set([{ id: 'medium-1', name: 'MS', current_version: 2 } as never]);
    const element = await render(true);

    await requestAction(element, 'replate');

    expect((dialog(element) as unknown as { media: unknown[] }).media).toHaveLength(1);
  });

  test('records the act and closes the dialog', async () => {
    answer({ lines: [aLine({ cultures: [aCulture()] })], library: A_LIBRARY });
    const element = await render(true);
    await requestAction(element, 'replate');

    hassCallMock.mockResolvedValueOnce({
      line: aLine({ cultures: [aCulture({ plantlet_count: 5 })] }),
      action: {
        id: 'action-1',
        culture_id: 'culture-1',
        line_id: 'line-1',
        action: 'replate',
        recorded_at: '2026-02-03T09:20:00+00:00',
        note: '',
        medium_id: 'medium-1',
        medium_version: 1,
        vessels: [],
        reason: null,
        stage: null,
      },
    });
    dialog(element)?.dispatchEvent(
      new CustomEvent('maintenance-requested', {
        detail: {
          request: {
            action: 'replate',
            cultureId: 'culture-1',
            draft: { medium_id: 'medium-1', medium_version: 1, vessels: [{}], note: '' },
          },
        },
        bubbles: true,
        composed: true,
      })
    );

    await vi.waitFor(() =>
      expect(hassCallMock).toHaveBeenCalledWith(
        WS_TC_REPLATE,
        expect.objectContaining({ culture_id: 'culture-1', medium_id: 'medium-1' }),
        expect.anything()
      )
    );
    await vi.waitFor(() => expect(dialog(element)).toBeNull());
  });

  test('keeps the dialog open holding the draft when the backend rejects it', async () => {
    answer({ lines: [aLine({ cultures: [aCulture()] })], library: A_LIBRARY });
    const element = await render(true);
    await requestAction(element, 'discard');

    hassCallMock.mockRejectedValueOnce(new Error('That culture has already been discarded.'));
    dialog(element)?.dispatchEvent(
      new CustomEvent('maintenance-requested', {
        detail: {
          request: { action: 'discard', cultureId: 'culture-1', reason: 'spent', note: '' },
        },
        bubbles: true,
        composed: true,
      })
    );

    await vi.waitFor(() =>
      expect((dialog(element) as unknown as { error: string })?.error).toContain(
        'already been discarded'
      )
    );
  });

  test('opens the dialog even when the vessel`s history could not be read', async () => {
    hassCallMock.mockImplementation(async (command: string) => {
      if (command === WS_TC_LIST_CULTURE_LINES) {
        return { culture_lines: [aLine({ cultures: [aCulture()] })] };
      }
      if (command === WS_TC_MAINTENANCE_HISTORY) throw new Error('history is down');
      return A_LIBRARY;
    });
    const element = await render(true);

    await requestAction(element, 'note');

    expect((dialog(element) as unknown as { history: unknown[] }).history).toEqual([]);
    expect(element.shadowRoot?.querySelector('.error')).toBeNull();
  });

  test('ignores an action for a vessel the board does not hold', async () => {
    answer({ lines: [aLine({ cultures: [aCulture()] })], library: A_LIBRARY });
    const element = await render(true);

    board(element)?.dispatchEvent(
      new CustomEvent('culture-action-requested', {
        detail: { cultureId: 'gone', action: 'note' },
        bubbles: true,
        composed: true,
      })
    );
    await element.updateComplete;

    expect(dialog(element)).toBeNull();
  });
});

test('a failed bridge closes the completed action and explains manual recovery', async () => {
  answer({ lines: [aLine({ cultures: [aCulture()] })], library: A_LIBRARY });
  const element = await render(true);
  await requestAction(element, 'graduate');
  hassCallMock.mockResolvedValueOnce({
    line: aLine({ cultures: [aCulture({ status: 'graduated' })] }),
    action: { action: 'graduate', plant_id: null },
  });
  dialog(element)?.dispatchEvent(
    new CustomEvent('maintenance-requested', {
      detail: {
        request: {
          action: 'graduate',
          cultureId: 'culture-1',
          note: '',
          plant: {
            growspace_id: 'tent',
            strain: 'Blue Dream',
            phenotype: 'Pheno 2',
            row: 1,
            col: 1,
          },
        },
      },
      bubbles: true,
      composed: true,
    })
  );
  await vi.waitFor(() => expect(dialog(element)).toBeNull());
  expect(element.shadowRoot?.textContent).toContain(
    'Check Growspace Manager before adding a plant manually'
  );
});
