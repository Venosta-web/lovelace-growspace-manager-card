import { expect, test, describe, vi, beforeEach } from 'vitest';
import { fixture } from '@open-wc/testing-helpers';

import { hassCall } from '../../src/services/hass-call';
import { GrowspaceTcCultures } from '../../src/features/tc/containers/growspace-tc-cultures.container';
import { strainLibrary$ } from '../../src/slices/strain';
import { resetTcPresence, type CultureLine } from '../../src/slices/tc';
import { WS_TC_LIST_CULTURE_LINES, WS_TC_RELINK_PHENOTYPE } from '../../src/slices/tc';

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
function answer(options: { lines?: CultureLine[]; library?: unknown | Error }): void {
  hassCallMock.mockImplementation(async (command: string) => {
    if (command === WS_TC_LIST_CULTURE_LINES) {
      return { culture_lines: options.lines ?? [] };
    }
    if (options.library instanceof Error) throw options.library;
    return options.library ?? { strains: {} };
  });
}

async function render(): Promise<GrowspaceTcCultures> {
  const element = await fixture<GrowspaceTcCultures>(
    '<growspace-tc-cultures></growspace-tc-cultures>'
  );
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
