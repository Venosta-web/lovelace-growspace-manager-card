/** Shared Environment Draft lifecycle: complete values, write intent, and divergence. */
import type { GrowspaceDevice, SensorGroup } from '../../types';
import { bandSavePayload } from './moisture-band';
import type { LightLeakConfig } from '../../slices/subarea/schema';
import type {
  AcInfinityDevice,
  AcInfinityGrowLight,
  CirculationFanConfig,
  ExhaustFanConfig,
  GrowLightConfig,
} from '../../slices/growspace/schema';

export interface EnvironmentDraft {
  selectedGrowspaceId: string;

  // Air sensors
  temperatureSensors: string[];
  humiditySensors: string[];
  vpdSensors: string[];
  co2Sensor: string;
  lightSensors: string[];

  // Climate devices
  exhaustFanEntities: string[];
  circulationFanEntities: string[];
  exhaustFanAcInfinityDevices: AcInfinityDevice[];
  circulationFanAcInfinityDevices: AcInfinityDevice[];
  stressThreshold: number | null;
  moldThreshold: number | null;

  // Humidity devices
  humidifierEntities: string[];
  dehumidifierEntities: string[];
  humidifierAcInfinityDevices: AcInfinityDevice[];
  dehumidifierAcInfinityDevices: AcInfinityDevice[];
  humidifierThresholds: Record<string, Record<string, { on: number; off: number }>>;
  dehumidifierThresholds: Record<string, Record<string, { on: number; off: number }>>;
  humidifierControlEnabled: boolean;
  dehumidifierControlEnabled: boolean;

  // Substrate / irrigation monitoring sensors
  soilMoistureSensor: string;
  /**
   * Acceptable Moisture Band override. Both null means the growspace inherits
   * the default band — the form still *displays* 20–60%, but nothing is
   * stored, which is how "reset to defaults" survives until Save. Required
   * (not optional) so every draft seeder must fill them or fail to compile.
   */
  soilMoistureMin: number | null;
  soilMoistureMax: number | null;
  substrateTemperatureSensors: string[];
  phSensors: string[];
  feedEcSensors: string[];
  bulkEcSensors: string[];
  poreEcSensors: string[];
  runoffEcSensors: string[];
  drainVolumeSensors: string[];
  irrigationFlowSensors: string[];
  powerSensors: string[];
  energySensors: string[];

  // Heatmap / spatial
  sensorGroups: SensorGroup[];
  sensorCoordinates: Record<string, { x: number; y: number; z: number; rotation?: number }>;

  // Tanks
  irrigationTanks: Array<{
    sensorEntity: string;
    name: string;
    volumeLiters: number | null;
    warningLevel: number;
    /**
     * Every tank save restates the whole item, so a window this draft dropped
     * would reset to the backend default (GSM#790). `null` when not reported.
     */
    staleAfterMinutes?: number | null;
  }>;

  // Camera / lungroom
  cameraEntities: string[];
  lungroomTempSensors: string[];

  // Vision checkup
  visionEnabled: boolean;
  visionEarlyOffset: number;
  visionMidHours: number;
  visionLateOffset: number;

  // Fan controller
  circulationFanConfig: CirculationFanConfig;
  exhaustFanConfig: ExhaustFanConfig;

  // Grow light controller
  growlightEntities: string[];
  growlightAcInfinityDevices: AcInfinityGrowLight[];
  growlightConfig: GrowLightConfig;
  lightLeakConfig: LightLeakConfig;

  // VPD optimal overrides
  vpdOptimalOverrides: Record<
    string,
    { day: { low: number; high: number }; night: { low: number; high: number } }
  >;

  // LST offset for VPD calculation
  lstOffset: number;
}

function defaultEnvironmentDraft(): EnvironmentDraft {
  return {
    selectedGrowspaceId: '',
    temperatureSensors: [],
    humiditySensors: [],
    vpdSensors: [],
    co2Sensor: '',
    lightSensors: [],
    exhaustFanEntities: [],
    circulationFanEntities: [],
    exhaustFanAcInfinityDevices: [],
    circulationFanAcInfinityDevices: [],
    stressThreshold: null,
    moldThreshold: null,
    humidifierEntities: [],
    dehumidifierEntities: [],
    humidifierAcInfinityDevices: [],
    dehumidifierAcInfinityDevices: [],
    humidifierThresholds: {},
    dehumidifierThresholds: {},
    humidifierControlEnabled: false,
    dehumidifierControlEnabled: false,
    soilMoistureSensor: '',
    soilMoistureMin: null,
    soilMoistureMax: null,
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
    sensorGroups: [],
    sensorCoordinates: {},
    irrigationTanks: [],
    cameraEntities: [],
    lungroomTempSensors: [],
    visionEnabled: false,
    visionEarlyOffset: 60,
    visionMidHours: 6,
    visionLateOffset: 60,
    circulationFanConfig: {
      enabled: false,
      regulation_mode: 'vpd',
      min_speed: 0,
      max_speed: 100,
      vpd_target: 1.0,
      vpd_tolerance: 0.2,
      humidity_target: 60.0,
      humidity_tolerance: 5.0,
      temperature_target: 25.0,
      temperature_tolerance: 2.0,
      critical_temp_low: null,
      critical_temp_high: null,
      critical_temp_hysteresis: 1.0,
      wind_enabled: false,
      wind_period_seconds: 60,
      wind_amplitude_pct: 10,
      stage_vpd_enabled: false,
      stage_vpd_overrides: {},
    },
    exhaustFanConfig: {
      enabled: false,
      min_speed: 0,
      max_speed: 100,
      vpd_target: 1.0,
      vpd_tolerance: 0.2,
      humidity_target: 60.0,
      humidity_tolerance: 5.0,
      temperature_target: 25.0,
      temperature_tolerance: 2.0,
      critical_temp_low: null,
      critical_temp_high: null,
      critical_temp_hysteresis: 1.0,
      stage_vpd_enabled: false,
      stage_vpd_overrides: {},
    },
    growlightEntities: [],
    growlightAcInfinityDevices: [],
    growlightConfig: {
      enabled: false,
      power: 100,
      sunrise_enabled: false,
      sunrise_minutes: 0,
    },
    lightLeakConfig: {
      enabled: true,
      illuminance_sensor: null,
      threshold_lux: 1,
      debounce_seconds: 120,
      switch_off_lights: false,
      all_stages: false,
    },
    vpdOptimalOverrides: {},
    lstOffset: -2.0,
  };
}

/** Seed EnvironmentDraft from a GrowspaceDevice. */
function envDraftFromDevice(device: GrowspaceDevice): EnvironmentDraft {
  const attrs = device.environmentAttributes ?? {};
  const vc = attrs.visionCheckupConfig;
  return {
    selectedGrowspaceId: device.deviceId,
    temperatureSensors: attrs.temperatureSensors?.length
      ? attrs.temperatureSensors
      : attrs.temperatureSensor
        ? [attrs.temperatureSensor]
        : [],
    humiditySensors: attrs.humiditySensors?.length
      ? attrs.humiditySensors
      : attrs.humiditySensor
        ? [attrs.humiditySensor]
        : [],
    vpdSensors: attrs.vpdSensors?.length
      ? attrs.vpdSensors
      : attrs.vpdSensor
        ? [attrs.vpdSensor]
        : [],
    co2Sensor: attrs.co2Sensor ?? '',
    lightSensors: attrs.lightSensors?.length
      ? attrs.lightSensors
      : attrs.lightSensor
        ? [attrs.lightSensor]
        : [],
    exhaustFanEntities: attrs.exhaustFanEntities?.length
      ? attrs.exhaustFanEntities
      : attrs.exhaustEntity
        ? [attrs.exhaustEntity]
        : [],
    circulationFanEntities: attrs.circulationFanEntities?.length
      ? attrs.circulationFanEntities
      : attrs.circulationFanEntity
        ? [attrs.circulationFanEntity]
        : [],
    stressThreshold: attrs.stressThreshold ?? null,
    moldThreshold: attrs.moldThreshold ?? null,
    humidifierEntities: attrs.humidifierEntities?.length
      ? attrs.humidifierEntities
      : attrs.humidifierEntity
        ? [attrs.humidifierEntity]
        : [],
    dehumidifierEntities: attrs.dehumidifierEntities?.length
      ? attrs.dehumidifierEntities
      : attrs.dehumidifierEntity
        ? [attrs.dehumidifierEntity]
        : [],
    humidifierThresholds: attrs.humidifierThresholds ?? {},
    dehumidifierThresholds: attrs.dehumidifierThresholds ?? {},
    humidifierControlEnabled: attrs.humidifierControlEnabled ?? false,
    dehumidifierControlEnabled: attrs.dehumidifierControlEnabled ?? false,
    exhaustFanAcInfinityDevices: attrs.exhaustFanAcInfinityDevices ?? [],
    circulationFanAcInfinityDevices: attrs.circulationFanAcInfinityDevices ?? [],
    humidifierAcInfinityDevices: attrs.humidifierAcInfinityDevices ?? [],
    dehumidifierAcInfinityDevices: attrs.dehumidifierAcInfinityDevices ?? [],
    soilMoistureSensor: attrs.soilMoistureSensor ?? '',
    soilMoistureMin: attrs.soilMoistureMin ?? null,
    soilMoistureMax: attrs.soilMoistureMax ?? null,
    substrateTemperatureSensors: attrs.substrateTemperatureSensors ?? [],
    phSensors: attrs.phSensors ?? [],
    feedEcSensors: attrs.feedEcSensors ?? [],
    bulkEcSensors: attrs.bulkEcSensors ?? [],
    poreEcSensors: attrs.poreEcSensors ?? [],
    runoffEcSensors: attrs.runoffEcSensors ?? [],
    drainVolumeSensors: attrs.drainVolumeSensors ?? [],
    irrigationFlowSensors: attrs.irrigationFlowSensors ?? [],
    powerSensors: attrs.powerSensors ?? [],
    energySensors: attrs.energySensors ?? [],
    sensorGroups: attrs.sensorGroups ?? [],
    sensorCoordinates: attrs.sensorCoordinates ?? {},
    irrigationTanks: (attrs.irrigationTanks ?? []).map((t) => ({
      sensorEntity: t.sensorEntity ?? '',
      name: t.name ?? 'Tank',
      volumeLiters: t.volumeLiters ?? null,
      warningLevel: t.warningLevel ?? 30,
      staleAfterMinutes: t.staleAfterMinutes ?? null,
    })),
    cameraEntities: attrs.cameraEntities ?? [],
    lungroomTempSensors: attrs.lungroomTempSensors ?? [],
    visionEnabled: vc?.enabled ?? false,
    visionEarlyOffset: vc?.early_check_offset_minutes ?? 60,
    visionMidHours: vc?.mid_check_hours ?? 6,
    visionLateOffset: vc?.late_check_offset_minutes ?? 60,
    circulationFanConfig:
      attrs.circulationFanConfig ?? defaultEnvironmentDraft().circulationFanConfig,
    exhaustFanConfig: attrs.exhaustFanConfig ?? defaultEnvironmentDraft().exhaustFanConfig,
    growlightEntities: attrs.growlightEntities ?? [],
    growlightAcInfinityDevices: attrs.growlightAcInfinityDevices ?? [],
    growlightConfig: attrs.growlightConfig ?? defaultEnvironmentDraft().growlightConfig,
    lightLeakConfig: attrs.lightLeakConfig ?? defaultEnvironmentDraft().lightLeakConfig,
    vpdOptimalOverrides: attrs.vpdOptimalOverrides ?? {},
    lstOffset: attrs.lstOffset ?? -2.0,
  };
}

export type EnvironmentDraftKey = keyof EnvironmentDraft;
export type DirtyWriteSet = ReadonlySet<EnvironmentDraftKey>;

export interface EnvironmentDraftState {
  values: EnvironmentDraft;
  dirty: DirtyWriteSet;
  seeded: Readonly<EnvironmentDraft>;
}

const MOISTURE_BAND_GROUP = ['soilMoistureMin', 'soilMoistureMax'] as const;
const ATOMIC_GROUPS: ReadonlyArray<readonly EnvironmentDraftKey[]> = [MOISTURE_BAND_GROUP];

function closeAtomicGroups(keys: Iterable<EnvironmentDraftKey>): DirtyWriteSet {
  const dirty = new Set(keys);
  for (const group of ATOMIC_GROUPS) {
    if (group.some((key) => dirty.has(key))) {
      for (const key of group) dirty.add(key);
    }
  }
  return dirty;
}

export function createEnvironmentDraftState(device?: GrowspaceDevice): EnvironmentDraftState {
  const values = device ? envDraftFromDevice(device) : defaultEnvironmentDraft();
  return { values, dirty: new Set(), seeded: structuredClone(values) };
}

export function reseedEnvironmentDraftState(device: GrowspaceDevice): EnvironmentDraftState {
  return createEnvironmentDraftState(device);
}

export function editEnvironmentDraft(
  state: EnvironmentDraftState,
  partial: Partial<EnvironmentDraft>
): EnvironmentDraftState {
  return {
    ...state,
    values: { ...state.values, ...partial },
    dirty: closeAtomicGroups([...state.dirty, ...(Object.keys(partial) as EnvironmentDraftKey[])]),
  };
}

export function hasEnvironmentDraftDiverged(state: EnvironmentDraftState): boolean {
  return JSON.stringify(state.values) !== JSON.stringify(state.seeded);
}

type FieldOwner = 'routing' | 'buffered' | 'immediate' | 'vision' | 'exhaust' | 'moisture-band';

/** Every draft field has one persistence owner. Wire names live in the adapter. */
const FIELD_OWNERSHIP = {
  selectedGrowspaceId: 'routing',
  temperatureSensors: 'buffered',
  humiditySensors: 'buffered',
  vpdSensors: 'buffered',
  co2Sensor: 'buffered',
  lightSensors: 'buffered',
  exhaustFanEntities: 'buffered',
  circulationFanEntities: 'buffered',
  exhaustFanAcInfinityDevices: 'buffered',
  circulationFanAcInfinityDevices: 'buffered',
  stressThreshold: 'buffered',
  moldThreshold: 'buffered',
  humidifierEntities: 'buffered',
  dehumidifierEntities: 'buffered',
  humidifierAcInfinityDevices: 'buffered',
  dehumidifierAcInfinityDevices: 'buffered',
  humidifierThresholds: 'buffered',
  dehumidifierThresholds: 'buffered',
  humidifierControlEnabled: 'immediate',
  dehumidifierControlEnabled: 'immediate',
  soilMoistureSensor: 'buffered',
  soilMoistureMin: 'moisture-band',
  soilMoistureMax: 'moisture-band',
  substrateTemperatureSensors: 'buffered',
  phSensors: 'buffered',
  feedEcSensors: 'buffered',
  bulkEcSensors: 'buffered',
  poreEcSensors: 'buffered',
  runoffEcSensors: 'buffered',
  drainVolumeSensors: 'buffered',
  irrigationFlowSensors: 'buffered',
  powerSensors: 'buffered',
  energySensors: 'buffered',
  sensorGroups: 'buffered',
  sensorCoordinates: 'buffered',
  irrigationTanks: 'buffered',
  cameraEntities: 'buffered',
  lungroomTempSensors: 'buffered',
  visionEnabled: 'vision',
  visionEarlyOffset: 'vision',
  visionMidHours: 'vision',
  visionLateOffset: 'vision',
  circulationFanConfig: 'buffered',
  exhaustFanConfig: 'exhaust',
  growlightEntities: 'buffered',
  growlightAcInfinityDevices: 'buffered',
  growlightConfig: 'buffered',
  lightLeakConfig: 'buffered',
  vpdOptimalOverrides: 'buffered',
  lstOffset: 'buffered',
} as const satisfies Record<EnvironmentDraftKey, FieldOwner>;

export type EnvironmentSaveBlockReason =
  | 'growspace'
  | 'temperature'
  | 'humidity'
  | 'temperature-and-humidity'
  | 'moisture-band';

export type EnvironmentSaveVerdict =
  | Readonly<{ ok: true }>
  | Readonly<{ ok: false; reason: EnvironmentSaveBlockReason }>;

type EnvironmentWriteCommand =
  | Readonly<{
      kind: 'configure-environment';
      growspaceId: string;
      fields: Readonly<Partial<EnvironmentDraft>>;
    }>
  | Readonly<{
      kind: 'configure-exhaust';
      growspaceId: string;
      config: Readonly<EnvironmentDraft['exhaustFanConfig']>;
    }>;

export type EnvironmentWritePlan = readonly EnvironmentWriteCommand[];

type SaveableDraft = Pick<
  EnvironmentDraft,
  'selectedGrowspaceId' | 'temperatureSensors' | 'humiditySensors'
> &
  Partial<Pick<EnvironmentDraft, 'soilMoistureMin' | 'soilMoistureMax'>>;

export function environmentSaveVerdict(
  draft: Readonly<SaveableDraft>,
  dirty: DirtyWriteSet
): EnvironmentSaveVerdict {
  if (!draft.selectedGrowspaceId) return { ok: false, reason: 'growspace' };
  const missingTemperature = draft.temperatureSensors.length === 0;
  const missingHumidity = draft.humiditySensors.length === 0;
  if (missingTemperature && missingHumidity) {
    return { ok: false, reason: 'temperature-and-humidity' };
  }
  if (missingTemperature) return { ok: false, reason: 'temperature' };
  if (missingHumidity) return { ok: false, reason: 'humidity' };
  if (
    MOISTURE_BAND_GROUP.some((key) => dirty.has(key)) &&
    bandSavePayload({ min: draft.soilMoistureMin ?? null, max: draft.soilMoistureMax ?? null }) ===
      null
  ) {
    return { ok: false, reason: 'moisture-band' };
  }
  return { ok: true };
}

/** The complete draft supplies values; write intent alone selects fields. */
export function planEnvironmentWrite(state: EnvironmentDraftState): EnvironmentWritePlan {
  const verdict = environmentSaveVerdict(state.values, state.dirty);
  if (!verdict.ok) throw new EnvironmentDraftValidationError(verdict.reason);
  const fields: Partial<EnvironmentDraft> = {};
  let exhaust = false;
  for (const key of state.dirty) {
    switch (FIELD_OWNERSHIP[key]) {
      case 'buffered':
        // Indexing through a homogeneous Record preserves the heterogeneous values.
        (fields as Record<string, unknown>)[key] = state.values[key];
        break;
      case 'exhaust':
        exhaust = true;
        break;
    }
  }
  if (MOISTURE_BAND_GROUP.some((key) => state.dirty.has(key))) {
    fields.soilMoistureMin = state.values.soilMoistureMin;
    fields.soilMoistureMax = state.values.soilMoistureMax;
  }
  const plan: EnvironmentWriteCommand[] = [
    { kind: 'configure-environment', growspaceId: state.values.selectedGrowspaceId, fields },
  ];
  if (exhaust) {
    plan.push({
      kind: 'configure-exhaust',
      growspaceId: state.values.selectedGrowspaceId,
      config: state.values.exhaustFanConfig,
    });
  }
  return plan;
}

class EnvironmentDraftValidationError extends Error {
  constructor(readonly reason: EnvironmentSaveBlockReason) {
    super(`Environment Change is blocked: ${reason}`);
    this.name = 'EnvironmentDraftValidationError';
  }
}

export interface VisionWriteCommand {
  growspaceId: string;
  config: Readonly<
    Pick<
      EnvironmentDraft,
      'visionEnabled' | 'visionEarlyOffset' | 'visionMidHours' | 'visionLateOffset'
    >
  >;
}

export function planVisionWrite(state: EnvironmentDraftState): VisionWriteCommand | null {
  if (
    !(['visionEnabled', 'visionEarlyOffset', 'visionMidHours', 'visionLateOffset'] as const).some(
      (key) => state.dirty.has(key)
    )
  )
    return null;
  const values = state.values;
  if (!values.selectedGrowspaceId) return null;
  return {
    growspaceId: values.selectedGrowspaceId,
    config: {
      visionEnabled: values.visionEnabled,
      visionEarlyOffset: values.visionEarlyOffset,
      visionMidHours: values.visionMidHours,
      visionLateOffset: values.visionLateOffset,
    },
  };
}

export type ImmediateHumidityCommand = Readonly<{
  kind: 'humidifier' | 'dehumidifier';
  growspaceId: string;
  enabled: boolean;
}>;

/** Edits retain intent and report immediate commands for the caller to execute. */
export function transitionEnvironmentDraft(
  state: EnvironmentDraftState,
  partial: Partial<EnvironmentDraft>
): Readonly<{ state: EnvironmentDraftState; immediate: readonly ImmediateHumidityCommand[] }> {
  const next = editEnvironmentDraft(state, partial);
  const immediate: ImmediateHumidityCommand[] = [];
  if ('humidifierControlEnabled' in partial) {
    immediate.push({
      kind: 'humidifier',
      growspaceId: next.values.selectedGrowspaceId,
      enabled: next.values.humidifierControlEnabled,
    });
  }
  if ('dehumidifierControlEnabled' in partial) {
    immediate.push({
      kind: 'dehumidifier',
      growspaceId: next.values.selectedGrowspaceId,
      enabled: next.values.dehumidifierControlEnabled,
    });
  }
  return { state: next, immediate };
}
