import { describe, it, expect, vi, beforeEach } from 'vitest';
import { hassCall } from '../../services/hass-call';
import {
  cultureLines$,
  draftIntroduction,
  fetchCultureLines,
  introduceCultureLine,
  phenotypeNameIndex,
  phenotypeOptions,
  relinkPhenotype,
  resetTcPresence,
  resolvePhenotype,
  setCultureLineArchived,
  WS_TC_INTRODUCE_CULTURE_LINE,
  WS_TC_LIST_CULTURE_LINES,
  WS_TC_RELINK_PHENOTYPE,
  WS_TC_SET_CULTURE_LINE_ARCHIVED,
  type CultureLine,
} from './index';
import { CultureLineMutationSchema, CultureLineSchema, CultureLinesResponseSchema } from './schema';
import type { StrainEntry } from '../../types';

vi.mock('../../services/hass-call', () => ({
  hassCall: vi.fn(),
}));

const hassCallMock = vi.mocked(hassCall);

const aCulture = (overrides: Record<string, unknown> = {}) => ({
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

const aStrain = (strain: string, phenotype: string): StrainEntry =>
  ({ strain, phenotype, key: `${strain}|${phenotype}` }) as StrainEntry;

beforeEach(() => {
  resetTcPresence();
  vi.clearAllMocks();
});

describe('fetchCultureLines', () => {
  it('publishes the board the backend sent, in the order it sent it', async () => {
    const lines = [aLine({ id: 'z' }), aLine({ id: 'a' })];
    hassCallMock.mockResolvedValue({ culture_lines: lines });

    const result = await fetchCultureLines();

    expect(hassCallMock).toHaveBeenCalledWith(
      WS_TC_LIST_CULTURE_LINES,
      {},
      CultureLinesResponseSchema
    );
    expect(result.map((line) => line.id)).toEqual(['z', 'a']);
    expect(cultureLines$.get()).toEqual(lines);
  });

  it('leaves the board alone when the call fails', async () => {
    cultureLines$.set([aLine()]);
    hassCallMock.mockRejectedValue(new Error('nope'));

    await expect(fetchCultureLines()).rejects.toThrow('nope');
    expect(cultureLines$.get()).toHaveLength(1);
  });
});

describe('introduceCultureLine', () => {
  it('sends the draft flat and adds the returned line to the board', async () => {
    const line = aLine();
    hassCallMock.mockResolvedValue({ line });
    const draft = { ...draftIntroduction(), phenotype_id: 'x|1', phenotype_name: 'X' };

    const result = await introduceCultureLine(draft);

    expect(hassCallMock).toHaveBeenCalledWith(
      WS_TC_INTRODUCE_CULTURE_LINE,
      { ...draft },
      CultureLineMutationSchema
    );
    expect(result).toEqual(line);
    expect(cultureLines$.get()).toEqual([line]);
  });

  it('places the new line where a refetch would put it', async () => {
    cultureLines$.set([
      aLine({ id: 'a', phenotype: { ...aLine().phenotype, name_snapshot: 'Aaa' } }),
      aLine({ id: 'z', phenotype: { ...aLine().phenotype, name_snapshot: 'Zzz' } }),
    ]);
    const middle = aLine({ id: 'm', phenotype: { ...aLine().phenotype, name_snapshot: 'Mmm' } });
    hassCallMock.mockResolvedValue({ line: middle });

    await introduceCultureLine(draftIntroduction());

    expect(cultureLines$.get().map((line) => line.id)).toEqual(['a', 'm', 'z']);
  });

  it('starts a draft with an interval for both stages', () => {
    expect(draftIntroduction().replate_interval_days).toEqual({
      multiplication: 30,
      rooting: 21,
    });
    expect(draftIntroduction().plantlet_count).toBeNull();
  });
});

describe('relinkPhenotype', () => {
  it('sends both halves of the reference and replaces the line', async () => {
    cultureLines$.set([aLine()]);
    const relinked = aLine({
      phenotype: {
        id: 'Gelato 33|Cut B',
        name_snapshot: 'Gelato 33 — Cut B',
        snapshot_at: '2026-03-30T08:05:00+00:00',
      },
    });
    hassCallMock.mockResolvedValue({ line: relinked });

    await relinkPhenotype('line-1', 'Gelato 33|Cut B', 'Gelato 33 — Cut B');

    expect(hassCallMock).toHaveBeenCalledWith(
      WS_TC_RELINK_PHENOTYPE,
      {
        line_id: 'line-1',
        phenotype_id: 'Gelato 33|Cut B',
        phenotype_name: 'Gelato 33 — Cut B',
      },
      CultureLineMutationSchema
    );
    expect(cultureLines$.get()).toEqual([relinked]);
  });
});

describe('setCultureLineArchived', () => {
  it('archives without dropping the line from the board', async () => {
    cultureLines$.set([aLine()]);
    const archived = aLine({ archived_at: '2026-03-30T08:05:00+00:00' });
    hassCallMock.mockResolvedValue({ line: archived });

    await setCultureLineArchived('line-1', true);

    expect(hassCallMock).toHaveBeenCalledWith(
      WS_TC_SET_CULTURE_LINE_ARCHIVED,
      { line_id: 'line-1', archived: true },
      CultureLineMutationSchema
    );
    expect(cultureLines$.get()).toEqual([archived]);
  });

  it('re-sorts an archived line below the live ones', async () => {
    const live = aLine({ id: 'z', phenotype: { ...aLine().phenotype, name_snapshot: 'Zzz' } });
    cultureLines$.set([aLine({ id: 'a' }), live]);
    hassCallMock.mockResolvedValue({
      line: aLine({ id: 'a', archived_at: '2026-03-30T08:05:00+00:00' }),
    });

    await setCultureLineArchived('a', true);

    expect(cultureLines$.get().map((line) => line.id)).toEqual(['z', 'a']);
  });
});

describe('the client-side phenotype join', () => {
  it('offers every strain-library entry by the key Growspace Manager already uses', () => {
    expect(phenotypeOptions([aStrain('Blue Dream', 'Pheno 2')])).toEqual([
      { id: 'Blue Dream|Pheno 2', name: 'Blue Dream — Pheno 2' },
    ]);
  });

  it('does not show "default" as a phenotype name', () => {
    expect(phenotypeOptions([aStrain('Zkittlez', 'default')])).toEqual([
      { id: 'Zkittlez|default', name: 'Zkittlez' },
    ]);
  });

  it('resolves a reference to the library name, not to the snapshot', () => {
    const names = phenotypeNameIndex([aStrain('Blue Dream', 'Renamed')]);
    const reference = {
      id: 'Blue Dream|Renamed',
      name_snapshot: 'Blue Dream — Old name',
      snapshot_at: '2026-01-04T09:12:00+00:00',
    };

    expect(resolvePhenotype(reference, names, true)).toEqual({
      status: 'resolved',
      name: 'Blue Dream — Renamed',
    });
  });

  it('reports a phenotype missing only once the library has loaded', () => {
    const reference = {
      id: 'Gone|Pheno 1',
      name_snapshot: 'Gone — Pheno 1',
      snapshot_at: '2026-01-04T09:12:00+00:00',
    };
    const empty = phenotypeNameIndex([]);

    expect(resolvePhenotype(reference, empty, true)).toEqual({
      status: 'missing',
      name: 'Gone — Pheno 1',
    });
    expect(resolvePhenotype(reference, empty, false)).toEqual({
      status: 'unresolved',
      name: 'Gone — Pheno 1',
    });
  });
});
