# Genetics Lineage Tree View Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the simple recursive `lineage-tree` display with a fully interactive, pan-and-zoom canvas-based genetics lineage tree, accessible as a "Tree View" tab in the Strain Library dialog.

**Architecture:** Port the React/JSX design prototype (from `plant-lineage-tree-display` bundle) to a LitElement Shadow DOM component. All layout math (top-down generational DAG + radial focal-plant) lives in a separate utility module. Data is derived from the existing `seedBatches` and `strains` arrays already on the dialog.

**Tech Stack:** LitElement (Lit 3.x), TypeScript, SVG for edges, CSS `transform` for pan/zoom canvas, existing CSS tokens from `src/styles/variables.ts`.

---

## Design Reference

The design bundle (`/tmp/design-extract/plant-lineage-tree-display/project/`) was exported from Claude Design. Key files:
- `tokens.css` — exact CSS variable names that already exist in the Growspace card
- `layout.js` — layout engines to port to TypeScript
- `components.jsx` + `app.jsx` — React prototype; port all logic to Lit

**Visual spec summary:**
- Dark "Dark Ops" theme (`--bg-app: #101010`) already matches our token set
- Node card: left 3px colored stage bar, gen badge, name, strain · breeder, stage chip, phenotype chip
- Edge types: solid (mother), dashed (father), dotted-pink (clone)
- Mini-map: SVG overlay, stage-colored rects, green viewport rect indicator
- Focus mode: dim nodes outside ancestor/descendant path of selected focal plant
- Mother-line highlight: magenta glow on the pure maternal lineage path

---

## Data Model

```
TreeNode {
  id: string;                          // batch_id for batches, 'strain-{key}' for library strains
  name: string;                        // strain_name or strain
  strain: string;
  breeder: string;
  pheno: string;                       // phenotype or '—'
  gen: string;                         // generation ('P1', 'F1', 'F2', 'BX1', 'S1', 'CL', …)
  type: 'batch' | 'strain';           // batch = SeedBatch, strain = root StrainEntry
  parents: { mother: string | null; father: string | null };
}

LayoutNode {
  x: number; y: number; w: number; h: number; rank: number;
}

LayoutResult {
  nodes: Record<string, LayoutNode>;
  edges: { from: string; to: string; kind: 'mother' | 'father' | 'clone' }[];
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
}
```

**Building TreeNode[] from dialog data:**
1. Collect all `parent_1_strain` and `parent_2_strain` values from `seedBatches`
2. For each unique parent strain name, find the matching `StrainEntry` → create `type: 'strain'` node with `gen: 'P1'` and no parents
3. For each `SeedBatch`, create `type: 'batch'` node; link `parents.mother` to the strain node id for `parent_1_strain` (if present) and `parents.father` to `parent_2_strain`

---

## Files to Create / Modify

| Action | Path |
|--------|------|
| **Create** | `src/features/shared/ui/genetics-tree-layout.ts` |
| **Create** | `src/features/shared/ui/genetics-tree-view.ts` |
| **Modify** | `src/dialogs/strain-library-dialog.ts` |

---

## Task 1: Layout Engine (`genetics-tree-layout.ts`)

**File:** `src/features/shared/ui/genetics-tree-layout.ts`

This is a straight TypeScript port of `layout.js` from the design bundle.

**Step 1: Create the file with types and constants**

```typescript
// src/features/shared/ui/genetics-tree-layout.ts

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
```

**Step 2: Add helper `buildIndex`**

```typescript
function buildIndex(plants: TreeNode[]): {
  byId: Record<string, TreeNode>;
  childrenOf: Record<string, string[]>;
} {
  const byId = Object.fromEntries(plants.map((p) => [p.id, p]));
  const childrenOf: Record<string, string[]> = {};
  plants.forEach((p) => {
    [p.parents.mother, p.parents.father].forEach((pid) => {
      if (!pid) return;
      (childrenOf[pid] = childrenOf[pid] ?? []).push(p.id);
    });
  });
  return { byId, childrenOf };
}
```

**Step 3: Add `layoutTopDown`**

```typescript
export function layoutTopDown(plants: TreeNode[]): LayoutResult {
  const { byId, childrenOf } = buildIndex(plants);
  const rank: Record<string, number> = {};
  const visiting: Record<string, boolean> = {};

  function rankOf(id: string): number {
    if (rank[id] !== undefined) return rank[id];
    if (visiting[id]) return 0;
    visiting[id] = true;
    const p = byId[id];
    const m = p.parents.mother;
    const f = p.parents.father;
    let r = 0;
    if (m && byId[m]) r = Math.max(r, rankOf(m) + 1);
    if (f && byId[f] && f !== m) r = Math.max(r, rankOf(f) + 1);
    visiting[id] = false;
    rank[id] = r;
    return r;
  }
  plants.forEach((p) => rankOf(p.id));

  const byRank: Record<number, string[]> = {};
  plants.forEach((p) => {
    const r = rank[p.id];
    (byRank[r] = byRank[r] ?? []).push(p.id);
  });

  Object.keys(byRank).forEach((rKey) => {
    byRank[Number(rKey)].sort((a, b) => {
      const pa = byId[a].parents, pb = byId[b].parents;
      const ka = [pa.mother, pa.father].filter(Boolean).sort().join('|');
      const kb = [pb.mother, pb.father].filter(Boolean).sort().join('|');
      if (ka !== kb) return ka.localeCompare(kb);
      return byId[a].name.localeCompare(byId[b].name);
    });
  });

  const nodes: Record<string, LayoutNode> = {};
  const ranks = Object.keys(byRank).map(Number).sort((a, b) => a - b);
  let maxRowWidth = 0;
  ranks.forEach((r) => {
    const ids = byRank[r];
    maxRowWidth = Math.max(maxRowWidth, ids.length * NODE_W + (ids.length - 1) * COL_GAP);
  });
  ranks.forEach((r) => {
    const ids = byRank[r];
    const rowW = ids.length * NODE_W + (ids.length - 1) * COL_GAP;
    let x = (maxRowWidth - rowW) / 2;
    ids.forEach((id) => {
      nodes[id] = { x, y: r * ROW_GAP, w: NODE_W, h: NODE_H, rank: r };
      x += NODE_W + COL_GAP;
    });
  });

  const edges: TreeEdge[] = [];
  plants.forEach((p) => {
    const m = p.parents.mother;
    const f = p.parents.father;
    if (m && byId[m]) edges.push({ from: m, to: p.id, kind: 'mother' });
    if (f && byId[f] && f !== m) edges.push({ from: f, to: p.id, kind: 'father' });
  });

  const xs = Object.values(nodes).map((n) => n.x);
  const ys = Object.values(nodes).map((n) => n.y);
  return {
    nodes, edges,
    bounds: {
      minX: Math.min(...xs) - 40,
      maxX: Math.max(...xs) + NODE_W + 40,
      minY: Math.min(...ys) - 40,
      maxY: Math.max(...ys) + NODE_H + 40,
    },
  };
}
```

**Step 4: Add `layoutRadial`**

```typescript
export function layoutRadial(plants: TreeNode[], focalId: string): LayoutResult {
  const { byId, childrenOf } = buildIndex(plants);
  const RING_R = 200;
  const rank: Record<string, number> = { [focalId]: 0 };
  const queue: [string, number][] = [[focalId, 0]];

  while (queue.length) {
    const [id, r] = queue.shift()!;
    const p = byId[id];
    if (!p) continue;
    [p.parents.mother, p.parents.father].filter((x): x is string => !!x && !!byId[x]).forEach((pid) => {
      if (rank[pid] === undefined) { rank[pid] = r - 1; queue.push([pid, r - 1]); }
    });
    (childrenOf[id] ?? []).forEach((cid) => {
      if (rank[cid] === undefined) { rank[cid] = r + 1; queue.push([cid, r + 1]); }
    });
  }

  const byRank: Record<number, string[]> = {};
  Object.keys(rank).forEach((id) => {
    const r = rank[id];
    (byRank[r] = byRank[r] ?? []).push(id);
  });

  const nodes: Record<string, LayoutNode> = {};
  Object.entries(byRank).forEach(([rStr, ids]) => {
    const r = Number(rStr);
    if (r === 0) { nodes[ids[0]] = { x: 0, y: 0, w: NODE_W, h: NODE_H, rank: r }; return; }
    const isAncestor = r < 0;
    const radius = Math.abs(r) * RING_R;
    const startDeg = isAncestor ? -160 : 20;
    const endDeg = isAncestor ? -20 : 160;
    const n = ids.length;
    ids.forEach((id, i) => {
      const t = n === 1 ? 0.5 : i / (n - 1);
      const deg = startDeg + (endDeg - startDeg) * t;
      const rad = (deg * Math.PI) / 180;
      nodes[id] = {
        x: Math.cos(rad) * radius - NODE_W / 2,
        y: Math.sin(rad) * radius - NODE_H / 2,
        w: NODE_W, h: NODE_H, rank: r,
      };
    });
  });

  const edges: TreeEdge[] = [];
  Object.keys(rank).forEach((id) => {
    const p = byId[id];
    if (!p) return;
    const m = p.parents.mother;
    const f = p.parents.father;
    if (m && nodes[m]) edges.push({ from: m, to: id, kind: 'mother' });
    if (f && nodes[f] && f !== m) edges.push({ from: f, to: id, kind: 'father' });
  });

  const xs = Object.values(nodes).map((n) => n.x);
  const ys = Object.values(nodes).map((n) => n.y);
  return {
    nodes, edges,
    bounds: {
      minX: Math.min(...xs) - 60,
      maxX: Math.max(...xs) + NODE_W + 60,
      minY: Math.min(...ys) - 60,
      maxY: Math.max(...ys) + NODE_H + 60,
    },
  };
}
```

**Step 5: Add graph traversal utils**

```typescript
export function ancestorsOf(plants: TreeNode[], focalId: string): Set<string> {
  const byId = Object.fromEntries(plants.map((p) => [p.id, p]));
  const out = new Set<string>();
  const stack = [focalId];
  while (stack.length) {
    const id = stack.pop()!;
    const p = byId[id];
    if (!p) continue;
    [p.parents.mother, p.parents.father].filter(Boolean).forEach((pid) => {
      if (!out.has(pid!)) { out.add(pid!); stack.push(pid!); }
    });
  }
  return out;
}

export function descendantsOf(plants: TreeNode[], focalId: string): Set<string> {
  const childrenOf: Record<string, string[]> = {};
  plants.forEach((p) => {
    [p.parents.mother, p.parents.father].forEach((pid) => {
      if (!pid) return;
      (childrenOf[pid] = childrenOf[pid] ?? []).push(p.id);
    });
  });
  const out = new Set<string>();
  const stack = [focalId];
  while (stack.length) {
    const id = stack.pop()!;
    (childrenOf[id] ?? []).forEach((cid) => { if (!out.has(cid)) { out.add(cid); stack.push(cid); } });
  }
  return out;
}

export function motherLineOf(plants: TreeNode[], focalId: string): Set<string> {
  const byId = Object.fromEntries(plants.map((p) => [p.id, p]));
  const out = new Set<string>();
  let id: string | null | undefined = focalId;
  while (id) {
    const p = byId[id];
    if (!p) break;
    const m = p.parents.mother;
    if (!m || out.has(m)) break;
    out.add(m);
    id = m;
  }
  return out;
}

export function edgePath(from: LayoutNode, to: LayoutNode): string {
  const x1 = from.x + from.w / 2, y1 = from.y + from.h;
  const x2 = to.x + to.w / 2, y2 = to.y;
  const dy = (y2 - y1) / 2;
  return `M ${x1} ${y1} C ${x1} ${y1 + dy}, ${x2} ${y2 - dy}, ${x2} ${y2}`;
}

export function edgePathRadial(from: LayoutNode, to: LayoutNode): string {
  const x1 = from.x + from.w / 2, y1 = from.y + from.h / 2;
  const x2 = to.x + to.w / 2, y2 = to.y + to.h / 2;
  return `M ${x1} ${y1} Q ${(x1 + x2) / 2} ${(y1 + y2) / 2} ${x2} ${y2}`;
}
```

**Step 6: Verify TypeScript compiles**

```bash
cd /home/maxi/core/core/vendor/lovelace-growspace-manager-card
npx tsc --noEmit
```
Expected: no errors in the new file.

---

## Task 2: Lineage Tree View Component (`genetics-tree-view.ts`)

**File:** `src/features/shared/ui/genetics-tree-view.ts`

This is the main interactive component. It is a LitElement that owns all tree interaction state.

### Properties (public API)
```typescript
@property({ attribute: false }) nodes: TreeNode[] = [];  // pre-built flat list
@property({ type: Boolean }) showGrid = true;
```

### Internal state (all `@state()`)
```
_layout: 'topdown' | 'radial' = 'topdown'
_focalId: string | null = null
_focusMode = false
_highlightMother = false
_search = ''
_genFilter: string | null = null   // null = all
_collapsed: Set<string> = new Set()
_selectedId: string | null = null
_compareIds: string[] = []
_panX = 0; _panY = 0; _scale = 0.9
_dragging: { startX: number; startY: number; originX: number; originY: number } | null = null
_viewW = 1200; _viewH = 600
```

### Step 1: Create the file skeleton

```typescript
import { LitElement, html, css, nothing, svg, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import {
  mdiMagnify, mdiClose, mdiFitToPage, mdiPlus, mdiMinus,
  mdiViewDashboard, mdiCircle, mdiEye, mdiHighlight,
  mdiDna, mdiChevronDown, mdiChevronUp, mdiCompare,
} from '@mdi/js';
import {
  TreeNode, LayoutResult, NODE_W, NODE_H,
  layoutTopDown, layoutRadial,
  ancestorsOf, descendantsOf, motherLineOf,
  edgePath, edgePathRadial,
} from './genetics-tree-layout';

@customElement('genetics-tree-view')
export class GeneticsTreeView extends LitElement {
  @property({ attribute: false }) nodes: TreeNode[] = [];

  @state() private _layout: 'topdown' | 'radial' = 'topdown';
  @state() private _focalId: string | null = null;
  @state() private _focusMode = false;
  @state() private _highlightMother = false;
  @state() private _search = '';
  @state() private _genFilter: string | null = null;
  @state() private _collapsed: Set<string> = new Set();
  @state() private _selectedId: string | null = null;
  @state() private _compareIds: string[] = [];
  @state() private _panX = 0;
  @state() private _panY = 0;
  @state() private _scale = 0.9;
  @state() private _viewW = 1200;
  @state() private _viewH = 600;

  private _dragging: { sx: number; sy: number; ox: number; oy: number } | null = null;
  private _resizeObs?: ResizeObserver;

  // ... (implementation below)
}

declare global {
  interface HTMLElementTagNameMap {
    'genetics-tree-view': GeneticsTreeView;
  }
}
```

### Step 2: Add layout computation (computed getter, not @state)

Use `updated()` lifecycle to recompute and cache layout when `nodes` or display settings change:

```typescript
private _computed: LayoutResult | null = null;
private _childrenOf: Record<string, string[]> = {};

private _recompute() {
  const visible = this._visibleNodes();
  if (visible.length === 0) {
    this._computed = { nodes: {}, edges: [], bounds: { minX: 0, maxX: 400, minY: 0, maxY: 200 } };
    return;
  }
  if (this._layout === 'radial' && this._focalId && visible.find(p => p.id === this._focalId)) {
    this._computed = layoutRadial(visible, this._focalId);
  } else {
    this._computed = layoutTopDown(visible);
  }
}

private _visibleNodes(): TreeNode[] {
  if (this._collapsed.size === 0) return this.nodes;
  const hidden = new Set<string>();
  const stack = [...this._collapsed];
  while (stack.length) {
    const id = stack.pop()!;
    (this._childrenOf[id] ?? []).forEach((cid) => {
      if (!hidden.has(cid)) { hidden.add(cid); stack.push(cid); }
    });
  }
  return this.nodes.filter((p) => !hidden.has(p.id));
}

override updated(changed: Map<string, unknown>) {
  super.updated(changed);
  if (changed.has('nodes')) {
    // Rebuild childrenOf index
    this._childrenOf = {};
    this.nodes.forEach((p) => {
      [p.parents.mother, p.parents.father].forEach((pid) => {
        if (!pid) return;
        (this._childrenOf[pid] = this._childrenOf[pid] ?? []).push(p.id);
      });
    });
  }
  if (changed.has('nodes') || changed.has('_layout') || changed.has('_focalId') || changed.has('_collapsed')) {
    this._recompute();
    this._fitToScreen();
  }
}
```

### Step 3: Add pan/zoom handlers

```typescript
private _onWheel(e: WheelEvent) {
  e.preventDefault();
  const delta = -e.deltaY * 0.0015;
  const wrap = this.renderRoot.querySelector('.canvas-wrap') as HTMLElement;
  if (!wrap) return;
  const rect = wrap.getBoundingClientRect();
  const cx = e.clientX - rect.left;
  const cy = e.clientY - rect.top;
  const nextScale = Math.min(2, Math.max(0.2, this._scale * (1 + delta)));
  const wx = (cx - this._panX) / this._scale;
  const wy = (cy - this._panY) / this._scale;
  this._scale = nextScale;
  this._panX = cx - wx * nextScale;
  this._panY = cy - wy * nextScale;
}

private _onMouseDown(e: MouseEvent) {
  if (e.button !== 0) return;
  const target = e.target as HTMLElement;
  if (target.closest('.tree-node, .minimap, .compare-drawer, .toolbar-row')) return;
  this._dragging = { sx: e.clientX, sy: e.clientY, ox: this._panX, oy: this._panY };
}

private _onMouseMove(e: MouseEvent) {
  if (!this._dragging) return;
  this._panX = this._dragging.ox + (e.clientX - this._dragging.sx);
  this._panY = this._dragging.oy + (e.clientY - this._dragging.sy);
}

private _onMouseUp() { this._dragging = null; }

private _fitToScreen() {
  const b = this._computed?.bounds;
  if (!b) return;
  const bw = b.maxX - b.minX, bh = b.maxY - b.minY;
  const pad = 60;
  const sx = (this._viewW - pad * 2) / bw;
  const sy = (this._viewH - pad * 2) / bh;
  const sc = Math.min(sx, sy, 1.2);
  this._scale = sc;
  this._panX = (this._viewW - bw * sc) / 2 - b.minX * sc;
  this._panY = (this._viewH - bh * sc) / 2 - b.minY * sc;
}
```

### Step 4: Add focus/ancestor sets as getters

```typescript
private get _ancestorSet(): Set<string> {
  return this._focalId ? ancestorsOf(this.nodes, this._focalId) : new Set();
}
private get _descendantSet(): Set<string> {
  return this._focalId ? descendantsOf(this.nodes, this._focalId) : new Set();
}
private get _motherLineSet(): Set<string> {
  return this._focalId && this._highlightMother ? motherLineOf(this.nodes, this._focalId) : new Set();
}
```

### Step 5: Render method — outer shell

```typescript
override render(): TemplateResult {
  const c = this._computed;
  if (!c) return html`<div class="empty">No lineage data.</div>`;

  return html`
    <div class="shell"
      @mousedown=${this._onMouseDown}
      @mousemove=${this._onMouseMove}
      @mouseup=${this._onMouseUp}
      @mouseleave=${this._onMouseUp}
      @wheel=${this._onWheel}>

      ${this._renderToolbar()}
      ${this._renderFilterRow()}

      <div class="canvas-wrap">
        <div class="bg-grid"></div>
        <div class="canvas" style="transform: translate(${this._panX}px,${this._panY}px) scale(${this._scale})">
          ${this._renderEdges(c)}
          ${this._renderGenLabels(c)}
          ${this._renderNodes(c)}
        </div>
        ${this._renderZoomControls()}
        ${this._renderLegend()}
        ${this._renderMinimap(c)}
        ${this._renderCompareDrawer()}
      </div>

      ${this._renderDetailPanel()}
    </div>
  `;
}
```

### Step 6: Render toolbar

```typescript
private _renderToolbar(): TemplateResult {
  const visible = this._visibleNodes();
  return html`
    <div class="toolbar-row">
      <div class="search-bar">
        <svg class="s-icon" viewBox="0 0 24 24"><path d="${mdiMagnify}"/></svg>
        <input
          placeholder="Search name, strain, breeder…"
          .value=${this._search}
          @input=${(e: InputEvent) => { this._search = (e.target as HTMLInputElement).value; }}
        />
        ${this._search ? html`<button class="icon-btn sm" @click=${() => { this._search = ''; }}><svg viewBox="0 0 24 24"><path d="${mdiClose}"/></svg></button>` : nothing}
      </div>

      <div class="layout-toggle">
        <button class="${this._layout === 'topdown' ? 'active' : ''}" @click=${() => { this._layout = 'topdown'; }}>
          <svg viewBox="0 0 24 24"><path d="${mdiViewDashboard}"/></svg> Top-Down
        </button>
        <button class="${this._layout === 'radial' ? 'active' : ''}" @click=${() => { this._layout = 'radial'; if (!this._focalId && this.nodes.length) this._focalId = this.nodes[0].id; }}>
          <svg viewBox="0 0 24 24"><path d="${mdiCircle}"/></svg> Radial
        </button>
      </div>

      <button class="pill-btn ${this._focusMode ? 'active' : ''}" @click=${() => { this._focusMode = !this._focusMode; }}>
        <svg viewBox="0 0 24 24"><path d="${mdiEye}"/></svg> Focus
      </button>
      <button class="pill-btn ${this._highlightMother ? 'active' : ''}" @click=${() => { this._highlightMother = !this._highlightMother; }}>
        <svg viewBox="0 0 24 24"><path d="${mdiHighlight}"/></svg> Mother Line
      </button>
      <button class="pill-btn" @click=${() => this._fitToScreen()}>
        <svg viewBox="0 0 24 24"><path d="${mdiEye}"/></svg> Fit
      </button>

      <span class="count-badge">${visible.length} / ${this.nodes.length}</span>
    </div>
  `;
}
```

### Step 7: Render filter chips (generation filter)

```typescript
private _renderFilterRow(): TemplateResult {
  const gens = [...new Set(this.nodes.map((n) => n.gen))].sort();
  const hasFocus = this._focalId || this._focusMode || this._collapsed.size > 0;
  return html`
    <div class="filter-row">
      <button class="gen-chip ${this._genFilter === null ? 'active' : ''}" @click=${() => { this._genFilter = null; }}>All</button>
      ${gens.map((g) => html`
        <button class="gen-chip ${this._genFilter === g ? 'active' : ''}"
          @click=${() => { this._genFilter = this._genFilter === g ? null : g; }}>
          ${g}
        </button>
      `)}
      ${hasFocus ? html`
        <button class="clear-btn" @click=${() => { this._focalId = null; this._focusMode = false; this._collapsed = new Set(); this._highlightMother = false; }}>
          <svg viewBox="0 0 24 24"><path d="${mdiClose}"/></svg> Clear
        </button>` : nothing}
    </div>
  `;
}
```

### Step 8: Render SVG edges

```typescript
private _renderEdges(c: LayoutResult): TemplateResult {
  const b = c.bounds;
  const w = b.maxX - b.minX, h = b.maxY - b.minY;
  const ancSet = this._ancestorSet;
  const descSet = this._descendantSet;
  const mlSet = this._motherLineSet;

  const paths = c.edges.map((e) => {
    const from = c.nodes[e.from], to = c.nodes[e.to];
    if (!from || !to) return nothing;
    const d = (this._layout === 'radial') ? edgePathRadial(from, to) : edgePath(from, to);

    let cls = `edge edge-${e.kind}`;
    const isMotherLine = mlSet.has(e.from) && (e.to === this._focalId || mlSet.has(e.to));
    if (isMotherLine) cls += ' mother-line';
    else if (this._focusMode && this._focalId) {
      const linked = (ancSet.has(e.from) && (e.to === this._focalId || ancSet.has(e.to))) ||
                     (descSet.has(e.to) && (e.from === this._focalId || descSet.has(e.from)));
      if (!linked && e.from !== this._focalId && e.to !== this._focalId) cls += ' dimmed';
    }
    return svg`<path d="${d}" class="${cls}" />`;
  });

  return html`
    <svg class="edges-svg" style="left:${b.minX}px;top:${b.minY}px;width:${w}px;height:${h}px"
         viewBox="${b.minX} ${b.minY} ${w} ${h}">
      ${paths}
    </svg>
  `;
}
```

### Step 9: Render generation labels (top-down only)

```typescript
private _renderGenLabels(c: LayoutResult): TemplateResult {
  if (this._layout !== 'topdown') return html``;
  const visible = this._visibleNodes();
  const rankInfo: Record<number, { y: number; gens: Set<string> }> = {};
  visible.forEach((p) => {
    const n = c.nodes[p.id]; if (!n) return;
    if (!rankInfo[n.rank]) rankInfo[n.rank] = { y: n.y, gens: new Set() };
    rankInfo[n.rank].gens.add(p.gen);
  });

  return html`${Object.entries(rankInfo).map(([r, info]) => html`
    <div class="gen-label" style="left:${c.bounds.minX + 8}px;top:${info.y + NODE_H / 2 - 12}px">
      <span class="gen-eyebrow">Gen ${r}</span>
      <span class="gen-tags">${[...info.gens].join(' · ')}</span>
    </div>
  `)}`;
}
```

### Step 10: Render nodes

```typescript
private _renderNodes(c: LayoutResult): TemplateResult {
  const ancSet = this._ancestorSet;
  const descSet = this._descendantSet;
  const mlSet = this._motherLineSet;
  const search = this._search.toLowerCase().trim();

  const matchSearch = (p: TreeNode) =>
    !search ||
    p.name.toLowerCase().includes(search) ||
    p.strain.toLowerCase().includes(search) ||
    p.breeder.toLowerCase().includes(search) ||
    p.pheno.toLowerCase().includes(search);

  const matchGen = (p: TreeNode) => !this._genFilter || p.gen === this._genFilter;

  const visible = this._visibleNodes();
  return html`${visible.map((p) => {
    const n = c.nodes[p.id]; if (!n) return nothing;
    const isMatched = matchSearch(p) && matchGen(p);
    const isFocusRel = !this._focusMode || !this._focalId ||
      p.id === this._focalId || ancSet.has(p.id) || descSet.has(p.id);
    const dimmed = !isMatched || !isFocusRel;
    const highlighted = p.id === this._focalId || mlSet.has(p.id) ||
      (this._focusMode && (ancSet.has(p.id) || descSet.has(p.id)));
    const hasChildren = (this._childrenOf[p.id]?.length ?? 0) > 0;
    const isCollapsed = this._collapsed.has(p.id);
    const compareIdx = this._compareIds.indexOf(p.id);

    return html`
      <div style="position:absolute">
        ${this._renderNode(p, n, dimmed, highlighted, compareIdx, isCollapsed)}
        ${hasChildren ? html`
          <button class="fold-btn ${isCollapsed ? 'collapsed' : ''}"
            style="left:${n.x + n.w - 20}px;top:${n.y + n.h - 12}px"
            @click=${(e: Event) => { e.stopPropagation(); this._toggleCollapse(p.id); }}>
            <svg viewBox="0 0 24 24"><path d="${isCollapsed ? mdiChevronUp : mdiChevronDown}"/></svg>
            ${isCollapsed ? html`<span class="fold-count">${descendantsOf(this.nodes, p.id).size}</span>` : nothing}
          </button>` : nothing}
      </div>
    `;
  })}`;
}

private _renderNode(p: TreeNode, n: LayoutNode, dimmed: boolean, highlighted: boolean, compareIdx: number, collapsed: boolean): TemplateResult {
  const genColors: Record<string, string> = {
    P1: '#9e9e9e', F1: '#4caf50', F2: '#8bc34a', BX1: '#ff9800', BX2: '#f57c00',
    S1: '#2196f3', CL: '#e91e63',
  };
  const stageColor = genColors[p.gen] ?? '#555';

  let cls = 'tree-node';
  if (dimmed) cls += ' dimmed';
  if (highlighted) cls += ' highlighted';
  if (collapsed) cls += ' collapsed';
  if (this._selectedId === p.id) cls += ' selected';
  if (compareIdx >= 0) cls += ' compare';

  return html`
    <div class="${cls}"
      style="left:${n.x}px;top:${n.y}px;width:${n.w}px;height:${n.h}px;--stage-c:${stageColor}"
      @click=${(e: Event) => { e.stopPropagation(); this._onNodeClick(p); }}
      @contextmenu=${(e: Event) => { e.preventDefault(); this._toggleCollapse(p.id); }}>
      <div class="pn-body">
        <div class="pn-row1">
          <span class="gen-badge">${p.gen}</span>
          <span class="pn-name">${p.name}</span>
        </div>
        <div class="pn-row2">${p.strain} · ${p.breeder}</div>
        <div class="pn-row3">
          <span class="type-badge ${p.type}">${p.type === 'strain' ? 'IMPORT' : 'BATCH'}</span>
          ${p.pheno && p.pheno !== '—' ? html`<span class="pheno-badge">${p.pheno}</span>` : nothing}
        </div>
      </div>
      ${compareIdx >= 0 ? html`<div class="compare-badge">${compareIdx === 0 ? 'A' : 'B'}</div>` : nothing}
    </div>
  `;
}
```

### Step 11: Node interaction handlers

```typescript
private _onNodeClick(p: TreeNode) {
  this._selectedId = this._selectedId === p.id ? null : p.id;
  if (this._focusMode || this._layout === 'radial') {
    this._focalId = p.id;
  }
}

private _toggleCollapse(id: string) {
  const next = new Set(this._collapsed);
  if (next.has(id)) next.delete(id); else next.add(id);
  this._collapsed = next;
}
```

### Step 12: Render zoom controls

```typescript
private _renderZoomControls(): TemplateResult {
  return html`
    <div class="zoom-controls">
      <button class="icon-btn" @click=${() => { this._scale = Math.min(2, this._scale * 1.2); }}>
        <svg viewBox="0 0 24 24"><path d="${mdiPlus}"/></svg>
      </button>
      <span class="zoom-pct">${Math.round(this._scale * 100)}%</span>
      <button class="icon-btn" @click=${() => { this._scale = Math.max(0.2, this._scale / 1.2); }}>
        <svg viewBox="0 0 24 24"><path d="${mdiMinus}"/></svg>
      </button>
    </div>
  `;
}
```

### Step 13: Render mini-map

```typescript
private _renderMinimap(c: LayoutResult): TemplateResult {
  const W = 180, H = 120, pad = 8;
  const b = c.bounds;
  const bw = b.maxX - b.minX, bh = b.maxY - b.minY;
  const sc = Math.min((W - pad * 2) / bw, (H - pad * 2) / bh);
  const ox = (W - bw * sc) / 2 - b.minX * sc;
  const oy = (H - bh * sc) / 2 - b.minY * sc;

  const vx0 = -this._panX / this._scale;
  const vy0 = -this._panY / this._scale;
  const vw = this._viewW / this._scale;
  const vh = this._viewH / this._scale;

  const genColors: Record<string, string> = {
    P1: '#9e9e9e', F1: '#4caf50', F2: '#8bc34a', BX1: '#ff9800', BX2: '#f57c00', S1: '#2196f3', CL: '#e91e63',
  };
  const visible = this._visibleNodes();

  return html`
    <div class="minimap" @click=${(e: MouseEvent) => {
      const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const wx = (e.clientX - r.left - ox) / sc;
      const wy = (e.clientY - r.top - oy) / sc;
      this._panX = this._viewW / 2 - wx * this._scale;
      this._panY = this._viewH / 2 - wy * this._scale;
    }}>
      <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
        <rect width="${W}" height="${H}" fill="rgba(0,0,0,0.5)"/>
        ${visible.map((p) => {
          const n = c.nodes[p.id]; if (!n) return nothing;
          return svg`<rect x="${ox + n.x * sc}" y="${oy + n.y * sc}"
            width="${Math.max(2, n.w * sc)}" height="${Math.max(2, n.h * sc)}"
            rx="1.5" fill="${genColors[p.gen] ?? '#666'}" opacity="0.8"/>`;
        })}
        <rect x="${ox + vx0 * sc}" y="${oy + vy0 * sc}"
          width="${vw * sc}" height="${vh * sc}"
          fill="rgba(76,175,80,0.08)" stroke="#4caf50" stroke-width="1.5" rx="3"/>
      </svg>
    </div>
  `;
}
```

### Step 14: Render legend

```typescript
private _renderLegend(): TemplateResult {
  return html`
    <div class="legend">
      <div class="legend-row"><span class="legend-line solid"></span> Mother</div>
      <div class="legend-row"><span class="legend-line dashed"></span> Father</div>
    </div>
  `;
}
```

### Step 15: Render compare drawer and detail panel

```typescript
private _renderCompareDrawer(): TemplateResult {
  if (this._compareIds.length === 0) return html``;
  const byId = Object.fromEntries(this.nodes.map((p) => [p.id, p]));
  const [a, b] = [byId[this._compareIds[0]], this._compareIds[1] && byId[this._compareIds[1]]];
  const rows: [string, keyof TreeNode][] = [['Strain', 'strain'], ['Breeder', 'breeder'], ['Pheno', 'pheno'], ['Gen', 'gen'], ['Type', 'type']];
  const col = (p: TreeNode | undefined, i: number) => p ? html`
    <div class="cd-col">
      <div class="cd-header">
        <span class="cd-name">${p.name}</span>
        <button class="icon-btn sm" @click=${() => { this._compareIds = this._compareIds.filter((x) => x !== p.id); }}>
          <svg viewBox="0 0 24 24"><path d="${mdiClose}"/></svg>
        </button>
      </div>
      ${rows.map(([label, key]) => html`
        <div class="cd-row"><span class="cd-k">${label}</span><span class="cd-v">${p[key]}</span></div>
      `)}
    </div>` : html`
    <div class="cd-col cd-empty">
      <svg viewBox="0 0 24 24"><path d="${mdiPlus}"/></svg>
      <span>Click a node to compare</span>
    </div>`;
  return html`
    <div class="compare-drawer">
      <div class="cd-title">
        <svg viewBox="0 0 24 24"><path d="${mdiCompare}"/></svg> Compare
        <button class="icon-btn sm" @click=${() => { this._compareIds = []; }}><svg viewBox="0 0 24 24"><path d="${mdiClose}"/></svg></button>
      </div>
      <div class="cd-cols">${col(a, 0)}${col(b as TreeNode | undefined, 1)}</div>
    </div>
  `;
}

private _renderDetailPanel(): TemplateResult {
  if (!this._selectedId) return html``;
  const p = this.nodes.find((n) => n.id === this._selectedId);
  if (!p) return html``;
  const byId = Object.fromEntries(this.nodes.map((n) => [n.id, n]));
  const mom = p.parents.mother && byId[p.parents.mother];
  const dad = p.parents.father && byId[p.parents.father];
  return html`
    <div class="detail-panel">
      <div class="dp-header">
        <span class="dp-title">${p.name}</span>
        <button class="icon-btn sm" @click=${() => { this._selectedId = null; }}><svg viewBox="0 0 24 24"><path d="${mdiClose}"/></svg></button>
      </div>
      <div class="dp-body">
        <div class="dp-row"><span>Generation</span><b>${p.gen}</b></div>
        <div class="dp-row"><span>Strain</span><b>${p.strain}</b></div>
        <div class="dp-row"><span>Breeder</span><b>${p.breeder}</b></div>
        <div class="dp-row"><span>Phenotype</span><b>${p.pheno || '—'}</b></div>
        <div class="dp-row"><span>Mother</span><b>${mom ? html`<a @click=${() => { this._focalId = mom.id; this._focusMode = true; }}>${mom.name}</a>` : '—'}</b></div>
        <div class="dp-row"><span>Father</span><b>${dad ? dad.name : '—'}</b></div>
      </div>
      <div class="dp-footer">
        <button class="pill-btn" @click=${() => { this._focalId = p.id; this._focusMode = true; }}>Focus Lineage</button>
        <button class="pill-btn" @click=${() => { this._compareIds = [...new Set([...this._compareIds, p.id])].slice(0, 2); }}>Compare</button>
      </div>
    </div>
  `;
}
```

### Step 16: Add ResizeObserver for responsive canvas

```typescript
override connectedCallback() {
  super.connectedCallback();
  this._resizeObs = new ResizeObserver((entries) => {
    const entry = entries[0];
    if (entry) {
      this._viewW = entry.contentRect.width;
      this._viewH = entry.contentRect.height - 100; // subtract toolbar heights
    }
  });
  this.updateComplete.then(() => {
    const wrap = this.renderRoot.querySelector('.canvas-wrap') as HTMLElement;
    if (wrap) this._resizeObs!.observe(wrap);
  });
}

override disconnectedCallback() {
  super.disconnectedCallback();
  this._resizeObs?.disconnect();
}
```

### Step 17: Add all CSS

Port the CSS from `styles.css` in the design bundle, adapting selectors and using the existing token variables. Key sections:

```typescript
static override styles = css`
  :host {
    display: block;
    height: 100%;
    font-family: var(--font-sans, 'Roboto', sans-serif);
    color: var(--primary-text-color, #fff);
    --bg-app: #101010;
    --bg-card: #1e1e1e;
    --bg-card-elev: #252525;
    --bg-input: #2a2a2a;
    --bg-input-border: #3a3a3a;
    --bg-glass: rgba(20,20,24,0.8);
    --fg-1: #fff;
    --fg-2: rgba(255,255,255,0.70);
    --fg-3: rgba(255,255,255,0.50);
    --divider-faint: rgba(255,255,255,0.05);
    --primary: #4caf50;
    --secondary: #2196f3;
    --mother-color: #e91e63;
    --elev-glass: 0 8px 32px rgba(0,0,0,.37);
  }

  .shell {
    display: flex; flex-direction: column; height: 100%;
    background: var(--bg-app); position: relative; overflow: hidden;
    user-select: none;
  }

  /* Toolbar */
  .toolbar-row {
    display: flex; align-items: center; gap: 12px; padding: 10px 16px;
    background: var(--bg-card); border-bottom: 1px solid var(--divider-faint);
    flex-shrink: 0; flex-wrap: wrap;
  }
  .search-bar {
    display: flex; align-items: center; gap: 8px;
    flex: 1; max-width: 380px;
    background: var(--bg-input); border: 1px solid var(--bg-input-border);
    border-radius: 999px; padding: 6px 12px;
    transition: border-color 0.15s;
  }
  .search-bar:focus-within { border-color: var(--primary); }
  .search-bar input {
    flex: 1; background: transparent; border: 0; outline: 0;
    color: var(--fg-1); font-size: 0.875rem;
  }
  .search-bar input::placeholder { color: var(--fg-3); }
  .s-icon { width: 18px; height: 18px; fill: var(--fg-3); flex-shrink: 0; }

  .layout-toggle {
    display: flex; background: var(--bg-input); border: 1px solid var(--bg-input-border);
    border-radius: 999px; padding: 3px; gap: 2px;
  }
  .layout-toggle button {
    display: flex; align-items: center; gap: 6px;
    background: transparent; border: 0; color: var(--fg-2);
    padding: 5px 12px; border-radius: 999px; font-size: 0.78rem;
    cursor: pointer; transition: all 0.15s;
  }
  .layout-toggle button svg { width: 16px; height: 16px; fill: currentColor; }
  .layout-toggle button.active { background: linear-gradient(135deg, #4caf50, #45a049); color: #fff; font-weight: 500; }

  .pill-btn {
    display: inline-flex; align-items: center; gap: 6px;
    background: var(--bg-input); border: 1px solid var(--bg-input-border);
    color: var(--fg-2); padding: 6px 12px; border-radius: 999px;
    font-size: 0.78rem; cursor: pointer; transition: all 0.15s;
  }
  .pill-btn svg { width: 16px; height: 16px; fill: currentColor; }
  .pill-btn:hover { color: var(--fg-1); }
  .pill-btn.active { background: rgba(76,175,80,0.15); border-color: rgba(76,175,80,0.4); color: var(--primary); }

  .icon-btn { display: inline-flex; align-items: center; justify-content: center;
    background: transparent; border: 0; color: var(--fg-2); cursor: pointer;
    width: 32px; height: 32px; border-radius: 50%; transition: all 0.15s; }
  .icon-btn svg { width: 18px; height: 18px; fill: currentColor; }
  .icon-btn:hover { color: var(--fg-1); }
  .icon-btn.sm { width: 24px; height: 24px; }
  .icon-btn.sm svg { width: 14px; height: 14px; }

  .count-badge {
    font-size: 0.72rem; color: var(--fg-3);
    font-feature-settings: "tnum" 1; margin-left: auto;
  }

  /* Filter row */
  .filter-row {
    display: flex; gap: 6px; padding: 8px 16px; flex-wrap: wrap;
    background: var(--bg-card); border-bottom: 1px solid var(--divider-faint);
    flex-shrink: 0;
  }
  .gen-chip {
    display: inline-flex; align-items: center; gap: 5px;
    background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
    color: var(--fg-2); padding: 4px 10px; border-radius: 999px;
    font-size: 0.72rem; cursor: pointer; transition: all 0.15s;
  }
  .gen-chip:hover { background: rgba(255,255,255,0.08); color: var(--fg-1); }
  .gen-chip.active { background: rgba(76,175,80,0.15); border-color: rgba(76,175,80,0.4); color: var(--primary); }
  .clear-btn {
    margin-left: auto; display: inline-flex; align-items: center; gap: 4px;
    background: rgba(244,67,54,0.1); border: 1px solid rgba(244,67,54,0.3);
    color: #ef5350; padding: 4px 10px; border-radius: 999px;
    font-size: 0.72rem; cursor: pointer;
  }
  .clear-btn svg { width: 12px; height: 12px; fill: currentColor; }

  /* Canvas */
  .canvas-wrap {
    flex: 1; position: relative; overflow: hidden; cursor: grab;
  }
  .canvas-wrap:active { cursor: grabbing; }
  .bg-grid {
    position: absolute; inset: 0; pointer-events: none;
    background-image: radial-gradient(circle at 1px 1px, rgba(255,255,255,0.04) 1px, transparent 0);
    background-size: 28px 28px;
  }
  .canvas { position: absolute; top: 0; left: 0; transform-origin: 0 0; will-change: transform; }

  /* Edges */
  .edges-svg { position: absolute; pointer-events: none; overflow: visible; }
  .edge { fill: none; stroke-width: 1.6; transition: opacity 0.2s, stroke 0.2s; }
  .edge-mother { stroke: rgba(255,255,255,0.55); }
  .edge-father { stroke: rgba(255,255,255,0.30); stroke-dasharray: 6 4; }
  .edge-clone  { stroke: rgba(233,30,99,0.65); stroke-dasharray: 2 4; }
  .edge.dimmed { opacity: 0.10; }
  .edge.mother-line { stroke: #e91e63; stroke-width: 2.5; filter: drop-shadow(0 0 4px rgba(233,30,99,0.5)); }

  /* Nodes */
  .tree-node {
    position: absolute; background: var(--bg-card-elev, #252525);
    border: 1px solid rgba(255,255,255,0.06); border-radius: 12px;
    overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,.3);
    cursor: pointer; display: flex; flex-direction: column;
    transition: transform 0.15s, box-shadow 0.15s, border-color 0.15s, opacity 0.15s;
  }
  .tree-node::before {
    content: ""; position: absolute; left: 0; top: 0; bottom: 0;
    width: 3px; background: var(--stage-c, #555); z-index: 2;
  }
  .tree-node:hover { transform: translateY(-2px); box-shadow: 0 4px 16px rgba(0,0,0,.5); border-color: rgba(255,255,255,0.15); }
  .tree-node.dimmed { opacity: 0.14; filter: grayscale(0.7); }
  .tree-node.highlighted { border-color: var(--stage-c, #555); }
  .tree-node.selected { border-color: var(--stage-c, #555); box-shadow: 0 0 0 2px var(--stage-c, #555), 0 8px 24px rgba(0,0,0,.6); z-index: 3; }
  .tree-node.compare { outline: 2px solid var(--secondary, #2196f3); outline-offset: 2px; }

  .pn-body { padding: 7px 10px 7px 13px; display: flex; flex-direction: column; gap: 3px; flex: 1; min-height: 0; }
  .pn-row1 { display: flex; align-items: center; gap: 6px; }
  .gen-badge {
    font-size: 0.62rem; font-weight: 600; letter-spacing: 0.04em;
    background: rgba(255,255,255,0.08); color: var(--fg-2);
    padding: 1px 5px; border-radius: 4px; flex-shrink: 0;
    font-feature-settings: "tnum" 1;
  }
  .pn-name { font-size: 0.82rem; font-weight: 500; color: var(--fg-1); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .pn-row2 { font-size: 0.68rem; color: var(--fg-3); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .pn-row3 { display: flex; gap: 4px; flex-wrap: wrap; }
  .type-badge { font-size: 0.6rem; letter-spacing: 0.06em; font-weight: 600; padding: 1px 5px; border-radius: 4px; }
  .type-badge.strain { color: var(--fg-3); background: rgba(255,255,255,0.06); border: 1px dashed rgba(255,255,255,0.15); }
  .type-badge.batch { color: var(--primary); background: rgba(76,175,80,0.12); }
  .pheno-badge { font-size: 0.6rem; color: var(--fg-3); background: rgba(255,255,255,0.06); padding: 1px 5px; border-radius: 4px; }
  .compare-badge {
    position: absolute; top: 5px; right: 5px;
    background: var(--secondary, #2196f3); color: #fff;
    font-size: 0.62rem; font-weight: 700; padding: 1px 5px;
    border-radius: 999px; z-index: 4;
  }

  /* Fold button */
  .fold-btn {
    position: absolute; background: var(--bg-card, #1e1e1e); border: 1px solid rgba(255,255,255,0.12);
    color: var(--fg-2); width: 20px; height: 20px; border-radius: 50%;
    display: inline-flex; align-items: center; justify-content: center; z-index: 5;
    box-shadow: 0 1px 3px rgba(0,0,0,.3); cursor: pointer; transition: all 0.15s;
  }
  .fold-btn:hover { color: var(--fg-1); border-color: var(--primary); }
  .fold-btn.collapsed { background: var(--primary); color: #fff; border-color: #45a049; width: auto; padding: 0 6px; }
  .fold-btn svg { width: 12px; height: 12px; fill: currentColor; }
  .fold-count { font-size: 0.62rem; font-weight: 600; margin-left: 3px; }

  /* Gen labels */
  .gen-label { position: absolute; pointer-events: none; width: 72px; transform: translateX(-100%); }
  .gen-eyebrow { display: block; font-size: 0.62rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--fg-3); font-weight: 500; }
  .gen-tags { display: block; font-size: 0.68rem; color: var(--fg-2); font-weight: 500; }

  /* Zoom controls */
  .zoom-controls {
    position: absolute; bottom: 20px; left: 20px;
    display: flex; flex-direction: column; align-items: center; gap: 4px;
    background: var(--bg-glass); backdrop-filter: blur(12px);
    border: 1px solid rgba(255,255,255,0.06); border-radius: 999px;
    padding: 6px; box-shadow: var(--elev-glass); z-index: 5;
  }
  .zoom-pct { font-size: 0.68rem; color: var(--fg-2); font-feature-settings: "tnum" 1; font-weight: 500; }

  /* Legend */
  .legend {
    position: absolute; bottom: 20px; left: 80px;
    background: var(--bg-glass); backdrop-filter: blur(12px);
    border: 1px solid rgba(255,255,255,0.06); border-radius: 10px;
    padding: 8px 12px; display: flex; flex-direction: column; gap: 5px;
    box-shadow: var(--elev-glass); z-index: 5; font-size: 0.7rem; color: var(--fg-2);
  }
  .legend-row { display: flex; align-items: center; gap: 8px; }
  .legend-line { display: inline-block; width: 20px; height: 2px; border-radius: 2px; }
  .legend-line.solid { background: rgba(255,255,255,0.5); }
  .legend-line.dashed { background: linear-gradient(to right, rgba(255,255,255,0.4) 50%, transparent 50%); background-size: 6px 2px; background-repeat: repeat-x; }

  /* Minimap */
  .minimap {
    position: absolute; bottom: 20px; right: 20px;
    width: 180px; height: 120px;
    background: var(--bg-glass); backdrop-filter: blur(12px);
    border: 1px solid rgba(255,255,255,0.06); border-radius: 10px;
    overflow: hidden; box-shadow: var(--elev-glass); z-index: 5; cursor: crosshair;
  }

  /* Compare drawer */
  .compare-drawer {
    position: absolute; top: 10px; right: 10px; width: 340px;
    max-height: 60vh; background: var(--bg-glass); backdrop-filter: blur(20px);
    border: 1px solid rgba(255,255,255,0.06); border-radius: 14px;
    box-shadow: var(--elev-glass); z-index: 8;
    display: flex; flex-direction: column;
  }
  .cd-title { display: flex; align-items: center; gap: 8px; padding: 12px 14px;
    border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 0.875rem; font-weight: 500; }
  .cd-title svg { width: 16px; height: 16px; fill: var(--fg-2); }
  .cd-title .icon-btn { margin-left: auto; }
  .cd-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 1px; background: rgba(255,255,255,0.05); flex: 1; overflow-y: auto; }
  .cd-col { background: var(--bg-card, #1e1e1e); padding: 10px; display: flex; flex-direction: column; gap: 6px; }
  .cd-empty { display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 6px; min-height: 160px; color: var(--fg-3); font-size: 0.72rem; text-align: center; }
  .cd-empty svg { width: 24px; height: 24px; fill: rgba(255,255,255,0.2); }
  .cd-header { display: flex; align-items: center; gap: 6px; }
  .cd-name { font-size: 0.82rem; font-weight: 500; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .cd-row { display: flex; justify-content: space-between; gap: 6px; font-size: 0.7rem; padding: 3px 0; border-bottom: 1px solid rgba(255,255,255,0.04); }
  .cd-row:last-of-type { border-bottom: 0; }
  .cd-k { color: var(--fg-3); text-transform: uppercase; letter-spacing: 0.04em; font-size: 0.62rem; }
  .cd-v { color: var(--fg-1); text-align: right; }

  /* Detail panel */
  .detail-panel {
    position: absolute; bottom: 0; left: 0; right: 0;
    background: var(--bg-glass); backdrop-filter: blur(20px);
    border-top: 1px solid rgba(255,255,255,0.06);
    display: flex; flex-direction: column; z-index: 6;
  }
  .dp-header { display: flex; align-items: center; gap: 10px; padding: 10px 16px; border-bottom: 1px solid rgba(255,255,255,0.05); }
  .dp-title { flex: 1; font-size: 0.95rem; font-weight: 500; }
  .dp-body { display: flex; flex-wrap: wrap; gap: 0; padding: 8px 0; }
  .dp-row { display: flex; gap: 4px; flex-direction: column; padding: 6px 16px; min-width: 120px; flex: 1; }
  .dp-row span { font-size: 0.62rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--fg-3); }
  .dp-row b { font-size: 0.82rem; font-weight: 500; color: var(--fg-1); }
  .dp-row a { color: var(--secondary); text-decoration: underline dotted; cursor: pointer; }
  .dp-footer { display: flex; gap: 8px; padding: 8px 16px; border-top: 1px solid rgba(255,255,255,0.05); }

  .empty { display: flex; align-items: center; justify-content: center; height: 200px; color: var(--fg-3); font-style: italic; }
`;
```

### Step 18: Verify TypeScript compiles

```bash
cd /home/maxi/core/core/vendor/lovelace-growspace-manager-card
npx tsc --noEmit
```
Expected: no errors.

---

## Task 3: Add "Tree View" Tab to Strain Library Dialog

**File:** `src/dialogs/strain-library-dialog.ts`

### Step 1: Add import

At the top with the other imports:
```typescript
import '../features/shared/ui/genetics-tree-view';
import type { TreeNode } from '../features/shared/ui/genetics-tree-layout';
```

### Step 2: Add 'tree' to the tab type

Find the line:
```typescript
@state() private _activeMainTab: 'strains' | 'seeds' = 'strains';
```
Change to:
```typescript
@state() private _activeMainTab: 'strains' | 'seeds' | 'tree' = 'strains';
```

Also update `initialTab` property:
```typescript
@property({ type: String }) initialTab: 'strains' | 'seeds' | 'tree' = 'strains';
```

### Step 3: Add "Tree View" button in `_renderTabBar()`

Find `_renderTabBar()` and add a third button after the seeds tab button:
```typescript
<button
  class="tab-btn ${this._activeMainTab === 'tree' ? 'active' : ''}"
  @click=${() => { this._activeMainTab = 'tree'; }}>
  Tree View
</button>
```

### Step 4: Update the main render switch

Find the `_renderTabBar()` render block:
```typescript
${this._activeMainTab === 'seeds'
  ? this._renderSeedsTab()
  : (this._view === 'browse' ? this.renderBrowseView() : this.renderEditorView())
}
```
Replace with:
```typescript
${this._activeMainTab === 'tree'
  ? this._renderTreeViewTab()
  : this._activeMainTab === 'seeds'
    ? this._renderSeedsTab()
    : (this._view === 'browse' ? this.renderBrowseView() : this.renderEditorView())
}
```

### Step 5: Add `_buildTreeNodes()` helper

Add this private method to convert dialog data to `TreeNode[]`:
```typescript
private _buildTreeNodes(): TreeNode[] {
  const nodes: TreeNode[] = [];
  const strainNodeMap = new Map<string, string>(); // strain name → node id

  // Collect all unique parent strain names referenced in seed batches
  const parentStrainNames = new Set<string>();
  this.seedBatches.forEach((b) => {
    if (b.parent_1_strain) parentStrainNames.add(b.parent_1_strain);
    if (b.parent_2_strain) parentStrainNames.add(b.parent_2_strain);
  });

  // Create strain nodes for known library strains (that appear as parents or have lineage)
  this.strains.forEach((s) => {
    const id = `strain-${s.key}`;
    strainNodeMap.set(s.strain, id);
    nodes.push({
      id,
      name: s.phenotype && s.phenotype !== 'default' ? `${s.strain} (${s.phenotype})` : s.strain,
      strain: s.strain,
      breeder: s.breeder ?? '—',
      pheno: (s.phenotype && s.phenotype !== 'default') ? s.phenotype : '—',
      gen: 'P1',
      type: 'strain',
      parents: { mother: null, father: null },
    });
  });

  // Create batch nodes
  this.seedBatches.forEach((b) => {
    const motherId = b.parent_1_strain ? strainNodeMap.get(b.parent_1_strain) ?? null : null;
    const fatherId = b.parent_2_strain ? strainNodeMap.get(b.parent_2_strain) ?? null : null;
    nodes.push({
      id: b.batch_id,
      name: b.strain_name,
      strain: b.strain_name,
      breeder: b.breeder,
      pheno: '—',
      gen: b.generation || 'F1',
      type: 'batch',
      parents: { mother: motherId, father: fatherId },
    });
  });

  return nodes;
}
```

### Step 6: Add `_renderTreeViewTab()` method

```typescript
private _renderTreeViewTab(): TemplateResult {
  const nodes = this._buildTreeNodes();
  return html`
    <div style="flex: 1; min-height: 0; display: flex; flex-direction: column;">
      <genetics-tree-view .nodes=${nodes}></genetics-tree-view>
    </div>
  `;
}
```

### Step 7: Add CSS for the tree view tab container

In the main dialog `static override styles`, add inside the existing CSS block:
```css
/* Tree view tab fills available space */
.tab-content-tree {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
```

The dialog content area already uses flex column, so the tree view will stretch to fill available space automatically. The `<genetics-tree-view>` has `height: 100%` on `:host`.

### Step 8: Verify TypeScript compiles with no errors

```bash
cd /home/maxi/core/core/vendor/lovelace-growspace-manager-card
npx tsc --noEmit
```
Expected: zero errors.

### Step 9: Build

```bash
cd /home/maxi/core/core/vendor/lovelace-growspace-manager-card
npm run build
```
Expected: successful build, no type errors.

---

## Visual Verification Checklist

After building, open the Growspace card, open Strain Library dialog, click "Tree View" tab:

- [ ] Tree renders with nodes positioned absolutely on a dark canvas
- [ ] Nodes show: left color bar (gen color), gen badge, name, strain · breeder, type badge
- [ ] Edges render as SVG paths between parent and child nodes
- [ ] Pan works: drag the canvas
- [ ] Zoom works: mouse wheel zooms toward cursor; zoom controls work
- [ ] Fit button centers and scales tree to fill the view
- [ ] Top-Down layout groups nodes by generation rank
- [ ] Radial layout centers on focal plant with ancestors above
- [ ] Search filters nodes (non-matching nodes dim)
- [ ] Generation filter chips work
- [ ] Mini-map shows colored rects, green viewport indicator, click-to-jump
- [ ] Focus mode dims non-related nodes
- [ ] Right-click / fold button collapses subtree; badge shows count
- [ ] Compare picker: click a node then another → compare drawer with field table
- [ ] Detail panel opens on node click: shows lineage links, Focus / Compare buttons
- [ ] Mother Line highlight shows magenta glow on maternal path

---

## Commit Strategy

```
feat: add genetics-tree-layout.ts with top-down and radial layout engines
feat: add genetics-tree-view LitElement with pan/zoom canvas, mini-map, search, focus mode
feat: add Tree View tab to strain-library-dialog wired to seed batch data
```

One commit per task, in order.
