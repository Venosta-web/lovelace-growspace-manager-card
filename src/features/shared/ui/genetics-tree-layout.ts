// Pure layout computation for genetics lineage tree views.
// No DOM, no LitElement — only position math and graph traversal.

export interface TreeNode {
  id: string;
  name: string;
  strain: string;
  breeder: string;
  pheno: string;
  gen: string;
  type: 'batch' | 'strain';
  parents: { mother: string | null; father: string | null };
}

export interface LayoutNode {
  x: number;
  y: number;
  w: number;
  h: number;
  rank: number;
}

export interface TreeEdge {
  from: string;
  to: string;
  kind: 'mother' | 'father' | 'clone';
}

export interface LayoutResult {
  nodes: Record<string, LayoutNode>;
  edges: TreeEdge[];
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
}

export const NODE_W = 200;
export const NODE_H = 76;

const COL_GAP = 36;
const ROW_GAP = 130;

// ---------------------------------------------------------------------------
// Private helper: build lookup maps
// ---------------------------------------------------------------------------

function buildIndex(plants: TreeNode[]): {
  byId: Record<string, TreeNode>;
  childrenOf: Record<string, string[]>;
} {
  const byId: Record<string, TreeNode> = {};
  const childrenOf: Record<string, string[]> = {};

  for (const p of plants) {
    byId[p.id] = p;
  }

  for (const p of plants) {
    const { mother, father } = p.parents;
    if (mother) {
      if (!childrenOf[mother]) childrenOf[mother] = [];
      childrenOf[mother].push(p.id);
    }
    if (father && father !== mother) {
      if (!childrenOf[father]) childrenOf[father] = [];
      childrenOf[father].push(p.id);
    }
  }

  return { byId, childrenOf };
}

// ---------------------------------------------------------------------------
// layoutTopDown
// ---------------------------------------------------------------------------

export function layoutTopDown(plants: TreeNode[]): LayoutResult {
  if (plants.length === 0) {
    return {
      nodes: {},
      edges: [],
      bounds: { minX: 0, maxX: 400, minY: 0, maxY: 200 },
    };
  }

  const { byId } = buildIndex(plants);

  // Rank = longest path from a root (node with no parents in the set).
  const rankCache: Record<string, number> = {};
  const visiting: Record<string, boolean> = {};

  function rankOf(id: string): number {
    if (rankCache[id] !== undefined) return rankCache[id];
    if (visiting[id]) return 0; // cycle guard
    visiting[id] = true;

    const node = byId[id];
    if (!node) {
      visiting[id] = false;
      return (rankCache[id] = 0);
    }

    const { mother, father } = node.parents;
    let rank = 0;
    if (mother && byId[mother]) rank = Math.max(rank, rankOf(mother) + 1);
    if (father && byId[father]) rank = Math.max(rank, rankOf(father) + 1);

    visiting[id] = false;
    return (rankCache[id] = rank);
  }

  for (const p of plants) rankOf(p.id);

  // Top-down pass: ensure each parent is ranked no more than one level below its
  // most-derived child. Without this, parents with no (or shallow) ancestry of
  // their own get rank 0 and land at the very bottom of the canvas even when they
  // are direct parents of a high-ranked node (e.g. Mimosa with no stored parents
  // appearing next to ancient leaf-ancestors instead of next to Animal Mints).
  let anyChanged = true;
  while (anyChanged) {
    anyChanged = false;
    for (const p of plants) {
      const childRank = rankCache[p.id];
      const { mother, father } = p.parents;
      for (const parentId of [mother, father]) {
        if (parentId && byId[parentId]) {
          const needed = childRank - 1;
          if (rankCache[parentId] < needed) {
            rankCache[parentId] = needed;
            anyChanged = true;
          }
        }
      }
    }
  }

  // Group by rank
  const byRank: Record<number, TreeNode[]> = {};
  for (const p of plants) {
    const r = rankCache[p.id];
    if (!byRank[r]) byRank[r] = [];
    byRank[r].push(p);
  }

  // Sort each rank: family group key first, then name
  for (const r of Object.keys(byRank)) {
    byRank[+r].sort((a, b) => {
      const keyA = [a.parents.mother, a.parents.father]
        .filter(Boolean)
        .sort()
        .join('|');
      const keyB = [b.parents.mother, b.parents.father]
        .filter(Boolean)
        .sort()
        .join('|');
      if (keyA !== keyB) return keyA.localeCompare(keyB);
      return a.name.localeCompare(b.name);
    });
  }

  const ranks = Object.keys(byRank)
    .map(Number)
    .sort((a, b) => a - b);

  // Find max row width for centering
  const maxRowWidth = Math.max(
    ...ranks.map((r) => {
      const count = byRank[r].length;
      return count * NODE_W + (count - 1) * COL_GAP;
    })
  );

  const maxRank = Math.max(...ranks);

  // Assign positions — highest rank (most derived) at top (y=0), ancestors at bottom
  const nodes: Record<string, LayoutNode> = {};
  for (const r of ranks) {
    const row = byRank[r];
    const rowWidth = row.length * NODE_W + (row.length - 1) * COL_GAP;
    const startX = (maxRowWidth - rowWidth) / 2;
    const y = (maxRank - r) * (NODE_H + ROW_GAP);

    row.forEach((p, i) => {
      nodes[p.id] = {
        x: startX + i * (NODE_W + COL_GAP),
        y,
        w: NODE_W,
        h: NODE_H,
        rank: r,
      };
    });
  }

  // Build edges
  const edges: TreeEdge[] = [];
  for (const p of plants) {
    const { mother, father } = p.parents;
    if (mother && nodes[mother] && nodes[p.id]) {
      edges.push({ from: mother, to: p.id, kind: 'mother' });
    }
    if (father && father !== mother && nodes[father] && nodes[p.id]) {
      edges.push({ from: father, to: p.id, kind: 'father' });
    }
  }

  // Compute bounds with 40px padding
  const pad = 40;
  const xs = Object.values(nodes).flatMap((n) => [n.x, n.x + n.w]);
  const ys = Object.values(nodes).flatMap((n) => [n.y, n.y + n.h]);
  const bounds = {
    minX: Math.min(...xs) - pad,
    maxX: Math.max(...xs) + pad,
    minY: Math.min(...ys) - pad,
    maxY: Math.max(...ys) + pad,
  };

  return { nodes, edges, bounds };
}

// ---------------------------------------------------------------------------
// layoutRadial
// ---------------------------------------------------------------------------

export function layoutRadial(plants: TreeNode[], focalId: string): LayoutResult {
  if (plants.length === 0) {
    return {
      nodes: {},
      edges: [],
      bounds: { minX: 0, maxX: 400, minY: 0, maxY: 200 },
    };
  }

  const { byId, childrenOf } = buildIndex(plants);

  // BFS to assign relative ranks from focal node
  const relRank: Record<string, number> = {};
  relRank[focalId] = 0;

  const queue: Array<{ id: string; rank: number }> = [{ id: focalId, rank: 0 }];
  const visited = new Set<string>([focalId]);

  while (queue.length > 0) {
    const { id, rank } = queue.shift()!;
    const node = byId[id];
    if (!node) continue;

    // Walk ancestors (negative ranks)
    const { mother, father } = node.parents;
    for (const parentId of [mother, father]) {
      if (parentId && byId[parentId] && !visited.has(parentId)) {
        visited.add(parentId);
        relRank[parentId] = rank - 1;
        queue.push({ id: parentId, rank: rank - 1 });
      }
    }

    // Walk descendants (positive ranks)
    for (const childId of childrenOf[id] ?? []) {
      if (byId[childId] && !visited.has(childId)) {
        visited.add(childId);
        relRank[childId] = rank + 1;
        queue.push({ id: childId, rank: rank + 1 });
      }
    }
  }

  // Group by absolute rank (ring distance from focal)
  const byAbsRank: Record<number, string[]> = {};
  for (const [id, r] of Object.entries(relRank)) {
    if (r === 0) continue;
    const absR = Math.abs(r);
    if (!byAbsRank[absR]) byAbsRank[absR] = [];
    byAbsRank[absR].push(id);
  }

  // Place focal at origin
  const cx = 0;
  const cy = 0;

  const nodes: Record<string, LayoutNode> = {};

  // Focal node
  nodes[focalId] = {
    x: cx - NODE_W / 2,
    y: cy - NODE_H / 2,
    w: NODE_W,
    h: NODE_H,
    rank: 0,
  };

  for (const [absRankStr, ids] of Object.entries(byAbsRank)) {
    const absRank = Number(absRankStr);
    const radius = absRank * 280;
    const count = ids.length;

    ids.forEach((id, i) => {
      // Distribute evenly in a full 360° circle, starting from top (-90°)
      const angle = (2 * Math.PI * i) / count - Math.PI / 2;

      nodes[id] = {
        x: cx + radius * Math.cos(angle) - NODE_W / 2,
        y: cy + radius * Math.sin(angle) - NODE_H / 2,
        w: NODE_W,
        h: NODE_H,
        rank: relRank[id],
      };
    });
  }

  // Build edges — only between nodes present in the layout
  const edges: TreeEdge[] = [];
  for (const id of Object.keys(nodes)) {
    const node = byId[id];
    if (!node) continue;
    const { mother, father } = node.parents;
    if (mother && nodes[mother]) {
      edges.push({ from: mother, to: id, kind: 'mother' });
    }
    if (father && father !== mother && nodes[father]) {
      edges.push({ from: father, to: id, kind: 'father' });
    }
  }

  // Bounds with 60px padding
  const pad = 60;
  const xs = Object.values(nodes).flatMap((n) => [n.x, n.x + n.w]);
  const ys = Object.values(nodes).flatMap((n) => [n.y, n.y + n.h]);
  const bounds = {
    minX: Math.min(...xs) - pad,
    maxX: Math.max(...xs) + pad,
    minY: Math.min(...ys) - pad,
    maxY: Math.max(...ys) + pad,
  };

  return { nodes, edges, bounds };
}

// ---------------------------------------------------------------------------
// Graph traversal utilities
// ---------------------------------------------------------------------------

export function ancestorsOf(plants: TreeNode[], focalId: string): Set<string> {
  const { byId } = buildIndex(plants);
  const result = new Set<string>();
  const queue = [focalId];

  while (queue.length > 0) {
    const id = queue.shift()!;
    const node = byId[id];
    if (!node) continue;
    for (const parentId of [node.parents.mother, node.parents.father]) {
      if (parentId && byId[parentId] && !result.has(parentId)) {
        result.add(parentId);
        queue.push(parentId);
      }
    }
  }

  return result;
}

export function descendantsOf(plants: TreeNode[], focalId: string): Set<string> {
  const { childrenOf } = buildIndex(plants);
  const result = new Set<string>();
  const queue = [focalId];

  while (queue.length > 0) {
    const id = queue.shift()!;
    for (const childId of childrenOf[id] ?? []) {
      if (!result.has(childId)) {
        result.add(childId);
        queue.push(childId);
      }
    }
  }

  return result;
}

export function motherLineOf(plants: TreeNode[], focalId: string): Set<string> {
  const { byId } = buildIndex(plants);
  const result = new Set<string>();
  let current = focalId;

  while (true) {
    const node = byId[current];
    if (!node) break;
    const { mother } = node.parents;
    if (!mother || !byId[mother] || result.has(mother)) break;
    result.add(mother);
    current = mother;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Edge path generators
// ---------------------------------------------------------------------------

export function edgePath(from: LayoutNode, to: LayoutNode): string {
  // "from" is parent (lower on screen, larger y), "to" is child (higher on screen, smaller y)
  const x1 = from.x + from.w / 2;
  const y1 = from.y;
  const x2 = to.x + to.w / 2;
  const y2 = to.y + to.h;
  const dy = (y1 - y2) / 2;
  return `M ${x1} ${y1} C ${x1} ${y1 - dy}, ${x2} ${y2 + dy}, ${x2} ${y2}`;
}

export function edgePathRadial(from: LayoutNode, to: LayoutNode): string {
  const x1 = from.x + from.w / 2;
  const y1 = from.y + from.h / 2;
  const x2 = to.x + to.w / 2;
  const y2 = to.y + to.h / 2;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  return `M ${x1} ${y1} Q ${mx} ${my}, ${x2} ${y2}`;
}
