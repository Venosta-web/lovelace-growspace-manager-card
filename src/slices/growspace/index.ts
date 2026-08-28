import { z } from 'zod';
import { atom } from 'nanostores';
import { hassCall, callService } from '../../services/hass-call';
import { mutate } from '../../services/mutate';
import { GrowspaceAdapter } from '../../adapters/growspace-adapter';
import { devices$, patchDeviceEnvironmentAttributes } from '../grid';
import {
  GrowspaceAPICollectionSchema,
  GrowReportSchema,
  type GrowReport,
  type CirculationFanConfig,
  type ExhaustFanConfig,
} from './schema';
import type { EnvironmentDraft } from '../../dialogs/config-dialog-sm';
import type { EnvironmentConfigEventDetail } from '../../lib/types/dialog';
import {
  ENV_ATOMIC_GROUPS,
  type BufferedEnvironmentDraftKey,
} from '../../features/config/environment-persistence';
import type { GrowspaceDevice, GrowspaceAPIResponse } from '../../services/types';

export type { GrowReport } from './schema';

export const growspaceDevices$ = atom<GrowspaceDevice[] | null>(null);

export function getGrowspaceDevices(): GrowspaceDevice[] {
  return growspaceDevices$.get() ?? [];
}

export async function addGrowspace(data: {
  name: string;
  rows: number;
  plantsPerRow: number;
  notificationService?: string;
}): Promise<void> {
  await callService('growspace_manager', 'add_growspace', {
    name: data.name,
    rows: data.rows,
    plants_per_row: data.plantsPerRow,
    notification_target: data.notificationService,
  });
}

export async function removeGrowspace(growspaceId: string): Promise<void> {
  await callService('growspace_manager', 'remove_growspace', { growspace_id: growspaceId });
}

export async function updateGrowspace(data: {
  growspaceId: string;
  name?: string;
  rows?: number;
  plantsPerRow?: number;
  notificationService?: string;
}): Promise<void> {
  const previous = growspaceDevices$.get();

  // configure_environment is patch semantics (GSM ADR-0026): an omitted key keeps
  // the backend value; a present key — including [] or null — is a deliberate
  // set/clear. Gates must therefore be `!== undefined`, never truthiness/length,
  // or clearing a field silently stops working.
  const payload: Record<string, unknown> = { growspace_id: data.growspaceId };
  if (data.name !== undefined) payload.name = data.name;
  if (data.rows !== undefined) payload.rows = data.rows;
  if (data.plantsPerRow !== undefined) payload.plants_per_row = data.plantsPerRow;
  if (data.notificationService !== undefined)
    payload.notification_target = data.notificationService;

  await mutate(
    {
      type: 'updateGrowspace',
      optimistic: () => {
        if (!previous) return;
        growspaceDevices$.set(
          previous.map((d) =>
            d.deviceId === data.growspaceId
              ? {
                  ...d,
                  ...(data.name !== undefined && { name: data.name }),
                  ...(data.rows !== undefined && { rows: data.rows }),
                  ...(data.plantsPerRow !== undefined && { plantsPerRow: data.plantsPerRow }),
                  ...(data.notificationService !== undefined && {
                    notificationTarget: data.notificationService,
                  }),
                }
              : d
          )
        );
      },
      inverse: () => growspaceDevices$.set(previous),
      apply: () => callService('growspace_manager', 'update_growspace', payload),
    },
    data.growspaceId
  );
}

export async function exportGrowReport(
  growspaceId: string,
  format: 'json' | 'pdf' = 'json'
): Promise<void> {
  await callService('growspace_manager', 'export_grow_report', {
    growspace_id: growspaceId,
    format,
  });
}

export async function fetchGrowReport(growspaceId: string): Promise<GrowReport> {
  return hassCall(
    'growspace_manager/get_grow_report',
    { growspace_id: growspaceId },
    GrowReportSchema
  );
}

export async function removeEnvironment(growspaceId: string): Promise<void> {
  await callService('growspace_manager', 'remove_environment', { growspace_id: growspaceId });
}

export async function resetWaterTracking(growspaceId: string): Promise<void> {
  await callService('growspace_manager', 'reset_water_tracking', { growspace_id: growspaceId });
}

export async function setDehumidifierControl(growspaceId: string, enabled: boolean): Promise<void> {
  const prev =
    devices$.get().find((d) => d.deviceId === growspaceId)?.environmentAttributes
      .dehumidifierControlEnabled ?? false;
  await mutate(
    {
      type: 'setDehumidifierControl',
      // Patch the device the config dialog reseeds from immediately, so a
      // close-then-reopen reflects the flip without waiting for hass to push
      // the backend's confirmed state back through a full sync.
      optimistic: () =>
        patchDeviceEnvironmentAttributes(growspaceId, { dehumidifierControlEnabled: enabled }),
      inverse: () =>
        patchDeviceEnvironmentAttributes(growspaceId, { dehumidifierControlEnabled: prev }),
      apply: () =>
        callService('growspace_manager', 'set_dehumidifier_control', {
          growspace_id: growspaceId,
          enabled,
        }),
    },
    growspaceId
  );
}

export async function setHumidifierControl(growspaceId: string, enabled: boolean): Promise<void> {
  const prev =
    devices$.get().find((d) => d.deviceId === growspaceId)?.environmentAttributes
      .humidifierControlEnabled ?? false;
  await mutate(
    {
      type: 'setHumidifierControl',
      optimistic: () =>
        patchDeviceEnvironmentAttributes(growspaceId, { humidifierControlEnabled: enabled }),
      inverse: () =>
        patchDeviceEnvironmentAttributes(growspaceId, { humidifierControlEnabled: prev }),
      apply: () =>
        callService('growspace_manager', 'set_humidifier_control', {
          growspace_id: growspaceId,
          enabled,
        }),
    },
    growspaceId
  );
}

export async function updateSensorCoordinates(
  growspaceId: string,
  entityId: string,
  x: number,
  y: number,
  zCoord: number,
  rotation?: number
): Promise<void> {
  await hassCall(
    'growspace_manager/update_sensor_coordinates',
    {
      growspace_id: growspaceId,
      entity_id: entityId,
      x: Math.round(x),
      y: Math.round(y),
      z: Math.round(zCoord),
      rotation: rotation !== undefined ? Math.round(rotation) : undefined,
    },
    z.unknown()
  );
}

type EnvironmentActionField<Key extends BufferedEnvironmentDraftKey> = {
  serviceKey: string;
  include?: (value: EnvironmentDraft[Key]) => boolean;
  serialize?: (value: EnvironmentDraft[Key]) => unknown;
};

type EnvironmentActionFields = {
  [Key in BufferedEnvironmentDraftKey]: EnvironmentActionField<Key>;
};

/**
 * The one compile-time-total Environment Draft → HA action mapping.
 *
 * `BufferedEnvironmentDraftKey` is derived from `ENV_PERSISTENCE`, so adding a
 * buffered draft field without adding its rename here fails type checking.
 * The action iterates this same table for omission gating; there is no second
 * passthrough allowlist or handwritten per-key gate to drift from it.
 */
const ENVIRONMENT_ACTION_FIELDS = {
  temperatureSensors: { serviceKey: 'temperature_sensors' },
  humiditySensors: { serviceKey: 'humidity_sensors' },
  vpdSensors: { serviceKey: 'vpd_sensors' },
  co2Sensor: { serviceKey: 'co2_sensor', serialize: (value) => value || null },
  lightSensors: { serviceKey: 'light_sensors' },
  exhaustFanEntities: { serviceKey: 'exhaust_fan_entities' },
  circulationFanEntities: { serviceKey: 'circulation_fan_entities' },
  exhaustFanAcInfinityDevices: { serviceKey: 'exhaust_fan_ac_infinity_devices' },
  circulationFanAcInfinityDevices: { serviceKey: 'circulation_fan_ac_infinity_devices' },
  // Older GSM releases reject null for these two fields. Preserve their stored
  // values until the installed backend can express an explicit clear.
  stressThreshold: { serviceKey: 'stress_threshold', include: (value) => value !== null },
  moldThreshold: { serviceKey: 'mold_threshold', include: (value) => value !== null },
  humidifierEntities: { serviceKey: 'humidifier_entities' },
  dehumidifierEntities: { serviceKey: 'dehumidifier_entities' },
  humidifierAcInfinityDevices: { serviceKey: 'humidifier_ac_infinity_devices' },
  dehumidifierAcInfinityDevices: { serviceKey: 'dehumidifier_ac_infinity_devices' },
  humidifierThresholds: { serviceKey: 'humidifier_thresholds' },
  dehumidifierThresholds: { serviceKey: 'dehumidifier_thresholds' },
  soilMoistureSensor: {
    serviceKey: 'soil_moisture_sensor',
    serialize: (value) => value || null,
  },
  soilMoistureMin: { serviceKey: 'soil_moisture_min' },
  soilMoistureMax: { serviceKey: 'soil_moisture_max' },
  substrateTemperatureSensors: { serviceKey: 'substrate_temperature_sensors' },
  phSensors: { serviceKey: 'ph_sensors' },
  feedEcSensors: { serviceKey: 'feed_ec_sensors' },
  bulkEcSensors: { serviceKey: 'bulk_ec_sensors' },
  poreEcSensors: { serviceKey: 'pore_ec_sensors' },
  runoffEcSensors: { serviceKey: 'runoff_ec_sensors' },
  drainVolumeSensors: { serviceKey: 'drain_volume_sensors' },
  irrigationFlowSensors: { serviceKey: 'irrigation_flow_sensors' },
  powerSensors: { serviceKey: 'power_sensors' },
  energySensors: { serviceKey: 'energy_sensors' },
  sensorGroups: { serviceKey: 'sensor_groups' },
  sensorCoordinates: { serviceKey: 'sensor_coordinates' },
  irrigationTanks: {
    serviceKey: 'irrigation_tanks',
    serialize: (tanks) =>
      tanks.map((tank) => ({
        sensor_entity: tank.sensorEntity,
        name: tank.name,
        warning_level: tank.warningLevel,
        ...(tank.volumeLiters != null ? { volume_liters: tank.volumeLiters } : {}),
      })),
  },
  cameraEntities: { serviceKey: 'camera_entities' },
  lungroomTempSensors: { serviceKey: 'lung_room_temp_sensors' },
  circulationFanConfig: { serviceKey: 'circulation_fan_config' },
  growlightEntities: { serviceKey: 'growlight_entities' },
  growlightAcInfinityDevices: { serviceKey: 'growlight_ac_infinity_devices' },
  growlightConfig: { serviceKey: 'growlight_config' },
  vpdOptimalOverrides: { serviceKey: 'vpd_optimal_overrides' },
  lstOffset: { serviceKey: 'lst_offset' },
} satisfies EnvironmentActionFields;

function atomicGroupFor(
  key: BufferedEnvironmentDraftKey
): readonly BufferedEnvironmentDraftKey[] | undefined {
  return ENV_ATOMIC_GROUPS.find((group) => group.includes(key)) as
    | readonly BufferedEnvironmentDraftKey[]
    | undefined;
}

function assignEnvironmentActionField<Key extends BufferedEnvironmentDraftKey>(
  payload: Record<string, unknown>,
  patch: EnvironmentConfigEventDetail,
  key: Key
): void {
  const mapping = ENVIRONMENT_ACTION_FIELDS[key] as EnvironmentActionField<Key>;
  const value = patch[key] as EnvironmentDraft[Key] | undefined;
  if (value === undefined) return;

  const atomicGroup = atomicGroupFor(key);
  if (atomicGroup?.some((member) => patch[member] === undefined)) return;
  if (mapping.include && !mapping.include(value)) return;

  payload[mapping.serviceKey] = mapping.serialize ? mapping.serialize(value) : value;
}

export async function configureEnvironment(patch: EnvironmentConfigEventDetail): Promise<void> {
  const payload: Record<string, unknown> = { growspace_id: patch.selectedGrowspaceId };

  for (const key of Object.keys(ENVIRONMENT_ACTION_FIELDS) as BufferedEnvironmentDraftKey[]) {
    assignEnvironmentActionField(payload, patch, key);
  }

  await callService('growspace_manager', 'configure_environment', payload);
}

export async function configureCirculationFan({
  growspaceId,
  fanConfig,
}: {
  growspaceId: string;
  fanConfig: CirculationFanConfig;
}): Promise<void> {
  await callService('growspace_manager', 'configure_circulation_fan', {
    growspace_id: growspaceId,
    ...fanConfig,
  });
}

export async function configureExhaustFan({
  growspaceId,
  fanConfig,
}: {
  growspaceId: string;
  fanConfig: ExhaustFanConfig;
}): Promise<void> {
  await callService('growspace_manager', 'configure_exhaust_fan', {
    growspace_id: growspaceId,
    ...fanConfig,
  });
}

export async function fetchGrowspaceData(): Promise<void> {
  const collection = await hassCall('growspace_manager/get_data', {}, GrowspaceAPICollectionSchema);
  const devices = Object.values(collection)
    .map((wsData) => GrowspaceAdapter.transformGrowspace(null, wsData))
    .filter((d): d is GrowspaceDevice => d !== null);
  growspaceDevices$.set(devices);
}

export async function fetchRawCollection(): Promise<Record<string, GrowspaceAPIResponse>> {
  return hassCall('growspace_manager/get_data', {}, GrowspaceAPICollectionSchema);
}
