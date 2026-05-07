import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { LineageNode } from '../../plants/types';

const SEX_SYMBOLS: Record<string, string> = {
  female: '♀',
  male: '♂',
  hermaphrodite: '⚥',
};

const SEX_COLORS: Record<string, string> = {
  female: '#4caf50',
  male: '#2196f3',
  hermaphrodite: '#ff9800',
};

@customElement('lineage-tree')
export class LineageTree extends LitElement {
  @property({ attribute: false }) node: LineageNode | null = null;
  @property({ type: Boolean }) loading = false;

  static override styles = css`
    :host {
      display: block;
      font-size: 13px;
    }
    .tree-empty {
      color: var(--secondary-text-color);
      font-style: italic;
      padding: 8px 0;
    }
    .tree-loading {
      display: flex;
      gap: 8px;
      flex-direction: column;
      padding: 8px 0;
    }
    .skeleton {
      height: 36px;
      border-radius: 8px;
      background: var(--divider-color, #e0e0e0);
      animation: pulse 1.4s ease-in-out infinite;
    }
    .skeleton.narrow { width: 60%; }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }
    .tree-level {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0;
    }
    .tree-row {
      display: flex;
      justify-content: center;
      gap: 12px;
    }
    .connector-row {
      display: flex;
      justify-content: center;
      gap: 12px;
      position: relative;
    }
    .connector-row::before {
      content: '';
      position: absolute;
      top: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 2px;
      height: 12px;
      background: var(--divider-color, #ccc);
    }
    .node-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      padding: 6px 10px;
      border-radius: 8px;
      background: var(--card-background-color, #fff);
      border: 1px solid var(--divider-color, #e0e0e0);
      min-width: 80px;
      text-align: center;
    }
    .node-card.plant { border-color: var(--primary-color); }
    .node-card.seed_batch { border-color: #8bc34a; }
    .node-card.strain { border-color: #9c27b0; border-style: dashed; }
    .node-label {
      font-weight: 500;
      color: var(--primary-text-color);
      font-size: 12px;
      word-break: break-word;
    }
    .node-meta {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      color: var(--secondary-text-color);
    }
    .sex-badge {
      font-size: 12px;
      font-weight: bold;
    }
    .gen-badge {
      background: var(--primary-color);
      color: var(--text-primary-color, #fff);
      border-radius: 4px;
      padding: 0 4px;
      font-size: 10px;
    }
    .cross-label {
      font-size: 12px;
      color: var(--secondary-text-color);
      margin: 4px 0;
    }
    .parents-row {
      display: flex;
      justify-content: center;
      gap: 8px;
      margin-top: 0;
    }
    .parent-connector {
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .v-line {
      width: 2px;
      height: 12px;
      background: var(--divider-color, #ccc);
    }
  `;

  private _renderNode(node: LineageNode, depth = 0): TemplateResult {
    const sexSymbol = node.sex && node.sex !== 'unknown' ? SEX_SYMBOLS[node.sex] : null;
    const sexColor = node.sex ? SEX_COLORS[node.sex] : null;

    return html`
      <div class="tree-level">
        <div class="node-card ${node.type}">
          <div class="node-label">${node.name}</div>
          <div class="node-meta">
            ${sexSymbol ? html`<span class="sex-badge" style="color:${sexColor}">${sexSymbol}</span>` : nothing}
            ${node.generation ? html`<span class="gen-badge">${node.generation}</span>` : nothing}
          </div>
        </div>

        ${node.parents && node.parents.length > 0 && depth < 4 ? html`
          <div class="v-line"></div>
          ${node.parents.length === 1 ? html`
            ${this._renderNode(node.parents[0], depth + 1)}
          ` : html`
            <div class="cross-label">${node.parents.map(p => p.name).join(' × ')}</div>
            <div class="parents-row">
              ${node.parents.map(p => html`
                <div class="parent-connector">
                  ${this._renderNode(p, depth + 1)}
                </div>
              `)}
            </div>
          `}
        ` : nothing}
      </div>
    `;
  }

  override render(): TemplateResult {
    if (this.loading) {
      return html`
        <div class="tree-loading">
          <div class="skeleton"></div>
          <div class="skeleton narrow"></div>
        </div>
      `;
    }
    if (!this.node) {
      return html`<div class="tree-empty">No lineage data available.</div>`;
    }
    return this._renderNode(this.node);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lineage-tree': LineageTree;
  }
}

export type LineageParent = {
  name: string;
  source: 'library' | 'manual';
};

@customElement('lineage-tree-editor')
export class LineageTreeEditor extends LitElement {
  @property({ attribute: false }) node: LineageNode | null = null;
  @property({ attribute: false }) strainNames: string[] = [];

  @state() private _activeSlot: number | null = null;
  @state() private _query: [string, string] = ['', ''];

  static override styles = css`
    :host { display: block; font-size: 13px; }
    .lte-root { display: flex; flex-direction: column; align-items: center; gap: 0; }
    .lte-root-label {
      font-weight: 600; font-size: 14px; padding: 8px 16px;
      border-radius: 8px; background: var(--primary-color);
      color: var(--text-primary-color, #fff);
    }
    .lte-v-line { width: 2px; height: 16px; background: var(--divider-color, #ccc); }
    .lte-parents-row { display: flex; gap: 12px; justify-content: center; }
    .lte-parent-node {
      display: flex; flex-direction: column; align-items: center; gap: 4px;
      padding: 8px 12px; border-radius: 8px;
      border: 1px solid var(--divider-color); position: relative; min-width: 100px;
    }
    .lte-parent-name { font-weight: 500; font-size: 12px; }
    .lte-parent-name.library { color: var(--primary-color); }
    .lte-parent-name.manual { color: var(--secondary-text-color); font-style: italic; }
    .lte-remove {
      position: absolute; top: 2px; right: 4px;
      background: none; border: none; cursor: pointer;
      font-size: 14px; color: var(--error-color, #e53935); padding: 0;
    }
    .lte-add-slot { display: flex; flex-direction: column; align-items: center; }
    .lte-add-btn {
      padding: 6px 12px; border-radius: 6px; border: 1px dashed var(--divider-color);
      background: transparent; cursor: pointer; font-size: 12px;
      color: var(--secondary-text-color);
    }
    .lte-add-btn:hover { border-color: var(--primary-color); color: var(--primary-color); }
    .lte-autocomplete { position: relative; width: 200px; }
    .lte-search {
      width: 100%; padding: 6px 8px; border-radius: 6px;
      border: 1px solid var(--primary-color); font-size: 12px; box-sizing: border-box;
    }
    .lte-suggestions {
      position: absolute; top: 100%; left: 0; right: 0; z-index: 100;
      background: var(--card-background-color, #fff);
      border: 1px solid var(--divider-color); border-radius: 6px;
      max-height: 200px; overflow-y: auto; box-shadow: 0 4px 12px rgba(0,0,0,0.12);
    }
    .lte-suggestion { padding: 8px 12px; cursor: pointer; font-size: 12px; }
    .lte-suggestion:hover { background: var(--primary-color); color: var(--text-primary-color, #fff); }
    .lte-suggestion.manual { font-style: italic; color: var(--secondary-text-color); }
    .lte-preview { margin-top: 4px; opacity: 0.45; pointer-events: none; font-size: 11px; }
  `;

  private _fireChange(parents: LineageParent[]) {
    this.dispatchEvent(new CustomEvent('lineage-change', {
      detail: { parents },
      bubbles: true,
      composed: true,
    }));
  }

  private _currentParents(): LineageParent[] {
    return (this.node?.parents ?? []).map(p => ({
      name: p.name,
      source: (((p as unknown as Record<string, unknown>)['source']) ?? 'manual') as 'library' | 'manual',
    }));
  }

  private _removeParent(index: number) {
    const parents = this._currentParents();
    parents.splice(index, 1);
    this._fireChange(parents);
  }

  private _selectSuggestion(index: number, name: string, source: 'library' | 'manual') {
    const parents = this._currentParents();
    parents[index] = { name, source };
    this._activeSlot = null;
    this._fireChange(parents);
  }

  private _getSuggestions(index: number): string[] {
    const q = (this._query[index] ?? '').toLowerCase().trim();
    if (!q) return this.strainNames.slice(0, 8);
    return this.strainNames.filter(n => n.toLowerCase().includes(q)).slice(0, 8);
  }

  private _renderSlot(index: number): TemplateResult {
    const parents = this._currentParents();
    const existing = parents[index];
    const isOpen = this._activeSlot === index;

    if (existing) {
      return html`
        <div class="lte-parent-node">
          <span class="lte-parent-name ${existing.source}">${existing.name}</span>
          <button class="lte-remove" @click=${() => this._removeParent(index)}>×</button>
          ${existing.source === 'library' && this.node?.parents?.[index]?.parents?.length
            ? html`<div class="lte-preview"><lineage-tree .node=${this.node.parents[index]}></lineage-tree></div>`
            : nothing}
        </div>`;
    }

    const suggestions = this._getSuggestions(index);
    const query = this._query[index] ?? '';

    return html`
      <div class="lte-add-slot">
        ${isOpen ? html`
          <div class="lte-autocomplete">
            <input
              class="lte-search"
              placeholder="Type strain name…"
              .value=${query}
              @input=${(e: InputEvent) => {
                const q = [...this._query] as [string, string];
                q[index] = (e.target as HTMLInputElement).value;
                this._query = q;
              }}
              @keydown=${(e: KeyboardEvent) => {
                if (e.key === 'Escape') { this._activeSlot = null; }
              }}
            />
            <div class="lte-suggestions">
              ${suggestions.map(name => html`
                <div class="lte-suggestion" @click=${() => this._selectSuggestion(index, name, 'library')}>${name}</div>
              `)}
              ${query && !this.strainNames.includes(query) ? html`
                <div class="lte-suggestion manual" @click=${() => this._selectSuggestion(index, query, 'manual')}>
                  Use "${query}" (not in library)
                </div>` : nothing}
            </div>
          </div>` : html`
          <button class="lte-add-btn" @click=${() => { this._activeSlot = index; }}>＋ Add parent</button>`}
      </div>`;
  }

  override render(): TemplateResult {
    const name = this.node?.name ?? '—';
    const parents = this._currentParents();
    return html`
      <div class="lte-root">
        <div class="lte-root-label">${name}</div>
        <div class="lte-v-line"></div>
        <div class="lte-parents-row">
          ${this._renderSlot(0)}
          ${parents[0] ? this._renderSlot(1) : nothing}
        </div>
      </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lineage-tree-editor': LineageTreeEditor;
  }
}
