import { LitElement, html, css, nothing, svg, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import {
  mdiMagnify,
  mdiClose,
  mdiPlus,
  mdiMinus,
  mdiEye,
  mdiChevronDown,
  mdiFitToPageOutline,
} from '@mdi/js';
import {
  type TreeNode,
  type LayoutResult,
  NODE_W,
  NODE_H,
  buildIndex,
  layoutTopDown,
  layoutSubgraph,
  layoutBreederGrouped,
  ancestorsOf,
  descendantsOf,
  edgePath,
  edgePathCurve,
} from './genetics-tree-layout';

const GEN_COLORS: Record<string, string> = {
  P1: '#9e9e9e',
  F1: '#4caf50',
  F2: '#8bc34a',
  BX1: '#ff9800',
  BX2: '#f57c00',
  S1: '#2196f3',
  CL: '#e91e63',
};

function genColor(gen: string): string {
  return GEN_COLORS[gen] ?? '#555';
}

type ViewMode = 'tree' | 'lineage' | 'families';

@customElement('genetics-tree-view')
export class GeneticsTreeView extends LitElement {
  @property({ attribute: false }) nodes: TreeNode[] = [];
  /** External focal node — switches to lineage mode when set. */
  @property({ type: String }) focalId: string | null = null;

  @state() private _mode: ViewMode = 'tree';
  @state() private _focalId: string | null = null;
  @state() private _search = '';
  @state() private _genFilter: string | null = null;
  @state() private _breederFilter = '';
  @state() private _collapsed: Set<string> = new Set();
  @state() private _selectedId: string | null = null;
  @state() private _hoverId: string | null = null;
  @state() private _panX = 0;
  @state() private _panY = 0;
  @state() private _scale = 0.9;
  @state() private _viewW = 0;
  @state() private _viewH = 0;

  private _dragging: { sx: number; sy: number; ox: number; oy: number } | null = null;
  private _didPan = false;
  private _computed: LayoutResult | null = null;
  private _childrenOf: Record<string, string[]> = {};
  private _byId: Record<string, TreeNode> = {};
  private _resizeObs?: ResizeObserver;
  private _userHasInteracted = false;

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  override connectedCallback(): void {
    super.connectedCallback();
    this._resizeObs = new ResizeObserver((entries) => {
      let changed = false;
      for (const entry of entries) {
        if (this._viewW !== entry.contentRect.width || this._viewH !== entry.contentRect.height) {
          this._viewW = entry.contentRect.width;
          this._viewH = entry.contentRect.height;
          changed = true;
        }
      }
      if (changed) {
        this._fitToScreen();
        this.requestUpdate();
      }
    });
    this._resizeObs.observe(this);

    this.updateComplete.then(() => {
      if (this._viewW === 0) {
        const rect = this.getBoundingClientRect();
        if (rect.width > 0) {
          this._viewW = rect.width;
          this._viewH = rect.height;
          this._fitToScreen();
          this.requestUpdate();
        }
      }
    });
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._resizeObs?.disconnect();
  }

  override willUpdate(changed: Map<string, unknown>): void {
    // Sync external focalId property → internal state + switch to lineage mode
    if (changed.has('focalId') && this.focalId !== this._focalId) {
      this._focalId = this.focalId;
      if (this.focalId) this._mode = 'lineage';
    }

    if (changed.has('nodes')) {
      const { byId, childrenOf } = buildIndex(this.nodes);
      this._byId = byId;
      this._childrenOf = childrenOf;
    }

    const needsRecompute =
      changed.has('nodes') ||
      changed.has('focalId') ||
      changed.has('_mode') ||
      changed.has('_focalId') ||
      changed.has('_collapsed') ||
      changed.has('_breederFilter') ||
      changed.has('_viewW') ||
      changed.has('_viewH');

    if (needsRecompute) {
      this._recompute();
      if (!this._userHasInteracted || changed.has('_viewW') || changed.has('_viewH') ||
          changed.has('_mode') || changed.has('_focalId') || changed.has('_breederFilter')) {
        this._fitToScreen();
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Compute
  // ---------------------------------------------------------------------------

  private _recompute(): void {
    const visible = this._visibleNodes();

    if (visible.length === 0) {
      this._computed = null;
      return;
    }

    if (this._mode === 'families') {
      this._computed = layoutBreederGrouped(visible);
    } else if (this._mode === 'lineage' && this._focalId) {
      this._computed = layoutSubgraph(visible, this._focalId);
    } else {
      this._computed = layoutTopDown(visible);
    }
  }

  private _visibleNodes(): TreeNode[] {
    let nodes = this.nodes;

    if (this._breederFilter) {
      nodes = nodes.filter((n) => n.breeder === this._breederFilter);
    }

    if (this._collapsed.size > 0) {
      const hidden = new Set<string>();
      const queue = [...this._collapsed];
      while (queue.length > 0) {
        const id = queue.shift()!;
        for (const childId of this._childrenOf[id] ?? []) {
          if (!hidden.has(childId)) {
            hidden.add(childId);
            queue.push(childId);
          }
        }
      }
      nodes = nodes.filter((n) => !hidden.has(n.id));
    }

    return nodes;
  }

  private _fitToScreen(): void {
    if (!this._computed || this._viewW <= 0 || this._viewH <= 0) return;

    const { bounds } = this._computed;
    const { minX, maxX, minY, maxY } = bounds;
    const treeW = maxX - minX;
    const treeH = maxY - minY;

    const pad = 60;
    const scaleX = (this._viewW - pad * 2) / treeW;
    const scaleY = (this._viewH - pad * 2) / treeH;
    const scale = Math.min(Math.max(Math.min(scaleX, scaleY), 0.01), 2.0);
    this._scale = scale;
    this._panX = (this._viewW - treeW * scale) / 2 - minX * scale;
    this._panY = (this._viewH - treeH * scale) / 2 - minY * scale;
  }

  // ---------------------------------------------------------------------------
  // Derived sets (computed from full nodes list, not just visible)
  // ---------------------------------------------------------------------------

  private get _ancestorSet(): Set<string> {
    if (!this._focalId) return new Set();
    return ancestorsOf(this.nodes, this._focalId);
  }

  private get _descendantSet(): Set<string> {
    if (!this._focalId) return new Set();
    return descendantsOf(this.nodes, this._focalId);
  }

  private get _highlightId(): string | null {
    return this._hoverId ?? this._selectedId;
  }

  private get _highlightAncSet(): Set<string> {
    const hid = this._highlightId;
    if (!hid) return new Set();
    return ancestorsOf(this.nodes, hid);
  }

  private get _highlightDescSet(): Set<string> {
    const hid = this._highlightId;
    if (!hid) return new Set();
    return descendantsOf(this.nodes, hid);
  }

  // ---------------------------------------------------------------------------
  // Pan / zoom handlers
  // ---------------------------------------------------------------------------

  private _onWheel(e: WheelEvent): void {
    e.preventDefault();
    this._userHasInteracted = true;
    const el = e.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const dir = e.deltaY < 0 ? 1 : -1;
    const factor = dir > 0 ? 1.15 : 1 / 1.15;
    const newK = Math.max(0.08, Math.min(4, this._scale * factor));
    // Keep the world-point under the cursor stationary
    const worldX = (mx - this._panX) / this._scale;
    const worldY = (my - this._panY) / this._scale;
    this._panX = mx - worldX * newK;
    this._panY = my - worldY * newK;
    this._scale = newK;
  }

  private _onMouseDown(e: MouseEvent): void {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (
      target.closest('.tree-node') ||
      target.closest('.minimap') ||
      target.closest('.detail-panel') ||
      target.closest('.focus-banner') ||
      target.closest('.zoom-controls')
    )
      return;
    this._userHasInteracted = true;
    this._didPan = false;
    this._dragging = { sx: e.clientX, sy: e.clientY, ox: this._panX, oy: this._panY };
  }

  private _onMouseMove(e: MouseEvent): void {
    if (!this._dragging) return;
    const dx = e.clientX - this._dragging.sx;
    const dy = e.clientY - this._dragging.sy;
    if (!this._didPan && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) this._didPan = true;
    this._panX = this._dragging.ox + dx;
    this._panY = this._dragging.oy + dy;
  }

  private _onMouseUp(): void {
    this._dragging = null;
  }

  // ---------------------------------------------------------------------------
  // Node interaction
  // ---------------------------------------------------------------------------

  private _onNodeClick(p: TreeNode, e: MouseEvent): void {
    e.stopPropagation();

    if (e.detail >= 2) {
      // Double-click → enter lineage mode focused on this node
      this._focalId = p.id;
      this._mode = 'lineage';
      this._selectedId = p.id;
      this._userHasInteracted = false;
      return;
    }

    this._selectedId = this._selectedId === p.id ? null : p.id;
  }

  private _isolateLineage(id: string): void {
    this._focalId = id;
    this._mode = 'lineage';
    this._selectedId = id;
    this._userHasInteracted = false;
  }

  private _clearFocus(): void {
    this._focalId = null;
    this._selectedId = null;
    if (this._mode === 'lineage') this._mode = 'tree';
    this._userHasInteracted = false;
  }

  private _jumpTo(id: string): void {
    this._selectedId = id;
    this._userHasInteracted = false;
  }

  private _toggleCollapse(id: string): void {
    const next = new Set(this._collapsed);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this._collapsed = next;
  }

  // ---------------------------------------------------------------------------
  // Render: main
  // ---------------------------------------------------------------------------

  override render(): TemplateResult {
    const c = this._computed;
    const visible = this._visibleNodes();

    if (!c) {
      return html`<div class="empty">No lineage data.</div>`;
    }

    const gens = [...new Set(this.nodes.map((n) => n.gen))].sort();
    const breeders = this._computeBreeders();

    return html`
      <div
        class="shell"
        @wheel=${this._onWheel}
        @mousedown=${this._onMouseDown}
        @mousemove=${this._onMouseMove}
        @mouseup=${this._onMouseUp}
        @mouseleave=${this._onMouseUp}
        @click=${(e: MouseEvent) => {
          if ((e.target as HTMLElement).closest('.tree-node')) return;
          if (this._didPan) return;
          if (this._focalId) {
            this._clearFocus();
          } else {
            this._selectedId = null;
          }
        }}
      >
        ${this._renderToolbar(visible, breeders)}
        ${this._renderFilterRow(gens)}
        <div class="canvas-wrap">
          <div class="bg-grid"></div>
          <div
            class="canvas"
            style="transform: translate(${this._panX}px, ${this._panY}px) scale(${this._scale})"
          >
            ${this._renderBreederBands(c)}
            ${this._renderGenGutterLabels(c)}
            ${this._renderEdges(c)}
            ${this._renderNodes(c, visible)}
          </div>
          ${this._renderFocusBanner()}
          ${this._renderDetailPanel()}
          ${this._renderZoomControls()}
          ${this._renderLegend()}
          ${this._renderMinimap(c, visible)}
        </div>
      </div>
    `;
  }

  // ---------------------------------------------------------------------------
  // Render: toolbar
  // ---------------------------------------------------------------------------

  private _renderToolbar(visible: TreeNode[], breeders: Array<[string, number]>): TemplateResult {
    return html`
      <div class="toolbar-row">
        <div class="search-bar">
          <svg class="icon" viewBox="0 0 24 24"><path d="${mdiMagnify}" /></svg>
          <input
            type="text"
            placeholder="Search strain or breeder…"
            .value=${this._search}
            @input=${(e: InputEvent) => { this._search = (e.target as HTMLInputElement).value; }}
          />
          ${this._search
            ? html`
                <button class="icon-btn" @click=${() => { this._search = ''; }}>
                  <svg viewBox="0 0 24 24"><path d="${mdiClose}" /></svg>
                </button>
              `
            : nothing}
        </div>

        <div class="seg" role="tablist" aria-label="View mode">
          <button
            class="${this._mode === 'tree' ? 'active' : ''}"
            @click=${() => { this._mode = 'tree'; this._focalId = null; this._userHasInteracted = false; }}
          >Tree</button>
          <button
            class="${this._mode === 'lineage' ? 'active' : ''}"
            @click=${() => {
              this._mode = 'lineage';
              if (!this._focalId && this._selectedId) {
                this._focalId = this._selectedId;
              } else if (!this._focalId && this.nodes.length) {
                this._focalId = this.nodes.find((n) => n.parents.mother) ?.id ?? this.nodes[0].id;
              }
              this._userHasInteracted = false;
            }}
          >Lineage</button>
          <button
            class="${this._mode === 'families' ? 'active' : ''}"
            @click=${() => { this._mode = 'families'; this._userHasInteracted = false; }}
          >Families</button>
        </div>

        ${breeders.length > 1
          ? html`
              <select
                class="select-pill"
                .value=${this._breederFilter}
                @change=${(e: Event) => { this._breederFilter = (e.target as HTMLSelectElement).value; }}
              >
                <option value="">All breeders</option>
                ${breeders.map(([b, c]) => html`<option value="${b}">${b} (${c})</option>`)}
              </select>
            `
          : nothing}

        <button class="pill-btn" @click=${() => this._fitToScreen()} title="Fit to screen">
          <svg viewBox="0 0 24 24"><path d="${mdiFitToPageOutline}" /></svg>
          Fit
        </button>

        <div class="toolbar-spacer"></div>
        <div class="count-chip">
          ${visible.length === this.nodes.length
            ? `${this.nodes.length}`
            : `${visible.length} / ${this.nodes.length}`} strains
        </div>
      </div>
    `;
  }

  // ---------------------------------------------------------------------------
  // Render: generation filter chips
  // ---------------------------------------------------------------------------

  private _renderFilterRow(gens: string[]): TemplateResult {
    const showClear = this._collapsed.size > 0 || !!this._genFilter || !!this._selectedId || !!this._search;
    return html`
      <div class="filter-row">
        <button
          class="gen-chip ${this._genFilter === null ? 'active' : ''}"
          @click=${() => { this._genFilter = null; }}
        >All</button>
        ${gens.map((g) => html`
          <button
            class="gen-chip ${this._genFilter === g ? 'active' : ''}"
            style="--chip-c:${genColor(g)}"
            @click=${() => { this._genFilter = this._genFilter === g ? null : g; }}
          >${g}</button>
        `)}
        ${showClear
          ? html`
              <button
                class="clear-btn"
                @click=${() => {
                  this._collapsed = new Set();
                  this._genFilter = null;
                  this._selectedId = null;
                  this._search = '';
                }}
              >Clear</button>
            `
          : nothing}
      </div>
    `;
  }

  // ---------------------------------------------------------------------------
  // Render: breeder bands (families mode)
  // ---------------------------------------------------------------------------

  private _renderBreederBands(c: LayoutResult): TemplateResult {
    if (this._mode !== 'families' || !c.bands) return html`${nothing}`;
    return html`
      ${c.bands.map((b) => html`
        <div class="band" style="left:${b.x}px;top:${b.y}px;width:${b.w}px;height:${b.h}px"></div>
        <div class="band-header" style="left:${b.x + 18}px;top:${b.y + 12}px">
          <span class="band-label">${b.label}</span>
          <span class="band-count">${b.count}</span>
        </div>
      `)}
    `;
  }

  // ---------------------------------------------------------------------------
  // Render: generation gutter labels (tree mode)
  // ---------------------------------------------------------------------------

  private _renderGenGutterLabels(c: LayoutResult): TemplateResult {
    if (this._mode !== 'tree' || !c.bands) return html`${nothing}`;
    return html`
      ${c.bands.map((b) => html`
        <div
          class="gen-gutter"
          style="top:${b.y + b.h / 2 - 6}px;left:${c.bounds.minX + 8}px;transform:translateX(-100%)"
        >${b.label}</div>
      `)}
    `;
  }

  // ---------------------------------------------------------------------------
  // Render: edges SVG
  // ---------------------------------------------------------------------------

  private _renderEdges(c: LayoutResult): TemplateResult {
    const { minX, minY, maxX, maxY } = c.bounds;
    const w = maxX - minX;
    const h = maxY - minY;

    const highlightId = this._highlightId;
    const highlightAnc = this._highlightAncSet;
    const highlightDesc = this._highlightDescSet;
    const anc = this._ancestorSet;
    const desc = this._descendantSet;
    const focalId = this._mode === 'lineage' ? this._focalId : null;
    const pathFn = this._mode === 'families' ? edgePathCurve : edgePath;

    return html`
      <svg
        class="edges-svg"
        style="left:${minX}px;top:${minY}px;width:${w}px;height:${h}px"
        viewBox="${minX} ${minY} ${w} ${h}"
      >
        ${c.edges.map((e) => {
          const fromNode = c.nodes[e.from];
          const toNode = c.nodes[e.to];
          if (!fromNode || !toNode) return nothing;
          const d = pathFn(fromNode, toNode);

          // Determine if this edge should be dim
          const touchesHighlight =
            highlightId && (e.from === highlightId || e.to === highlightId);
          const inHighlightGraph =
            highlightId && (
              (highlightAnc.has(e.from) && (e.to === highlightId || highlightAnc.has(e.to))) ||
              (highlightDesc.has(e.to) && (e.from === highlightId || highlightDesc.has(e.from)))
            );
          const inFocalGraph =
            focalId && (
              (e.from === focalId || anc.has(e.from) || desc.has(e.from)) &&
              (e.to === focalId || anc.has(e.to) || desc.has(e.to))
            );

          let dim: boolean;
          if (focalId) {
            dim = !inFocalGraph;
          } else if (highlightId) {
            dim = !touchesHighlight && !inHighlightGraph;
          } else {
            // Faint until hover — the core legibility fix
            dim = true;
          }

          const classes = ['edge', `edge-${e.kind}`, dim ? 'dim' : ''].filter(Boolean).join(' ');
          return svg`<path class="${classes}" d="${d}" />`;
        })}
      </svg>
    `;
  }

  // ---------------------------------------------------------------------------
  // Render: nodes
  // ---------------------------------------------------------------------------

  private _renderNodes(c: LayoutResult, visible: TreeNode[]): TemplateResult {
    const searchLc = this._search.toLowerCase();
    const highlightId = this._highlightId;
    const highlightAnc = this._highlightAncSet;
    const highlightDesc = this._highlightDescSet;
    const anc = this._ancestorSet;
    const desc = this._descendantSet;
    const focalId = this._focalId;

    return html`
      ${visible.map((p) => {
        const ln = c.nodes[p.id];
        if (!ln) return nothing;

        const isSelected = this._selectedId === p.id;
        const isFocal = focalId === p.id;

        const inFocalGraph = focalId && (isFocal || anc.has(p.id) || desc.has(p.id));
        const inHighlight = highlightId && (
          p.id === highlightId || highlightAnc.has(p.id) || highlightDesc.has(p.id)
        );

        const searchMatch =
          !searchLc ||
          p.name.toLowerCase().includes(searchLc) ||
          p.strain.toLowerCase().includes(searchLc) ||
          p.breeder.toLowerCase().includes(searchLc);
        const genMatch = !this._genFilter || p.gen === this._genFilter;

        const dim =
          (focalId && !inFocalGraph) ||
          (highlightId && !inHighlight) ||
          !searchMatch ||
          !genMatch;

        const hasChildren = (this._childrenOf[p.id] ?? []).length > 0;
        const isCollapsed = this._collapsed.has(p.id);
        const descCount = isCollapsed ? this._countDescendants(p.id) : 0;

        const stageColor = genColor(p.gen);

        const classes = [
          'tree-node',
          dim ? 'dim' : '',
          isSelected ? 'selected' : '',
          isFocal ? 'focal' : '',
          p.id === highlightId ? 'hovered' : '',
          inFocalGraph && !isFocal ? 'in-graph' : '',
        ].filter(Boolean).join(' ');

        return html`
          <div
            class="${classes}"
            style="
              left:${ln.x}px;
              top:${ln.y}px;
              width:${NODE_W}px;
              height:${NODE_H}px;
              --stage-c:${stageColor}
            "
            @mouseenter=${() => { this._hoverId = p.id; }}
            @mouseleave=${() => { this._hoverId = null; }}
            @click=${(e: MouseEvent) => this._onNodeClick(p, e)}
          >
            <div class="pn-body">
              <div class="pn-row1">
                <span class="pn-name" title="${p.name}">${p.name}</span>
              </div>
              <div class="pn-row2">
                <span class="gen-badge" style="background:${stageColor}">${p.gen}</span>
                <span class="pn-breeder">${p.breeder}</span>
              </div>
            </div>
            ${hasChildren
              ? html`
                  <button
                    class="fold-btn ${isCollapsed ? 'collapsed' : ''}"
                    title="${isCollapsed ? 'Expand' : 'Collapse'}"
                    @click=${(e: Event) => { e.stopPropagation(); this._toggleCollapse(p.id); }}
                  >
                    <svg viewBox="0 0 24 24"><path d="${mdiChevronDown}" /></svg>
                    ${isCollapsed && descCount > 0
                      ? html`<span class="desc-count">${descCount}</span>`
                      : nothing}
                  </button>
                `
              : nothing}
          </div>
        `;
      })}
    `;
  }

  private _countDescendants(id: string): number {
    const seen = new Set<string>();
    const queue = [id];
    while (queue.length > 0) {
      const curr = queue.shift()!;
      for (const child of this._childrenOf[curr] ?? []) {
        if (!seen.has(child)) {
          seen.add(child);
          queue.push(child);
        }
      }
    }
    return seen.size;
  }

  // ---------------------------------------------------------------------------
  // Render: focus banner (lineage mode)
  // ---------------------------------------------------------------------------

  private _renderFocusBanner(): TemplateResult {
    if (this._mode !== 'lineage' || !this._focalId) return html`${nothing}`;
    const focal = this._byId[this._focalId];
    if (!focal) return html`${nothing}`;
    const anc = this._ancestorSet;
    const desc = this._descendantSet;
    return html`
      <div class="focus-banner">
        <svg class="icon" viewBox="0 0 24 24"><path d="${mdiEye}" /></svg>
        <span>
          Lineage of <strong>${focal.name}</strong>
          <span class="banner-counts">
            · ${anc.size} ancestor${anc.size === 1 ? '' : 's'}
            · ${desc.size} descendant${desc.size === 1 ? '' : 's'}
          </span>
        </span>
        <button @click=${() => this._clearFocus()}>Clear</button>
      </div>
    `;
  }

  // ---------------------------------------------------------------------------
  // Render: side detail panel
  // ---------------------------------------------------------------------------

  private _renderDetailPanel(): TemplateResult {
    if (!this._selectedId) return html`${nothing}`;
    const n = this._byId[this._selectedId];
    if (!n) return html`${nothing}`;

    const motherNode = n.parents.mother ? this._byId[n.parents.mother] : null;
    const fatherNode = n.parents.father ? this._byId[n.parents.father] : null;
    const selectedAnc = ancestorsOf(this.nodes, n.id);
    const selectedDesc = descendantsOf(this.nodes, n.id);
    const kidsAll = this._childrenOf[n.id] ?? [];
    const kidsShown = kidsAll.slice(0, 5).map((id) => this._byId[id]).filter(Boolean);
    const kidsExtra = Math.max(0, kidsAll.length - kidsShown.length);

    return html`
      <div class="detail-panel" @click=${(e: Event) => e.stopPropagation()}>
        <button
          class="detail-close"
          @click=${() => { this._selectedId = null; }}
          aria-label="Close"
        >
          <svg viewBox="0 0 24 24"><path d="${mdiClose}" /></svg>
        </button>

        <div class="detail-eyebrow" style="--gen-c:${genColor(n.gen)}">
          ${n.gen} · ${selectedAnc.size === 0 ? 'Landrace' : 'Cross'}
        </div>
        <h3 class="detail-title">${n.name}</h3>
        <div class="detail-breeder">${n.breeder}</div>

        <div class="detail-stats">
          <div class="detail-stat">
            <div class="v">${selectedAnc.size}</div>
            <div class="l">Ancestors</div>
          </div>
          <div class="detail-stat">
            <div class="v">${selectedDesc.size}</div>
            <div class="l">Descendants</div>
          </div>
          <div class="detail-stat">
            <div class="v">${kidsAll.length}</div>
            <div class="l">Direct kids</div>
          </div>
        </div>

        ${motherNode || fatherNode
          ? html`
              <div class="detail-section">
                <div class="detail-section-label">Parents</div>
                ${motherNode
                  ? html`
                      <div class="detail-parent" @click=${() => this._jumpTo(motherNode.id)}>
                        <span class="role mother">Mother</span>
                        <span class="pname" title="${motherNode.name}">${motherNode.name}</span>
                      </div>
                    `
                  : nothing}
                ${fatherNode
                  ? html`
                      <div class="detail-parent" @click=${() => this._jumpTo(fatherNode.id)}>
                        <span class="role father">Father</span>
                        <span class="pname" title="${fatherNode.name}">${fatherNode.name}</span>
                      </div>
                    `
                  : nothing}
              </div>
            `
          : nothing}

        ${kidsShown.length > 0
          ? html`
              <div class="detail-section">
                <div class="detail-section-label">
                  Offspring${kidsExtra ? ` (+${kidsExtra} more)` : ''}
                </div>
                ${kidsShown.map((k) => html`
                  <div class="detail-parent" @click=${() => this._jumpTo(k.id)}>
                    <span class="role" style="color:${genColor(k.gen)}">${k.gen}</span>
                    <span class="pname" title="${k.name}">${k.name}</span>
                  </div>
                `)}
              </div>
            `
          : nothing}

        <div class="detail-actions">
          <button class="pill-btn active" @click=${() => this._isolateLineage(n.id)}>
            <svg viewBox="0 0 24 24"><path d="${mdiEye}" /></svg>
            Isolate Lineage
          </button>
        </div>
      </div>
    `;
  }

  // ---------------------------------------------------------------------------
  // Render: zoom controls
  // ---------------------------------------------------------------------------

  private _renderZoomControls(): TemplateResult {
    return html`
      <div class="zoom-controls">
        <button
          class="icon-btn"
          @click=${() => {
            this._userHasInteracted = true;
            this._scale = Math.min(this._scale * 1.2, 4.0);
          }}
        >
          <svg viewBox="0 0 24 24"><path d="${mdiPlus}" /></svg>
        </button>
        <span class="zoom-pct">${Math.round(this._scale * 100)}%</span>
        <button
          class="icon-btn"
          @click=${() => {
            this._userHasInteracted = true;
            this._scale = Math.max(this._scale / 1.2, 0.08);
          }}
        >
          <svg viewBox="0 0 24 24"><path d="${mdiMinus}" /></svg>
        </button>
        <button class="icon-btn" @click=${() => this._fitToScreen()} title="Fit to screen">
          <svg viewBox="0 0 24 24"><path d="${mdiFitToPageOutline}" /></svg>
        </button>
      </div>
    `;
  }

  // ---------------------------------------------------------------------------
  // Render: legend
  // ---------------------------------------------------------------------------

  private _renderLegend(): TemplateResult {
    return html`
      <div class="tree-footer">
        <span class="legend-item"><span class="legend-line mother"></span> Mother</span>
        <span class="legend-item"><span class="legend-line father"></span> Father</span>
        <span class="legend-hint">Double-click a strain to isolate its lineage</span>
      </div>
    `;
  }

  // ---------------------------------------------------------------------------
  // Render: minimap
  // ---------------------------------------------------------------------------

  private _renderMinimap(c: LayoutResult, visible: TreeNode[]): TemplateResult {
    const MM_W = 170;
    const MM_H = 120;
    const PAD = 4;
    const { minX, maxX, minY, maxY } = c.bounds;
    const treeW = maxX - minX || 1;
    const treeH = maxY - minY || 1;
    const k = Math.min((MM_W - PAD * 2) / treeW, (MM_H - PAD * 2) / treeH);

    const project = (x: number, y: number) => ({
      x: PAD + (x - minX) * k,
      y: PAD + (y - minY) * k,
    });

    const anc = this._ancestorSet;
    const desc = this._descendantSet;

    const vpX = (-this._panX / this._scale - minX) * k + PAD;
    const vpY = (-this._panY / this._scale - minY) * k + PAD;
    const vpW = (this._viewW / this._scale) * k;
    const vpH = (this._viewH / this._scale) * k;

    return html`
      <svg
        class="minimap"
        width="${MM_W}"
        height="${MM_H}"
        @click=${(e: MouseEvent) => {
          const rect = (e.currentTarget as SVGElement).getBoundingClientRect();
          const wx = (e.clientX - rect.left - PAD) / k + minX;
          const wy = (e.clientY - rect.top - PAD) / k + minY;
          this._panX = this._viewW / 2 - wx * this._scale;
          this._panY = this._viewH / 2 - wy * this._scale;
          this._userHasInteracted = true;
        }}
      >
        ${visible.map((p) => {
          const ln = c.nodes[p.id];
          if (!ln) return nothing;
          const pos = project(ln.x + ln.w / 2, ln.y + ln.h / 2);
          const isFocal = p.id === this._focalId || p.id === this._selectedId;
          const isAnc = anc.has(p.id);
          const isDesc = desc.has(p.id);
          const fill = isFocal ? '#4caf50' : isAnc ? '#ff9800' : isDesc ? '#2196f3' : genColor(p.gen);
          return svg`<rect
            x="${pos.x - 1.5}" y="${pos.y - 0.7}"
            width="3" height="1.4" rx="0.5"
            fill="${fill}" opacity="${isFocal || isAnc || isDesc ? 0.9 : 0.5}"
          />`;
        })}
        <rect
          x="${Math.max(0, Math.min(MM_W, vpX))}"
          y="${Math.max(0, Math.min(MM_H, vpY))}"
          width="${Math.max(2, Math.min(MM_W, vpX + vpW) - Math.max(0, vpX))}"
          height="${Math.max(2, Math.min(MM_H, vpY + vpH) - Math.max(0, vpY))}"
          fill="none"
          stroke="#4caf50"
          stroke-width="1.5"
          rx="2"
        />
      </svg>
    `;
  }

  // ---------------------------------------------------------------------------
  // Helper: breeder frequency list for dropdown
  // ---------------------------------------------------------------------------

  private _computeBreeders(): Array<[string, number]> {
    const m = new Map<string, number>();
    for (const n of this.nodes) m.set(n.breeder, (m.get(n.breeder) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }

  // ---------------------------------------------------------------------------
  // Styles
  // ---------------------------------------------------------------------------

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
      --bg-glass: rgba(20, 20, 24, 0.88);
      --fg-1: #fff;
      --fg-2: rgba(255, 255, 255, 0.7);
      --fg-3: rgba(255, 255, 255, 0.5);
      --fg-4: rgba(255, 255, 255, 0.3);
      --divider-faint: rgba(255, 255, 255, 0.05);
      --gv-primary: #4caf50;
      --gv-secondary: #2196f3;
      --gv-mother: #e91e63;
      --elev-glass: 0 8px 32px rgba(0, 0, 0, 0.4);
    }

    /* ---- Shell ---- */
    .shell {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: var(--bg-app);
      position: relative;
      overflow: hidden;
      user-select: none;
    }

    /* ---- Toolbar ---- */
    .toolbar-row {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 10px;
      padding: 8px 14px;
      background: var(--bg-card);
      border-bottom: 1px solid var(--divider-faint);
      flex-shrink: 0;
      flex-wrap: wrap;
    }
    .toolbar-spacer { flex: 1; }

    .search-bar {
      display: flex;
      align-items: center;
      gap: 6px;
      background: var(--bg-input);
      border: 1px solid var(--bg-input-border);
      border-radius: 999px;
      padding: 4px 10px;
      flex: 1;
      min-width: 130px;
      max-width: 240px;
    }
    .search-bar:focus-within {
      border-color: var(--gv-primary);
      box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.18);
    }
    .search-bar .icon {
      width: 16px;
      height: 16px;
      fill: var(--fg-3);
      flex-shrink: 0;
    }
    .search-bar input {
      background: none;
      border: none;
      outline: none;
      color: var(--fg-1);
      font-size: 13px;
      flex: 1;
      min-width: 0;
    }
    .search-bar input::placeholder { color: var(--fg-3); }

    /* Mode segmented control */
    .seg {
      display: flex;
      border-radius: 999px;
      overflow: hidden;
      border: 1px solid var(--bg-input-border);
      flex-shrink: 0;
    }
    .seg button {
      background: var(--bg-input);
      color: var(--fg-2);
      border: none;
      border-right: 1px solid var(--bg-input-border);
      padding: 5px 12px;
      font-size: 12px;
      cursor: pointer;
      transition: background 0.2s, color 0.2s;
      white-space: nowrap;
    }
    .seg button:last-child { border-right: none; }
    .seg button.active {
      background: linear-gradient(135deg, #4caf50, #45a049);
      color: #fff;
    }
    .seg button:hover:not(.active) { background: var(--bg-card-elev); }

    .select-pill {
      background: var(--bg-input);
      color: var(--fg-2);
      border: 1px solid var(--bg-input-border);
      border-radius: 999px;
      padding: 5px 12px;
      font-size: 12px;
      cursor: pointer;
      outline: none;
    }
    .select-pill:hover { border-color: var(--gv-primary); color: var(--fg-1); }

    .pill-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      background: var(--bg-input);
      color: var(--fg-2);
      border: 1px solid var(--bg-input-border);
      border-radius: 999px;
      padding: 5px 12px;
      font-size: 12px;
      cursor: pointer;
      white-space: nowrap;
      transition: background 0.2s, color 0.2s, border-color 0.2s;
      flex-shrink: 0;
    }
    .pill-btn svg { width: 14px; height: 14px; fill: currentColor; }
    .pill-btn:hover { border-color: var(--gv-primary); color: var(--fg-1); }
    .pill-btn.active {
      background: rgba(76, 175, 80, 0.15);
      border-color: var(--gv-primary);
      color: var(--gv-primary);
    }

    .icon-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: transparent;
      border: none;
      cursor: pointer;
      color: var(--fg-2);
      padding: 0;
      flex-shrink: 0;
    }
    .icon-btn svg { width: 16px; height: 16px; fill: currentColor; }
    .icon-btn:hover { background: var(--bg-card-elev); color: var(--fg-1); }

    .count-chip {
      font-size: 11px;
      color: var(--fg-3);
      white-space: nowrap;
    }

    /* ---- Filter row ---- */
    .filter-row {
      display: flex;
      flex-direction: row;
      flex-wrap: wrap;
      gap: 6px;
      padding: 6px 14px;
      background: var(--bg-card);
      border-bottom: 1px solid var(--divider-faint);
      flex-shrink: 0;
    }
    .gen-chip {
      background: var(--bg-input);
      border: 1px solid var(--chip-c, var(--bg-input-border));
      color: var(--fg-2);
      border-radius: 999px;
      padding: 2px 10px;
      font-size: 11px;
      cursor: pointer;
      transition: background 0.2s, color 0.2s;
    }
    .gen-chip:hover { background: var(--bg-card-elev); color: var(--fg-1); }
    .gen-chip.active {
      background: var(--chip-c, var(--gv-primary));
      color: #fff;
      border-color: transparent;
    }
    .clear-btn {
      background: rgba(229, 57, 53, 0.1);
      border: 1px solid rgba(229, 57, 53, 0.4);
      color: #ef5350;
      border-radius: 999px;
      padding: 2px 10px;
      font-size: 11px;
      cursor: pointer;
    }
    .clear-btn:hover { background: rgba(229, 57, 53, 0.2); }

    /* ---- Canvas area ---- */
    .canvas-wrap {
      flex: 1;
      position: relative;
      overflow: hidden;
      cursor: grab;
    }
    .canvas-wrap:active { cursor: grabbing; }

    .bg-grid {
      position: absolute;
      inset: 0;
      background-image: radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px);
      background-size: 28px 28px;
      pointer-events: none;
    }

    .canvas {
      position: absolute;
      top: 0;
      left: 0;
      transform-origin: 0 0;
      will-change: transform;
    }

    /* ---- Breeder bands (families mode) ---- */
    .band {
      position: absolute;
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 12px;
      background: rgba(255,255,255,0.02);
      pointer-events: none;
    }
    .band-header {
      position: absolute;
      display: flex;
      align-items: center;
      gap: 6px;
      pointer-events: none;
    }
    .band-label {
      font-size: 12px;
      font-weight: 600;
      color: var(--fg-2);
    }
    .band-count {
      font-size: 11px;
      color: var(--fg-4);
      background: rgba(255,255,255,0.06);
      border-radius: 999px;
      padding: 1px 6px;
    }

    /* ---- Gen gutter labels (tree mode) ---- */
    .gen-gutter {
      position: absolute;
      font-size: 10px;
      color: var(--fg-4);
      white-space: nowrap;
      pointer-events: none;
      padding-right: 12px;
      letter-spacing: 0.3px;
    }

    /* ---- Edges SVG ---- */
    .edges-svg {
      position: absolute;
      pointer-events: none;
      overflow: visible;
    }
    .edge {
      fill: none;
      stroke-width: 1.5;
      transition: opacity 0.12s;
    }
    .edge-mother { stroke: var(--gv-primary); }
    .edge-father { stroke: var(--gv-secondary); stroke-dasharray: 5 3; }
    .edge-clone { stroke: rgba(233,30,99,0.7); stroke-dasharray: 2 2; }
    .edge.dim { opacity: 0.06; }

    /* ---- Tree nodes ---- */
    .tree-node {
      position: absolute;
      background: var(--bg-card-elev);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 8px;
      overflow: hidden;
      cursor: pointer;
      box-sizing: border-box;
      transition: opacity 0.15s, box-shadow 0.15s, border-color 0.15s;
    }
    .tree-node::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 3px;
      height: 100%;
      background: var(--stage-c, #555);
      border-radius: 8px 0 0 8px;
    }
    .tree-node:hover {
      border-color: rgba(255,255,255,0.2);
      box-shadow: 0 4px 16px rgba(0,0,0,0.4);
    }
    .tree-node.dim { opacity: 0.2; }
    .tree-node.hovered {
      border-color: rgba(255,255,255,0.3);
      box-shadow: 0 4px 20px rgba(0,0,0,0.5);
    }
    .tree-node.selected {
      border-color: var(--gv-secondary);
      box-shadow: 0 0 0 2px var(--gv-secondary), var(--elev-glass);
    }
    .tree-node.focal {
      border-color: var(--gv-primary);
      box-shadow: 0 0 0 2px var(--gv-primary), var(--elev-glass);
    }
    .tree-node.in-graph {
      border-color: rgba(76, 175, 80, 0.4);
    }

    /* ---- Node body ---- */
    .pn-body {
      padding: 5px 8px 5px 14px;
      display: flex;
      flex-direction: column;
      gap: 3px;
      height: 100%;
      box-sizing: border-box;
    }
    .pn-row1 {
      display: flex;
      align-items: center;
    }
    .pn-name {
      font-size: 12px;
      font-weight: 600;
      color: var(--fg-1);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      flex: 1;
      min-width: 0;
    }
    .pn-row2 {
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .gen-badge {
      font-size: 9px;
      font-weight: 700;
      color: #fff;
      border-radius: 4px;
      padding: 1px 5px;
      flex-shrink: 0;
      letter-spacing: 0.4px;
    }
    .pn-breeder {
      font-size: 10px;
      color: var(--fg-3);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      flex: 1;
      min-width: 0;
    }

    .fold-btn {
      position: absolute;
      bottom: 4px;
      right: 4px;
      display: inline-flex;
      align-items: center;
      gap: 2px;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 5px;
      padding: 1px 3px;
      cursor: pointer;
      color: var(--fg-3);
      font-size: 9px;
    }
    .fold-btn svg { width: 11px; height: 11px; fill: currentColor; }
    .fold-btn:hover { color: var(--fg-1); background: rgba(255,255,255,0.12); }
    .fold-btn.collapsed { color: var(--gv-primary); border-color: var(--gv-primary); }
    .desc-count { font-size: 9px; font-weight: 600; }

    /* ---- Focus banner ---- */
    .focus-banner {
      position: absolute;
      top: 10px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      gap: 8px;
      background: var(--bg-glass);
      border: 1px solid rgba(76,175,80,0.3);
      border-radius: 999px;
      padding: 6px 14px 6px 10px;
      font-size: 12px;
      color: var(--fg-1);
      box-shadow: var(--elev-glass);
      backdrop-filter: blur(8px);
      white-space: nowrap;
      z-index: 10;
    }
    .focus-banner .icon { width: 14px; height: 14px; fill: var(--gv-primary); flex-shrink: 0; }
    .focus-banner strong { color: var(--gv-primary); }
    .banner-counts { color: var(--fg-3); }
    .focus-banner button {
      background: rgba(76,175,80,0.15);
      border: 1px solid rgba(76,175,80,0.3);
      border-radius: 999px;
      color: var(--gv-primary);
      font-size: 11px;
      padding: 2px 10px;
      cursor: pointer;
      margin-left: 4px;
    }
    .focus-banner button:hover { background: rgba(76,175,80,0.25); }

    /* ---- Side detail panel ---- */
    .detail-panel {
      position: absolute;
      top: 10px;
      right: 16px;
      width: 220px;
      background: var(--bg-glass);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 12px;
      box-shadow: var(--elev-glass);
      backdrop-filter: blur(12px);
      display: flex;
      flex-direction: column;
      gap: 0;
      z-index: 10;
      overflow: hidden;
    }
    .detail-close {
      position: absolute;
      top: 8px;
      right: 8px;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: rgba(255,255,255,0.06);
      border: none;
      cursor: pointer;
      color: var(--fg-3);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
    }
    .detail-close svg { width: 12px; height: 12px; fill: currentColor; }
    .detail-close:hover { color: var(--fg-1); background: rgba(255,255,255,0.12); }
    .detail-eyebrow {
      padding: 12px 14px 0;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--gen-c, var(--fg-3));
    }
    .detail-title {
      margin: 3px 14px 0;
      font-size: 14px;
      font-weight: 600;
      color: var(--fg-1);
      line-height: 1.3;
      padding-right: 20px;
    }
    .detail-breeder {
      margin: 2px 14px 8px;
      font-size: 11px;
      color: var(--fg-3);
    }
    .detail-stats {
      display: flex;
      border-top: 1px solid var(--divider-faint);
      border-bottom: 1px solid var(--divider-faint);
    }
    .detail-stat {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 8px 4px;
      gap: 2px;
    }
    .detail-stat:not(:last-child) { border-right: 1px solid var(--divider-faint); }
    .detail-stat .v { font-size: 18px; font-weight: 600; color: var(--fg-1); line-height: 1; }
    .detail-stat .l { font-size: 9px; color: var(--fg-3); text-align: center; }
    .detail-section {
      padding: 8px 14px 4px;
      border-bottom: 1px solid var(--divider-faint);
    }
    .detail-section-label {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--fg-4);
      margin-bottom: 6px;
    }
    .detail-parent {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 3px 0;
      cursor: pointer;
      border-radius: 4px;
    }
    .detail-parent:hover { background: rgba(255,255,255,0.04); margin: 0 -4px; padding: 3px 4px; }
    .role {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      flex-shrink: 0;
      min-width: 36px;
    }
    .role.mother { color: var(--gv-mother); }
    .role.father { color: var(--gv-secondary); }
    .pname {
      font-size: 11px;
      color: var(--fg-2);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      flex: 1;
    }
    .detail-actions {
      padding: 10px 14px 12px;
    }
    .detail-actions .pill-btn { width: 100%; justify-content: center; }

    /* ---- Zoom controls ---- */
    .zoom-controls {
      position: absolute;
      bottom: 44px;
      left: 14px;
      display: flex;
      align-items: center;
      gap: 2px;
      background: var(--bg-glass);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 999px;
      padding: 4px 6px;
      box-shadow: var(--elev-glass);
      backdrop-filter: blur(8px);
    }
    .zoom-pct {
      font-size: 11px;
      color: var(--fg-2);
      width: 36px;
      text-align: center;
    }

    /* ---- Legend / footer ---- */
    .tree-footer {
      position: absolute;
      bottom: 12px;
      left: 14px;
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 11px;
      color: var(--fg-3);
      pointer-events: none;
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .legend-line {
      display: inline-block;
      width: 20px;
      height: 2px;
      border-radius: 1px;
    }
    .legend-line.mother { background: var(--gv-primary); }
    .legend-line.father {
      background: repeating-linear-gradient(
        90deg,
        var(--gv-secondary) 0,
        var(--gv-secondary) 5px,
        transparent 5px,
        transparent 8px
      );
    }
    .legend-hint { color: var(--fg-4); font-style: italic; }

    /* ---- Minimap ---- */
    .minimap {
      position: absolute;
      bottom: 12px;
      right: 14px;
      background: var(--bg-glass);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 8px;
      box-shadow: var(--elev-glass);
      backdrop-filter: blur(8px);
      cursor: crosshair;
    }

    /* ---- Empty state ---- */
    .empty {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      font-style: italic;
      color: var(--fg-3);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'genetics-tree-view': GeneticsTreeView;
  }
}
