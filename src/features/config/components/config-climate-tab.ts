/**
 * Config Climate Tab Component (ADR-0019, "Applied to Config Dialog")
 *
 * The dumb presentational element for the Config Dialog's Climate tab — Climate
 * Control + the circulation Fan Controller panel + the Exhaust Fan Controller
 * panel. `@property .vm: ClimateTabViewModel` in, semantic Tab Intents out,
 * **no `@state()` and no `hass`**: the fan-entity option lists and the two
 * collapsible-section toggles are projected into the VM by the shell. Markup is
 * transcribed verbatim from the former inline `_renderClimateSection` /
 * `_renderFanControllerPanel` / `_renderExhaustFanControllerPanel`; the panels
 * are private render methods here (one consumer each → no new custom element),
 * while `<stage-vpd-overrides-table>` stays a shared sub-component.
 *
 * Fan-config edits merge against the VM's config (never the SM) and emit the
 * whole merged config, so the shell's `UPDATE_ENV_DRAFT` replaces it wholesale.
 *
 * Tab Intents (the Shell translates them):
 *   - `env-draft-changed`            detail: { partial: Partial<EnvironmentDraft> }   (top-level fields)
 *   - `fan-config-changed`           detail: { partial: Partial<CirculationFanConfig> }
 *   - `exhaust-config-changed`       detail: { partial: Partial<ExhaustFanConfig> }
 *   - `toggle-fan-temp-override`     (no detail)
 *   - `toggle-exhaust-critical-temp` (no detail)
 *   - `remove-environment-requested` (no detail)
 *
 * Fan/exhaust edits forward only the changed field; the Shell merges it against
 * the live draft (so synchronous multi-field edits accumulate). The component
 * never reads the SM.
 */

import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { mdiFan, mdiChevronDown } from '@mdi/js';
import { dialogStyles } from '../../../styles/dialog.styles';
import '../../shared/ui/md3-number-input';
import '../../shared/ui/md3-select';
import '../../environment/components/stage-vpd-overrides-table';
import { renderAcInfinityDevices } from './ac-infinity-device-editor';
import type { StageVpdOverrides } from '../../environment/components/stage-vpd-overrides-table';
import type { EnvironmentDraft } from '../../../dialogs/config-dialog-sm';
import type {
  CirculationFanConfig,
  ExhaustFanConfig,
} from '../../../slices/growspace/schema';
import type {
  ClimateTabViewModel,
  FanPanelVM,
  ExhaustPanelVM,
  ClimateControlVM,
  FanRegulationMode,
} from '../viewmodels/climate-tab.viewmodel';

@customElement('config-climate-tab')
export class ConfigClimateTab extends LitElement {
  @property({ attribute: false }) vm!: ClimateTabViewModel;

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
      .checkbox-label {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 0.875rem;
        color: var(--secondary-text-color, rgba(255, 255, 255, 0.7));
      }
      .checkbox-label input[type='checkbox'] {
        width: 20px;
        height: 20px;
        cursor: pointer;
      }
      .control-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      /* ── multi-select pickers — copied from config-dialog ── */
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

  private _emit(type: string, detail?: unknown): void {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }

  private _update(partial: Partial<EnvironmentDraft>): void {
    this._emit('env-draft-changed', { partial });
  }

  private _updateFan(partial: Partial<CirculationFanConfig>): void {
    this._emit('fan-config-changed', { partial });
  }

  private _updateExhaust(partial: Partial<ExhaustFanConfig>): void {
    this._emit('exhaust-config-changed', { partial });
  }

  render(): TemplateResult {
    return html`${this._renderControl(this.vm.control)}${this._renderFanPanel(this.vm.fan)}${this._renderExhaustPanel(this.vm.exhaust)}`;
  }

  private _sectionHeader(title: string): TemplateResult {
    return html`
      <div
        style="display:flex;align-items:center;gap:8px;margin-bottom:16px;border-bottom:1px solid var(--divider-color,rgba(255,255,255,0.1));padding-bottom:8px;"
      >
        <svg style="width:20px;height:20px;fill:var(--primary-color,#4caf50);" viewBox="0 0 24 24">
          <path d="${mdiFan}"></path>
        </svg>
        <h3 style="margin:0;border:none;padding:0;">${title}</h3>
      </div>
    `;
  }

  // ── Climate Control ─────────────────────────────────────────────────────────

  private _renderControl(c: ClimateControlVM): TemplateResult {
    return html`
      <div class="detail-card">
        ${this._sectionHeader('Climate Control')}
        <div class="form-section">
          <div class="row-col-grid">
            ${this._multiSelect('Exhaust Fan / Switch', 'exhaustFanEntities', c.exhaustFanEntities, c.exhaustFanOptions)}
            ${this._multiSelect('Circulation Fan / Switch', 'circulationFanEntities', c.circulationFanEntities, c.circulationFanOptions)}
          </div>
          ${renderAcInfinityDevices({
            label: 'Exhaust Fan AC Infinity Devices',
            devices: c.exhaustFanAcInfinityDevices,
            modeOptions: c.acInfinityModeOptions,
            speedOptions: c.acInfinitySpeedOptions,
            idPrefix: 'exhaust',
            onChange: (devices) => this._update({ exhaustFanAcInfinityDevices: devices }),
          })}
          ${renderAcInfinityDevices({
            label: 'Circulation Fan AC Infinity Devices',
            devices: c.circulationFanAcInfinityDevices,
            modeOptions: c.acInfinityModeOptions,
            speedOptions: c.acInfinitySpeedOptions,
            idPrefix: 'circulation',
            onChange: (devices) => this._update({ circulationFanAcInfinityDevices: devices }),
          })}
          <div class="row-col-grid">
            <md3-number-input
              label="Stress Threshold %"
              .value=${c.stressThreshold}
              @change=${(e: CustomEvent) => this._update({ stressThreshold: parseFloat(e.detail) })}
              step="0.01"
            ></md3-number-input>
            <md3-number-input
              label="Mold Threshold %"
              .value=${c.moldThreshold}
              @change=${(e: CustomEvent) => this._update({ moldThreshold: parseFloat(e.detail) })}
              step="0.01"
            ></md3-number-input>
          </div>
          <div class="control-row">
            <button
              class="md3-button tonal error"
              @click=${() => this._emit('remove-environment-requested')}
              ?disabled=${!c.canRemoveEnvironment}
            >
              Remove Environment
            </button>
          </div>
        </div>
      </div>
    `;
  }

  private _multiSelect(
    label: string,
    key: 'exhaustFanEntities' | 'circulationFanEntities',
    values: string[],
    options: string[]
  ): TemplateResult {
    const listId = `list-multi-${key}`;
    return html`
      <div class="multi-select-container">
        <label class="md3-label-multi">${label}</label>
        <div class="multi-select-box">
          ${values.map(
            (val) => html`
              <div class="chip">
                ${val}
                <span
                  class="chip-remove"
                  @click=${() => this._update({ [key]: values.filter((v) => v !== val) })}
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
              if (val && !values.includes(val)) this._update({ [key]: [...values, val] });
              input.value = '';
            }}
          />
        </div>
        <datalist id="${listId}">
          ${options.map((eid) => html`<option value="${eid}"></option>`)}
        </datalist>
      </div>
    `;
  }

  // ── Circulation Fan Controller ──────────────────────────────────────────────

  private _renderFanPanel(vm: FanPanelVM): TemplateResult {
    const fan = vm.config;
    return html`
      <div class="detail-card">
        ${this._sectionHeader('Fan Controller')}
        <div class="form-section">
          <label class="checkbox-label">
            <input
              type="checkbox"
              .checked=${fan.enabled}
              @change=${(e: Event) => this._updateFan({ enabled: (e.target as HTMLInputElement).checked })}
            />
            <span>Enabled</span>
          </label>
        </div>

        <div class="form-section" style="${vm.disabled ? 'opacity:0.5;pointer-events:none;' : ''}">
          <md3-select
            label="Regulation Mode"
            .value=${vm.mode}
            .options=${[
              { value: 'vpd', label: 'VPD' },
              { value: 'humidity', label: 'Humidity' },
              { value: 'temperature', label: 'Temperature' },
            ]}
            @change=${(e: CustomEvent) =>
              this._updateFan({ regulation_mode: e.detail as FanRegulationMode })}
          ></md3-select>

          ${vm.showStageVpd
            ? html`
                <div style="margin-top:8px;">
                  <label class="checkbox-label">
                    <input
                      type="checkbox"
                      .checked=${fan.stage_vpd_enabled}
                      @change=${(e: Event) =>
                        this._updateFan({ stage_vpd_enabled: (e.target as HTMLInputElement).checked })}
                    />
                    <span>Stage-Aware VPD</span>
                  </label>
                </div>
                ${vm.showStageVpdTable
                  ? html`
                      <div style="margin-top:12px;">
                        <stage-vpd-overrides-table
                          .overrides=${(fan.stage_vpd_overrides ?? {}) as StageVpdOverrides}
                          @overrides-change=${(e: CustomEvent<StageVpdOverrides>) =>
                            this._updateFan({ stage_vpd_overrides: e.detail })}
                        ></stage-vpd-overrides-table>
                      </div>
                    `
                  : nothing}
              `
            : nothing}

          <div class="row-col-grid">
            ${vm.mode === 'vpd'
              ? html`
                  <md3-number-input
                    label="${vm.vpdTargetLabel}"
                    style="${vm.vpdTargetDimmed ? 'opacity:0.5;' : ''}"
                    .value=${fan.vpd_target}
                    @change=${(e: CustomEvent) => this._updateFan({ vpd_target: parseFloat(e.detail) })}
                    step="0.01"
                  ></md3-number-input>
                  <md3-number-input
                    label="VPD Tolerance (kPa)"
                    .value=${fan.vpd_tolerance}
                    @change=${(e: CustomEvent) => this._updateFan({ vpd_tolerance: parseFloat(e.detail) })}
                    step="0.01"
                  ></md3-number-input>
                `
              : nothing}
            ${vm.mode === 'humidity'
              ? html`
                  <md3-number-input
                    label="Humidity Target (%)"
                    .value=${fan.humidity_target}
                    @change=${(e: CustomEvent) => this._updateFan({ humidity_target: parseFloat(e.detail) })}
                    step="0.1"
                  ></md3-number-input>
                  <md3-number-input
                    label="Humidity Tolerance (%)"
                    .value=${fan.humidity_tolerance}
                    @change=${(e: CustomEvent) => this._updateFan({ humidity_tolerance: parseFloat(e.detail) })}
                    step="0.1"
                  ></md3-number-input>
                `
              : nothing}
            ${vm.mode === 'temperature'
              ? html`
                  <md3-number-input
                    label="Temperature Target (°C)"
                    .value=${fan.temperature_target}
                    @change=${(e: CustomEvent) => this._updateFan({ temperature_target: parseFloat(e.detail) })}
                    step="0.1"
                  ></md3-number-input>
                  <md3-number-input
                    label="Temperature Tolerance (°C)"
                    .value=${fan.temperature_tolerance}
                    @change=${(e: CustomEvent) => this._updateFan({ temperature_tolerance: parseFloat(e.detail) })}
                    step="0.1"
                  ></md3-number-input>
                `
              : nothing}
          </div>

          ${vm.showTempOverride
            ? html`
                <div style="margin-top:8px;">
                  <button
                    class="md3-button tonal"
                    style="display:flex;align-items:center;gap:4px;width:100%;justify-content:space-between;"
                    @click=${() => this._emit('toggle-fan-temp-override')}
                  >
                    <span>Temperature Override</span>
                    <svg
                      style="width:18px;height:18px;transition:transform 0.2s;transform:rotate(${vm.tempOverrideExpanded ? '180deg' : '0deg'});"
                      viewBox="0 0 24 24"
                    >
                      <path d="${mdiChevronDown}"></path>
                    </svg>
                  </button>
                  ${vm.tempOverrideExpanded
                    ? html`<div class="row-col-grid" style="margin-top:8px;">${this._criticalTempInputs(fan, this._updateFan.bind(this))}</div>`
                    : nothing}
                </div>
              `
            : nothing}

          <div class="row-col-grid" style="margin-top:8px;">
            <md3-number-input
              label="Min Speed (%)"
              .value=${fan.min_speed}
              @change=${(e: CustomEvent) => this._updateFan({ min_speed: parseFloat(e.detail) })}
              step="1"
            ></md3-number-input>
            <md3-number-input
              label="Max Speed (%)"
              .value=${fan.max_speed}
              @change=${(e: CustomEvent) => this._updateFan({ max_speed: parseFloat(e.detail) })}
              step="1"
            ></md3-number-input>
          </div>

          <div style="margin-top:8px;">
            <label class="checkbox-label">
              <input
                type="checkbox"
                .checked=${fan.wind_enabled}
                @change=${(e: Event) => this._updateFan({ wind_enabled: (e.target as HTMLInputElement).checked })}
              />
              <span>Dynamic Wind</span>
            </label>
            ${vm.showWind
              ? html`
                  <div class="row-col-grid" style="margin-top:8px;">
                    <md3-number-input
                      label="Wind Period (s)"
                      .value=${fan.wind_period_seconds}
                      @change=${(e: CustomEvent) => this._updateFan({ wind_period_seconds: parseFloat(e.detail) })}
                      step="1"
                    ></md3-number-input>
                    <md3-number-input
                      label="Wind Amplitude (%)"
                      .value=${fan.wind_amplitude_pct}
                      @change=${(e: CustomEvent) => this._updateFan({ wind_amplitude_pct: parseFloat(e.detail) })}
                      step="1"
                    ></md3-number-input>
                  </div>
                `
              : nothing}
          </div>
        </div>
      </div>
    `;
  }

  // ── Exhaust Fan Controller ──────────────────────────────────────────────────

  private _renderExhaustPanel(vm: ExhaustPanelVM): TemplateResult {
    const fan = vm.config;
    return html`
      <div class="detail-card">
        ${this._sectionHeader('Exhaust Fan Controller')}
        <div class="form-section">
          <label class="checkbox-label">
            <input
              type="checkbox"
              .checked=${fan.enabled}
              @change=${(e: Event) => this._updateExhaust({ enabled: (e.target as HTMLInputElement).checked })}
            />
            <span>Enabled</span>
          </label>
        </div>

        <div class="form-section" style="${vm.disabled ? 'opacity:0.5;pointer-events:none;' : ''}">
          <div>
            <label class="checkbox-label">
              <input
                type="checkbox"
                .checked=${fan.stage_vpd_enabled}
                @change=${(e: Event) =>
                  this._updateExhaust({ stage_vpd_enabled: (e.target as HTMLInputElement).checked })}
              />
              <span>Stage-Aware VPD</span>
            </label>
          </div>
          ${vm.showStageVpdTable
            ? html`
                <div style="margin-top:12px;">
                  <stage-vpd-overrides-table
                    .overrides=${(fan.stage_vpd_overrides ?? {}) as StageVpdOverrides}
                    @overrides-change=${(e: CustomEvent<StageVpdOverrides>) =>
                      this._updateExhaust({ stage_vpd_overrides: e.detail })}
                  ></stage-vpd-overrides-table>
                </div>
              `
            : nothing}

          <div class="row-col-grid" style="margin-top:8px;">
            <md3-number-input
              label="Temperature Target (°C)"
              .value=${fan.temperature_target}
              @change=${(e: CustomEvent) => this._updateExhaust({ temperature_target: parseFloat(e.detail) })}
              step="0.1"
            ></md3-number-input>
            <md3-number-input
              label="Temperature Tolerance (°C)"
              .value=${fan.temperature_tolerance}
              @change=${(e: CustomEvent) => this._updateExhaust({ temperature_tolerance: parseFloat(e.detail) })}
              step="0.1"
            ></md3-number-input>
          </div>

          <div class="row-col-grid">
            <md3-number-input
              label="Humidity Target (%)"
              .value=${fan.humidity_target}
              @change=${(e: CustomEvent) => this._updateExhaust({ humidity_target: parseFloat(e.detail) })}
              step="0.1"
            ></md3-number-input>
            <md3-number-input
              label="Humidity Tolerance (%)"
              .value=${fan.humidity_tolerance}
              @change=${(e: CustomEvent) => this._updateExhaust({ humidity_tolerance: parseFloat(e.detail) })}
              step="0.1"
            ></md3-number-input>
          </div>

          <div class="row-col-grid">
            <md3-number-input
              label="${vm.vpdTargetLabel}"
              style="${vm.vpdTargetDimmed ? 'opacity:0.5;' : ''}"
              .value=${fan.vpd_target}
              @change=${(e: CustomEvent) => this._updateExhaust({ vpd_target: parseFloat(e.detail) })}
              step="0.01"
            ></md3-number-input>
            <md3-number-input
              label="VPD Tolerance (kPa)"
              .value=${fan.vpd_tolerance}
              @change=${(e: CustomEvent) => this._updateExhaust({ vpd_tolerance: parseFloat(e.detail) })}
              step="0.01"
            ></md3-number-input>
          </div>

          <div class="row-col-grid" style="margin-top:8px;">
            <md3-number-input
              label="Min Speed (%)"
              .value=${fan.min_speed}
              @change=${(e: CustomEvent) => this._updateExhaust({ min_speed: parseFloat(e.detail) })}
              step="1"
            ></md3-number-input>
            <md3-number-input
              label="Max Speed (%)"
              .value=${fan.max_speed}
              @change=${(e: CustomEvent) => this._updateExhaust({ max_speed: parseFloat(e.detail) })}
              step="1"
            ></md3-number-input>
          </div>

          <div style="margin-top:8px;">
            <button
              class="md3-button tonal"
              style="display:flex;align-items:center;gap:4px;width:100%;justify-content:space-between;"
              @click=${() => this._emit('toggle-exhaust-critical-temp')}
            >
              <span>Critical Temperature</span>
              <svg
                style="width:18px;height:18px;transition:transform 0.2s;transform:rotate(${vm.criticalTempExpanded ? '180deg' : '0deg'});"
                viewBox="0 0 24 24"
              >
                <path d="${mdiChevronDown}"></path>
              </svg>
            </button>
            ${vm.criticalTempExpanded
              ? html`<div class="row-col-grid" style="margin-top:8px;">${this._criticalTempInputs(fan, this._updateExhaust.bind(this))}</div>`
              : nothing}
          </div>
        </div>
      </div>
    `;
  }

  /** Shared low/high/hysteresis inputs — `update` targets fan or exhaust. */
  private _criticalTempInputs(
    fan: CirculationFanConfig | ExhaustFanConfig,
    update: (partial: { critical_temp_low?: number | null; critical_temp_high?: number | null; critical_temp_hysteresis?: number }) => void
  ): TemplateResult {
    return html`
      <md3-number-input
        label="Critical Temp Low (°C)"
        .value=${fan.critical_temp_low ?? ''}
        @change=${(e: CustomEvent) =>
          update({ critical_temp_low: e.detail !== '' ? parseFloat(e.detail) : null })}
        step="0.1"
      ></md3-number-input>
      <md3-number-input
        label="Critical Temp High (°C)"
        .value=${fan.critical_temp_high ?? ''}
        @change=${(e: CustomEvent) =>
          update({ critical_temp_high: e.detail !== '' ? parseFloat(e.detail) : null })}
        step="0.1"
      ></md3-number-input>
      <md3-number-input
        label="Critical Temp Hysteresis (°C)"
        .value=${fan.critical_temp_hysteresis}
        @change=${(e: CustomEvent) =>
          update({ critical_temp_hysteresis: parseFloat(e.detail) })}
        step="0.1"
      ></md3-number-input>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'config-climate-tab': ConfigClimateTab;
  }
}
