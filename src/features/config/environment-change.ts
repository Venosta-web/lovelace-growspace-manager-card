/**
 * Environment Change — the card's one write module for EnvironmentConfig.
 *
 * Its interface accepts the two live caller intents: a Config Dialog Shared
 * Environment Draft plus Dirty Write Set, or a narrow Tank Config Change. The
 * implementation hides Environment Field Ownership, Atomic Dirty Groups,
 * sparse Environment Patch composition, Home Assistant action mapping,
 * dedicated exhaust sequencing, and refresh ordering.
 */

import type { EnvironmentDraft } from '../../dialogs/config-dialog-sm';
import type { IrrigationTank } from '../../services/types';
import { bandSavePayload } from './moisture-band';

export type EnvironmentDraftKey = keyof EnvironmentDraft;
export type DirtyWriteSet = ReadonlySet<EnvironmentDraftKey>;

export type EnvironmentChangeRequest =
  | Readonly<{
      kind: 'shared-environment-draft';
      draft: Readonly<EnvironmentDraft>;
      dirty: DirtyWriteSet;
    }>
  | Readonly<{
      kind: 'tank-config-change';
      growspaceId: string;
      irrigationTanks: readonly IrrigationTank[];
    }>;

type EnvironmentChangeVerdictDraft = Pick<
  EnvironmentDraft,
  'selectedGrowspaceId' | 'temperatureSensors' | 'humiditySensors'
> &
  Partial<Pick<EnvironmentDraft, 'soilMoistureMin' | 'soilMoistureMax'>>;

export type EnvironmentChangeVerdictRequest =
  | Readonly<{
      kind: 'shared-environment-draft';
      draft: Readonly<EnvironmentChangeVerdictDraft>;
      dirty: DirtyWriteSet;
    }>
  | Extract<EnvironmentChangeRequest, { kind: 'tank-config-change' }>;

export interface ConfigureEnvironmentActionData extends Record<string, unknown> {
  growspace_id: string;
}

export interface ConfigureExhaustFanActionData extends Record<string, unknown> {
  growspace_id: string;
}

export interface EnvironmentChangeAdapter {
  configureEnvironment(payload: ConfigureEnvironmentActionData): Promise<void>;
  configureExhaustFan(payload: ConfigureExhaustFanActionData): Promise<void>;
  refresh(): Promise<void>;
}

export type EnvironmentChangeBlockReason =
  | 'growspace'
  | 'temperature'
  | 'humidity'
  | 'temperature-and-humidity'
  | 'moisture-band';

export type EnvironmentChangeVerdict =
  | Readonly<{ ok: true }>
  | Readonly<{ ok: false; reason: EnvironmentChangeBlockReason }>;

export class EnvironmentChangeValidationError extends Error {
  constructor(readonly reason: EnvironmentChangeBlockReason) {
    super(`Environment Change is blocked: ${reason}`);
    this.name = 'EnvironmentChangeValidationError';
  }
}

type EnvironmentFieldRule =
  | Readonly<{ owner: 'routing' | 'immediate' | 'vision' | 'exhaust' }>
  | Readonly<{
      owner: 'environment';
      wireKey: string;
      map?: (value: unknown) => unknown;
      omitNull?: boolean;
    }>
  | Readonly<{ owner: 'moisture-band' }>;

const entityOrNull = (value: unknown): unknown => value || null;

function tankConfigs(value: unknown): unknown {
  return (value as readonly IrrigationTank[]).map((tank) => ({
    sensor_entity: tank.sensorEntity,
    name: tank.name,
    warning_level: tank.warningLevel,
    ...(tank.volumeLiters != null ? { volume_liters: tank.volumeLiters } : {}),
  }));
}

/**
 * Total Environment Field Ownership and wire mapping table.
 *
 * Adding a Shared Environment Draft field without a row is a compile error.
 * Every buffered row also owns its canonical Home Assistant action key, so a
 * field cannot be composed and then silently dropped by a second mapping list.
 */
const ENVIRONMENT_FIELDS = {
  selectedGrowspaceId: { owner: 'routing' },
  temperatureSensors: { owner: 'environment', wireKey: 'temperature_sensors' },
  humiditySensors: { owner: 'environment', wireKey: 'humidity_sensors' },
  vpdSensors: { owner: 'environment', wireKey: 'vpd_sensors' },
  co2Sensor: { owner: 'environment', wireKey: 'co2_sensor', map: entityOrNull },
  lightSensors: { owner: 'environment', wireKey: 'light_sensors' },
  exhaustFanEntities: { owner: 'environment', wireKey: 'exhaust_fan_entities' },
  circulationFanEntities: { owner: 'environment', wireKey: 'circulation_fan_entities' },
  exhaustFanAcInfinityDevices: {
    owner: 'environment',
    wireKey: 'exhaust_fan_ac_infinity_devices',
  },
  circulationFanAcInfinityDevices: {
    owner: 'environment',
    wireKey: 'circulation_fan_ac_infinity_devices',
  },
  stressThreshold: { owner: 'environment', wireKey: 'stress_threshold', omitNull: true },
  moldThreshold: { owner: 'environment', wireKey: 'mold_threshold', omitNull: true },
  humidifierEntities: { owner: 'environment', wireKey: 'humidifier_entities' },
  dehumidifierEntities: { owner: 'environment', wireKey: 'dehumidifier_entities' },
  humidifierAcInfinityDevices: {
    owner: 'environment',
    wireKey: 'humidifier_ac_infinity_devices',
  },
  dehumidifierAcInfinityDevices: {
    owner: 'environment',
    wireKey: 'dehumidifier_ac_infinity_devices',
  },
  humidifierThresholds: { owner: 'environment', wireKey: 'humidifier_thresholds' },
  dehumidifierThresholds: { owner: 'environment', wireKey: 'dehumidifier_thresholds' },
  humidifierControlEnabled: { owner: 'immediate' },
  dehumidifierControlEnabled: { owner: 'immediate' },
  soilMoistureSensor: {
    owner: 'environment',
    wireKey: 'soil_moisture_sensor',
    map: entityOrNull,
  },
  soilMoistureMin: { owner: 'moisture-band' },
  soilMoistureMax: { owner: 'moisture-band' },
  substrateTemperatureSensors: {
    owner: 'environment',
    wireKey: 'substrate_temperature_sensors',
  },
  phSensors: { owner: 'environment', wireKey: 'ph_sensors' },
  feedEcSensors: { owner: 'environment', wireKey: 'feed_ec_sensors' },
  bulkEcSensors: { owner: 'environment', wireKey: 'bulk_ec_sensors' },
  poreEcSensors: { owner: 'environment', wireKey: 'pore_ec_sensors' },
  runoffEcSensors: { owner: 'environment', wireKey: 'runoff_ec_sensors' },
  drainVolumeSensors: { owner: 'environment', wireKey: 'drain_volume_sensors' },
  irrigationFlowSensors: { owner: 'environment', wireKey: 'irrigation_flow_sensors' },
  powerSensors: { owner: 'environment', wireKey: 'power_sensors' },
  energySensors: { owner: 'environment', wireKey: 'energy_sensors' },
  sensorGroups: { owner: 'environment', wireKey: 'sensor_groups' },
  sensorCoordinates: { owner: 'environment', wireKey: 'sensor_coordinates' },
  irrigationTanks: { owner: 'environment', wireKey: 'irrigation_tanks', map: tankConfigs },
  cameraEntities: { owner: 'environment', wireKey: 'camera_entities' },
  lungroomTempSensors: { owner: 'environment', wireKey: 'lung_room_temp_sensors' },
  visionEnabled: { owner: 'vision' },
  visionEarlyOffset: { owner: 'vision' },
  visionMidHours: { owner: 'vision' },
  visionLateOffset: { owner: 'vision' },
  circulationFanConfig: { owner: 'environment', wireKey: 'circulation_fan_config' },
  exhaustFanConfig: { owner: 'exhaust' },
  growlightEntities: { owner: 'environment', wireKey: 'growlight_entities' },
  growlightAcInfinityDevices: {
    owner: 'environment',
    wireKey: 'growlight_ac_infinity_devices',
  },
  growlightConfig: { owner: 'environment', wireKey: 'growlight_config' },
  vpdOptimalOverrides: { owner: 'environment', wireKey: 'vpd_optimal_overrides' },
  lstOffset: { owner: 'environment', wireKey: 'lst_offset' },
} as const satisfies Record<EnvironmentDraftKey, EnvironmentFieldRule>;

export const ENV_ATOMIC_GROUPS: ReadonlyArray<readonly EnvironmentDraftKey[]> = [
  ['soilMoistureMin', 'soilMoistureMax'],
];

export const VISION_GROUP: readonly EnvironmentDraftKey[] = [
  'visionEnabled',
  'visionEarlyOffset',
  'visionMidHours',
  'visionLateOffset',
];

export function expandAtomicGroups(
  keys: Iterable<EnvironmentDraftKey>
): ReadonlySet<EnvironmentDraftKey> {
  const expanded = new Set(keys);
  for (const group of ENV_ATOMIC_GROUPS) {
    if (group.some((key) => expanded.has(key))) {
      for (const key of group) expanded.add(key);
    }
  }
  return expanded;
}

export function isEnvironmentGroupDirty(
  dirty: DirtyWriteSet,
  group: readonly EnvironmentDraftKey[]
): boolean {
  return group.some((key) => dirty.has(key));
}

/** Read-only projection used by save affordances before applying a change. */
export function environmentChangeVerdict(
  request: EnvironmentChangeVerdictRequest
): EnvironmentChangeVerdict {
  if (request.kind === 'tank-config-change') {
    return request.growspaceId ? { ok: true } : { ok: false, reason: 'growspace' };
  }
  const { draft } = request;
  if (!draft.selectedGrowspaceId) return { ok: false, reason: 'growspace' };
  const missingTemperature = draft.temperatureSensors.length === 0;
  const missingHumidity = draft.humiditySensors.length === 0;
  if (missingTemperature && missingHumidity) {
    return { ok: false, reason: 'temperature-and-humidity' };
  }
  if (missingTemperature) return { ok: false, reason: 'temperature' };
  if (missingHumidity) return { ok: false, reason: 'humidity' };
  if (
    isEnvironmentGroupDirty(request.dirty, ENV_ATOMIC_GROUPS[0]) &&
    bandSavePayload({
      min: draft.soilMoistureMin ?? null,
      max: draft.soilMoistureMax ?? null,
    }) === null
  ) {
    return { ok: false, reason: 'moisture-band' };
  }
  return { ok: true };
}

function composeSharedDraftChange(
  draft: Readonly<EnvironmentDraft>,
  dirty: DirtyWriteSet
): Readonly<{
  environment: ConfigureEnvironmentActionData;
  exhaust?: ConfigureExhaustFanActionData;
}> {
  const environment: ConfigureEnvironmentActionData = {
    growspace_id: draft.selectedGrowspaceId,
  };
  let exhaust: ConfigureExhaustFanActionData | undefined;
  for (const key of dirty) {
    const rule = ENVIRONMENT_FIELDS[key];
    if (rule.owner === 'environment') {
      const value = draft[key];
      if ('omitNull' in rule && rule.omitNull && value == null) continue;
      environment[rule.wireKey] = 'map' in rule && rule.map ? rule.map(value) : value;
    } else if (rule.owner === 'exhaust') {
      exhaust = { growspace_id: draft.selectedGrowspaceId, ...draft.exhaustFanConfig };
    }
  }
  if (isEnvironmentGroupDirty(dirty, ENV_ATOMIC_GROUPS[0])) {
    const band = bandSavePayload({ min: draft.soilMoistureMin, max: draft.soilMoistureMax });
    if (band) {
      environment.soil_moisture_min = band.min;
      environment.soil_moisture_max = band.max;
    }
  }
  return exhaust ? { environment, exhaust } : { environment };
}

/** Apply one Environment Change through the existing Home Assistant action seam. */
export async function applyEnvironmentChange(
  request: EnvironmentChangeRequest,
  adapter: EnvironmentChangeAdapter
): Promise<void> {
  const verdict = environmentChangeVerdict(request);
  if (!verdict.ok) throw new EnvironmentChangeValidationError(verdict.reason);
  const plan =
    request.kind === 'tank-config-change'
      ? {
          environment: {
            growspace_id: request.growspaceId,
            irrigation_tanks: tankConfigs(request.irrigationTanks),
          },
        }
      : composeSharedDraftChange(request.draft, request.dirty);
  await adapter.configureEnvironment(plan.environment);
  if ('exhaust' in plan && plan.exhaust) {
    await adapter.configureExhaustFan(plan.exhaust);
  }
  await adapter.refresh();
}
