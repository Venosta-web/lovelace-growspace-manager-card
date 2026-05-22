import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { mdiClose, mdiPencil, mdiDelete, mdiChartTree } from '@mdi/js';
import { dialogStyles } from '../styles/dialog.styles';
import { HomeAssistant } from 'custom-card-helpers';
import { SensorGroup } from '../types';
import '../features/shared/ui/gs-help-tooltip';

@customElement('sensor-group-dialog')
export class SensorGroupDialog extends LitElement {
    @property({ type: Boolean }) open = false;
    @property({ attribute: false }) public hass!: HomeAssistant;
    @property({ attribute: false }) public sensorGroup: SensorGroup | undefined;

    @state() private _name = '';
    @state() private _x = 0;
    @state() private _y = 0;
    @state() private _z = 0;
    @state() private _tempSensors: string[] = [];
    @state() private _humidSensors: string[] = [];
    @state() private _vpdSensors: string[] = [];

    static styles = [
        dialogStyles,
        css`
      .group-form {
        display: flex;
        flex-direction: column;
        gap: 16px;
        padding: 8px 0;
      }
      .coord-grid {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 12px;
      }
      .sensor-columns {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 16px;
        margin-top: 8px;
        max-height: 300px;
        overflow-y: auto;
        padding-right: 8px;
      }
      .sensor-column {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .column-title {
        font-size: 0.8rem;
        font-weight: 500;
        color: var(--secondary-text-color);
        padding-bottom: 4px;
        border-bottom: 1px solid var(--divider-color);
      }
      .checkbox-item {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 0.85rem;
        cursor: pointer;
      }
      .checkbox-item input {
        cursor: pointer;
      }
      .entity-id {
        font-size: 0.7rem;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    `,
    ];

    protected willUpdate(changedProperties: Map<string, unknown>) {
        if (changedProperties.has('sensorGroup') && this.sensorGroup) {
            this._name = this.sensorGroup.name;
            this._x = this.sensorGroup.x;
            this._y = this.sensorGroup.y;
            this._z = this.sensorGroup.z;
            this._tempSensors = [...(this.sensorGroup.temperature_sensors || [])];
            this._humidSensors = [...(this.sensorGroup.humidity_sensors || [])];
            this._vpdSensors = [...(this.sensorGroup.vpd_sensors || [])];
        } else if (changedProperties.has('sensorGroup') && !this.sensorGroup) {
            this._name = '';
            this._x = 0;
            this._y = 0;
            this._z = 0;
            this._tempSensors = [];
            this._humidSensors = [];
            this._vpdSensors = [];
        }
    }

    private _close() {
        this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
    }

    private _save() {
        const group: SensorGroup = {
            id: this.sensorGroup?.id || `group_${Date.now()}`,
            name: this._name || 'Unnamed Group',
            x: this._x,
            y: this._y,
            z: this._z,
            temperature_sensors: this._tempSensors,
            humidity_sensors: this._humidSensors,
            vpd_sensors: this._vpdSensors,
        };

        this.dispatchEvent(
            new CustomEvent('save-sensor-group', {
                detail: { group },
                bubbles: true,
                composed: true,
            })
        );
    }

    private _toggleSensor(sensorList: string[], sensor: string, listName: '_tempSensors' | '_humidSensors' | '_vpdSensors') {
        const newList = sensorList.includes(sensor)
            ? sensorList.filter(s => s !== sensor)
            : [...sensorList, sensor];

        this[listName] = newList;
    }

    render() {
        if (!this.open) return nothing;

        const allSensors = this._getAvailableSensors();

        return html`
      <ha-dialog
        open
        @closed=${this._close}
        hideActions
        without-header
        width="large"
        .scrimClickAction=${''}
        .escapeKeyAction=${'close'}
      >
        <div class="glass-dialog-container" style="max-width: 600px; height: auto; max-height: 90vh;">
          <div class="dialog-header">
            <div class="dialog-icon">
               <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiChartTree}"></path></svg>
            </div>
            <div class="dialog-title-group">
                <div style="display:flex;align-items:center;gap:6px;">
                  <h2 class="dialog-title">${this.sensorGroup ? 'Edit Group' : 'Add Group'}</h2>
                  <gs-help-tooltip
                    content="Group sensors together so their readings are averaged or compared as a unit."
                    placement="bottom"
                    label="Sensor Group"
                  ></gs-help-tooltip>
                </div>
                <div class="dialog-subtitle">Configure 3D heatmap coordinates & sensors</div>
            </div>
            <button class="md3-button text" @click=${this._close} style="min-width: auto; padding: 8px;">
                <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiClose}"></path></svg>
            </button>
          </div>

          <div class="config-content" style="padding: 20px;">
            <div class="group-form">
              <md3-text-input
                label="Group Name"
                .value=${this._name}
                @change=${(e: CustomEvent) => (this._name = e.detail)}
              ></md3-text-input>

              <div class="coord-grid">
                <md3-number-input
                  label="X"
                  .value=${this._x}
                  @change=${(e: CustomEvent) => (this._x = parseFloat(e.detail))}
                ></md3-number-input>
                <md3-number-input
                  label="Y"
                  .value=${this._y}
                  @change=${(e: CustomEvent) => (this._y = parseFloat(e.detail))}
                ></md3-number-input>
                <md3-number-input
                  label="Z (Optional)"
                  .value=${this._z}
                  @change=${(e: CustomEvent) => (this._z = parseFloat(e.detail))}
                ></md3-number-input>
              </div>

              <div class="sensor-columns">
                <div class="sensor-column">
                  <div class="column-title">Temp Sensors</div>
                  ${allSensors.temp.map(s => this._renderCheckbox(s, this._tempSensors, '_tempSensors'))}
                </div>
                <div class="sensor-column">
                  <div class="column-title">Humidity Sensors</div>
                  ${allSensors.humid.map(s => this._renderCheckbox(s, this._humidSensors, '_humidSensors'))}
                </div>
                <div class="sensor-column">
                  <div class="column-title">VPD Sensors</div>
                  ${allSensors.vpd.map(s => this._renderCheckbox(s, this._vpdSensors, '_vpdSensors'))}
                </div>
              </div>
            </div>
          </div>

          <div class="button-group" style="padding: 16px;">
            <button class="md3-button tonal" @click=${this._close}>Cancel</button>
            <button class="md3-button primary" @click=${this._save}>
              ${this.sensorGroup ? 'Save Changes' : 'Create Group'}
            </button>
          </div>
        </div>
      </ha-dialog>
    `;
    }

    private _renderCheckbox(sensor: string, currentList: string[], type: '_tempSensors' | '_humidSensors' | '_vpdSensors') {
        const friendlyName = this.hass.states[sensor]?.attributes.friendly_name || sensor.split('.')[1];
        return html`
      <label class="checkbox-item">
        <input 
          type="checkbox" 
          .checked=${currentList.includes(sensor)}
          @change=${() => this._toggleSensor(currentList, sensor, type)}
        >
        <div style="display:flex; flex-direction:column; min-width:0;">
          <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${friendlyName}</span>
          <span class="entity-id">${sensor}</span>
        </div>
      </label>
    `;
    }

    private _getAvailableSensors() {
        if (!this.hass) return { temp: [], humid: [], vpd: [] };

        const entities = Object.keys(this.hass.states);
        const filterByClass = (cls: string) => entities.filter(e => this.hass.states[e].attributes.device_class === cls);
        const filterByDomain = (dom: string) => entities.filter(e => e.startsWith(dom));

        return {
            temp: filterByClass('temperature').sort(),
            humid: filterByClass('humidity').sort(),
            vpd: entities.filter(e => e.includes('vpd')).sort()
        };
    }
}
