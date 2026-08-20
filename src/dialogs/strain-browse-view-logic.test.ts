import { describe, it, expect } from 'vitest';
import {
  classifyEmptyState,
  filterAndSortStrains,
  paginateStrains,
  STRAIN_ITEMS_PER_PAGE,
} from './strain-browse-view-logic';
import type { StrainEntry } from '../types';

function makeStrain(overrides: Partial<StrainEntry> = {}): StrainEntry {
  return {
    key: overrides.key ?? 'k1',
    strain: overrides.strain ?? 'Test Strain',
    breeder: overrides.breeder ?? 'Breeder A',
    type: overrides.type ?? 'Hybrid',
    is_stub: overrides.is_stub ?? false,
    ...overrides,
  } as StrainEntry;
}

describe('classifyEmptyState', () => {
  const noCounts: Record<string, number> = {};

  it('returns null when filtered results exist', () => {
    const strains = [makeStrain()];
    expect(classifyEmptyState(strains, 1, '', 'all', noCounts)).toBeNull();
  });

  it('returns first-use when the library is completely empty', () => {
    expect(classifyEmptyState([], 0, '', 'library', noCounts)).toBe('first-use');
  });

  it('returns first-use when empty even with a search query', () => {
    expect(classifyEmptyState([], 0, 'Purple', 'all', noCounts)).toBe('first-use');
  });

  it('returns filter-empty when strains exist but filter narrows to zero', () => {
    const strains = [makeStrain({ strain: 'OG Kush', is_stub: false })];
    const counts: Record<string, number> = {};
    expect(classifyEmptyState(strains, 0, '', 'active', counts)).toBe('filter-empty');
  });

  it('returns search-empty when search has no matches and no filter', () => {
    const strains = [makeStrain()];
    expect(classifyEmptyState(strains, 0, 'NoMatch', 'all', noCounts)).toBe('search-empty');
  });

  it('returns combined-empty when both search and filter are active', () => {
    const strains = [makeStrain({ strain: 'OG Kush' })];
    expect(classifyEmptyState(strains, 0, 'NoMatch', 'active', noCounts)).toBe('combined-empty');
  });

  it('returns search-empty for empty search string with filter that has results', () => {
    const strains = [makeStrain({ strain: 'OG Kush', is_stub: false })];
    expect(classifyEmptyState(strains, 0, 'xyz', 'library', noCounts)).toBe('combined-empty');
  });

  it('returns filter-empty when all results are stubs and filter is library', () => {
    const strains = [makeStrain({ strain: 'Stub Strain', is_stub: true })];
    expect(classifyEmptyState(strains, 0, '', 'library', noCounts)).toBe('filter-empty');
  });
});

describe('filterAndSortStrains', () => {
  const noCounts: Record<string, number> = {};

  it('returns all strains sorted alphabetically when no query and filter is all', () => {
    const strains = [
      makeStrain({ strain: 'Zkittlez' }),
      makeStrain({ strain: 'AK-47' }),
      makeStrain({ strain: 'Blue Dream' }),
    ];
    const result = filterAndSortStrains(strains, '', 'all', noCounts);
    expect(result.map((s) => s.strain)).toEqual(['AK-47', 'Blue Dream', 'Zkittlez']);
  });

  it('filters by search term across strain, breeder, and phenotype', () => {
    const strains = [
      makeStrain({ strain: 'Purple Kush', breeder: 'GrowCo', phenotype: 'Alpha' }),
      makeStrain({ strain: 'Blue Dream', breeder: 'SeedBank', phenotype: 'Beta' }),
    ];
    const result = filterAndSortStrains(strains, 'purple', 'all', noCounts);
    expect(result).toHaveLength(1);
    expect(result[0].strain).toBe('Purple Kush');
  });

  it('supports multi-word search', () => {
    const strains = [
      makeStrain({ strain: 'Purple Kush', breeder: 'GrowCo' }),
      makeStrain({ strain: 'Purple Dream', breeder: 'SeedBank' }),
    ];
    const result = filterAndSortStrains(strains, 'purple growco', 'all', noCounts);
    expect(result).toHaveLength(1);
    expect(result[0].strain).toBe('Purple Kush');
  });

  it('filters stubs with library filter', () => {
    const strains = [
      makeStrain({ strain: 'Real Strain', is_stub: false }),
      makeStrain({ strain: 'Stub Strain', is_stub: true }),
    ];
    const result = filterAndSortStrains(strains, '', 'library', noCounts);
    expect(result).toHaveLength(1);
    expect(result[0].strain).toBe('Real Strain');
  });

  it('filters active strains by plant counts', () => {
    const strains = [
      makeStrain({ strain: 'Active Strain' }),
      makeStrain({ strain: 'Inactive Strain' }),
    ];
    const counts = { 'Active Strain': 3 };
    const result = filterAndSortStrains(strains, '', 'active', counts);
    expect(result).toHaveLength(1);
    expect(result[0].strain).toBe('Active Strain');
  });
});

describe('paginateStrains', () => {
  it('returns all items when under the page limit', () => {
    const strains = Array.from({ length: 5 }, (_, i) => makeStrain({ key: `k${i}` }));
    const { paged, totalPages, currentPage } = paginateStrains(strains, 1);
    expect(paged).toHaveLength(5);
    expect(totalPages).toBe(1);
    expect(currentPage).toBe(1);
  });

  it('paginates correctly at the boundary', () => {
    const strains = Array.from({ length: STRAIN_ITEMS_PER_PAGE + 3 }, (_, i) =>
      makeStrain({ key: `k${i}`, strain: `Strain ${i}` })
    );
    const page1 = paginateStrains(strains, 1);
    expect(page1.paged).toHaveLength(STRAIN_ITEMS_PER_PAGE);
    expect(page1.totalPages).toBe(2);

    const page2 = paginateStrains(strains, 2);
    expect(page2.paged).toHaveLength(3);
  });

  it('clamps page number to valid range', () => {
    const strains = [makeStrain()];
    const { currentPage } = paginateStrains(strains, 999);
    expect(currentPage).toBe(1);
  });

  it('returns at least 1 total page for empty input', () => {
    const { totalPages } = paginateStrains([], 1);
    expect(totalPages).toBe(1);
  });
});
