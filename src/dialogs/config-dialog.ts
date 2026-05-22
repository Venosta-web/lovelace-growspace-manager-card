import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import {
  mdiClose,
  mdiCog,
  mdiViewDashboard,
  mdiThermometer,
  mdiPencil,
  mdiDelete,
  mdiWaterPercent,
  mdiWhiteBalanceSunny,
  mdiWeatherNight,
  mdiGauge,
  mdiFan,
  mdiViewGrid,
  mdiPlus,
  mdiAirHumidifier,
  mdiWater,
  mdiCamera,
  mdiChevronDown,
} from '@mdi/js';
import { dialogStyles } from '../styles/dialog.styles';
import { HomeAssistant } from 'custom-card-helpers';

import '../features/shared/ui/md3-text-input';
import '../features/shared/ui/md3-number-input';
import '../features/shared/ui/md3-select';
import '../features/shared/ui/gs-help-tooltip';
import './sensor-group-dialog';
import './subarea-config-dialog';
import {
  GrowspaceDevice,
  DehumidifierStage,
  HumidifierStage,
  EnvironmentConfigData,
  EnvironmentConfigEventDetail,
} from '../types';
import type { VisionCheckupConfigEventDetail } from '../lib/types/dialog';
import { ConfigTab } from '../constants';
import type { Subarea } from '../services/types';
import { DataService } from '../services/data-service';

// Unified stage list for the accordion — maps display id → both stage enums
const HUMIDITY_STAGES = [
  { id: 'seedling',    label: 'Seedling',     dehum: DehumidifierStage.SEEDLING,    hum: HumidifierStage.SEEDLING },
  { id: 'mother',     label: 'Mother',       dehum: DehumidifierStage.MOTHER,      hum: HumidifierStage.MOTHER },
  { id: 'veg',        label: 'Vegetative',   dehum: DehumidifierStage.VEG,         hum: HumidifierStage.VEG },
  { id: 'early_flower', label: 'Early Flower', dehum: DehumidifierStage.EARLY_FLOWER, hum: HumidifierStage.EARLY_FLOWER },
  { id: 'mid_flower', label: 'Mid Flower',   dehum: DehumidifierStage.MID_FLOWER,  hum: HumidifierStage.MID_FLOWER },
  { id: 'late_flower', label: 'Late Flower', dehum: DehumidifierStage.LATE_FLOWER, hum: HumidifierStage.LATE_FLOWER },
  { id: 'drying',     label: 'Drying',       dehum: DehumidifierStage.DRYING,      hum: HumidifierStage.DRY },
  { id: 'curing',     label: 'Curing',       dehum: DehumidifierStage.CURING,      hum: HumidifierStage.CURE },
] as const;

type HumidityStageId = typeof HUMIDITY_STAGES[number]['id'];

@customElement('config-dialog')
export class ConfigDialog extends LitElement {
  @property({ type: Boolean, reflect: true }) open = false;

  @property({ attribute: false })
  public hass!: HomeAssistant;

  @property({ type: Object })
  growspaceOptions: Record<string, string> = {};

  @property({ attribute: false })
  public devices: GrowspaceDevice[] = [];

  @property({ type: String }) initialTab: ConfigTab = ConfigTab.SENSORS;

  @property({ attribute: false }) allowedTabs?: ConfigTab[];

  @property({ type: String })
  public currentTab: ConfigTab = ConfigTab.SENSORS;

  @property({ attribute: false })
  public environmentData: EnvironmentConfigData | undefined;

  private _initialStateApplied = false;

  // Add Growspace
  @state() private addName = '';
  @state() private addRows = 4;
  @state() private addPlantsPerRow = 4;
  @state() private addNotificationService = 'mobile_app_notify';

  // Edit/Select Growspace
  @state() private editSelectedId = '';
  @state() private editName = '';
  @state() private editRows = 0;
  @state() private editPlantsPerRow = 0;
  @state() private editNotificationService = '';
  @state() private _isAddingGrowspace = false;
  @state() private _showDeleteConfirm = false;

  // Environment
  @state() private envSelectedId = '';
  @state() private envTemperatureSensors: string[] = [];
  @state() private envHumiditySensors: string[] = [];
  @state() private envVpdSensors: string[] = [];
  @state() private envCo2Sensor = '';
  @state() private envCirculationFanEntities: string[] = [];
  @state() private envStressThreshold = 0.8;
  @state() private envMoldThreshold = 0.8;
  @state() private envLightSensors: string[] = [];
  @state() private envExhaustFanEntities: string[] = [];
  @state() private envHumidifierEntities: string[] = [];
  @state() private envDehumidifierEntities: string[] = [];
  @state() private envSoilMoistureSensor = '';
  @state() private envDehumidifierControlEnabled = false;
  @state() private envSubstrateTemperatureSensors: string[] = [];
  @state() private envPhSensors: string[] = [];
  @state() private envFeedEcSensors: string[] = [];
  @state() private envSubstrateEcSensors: string[] = [];
  @state() private envRunoffEcSensors: string[] = [];
  @state() private envDrainVolumeSensors: string[] = [];
  @state() private envIrrigationFlowSensors: string[] = [];
  @state() private envPowerSensors: string[] = [];
  @state() private envEnergySensors: string[] = [];
  @state() private envDehumidifierThresholds: Record<string, Record<string, { on: number; off: number }>> = {};
  @state() private envSensorCoordinates: Record<string, { x: number; y: number; z: number; rotation?: number }> = {};
  @state() private envIrrigationTanks: any[] = [];

  // Tank editor
  @state() private _showTankForm = false;
  @state() private _editingTankIndex: number | null = null;
  @state() private _tankDraft: { sensorEntity: string; name: string; volumeLiters: number | null; warningLevel: number } = {
    sensorEntity: '', name: '', volumeLiters: null, warningLevel: 30,
  };

  // Vision Checkup
  @state() private envVisionEnabled = false;
  @state() private envVisionEarlyOffset = 60;
  @state() private envVisionMidHours = 6;
  @state() private envVisionLateOffset = 60;
  @state() private envVisionCameraEntities: string[] = [];
  @state() private envLungroomTempSensors: string[] = [];

  // Humidifier Control
  @state() private envHumidifierControlEnabled = false;
  @state() private envHumidifierThresholds: Record<string, Record<string, { on: number; off: number }>> = {};

  // Humidity accordion
  @state() private _openHumidityStageId: HumidityStageId | '' = '';

  // Sensor Groups
  @state() private envSensorGroups: import('../types').SensorGroup[] = [];
  @state() private _showGroupDialog = false;
  @state() private _editingGroup: import('../types').SensorGroup | undefined;

  // Subareas
  @state() private _subareas: Subarea[] = [];
  @state() private _subareasLoading = false;
  @state() private _subareasGrowspaceId = '';
  @state() private _showSubareaConfigDialog = false;
  @state() private _editingSubarea: Subarea | undefined;
  @state() private _showAddSubarea = false;
  @state() private _newSubareaName = '';
  @state() private _deleteConfirmSubareaId = '';
  private _dataService?: DataService;

  static styles = [
    dialogStyles,
    css`
      :host {
        display: block;
      }

      .glass-dialog-container {
        width: 100%;
        max-width: 100%;
        min-height: 0;
        height: auto;
        max-height: 90vh;
      }

      /* ── Rail layout ─────────────────────────────────────── */
      .cfg-body {
        display: flex;
        flex: 1 1 auto;
        overflow: hidden;
        min-height: 0;
      }

      .cfg-rail {
        flex: 0 0 210px;
        background: rgba(0, 0, 0, 0.2);
        border-right: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
        display: flex;
        flex-direction: column;
        overflow-y: auto;
        padding: 6px 0 12px;
        scrollbar-width: thin;
        scrollbar-color: rgba(255,255,255,0.1) transparent;
      }

      .cfg-rail-caps {
        font-size: 0.65rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--secondary-text-color, rgba(255, 255, 255, 0.4));
        padding: 14px 16px 4px;
      }

      .cfg-nav-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 12px 8px 16px;
        font-size: 0.85rem;
        color: var(--secondary-text-color, rgba(255, 255, 255, 0.6));
        cursor: pointer;
        border-left: 2px solid transparent;
        transition: all 0.15s;
        user-select: none;
      }

      .cfg-nav-item:hover {
        color: var(--primary-text-color, #fff);
        background: rgba(255, 255, 255, 0.04);
      }

      .cfg-nav-item.active {
        color: var(--primary-color, #4caf50);
        background: rgba(76, 175, 80, 0.1);
        border-left-color: var(--primary-color, #4caf50);
        font-weight: 500;
      }

      .cfg-nav-item svg {
        width: 18px;
        height: 18px;
        fill: currentColor;
        flex-shrink: 0;
        opacity: 0.85;
      }

      /* ── Content area ───────────────────────────────────── */
      .cfg-content {
        flex: 1 1 0;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        min-height: 0;
        min-width: 0;
      }

      .cfg-context-bar {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 20px;
        border-bottom: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
        background: rgba(0, 0, 0, 0.1);
        flex-shrink: 0;
      }

      .cfg-context-label {
        font-size: 0.7rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--secondary-text-color, rgba(255, 255, 255, 0.5));
        white-space: nowrap;
      }

      .cfg-context-select {
        height: 34px;
        padding: 0 10px;
        border-radius: 6px;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.15);
        color: var(--primary-text-color, #fff);
        font-family: inherit;
        font-size: 0.875rem;
        outline: none;
        min-width: 160px;
      }

      .cfg-scroll {
        flex: 1;
        overflow-y: auto;
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 16px;
        min-height: 0;
        scrollbar-width: thin;
        scrollbar-color: rgba(255,255,255,0.1) transparent;
      }

      /* ── Growspaces master/detail ───────────────────────── */
      .cfg-master-detail {
        display: grid;
        grid-template-columns: 220px 1fr;
        gap: 16px;
        flex: 1;
        min-height: 0;
        overflow: hidden;
      }

      .cfg-master-list {
        display: flex;
        flex-direction: column;
        gap: 2px;
        overflow-y: auto;
        padding-right: 2px;
        scrollbar-width: thin;
      }

      .cfg-gs-row {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 10px;
        border-radius: 8px;
        border: 1px solid transparent;
        cursor: pointer;
        transition: all 0.15s;
        font-size: 0.875rem;
      }

      .cfg-gs-row:hover {
        background: rgba(255, 255, 255, 0.04);
      }

      .cfg-gs-row.active {
        background: rgba(76, 175, 80, 0.08);
        border-color: rgba(76, 175, 80, 0.25);
      }

      .cfg-gs-row .gs-name {
        flex: 1;
        font-weight: 500;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .cfg-gs-row .gs-meta {
        font-size: 0.75rem;
        color: var(--secondary-text-color, rgba(255, 255, 255, 0.5));
        white-space: nowrap;
      }

      .cfg-master-add-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        height: 38px;
        margin-top: 8px;
        border: 1px dashed var(--divider-color, rgba(255, 255, 255, 0.2));
        border-radius: 8px;
        background: transparent;
        color: var(--primary-color, #4caf50);
        font-family: inherit;
        font-size: 0.85rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.15s;
        width: 100%;
      }

      .cfg-master-add-btn:hover {
        background: rgba(76, 175, 80, 0.06);
        border-color: var(--primary-color, #4caf50);
      }

      .cfg-detail-pane {
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 16px;
        padding-right: 2px;
        scrollbar-width: thin;
      }

      /* ── Accordion (humidity stages) ─────────────────────── */
      .acc-card {
        background: rgba(255, 255, 255, 0.02);
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.08));
        border-radius: 10px;
        overflow: hidden;
      }

      .acc-head {
        display: flex;
        align-items: center;
        gap: 12px;
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
        border-radius: 50%;
        flex-shrink: 0;
      }

      .acc-head-title {
        flex: 1;
        font-size: 0.9rem;
        font-weight: 500;
      }

      .acc-head-desc {
        font-size: 0.775rem;
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
        border-radius: 10px;
        padding: 14px;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .acc-device-header {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 0.875rem;
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
        font-size: 0.8rem;
        color: var(--secondary-text-color, rgba(255, 255, 255, 0.6));
      }

      .acc-cycle-row svg {
        width: 14px;
        height: 14px;
        fill: currentColor;
        flex-shrink: 0;
      }

      /* ── Form utilities ──────────────────────────────────── */
      .form-section {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .row-col-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
      }

      .control-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
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

      /* ── Multi-entity select ─────────────────────────────── */
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

      .chip-remove:hover { opacity: 1; }

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

      .entity-select-container {
        position: relative;
        z-index: 5;
      }

      .entity-select-container .md3-input-group {
        margin-bottom: 0;
      }

      .form-section .entity-select-container,
      .form-section .multi-select-container {
        margin-bottom: 0;
      }

      @media (max-width: 500px) {
        .glass-dialog-container {
          width: 100vw;
          max-width: 100%;
          height: 100vh;
          border-radius: 0;
        }
        .cfg-rail {
          flex: 0 0 44px;
        }
        .cfg-nav-item span {
          display: none;
        }
        .cfg-rail-caps {
          display: none;
        }
        .cfg-scroll {
          padding: 14px;
        }
        .cfg-master-detail {
          grid-template-columns: 1fr;
        }
        .acc-cycle-grid {
          grid-template-columns: 1fr;
        }
        .row-col-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
    css`
      .md3-input-group {
        border-radius: 8px 8px 2px 2px;
      }
      .md3-label {
        text-transform: uppercase;
        letter-spacing: 0.4px;
        font-size: 0.7rem;
      }
      .cfg-context-select {
        border-radius: 8px 8px 2px 2px;
      }
      .cfg-context-select option,
      .md3-input option,
      select option {
        background: var(--card-background-color, #1e2127);
        color: var(--primary-text-color, #fff);
      }
    `,
  ];

  protected willUpdate(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('environmentData') && this.environmentData) {
      this.setInitialState(this.initialTab, this.environmentData);
    }
  }

  protected updated(changedProperties: Map<string, unknown>) {
    super.updated(changedProperties);

    if (changedProperties.has('hass') && this.hass) {
      this._dataService = new DataService(this.hass);
    }

    if (changedProperties.has('open')) {
      if (this.open) {
        if (!this._initialStateApplied) {
          this._initialStateApplied = true;
        }
      } else {
        this._initialStateApplied = false;
      }
    }
  }

  public setInitialState(
    currentTab: ConfigTab = ConfigTab.SENSORS,
    environmentData?: EnvironmentConfigData
  ) {
    this.currentTab = currentTab;
    if (environmentData) {
      this.envSelectedId = environmentData.selectedGrowspaceId;
      this.envTemperatureSensors = environmentData.temperatureSensors?.length
        ? environmentData.temperatureSensors
        : (environmentData.temperatureSensor ? [environmentData.temperatureSensor] : []);
      this.envHumiditySensors = environmentData.humiditySensors?.length
        ? environmentData.humiditySensors
        : (environmentData.humiditySensor ? [environmentData.humiditySensor] : []);
      this.envVpdSensors = environmentData.vpdSensors?.length
        ? environmentData.vpdSensors
        : (environmentData.vpdSensor ? [environmentData.vpdSensor] : []);
      this.envCo2Sensor = environmentData.co2Sensor;
      this.envCirculationFanEntities = environmentData.circulationFanEntities || [];
      this.envStressThreshold = environmentData.stressThreshold;
      this.envMoldThreshold = environmentData.moldThreshold;
      this.envLightSensors = environmentData.lightSensors || [];
      this.envExhaustFanEntities = environmentData.exhaustFanEntities || [];
      this.envHumidifierEntities = environmentData.humidifierEntities || [];
      this.envDehumidifierEntities = environmentData.dehumidifierEntities || [];
      this.envSoilMoistureSensor = environmentData.soilMoistureSensor;
      this.envDehumidifierControlEnabled = environmentData.dehumidifierControlEnabled;
      this.envDehumidifierThresholds = environmentData.dehumidifierThresholds || {};
      this.envHumidifierControlEnabled = environmentData.humidifierControlEnabled;
      this.envHumidifierThresholds = environmentData.humidifierThresholds || {};
      this.envSensorGroups = environmentData.sensorGroups || [];
      this.envSensorCoordinates = environmentData.sensorCoordinates || {};
      this.envIrrigationTanks = environmentData.irrigationTanks || [];
      this.envVisionCameraEntities = environmentData.cameraEntities ?? [];
      this.envLungroomTempSensors = environmentData.lungroomTempSensors || [];
      this.envSubstrateTemperatureSensors = environmentData.substrateTemperatureSensors || [];
      this.envPhSensors = environmentData.phSensors || [];
      this.envFeedEcSensors = environmentData.feedEcSensors || [];
      this.envSubstrateEcSensors = environmentData.substrateEcSensors || [];
      this.envRunoffEcSensors = environmentData.runoffEcSensors || [];
      this.envDrainVolumeSensors = environmentData.drainVolumeSensors || [];
      this.envIrrigationFlowSensors = environmentData.irrigationFlowSensors || [];
      this.envPowerSensors = environmentData.powerSensors || [];
      this.envEnergySensors = environmentData.energySensors || [];
      if (environmentData.visionCheckupConfig) {
        this.envVisionEnabled = environmentData.visionCheckupConfig.enabled;
        this.envVisionEarlyOffset = environmentData.visionCheckupConfig.early_check_offset_minutes;
        this.envVisionMidHours = environmentData.visionCheckupConfig.mid_check_hours;
        this.envVisionLateOffset = environmentData.visionCheckupConfig.late_check_offset_minutes;
      }

      if (environmentData.selectedGrowspaceId) {
        this._populateEditFields(environmentData.selectedGrowspaceId);
      }
    }
    if (this.currentTab === ConfigTab.SUBAREAS) {
      this._loadSubareas();
    }
  }

  private _close() {
    if (this._showGroupDialog || this._showSubareaConfigDialog) return;
    this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
  }

  private _switchTab(tab: ConfigTab) {
    this.currentTab = tab;
    if (tab === ConfigTab.SUBAREAS) {
      this._loadSubareas();
    }
  }

  // ── Submit handlers ─────────────────────────────────────────────────────

  private _submitAddGrowspace() {
    this.dispatchEvent(new CustomEvent('add-growspace-submit', {
      detail: {
        name: this.addName,
        rows: this.addRows,
        plantsPerRow: this.addPlantsPerRow,
        notificationService: this.addNotificationService,
      },
      bubbles: true,
      composed: true,
    }));
  }

  private _submitEnvironment() {
    this.dispatchEvent(new CustomEvent('configure-environment-submit', {
      detail: {
        selectedGrowspaceId: this.envSelectedId,
        temperatureSensors: this.envTemperatureSensors,
        humiditySensors: this.envHumiditySensors,
        vpdSensors: this.envVpdSensors,
        co2Sensor: this.envCo2Sensor,
        circulationFanEntities: this.envCirculationFanEntities,
        stressThreshold: this.envStressThreshold,
        moldThreshold: this.envMoldThreshold,
        lightSensors: this.envLightSensors,
        exhaustFanEntities: this.envExhaustFanEntities,
        humidifierEntities: this.envHumidifierEntities,
        humidifierThresholds: this.envHumidifierThresholds,
        humidifierControlEnabled: this.envHumidifierControlEnabled,
        dehumidifierEntities: this.envDehumidifierEntities,
        dehumidifierThresholds: this.envDehumidifierThresholds,
        soilMoistureSensor: this.envSoilMoistureSensor,
        dehumidifierControlEnabled: this.envDehumidifierControlEnabled,
        sensorGroups: this.envSensorGroups,
        sensorCoordinates: this.envSensorCoordinates,
        irrigationTanks: this.envIrrigationTanks,
        cameraEntities: this.envVisionCameraEntities,
        lungroomTempSensors: this.envLungroomTempSensors,
        substrateTemperatureSensors: this.envSubstrateTemperatureSensors,
        phSensors: this.envPhSensors,
        feedEcSensors: this.envFeedEcSensors,
        substrateEcSensors: this.envSubstrateEcSensors,
        runoffEcSensors: this.envRunoffEcSensors,
        drainVolumeSensors: this.envDrainVolumeSensors,
        irrigationFlowSensors: this.envIrrigationFlowSensors,
        powerSensors: this.envPowerSensors,
        energySensors: this.envEnergySensors,
      } as EnvironmentConfigEventDetail,
      bubbles: true,
      composed: true,
    }));
  }

  private _submitVisionCheckupConfig() {
    if (!this.envSelectedId) return;
    this.dispatchEvent(new CustomEvent('vision-checkup-config-submit', {
      detail: {
        growspaceId: this.envSelectedId,
        visionCheckupConfig: {
          enabled: this.envVisionEnabled,
          early_check_offset_minutes: this.envVisionEarlyOffset,
          mid_check_hours: this.envVisionMidHours,
          late_check_offset_minutes: this.envVisionLateOffset,
        },
      } as VisionCheckupConfigEventDetail,
      bubbles: true,
      composed: true,
    }));
  }

  private _submitEditGrowspace() {
    if (!this.editSelectedId) return;
    this.dispatchEvent(new CustomEvent('edit-growspace-submit', {
      detail: {
        growspaceId: this.editSelectedId,
        name: this.editName,
        rows: this.editRows,
        plantsPerRow: this.editPlantsPerRow,
        notificationService: this.editNotificationService,
      },
      bubbles: true,
      composed: true,
    }));
  }

  private _submitGrowspaceAndEnv() {
    this._submitEditGrowspace();
    if (this.envTemperatureSensors.length > 0 && this.envHumiditySensors.length > 0) {
      this._submitEnvironment();
    }
  }

  private _submitDeleteGrowspace() {
    if (!this.editSelectedId) return;
    this._showDeleteConfirm = true;
  }

  private _confirmDeleteGrowspace() {
    this.dispatchEvent(new CustomEvent('delete-growspace-submit', {
      detail: { growspace_id: this.editSelectedId },
      bubbles: true,
      composed: true,
    }));
    this.editSelectedId = '';
    this.editName = '';
    this.editRows = 0;
    this.editPlantsPerRow = 0;
    this.editNotificationService = '';
    this._showDeleteConfirm = false;
    this._isAddingGrowspace = false;
  }

  private _cancelDeleteGrowspace() {
    this._showDeleteConfirm = false;
  }

  private _generateGrowReport() {
    if (!this.editSelectedId) return;
    this.dispatchEvent(new CustomEvent('generate-grow-report', {
      detail: { growspace_id: this.editSelectedId },
      bubbles: true,
      composed: true,
    }));
  }

  private async _handleRemoveEnvironment() {
    if (!this.envSelectedId) return;
    const confirmed = window.confirm(
      'Are you sure you want to remove the environment configuration for this growspace? This will disconnect all sensors and controllers from this growspace.'
    );
    if (!confirmed) return;
    try {
      this.dispatchEvent(new CustomEvent('remove-environment-submit', {
        detail: { growspace_id: this.envSelectedId },
        bubbles: true,
        composed: true,
      }));
      setTimeout(() => {
        if (this.envSelectedId) {
          this._handleEnvGrowspaceChange({ target: { value: this.envSelectedId } } as any);
        }
      }, 1000);
    } catch (e) {
      console.error('Failed to remove environment:', e);
    }
  }

  // ── Growspace data helpers ───────────────────────────────────────────────

  private _populateEditFields(growspaceId: string) {
    this.editSelectedId = growspaceId;
    if (growspaceId && this.devices) {
      const device = this.devices.find((d) => d.deviceId === growspaceId);
      if (device) {
        this.editName = device.name;
        this.editRows = device.rows || 4;
        this.editPlantsPerRow = device.plantsPerRow || 4;
        this.editNotificationService = device.notificationTarget || '';
      }
    }
  }

  private _handleEditSelection(growspaceId: string) {
    this._isAddingGrowspace = false;
    this._showDeleteConfirm = false;
    this._populateEditFields(growspaceId);
    this._handleEnvGrowspaceChange({ target: { value: growspaceId } } as any);
  }

  private _startAddGrowspace() {
    this._isAddingGrowspace = true;
    this._showDeleteConfirm = false;
    this.editSelectedId = '';
    this.addName = '';
    this.addRows = 4;
    this.addPlantsPerRow = 4;
    this.addNotificationService = 'mobile_app_notify';
  }

  private _getMobileAppNotifyServices() {
    if (!this.hass?.services?.notify) return [];
    return Object.keys(this.hass.services.notify)
      .filter((s) => s.startsWith('mobile_app_'))
      .map((s) => ({ label: s.replace('mobile_app_', ''), value: s }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  private _getEntities(domains: string[], deviceClass: string | null): string[] {
    if (!this.hass) return [];
    return Object.keys(this.hass.states || {})
      .filter((eid) => {
        const state = this.hass.states[eid];
        if (!state) return false;
        const domain = eid.split('.')[0];
        return domains.includes(domain) && (!deviceClass || state.attributes.device_class === deviceClass);
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
          ${values.map((val) => html`
            <div class="chip">
              ${val}
              <span class="chip-remove" @click=${() => changeHandler(values.filter((v) => v !== val))}>×</span>
            </div>
          `)}
          <input
            class="search-input-inner"
            list="${listId}"
            placeholder=${values.length === 0 ? 'Add Entity...' : ''}
            @change=${(e: Event) => {
              const input = e.target as HTMLInputElement;
              const val = input.value;
              if (val && !values.includes(val)) changeHandler([...values, val]);
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

  private _renderEntitySelect(
    label: string,
    value: string,
    domains: string[],
    deviceClass: string | null,
    changeHandler: (e: CustomEvent) => void
  ) {
    const listId = `list-${label.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`;
    const entities = this._getEntities(domains, deviceClass);
    return html`
      <div class="entity-select-container">
        <div class="md3-input-group">
          <label class="md3-label">${label}</label>
          <input
            class="md3-input"
            list="${listId}"
            .value=${value}
            @change=${(e: Event) => {
              const val = (e.target as HTMLInputElement).value;
              changeHandler(new CustomEvent('change', { detail: { value: val } }));
            }}
            placeholder="Search entity..."
          />
          <datalist id="${listId}">
            ${entities.map((eid) => html`<option value="${eid}"></option>`)}
          </datalist>
        </div>
      </div>
    `;
  }

  // ── Threshold helpers ────────────────────────────────────────────────────

  private _getThresholdValue(stage: string, cycle: string, point: 'on' | 'off'): number {
    return this.envDehumidifierThresholds?.[stage]?.[cycle]?.[point] ?? 0;
  }

  private _updateThreshold(stage: string, cycle: string, point: 'on' | 'off', value: number) {
    if (isNaN(value)) return;
    const t = JSON.parse(JSON.stringify(this.envDehumidifierThresholds || {}));
    if (!t[stage]) t[stage] = {};
    if (!t[stage][cycle]) t[stage][cycle] = { on: 0, off: 0 };
    t[stage][cycle][point] = value;
    this.envDehumidifierThresholds = t;
  }

  private _getHumidifierThresholdValue(stage: string, cycle: string, point: 'on' | 'off'): number {
    return this.envHumidifierThresholds?.[stage]?.[cycle]?.[point] ?? 0;
  }

  private _updateHumidifierThreshold(stage: string, cycle: string, point: 'on' | 'off', value: number) {
    if (isNaN(value)) return;
    const t = JSON.parse(JSON.stringify(this.envHumidifierThresholds || {}));
    if (!t[stage]) t[stage] = {};
    if (!t[stage][cycle]) t[stage][cycle] = { on: 0, off: 0 };
    t[stage][cycle][point] = value;
    this.envHumidifierThresholds = t;
  }

  // ── Tank methods ─────────────────────────────────────────────────────────

  private _openAddTank() {
    this._tankDraft = { sensorEntity: '', name: '', volumeLiters: null, warningLevel: 30 };
    this._editingTankIndex = null;
    this._showTankForm = true;
  }

  private _editTank(index: number) {
    const tank = this.envIrrigationTanks[index];
    this._tankDraft = {
      sensorEntity: tank.sensorEntity || '',
      name: tank.name || '',
      volumeLiters: tank.volumeLiters ?? null,
      warningLevel: tank.warningLevel ?? 30,
    };
    this._editingTankIndex = index;
    this._showTankForm = true;
  }

  private _deleteTank(index: number) {
    this.envIrrigationTanks = this.envIrrigationTanks.filter((_, i) => i !== index);
  }

  private _saveTank() {
    if (!this._tankDraft.sensorEntity.trim()) return;
    const tank = {
      sensorEntity: this._tankDraft.sensorEntity.trim(),
      name: this._tankDraft.name.trim() || 'Tank',
      volumeLiters: this._tankDraft.volumeLiters,
      warningLevel: this._tankDraft.warningLevel,
    };
    if (this._editingTankIndex !== null) {
      const updated = [...this.envIrrigationTanks];
      updated[this._editingTankIndex] = tank;
      this.envIrrigationTanks = updated;
    } else {
      this.envIrrigationTanks = [...this.envIrrigationTanks, tank];
    }
    this._showTankForm = false;
    this._editingTankIndex = null;
  }

  private _cancelTank() {
    this._showTankForm = false;
    this._editingTankIndex = null;
  }

  // ── Sensor group methods ─────────────────────────────────────────────────

  private _openAddGroup() {
    this._editingGroup = undefined;
    this._showGroupDialog = true;
  }

  private _editGroup(group: import('../types').SensorGroup) {
    this._editingGroup = group;
    this._showGroupDialog = true;
  }

  private _deleteGroup(id: string) {
    this.envSensorGroups = this.envSensorGroups.filter((g) => g.id !== id);
  }

  private _handleSaveGroup(e: CustomEvent) {
    const group = e.detail.group as import('../types').SensorGroup;
    const index = this.envSensorGroups.findIndex((g) => g.id === group.id);
    if (index >= 0) {
      const next = [...this.envSensorGroups];
      next[index] = group;
      this.envSensorGroups = next;
    } else {
      this.envSensorGroups = [...this.envSensorGroups, group];
    }
    this._showGroupDialog = false;
  }

  // ── Subarea methods ──────────────────────────────────────────────────────

  private _getDataService(): DataService {
    if (!this._dataService) this._dataService = new DataService(this.hass);
    return this._dataService;
  }

  private async _loadSubareas() {
    const growspaceId = this.envSelectedId || this.editSelectedId;
    if (!growspaceId) {
      this._subareas = [];
      this._subareasGrowspaceId = '';
      return;
    }
    this._subareasGrowspaceId = growspaceId;
    this._subareasLoading = true;
    try {
      this._subareas = await this._getDataService().getSubareas(growspaceId);
    } catch (e) {
      console.error('[ConfigDialog] Failed to load subareas:', e);
      this._subareas = [];
    } finally {
      this._subareasLoading = false;
    }
  }

  private async _handleAddSubarea() {
    const name = this._newSubareaName.trim();
    if (!name || !this._subareasGrowspaceId) return;
    try {
      await this._getDataService().addSubarea(this._subareasGrowspaceId, name);
      this._newSubareaName = '';
      this._showAddSubarea = false;
      await this._loadSubareas();
    } catch (e) {
      console.error('[ConfigDialog] Failed to add subarea:', e);
    }
  }

  private _handleEditSubarea(subarea: Subarea) {
    this._editingSubarea = subarea;
    this._showSubareaConfigDialog = true;
  }

  private _handleDeleteSubarea(subareaId: string) {
    this._deleteConfirmSubareaId = subareaId;
  }

  private async _confirmDeleteSubarea(subareaId: string) {
    if (!this._subareasGrowspaceId) return;
    try {
      await this._getDataService().removeSubarea(this._subareasGrowspaceId, subareaId);
      this._deleteConfirmSubareaId = '';
      await this._loadSubareas();
    } catch (e) {
      console.error('[ConfigDialog] Failed to delete subarea:', e);
    }
  }

  private _handleEnvGrowspaceChange(e: Event) {
    const growspaceId = (e.target as HTMLSelectElement).value;
    this.envSelectedId = growspaceId;
    const device = this.devices.find((d) => d.deviceId === growspaceId);
    if (device?.environmentAttributes) {
      const attrs = device.environmentAttributes;
      this.envTemperatureSensors = attrs.temperatureSensors?.length ? attrs.temperatureSensors : attrs.temperatureSensor ? [attrs.temperatureSensor] : [];
      this.envHumiditySensors = attrs.humiditySensors?.length ? attrs.humiditySensors : attrs.humiditySensor ? [attrs.humiditySensor] : [];
      this.envVpdSensors = attrs.vpdSensors?.length ? attrs.vpdSensors : attrs.vpdSensor ? [attrs.vpdSensor] : [];
      this.envCo2Sensor = attrs.co2Sensor || '';
      this.envSoilMoistureSensor = attrs.soilMoistureSensor || '';
      this.envDehumidifierControlEnabled = attrs.dehumidifierControlEnabled || false;
      this.envDehumidifierThresholds = attrs.dehumidifierThresholds || {};
      this.envHumidifierControlEnabled = attrs.humidifierControlEnabled || false;
      this.envHumidifierThresholds = attrs.humidifierThresholds || {};
      this.envLightSensors = attrs.lightSensors?.length ? attrs.lightSensors : attrs.lightSensor ? [attrs.lightSensor] : [];
      this.envExhaustFanEntities = attrs.exhaustFanEntities?.length ? attrs.exhaustFanEntities : attrs.exhaustEntity ? [attrs.exhaustEntity] : [];
      this.envCirculationFanEntities = attrs.circulationFanEntities?.length ? attrs.circulationFanEntities : attrs.circulationFanEntity ? [attrs.circulationFanEntity] : [];
      this.envHumidifierEntities = attrs.humidifierEntities?.length ? attrs.humidifierEntities : attrs.humidifierEntity ? [attrs.humidifierEntity] : [];
      this.envDehumidifierEntities = attrs.dehumidifierEntities?.length ? attrs.dehumidifierEntities : attrs.dehumidifierEntity ? [attrs.dehumidifierEntity] : [];
      this.envStressThreshold = 0.8;
      this.envMoldThreshold = 0.8;
      this.envVisionCameraEntities = attrs.cameraEntities ?? [];
      this.envLungroomTempSensors = attrs.lungroomTempSensors || [];
      if (attrs.visionCheckupConfig) {
        this.envVisionEnabled = attrs.visionCheckupConfig.enabled;
        this.envVisionEarlyOffset = attrs.visionCheckupConfig.early_check_offset_minutes;
        this.envVisionMidHours = attrs.visionCheckupConfig.mid_check_hours;
        this.envVisionLateOffset = attrs.visionCheckupConfig.late_check_offset_minutes;
      } else {
        this.envVisionEnabled = false;
        this.envVisionEarlyOffset = 60;
        this.envVisionMidHours = 6;
        this.envVisionLateOffset = 60;
      }
      this.envSubstrateTemperatureSensors = attrs.substrateTemperatureSensors || [];
      this.envPhSensors = attrs.phSensors || [];
      this.envFeedEcSensors = attrs.feedEcSensors || [];
      this.envSubstrateEcSensors = attrs.substrateEcSensors || [];
      this.envRunoffEcSensors = attrs.runoffEcSensors || [];
      this.envDrainVolumeSensors = attrs.drainVolumeSensors || [];
      this.envIrrigationFlowSensors = attrs.irrigationFlowSensors || [];
      this.envPowerSensors = attrs.powerSensors || [];
      this.envEnergySensors = attrs.energySensors || [];
      this.envIrrigationTanks = (attrs.irrigationTanks || []).map((t: any) => ({
        sensorEntity: t.sensorEntity || '',
        name: t.name || 'Tank',
        volumeLiters: t.volumeLiters ?? null,
        warningLevel: t.warningLevel ?? 30,
      }));
      this._showTankForm = false;
      this._editingTankIndex = null;
    } else {
      this.envTemperatureSensors = [];
      this.envHumiditySensors = [];
      this.envVpdSensors = [];
      this.envCo2Sensor = '';
      this.envCirculationFanEntities = [];
      this.envLightSensors = [];
      this.envExhaustFanEntities = [];
      this.envHumidifierEntities = [];
      this.envDehumidifierEntities = [];
      this.envSoilMoistureSensor = '';
      this.envDehumidifierControlEnabled = false;
      this.envDehumidifierThresholds = {};
      this.envHumidifierControlEnabled = false;
      this.envHumidifierThresholds = {};
      this.envVisionEnabled = false;
      this.envVisionEarlyOffset = 60;
      this.envVisionMidHours = 6;
      this.envVisionLateOffset = 60;
      this.envVisionCameraEntities = [];
      this.envLungroomTempSensors = [];
      this.envSubstrateTemperatureSensors = [];
      this.envPhSensors = [];
      this.envFeedEcSensors = [];
      this.envSubstrateEcSensors = [];
      this.envRunoffEcSensors = [];
      this.envDrainVolumeSensors = [];
      this.envIrrigationFlowSensors = [];
      this.envPowerSensors = [];
      this.envEnergySensors = [];
      this.envIrrigationTanks = [];
      this._showTankForm = false;
      this._editingTankIndex = null;
    }
  }

  // ── Section renderers ────────────────────────────────────────────────────

  private _renderGrowspacesSection() {
    if (this._showDeleteConfirm) {
      return html`
        <div class="cfg-master-detail" style="grid-template-columns:1fr;">
          <div class="detail-card" style="text-align:center;padding:40px 20px;">
            <h3 style="color:var(--error-color,#ff5252);">Delete Growspace?</h3>
            <p style="margin-bottom:30px;color:var(--secondary-text-color);">
              Are you sure you want to delete "<strong>${this.editName}</strong>"?<br/>
              This will remove all associated plants and history.<br/>
              This action cannot be undone.
            </p>
          </div>
        </div>
      `;
    }

    return html`
      <div class="cfg-master-detail">
        <!-- Master list -->
        <div class="cfg-master-list">
          <div style="font-size:0.7rem;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:var(--secondary-text-color,rgba(255,255,255,0.5));padding:0 4px 8px;">
            All Growspaces
          </div>
          ${Object.entries(this.growspaceOptions).map(([id, name]) => html`
            <div
              class="cfg-gs-row ${this.editSelectedId === id && !this._isAddingGrowspace ? 'active' : ''}"
              @click=${() => this._handleEditSelection(id)}
            >
              <span class="gs-name">${name}</span>
            </div>
          `)}
          <button class="cfg-master-add-btn" @click=${this._startAddGrowspace}>
            <svg style="width:16px;height:16px;fill:currentColor;" viewBox="0 0 24 24">
              <path d="${mdiPlus}"></path>
            </svg>
            Add Growspace
          </button>
        </div>

        <!-- Detail pane -->
        <div class="cfg-detail-pane">
          ${this._isAddingGrowspace ? this._renderAddGrowspaceForm() : nothing}
          ${!this._isAddingGrowspace && this.editSelectedId ? this._renderEditGrowspaceForm() : nothing}
          ${!this._isAddingGrowspace && !this.editSelectedId ? html`
            <div style="text-align:center;padding:40px 20px;color:var(--secondary-text-color);">
              Select a growspace to edit, or click "Add Growspace" to create a new one.
            </div>
          ` : nothing}
        </div>
      </div>
    `;
  }

  private _renderAddGrowspaceForm() {
    return html`
      <div class="detail-card">
        <h3>New Growspace</h3>
        <md3-text-input
          label="Growspace Name"
          .value=${this.addName}
          @change=${(e: CustomEvent) => (this.addName = e.detail)}
        ></md3-text-input>
        <div class="row-col-grid">
          <md3-number-input
            label="Rows"
            .value=${this.addRows}
            @change=${(e: CustomEvent) => (this.addRows = parseInt(e.detail))}
          ></md3-number-input>
          <md3-number-input
            label="Plants per Row"
            .value=${this.addPlantsPerRow}
            @change=${(e: CustomEvent) => (this.addPlantsPerRow = parseInt(e.detail))}
          ></md3-number-input>
        </div>
        <div class="md3-input-group">
          <label class="md3-label">Notification Service (Mobile App)</label>
          <select
            class="md3-input"
            .value=${this.addNotificationService}
            @change=${(e: Event) => (this.addNotificationService = (e.target as HTMLSelectElement).value)}
          >
            <option value="">None</option>
            ${this._getMobileAppNotifyServices().map((s) => html`
              <option value="${s.value}" ?selected=${this.addNotificationService === s.value}>${s.label}</option>
            `)}
          </select>
        </div>
      </div>
    `;
  }

  private _renderEditGrowspaceForm() {
    return html`
      <div class="detail-card">
        <h3>Edit Details</h3>
        <md3-text-input
          label="Growspace Name"
          .value=${this.editName}
          @change=${(e: CustomEvent) => (this.editName = e.detail)}
        ></md3-text-input>
        <div class="row-col-grid">
          <md3-number-input
            label="Rows"
            .value=${this.editRows}
            @change=${(e: CustomEvent) => (this.editRows = parseInt(e.detail))}
          ></md3-number-input>
          <md3-number-input
            label="Plants per Row"
            .value=${this.editPlantsPerRow}
            @change=${(e: CustomEvent) => (this.editPlantsPerRow = parseInt(e.detail))}
          ></md3-number-input>
        </div>
        <div class="md3-input-group">
          <label class="md3-label">Notification Service (Mobile App)</label>
          <select
            class="md3-input"
            .value=${this.editNotificationService}
            @change=${(e: Event) => (this.editNotificationService = (e.target as HTMLSelectElement).value)}
          >
            <option value="">None</option>
            ${this._getMobileAppNotifyServices().map((s) => html`
              <option value="${s.value}" ?selected=${this.editNotificationService === s.value}>${s.label}</option>
            `)}
          </select>
        </div>
        ${this._renderMultiEntitySelect('Lung Room Temp Sensors', this.envLungroomTempSensors, ['sensor','input_number'], 'temperature', (v) => (this.envLungroomTempSensors = v))}
        ${this._renderMultiEntitySelect('Area Camera', this.envVisionCameraEntities, ['camera'], null, (v) => (this.envVisionCameraEntities = v))}
      </div>
    `;
  }

  private _renderSensorsSection() {
    return html`
      <div class="detail-card">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;border-bottom:1px solid var(--divider-color,rgba(255,255,255,0.1));padding-bottom:8px;">
          <svg style="width:20px;height:20px;fill:var(--primary-color,#4caf50);" viewBox="0 0 24 24"><path d="${mdiThermometer}"></path></svg>
          <h3 style="margin:0;border:none;padding:0;">Monitoring Sensors</h3>
        </div>
        <div class="form-section">
          <div class="row-col-grid">
            ${this._renderMultiEntitySelect('Temperature Sensors', this.envTemperatureSensors, ['sensor','input_number'], 'temperature', (v) => (this.envTemperatureSensors = v))}
            ${this._renderMultiEntitySelect('Humidity Sensors', this.envHumiditySensors, ['sensor','input_number'], 'humidity', (v) => (this.envHumiditySensors = v))}
          </div>
          <div class="row-col-grid">
            ${this._renderMultiEntitySelect('VPD Sensors (Optional)', this.envVpdSensors, ['sensor','input_number'], 'pressure', (v) => (this.envVpdSensors = v))}
            ${this._renderEntitySelect('Soil Moisture Sensor', this.envSoilMoistureSensor, ['sensor','input_number'], 'moisture', (e: CustomEvent) => (this.envSoilMoistureSensor = e.detail.value))}
          </div>
          <div class="row-col-grid">
            ${this._renderEntitySelect('CO₂ Sensor', this.envCo2Sensor, ['sensor','input_number'], 'carbon_dioxide', (e: CustomEvent) => (this.envCo2Sensor = e.detail.value))}
            ${this._renderMultiEntitySelect('Light Source / Sensor', this.envLightSensors, ['switch','light','input_boolean','sensor'], null, (v) => (this.envLightSensors = v))}
          </div>
          ${this._renderMultiEntitySelect('Substrate Temperature Sensors', this.envSubstrateTemperatureSensors, ['sensor','input_number'], 'temperature', (v) => (this.envSubstrateTemperatureSensors = v))}
        </div>
      </div>
    `;
  }

  private _renderClimateSection() {
    return html`
      <div class="detail-card">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;border-bottom:1px solid var(--divider-color,rgba(255,255,255,0.1));padding-bottom:8px;">
          <svg style="width:20px;height:20px;fill:var(--primary-color,#4caf50);" viewBox="0 0 24 24"><path d="${mdiFan}"></path></svg>
          <h3 style="margin:0;border:none;padding:0;">Climate Control</h3>
        </div>
        <div class="form-section">
          <div class="row-col-grid">
            ${this._renderMultiEntitySelect('Exhaust Fan / Switch', this.envExhaustFanEntities, ['fan','switch','input_boolean','sensor','binary_sensor','input_number'], null, (v) => (this.envExhaustFanEntities = v))}
            ${this._renderMultiEntitySelect('Circulation Fan / Switch', this.envCirculationFanEntities, ['fan','switch','input_boolean','sensor','input_number'], null, (v) => (this.envCirculationFanEntities = v))}
          </div>
          <div class="row-col-grid">
            <md3-number-input
              label="Stress Threshold %"
              .value=${this.envStressThreshold}
              @change=${(e: CustomEvent) => (this.envStressThreshold = parseFloat(e.detail))}
              step="0.01"
            ></md3-number-input>
            <md3-number-input
              label="Mold Threshold %"
              .value=${this.envMoldThreshold}
              @change=${(e: CustomEvent) => (this.envMoldThreshold = parseFloat(e.detail))}
              step="0.01"
            ></md3-number-input>
          </div>
          <div class="control-row">
            <button
              class="md3-button tonal error"
              @click=${this._handleRemoveEnvironment}
              ?disabled=${!this.envSelectedId}
            >
              Remove Environment
            </button>
          </div>
        </div>
      </div>
    `;
  }

  private _renderHumiditySection() {
    const stageColors: Record<string, string> = {
      seedling: '#8bc34a',
      mother: '#e91e63',
      veg: '#4caf50',
      early_flower: '#ff9800',
      mid_flower: '#ff7043',
      late_flower: '#f44336',
      drying: '#9c27b0',
      curing: '#2196f3',
    };

    return html`
      <!-- Devices -->
      <div class="detail-card">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;border-bottom:1px solid var(--divider-color,rgba(255,255,255,0.1));padding-bottom:8px;">
          <svg style="width:20px;height:20px;fill:var(--primary-color,#4caf50);" viewBox="0 0 24 24"><path d="${mdiAirHumidifier}"></path></svg>
          <h3 style="margin:0;border:none;padding:0;">Humidity Devices</h3>
        </div>
        <div class="form-section">
          <div class="row-col-grid">
            ${this._renderMultiEntitySelect('Humidifier', this.envHumidifierEntities, ['humidifier','switch','input_boolean','sensor','binary_sensor','input_number'], null, (v) => (this.envHumidifierEntities = v))}
            ${this._renderMultiEntitySelect('Dehumidifier', this.envDehumidifierEntities, ['humidifier','switch','input_boolean','sensor','binary_sensor'], null, (v) => (this.envDehumidifierEntities = v))}
          </div>
          <div class="row-col-grid">
            <label class="checkbox-label">
              <input type="checkbox" .checked=${this.envHumidifierControlEnabled}
                @change=${(e: Event) => (this.envHumidifierControlEnabled = (e.target as HTMLInputElement).checked)} />
              Enable Humidifier Control
            </label>
            <label class="checkbox-label">
              <input type="checkbox" .checked=${this.envDehumidifierControlEnabled}
                @change=${(e: Event) => (this.envDehumidifierControlEnabled = (e.target as HTMLInputElement).checked)} />
              Enable Dehumidifier Control
            </label>
          </div>
        </div>
      </div>

      <!-- Thresholds accordion -->
      <div class="detail-card">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;border-bottom:1px solid var(--divider-color,rgba(255,255,255,0.1));padding-bottom:8px;">
          <svg style="width:20px;height:20px;fill:var(--primary-color,#4caf50);" viewBox="0 0 24 24"><path d="${mdiWaterPercent}"></path></svg>
          <h3 style="margin:0;border:none;padding:0;">Thresholds per Stage</h3>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;">
          ${HUMIDITY_STAGES.map((stage) => {
            const isOpen = this._openHumidityStageId === stage.id;
            const color = stageColors[stage.id] || '#4caf50';
            const dhDay = this._getThresholdValue(stage.dehum, 'day', 'on');
            const huDay = this._getHumidifierThresholdValue(stage.hum, 'day', 'on');
            return html`
              <div class="acc-card">
                <div class="acc-head" @click=${() => { this._openHumidityStageId = isOpen ? '' : stage.id as HumidityStageId; }}>
                  <div class="acc-stage-dot" style="background:${color};"></div>
                  <div class="acc-head-title">${stage.label}</div>
                  ${!isOpen ? html`
                    <div class="acc-head-desc">
                      Dehum on &gt; ${dhDay > 0 ? dhDay + '%' : '—'} &nbsp;·&nbsp; Hum on &lt; ${huDay > 0 ? huDay + '%' : '—'}
                    </div>
                  ` : nothing}
                  <svg class="acc-chev ${isOpen ? 'open' : ''}" viewBox="0 0 24 24">
                    <path d="${mdiChevronDown}"></path>
                  </svg>
                </div>
                ${isOpen ? html`
                  <div class="acc-body">
                    <!-- Dehumidifier block -->
                    <div class="acc-device-block">
                      <div class="acc-device-header" style="color:var(--secondary,#2196f3);">
                        <svg viewBox="0 0 24 24"><path d="${mdiWaterPercent}"></path></svg>
                        Dehumidifier
                      </div>
                      <div class="acc-cycle-grid">
                        <div>
                          <div class="acc-cycle-row" style="color:#ff9800;">
                            <svg viewBox="0 0 24 24"><path d="${mdiWhiteBalanceSunny}"></path></svg>
                            Day
                          </div>
                          <div style="display:flex;flex-direction:column;gap:8px;margin-top:8px;">
                            <md3-number-input label="On Above %" .value=${this._getThresholdValue(stage.dehum,'day','on')} @change=${(e: CustomEvent) => this._updateThreshold(stage.dehum,'day','on',parseFloat(e.detail))} step="1"></md3-number-input>
                            <md3-number-input label="Off Below %" .value=${this._getThresholdValue(stage.dehum,'day','off')} @change=${(e: CustomEvent) => this._updateThreshold(stage.dehum,'day','off',parseFloat(e.detail))} step="1"></md3-number-input>
                          </div>
                        </div>
                        <div>
                          <div class="acc-cycle-row" style="color:#7986cb;">
                            <svg viewBox="0 0 24 24"><path d="${mdiWeatherNight}"></path></svg>
                            Night
                          </div>
                          <div style="display:flex;flex-direction:column;gap:8px;margin-top:8px;">
                            <md3-number-input label="On Above %" .value=${this._getThresholdValue(stage.dehum,'night','on')} @change=${(e: CustomEvent) => this._updateThreshold(stage.dehum,'night','on',parseFloat(e.detail))} step="1"></md3-number-input>
                            <md3-number-input label="Off Below %" .value=${this._getThresholdValue(stage.dehum,'night','off')} @change=${(e: CustomEvent) => this._updateThreshold(stage.dehum,'night','off',parseFloat(e.detail))} step="1"></md3-number-input>
                          </div>
                        </div>
                      </div>
                    </div>
                    <!-- Humidifier block -->
                    <div class="acc-device-block">
                      <div class="acc-device-header" style="color:#00bcd4;">
                        <svg viewBox="0 0 24 24"><path d="${mdiAirHumidifier}"></path></svg>
                        Humidifier
                      </div>
                      <div class="acc-cycle-grid">
                        <div>
                          <div class="acc-cycle-row" style="color:#ff9800;">
                            <svg viewBox="0 0 24 24"><path d="${mdiWhiteBalanceSunny}"></path></svg>
                            Day
                          </div>
                          <div style="display:flex;flex-direction:column;gap:8px;margin-top:8px;">
                            <md3-number-input label="On Below %" .value=${this._getHumidifierThresholdValue(stage.hum,'day','on')} @change=${(e: CustomEvent) => this._updateHumidifierThreshold(stage.hum,'day','on',parseFloat(e.detail))} step="1"></md3-number-input>
                            <md3-number-input label="Off Above %" .value=${this._getHumidifierThresholdValue(stage.hum,'day','off')} @change=${(e: CustomEvent) => this._updateHumidifierThreshold(stage.hum,'day','off',parseFloat(e.detail))} step="1"></md3-number-input>
                          </div>
                        </div>
                        <div>
                          <div class="acc-cycle-row" style="color:#7986cb;">
                            <svg viewBox="0 0 24 24"><path d="${mdiWeatherNight}"></path></svg>
                            Night
                          </div>
                          <div style="display:flex;flex-direction:column;gap:8px;margin-top:8px;">
                            <md3-number-input label="On Below %" .value=${this._getHumidifierThresholdValue(stage.hum,'night','on')} @change=${(e: CustomEvent) => this._updateHumidifierThreshold(stage.hum,'night','on',parseFloat(e.detail))} step="1"></md3-number-input>
                            <md3-number-input label="Off Above %" .value=${this._getHumidifierThresholdValue(stage.hum,'night','off')} @change=${(e: CustomEvent) => this._updateHumidifierThreshold(stage.hum,'night','off',parseFloat(e.detail))} step="1"></md3-number-input>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ` : nothing}
              </div>
            `;
          })}
        </div>
      </div>
    `;
  }

  private _renderIrrigationSection() {
    return html`
      <div class="detail-card">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;border-bottom:1px solid var(--divider-color,rgba(255,255,255,0.1));padding-bottom:8px;">
          <svg style="width:20px;height:20px;fill:var(--primary-color,#4caf50);" viewBox="0 0 24 24"><path d="${mdiGauge}"></path></svg>
          <h3 style="margin:0;border:none;padding:0;">Irrigation Monitoring</h3>
        </div>
        <div class="form-section">
          <div class="row-col-grid">
            ${this._renderMultiEntitySelect('pH Sensors', this.envPhSensors, ['sensor','input_number','number'], null, (v) => (this.envPhSensors = v))}
            ${this._renderMultiEntitySelect('Feed EC Sensors', this.envFeedEcSensors, ['sensor','input_number','number'], null, (v) => (this.envFeedEcSensors = v))}
          </div>
          <div class="row-col-grid">
            ${this._renderMultiEntitySelect('Substrate EC Sensors', this.envSubstrateEcSensors, ['sensor','input_number','number'], null, (v) => (this.envSubstrateEcSensors = v))}
            ${this._renderMultiEntitySelect('Runoff EC Sensors', this.envRunoffEcSensors, ['sensor','input_number','number'], null, (v) => (this.envRunoffEcSensors = v))}
          </div>
          <div class="row-col-grid">
            ${this._renderMultiEntitySelect('Drain Volume Sensors', this.envDrainVolumeSensors, ['sensor','input_number','number'], null, (v) => (this.envDrainVolumeSensors = v))}
            ${this._renderMultiEntitySelect('Irrigation Flow Sensors', this.envIrrigationFlowSensors, ['sensor','input_number','number'], null, (v) => (this.envIrrigationFlowSensors = v))}
          </div>
          <div class="row-col-grid">
            ${this._renderMultiEntitySelect('Power Sensors', this.envPowerSensors, ['sensor','input_number','number'], 'power', (v) => (this.envPowerSensors = v))}
            ${this._renderMultiEntitySelect('Energy Sensors', this.envEnergySensors, ['sensor','input_number','number'], 'energy', (v) => (this.envEnergySensors = v))}
          </div>
        </div>
      </div>
    `;
  }

  private _renderTanksSection() {
    const listId = 'list-tank-sensor-entity';
    const entities = this._getEntities(['sensor','input_number'], null);
    return html`
      <div class="detail-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <div style="display:flex;align-items:center;gap:8px;">
            <svg style="width:20px;height:20px;fill:var(--primary-color,#4caf50);" viewBox="0 0 24 24"><path d="${mdiWater}"></path></svg>
            <h3 style="margin:0;border:none;padding:0;">Irrigation Tanks</h3>
          </div>
          <button class="md3-button tonal" @click=${this._openAddTank} style="padding:6px 12px;">
            <svg style="width:16px;height:16px;fill:currentColor;margin-right:4px;" viewBox="0 0 24 24"><path d="${mdiPlus}"></path></svg>
            Add Tank
          </button>
        </div>

        ${this.envIrrigationTanks.length === 0 && !this._showTankForm
          ? html`<div style="font-size:0.85rem;color:var(--secondary-text-color);padding:8px 0;">No tanks configured.</div>`
          : nothing}

        <div style="display:flex;flex-direction:column;gap:8px;">
          ${this.envIrrigationTanks.map((tank, i) => html`
            <div style="display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,0.05);padding:10px 12px;border-radius:8px;">
              <div>
                <div style="font-weight:500;">${tank.name || 'Tank ' + (i + 1)}</div>
                <div style="font-size:0.78rem;color:var(--secondary-text-color);">
                  ${tank.sensorEntity}
                  ${tank.volumeLiters != null ? html` · ${tank.volumeLiters} L` : nothing}
                  · warn at ${tank.warningLevel ?? 30}%
                </div>
              </div>
              <div style="display:flex;gap:6px;">
                <button class="md3-button text" @click=${() => this._editTank(i)} style="padding:6px;min-width:auto;">
                  <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiPencil}"></path></svg>
                </button>
                <button class="md3-button text error" @click=${() => this._deleteTank(i)} style="padding:6px;min-width:auto;">
                  <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiDelete}"></path></svg>
                </button>
              </div>
            </div>
          `)}
        </div>

        ${this._showTankForm ? html`
          <div style="margin-top:12px;background:rgba(255,255,255,0.04);border:1px solid var(--divider-color,rgba(255,255,255,0.15));border-radius:8px;padding:16px;display:flex;flex-direction:column;gap:12px;">
            <div class="md3-input-group">
              <label class="md3-label">Sensor Entity *</label>
              <input class="md3-input" list="${listId}" .value=${this._tankDraft.sensorEntity}
                @input=${(e: Event) => { this._tankDraft = { ...this._tankDraft, sensorEntity: (e.target as HTMLInputElement).value }; }}
                placeholder="Search entity..." />
              <datalist id="${listId}">
                ${entities.map((eid) => html`<option value="${eid}"></option>`)}
              </datalist>
            </div>
            <div class="md3-input-group">
              <label class="md3-label">Name</label>
              <input class="md3-input" type="text" .value=${this._tankDraft.name}
                @input=${(e: Event) => { this._tankDraft = { ...this._tankDraft, name: (e.target as HTMLInputElement).value }; }}
                placeholder="e.g. Main Tank" />
            </div>
            <div class="row-col-grid">
              <div class="md3-input-group">
                <label class="md3-label">Volume (L, optional)</label>
                <input class="md3-input" type="number" min="0" step="0.1"
                  .value=${this._tankDraft.volumeLiters != null ? String(this._tankDraft.volumeLiters) : ''}
                  @input=${(e: Event) => {
                    const v = (e.target as HTMLInputElement).value;
                    this._tankDraft = { ...this._tankDraft, volumeLiters: v === '' ? null : parseFloat(v) };
                  }}
                  placeholder="e.g. 100" />
              </div>
              <div class="md3-input-group">
                <label class="md3-label">Warning Level (%)</label>
                <input class="md3-input" type="number" min="0" max="100" step="1"
                  .value=${String(this._tankDraft.warningLevel)}
                  @input=${(e: Event) => {
                    this._tankDraft = { ...this._tankDraft, warningLevel: parseFloat((e.target as HTMLInputElement).value) || 30 };
                  }} />
              </div>
            </div>
            <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:4px;">
              <button class="md3-button tonal" @click=${this._cancelTank}>Cancel</button>
              <button class="md3-button primary" @click=${this._saveTank}>Save Tank</button>
            </div>
          </div>
        ` : nothing}
      </div>
    `;
  }

  private _renderVisionSection() {
    return html`
      <div class="detail-card">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;border-bottom:1px solid var(--divider-color,rgba(255,255,255,0.1));padding-bottom:8px;">
          <svg style="width:20px;height:20px;fill:var(--primary-color,#4caf50);" viewBox="0 0 24 24"><path d="${mdiCamera}"></path></svg>
          <h3 style="margin:0;border:none;padding:0;">Vision Checkup</h3>
        </div>
        ${this._renderMultiEntitySelect('Camera Entities', this.envVisionCameraEntities, ['camera'], null, (v) => (this.envVisionCameraEntities = v))}
        ${this.envVisionCameraEntities.length === 0
          ? html`<p style="opacity:0.6;font-size:0.85rem;margin:8px 0 0;">Add camera entities above to enable vision checkups.</p>`
          : html`
            <div class="form-section" style="margin-top:12px;">
              <label class="checkbox-label">
                <input type="checkbox" .checked=${this.envVisionEnabled}
                  @change=${(e: Event) => { this.envVisionEnabled = (e.target as HTMLInputElement).checked; }} />
                Enable automatic vision checkups
              </label>
              <md3-number-input label="Early check offset (min after lights on)" .value=${this.envVisionEarlyOffset}
                @change=${(e: CustomEvent) => { this.envVisionEarlyOffset = Number(e.detail); }} min="1">
              </md3-number-input>
              <md3-number-input label="Mid check (hours into light cycle)" .value=${this.envVisionMidHours}
                @change=${(e: CustomEvent) => { this.envVisionMidHours = Number(e.detail); }} min="1">
              </md3-number-input>
              <md3-number-input label="Late check offset (min before lights off)" .value=${this.envVisionLateOffset}
                @change=${(e: CustomEvent) => { this.envVisionLateOffset = Number(e.detail); }} min="1">
              </md3-number-input>
              <div style="display:flex;justify-content:flex-end;">
                <button class="md3-button primary vision-save-btn" @click=${this._submitVisionCheckupConfig}>
                  Save Vision Config
                </button>
              </div>
            </div>
          `}
      </div>
    `;
  }

  private _renderHeatmapSection() {
    return html`
      <div class="detail-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <h3>Sensor Groups</h3>
          <button class="md3-button tonal" @click=${this._openAddGroup}>Add Group</button>
        </div>
        ${this.envSensorGroups.length === 0
          ? html`<div style="text-align:center;padding:20px;color:var(--secondary-text-color);">No sensor groups configured.</div>`
          : html`
            <div style="display:flex;flex-direction:column;gap:8px;">
              ${this.envSensorGroups.map((group) => html`
                <div style="display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,0.05);padding:12px;border-radius:8px;">
                  <div>
                    <div style="font-weight:500;">${group.name}</div>
                    <div style="font-size:0.8rem;color:var(--secondary-text-color);">X: ${group.x}, Y: ${group.y}, Z: ${group.z}</div>
                  </div>
                  <div style="display:flex;gap:8px;">
                    <button class="md3-button text" @click=${() => this._editGroup(group)} style="padding:8px;min-width:auto;">
                      <svg style="width:20px;height:20px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiPencil}"></path></svg>
                    </button>
                    <button class="md3-button text error" @click=${() => this._deleteGroup(group.id)} style="padding:8px;min-width:auto;">
                      <svg style="width:20px;height:20px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiDelete}"></path></svg>
                    </button>
                  </div>
                </div>
              `)}
            </div>
          `}
      </div>
    `;
  }

  private _renderSubareasSection() {
    const growspaceId = this.envSelectedId || this.editSelectedId;
    if (!growspaceId) {
      return html`
        <div class="detail-card">
          <h3>Subareas</h3>
          <div style="text-align:center;padding:20px;color:var(--secondary-text-color);">
            Select a growspace in the Sensors tab first.
          </div>
        </div>
      `;
    }
    return html`
      <div class="detail-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <h3 style="margin:0;">Subareas</h3>
          <button class="md3-button tonal" @click=${() => { this._showAddSubarea = true; this._newSubareaName = ''; }}>
            <svg style="width:18px;height:18px;fill:currentColor;margin-right:6px;" viewBox="0 0 24 24"><path d="${mdiPlus}"></path></svg>
            Add Subarea
          </button>
        </div>

        ${this._showAddSubarea ? html`
          <div style="display:flex;gap:8px;align-items:center;margin-bottom:16px;background:rgba(255,255,255,0.05);padding:12px;border-radius:8px;">
            <input class="md3-input" style="flex:1;" placeholder="Subarea name..."
              .value=${this._newSubareaName}
              @input=${(e: Event) => (this._newSubareaName = (e.target as HTMLInputElement).value)}
              @keydown=${(e: KeyboardEvent) => { if (e.key === 'Enter') this._handleAddSubarea(); }} />
            <button class="md3-button primary" @click=${this._handleAddSubarea} ?disabled=${!this._newSubareaName.trim()}>Add</button>
            <button class="md3-button tonal" @click=${() => (this._showAddSubarea = false)}>Cancel</button>
          </div>
        ` : nothing}

        ${this._subareasLoading
          ? html`<div style="text-align:center;padding:20px;color:var(--secondary-text-color);">Loading...</div>`
          : this._subareas.length === 0
            ? html`<div style="text-align:center;padding:20px;color:var(--secondary-text-color);">No subareas configured. Add one to get started.</div>`
            : html`
              <div style="display:flex;flex-direction:column;gap:8px;">
                ${this._subareas.map((subarea) => html`
                  <div style="display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,0.05);padding:12px;border-radius:8px;">
                    <div>
                      <div style="font-weight:500;">${subarea.name}</div>
                      <div style="font-size:0.8rem;color:var(--secondary-text-color);">ID: ${subarea.id}</div>
                    </div>
                    <div style="display:flex;gap:4px;align-items:center;">
                      ${this._deleteConfirmSubareaId === subarea.id ? html`
                        <span style="font-size:0.85rem;color:var(--secondary-text-color);margin-right:4px;">Remove ${subarea.name}?</span>
                        <button class="md3-button primary error" @click=${() => this._confirmDeleteSubarea(subarea.id)} style="padding:6px 10px;min-width:auto;font-size:0.8rem;">Yes</button>
                        <button class="md3-button tonal" @click=${() => (this._deleteConfirmSubareaId = '')} style="padding:6px 10px;min-width:auto;font-size:0.8rem;">No</button>
                      ` : html`
                        <button class="md3-button text" @click=${() => this._handleEditSubarea(subarea)} style="padding:8px;min-width:auto;" title="Edit sensors">
                          <svg style="width:20px;height:20px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiPencil}"></path></svg>
                        </button>
                        <button class="md3-button text error" @click=${() => this._handleDeleteSubarea(subarea.id)} style="padding:8px;min-width:auto;" title="Delete subarea">
                          <svg style="width:20px;height:20px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiDelete}"></path></svg>
                        </button>
                      `}
                    </div>
                  </div>
                `)}
              </div>
            `}
      </div>
    `;
  }

  // ── Main render ──────────────────────────────────────────────────────────

  private _icon(path: string, size = 24) {
    return html`<svg style="width:${size}px;height:${size}px;fill:currentColor;" viewBox="0 0 24 24"><path d="${path}"></path></svg>`;
  }

  private _navItem(tab: ConfigTab, iconPath: string, label: string) {
    if (this.allowedTabs && !this.allowedTabs.includes(tab)) return nothing;
    const active = this.currentTab === tab;
    return html`
      <div class="cfg-nav-item ${active ? 'active' : ''}" @click=${() => this._switchTab(tab)}>
        ${this._icon(iconPath, 18)}
        <span>${label}</span>
      </div>
    `;
  }

  render() {
    if (!this.open) return html``;

    if (this._showGroupDialog) {
      return html`
        <sensor-group-dialog
          .open=${true}
          .hass=${this.hass}
          .sensorGroup=${this._editingGroup}
          @close=${(e: Event) => { e.stopPropagation(); this._showGroupDialog = false; }}
          @save-sensor-group=${this._handleSaveGroup}
        ></sensor-group-dialog>
      `;
    }

    if (this._showSubareaConfigDialog && this._editingSubarea) {
      return html`
        <subarea-config-dialog
          .open=${true}
          .hass=${this.hass}
          .growspaceId=${this._subareasGrowspaceId}
          .subarea=${this._editingSubarea}
          @close=${(e: Event) => {
            e.stopPropagation();
            this._showSubareaConfigDialog = false;
            this._editingSubarea = undefined;
          }}
          @subarea-updated=${(e: CustomEvent) => {
            e.stopPropagation();
            this._showSubareaConfigDialog = false;
            this._editingSubarea = undefined;
            this._loadSubareas();
          }}
        ></subarea-config-dialog>
      `;
    }

    const showContextBar = this.currentTab !== ConfigTab.GROWSPACES;
    const showRail = !this.allowedTabs || this.allowedTabs.length !== 1;

    return html`
      <ha-dialog
        open
        @closed=${this._close}
        without-header
        scrimClickAction=""
        escapeKeyAction="close"
        width="large"
      >
        <div class="glass-dialog-container">
          <!-- Header -->
          <div class="dialog-header">
            <div class="dialog-icon">
              ${this._icon(mdiCog, 24)}
            </div>
            <div class="dialog-title-group">
              <div style="display:flex;align-items:center;gap:6px;">
                <h2 class="dialog-title">Configuration</h2>
                <gs-help-tooltip
                  content="Configure this growspace — sensor assignments, name, and integration settings."
                  placement="bottom"
                  label="Configuration"
                ></gs-help-tooltip>
              </div>
              <div class="dialog-subtitle">Manage growspaces &amp; settings</div>
            </div>
            <button class="md3-button text" @click=${this._close} style="min-width:auto;padding:8px;">
              ${this._icon(mdiClose, 24)}
            </button>
          </div>

          <!-- Body: Rail + Content -->
          <div class="cfg-body">
            <!-- Left Rail -->
            ${showRail ? html`
              <div class="cfg-rail">
                <div class="cfg-rail-caps">Setup</div>
                ${this._navItem(ConfigTab.GROWSPACES, mdiViewDashboard, 'Growspaces')}

                <div class="cfg-rail-caps">Environment</div>
                ${this._navItem(ConfigTab.SENSORS, mdiThermometer, 'Sensors')}
                ${this._navItem(ConfigTab.CLIMATE, mdiFan, 'Climate')}
                ${this._navItem(ConfigTab.HUMIDITY, mdiWaterPercent, 'Humidity')}

                <div class="cfg-rail-caps">Equipment</div>
                ${this._navItem(ConfigTab.IRRIGATION, mdiGauge, 'Irrigation')}
                ${this._navItem(ConfigTab.TANKS, mdiWater, 'Tanks')}

                <div class="cfg-rail-caps">Advanced</div>
                ${this._navItem(ConfigTab.VISION, mdiCamera, 'Vision AI')}
                ${this._navItem(ConfigTab.HEATMAP, mdiViewGrid, '3D Heatmap')}
                ${this._navItem(ConfigTab.SUBAREAS, mdiViewDashboard, 'Subareas')}
              </div>
            ` : nothing}

            <!-- Content Area -->
            <div class="cfg-content">
              <!-- Context bar: growspace selector (all sections except Growspaces) -->
              ${showContextBar ? html`
                <div class="cfg-context-bar">
                  <span class="cfg-context-label">Growspace</span>
                  <select class="cfg-context-select" .value=${this.envSelectedId} @change=${this._handleEnvGrowspaceChange}>
                    <option value="">Select...</option>
                    ${Object.entries(this.growspaceOptions).map(([id, name]) => html`
                      <option value="${id}" ?selected=${id === this.envSelectedId}>${name}</option>
                    `)}
                  </select>
                </div>
              ` : nothing}

              <!-- Scrollable content -->
              <div class="cfg-scroll">
                ${this.currentTab === ConfigTab.GROWSPACES ? this._renderGrowspacesSection() : nothing}
                ${this.currentTab === ConfigTab.SENSORS ? this._renderSensorsSection() : nothing}
                ${this.currentTab === ConfigTab.CLIMATE ? this._renderClimateSection() : nothing}
                ${this.currentTab === ConfigTab.HUMIDITY ? this._renderHumiditySection() : nothing}
                ${this.currentTab === ConfigTab.IRRIGATION ? this._renderIrrigationSection() : nothing}
                ${this.currentTab === ConfigTab.TANKS ? this._renderTanksSection() : nothing}
                ${this.currentTab === ConfigTab.VISION ? this._renderVisionSection() : nothing}
                ${this.currentTab === ConfigTab.HEATMAP ? this._renderHeatmapSection() : nothing}
                ${this.currentTab === ConfigTab.SUBAREAS ? this._renderSubareasSection() : nothing}
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="button-group">
            <button class="md3-button tonal" @click=${this._close}>Cancel</button>

            ${this.currentTab === ConfigTab.GROWSPACES && this._showDeleteConfirm ? html`
              <button class="md3-button tonal" @click=${this._cancelDeleteGrowspace}>No, Keep It</button>
              <button class="md3-button primary error" @click=${this._confirmDeleteGrowspace}>Confirm Delete</button>
            ` : nothing}

            ${this.currentTab === ConfigTab.GROWSPACES && this._isAddingGrowspace && !this._showDeleteConfirm ? html`
              <button class="md3-button primary" @click=${this._submitAddGrowspace}>Add Growspace</button>
            ` : nothing}

            ${this.currentTab === ConfigTab.GROWSPACES && this.editSelectedId && !this._isAddingGrowspace && !this._showDeleteConfirm ? html`
              <button class="md3-button tonal error" @click=${this._submitDeleteGrowspace} ?disabled=${!this.editSelectedId}>
                ${this._icon(mdiDelete, 18)} Delete
              </button>
              <button class="md3-button tonal" @click=${this._generateGrowReport} ?disabled=${!this.editSelectedId}>
                Grow Report
              </button>
              <button class="md3-button primary" @click=${this._submitGrowspaceAndEnv} ?disabled=${!this.editSelectedId}>
                Save Changes
              </button>
            ` : nothing}

            ${[ConfigTab.SENSORS, ConfigTab.CLIMATE, ConfigTab.HUMIDITY, ConfigTab.IRRIGATION, ConfigTab.TANKS, ConfigTab.VISION, ConfigTab.HEATMAP].includes(this.currentTab) ? html`
              <button class="md3-button primary" @click=${this._submitEnvironment}>Save Configuration</button>
            ` : nothing}
          </div>
        </div>
      </ha-dialog>
    `;
  }
}
