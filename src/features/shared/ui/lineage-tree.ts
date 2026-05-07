import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
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
