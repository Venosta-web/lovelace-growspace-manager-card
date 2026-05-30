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
import { setDehumidifierControl } from '../slices/growspace';
import { getSubareas, addSubarea, removeSubarea } from '../slices/subarea';
import type { Subarea } from '../slices/subarea';
import { DataService } from '../services/data-service';
import {
  createInitialSM,
  transition,
  type ConfigDialogSM,
  type ConfigDialogEvent,
  type ConfigTabId,
} from './config-dialog-sm';

// Unified stage list for the accordion — maps display id → both stage enums
const HUMIDITY_STAGES = [
  {
    id: 'seedling',
    label: 'Seedling',
    dehum: DehumidifierStage.SEEDLING,
    hum: HumidifierStage.SEEDLING,
  },
  { id: 'mother', label: 'Mother', dehum: DehumidifierStage.MOTHER, hum: HumidifierStage.MOTHER },
  { id: 'veg', label: 'Vegetative', dehum: DehumidifierStage.VEG, hum: HumidifierStage.VEG },
  {
    id: 'early_flower',
    label: 'Early Flower',
    dehum: DehumidifierStage.EARLY_FLOWER,
    hum: HumidifierStage.EARLY_FLOWER,
  },
  {
    id: 'mid_flower',
    label: 'Mid Flower',
    dehum: DehumidifierStage.MID_FLOWER,
    hum: HumidifierStage.MID_FLOWER,
  },
  {
    id: 'late_flower',
    label: 'Late Flower',
    dehum: DehumidifierStage.LATE_FLOWER,
    hum: HumidifierStage.LATE_FLOWER,
  },
  { id: 'drying', label: 'Drying', dehum: DehumidifierStage.DRYING, hum: HumidifierStage.DRY },
  { id: 'curing', label: 'Curing', dehum: DehumidifierStage.CURING, hum: HumidifierStage.CURE },
] as const;

type HumidityStageId = (typeof HUMIDITY_STAGES)[number]['id'];

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

  @property({ attribute: false })
  public environmentData: EnvironmentConfigData | undefined;

  // ── Single SM ────────────────────────────────────────────────────────────
  @state() private _sm: ConfigDialogSM = createInitialSM();

  // ── Async subarea state (outside SM — network dependent) ─────────────────
  @state() private _subareas: Subarea[] = [];
  @state() private _subareasLoading = false;
  private _subareasGrowspaceId = '';

  // ── Humidity accordion (pure UI ephemeral state) ──────────────────────────
  @state() private _openHumidityStageId: HumidityStageId | '' = '';
  @state() private _dehumidifierControlEnabled = false;

  private _initialStateApplied = false;
  private _dataService?: DataService;

  /** Convenience: dispatch a SM transition and assign the result. */
  private _t(event: ConfigDialogEvent): void {
    this._sm = transition(this._sm, event);
  }

  get currentTab(): ConfigTab {
    return this._sm.activeTab as ConfigTab;
  }

  set currentTab(tab: ConfigTab) {
    this._sm = { ...this._sm, activeTab: tab as ConfigTabId };
  }

  // ── Legacy state accessors (delegate to SM) ───────────────────────────────
  // These allow existing tests and external callers to read/write state
  // through familiar names. The SM is the authoritative source of truth.

  private get _d() { return this._sm.environmentDraft; }
  private _setEnv(partial: Partial<typeof this._sm.environmentDraft>) {
    this._sm = transition(this._sm, { type: 'UPDATE_ENV_DRAFT', partial });
  }

  get envSelectedId() { return this._d.selectedGrowspaceId; }
  set envSelectedId(v: string) { this._setEnv({ selectedGrowspaceId: v }); }

  get envTemperatureSensors() { return this._d.temperatureSensors; }
  set envTemperatureSensors(v: string[]) { this._setEnv({ temperatureSensors: v }); }

  get envHumiditySensors() { return this._d.humiditySensors; }
  set envHumiditySensors(v: string[]) { this._setEnv({ humiditySensors: v }); }

  get envVpdSensors() { return this._d.vpdSensors; }
  set envVpdSensors(v: string[]) { this._setEnv({ vpdSensors: v }); }

  get envCo2Sensor() { return this._d.co2Sensor; }
  set envCo2Sensor(v: string) { this._setEnv({ co2Sensor: v }); }

  get envLightSensors() { return this._d.lightSensors; }
  set envLightSensors(v: string[]) { this._setEnv({ lightSensors: v }); }

  get envExhaustFanEntities() { return this._d.exhaustFanEntities; }
  set envExhaustFanEntities(v: string[]) { this._setEnv({ exhaustFanEntities: v }); }

  get envCirculationFanEntities() { return this._d.circulationFanEntities; }
  set envCirculationFanEntities(v: string[]) { this._setEnv({ circulationFanEntities: v }); }

  get envHumidifierEntities() { return this._d.humidifierEntities; }
  set envHumidifierEntities(v: string[]) { this._setEnv({ humidifierEntities: v }); }

  get envDehumidifierEntities() { return this._d.dehumidifierEntities; }
  set envDehumidifierEntities(v: string[]) { this._setEnv({ dehumidifierEntities: v }); }

  get envSoilMoistureSensor() { return this._d.soilMoistureSensor; }
  set envSoilMoistureSensor(v: string) { this._setEnv({ soilMoistureSensor: v }); }

  get envDehumidifierControlEnabled() { return this._dehumidifierControlEnabled; }
  set envDehumidifierControlEnabled(v: boolean) { this._dehumidifierControlEnabled = v; }

  get envHumidifierControlEnabled() { return this._d.humidifierControlEnabled; }
  set envHumidifierControlEnabled(v: boolean) { this._setEnv({ humidifierControlEnabled: v }); }

  get envDehumidifierThresholds() { return this._d.dehumidifierThresholds; }
  set envDehumidifierThresholds(v: Record<string, Record<string, { on: number; off: number }>>) { this._setEnv({ dehumidifierThresholds: v }); }

  get envHumidifierThresholds() { return this._d.humidifierThresholds; }
  set envHumidifierThresholds(v: Record<string, Record<string, { on: number; off: number }>>) { this._setEnv({ humidifierThresholds: v }); }

  get envStressThreshold() { return this._d.stressThreshold; }
  set envStressThreshold(v: number) { this._setEnv({ stressThreshold: v }); }

  get envMoldThreshold() { return this._d.moldThreshold; }
  set envMoldThreshold(v: number) { this._setEnv({ moldThreshold: v }); }

  get envSensorGroups() { return this._d.sensorGroups; }
  set envSensorGroups(v: import('../types').SensorGroup[]) { this._setEnv({ sensorGroups: v }); }

  get envSensorCoordinates() { return this._d.sensorCoordinates; }
  set envSensorCoordinates(v: Record<string, { x: number; y: number; z: number; rotation?: number }>) { this._setEnv({ sensorCoordinates: v }); }

  get envIrrigationTanks() { return this._d.irrigationTanks; }
  set envIrrigationTanks(v: any[]) { this._setEnv({ irrigationTanks: v }); }

  get envVisionCameraEntities() { return this._d.cameraEntities; }
  set envVisionCameraEntities(v: string[]) { this._setEnv({ cameraEntities: v }); }

  get envLungroomTempSensors() { return this._d.lungroomTempSensors; }
  set envLungroomTempSensors(v: string[]) { this._setEnv({ lungroomTempSensors: v }); }

  get envSubstrateTemperatureSensors() { return this._d.substrateTemperatureSensors; }
  set envSubstrateTemperatureSensors(v: string[]) { this._setEnv({ substrateTemperatureSensors: v }); }

  get envPhSensors() { return this._d.phSensors; }
  set envPhSensors(v: string[]) { this._setEnv({ phSensors: v }); }

  get envFeedEcSensors() { return this._d.feedEcSensors; }
  set envFeedEcSensors(v: string[]) { this._setEnv({ feedEcSensors: v }); }

  get envSubstrateEcSensors() { return this._d.substrateEcSensors; }
  set envSubstrateEcSensors(v: string[]) { this._setEnv({ substrateEcSensors: v }); }

  get envRunoffEcSensors() { return this._d.runoffEcSensors; }
  set envRunoffEcSensors(v: string[]) { this._setEnv({ runoffEcSensors: v }); }

  get envDrainVolumeSensors() { return this._d.drainVolumeSensors; }
  set envDrainVolumeSensors(v: string[]) { this._setEnv({ drainVolumeSensors: v }); }

  get envIrrigationFlowSensors() { return this._d.irrigationFlowSensors; }
  set envIrrigationFlowSensors(v: string[]) { this._setEnv({ irrigationFlowSensors: v }); }

  get envPowerSensors() { return this._d.powerSensors; }
  set envPowerSensors(v: string[]) { this._setEnv({ powerSensors: v }); }

  get envEnergySensors() { return this._d.energySensors; }
  set envEnergySensors(v: string[]) { this._setEnv({ energySensors: v }); }

  get envVisionEnabled() { return this._d.visionEnabled; }
  set envVisionEnabled(v: boolean) { this._setEnv({ visionEnabled: v }); }

  get envVisionEarlyOffset() { return this._d.visionEarlyOffset; }
  set envVisionEarlyOffset(v: number) { this._setEnv({ visionEarlyOffset: v }); }

  get envVisionMidHours() { return this._d.visionMidHours; }
  set envVisionMidHours(v: number) { this._setEnv({ visionMidHours: v }); }

  get envVisionLateOffset() { return this._d.visionLateOffset; }
  set envVisionLateOffset(v: number) { this._setEnv({ visionLateOffset: v }); }

  // Growspaces tab compat accessors

  get _isAddingGrowspace() { return this._sm.tabs.growspaces.sub.kind === 'adding'; }
  set _isAddingGrowspace(v: boolean) {
    if (v) {
      this._t({ type: 'START_ADD_GROWSPACE' });
    } else if (this._sm.tabs.growspaces.sub.kind === 'adding') {
      this._t({ type: 'CANCEL_GROWSPACES' });
    }
  }

  get _showDeleteConfirm() { return this._sm.tabs.growspaces.sub.kind === 'confirm-delete'; }
  set _showDeleteConfirm(v: boolean) {
    if (v) {
      const sub = this._sm.tabs.growspaces.sub;
      if (sub.kind === 'editing') {
        this._t({ type: 'REQUEST_DELETE_GROWSPACE', growspaceId: sub.growspaceId, name: sub.name });
      }
    } else {
      this._t({ type: 'CANCEL_GROWSPACES' });
    }
  }

  get editSelectedId(): string {
    const sub = this._sm.tabs.growspaces.sub;
    return sub.kind === 'editing' ? sub.growspaceId : '';
  }
  set editSelectedId(id: string) {
    if (!id) { this._t({ type: 'CANCEL_GROWSPACES' }); return; }
    const device = this.devices?.find((d) => d.deviceId === id);
    this._t({
      type: 'SELECT_GROWSPACE',
      growspaceId: id,
      name: device?.name ?? '',
      rows: device?.rows ?? 4,
      plantsPerRow: device?.plantsPerRow ?? 4,
      notificationService: device?.notificationTarget ?? '',
    });
  }

  get editName(): string {
    const sub = this._sm.tabs.growspaces.sub;
    return sub.kind === 'editing' ? sub.name : '';
  }
  set editName(v: string) { this._t({ type: 'UPDATE_EDIT_DRAFT', partial: { name: v } }); }

  get editRows(): number {
    const sub = this._sm.tabs.growspaces.sub;
    return sub.kind === 'editing' ? sub.rows : 0;
  }
  set editRows(v: number) { this._t({ type: 'UPDATE_EDIT_DRAFT', partial: { rows: v } }); }

  get editPlantsPerRow(): number {
    const sub = this._sm.tabs.growspaces.sub;
    return sub.kind === 'editing' ? sub.plantsPerRow : 0;
  }
  set editPlantsPerRow(v: number) { this._t({ type: 'UPDATE_EDIT_DRAFT', partial: { plantsPerRow: v } }); }

  get editNotificationService(): string {
    const sub = this._sm.tabs.growspaces.sub;
    return sub.kind === 'editing' ? sub.notificationService : '';
  }
  set editNotificationService(v: string) { this._t({ type: 'UPDATE_EDIT_DRAFT', partial: { notificationService: v } }); }

  get addName(): string {
    const sub = this._sm.tabs.growspaces.sub;
    return sub.kind === 'adding' ? sub.name : '';
  }
  set addName(v: string) {
    if (this._sm.tabs.growspaces.sub.kind !== 'adding') this._t({ type: 'START_ADD_GROWSPACE' });
    this._t({ type: 'UPDATE_ADD_DRAFT', partial: { name: v } });
  }

  get addRows(): number {
    const sub = this._sm.tabs.growspaces.sub;
    return sub.kind === 'adding' ? sub.rows : 4;
  }
  set addRows(v: number) {
    if (this._sm.tabs.growspaces.sub.kind !== 'adding') this._t({ type: 'START_ADD_GROWSPACE' });
    this._t({ type: 'UPDATE_ADD_DRAFT', partial: { rows: v } });
  }

  get addPlantsPerRow(): number {
    const sub = this._sm.tabs.growspaces.sub;
    return sub.kind === 'adding' ? sub.plantsPerRow : 4;
  }
  set addPlantsPerRow(v: number) {
    if (this._sm.tabs.growspaces.sub.kind !== 'adding') this._t({ type: 'START_ADD_GROWSPACE' });
    this._t({ type: 'UPDATE_ADD_DRAFT', partial: { plantsPerRow: v } });
  }

  get addNotificationService(): string {
    const sub = this._sm.tabs.growspaces.sub;
    return sub.kind === 'adding' ? sub.notificationService : '';
  }
  set addNotificationService(v: string) {
    if (this._sm.tabs.growspaces.sub.kind !== 'adding') this._t({ type: 'START_ADD_GROWSPACE' });
    this._t({ type: 'UPDATE_ADD_DRAFT', partial: { notificationService: v } });
  }

  // Heatmap / groups compat
  get _showGroupDialog() { return this._sm.tabs.heatmap.sub.kind === 'editing-group'; }
  set _showGroupDialog(v: boolean) {
    if (v) this._t({ type: 'BEGIN_EDIT_GROUP' });
    else this._t({ type: 'CLOSE_GROUP_DIALOG' });
  }

  get _editingGroup(): import('../types').SensorGroup | undefined {
    const sub = this._sm.tabs.heatmap.sub;
    return sub.kind === 'editing-group' ? sub.group : undefined;
  }
  set _editingGroup(g: import('../types').SensorGroup | undefined) {
    this._t({ type: 'BEGIN_EDIT_GROUP', group: g });
  }

  // Subareas compat
  get _showSubareaConfigDialog() { return this._sm.tabs.subareas.sub.kind === 'editing-subarea'; }
  set _showSubareaConfigDialog(v: boolean) {
    if (!v) this._t({ type: 'CLOSE_SUBAREA_DIALOG' });
  }

  get _editingSubarea(): Subarea | undefined {
    const sub = this._sm.tabs.subareas.sub;
    return sub.kind === 'editing-subarea' ? sub.subarea : undefined;
  }
  set _editingSubarea(subarea: Subarea | undefined) {
    if (subarea) this._t({ type: 'BEGIN_EDIT_SUBAREA', subarea });
    else this._t({ type: 'CLOSE_SUBAREA_DIALOG' });
  }

  get _showAddSubarea() { return this._sm.tabs.subareas.sub.kind === 'adding'; }
  set _showAddSubarea(v: boolean) {
    if (v) this._t({ type: 'BEGIN_ADD_SUBAREA' });
    else this._t({ type: 'CANCEL_SUBAREA' });
  }

  get _newSubareaName(): string {
    const sub = this._sm.tabs.subareas.sub;
    return sub.kind === 'adding' ? sub.name : '';
  }
  set _newSubareaName(v: string) {
    if (this._sm.tabs.subareas.sub.kind !== 'adding') this._t({ type: 'BEGIN_ADD_SUBAREA' });
    this._t({ type: 'UPDATE_SUBAREA_NAME', name: v });
  }

  get _deleteConfirmSubareaId(): string {
    const sub = this._sm.tabs.subareas.sub;
    return sub.kind === 'confirm-delete' ? sub.subareaId : '';
  }
  set _deleteConfirmSubareaId(id: string) {
    if (id) this._t({ type: 'REQUEST_DELETE_SUBAREA', subareaId: id });
    else this._t({ type: 'CANCEL_DELETE_SUBAREA' });
  }

  // Tanks compat
  get _showTankForm() { return this._sm.tabs.tanks.sub.kind !== 'idle'; }
  get _editingTankIndex(): number | null {
    const sub = this._sm.tabs.tanks.sub;
    return sub.kind === 'editing' ? sub.index : null;
  }
  get _tankDraft() {
    const sub = this._sm.tabs.tanks.sub;
    if (sub.kind === 'adding' || sub.kind === 'editing') {
      return { sensorEntity: sub.sensorEntity, name: sub.name, volumeLiters: sub.volumeLiters, warningLevel: sub.warningLevel };
    }
    return { sensorEntity: '', name: '', volumeLiters: null, warningLevel: 30 };
  }
  set _tankDraft(v: { sensorEntity: string; name: string; volumeLiters: number | null; warningLevel: number }) {
    this._t({ type: 'UPDATE_TANK_DRAFT', partial: v });
  }

  static styles = [
    dialogStyles,
    css`
      :host {
        display: block;
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
        scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
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
        scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
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
    const vc = environmentData?.visionCheckupConfig;
    const envPartial = environmentData
      ? {
          selectedGrowspaceId: environmentData.selectedGrowspaceId,
          temperatureSensors: environmentData.temperatureSensors?.length
            ? environmentData.temperatureSensors
            : environmentData.temperatureSensor
              ? [environmentData.temperatureSensor]
              : [],
          humiditySensors: environmentData.humiditySensors?.length
            ? environmentData.humiditySensors
            : environmentData.humiditySensor
              ? [environmentData.humiditySensor]
              : [],
          vpdSensors: environmentData.vpdSensors?.length
            ? environmentData.vpdSensors
            : environmentData.vpdSensor
              ? [environmentData.vpdSensor]
              : [],
          co2Sensor: environmentData.co2Sensor,
          circulationFanEntities: environmentData.circulationFanEntities || [],
          stressThreshold: environmentData.stressThreshold,
          moldThreshold: environmentData.moldThreshold,
          lightSensors: environmentData.lightSensors || [],
          exhaustFanEntities: environmentData.exhaustFanEntities || [],
          humidifierEntities: environmentData.humidifierEntities || [],
          dehumidifierEntities: environmentData.dehumidifierEntities || [],
          soilMoistureSensor: environmentData.soilMoistureSensor,
          dehumidifierThresholds: environmentData.dehumidifierThresholds || {},
          humidifierControlEnabled: environmentData.humidifierControlEnabled,
          humidifierThresholds: environmentData.humidifierThresholds || {},
          sensorGroups: environmentData.sensorGroups || [],
          sensorCoordinates: environmentData.sensorCoordinates || {},
          irrigationTanks: (environmentData.irrigationTanks || []).map((t: any) => ({
            sensorEntity: t.sensorEntity || '',
            name: t.name || 'Tank',
            volumeLiters: t.volumeLiters ?? null,
            warningLevel: t.warningLevel ?? 30,
          })),
          cameraEntities: environmentData.cameraEntities ?? [],
          lungroomTempSensors: environmentData.lungroomTempSensors || [],
          substrateTemperatureSensors: environmentData.substrateTemperatureSensors || [],
          phSensors: environmentData.phSensors || [],
          feedEcSensors: environmentData.feedEcSensors || [],
          substrateEcSensors: environmentData.substrateEcSensors || [],
          runoffEcSensors: environmentData.runoffEcSensors || [],
          drainVolumeSensors: environmentData.drainVolumeSensors || [],
          irrigationFlowSensors: environmentData.irrigationFlowSensors || [],
          powerSensors: environmentData.powerSensors || [],
          energySensors: environmentData.energySensors || [],
          visionEnabled: vc?.enabled ?? false,
          visionEarlyOffset: vc?.early_check_offset_minutes ?? 60,
          visionMidHours: vc?.mid_check_hours ?? 6,
          visionLateOffset: vc?.late_check_offset_minutes ?? 60,
        }
      : {};

    this._sm = {
      ...createInitialSM(),
      activeTab: currentTab as ConfigTabId,
      environmentDraft: { ...createInitialSM().environmentDraft, ...envPartial },
    };
    this._dehumidifierControlEnabled = environmentData?.dehumidifierControlEnabled ?? false;

    if (environmentData?.selectedGrowspaceId) {
      this._populateEditFields(environmentData.selectedGrowspaceId);
    }

    if (currentTab === ConfigTab.SUBAREAS) {
      this._loadSubareas();
    }
  }

  private _close() {
    const { heatmap, subareas } = this._sm.tabs;
    if (heatmap.sub.kind === 'editing-group' || subareas.sub.kind === 'editing-subarea') return;
    this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
  }

  private _switchTab(tab: ConfigTab) {
    this._t({ type: 'SWITCH_TAB', tab: tab as ConfigTabId });
    if (tab === ConfigTab.SUBAREAS) {
      this._loadSubareas();
    }
  }

  // ── Submit handlers ─────────────────────────────────────────────────────

  private _submitAddGrowspace() {
    const sub = this._sm.tabs.growspaces.sub;
    if (sub.kind !== 'adding') return;
    this.dispatchEvent(
      new CustomEvent('add-growspace-submit', {
        detail: {
          name: sub.name,
          rows: sub.rows,
          plantsPerRow: sub.plantsPerRow,
          notificationService: sub.notificationService,
        },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _submitEnvironment() {
    const d = this._sm.environmentDraft;
    this.dispatchEvent(
      new CustomEvent('configure-environment-submit', {
        detail: {
          selectedGrowspaceId: d.selectedGrowspaceId,
          temperatureSensors: d.temperatureSensors,
          humiditySensors: d.humiditySensors,
          vpdSensors: d.vpdSensors,
          co2Sensor: d.co2Sensor,
          circulationFanEntities: d.circulationFanEntities,
          stressThreshold: d.stressThreshold,
          moldThreshold: d.moldThreshold,
          lightSensors: d.lightSensors,
          exhaustFanEntities: d.exhaustFanEntities,
          humidifierEntities: d.humidifierEntities,
          humidifierThresholds: d.humidifierThresholds,
          humidifierControlEnabled: d.humidifierControlEnabled,
          dehumidifierEntities: d.dehumidifierEntities,
          dehumidifierThresholds: d.dehumidifierThresholds,
          soilMoistureSensor: d.soilMoistureSensor,
          sensorGroups: d.sensorGroups,
          sensorCoordinates: d.sensorCoordinates,
          irrigationTanks: d.irrigationTanks,
          cameraEntities: d.cameraEntities,
          lungroomTempSensors: d.lungroomTempSensors,
          substrateTemperatureSensors: d.substrateTemperatureSensors,
          phSensors: d.phSensors,
          feedEcSensors: d.feedEcSensors,
          substrateEcSensors: d.substrateEcSensors,
          runoffEcSensors: d.runoffEcSensors,
          drainVolumeSensors: d.drainVolumeSensors,
          irrigationFlowSensors: d.irrigationFlowSensors,
          powerSensors: d.powerSensors,
          energySensors: d.energySensors,
        } as EnvironmentConfigEventDetail,
        bubbles: true,
        composed: true,
      })
    );
  }

  private _submitVisionCheckupConfig() {
    const d = this._sm.environmentDraft;
    if (!d.selectedGrowspaceId) return;
    this.dispatchEvent(
      new CustomEvent('vision-checkup-config-submit', {
        detail: {
          growspaceId: d.selectedGrowspaceId,
          visionCheckupConfig: {
            enabled: d.visionEnabled,
            early_check_offset_minutes: d.visionEarlyOffset,
            mid_check_hours: d.visionMidHours,
            late_check_offset_minutes: d.visionLateOffset,
          },
        } as VisionCheckupConfigEventDetail,
        bubbles: true,
        composed: true,
      })
    );
  }

  private _submitEditGrowspace() {
    const sub = this._sm.tabs.growspaces.sub;
    if (sub.kind !== 'editing') return;
    this.dispatchEvent(
      new CustomEvent('edit-growspace-submit', {
        detail: {
          growspaceId: sub.growspaceId,
          name: sub.name,
          rows: sub.rows,
          plantsPerRow: sub.plantsPerRow,
          notificationService: sub.notificationService,
        },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _submitGrowspaceAndEnv() {
    this._submitEditGrowspace();
    const d = this._sm.environmentDraft;
    if (d.temperatureSensors.length > 0 && d.humiditySensors.length > 0) {
      this._submitEnvironment();
    }
  }

  private _submitDeleteGrowspace() {
    const sub = this._sm.tabs.growspaces.sub;
    if (sub.kind !== 'editing') return;
    this._t({ type: 'REQUEST_DELETE_GROWSPACE', growspaceId: sub.growspaceId, name: sub.name });
  }

  private _confirmDeleteGrowspace() {
    const sub = this._sm.tabs.growspaces.sub;
    if (sub.kind !== 'confirm-delete') return;
    this.dispatchEvent(
      new CustomEvent('delete-growspace-submit', {
        detail: { growspace_id: sub.growspaceId },
        bubbles: true,
        composed: true,
      })
    );
    this._t({ type: 'CANCEL_GROWSPACES' });
  }

  private _cancelDeleteGrowspace() {
    this._t({ type: 'CANCEL_GROWSPACES' });
  }


  private async _handleRemoveEnvironment() {
    const growspaceId = this._sm.environmentDraft.selectedGrowspaceId;
    if (!growspaceId) return;
    const confirmed = window.confirm(
      'Are you sure you want to remove the environment configuration for this growspace? This will disconnect all sensors and controllers from this growspace.'
    );
    if (!confirmed) return;
    try {
      this.dispatchEvent(
        new CustomEvent('remove-environment-submit', {
          detail: { growspace_id: growspaceId },
          bubbles: true,
          composed: true,
        })
      );
      setTimeout(() => {
        if (growspaceId) {
          this._handleEnvGrowspaceChange({ target: { value: growspaceId } } as any);
        }
      }, 1000);
    } catch (e) {
      console.error('Failed to remove environment:', e);
    }
  }

  // ── Growspace data helpers ───────────────────────────────────────────────

  private _populateEditFields(growspaceId: string) {
    if (!growspaceId) {
      this._t({ type: 'CANCEL_GROWSPACES' });
      return;
    }
    if (!this.devices) return;
    const device = this.devices.find((d) => d.deviceId === growspaceId);
    if (device) {
      this._t({
        type: 'SELECT_GROWSPACE',
        growspaceId,
        name: device.name,
        rows: device.rows || 4,
        plantsPerRow: device.plantsPerRow || 4,
        notificationService: device.notificationTarget || '',
      });
    }
  }

  private _handleEditSelection(growspaceId: string) {
    if (!growspaceId) {
      this._t({ type: 'CANCEL_GROWSPACES' });
    } else {
      this._populateEditFields(growspaceId);
    }
    this._handleEnvGrowspaceChange({ target: { value: growspaceId } } as any);
  }

  private _startAddGrowspace() {
    this._t({ type: 'START_ADD_GROWSPACE' });
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
        return (
          domains.includes(domain) &&
          (!deviceClass || state.attributes.device_class === deviceClass)
        );
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
    return this._sm.environmentDraft.dehumidifierThresholds?.[stage]?.[cycle]?.[point] ?? 0;
  }

  private _updateThreshold(stage: string, cycle: string, point: 'on' | 'off', value: number) {
    if (isNaN(value)) return;
    const t = JSON.parse(JSON.stringify(this._sm.environmentDraft.dehumidifierThresholds || {}));
    if (!t[stage]) t[stage] = {};
    if (!t[stage][cycle]) t[stage][cycle] = { on: 0, off: 0 };
    t[stage][cycle][point] = value;
    this._t({ type: 'UPDATE_ENV_DRAFT', partial: { dehumidifierThresholds: t } });
  }

  private _getHumidifierThresholdValue(stage: string, cycle: string, point: 'on' | 'off'): number {
    return this._sm.environmentDraft.humidifierThresholds?.[stage]?.[cycle]?.[point] ?? 0;
  }

  private _updateHumidifierThreshold(
    stage: string,
    cycle: string,
    point: 'on' | 'off',
    value: number
  ) {
    if (isNaN(value)) return;
    const t = JSON.parse(JSON.stringify(this._sm.environmentDraft.humidifierThresholds || {}));
    if (!t[stage]) t[stage] = {};
    if (!t[stage][cycle]) t[stage][cycle] = { on: 0, off: 0 };
    t[stage][cycle][point] = value;
    this._t({ type: 'UPDATE_ENV_DRAFT', partial: { humidifierThresholds: t } });
  }

  // ── Tank methods ─────────────────────────────────────────────────────────

  private _openAddTank() {
    this._t({ type: 'BEGIN_ADD_TANK' });
  }

  private _editTank(index: number) {
    const tank = this._sm.environmentDraft.irrigationTanks[index];
    this._t({
      type: 'BEGIN_EDIT_TANK',
      index,
      sensorEntity: tank.sensorEntity || '',
      name: tank.name || '',
      volumeLiters: tank.volumeLiters ?? null,
      warningLevel: tank.warningLevel ?? 30,
    });
  }

  private _deleteTank(index: number) {
    const updated = this._sm.environmentDraft.irrigationTanks.filter((_, i) => i !== index);
    this._t({ type: 'UPDATE_ENV_DRAFT', partial: { irrigationTanks: updated } });
  }

  private _saveTank() {
    const sub = this._sm.tabs.tanks.sub;
    if (sub.kind !== 'adding' && sub.kind !== 'editing') return;
    if (!sub.sensorEntity.trim()) return;
    this._t({ type: 'COMMIT_TANK' });
  }

  private _cancelTank() {
    this._t({ type: 'CANCEL_TANK' });
  }

  // ── Sensor group methods ─────────────────────────────────────────────────

  private _openAddGroup() {
    this._t({ type: 'BEGIN_EDIT_GROUP' });
  }

  private _editGroup(group: import('../types').SensorGroup) {
    this._t({ type: 'BEGIN_EDIT_GROUP', group });
  }

  private _deleteGroup(id: string) {
    const updated = this._sm.environmentDraft.sensorGroups.filter((g) => g.id !== id);
    this._t({ type: 'UPDATE_ENV_DRAFT', partial: { sensorGroups: updated } });
  }

  private _handleSaveGroup(e: CustomEvent) {
    const group = e.detail.group as import('../types').SensorGroup;
    const groups = this._sm.environmentDraft.sensorGroups;
    const index = groups.findIndex((g) => g.id === group.id);
    const updated = index >= 0 ? groups.map((g, i) => (i === index ? group : g)) : [...groups, group];
    this._t({ type: 'UPDATE_ENV_DRAFT', partial: { sensorGroups: updated } });
    this._t({ type: 'CLOSE_GROUP_DIALOG' });
  }

  // ── Subarea methods ──────────────────────────────────────────────────────

  private _getDataService(): DataService {
    if (!this._dataService) this._dataService = new DataService(this.hass);
    return this._dataService;
  }

  private async _loadSubareas() {
    const envId = this._sm.environmentDraft.selectedGrowspaceId;
    const gsSub = this._sm.tabs.growspaces.sub;
    const editId = gsSub.kind === 'editing' ? gsSub.growspaceId : '';
    const growspaceId = envId || editId;
    if (!growspaceId) {
      this._subareas = [];
      this._subareasGrowspaceId = '';
      return;
    }
    this._subareasGrowspaceId = growspaceId;
    this._subareasLoading = true;
    try {
      this._subareas = await getSubareas(growspaceId);
    } catch (e) {
      console.error('[ConfigDialog] Failed to load subareas:', e);
      this._subareas = [];
    } finally {
      this._subareasLoading = false;
    }
  }

  private async _handleAddSubarea() {
    const sub = this._sm.tabs.subareas.sub;
    const name = sub.kind === 'adding' ? sub.name.trim() : '';
    if (!name || !this._subareasGrowspaceId) return;
    try {
      await addSubarea(this._subareasGrowspaceId, name);
      this._t({ type: 'CANCEL_SUBAREA' });
      await this._loadSubareas();
    } catch (e) {
      console.error('[ConfigDialog] Failed to add subarea:', e);
    }
  }

  private _handleEditSubarea(subarea: Subarea) {
    this._t({ type: 'BEGIN_EDIT_SUBAREA', subarea });
  }

  private _handleDeleteSubarea(subareaId: string) {
    this._t({ type: 'REQUEST_DELETE_SUBAREA', subareaId });
  }

  private async _confirmDeleteSubarea(subareaId: string) {
    if (!this._subareasGrowspaceId) return;
    try {
      await removeSubarea(this._subareasGrowspaceId, subareaId);
      this._t({ type: 'CANCEL_DELETE_SUBAREA' });
      await this._loadSubareas();
    } catch (e) {
      console.error('[ConfigDialog] Failed to delete subarea:', e);
    }
  }

  private _handleEnvGrowspaceChange(e: Event) {
    const growspaceId = (e.target as HTMLSelectElement).value;
    const device = this.devices.find((d) => d.deviceId === growspaceId);
    if (device) {
      this._t({ type: 'RESET_FROM_DEVICE', device });
      this._dehumidifierControlEnabled = device.environmentAttributes?.dehumidifierControlEnabled ?? false;
    } else {
      this._t({
        type: 'UPDATE_ENV_DRAFT',
        partial: {
          selectedGrowspaceId: growspaceId,
          temperatureSensors: [],
          humiditySensors: [],
          vpdSensors: [],
          co2Sensor: '',
          lightSensors: [],
          exhaustFanEntities: [],
          circulationFanEntities: [],
          humidifierEntities: [],
          dehumidifierEntities: [],
          soilMoistureSensor: '',
          dehumidifierThresholds: {},
          humidifierControlEnabled: false,
          humidifierThresholds: {},
          visionEnabled: false,
          visionEarlyOffset: 60,
          visionMidHours: 6,
          visionLateOffset: 60,
          cameraEntities: [],
          lungroomTempSensors: [],
          substrateTemperatureSensors: [],
          phSensors: [],
          feedEcSensors: [],
          substrateEcSensors: [],
          runoffEcSensors: [],
          drainVolumeSensors: [],
          irrigationFlowSensors: [],
          powerSensors: [],
          energySensors: [],
          irrigationTanks: [],
        },
      });
      this._dehumidifierControlEnabled = false;
      this._t({ type: 'CANCEL_TANK' });
    }
  }

  // ── Section renderers ────────────────────────────────────────────────────

  private _renderGrowspacesSection() {
    const sub = this._sm.tabs.growspaces.sub;

    if (sub.kind === 'confirm-delete') {
      return html`
        <div class="cfg-master-detail" style="grid-template-columns:1fr;">
          <div class="detail-card" style="text-align:center;padding:40px 20px;">
            <h3 style="color:var(--error-color,#ff5252);">Delete Growspace?</h3>
            <p style="margin-bottom:30px;color:var(--secondary-text-color);">
              Are you sure you want to delete "<strong>${sub.name}</strong>"?<br />
              This will remove all associated plants and history.<br />
              This action cannot be undone.
            </p>
          </div>
        </div>
      `;
    }

    const editingId = sub.kind === 'editing' ? sub.growspaceId : '';
    const isAdding = sub.kind === 'adding';

    return html`
      <div class="cfg-master-detail">
        <!-- Master list -->
        <div class="cfg-master-list">
          <div
            style="font-size:0.7rem;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:var(--secondary-text-color,rgba(255,255,255,0.5));padding:0 4px 8px;"
          >
            All Growspaces
          </div>
          ${Object.entries(this.growspaceOptions).map(
            ([id, name]) => html`
              <div
                class="cfg-gs-row ${editingId === id && !isAdding ? 'active' : ''}"
                @click=${() => this._handleEditSelection(id)}
              >
                <span class="gs-name">${name}</span>
              </div>
            `
          )}
          <button class="cfg-master-add-btn" @click=${this._startAddGrowspace}>
            <svg style="width:16px;height:16px;fill:currentColor;" viewBox="0 0 24 24">
              <path d="${mdiPlus}"></path>
            </svg>
            Add Growspace
          </button>
        </div>

        <!-- Detail pane -->
        <div class="cfg-detail-pane">
          ${isAdding ? this._renderAddGrowspaceForm() : nothing}
          ${!isAdding && editingId ? this._renderEditGrowspaceForm() : nothing}
          ${!isAdding && !editingId
            ? html`
                <div style="text-align:center;padding:40px 20px;color:var(--secondary-text-color);">
                  Select a growspace to edit, or click "Add Growspace" to create a new one.
                </div>
              `
            : nothing}
        </div>
      </div>
    `;
  }

  private _renderAddGrowspaceForm() {
    const sub = this._sm.tabs.growspaces.sub;
    if (sub.kind !== 'adding') return nothing;
    return html`
      <div class="detail-card">
        <h3>New Growspace</h3>
        <md3-text-input
          label="Growspace Name"
          .value=${sub.name}
          @change=${(e: CustomEvent) => this._t({ type: 'UPDATE_ADD_DRAFT', partial: { name: e.detail } })}
        ></md3-text-input>
        <div class="row-col-grid">
          <md3-number-input
            label="Rows"
            .value=${sub.rows}
            @change=${(e: CustomEvent) => this._t({ type: 'UPDATE_ADD_DRAFT', partial: { rows: parseInt(e.detail) } })}
          ></md3-number-input>
          <md3-number-input
            label="Plants per Row"
            .value=${sub.plantsPerRow}
            @change=${(e: CustomEvent) => this._t({ type: 'UPDATE_ADD_DRAFT', partial: { plantsPerRow: parseInt(e.detail) } })}
          ></md3-number-input>
        </div>
        <div class="md3-input-group">
          <label class="md3-label">Notification Service (Mobile App)</label>
          <select
            class="md3-input"
            .value=${sub.notificationService}
            @change=${(e: Event) =>
              this._t({ type: 'UPDATE_ADD_DRAFT', partial: { notificationService: (e.target as HTMLSelectElement).value } })}
          >
            <option value="">None</option>
            ${this._getMobileAppNotifyServices().map(
              (s) => html`
                <option value="${s.value}" ?selected=${sub.notificationService === s.value}>
                  ${s.label}
                </option>
              `
            )}
          </select>
        </div>
      </div>
    `;
  }

  private _renderEditGrowspaceForm() {
    const sub = this._sm.tabs.growspaces.sub;
    if (sub.kind !== 'editing') return nothing;
    const d = this._sm.environmentDraft;
    return html`
      <div class="detail-card">
        <h3>Edit Details</h3>
        <md3-text-input
          label="Growspace Name"
          .value=${sub.name}
          @change=${(e: CustomEvent) => this._t({ type: 'UPDATE_EDIT_DRAFT', partial: { name: e.detail } })}
        ></md3-text-input>
        <div class="row-col-grid">
          <md3-number-input
            label="Rows"
            .value=${sub.rows}
            @change=${(e: CustomEvent) => this._t({ type: 'UPDATE_EDIT_DRAFT', partial: { rows: parseInt(e.detail) } })}
          ></md3-number-input>
          <md3-number-input
            label="Plants per Row"
            .value=${sub.plantsPerRow}
            @change=${(e: CustomEvent) => this._t({ type: 'UPDATE_EDIT_DRAFT', partial: { plantsPerRow: parseInt(e.detail) } })}
          ></md3-number-input>
        </div>
        <div class="md3-input-group">
          <label class="md3-label">Notification Service (Mobile App)</label>
          <select
            class="md3-input"
            .value=${sub.notificationService}
            @change=${(e: Event) =>
              this._t({ type: 'UPDATE_EDIT_DRAFT', partial: { notificationService: (e.target as HTMLSelectElement).value } })}
          >
            <option value="">None</option>
            ${this._getMobileAppNotifyServices().map(
              (s) => html`
                <option value="${s.value}" ?selected=${sub.notificationService === s.value}>
                  ${s.label}
                </option>
              `
            )}
          </select>
        </div>
        ${this._renderMultiEntitySelect(
          'Lung Room Temp Sensors',
          d.lungroomTempSensors,
          ['sensor', 'input_number'],
          'temperature',
          (v) => this._t({ type: 'UPDATE_ENV_DRAFT', partial: { lungroomTempSensors: v } })
        )}
        ${this._renderMultiEntitySelect(
          'Area Camera',
          d.cameraEntities,
          ['camera'],
          null,
          (v) => this._t({ type: 'UPDATE_ENV_DRAFT', partial: { cameraEntities: v } })
        )}
      </div>
    `;
  }

  private _renderSensorsSection() {
    const d = this._sm.environmentDraft;
    return html`
      <div class="detail-card">
        <div
          style="display:flex;align-items:center;gap:8px;margin-bottom:16px;border-bottom:1px solid var(--divider-color,rgba(255,255,255,0.1));padding-bottom:8px;"
        >
          <svg
            style="width:20px;height:20px;fill:var(--primary-color,#4caf50);"
            viewBox="0 0 24 24"
          >
            <path d="${mdiThermometer}"></path>
          </svg>
          <h3 style="margin:0;border:none;padding:0;">Monitoring Sensors</h3>
        </div>
        <div class="form-section">
          <div class="row-col-grid">
            ${this._renderMultiEntitySelect(
              'Temperature Sensors',
              d.temperatureSensors,
              ['sensor', 'input_number'],
              'temperature',
              (v) => this._t({ type: 'UPDATE_ENV_DRAFT', partial: { temperatureSensors: v } })
            )}
            ${this._renderMultiEntitySelect(
              'Humidity Sensors',
              d.humiditySensors,
              ['sensor', 'input_number'],
              'humidity',
              (v) => this._t({ type: 'UPDATE_ENV_DRAFT', partial: { humiditySensors: v } })
            )}
          </div>
          <div class="row-col-grid">
            ${this._renderMultiEntitySelect(
              'VPD Sensors (Optional)',
              d.vpdSensors,
              ['sensor', 'input_number'],
              'pressure',
              (v) => this._t({ type: 'UPDATE_ENV_DRAFT', partial: { vpdSensors: v } })
            )}
            ${this._renderEntitySelect(
              'Soil Moisture Sensor',
              d.soilMoistureSensor,
              ['sensor', 'input_number'],
              'moisture',
              (e: CustomEvent) => this._t({ type: 'UPDATE_ENV_DRAFT', partial: { soilMoistureSensor: e.detail.value } })
            )}
          </div>
          <div class="row-col-grid">
            ${this._renderEntitySelect(
              'CO₂ Sensor',
              d.co2Sensor,
              ['sensor', 'input_number'],
              'carbon_dioxide',
              (e: CustomEvent) => this._t({ type: 'UPDATE_ENV_DRAFT', partial: { co2Sensor: e.detail.value } })
            )}
            ${this._renderMultiEntitySelect(
              'Light Source / Sensor',
              d.lightSensors,
              ['switch', 'light', 'input_boolean', 'sensor'],
              null,
              (v) => this._t({ type: 'UPDATE_ENV_DRAFT', partial: { lightSensors: v } })
            )}
          </div>
          ${this._renderMultiEntitySelect(
            'Substrate Temperature Sensors',
            d.substrateTemperatureSensors,
            ['sensor', 'input_number'],
            'temperature',
            (v) => this._t({ type: 'UPDATE_ENV_DRAFT', partial: { substrateTemperatureSensors: v } })
          )}
        </div>
      </div>
    `;
  }

  private _renderClimateSection() {
    const d = this._sm.environmentDraft;
    return html`
      <div class="detail-card">
        <div
          style="display:flex;align-items:center;gap:8px;margin-bottom:16px;border-bottom:1px solid var(--divider-color,rgba(255,255,255,0.1));padding-bottom:8px;"
        >
          <svg
            style="width:20px;height:20px;fill:var(--primary-color,#4caf50);"
            viewBox="0 0 24 24"
          >
            <path d="${mdiFan}"></path>
          </svg>
          <h3 style="margin:0;border:none;padding:0;">Climate Control</h3>
        </div>
        <div class="form-section">
          <div class="row-col-grid">
            ${this._renderMultiEntitySelect(
              'Exhaust Fan / Switch',
              d.exhaustFanEntities,
              ['fan', 'switch', 'input_boolean', 'sensor', 'binary_sensor', 'input_number'],
              null,
              (v) => this._t({ type: 'UPDATE_ENV_DRAFT', partial: { exhaustFanEntities: v } })
            )}
            ${this._renderMultiEntitySelect(
              'Circulation Fan / Switch',
              d.circulationFanEntities,
              ['fan', 'switch', 'input_boolean', 'sensor', 'input_number'],
              null,
              (v) => this._t({ type: 'UPDATE_ENV_DRAFT', partial: { circulationFanEntities: v } })
            )}
          </div>
          <div class="row-col-grid">
            <md3-number-input
              label="Stress Threshold %"
              .value=${d.stressThreshold}
              @change=${(e: CustomEvent) => this._t({ type: 'UPDATE_ENV_DRAFT', partial: { stressThreshold: parseFloat(e.detail) } })}
              step="0.01"
            ></md3-number-input>
            <md3-number-input
              label="Mold Threshold %"
              .value=${d.moldThreshold}
              @change=${(e: CustomEvent) => this._t({ type: 'UPDATE_ENV_DRAFT', partial: { moldThreshold: parseFloat(e.detail) } })}
              step="0.01"
            ></md3-number-input>
          </div>
          <div class="control-row">
            <button
              class="md3-button tonal error"
              @click=${this._handleRemoveEnvironment}
              ?disabled=${!d.selectedGrowspaceId}
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
        <div
          style="display:flex;align-items:center;gap:8px;margin-bottom:16px;border-bottom:1px solid var(--divider-color,rgba(255,255,255,0.1));padding-bottom:8px;"
        >
          <svg
            style="width:20px;height:20px;fill:var(--primary-color,#4caf50);"
            viewBox="0 0 24 24"
          >
            <path d="${mdiAirHumidifier}"></path>
          </svg>
          <h3 style="margin:0;border:none;padding:0;">Humidity Devices</h3>
        </div>
        <div class="form-section">
          <div class="row-col-grid">
            ${this._renderMultiEntitySelect(
              'Humidifier',
              this._sm.environmentDraft.humidifierEntities,
              ['humidifier', 'switch', 'input_boolean', 'sensor', 'binary_sensor', 'input_number'],
              null,
              (v) => this._t({ type: 'UPDATE_ENV_DRAFT', partial: { humidifierEntities: v } })
            )}
            ${this._renderMultiEntitySelect(
              'Dehumidifier',
              this._sm.environmentDraft.dehumidifierEntities,
              ['humidifier', 'switch', 'input_boolean', 'sensor', 'binary_sensor'],
              null,
              (v) => this._t({ type: 'UPDATE_ENV_DRAFT', partial: { dehumidifierEntities: v } })
            )}
          </div>
          <div class="row-col-grid">
            <label class="checkbox-label">
              <input
                type="checkbox"
                .checked=${this._sm.environmentDraft.humidifierControlEnabled}
                @change=${(e: Event) =>
                  this._t({ type: 'UPDATE_ENV_DRAFT', partial: { humidifierControlEnabled: (e.target as HTMLInputElement).checked } })}
              />
              Enable Humidifier Control
            </label>
            <label class="checkbox-label">
              <input
                type="checkbox"
                .checked=${this._dehumidifierControlEnabled}
                @change=${(e: Event) => {
                  const enabled = (e.target as HTMLInputElement).checked;
                  this._dehumidifierControlEnabled = enabled;
                  setDehumidifierControl(this._sm.environmentDraft.selectedGrowspaceId, enabled);
                }}
              />
              Enable Dehumidifier Control
            </label>
          </div>
        </div>
      </div>

      <!-- Thresholds accordion -->
      <div class="detail-card">
        <div
          style="display:flex;align-items:center;gap:8px;margin-bottom:16px;border-bottom:1px solid var(--divider-color,rgba(255,255,255,0.1));padding-bottom:8px;"
        >
          <svg
            style="width:20px;height:20px;fill:var(--primary-color,#4caf50);"
            viewBox="0 0 24 24"
          >
            <path d="${mdiWaterPercent}"></path>
          </svg>
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
                <div
                  class="acc-head"
                  @click=${() => {
                    this._openHumidityStageId = isOpen ? '' : (stage.id as HumidityStageId);
                  }}
                >
                  <div class="acc-stage-dot" style="background:${color};"></div>
                  <div class="acc-head-title">${stage.label}</div>
                  ${!isOpen
                    ? html`
                        <div class="acc-head-desc">
                          Dehum on &gt; ${dhDay > 0 ? dhDay + '%' : '—'} &nbsp;·&nbsp; Hum on &lt;
                          ${huDay > 0 ? huDay + '%' : '—'}
                        </div>
                      `
                    : nothing}
                  <svg class="acc-chev ${isOpen ? 'open' : ''}" viewBox="0 0 24 24">
                    <path d="${mdiChevronDown}"></path>
                  </svg>
                </div>
                ${isOpen
                  ? html`
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
                                <svg viewBox="0 0 24 24">
                                  <path d="${mdiWhiteBalanceSunny}"></path>
                                </svg>
                                Day
                              </div>
                              <div
                                style="display:flex;flex-direction:column;gap:8px;margin-top:8px;"
                              >
                                <md3-number-input
                                  label="On Above %"
                                  .value=${this._getThresholdValue(stage.dehum, 'day', 'on')}
                                  @change=${(e: CustomEvent) =>
                                    this._updateThreshold(
                                      stage.dehum,
                                      'day',
                                      'on',
                                      parseFloat(e.detail)
                                    )}
                                  step="1"
                                ></md3-number-input>
                                <md3-number-input
                                  label="Off Below %"
                                  .value=${this._getThresholdValue(stage.dehum, 'day', 'off')}
                                  @change=${(e: CustomEvent) =>
                                    this._updateThreshold(
                                      stage.dehum,
                                      'day',
                                      'off',
                                      parseFloat(e.detail)
                                    )}
                                  step="1"
                                ></md3-number-input>
                              </div>
                            </div>
                            <div>
                              <div class="acc-cycle-row" style="color:#7986cb;">
                                <svg viewBox="0 0 24 24"><path d="${mdiWeatherNight}"></path></svg>
                                Night
                              </div>
                              <div
                                style="display:flex;flex-direction:column;gap:8px;margin-top:8px;"
                              >
                                <md3-number-input
                                  label="On Above %"
                                  .value=${this._getThresholdValue(stage.dehum, 'night', 'on')}
                                  @change=${(e: CustomEvent) =>
                                    this._updateThreshold(
                                      stage.dehum,
                                      'night',
                                      'on',
                                      parseFloat(e.detail)
                                    )}
                                  step="1"
                                ></md3-number-input>
                                <md3-number-input
                                  label="Off Below %"
                                  .value=${this._getThresholdValue(stage.dehum, 'night', 'off')}
                                  @change=${(e: CustomEvent) =>
                                    this._updateThreshold(
                                      stage.dehum,
                                      'night',
                                      'off',
                                      parseFloat(e.detail)
                                    )}
                                  step="1"
                                ></md3-number-input>
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
                                <svg viewBox="0 0 24 24">
                                  <path d="${mdiWhiteBalanceSunny}"></path>
                                </svg>
                                Day
                              </div>
                              <div
                                style="display:flex;flex-direction:column;gap:8px;margin-top:8px;"
                              >
                                <md3-number-input
                                  label="On Below %"
                                  .value=${this._getHumidifierThresholdValue(
                                    stage.hum,
                                    'day',
                                    'on'
                                  )}
                                  @change=${(e: CustomEvent) =>
                                    this._updateHumidifierThreshold(
                                      stage.hum,
                                      'day',
                                      'on',
                                      parseFloat(e.detail)
                                    )}
                                  step="1"
                                ></md3-number-input>
                                <md3-number-input
                                  label="Off Above %"
                                  .value=${this._getHumidifierThresholdValue(
                                    stage.hum,
                                    'day',
                                    'off'
                                  )}
                                  @change=${(e: CustomEvent) =>
                                    this._updateHumidifierThreshold(
                                      stage.hum,
                                      'day',
                                      'off',
                                      parseFloat(e.detail)
                                    )}
                                  step="1"
                                ></md3-number-input>
                              </div>
                            </div>
                            <div>
                              <div class="acc-cycle-row" style="color:#7986cb;">
                                <svg viewBox="0 0 24 24"><path d="${mdiWeatherNight}"></path></svg>
                                Night
                              </div>
                              <div
                                style="display:flex;flex-direction:column;gap:8px;margin-top:8px;"
                              >
                                <md3-number-input
                                  label="On Below %"
                                  .value=${this._getHumidifierThresholdValue(
                                    stage.hum,
                                    'night',
                                    'on'
                                  )}
                                  @change=${(e: CustomEvent) =>
                                    this._updateHumidifierThreshold(
                                      stage.hum,
                                      'night',
                                      'on',
                                      parseFloat(e.detail)
                                    )}
                                  step="1"
                                ></md3-number-input>
                                <md3-number-input
                                  label="Off Above %"
                                  .value=${this._getHumidifierThresholdValue(
                                    stage.hum,
                                    'night',
                                    'off'
                                  )}
                                  @change=${(e: CustomEvent) =>
                                    this._updateHumidifierThreshold(
                                      stage.hum,
                                      'night',
                                      'off',
                                      parseFloat(e.detail)
                                    )}
                                  step="1"
                                ></md3-number-input>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    `
                  : nothing}
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
        <div
          style="display:flex;align-items:center;gap:8px;margin-bottom:16px;border-bottom:1px solid var(--divider-color,rgba(255,255,255,0.1));padding-bottom:8px;"
        >
          <svg
            style="width:20px;height:20px;fill:var(--primary-color,#4caf50);"
            viewBox="0 0 24 24"
          >
            <path d="${mdiGauge}"></path>
          </svg>
          <h3 style="margin:0;border:none;padding:0;">Irrigation Monitoring</h3>
        </div>
        <div class="form-section">
          <div class="row-col-grid">
            ${this._renderMultiEntitySelect(
              'pH Sensors',
              this._sm.environmentDraft.phSensors,
              ['sensor', 'input_number', 'number'],
              null,
              (v) => this._t({ type: 'UPDATE_ENV_DRAFT', partial: { phSensors: v } })
            )}
            ${this._renderMultiEntitySelect(
              'Feed EC Sensors',
              this._sm.environmentDraft.feedEcSensors,
              ['sensor', 'input_number', 'number'],
              null,
              (v) => this._t({ type: 'UPDATE_ENV_DRAFT', partial: { feedEcSensors: v } })
            )}
          </div>
          <div class="row-col-grid">
            ${this._renderMultiEntitySelect(
              'Substrate EC Sensors',
              this._sm.environmentDraft.substrateEcSensors,
              ['sensor', 'input_number', 'number'],
              null,
              (v) => this._t({ type: 'UPDATE_ENV_DRAFT', partial: { substrateEcSensors: v } })
            )}
            ${this._renderMultiEntitySelect(
              'Runoff EC Sensors',
              this._sm.environmentDraft.runoffEcSensors,
              ['sensor', 'input_number', 'number'],
              null,
              (v) => this._t({ type: 'UPDATE_ENV_DRAFT', partial: { runoffEcSensors: v } })
            )}
          </div>
          <div class="row-col-grid">
            ${this._renderMultiEntitySelect(
              'Drain Volume Sensors',
              this._sm.environmentDraft.drainVolumeSensors,
              ['sensor', 'input_number', 'number'],
              null,
              (v) => this._t({ type: 'UPDATE_ENV_DRAFT', partial: { drainVolumeSensors: v } })
            )}
            ${this._renderMultiEntitySelect(
              'Irrigation Flow Sensors',
              this._sm.environmentDraft.irrigationFlowSensors,
              ['sensor', 'input_number', 'number'],
              null,
              (v) => this._t({ type: 'UPDATE_ENV_DRAFT', partial: { irrigationFlowSensors: v } })
            )}
          </div>
          <div class="row-col-grid">
            ${this._renderMultiEntitySelect(
              'Power Sensors',
              this._sm.environmentDraft.powerSensors,
              ['sensor', 'input_number', 'number'],
              'power',
              (v) => this._t({ type: 'UPDATE_ENV_DRAFT', partial: { powerSensors: v } })
            )}
            ${this._renderMultiEntitySelect(
              'Energy Sensors',
              this._sm.environmentDraft.energySensors,
              ['sensor', 'input_number', 'number'],
              'energy',
              (v) => this._t({ type: 'UPDATE_ENV_DRAFT', partial: { energySensors: v } })
            )}
          </div>
        </div>
      </div>
    `;
  }

  private _renderTanksSection() {
    const listId = 'list-tank-sensor-entity';
    const entities = this._getEntities(['sensor', 'input_number'], null);
    return html`
      <div class="detail-card">
        <div
          style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;"
        >
          <div style="display:flex;align-items:center;gap:8px;">
            <svg
              style="width:20px;height:20px;fill:var(--primary-color,#4caf50);"
              viewBox="0 0 24 24"
            >
              <path d="${mdiWater}"></path>
            </svg>
            <h3 style="margin:0;border:none;padding:0;">Irrigation Tanks</h3>
          </div>
          <button class="md3-button tonal" @click=${this._openAddTank} style="padding:6px 12px;">
            <svg
              style="width:16px;height:16px;fill:currentColor;margin-right:4px;"
              viewBox="0 0 24 24"
            >
              <path d="${mdiPlus}"></path>
            </svg>
            Add Tank
          </button>
        </div>

        ${this._sm.environmentDraft.irrigationTanks.length === 0 && this._sm.tabs.tanks.sub.kind === 'idle'
          ? html`<div style="font-size:0.85rem;color:var(--secondary-text-color);padding:8px 0;">
              No tanks configured.
            </div>`
          : nothing}

        <div style="display:flex;flex-direction:column;gap:8px;">
          ${this._sm.environmentDraft.irrigationTanks.map(
            (tank, i) => html`
              <div
                style="display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,0.05);padding:10px 12px;border-radius:8px;"
              >
                <div>
                  <div style="font-weight:500;">${tank.name || 'Tank ' + (i + 1)}</div>
                  <div style="font-size:0.78rem;color:var(--secondary-text-color);">
                    ${tank.sensorEntity}
                    ${tank.volumeLiters != null ? html` · ${tank.volumeLiters} L` : nothing} · warn
                    at ${tank.warningLevel ?? 30}%
                  </div>
                </div>
                <div style="display:flex;gap:6px;">
                  <button
                    class="md3-button text"
                    @click=${() => this._editTank(i)}
                    style="padding:6px;min-width:auto;"
                  >
                    <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24">
                      <path d="${mdiPencil}"></path>
                    </svg>
                  </button>
                  <button
                    class="md3-button text error"
                    @click=${() => this._deleteTank(i)}
                    style="padding:6px;min-width:auto;"
                  >
                    <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24">
                      <path d="${mdiDelete}"></path>
                    </svg>
                  </button>
                </div>
              </div>
            `
          )}
        </div>

        ${this._sm.tabs.tanks.sub.kind !== 'idle'
          ? html`
              ${(() => {
                const tankSub = this._sm.tabs.tanks.sub;
                if (tankSub.kind !== 'adding' && tankSub.kind !== 'editing') return nothing;
                return html`
                  <div
                    style="margin-top:12px;background:rgba(255,255,255,0.04);border:1px solid var(--divider-color,rgba(255,255,255,0.15));border-radius:8px;padding:16px;display:flex;flex-direction:column;gap:12px;"
                  >
                    <div class="md3-input-group">
                      <label class="md3-label">Sensor Entity *</label>
                      <input
                        class="md3-input"
                        list="${listId}"
                        .value=${tankSub.sensorEntity}
                        @input=${(e: Event) => {
                          this._t({ type: 'UPDATE_TANK_DRAFT', partial: { sensorEntity: (e.target as HTMLInputElement).value } });
                        }}
                        placeholder="Search entity..."
                      />
                      <datalist id="${listId}">
                        ${entities.map((eid) => html`<option value="${eid}"></option>`)}
                      </datalist>
                    </div>
                    <div class="md3-input-group">
                      <label class="md3-label">Name</label>
                      <input
                        class="md3-input"
                        type="text"
                        .value=${tankSub.name}
                        @input=${(e: Event) => {
                          this._t({ type: 'UPDATE_TANK_DRAFT', partial: { name: (e.target as HTMLInputElement).value } });
                        }}
                        placeholder="e.g. Main Tank"
                      />
                    </div>
                    <div class="row-col-grid">
                      <div class="md3-input-group">
                        <label class="md3-label">Volume (L, optional)</label>
                        <input
                          class="md3-input"
                          type="number"
                          min="0"
                          step="0.1"
                          .value=${tankSub.volumeLiters != null ? String(tankSub.volumeLiters) : ''}
                          @input=${(e: Event) => {
                            const v = (e.target as HTMLInputElement).value;
                            this._t({ type: 'UPDATE_TANK_DRAFT', partial: { volumeLiters: v === '' ? null : parseFloat(v) } });
                          }}
                          placeholder="e.g. 100"
                        />
                      </div>
                      <div class="md3-input-group">
                        <label class="md3-label">Warning Level (%)</label>
                        <input
                          class="md3-input"
                          type="number"
                          min="0"
                          max="100"
                          step="1"
                          .value=${String(tankSub.warningLevel)}
                          @input=${(e: Event) => {
                            this._t({ type: 'UPDATE_TANK_DRAFT', partial: { warningLevel: parseFloat((e.target as HTMLInputElement).value) || 30 } });
                          }}
                        />
                      </div>
                    </div>
                    <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:4px;">
                      <button class="md3-button tonal" @click=${this._cancelTank}>Cancel</button>
                      <button class="md3-button primary" @click=${this._saveTank}>Save Tank</button>
                    </div>
                  </div>
                `;
              })()}
            `
          : nothing}
      </div>
    `;
  }

  private _renderVisionSection() {
    return html`
      <div class="detail-card">
        <div
          style="display:flex;align-items:center;gap:8px;margin-bottom:16px;border-bottom:1px solid var(--divider-color,rgba(255,255,255,0.1));padding-bottom:8px;"
        >
          <svg
            style="width:20px;height:20px;fill:var(--primary-color,#4caf50);"
            viewBox="0 0 24 24"
          >
            <path d="${mdiCamera}"></path>
          </svg>
          <h3 style="margin:0;border:none;padding:0;">Vision Checkup</h3>
        </div>
        ${this._renderMultiEntitySelect(
          'Camera Entities',
          this._sm.environmentDraft.cameraEntities,
          ['camera'],
          null,
          (v) => this._t({ type: 'UPDATE_ENV_DRAFT', partial: { cameraEntities: v } })
        )}
        ${this._sm.environmentDraft.cameraEntities.length === 0
          ? html`<p style="opacity:0.6;font-size:0.85rem;margin:8px 0 0;">
              Add camera entities above to enable vision checkups.
            </p>`
          : html`
              <div class="form-section" style="margin-top:12px;">
                <label class="checkbox-label">
                  <input
                    type="checkbox"
                    .checked=${this._sm.environmentDraft.visionEnabled}
                    @change=${(e: Event) => {
                      this._t({ type: 'UPDATE_ENV_DRAFT', partial: { visionEnabled: (e.target as HTMLInputElement).checked } });
                    }}
                  />
                  Enable automatic vision checkups
                </label>
                <md3-number-input
                  label="Early check offset (min after lights on)"
                  .value=${this._sm.environmentDraft.visionEarlyOffset}
                  @change=${(e: CustomEvent) => {
                    this._t({ type: 'UPDATE_ENV_DRAFT', partial: { visionEarlyOffset: Number(e.detail) } });
                  }}
                  min="1"
                >
                </md3-number-input>
                <md3-number-input
                  label="Mid check (hours into light cycle)"
                  .value=${this._sm.environmentDraft.visionMidHours}
                  @change=${(e: CustomEvent) => {
                    this._t({ type: 'UPDATE_ENV_DRAFT', partial: { visionMidHours: Number(e.detail) } });
                  }}
                  min="1"
                >
                </md3-number-input>
                <md3-number-input
                  label="Late check offset (min before lights off)"
                  .value=${this._sm.environmentDraft.visionLateOffset}
                  @change=${(e: CustomEvent) => {
                    this._t({ type: 'UPDATE_ENV_DRAFT', partial: { visionLateOffset: Number(e.detail) } });
                  }}
                  min="1"
                >
                </md3-number-input>
                <div style="display:flex;justify-content:flex-end;">
                  <button
                    class="md3-button primary vision-save-btn"
                    @click=${this._submitVisionCheckupConfig}
                  >
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
        <div
          style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;"
        >
          <h3>Sensor Groups</h3>
          <button class="md3-button tonal" @click=${this._openAddGroup}>Add Group</button>
        </div>
        ${this._sm.environmentDraft.sensorGroups.length === 0
          ? html`<div style="text-align:center;padding:20px;color:var(--secondary-text-color);">
              No sensor groups configured.
            </div>`
          : html`
              <div style="display:flex;flex-direction:column;gap:8px;">
                ${this._sm.environmentDraft.sensorGroups.map(
                  (group) => html`
                    <div
                      style="display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,0.05);padding:12px;border-radius:8px;"
                    >
                      <div>
                        <div style="font-weight:500;">${group.name}</div>
                        <div style="font-size:0.8rem;color:var(--secondary-text-color);">
                          X: ${group.x}, Y: ${group.y}, Z: ${group.z}
                        </div>
                      </div>
                      <div style="display:flex;gap:8px;">
                        <button
                          class="md3-button text"
                          @click=${() => this._editGroup(group)}
                          style="padding:8px;min-width:auto;"
                        >
                          <svg
                            style="width:20px;height:20px;fill:currentColor;"
                            viewBox="0 0 24 24"
                          >
                            <path d="${mdiPencil}"></path>
                          </svg>
                        </button>
                        <button
                          class="md3-button text error"
                          @click=${() => this._deleteGroup(group.id)}
                          style="padding:8px;min-width:auto;"
                        >
                          <svg
                            style="width:20px;height:20px;fill:currentColor;"
                            viewBox="0 0 24 24"
                          >
                            <path d="${mdiDelete}"></path>
                          </svg>
                        </button>
                      </div>
                    </div>
                  `
                )}
              </div>
            `}
      </div>
    `;
  }

  private _renderSubareasSection() {
    const envId = this._sm.environmentDraft.selectedGrowspaceId;
    const gsSub = this._sm.tabs.growspaces.sub;
    const growspaceId = envId || (gsSub.kind === 'editing' ? gsSub.growspaceId : '');
    const subareasSub = this._sm.tabs.subareas.sub;
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
        <div
          style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;"
        >
          <h3 style="margin:0;">Subareas</h3>
          <button
            class="md3-button tonal"
            @click=${() => this._t({ type: 'BEGIN_ADD_SUBAREA' })}
          >
            <svg
              style="width:18px;height:18px;fill:currentColor;margin-right:6px;"
              viewBox="0 0 24 24"
            >
              <path d="${mdiPlus}"></path>
            </svg>
            Add Subarea
          </button>
        </div>

        ${subareasSub.kind === 'adding'
          ? html`
              <div
                style="display:flex;gap:8px;align-items:center;margin-bottom:16px;background:rgba(255,255,255,0.05);padding:12px;border-radius:8px;"
              >
                <input
                  class="md3-input"
                  style="flex:1;"
                  placeholder="Subarea name..."
                  .value=${subareasSub.name}
                  @input=${(e: Event) =>
                    this._t({ type: 'UPDATE_SUBAREA_NAME', name: (e.target as HTMLInputElement).value })}
                  @keydown=${(e: KeyboardEvent) => {
                    if (e.key === 'Enter') this._handleAddSubarea();
                  }}
                />
                <button
                  class="md3-button primary"
                  @click=${this._handleAddSubarea}
                  ?disabled=${!subareasSub.name.trim()}
                >
                  Add
                </button>
                <button class="md3-button tonal" @click=${() => this._t({ type: 'CANCEL_SUBAREA' })}>
                  Cancel
                </button>
              </div>
            `
          : nothing}
        ${this._subareasLoading
          ? html`<div style="text-align:center;padding:20px;color:var(--secondary-text-color);">
              Loading...
            </div>`
          : this._subareas.length === 0
            ? html`<div style="text-align:center;padding:20px;color:var(--secondary-text-color);">
                No subareas configured. Add one to get started.
              </div>`
            : html`
                <div style="display:flex;flex-direction:column;gap:8px;">
                  ${this._subareas.map(
                    (subarea) => html`
                      <div
                        style="display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,0.05);padding:12px;border-radius:8px;"
                      >
                        <div>
                          <div style="font-weight:500;">${subarea.name}</div>
                          <div style="font-size:0.8rem;color:var(--secondary-text-color);">
                            ID: ${subarea.id}
                          </div>
                        </div>
                        <div style="display:flex;gap:4px;align-items:center;">
                          ${subareasSub.kind === 'confirm-delete' && subareasSub.subareaId === subarea.id
                            ? html`
                                <span
                                  style="font-size:0.85rem;color:var(--secondary-text-color);margin-right:4px;"
                                  >Remove ${subarea.name}?</span
                                >
                                <button
                                  class="md3-button primary error"
                                  @click=${() => this._confirmDeleteSubarea(subarea.id)}
                                  style="padding:6px 10px;min-width:auto;font-size:0.8rem;"
                                >
                                  Yes
                                </button>
                                <button
                                  class="md3-button tonal"
                                  @click=${() => this._t({ type: 'CANCEL_DELETE_SUBAREA' })}
                                  style="padding:6px 10px;min-width:auto;font-size:0.8rem;"
                                >
                                  No
                                </button>
                              `
                            : html`
                                <button
                                  class="md3-button text"
                                  @click=${() => this._handleEditSubarea(subarea)}
                                  style="padding:8px;min-width:auto;"
                                  title="Edit sensors"
                                >
                                  <svg
                                    style="width:20px;height:20px;fill:currentColor;"
                                    viewBox="0 0 24 24"
                                  >
                                    <path d="${mdiPencil}"></path>
                                  </svg>
                                </button>
                                <button
                                  class="md3-button text error"
                                  @click=${() => this._handleDeleteSubarea(subarea.id)}
                                  style="padding:8px;min-width:auto;"
                                  title="Delete subarea"
                                >
                                  <svg
                                    style="width:20px;height:20px;fill:currentColor;"
                                    viewBox="0 0 24 24"
                                  >
                                    <path d="${mdiDelete}"></path>
                                  </svg>
                                </button>
                              `}
                        </div>
                      </div>
                    `
                  )}
                </div>
              `}
      </div>
    `;
  }

  // ── Main render ──────────────────────────────────────────────────────────

  private _icon(path: string, size = 24) {
    return html`<svg
      style="width:${size}px;height:${size}px;fill:currentColor;"
      viewBox="0 0 24 24"
    >
      <path d="${path}"></path>
    </svg>`;
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

    const heatmapSub = this._sm.tabs.heatmap.sub;
    const subareasSub = this._sm.tabs.subareas.sub;

    if (heatmapSub.kind === 'editing-group') {
      return html`
        <sensor-group-dialog
          .open=${true}
          .hass=${this.hass}
          .sensorGroup=${heatmapSub.group}
          @close=${(e: Event) => {
            e.stopPropagation();
            this._t({ type: 'CLOSE_GROUP_DIALOG' });
          }}
          @save-sensor-group=${this._handleSaveGroup}
        ></sensor-group-dialog>
      `;
    }

    if (subareasSub.kind === 'editing-subarea') {
      return html`
        <subarea-config-dialog
          .open=${true}
          .hass=${this.hass}
          .growspaceId=${this._subareasGrowspaceId}
          .subarea=${subareasSub.subarea}
          @close=${(e: Event) => {
            e.stopPropagation();
            this._t({ type: 'CLOSE_SUBAREA_DIALOG' });
          }}
          @subarea-updated=${(e: CustomEvent) => {
            e.stopPropagation();
            this._t({ type: 'CLOSE_SUBAREA_DIALOG' });
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
            <div class="dialog-icon">${this._icon(mdiCog, 24)}</div>
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
            <button
              class="md3-button text"
              @click=${this._close}
              style="min-width:auto;padding:8px;"
            >
              ${this._icon(mdiClose, 24)}
            </button>
          </div>

          <!-- Body: Rail + Content -->
          <div class="cfg-body">
            <!-- Left Rail -->
            ${showRail
              ? html`
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
                `
              : nothing}

            <!-- Content Area -->
            <div class="cfg-content">
              <!-- Context bar: growspace selector (all sections except Growspaces) -->
              ${showContextBar
                ? html`
                    <div class="cfg-context-bar">
                      <span class="cfg-context-label">Growspace</span>
                      <select
                        class="cfg-context-select"
                        .value=${this._sm.environmentDraft.selectedGrowspaceId}
                        @change=${this._handleEnvGrowspaceChange}
                      >
                        <option value="">Select...</option>
                        ${Object.entries(this.growspaceOptions).map(
                          ([id, name]) => html`
                            <option value="${id}" ?selected=${id === this._sm.environmentDraft.selectedGrowspaceId}>
                              ${name}
                            </option>
                          `
                        )}
                      </select>
                    </div>
                  `
                : nothing}

              <!-- Scrollable content -->
              <div class="cfg-scroll">
                ${this.currentTab === ConfigTab.GROWSPACES
                  ? this._renderGrowspacesSection()
                  : nothing}
                ${this.currentTab === ConfigTab.SENSORS ? this._renderSensorsSection() : nothing}
                ${this.currentTab === ConfigTab.CLIMATE ? this._renderClimateSection() : nothing}
                ${this.currentTab === ConfigTab.HUMIDITY ? this._renderHumiditySection() : nothing}
                ${this.currentTab === ConfigTab.IRRIGATION
                  ? this._renderIrrigationSection()
                  : nothing}
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

            ${(() => {
              const gsSub = this._sm.tabs.growspaces.sub;
              if (this.currentTab !== ConfigTab.GROWSPACES) return nothing;
              if (gsSub.kind === 'confirm-delete') {
                return html`
                  <button class="md3-button tonal" @click=${this._cancelDeleteGrowspace}>
                    No, Keep It
                  </button>
                  <button class="md3-button primary error" @click=${this._confirmDeleteGrowspace}>
                    Confirm Delete
                  </button>
                `;
              }
              if (gsSub.kind === 'adding') {
                return html`
                  <button class="md3-button primary" @click=${this._submitAddGrowspace}>
                    Add Growspace
                  </button>
                `;
              }
              if (gsSub.kind === 'editing') {
                return html`
                  <button
                    class="md3-button tonal error"
                    @click=${this._submitDeleteGrowspace}
                  >
                    ${this._icon(mdiDelete, 18)} Delete
                  </button>
                  <button
                    class="md3-button primary"
                    @click=${this._submitGrowspaceAndEnv}
                  >
                    Save Changes
                  </button>
                `;
              }
              return nothing;
            })()}
            ${[
              ConfigTab.SENSORS,
              ConfigTab.CLIMATE,
              ConfigTab.HUMIDITY,
              ConfigTab.IRRIGATION,
              ConfigTab.TANKS,
              ConfigTab.VISION,
              ConfigTab.HEATMAP,
            ].includes(this.currentTab)
              ? html`
                  <button class="md3-button primary" @click=${this._submitEnvironment}>
                    Save Configuration
                  </button>
                `
              : nothing}
          </div>
        </div>
      </ha-dialog>
    `;
  }
}
