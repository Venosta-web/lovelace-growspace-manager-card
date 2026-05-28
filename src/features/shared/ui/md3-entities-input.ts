import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { HomeAssistant } from 'custom-card-helpers';

@customElement('md3-entities-input')
export class Md3EntitiesInput extends LitElement {
  @property() label = '';
  @property({ type: Array }) value: string[] = [];
  @property({ type: Array }) domains: string[] = [];
  @property({ attribute: false }) hass: HomeAssistant | undefined;

  private _listId = `entities-list-${Math.random().toString(36).substr(2, 9)}`;

  static styles = css`
    :host {
      display: block;
      width: 100%;
    }
    .label {
      font-size: 0.75rem;
      color: var(--secondary-text-color, rgba(255, 255, 255, 0.6));
      display: block;
      margin-bottom: 4px;
    }
    .multi-select-box {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 4px 4px 0 0;
      border-bottom: 1px solid var(--primary-text-color, rgba(255, 255, 255, 0.4));
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 6px;
      padding: 8px;
      min-height: 40px;
      box-sizing: border-box;
    }
    .multi-select-box:focus-within {
      border-bottom: 2px solid var(--primary-color, rgba(255, 255, 255, 0.6));
    }
    .chip {
      display: inline-flex;
      align-items: center;
      background: var(--secondary-background-color, rgba(255, 255, 255, 0.1));
      border-radius: 16px;
      padding: 2px 10px;
      font-size: 0.85rem;
      gap: 4px;
    }
    .chip-remove {
      cursor: pointer;
      font-weight: bold;
      opacity: 0.7;
      line-height: 1;
    }
    .chip-remove:hover {
      opacity: 1;
    }
    .search-input {
      flex: 1;
      min-width: 80px;
      border: none;
      background: transparent;
      color: var(--primary-text-color);
      font-family: inherit;
      font-size: 0.9rem;
      padding: 2px 0;
      outline: none;
    }
  `;

  private _getEntities(): string[] {
    if (!this.hass) return [];
    return Object.keys(this.hass.states || {})
      .filter((eid) => {
        if (this.domains.length === 0) return true;
        return this.domains.includes(eid.split('.')[0]);
      })
      .sort();
  }

  private _remove(val: string) {
    const next = this.value.filter((v) => v !== val);
    this.value = next;
    this.dispatchEvent(new CustomEvent('change', { detail: next, bubbles: true, composed: true }));
  }

  private _handleAdd(e: Event) {
    const input = e.target as HTMLInputElement;
    const val = input.value.trim();
    if (val && !this.value.includes(val)) {
      const next = [...this.value, val];
      this.value = next;
      this.dispatchEvent(new CustomEvent('change', { detail: next, bubbles: true, composed: true }));
    }
    input.value = '';
  }

  render() {
    const entities = this._getEntities();
    return html`
      ${this.label ? html`<span class="label">${this.label}</span>` : ''}
      <div class="multi-select-box">
        ${this.value.map(
          (val) => html`
            <div class="chip">
              ${val}
              <span class="chip-remove" @click=${() => this._remove(val)}>×</span>
            </div>
          `
        )}
        <input
          class="search-input"
          list="${this._listId}"
          placeholder="Add entity..."
          @change=${this._handleAdd}
        />
      </div>
      <datalist id="${this._listId}">
        ${entities.map((eid) => html`<option value="${eid}"></option>`)}
      </datalist>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'md3-entities-input': Md3EntitiesInput;
  }
}
