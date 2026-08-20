import { describe, it, expect } from 'vitest';
import {
  applyLibraryFilter,
  filterAndSortStrains,
  paginateStrains,
  STRAIN_ITEMS_PER_PAGE,
} from '../../../src/dialogs/strain-browse-view-logic';
import type { StrainEntry } from '../../../src/types';

function makeStrain(overrides: Partial<StrainEntry> = {}): StrainEntry {
  return {
    key: 'k1',
    strain: 'Test Strain',
    breeder: 'Some Breeder',
    phenotype: '',
    type: 'hybrid',
    is_stub: false,
    lineage: '',
    parents: [],
    ...overrides,
  } as unknown as StrainEntry;
}

const EMPTY_COUNTS: Record<string, number> = {};

// ─── applyLibraryFilter ───────────────────────────────────────────────────────

describe('applyLibraryFilter', () => {
  const stub = makeStrain({ strain: 'Stub', is_stub: true });
  const real = makeStrain({ strain: 'Real', is_stub: false });
  const strains = [stub, real];

  it('"library" excludes stubs', () => {
    expect(applyLibraryFilter(strains, 'library', EMPTY_COUNTS)).toEqual([real]);
  });

  it('"all" returns every strain including stubs', () => {
    expect(applyLibraryFilter(strains, 'all', EMPTY_COUNTS)).toEqual([stub, real]);
  });

  it('"active" returns only strains with active plant count > 0', () => {
    const counts = { Real: 2, Stub: 0 };
    expect(applyLibraryFilter(strains, 'active', counts)).toEqual([real]);
  });

  it('"active" returns empty list when no active plants', () => {
    expect(applyLibraryFilter(strains, 'active', EMPTY_COUNTS)).toEqual([]);
  });

  it('"active" uses strain name as the count key', () => {
    const counts = { Stub: 3 };
    expect(applyLibraryFilter(strains, 'active', counts)).toEqual([stub]);
  });
});

// ─── filterAndSortStrains ─────────────────────────────────────────────────────

describe('filterAndSortStrains', () => {
  const strains = [
    makeStrain({ strain: 'Zkittlez', breeder: 'Jungle Boys', phenotype: 'Pheno 3' }),
    makeStrain({ strain: 'Blueberry', breeder: 'DJ Short', phenotype: '' }),
    makeStrain({ strain: 'Apple Fritter', breeder: 'Lumpy', phenotype: '' }),
    makeStrain({ strain: 'Zkittlez Cake', breeder: 'Jungle Boys', phenotype: '' }),
  ];

  it('returns all strains alphabetically when query is empty', () => {
    const result = filterAndSortStrains(strains, '', 'all', EMPTY_COUNTS);
    expect(result.map((s) => s.strain)).toEqual([
      'Apple Fritter',
      'Blueberry',
      'Zkittlez',
      'Zkittlez Cake',
    ]);
  });

  it('matches by strain name (case-insensitive)', () => {
    const result = filterAndSortStrains(strains, 'blue', 'all', EMPTY_COUNTS);
    expect(result.map((s) => s.strain)).toEqual(['Blueberry']);
  });

  it('matches by breeder', () => {
    const result = filterAndSortStrains(strains, 'jungle', 'all', EMPTY_COUNTS);
    expect(result.map((s) => s.strain)).toEqual(['Zkittlez', 'Zkittlez Cake']);
  });

  it('matches by phenotype', () => {
    const result = filterAndSortStrains(strains, 'pheno 3', 'all', EMPTY_COUNTS);
    expect(result.map((s) => s.strain)).toEqual(['Zkittlez']);
  });

  it('requires all search terms to match (AND logic)', () => {
    const result = filterAndSortStrains(strains, 'zkittlez cake', 'all', EMPTY_COUNTS);
    expect(result.map((s) => s.strain)).toEqual(['Zkittlez Cake']);
  });

  it('applies the library filter before searching', () => {
    const withStub = [
      ...strains,
      makeStrain({ strain: 'Stub Z', is_stub: true }),
    ];
    const result = filterAndSortStrains(withStub, 'z', 'library', EMPTY_COUNTS);
    expect(result.every((s) => !s.is_stub)).toBe(true);
  });

  it('returns empty array when nothing matches', () => {
    expect(filterAndSortStrains(strains, 'xxxxxxx', 'all', EMPTY_COUNTS)).toEqual([]);
  });
});

// ─── paginateStrains ──────────────────────────────────────────────────────────

describe('paginateStrains', () => {
  const strains = Array.from({ length: 35 }, (_, i) =>
    makeStrain({ strain: `Strain ${i + 1}`, key: `k${i}` })
  );

  it('returns first page items', () => {
    const { paged, totalPages, currentPage } = paginateStrains(strains, 1, 15);
    expect(paged).toHaveLength(15);
    expect(paged[0].strain).toBe('Strain 1');
    expect(totalPages).toBe(3);
    expect(currentPage).toBe(1);
  });

  it('returns last (partial) page items', () => {
    const { paged, currentPage } = paginateStrains(strains, 3, 15);
    expect(paged).toHaveLength(5);
    expect(currentPage).toBe(3);
  });

  it('clamps page below 1 to page 1', () => {
    const { currentPage } = paginateStrains(strains, 0, 15);
    expect(currentPage).toBe(1);
  });

  it('clamps page above totalPages to totalPages', () => {
    const { currentPage } = paginateStrains(strains, 99, 15);
    expect(currentPage).toBe(3);
  });

  it('handles empty list gracefully', () => {
    const { paged, totalPages, currentPage } = paginateStrains([], 1);
    expect(paged).toEqual([]);
    expect(totalPages).toBe(1);
    expect(currentPage).toBe(1);
  });

  it('uses STRAIN_ITEMS_PER_PAGE as default', () => {
    const large = Array.from({ length: STRAIN_ITEMS_PER_PAGE + 1 }, (_, i) =>
      makeStrain({ strain: `S${i}`, key: `k${i}` })
    );
    const { totalPages } = paginateStrains(large, 1);
    expect(totalPages).toBe(2);
  });
});
