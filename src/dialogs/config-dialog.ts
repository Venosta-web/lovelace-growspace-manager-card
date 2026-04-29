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
  mdiInformation,
  mdiGauge,
  mdiFan,
  mdiAlert,
  mdiEye,
  mdiViewGrid,
  mdiPlus,
  mdiAirHumidifier,
} from '@mdi/js';
import { dialogStyles } from '../styles/dialog.styles';
import { HomeAssistant } from 'custom-card-helpers';

import '../components/ui/md3-text-input';
import '../components/ui/md3-number-input';
import '../components/ui/md3-select';
import '../components/ui/gs-help-tooltip';
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

@customElement('config-dialog')
export class ConfigDialog extends LitElement {
  @property({ type: Boolean, reflect: true }) open = false;

  @property({ attribute: false })
  public hass!: HomeAssistant;

  @property({ type: Object })
  growspaceOptions: Record<string, string> = {};

  @property({ attribute: false })
  public devices: GrowspaceDevice[] = [];

  @property({ type: String }) initialTab: ConfigTab = ConfigTab.ENVIRONMENT;

  @property({ attribute: false }) allowedTabs?: ConfigTab[];

  @property({ type: String })
  public currentTab: ConfigTab = ConfigTab.ENVIRONMENT;

  @property({ attribute: false })
  public environmentData: EnvironmentConfigData | undefined;

  private _initialStateApplied = false;

  // Add Growspace Data
  @state() private addName = '';
  @state() private addRows = 4;
  @state() private addPlantsPerRow = 4;
  @state() private addNotificationService = 'mobile_app_notify';

  // Edit Growspace Data
  @state() private editSelectedId = '';
  @state() private editName = '';
  @state() private editRows = 0;
  @state() private editPlantsPerRow = 0;
  @state() private editNotificationService = '';

  // Environment Data
  @state() private envSelectedId = '';
  @state() private envTemperatureSensor = '';
  @state() private envHumiditySensor = '';
  @state() private envVpdSensor = '';
  @state() private envCo2Sensor = '';
  @state() private envCirculationFan = '';
  @state() private envCirculationFanEntities: string[] = []; // Multi-device
  @state() private envStressThreshold = 0.8;
  @state() private envMoldThreshold = 0.8;
  @state() private envLightSensor = '';
  @state() private envLightSensors: string[] = []; // Multi-device
  @state() private envExhaustEntity = '';
  @state() private envExhaustFanEntities: string[] = []; // Multi-device
  @state() private envHumidifierEntity = '';
  @state() private envHumidifierEntities: string[] = []; // Multi-device
  @state() private envDehumidifierEntity = '';
  @state() private envDehumidifierEntities: string[] = []; // Multi-device
  @state() private envSoilMoistureSensor = '';
  @state() private envDehumidifierControlEnabled = false;
  @state() private envDehumidifierThresholds: Record<
    string,
    Record<string, { on: number; off: number }>
  > = {};
  @state() private envSensorCoordinates: Record<
    string,
    { x: number; y: number; z: number; rotation?: number }
  > = {};
  @state() private envIrrigationTanks: any[] = [];

  // Vision Checkup Config
  @state() private envVisionEnabled = false;
  @state() private envVisionEarlyOffset = 60;
  @state() private envVisionMidHours = 6;
  @state() private envVisionLateOffset = 60;
  @state() private envVisionCameraEntities: string[] = [];

  @state() private _activeDehumidifierStage: DehumidifierStage = DehumidifierStage.SEEDLING;

  // Humidifier Control
  @state() private envHumidifierControlEnabled = false;
  @state() private envHumidifierThresholds: Record<
    string,
    Record<string, { on: number; off: number }>
  > = {};
  @state() private _activeHumidifierStage: HumidifierStage = HumidifierStage.SEEDLING;

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
        --ha-dialog-width-md: 95vw;
        --ha-dialog-max-width: 98vw;
        --ha-dialog-width-full: 98vw;
        --dialog-content-padding: 0;
      }

      /* Config Tabs Specific */
      .glass-dialog-container {
        width: 100%;
        max-width: 100%;
        min-height: 0;
        height: auto;
        max-height: 90vh;
      }
      .config-tabs {
        display: flex;
        padding: 0 16px;
        border-bottom: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
        background: transparent;
      }
      .config-tab {
        flex: 1 1 0px;
        width: 0;
        min-width: 0;
        padding: 16px 8px;
        text-align: center;
        cursor: pointer;
        color: var(--secondary-text-color, rgba(255, 255, 255, 0.5));
        border-bottom: 2px solid transparent;
        transition: all 0.2s;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        font-size: 0.8rem;
        font-weight: 500;
        background: transparent;
        flex-shrink: 0;
      }
      .config-tab svg {
        width: 24px;
        height: 24px;
        margin-bottom: 4px;
        fill: currentColor;
      }
      .config-tab:hover {
        color: var(--primary-text-color, #fff);
        background: var(--secondary-background-color, rgba(255, 255, 255, 0.05));
        border-radius: 8px 8px 0 0;
      }
      .config-tab.active {
        color: var(--primary-color, #4caf50);
        border-bottom-color: var(--primary-color, #4caf50);
      }
      .config-tab.active.sensor-groups-tab {
         color: var(--accent-color, #2980b9);
         border-bottom-color: var(--accent-color, #2980b9);
      }
      .config-content {
        padding: 24px;
        overflow-y: auto;
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 16px;
        min-height: 0;
      }

      @media (max-width: 450px) {
        .glass-dialog-container {
          width: 100vw;
          max-width: 100%;
          height: 100vh;
          border-radius: 0;
        }
        .config-content {
          padding: 16px;
        }
      }
    `,

    css`
      /* Multi-Entity Select Styles */
      .multi-select-container {
        position: relative;
        margin-bottom: 20px;
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
        padding: 26px 16px 6px; /* Match MD3 padding */
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
        padding-bottom: 5px; /* Adjust for border width change */
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
      .entity-select-container {
        position: relative;
        z-index: 5;
        margin-bottom: 20px;
      }

      /* Vertical stack of row-col-grids with consistent gap */
      .form-section {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      /* Remove bottom margins when gap handles spacing */
      .form-section .entity-select-container,
      .form-section .multi-select-container {
        margin-bottom: 0;
      }

      /* Remove inner md3-input-group margin to prevent double spacing */
      .entity-select-container .md3-input-group {
        margin-bottom: 0;
      }

      /* Checkbox row in detail cards */
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

    // Apply initial tab state only once when dialog opens
    if (changedProperties.has('open')) {
      if (this.open) {
        if (!this._initialStateApplied) {
          this._initialStateApplied = true;
        }
      } else {
        // Reset flag when dialog closes so next open respects initialTab again
        this._initialStateApplied = false;
      }
    }
  }

  // Provide initial state setting from parent
  public setInitialState(
    currentTab: ConfigTab = ConfigTab.ENVIRONMENT,
    environmentData?: EnvironmentConfigData
  ) {
    this.currentTab = currentTab;
    if (environmentData) {
      this.envSelectedId = environmentData.selectedGrowspaceId;
      this.envTemperatureSensor = environmentData.temperatureSensor;
      this.envHumiditySensor = environmentData.humiditySensor;
      this.envVpdSensor = environmentData.vpdSensor;
      this.envCo2Sensor = environmentData.co2Sensor;
      this.envCirculationFan = environmentData.circulationFanEntity;
      this.envCirculationFanEntities = environmentData.circulationFanEntities || [];
      this.envStressThreshold = environmentData.stressThreshold;
      this.envMoldThreshold = environmentData.moldThreshold;
      this.envLightSensor = environmentData.lightSensor;
      this.envLightSensors = environmentData.lightSensors || [];
      this.envExhaustEntity = environmentData.exhaustEntity;
      this.envExhaustFanEntities = environmentData.exhaustFanEntities || [];
      this.envHumidifierEntity = environmentData.humidifierEntity;
      this.envHumidifierEntities = environmentData.humidifierEntities || [];
      this.envDehumidifierEntity = environmentData.dehumidifierEntity;
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
      if (environmentData.visionCheckupConfig) {
        this.envVisionEnabled = environmentData.visionCheckupConfig.enabled;
        this.envVisionEarlyOffset = environmentData.visionCheckupConfig.early_check_offset_minutes;
        this.envVisionMidHours = environmentData.visionCheckupConfig.mid_check_hours;
        this.envVisionLateOffset = environmentData.visionCheckupConfig.late_check_offset_minutes;
      }

      // Also pre-select for Edit/Delete actions
      if (environmentData.selectedGrowspaceId) {
        this._populateEditFields(environmentData.selectedGrowspaceId);
      }
    }
    if (this.currentTab === ConfigTab.SUBAREAS) {
      this._loadSubareas();
    }
  }

  private _close() {
    // Prevent closing if we are showing a sub-dialog (which implies the main dialog unmounted)
    if (this._showGroupDialog || this._showSubareaConfigDialog) return;
    this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
  }

  private _switchTab(tab: ConfigTab) {
    this.currentTab = tab;
    if (tab === ConfigTab.SUBAREAS) {
      this._loadSubareas();
    }
  }

  // --- Submission Handlers ---

  private _submitAddGrowspace() {
    this.dispatchEvent(
      new CustomEvent('add-growspace-submit', {
        detail: {
          name: this.addName,
          rows: this.addRows,
          plantsPerRow: this.addPlantsPerRow,
          notificationService: this.addNotificationService,
        },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _submitEnvironment() {
    this.dispatchEvent(
      new CustomEvent('configure-environment-submit', {
        detail: {
          selectedGrowspaceId: this.envSelectedId,
          temperatureSensor: this.envTemperatureSensor,
          humiditySensor: this.envHumiditySensor,
          vpdSensor: this.envVpdSensor,
          co2Sensor: this.envCo2Sensor,
          circulationFanEntity: this.envCirculationFan,
          circulationFanEntities: this.envCirculationFanEntities, // Multi
          stressThreshold: this.envStressThreshold,
          moldThreshold: this.envMoldThreshold,
          lightSensor: this.envLightSensor,
          lightSensors: this.envLightSensors, // Multi
          exhaustEntity: this.envExhaustEntity,
          exhaustFanEntities: this.envExhaustFanEntities, // Multi
          humidifierEntity: this.envHumidifierEntity,
          humidifierEntities: this.envHumidifierEntities, // Multi
          humidifierThresholds: this.envHumidifierThresholds,
          humidifierControlEnabled: this.envHumidifierControlEnabled,
          dehumidifierEntity: this.envDehumidifierEntity,
          dehumidifierEntities: this.envDehumidifierEntities, // Multi
          dehumidifierThresholds: this.envDehumidifierThresholds,
          soilMoistureSensor: this.envSoilMoistureSensor,
          dehumidifierControlEnabled: this.envDehumidifierControlEnabled,
          sensorGroups: this.envSensorGroups,
          sensorCoordinates: this.envSensorCoordinates,
          irrigationTanks: this.envIrrigationTanks,
        } as EnvironmentConfigEventDetail,
        bubbles: true,
        composed: true,
      })
    );
  }

  private _submitVisionCheckupConfig() {
    if (!this.envSelectedId) return;
    this.dispatchEvent(
      new CustomEvent('vision-checkup-config-submit', {
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
      })
    );
  }

  @state() private _showDeleteConfirm = false;

  private _submitEditGrowspace() {
    if (!this.editSelectedId) return;
    this.dispatchEvent(
      new CustomEvent('edit-growspace-submit', {
        detail: {
          growspaceId: this.editSelectedId,
          name: this.editName,
          rows: this.editRows,
          plantsPerRow: this.editPlantsPerRow,
          notificationService: this.editNotificationService,
        },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _submitDeleteGrowspace() {
    if (!this.editSelectedId) return;
    this._showDeleteConfirm = true;
  }

  private _confirmDeleteGrowspace() {
    this.dispatchEvent(
      new CustomEvent('delete-growspace-submit', {
        detail: {
          growspace_id: this.editSelectedId,
        },
        bubbles: true,
        composed: true,
      })
    );

    // Reset selection after delete
    this.editSelectedId = '';
    this.editName = '';
    this.editRows = 0;
    this.editPlantsPerRow = 0;
    this.editNotificationService = '';
    this._showDeleteConfirm = false;
  }

  private _cancelDeleteGrowspace() {
    this._showDeleteConfirm = false;
  }

  private _generateGrowReport() {
    if (!this.editSelectedId) return;
    this.dispatchEvent(
      new CustomEvent('generate-grow-report', {
        detail: {
          growspace_id: this.editSelectedId,
        },
        bubbles: true,
        composed: true,
      })
    );
  }

  private async _handleRemoveEnvironment() {
    if (!this.envSelectedId) return;

    const confirmed = window.confirm(
      'Are you sure you want to remove the environment configuration for this growspace? This will disconnect all sensors and controllers from this growspace.'
    );

    if (!confirmed) return;

    try {
      this.dispatchEvent(
        new CustomEvent('remove-environment-submit', {
          detail: {
            growspace_id: this.envSelectedId,
          },
          bubbles: true,
          composed: true,
        })
      );
      // Refresh fields after removal
      setTimeout(() => {
        if (this.envSelectedId) {
          this._handleEnvGrowspaceChange({
            target: { value: this.envSelectedId },
          } as any);
        }
      }, 1000);
    } catch (e) {
      console.error('Failed to remove environment:', e);
    }
  }

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

  private _handleEditSelection(e: Event) {
    const growspaceId = (e.target as HTMLSelectElement).value;
    this._populateEditFields(growspaceId);
  }

  render() {
    if (!this.open) return html``;

    if (this._showGroupDialog) {
      return html`
        <sensor-group-dialog
          .open=${true}
          .hass=${this.hass}
          .sensorGroup=${this._editingGroup}
          @close=${(e: Event) => {
          e.stopPropagation();
          this._showGroupDialog = false;
        }}
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

    return html`
      <ha-dialog
        open
        @closed=${this._close}
        scrimClickAction=""
        escapeKeyAction="close"
        width="full"
      >
        <div class="glass-dialog-container">
          <!--Header -->
          <div class="dialog-header">
            <div class="dialog-icon">
              <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24">
                <path d="${mdiCog}"></path>
              </svg>
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
              <div class="dialog-subtitle">Manage growspaces & settings</div>
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

          <!--Tabs -->
          <div class="config-tabs">
            ${!this.allowedTabs || this.allowedTabs.includes(ConfigTab.ADD_GROWSPACE) ? html`
            <div
              class="config-tab ${this.currentTab === ConfigTab.ADD_GROWSPACE ? 'active' : ''}"
              @click=${() => this._switchTab(ConfigTab.ADD_GROWSPACE)}
            >
              <svg viewBox="0 0 24 24"><path d="${mdiViewDashboard}"></path></svg>
              Add Growspace
            </div>` : nothing}
            ${!this.allowedTabs || this.allowedTabs.includes(ConfigTab.EDIT_GROWSPACE) ? html`
            <div
              class="config-tab ${this.currentTab === ConfigTab.EDIT_GROWSPACE ? 'active' : ''}"
              @click=${() => this._switchTab(ConfigTab.EDIT_GROWSPACE)}
            >
              <svg viewBox="0 0 24 24"><path d="${mdiPencil}"></path></svg>
              Edit Growspace
            </div>` : nothing}
            ${!this.allowedTabs || this.allowedTabs.includes(ConfigTab.ENVIRONMENT) ? html`
            <div
              class="config-tab ${this.currentTab === ConfigTab.ENVIRONMENT ? 'active' : ''}"
              @click=${() => this._switchTab(ConfigTab.ENVIRONMENT)}
            >
              <svg viewBox="0 0 24 24"><path d="${mdiThermometer}"></path></svg>
              Environment
            </div>` : nothing}
            ${!this.allowedTabs || this.allowedTabs.includes(ConfigTab.DEHUMIDIFIER) ? html`
            <div
              class="config-tab ${this.currentTab === ConfigTab.DEHUMIDIFIER ? 'active' : ''}"
              @click=${() => this._switchTab(ConfigTab.DEHUMIDIFIER)}
            >
              <svg viewBox="0 0 24 24"><path d="${mdiWaterPercent}"></path></svg>
              Dehumidifier
            </div>` : nothing}
            ${!this.allowedTabs || this.allowedTabs.includes(ConfigTab.HUMIDIFIER) ? html`
            <div
              class="config-tab ${this.currentTab === ConfigTab.HUMIDIFIER ? 'active' : ''}"
              @click=${() => this._switchTab(ConfigTab.HUMIDIFIER)}
            >
              <svg viewBox="0 0 24 24"><path d="${mdiAirHumidifier}"></path></svg>
              Humidifier
            </div>` : nothing}
            ${!this.allowedTabs || this.allowedTabs.includes(ConfigTab.SENSOR_GROUPS) ? html`
            <div
              class="config-tab sensor-groups-tab ${this.currentTab === ConfigTab.SENSOR_GROUPS ? 'active' : ''}"
              @click=${() => this._switchTab(ConfigTab.SENSOR_GROUPS)}
            >
               <svg viewBox="0 0 24 24"><path d="M12,11.5A2.5,2.5 0 0,1 9.5,9A2.5,2.5 0 0,1 12,6.5A2.5,2.5 0 0,1 14.5,9A2.5,2.5 0 0,1 12,11.5M12,2A7,7 0 0,0 5,9C5,14.25 12,22 12,22C12,22 19,14.25 19,9A7,7 0 0,0 12,2Z"></path></svg>
              3D Heatmap
            </div>` : nothing}
            ${!this.allowedTabs || this.allowedTabs.includes(ConfigTab.SUBAREAS) ? html`
            <div
              class="config-tab ${this.currentTab === ConfigTab.SUBAREAS ? 'active' : ''}"
              @click=${() => this._switchTab(ConfigTab.SUBAREAS)}
            >
              <svg viewBox="0 0 24 24"><path d="${mdiViewGrid}"></path></svg>
              Subareas
            </div>` : nothing}
          </div>

          <!--Content -->
          <div class="config-content">
            ${this.currentTab === ConfigTab.ADD_GROWSPACE ? this.renderAddGrowspaceTab() : nothing}
            ${this.currentTab === ConfigTab.EDIT_GROWSPACE
        ? this.renderEditGrowspaceTab()
        : nothing
      }
            ${this.currentTab === ConfigTab.ENVIRONMENT ? this.renderEnvironmentTab() : nothing}
            ${this.currentTab === ConfigTab.DEHUMIDIFIER ? this.renderDehumidifierTab() : nothing}
            ${this.currentTab === ConfigTab.HUMIDIFIER ? this.renderHumidifierTab() : nothing}
            ${this.currentTab === ConfigTab.SENSOR_GROUPS ? this.renderSensorGroupsTab() : nothing}
            ${this.currentTab === ConfigTab.SUBAREAS ? this.renderSubareasTab() : nothing}
          </div>

          <!--Actions -->
          <div class="button-group">
            <button class="md3-button tonal" @click=${this._close}>Cancel</button>
            ${this.currentTab === ConfigTab.ADD_GROWSPACE
        ? html`
                  <button class="md3-button primary" @click=${this._submitAddGrowspace}>
                    Add Growspace
                  </button>
                `
        : nothing
      }
            ${[ConfigTab.ENVIRONMENT, ConfigTab.DEHUMIDIFIER, ConfigTab.HUMIDIFIER, ConfigTab.SENSOR_GROUPS].includes(this.currentTab)
        ? html`
                  <button class="md3-button primary" @click=${this._submitEnvironment}>
                    Save Configuration
                  </button>
                `
        : nothing
      }
            ${this.currentTab === ConfigTab.EDIT_GROWSPACE && !this._showDeleteConfirm
        ? html`
                  <button
                    class="md3-button tonal error"
                    @click=${this._submitDeleteGrowspace}
                    ?disabled=${!this.editSelectedId}
                  >
                    <svg
                      style="width:18px;height:18px;fill:currentColor;margin-right:8px"
                      viewBox="0 0 24 24"
                    >
                      <path d="${mdiDelete}"></path>
                    </svg>
                    Delete
                  </button>
                  <button
                    class="md3-button tonal"
                    @click=${this._generateGrowReport}
                    ?disabled=${!this.editSelectedId}
                  >
                    <svg
                      style="width:18px;height:18px;fill:currentColor;margin-right:8px"
                      viewBox="0 0 24 24"
                    >
                      <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M13.5,16V19L10.5,16.5L7.5,19V16A1.5,1.5 0 0,1 6,14.5V11A1.5,1.5 0 0,1 7.5,9.5H13.5A1.5,1.5 0 0,1 15,11V14.5A1.5,1.5 0 0,1 13.5,16M13,9V3.5L18.5,9H13Z"></path>
                    </svg>
                    Grow Report
                  </button>
                  <button
                    class="md3-button primary"
                    @click=${this._submitEditGrowspace}
                    ?disabled=${!this.editSelectedId}
                  >
                    Save Changes
                  </button>
                `
        : nothing
      }
          </div>
        </div>
      </ha-dialog>
    `;
  }

  private renderSensorGroupsTab() {
    return html`
      <div class="detail-card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
          <h3>Sensor Groups</h3>
          <button class="md3-button tonal" @click=${this._openAddGroup}>
            Add Group
          </button>
        </div>
        
        ${this.envSensorGroups.length === 0
        ? html`<div style="text-align:center; padding:20px; color:var(--secondary-text-color);">No sensor groups configured.</div>`
        : html`
            <div style="display:flex; flex-direction:column; gap:8px;">
              ${this.envSensorGroups.map(group => html`
                <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.05); padding:12px; border-radius:8px;">
                  <div>
                    <div style="font-weight:500;">${group.name}</div>
                    <div style="font-size:0.8rem; color:var(--secondary-text-color);">
                      X: ${group.x}, Y: ${group.y}, Z: ${group.z}
                    </div>
                  </div>
                  <div style="display:flex; gap:8px;">
                    <button class="md3-button text" @click=${() => this._editGroup(group)} style="padding:8px; min-width:auto;">
                      <svg style="width:20px;height:20px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiPencil}"></path></svg>
                    </button>
                    <button class="md3-button text error" @click=${() => this._deleteGroup(group.id)} style="padding:8px; min-width:auto;">
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

  private _openAddGroup() {
    this._editingGroup = undefined;
    this._showGroupDialog = true;
  }

  private _editGroup(group: import('../types').SensorGroup) {
    this._editingGroup = group;
    this._showGroupDialog = true;
  }

  private _deleteGroup(id: string) {
    this.envSensorGroups = this.envSensorGroups.filter(g => g.id !== id);
  }

  private _handleSaveGroup(e: CustomEvent) {
    const group = e.detail.group as import('../types').SensorGroup;
    const index = this.envSensorGroups.findIndex(g => g.id === group.id);

    if (index >= 0) {
      // Update existing
      const newGroups = [...this.envSensorGroups];
      newGroups[index] = group;
      this.envSensorGroups = newGroups;
    } else {
      // Add new
      this.envSensorGroups = [...this.envSensorGroups, group];
    }

    this._showGroupDialog = false;
  }

  // --- Subareas ---

  private _getDataService(): DataService {
    if (!this._dataService) {
      this._dataService = new DataService(this.hass);
    }
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

  private renderSubareasTab() {
    const growspaceId = this.envSelectedId || this.editSelectedId;
    if (!growspaceId) {
      return html`
        <div class="detail-card">
          <h3>Subareas</h3>
          <div style="text-align:center; padding:20px; color:var(--secondary-text-color);">
            Please select a growspace in the Environment tab first.
          </div>
        </div>
      `;
    }

    return html`
      <div class="detail-card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
          <h3 style="margin:0;">Subareas</h3>
          <button class="md3-button tonal" @click=${() => { this._showAddSubarea = true; this._newSubareaName = ''; }}>
            <svg style="width:18px;height:18px;fill:currentColor;margin-right:6px;" viewBox="0 0 24 24">
              <path d="${mdiPlus}"></path>
            </svg>
            Add Subarea
          </button>
        </div>

        ${this._showAddSubarea
          ? html`
            <div style="display:flex; gap:8px; align-items:center; margin-bottom:16px; background:rgba(255,255,255,0.05); padding:12px; border-radius:8px;">
              <input
                class="md3-input"
                style="flex:1;"
                placeholder="Subarea name..."
                .value=${this._newSubareaName}
                @input=${(e: Event) => (this._newSubareaName = (e.target as HTMLInputElement).value)}
                @keydown=${(e: KeyboardEvent) => { if (e.key === 'Enter') this._handleAddSubarea(); }}
              />
              <button class="md3-button primary" @click=${this._handleAddSubarea} ?disabled=${!this._newSubareaName.trim()}>
                Add
              </button>
              <button class="md3-button tonal" @click=${() => (this._showAddSubarea = false)}>
                Cancel
              </button>
            </div>
          `
          : nothing}

        ${this._subareasLoading
          ? html`<div style="text-align:center; padding:20px; color:var(--secondary-text-color);">Loading...</div>`
          : this._subareas.length === 0
            ? html`<div style="text-align:center; padding:20px; color:var(--secondary-text-color);">No subareas configured. Add one to get started.</div>`
            : html`
              <div style="display:flex; flex-direction:column; gap:8px;">
                ${this._subareas.map((subarea) => html`
                  <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.05); padding:12px; border-radius:8px;">
                    <div>
                      <div style="font-weight:500;">${subarea.name}</div>
                      <div style="font-size:0.8rem; color:var(--secondary-text-color);">ID: ${subarea.id}</div>
                    </div>
                    <div style="display:flex; gap:4px; align-items:center;">
                      ${this._deleteConfirmSubareaId === subarea.id
                        ? html`
                          <span style="font-size:0.85rem; color:var(--secondary-text-color); margin-right:4px;">Remove ${subarea.name}?</span>
                          <button class="md3-button primary error" @click=${() => this._confirmDeleteSubarea(subarea.id)} style="padding:6px 10px; min-width:auto; font-size:0.8rem;">
                            Yes
                          </button>
                          <button class="md3-button tonal" @click=${() => (this._deleteConfirmSubareaId = '')} style="padding:6px 10px; min-width:auto; font-size:0.8rem;">
                            No
                          </button>
                        `
                        : html`
                          <button class="md3-button text" @click=${() => this._handleEditSubarea(subarea)} style="padding:8px; min-width:auto;" title="Edit sensors">
                            <svg style="width:20px;height:20px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiPencil}"></path></svg>
                          </button>
                          <button class="md3-button text error" @click=${() => this._handleDeleteSubarea(subarea.id)} style="padding:8px; min-width:auto;" title="Delete subarea">
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

  private renderAddGrowspaceTab() {
    return html`
      <div style="display:flex; flex-direction:column; gap:20px;">
        <div class="detail-card">
          <h3>New Growspace Details</h3>
          <md3-text-input
            label="Growspace Name"
            .value=${this.addName}
            @change=${(e: CustomEvent) => (this.addName = e.detail)}
          >
          </md3-text-input>
          <div class="row-col-grid">
            <md3-number-input
              label="Rows"
              .value=${this.addRows}
              @change=${(e: CustomEvent) => (this.addRows = parseInt(e.detail))}
            >
            </md3-number-input>
            <md3-number-input
              label="Plants per Row"
              .value=${this.addPlantsPerRow}
              @change=${(e: CustomEvent) => (this.addPlantsPerRow = parseInt(e.detail))}
            >
            </md3-number-input>
          </div>
          <div class="md3-input-group">
            <label class="md3-label"> Notification Service(Mobile App) </label>
            <select
              class="md3-input"
              .value=${this.addNotificationService}
              @change=${(e: Event) =>
        (this.addNotificationService = (e.target as HTMLSelectElement).value)}
            >
              <option value="">None</option>
              ${this._getMobileAppNotifyServices().map(
          (service) =>
            html`<option
                    value="${service.value}"
                    ?selected=${this.addNotificationService === service.value}
                  >
                    ${service.label}
                  </option>`
        )}
            </select>
          </div>
          <md3-text-input
            label="Notification Service (Optional)"
            .value=${this.addNotificationService}
            @change=${(e: CustomEvent) => (this.addNotificationService = e.detail)}
            style="display:none;"
          >
          </md3-text-input>
        </div>
      </div>
    `;
  }

  private _getMobileAppNotifyServices() {
    if (!this.hass || !this.hass.services || !this.hass.services.notify) return [];
    return Object.keys(this.hass.services.notify)
      .filter((service) => service.startsWith('mobile_app_'))
      .map((service) => ({
        label: service.replace('mobile_app_', ''),
        value: service, // Service name within notify domain
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
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

  // Helper to render multi-select entities
  private _renderMultiEntitySelect(
    label: string,
    values: string[],
    domains: string[],
    deviceClass: string | null,
    changeHandler: (values: string[]) => void
  ) {
    const listId = `list-multi-${label.replace(/[^a-z0-9]/gi, '-').toLowerCase()} `;
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

  // Add helper to render selects
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

  private renderEditGrowspaceTab() {
    if (this._showDeleteConfirm) {
      return html`
        <div class="detail-card" style="text-align: center; padding: 40px 20px;">
          <h3 style="color: var(--error-color, #ff5252);">Delete Growspace?</h3>
          <p style="margin-bottom: 30px; color: var(--secondary-text-color);">
            Are you sure you want to delete "<strong>${this.editName}</strong>" ? <br />
            This will remove all associated plants and history.<br />
            This action cannot be undone.
          </p>
          <div class="button-group" style="justify-content: center; gap: 16px;">
            <button class="md3-button tonal" @click=${this._cancelDeleteGrowspace}>Cancel</button>
            <button class="md3-button primary error" @click=${this._confirmDeleteGrowspace}>
              Confirm Delete
            </button>
          </div>
        </div>
      `;
    }

    return html`
      <div style="display:flex; flex-direction:column; gap:20px;">
        <div class="detail-card">
          <h3>Select Growspace to Edit</h3>
          <div class="md3-input-group">
            <label class="md3-label"> Growspace </label>
            <select
              class="md3-input"
              .value=${this.editSelectedId}
              @change=${this._handleEditSelection}
            >
              <option value="">Select...</option>
              ${Object.entries(this.growspaceOptions).map(
      ([id, name]) =>
        html`<option value="${id}" ?selected=${id === this.editSelectedId}>
                    ${name}
                  </option>`
    )}
            </select>
          </div>
        </div>

        ${this.editSelectedId
        ? html`
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
                    @change=${(e: Event) =>
            (this.editNotificationService = (e.target as HTMLSelectElement).value)}
                  >
                    <option value="">None</option>
                    ${this._getMobileAppNotifyServices().map(
              (service) =>
                html`<option
                          value="${service.value}"
                          ?selected=${this.editNotificationService === service.value}
                        >
                          ${service.label}
                        </option>`
            )}
                  </select>
                </div>
              </div>
            `
        : html`
              <div style="text-align:center; padding: 20px; color: var(--secondary-text-color);">
                Please select a growspace to edit.
              </div>
            `}
      </div>
    `;
  }

  private renderEnvironmentTab() {
    return html`
      <div style="display:flex; flex-direction:column; gap:20px;">
        <!--Target Selection-->
        <div class="detail-card">
          <h3>Select Target</h3>
          <div class="md3-input-group">
            <label class="md3-label"> Growspace </label>
            <select
              class="md3-input"
              .value=${this.envSelectedId}
              @change=${this._handleEnvGrowspaceChange}
            >
              <option value="">Select...</option>
              ${Object.entries(this.growspaceOptions).map(
      ([id, name]) =>
        html`<option value="${id}" ?selected=${id === this.envSelectedId}>
                    ${name}
                  </option>`
    )}
            </select>
          </div>
        </div>

        <!--Monitoring Section-->
        <div class="detail-card">
          <div
            style="display:flex; align-items:center; gap:8px; margin-bottom:16px; border-bottom: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1)); padding-bottom: 8px;"
          >
            <svg
              style="width:20px;height:20px;fill:var(--primary-color, #4caf50);"
              viewBox="0 0 24 24"
            >
              <path d="${mdiGauge}"></path>
            </svg>
            <h3 style="margin:0; border:none; padding:0;">Monitoring</h3>
          </div>

          <div class="form-section">
            <div class="row-col-grid">
              ${this._renderEntitySelect(
      'Temperature Sensor',
      this.envTemperatureSensor,
      ['sensor', 'input_number'],
      'temperature',
      (e: CustomEvent) => (this.envTemperatureSensor = e.detail.value)
    )}
              ${this._renderEntitySelect(
      'Humidity Sensor',
      this.envHumiditySensor,
      ['sensor', 'input_number'],
      'humidity',
      (e: CustomEvent) => (this.envHumiditySensor = e.detail.value)
    )}
            </div>
            <div class="row-col-grid">
              ${this._renderEntitySelect(
      'VPD Sensor (Optional)',
      this.envVpdSensor,
      ['sensor', 'input_number'],
      'pressure',
      (e: CustomEvent) => (this.envVpdSensor = e.detail.value)
    )}
              ${this._renderEntitySelect(
      'Soil Moisture Sensor',
      this.envSoilMoistureSensor,
      ['sensor', 'input_number'],
      'moisture',
      (e: CustomEvent) => (this.envSoilMoistureSensor = e.detail.value)
    )}
            </div>
            <div class="row-col-grid">
              ${this._renderEntitySelect(
      'CO2 Sensor',
      this.envCo2Sensor,
      ['sensor', 'input_number'],
      'carbon_dioxide',
      (e: CustomEvent) => (this.envCo2Sensor = e.detail.value)
    )}
              ${this._renderMultiEntitySelect(
      'Light Source / Sensor',
      this.envLightSensors,
      ['switch', 'light', 'input_boolean', 'sensor'],
      null,
      (values: string[]) => (this.envLightSensors = values)
    )}
            </div>
          </div>
        </div>

        <!--Climate Control Section-->
        <div class="detail-card">
          <div
            style="display:flex; align-items:center; gap:8px; margin-bottom:16px; border-bottom: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1)); padding-bottom: 8px;"
          >
            <svg
              style="width:20px;height:20px;fill:var(--primary-color, #4caf50);"
              viewBox="0 0 24 24"
            >
              <path d="${mdiFan}"></path>
            </svg>
            <h3 style="margin:0; border:none; padding:0;">Climate Control</h3>
          </div>

          <div class="form-section">
            <div class="row-col-grid">
              ${this._renderMultiEntitySelect(
      'Exhaust Fan / Switch',
      this.envExhaustFanEntities,
      ['fan', 'switch', 'input_boolean', 'sensor', 'binary_sensor', 'input_number'],
      null,
      (values: string[]) => (this.envExhaustFanEntities = values)
    )}
              ${this._renderMultiEntitySelect(
      'Circulation Fan / Switch',
      this.envCirculationFanEntities,
      ['fan', 'switch', 'input_boolean', 'sensor', 'input_number'],
      null,
      (values: string[]) => (this.envCirculationFanEntities = values)
    )}
            </div>
            <div class="row-col-grid">
              ${this._renderMultiEntitySelect(
      'Humidifier',
      this.envHumidifierEntities,
      ['humidifier', 'switch', 'input_boolean', 'sensor', 'binary_sensor', 'input_number'],
      null,
      (values: string[]) => (this.envHumidifierEntities = values)
    )}
              ${this._renderMultiEntitySelect(
      'Dehumidifier',
      this.envDehumidifierEntities,
      ['humidifier', 'switch', 'input_boolean', 'sensor', 'binary_sensor'],
      null,
      (values: string[]) => (this.envDehumidifierEntities = values)
    )}
            </div>
            <div class="control-row">
              <button
                class="md3-button tonal error"
                @click=${this._handleRemoveEnvironment}
                ?disabled=${!this.envSelectedId}
              >
                Remove Environment
              </button>
              <label class="checkbox-label">
                <input
                  type="checkbox"
                  .checked=${this.envDehumidifierControlEnabled}
                  @change=${(e: Event) =>
        (this.envDehumidifierControlEnabled = (e.target as HTMLInputElement).checked)}
                />
                Control Dehumidifier
              </label>
            </div>
          </div>
        </div>

        <!--Thresholds Section-->
        <div class="detail-card">
          <div
            style="display:flex; align-items:center; gap:8px; margin-bottom:16px; border-bottom: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1)); padding-bottom: 8px;"
          >
            <svg style="width:20px;height:20px;fill:#ff9800;" viewBox="0 0 24 24">
              <path d="${mdiAlert}"></path>
            </svg>
            <h3 style="margin:0; border:none; padding:0;">Thresholds</h3>
          </div>

          <div class="row-col-grid">
            <md3-number-input
              label="Stress Threshold %"
              .value=${this.envStressThreshold}
              @change=${(e: CustomEvent) => (this.envStressThreshold = parseFloat(e.detail))}
              step="0.01"
            >
            </md3-number-input>
            <md3-number-input
              label="Mold Threshold %"
              .value=${this.envMoldThreshold}
              @change=${(e: CustomEvent) => (this.envMoldThreshold = parseFloat(e.detail))}
              step="0.01"
            >
            </md3-number-input>
          </div>
        </div>

        <!--Vision Checkup Section-->
        <div class="detail-card vision-checkup-section">
          <div
            style="display:flex; align-items:center; gap:8px; margin-bottom:16px; border-bottom: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1)); padding-bottom: 8px;"
          >
            <svg style="width:20px;height:20px;fill:var(--primary-color, #4caf50);" viewBox="0 0 24 24">
              <path d="${mdiEye}"></path>
            </svg>
            <h3 style="margin:0; border:none; padding:0;">Vision Checkup</h3>
          </div>
          ${this.envVisionCameraEntities.length === 0
            ? html`<p class="vision-no-cameras-info" style="opacity:0.6;font-size:0.85rem;margin:0;">Configure camera entities first to enable vision checkups.</p>`
            : html`
              <div class="form-section">
                <label class="checkbox-label">
                  <input
                    type="checkbox"
                    class="vision-enabled-toggle"
                    .checked=${this.envVisionEnabled}
                    @change=${(e: Event) => { this.envVisionEnabled = (e.target as HTMLInputElement).checked; }}
                  />
                  Enable automatic vision checkups
                </label>
                <md3-number-input
                  label="Early check offset (min after lights on)"
                  .value=${this.envVisionEarlyOffset}
                  @change=${(e: CustomEvent) => { this.envVisionEarlyOffset = Number(e.detail); }}
                  min="1">
                </md3-number-input>
                <md3-number-input
                  label="Mid check (hours into light cycle)"
                  .value=${this.envVisionMidHours}
                  @change=${(e: CustomEvent) => { this.envVisionMidHours = Number(e.detail); }}
                  min="1">
                </md3-number-input>
                <md3-number-input
                  label="Late check offset (min before lights off)"
                  .value=${this.envVisionLateOffset}
                  @change=${(e: CustomEvent) => { this.envVisionLateOffset = Number(e.detail); }}
                  min="1">
                </md3-number-input>
                <div style="display:flex;justify-content:flex-end;">
                  <button class="md3-button primary vision-save-btn" @click=${this._submitVisionCheckupConfig}>
                    Save Vision Config
                  </button>
                </div>
              </div>
            `
          }
        </div>
      </div>
    `;
  }

  private _handleEnvGrowspaceChange(e: Event) {
    const target = e.target as HTMLSelectElement;
    const growspaceId = target.value;
    this.envSelectedId = growspaceId;

    // Find the device in the passed devices array (from store state upstream)
    const device = this.devices.find((d) => d.deviceId === growspaceId);
    if (device && device.environmentAttributes) {
      const attrs = device.environmentAttributes;
      this.envTemperatureSensor = attrs.temperatureSensor || '';
      this.envHumiditySensor = attrs.humiditySensor || '';
      this.envVpdSensor = attrs.vpdSensor || '';
      this.envCo2Sensor = attrs.co2Sensor || '';
      this.envSoilMoistureSensor = attrs.soilMoistureSensor || '';
      this.envDehumidifierControlEnabled = attrs.dehumidifierControlEnabled || false;
      this.envDehumidifierThresholds = attrs.dehumidifierThresholds || {};
      this.envHumidifierControlEnabled = attrs.humidifierControlEnabled || false;
      this.envHumidifierThresholds = attrs.humidifierThresholds || {};

      // Multi-device handling with backward compatibility
      this.envLightSensor = attrs.lightSensor || '';
      this.envLightSensors =
        attrs.lightSensors && attrs.lightSensors.length > 0
          ? attrs.lightSensors
          : attrs.lightSensor
            ? [attrs.lightSensor]
            : [];

      this.envExhaustEntity = attrs.exhaustEntity || '';
      this.envExhaustFanEntities =
        attrs.exhaustFanEntities && attrs.exhaustFanEntities.length > 0
          ? attrs.exhaustFanEntities
          : attrs.exhaustEntity
            ? [attrs.exhaustEntity]
            : [];

      this.envCirculationFan = attrs.circulationFanEntity || '';
      this.envCirculationFanEntities =
        attrs.circulationFanEntities && attrs.circulationFanEntities.length > 0
          ? attrs.circulationFanEntities
          : attrs.circulationFanEntity
            ? [attrs.circulationFanEntity]
            : [];

      this.envHumidifierEntity = attrs.humidifierEntity || '';
      this.envHumidifierEntities =
        attrs.humidifierEntities && attrs.humidifierEntities.length > 0
          ? attrs.humidifierEntities
          : attrs.humidifierEntity
            ? [attrs.humidifierEntity]
            : [];

      this.envDehumidifierEntity = attrs.dehumidifierEntity || '';
      this.envDehumidifierEntities =
        attrs.dehumidifierEntities && attrs.dehumidifierEntities.length > 0
          ? attrs.dehumidifierEntities
          : attrs.dehumidifierEntity
            ? [attrs.dehumidifierEntity]
            : [];

      // Default or fetch if available (currently not in env attrs commonly exposed, or defaults are fine)
      this.envStressThreshold = 0.8;
      this.envMoldThreshold = 0.8;

      this.envVisionCameraEntities = attrs.cameraEntities ?? [];
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
    } else {
      // Reset if no device or no attributes
      this.envTemperatureSensor = '';
      this.envHumiditySensor = '';
      this.envVpdSensor = '';
      this.envCo2Sensor = '';
      this.envCirculationFan = '';
      this.envCirculationFanEntities = [];
      this.envLightSensor = '';
      this.envLightSensors = [];
      this.envExhaustEntity = '';
      this.envExhaustFanEntities = [];
      this.envHumidifierEntity = '';
      this.envHumidifierEntities = [];
      this.envDehumidifierEntity = '';
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
    }
  }

  private renderDehumidifierTab() {
    // Define structure for rendering
    const stages = [
      { id: DehumidifierStage.SEEDLING, label: 'Seedling' },
      { id: DehumidifierStage.VEG, label: 'Vegetative' },
      { id: DehumidifierStage.EARLY_FLOWER, label: 'Early Flower' },
      { id: DehumidifierStage.MID_FLOWER, label: 'Mid Flower' },
      { id: DehumidifierStage.LATE_FLOWER, label: 'Late Flower' },
      { id: DehumidifierStage.DRYING, label: 'Drying' },
      { id: DehumidifierStage.CURING, label: 'Curing' },
    ];

    const activeStage = stages.find((s) => s.id === this._activeDehumidifierStage) || stages[0];

    return html`
      <div style="display:flex; flex-direction:column; gap:20px;">
        <div class="detail-card">
          <h3>Select Target</h3>
          <div class="md3-input-group">
            <label class="md3-label"> Growspace </label>
            <select
              class="md3-input"
              .value=${this.envSelectedId}
              @change=${this._handleEnvGrowspaceChange}
            >
              <option value="">Select...</option>
              ${Object.entries(this.growspaceOptions).map(
      ([id, name]) =>
        html`<option value="${id}" ?selected=${id === this.envSelectedId}>
                    ${name}
                  </option>`
    )}
            </select>
          </div>
        </div>

        <div class="detail-card">
          <h3>Dehumidifier Thresholds(VPD / kPa)</h3>

          <!--Sub-navigation for Stages-->
          <div
            class="config-tabs sub-tabs"
            style="margin: 0 -16px; padding: 0 16px; overflow-x: auto; justify-content: flex-start;"
          >
            ${stages.map(
      (stage) => html`
                <div
                  class="config-tab ${this._activeDehumidifierStage === stage.id ? 'active' : ''}"
                  @click=${() => (this._activeDehumidifierStage = stage.id)}
                  style="padding: 12px 16px; font-size: 0.9rem;"
                >
                  ${stage.label}
                </div>
              `
    )}
          </div>

          <div style="padding-top: 24px;">
            <!--Info Box-->
            <div
              style="display: flex; gap: 12px; padding: 12px; background: var(--secondary-background-color, rgba(255,255,255,0.05)); border-radius: 8px; margin-bottom: 24px; font-size: 0.85rem; line-height: 1.4; align-items: flex-start;"
            >
              <svg
                style="width:20px; height:20px; flex-shrink: 0; fill: var(--primary-color, #4caf50);"
                viewBox="0 0 24 24"
              >
                <path d="${mdiInformation}"></path>
              </svg>
              <div style="opacity: 0.8;">
                Configuring <strong> ${activeStage.label} </strong> stage.<br />
                Ensure <strong> On </strong> threshold is lower than <strong>Off</strong> threshold
                for proper hysteresis.
              </div>
            </div>

            <div class="row-col-grid">
              <!--Day Cycle-->
              <div
                style="display:flex; flex-direction:column; gap:12px; background: rgba(0,0,0,0.1); padding: 16px; border-radius: 12px;"
              >
                <div
                  style="display:flex; align-items:center; gap:8px; margin-bottom:4px; color: var(--primary-text-color);"
                >
                  <svg style="width:20px;height:20px;fill:#ff9800;" viewBox="0 0 24 24">
                    <path d="${mdiWhiteBalanceSunny}"></path>
                  </svg>
                  <h5 style="margin:0; font-size:1rem;">Day Cycle</h5>
                </div>

                <md3-number-input
                  label="On"
                  .value=${this._getThresholdValue(activeStage.id, 'day', 'on')}
                  @change=${(e: CustomEvent) =>
        this._updateThreshold(activeStage.id, 'day', 'on', parseFloat(e.detail))}
                  step="0.01"
                  .unit=${'kPa'}
                >
                </md3-number-input>
                <md3-number-input
                  label="Off"
                  .value=${this._getThresholdValue(activeStage.id, 'day', 'off')}
                  @change=${(e: CustomEvent) =>
        this._updateThreshold(activeStage.id, 'day', 'off', parseFloat(e.detail))}
                  step="0.01"
                  .unit=${'kPa'}
                >
                </md3-number-input>
              </div>

              <!--Night Cycle-->
              <div
                style="display:flex; flex-direction:column; gap:12px; background: rgba(0,0,0,0.1); padding: 16px; border-radius: 12px;"
              >
                <div
                  style="display:flex; align-items:center; gap:8px; margin-bottom:4px; color: var(--primary-text-color);"
                >
                  <svg style="width:20px;height:20px;fill:#7986cb;" viewBox="0 0 24 24">
                    <path d="${mdiWeatherNight}"></path>
                  </svg>
                  <h5 style="margin:0; font-size:1rem;">Night Cycle</h5>
                </div>

                <md3-number-input
                  label="On"
                  .value=${this._getThresholdValue(activeStage.id, 'night', 'on')}
                  @change=${(e: CustomEvent) =>
        this._updateThreshold(activeStage.id, 'night', 'on', parseFloat(e.detail))}
                  step="0.01"
                  .unit=${'kPa'}
                >
                </md3-number-input>
                <md3-number-input
                  label="Off"
                  .value=${this._getThresholdValue(activeStage.id, 'night', 'off')}
                  @change=${(e: CustomEvent) =>
        this._updateThreshold(activeStage.id, 'night', 'off', parseFloat(e.detail))}
                  step="0.01"
                  .unit=${'kPa'}
                >
                </md3-number-input>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private _getThresholdValue(stage: string, cycle: string, point: 'on' | 'off'): number {
    return this.envDehumidifierThresholds?.[stage]?.[cycle]?.[point] ?? 0;
  }

  private _updateThreshold(stage: string, cycle: string, point: 'on' | 'off', value: number) {
    if (isNaN(value)) return;

    const newThresholds = JSON.parse(JSON.stringify(this.envDehumidifierThresholds || {}));

    if (!newThresholds[stage]) newThresholds[stage] = {};
    if (!newThresholds[stage][cycle]) newThresholds[stage][cycle] = { on: 0, off: 0 };

    newThresholds[stage][cycle][point] = value;

    this.envDehumidifierThresholds = newThresholds;
  }

  private renderHumidifierTab() {
    const stages = [
      { id: HumidifierStage.SEEDLING, label: 'Seedling' },
      { id: HumidifierStage.MOTHER, label: 'Mother' },
      { id: HumidifierStage.VEG, label: 'Vegetative' },
      { id: HumidifierStage.EARLY_FLOWER, label: 'Early Flower' },
      { id: HumidifierStage.MID_FLOWER, label: 'Mid Flower' },
      { id: HumidifierStage.LATE_FLOWER, label: 'Late Flower' },
      { id: HumidifierStage.DRY, label: 'Drying' },
      { id: HumidifierStage.CURE, label: 'Curing' },
    ];

    const activeStage = stages.find((s) => s.id === this._activeHumidifierStage) || stages[0];

    return html`
      <div style="display:flex; flex-direction:column; gap:20px;">
        <div class="detail-card">
          <h3>Select Target</h3>
          <div class="md3-input-group">
            <label class="md3-label"> Growspace </label>
            <select
              class="md3-input"
              .value=${this.envSelectedId}
              @change=${this._handleEnvGrowspaceChange}
            >
              <option value="">Select...</option>
              ${Object.entries(this.growspaceOptions).map(
                ([id, name]) =>
                  html`<option value="${id}" ?selected=${id === this.envSelectedId}>
                    ${name}
                  </option>`
              )}
            </select>
          </div>
        </div>

        <div class="detail-card">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
            <h3 style="margin:0;">Humidifier Thresholds (VPD / kPa)</h3>
            <label class="checkbox-label">
              <input
                type="checkbox"
                .checked=${this.envHumidifierControlEnabled}
                @change=${(e: Event) =>
                  (this.envHumidifierControlEnabled = (e.target as HTMLInputElement).checked)}
              />
              Enable Control
            </label>
          </div>

          <!--Sub-navigation for Stages-->
          <div
            class="config-tabs sub-tabs"
            style="margin: 0 -16px; padding: 0 16px; overflow-x: auto; justify-content: flex-start;"
          >
            ${stages.map(
              (stage) => html`
                <div
                  class="config-tab ${this._activeHumidifierStage === stage.id ? 'active' : ''}"
                  @click=${() => (this._activeHumidifierStage = stage.id)}
                  style="padding: 12px 16px; font-size: 0.9rem;"
                >
                  ${stage.label}
                </div>
              `
            )}
          </div>

          <div style="padding-top: 24px;">
            <!--Info Box-->
            <div
              style="display: flex; gap: 12px; padding: 12px; background: var(--secondary-background-color, rgba(255,255,255,0.05)); border-radius: 8px; margin-bottom: 24px; font-size: 0.85rem; line-height: 1.4; align-items: flex-start;"
            >
              <svg
                style="width:20px; height:20px; flex-shrink: 0; fill: var(--primary-color, #4caf50);"
                viewBox="0 0 24 24"
              >
                <path d="${mdiInformation}"></path>
              </svg>
              <div style="opacity: 0.8;">
                Configuring <strong>${activeStage.label}</strong> stage.<br />
                Humidifier turns <strong>On</strong> when VPD exceeds the On threshold (air is too dry).
                It turns <strong>Off</strong> when VPD drops below the Off threshold.
              </div>
            </div>

            <div class="row-col-grid">
              <!--Day Cycle-->
              <div
                style="display:flex; flex-direction:column; gap:12px; background: rgba(0,0,0,0.1); padding: 16px; border-radius: 12px;"
              >
                <div
                  style="display:flex; align-items:center; gap:8px; margin-bottom:4px; color: var(--primary-text-color);"
                >
                  <svg style="width:20px;height:20px;fill:#ff9800;" viewBox="0 0 24 24">
                    <path d="${mdiWhiteBalanceSunny}"></path>
                  </svg>
                  <h5 style="margin:0; font-size:1rem;">Day Cycle</h5>
                </div>

                <md3-number-input
                  label="On"
                  .value=${this._getHumidifierThresholdValue(activeStage.id, 'day', 'on')}
                  @change=${(e: CustomEvent) =>
                    this._updateHumidifierThreshold(activeStage.id, 'day', 'on', parseFloat(e.detail))}
                  step="0.01"
                  .unit=${'kPa'}
                >
                </md3-number-input>
                <md3-number-input
                  label="Off"
                  .value=${this._getHumidifierThresholdValue(activeStage.id, 'day', 'off')}
                  @change=${(e: CustomEvent) =>
                    this._updateHumidifierThreshold(activeStage.id, 'day', 'off', parseFloat(e.detail))}
                  step="0.01"
                  .unit=${'kPa'}
                >
                </md3-number-input>
              </div>

              <!--Night Cycle-->
              <div
                style="display:flex; flex-direction:column; gap:12px; background: rgba(0,0,0,0.1); padding: 16px; border-radius: 12px;"
              >
                <div
                  style="display:flex; align-items:center; gap:8px; margin-bottom:4px; color: var(--primary-text-color);"
                >
                  <svg style="width:20px;height:20px;fill:#7986cb;" viewBox="0 0 24 24">
                    <path d="${mdiWeatherNight}"></path>
                  </svg>
                  <h5 style="margin:0; font-size:1rem;">Night Cycle</h5>
                </div>

                <md3-number-input
                  label="On"
                  .value=${this._getHumidifierThresholdValue(activeStage.id, 'night', 'on')}
                  @change=${(e: CustomEvent) =>
                    this._updateHumidifierThreshold(activeStage.id, 'night', 'on', parseFloat(e.detail))}
                  step="0.01"
                  .unit=${'kPa'}
                >
                </md3-number-input>
                <md3-number-input
                  label="Off"
                  .value=${this._getHumidifierThresholdValue(activeStage.id, 'night', 'off')}
                  @change=${(e: CustomEvent) =>
                    this._updateHumidifierThreshold(activeStage.id, 'night', 'off', parseFloat(e.detail))}
                  step="0.01"
                  .unit=${'kPa'}
                >
                </md3-number-input>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private _getHumidifierThresholdValue(stage: string, cycle: string, point: 'on' | 'off'): number {
    return this.envHumidifierThresholds?.[stage]?.[cycle]?.[point] ?? 0;
  }

  private _updateHumidifierThreshold(stage: string, cycle: string, point: 'on' | 'off', value: number) {
    if (isNaN(value)) return;

    const newThresholds = JSON.parse(JSON.stringify(this.envHumidifierThresholds || {}));

    if (!newThresholds[stage]) newThresholds[stage] = {};
    if (!newThresholds[stage][cycle]) newThresholds[stage][cycle] = { on: 0, off: 0 };

    newThresholds[stage][cycle][point] = value;

    this.envHumidifierThresholds = newThresholds;
  }
}
