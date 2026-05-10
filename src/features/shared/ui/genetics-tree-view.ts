import { LitElement, html, css, nothing, svg, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import {
  mdiMagnify,
  mdiClose,
  mdiPlus,
  mdiMinus,
  mdiEye,
  mdiChevronDown,
  mdiChevronUp,
  mdiCompare,
  mdiFitToPageOutline,
} from '@mdi/js';
import {
  type TreeNode,
  type LayoutResult,
  NODE_W,
  NODE_H,
  layoutTopDown,
  layoutRadial,
  ancestorsOf,
  descendantsOf,
  motherLineOf,
  edgePath,
  edgePathRadial,
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

@customElement('genetics-tree-view')
export class GeneticsTreeView extends LitElement {
  @property({ attribute: false }) nodes: TreeNode[] = [];
  @property({ type: String }) focalId: string | null = null;

  @state() private _layout: 'topdown' | 'radial' = 'topdown';
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
  @state() private _viewW = 0;
  @state() private _viewH = 0;

  private _dragging: { sx: number; sy: number; ox: number; oy: number } | null = null;
  private _computed: LayoutResult | null = null;
  private _childrenOf: Record<string, string[]> = {};
  private _resizeObs?: ResizeObserver;

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  override connectedCallback(): void {
    super.connectedCallback();
    this._resizeObs = new ResizeObserver((entries) => {
      let changed = false;
      for (const entry of entries) {
        // Observe host element dimensions
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
    
    // Observe host instead of child to avoid race condition with conditional rendering
    this._resizeObs.observe(this);
    
    // Fallback trigger for initial render
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

  override updated(changed: Map<string, unknown>): void {
    if (changed.has('nodes')) {
      this._childrenOf = {};
      for (const n of this.nodes) {
        const { mother, father } = n.parents;
        if (mother) {
          if (!this._childrenOf[mother]) this._childrenOf[mother] = [];
          if (!this._childrenOf[mother].includes(n.id)) this._childrenOf[mother].push(n.id);
        }
        if (father && father !== mother) {
          if (!this._childrenOf[father]) this._childrenOf[father] = [];
          if (!this._childrenOf[father].includes(n.id)) this._childrenOf[father].push(n.id);
        }
      }
    }

    if (
      changed.has('nodes') ||
      changed.has('_layout') ||
      changed.has('focalId') ||
      changed.has('_collapsed') ||
      changed.has('_focusMode')
    ) {
      this._recompute();
      this._fitToScreen();
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

    if (this._layout === 'radial' && this.focalId) {
      this._computed = layoutRadial(visible, this.focalId);
    } else if (this._layout === 'radial' && visible.length > 0) {
      this._computed = layoutRadial(visible, visible[0].id);
    } else {
      this._computed = layoutTopDown(visible);
    }
  }

  private _visibleNodes(): TreeNode[] {
    let nodes = this.nodes;

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

    if (this._focusMode && this.focalId) {
      const keep = new Set([this.focalId, ...this._ancestorSet, ...this._descendantSet]);
      nodes = nodes.filter((n) => keep.has(n.id));
    }

    return nodes;
  }

  private _fitToScreen(): void {
    if (!this._computed || this._viewW <= 0 || this._viewH <= 0) return;
    
    const { nodes, bounds } = this._computed;
    const { minX, maxX, minY, maxY } = bounds;
    const treeW = maxX - minX;
    const treeH = maxY - minY;
    
    const pad = 60;
    const scaleX = (this._viewW - pad * 2) / treeW;
    const scaleY = (this._viewH - pad * 2) / treeH;
    
    const scale = Math.min(Math.max(Math.min(scaleX, scaleY), 0.01), 2.0);
    this._scale = scale;

    const focalNode = !this._focusMode && this.focalId ? nodes[this.focalId] : null;
    if (focalNode) {
      this._panX = this._viewW / 2 - (focalNode.x + focalNode.w / 2) * scale;
      this._panY = this._viewH / 2 - (focalNode.y + focalNode.h / 2) * scale;
    } else {
      this._panX = (this._viewW - treeW * scale) / 2 - minX * scale;
      this._panY = (this._viewH - treeH * scale) / 2 - minY * scale;
    }
  }

  // ---------------------------------------------------------------------------
  // Derived sets
  // ---------------------------------------------------------------------------

  private get _ancestorSet(): Set<string> {
    if (!this.focalId) return new Set();
    return ancestorsOf(this.nodes, this.focalId);
  }

  private get _descendantSet(): Set<string> {
    if (!this.focalId) return new Set();
    return descendantsOf(this.nodes, this.focalId);
  }

  private get _motherLineSet(): Set<string> {
    if (!this.focalId) return new Set();
    return motherLineOf(this.nodes, this.focalId);
  }

  // ---------------------------------------------------------------------------
  // Pan / zoom handlers
  // ---------------------------------------------------------------------------

  private _onWheel(e: WheelEvent): void {
    e.preventDefault();
    const delta = -e.deltaY * 0.0015;
    const newScale = Math.min(Math.max(this._scale + delta * this._scale, 0.2), 2.0);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    this._panX = mx - (mx - this._panX) * (newScale / this._scale);
    this._panY = my - (my - this._panY) * (newScale / this._scale);
    this._scale = newScale;
  }

  private _onMouseDown(e: MouseEvent): void {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (
      target.closest('.tree-node') ||
      target.closest('.minimap') ||
      target.closest('.compare-drawer') ||
      target.closest('.detail-panel')
    )
      return;
    this._dragging = { sx: e.clientX, sy: e.clientY, ox: this._panX, oy: this._panY };
  }

  private _onMouseMove(e: MouseEvent): void {
    if (!this._dragging) return;
    this._panX = this._dragging.ox + (e.clientX - this._dragging.sx);
    this._panY = this._dragging.oy + (e.clientY - this._dragging.sy);
  }

  private _onMouseUp(): void {
    this._dragging = null;
  }

  // ---------------------------------------------------------------------------
  // Node interaction
  // ---------------------------------------------------------------------------

  private _onNodeClick(p: TreeNode): void {
    this._selectedId = this._selectedId === p.id ? null : p.id;
    if (this._focusMode || this._layout === 'radial') {
      this.focalId = p.id;
    }
  }

  private _toggleCollapse(id: string): void {
    const next = new Set(this._collapsed);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
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

    return html`
      <div
        class="shell"
        @wheel=${this._onWheel}
        @mousedown=${this._onMouseDown}
        @mousemove=${this._onMouseMove}
        @mouseup=${this._onMouseUp}
        @mouseleave=${this._onMouseUp}
      >
        ${this._renderToolbar(visible)}
        ${this._renderFilterRow()}
        <div class="canvas-wrap">
          <div class="bg-grid"></div>
          <div
            class="canvas"
            style="transform: translate(${this._panX}px, ${this._panY}px) scale(${this._scale})"
          >
            ${this._renderEdges(c)}
            ${this._layout === 'topdown' ? this._renderGenLabels(c) : nothing}
            ${this._renderNodes(c)}
          </div>
          ${this._renderZoomControls()}
          ${this._renderLegend()}
          ${this._renderMinimap(c, visible)}
          ${this._renderCompareDrawer()}
        </div>
        ${this._renderDetailPanel()}
      </div>
    `;
  }

  // ---------------------------------------------------------------------------
  // Render: toolbar
  // ---------------------------------------------------------------------------

  private _renderToolbar(visible: TreeNode[]): TemplateResult {
    return html`
      <div class="toolbar-row">
        <div class="search-bar">
          <svg class="icon" viewBox="0 0 24 24"><path d="${mdiMagnify}" /></svg>
          <input
            type="text"
            placeholder="Search…"
            .value=${this._search}
            @input=${(e: InputEvent) => {
              this._search = (e.target as HTMLInputElement).value;
            }}
          />
          ${this._search
            ? html`
                <button
                  class="icon-btn"
                  @click=${() => {
                    this._search = '';
                  }}
                >
                  <svg viewBox="0 0 24 24"><path d="${mdiClose}" /></svg>
                </button>
              `
            : nothing}
        </div>

        <div class="layout-toggle">
          <button
            class=${this._layout === 'topdown' ? 'active' : ''}
            @click=${() => {
              this._layout = 'topdown';
            }}
          >
            Top-Down
          </button>
          <button
            class=${this._layout === 'radial' ? 'active' : ''}
            @click=${() => {
              this._layout = 'radial';
              if (!this.focalId && this.nodes.length > 0) {
                this.focalId = this.nodes[0].id;
              }
            }}
          >
            Radial
          </button>
        </div>

        <button
          class="pill-btn ${this._focusMode ? 'active' : ''}"
          @click=${() => {
            this._focusMode = !this._focusMode;
          }}
        >
          <svg viewBox="0 0 24 24"><path d="${mdiEye}" /></svg>
          Focus
        </button>

        <button
          class="pill-btn ${this._highlightMother ? 'active' : ''}"
          @click=${() => {
            this._highlightMother = !this._highlightMother;
          }}
        >
          Mother Line
        </button>

        <button
          class="pill-btn"
          @click=${() => {
            this._fitToScreen();
          }}
          title="Fit to Screen"
        >
          <svg viewBox="0 0 24 24"><path d="${mdiFitToPageOutline}" /></svg>
          Fit
        </button>

        <button
          class="pill-btn"
          @click=${() => {
            this._scale = 1.0;
            this._fitToScreen();
          }}
          title="Reset Zoom & Center"
        >
          Reset
        </button>

        <span class="count-badge">${visible.length} / ${this.nodes.length}</span>
      </div>
    `;
  }

  // ---------------------------------------------------------------------------
  // Render: filter row
  // ---------------------------------------------------------------------------

  private _renderFilterRow(): TemplateResult {
    const gens = [...new Set(this.nodes.map((n) => n.gen))].sort();
    const showClear = this.focalId || this._focusMode || this._collapsed.size > 0;

    return html`
      <div class="filter-row">
        <button
          class="gen-chip ${this._genFilter === null ? 'active' : ''}"
          @click=${() => {
            this._genFilter = null;
          }}
        >
          All
        </button>
        ${gens.map(
          (g) => html`
            <button
              class="gen-chip ${this._genFilter === g ? 'active' : ''}"
              style="--chip-c: ${genColor(g)}"
              @click=${() => {
                this._genFilter = g;
              }}
            >
              ${g}
            </button>
          `
        )}
        ${showClear
          ? html`
              <button
                class="clear-btn"
                @click=${() => {
                  this.focalId = null;
                  this._focusMode = false;
                  this._collapsed = new Set();
                }}
              >
                Clear
              </button>
            `
          : nothing}
      </div>
    `;
  }

  // ---------------------------------------------------------------------------
  // Render: edges
  // ---------------------------------------------------------------------------

  private _renderEdges(c: LayoutResult): TemplateResult {
    const { minX, minY, maxX, maxY } = c.bounds;
    const w = maxX - minX;
    const h = maxY - minY;
    const anc = this._ancestorSet;
    const desc = this._descendantSet;
    const ml = this._motherLineSet;

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
          const d =
            this._layout === 'radial'
              ? edgePathRadial(fromNode, toNode)
              : edgePath(fromNode, toNode);

          const isMotherLine =
            ml.has(e.from) &&
            (e.to === this.focalId || ml.has(e.to));

          const dimmed =
            this._focusMode &&
            this.focalId &&
            !anc.has(e.from) &&
            !anc.has(e.to) &&
            !desc.has(e.from) &&
            !desc.has(e.to) &&
            e.from !== this.focalId &&
            e.to !== this.focalId;

          const classes = [
            'edge',
            `edge-${e.kind}`,
            dimmed ? 'dimmed' : '',
            isMotherLine && this._highlightMother ? 'mother-line' : '',
          ]
            .filter(Boolean)
            .join(' ');

          return svg`<path class="${classes}" d="${d}" />`;
        })}
      </svg>
    `;
  }

  // ---------------------------------------------------------------------------
  // Render: gen labels (topdown only)
  // ---------------------------------------------------------------------------

  private _renderGenLabels(c: LayoutResult): TemplateResult {
    const { minX } = c.bounds;
    const byRank: Record<number, TreeNode[]> = {};
    for (const n of this._visibleNodes()) {
      const ln = c.nodes[n.id];
      if (!ln) continue;
      if (!byRank[ln.rank]) byRank[ln.rank] = [];
      byRank[ln.rank].push(n);
    }

    return html`
      ${Object.entries(byRank).map(([rankStr, rowNodes]) => {
        const rank = Number(rankStr);
        const ln = c.nodes[rowNodes[0].id];
        if (!ln) return nothing;
        const gens = [...new Set(rowNodes.map((n) => n.gen))].join(' · ');
        return html`
          <div
            class="gen-label"
            style="left:${minX - 100}px;top:${ln.y}px"
          >
            <div class="gen-eyebrow">Gen ${rank}</div>
            <div class="gen-tags">${gens}</div>
          </div>
        `;
      })}
    `;
  }

  // ---------------------------------------------------------------------------
  // Render: nodes
  // ---------------------------------------------------------------------------

  private _renderNodes(c: LayoutResult): TemplateResult {
    const visible = this._visibleNodes();
    const anc = this._ancestorSet;
    const desc = this._descendantSet;
    const searchLc = this._search.toLowerCase();

    return html`
      ${visible.map((p) => {
        const ln = c.nodes[p.id];
        if (!ln) return nothing;

        const isSelected = this._selectedId === p.id;
        const isCompare = this._compareIds.includes(p.id);
        const isFocal = this.focalId === p.id;
        const inLineage = anc.has(p.id) || desc.has(p.id) || isFocal;
        const highlighted = isFocal || inLineage;

        const searchMatch =
          !searchLc ||
          p.name.toLowerCase().includes(searchLc) ||
          p.strain.toLowerCase().includes(searchLc) ||
          p.breeder.toLowerCase().includes(searchLc);

        const genMatch = !this._genFilter || p.gen === this._genFilter;

        const dimmed =
          (this._focusMode && this.focalId && !highlighted) ||
          !searchMatch ||
          !genMatch;

        const hasChildren = (this._childrenOf[p.id] ?? []).length > 0;
        const isCollapsed = this._collapsed.has(p.id);
        const descCount = isCollapsed
          ? this._countDescendants(p.id)
          : 0;

        const classes = [
          'tree-node',
          dimmed ? 'dimmed' : '',
          highlighted ? 'highlighted' : '',
          isSelected ? 'selected' : '',
          isCompare ? 'compare' : '',
        ]
          .filter(Boolean)
          .join(' ');

        const stageColor = genColor(p.gen);

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
            @click=${() => {
              this._onNodeClick(p);
            }}
          >
            <div class="pn-body">
              <div class="pn-row1">
                <span class="gen-badge" style="background:${stageColor}">${p.gen}</span>
                <span class="pn-name">${p.name}</span>
              </div>
              <div class="pn-row2">${p.strain}${p.breeder ? ` · ${p.breeder}` : ''}</div>
              <div class="pn-row3">
                <span class="type-badge ${p.type}">${p.type}</span>
                ${p.pheno ? html`<span class="pheno-badge">${p.pheno}</span>` : nothing}
              </div>
            </div>
            ${isCompare
              ? html`<span class="compare-badge">${this._compareIds.indexOf(p.id) + 1}</span>`
              : nothing}
            ${hasChildren
              ? html`
                  <button
                    class="fold-btn ${isCollapsed ? 'collapsed' : ''}"
                    @click=${(e: Event) => {
                      e.stopPropagation();
                      this._toggleCollapse(p.id);
                    }}
                  >
                    <svg viewBox="0 0 24 24">
                      <path d="${isCollapsed ? mdiChevronDown : mdiChevronUp}" />
                    </svg>
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
  // Render: zoom controls
  // ---------------------------------------------------------------------------

  private _renderZoomControls(): TemplateResult {
    return html`
      <div class="zoom-controls">
        <button
          class="icon-btn"
          @click=${() => {
            this._scale = Math.min(this._scale * 1.2, 2.0);
          }}
        >
          <svg viewBox="0 0 24 24"><path d="${mdiPlus}" /></svg>
        </button>
        <span class="zoom-pct">${Math.round(this._scale * 100)}%</span>
        <button
          class="icon-btn"
          @click=${() => {
            this._scale = Math.max(this._scale / 1.2, 0.2);
          }}
        >
          <svg viewBox="0 0 24 24"><path d="${mdiMinus}" /></svg>
        </button>
      </div>
    `;
  }

  // ---------------------------------------------------------------------------
  // Render: legend
  // ---------------------------------------------------------------------------

  private _renderLegend(): TemplateResult {
    return html`
      <div class="legend">
        <div class="legend-row">
          <div class="legend-line solid"></div>
          <span>Mother</span>
        </div>
        <div class="legend-row">
          <div class="legend-line dashed"></div>
          <span>Father</span>
        </div>
      </div>
    `;
  }

  // ---------------------------------------------------------------------------
  // Render: minimap
  // ---------------------------------------------------------------------------

  private _renderMinimap(c: LayoutResult, visible: TreeNode[]): TemplateResult {
    const mmW = 180;
    const mmH = 120;
    const { minX, maxX, minY, maxY } = c.bounds;
    const treeW = maxX - minX || 1;
    const treeH = maxY - minY || 1;
    const scaleX = mmW / treeW;
    const scaleY = mmH / treeH;

    const vpX = (-this._panX / this._scale - minX) * scaleX;
    const vpY = (-this._panY / this._scale - minY) * scaleY;
    const vpW = (this._viewW / this._scale) * scaleX;
    const vpH = (this._viewH / this._scale) * scaleY;

    return html`
      <svg
        class="minimap"
        width="${mmW}"
        height="${mmH}"
        @click=${(e: MouseEvent) => {
          const rect = (e.currentTarget as SVGElement).getBoundingClientRect();
          const wx = (e.clientX - rect.left) / scaleX + minX;
          const wy = (e.clientY - rect.top) / scaleY + minY;
          this._panX = this._viewW / 2 - wx * this._scale;
          this._panY = this._viewH / 2 - wy * this._scale;
        }}
      >
        ${visible.map((p) => {
          const ln = c.nodes[p.id];
          if (!ln) return nothing;
          const rx = (ln.x - minX) * scaleX;
          const ry = (ln.y - minY) * scaleY;
          const rw = ln.w * scaleX;
          const rh = ln.h * scaleY;
          return svg`<rect
            x="${rx}" y="${ry}" width="${Math.max(rw, 2)}" height="${Math.max(rh, 2)}"
            rx="1"
            fill="${genColor(p.gen)}"
            opacity="0.7"
          />`;
        })}
        <rect
          x="${vpX}"
          y="${vpY}"
          width="${vpW}"
          height="${vpH}"
          fill="none"
          stroke="#4caf50"
          stroke-width="1.5"
          rx="2"
        />
      </svg>
    `;
  }

  // ---------------------------------------------------------------------------
  // Render: compare drawer
  // ---------------------------------------------------------------------------

  private _renderCompareDrawer(): TemplateResult {
    if (this._compareIds.length === 0) return html`${nothing}`;

    const byId = Object.fromEntries(this.nodes.map((n) => [n.id, n]));

    const renderCol = (id: string | undefined, slot: number): TemplateResult => {
      if (!id) {
        return html`
          <div class="cd-col cd-empty">
            <svg viewBox="0 0 24 24"><path d="${mdiPlus}" /></svg>
            <span>Click a node to compare</span>
          </div>
        `;
      }
      const n = byId[id];
      if (!n) return html`${nothing}`;
      return html`
        <div class="cd-col">
          <div class="cd-header">
            <span class="cd-name">${n.name}</span>
            <button
              class="icon-btn"
              @click=${() => {
                this._compareIds = this._compareIds.filter((_, i) => i !== slot);
              }}
            >
              <svg viewBox="0 0 24 24"><path d="${mdiClose}" /></svg>
            </button>
          </div>
          <div class="cd-row"><span class="cd-k">Gen</span><span class="cd-v">${n.gen}</span></div>
          <div class="cd-row"><span class="cd-k">Strain</span><span class="cd-v">${n.strain}</span></div>
          <div class="cd-row"><span class="cd-k">Breeder</span><span class="cd-v">${n.breeder}</span></div>
          <div class="cd-row"><span class="cd-k">Pheno</span><span class="cd-v">${n.pheno || '—'}</span></div>
          <div class="cd-row"><span class="cd-k">Type</span><span class="cd-v">${n.type}</span></div>
        </div>
      `;
    };

    return html`
      <div class="compare-drawer">
        <div class="cd-title">
          <svg viewBox="0 0 24 24"><path d="${mdiCompare}" /></svg>
          Compare
          <button
            class="icon-btn"
            style="margin-left:auto"
            @click=${() => {
              this._compareIds = [];
            }}
          >
            <svg viewBox="0 0 24 24"><path d="${mdiClose}" /></svg>
          </button>
        </div>
        <div class="cd-cols">
          ${renderCol(this._compareIds[0], 0)}
          ${renderCol(this._compareIds[1], 1)}
        </div>
      </div>
    `;
  }

  // ---------------------------------------------------------------------------
  // Render: detail panel
  // ---------------------------------------------------------------------------

  private _renderDetailPanel(): TemplateResult {
    if (!this._selectedId) return html`${nothing}`;
    const byId = Object.fromEntries(this.nodes.map((n) => [n.id, n]));
    const n = byId[this._selectedId];
    if (!n) return html`${nothing}`;

    const motherNode = n.parents.mother ? byId[n.parents.mother] : null;
    const fatherNode = n.parents.father ? byId[n.parents.father] : null;

    return html`
      <div class="detail-panel">
        <div class="dp-header">
          <span class="dp-title">${n.name}</span>
          <button
            class="icon-btn"
            @click=${() => {
              this._selectedId = null;
            }}
          >
            <svg viewBox="0 0 24 24"><path d="${mdiClose}" /></svg>
          </button>
        </div>
        <div class="dp-body">
          <div class="dp-row"><span class="dp-k">Generation</span><span class="dp-v">${n.gen}</span></div>
          <div class="dp-row"><span class="dp-k">Strain</span><span class="dp-v">${n.strain}</span></div>
          <div class="dp-row"><span class="dp-k">Breeder</span><span class="dp-v">${n.breeder}</span></div>
          <div class="dp-row"><span class="dp-k">Phenotype</span><span class="dp-v">${n.pheno || '—'}</span></div>
          <div class="dp-row">
            <span class="dp-k">Mother</span>
            <span
              class="dp-v ${motherNode ? 'dp-link' : ''}"
              @click=${() => {
                if (motherNode) {
                  this.focalId = motherNode.id;
                  this._selectedId = motherNode.id;
                }
              }}
            >
              ${motherNode ? motherNode.name : '—'}
            </span>
          </div>
          <div class="dp-row">
            <span class="dp-k">Father</span>
            <span class="dp-v">${fatherNode ? fatherNode.name : '—'}</span>
          </div>
        </div>
        <div class="dp-footer">
          <button
            class="pill-btn active"
            @click=${() => {
              this.focalId = n.id;
              this._focusMode = true;
            }}
          >
            Focus Lineage
          </button>
          <button
            class="pill-btn"
            @click=${() => {
              if (!this._compareIds.includes(n.id) && this._compareIds.length < 2) {
                this._compareIds = [...this._compareIds, n.id];
              }
            }}
          >
            <svg viewBox="0 0 24 24"><path d="${mdiCompare}" /></svg>
            Compare
          </button>
        </div>
      </div>
    `;
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
      --bg-glass: rgba(20, 20, 24, 0.8);
      --fg-1: #fff;
      --fg-2: rgba(255, 255, 255, 0.7);
      --fg-3: rgba(255, 255, 255, 0.5);
      --divider-faint: rgba(255, 255, 255, 0.05);
      --gv-primary: #4caf50;
      --gv-secondary: #2196f3;
      --gv-mother: #e91e63;
      --elev-glass: 0 8px 32px rgba(0, 0, 0, 0.37);
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
      gap: 12px;
      padding: 10px 16px;
      background: var(--bg-card);
      border-bottom: 1px solid var(--divider-faint);
      flex-shrink: 0;
      flex-wrap: wrap;
    }

    .search-bar {
      display: flex;
      align-items: center;
      gap: 6px;
      background: var(--bg-input);
      border: 1px solid var(--bg-input-border);
      border-radius: 999px;
      padding: 4px 10px;
      flex: 1;
      min-width: 140px;
      max-width: 260px;
    }
    .search-bar:focus-within {
      border-color: var(--gv-primary);
      box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
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
    .search-bar input::placeholder {
      color: var(--fg-3);
    }

    .layout-toggle {
      display: flex;
      border-radius: 999px;
      overflow: hidden;
      border: 1px solid var(--bg-input-border);
    }
    .layout-toggle button {
      background: var(--bg-input);
      color: var(--fg-2);
      border: none;
      padding: 5px 14px;
      font-size: 12px;
      cursor: pointer;
      transition: background 0.2s, color 0.2s;
    }
    .layout-toggle button:first-child {
      border-right: 1px solid var(--bg-input-border);
    }
    .layout-toggle button.active {
      background: linear-gradient(135deg, #4caf50, #45a049);
      color: #fff;
    }
    .layout-toggle button:hover:not(.active) {
      background: var(--bg-card-elev);
    }

    .pill-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      background: var(--bg-input);
      color: var(--fg-2);
      border: 1px solid var(--bg-input-border);
      border-radius: 999px;
      padding: 5px 14px;
      font-size: 12px;
      cursor: pointer;
      white-space: nowrap;
      transition: background 0.2s, color 0.2s, border-color 0.2s;
    }
    .pill-btn svg {
      width: 14px;
      height: 14px;
      fill: currentColor;
    }
    .pill-btn:hover {
      border-color: var(--gv-primary);
      color: var(--fg-1);
    }
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
    .icon-btn svg {
      width: 16px;
      height: 16px;
      fill: currentColor;
    }
    .icon-btn:hover {
      background: var(--bg-card-elev);
      color: var(--fg-1);
    }

    .count-badge {
      font-size: 11px;
      color: var(--fg-3);
      white-space: nowrap;
      margin-left: auto;
    }

    /* ---- Filter row ---- */
    .filter-row {
      display: flex;
      flex-direction: row;
      flex-wrap: wrap;
      gap: 6px;
      padding: 8px 16px;
      background: var(--bg-card);
      border-bottom: 1px solid var(--divider-faint);
      flex-shrink: 0;
    }

    .gen-chip {
      background: var(--bg-input);
      border: 1px solid var(--chip-c, var(--bg-input-border));
      color: var(--fg-2);
      border-radius: 999px;
      padding: 3px 12px;
      font-size: 11px;
      cursor: pointer;
      transition: background 0.2s, color 0.2s;
    }
    .gen-chip:hover {
      background: var(--bg-card-elev);
      color: var(--fg-1);
    }
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
      padding: 3px 12px;
      font-size: 11px;
      cursor: pointer;
      margin-left: 4px;
    }
    .clear-btn:hover {
      background: rgba(229, 57, 53, 0.2);
    }

    /* ---- Canvas area ---- */
    .canvas-wrap {
      flex: 1;
      position: relative;
      overflow: hidden;
      cursor: grab;
    }
    .canvas-wrap:active {
      cursor: grabbing;
    }

    .bg-grid {
      position: absolute;
      inset: 0;
      background-image: radial-gradient(
        circle,
        rgba(255, 255, 255, 0.04) 1px,
        transparent 1px
      );
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

    /* ---- Edges SVG ---- */
    .edges-svg {
      position: absolute;
      pointer-events: none;
      overflow: visible;
    }

    .edge {
      fill: none;
      stroke-width: 1.6;
    }
    .edge-mother {
      stroke: rgba(255, 255, 255, 0.55);
    }
    .edge-father {
      stroke: rgba(255, 255, 255, 0.3);
      stroke-dasharray: 5 3;
    }
    .edge-clone {
      stroke: rgba(233, 30, 99, 0.5);
      stroke-dasharray: 2 2;
    }
    .edge.dimmed {
      opacity: 0.1;
    }
    .edge.mother-line {
      stroke: var(--gv-mother);
      stroke-width: 2.2;
      filter: drop-shadow(0 0 4px var(--gv-mother));
    }

    /* ---- Tree nodes ---- */
    .tree-node {
      position: absolute;
      background: var(--bg-card-elev);
      border: 1px solid rgba(255, 255, 255, 0.07);
      border-radius: 12px;
      overflow: hidden;
      cursor: pointer;
      box-sizing: border-box;
      transition: opacity 0.2s, box-shadow 0.2s, border-color 0.2s;
    }
    .tree-node::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 3px;
      height: 100%;
      background: var(--stage-c, #555);
      border-radius: 12px 0 0 12px;
    }
    .tree-node:hover {
      border-color: rgba(255, 255, 255, 0.2);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
    }
    .tree-node.dimmed {
      opacity: 0.25;
    }
    .tree-node.highlighted {
      border-color: var(--gv-primary);
      box-shadow: 0 0 0 1px var(--gv-primary), var(--elev-glass);
    }
    .tree-node.selected {
      border-color: var(--gv-secondary);
      box-shadow: 0 0 0 2px var(--gv-secondary), var(--elev-glass);
    }
    .tree-node.compare {
      border-color: #9c27b0;
      box-shadow: 0 0 0 1px #9c27b0;
    }

    /* ---- Node body ---- */
    .pn-body {
      padding: 6px 8px 6px 14px;
      display: flex;
      flex-direction: column;
      gap: 2px;
      height: 100%;
      box-sizing: border-box;
    }
    .pn-row1 {
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
      font-size: 10px;
      color: var(--fg-3);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .pn-row3 {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .type-badge {
      font-size: 9px;
      border-radius: 4px;
      padding: 1px 5px;
      font-weight: 500;
    }
    .type-badge.strain {
      background: rgba(156, 39, 176, 0.3);
      color: #ce93d8;
    }
    .type-badge.batch {
      background: rgba(33, 150, 243, 0.2);
      color: #90caf9;
    }
    .pheno-badge {
      font-size: 9px;
      background: rgba(255, 255, 255, 0.07);
      color: var(--fg-3);
      border-radius: 4px;
      padding: 1px 5px;
      font-style: italic;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 80px;
    }

    .compare-badge {
      position: absolute;
      top: 5px;
      right: 5px;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #9c27b0;
      color: #fff;
      font-size: 10px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .fold-btn {
      position: absolute;
      bottom: 4px;
      right: 4px;
      display: inline-flex;
      align-items: center;
      gap: 2px;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 6px;
      padding: 2px 4px;
      cursor: pointer;
      color: var(--fg-3);
      font-size: 9px;
    }
    .fold-btn svg {
      width: 12px;
      height: 12px;
      fill: currentColor;
    }
    .fold-btn:hover {
      color: var(--fg-1);
      background: rgba(255, 255, 255, 0.12);
    }
    .fold-btn.collapsed {
      color: var(--gv-primary);
      border-color: var(--gv-primary);
    }
    .desc-count {
      font-size: 9px;
      font-weight: 600;
    }

    /* ---- Gen labels ---- */
    .gen-label {
      position: absolute;
      display: flex;
      flex-direction: column;
      gap: 1px;
      pointer-events: none;
    }
    .gen-eyebrow {
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.6px;
      text-transform: uppercase;
      color: var(--fg-3);
    }
    .gen-tags {
      font-size: 10px;
      color: var(--fg-2);
    }

    /* ---- Zoom controls ---- */
    .zoom-controls {
      position: absolute;
      bottom: 16px;
      left: 16px;
      display: flex;
      align-items: center;
      gap: 4px;
      background: var(--bg-glass);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 999px;
      padding: 4px 8px;
      box-shadow: var(--elev-glass);
      backdrop-filter: blur(8px);
    }
    .zoom-pct {
      font-size: 11px;
      color: var(--fg-2);
      width: 36px;
      text-align: center;
    }

    /* ---- Legend ---- */
    .legend {
      position: absolute;
      bottom: 16px;
      left: 110px;
      display: flex;
      flex-direction: column;
      gap: 5px;
      background: var(--bg-glass);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      padding: 8px 12px;
      box-shadow: var(--elev-glass);
      backdrop-filter: blur(8px);
    }
    .legend-row {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 11px;
      color: var(--fg-2);
    }
    .legend-line {
      width: 24px;
      height: 2px;
      border-radius: 1px;
    }
    .legend-line.solid {
      background: rgba(255, 255, 255, 0.55);
    }
    .legend-line.dashed {
      background: repeating-linear-gradient(
        90deg,
        rgba(255, 255, 255, 0.3) 0,
        rgba(255, 255, 255, 0.3) 5px,
        transparent 5px,
        transparent 8px
      );
    }

    /* ---- Minimap ---- */
    .minimap {
      position: absolute;
      bottom: 16px;
      right: 16px;
      background: var(--bg-glass);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      box-shadow: var(--elev-glass);
      backdrop-filter: blur(8px);
      cursor: crosshair;
    }

    /* ---- Compare drawer ---- */
    .compare-drawer {
      position: absolute;
      top: 16px;
      right: 16px;
      width: 340px;
      background: var(--bg-glass);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      box-shadow: var(--elev-glass);
      backdrop-filter: blur(12px);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .cd-title {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 12px;
      font-size: 13px;
      font-weight: 600;
      color: var(--fg-1);
      border-bottom: 1px solid var(--divider-faint);
    }
    .cd-title svg {
      width: 16px;
      height: 16px;
      fill: var(--gv-primary);
      flex-shrink: 0;
    }
    .cd-cols {
      display: grid;
      grid-template-columns: 1fr 1fr;
    }
    .cd-col {
      padding: 10px 12px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      border-right: 1px solid var(--divider-faint);
    }
    .cd-col:last-child {
      border-right: none;
    }
    .cd-col.cd-empty {
      align-items: center;
      justify-content: center;
      gap: 6px;
      min-height: 80px;
      color: var(--fg-3);
      font-size: 11px;
      font-style: italic;
    }
    .cd-col.cd-empty svg {
      width: 20px;
      height: 20px;
      fill: var(--fg-3);
    }
    .cd-header {
      display: flex;
      align-items: flex-start;
      gap: 4px;
      margin-bottom: 4px;
    }
    .cd-name {
      font-size: 12px;
      font-weight: 600;
      color: var(--fg-1);
      flex: 1;
      word-break: break-word;
    }
    .cd-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 4px;
    }
    .cd-k {
      font-size: 10px;
      color: var(--fg-3);
    }
    .cd-v {
      font-size: 11px;
      color: var(--fg-2);
      text-align: right;
      word-break: break-word;
    }

    /* ---- Detail panel ---- */
    .detail-panel {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background: var(--bg-glass);
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(12px);
      display: flex;
      flex-direction: column;
      gap: 0;
      z-index: 10;
    }
    .dp-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px 8px;
      border-bottom: 1px solid var(--divider-faint);
    }
    .dp-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--fg-1);
      flex: 1;
    }
    .dp-body {
      display: flex;
      flex-wrap: wrap;
      gap: 0;
      padding: 8px 16px;
    }
    .dp-row {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 4px 16px 4px 0;
      min-width: 100px;
    }
    .dp-k {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--fg-3);
    }
    .dp-v {
      font-size: 12px;
      color: var(--fg-2);
    }
    .dp-link {
      color: var(--gv-primary);
      cursor: pointer;
      text-decoration: underline dotted;
    }
    .dp-footer {
      display: flex;
      gap: 8px;
      padding: 8px 16px 12px;
      border-top: 1px solid var(--divider-faint);
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
