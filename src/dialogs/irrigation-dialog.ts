import { LitElement, html, css, PropertyValues, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant } from 'custom-card-helpers';
import { consume } from '@lit/context';
import { hassContext } from '../context';
import { mdiWater, mdiClose, mdiPlus } from '@mdi/js';
import { IrrigationTime, IrrigationStrategy, GrowspaceDevice, DrainECReading, TankWaterEvent } from '../types';
import { DataService } from '../data-service';
import { dialogStyles } from '../styles/dialog.styles';
import '../components/ui/md3-text-input';
import '../components/ui/md3-number-input';
import '../components/ui/md3-switch';
import '../components/ui/gs-help-tooltip';

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
    originalDuration: number;  // Original duration for rollback
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
        --ha-dialog-width-md: 95vw;
        --ha-dialog-max-width: 98vw;
        --ha-dialog-width-full: 98vw;
        --dialog-content-padding: 0;
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

      /* Toast Notification */
      .toast-notification {
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(50, 50, 50, 0.95);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        padding: 12px 16px;
        display: flex;
        align-items: center;
        gap: 16px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
        z-index: 10001; /* Above overlay-backdrop */
        animation: toast-slide-up 0.3s ease-out;
      }

      .toast-notification.error {
        background: rgba(244, 67, 54, 0.15);
        border-color: rgba(244, 67, 54, 0.3);
      }

      @keyframes toast-slide-up {
        from {
          opacity: 0;
          transform: translateX(-50%) translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }
      }

      .toast-message {
        color: rgba(255, 255, 255, 0.9);
        font-size: 0.9rem;
      }

      .toast-undo-button {
        background: transparent;
        border: 1px solid var(--stage-color, #2196f3);
        color: var(--stage-color, #2196f3);
        padding: 6px 16px;
        border-radius: 4px;
        cursor: pointer;
        font-weight: 500;
        font-size: 0.85rem;
        text-transform: uppercase;
        transition: all 0.2s;
      }

      .toast-undo-button:hover {
        background: rgba(33, 150, 243, 0.1);
        border-color: var(--stage-color, #2196f3);
      }

      .toast-undo-button:active {
        transform: scale(0.95);
      }

      /* Edit Dialog - Delete Button Styling */
      .md3-button.delete-button {
        background: rgba(244, 67, 54, 0.2) !important;
        color: #f44336 !important;
        border: 1px solid rgba(244, 67, 54, 0.3);
      }

      .md3-button.delete-button:hover {
        background: rgba(244, 67, 54, 0.3) !important;
        border-color: rgba(244, 67, 54, 0.5);
      }

      /* Edit Dialog - Button Layout */
      .edit-dialog-buttons {
        display: flex;
        gap: 8px;
        margin-top: 16px;
      }

      .edit-dialog-buttons .delete-button {
        flex: 0 0 auto;
      }

      .edit-dialog-buttons .spacer {
        flex: 1;
      }

      .edit-dialog-buttons .action-buttons {
        display: flex;
        gap: 8px;
      }

      /* Setup Hints */
      .setup-hints {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 12px 16px;
        background: rgba(255, 255, 255, 0.04);
        border: 1px dashed rgba(255, 255, 255, 0.12);
        border-radius: 12px;
        margin-top: 4px;
      }

      .setup-hint {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 0.82rem;
        color: rgba(255, 255, 255, 0.55);
        line-height: 1.4;
      }

      .setup-hint .hint-icon {
        flex-shrink: 0;
        font-size: 1rem;
      }
    `,
  ];

  /** All possible tab IDs */
  private static _tabLabels: Record<string, string> = {
    schedules: 'Schedules',
    steering: 'Crop Steering (VWC)',
    config: 'Configuration',
    tanks: 'Tanks',
    water_analytics: 'Water Analytics',
    drain_ec: 'Drain EC',
  };

  @state() private _activeTab: 'schedules' | 'steering' | 'config' | 'tanks' | 'water_analytics' | 'drain_ec' = 'schedules';

  /**
   * Compute which tabs should be visible based on the growspace's capabilities.
   * Pure derivation — no side effects.
   */
  private get _visibleTabs(): Array<'schedules' | 'steering' | 'config' | 'tanks' | 'water_analytics' | 'drain_ec'> {
    const tabs: Array<'schedules' | 'steering' | 'config' | 'tanks' | 'water_analytics' | 'drain_ec'> = ['schedules'];
    const env = this.device?.environmentAttributes;

    // Crop Steering (VWC): requires soil moisture sensor or active strategy
    const hasSoilMoisture = !!(env?.soilMoistureSensor)
      || (env?.soilMoistureSensors?.length ?? 0) > 0;
    const hasStrategy = !!this.device?.irrigationStrategy?.enabled;
    if (hasSoilMoisture || hasStrategy) {
      tabs.push('steering');
    }

    // Configuration: always shown
    tabs.push('config');

    // Tanks: only when tanks are configured
    const hasTanks = (env?.irrigationTanks?.length ?? 0) > 0;
    if (hasTanks) {
      tabs.push('tanks');
    }

    // Water Analytics: when there's data to show (tanks, usage, or drain readings)
    const hasWaterUsage = (this.device?.waterUsage?.litersToday ?? 0) > 0;
    const hasDrainReadings = (this.device?.drainConfig?.readings?.length ?? 0) > 0;
    if (hasTanks || hasWaterUsage || hasDrainReadings) {
      tabs.push('water_analytics');
    }

    // Drain EC: when drain monitoring is configured/active OR EC sensors exist
    const drainEnabled = !!this.device?.drainConfig?.enabled;
    const hasEcSensors =
      (env?.feedEcSensors?.length ?? 0) > 0 ||
      (env?.runoffEcSensors?.length ?? 0) > 0 ||
      (env?.substrateEcSensors?.length ?? 0) > 0 ||
      (env?.phSensors?.length ?? 0) > 0;
    if (drainEnabled || hasDrainReadings || hasEcSensors) {
      tabs.push('drain_ec');
    }

    return tabs;
  }

  /**
   * Generate setup hints for features that could be unlocked.
   * Only shown when the growspace is in a "minimal" configuration.
   */
  private get _setupHints(): Array<{ icon: string; text: string }> {
    const hints: Array<{ icon: string; text: string }> = [];
    const env = this.device?.environmentAttributes;
    const visible = this._visibleTabs;

    if (!visible.includes('steering')) {
      hints.push({
        icon: '🌱',
        text: 'Configure a soil moisture sensor in Environment Settings to enable VWC Crop Steering.',
      });
    }

    if (!visible.includes('tanks')) {
      hints.push({
        icon: '🪣',
        text: 'Add irrigation tanks in Environment Settings to track tank levels and water consumption.',
      });
    }

    if (!visible.includes('drain_ec')) {
      hints.push({
        icon: '🧪',
        text: 'Configure EC/pH sensors or enable drain monitoring to track nutrient runoff.',
      });
    }

    return hints;
  }
  @state() private _strategy: Partial<IrrigationStrategy> = {};

  // Drain EC state
  @state() private _drainEcEnabled = false;
  @state() private _drainEcMaxDelta = 1.0;
  @state() private _drainEcTargetRunoffPercent = 20;
  @state() private _drainLogFeedEc = 2.0;
  @state() private _drainLogDrainEc = 2.0;
  @state() private _drainLogFeedVolume = 0;
  @state() private _drainLogDrainVolume = 0;
  @state() private _drainSaving = false;
  @state() private _drainLogging = false;

  protected willUpdate(changedProps: PropertyValues): void {
    // Only initialize state when dialog first opens, not on subsequent device updates
    // This prevents overwriting optimistic UI updates during active editing
    if (changedProps.has('open') && this.open) {
      this._initializeState();
    }
    if (this.hass && (changedProps.has('hass') || !this._dataService)) {
      this._dataService = new DataService(this.hass);
    }

    // Tab fallback: if the active tab is no longer visible, reset to 'schedules'
    if (!this._visibleTabs.includes(this._activeTab)) {
      this._activeTab = 'schedules';
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

    // Initialize Drain EC config
    const dc = this.device.drainConfig;
    if (dc) {
      this._drainEcEnabled = dc.enabled;
      this._drainEcMaxDelta = dc.maxEcDelta;
      this._drainEcTargetRunoffPercent = dc.targetRunoffPercent;
    }
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
      throw e;
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
      throw e;
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
      throw e;
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
      throw e;
    }
  }

  private _notifyDataChanged() {
    this.dispatchEvent(new CustomEvent('data-changed', { bubbles: true, composed: true }));
  }

  private _startAddingIrrigationTime(x: number, width: number) {
    const percentage = Math.max(0, Math.min(1, x / width));
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
    const percentage = Math.max(0, Math.min(1, x / width));
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
      originalDuration: duration,
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

  private async _handleResetWaterTracking() {
    if (!this.device?.deviceId || !this._dataService) return;

    const confirmed = window.confirm(
      'Are you sure you want to reset all water tracking data for this growspace? This includes today\'s usage counters and volume history.'
    );

    if (!confirmed) return;

    try {
      await this._dataService.resetWaterTracking(this.device.deviceId);
      this._showErrorToast('Water tracking data reset successfully');
      this._notifyDataChanged();
    } catch (e) {
      console.error('Failed to reset water tracking:', e);
      this._showErrorToast('Failed to reset water tracking data');
    }
  }

  private _showErrorToast(message: string) {
    this._errorToast = message;
    setTimeout(() => {
      this._errorToast = undefined;
    }, 5000); // 5 second timeout
  }

  private async _saveEditedDrainTime() {
    if (!this._editingDrainTime || !this.device?.deviceId || !this._dataService) {
      return;
    }

    const { originalTime, originalDuration, time, duration } = this._editingDrainTime;
    const formattedNewTime = time.includes(':') && time.split(':').length === 2
      ? `${time}:00`
      : time;

    // Check for duplicate time (only if time changed)
    if (originalTime !== formattedNewTime) {
      const isDuplicate = this._drainTimes.some(t => t.time === formattedNewTime);
      if (isDuplicate) {
        this._showErrorToast(`Drain time ${time} already exists`);
        return;
      }
    }

    try {
      // Step 1: Remove old time
      await this._dataService.removeDrainTime({
        growspaceId: this.device.deviceId,
        time: originalTime,
      });

      try {
        // Step 2: Add new time
        await this._dataService.addDrainTime({
          growspaceId: this.device.deviceId,
          time: formattedNewTime,
          duration: duration,
        });

        // Success - update UI
        this._drainTimes = this._drainTimes
          .filter(t => t.time !== originalTime)
          .concat([{ time: formattedNewTime, duration }])
          .sort((a, b) => (a.time || '').localeCompare(b.time || ''));

        this._editingDrainTime = undefined;
        this._notifyDataChanged();

      } catch (addError) {
        // Rollback: Re-add the original time
        console.error('Failed to add new drain time, rolling back:', addError);
        try {
          await this._dataService.addDrainTime({
            growspaceId: this.device.deviceId,
            time: originalTime,
            duration: originalDuration,
          });
          this._showErrorToast('Failed to save changes. Original time restored.');
          this._editingDrainTime = undefined;
        } catch (rollbackError) {
          console.error('Rollback failed:', rollbackError);
          this._showErrorToast('Failed to save changes. Please refresh and try again.');
          this._editingDrainTime = undefined;
        }
      }
    } catch (removeError) {
      console.error('Failed to remove old drain time:', removeError);
      this._showErrorToast('Failed to save changes. Please try again.');
    }
  }

  private async _deleteIrrigationTimeFromEdit() {
    if (!this._editingIrrigationTime || !this.device?.deviceId || !this._dataService) {
      return;
    }

    const { originalTime, originalDuration } = this._editingIrrigationTime;

    try {
      // Delete from backend immediately
      await this._dataService.removeIrrigationTime({
        growspaceId: this.device.deviceId,
        time: originalTime,
      });

      // Optimistic UI update
      this._irrigationTimes = this._irrigationTimes.filter(t => t.time !== originalTime);

      // Close edit dialog
      this._editingIrrigationTime = undefined;

      // Show toast with undo (10 second timeout)
      this._showUndoToast('irrigation', originalTime, originalDuration);

      this._notifyDataChanged();
    } catch (e) {
      console.error('Failed to delete irrigation time:', e);
      this._showErrorToast('Failed to delete. Please try again.');
    }
  }

  private async _deleteDrainTimeFromEdit() {
    if (!this._editingDrainTime || !this.device?.deviceId || !this._dataService) {
      return;
    }

    const { originalTime, originalDuration } = this._editingDrainTime;

    try {
      // Delete from backend immediately
      await this._dataService.removeDrainTime({
        growspaceId: this.device.deviceId,
        time: originalTime,
      });

      // Optimistic UI update
      this._drainTimes = this._drainTimes.filter(t => t.time !== originalTime);

      // Close edit dialog
      this._editingDrainTime = undefined;

      // Show toast with undo (10 second timeout)
      this._showUndoToast('drain', originalTime, originalDuration);

      this._notifyDataChanged();
    } catch (e) {
      console.error('Failed to delete drain time:', e);
      this._showErrorToast('Failed to delete. Please try again.');
    }
  }

  private _showUndoToast(type: 'irrigation' | 'drain', time: string, duration: number) {
    // Clear any existing undo timeout
    if (this._pendingUndo?.timeoutId) {
      clearTimeout(this._pendingUndo.timeoutId);
    }

    const timeoutId = window.setTimeout(() => {
      this._pendingUndo = undefined;
    }, 10000); // 10 second timeout

    this._pendingUndo = {
      type,
      time,
      duration,
      timeoutId,
    };
  }

  private async _undoDelete() {
    if (!this._pendingUndo || !this.device?.deviceId || !this._dataService) {
      return;
    }

    const { type, time, duration, timeoutId } = this._pendingUndo;
    clearTimeout(timeoutId);

    // Close any open edit dialogs to prevent conflicts
    this._editingIrrigationTime = undefined;
    this._editingDrainTime = undefined;

    try {
      // Re-add the deleted time
      if (type === 'irrigation') {
        await this._addIrrigationTime(time, duration);
      } else {
        await this._addDrainTime(time, duration);
      }

      this._pendingUndo = undefined;
    } catch (e) {
      console.error('Failed to undo deletion:', e);
      this._showErrorToast('Failed to undo deletion. Please try again.');
    }
  }

  private _close() {
    // Clear any pending undo operations
    if (this._pendingUndo?.timeoutId) {
      clearTimeout(this._pendingUndo.timeoutId);
      this._pendingUndo = undefined;
    }

    // Clear edit states
    this._editingIrrigationTime = undefined;
    this._editingDrainTime = undefined;

    // Clear error toast
    this._errorToast = undefined;

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

  private async _saveDrainConfig() {
    if (!this.device?.deviceId || !this._dataService) return;
    this._drainSaving = true;
    try {
      await this._dataService.configureDrainMonitoring(this.device.deviceId, {
        enabled: this._drainEcEnabled,
        maxEcDelta: this._drainEcMaxDelta,
        targetRunoffPercent: this._drainEcTargetRunoffPercent,
      });
    } catch (e) {
      this._showErrorToast('Failed to save drain config');
    } finally {
      this._drainSaving = false;
    }
  }

  private async _logDrainReadingNow() {
    if (!this.device?.deviceId || !this._dataService) return;
    if (this._drainLogFeedEc <= 0 || this._drainLogDrainEc <= 0) {
      this._showErrorToast('Feed EC and Drain EC must be > 0');
      return;
    }
    this._drainLogging = true;
    try {
      await this._dataService.logDrainReading(this.device.deviceId, {
        feedEc: this._drainLogFeedEc,
        drainEc: this._drainLogDrainEc,
        feedVolumeMl: this._drainLogFeedVolume || undefined,
        drainVolumeMl: this._drainLogDrainVolume || undefined,
      });
    } catch (e) {
      this._showErrorToast('Failed to log drain reading');
    } finally {
      this._drainLogging = false;
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
        .escapeKeyAction=${'close'}
        width="full"
      >
        <div class="glass-dialog-container" style="--stage-color: ${dialogColor};">
          <!-- HEADER -->
          <div class="dialog-header">
            <div class="dialog-icon">
              <svg style="width:32px;height:32px;fill:currentColor;" viewBox="0 0 24 24">
                <path d="${mdiWater}"></path>
              </svg>
            </div>
            <div class="dialog-title-group">
              <div style="display:flex;align-items:center;gap:6px;">
                <h2 class="dialog-title">Irrigation Management</h2>
                <gs-help-tooltip
                  content="Schedule and manage irrigation events, soil moisture targets, and drain run-off cycles for this growspace."
                  placement="bottom"
                  label="Irrigation Management"
                ></gs-help-tooltip>
              </div>
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
            ${this._visibleTabs.map(
              (tab) => html`
                <div
                  class="tab-item ${this._activeTab === tab ? 'active' : ''}"
                  @click=${() => (this._activeTab = tab)}
                >
                  ${IrrigationDialog._tabLabels[tab]}
                </div>
              `
            )}
          </div>

          <div class="dialog-body">
            ${this._activeTab === 'schedules'
        ? this._renderSchedulesTab(dialogColor)
        : this._activeTab === 'steering'
          ? this._renderSteeringTab(dialogColor)
          : this._activeTab === 'tanks'
            ? this._renderTanksTab()
            : this._activeTab === 'water_analytics'
              ? this._renderWaterAnalyticsTab()
              : this._activeTab === 'drain_ec'
                ? this._renderDrainECTab()
                : this._renderConfigSection()}

            ${this._setupHints.length > 0
              ? html`
                <div class="setup-hints">
                  ${this._setupHints.map(
                    (hint) => html`
                      <div class="setup-hint">
                        <span class="hint-icon">${hint.icon}</span>
                        <span>${hint.text}</span>
                      </div>
                    `
                  )}
                </div>
              `
              : nothing}
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
            ${this._activeTab === 'drain_ec'
        ? html`
                  <button
                    class="md3-button primary"
                    style="background: #FF9800;"
                    @click=${this._saveDrainConfig}
                    ?disabled=${this._drainSaving}
                  >
                    ${this._drainSaving ? 'Saving…' : 'Save Drain Config'}
                  </button>
                `
        : ''}
          </div>

          ${this._pendingUndo
        ? html`
                <div class="toast-notification">
                  <span class="toast-message">
                    Deleted ${this._pendingUndo.type} time ${this._pendingUndo.time.substring(0, 5)}
                  </span>
                  <button class="toast-undo-button" @click=${this._undoDelete}>
                    UNDO
                  </button>
                </div>
              `
        : ''}

          ${this._errorToast
        ? html`
                <div class="toast-notification error">
                  <span class="toast-message">${this._errorToast}</span>
                </div>
              `
        : ''}
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
    if (!this.hass?.states) return [];
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
    const editingTime = type === 'irrigation' ? this._editingIrrigationTime : this._editingDrainTime;

    return html`
      <div class="detail-card">
        <div
          style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;"
        >
          <div style="display:flex;align-items:center;gap:6px;">
            <h3 style="margin: 0;">${title}</h3>
            <gs-help-tooltip
              content=${type === 'irrigation'
                ? 'Each marker is a scheduled irrigation event. The first irrigation of the day (P1) wakes up the substrate. Subsequent shots (P2) maintain moisture. The last shot (P3) ends 1–2 hours before lights off to allow a night dry-back.'
                : 'Each marker is a scheduled drain event. Run drain after irrigation to remove excess runoff from the tray or slab. Align drain events with your irrigation schedule to prevent waterlogging.'}
              placement="top"
              label=${type === 'irrigation' ? 'Irrigation Schedule' : 'Drain Schedule'}
            ></gs-help-tooltip>
          </div>
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
            if (type === 'irrigation') {
              this._startEditingIrrigationTime(timeStr, duration);
            } else {
              this._startEditingDrainTime(timeStr, duration);
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

                  <div style="display:flex;align-items:center;gap:4px;margin-bottom:4px;font-size:0.875rem;color:var(--secondary-text-color);">
                    <span>${type === 'irrigation' ? 'Shot Duration (seconds)' : 'Drain Duration (seconds)'}</span>
                    <gs-help-tooltip
                      content=${type === 'irrigation'
                        ? 'How long the irrigation pump runs per shot. Shorter shots = smaller volume delivered. Adjust until your substrate reaches your target VWC peak. Typical: 15–120 seconds per shot.'
                        : 'How long the drain pump runs after irrigation. Ensures excess runoff is removed from the tray/slab. Too short = waterlogging. Too long = excessive runoff.'}
                      placement="right"
                      label=${type === 'irrigation' ? 'Shot Duration' : 'Drain Duration'}
                    ></gs-help-tooltip>
                  </div>
                  <md3-number-input
                    label="Duration (seconds)"
                    .value=${addingTime.duration}
                    .min=${1}
                    @change=${(e: CustomEvent) => {

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
              this._addIrrigationTime(addingTime.time, addingTime.duration).catch(() => {});
            } else {
              this._addDrainTime(addingTime.time, addingTime.duration).catch(() => {});
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

      ${editingTime
        ? html`
            <div
              class="overlay-backdrop"
              @click=${() =>
            type === 'irrigation'
              ? (this._editingIrrigationTime = undefined)
              : (this._editingDrainTime = undefined)}
            >
              <div
                class="detail-card"
                style="max-width: 400px; margin: 0; background: #2d2d2d; width: 90%;"
                @click=${(e: Event) => e.stopPropagation()}
              >
                <h3>Edit ${title} Time</h3>

                <md3-text-input
                  label="Time"
                  type="time"
                  .value=${editingTime.time}
                  @change=${(e: CustomEvent) => {
            const val = (e.target as HTMLInputElement).value || e.detail;
            if (type === 'irrigation' && this._editingIrrigationTime) {
              this._editingIrrigationTime = {
                ...this._editingIrrigationTime,
                time: val,
              };
            }
            if (type === 'drain' && this._editingDrainTime) {
              this._editingDrainTime = {
                ...this._editingDrainTime,
                time: val,
              };
            }
          }}
                ></md3-text-input>

                <div style="display:flex;align-items:center;gap:4px;margin-bottom:4px;font-size:0.875rem;color:var(--secondary-text-color);">
                  <span>${type === 'irrigation' ? 'Shot Duration (seconds)' : 'Drain Duration (seconds)'}</span>
                  <gs-help-tooltip
                    content=${type === 'irrigation'
                      ? 'How long the irrigation pump runs per shot. Shorter shots = smaller volume delivered. Adjust until your substrate reaches your target VWC peak. Typical: 15–120 seconds per shot.'
                      : 'How long the drain pump runs after irrigation. Ensures excess runoff is removed from the tray/slab. Too short = waterlogging. Too long = excessive runoff.'}
                    placement="right"
                    label=${type === 'irrigation' ? 'Shot Duration' : 'Drain Duration'}
                  ></gs-help-tooltip>
                </div>
                <md3-number-input
                  label="Duration (seconds)"
                  .value=${editingTime.duration}
                  .min=${1}
                  @change=${(e: CustomEvent) => {
            const val = parseInt(e.detail);
            if (!isNaN(val)) {
              if (type === 'irrigation' && this._editingIrrigationTime) {
                this._editingIrrigationTime = {
                  ...this._editingIrrigationTime,
                  duration: val,
                };
              }
              if (type === 'drain' && this._editingDrainTime) {
                this._editingDrainTime = {
                  ...this._editingDrainTime,
                  duration: val,
                };
              }
            }
          }}
                ></md3-number-input>

                <div class="edit-dialog-buttons">
                  <button
                    class="md3-button delete-button"
                    @click=${() =>
            type === 'irrigation'
              ? this._deleteIrrigationTimeFromEdit()
              : this._deleteDrainTimeFromEdit()}
                  >
                    Delete
                  </button>

                  <div class="spacer"></div>

                  <div class="action-buttons">
                    <button
                      class="md3-button tonal"
                      @click=${() =>
            type === 'irrigation'
              ? (this._editingIrrigationTime = undefined)
              : (this._editingDrainTime = undefined)}
                    >
                      Cancel
                    </button>
                    <button
                      class="md3-button primary"
                      @click=${() => {
            if (type === 'irrigation') {
              this._saveEditedIrrigationTime();
            } else {
              this._saveEditedDrainTime();
            }
          }}
                      style="background: ${color};"
                    >
                      Save Changes
                    </button>
                  </div>
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

  private _renderWaterAnalyticsTab() {
    const wu = this.device?.waterUsage;
    const tanks = this.device?.environmentAttributes?.irrigationTanks || [];
    const irrigTimes = this.device?.irrigationConfig?.irrigationTimes || [];
    const drainTimes = this.device?.irrigationConfig?.drainTimes || [];
    const readings = this.device?.drainConfig?.readings || [];

    // Compute volume totals from logged EC readings (last 30)
    const recentReadings = readings.slice(-30).reverse();
    const readingsWithVolumes = recentReadings.filter(r => r.feedVolumeMl && r.drainVolumeMl);
    const totalFeedMl = readingsWithVolumes.reduce((s, r) => s + (r.feedVolumeMl || 0), 0);
    const totalDrainMl = readingsWithVolumes.reduce((s, r) => s + (r.drainVolumeMl || 0), 0);
    const avgRunoff = totalFeedMl > 0 ? (totalDrainMl / totalFeedMl) * 100 : null;

    // Tank aggregate
    const tanksWithData = tanks.filter(t => t.fillLevel !== null && t.fillLevel !== undefined);
    const avgTankLevel = tanksWithData.length > 0
      ? tanksWithData.reduce((s, t) => s + (t.fillLevel ?? 0), 0) / tanksWithData.length
      : null;
    const warningTanks = tanks.filter(t => t.isWarning);

    // Schedule analysis
    const totalIrrig = irrigTimes.length;
    const totalDrain = drainTimes.length;
    const irrigDuration = this.device?.irrigationConfig?.irrigationDuration ?? 0;
    const drainDuration = this.device?.irrigationConfig?.drainDuration ?? 0;

    // Tank-derived water analysis (when no flow/drain sensors configured)
    const tanksWithHistory = tanks.filter(t => t.volumeLiters != null && t.waterHistory?.events?.length);
    const allTankEvents: TankWaterEvent[] = tanksWithHistory.flatMap(t => t.waterHistory!.events);
    const now = new Date();
    const dayStart = new Date(now);
    dayStart.setUTCHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const tankLitersToday = allTankEvents
      .filter(e => e.event_type === 'consumption' && new Date(e.timestamp) >= dayStart)
      .reduce((s, e) => s + e.liters, 0);
    const tankLiters7d = allTankEvents
      .filter(e => e.event_type === 'consumption' && new Date(e.timestamp) >= sevenDaysAgo)
      .reduce((s, e) => s + e.liters, 0);
    // Build 24h consumption buckets (96 × 15 min) for bar chart
    const bucket15Min = 15 * 60 * 1000;
    const bucketCount24h = 96;
    const chartEnd = Math.ceil(now.getTime() / bucket15Min) * bucket15Min;
    const chartStart = chartEnd - bucketCount24h * bucket15Min;
    const consumptionBuckets24h = Array.from({ length: bucketCount24h }, (_, i) => ({
      start: chartStart + i * bucket15Min,
      liters: 0,
    }));
    for (const ev of allTankEvents) {
      if (ev.event_type !== 'consumption') continue;
      const ts = new Date(ev.timestamp).getTime();
      if (ts < chartStart || ts >= chartEnd) continue;
      const idx = Math.floor((ts - chartStart) / bucket15Min);
      if (idx >= 0 && idx < bucketCount24h) consumptionBuckets24h[idx].liters += ev.liters;
    }
    const maxBucketLiters = Math.max(...consumptionBuckets24h.map(b => b.liters), 0.01);
    const recentRefills = allTankEvents
      .filter(e => e.event_type === 'refill')
      .slice(-10)
      .reverse();

    // --- KPI helper ---
    const kpiCard = (label: string, value: string, unit: string, color = 'rgba(255,255,255,0.7)', sub?: string) => html`
      <div style="
        background: rgba(255,255,255,0.05);
        border-radius: 12px;
        padding: 16px 20px;
        display: flex;
        flex-direction: column;
        gap: 4px;
      ">
        <div style="font-size: 0.78rem; opacity: 0.6; text-transform: uppercase; letter-spacing: 0.05em;">${label}</div>
        <div style="display: flex; align-items: baseline; gap: 4px;">
          <span style="font-size: 1.6rem; font-weight: 700; color: ${color};">${value}</span>
          <span style="font-size: 0.82rem; opacity: 0.6;">${unit}</span>
        </div>
        ${sub ? html`<div style="font-size: 0.75rem; opacity: 0.5;">${sub}</div>` : nothing}
      </div>
    `;

    return html`
      <!-- Today's Usage -->
      <div class="detail-card">
        <h3 style="margin-top: 0; margin-bottom: 16px;">Today's Usage</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px;">
          ${wu?.litersToday != null
        ? kpiCard('Liters today', wu.litersToday.toFixed(1), 'L', '#4fc3f7')
        : kpiCard('Liters today', '—', '', 'rgba(255,255,255,0.4)')}

          ${wu?.litersPerPlantPerDay != null
        ? kpiCard('Per plant / day', wu.litersPerPlantPerDay.toFixed(2), 'L', '#81c784')
        : kpiCard('Per plant / day', '—', '', 'rgba(255,255,255,0.4)')}

          ${wu?.waterEfficiency != null
        ? kpiCard(
          'Water efficiency',
          (wu.waterEfficiency * 100).toFixed(0),
          '%',
          wu.waterEfficiency >= 0.85 ? '#4caf50' : wu.waterEfficiency >= 0.65 ? '#FF9800' : '#f44336',
          wu.waterEfficiency >= 0.85 ? 'Excellent' : wu.waterEfficiency >= 0.65 ? 'Good' : 'Review schedule'
        )
        : kpiCard('Water efficiency', '—', '', 'rgba(255,255,255,0.4)')}

          ${avgRunoff !== null
        ? kpiCard('Avg runoff', avgRunoff.toFixed(1), '%', '#ce93d8', `from ${readingsWithVolumes.length} reading${readingsWithVolumes.length !== 1 ? 's' : ''}`)
        : kpiCard('Avg runoff', '—', '', 'rgba(255,255,255,0.4)', 'Log volumes in Drain EC tab')}
        </div>
      </div>

      <!-- Tank Overview -->
      ${tanks.length > 0 ? html`
        <div class="detail-card">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
            <h3 style="margin: 0;">Tank Levels</h3>
            ${warningTanks.length > 0 ? html`
              <span style="
                background: rgba(244, 67, 54, 0.2);
                color: #f44336;
                border: 1px solid rgba(244,67,54,0.4);
                border-radius: 20px;
                padding: 3px 10px;
                font-size: 0.78rem;
                font-weight: 600;
              ">⚠ ${warningTanks.length} tank${warningTanks.length > 1 ? 's' : ''} low</span>
            ` : avgTankLevel !== null ? html`
              <span style="font-size: 0.82rem; opacity: 0.5;">Avg ${avgTankLevel.toFixed(0)}%</span>
            ` : nothing}
          </div>

          <div style="display: flex; flex-direction: column; gap: 10px;">
            ${tanks.map(tank => {
          const pct = tank.fillLevel ?? 0;
          const color = tank.isWarning ? '#f44336'
            : (tank.hoursRemaining ?? 999) < 24 ? '#FF9800'
              : '#4caf50';
          const depletionLabel = tank.depletionStatus === 'depleting' ? '↓ Depleting'
            : tank.depletionStatus === 'refilling' ? '↑ Refilling'
              : tank.depletionStatus === 'static' ? '— Stable'
                : '';
          return html`
                <div>
                  <div style="display: flex; justify-content: space-between; font-size: 0.82rem; margin-bottom: 4px;">
                    <span style="font-weight: 500;">${tank.name}</span>
                    <span style="opacity: 0.7; display: flex; gap: 8px;">
                      ${depletionLabel ? html`<span style="opacity: 0.6; font-size: 0.75rem;">${depletionLabel}</span>` : nothing}
                      ${tank.hoursRemaining != null ? html`<span style="opacity: 0.6;">${tank.hoursRemaining >= 48 ? Math.floor(tank.hoursRemaining / 24) + 'd' : Math.round(tank.hoursRemaining) + 'h'} left</span>` : nothing}
                      <span style="color: ${color}; font-weight: 600;">${tank.fillLevel !== null ? pct.toFixed(0) + '%' : '—'}</span>
                    </span>
                  </div>
                  <div style="height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden;">
                    <div style="
                      height: 100%;
                      width: ${Math.max(0, Math.min(100, pct))}%;
                      background: ${color};
                      border-radius: 3px;
                      transition: width 0.4s ease;
                    "></div>
                  </div>
                </div>
              `;
        })}
          </div>
        </div>
      ` : nothing}

      <!-- Tank-Derived Water Analysis -->
      ${tanksWithHistory.length > 0 ? html`
        <div class="detail-card">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
            <h3 style="margin: 0;">Tank-Derived Water Usage</h3>
            <span style="font-size: 0.78rem; opacity: 0.5; background: rgba(79,195,247,0.1); border: 1px solid rgba(79,195,247,0.25); border-radius: 20px; padding: 2px 10px;">inferred from tank level</span>
          </div>

          <!-- KPIs -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 20px;">
            ${kpiCard('Consumed today', tankLitersToday > 0 ? tankLitersToday.toFixed(1) : '—', tankLitersToday > 0 ? 'L' : '', '#4fc3f7')}
            ${kpiCard('Last 7 days', tankLiters7d > 0 ? tankLiters7d.toFixed(1) : '—', tankLiters7d > 0 ? 'L' : '', '#81c784')}
            ${kpiCard('Avg per day', tankLiters7d > 0 ? (tankLiters7d / 7).toFixed(1) : '—', tankLiters7d > 0 ? 'L/day' : '', '#ce93d8')}
          </div>

          <!-- 24h bar chart -->
          <div style="margin-bottom: 6px;">
            <div style="font-size: 0.78rem; opacity: 0.55; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 10px;">Consumption — last 24 hours (15 min buckets)</div>
            <div style="display: flex; align-items: flex-end; gap: 1px; height: 60px; background: rgba(255,255,255,0.03); border-radius: 6px; padding: 6px 4px 0;">
              ${consumptionBuckets24h.map(b => {
                const heightPct = (b.liters / maxBucketLiters) * 100;
                const label = new Date(b.start).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
                return html`
                  <div
                    title="${label} — ${b.liters.toFixed(2)} L"
                    style="
                      flex: 1;
                      height: ${Math.max(2, heightPct)}%;
                      background: ${b.liters > 0 ? '#4fc3f7' : 'rgba(255,255,255,0.06)'};
                      border-radius: 2px 2px 0 0;
                      min-width: 0;
                      transition: background 0.2s;
                    "
                  ></div>
                `;
              })}
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 0.68rem; opacity: 0.45; margin-top: 4px; padding: 0 2px;">
              <span>24h ago</span>
              <span>12h ago</span>
              <span>now</span>
            </div>
          </div>

          <!-- Recent refill events -->
          ${recentRefills.length > 0 ? html`
            <div style="margin-top: 16px;">
              <div style="font-size: 0.78rem; opacity: 0.55; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">Recent refills</div>
              <div style="display: flex; flex-direction: column; gap: 4px;">
                ${recentRefills.map(ev => html`
                  <div style="
                    display: flex; justify-content: space-between; align-items: center;
                    background: rgba(129,199,132,0.08); border-radius: 6px;
                    padding: 5px 10px; font-size: 0.82rem;
                  ">
                    <span style="opacity: 0.65;">
                      ${new Date(ev.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span style="color: #81c784; font-weight: 600;">+${ev.liters.toFixed(1)} L</span>
                  </div>
                `)}
              </div>
            </div>
          ` : nothing}
        </div>
      ` : nothing}

      <!-- Irrigation Schedule Summary (only when at least one schedule is defined) -->
      ${(totalIrrig > 0 || totalDrain > 0) ? html`
      <div class="detail-card">
        <h3 style="margin-top: 0; margin-bottom: 16px;">Schedule Summary</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
          <!-- Irrigation side -->
          <div>
            <div style="font-size: 0.8rem; opacity: 0.6; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">Irrigation</div>
            ${totalIrrig === 0 ? html`<p style="opacity: 0.5; font-size: 0.85rem; margin: 0;">No events scheduled</p>` : html`
              <div style="font-size: 1.3rem; font-weight: 700; color: #4fc3f7;">${totalIrrig} <span style="font-size: 0.85rem; font-weight: 400; opacity: 0.7;">events/day</span></div>
              ${irrigDuration ? html`<div style="font-size: 0.82rem; opacity: 0.6; margin-top: 2px;">${irrigDuration}s per event</div>` : nothing}
              <div style="margin-top: 10px; display: flex; flex-direction: column; gap: 4px;">
                ${irrigTimes.slice(0, 5).map(t => {
          const time = t.time ?? t.start_time ?? '';
          const dur = t.duration ?? t.duration_seconds ?? irrigDuration;
          return html`
                    <div style="
                      display: flex; justify-content: space-between;
                      background: rgba(79,195,247,0.08); border-radius: 6px;
                      padding: 4px 10px; font-size: 0.8rem;
                    ">
                      <span style="font-weight: 500;">${time.substring(0, 5)}</span>
                      <span style="opacity: 0.5;">${dur}s</span>
                    </div>
                  `;
        })}
                ${totalIrrig > 5 ? html`<div style="font-size: 0.75rem; opacity: 0.4; text-align: center;">+${totalIrrig - 5} more</div>` : nothing}
              </div>
            `}
          </div>

          <!-- Drain side -->
          <div>
            <div style="font-size: 0.8rem; opacity: 0.6; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">Drain</div>
            ${totalDrain === 0 ? html`<p style="opacity: 0.5; font-size: 0.85rem; margin: 0;">No events scheduled</p>` : html`
              <div style="font-size: 1.3rem; font-weight: 700; color: #a5d6a7;">${totalDrain} <span style="font-size: 0.85rem; font-weight: 400; opacity: 0.7;">events/day</span></div>
              ${drainDuration ? html`<div style="font-size: 0.82rem; opacity: 0.6; margin-top: 2px;">${drainDuration}s per event</div>` : nothing}
              <div style="margin-top: 10px; display: flex; flex-direction: column; gap: 4px;">
                ${drainTimes.slice(0, 5).map(t => {
          const time = t.time ?? t.start_time ?? '';
          const dur = t.duration ?? t.duration_seconds ?? drainDuration;
          return html`
                    <div style="
                      display: flex; justify-content: space-between;
                      background: rgba(165,214,167,0.08); border-radius: 6px;
                      padding: 4px 10px; font-size: 0.8rem;
                    ">
                      <span style="font-weight: 500;">${time.substring(0, 5)}</span>
                      <span style="opacity: 0.5;">${dur}s</span>
                    </div>
                  `;
        })}
                ${totalDrain > 5 ? html`<div style="font-size: 0.75rem; opacity: 0.4; text-align: center;">+${totalDrain - 5} more</div>` : nothing}
              </div>
            `}
          </div>
        </div>
      </div>
      ` : nothing}

      <!-- Volume History from EC readings (only when a drain sensor is configured) -->
      ${this._drainPumpEntity ? html`
      <div class="detail-card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
          <h3 style="margin: 0;">Volume History</h3>
          <span style="font-size: 0.8rem; opacity: 0.5;">from drain EC readings</span>
        </div>

        ${readingsWithVolumes.length === 0 ? html`
          <p style="opacity: 0.6; text-align: center; padding: 20px 0; font-size: 0.9rem;">
            No volume data logged yet.<br>
            <span style="font-size: 0.8rem; opacity: 0.7;">Log feed and drain volumes in the
            <strong>Drain EC</strong> tab to track runoff efficiency over time.</span>
          </p>
        ` : html`
          <!-- Totals bar -->
          <div style="
            display: grid; grid-template-columns: 1fr 1fr 1fr;
            gap: 12px; margin-bottom: 16px;
            background: rgba(255,255,255,0.04);
            border-radius: 10px; padding: 12px 16px;
            font-size: 0.88rem;
          ">
            <div style="text-align: center;">
              <div style="opacity: 0.5; font-size: 0.75rem;">Total feed</div>
              <div style="font-weight: 700; color: #4fc3f7;">${(totalFeedMl / 1000).toFixed(1)} L</div>
            </div>
            <div style="text-align: center;">
              <div style="opacity: 0.5; font-size: 0.75rem;">Total drain</div>
              <div style="font-weight: 700; color: #a5d6a7;">${(totalDrainMl / 1000).toFixed(1)} L</div>
            </div>
            <div style="text-align: center;">
              <div style="opacity: 0.5; font-size: 0.75rem;">Avg runoff</div>
              <div style="font-weight: 700; color: ${avgRunoff !== null && avgRunoff >= 15 && avgRunoff <= 35 ? '#4caf50' : '#FF9800'};">
                ${avgRunoff !== null ? avgRunoff.toFixed(1) + '%' : '—'}
              </div>
            </div>
          </div>

          <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
              <thead>
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.15); opacity: 0.7;">
                  <th style="text-align: left; padding: 5px 8px; font-weight: 500;">Time</th>
                  <th style="text-align: right; padding: 5px 8px; font-weight: 500;">Feed (mL)</th>
                  <th style="text-align: right; padding: 5px 8px; font-weight: 500;">Drain (mL)</th>
                  <th style="text-align: right; padding: 5px 8px; font-weight: 500;">Runoff</th>
                  <th style="text-align: right; padding: 5px 8px; font-weight: 500;">Δ EC</th>
                </tr>
              </thead>
              <tbody>
                ${readingsWithVolumes.map(r => {
          const runoff = r.feedVolumeMl ? ((r.drainVolumeMl! / r.feedVolumeMl!) * 100) : null;
          const delta = r.drainEc - r.feedEc;
          const runoffOk = runoff !== null && runoff >= 10 && runoff <= 40;
          return html`
                    <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
                      <td style="padding: 5px 8px; opacity: 0.65;">
                        ${new Date(r.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td style="text-align: right; padding: 5px 8px;">${r.feedVolumeMl}</td>
                      <td style="text-align: right; padding: 5px 8px;">${r.drainVolumeMl}</td>
                      <td style="text-align: right; padding: 5px 8px; font-weight: 600; color: ${runoffOk ? '#4caf50' : '#FF9800'};">
                        ${runoff !== null ? runoff.toFixed(1) + '%' : '—'}
                      </td>
                      <td style="text-align: right; padding: 5px 8px; opacity: 0.7;">
                        ${delta >= 0 ? '+' : ''}${delta.toFixed(2)}
                      </td>
                    </tr>
                  `;
        })}
              </tbody>
            </table>
          </div>
        `}
      </div>
      ` : nothing}

      <!-- Maintenance -->
      <div class="detail-card" style="border: 1px dashed rgba(244, 67, 54, 0.3); background: rgba(244, 67, 54, 0.05); margin-top: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 16px;">
          <div style="flex: 1;">
            <h3 style="margin: 0; color: #f44336; border: none; padding: 0; font-size: 1.1rem;">Maintenance</h3>
            <p style="margin: 4px 0 0 0; font-size: 0.85rem; opacity: 0.7; line-height: 1.4;">
              Reset irrigation counters, today's water usage, and recent volume history for this growspace.
            </p>
          </div>
          <button 
            class="md3-button tonal error" 
            @click=${this._handleResetWaterTracking}
            style="white-space: nowrap;"
          >
            Reset All Data
          </button>
        </div>
      </div>
    `;
  }

  private _renderDrainECTab() {
    const dc = this.device?.drainConfig;
    const readings: DrainECReading[] = dc?.readings || [];
    const recent = readings.slice(-20).reverse();
    const lastReading = recent[0];
    const lastDelta = lastReading ? (lastReading.drainEc - lastReading.feedEc) : null;
    const isOverThreshold = lastDelta !== null && this._drainEcEnabled && lastDelta > this._drainEcMaxDelta;

    const statusColor = !this._drainEcEnabled
      ? 'rgba(255,255,255,0.3)'
      : isOverThreshold
        ? '#f44336'
        : lastDelta !== null && lastDelta > this._drainEcMaxDelta * 0.7
          ? '#FF9800'
          : '#4caf50';

    const statusText = !this._drainEcEnabled
      ? 'Monitoring disabled'
      : lastDelta === null
        ? 'No readings yet'
        : isOverThreshold
          ? `Salt buildup alert — Δ${lastDelta.toFixed(2)} mS/cm above threshold`
          : `EC OK — Δ${lastDelta.toFixed(2)} mS/cm`;

    return html`
      <!-- Status Banner -->
      <div class="detail-card" style="border-left: 4px solid ${statusColor}; padding: 16px 20px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="
            width: 14px; height: 14px; border-radius: 50%;
            background: ${statusColor};
            box-shadow: 0 0 8px ${statusColor};
            flex-shrink: 0;
          "></div>
          <div>
            <div style="font-weight: 600; font-size: 1rem;">${statusText}</div>
            ${lastReading ? html`
              <div style="font-size: 0.8rem; opacity: 0.6; margin-top: 2px;">
                Last reading: Feed ${lastReading.feedEc.toFixed(2)} → Drain ${lastReading.drainEc.toFixed(2)} mS/cm
                at ${new Date(lastReading.timestamp).toLocaleString()}
              </div>
            ` : nothing}
          </div>
        </div>
      </div>

      <!-- Configuration -->
      <div class="detail-card">
        <h3 style="margin-top: 0;">Monitoring Configuration</h3>
        <p style="font-size: 0.82rem; opacity: 0.7; margin-bottom: 20px;">
          Alert when drain EC exceeds feed EC by more than the max delta. Target runoff percentage
          helps calculate how much drain water to collect per irrigation event.
        </p>

        <div style="display: flex; align-items: center; justify-content: space-between;
          background: rgba(255,255,255,0.05); padding: 12px; border-radius: 8px; margin-bottom: 16px;">
          <span>Enable EC drain monitoring</span>
          <md3-switch
            .checked=${this._drainEcEnabled}
            @change=${(e: Event) => { this._drainEcEnabled = (e.target as HTMLInputElement).checked; }}
          ></md3-switch>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
          <md3-number-input
            label="Max EC Delta (mS/cm)"
            .value=${this._drainEcMaxDelta}
            step="0.1"
            min="0.1"
            ?disabled=${!this._drainEcEnabled}
            @change=${(e: CustomEvent) => { this._drainEcMaxDelta = parseFloat(e.detail) || 1.0; }}
          ></md3-number-input>

          <md3-number-input
            label="Target Runoff (%)"
            .value=${this._drainEcTargetRunoffPercent}
            min="5"
            max="50"
            step="5"
            ?disabled=${!this._drainEcEnabled}
            @change=${(e: CustomEvent) => { this._drainEcTargetRunoffPercent = parseInt(e.detail) || 20; }}
          ></md3-number-input>
        </div>
      </div>

      <!-- Manual Reading Log -->
      <div class="detail-card">
        <h3 style="margin-top: 0;">Log Drain Reading</h3>
        <p style="font-size: 0.82rem; opacity: 0.7; margin-bottom: 20px;">
          Manually log feed EC and drain EC values. This is used when you measure manually
          with a handheld meter. Volumes are optional.
        </p>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
          <md3-number-input
            label="Feed EC (mS/cm)"
            .value=${this._drainLogFeedEc}
            step="0.1"
            min="0"
            @change=${(e: CustomEvent) => { this._drainLogFeedEc = parseFloat(e.detail) || 0; }}
          ></md3-number-input>

          <md3-number-input
            label="Drain EC (mS/cm)"
            .value=${this._drainLogDrainEc}
            step="0.1"
            min="0"
            @change=${(e: CustomEvent) => { this._drainLogDrainEc = parseFloat(e.detail) || 0; }}
          ></md3-number-input>

          <md3-number-input
            label="Feed Volume (mL) — optional"
            .value=${this._drainLogFeedVolume}
            step="100"
            min="0"
            @change=${(e: CustomEvent) => { this._drainLogFeedVolume = parseInt(e.detail) || 0; }}
          ></md3-number-input>

          <md3-number-input
            label="Drain Volume (mL) — optional"
            .value=${this._drainLogDrainVolume}
            step="100"
            min="0"
            @change=${(e: CustomEvent) => { this._drainLogDrainVolume = parseInt(e.detail) || 0; }}
          ></md3-number-input>
        </div>

        ${this._drainLogFeedEc > 0 && this._drainLogDrainEc > 0 ? html`
          <div style="
            background: rgba(255,255,255,0.05); border-radius: 8px;
            padding: 10px 16px; margin-bottom: 16px;
            display: flex; gap: 24px; align-items: center; font-size: 0.9rem;
          ">
            <span>EC Delta: <strong style="color: ${(this._drainLogDrainEc - this._drainLogFeedEc) > this._drainEcMaxDelta ? '#f44336' : '#4caf50'}">
              Δ${(this._drainLogDrainEc - this._drainLogFeedEc).toFixed(2)} mS/cm
            </strong></span>
            ${this._drainLogFeedVolume > 0 && this._drainLogDrainVolume > 0 ? html`
              <span>Runoff: <strong>
                ${((this._drainLogDrainVolume / this._drainLogFeedVolume) * 100).toFixed(1)}%
              </strong></span>
            ` : nothing}
          </div>
        ` : nothing}

        <button
          class="md3-button primary"
          style="background: #FF9800;"
          @click=${this._logDrainReadingNow}
          ?disabled=${this._drainLogging || this._drainLogFeedEc <= 0 || this._drainLogDrainEc <= 0}
        >
          ${this._drainLogging ? 'Logging…' : 'Log Reading'}
        </button>
      </div>

      <!-- Readings History -->
      <div class="detail-card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
          <h3 style="margin: 0;">Recent Readings</h3>
          <span style="font-size: 0.8rem; opacity: 0.5;">${readings.length} total</span>
        </div>

        ${recent.length === 0 ? html`
          <p style="opacity: 0.6; text-align: center; padding: 20px 0;">
            No readings logged yet. Use the form above or configure an automated EC sensor.
          </p>
        ` : html`
          <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; font-size: 0.88rem;">
              <thead>
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.15); opacity: 0.7;">
                  <th style="text-align: left; padding: 6px 8px; font-weight: 500;">Time</th>
                  <th style="text-align: right; padding: 6px 8px; font-weight: 500;">Feed EC</th>
                  <th style="text-align: right; padding: 6px 8px; font-weight: 500;">Drain EC</th>
                  <th style="text-align: right; padding: 6px 8px; font-weight: 500;">Δ EC</th>
                  <th style="text-align: right; padding: 6px 8px; font-weight: 500;">Runoff</th>
                </tr>
              </thead>
              <tbody>
                ${recent.map((r: DrainECReading) => {
      const delta = r.drainEc - r.feedEc;
      const overThreshold = this._drainEcEnabled && delta > this._drainEcMaxDelta;
      const runoffPct = r.feedVolumeMl && r.drainVolumeMl
        ? ((r.drainVolumeMl / r.feedVolumeMl) * 100).toFixed(1) + '%'
        : '—';
      return html`
                    <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
                      <td style="padding: 6px 8px; opacity: 0.7;">
                        ${new Date(r.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td style="text-align: right; padding: 6px 8px;">${r.feedEc.toFixed(2)}</td>
                      <td style="text-align: right; padding: 6px 8px;">${r.drainEc.toFixed(2)}</td>
                      <td style="text-align: right; padding: 6px 8px; color: ${overThreshold ? '#f44336' : delta > this._drainEcMaxDelta * 0.7 ? '#FF9800' : '#4caf50'}; font-weight: 500;">
                        ${delta >= 0 ? '+' : ''}${delta.toFixed(2)}
                      </td>
                      <td style="text-align: right; padding: 6px 8px; opacity: 0.6;">${runoffPct}</td>
                    </tr>
                  `;
    })}
              </tbody>
            </table>
          </div>
        `}
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
          ${tank.volumeLiters != null ? html`<span style="margin-left: 8px; opacity: 0.55;">· ${tank.volumeLiters} L</span>` : nothing}
        </div>
      </div>
    `;
  }
}
