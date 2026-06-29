import { describe, it, expect } from 'vitest';
import { buildIndex, type TreeNode } from '../../../../../src/features/shared/ui/genetics-tree-layout';
import {
  visibleNodes,
  computeLayout,
  lineageSets,
  highlightSets,
  hasActiveFilters,
  createInitialSM,
  transition,
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

  describe('transition', () => {
    it('starts idle: tree mode, no focal/selection/filters', () => {
      const sm = createInitialSM();
      expect(sm).toEqual({
        mode: 'tree',
        focalId: null,
        breederFilter: '',
        collapsed: new Set(),
        selectedId: null,
        search: '',
        genFilter: null,
      });
    });

    it('FOCUS_NODE enters lineage mode focused on and selecting the node', () => {
      const sm = transition(createInitialSM(), { type: 'FOCUS_NODE', id: 'c' });
      expect(sm.mode).toBe('lineage');
      expect(sm.focalId).toBe('c');
      expect(sm.selectedId).toBe('c');
    });

    it('NODE_CLICKED toggles selection on and off for the same node', () => {
      const once = transition(createInitialSM(), { type: 'NODE_CLICKED', id: 'c' });
      expect(once.selectedId).toBe('c');
      const twice = transition(once, { type: 'NODE_CLICKED', id: 'c' });
      expect(twice.selectedId).toBeNull();
    });

    it('NODE_CLICKED switches selection to a different node', () => {
      const sm = transition(
        transition(createInitialSM(), { type: 'NODE_CLICKED', id: 'c' }),
        { type: 'NODE_CLICKED', id: 'd' }
      );
      expect(sm.selectedId).toBe('d');
    });

    it('CLEAR_FOCUS drops focal + selection and returns lineage mode to tree', () => {
      const focused = transition(createInitialSM(), { type: 'FOCUS_NODE', id: 'c' });
      const cleared = transition(focused, { type: 'CLEAR_FOCUS' });
      expect(cleared.focalId).toBeNull();
      expect(cleared.selectedId).toBeNull();
      expect(cleared.mode).toBe('tree');
    });

    it('CLEAR_FOCUS leaves a non-lineage mode unchanged', () => {
      const families = transition(createInitialSM(), { type: 'SET_MODE', mode: 'families', nodes });
      const cleared = transition(families, { type: 'CLEAR_FOCUS' });
      expect(cleared.mode).toBe('families');
    });

    it('does not mutate the input state', () => {
      const sm = createInitialSM();
      const frozen = createInitialSM();
      transition(sm, { type: 'FOCUS_NODE', id: 'c' });
      expect(sm).toEqual(frozen);
    });

    it('TOGGLE_COLLAPSE adds then removes a node, leaving a fresh Set each time', () => {
      const start = createInitialSM();
      const collapsed = transition(start, { type: 'TOGGLE_COLLAPSE', id: 'a' });
      expect([...collapsed.collapsed]).toEqual(['a']);
      expect(collapsed.collapsed).not.toBe(start.collapsed);
      const expanded = transition(collapsed, { type: 'TOGGLE_COLLAPSE', id: 'a' });
      expect(expanded.collapsed.size).toBe(0);
    });

    it('DESELECT clears the selection', () => {
      const selected = transition(createInitialSM(), { type: 'NODE_CLICKED', id: 'c' });
      expect(transition(selected, { type: 'DESELECT' }).selectedId).toBeNull();
    });

    it('JUMP_TO sets the selection without toggling (re-jumping keeps it selected)', () => {
      const once = transition(createInitialSM(), { type: 'JUMP_TO', id: 'c' });
      expect(once.selectedId).toBe('c');
      const again = transition(once, { type: 'JUMP_TO', id: 'c' });
      expect(again.selectedId).toBe('c');
    });

    it('SET_SEARCH sets and clears the search term', () => {
      const searched = transition(createInitialSM(), { type: 'SET_SEARCH', value: 'kush' });
      expect(searched.search).toBe('kush');
      expect(transition(searched, { type: 'SET_SEARCH', value: '' }).search).toBe('');
    });

    it('SET_BREEDER_FILTER sets the breeder filter', () => {
      const sm = transition(createInitialSM(), { type: 'SET_BREEDER_FILTER', value: 'Beta' });
      expect(sm.breederFilter).toBe('Beta');
    });

    it('SET_MODE tree clears the focal node', () => {
      const focused = transition(createInitialSM(), { type: 'FOCUS_NODE', id: 'c' });
      const tree = transition(focused, { type: 'SET_MODE', mode: 'tree', nodes });
      expect(tree.mode).toBe('tree');
      expect(tree.focalId).toBeNull();
    });

    it('SET_MODE lineage focuses the current selection', () => {
      const selected = transition(createInitialSM(), { type: 'NODE_CLICKED', id: 'd' });
      const lineage = transition(selected, { type: 'SET_MODE', mode: 'lineage', nodes });
      expect(lineage.mode).toBe('lineage');
      expect(lineage.focalId).toBe('d');
    });

    it('SET_MODE lineage with no selection or focal defaults to the first node with a mother', () => {
      const lineage = transition(createInitialSM(), { type: 'SET_MODE', mode: 'lineage', nodes });
      // first node in the fixture that has a mother is 'c'
      expect(lineage.focalId).toBe('c');
    });

    it('SET_GEN_FILTER toggles a generation and clears on re-select or null', () => {
      const f1 = transition(createInitialSM(), { type: 'SET_GEN_FILTER', gen: 'F1' });
      expect(f1.genFilter).toBe('F1');
      expect(transition(f1, { type: 'SET_GEN_FILTER', gen: 'F1' }).genFilter).toBeNull();
      expect(transition(f1, { type: 'SET_GEN_FILTER', gen: 'F2' }).genFilter).toBe('F2');
      expect(transition(f1, { type: 'SET_GEN_FILTER', gen: null }).genFilter).toBeNull();
    });

    it('RESET_FILTERS clears collapsed/gen/selection/search but keeps breeder, mode, and focal', () => {
      let sm = createInitialSM();
      sm = transition(sm, { type: 'FOCUS_NODE', id: 'c' });
      sm = transition(sm, { type: 'TOGGLE_COLLAPSE', id: 'a' });
      sm = transition(sm, { type: 'SET_GEN_FILTER', gen: 'F1' });
      sm = transition(sm, { type: 'SET_SEARCH', value: 'kush' });
      sm = transition(sm, { type: 'SET_BREEDER_FILTER', value: 'Beta' });
      const reset = transition(sm, { type: 'RESET_FILTERS' });
      expect(reset.collapsed.size).toBe(0);
      expect(reset.genFilter).toBeNull();
      expect(reset.selectedId).toBeNull();
      expect(reset.search).toBe('');
      expect(reset.breederFilter).toBe('Beta');
      expect(reset.mode).toBe('lineage');
      expect(reset.focalId).toBe('c');
    });

    it('EXTERNAL_FOCAL_CHANGED to an id enters lineage mode; to null only clears the focal', () => {
      const focused = transition(createInitialSM(), { type: 'EXTERNAL_FOCAL_CHANGED', focalId: 'c' });
      expect(focused.focalId).toBe('c');
      expect(focused.mode).toBe('lineage');
      const cleared = transition(focused, { type: 'EXTERNAL_FOCAL_CHANGED', focalId: null });
      expect(cleared.focalId).toBeNull();
      expect(cleared.mode).toBe('lineage'); // mode unchanged when clearing
    });
  });
});
