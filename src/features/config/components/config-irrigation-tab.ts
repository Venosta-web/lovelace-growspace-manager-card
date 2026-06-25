/**
 * Config Irrigation Tab Component (ADR-0019, "Applied to Config Dialog")
 *
 * The dumb presentational element for the Config Dialog's Irrigation tab —
 * Irrigation Monitoring + Substrate EC, both just multi-entity-select pickers.
 * `@property .vm: IrrigationTabViewModel` in, a single `env-draft-changed` Tab
 * Intent out, **no `@state()` and no `hass`** (option lists are pre-derived into
 * the VM). Markup + multi-select styles transcribed from the former inline
 * `_renderIrrigationSection` / `_renderSubstrateEcSection`.
 *
 * Tab Intent (the Shell translates it to `UPDATE_ENV_DRAFT`):
 *   - `env-draft-changed`  detail: { partial: Partial<EnvironmentDraft> }
 */

import { LitElement, html, css, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { mdiGauge, mdiLightningBolt } from '@mdi/js';
import { dialogStyles } from '../../../styles/dialog.styles';
import type { EnvironmentDraft } from '../../../dialogs/config-dialog-sm';
import type {
  IrrigationTabViewModel,
  IrrigationFieldVM,
} from '../viewmodels/irrigation-tab.viewmodel';

@customElement('config-irrigation-tab')
export class ConfigIrrigationTab extends LitElement {
  @property({ attribute: false }) vm!: IrrigationTabViewModel;

  static styles = [
    dialogStyles,
    css`
      :host {
        display: block;
      }
      .form-section {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .multi-select-container {
        position: relative;
        margin-bottom: 0;
      }
      .multi-select-box {
        background: rgba(var(--card-background-color, 255, 255, 255), 0.05);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        border-radius: 4px 4px 0 0;
        border-bottom: 1px solid var(--primary-text-color, rgba(255, 255, 255, 0.4));
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px;
        padding: 26px 16px 6px;
        min-height: 56px;
        box-sizing: border-box;
        position: relative;
        transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);
      }
      .md3-label-multi {
        position: absolute;
        top: 8px;
        left: 16px;
        font-size: 0.75rem;
        color: var(--secondary-text-color);
        pointer-events: none;
        z-index: 10;
      }
      .chip {
        display: inline-flex;
        align-items: center;
        background: var(--secondary-background-color, rgba(255, 255, 255, 0.1));
        border-radius: 16px;
        padding: 4px 12px;
        font-size: 0.9rem;
        height: 24px;
      }
      .chip-remove {
        cursor: pointer;
        margin-left: 6px;
        font-weight: bold;
        opacity: 0.7;
      }
      .chip-remove:hover {
        opacity: 1;
      }
      .search-input-inner {
        flex: 1;
        min-width: 100px;
        border: none;
        background: transparent;
        color: var(--primary-text-color);
        font-family: inherit;
        font-size: 1rem;
        padding: 0;
        margin: 0;
        height: 24px;
        outline: none;
      }
    `,
  ];

  private _update(partial: Partial<EnvironmentDraft>): void {
    this.dispatchEvent(
      new CustomEvent('env-draft-changed', { detail: { partial }, bubbles: true, composed: true })
    );
  }

  render(): TemplateResult {
    const m = this.vm.monitoring;
    return html`
      <div class="detail-card">
        ${this._header(mdiGauge, 'Irrigation Monitoring')}
        <div class="form-section">
          <div class="row-col-grid">${this._field(m[0])}${this._field(m[1])}</div>
          <div class="row-col-grid">${this._field(m[2])}</div>
          <div class="row-col-grid">${this._field(m[3])}${this._field(m[4])}</div>
          <div class="row-col-grid">${this._field(m[5])}${this._field(m[6])}</div>
        </div>
      </div>
      <div class="detail-card">
        ${this._header(mdiLightningBolt, 'Substrate EC')}
        <div class="form-section">
          <div class="row-col-grid">
            ${this.vm.substrate.map((f) => this._field(f))}
          </div>
        </div>
      </div>
    `;
  }

  private _header(icon: string, title: string): TemplateResult {
    return html`
      <div
        style="display:flex;align-items:center;gap:8px;margin-bottom:16px;border-bottom:1px solid var(--divider-color,rgba(255,255,255,0.1));padding-bottom:8px;"
      >
        <svg style="width:20px;height:20px;fill:var(--primary-color,#4caf50);" viewBox="0 0 24 24">
          <path d="${icon}"></path>
        </svg>
        <h3 style="margin:0;border:none;padding:0;">${title}</h3>
      </div>
    `;
  }

  private _field(field: IrrigationFieldVM): TemplateResult {
    const values = field.value;
    const listId = `list-multi-${field.key}`;
    return html`
      <div class="multi-select-container">
        <label class="md3-label-multi">${field.label}</label>
        <div class="multi-select-box">
          ${values.map(
            (val) => html`
              <div class="chip">
                ${val}
                <span class="chip-remove" @click=${() => this._update({ [field.key]: values.filter((v) => v !== val) })}
                  >×</span
                >
              </div>
            `
          )}
          <input
            class="search-input-inner"
            list="${listId}"
            placeholder=${values.length === 0 ? 'Add Entity...' : ''}
            @change=${(e: Event) => {
              const input = e.target as HTMLInputElement;
              const val = input.value;
              if (val && !values.includes(val)) this._update({ [field.key]: [...values, val] });
              input.value = '';
            }}
          />
        </div>
        <datalist id="${listId}">
          ${field.options.map((eid) => html`<option value="${eid}"></option>`)}
        </datalist>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'config-irrigation-tab': ConfigIrrigationTab;
  }
}
