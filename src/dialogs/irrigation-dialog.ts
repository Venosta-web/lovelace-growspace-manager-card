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
  @property({ attribute: false }) public device: GrowspaceDevice | undefined;

  @property({ type: String }) public growspaceName = '';

  @state() private _irrigationPumpEntity = '';
  @state() private _drainPumpEntity = '';
  @state() private _irrigationDuration = 60;
  @state() private _drainDuration = 60;
  @state() private _irrigationTimes: IrrigationTime[] = [];
  @state() private _drainTimes: IrrigationTime[] = [];

  @state() private _addingIrrigationTime: { time: string; duration: number } | undefined;
  @state() private _addingDrainTime: { time: string; duration: number } | undefined;

  private _dataService?: DataService;

  static styles = [
    dialogStyles,
    css`
      :host {
        --mdc-dialog-min-width: clamp(400px, 750px, 70vw);
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
        background: rgba(0, 0, 0, 0.3);
        border-radius: 8px;
        cursor: crosshair;
      }

      .time-tick {
        position: absolute;
        top: 0;
        bottom: 0;
        border-left: 1px solid rgba(255, 255, 255, 0.05);
        pointer-events: none;
      }
      .time-tick.major {
        border-left-color: rgba(255, 255, 255, 0.2);
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
        top: 10%;
        bottom: 10%;
        width: 4px;
        cursor: pointer;
        border-radius: 2px;
        /* Ensure marker is on top so hover works reliably */
        z-index: 5;
      }

      .chart-marker:hover .chart-tooltip {
        opacity: 1;
      }

      .chart-tooltip {
        position: absolute;
        left: 8px;
        top: -24px;
        color: #fff;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 0.7rem;
        white-space: nowrap;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        z-index: 10;
        opacity: 0;
        transition: opacity 0.2s;
        pointer-events: none;
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
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
      }

      /* Tab Styles */
      .tab-item {
        padding: 12px 16px;
        cursor: pointer;
        border-bottom: 2px solid transparent;
        opacity: 0.7;
        transition: all 0.2s;
      }
      .tab-item.active {
        border-bottom-color: var(--stage-color, #2196f3) !important;
        opacity: 1 !important;
      }
      .tab-item:hover {
        opacity: 1 !important;
        background: rgba(255, 255, 255, 0.05);
      }
    `,
  ];

  @state() private _activeTab: 'schedules' | 'steering' | 'config' = 'schedules';
  @state() private _strategy: Partial<IrrigationStrategy> = {};

  protected willUpdate(changedProps: PropertyValues): void {
    if ((changedProps.has('open') && this.open) || (changedProps.has('device') && this.device)) {
      this._initializeState();
    }
    if (this.hass && (changedProps.has('hass') || !this._dataService)) {
      this._dataService = new DataService(this.hass);
    }
  }

  private _initializeState() {
    if (!this.device) return;

    const config = this.device.irrigationConfig || {};

    this._irrigationPumpEntity = config.irrigationPumpEntity || '';
    this._drainPumpEntity = config.drainPumpEntity || '';
    this._irrigationDuration = config.irrigationDuration || 60;
    this._drainDuration = config.drainDuration || 60;

    this._irrigationTimes = this.device.irrigationConfig?.irrigationTimes || [];
    this._drainTimes = this.device.irrigationConfig?.drainTimes || [];

    console.log('[IrrigationDialog] Initializing State', {
      device: this.device,
      irrigationTimes: this._irrigationTimes,
      drainTimes: this._drainTimes,
      rawConfig: config,
    });

    // Initialize Strategy
    const strat = this.device.irrigationStrategy;
    this._strategy = {
      enabled: strat?.enabled || false,
      lightsOnTime: strat?.lightsOnTime || '06:00:00',
      p0DurationMinutes: strat?.p0DurationMinutes || 60,
      p2StopBeforeLightsOffMinutes: strat?.p2StopBeforeLightsOffMinutes || 120,
      targetVwcPercent: strat?.targetVwcPercent || 45.0,
      maintenanceDrybackPercent: strat?.maintenanceDrybackPercent || 3.0,
      shotDurationSeconds: strat?.shotDurationSeconds || 15,
      shotIntervalMinutes: strat?.shotIntervalMinutes || 15,
    };
  }

  // ... (Keep existing _parseScheduleString, _saveSettings, _addIrrigationTime, etc. - ensure logical flow)

  private _parseScheduleString(scheduleString: string | IrrigationTime[]): IrrigationTime[] {
    if (Array.isArray(scheduleString)) return scheduleString;
    if (!scheduleString) return [];
    return scheduleString.split(',').map((t) => {
      const parts = t.trim().split('|');
      return {
        time: parts[0].trim(),
        duration: parts[1] ? parseInt(parts[1].trim()) : undefined,
      };
    });
  }

  private async _saveSettings() {
    if (!this.device?.deviceId || !this._dataService) return;

    try {
      await this._dataService.setIrrigationSettings({
        growspaceId: this.device.deviceId,
        irrigationPumpEntity: this._irrigationPumpEntity,
        drainPumpEntity: this._drainPumpEntity,
        irrigationDuration: this._irrigationDuration,
        drainDuration: this._drainDuration,
      });
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
  }

  private async _addIrrigationTime(time: string, duration?: number) {
    if (!this.device?.deviceId || !this._dataService) return;

    try {
      await this._dataService.addIrrigationTime({
        growspaceId: this.device.deviceId,
        time,
        duration: duration || this._irrigationDuration,
      });

      // Optimistic update
      const newTime: IrrigationTime = { time, duration: duration || this._irrigationDuration };
      this._irrigationTimes = [...this._irrigationTimes, newTime].sort((a, b) =>
        a.time.localeCompare(b.time)
      );
      this._addingIrrigationTime = undefined;
      this._notifyDataChanged();
    } catch (e) {
      console.error('Failed to add irrigation time:', e);
    }
  }

  private async _removeIrrigationTime(time: string) {
    if (!this.device?.deviceId || !this._dataService) return;

    try {
      await this._dataService.removeIrrigationTime({
        growspaceId: this.device.deviceId,
        time,
      });

      // Optimistic update
      this._irrigationTimes = this._irrigationTimes.filter((t) => t.time !== time);
      this._notifyDataChanged();
    } catch (e) {
      console.error('Failed to remove irrigation time:', e);
    }
  }

  private async _addDrainTime(time: string, duration?: number) {
    if (!this.device?.deviceId || !this._dataService) return;

    try {
      await this._dataService.addDrainTime({
        growspaceId: this.device.deviceId,
        time,
        duration: duration || this._drainDuration,
      });

      // Optimistic update
      const newTime: IrrigationTime = { time, duration: duration || this._drainDuration };
      this._drainTimes = [...this._drainTimes, newTime].sort((a, b) =>
        a.time.localeCompare(b.time)
      );
      this._addingDrainTime = undefined;
      this._notifyDataChanged();
    } catch (e) {
      console.error('Failed to add drain time:', e);
    }
  }

  private async _removeDrainTime(time: string) {
    if (!this.device?.deviceId || !this._dataService) return;

    try {
      await this._dataService.removeDrainTime({
        growspaceId: this.device.deviceId,
        time,
      });

      // Optimistic update
      this._drainTimes = this._drainTimes.filter((t) => t.time !== time);
      this._notifyDataChanged();
    } catch (e) {
      console.error('Failed to remove drain time:', e);
    }
  }

  private _notifyDataChanged() {
    this.dispatchEvent(new CustomEvent('data-changed', { bubbles: true, composed: true }));
  }

  private _startAddingIrrigationTime(x: number, width: number) {
    const percentage = x / width;
    const totalMinutes = Math.round(percentage * 24 * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

    this._addingIrrigationTime = {
      time: timeStr,
      duration: this._irrigationDuration,
    };
  }

  private _startAddingDrainTime(x: number, width: number) {
    const percentage = x / width;
    const totalMinutes = Math.round(percentage * 24 * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

    this._addingDrainTime = {
      time: timeStr,
      duration: this._drainDuration,
    };
  }

  private _close() {
    this.dispatchEvent(new CustomEvent('close'));
  }

  private async _saveStrategy() {
    if (!this.device?.deviceId || !this._dataService) return;
    try {
      await this._dataService.setIrrigationStrategy(this.device.deviceId, this._strategy);
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
            <button
              class="md3-button text"
              @click=${this._close}
              style="min-width: auto; padding: 8px;"
            >
              <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24">
                <path d="${mdiClose}"></path>
              </svg>
            </button>
          </div>

          <div
            class="tabs-row"
            style="display: flex; gap: 16px; margin-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 0;"
          >
            <div
              class="tab-item ${this._activeTab === 'schedules' ? 'active' : ''}"
              @click=${() => (this._activeTab = 'schedules')}
            >
              Schedules
            </div>
            <div
              class="tab-item ${this._activeTab === 'steering' ? 'active' : ''}"
              @click=${() => (this._activeTab = 'steering')}
            >
              Crop Steering (VWC)
            </div>
            <div
              class="tab-item ${this._activeTab === 'config' ? 'active' : ''}"
              @click=${() => (this._activeTab = 'config')}
            >
              Configuration
            </div>
          </div>

          <div class="dialog-body">
            ${this._activeTab === 'schedules'
        ? this._renderSchedulesTab(dialogColor)
        : this._activeTab === 'steering'
          ? this._renderSteeringTab(dialogColor)
          : this._renderConfigSection()}
          </div>

          <div class="button-group">
            <button class="md3-button tonal" @click=${this._close}>Close</button>
            ${this._activeTab === 'steering'
        ? html`
                  <button
                    class="md3-button primary"
                    style="background: ${dialogColor};"
                    @click=${this._saveStrategy}
                  >
                    Save Strategy
                  </button>
                `
        : ''}
            ${this._activeTab === 'config'
        ? html`
                  <button
                    class="md3-button primary"
                    style="background: ${dialogColor};"
                    @click=${this._saveSettings}
                  >
                    Save Configuration
                  </button>
                `
        : ''}
          </div>
        </div>
      </ha-dialog>
    `;
  }

  private _renderSchedulesTab(color: string) {
    return html`
      ${this._renderScheduleSection(
      'Irrigation Schedule',
      this._irrigationTimes,
      this._irrigationDuration,
      'irrigation',
      color
    )}
      ${this._renderScheduleSection(
      'Drain Schedule',
      this._drainTimes,
      this._drainDuration,
      'drain',
      '#FF9800'
    )}
    `;
  }

  private _getEntities(domains: string[]) {
    if (!this.hass) return [];
    return Object.values(this.hass.states)
      .filter((stateObj) => {
        const domain = stateObj.entity_id.split('.')[0];
        return domains.includes(domain);
      })
      .sort((a, b) =>
        (a.attributes.friendly_name || a.entity_id).localeCompare(
          b.attributes.friendly_name || b.entity_id
        )
      );
  }

  private _renderEntitySelect(
    label: string,
    value: string,
    domains: string[],
    changeHandler: (e: Event) => void
  ) {
    const entities = this._getEntities(domains);
    return html`
      <div class="md3-input-group">
        <label class="md3-label">${label}</label>
        <select class="md3-input" .value=${value} @change=${changeHandler}>
          <option value="">None</option>
          ${entities.map(
      (e) =>
        html`<option value="${e.entity_id}" ?selected=${e.entity_id === value}>
                ${e.attributes.friendly_name || e.entity_id} (${e.entity_id})
              </option>`
    )}
        </select>
      </div>
    `;
  }

  private _renderConfigSection() {
    return html`
      <div class="schedule-section">
        <div class="section-header">
          <h3>Pump Configuration</h3>
        </div>
        <div class="section-content">
          ${this._renderEntitySelect(
      'Irrigation Pump',
      this._irrigationPumpEntity,
      ['switch', 'input_boolean'],
      (e) => (this._irrigationPumpEntity = (e.target as HTMLSelectElement).value)
    )}
          ${this._renderEntitySelect(
      'Drain Pump (Optional)',
      this._drainPumpEntity,
      ['switch', 'input_boolean'],
      (e) => (this._drainPumpEntity = (e.target as HTMLSelectElement).value)
    )}
        </div>
      </div>
    `;
  }

  private _renderSteeringTab(_color: string) {
    return html`
      <div class="detail-card">
        <h3 style="margin-top: 0;">Crop Steering Configuration</h3>
        <p style="font-size: 0.8rem; opacity: 0.7; margin-bottom: 20px;">
          Enable logic-based irrigation based on volumetric water content (VWC) targets. Overrides
          basic schedules when active.
        </p>

        <div class="form-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
          <div
            style="grid-column: span 2; display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.05); padding: 12px; border-radius: 8px;"
          >
            <span>Enable VWC Steering</span>
            <md3-switch
              .checked=${this._strategy.enabled}
              @change=${(e: any) => this._updateStrategyField('enabled', e.target.checked)}
            ></md3-switch>
          </div>

          <div
            style="grid-column: span 2; border-bottom: 1px solid rgba(255,255,255,0.1); margin: 8px 0;"
          ></div>
          <h4 style="grid-column: span 2; margin: 4px 0;">Targets</h4>

          <md3-number-input
            label="Target VWC (%)"
            .value=${this._strategy.targetVwcPercent}
            @change=${(e: CustomEvent) =>
        this._updateStrategyField('targetVwcPercent', parseFloat(e.detail))}
          ></md3-number-input>

          <md3-number-input
            label="Dryback (%)"
            .value=${this._strategy.maintenanceDrybackPercent}
            @change=${(e: CustomEvent) =>
        this._updateStrategyField('maintenanceDrybackPercent', parseFloat(e.detail))}
          ></md3-number-input>

          <h4 style="grid-column: span 2; margin: 4px 0; margin-top: 12px;">Timing</h4>

          <md3-text-input
            label="Lights On Time"
            type="time"
            .value=${this._strategy.lightsOnTime}
            @change=${(e: CustomEvent) =>
        this._updateStrategyField(
          'lightsOnTime',
          (e.target as HTMLInputElement).value || e.detail
        )}
          ></md3-text-input>

          <md3-number-input
            label="P0 Duration (min)"
            .value=${this._strategy.p0DurationMinutes}
            @change=${(e: CustomEvent) =>
        this._updateStrategyField('p0DurationMinutes', parseInt(e.detail))}
          ></md3-number-input>

          <md3-number-input
            label="P2 Stop Buffer (min)"
            .value=${this._strategy.p2StopBeforeLightsOffMinutes}
            @change=${(e: CustomEvent) =>
        this._updateStrategyField('p2StopBeforeLightsOffMinutes', parseInt(e.detail))}
          ></md3-number-input>

          <h4 style="grid-column: span 2; margin: 4px 0; margin-top: 12px;">Dosing</h4>

          <md3-number-input
            label="Shot Duration (sec)"
            .value=${this._strategy.shotDurationSeconds}
            @change=${(e: CustomEvent) =>
        this._updateStrategyField('shotDurationSeconds', parseInt(e.detail))}
          ></md3-number-input>

          <md3-number-input
            label="Shot Interval (min)"
            .value=${this._strategy.shotIntervalMinutes}
            @change=${(e: CustomEvent) =>
        this._updateStrategyField('shotIntervalMinutes', parseInt(e.detail))}
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
    const addingTime = type === 'irrigation' ? this._addingIrrigationTime : this._addingDrainTime;

    return html`
      <div class="detail-card">
        <div
          style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;"
        >
          <h3 style="margin: 0;">${title}</h3>
          <button
            @click=${(e: Event) => {
        const container = (e.target as HTMLElement)
          .closest('.detail-card')
          ?.querySelector('.' + type + '-time-bar') as HTMLElement;
        if (container) {
          const rect = container.getBoundingClientRect();
          if (type === 'irrigation') {
            this._startAddingIrrigationTime(rect.width / 2, rect.width);
          } else {
            this._startAddingDrainTime(rect.width / 2, rect.width);
          }
        }
      }}
            class="md3-button primary"
            style="background: ${color};"
          >
            <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24">
              <path d="${mdiPlus}"></path>
            </svg>
            ADD TIME
          </button>
        </div>

        <div
          class="${type}-time-bar time-bar-container"
          @click=${(e: MouseEvent) => {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const x = e.clientX - rect.left;
        if (type === 'irrigation') {
          this._startAddingIrrigationTime(x, rect.width);
        } else {
          this._startAddingDrainTime(x, rect.width);
        }
      }}
          style="border: 2px solid ${color}40;"
        >
          ${Array.from({ length: 25 }, (_, i) => i).map(
        (hour) => html`
              <div
                class="time-tick ${hour % 6 === 0 ? 'major' : ''}"
                style="left: ${(hour / 24) * 100}%;"
              >
                ${hour % 3 === 0
            ? html` <span class="time-label">${hour.toString().padStart(2, '0')}:00</span> `
            : ''}
              </div>
            `
      )}
          ${times.map((t: IrrigationTime) => {
        const [hours, minutes] = t.time.split(':').map(Number);
        const position = ((hours + minutes / 60) / 24) * 100;
        return html`
              <div
                class="chart-marker"
                @click=${(e: Event) => {
            e.stopPropagation();
            if (confirm(`Remove ${type} time ${t.time}?`)) {
              if (type === 'irrigation') {
                this._removeIrrigationTime(t.time);
              } else {
                this._removeDrainTime(t.time);
              }
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

        ${addingTime
        ? html`
              <div
                class="overlay-backdrop"
                @click=${() =>
            type === 'irrigation'
              ? (this._addingIrrigationTime = undefined)
              : (this._addingDrainTime = undefined)}
              >
                <div
                  class="detail-card"
                  style="max-width: 400px; margin: 0; background: #2d2d2d; width: 90%;"
                  @click=${(e: Event) => e.stopPropagation()}
                >
                  <h3>Add ${title} Time</h3>

                  <md3-text-input
                    label="Time"
                    type="time"
                    .value=${addingTime.time}
                    @change=${(e: CustomEvent) => {
            const val = (e.target as HTMLInputElement).value || e.detail; // md3-text-input uses detail
            if (type === 'irrigation' && this._addingIrrigationTime)
              this._addingIrrigationTime = {
                ...this._addingIrrigationTime,
                time: val,
              };
            if (type === 'drain' && this._addingDrainTime)
              this._addingDrainTime = { ...this._addingDrainTime, time: val };
          }}
                  ></md3-text-input>

                  <md3-number-input
                    label="Duration (seconds)"
                    .value=${addingTime.duration}
                    .min=${1}
                    @change=${(e: CustomEvent) => {
            console.log('DEBUG: Duration Change', e.detail);
            const val = parseInt(e.detail);
            if (!isNaN(val)) {
              if (type === 'irrigation' && this._addingIrrigationTime)
                this._addingIrrigationTime = {
                  ...this._addingIrrigationTime,
                  duration: val,
                };
              if (type === 'drain' && this._addingDrainTime)
                this._addingDrainTime = { ...this._addingDrainTime, duration: val };
            }
          }}
                  ></md3-number-input>

                  <div class="button-group">
                    <button
                      class="md3-button tonal"
                      @click=${() =>
            type === 'irrigation'
              ? (this._addingIrrigationTime = undefined)
              : (this._addingDrainTime = undefined)}
                    >
                      Cancel
                    </button>
                    <button
                      class="md3-button primary"
                      @click=${() => {
            if (type === 'irrigation') {
              this._addIrrigationTime(addingTime.time, addingTime.duration);
            } else {
              this._addDrainTime(addingTime.time, addingTime.duration);
            }
          }}
                      style="background: ${color};"
                    >
                      Add Schedule
                    </button>
                  </div>
                </div>
              </div>
            `
        : ''}
      </div>
    `;
  }
}
