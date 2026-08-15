/**
 * Config Climate Tab Component (ADR-0019, "Applied to Config Dialog")
 *
 * The dumb presentational element for the Config Dialog's Climate tab — Climate
 * Control + the circulation Fan Controller panel + the Exhaust Fan Controller
 * panel. `@property .vm: ClimateTabViewModel` in, semantic Tab Intents out,
 * **no `@state()` and no `hass`**: the fan-entity option lists and the two
 * collapsible-section toggles are projected into the VM by the shell. Markup is
 * transcribed from the former inline `_renderClimateSection` /
 * `_renderFanControllerPanel` / `_renderExhaustFanControllerPanel`; the panels
 * are private render methods here (one consumer each → no new custom element).
 * Both controllers' stage VPD values share one stage-accordion editor.
 *
 * Fan-config edits merge against the VM's config (never the SM) and emit the
 * whole merged config, so the shell's `UPDATE_ENV_DRAFT` replaces it wholesale.
 *
 * Tab Intents (the Shell translates them):
 *   - `env-draft-changed`            detail: { partial: Partial<EnvironmentDraft> }   (top-level fields)
 *   - `fan-config-changed`           detail: { partial: Partial<CirculationFanConfig> }
 *   - `exhaust-config-changed`       detail: { partial: Partial<ExhaustFanConfig> }
 *
 * Fan/exhaust edits forward only the changed field; the Shell merges it against
 * the live draft (so synchronous multi-field edits accumulate). The component
 * never reads the SM.
 */

import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { mdiFan, mdiThermometerAlert, mdiTune } from '@mdi/js';
import { dialogStyles } from '../../../styles/dialog.styles';
import { localizeWithParams } from '../../../localize/localize';
import { Md3NumberInput } from '../../shared/ui/md3-number-input';
import '../../shared/ui/md3-select';
import { renderAcInfinityDevices } from './ac-infinity-device-editor';
import './config-entity-multi-select';
import './config-section-header';
import { FAN_VPD_STAGE_DEFAULTS, type FanVpdStageKey } from '../../environment/constants';
import {
  stageAccordionInteriorSlot,
  stageAccordionSummarySlot,
  type ConfigStageAccordionStage,
  type ConfigStageAccordionToggleDetail,
} from './config-stage-accordion';
import type { EnvironmentDraft } from '../../../dialogs/config-dialog-sm';
import type { CirculationFanConfig, ExhaustFanConfig } from '../../../slices/growspace/schema';
import type {
  ClimateTabViewModel,
  FanPanelVM,
  ExhaustPanelVM,
  ClimateControlVM,
  ClimateStageVpdStageVM,
  ClimateStageVpdVM,
  FanRegulationMode,
} from '../viewmodels/climate-tab.viewmodel';
import {
  DEFAULT_CRITICAL_TEMP_HIGH_C,
  DEFAULT_CRITICAL_TEMP_LOW_C,
  displayTemperature,
  editCriticalTemperatureBound,
  pressureFromKpa,
  pressureStep,
  pressureToKpa,
  temperatureFromCelsius,
  temperatureStep,
  temperatureToCelsius,
  type CriticalTemperatureBound,
} from '../critical-temperature';

type StageVpdOverrides = Record<string, { day: number; night: number }>;
type ClimateStageAccordionStage = ClimateStageVpdStageVM & ConfigStageAccordionStage;

@customElement('config-climate-tab')
export class ConfigClimateTab extends LitElement {
  @property({ attribute: false }) vm!: ClimateTabViewModel;

  static styles = [
    dialogStyles,
    css`
      :host {
        display: block;
      }
      .climate-layout {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 16px;
      }
      .climate-layout > .detail-card {
        margin: 0;
      }
      .form-section {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .control-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .stage-vpd-summary {
        color: var(--secondary-text-color, rgba(255, 255, 255, 0.7));
        font-size: 0.6875rem;
        font-variant-numeric: tabular-nums;
        text-align: right;
        white-space: nowrap;
      }
      .stage-vpd-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 16px;
      }
      .stage-vpd-controller {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .stage-vpd-controller h4 {
        margin: 0;
        color: var(--secondary-text-color, rgba(255, 255, 255, 0.7));
        font-size: 0.75rem;
        font-weight: 500;
      }
      .stage-vpd-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 12px;
      }
      .critical-temperature {
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 16px;
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.12));
        border-radius: 12px;
        background: var(--secondary-background-color, rgba(255, 255, 255, 0.05));
      }
      .critical-temperature__heading {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }
      .critical-temperature__title {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
        margin: 0;
        color: var(--primary-text-color, #fff);
        font-size: 0.875rem;
        font-weight: 500;
      }
      .critical-temperature__title svg {
        width: 20px;
        height: 20px;
        flex: none;
        fill: var(--error-color, #f44336);
      }
      .critical-temperature__reading {
        flex: none;
        color: var(--primary-text-color, #fff);
        font-size: 0.75rem;
        font-variant-numeric: tabular-nums;
      }
      .critical-temperature__note {
        margin: 0;
        color: var(--secondary-text-color, rgba(255, 255, 255, 0.7));
        font-size: 0.75rem;
        line-height: 1.5;
        overflow-wrap: anywhere;
      }
      .critical-temperature__bounds {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
      }
      .critical-temperature__footer {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: end;
        gap: 12px;
      }
      .critical-temperature__disable {
        min-height: 40px;
        white-space: nowrap;
      }
      @media (max-width: 600px) {
        .climate-layout {
          grid-template-columns: 1fr;
        }
        .stage-vpd-summary {
          max-width: 48%;
          text-align: left;
        }
        .stage-vpd-grid {
          grid-template-columns: 1fr;
        }
        .critical-temperature__heading {
          align-items: flex-start;
          flex-direction: column;
          gap: 4px;
        }
        .critical-temperature__bounds,
        .critical-temperature__footer {
          grid-template-columns: 1fr;
        }
        .critical-temperature__disable {
          width: 100%;
        }
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

  private _pickPort(field: string, index: number, deviceId: string): void {
    this._emit('pick-ac-infinity-device', { field, index, deviceId });
  }

  private _updateExhaust(partial: Partial<ExhaustFanConfig>): void {
    this._emit('exhaust-config-changed', { partial });
  }

  private _copy(key: string, params: Record<string, string | number> = {}): string {
    return localizeWithParams(`config.${key}`, params, this.vm.language);
  }

  private _pressure(value: number): number {
    return pressureFromKpa(value, this.vm.units.pressure);
  }

  private _formatPressure(value: number): string {
    const unit = this.vm.units.pressure;
    const digits =
      unit === 'Pa' ? 0 : unit === 'hPa' || unit === 'mbar' ? 1 : unit === 'kPa' ? 2 : 3;
    return this._pressure(value).toFixed(digits);
  }

  render(): TemplateResult {
    return html`
      <div class="climate-layout">
        ${this._renderControl(this.vm.control)}${this._renderFanPanel(this.vm.fan)}${this.vm
          .stageVpd.visible
          ? this._renderStageVpd(this.vm.stageVpd)
          : nothing}${this._renderExhaustPanel(this.vm.exhaust)}
      </div>
    `;
  }

  private _sectionHeader(title: string): TemplateResult {
    return html` <config-section-header .icon=${mdiFan} .label=${title}></config-section-header> `;
  }

  // ── Climate Control ─────────────────────────────────────────────────────────

  private _renderControl(c: ClimateControlVM): TemplateResult {
    return html`
      <div class="detail-card">
        ${this._sectionHeader('Climate Control')}
        <div class="form-section">
          <div class="row-col-grid">
            ${this._multiSelect(
              'Exhaust Fan / Switch',
              'exhaustFanEntities',
              c.exhaustFanEntities,
              c.exhaustFanOptions
            )}
            ${this._multiSelect(
              'Circulation Fan / Switch',
              'circulationFanEntities',
              c.circulationFanEntities,
              c.circulationFanOptions
            )}
          </div>
          ${renderAcInfinityDevices({
            label: 'Exhaust Fan AC Infinity Devices',
            devices: c.exhaustFanAcInfinityDevices,
            modeOptions: c.acInfinityModeOptions,
            speedOptions: c.acInfinitySpeedOptions,
            conflicts: c.acInfinityConflicts,
            portDevices: c.acInfinityPortDevices,
            portDeviceIds: c.exhaustFanPortDeviceIds,
            prefillWarnings: c.exhaustFanPrefillWarnings,
            duplicateWarnings: c.exhaustFanDuplicateWarnings,
            idPrefix: 'exhaust',
            onChange: (devices) => this._update({ exhaustFanAcInfinityDevices: devices }),
            onPickDevice: (index, deviceId) =>
              this._pickPort('exhaustFanAcInfinityDevices', index, deviceId),
          })}
          ${renderAcInfinityDevices({
            label: 'Circulation Fan AC Infinity Devices',
            devices: c.circulationFanAcInfinityDevices,
            modeOptions: c.acInfinityModeOptions,
            speedOptions: c.acInfinitySpeedOptions,
            conflicts: c.acInfinityConflicts,
            portDevices: c.acInfinityPortDevices,
            portDeviceIds: c.circulationFanPortDeviceIds,
            prefillWarnings: c.circulationFanPrefillWarnings,
            duplicateWarnings: c.circulationFanDuplicateWarnings,
            idPrefix: 'circulation',
            onChange: (devices) => this._update({ circulationFanAcInfinityDevices: devices }),
            onPickDevice: (index, deviceId) =>
              this._pickPort('circulationFanAcInfinityDevices', index, deviceId),
          })}
          <div class="row-col-grid">
            <md3-number-input
              label="Stress Threshold %"
              .value=${c.stressThreshold}
              @change=${(e: CustomEvent) =>
                this._update({ stressThreshold: e.detail !== '' ? parseFloat(e.detail) : null })}
              step="0.01"
            ></md3-number-input>
            <md3-number-input
              label="Mold Threshold %"
              .value=${c.moldThreshold}
              @change=${(e: CustomEvent) =>
                this._update({ moldThreshold: e.detail !== '' ? parseFloat(e.detail) : null })}
              step="0.01"
            ></md3-number-input>
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
    return html`
      <config-entity-multi-select
        .label=${label}
        .values=${values}
        .options=${options}
        list-id=${`list-multi-${key}`}
        @entity-values-changed=${(event: CustomEvent<{ values: string[] }>) =>
          this._update({ [key]: event.detail.values })}
      ></config-entity-multi-select>
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
              @change=${(e: Event) =>
                this._updateFan({ enabled: (e.target as HTMLInputElement).checked })}
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
                        this._updateFan({
                          stage_vpd_enabled: (e.target as HTMLInputElement).checked,
                        })}
                    />
                    <span>Stage-Aware VPD</span>
                  </label>
                </div>
              `
            : nothing}

          <div class="row-col-grid">
            ${vm.mode === 'vpd'
              ? html`
                  <md3-number-input
                    label="${vm.vpdTargetLabel}"
                    style="${vm.vpdTargetDimmed ? 'opacity:0.5;' : ''}"
                    .value=${this._pressure(fan.vpd_target)}
                    @change=${(e: CustomEvent) =>
                      this._updateFan({
                        vpd_target: pressureToKpa(parseFloat(e.detail), this.vm.units.pressure),
                      })}
                    step=${pressureStep(this.vm.units.pressure)}
                  ></md3-number-input>
                  <md3-number-input
                    label=${`VPD Tolerance (${this.vm.units.pressure})`}
                    .value=${this._pressure(fan.vpd_tolerance)}
                    @change=${(e: CustomEvent) =>
                      this._updateFan({
                        vpd_tolerance: pressureToKpa(parseFloat(e.detail), this.vm.units.pressure),
                      })}
                    step=${pressureStep(this.vm.units.pressure)}
                  ></md3-number-input>
                `
              : nothing}
            ${vm.mode === 'humidity'
              ? html`
                  <md3-number-input
                    label="Humidity Target (%)"
                    .value=${fan.humidity_target}
                    @change=${(e: CustomEvent) =>
                      this._updateFan({ humidity_target: parseFloat(e.detail) })}
                    step="0.1"
                  ></md3-number-input>
                  <md3-number-input
                    label="Humidity Tolerance (%)"
                    .value=${fan.humidity_tolerance}
                    @change=${(e: CustomEvent) =>
                      this._updateFan({ humidity_tolerance: parseFloat(e.detail) })}
                    step="0.1"
                  ></md3-number-input>
                `
              : nothing}
            ${vm.mode === 'temperature'
              ? html`
                  <md3-number-input
                    label=${`Temperature Target (${this.vm.units.temperature})`}
                    .value=${displayTemperature(fan.temperature_target, this.vm.units.temperature)}
                    @change=${(e: CustomEvent) =>
                      this._updateFan({
                        temperature_target: temperatureToCelsius(
                          parseFloat(e.detail),
                          this.vm.units.temperature
                        ),
                      })}
                    step=${temperatureStep(this.vm.units.temperature)}
                  ></md3-number-input>
                  <md3-number-input
                    label=${`Temperature Tolerance (${this.vm.units.temperature})`}
                    .value=${displayTemperature(
                      fan.temperature_tolerance,
                      this.vm.units.temperature,
                      true
                    )}
                    @change=${(e: CustomEvent) =>
                      this._updateFan({
                        temperature_tolerance: temperatureToCelsius(
                          parseFloat(e.detail),
                          this.vm.units.temperature,
                          true
                        ),
                      })}
                    step=${temperatureStep(this.vm.units.temperature)}
                  ></md3-number-input>
                `
              : nothing}
          </div>

          ${vm.showTempOverride
            ? this._criticalTempInputs('fan', fan, this._updateFan.bind(this))
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
                @change=${(e: Event) =>
                  this._updateFan({ wind_enabled: (e.target as HTMLInputElement).checked })}
              />
              <span>Dynamic Wind</span>
            </label>
            ${vm.showWind
              ? html`
                  <div class="row-col-grid" style="margin-top:8px;">
                    <md3-number-input
                      label="Wind Period (s)"
                      .value=${fan.wind_period_seconds}
                      @change=${(e: CustomEvent) =>
                        this._updateFan({ wind_period_seconds: parseFloat(e.detail) })}
                      step="1"
                    ></md3-number-input>
                    <md3-number-input
                      label="Wind Amplitude (%)"
                      .value=${fan.wind_amplitude_pct}
                      @change=${(e: CustomEvent) =>
                        this._updateFan({ wind_amplitude_pct: parseFloat(e.detail) })}
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

  private _renderStageVpd(vm: ClimateStageVpdVM): TemplateResult {
    const stages: ClimateStageAccordionStage[] = vm.stages;
    return html`
      <div class="detail-card">
        <config-section-header .icon=${mdiTune} label="Stage VPD Overrides"></config-section-header>
        <config-stage-accordion
          compact
          .stages=${stages}
          @stage-accordion-toggle=${(event: CustomEvent<ConfigStageAccordionToggleDetail>) =>
            this._emit('toggle-stage-vpd', { stageId: event.detail.stage.id })}
        >
          ${stages.map((stage) =>
            stage.open
              ? html`
                  <div slot=${stageAccordionInteriorSlot(stage.id)} class="stage-vpd-grid">
                    ${this._stageVpdController(stage, 'fan', 'Fan')}
                    ${this._stageVpdController(stage, 'exhaust', 'Exhaust')}
                  </div>
                `
              : html`
                  <div slot=${stageAccordionSummarySlot(stage.id)} class="stage-vpd-summary">
                    Fan ${this._formatPressure(stage.fan.day)} /
                    ${this._formatPressure(stage.fan.night)} · Exhaust
                    ${this._formatPressure(stage.exhaust.day)} /
                    ${this._formatPressure(stage.exhaust.night)} ${this.vm.units.pressure}
                  </div>
                `
          )}
        </config-stage-accordion>
        <div class="stage-vpd-actions">
          <button
            class="md3-button config-reset-button"
            @click=${() => this._updateFan({ stage_vpd_overrides: {} })}
          >
            Reset Fan to defaults
          </button>
          <button
            class="md3-button config-reset-button"
            @click=${() => this._updateExhaust({ stage_vpd_overrides: {} })}
          >
            Reset Exhaust to defaults
          </button>
        </div>
      </div>
    `;
  }

  private _stageVpdController(
    stage: ClimateStageVpdStageVM,
    controller: 'fan' | 'exhaust',
    label: string
  ): TemplateResult {
    const values = stage[controller];
    return html`
      <div class="stage-vpd-controller">
        <h4>${label} Controller</h4>
        ${(['day', 'night'] as const).map(
          (period) => html`
            <md3-number-input
              label=${period === 'day' ? 'Day' : 'Night'}
              input-aria-label=${`${stage.label} ${label} ${period} VPD in ${this.vm.units.pressure}`}
              .value=${this._pressure(values[period])}
              .min=${this._pressure(0.1)}
              .max=${this._pressure(3)}
              step=${pressureStep(this.vm.units.pressure)}
              unit=${this.vm.units.pressure}
              @change=${(event: CustomEvent<string>) =>
                this._updateStageVpd(controller, stage.id, period, event.detail)}
            ></md3-number-input>
          `
        )}
      </div>
    `;
  }

  private _updateStageVpd(
    controller: 'fan' | 'exhaust',
    key: FanVpdStageKey,
    period: 'day' | 'night',
    raw: string
  ): void {
    const config = controller === 'fan' ? this.vm.fan.config : this.vm.exhaust.config;
    const overrides = (config.stage_vpd_overrides ?? {}) as StageVpdOverrides;
    const value = Number.isNaN(parseFloat(raw))
      ? FAN_VPD_STAGE_DEFAULTS[key][period]
      : pressureToKpa(parseFloat(raw), this.vm.units.pressure);
    const existing = overrides[key] ?? FAN_VPD_STAGE_DEFAULTS[key];
    const updated = { ...overrides, [key]: { ...existing, [period]: value } };
    if (controller === 'fan') {
      this._updateFan({ stage_vpd_overrides: updated });
    } else {
      this._updateExhaust({ stage_vpd_overrides: updated });
    }
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
              @change=${(e: Event) =>
                this._updateExhaust({ enabled: (e.target as HTMLInputElement).checked })}
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
                  this._updateExhaust({
                    stage_vpd_enabled: (e.target as HTMLInputElement).checked,
                  })}
              />
              <span>Stage-Aware VPD</span>
            </label>
          </div>
          <div class="row-col-grid" style="margin-top:8px;">
            <md3-number-input
              label=${`Temperature Target (${this.vm.units.temperature})`}
              .value=${displayTemperature(fan.temperature_target, this.vm.units.temperature)}
              @change=${(e: CustomEvent) =>
                this._updateExhaust({
                  temperature_target: temperatureToCelsius(
                    parseFloat(e.detail),
                    this.vm.units.temperature
                  ),
                })}
              step=${temperatureStep(this.vm.units.temperature)}
            ></md3-number-input>
            <md3-number-input
              label=${`Temperature Tolerance (${this.vm.units.temperature})`}
              .value=${displayTemperature(
                fan.temperature_tolerance,
                this.vm.units.temperature,
                true
              )}
              @change=${(e: CustomEvent) =>
                this._updateExhaust({
                  temperature_tolerance: temperatureToCelsius(
                    parseFloat(e.detail),
                    this.vm.units.temperature,
                    true
                  ),
                })}
              step=${temperatureStep(this.vm.units.temperature)}
            ></md3-number-input>
          </div>

          <div class="row-col-grid">
            <md3-number-input
              label="Humidity Target (%)"
              .value=${fan.humidity_target}
              @change=${(e: CustomEvent) =>
                this._updateExhaust({ humidity_target: parseFloat(e.detail) })}
              step="0.1"
            ></md3-number-input>
            <md3-number-input
              label="Humidity Tolerance (%)"
              .value=${fan.humidity_tolerance}
              @change=${(e: CustomEvent) =>
                this._updateExhaust({ humidity_tolerance: parseFloat(e.detail) })}
              step="0.1"
            ></md3-number-input>
          </div>

          <div class="row-col-grid">
            <md3-number-input
              label="${vm.vpdTargetLabel}"
              style="${vm.vpdTargetDimmed ? 'opacity:0.5;' : ''}"
              .value=${this._pressure(fan.vpd_target)}
              @change=${(e: CustomEvent) =>
                this._updateExhaust({
                  vpd_target: pressureToKpa(parseFloat(e.detail), this.vm.units.pressure),
                })}
              step=${pressureStep(this.vm.units.pressure)}
            ></md3-number-input>
            <md3-number-input
              label=${`VPD Tolerance (${this.vm.units.pressure})`}
              .value=${this._pressure(fan.vpd_tolerance)}
              @change=${(e: CustomEvent) =>
                this._updateExhaust({
                  vpd_tolerance: pressureToKpa(parseFloat(e.detail), this.vm.units.pressure),
                })}
              step=${pressureStep(this.vm.units.pressure)}
            ></md3-number-input>
          </div>

          <div class="row-col-grid" style="margin-top:8px;">
            <md3-number-input
              label="Min Speed (%)"
              .value=${fan.min_speed}
              @change=${(e: CustomEvent) =>
                this._updateExhaust({ min_speed: parseFloat(e.detail) })}
              step="1"
            ></md3-number-input>
            <md3-number-input
              label="Max Speed (%)"
              .value=${fan.max_speed}
              @change=${(e: CustomEvent) =>
                this._updateExhaust({ max_speed: parseFloat(e.detail) })}
              step="1"
            ></md3-number-input>
          </div>

          ${this._criticalTempInputs('exhaust', fan, this._updateExhaust.bind(this))}
        </div>
      </div>
    `;
  }

  /** Shared paired safety-cutoff editor — `update` targets fan or exhaust. */
  private _criticalTempInputs(
    controller: 'fan' | 'exhaust',
    fan: CirculationFanConfig | ExhaustFanConfig,
    update: (partial: {
      critical_temp_low?: number | null;
      critical_temp_high?: number | null;
      critical_temp_hysteresis?: number;
    }) => void
  ): TemplateResult {
    const unit = this.vm.units.temperature;
    const enabled = fan.critical_temp_low != null || fan.critical_temp_high != null;
    const lowPlaceholder = temperatureFromCelsius(DEFAULT_CRITICAL_TEMP_LOW_C, unit).toFixed(1);
    const highPlaceholder = temperatureFromCelsius(DEFAULT_CRITICAL_TEMP_HIGH_C, unit).toFixed(1);
    return html`
      <section class="critical-temperature" data-controller=${controller}>
        <div class="critical-temperature__heading">
          <h4 class="critical-temperature__title">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d=${mdiThermometerAlert}></path></svg>
            Critical Temperature
          </h4>
          <span class="critical-temperature__reading">
            ${this._copy('current_temperature', {
              value: this.vm.units.currentTemperature,
            })}
          </span>
        </div>
        <p class="critical-temperature__note">${this._copy('critical_temperature_description')}</p>
        <div class="critical-temperature__bounds">
          <md3-number-input
            label="Low cutoff"
            input-aria-label=${`Low critical temperature in ${unit}`}
            .value=${displayTemperature(fan.critical_temp_low, unit)}
            .placeholder=${lowPlaceholder}
            .min=${temperatureFromCelsius(10, unit)}
            .max=${temperatureFromCelsius(40, unit)}
            step=${temperatureStep(unit)}
            unit=${unit}
            @change=${(event: CustomEvent<string>) =>
              this._editCriticalTemp(controller, fan, 'low', event, update)}
          ></md3-number-input>
          <md3-number-input
            label="High cutoff"
            input-aria-label=${`High critical temperature in ${unit}`}
            .value=${displayTemperature(fan.critical_temp_high, unit)}
            .placeholder=${highPlaceholder}
            .min=${temperatureFromCelsius(10, unit)}
            .max=${temperatureFromCelsius(50, unit)}
            step=${temperatureStep(unit)}
            unit=${unit}
            @change=${(event: CustomEvent<string>) =>
              this._editCriticalTemp(controller, fan, 'high', event, update)}
          ></md3-number-input>
        </div>
        <div class="critical-temperature__footer">
          <md3-number-input
            label="Recovery hysteresis"
            input-aria-label=${`Critical temperature recovery hysteresis in ${unit}`}
            .value=${displayTemperature(fan.critical_temp_hysteresis, unit, true)}
            .min=${temperatureFromCelsius(0.1, unit, true)}
            .max=${temperatureFromCelsius(5, unit, true)}
            step=${temperatureStep(unit)}
            unit=${unit}
            @change=${(event: CustomEvent<string>) =>
              update({
                critical_temp_hysteresis: temperatureToCelsius(
                  parseFloat(event.detail),
                  unit,
                  true
                ),
              })}
          ></md3-number-input>
          <button
            class="md3-button tonal critical-temperature__disable"
            ?disabled=${!enabled}
            title=${enabled ? nothing : this._copy('critical_temperature_already_disabled')}
            @click=${() => update({ critical_temp_low: null, critical_temp_high: null })}
          >
            Disable cutoff
          </button>
        </div>
      </section>
    `;
  }

  private _editCriticalTemp(
    controller: 'fan' | 'exhaust',
    fan: CirculationFanConfig | ExhaustFanConfig,
    bound: CriticalTemperatureBound,
    event: CustomEvent<string>,
    update: (partial: {
      critical_temp_low?: number | null;
      critical_temp_high?: number | null;
    }) => void
  ): void {
    const input = event.currentTarget as Md3NumberInput;
    const result = editCriticalTemperatureBound(
      fan,
      bound,
      String(event.detail),
      this.vm.units.temperature
    );
    input.error = result.error ?? '';
    if (!result.patch) return;

    this.shadowRoot
      ?.querySelectorAll<Md3NumberInput>(
        `.critical-temperature[data-controller="${controller}"] md3-number-input`
      )
      .forEach((field) => {
        field.error = '';
      });
    update(result.patch);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'config-climate-tab': ConfigClimateTab;
  }
}
