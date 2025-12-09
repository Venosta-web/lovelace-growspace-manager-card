import { LitElement, html, css, PropertyValues, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant } from 'custom-card-helpers';
import { consume } from '@lit/context';
import { hassContext } from '../context';
import { mdiWater, mdiClose, mdiPlus } from '@mdi/js';
import { IrrigationTime, IrrigationStrategy, GrowspaceDevice } from '../types';
import { DataService } from '../data-service';
import { dialogStyles } from '../styles/dialog.styles';
import '../components/ui/md3-text-input';
import '../components/ui/md3-number-input';
import '../components/ui/md3-switch';

@customElement('irrigation-dialog')
export class IrrigationDialog extends LitElement {
  @consume({ context: hassContext, subscribe: true })
  public hass!: HomeAssistant;
  @property({ type: Boolean }) public open = false;
  @property({ attribute: false }) public device?: GrowspaceDevice;
  @property({ type: String }) public growspaceId = ''; // Keep for fallback or ID access if device not set? User said update save methods to use this.device.device_id. But keeping it might be useful. Actually prompt says: "Update _saveSettings, _saveStrategy, and _add/remove methods to use this.device.device_id (or this.growspaceId)". I will keep growspaceId for now but make device the primary source.
  @property({ type: String }) public growspaceName = '';

  @state() private _irrigation_pump_entity = '';
  @state() private _drain_pump_entity = '';
  @state() private _irrigation_duration = 60;
  @state() private _drain_duration = 60;
  @state() private _irrigation_times: IrrigationTime[] = [];
  @state() private _drain_times: IrrigationTime[] = [];

  @state() private _adding_irrigation_time?: { time: string; duration: number };
  @state() private _adding_drain_time?: { time: string; duration: number };

  private _dataService?: DataService;

  static styles = [
    dialogStyles,
    css`
        :host {
             --mdc-dialog-min-width: 400px;
             --mdc-dialog-max-width: 1000px;
        }
        
        /* Overrides/Specific Layouts */
        .dialog-body {
            padding: 24px;
            overflow-y: auto;
            max-height: 70vh;
            display: flex;
            flex-direction: column;
            gap: 20px;
        }

        /* Time Bar Visualization */
        .time-bar-container {
             position: relative; 
             height: 80px; 
             background: rgba(0,0,0,0.3); 
             border-radius: 8px; 
             cursor: crosshair; 
        }
        
        .time-tick {
             position: absolute; 
             top: 0; bottom: 0; 
             border-left: 1px solid rgba(255,255,255,0.05); 
             pointer-events: none;
        }
        .time-tick.major {
             border-left-color: rgba(255,255,255,0.2);
        }
        
        .time-label {
             position: absolute; 
             bottom: -22px; 
             left: -12px; 
             font-size: 0.7rem; 
             color: var(--secondary-text-color);
        }

        .chart-marker {
             position: absolute; 
             top: 10%; bottom: 10%; 
             width: 4px; 
             cursor: pointer; 
             border-radius: 2px;
        }
        
        .chart-tooltip {
             position: absolute; 
             left: 8px; top: -24px; 
             color: #fff; 
             padding: 4px 8px; 
             border-radius: 4px; 
             font-size: 0.7rem; 
             white-space: nowrap; 
             box-shadow: 0 2px 8px rgba(0,0,0,0.3);
             z-index: 10;
        }

        .legend-row {
             margin-top: 30px; 
             display: flex; 
             justify-content: space-between; 
             font-size: 0.7rem; 
             color: var(--secondary-text-color);
        }
        
        .overlay-backdrop {
             position: fixed; 
             top: 0; left: 0; right: 0; bottom: 0; 
             background: rgba(0,0,0,0.7); 
             display: flex; 
             align-items: center; 
             justify-content: center; 
             z-index: 10000;
        }
    `];

  @state() private _activeTab: 'schedules' | 'steering' = 'schedules';
  @state() private _strategy: Partial<IrrigationStrategy> = {};

  protected willUpdate(changedProps: PropertyValues): void {
    if (changedProps.has('open') && this.open) {
      this._initializeState();
    }
    if (this.hass && (changedProps.has('hass') || !this._dataService)) {
      this._dataService = new DataService(this.hass);
    }
  }

  private _initializeState() {
    if (!this.device) return;

    const config = this.device.irrigation_config || {};

    this._irrigation_pump_entity = config.irrigation_pump_entity || '';
    this._drain_pump_entity = config.drain_pump_entity || '';
    this._irrigation_duration = config.irrigation_duration || 60;
    this._drain_duration = config.drain_duration || 60;

    this._irrigation_times = this.device.irrigation_times || [];
    this._drain_times = this.device.drain_times || [];

    // Initialize Strategy
    const strat = this.device.irrigation_strategy;
    this._strategy = {
      enabled: strat?.enabled || false,
      lights_on_time: strat?.lights_on_time || '06:00:00',
      p0_duration_minutes: strat?.p0_duration_minutes || 60,
      p2_stop_before_lights_off_minutes: strat?.p2_stop_before_lights_off_minutes || 120,
      target_vwc_percent: strat?.target_vwc_percent || 45.0,
      maintenance_dryback_percent: strat?.maintenance_dryback_percent || 3.0,
      shot_duration_seconds: strat?.shot_duration_seconds || 15,
      shot_interval_minutes: strat?.shot_interval_minutes || 15
    };
  }

  // ... (Keep existing _parseScheduleString, _saveSettings, _addIrrigationTime, etc. - ensure logical flow)

  private _parseScheduleString(scheduleString: string | IrrigationTime[]): IrrigationTime[] {
    if (Array.isArray(scheduleString)) return scheduleString;
    if (!scheduleString) return [];
    return scheduleString.split(',').map(t => {
      const parts = t.trim().split('|');
      return {
        time: parts[0],
        duration: parts[1] ? parseInt(parts[1]) : undefined
      };
    });
  }

  private async _saveSettings() {
    if (!this.device?.device_id || !this._dataService) return;

    try {
      await this._dataService.setIrrigationSettings({
        growspace_id: this.device.device_id,
        irrigation_pump_entity: this._irrigation_pump_entity,
        drain_pump_entity: this._drain_pump_entity,
        irrigation_duration: this._irrigation_duration,
        drain_duration: this._drain_duration
      });
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
  }

  private async _addIrrigationTime(time: string, duration?: number) {
    if (!this.device?.device_id || !this._dataService) return;

    try {
      await this._dataService.addIrrigationTime({
        growspace_id: this.device.device_id,
        time,
        duration: duration || this._irrigation_duration
      });

      // Optimistic update
      const newTime: IrrigationTime = { time, duration: duration || this._irrigation_duration };
      this._irrigation_times = [...this._irrigation_times, newTime].sort((a, b) => a.time.localeCompare(b.time));
      this._adding_irrigation_time = undefined;
    } catch (e) {
      console.error('Failed to add irrigation time:', e);
    }
  }

  private async _removeIrrigationTime(time: string) {
    if (!this.device?.device_id || !this._dataService) return;

    try {
      await this._dataService.removeIrrigationTime({
        growspace_id: this.device.device_id,
        time
      });

      // Optimistic update
      this._irrigation_times = this._irrigation_times.filter(t => t.time !== time);
    } catch (e) {
      console.error('Failed to remove irrigation time:', e);
    }
  }

  private async _addDrainTime(time: string, duration?: number) {
    if (!this.device?.device_id || !this._dataService) return;

    try {
      await this._dataService.addDrainTime({
        growspace_id: this.device.device_id,
        time,
        duration: duration || this._drain_duration
      });

      // Optimistic update
      const newTime: IrrigationTime = { time, duration: duration || this._drain_duration };
      this._drain_times = [...this._drain_times, newTime].sort((a, b) => a.time.localeCompare(b.time));
      this._adding_drain_time = undefined;
    } catch (e) {
      console.error('Failed to add drain time:', e);
    }
  }

  private async _removeDrainTime(time: string) {
    if (!this.device?.device_id || !this._dataService) return;

    try {
      await this._dataService.removeDrainTime({
        growspace_id: this.device.device_id,
        time
      });

      // Optimistic update
      this._drain_times = this._drain_times.filter(t => t.time !== time);
    } catch (e) {
      console.error('Failed to remove drain time:', e);
    }
  }

  private _startAddingIrrigationTime(x: number, width: number) {
    const percentage = x / width;
    const totalMinutes = Math.round(percentage * 24 * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

    this._adding_irrigation_time = {
      time: timeStr,
      duration: this._irrigation_duration
    };
  }

  private _startAddingDrainTime(x: number, width: number) {
    const percentage = x / width;
    const totalMinutes = Math.round(percentage * 24 * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

    this._adding_drain_time = {
      time: timeStr,
      duration: this._drain_duration
    };
  }

  private _close() {
    this.dispatchEvent(new CustomEvent('close'));
  }

  private async _saveStrategy() {
    if (!this.device?.device_id || !this._dataService) return;
    try {
      await this._dataService.setIrrigationStrategy(this.device.device_id, this._strategy);
    } catch (e) {
      console.error('Failed to save strategy:', e);
    }
  }

  private _updateStrategyField(field: keyof IrrigationStrategy, value: any) {
    this._strategy = { ...this._strategy, [field]: value };
  }

  protected render() {
    if (!this.open) return nothing;

    const dialogColor = '#2196F3';

    return html`
      <ha-dialog
        open
        @closed=${this._close}
        hideActions
        .scrimClickAction=${''}
        .escapeKeyAction=${''}
      >
        <div class="glass-dialog-container" style="--stage-color: ${dialogColor};">
          <div class="dialog-header">
            <div class="dialog-icon">
              <svg style="width:32px;height:32px;fill:currentColor;" viewBox="0 0 24 24">
                <path d="${mdiWater}"></path>
              </svg>
            </div>
            <div class="dialog-title-group">
              <h2 class="dialog-title">Irrigation Management</h2>
              <div class="dialog-subtitle">${this.growspaceName}</div>
            </div>
            <button class="md3-button text" @click=${this._close} style="min-width: auto; padding: 8px;">
              <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24">
                <path d="${mdiClose}"></path>
              </svg>
            </button>
          </div>

          <!-- Tabs -->
          <div class="tabs-row" style="display: flex; gap: 16px; margin-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 0;">
            <div class="tab-item ${this._activeTab === 'schedules' ? 'active' : ''}"
                 @click=${() => this._activeTab = 'schedules'}
                 style="padding: 12px 16px; cursor: pointer; border-bottom: 2px solid transparent; opacity: 0.7; transition: all 0.2s;"
            >
              <style>
                .tab-item.active { border-bottom-color: ${dialogColor} !important; opacity: 1 !important; }
                .tab-item:hover { opacity: 1 !important; background: rgba(255,255,255,0.05); }
              </style>
              Schedules
            </div>
            <div class="tab-item ${this._activeTab === 'steering' ? 'active' : ''}"
                 @click=${() => this._activeTab = 'steering'}
                 style="padding: 12px 16px; cursor: pointer; border-bottom: 2px solid transparent; opacity: 0.7; transition: all 0.2s;"
            >
              Crop Steering (VWC)
            </div>
          </div>

          <div class="dialog-body">
            ${this._activeTab === 'schedules' ? this._renderSchedulesTab(dialogColor) : this._renderSteeringTab(dialogColor)}
          </div>
          
          <div class="button-group">
             <button class="md3-button tonal" @click=${this._close}>Close</button>
             ${this._activeTab === 'steering' ? html`
                <button class="md3-button primary" style="background: ${dialogColor};" @click=${this._saveStrategy}>Save Strategy</button>
             ` : ''}
          </div>

        </div>
      </ha-dialog>
    `;
  }

  private _renderSchedulesTab(color: string) {
    return html`
            ${this._renderScheduleSection(
      'Irrigation Schedule',
      this._irrigation_times,
      this._irrigation_duration,
      'irrigation',
      color
    )}

            ${this._renderScheduleSection(
      'Drain Schedule',
      this._drain_times,
      this._drain_duration,
      'drain',
      '#FF9800'
    )}
      `;
  }

  private _renderSteeringTab(color: string) {
    return html`
        <div class="detail-card">
            <h3 style="margin-top: 0;">Crop Steering Configuration</h3>
            <p style="font-size: 0.8rem; opacity: 0.7; margin-bottom: 20px;">
                Enable logic-based irrigation based on volumetric water content (VWC) targets. Overrides basic schedules when active.
            </p>

            <div class="form-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                <div style="grid-column: span 2; display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.05); padding: 12px; border-radius: 8px;">
                    <span>Enable VWC Steering</span>
                    <md3-switch 
                        .checked=${this._strategy.enabled}
                        @change=${(e: any) => this._updateStrategyField('enabled', e.target.checked)}
                    ></md3-switch>
                </div>

                <div style="grid-column: span 2; border-bottom: 1px solid rgba(255,255,255,0.1); margin: 8px 0;"></div>
                <h4 style="grid-column: span 2; margin: 4px 0;">Targets</h4>

                <md3-number-input
                    label="Target VWC (%)"
                    .value=${this._strategy.target_vwc_percent}
                    @change=${(e: CustomEvent) => this._updateStrategyField('target_vwc_percent', parseFloat(e.detail))}
                ></md3-number-input>

                <md3-number-input
                    label="Dryback (%)"
                    .value=${this._strategy.maintenance_dryback_percent}
                    @change=${(e: CustomEvent) => this._updateStrategyField('maintenance_dryback_percent', parseFloat(e.detail))}
                ></md3-number-input>


                <h4 style="grid-column: span 2; margin: 4px 0; margin-top: 12px;">Timing</h4>
                
                <md3-text-input
                    label="Lights On Time"
                    type="time"
                    .value=${this._strategy.lights_on_time}
                    @change=${(e: CustomEvent) => this._updateStrategyField('lights_on_time', (e.target as HTMLInputElement).value || e.detail)}
                ></md3-text-input>

                <md3-number-input
                    label="P0 Duration (min)"
                    .value=${this._strategy.p0_duration_minutes}
                    @change=${(e: CustomEvent) => this._updateStrategyField('p0_duration_minutes', parseInt(e.detail))}
                ></md3-number-input>

                <md3-number-input
                    label="P2 Stop Buffer (min)"
                    .value=${this._strategy.p2_stop_before_lights_off_minutes}
                    @change=${(e: CustomEvent) => this._updateStrategyField('p2_stop_before_lights_off_minutes', parseInt(e.detail))}
                ></md3-number-input>


                <h4 style="grid-column: span 2; margin: 4px 0; margin-top: 12px;">Dosing</h4>

                <md3-number-input
                    label="Shot Duration (sec)"
                    .value=${this._strategy.shot_duration_seconds}
                    @change=${(e: CustomEvent) => this._updateStrategyField('shot_duration_seconds', parseInt(e.detail))}
                ></md3-number-input>

                <md3-number-input
                    label="Shot Interval (min)"
                    .value=${this._strategy.shot_interval_minutes}
                    @change=${(e: CustomEvent) => this._updateStrategyField('shot_interval_minutes', parseInt(e.detail))}
                ></md3-number-input>

            </div>
        </div>
      `;
  }

  private _renderScheduleSection(
    title: string,
    times: IrrigationTime[],
    defaultDuration: number,
    type: 'irrigation' | 'drain',
    color: string
  ) {
    const addingTime = type === 'irrigation' ? this._adding_irrigation_time : this._adding_drain_time;

    return html`
      <div class="detail-card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <h3 style="margin: 0;">${title}</h3>
          <button
            @click=${(e: Event) => {
        const container = (e.target as HTMLElement).closest('.detail-card')?.querySelector(`.${type}-time-bar`) as HTMLElement;
        if (container) {
          const rect = container.getBoundingClientRect();
          type === 'irrigation'
            ? this._startAddingIrrigationTime(rect.width / 2, rect.width)
            : this._startAddingDrainTime(rect.width / 2, rect.width);
        }
      }}
            class="md3-button primary"
            style="background: ${color};"
          >
            <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiPlus}"></path></svg>
            ADD TIME
          </button>
        </div>

        <div
          class="${type}-time-bar time-bar-container"
          @click=${(e: MouseEvent) => {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const x = e.clientX - rect.left;
        type === 'irrigation'
          ? this._startAddingIrrigationTime(x, rect.width)
          : this._startAddingDrainTime(x, rect.width);
      }}
          style="border: 2px solid ${color}40;"
        >
          ${Array.from({ length: 25 }, (_, i) => i).map(hour => html`
            <div class="time-tick ${hour % 6 === 0 ? 'major' : ''}" style="left: ${(hour / 24) * 100}%;">
              ${hour % 3 === 0 ? html`
                <span class="time-label">${hour.toString().padStart(2, '0')}:00</span>
              ` : ''}
            </div>
          `)}

          ${times.map((t: IrrigationTime) => {
        const [hours, minutes] = t.time.split(':').map(Number);
        const position = ((hours + minutes / 60) / 24) * 100;
        return html`
              <div
                class="chart-marker"
                @click=${(e: Event) => {
            e.stopPropagation();
            if (confirm(`Remove ${type} time ${t.time}?`)) {
              type === 'irrigation'
                ? this._removeIrrigationTime(t.time)
                : this._removeDrainTime(t.time);
            }
          }}
                style="left: ${position}%; background: ${color}; box-shadow: 0 0 8px ${color};"
                title="${t.time} | Duration: ${t.duration || defaultDuration}seconds"
              >
                <div class="chart-tooltip" style="background: ${color};">
                  ${t.time} | ${t.duration || defaultDuration}s
                </div>
              </div>
            `;
      })}
        </div>

        <div class="legend-row">
          <span>00:00</span>
          <span>06:00</span>
          <span>12:00</span>
          <span>18:00</span>
          <span>24:00</span>
        </div>

        ${addingTime ? html`
          <div class="overlay-backdrop" 
               @click=${() => type === 'irrigation' ? this._adding_irrigation_time = undefined : this._adding_drain_time = undefined}>
            <div class="detail-card" style="max-width: 400px; margin: 0; background: #2d2d2d; width: 90%;" @click=${(e: Event) => e.stopPropagation()}>
              <h3>Add ${title} Time</h3>

              <md3-text-input
                label="Time"
                type="time"
                .value=${addingTime.time}
                @change=${(e: CustomEvent) => {
          const val = (e.target as HTMLInputElement).value || e.detail; // md3-text-input uses detail
          if (type === 'irrigation' && this._adding_irrigation_time) this._adding_irrigation_time = { ...this._adding_irrigation_time, time: val };
          if (type === 'drain' && this._adding_drain_time) this._adding_drain_time = { ...this._adding_drain_time, time: val };
        }}
              ></md3-text-input>

              <md3-number-input
                label="Duration (seconds)"
                .value=${addingTime.duration}
                .min=${1}
                @change=${(e: CustomEvent) => {
          const val = parseInt(e.detail);
          if (!isNaN(val)) {
            if (type === 'irrigation' && this._adding_irrigation_time) this._adding_irrigation_time = { ...this._adding_irrigation_time, duration: val };
            if (type === 'drain' && this._adding_drain_time) this._adding_drain_time = { ...this._adding_drain_time, duration: val };
          }
        }}
              ></md3-number-input>

              <div class="button-group">
                <button class="md3-button tonal" @click=${() => type === 'irrigation' ? this._adding_irrigation_time = undefined : this._adding_drain_time = undefined}>
                  Cancel
                </button>
                <button
                  class="md3-button primary"
                  @click=${() => {
          type === 'irrigation'
            ? this._addIrrigationTime(addingTime.time, addingTime.duration)
            : this._addDrainTime(addingTime.time, addingTime.duration);
        }}
                  style="background: ${color};"
                >
                  Add Schedule
                </button>
              </div>
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }
}
