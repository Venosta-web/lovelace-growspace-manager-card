/**
 * Config Sensors Tab Component (ADR-0019, "Applied to Config Dialog")
 *
 * The dumb presentational element for the Config Dialog's Sensors tab — the
 * first env-cluster tab. `@property .vm: SensorsTabViewModel` in, a single
 * `env-draft-changed` Tab Intent out, **no `@state()` and no `hass`**: the entity
 * option lists and the live VPD readout are pre-derived into the VM by the shell
 * (see sensors-tab.viewmodel). Markup is transcribed verbatim from the former
 * inline `_renderSensorsSection` / `_renderMultiEntitySelect` / `_renderEntitySelect`
 * / `_renderLstOffsetSection`; the multi-select / chip / entity-select styles moved
 * here with it, `md3-*` / `detail-card` / `row-col-grid` come from `dialogStyles`.
 *
 * Tab Intent (the Config Dialog Shell translates it to `UPDATE_ENV_DRAFT`):
 *   - `env-draft-changed`  detail: { partial: Partial<EnvironmentDraft> }
 */

import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { mdiThermometer } from '@mdi/js';
import { dialogStyles } from '../../../styles/dialog.styles';
import '../../shared/ui/md3-number-input';
import './config-entity-multi-select';
import './config-section-header';
import type { EnvironmentDraft } from '../../../dialogs/config-dialog-sm';
import type {
  SensorsTabViewModel,
  SensorFieldVM,
  LstVM,
  MoistureBandVM,
} from '../viewmodels/sensors-tab.viewmodel';
import { editBound, resetBand } from '../moisture-band';

@customElement('config-sensors-tab')
export class ConfigSensorsTab extends LitElement {
  @property({ attribute: false }) vm!: SensorsTabViewModel;

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
      /* ── Acceptable Moisture Band ── */
      .moisture-band {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 12px;
        border-radius: var(--border-radius-sm, 8px);
        background: rgba(var(--rgb-primary-text-color, 255, 255, 255), 0.04);
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
      }
      .moisture-band__title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 500;
      }
      .moisture-band__badge {
        font-size: 0.785714rem;
        font-weight: 400;
        padding: 2px 8px;
        border-radius: var(--border-radius-md, 12px);
        background: rgba(var(--rgb-primary-text-color, 255, 255, 255), 0.1);
        color: var(--secondary-text-color, rgba(255, 255, 255, 0.6));
      }
      .moisture-band__note {
        font-size: 0.857143rem;
        color: var(--secondary-text-color, rgba(255, 255, 255, 0.5));
      }
      .moisture-band__error {
        font-size: 0.857143rem;
        color: var(--error-color, #f44336);
      }
      .moisture-band__preview {
        font-size: 0.857143rem;
        font-weight: 500;
      }
      .moisture-band__preview[data-classification='in_band'] {
        color: var(--success-color, #4caf50);
      }
      .moisture-band__preview[data-classification='too_dry'] {
        color: var(--warning-color, #ffa726);
      }
      .moisture-band__preview[data-classification='too_wet'] {
        color: var(--info-color, #2196f3);
      }
      .entity-select-container {
        position: relative;
        z-index: 5;
      }
    `,
  ];

  private _emit(partial: Partial<EnvironmentDraft>): void {
    this.dispatchEvent(
      new CustomEvent('env-draft-changed', { detail: { partial }, bubbles: true, composed: true })
    );
  }

  render(): TemplateResult {
    const f = this.vm.fields;
    return html`
      <div class="detail-card">
        <config-section-header
          .icon=${mdiThermometer}
          label="Monitoring Sensors"
        ></config-section-header>
        <div class="form-section">
          <div class="row-col-grid">${this._field(f[0])}${this._field(f[1])}</div>
          <div class="row-col-grid">${this._field(f[2])}${this._field(f[3])}</div>
          ${this.vm.moistureBand ? this._renderMoistureBand(this.vm.moistureBand) : nothing}
          <div class="row-col-grid">${this._field(f[4])}${this._field(f[5])}</div>
          ${this._field(f[6])} ${this.vm.lst ? this._renderLst(this.vm.lst) : nothing}
        </div>
      </div>
    `;
  }

  private _field(field: SensorFieldVM): TemplateResult {
    return field.multi ? this._multiSelect(field) : this._singleSelect(field);
  }

  private _multiSelect(field: SensorFieldVM): TemplateResult {
    const values = field.value as string[];
    return html`
      <config-entity-multi-select
        .label=${field.label}
        .values=${values}
        .options=${field.options}
        list-id=${`list-multi-${field.key}`}
        @entity-values-changed=${(event: CustomEvent<{ values: string[] }>) =>
          this._emit({ [field.key]: event.detail.values })}
      ></config-entity-multi-select>
    `;
  }

  private _singleSelect(field: SensorFieldVM): TemplateResult {
    const listId = `list-${field.key}`;
    return html`
      <div class="entity-select-container">
        <div class="md3-input-group">
          <label class="md3-label">${field.label}</label>
          <input
            class="md3-input"
            list="${listId}"
            .value=${field.value as string}
            @change=${(e: Event) =>
              this._emit({ [field.key]: (e.target as HTMLInputElement).value })}
            placeholder="Search entity..."
          />
          <datalist id="${listId}">
            ${field.options.map((eid) => html`<option value="${eid}"></option>`)}
          </datalist>
        </div>
      </div>
    `;
  }

  /**
   * Emit one edited bound. `editBound` materialises the *other* bound from the
   * displayed default when the band was inherited — the backend rejects a lone
   * bound, so a half pair must never leave here.
   */
  private _emitBound(bound: 'min' | 'max', raw: string): void {
    const value = raw.trim() === '' ? null : Number.parseFloat(raw);
    const next = editBound(
      { min: this.vm.moistureBand?.rawMin ?? null, max: this.vm.moistureBand?.rawMax ?? null },
      bound,
      value !== null && Number.isNaN(value) ? null : value
    );
    this._emit({ soilMoistureMin: next.min, soilMoistureMax: next.max });
  }

  private _renderMoistureBand(band: MoistureBandVM): TemplateResult {
    if (band.incompatibleUnit) {
      return html`
        <div class="moisture-band moisture-band--incompatible">
          <div class="moisture-band__title">Acceptable Moisture Band</div>
          <div class="moisture-band__note">
            This sensor reports ${band.incompatibleUnit}, not a percentage, so its readings cannot
            be interpreted as soil moisture. Choose a percentage sensor to configure a healthy band.
          </div>
        </div>
      `;
    }

    return html`
      <div class="moisture-band">
        <div class="moisture-band__title">
          Acceptable Moisture Band
          ${band.isCustom
            ? nothing
            : html`<span class="moisture-band__badge">Using defaults</span>`}
        </div>
        <div class="moisture-band__note">
          Readings outside this range (inclusive) are flagged as warnings.
        </div>
        <div class="row-col-grid">
          <md3-number-input
            label="Healthy minimum"
            .value=${band.min}
            @change=${(e: CustomEvent) => this._emitBound('min', String(e.detail))}
            min="0"
            max="100"
            step=${band.step}
            suffix="%"
          ></md3-number-input>
          <md3-number-input
            label="Healthy maximum"
            .value=${band.max}
            @change=${(e: CustomEvent) => this._emitBound('max', String(e.detail))}
            min="0"
            max="100"
            step=${band.step}
            suffix="%"
          ></md3-number-input>
        </div>
        ${band.error ? html`<div class="moisture-band__error">${band.error}</div>` : nothing}
        ${band.preview
          ? html`<div
              class="moisture-band__preview"
              data-classification=${band.preview.classification}
            >
              Current reading ${band.preview.reading}% — ${band.preview.label}
            </div>`
          : nothing}
        <button
          class="md3-button config-reset-button moisture-band__reset"
          ?disabled=${!band.isCustom}
          title=${band.isCustom
            ? nothing
            : 'Nothing to reset — this moisture band already uses the defaults.'}
          @click=${() => {
            const cleared = resetBand();
            this._emit({ soilMoistureMin: cleared.min, soilMoistureMax: cleared.max });
          }}
        >
          Reset to defaults
        </button>
      </div>
    `;
  }

  private _renderLst(lst: LstVM): TemplateResult {
    return html`
      <div style="margin-top:12px;">
        <md3-number-input
          label="Leaf Surface Temperature Offset"
          .value=${lst.offset}
          @change=${(e: CustomEvent) => this._emit({ lstOffset: parseFloat(e.detail) })}
          min="-10"
          max="10"
          step="0.5"
          suffix="°C"
        ></md3-number-input>
        <div
          style="margin-top:4px;font-size:0.857143rem;color:var(--secondary-text-color,rgba(255,255,255,0.5));"
        >
          Current VPD: ${lst.vpdDisplay}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'config-sensors-tab': ConfigSensorsTab;
  }
}
