/**
 * Config Growlights Tab Component (ADR-0019, "Applied to Config Dialog")
 *
 * The dumb presentational element for the Config Dialog's Growlights tab — the
 * Grow Light Controller panel (enable, power, sunrise) plus the plain-entity and
 * AC Infinity configurator pickers. `@property .vm: GrowlightTabViewModel` in,
 * `env-draft-changed` Tab Intents out, no `@state()` and no `hass`.
 *
 * `lights_on_time` is shown read-only — it is the crop-steering anchor, edited on
 * the Irrigation → Steering tab, so this tab does not own it.
 */

import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { mdiWhiteBalanceSunny } from '@mdi/js';
import { dialogStyles } from '../../../styles/dialog.styles';
import '../../shared/ui/md3-number-input';
import { renderGrowlightAcInfinityDevices } from './ac-infinity-growlight-editor';
import type { EnvironmentDraft } from '../../../dialogs/config-dialog-sm';
import type { GrowLightConfig, AcInfinityGrowLight } from '../../../slices/growspace/schema';
import type { GrowlightTabViewModel } from '../viewmodels/growlight-tab.viewmodel';

@customElement('config-growlight-tab')
export class ConfigGrowlightTab extends LitElement {
  @property({ attribute: false }) vm!: GrowlightTabViewModel;

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
      .anchor-note {
        font-size: 0.75rem;
        color: var(--secondary-text-color, rgba(255, 255, 255, 0.6));
        line-height: 1.4;
      }
      .disabled {
        opacity: 0.5;
        pointer-events: none;
      }
      .multi-select-container {
        position: relative;
      }
      .multi-select-box {
        border-radius: 4px 4px 0 0;
        border-bottom: 1px solid var(--primary-text-color, rgba(255, 255, 255, 0.4));
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        padding: 8px;
        min-height: 40px;
      }
      .chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: rgba(255, 255, 255, 0.08);
        border-radius: 12px;
        padding: 2px 8px;
        font-size: 0.8rem;
      }
      .chip-remove {
        cursor: pointer;
      }
      .search-input-inner {
        flex: 1;
        min-width: 120px;
        background: transparent;
        border: none;
        color: inherit;
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

  render(): TemplateResult {
    const vm = this.vm;
    return html`
      <div class="detail-card">
        <div class="section-header">
          <ha-svg-icon .path=${mdiWhiteBalanceSunny}></ha-svg-icon>
          <span>Grow Light Controller</span>
        </div>
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

          <p class="anchor-note">
            Lights-on time:
            <strong>${vm.lightsOnTime ?? '— set on the Irrigation → Steering tab'}</strong>. The
            lights-off time is derived from your veg / flower day-length settings. Edit the lights-on
            time on the Irrigation → Steering tab.
          </p>

          <div class=${vm.disabled ? 'disabled form-section' : 'form-section'}>
            ${this._multiSelect('Grow Light / Switch', vm.growlightEntities, vm.growlightEntityOptions)}

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
              onChange: (devices: AcInfinityGrowLight[]) =>
                this._update({ growlightAcInfinityDevices: devices }),
            })}
          </div>
        </div>
      </div>
    `;
  }

  private _multiSelect(label: string, values: string[], options: string[]): TemplateResult {
    const listId = 'list-growlight-entities';
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
                  @click=${() => this._update({ growlightEntities: values.filter((v) => v !== val) })}
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
              if (val && !values.includes(val)) this._update({ growlightEntities: [...values, val] });
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
}

declare global {
  interface HTMLElementTagNameMap {
    'config-growlight-tab': ConfigGrowlightTab;
  }
}
