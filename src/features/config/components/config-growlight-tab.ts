/**
 * Config Growlights Tab Component (ADR-0019, "Applied to Config Dialog")
 *
 * The dumb presentational element for the Config Dialog's Growlights tab — the
 * Grow Light Controller panel (enable, power, sunrise) plus the plain-entity and
 * AC Infinity configurator pickers. `@property .vm: GrowlightTabViewModel` in,
 * `env-draft-changed` Tab Intents out, no `@state()` and no `hass`.
 *
 * This tab **owns the edit surface** for `lights_on_time` — the crop-steering
 * photoperiod anchor. It stays an `IrrigationStrategy` field (not `GrowLightConfig`),
 * so editing it emits a dedicated `lights-on-changed` Tab Intent (not `env-draft-changed`):
 * the host persists it immediately via `updateIrrigationStrategy`, outside the dialog's
 * buffered Save. The input sits outside the controller enable-gate so a crop-steering-only
 * user with no controller can still set the anchor. See ADR-0026.
 */

import { LitElement, html, css, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { mdiWhiteBalanceSunny } from '@mdi/js';
import { dialogStyles } from '../../../styles/dialog.styles';
import '../../shared/ui/md3-number-input';
import '../../shared/ui/md3-text-input';
import { renderGrowlightAcInfinityDevices } from './ac-infinity-growlight-editor';
import './config-entity-multi-select';
import './config-section-header';
import type { EnvironmentDraft } from '../../../dialogs/config-dialog-sm';
import type { GrowLightConfig, AcInfinityGrowLight } from '../../../slices/growspace/schema';
import type { GrowlightTabViewModel } from '../viewmodels/growlight-tab.viewmodel';

@customElement('config-growlight-tab')
export class ConfigGrowlightTab extends LitElement {
  @property({ attribute: false }) vm!: GrowlightTabViewModel;

  /** Deep-link: when set to `lightsOnTime`, scroll the input into view and pulse it (#433). */
  @property({ type: String }) scrollToField?: string;

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
      .anchor-note {
        font-size: 0.857143rem;
        color: var(--secondary-text-color, rgba(255, 255, 255, 0.6));
        line-height: 1.4;
      }
      /* Deep-link pulse (#433) — mirrors the irrigation dialog's field-pulse. */
      @keyframes field-pulse-anim {
        0% {
          box-shadow: 0 0 0 0 rgba(var(--primary-color-rgb, 33, 150, 243), 0.5);
        }
        50% {
          box-shadow: 0 0 0 6px rgba(var(--primary-color-rgb, 33, 150, 243), 0.2);
        }
        100% {
          box-shadow: 0 0 0 0 rgba(var(--primary-color-rgb, 33, 150, 243), 0);
        }
      }
      .field-pulse {
        border-radius: 4px;
        animation: field-pulse-anim 3s ease-out 1;
      }
      .disabled {
        opacity: 0.5;
        pointer-events: none;
      }
    `,
  ];

  protected updated(changed: PropertyValues): void {
    // Deep-link from the FlowerFlipChip (#433): scroll the lights-on input into
    // view and pulse it once. The target lives in this component's own shadow root,
    // so the query must run here (the dialog can't pierce the boundary).
    if (changed.has('scrollToField') && this.scrollToField === 'lightsOnTime') {
      const target = this.shadowRoot?.querySelector<HTMLElement>(
        '[data-scroll-target="lightsOnTime"]'
      );
      if (!target) return;
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target.classList.add('field-pulse');
      target.addEventListener('animationend', () => target.classList.remove('field-pulse'), {
        once: true,
      });
    }
  }

  private _emit(type: string, detail?: unknown): void {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }

  private _update(partial: Partial<EnvironmentDraft>): void {
    this._emit('env-draft-changed', { partial });
  }

  private _pickPort(field: string, index: number, deviceId: string): void {
    this._emit('pick-ac-infinity-device', { field, index, deviceId });
  }

  private _updateConfig(patch: Partial<GrowLightConfig>): void {
    const next: GrowLightConfig = {
      enabled: this.vm.enabled,
      power: this.vm.power,
      sunrise_enabled: this.vm.sunriseEnabled,
      sunrise_minutes: this.vm.sunriseMinutes,
      ...patch,
    };
    this._update({ growlightConfig: next });
  }

  /** Lights-on is a strategy field persisted immediately by the host (ADR-0026). */
  private _emitLightsOn(value: string): void {
    this._emit('lights-on-changed', { lightsOnTime: value });
  }

  render(): TemplateResult {
    const vm = this.vm;
    return html`
      <div class="detail-card">
        <config-section-header
          .icon=${mdiWhiteBalanceSunny}
          label="Grow Light Controller"
        ></config-section-header>
        <div class="form-section">
          <label class="checkbox-label">
            <input
              type="checkbox"
              .checked=${vm.enabled}
              @change=${(e: Event) =>
                this._updateConfig({ enabled: (e.target as HTMLInputElement).checked })}
            />
            Enable grow light controller
          </label>

          <md3-text-input
            label="Lights On Time"
            type="time"
            data-scroll-target="lightsOnTime"
            .value=${vm.lightsOnTime ?? '06:00'}
            @change=${(e: CustomEvent) =>
              this._emitLightsOn((e.target as HTMLInputElement).value || e.detail)}
          ></md3-text-input>
          <p class="anchor-note">
            The crop-steering photoperiod anchor. Saves immediately. The lights-off time is derived
            from your veg / flower day-length settings.
          </p>

          <div class=${vm.disabled ? 'disabled form-section' : 'form-section'}>
            ${this._multiSelect(
              'Grow Light / Switch',
              vm.growlightEntities,
              vm.growlightEntityOptions
            )}

            <md3-number-input
              label="Power %"
              .value=${vm.power}
              step="1"
              min="0"
              max="100"
              @change=${(e: CustomEvent) =>
                this._updateConfig({
                  power: Math.min(100, Math.max(0, Math.round(parseFloat(e.detail) || 0))),
                })}
            ></md3-number-input>

            <label class="checkbox-label">
              <input
                type="checkbox"
                .checked=${vm.sunriseEnabled}
                @change=${(e: Event) =>
                  this._updateConfig({ sunrise_enabled: (e.target as HTMLInputElement).checked })}
              />
              Enable sunrise ramp (AC Infinity only)
            </label>
            ${vm.sunriseEnabled
              ? html`
                  <md3-number-input
                    label="Sunrise duration (minutes)"
                    .value=${vm.sunriseMinutes}
                    step="1"
                    min="0"
                    @change=${(e: CustomEvent) =>
                      this._updateConfig({
                        sunrise_minutes: Math.max(0, Math.round(parseFloat(e.detail) || 0)),
                      })}
                  ></md3-number-input>
                `
              : nothing}
            ${renderGrowlightAcInfinityDevices({
              devices: vm.acInfinityDevices,
              modeOptions: vm.modeOptions,
              timeOptions: vm.timeOptions,
              numberOptions: vm.numberOptions,
              switchOptions: vm.switchOptions,
              portDevices: vm.acInfinityPortDevices,
              portDeviceIds: vm.growlightPortDeviceIds,
              prefillWarnings: vm.growlightPrefillWarnings,
              duplicateWarnings: vm.growlightDuplicateWarnings,
              onChange: (devices: AcInfinityGrowLight[]) =>
                this._update({ growlightAcInfinityDevices: devices }),
              onPickDevice: (index: number, deviceId: string) =>
                this._pickPort('growlightAcInfinityDevices', index, deviceId),
            })}
          </div>
        </div>
      </div>
    `;
  }

  private _multiSelect(label: string, values: string[], options: string[]): TemplateResult {
    return html`
      <config-entity-multi-select
        .label=${label}
        .values=${values}
        .options=${options}
        @entity-values-changed=${(event: CustomEvent<{ values: string[] }>) =>
          this._update({ growlightEntities: event.detail.values })}
      ></config-entity-multi-select>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'config-growlight-tab': ConfigGrowlightTab;
  }
}
