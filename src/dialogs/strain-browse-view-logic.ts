import type { StrainEntry } from '../types';
import type { LibraryFilter } from './gs-filter-chips';

export const STRAIN_ITEMS_PER_PAGE = 15;

export function applyLibraryFilter(
  strains: StrainEntry[],
  filter: LibraryFilter,
  activePlantCounts: Record<string, number>
): StrainEntry[] {
  if (filter === 'active') return strains.filter((s) => (activePlantCounts[s.strain] ?? 0) > 0);
  if (filter === 'library') return strains.filter((s) => !s.is_stub);
  return strains;
}

export function filterAndSortStrains(
  strains: StrainEntry[],
  query: string,
  filter: LibraryFilter,
  activePlantCounts: Record<string, number>
): StrainEntry[] {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 0);

  return applyLibraryFilter(strains, filter, activePlantCounts)
    .filter((s) => {
      if (terms.length === 0) return true;
      const text = `${s.strain} ${s.breeder || ''} ${s.phenotype || ''}`.toLowerCase();
      return terms.every((term) => text.includes(term));
    })
    .sort((a, b) => a.strain.localeCompare(b.strain));
}

export function paginateStrains(
  strains: StrainEntry[],
  page: number,
  itemsPerPage = STRAIN_ITEMS_PER_PAGE
): { paged: StrainEntry[]; totalPages: number; currentPage: number } {
  const totalPages = Math.max(1, Math.ceil(strains.length / itemsPerPage));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const start = (currentPage - 1) * itemsPerPage;
  return { paged: strains.slice(start, start + itemsPerPage), totalPages, currentPage };
}

export type EmptyStateReason = 'first-use' | 'filter-empty' | 'search-empty' | 'combined-empty';

/**
 * Determines why the strain result set is empty so the UI can render
 * a context-aware empty state with the right recovery action.
 *
 * Returns `null` when the filtered result set is non-empty.
 */
export function classifyEmptyState(
  allStrains: StrainEntry[],
  filteredCount: number,
  query: string,
  filter: LibraryFilter,
  activePlantCounts: Record<string, number>
): EmptyStateReason | null {
  if (filteredCount > 0) return null;
  if (allStrains.length === 0) return 'first-use';

  const hasSearch = query.trim().length > 0;
  const hasFilter = filter !== 'all';

  if (hasSearch && hasFilter) {
    return 'combined-empty';
  }
  if (hasSearch) {
    return 'search-empty';
  }
  if (hasFilter) {
    // Confirm the filter itself is what narrows to zero
    const filterAloneCount = applyLibraryFilter(allStrains, filter, activePlantCounts).length;
    if (filterAloneCount === 0) return 'filter-empty';
    return 'search-empty';
  }

  return 'first-use';
}
