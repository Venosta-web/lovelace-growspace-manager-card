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

export interface LayoutBand {
  kind: 'rank' | 'breeder';
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  count?: number;
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
  bands?: LayoutBand[];
}

export const NODE_W = 148;
export const NODE_H = 50;

const COL_GAP = 16;
const ROW_GAP = 96;

// ---------------------------------------------------------------------------
// buildIndex — exported so callers can build child-lookup maps cheaply
// ---------------------------------------------------------------------------

export function buildIndex(plants: TreeNode[]): {
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
// Rank computation — longest path from root with parent-lift pass
// ---------------------------------------------------------------------------

function computeRanks(
  plants: TreeNode[],
  byId: Record<string, TreeNode>,
): Record<string, number> {
  const rankCache: Record<string, number> = {};
  const visiting: Record<string, boolean> = {};

  function rankOf(id: string): number {
    if (rankCache[id] !== undefined) return rankCache[id];
    if (visiting[id]) return 0;
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

  // Lift parents so they sit at child_rank − 1 (avoids shallow parents
  // appearing far from their most-derived child in the layout).
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

  return rankCache;
}

// ---------------------------------------------------------------------------
// Barycenter ordering — reduces edge crossings vs alphabetical sort alone
// ---------------------------------------------------------------------------

type Sortable = TreeNode & { __bary?: number };

function orderByBarycenter(
  byRank: Record<number, Sortable[]>,
  ranks: number[],
): void {
  // Initial pass: family-key sort
  for (const r of ranks) {
    byRank[r].sort((a, b) => {
      const ka = [a.parents.mother, a.parents.father].filter(Boolean).sort().join('|');
      const kb = [b.parents.mother, b.parents.father].filter(Boolean).sort().join('|');
      if (ka !== kb) return ka.localeCompare(kb);
      return a.name.localeCompare(b.name);
    });
  }

  // 4 alternating sweeps (top→down, bottom→up) using parent/child barycenters
  for (let pass = 0; pass < 4; pass++) {
    const posInRank: Record<string, number> = {};
    for (const r of ranks) {
      byRank[r].forEach((n, i) => { posInRank[n.id] = i; });
    }

    const goingDown = pass % 2 === 0;
    const order = goingDown ? [...ranks] : [...ranks].reverse();

    for (const r of order) {
      const row = byRank[r];
      row.forEach((n) => {
        let neighbors: string[];
        if (goingDown) {
          neighbors = [n.parents.mother, n.parents.father].filter(
            (p): p is string => p != null && posInRank[p] != null,
          );
        } else {
          neighbors = [];
          for (const list of Object.values(byRank)) {
            for (const m of list) {
              if ((m.parents.mother === n.id || m.parents.father === n.id) &&
                  posInRank[m.id] != null) {
                neighbors.push(m.id);
              }
            }
          }
        }
        n.__bary = neighbors.length
          ? neighbors.reduce((s, id) => s + posInRank[id], 0) / neighbors.length
          : (posInRank[n.id] ?? 0);
      });
      row.sort((a, b) => {
        if (a.__bary !== b.__bary) return (a.__bary ?? 0) - (b.__bary ?? 0);
        return a.name.localeCompare(b.name);
      });
    }
  }

  for (const r of ranks) byRank[r].forEach((n) => { delete n.__bary; });
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
  const rankCache = computeRanks(plants, byId);

  const byRank: Record<number, TreeNode[]> = {};
  for (const p of plants) {
    const r = rankCache[p.id];
    if (!byRank[r]) byRank[r] = [];
    byRank[r].push(p);
  }

  const ranks = Object.keys(byRank).map(Number).sort((a, b) => a - b);
  orderByBarycenter(byRank, ranks);

  const maxRowWidth = Math.max(
    ...ranks.map((r) => {
      const count = byRank[r].length;
      return count * NODE_W + (count - 1) * COL_GAP;
    }),
  );

  const maxRank = Math.max(...ranks);
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

  const edges = _buildEdges(plants, nodes);
  const bounds = _computeBounds(nodes, 80);

  const bands: LayoutBand[] = ranks.map((r) => ({
    kind: 'rank',
    label: `Gen ${maxRank - r}`,
    x: bounds.minX,
    y: (maxRank - r) * (NODE_H + ROW_GAP),
    w: bounds.maxX - bounds.minX,
    h: NODE_H,
  }));

  return { nodes, edges, bounds, bands };
}

// ---------------------------------------------------------------------------
// layoutSubgraph — focal node's ancestors + descendants only, re-centered
// ---------------------------------------------------------------------------

export function layoutSubgraph(plants: TreeNode[], focalId: string): LayoutResult {
  if (!focalId) return layoutTopDown(plants);

  const { byId, childrenOf } = buildIndex(plants);
  if (!byId[focalId]) return layoutTopDown(plants);

  const ancestors = new Set<string>();
  const descendants = new Set<string>();

  (function walkAnc(id: string) {
    const n = byId[id];
    if (!n) return;
    for (const p of [n.parents.mother, n.parents.father]) {
      if (p && byId[p] && !ancestors.has(p)) {
        ancestors.add(p);
        walkAnc(p);
      }
    }
  })(focalId);

  (function walkDesc(id: string) {
    for (const c of childrenOf[id] ?? []) {
      if (!descendants.has(c)) {
        descendants.add(c);
        walkDesc(c);
      }
    }
  })(focalId);

  const subset = plants.filter(
    (n) => n.id === focalId || ancestors.has(n.id) || descendants.has(n.id),
  );

  const result = layoutTopDown(subset);

  // Re-center so the focal node anchors the canvas
  const focal = result.nodes[focalId];
  if (focal) {
    const dx = -(focal.x + focal.w / 2);
    const dy = -(focal.y + focal.h / 2);
    for (const id of Object.keys(result.nodes)) {
      result.nodes[id].x += dx;
      result.nodes[id].y += dy;
    }
    if (result.bands) {
      result.bands.forEach((b) => { b.y += dy; });
    }
    result.bounds = _computeBounds(result.nodes, 100);
  }

  return result;
}

// ---------------------------------------------------------------------------
// layoutBreederGrouped — one band per breeder, chip-packed within each band
// ---------------------------------------------------------------------------

export function layoutBreederGrouped(plants: TreeNode[]): LayoutResult {
  const PAD_X = 20;
  const PAD_Y = 48;  // room for band header
  const COL_G = 12;
  const ROW_G = 12;
  const GROUP_GAP = 32;
  const TARGET_W = 2400;

  const groups: Record<string, TreeNode[]> = {};
  for (const n of plants) {
    const k = n.breeder || 'Unknown';
    if (!groups[k]) groups[k] = [];
    groups[k].push(n);
  }

  const keys = Object.keys(groups).sort((a, b) => {
    if (groups[b].length !== groups[a].length) return groups[b].length - groups[a].length;
    return a.localeCompare(b);
  });

  const nodes: Record<string, LayoutNode> = {};
  const bands: LayoutBand[] = [];
  let cursorX = 0;
  let cursorY = 0;
  let rowH = 0;

  for (const k of keys) {
    const list = groups[k].slice().sort((a, b) => a.name.localeCompare(b.name));
    const cols = Math.min(list.length, Math.max(2, Math.ceil(Math.sqrt(list.length * 1.6))));
    const rows = Math.ceil(list.length / cols);
    const gW = cols * NODE_W + (cols - 1) * COL_G + PAD_X * 2;
    const gH = rows * NODE_H + (rows - 1) * ROW_G + PAD_Y + 16;

    if (cursorX + gW > TARGET_W && cursorX > 0) {
      cursorX = 0;
      cursorY += rowH + GROUP_GAP;
      rowH = 0;
    }

    bands.push({
      kind: 'breeder',
      label: k,
      count: list.length,
      x: cursorX,
      y: cursorY,
      w: gW,
      h: gH,
    });

    list.forEach((n, i) => {
      const row = Math.floor(i / cols);
      const col = i % cols;
      nodes[n.id] = {
        x: cursorX + PAD_X + col * (NODE_W + COL_G),
        y: cursorY + PAD_Y + row * (NODE_H + ROW_G),
        w: NODE_W,
        h: NODE_H,
        rank: 0,
      };
    });

    cursorX += gW + GROUP_GAP;
    rowH = Math.max(rowH, gH);
  }

  const edges = _buildEdges(plants, nodes);
  const bounds = _computeBounds(nodes, 80);
  return { nodes, edges, bounds, bands };
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

function _buildEdges(plants: TreeNode[], nodes: Record<string, LayoutNode>): TreeEdge[] {
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
  return edges;
}

function _computeBounds(
  nodes: Record<string, LayoutNode>,
  pad: number,
): { minX: number; maxX: number; minY: number; maxY: number } {
  const arr = Object.values(nodes);
  if (arr.length === 0) return { minX: 0, maxX: 800, minY: 0, maxY: 500 };
  const xs = arr.flatMap((n) => [n.x, n.x + n.w]);
  const ys = arr.flatMap((n) => [n.y, n.y + n.h]);
  return {
    minX: Math.min(...xs) - pad,
    maxX: Math.max(...xs) + pad,
    minY: Math.min(...ys) - pad,
    maxY: Math.max(...ys) + pad,
  };
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
  // "from" is parent (lower on screen, larger y), "to" is child (higher, smaller y)
  const x1 = from.x + from.w / 2;
  const y1 = from.y;
  const x2 = to.x + to.w / 2;
  const y2 = to.y + to.h;
  const dy = (y1 - y2) / 2;
  return `M ${x1} ${y1} C ${x1} ${y1 - dy}, ${x2} ${y2 + dy}, ${x2} ${y2}`;
}

export function edgePathCurve(from: LayoutNode, to: LayoutNode): string {
  const x1 = from.x + from.w / 2;
  const y1 = from.y + from.h / 2;
  const x2 = to.x + to.w / 2;
  const y2 = to.y + to.h / 2;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  return `M ${x1} ${y1} Q ${mx} ${my}, ${x2} ${y2}`;
}
