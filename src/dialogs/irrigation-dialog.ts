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

  @property({ type: Object }) public returnPayload?: unknown;
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

  @state() private _editingIrrigationTime: {
    originalTime: string;  // Original time for backend removal
    originalDuration: number;  // Original duration for rollback
    time: string;          // Current time value (editable)
    duration: number;      // Current duration (editable)
  } | undefined;

  @state() private _editingDrainTime: {
    originalTime: string;
    time: string;
    duration: number;
  } | undefined;

  @state() private _pendingUndo: {
    type: 'irrigation' | 'drain';
    time: string;
    duration: number;
    timeoutId: number;  // setTimeout ID to clear on undo
  } | undefined;

  @state() private _errorToast: string | undefined;

  private _dataService?: DataService;

  static styles = [
    dialogStyles,
    css`
      :host {
        --mdc-dialog-min-width: clamp(400px, 80vw, 1400px);
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

      /* Tank Visualization Styles */
      .tank-card {
        background: #1e1e1e;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 16px;
        padding: 20px;
        transition: all 0.3s;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        display: flex;
        flex-direction: column;
        align-items: center;
        position: relative;
        overflow: hidden;
      }

      .tank-card.warning {
        border: 1px solid rgba(244, 67, 54, 0.5);
        box-shadow: 0 0 20px rgba(244, 67, 54, 0.2), inset 0 0 20px rgba(244, 67, 54, 0.1);
      }

      .tank-header {
        width: 100%;
        text-align: center;
        margin-bottom: 24px;
        z-index: 2;
      }

      .tank-header h4 {
        margin: 0;
        font-size: 1.1rem;
        font-weight: 500;
        color: rgba(255, 255, 255, 0.9);
      }

      /* Tank Body Structure */
      .tank-container {
        position: relative;
        width: 140px;
        height: 180px;
        display: flex;
        justify-content: center;
        margin-bottom: 16px;
      }

      .tank-cap {
        position: absolute;
        top: -12px;
        width: 50px;
        height: 12px;
        background: linear-gradient(to right, #2c3e50, #4a6fa5, #2c3e50);
        border-radius: 4px 4px 0 0;
        z-index: 1;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      }
      
      .tank-card.warning .tank-cap {
        background: linear-gradient(to right, #3e2723, #a54a4a, #3e2723);
      }

      .tank-cap-detail {
        position: absolute;
        top: -4px;
        width: 30px;
        height: 4px;
        left: 10px;
        background: inherit;
        border-radius: 2px 2px 0 0;
        opacity: 0.8;
      }

      .tank-body {
        position: relative;
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, #34495e, #2c3e50);
        border-radius: 16px;
        box-shadow: inset 2px 2px 5px rgba(255,255,255,0.1), inset -2px -2px 5px rgba(0,0,0,0.5), 0 5px 15px rgba(0,0,0,0.4);
        display: flex;
        justify-content: center;
        align-items: center;
        overflow: hidden;
      }

      .tank-card.warning .tank-body {
        background: linear-gradient(135deg, #4e342e, #3e2723);
      }

      /* Ribs */
      .tank-rib {
        position: absolute;
        left: -4px;
        width: 148px; 
        height: 12px;
        background: linear-gradient(to bottom, rgba(255,255,255,0.1), rgba(0,0,0,0.2));
        border-radius: 6px;
        z-index: 2;
      }

      .rib-top { top: 20px; }
      .rib-bottom { bottom: 20px; }

      /* Side Handles/Ribs */
      .side-rib {
        position: absolute;
        width: 8px;
        height: 80%;
        background: rgba(0,0,0,0.2);
        z-index: 2;
        border-radius: 2px;
      }
      .side-left { left: 4px; }
      .side-right { right: 4px; }

      /* Glass Window */
      .tank-window {
        width: 80%;
        height: 70%;
        background: rgba(0, 0, 0, 0.4);
        border-radius: 8px;
        position: relative;
        overflow: hidden;
        border: 1px solid rgba(255,255,255,0.1);
        box-shadow: inset 0 0 10px rgba(0,0,0,0.5);
        z-index: 1;
      }

      .liquid {
        position: absolute;
        bottom: 0;
        width: 100%;
        height: var(--level, 0%);
        background: linear-gradient(to bottom, #2196f3, #1976d2);
        transition: height 1s ease-out;
        opacity: 0.9;
      }

      .tank-card.warning .liquid {
        background: linear-gradient(to bottom, #f44336, #d32f2f);
      }

      .liquid-surface {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 10px;
        background: rgba(255,255,255,0.2);
        border-radius: 50%;
        transform: scaleX(1.5);
        filter: blur(2px);
      }

      .wave {
        position: absolute;
        top: -12px;
        left: 0;
        width: 200%;
        height: 20px;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 120' preserveAspectRatio='none'%3E%3Cpath d='M0,60 C300,100 900,20 1200,60 V120 H0 Z' fill='white' fill-opacity='0.2'/%3E%3C/svg%3E");
        background-repeat: repeat-x;
        background-size: 50% 100%;
        animation: wave-motion 4s linear infinite;
        z-index: 2;
      }

      @keyframes wave-motion {
        0% { transform: translateX(0); }
        100% { transform: translateX(-50%); }
      }

      /* Reflection overlay */
      .window-reflection {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 40%;
        background: linear-gradient(to bottom, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 100%);
        pointer-events: none;
        z-index: 5;
      }

      /* Percentage Text */
      .percentage-text {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 1.8rem;
        font-weight: 800;
        color: white;
        text-shadow: 0 2px 4px rgba(0,0,0,0.6);
        z-index: 10;
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .warning-icon {
        font-size: 1rem;
        color: #ffeb3b;
        animation: pulse 2s infinite;
      }

      @keyframes pulse {
        0% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.2); opacity: 0.8; }
        100% { transform: scale(1); opacity: 1; }
      }

      .tank-footer {
        font-size: 0.85rem;
        color: rgba(255, 255, 255, 0.6);
        margin-top: 8px;
      }
    `,
  ];

  @state() private _activeTab: 'schedules' | 'steering' | 'config' | 'tanks' = 'schedules';
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
      // Ensure time is in HH:MM:SS format (append :00 if only HH:MM)
      const formattedTime = time.includes(':') && time.split(':').length === 2 ? `${time}:00` : time;

      await this._dataService.addIrrigationTime({
        growspaceId: this.device.deviceId,
        time: formattedTime,
        duration: duration || this._irrigationDuration,
      });

      // Optimistic update
      const newTime: IrrigationTime = { time: formattedTime, duration: duration || this._irrigationDuration };
      this._irrigationTimes = [...this._irrigationTimes, newTime].sort((a, b) => {
        const timeA = a.time || a.start_time || '';
        const timeB = b.time || b.start_time || '';
        return timeA.localeCompare(timeB);
      });
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
      // Ensure time is in HH:MM:SS format (append :00 if only HH:MM)
      const formattedTime = time.includes(':') && time.split(':').length === 2 ? `${time}:00` : time;

      await this._dataService.addDrainTime({
        growspaceId: this.device.deviceId,
        time: formattedTime,
        duration: duration || this._drainDuration,
      });

      // Optimistic update
      const newTime: IrrigationTime = { time: formattedTime, duration: duration || this._drainDuration };
      this._drainTimes = [...this._drainTimes, newTime].sort((a, b) => {
        const timeA = a.time || a.start_time || '';
        const timeB = b.time || b.start_time || '';
        return timeA.localeCompare(timeB);
      });
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

  private _startEditingIrrigationTime(timeStr: string, duration: number) {
    this._editingIrrigationTime = {
      originalTime: timeStr,
      originalDuration: duration,
      time: timeStr.substring(0, 5), // HH:MM format for input
      duration: duration,
    };
  }

  private _startEditingDrainTime(timeStr: string, duration: number) {
    this._editingDrainTime = {
      originalTime: timeStr,
      time: timeStr.substring(0, 5), // HH:MM format for input
      duration: duration,
    };
  }

  private async _saveEditedIrrigationTime() {
    if (!this._editingIrrigationTime || !this.device?.deviceId || !this._dataService) {
      return;
    }

    const { originalTime, originalDuration, time, duration } = this._editingIrrigationTime;
    const formattedNewTime = time.includes(':') && time.split(':').length === 2
      ? `${time}:00`
      : time;

    // Check for duplicate time (only if time changed)
    if (originalTime !== formattedNewTime) {
      const isDuplicate = this._irrigationTimes.some(t => t.time === formattedNewTime);
      if (isDuplicate) {
        this._showErrorToast(`Irrigation time ${time} already exists`);
        return;
      }
    }

    try {
      // Step 1: Remove old time
      await this._dataService.removeIrrigationTime({
        growspaceId: this.device.deviceId,
        time: originalTime,
      });

      try {
        // Step 2: Add new time
        await this._dataService.addIrrigationTime({
          growspaceId: this.device.deviceId,
          time: formattedNewTime,
          duration: duration,
        });

        // Success - update UI
        this._irrigationTimes = this._irrigationTimes
          .filter(t => t.time !== originalTime)
          .concat([{ time: formattedNewTime, duration }])
          .sort((a, b) => (a.time || '').localeCompare(b.time || ''));

        this._editingIrrigationTime = undefined;
        this._notifyDataChanged();

      } catch (addError) {
        // Rollback: Re-add the original time
        console.error('Failed to add new time, rolling back:', addError);
        try {
          await this._dataService.addIrrigationTime({
            growspaceId: this.device.deviceId,
            time: originalTime,
            duration: originalDuration,
          });
          this._showErrorToast('Failed to save changes. Original time restored.');
          this._editingIrrigationTime = undefined;
        } catch (rollbackError) {
          console.error('Rollback failed:', rollbackError);
          this._showErrorToast('Failed to save changes. Please refresh and try again.');
          this._editingIrrigationTime = undefined;
        }
      }
    } catch (removeError) {
      console.error('Failed to remove old time:', removeError);
      this._showErrorToast('Failed to save changes. Please try again.');
    }
  }

  private _showErrorToast(message: string) {
    this._errorToast = message;
    setTimeout(() => {
      this._errorToast = undefined;
    }, 5000); // 5 second timeout
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

  private _updateStrategyField(field: keyof IrrigationStrategy, value: string | number | boolean) {
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
            <div
              class="tab-item ${this._activeTab === 'tanks' ? 'active' : ''}"
              @click=${() => (this._activeTab = 'tanks')}
            >
              Tanks
            </div>
          </div>

          <div class="dialog-body">
            ${this._activeTab === 'schedules'
        ? this._renderSchedulesTab(dialogColor)
        : this._activeTab === 'steering'
          ? this._renderSteeringTab(dialogColor)
          : this._activeTab === 'tanks'
            ? this._renderTanksTab()
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
              @change=${(e: Event) => this._updateStrategyField('enabled', (e.target as HTMLInputElement).checked)}
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
          ${times.filter((t: IrrigationTime) => t && (t.time || t.start_time)).map((t: IrrigationTime) => {
        const timeStr = (t.time || t.start_time)!; // Non-null assertion safe due to filter
        const timeParts = timeStr.split(':');
        const hours = Number(timeParts[0]);
        const minutes = Number(timeParts[1]);
        const position = ((hours + minutes / 60) / 24) * 100;
        const displayTime = timeStr.substring(0, 5); // HH:MM format
        const duration = t.duration || t.duration_seconds || defaultDuration;
        return html`
              <div
                class="chart-marker"
                @click=${(e: Event) => {
            e.stopPropagation();
            if (confirm(`Remove ${type} time ${displayTime}?`)) {
              if (type === 'irrigation') {
                this._removeIrrigationTime(timeStr);
              } else {
                this._removeDrainTime(timeStr);
              }
            }
          }}
                style="left: ${position}%; background: ${color}; box-shadow: 0 0 8px ${color};"
                title="${displayTime} | Duration: ${duration} seconds"
              >
                <div class="chart-tooltip" style="background: ${color};">
                  ${displayTime} | ${duration}s
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

  private _renderTanksTab() {
    const tanks = this.device?.environmentAttributes?.irrigationTanks || [];

    if (tanks.length === 0) {
      return html`
        <div class="detail-card" style="text-align: center; padding: 40px;">
          <p style="opacity: 0.7;">No irrigation tanks configured for this growspace.</p>
          <p style="font-size: 0.9rem; opacity: 0.5;">
            Configure tank sensors in the Environment Settings to monitor tank levels.
          </p>
        </div>
      `;
    }

    return html`
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px;">
        ${tanks.map(tank => this._renderTankCard(tank))}
      </div>
    `;
  }

  private _renderTankCard(tank: any) {
    const fillLevel = tank.fillLevel ?? 0;
    const isWarning = tank.isWarning;

    return html`
      <div class="tank-card ${isWarning ? 'warning' : ''}">
        <div class="tank-header">
          <h4>${tank.name}</h4>
        </div>
        
        <div class="tank-container">
          <div class="tank-cap"></div>
          <div class="tank-cap-detail"></div>
          
          <div class="tank-rib rib-top"></div>
          <div class="tank-rib rib-bottom"></div>
          
          <div class="tank-body">
            <div class="side-rib side-left"></div>
            <div class="side-rib side-right"></div>
            
            <div class="tank-window">
              <div class="window-reflection"></div>
              <div class="liquid" style="--level: ${fillLevel}%">
                <div class="wave"></div>
                <div class="liquid-surface"></div>
              </div>
              
              <div class="percentage-text">
                ${tank.fillLevel !== null && tank.fillLevel !== undefined ? `${fillLevel.toFixed(0)}%` : 'N/A'}
                ${isWarning ? html`<span class="warning-icon">⚠️</span>` : ''}
              </div>
            </div>
          </div>
        </div>

        <div class="tank-footer">
          Warning Level: ${tank.warningLevel}%
        </div>
      </div>
    `;
  }
}
