/**
 * Config Humidity Tab Component (ADR-0019, "Applied to Config Dialog")
 *
 * The dumb presentational element for the Config Dialog's Humidity tab — Humidity
 * Devices (humidifier/dehumidifier pickers + the two control-enable toggles) and
 * the per-stage Thresholds accordion. `@property .vm: HumidityTabViewModel` in,
 * semantic Tab Intents out, **no `@state()` and no `hass`**. Markup transcribed
 * verbatim from the former inline `_renderHumiditySection`; the `acc-*` accordion
 * and multi-select styles moved here with it.
 *
 * Threshold edits forward `{ stage, cycle, point, value }` (with the enum-value
 * Record key the VM supplies); the Shell merges against the live draft. The two
 * control toggles fire an immediate backend service in the Shell, so they emit a
 * dedicated intent rather than a draft change.
 *
 * Tab Intents (the Shell translates them):
 *   - `env-draft-changed`        detail: { partial }   (device entity pickers)
 *   - `set-humidifier-control`   detail: { enabled }
 *   - `set-dehumidifier-control` detail: { enabled }
 *   - `toggle-stage`             detail: { stageId }
 *   - `update-dehum-threshold`   detail: { stage, cycle, point, value }
 *   - `update-hum-threshold`     detail: { stage, cycle, point, value }
 */

import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import {
  mdiAirHumidifier,
  mdiWaterPercent,
  mdiWhiteBalanceSunny,
  mdiWeatherNight,
  mdiChevronDown,
} from '@mdi/js';
import { dialogStyles } from '../../../styles/dialog.styles';
import '../../shared/ui/md3-number-input';
import '../../shared/ui/md3-select';
import { renderAcInfinityDevices } from './ac-infinity-device-editor';
import './config-entity-multi-select';
import './config-section-header';
import type { EnvironmentDraft } from '../../../dialogs/config-dialog-sm';
import type {
  HumidityTabViewModel,
  HumidityStageVM,
  CycleThresholds,
} from '../viewmodels/humidity-tab.viewmodel';

type EntityKey = 'humidifierEntities' | 'dehumidifierEntities';

@customElement('config-humidity-tab')
export class ConfigHumidityTab extends LitElement {
  @property({ attribute: false }) vm!: HumidityTabViewModel;

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
      /* ── thresholds accordion — copied from config-dialog ── */
      .acc-card {
        background: rgba(255, 255, 255, 0.02);
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.08));
        border-radius: var(--border-radius-md, 12px);
        overflow: hidden;
      }
      .acc-head {
        display: flex;
        align-items: center;
        gap: 12px;
        min-height: 44px;
        box-sizing: border-box;
        padding: 13px 16px;
        cursor: pointer;
        user-select: none;
        transition: background 0.15s;
      }
      .acc-head:hover {
        background: rgba(255, 255, 255, 0.03);
      }
      .acc-stage-dot {
        width: 10px;
        height: 10px;
        border: 1px solid var(--primary-text-color, #fff);
        border-radius: 50%;
        flex-shrink: 0;
      }
      .acc-head-title {
        flex: 1;
        font-size: 1rem;
        font-weight: 500;
      }
      .acc-head-desc {
        font-size: 0.857143rem;
        color: var(--secondary-text-color, rgba(255, 255, 255, 0.5));
      }
      .acc-chev {
        width: 20px;
        height: 20px;
        fill: var(--secondary-text-color, rgba(255, 255, 255, 0.5));
        transition: transform 0.2s;
        flex-shrink: 0;
      }
      .acc-chev.open {
        transform: rotate(180deg);
      }
      .acc-body {
        padding: 16px;
        border-top: 1px solid var(--divider-color, rgba(255, 255, 255, 0.06));
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .acc-cycle-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }
      .acc-device-block {
        background: rgba(0, 0, 0, 0.15);
        border-radius: var(--border-radius-md, 12px);
        padding: 14px;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .acc-device-header {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 1rem;
        font-weight: 500;
        padding-bottom: 8px;
        border-bottom: 1px solid var(--divider-color, rgba(255, 255, 255, 0.06));
      }
      .acc-device-header svg {
        width: 16px;
        height: 16px;
        fill: currentColor;
        opacity: 0.8;
      }
      .acc-cycle-row {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: var(--font-size-supporting);
        color: var(--secondary-text-color, rgba(255, 255, 255, 0.6));
      }
      .acc-cycle-row svg {
        width: 14px;
        height: 14px;
        fill: currentColor;
        flex-shrink: 0;
      }
    `,
  ];

  private _emit(type: string, detail?: unknown): void {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }

  private _update(partial: Partial<EnvironmentDraft>): void {
    this._emit('env-draft-changed', { partial });
  }

  private _pickPort(field: string, index: number, deviceId: string): void {
    this._emit('pick-ac-infinity-device', { field, index, deviceId });
  }

  render(): TemplateResult {
    return html`${this._renderDevices()}${this._renderThresholds()}`;
  }

  // ── Humidity Devices ────────────────────────────────────────────────────────

  private _renderDevices(): TemplateResult {
    return html`
      <div class="detail-card">
        <config-section-header
          .icon=${mdiAirHumidifier}
          label="Humidity Devices"
        ></config-section-header>
        <div class="form-section">
          <div class="row-col-grid">
            ${this._multiSelect(
              'Humidifier',
              'humidifierEntities',
              this.vm.humidifierEntities,
              this.vm.humidifierOptions
            )}
            ${this._multiSelect(
              'Dehumidifier',
              'dehumidifierEntities',
              this.vm.dehumidifierEntities,
              this.vm.dehumidifierOptions
            )}
          </div>
          ${renderAcInfinityDevices({
            label: 'Humidifier AC Infinity Devices',
            devices: this.vm.humidifierAcInfinityDevices,
            modeOptions: this.vm.acInfinityModeOptions,
            speedOptions: this.vm.acInfinitySpeedOptions,
            conflicts: this.vm.acInfinityConflicts,
            portDevices: this.vm.acInfinityPortDevices,
            portDeviceIds: this.vm.humidifierPortDeviceIds,
            prefillWarnings: this.vm.humidifierPrefillWarnings,
            duplicateWarnings: this.vm.humidifierDuplicateWarnings,
            idPrefix: 'humidifier',
            onChange: (devices) => this._update({ humidifierAcInfinityDevices: devices }),
            onPickDevice: (index, deviceId) =>
              this._pickPort('humidifierAcInfinityDevices', index, deviceId),
          })}
          ${renderAcInfinityDevices({
            label: 'Dehumidifier AC Infinity Devices',
            devices: this.vm.dehumidifierAcInfinityDevices,
            modeOptions: this.vm.acInfinityModeOptions,
            speedOptions: this.vm.acInfinitySpeedOptions,
            conflicts: this.vm.acInfinityConflicts,
            portDevices: this.vm.acInfinityPortDevices,
            portDeviceIds: this.vm.dehumidifierPortDeviceIds,
            prefillWarnings: this.vm.dehumidifierPrefillWarnings,
            duplicateWarnings: this.vm.dehumidifierDuplicateWarnings,
            idPrefix: 'dehumidifier',
            onChange: (devices) => this._update({ dehumidifierAcInfinityDevices: devices }),
            onPickDevice: (index, deviceId) =>
              this._pickPort('dehumidifierAcInfinityDevices', index, deviceId),
          })}
          <div class="row-col-grid">
            <label class="checkbox-label">
              <input
                type="checkbox"
                .checked=${this.vm.humidifierControlEnabled}
                @change=${(e: Event) =>
                  this._emit('set-humidifier-control', {
                    enabled: (e.target as HTMLInputElement).checked,
                  })}
              />
              Enable Humidifier Control
            </label>
            <label class="checkbox-label">
              <input
                type="checkbox"
                .checked=${this.vm.dehumidifierControlEnabled}
                @change=${(e: Event) =>
                  this._emit('set-dehumidifier-control', {
                    enabled: (e.target as HTMLInputElement).checked,
                  })}
              />
              Enable Dehumidifier Control
            </label>
          </div>
        </div>
      </div>
    `;
  }

  private _multiSelect(
    label: string,
    key: EntityKey,
    values: string[],
    options: string[]
  ): TemplateResult {
    return html`
      <config-entity-multi-select
        .label=${label}
        .values=${values}
        .options=${options}
        @entity-values-changed=${(event: CustomEvent<{ values: string[] }>) =>
          this._update({ [key]: event.detail.values })}
      ></config-entity-multi-select>
    `;
  }

  // ── Thresholds per Stage ────────────────────────────────────────────────────

  private _renderThresholds(): TemplateResult {
    return html`
      <div class="detail-card">
        <config-section-header
          .icon=${mdiWaterPercent}
          label="Thresholds per Stage"
        ></config-section-header>
        <div style="display:flex;flex-direction:column;gap:6px;">
          ${this.vm.stages.map((stage) => this._renderStage(stage))}
        </div>
      </div>
    `;
  }

  private _renderStage(stage: HumidityStageVM): TemplateResult {
    return html`
      <div class="acc-card">
        <div class="acc-head" @click=${() => this._emit('toggle-stage', { stageId: stage.id })}>
          <div class="acc-stage-dot" style="background:${stage.color};"></div>
          <div class="acc-head-title">${stage.label}</div>
          ${!stage.open
            ? html`
                <div class="acc-head-desc">
                  Dehum on &gt;
                  ${stage.dehum.day.on > 0 ? stage.dehum.day.on.toFixed(2) + ' kPa' : '—'}
                  &nbsp;·&nbsp; Hum on &lt;
                  ${stage.hum.day.on > 0 ? stage.hum.day.on.toFixed(2) + ' kPa' : '—'}
                </div>
              `
            : nothing}
          <svg class="acc-chev ${stage.open ? 'open' : ''}" viewBox="0 0 24 24">
            <path d="${mdiChevronDown}"></path>
          </svg>
        </div>
        ${stage.open
          ? html`
              <div class="acc-body">
                ${this._deviceBlock(
                  'Dehumidifier',
                  'var(--secondary,#2196f3)',
                  mdiWaterPercent,
                  'update-dehum-threshold',
                  stage.dehumKey,
                  stage.dehum,
                  'On Above (kPa)',
                  'Off Below (kPa)'
                )}
                ${this._deviceBlock(
                  'Humidifier',
                  '#00bcd4',
                  mdiAirHumidifier,
                  'update-hum-threshold',
                  stage.humKey,
                  stage.hum,
                  'On Below (kPa)',
                  'Off Above (kPa)'
                )}
              </div>
            `
          : nothing}
      </div>
    `;
  }

  private _deviceBlock(
    title: string,
    headerColor: string,
    icon: string,
    intent: string,
    stageKey: string,
    values: CycleThresholds,
    onLabel: string,
    offLabel: string
  ): TemplateResult {
    const cycle = (
      cycleKey: 'day' | 'night',
      cycleLabel: string,
      cycleColor: string,
      cycleIcon: string,
      pair: { on: number; off: number }
    ) => html`
      <div>
        <div class="acc-cycle-row" style="color:${cycleColor};">
          <svg viewBox="0 0 24 24"><path d="${cycleIcon}"></path></svg>
          ${cycleLabel}
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;margin-top:8px;">
          <md3-number-input
            label="${onLabel}"
            .value=${pair.on}
            @change=${(e: CustomEvent) =>
              this._emit(intent, {
                stage: stageKey,
                cycle: cycleKey,
                point: 'on',
                value: parseFloat(e.detail),
              })}
            step="0.05"
          ></md3-number-input>
          <md3-number-input
            label="${offLabel}"
            .value=${pair.off}
            @change=${(e: CustomEvent) =>
              this._emit(intent, {
                stage: stageKey,
                cycle: cycleKey,
                point: 'off',
                value: parseFloat(e.detail),
              })}
            step="0.05"
          ></md3-number-input>
        </div>
      </div>
    `;
    return html`
      <div class="acc-device-block">
        <div class="acc-device-header" style="color:${headerColor};">
          <svg viewBox="0 0 24 24"><path d="${icon}"></path></svg>
          ${title}
        </div>
        <div class="acc-cycle-grid">
          ${cycle('day', 'Day', '#ff9800', mdiWhiteBalanceSunny, values.day)}
          ${cycle('night', 'Night', '#7986cb', mdiWeatherNight, values.night)}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'config-humidity-tab': ConfigHumidityTab;
  }
}
