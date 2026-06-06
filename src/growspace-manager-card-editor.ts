// src/growspace-manager-card-editor.ts
import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { LovelaceCardEditor, HomeAssistant } from 'custom-card-helpers';
import type { GrowspaceManagerCardConfig } from './lib/types/config';
import { GrowspaceOptionsController } from './controllers/growspace-options-controller';
import { computeEditorLabel } from './lib/editor-utils';
import { localize } from './localize/localize';

@customElement('growspace-manager-card-editor')
export class GrowspaceManagerCardEditor extends LitElement implements LovelaceCardEditor {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ attribute: false }) private _config: GrowspaceManagerCardConfig | undefined;

  private _gsController = new GrowspaceOptionsController(this);

  public setConfig(config: GrowspaceManagerCardConfig): void {
    this._config = config;
  }

  willUpdate(changedProps: Map<string, unknown>) {
    if (changedProps.has('hass') && this.hass) {
      this._gsController.update(this.hass);
    }
  }

  private _computeSchema() {
    const lang = this.hass?.language;
    const l = (key: string) => localize(key, '', '', lang);
    return [
      {
        name: 'default_growspace',
        selector: {
          select: {
            options: [
              { label: l('editor.select_growspace'), value: '' },
              ...this._gsController.options.map((gs) => ({ label: gs.name, value: gs.id })),
            ],
          },
        },
      },
      {
        name: 'initial_view_mode',
        selector: {
          select: {
            options: [
              { label: l('editor.view_mode_standard'), value: 'standard' },
              { label: l('editor.view_mode_compact'), value: 'compact' },
              { label: l('editor.view_mode_header'), value: 'header' },
            ],
          },
        },
      },
      { name: 'keyboard_rotate_enabled', selector: { boolean: {} } },
      { name: 'keyboard_rotate_speed', selector: { number: { min: 0.1, max: 5.0, step: 0.1 } } },
      {
        name: 'hidden_chips',
        selector: {
          select: {
            multiple: true,
            options: [
              { label: 'Light', value: 'light' },
              { label: 'Exhaust Fan', value: 'exhaust' },
              { label: 'Circulation Fan', value: 'circulation_fan' },
              { label: 'Humidifier', value: 'humidifier' },
              { label: 'Dehumidifier', value: 'dehumidifier' },
              { label: 'Temperature', value: 'temperature' },
              { label: 'Humidity', value: 'humidity' },
              { label: 'VPD', value: 'vpd' },
              { label: 'CO2', value: 'co2' },
              { label: 'Soil Moisture', value: 'soil_moisture' },
              { label: 'Substrate Temperature', value: 'substrate_temperature' },
              { label: 'Tank Level', value: 'irrigation_tank_level' },
              { label: 'DLI', value: 'dli' },
              { label: 'Energy', value: 'energy' },
              { label: 'Water', value: 'water' },
              { label: 'Optimal Conditions', value: 'optimal' },
              { label: 'Crop Steering', value: 'crop_steering' },
              { label: 'Steering Phase', value: 'steering_phase' },
            ],
          },
        },
      },
    ];
  }

  render() {
    if (!this._config) return html``;

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${this._computeSchema()}
        .computeLabel=${computeEditorLabel}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  private _valueChanged(ev: CustomEvent) {
    if (!this._config) return;
    this._config = ev.detail.value;
    this.dispatchEvent(
      new CustomEvent('config-changed', {
        detail: { config: this._config },
        bubbles: true,
        composed: true,
      })
    );
  }
}
