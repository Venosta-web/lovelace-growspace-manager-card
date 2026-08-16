import { LitElement, css, html, nothing, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { consume } from '@lit/context';
import type { HomeAssistant } from 'custom-card-helpers';
import { hassContext } from '../../../context';
import { reducedMotion } from '../../../styles/reduced-motion.styles';
import { entityLabel } from '../../shared/ui/gm-entity-picker';
import '../../shared/ui/gm-entity-picker';

export interface ConfigEntityValuesChangedDetail {
  values: string[];
}

/** Shared multi-select entity field for Config Dialog tabs. */
@customElement('config-entity-multi-select')
export class ConfigEntityMultiSelect extends LitElement {
  @consume({ context: hassContext, subscribe: true })
  @property({ attribute: false })
  hass?: HomeAssistant;

  @property() label = '';
  @property({ attribute: false }) values: string[] = [];
  @property({ attribute: false }) options: string[] = [];

  static styles = css`
    :host {
      display: block;
      position: relative;
    }

    /* The picker below brings its own textfield chrome, so the field itself is
       a plain stack: label, chips, picker. */
    .multi-select-box {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    label {
      color: var(--secondary-text-color, rgba(255, 255, 255, 0.7));
      font-size: 0.857143rem;
    }

    .chip {
      display: inline-flex;
      align-items: center;
      min-width: 0;
      max-width: 100%;
      min-height: 44px;
      padding: 0 4px 0 12px;
      border-radius: 16px;
      background: var(--secondary-background-color, rgba(255, 255, 255, 0.1));
      font-size: 1rem;
    }

    /* Entity IDs run long; truncate so the remove control stays reachable. */
    .chip-label {
      display: flex;
      flex-direction: column;
      overflow: hidden;
      line-height: 1.2;
    }

    .chip-name,
    .chip-id {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .chip-id {
      color: var(--secondary-text-color, rgba(255, 255, 255, 0.7));
      font-size: 0.857143rem;
    }

    .chip-remove {
      display: inline-flex;
      flex-shrink: 0;
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

    /* The add affordance keeps its own row so it stays visible — and a second
       entity stays discoverable — once chips are present. */
    .add-picker {
      width: 100%;
    }

    ${reducedMotion}
  `;

  render(): TemplateResult {
    const remaining = this.options.filter((option) => !this.values.includes(option));
    return html`
      <div class="multi-select-box">
        <label>${this.label}</label>
        <div class="chips">
          ${this.values.map(
            (value) => html`
              <div class="chip">
                <span class="chip-label" title=${value}>
                  <span class="chip-name">${entityLabel(this.hass, value)}</span>
                  ${entityLabel(this.hass, value) === value
                    ? nothing
                    : html`<span class="chip-id">${value}</span>`}
                </span>
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
        </div>
        <gm-entity-picker
          class="add-picker"
          label="Add entity"
          .options=${remaining}
          .hass=${this.hass}
          clear-on-pick
          @entity-picked=${this._add}
        ></gm-entity-picker>
      </div>
    `;
  }

  private _add(event: CustomEvent<string>): void {
    event.stopPropagation();
    const value = event.detail;
    if (value && !this.values.includes(value)) this._emit([...this.values, value]);
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
