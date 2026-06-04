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
