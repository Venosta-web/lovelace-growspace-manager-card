import { LitElement, css, html, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';

export interface ConfigEntityValuesChangedDetail {
  values: string[];
}

/** Shared multi-select entity field for Config Dialog tabs. */
@customElement('config-entity-multi-select')
export class ConfigEntityMultiSelect extends LitElement {
  @property() label = '';
  @property({ attribute: false }) values: string[] = [];
  @property({ attribute: false }) options: string[] = [];
  @property({ attribute: 'list-id' }) listId = 'list-multi-entities';

  static styles = css`
    :host {
      display: block;
      position: relative;
    }

    .multi-select-box {
      position: relative;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      min-height: 56px;
      box-sizing: border-box;
      padding: 26px 16px 6px;
      border-bottom: 1px solid var(--primary-text-color, rgba(255, 255, 255, 0.4));
      border-radius: 4px 4px 0 0;
      background: rgba(var(--card-background-color, 255, 255, 255), 0.05);
      backdrop-filter: blur(8px);
      transition:
        background 0.2s cubic-bezier(0.2, 0, 0, 1),
        border-color 0.2s cubic-bezier(0.2, 0, 0, 1);
    }

    .multi-select-box:hover {
      border-bottom-color: var(--primary-light-color-hover, rgba(255, 255, 255, 0.6));
      background: rgba(var(--secondary-background-color, 255, 255, 255), 0.08);
    }

    .multi-select-box:focus-within {
      padding-bottom: 5px;
      border-bottom: 2px solid
        var(--primary-light-color-active, rgba(255, 255, 255, 0.6));
      background: rgba(var(--secondary-background-color, 255, 255, 255), 0.12);
    }

    label {
      position: absolute;
      z-index: 1;
      top: 8px;
      left: 16px;
      color: var(--secondary-text-color, rgba(255, 255, 255, 0.7));
      font-size: 0.857143rem;
      pointer-events: none;
    }

    .chip {
      display: inline-flex;
      align-items: center;
      min-height: 44px;
      padding: 0 4px 0 12px;
      border-radius: 16px;
      background: var(--secondary-background-color, rgba(255, 255, 255, 0.1));
      font-size: 1rem;
    }

    .chip-remove {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 44px;
      min-height: 44px;
      margin-left: 2px;
      padding: 0;
      border: 0;
      background: transparent;
      color: inherit;
      font: inherit;
      font-weight: 700;
      cursor: pointer;
      opacity: 0.7;
    }

    .chip-remove:hover {
      opacity: 1;
    }

    .chip-remove:focus-visible {
      outline: 2px solid var(--primary-text-color, #fff);
      outline-offset: -4px;
      opacity: 1;
    }

    input {
      flex: 1;
      min-width: 100px;
      height: 24px;
      margin: 0;
      padding: 0;
      border: 0;
      outline: 0;
      background: transparent;
      color: var(--primary-text-color, #fff);
      font: inherit;
      font-size: 1rem;
    }
  `;

  render(): TemplateResult {
    return html`
      <div class="multi-select-box">
        <label for="entity-input">${this.label}</label>
        ${this.values.map(
          (value) => html`
            <div class="chip">
              ${value}
              <button
                type="button"
                class="chip-remove"
                aria-label=${`Remove ${value}`}
                title=${`Remove ${value}`}
                @click=${() => this._remove(value)}
              >
                ×
              </button>
            </div>
          `
        )}
        <input
          id="entity-input"
          list=${this.listId}
          placeholder="Add Entity..."
          @change=${this._add}
        />
      </div>
      <datalist id=${this.listId}>
        ${this.options.map((entityId) => html`<option value=${entityId}></option>`)}
      </datalist>
    `;
  }

  private _add(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value;
    if (value && !this.values.includes(value)) this._emit([...this.values, value]);
    input.value = '';
  }

  private _remove(value: string): void {
    this._emit(this.values.filter((candidate) => candidate !== value));
  }

  private _emit(values: string[]): void {
    this.dispatchEvent(
      new CustomEvent<ConfigEntityValuesChangedDetail>('entity-values-changed', {
        detail: { values },
        bubbles: true,
        composed: true,
      })
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'config-entity-multi-select': ConfigEntityMultiSelect;
  }
}
