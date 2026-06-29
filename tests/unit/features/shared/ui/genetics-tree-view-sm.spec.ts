import { describe, it, expect } from 'vitest';
import { buildIndex, type TreeNode } from '../../../../../src/features/shared/ui/genetics-tree-layout';
import {
  visibleNodes,
  computeLayout,
  lineageSets,
  highlightSets,
  hasActiveFilters,
} from '../../../../../src/features/shared/ui/genetics-tree-view-sm';

function node(id: string, gen: string, breeder: string, mother: string | null = null, father: string | null = null): TreeNode {
  return {
    id,
    name: id,
    strain: `${id}-strain`,
    breeder,
    pheno: gen,
    gen,
    type: mother || father ? 'batch' : 'strain',
    parents: { mother, father },
  };
}

// a, b (Acme P1) -> c (Acme F1) -> f (Acme F2);  d (Beta P1) -> e (Beta F1)
const nodes: TreeNode[] = [
  node('a', 'P1', 'Acme'),
  node('b', 'P1', 'Acme'),
  node('c', 'F1', 'Acme', 'a', 'b'),
  node('f', 'F2', 'Acme', 'c'),
  node('d', 'P1', 'Beta'),
  node('e', 'F1', 'Beta', 'd'),
];

const { childrenOf } = buildIndex(nodes);

function ids(ns: TreeNode[]): string[] {
  return ns.map((n) => n.id).sort();
}

describe('genetics-tree-view-sm', () => {
  describe('visibleNodes', () => {
    it('keeps only nodes matching the breeder filter', () => {
      const result = visibleNodes(nodes, { breederFilter: 'Beta', collapsed: new Set(), childrenOf });
      expect(ids(result)).toEqual(['d', 'e']);
    });

    it('hides the whole transitive descendant subtree of a collapsed node, keeping the collapsed node itself', () => {
      // collapse 'a' -> hides c (child) and f (grandchild via c); a, b, d, e stay
      const result = visibleNodes(nodes, { breederFilter: '', collapsed: new Set(['a']), childrenOf });
      expect(ids(result)).toEqual(['a', 'b', 'd', 'e']);
    });

    it('returns every node when there is no filter and nothing collapsed', () => {
      const result = visibleNodes(nodes, { breederFilter: '', collapsed: new Set(), childrenOf });
      expect(ids(result)).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
    });
  });

  describe('computeLayout', () => {
    it('returns null when there are no visible nodes', () => {
      expect(computeLayout([], 'tree', null)).toBeNull();
    });

    it('groups by breeder into bands in families mode', () => {
      const result = computeLayout(nodes, 'families', null);
      expect(result).not.toBeNull();
      const labels = (result!.bands ?? []).map((b) => b.label).sort();
      expect(labels).toEqual(['Acme', 'Beta']);
    });

    it('lays out only the focal subgraph (focal + ancestors + descendants) in lineage mode', () => {
      // focal 'd' (Beta) has no parents and one descendant 'e' — the Acme nodes are excluded
      const result = computeLayout(nodes, 'lineage', 'd');
      expect(result).not.toBeNull();
      expect(Object.keys(result!.nodes).sort()).toEqual(['d', 'e']);
    });

    it('lays out every visible node top-down in the default mode', () => {
      const result = computeLayout(nodes, 'tree', null);
      expect(result).not.toBeNull();
      expect(Object.keys(result!.nodes).sort()).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
    });
  });

  describe('lineageSets', () => {
    it('returns empty ancestor and descendant sets when there is no focal node', () => {
      const { ancestors, descendants } = lineageSets(nodes, null);
      expect(ancestors.size).toBe(0);
      expect(descendants.size).toBe(0);
    });

    it('returns the focal node ancestors and descendants (excluding the focal itself)', () => {
      const { ancestors, descendants } = lineageSets(nodes, 'c');
      expect([...ancestors].sort()).toEqual(['a', 'b']);
      expect([...descendants].sort()).toEqual(['f']);
    });
  });

  describe('highlightSets', () => {
    it('lets hover win over selection and resolves its lineage', () => {
      const { highlightId, ancestors, descendants } = highlightSets(nodes, 'c', 'd');
      expect(highlightId).toBe('c');
      expect([...ancestors].sort()).toEqual(['a', 'b']);
      expect([...descendants].sort()).toEqual(['f']);
    });

    it('falls back to selection when nothing is hovered', () => {
      const { highlightId } = highlightSets(nodes, null, 'd');
      expect(highlightId).toBe('d');
    });

    it('returns no highlight and empty sets when nothing is hovered or selected', () => {
      const { highlightId, ancestors, descendants } = highlightSets(nodes, null, null);
      expect(highlightId).toBeNull();
      expect(ancestors.size).toBe(0);
      expect(descendants.size).toBe(0);
    });
  });

  describe('hasActiveFilters', () => {
    const none = { collapsed: new Set<string>(), genFilter: null, selectedId: null, search: '' };

    it('is false when nothing is collapsed, filtered, selected, or searched', () => {
      expect(hasActiveFilters(none)).toBe(false);
    });

    it.each([
      ['a collapsed node', { ...none, collapsed: new Set(['a']) }],
      ['a generation filter', { ...none, genFilter: 'F1' }],
      ['a selection', { ...none, selectedId: 'c' }],
      ['a search term', { ...none, search: 'kush' }],
    ])('is true with %s', (_label, opts) => {
      expect(hasActiveFilters(opts)).toBe(true);
    });
  });
});
