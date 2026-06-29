// Pure selectors for the genetics tree view interaction state.
// No DOM, no LitElement — derivations over TreeNode[] + interaction state.
// See CONTEXT.md: Genetics Tree View SM.

import {
  type TreeNode,
  type LayoutResult,
  layoutTopDown,
  layoutSubgraph,
  layoutBreederGrouped,
  ancestorsOf,
  descendantsOf,
} from './genetics-tree-layout';

export type ViewMode = 'tree' | 'lineage' | 'families';

/** Nodes left visible after applying the breeder filter and collapsed subtrees. */
export function visibleNodes(
  nodes: TreeNode[],
  opts: { breederFilter: string; collapsed: Set<string>; childrenOf: Record<string, string[]> }
): TreeNode[] {
  const { breederFilter, collapsed, childrenOf } = opts;
  let result = nodes;

  if (breederFilter) {
    result = result.filter((n) => n.breeder === breederFilter);
  }

  if (collapsed.size > 0) {
    const hidden = new Set<string>();
    const queue = [...collapsed];
    while (queue.length > 0) {
      const id = queue.shift()!;
      for (const childId of childrenOf[id] ?? []) {
        if (!hidden.has(childId)) {
          hidden.add(childId);
          queue.push(childId);
        }
      }
    }
    result = result.filter((n) => !hidden.has(n.id));
  }

  return result;
}

/** Empty-guard + 3-way layout routing (families / focal lineage subgraph / top-down). */
export function computeLayout(
  visible: TreeNode[],
  mode: ViewMode,
  focalId: string | null
): LayoutResult | null {
  if (visible.length === 0) return null;
  if (mode === 'families') return layoutBreederGrouped(visible);
  if (mode === 'lineage' && focalId) return layoutSubgraph(visible, focalId);
  return layoutTopDown(visible);
}

/** Ancestors and descendants of the focal node (both empty when no focal). */
export function lineageSets(
  nodes: TreeNode[],
  focalId: string | null
): { ancestors: Set<string>; descendants: Set<string> } {
  if (!focalId) return { ancestors: new Set(), descendants: new Set() };
  return { ancestors: ancestorsOf(nodes, focalId), descendants: descendantsOf(nodes, focalId) };
}

/** Highlighted node (hover takes precedence over selection) and its lineage. */
export function highlightSets(
  nodes: TreeNode[],
  hoverId: string | null,
  selectedId: string | null
): { highlightId: string | null; ancestors: Set<string>; descendants: Set<string> } {
  const highlightId = hoverId ?? selectedId;
  return { highlightId, ...lineageSets(nodes, highlightId) };
}

/**
 * Whether the "Reset" affordance should show. Note: the breeder filter is
 * deliberately excluded — it has its own clear control, matching the component.
 */
export function hasActiveFilters(opts: {
  collapsed: Set<string>;
  genFilter: string | null;
  selectedId: string | null;
  search: string;
}): boolean {
  return opts.collapsed.size > 0 || !!opts.genFilter || !!opts.selectedId || !!opts.search;
}

// ---------------------------------------------------------------------------
// State machine — navigation / filter / selection
// ---------------------------------------------------------------------------

/** Navigation, filter, and selection state. Viewport state stays in the component. */
export interface GeneticsTreeSM {
  mode: ViewMode;
  focalId: string | null;
  breederFilter: string;
  collapsed: Set<string>;
  selectedId: string | null;
  search: string;
  genFilter: string | null;
}

export type GeneticsTreeEvent =
  | { type: 'EXTERNAL_FOCAL_CHANGED'; focalId: string | null }
  | { type: 'FOCUS_NODE'; id: string }
  | { type: 'NODE_CLICKED'; id: string }
  | { type: 'CLEAR_FOCUS' }
  | { type: 'JUMP_TO'; id: string }
  | { type: 'TOGGLE_COLLAPSE'; id: string }
  | { type: 'DESELECT' }
  | { type: 'SET_SEARCH'; value: string }
  | { type: 'SET_MODE'; mode: ViewMode; nodes: TreeNode[] }
  | { type: 'SET_BREEDER_FILTER'; value: string }
  | { type: 'SET_GEN_FILTER'; gen: string | null }
  | { type: 'RESET_FILTERS' };

export function createInitialSM(): GeneticsTreeSM {
  return {
    mode: 'tree',
    focalId: null,
    breederFilter: '',
    collapsed: new Set(),
    selectedId: null,
    search: '',
    genFilter: null,
  };
}

function applySetMode(sm: GeneticsTreeSM, mode: ViewMode, nodes: TreeNode[]): GeneticsTreeSM {
  if (mode === 'tree') return { ...sm, mode: 'tree', focalId: null };
  if (mode === 'families') return { ...sm, mode: 'families' };
  // lineage: prefer the current selection, else keep an existing focal, else pick a default
  let focalId = sm.focalId;
  if (sm.selectedId) {
    focalId = sm.selectedId;
  } else if (!sm.focalId && nodes.length) {
    focalId = nodes.find((n) => n.parents.mother)?.id ?? nodes[0].id;
  }
  return { ...sm, mode: 'lineage', focalId };
}

export function transition(sm: GeneticsTreeSM, event: GeneticsTreeEvent): GeneticsTreeSM {
  switch (event.type) {
    case 'FOCUS_NODE':
      return { ...sm, mode: 'lineage', focalId: event.id, selectedId: event.id };
    case 'NODE_CLICKED':
      return { ...sm, selectedId: sm.selectedId === event.id ? null : event.id };
    case 'CLEAR_FOCUS':
      return {
        ...sm,
        focalId: null,
        selectedId: null,
        mode: sm.mode === 'lineage' ? 'tree' : sm.mode,
      };
    case 'SET_MODE':
      return applySetMode(sm, event.mode, event.nodes);
    case 'JUMP_TO':
      return { ...sm, selectedId: event.id };
    case 'DESELECT':
      return { ...sm, selectedId: null };
    case 'TOGGLE_COLLAPSE': {
      const collapsed = new Set(sm.collapsed);
      if (collapsed.has(event.id)) collapsed.delete(event.id);
      else collapsed.add(event.id);
      return { ...sm, collapsed };
    }
    case 'SET_SEARCH':
      return { ...sm, search: event.value };
    case 'SET_BREEDER_FILTER':
      return { ...sm, breederFilter: event.value };
    case 'SET_GEN_FILTER':
      return { ...sm, genFilter: event.gen === null || sm.genFilter === event.gen ? null : event.gen };
    case 'RESET_FILTERS':
      return { ...sm, collapsed: new Set(), genFilter: null, selectedId: null, search: '' };
    case 'EXTERNAL_FOCAL_CHANGED':
      return {
        ...sm,
        focalId: event.focalId,
        mode: event.focalId ? 'lineage' : sm.mode,
      };
    default:
      return sm;
  }
}
