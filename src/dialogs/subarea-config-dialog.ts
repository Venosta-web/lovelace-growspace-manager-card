import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { mdiViewGrid } from '@mdi/js';
import { dialogStyles } from '../styles/dialog.styles';
import { HomeAssistant } from 'custom-card-helpers';
import type { Subarea, EnvironmentConfig } from '../services/types';
import { DataService } from '../services/data-service';
import '../features/shared/ui/gs-dialog';
import '../features/shared/ui/gs-help-tooltip';

@customElement('subarea-config-dialog')
export class SubareaConfigDialog extends LitElement {
  @property({ type: Boolean, reflect: true }) open = false;
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ type: String }) public growspaceId = '';
  @property({ attribute: false }) public subarea: Subarea | undefined;

  // Sensor state fields matching EnvironmentConfig
  @state() private _temperatureSensors: string[] = [];
  @state() private _humiditySensors: string[] = [];
  @state() private _vpdSensors: string[] = [];
  @state() private _lightSensors: string[] = [];
  @state() private _exhaustFanEntities: string[] = [];
  @state() private _circulationFanEntities: string[] = [];
  @state() private _humidifierEntities: string[] = [];
  @state() private _dehumidifierEntities: string[] = [];
  @state() private _substrateTemperatureSensors: string[] = [];
  @state() private _cameraEntities: string[] = [];

  @state() private _saving = false;
  @state() private _error = '';

  private _dataService?: DataService;

  static styles = [
    dialogStyles,
    css`
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
      .multi-select-box:hover {
        background: rgba(var(--secondary-background-color, 255, 255, 255), 0.08);
        border-bottom-color: var(--primary-light-color-hover, rgba(255, 255, 255, 0.6));
      }
      .multi-select-box:focus-within {
        background: rgba(var(--secondary-background-color, 255, 255, 255), 0.12);
        border-bottom: 2px solid var(--primary-light-color-active, rgba(255, 255, 255, 0.6));
        padding-bottom: 5px;
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
      .section-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 12px;
        padding-bottom: 8px;
        border-bottom: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
        font-weight: 500;
        color: var(--secondary-text-color);
        font-size: 0.85rem;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .error-message {
        color: var(--error-color, #ff5252);
        font-size: 0.85rem;
        padding: 8px 0;
      }
    `,
  ];

  protected willUpdate(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('hass') && this.hass) {
      this._dataService = new DataService(this.hass);
    }
    if (changedProperties.has('subarea') && this.subarea) {
      this._populateFromSubarea(this.subarea);
    }
    if (changedProperties.has('open') && this.open && this.subarea) {
      this._populateFromSubarea(this.subarea);
    }
  }

  private _populateFromSubarea(subarea: Subarea) {
    const cfg = subarea.environment_config;
    this._temperatureSensors = [...(cfg.temperature_sensors ?? [])];
    this._humiditySensors = [...(cfg.humidity_sensors ?? [])];
    this._vpdSensors = [...(cfg.vpd_sensors ?? [])];
    this._lightSensors = [...(cfg.light_sensors ?? [])];
    this._exhaustFanEntities = [...(cfg.exhaust_fan_entities ?? [])];
    this._circulationFanEntities = [...(cfg.circulation_fan_entities ?? [])];
    this._humidifierEntities = [...(cfg.humidifier_entities ?? [])];
    this._dehumidifierEntities = [...(cfg.dehumidifier_entities ?? [])];
    this._substrateTemperatureSensors = [...(cfg.substrate_temperature_sensors ?? [])];
    this._cameraEntities = [...(cfg.camera_entities ?? [])];
  }

  private _close() {
    this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
  }

  private async _save() {
    if (!this.subarea || !this.growspaceId) return;
    if (!this._dataService) {
      this._dataService = new DataService(this.hass);
    }

    this._saving = true;
    this._error = '';

    const updatedConfig: Partial<EnvironmentConfig> = {
      temperature_sensors: this._temperatureSensors,
      humidity_sensors: this._humiditySensors,
      vpd_sensors: this._vpdSensors,
      light_sensors: this._lightSensors,
      exhaust_fan_entities: this._exhaustFanEntities,
      circulation_fan_entities: this._circulationFanEntities,
      humidifier_entities: this._humidifierEntities,
      dehumidifier_entities: this._dehumidifierEntities,
      substrate_temperature_sensors: this._substrateTemperatureSensors,
      camera_entities: this._cameraEntities,
    };

    try {
      const updated = await this._dataService.updateSubarea(
        this.growspaceId,
        this.subarea.id,
        updatedConfig
      );
      this.dispatchEvent(
        new CustomEvent('subarea-updated', {
          detail: { subarea: updated },
          bubbles: true,
          composed: true,
        })
      );
      this._close();
    } catch (e) {
      console.error('[SubareaConfigDialog] Failed to save:', e);
      this._error = 'Failed to save subarea configuration.';
    } finally {
      this._saving = false;
    }
  }

  private _getEntities(domains: string[], deviceClass: string | null): string[] {
    if (!this.hass) return [];
    return Object.keys(this.hass.states || {})
      .filter((eid) => {
        const state = this.hass.states[eid];
        if (!state) return false;
        const domain = eid.split('.')[0];
        const hasDomain = domains.includes(domain);
        const hasDeviceClass = !deviceClass || state.attributes.device_class === deviceClass;
        return hasDomain && hasDeviceClass;
      })
      .sort();
  }

  private _renderMultiEntitySelect(
    label: string,
    values: string[],
    domains: string[],
    deviceClass: string | null,
    changeHandler: (values: string[]) => void
  ) {
    const listId = `list-multi-${label.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`;
    const entities = this._getEntities(domains, deviceClass);

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
                  @click=${() => changeHandler(values.filter((v) => v !== val))}
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
              if (val && !values.includes(val)) {
                changeHandler([...values, val]);
              }
              input.value = '';
            }}
          />
        </div>
        <datalist id="${listId}">
          ${entities.map((eid) => html`<option value="${eid}"></option>`)}
        </datalist>
      </div>
    `;
  }

  render() {
    if (!this.open) return nothing;

    return html`
      <gs-dialog
        .open=${this.open}
        heading="Configure Subarea"
        .subtitle=${this.subarea?.name ?? ''}
        .iconPath=${mdiViewGrid}
        containerStyle="max-width: 680px; height: auto; max-height: 90vh;"
        @close=${this._close}
      >
        <gs-help-tooltip
          slot="header-extra"
          content="Assign sensors and actuators to this subarea for independent environment monitoring."
          placement="bottom"
          label="Subarea Config"
        ></gs-help-tooltip>

          <!-- Content -->
          <div class="config-content" style="padding: 20px; overflow-y: auto; max-height: calc(90vh - 140px);">
            <div class="form-section">

              <div class="section-header">Monitoring Sensors</div>

              ${this._renderMultiEntitySelect(
                'Temperature Sensors',
                this._temperatureSensors,
                ['sensor', 'input_number'],
                'temperature',
                (v) => (this._temperatureSensors = v)
              )}
              ${this._renderMultiEntitySelect(
                'Humidity Sensors',
                this._humiditySensors,
                ['sensor', 'input_number'],
                'humidity',
                (v) => (this._humiditySensors = v)
              )}
              ${this._renderMultiEntitySelect(
                'VPD Sensors',
                this._vpdSensors,
                ['sensor', 'input_number'],
                'pressure',
                (v) => (this._vpdSensors = v)
              )}
              ${this._renderMultiEntitySelect(
                'Substrate Temperature Sensors',
                this._substrateTemperatureSensors,
                ['sensor', 'input_number'],
                'temperature',
                (v) => (this._substrateTemperatureSensors = v)
              )}
              ${this._renderMultiEntitySelect(
                'Light Source / Sensor',
                this._lightSensors,
                ['switch', 'light', 'input_boolean', 'sensor'],
                null,
                (v) => (this._lightSensors = v)
              )}

              <div class="section-header" style="margin-top: 8px;">Climate Control</div>

              ${this._renderMultiEntitySelect(
                'Exhaust Fan / Switch',
                this._exhaustFanEntities,
                ['fan', 'switch', 'input_boolean', 'sensor', 'binary_sensor', 'input_number'],
                null,
                (v) => (this._exhaustFanEntities = v)
              )}
              ${this._renderMultiEntitySelect(
                'Circulation Fan / Switch',
                this._circulationFanEntities,
                ['fan', 'switch', 'input_boolean', 'sensor', 'input_number'],
                null,
                (v) => (this._circulationFanEntities = v)
              )}
              ${this._renderMultiEntitySelect(
                'Humidifier',
                this._humidifierEntities,
                ['humidifier', 'switch', 'input_boolean', 'sensor', 'binary_sensor', 'input_number'],
                null,
                (v) => (this._humidifierEntities = v)
              )}
              ${this._renderMultiEntitySelect(
                'Dehumidifier',
                this._dehumidifierEntities,
                ['humidifier', 'switch', 'input_boolean', 'sensor', 'binary_sensor'],
                null,
                (v) => (this._dehumidifierEntities = v)
              )}

              <div class="section-header" style="margin-top: 8px;">Cameras</div>

              ${this._renderMultiEntitySelect(
                'Camera Entities',
                this._cameraEntities,
                ['camera'],
                null,
                (v) => (this._cameraEntities = v)
              )}

              ${this._error ? html`<div class="error-message">${this._error}</div>` : nothing}
            </div>
          </div>

          <!-- Actions -->
          <div class="button-group" style="padding: 16px;">
            <button class="md3-button tonal" @click=${this._close} ?disabled=${this._saving}>
              Cancel
            </button>
            <button
              class="md3-button primary"
              @click=${this._save}
              ?disabled=${this._saving}
            >
              ${this._saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
      </gs-dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'subarea-config-dialog': SubareaConfigDialog;
  }
}
