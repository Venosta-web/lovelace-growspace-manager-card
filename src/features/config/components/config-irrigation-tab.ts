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
import './config-entity-multi-select';
import './config-section-header';
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
          <div class="row-col-grid">${this.vm.substrate.map((f) => this._field(f))}</div>
        </div>
      </div>
    `;
  }

  private _header(icon: string, title: string): TemplateResult {
    return html`
      <config-section-header .icon=${icon} .label=${title}></config-section-header>
    `;
  }

  private _field(field: IrrigationFieldVM): TemplateResult {
    const values = field.value;
    return html`
      <config-entity-multi-select
        .label=${field.label}
        .values=${values}
        .options=${field.options}
        list-id=${`list-multi-${field.key}`}
        @entity-values-changed=${(event: CustomEvent<{ values: string[] }>) =>
          this._update({ [field.key]: event.detail.values })}
      ></config-entity-multi-select>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'config-irrigation-tab': ConfigIrrigationTab;
  }
}
