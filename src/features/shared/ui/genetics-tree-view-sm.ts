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
