import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import {
  mdiClose,
  mdiCog,
  mdiViewDashboard,
  mdiThermometer,
  mdiDelete,
  mdiWaterPercent,
  mdiGauge,
  mdiFan,
  mdiWhiteBalanceSunny,
  mdiViewGrid,
  mdiWater,
  mdiCamera,
  mdiBell,
  mdiTune,
} from '@mdi/js';
import { dialogStyles } from '../styles/dialog.styles';
import { HomeAssistant } from 'custom-card-helpers';

import '../features/shared/ui/md3-text-input';
import '../features/shared/ui/md3-number-input';
import '../features/shared/ui/gs-help-tooltip';
import './sensor-group-dialog';
import './subarea-config-dialog';
import {
  VPD_OPTIMAL_STAGE_DEFAULTS,
  type FanVpdStageKey,
  type VpdOptimalOverrides,
} from '../features/environment/constants';
import { GrowspaceDevice } from '../types';
import type { VisionCheckupConfigEventDetail } from '../lib/types/dialog';
import { ConfigTab } from '../constants';
import { randomId } from '../utils/random-id';
import { triggerRawValue } from '../slices/notification/triggers';
import { setDehumidifierControl, setHumidifierControl } from '../slices/growspace';
import { getSubareas, addSubarea, removeSubarea } from '../slices/subarea';
import type { Subarea } from '../slices/subarea';
import { irrigationStrategies$, updateIrrigationStrategy } from '../slices/irrigation';
import {
  createInitialSM,
  discardAndSwitch,
  isActiveTabDirty,
  requestTabSwitch,
  transition,
  type ConfigDialogSM,
  type ConfigDialogEvent,
  type ConfigTabId,
  type TimedNotificationDraft,
  type EnvironmentDraft,
} from './config-dialog-sm';
import '../features/config/components/config-notifications-tab';
import { createNotificationsTabViewModel } from '../features/config/viewmodels/notifications-tab.viewmodel';
import '../features/config/components/config-sensors-tab';
import { createSensorsTabViewModel } from '../features/config/viewmodels/sensors-tab.viewmodel';
import '../features/config/components/config-climate-tab';
import '../features/config/components/config-growlight-tab';
import { createGrowlightTabViewModel } from '../features/config/viewmodels/growlight-tab.viewmodel';
import {
  isAutomatedMode,
  type AcInfinityConflict,
} from '../features/config/components/ac-infinity-conflict';
import {
  resolveAcInfinityPort,
  listAcInfinityPortDevices,
  fillAcInfinityActuatorPort,
  fillAcInfinityGrowLightPort,
  deviceIdForModeEntity,
  type EntityRegistrySnapshot,
  type PortDeviceOption,
} from '../features/config/viewmodels/ac-infinity-port-resolver';
import type { AcInfinityDevice, AcInfinityGrowLight } from '../slices/growspace/schema';

/** The env-draft AC Infinity bundle fields a Port Pre-fill pick can target. */
const AC_INFINITY_BUNDLE_FIELDS = [
  'exhaustFanAcInfinityDevices',
  'circulationFanAcInfinityDevices',
  'humidifierAcInfinityDevices',
  'dehumidifierAcInfinityDevices',
  'growlightAcInfinityDevices',
] as const;
import { createClimateTabViewModel } from '../features/config/viewmodels/climate-tab.viewmodel';
import '../features/config/components/config-humidity-tab';
import {
  createHumidityTabViewModel,
  type HumidityStageId,
} from '../features/config/viewmodels/humidity-tab.viewmodel';
import '../features/config/components/config-irrigation-tab';
import { createIrrigationTabViewModel } from '../features/config/viewmodels/irrigation-tab.viewmodel';
import '../features/config/components/config-vision-tab';
import { createVisionTabViewModel } from '../features/config/viewmodels/vision-tab.viewmodel';
import '../features/config/components/config-vpd-targets-tab';
import { createVpdTargetsTabViewModel } from '../features/config/viewmodels/vpd-targets-tab.viewmodel';
import '../features/config/components/config-tanks-tab';
import { createTanksTabViewModel } from '../features/config/viewmodels/tanks-tab.viewmodel';
import '../features/config/components/config-growspaces-tab';
import { createGrowspacesTabViewModel } from '../features/config/viewmodels/growspaces-tab.viewmodel';
import '../features/config/components/config-heatmap-tab';
import { createHeatmapTabViewModel } from '../features/config/viewmodels/heatmap-tab.viewmodel';
import '../features/config/components/config-subareas-tab';
import { createSubareasTabViewModel } from '../features/config/viewmodels/subareas-tab.viewmodel';
import { composeEnvironmentConfig } from '../features/config/environment-save';
import {
  deriveConfigDialogCapabilities,
  type ConfigDialogCapabilities,
  type EnvironmentSaveBlockReason,
} from '../features/config/viewmodels/config-dialog-capabilities';
import { localize } from '../localize/localize';

const ENVIRONMENT_SAVE_TABS = new Set<ConfigTab>([
  ConfigTab.SENSORS,
  ConfigTab.CLIMATE,
  ConfigTab.GROWLIGHT,
  ConfigTab.HUMIDITY,
  ConfigTab.IRRIGATION,
  ConfigTab.TANKS,
  ConfigTab.HEATMAP,
  ConfigTab.VPD_TARGETS,
]);

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

  /** Deep-link: a `data-scroll-target` value to scroll into view + pulse on open. */
  @property({ type: String }) scrollToField?: string;

  @property({ attribute: false }) allowedTabs?: ConfigTab[];

  /** The growspace to configure. Resolved from `devices` and seeded once per open. */
  @property({ type: String }) growspaceId = '';

  // ── Single SM ────────────────────────────────────────────────────────────
  @state() private _sm: ConfigDialogSM = createInitialSM();

  // ── Async subarea state (outside SM — network dependent) ─────────────────
  @state() private _subareas: Subarea[] = [];
  @state() private _subareasLoading = false;
  private _subareasGrowspaceId = '';

  // ── Humidity accordion (pure UI ephemeral state) ──────────────────────────
  @state() private _openHumidityStageId: HumidityStageId | '' = '';

  // ── VPD targets accordion (pure UI ephemeral state) ───────────────────────
  @state() private _openVpdStageId: FanVpdStageKey | '' = '';

  private _initialStateApplied = false;

  private _entityOptionsStates?: HomeAssistant['states'];
  private _entityOptionsRegistry?: EntityRegistrySnapshot;
  private _entityOptionsCache = new Map<string, string[]>();

  connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener('keydown', this._onKeydown, true);
  }

  disconnectedCallback(): void {
    window.removeEventListener('keydown', this._onKeydown, true);
    super.disconnectedCallback();
  }

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

  private get _caps(): ConfigDialogCapabilities {
    return deriveConfigDialogCapabilities(this._sm.environmentDraft);
  }

  private _localize(key: string): string {
    return localize(key, '', '', this.hass?.language ?? 'en');
  }

  private _environmentSaveBlockedMessage(reason: EnvironmentSaveBlockReason): string {
    return this._localize(`config.environment_requires_${reason.replaceAll('-', '_')}`);
  }

  /** Environment tabs share one draft, so corrective navigation must preserve it. */
  private _goToSensors = (): void => {
    this._t({ type: 'SWITCH_TAB', tab: ConfigTab.SENSORS });
  };

  // ── Legacy state accessors (delegate to SM) ───────────────────────────────
  // These allow existing tests and external callers to read/write state
  // through familiar names. The SM is the authoritative source of truth.

  private get _d() {
    return this._sm.environmentDraft;
  }
  private _setEnv(partial: Partial<typeof this._sm.environmentDraft>) {
    this._sm = transition(this._sm, { type: 'UPDATE_ENV_DRAFT', partial });
    // A manual write to an AC Infinity bundle invalidates that field's Port
    // Pre-fill warnings (the pick path re-sets its own key afterwards).
    for (const field of AC_INFINITY_BUNDLE_FIELDS) {
      if (field in partial) this._acInfinityPrefillWarnings = this._clearedPrefillWarnings(field);
    }
  }

  get envSelectedId() {
    return this._d.selectedGrowspaceId;
  }
  set envSelectedId(v: string) {
    this._setEnv({ selectedGrowspaceId: v });
  }

  get envTemperatureSensors() {
    return this._d.temperatureSensors;
  }
  set envTemperatureSensors(v: string[]) {
    this._setEnv({ temperatureSensors: v });
  }

  get envHumiditySensors() {
    return this._d.humiditySensors;
  }
  set envHumiditySensors(v: string[]) {
    this._setEnv({ humiditySensors: v });
  }

  get envVpdSensors() {
    return this._d.vpdSensors;
  }
  set envVpdSensors(v: string[]) {
    this._setEnv({ vpdSensors: v });
  }

  get envCo2Sensor() {
    return this._d.co2Sensor;
  }
  set envCo2Sensor(v: string) {
    this._setEnv({ co2Sensor: v });
  }

  get envLightSensors() {
    return this._d.lightSensors;
  }
  set envLightSensors(v: string[]) {
    this._setEnv({ lightSensors: v });
  }

  get envExhaustFanEntities() {
    return this._d.exhaustFanEntities;
  }
  set envExhaustFanEntities(v: string[]) {
    this._setEnv({ exhaustFanEntities: v });
  }

  get envCirculationFanEntities() {
    return this._d.circulationFanEntities;
  }
  set envCirculationFanEntities(v: string[]) {
    this._setEnv({ circulationFanEntities: v });
  }

  get envHumidifierEntities() {
    return this._d.humidifierEntities;
  }
  set envHumidifierEntities(v: string[]) {
    this._setEnv({ humidifierEntities: v });
  }

  get envDehumidifierEntities() {
    return this._d.dehumidifierEntities;
  }
  set envDehumidifierEntities(v: string[]) {
    this._setEnv({ dehumidifierEntities: v });
  }

  get envSoilMoistureSensor() {
    return this._d.soilMoistureSensor;
  }
  set envSoilMoistureSensor(v: string) {
    this._setEnv({ soilMoistureSensor: v });
  }

  get envDehumidifierControlEnabled() {
    return this._d.dehumidifierControlEnabled;
  }
  set envDehumidifierControlEnabled(v: boolean) {
    this._setEnv({ dehumidifierControlEnabled: v });
  }

  get envHumidifierControlEnabled() {
    return this._d.humidifierControlEnabled;
  }
  set envHumidifierControlEnabled(v: boolean) {
    this._setEnv({ humidifierControlEnabled: v });
  }

  get envDehumidifierThresholds() {
    return this._d.dehumidifierThresholds;
  }
  set envDehumidifierThresholds(v: Record<string, Record<string, { on: number; off: number }>>) {
    this._setEnv({ dehumidifierThresholds: v });
  }

  get envHumidifierThresholds() {
    return this._d.humidifierThresholds;
  }
  set envHumidifierThresholds(v: Record<string, Record<string, { on: number; off: number }>>) {
    this._setEnv({ humidifierThresholds: v });
  }

  get envStressThreshold() {
    return this._d.stressThreshold;
  }
  set envStressThreshold(v: number | null) {
    this._setEnv({ stressThreshold: v });
  }

  get envMoldThreshold() {
    return this._d.moldThreshold;
  }
  set envMoldThreshold(v: number | null) {
    this._setEnv({ moldThreshold: v });
  }

  get envSensorGroups() {
    return this._d.sensorGroups;
  }
  set envSensorGroups(v: import('../types').SensorGroup[]) {
    this._setEnv({ sensorGroups: v });
  }

  get envSensorCoordinates() {
    return this._d.sensorCoordinates;
  }
  set envSensorCoordinates(
    v: Record<string, { x: number; y: number; z: number; rotation?: number }>
  ) {
    this._setEnv({ sensorCoordinates: v });
  }

  get envIrrigationTanks() {
    return this._d.irrigationTanks;
  }
  set envIrrigationTanks(v: any[]) {
    this._setEnv({ irrigationTanks: v });
  }

  get envVisionCameraEntities() {
    return this._d.cameraEntities;
  }
  set envVisionCameraEntities(v: string[]) {
    this._setEnv({ cameraEntities: v });
  }

  get envLungroomTempSensors() {
    return this._d.lungroomTempSensors;
  }
  set envLungroomTempSensors(v: string[]) {
    this._setEnv({ lungroomTempSensors: v });
  }

  get envSubstrateTemperatureSensors() {
    return this._d.substrateTemperatureSensors;
  }
  set envSubstrateTemperatureSensors(v: string[]) {
    this._setEnv({ substrateTemperatureSensors: v });
  }

  get envPhSensors() {
    return this._d.phSensors;
  }
  set envPhSensors(v: string[]) {
    this._setEnv({ phSensors: v });
  }

  get envFeedEcSensors() {
    return this._d.feedEcSensors;
  }
  set envFeedEcSensors(v: string[]) {
    this._setEnv({ feedEcSensors: v });
  }

  get envBulkEcSensors() {
    return this._d.bulkEcSensors;
  }
  set envBulkEcSensors(v: string[]) {
    this._setEnv({ bulkEcSensors: v });
  }

  get envPoreEcSensors() {
    return this._d.poreEcSensors;
  }
  set envPoreEcSensors(v: string[]) {
    this._setEnv({ poreEcSensors: v });
  }

  get envRunoffEcSensors() {
    return this._d.runoffEcSensors;
  }
  set envRunoffEcSensors(v: string[]) {
    this._setEnv({ runoffEcSensors: v });
  }

  get envDrainVolumeSensors() {
    return this._d.drainVolumeSensors;
  }
  set envDrainVolumeSensors(v: string[]) {
    this._setEnv({ drainVolumeSensors: v });
  }

  get envIrrigationFlowSensors() {
    return this._d.irrigationFlowSensors;
  }
  set envIrrigationFlowSensors(v: string[]) {
    this._setEnv({ irrigationFlowSensors: v });
  }

  get envPowerSensors() {
    return this._d.powerSensors;
  }
  set envPowerSensors(v: string[]) {
    this._setEnv({ powerSensors: v });
  }

  get envEnergySensors() {
    return this._d.energySensors;
  }
  set envEnergySensors(v: string[]) {
    this._setEnv({ energySensors: v });
  }

  get envVisionEnabled() {
    return this._d.visionEnabled;
  }
  set envVisionEnabled(v: boolean) {
    this._setEnv({ visionEnabled: v });
  }

  get envVisionEarlyOffset() {
    return this._d.visionEarlyOffset;
  }
  set envVisionEarlyOffset(v: number) {
    this._setEnv({ visionEarlyOffset: v });
  }

  get envVisionMidHours() {
    return this._d.visionMidHours;
  }
  set envVisionMidHours(v: number) {
    this._setEnv({ visionMidHours: v });
  }

  get envVisionLateOffset() {
    return this._d.visionLateOffset;
  }
  set envVisionLateOffset(v: number) {
    this._setEnv({ visionLateOffset: v });
  }

  // Growspaces tab compat accessors

  get _isAddingGrowspace() {
    return this._sm.tabs.growspaces.sub.kind === 'adding';
  }
  set _isAddingGrowspace(v: boolean) {
    if (v) {
      this._t({ type: 'START_ADD_GROWSPACE' });
    } else if (this._sm.tabs.growspaces.sub.kind === 'adding') {
      this._t({ type: 'CANCEL_GROWSPACES' });
    }
  }

  get _showDeleteConfirm() {
    return this._sm.tabs.growspaces.sub.kind === 'confirm-delete';
  }
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
    if (!id) {
      this._t({ type: 'CANCEL_GROWSPACES' });
      return;
    }
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
  set editName(v: string) {
    this._t({ type: 'UPDATE_EDIT_DRAFT', partial: { name: v } });
  }

  get editRows(): number {
    const sub = this._sm.tabs.growspaces.sub;
    return sub.kind === 'editing' ? sub.rows : 0;
  }
  set editRows(v: number) {
    this._t({ type: 'UPDATE_EDIT_DRAFT', partial: { rows: v } });
  }

  get editPlantsPerRow(): number {
    const sub = this._sm.tabs.growspaces.sub;
    return sub.kind === 'editing' ? sub.plantsPerRow : 0;
  }
  set editPlantsPerRow(v: number) {
    this._t({ type: 'UPDATE_EDIT_DRAFT', partial: { plantsPerRow: v } });
  }

  get editNotificationService(): string {
    const sub = this._sm.tabs.growspaces.sub;
    return sub.kind === 'editing' ? sub.notificationService : '';
  }
  set editNotificationService(v: string) {
    this._t({ type: 'UPDATE_EDIT_DRAFT', partial: { notificationService: v } });
  }

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
  get _showGroupDialog() {
    return this._sm.tabs.heatmap.sub.kind === 'editing-group';
  }
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
  get _showSubareaConfigDialog() {
    return this._sm.tabs.subareas.sub.kind === 'editing-subarea';
  }
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

  get _showAddSubarea() {
    return this._sm.tabs.subareas.sub.kind === 'adding';
  }
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
  get _showTankForm() {
    return this._sm.tabs.tanks.sub.kind !== 'idle';
  }
  get _editingTankIndex(): number | null {
    const sub = this._sm.tabs.tanks.sub;
    return sub.kind === 'editing' ? sub.index : null;
  }
  get _tankDraft() {
    const sub = this._sm.tabs.tanks.sub;
    if (sub.kind === 'adding' || sub.kind === 'editing') {
      return {
        sensorEntity: sub.sensorEntity,
        name: sub.name,
        volumeLiters: sub.volumeLiters,
        warningLevel: sub.warningLevel,
      };
    }
    return { sensorEntity: '', name: '', volumeLiters: null, warningLevel: 30 };
  }
  set _tankDraft(v: {
    sensorEntity: string;
    name: string;
    volumeLiters: number | null;
    warningLevel: number;
  }) {
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

      /* Matches the feed-and-water discard pattern on the configuration glass sheet. */
      .confirm-discard-overlay {
        position: absolute;
        inset: 0;
        z-index: 20;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
        box-sizing: border-box;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(4px);
      }

      .confirm-discard-box {
        width: min(100%, 360px);
        padding: 24px;
        box-sizing: border-box;
        border-radius: 16px;
        background: var(--card-background-color, #1e1e1e);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.37);
      }

      .confirm-discard-box h3 {
        margin: 0 0 8px;
        font-size: 1rem;
        font-weight: 500;
      }

      .confirm-discard-box p {
        margin: 0 0 20px;
        color: var(--secondary-text-color, rgba(255, 255, 255, 0.7));
        font-size: 0.875rem;
        line-height: 1.5;
      }

      .confirm-discard-actions {
        display: flex;
        justify-content: flex-end;
        flex-wrap: wrap;
        gap: 8px;
      }

      .save-gate-message {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 4px;
        padding: 12px 24px 0;
        border-top: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
        background: var(--secondary-background-color, rgba(0, 0, 0, 0.2));
        color: var(--secondary-text-color, rgba(255, 255, 255, 0.7));
        font-size: 0.875rem;
        line-height: 1.4;
        flex-wrap: wrap;
      }

      .save-gate-message + .button-group {
        border-top: 0;
        padding-top: 8px;
      }

      .save-gate-message .md3-button {
        flex: 0 0 auto;
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
        .save-gate-message {
          justify-content: flex-start;
          padding-inline: 16px;
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

  protected willUpdate(_changedProperties: Map<string, unknown>) {
    // Seed once per open from the single device→draft seam. Wait until the target
    // device is available, then never re-seed: background refreshes must not
    // clobber in-progress edits.
    if (this._initialStateApplied || !this.open) return;
    const device = this.growspaceId
      ? this.devices.find((candidate) => candidate.deviceId === this.growspaceId)
      : undefined;
    if (this.growspaceId && !device) return;
    if (device) this._seedFromDevice(device);
    this._initialStateApplied = true;
  }

  protected updated(changedProperties: Map<string, unknown>) {
    super.updated(changedProperties);
    if (changedProperties.has('open') && !this.open) {
      this._initialStateApplied = false;
    }
  }

  private _seedFromDevice(device?: GrowspaceDevice) {
    this._sm = {
      ...createInitialSM(device),
      activeTab: this.initialTab as ConfigTabId,
    };
    if (device) this._populateEditFields(device.deviceId);
    if (this.initialTab === ConfigTab.SUBAREAS) this._loadSubareas();
  }

  private _deviceForDirtyCheck(): GrowspaceDevice | undefined {
    const growspaceSub = this._sm.tabs.growspaces.sub;
    const editingId = growspaceSub.kind === 'editing' ? growspaceSub.growspaceId : '';
    if (this._sm.activeTab === ConfigTab.GROWSPACES) {
      const growspaceId = editingId || this.growspaceId;
      return this.devices.find((device) => device.deviceId === growspaceId) ?? this.devices[0];
    }
    const id = editingId || this._sm.environmentDraft.selectedGrowspaceId || this.growspaceId;
    return this.devices.find((device) => device.deviceId === id);
  }

  private _close = () => {
    const { heatmap, subareas } = this._sm.tabs;
    if (heatmap.sub.kind === 'editing-group' || subareas.sub.kind === 'editing-subarea') return;
    const device = this._deviceForDirtyCheck();
    if (device && isActiveTabDirty(this._sm, device)) {
      this._t({ type: 'REQUEST_CLOSE' });
      return;
    }
    this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
  };

  private _onKeydown = (event: KeyboardEvent): void => {
    if (!this.open || event.key !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
    this._close();
  };

  private _switchTab(tab: ConfigTab) {
    const device = this._deviceForDirtyCheck();
    this._sm = device
      ? requestTabSwitch(this._sm, tab as ConfigTabId, device)
      : transition(this._sm, { type: 'SWITCH_TAB', tab: tab as ConfigTabId });
    if (this._sm.activeTab === tab && tab === ConfigTab.SUBAREAS) {
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
    this.dispatchEvent(
      new CustomEvent('configure-environment-submit', {
        detail: composeEnvironmentConfig(this._sm.environmentDraft),
        bubbles: true,
        composed: true,
      })
    );
  }

  private _startAddTimedNotification() {
    this._t({ type: 'START_ADD_TIMED_NOTIFICATION' });
  }

  private _startEditTimedNotification(id: string, draft: TimedNotificationDraft) {
    this._t({ type: 'START_EDIT_TIMED_NOTIFICATION', id, draft });
  }

  private _requestDeleteTimedNotification(id: string) {
    this._t({ type: 'DELETE_TIMED_NOTIFICATION', id });
  }

  private _confirmDeleteTimedNotification() {
    this._t({ type: 'CONFIRM_DELETE' });
  }

  private _cancelTimedNotification() {
    this._t({ type: 'CANCEL_TIMED_NOTIFICATION' });
  }

  private _commitAddTimedNotification() {
    this._t({ type: 'ADD_TIMED_NOTIFICATION', id: randomId() });
  }

  private _commitEditTimedNotification() {
    this._t({ type: 'EDIT_TIMED_NOTIFICATION' });
  }

  private _submitNotifications() {
    const draft = this._sm.tabs.notifications.draft;
    // Backend consumers (calendar, notification_manager) read timed notifications
    // in snake_case, so convert the camelCase SM shape at this card→backend boundary.
    const timedNotifications = this._sm.tabs.notifications.timedNotifications.map((n) => ({
      id: n.id,
      message: n.message,
      // An unrecognised trigger is written back verbatim — saving an untouched
      // notification must not rewrite a trigger the card could not interpret.
      trigger_type: triggerRawValue(n.triggerType),
      day: n.day,
      growspace_ids: n.growspaceIds,
    }));
    this.dispatchEvent(
      new CustomEvent('save-notification-settings-submit', {
        detail: {
          notification_settings: {
            criticalCooldownMinutes: draft.criticalCooldownMinutes,
            warningCooldownMinutes: draft.warningCooldownMinutes,
            recoveryCooldownMinutes: draft.recoveryCooldownMinutes,
            escalationDelayMinutes: draft.escalationDelayMinutes,
            minStressDurationSeconds: draft.minStressDurationSeconds,
            warningPersistenceMinutes: draft.warningPersistenceMinutes,
          },
          ai_auto_alerts: draft.aiAutoAlerts,
          timed_notifications: timedNotifications,
        },
        bubbles: true,
        composed: true,
      })
    );
    this._t({ type: 'SAVE_NOTIFICATIONS' });
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
    const caps = this._caps;
    if (!caps.canSaveEnvironment) return;
    this._submitEditGrowspace();
    this._submitEnvironment();
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

  private _getEntities(domains: string[], deviceClass: string | null, platform?: string): string[] {
    if (!this.hass) return [];
    // hass.entities (the entity registry) is present at runtime but not declared
    // on custom-card-helpers' HomeAssistant type; read platform through a cast.
    const registry = (this.hass as unknown as { entities?: EntityRegistrySnapshot }).entities;
    const states = this.hass.states;
    if (states !== this._entityOptionsStates || registry !== this._entityOptionsRegistry) {
      this._entityOptionsStates = states;
      this._entityOptionsRegistry = registry;
      this._entityOptionsCache.clear();
    }

    const cacheKey = JSON.stringify([domains, deviceClass, platform]);
    const cached = this._entityOptionsCache.get(cacheKey);
    if (cached) return cached;

    const entities = Object.keys(states || {})
      .filter((eid) => {
        const state = states[eid];
        if (!state) return false;
        const domain = eid.split('.')[0];
        return (
          domains.includes(domain) &&
          (!deviceClass || state.attributes.device_class === deviceClass) &&
          (!platform || registry?.[eid]?.platform === platform)
        );
      })
      .sort();
    this._entityOptionsCache.set(cacheKey, entities);
    return entities;
  }

  /**
   * Automated Mode Conflict resolver for a bound AC Infinity mode entity. Returns
   * the conflict (device name + current mode) when the port sits in a self-running
   * mode, else null. The reactive read of `hass.states` here is what makes the
   * warning update live and re-appear on dialog reopen.
   */
  private _acInfinityConflict(modeEntity: string): AcInfinityConflict | null {
    if (!modeEntity || !this.hass) return null;
    const state = this.hass.states[modeEntity];
    if (!state || !isAutomatedMode(state.state)) return null;
    return { deviceName: this._deviceNameForEntity(modeEntity), mode: state.state };
  }

  /** Device-registry name for an entity, falling back to friendly name then id. */
  private _deviceNameForEntity(entityId: string): string {
    const hass = this.hass as unknown as {
      entities?: Record<string, { device_id?: string }>;
      devices?: Record<string, { name_by_user?: string; name?: string }>;
    };
    const deviceId = hass.entities?.[entityId]?.device_id;
    const device = deviceId ? hass.devices?.[deviceId] : undefined;
    const deviceName = device?.name_by_user || device?.name;
    if (deviceName) return deviceName;
    return this.hass.states[entityId]?.attributes?.friendly_name || entityId;
  }

  // ── Port Pre-fill (ADR-0028) ─────────────────────────────────────────────

  /**
   * Roles the last device pick failed to resolve, keyed `${field}:${index}`.
   * Ephemeral UI state — never part of the env draft (no seeder). A pick sets
   * one key; any manual write to that field clears the whole field's keys.
   */
  @state() private _acInfinityPrefillWarnings: Record<string, string[]> = {};

  /** The frontend entity registry (`hass.entities`), untyped on the hass type. */
  private get _entityRegistry(): EntityRegistrySnapshot {
    return (this.hass as unknown as { entities?: EntityRegistrySnapshot }).entities ?? {};
  }

  /** Device-registry name for a device id (`name_by_user || name`), falling back to the id. */
  private _deviceNameById(deviceId: string): string {
    const devices = (
      this.hass as unknown as {
        devices?: Record<string, { name_by_user?: string; name?: string }>;
      }
    ).devices;
    const device = devices?.[deviceId];
    return device?.name_by_user || device?.name || deviceId;
  }

  private _acInfinityPortDevices(): PortDeviceOption[] {
    if (!this.hass) return [];
    return listAcInfinityPortDevices(this._entityRegistry, (id) => this._deviceNameById(id));
  }

  private _acInfinityPortDeviceId(modeEntity: string): string {
    if (!this.hass) return '';
    return deviceIdForModeEntity(this._entityRegistry, modeEntity);
  }

  /**
   * Apply a Port Pre-fill pick to one actuator bundle: resolve the picked device
   * to its member entities, overwrite the port's role fields (clearing unresolved
   * ones), persist through the normal env-draft path, and record the inline
   * warning naming what wasn't found.
   */
  private _pickAcInfinityPort(field: string, index: number, deviceId: string): void {
    // The picker's blank "Select…" option is not a device — never let a stray
    // click through it wipe a configured bundle.
    if (!deviceId) return;
    const current = (this._sm.environmentDraft as unknown as Record<string, unknown[]>)[field];
    if (!current?.[index]) return;
    const roles = resolveAcInfinityPort(this._entityRegistry, deviceId);
    // The grow-light bundle fills all six roles; the actuator bundles fill two.
    const { device, missing } =
      field === 'growlightAcInfinityDevices'
        ? fillAcInfinityGrowLightPort(current[index] as AcInfinityGrowLight, roles)
        : fillAcInfinityActuatorPort(current[index] as AcInfinityDevice, roles);
    const next = current.map((d, i) => (i === index ? device : d));
    // _setEnv clears this field's warnings; re-set only the picked port's.
    this._setEnv({ [field]: next } as Partial<EnvironmentDraft>);
    this._acInfinityPrefillWarnings = {
      ...this._acInfinityPrefillWarnings,
      [`${field}:${index}`]: missing,
    };
  }

  /** The warning map with every key for `field` dropped (a manual write invalidates them). */
  private _clearedPrefillWarnings(field: string): Record<string, string[]> {
    const prefix = `${field}:`;
    return Object.fromEntries(
      Object.entries(this._acInfinityPrefillWarnings).filter(([k]) => !k.startsWith(prefix))
    );
  }

  // ── Threshold helpers ────────────────────────────────────────────────────

  private _updateThreshold(stage: string, cycle: string, point: 'on' | 'off', value: number) {
    if (isNaN(value)) return;
    const t = JSON.parse(JSON.stringify(this._sm.environmentDraft.dehumidifierThresholds || {}));
    if (!t[stage]) t[stage] = {};
    if (!t[stage][cycle]) t[stage][cycle] = { on: 0, off: 0 };
    t[stage][cycle][point] = value;
    this._t({ type: 'UPDATE_ENV_DRAFT', partial: { dehumidifierThresholds: t } });
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
    const updated =
      index >= 0 ? groups.map((g, i) => (i === index ? group : g)) : [...groups, group];
    this._t({ type: 'UPDATE_ENV_DRAFT', partial: { sensorGroups: updated } });
    this._t({ type: 'CLOSE_GROUP_DIALOG' });
  }

  // ── Subarea methods ──────────────────────────────────────────────────────

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
    const currentDevice = this._deviceForDirtyCheck();
    if (currentDevice && isActiveTabDirty(this._sm, currentDevice)) {
      this._t({ type: 'REQUEST_GROWSPACE_CHANGE', growspaceId });
      return;
    }
    this._applyEnvGrowspaceChange(growspaceId);
  }

  private _applyEnvGrowspaceChange(growspaceId: string) {
    const device = this.devices.find((d) => d.deviceId === growspaceId);
    if (device) {
      this._t({ type: 'RESET_FROM_DEVICE', device });
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
          soilMoistureMin: null,
          soilMoistureMax: null,
          dehumidifierThresholds: {},
          humidifierThresholds: {},
          humidifierControlEnabled: false,
          dehumidifierControlEnabled: false,
          visionEnabled: false,
          visionEarlyOffset: 60,
          visionMidHours: 6,
          visionLateOffset: 60,
          cameraEntities: [],
          lungroomTempSensors: [],
          substrateTemperatureSensors: [],
          phSensors: [],
          feedEcSensors: [],
          bulkEcSensors: [],
          poreEcSensors: [],
          runoffEcSensors: [],
          drainVolumeSensors: [],
          irrigationFlowSensors: [],
          powerSensors: [],
          energySensors: [],
          irrigationTanks: [],
          vpdOptimalOverrides: {},
        },
      });
      this._t({ type: 'CANCEL_TANK' });
    }
  }

  private _cancelDiscard = (): void => {
    this._t({ type: 'CANCEL_TAB_SWITCH' });
  };

  private _confirmDiscard = (): void => {
    const { status } = this._sm;
    if (status.kind !== 'confirm-discard') return;

    if ('pendingTab' in status) {
      const device = this._deviceForDirtyCheck();
      if (!device) return;
      const pendingTab = status.pendingTab;
      this._sm = discardAndSwitch(this._sm, device);
      if (pendingTab === ConfigTab.SUBAREAS) this._loadSubareas();
      return;
    }

    if (status.pendingAction === 'change-growspace') {
      this._sm = { ...this._sm, status: { kind: 'idle' } };
      this._applyEnvGrowspaceChange(status.growspaceId);
      return;
    }

    this._sm = { ...this._sm, status: { kind: 'idle' } };
    this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
  };

  private _renderConfirmDiscard() {
    return html`
      <div class="confirm-discard-overlay">
        <div
          class="confirm-discard-box"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="config-discard-title"
          aria-describedby="config-discard-description"
        >
          <h3 id="config-discard-title">Discard changes?</h3>
          <p id="config-discard-description">
            You have unsaved changes. If you continue now, your edits will be lost.
          </p>
          <div class="confirm-discard-actions">
            <button class="md3-button tonal" @click=${this._cancelDiscard}>Keep editing</button>
            <button class="md3-button primary error" @click=${this._confirmDiscard}>Discard</button>
          </div>
        </div>
      </div>
    `;
  }

  // ── Section renderers ────────────────────────────────────────────────────

  private _renderNotificationsTab() {
    return html`
      <config-notifications-tab
        .vm=${createNotificationsTabViewModel(this._sm, this.growspaceOptions)}
        @notif-draft-changed=${(e: CustomEvent) =>
          this._t({ type: 'UPDATE_NOTIFICATIONS_DRAFT', partial: e.detail.partial })}
        @add-timed-requested=${this._startAddTimedNotification}
        @edit-timed-requested=${(e: CustomEvent) =>
          this._startEditTimedNotification(e.detail.id, e.detail.draft)}
        @timed-draft-changed=${(e: CustomEvent) =>
          this._t({ type: 'UPDATE_TIMED_DRAFT', partial: e.detail.partial })}
        @cancel-timed=${this._cancelTimedNotification}
        @commit-add-timed=${this._commitAddTimedNotification}
        @commit-edit-timed=${this._commitEditTimedNotification}
        @request-delete-timed=${(e: CustomEvent) =>
          this._requestDeleteTimedNotification(e.detail.id)}
        @confirm-delete-timed=${this._confirmDeleteTimedNotification}
      ></config-notifications-tab>
    `;
  }

  private _renderGrowspacesTab() {
    const deps = {
      growspaceOptions: this.growspaceOptions,
      notifyServices: this._getMobileAppNotifyServices(),
      entityOptions: (domains: string[], deviceClass: string | null, platform?: string) =>
        this._getEntities(domains, deviceClass, platform),
    };
    return html`
      <config-growspaces-tab
        .vm=${createGrowspacesTabViewModel(this._sm, deps)}
        @select-growspace=${(e: CustomEvent) => this._handleEditSelection(e.detail.id)}
        @start-add-growspace=${this._startAddGrowspace}
        @add-draft-changed=${(e: CustomEvent) =>
          this._t({ type: 'UPDATE_ADD_DRAFT', partial: e.detail.partial })}
        @edit-draft-changed=${(e: CustomEvent) =>
          this._t({ type: 'UPDATE_EDIT_DRAFT', partial: e.detail.partial })}
        @env-draft-changed=${(e: CustomEvent) => this._setEnv(e.detail.partial)}
      ></config-growspaces-tab>
    `;
  }

  private _renderSensorsTab() {
    const deps = {
      entityOptions: (domains: string[], deviceClass: string | null, platform?: string) =>
        this._getEntities(domains, deviceClass, platform),
      averageSensorValue: (ids: string[]) => this._averageSensorValue(ids),
      sensorReading: (entityId: string) => this._sensorReading(entityId),
    };
    return html`
      <config-sensors-tab
        .vm=${createSensorsTabViewModel(this._sm, deps)}
        @env-draft-changed=${(e: CustomEvent) => this._setEnv(e.detail.partial)}
      ></config-sensors-tab>
    `;
  }

  /**
   * Current state + unit for one entity. The unit is what tells the Moisture
   * Band whether this sensor can be read as a percentage at all; an absent
   * unit is the legacy case and stays supported.
   */
  private _sensorReading(entityId: string): { value: string | null; unit: string | null } | null {
    const state = this.hass?.states?.[entityId];
    if (!state) return null;
    return {
      value: state.state ?? null,
      unit: (state.attributes?.unit_of_measurement as string | undefined) ?? null,
    };
  }

  private _averageSensorValue(entityIds: string[]): number | null {
    if (!entityIds.length || !this.hass) return null;
    let sum = 0;
    let count = 0;
    for (const id of entityIds) {
      const state = this.hass.states[id];
      if (!state || state.state === 'unavailable' || state.state === 'unknown') continue;
      const val = parseFloat(state.state);
      if (!Number.isFinite(val)) continue;
      sum += val;
      count++;
    }
    return count > 0 ? sum / count : null;
  }

  @state() private _fanTempOverrideExpanded = false;
  @state() private _exhaustCriticalTempExpanded = false;

  // Fan/exhaust edits forward a partial; merge against the live draft so
  // synchronous multi-field edits accumulate (the component never reads the SM).
  private _updateFanConfig(
    partial: Partial<import('../slices/growspace/schema').CirculationFanConfig>
  ) {
    this._t({
      type: 'UPDATE_ENV_DRAFT',
      partial: {
        circulationFanConfig: { ...this._sm.environmentDraft.circulationFanConfig, ...partial },
      },
    });
  }

  private _updateExhaustFanConfig(
    partial: Partial<import('../slices/growspace/schema').ExhaustFanConfig>
  ) {
    this._t({
      type: 'UPDATE_ENV_DRAFT',
      partial: {
        exhaustFanConfig: { ...this._sm.environmentDraft.exhaustFanConfig, ...partial },
      },
    });
  }

  private _renderClimateTab() {
    const deps = {
      entityOptions: (domains: string[], deviceClass: string | null, platform?: string) =>
        this._getEntities(domains, deviceClass, platform),
      acInfinityConflict: (modeEntity: string) => this._acInfinityConflict(modeEntity),
      acInfinityPortDevices: () => this._acInfinityPortDevices(),
      acInfinityPortDeviceId: (modeEntity: string) => this._acInfinityPortDeviceId(modeEntity),
      acInfinityPrefillWarning: (field: string, index: number) =>
        this._acInfinityPrefillWarnings[`${field}:${index}`] ?? [],
    };
    return html`
      <config-climate-tab
        .vm=${createClimateTabViewModel(this._sm, deps, {
          fanTempOverrideExpanded: this._fanTempOverrideExpanded,
          exhaustCriticalTempExpanded: this._exhaustCriticalTempExpanded,
        })}
        @env-draft-changed=${(e: CustomEvent) => this._setEnv(e.detail.partial)}
        @pick-ac-infinity-device=${(e: CustomEvent) =>
          this._pickAcInfinityPort(e.detail.field, e.detail.index, e.detail.deviceId)}
        @fan-config-changed=${(e: CustomEvent) => this._updateFanConfig(e.detail.partial)}
        @exhaust-config-changed=${(e: CustomEvent) =>
          this._updateExhaustFanConfig(e.detail.partial)}
        @toggle-fan-temp-override=${() => {
          this._fanTempOverrideExpanded = !this._fanTempOverrideExpanded;
        }}
        @toggle-exhaust-critical-temp=${() => {
          this._exhaustCriticalTempExpanded = !this._exhaustCriticalTempExpanded;
        }}
        @remove-environment-requested=${this._handleRemoveEnvironment}
      ></config-climate-tab>
    `;
  }

  private _renderGrowlightTab() {
    const growspaceId = this._sm.environmentDraft.selectedGrowspaceId;
    const deps = {
      entityOptions: (domains: string[], deviceClass: string | null, platform?: string) =>
        this._getEntities(domains, deviceClass, platform),
      lightsOnTime: growspaceId
        ? (irrigationStrategies$.get().get(growspaceId)?.lightsOnTime ?? null)
        : null,
      acInfinityPortDevices: () => this._acInfinityPortDevices(),
      acInfinityPortDeviceId: (modeEntity: string) => this._acInfinityPortDeviceId(modeEntity),
      acInfinityPrefillWarning: (field: string, index: number) =>
        this._acInfinityPrefillWarnings[`${field}:${index}`] ?? [],
    };
    return html`
      <config-growlight-tab
        .vm=${createGrowlightTabViewModel(this._sm, deps)}
        .scrollToField=${this.scrollToField}
        @env-draft-changed=${(e: CustomEvent) => this._setEnv(e.detail.partial)}
        @lights-on-changed=${(e: CustomEvent) => this._onLightsOnChanged(e.detail.lightsOnTime)}
        @pick-ac-infinity-device=${(e: CustomEvent) =>
          this._pickAcInfinityPort(e.detail.field, e.detail.index, e.detail.deviceId)}
      ></config-growlight-tab>
    `;
  }

  /**
   * Lights-on is an `IrrigationStrategy` field (ADR-0026): persist it immediately
   * via the strategy path, not the buffered env-draft Save. Partial merge, so only
   * `lights_on_time` is sent.
   */
  private _onLightsOnChanged(lightsOnTime: string) {
    const growspaceId = this._sm.environmentDraft.selectedGrowspaceId;
    if (!growspaceId) return;
    void updateIrrigationStrategy(growspaceId, { lightsOnTime });
  }

  private _renderHumidityTab() {
    const deps = {
      entityOptions: (domains: string[], deviceClass: string | null, platform?: string) =>
        this._getEntities(domains, deviceClass, platform),
      acInfinityConflict: (modeEntity: string) => this._acInfinityConflict(modeEntity),
      acInfinityPortDevices: () => this._acInfinityPortDevices(),
      acInfinityPortDeviceId: (modeEntity: string) => this._acInfinityPortDeviceId(modeEntity),
      acInfinityPrefillWarning: (field: string, index: number) =>
        this._acInfinityPrefillWarnings[`${field}:${index}`] ?? [],
    };
    return html`
      <config-humidity-tab
        .vm=${createHumidityTabViewModel(this._sm, deps, {
          openStageId: this._openHumidityStageId,
        })}
        @env-draft-changed=${(e: CustomEvent) => this._setEnv(e.detail.partial)}
        @pick-ac-infinity-device=${(e: CustomEvent) =>
          this._pickAcInfinityPort(e.detail.field, e.detail.index, e.detail.deviceId)}
        @set-humidifier-control=${(e: CustomEvent) => this._setHumidifierControl(e.detail.enabled)}
        @set-dehumidifier-control=${(e: CustomEvent) =>
          this._setDehumidifierControl(e.detail.enabled)}
        @toggle-stage=${(e: CustomEvent) => {
          this._openHumidityStageId =
            this._openHumidityStageId === e.detail.stageId ? '' : e.detail.stageId;
        }}
        @update-dehum-threshold=${(e: CustomEvent) =>
          this._updateThreshold(e.detail.stage, e.detail.cycle, e.detail.point, e.detail.value)}
        @update-hum-threshold=${(e: CustomEvent) =>
          this._updateHumidifierThreshold(
            e.detail.stage,
            e.detail.cycle,
            e.detail.point,
            e.detail.value
          )}
      ></config-humidity-tab>
    `;
  }

  private _setHumidifierControl(enabled: boolean) {
    this._setEnv({ humidifierControlEnabled: enabled });
    setHumidifierControl(this._sm.environmentDraft.selectedGrowspaceId, enabled).catch(
      (err: unknown) => console.error('[setHumidifierControl failed]', err)
    );
  }

  private _setDehumidifierControl(enabled: boolean) {
    this._setEnv({ dehumidifierControlEnabled: enabled });
    setDehumidifierControl(this._sm.environmentDraft.selectedGrowspaceId, enabled).catch(
      (err: unknown) => console.error('[setDehumidifierControl failed]', err)
    );
  }

  private _renderIrrigationTab() {
    const deps = {
      entityOptions: (domains: string[], deviceClass: string | null, platform?: string) =>
        this._getEntities(domains, deviceClass, platform),
    };
    return html`
      <config-irrigation-tab
        .vm=${createIrrigationTabViewModel(this._sm, deps)}
        @env-draft-changed=${(e: CustomEvent) => this._setEnv(e.detail.partial)}
      ></config-irrigation-tab>
    `;
  }

  private _renderTanksTab() {
    const deps = {
      entityOptions: (domains: string[], deviceClass: string | null, platform?: string) =>
        this._getEntities(domains, deviceClass, platform),
    };
    return html`
      <config-tanks-tab
        .vm=${createTanksTabViewModel(this._sm, deps)}
        @add-tank-requested=${this._openAddTank}
        @edit-tank-requested=${(e: CustomEvent) => this._editTank(e.detail.index)}
        @delete-tank-requested=${(e: CustomEvent) => this._deleteTank(e.detail.index)}
        @tank-draft-changed=${(e: CustomEvent) =>
          this._t({ type: 'UPDATE_TANK_DRAFT', partial: e.detail.partial })}
        @cancel-tank=${this._cancelTank}
        @save-tank-requested=${this._saveTank}
      ></config-tanks-tab>
    `;
  }

  private _renderVisionTab() {
    const deps = {
      entityOptions: (domains: string[], deviceClass: string | null, platform?: string) =>
        this._getEntities(domains, deviceClass, platform),
    };
    return html`
      <config-vision-tab
        .vm=${createVisionTabViewModel(this._sm, deps)}
        @env-draft-changed=${(e: CustomEvent) => this._setEnv(e.detail.partial)}
      ></config-vision-tab>
    `;
  }

  private _renderHeatmapTab() {
    return html`
      <config-heatmap-tab
        .vm=${createHeatmapTabViewModel(this._sm)}
        @add-group-requested=${this._openAddGroup}
        @edit-group-requested=${(e: CustomEvent) => this._editGroup(e.detail.group)}
        @delete-group-requested=${(e: CustomEvent) => this._deleteGroup(e.detail.id)}
      ></config-heatmap-tab>
    `;
  }

  private _renderSubareasTab() {
    return html`
      <config-subareas-tab
        .vm=${createSubareasTabViewModel(this._sm, {
          subareas: this._subareas,
          loading: this._subareasLoading,
        })}
        @add-subarea-requested=${() => this._t({ type: 'BEGIN_ADD_SUBAREA' })}
        @subarea-name-changed=${(e: CustomEvent) =>
          this._t({ type: 'UPDATE_SUBAREA_NAME', name: e.detail.name })}
        @commit-add-subarea=${() => this._handleAddSubarea()}
        @cancel-add-subarea=${() => this._t({ type: 'CANCEL_SUBAREA' })}
        @edit-subarea-requested=${(e: CustomEvent) => this._handleEditSubarea(e.detail.subarea)}
        @delete-subarea-requested=${(e: CustomEvent) => this._handleDeleteSubarea(e.detail.id)}
        @confirm-delete-subarea=${(e: CustomEvent) => this._confirmDeleteSubarea(e.detail.id)}
        @cancel-delete-subarea=${() => this._t({ type: 'CANCEL_DELETE_SUBAREA' })}
      ></config-subareas-tab>
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

  private _updateVpdOptimal(
    key: FanVpdStageKey,
    period: 'day' | 'night',
    slot: 'low' | 'high',
    raw: string
  ) {
    const overrides = this._sm.environmentDraft.vpdOptimalOverrides as VpdOptimalOverrides;
    const parsed = parseFloat(raw);
    const value = isNaN(parsed) ? VPD_OPTIMAL_STAGE_DEFAULTS[key][period][slot] : parsed;
    const existingStage = overrides[key] ?? { ...VPD_OPTIMAL_STAGE_DEFAULTS[key] };
    const existingPeriod = overrides[key]?.[period] ?? {
      ...VPD_OPTIMAL_STAGE_DEFAULTS[key][period],
    };
    const updated: VpdOptimalOverrides = {
      ...overrides,
      [key]: {
        ...existingStage,
        [period]: { ...existingPeriod, [slot]: value },
      },
    };
    this._t({ type: 'UPDATE_ENV_DRAFT', partial: { vpdOptimalOverrides: updated } });
  }

  private _resetVpdOptimal() {
    this._t({ type: 'UPDATE_ENV_DRAFT', partial: { vpdOptimalOverrides: {} } });
  }

  private _renderVpdTargetsTab() {
    return html`
      <config-vpd-targets-tab
        .vm=${createVpdTargetsTabViewModel(this._sm, { openStageId: this._openVpdStageId })}
        @toggle-stage=${(e: CustomEvent) => {
          this._openVpdStageId = this._openVpdStageId === e.detail.key ? '' : e.detail.key;
        }}
        @update-vpd-optimal=${(e: CustomEvent) =>
          this._updateVpdOptimal(e.detail.key, e.detail.period, e.detail.slot, e.detail.value)}
        @reset-vpd-optimal=${this._resetVpdOptimal}
      ></config-vpd-targets-tab>
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

    const showContextBar =
      this.currentTab !== ConfigTab.GROWSPACES && this.currentTab !== ConfigTab.NOTIFICATIONS;
    const showRail = !this.allowedTabs || this.allowedTabs.length !== 1;
    const growspaceSub = this._sm.tabs.growspaces.sub;
    const caps = this._caps;
    const environmentSaveVisible = ENVIRONMENT_SAVE_TABS.has(this.currentTab);
    const combinedSaveVisible =
      this.currentTab === ConfigTab.GROWSPACES && growspaceSub.kind === 'editing';
    const showEnvironmentSaveGate =
      !caps.canSaveEnvironment && (environmentSaveVisible || combinedSaveVisible);

    return html`
      <!-- Scrim dismissal stays disabled so an incidental backdrop tap cannot destroy a mobile form. -->
      <ha-dialog
        open
        @closed=${this._close}
        without-header
        scrimClickAction=""
        escapeKeyAction=""
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
                    ${this._navItem(ConfigTab.NOTIFICATIONS, mdiBell, 'Notifications')}

                    <div class="cfg-rail-caps">Environment</div>
                    ${this._navItem(ConfigTab.SENSORS, mdiThermometer, 'Sensors')}
                    ${this._navItem(ConfigTab.CLIMATE, mdiFan, 'Climate')}
                    ${this._navItem(ConfigTab.GROWLIGHT, mdiWhiteBalanceSunny, 'Growlights')}
                    ${this._navItem(ConfigTab.HUMIDITY, mdiWaterPercent, 'Humidity')}

                    <div class="cfg-rail-caps">Equipment</div>
                    ${this._navItem(ConfigTab.IRRIGATION, mdiGauge, 'Irrigation')}
                    ${this._navItem(ConfigTab.TANKS, mdiWater, 'Tanks')}

                    <div class="cfg-rail-caps">Advanced</div>
                    ${this._navItem(ConfigTab.VISION, mdiCamera, 'Vision AI')}
                    ${this._navItem(ConfigTab.HEATMAP, mdiViewGrid, '3D Heatmap')}
                    ${this._navItem(ConfigTab.SUBAREAS, mdiViewDashboard, 'Subareas')}
                    ${this._navItem(ConfigTab.VPD_TARGETS, mdiTune, 'VPD Targets')}
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
                            <option
                              value="${id}"
                              ?selected=${id === this._sm.environmentDraft.selectedGrowspaceId}
                            >
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
                ${this.currentTab === ConfigTab.GROWSPACES ? this._renderGrowspacesTab() : nothing}
                ${this.currentTab === ConfigTab.NOTIFICATIONS
                  ? this._renderNotificationsTab()
                  : nothing}
                ${this.currentTab === ConfigTab.SENSORS ? this._renderSensorsTab() : nothing}
                ${this.currentTab === ConfigTab.CLIMATE ? this._renderClimateTab() : nothing}
                ${this.currentTab === ConfigTab.GROWLIGHT ? this._renderGrowlightTab() : nothing}
                ${this.currentTab === ConfigTab.HUMIDITY ? this._renderHumidityTab() : nothing}
                ${this.currentTab === ConfigTab.IRRIGATION ? this._renderIrrigationTab() : nothing}
                ${this.currentTab === ConfigTab.TANKS ? this._renderTanksTab() : nothing}
                ${this.currentTab === ConfigTab.VISION ? this._renderVisionTab() : nothing}
                ${this.currentTab === ConfigTab.HEATMAP ? this._renderHeatmapTab() : nothing}
                ${this.currentTab === ConfigTab.SUBAREAS ? this._renderSubareasTab() : nothing}
                ${this.currentTab === ConfigTab.VPD_TARGETS ? this._renderVpdTargetsTab() : nothing}
              </div>
            </div>
          </div>

          ${showEnvironmentSaveGate && caps.environmentSaveBlockReason
            ? html`
                <div
                  id="environment-save-requirement"
                  class="save-gate-message"
                  role="status"
                  aria-live="polite"
                >
                  <span
                    >${this._environmentSaveBlockedMessage(caps.environmentSaveBlockReason)} ·</span
                  >
                  <button class="md3-button text" type="button" @click=${this._goToSensors}>
                    ${this._localize('config.go_to_sensors')}
                  </button>
                </div>
              `
            : nothing}

          <!-- Footer -->
          <div class="button-group">
            <button class="md3-button tonal" @click=${this._close}>Cancel</button>

            ${(() => {
              if (this.currentTab !== ConfigTab.GROWSPACES) return nothing;
              if (growspaceSub.kind === 'confirm-delete') {
                return html`
                  <button class="md3-button tonal" @click=${this._cancelDeleteGrowspace}>
                    No, Keep It
                  </button>
                  <button class="md3-button primary error" @click=${this._confirmDeleteGrowspace}>
                    Confirm Delete
                  </button>
                `;
              }
              if (growspaceSub.kind === 'adding') {
                return html`
                  <button class="md3-button primary" @click=${this._submitAddGrowspace}>
                    Add Growspace
                  </button>
                `;
              }
              if (growspaceSub.kind === 'editing') {
                return html`
                  <button class="md3-button tonal error" @click=${this._submitDeleteGrowspace}>
                    ${this._icon(mdiDelete, 18)} Delete
                  </button>
                  <button
                    class="md3-button primary"
                    @click=${this._submitGrowspaceAndEnv}
                    ?disabled=${!caps.canSaveEnvironment}
                    aria-describedby=${!caps.canSaveEnvironment
                      ? 'environment-save-requirement'
                      : nothing}
                  >
                    ${this._localize('config.save_growspace_and_environment')}
                  </button>
                `;
              }
              return nothing;
            })()}
            ${environmentSaveVisible
              ? html`
                  <button
                    class="md3-button primary"
                    @click=${this._submitEnvironment}
                    ?disabled=${!caps.canSaveEnvironment}
                    aria-describedby=${!caps.canSaveEnvironment
                      ? 'environment-save-requirement'
                      : nothing}
                  >
                    ${this._localize('config.save_environment')}
                  </button>
                `
              : nothing}
            ${this.currentTab === ConfigTab.NOTIFICATIONS
              ? html`
                  <button class="md3-button primary" @click=${this._submitNotifications}>
                    Save Notifications
                  </button>
                `
              : nothing}
            ${this.currentTab === ConfigTab.VISION
              ? html`
                  <button class="md3-button primary" @click=${this._submitVisionCheckupConfig}>
                    ${this._localize('config.save_vision_settings')}
                  </button>
                `
              : nothing}
          </div>
          ${this._sm.status.kind === 'confirm-discard' ? this._renderConfirmDiscard() : nothing}
        </div>
      </ha-dialog>
    `;
  }
}
