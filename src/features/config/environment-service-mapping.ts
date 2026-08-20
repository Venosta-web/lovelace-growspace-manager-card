/**
 * Sparse environment patch → `configure_environment` service data (ADR-0032).
 *
 * The Growspace Dialog Host owns the detail→service mapping; this module is the
 * pure part of it, extracted so the card-to-service contract can be tested
 * directly. The invariant it exists to protect: **a key absent from the patch
 * must stay absent from the service data**, because the backend preserves what
 * it is not sent. Mapping an absent key to a default here would silently
 * reintroduce the whole-draft overwrite the sparse composer removed.
 */

import type { EnvironmentConfigEventDetail } from '../../lib/types/dialog';
import type { configureEnvironment } from '../../slices/growspace';

/** The `configure_environment` service data — every field optional but the ID. */
export type EnvironmentServiceData = Parameters<typeof configureEnvironment>[0];

/**
 * Draft/detail keys that map straight through under the same name. Anything
 * needing a rename or normalisation is handled explicitly below; `exhaustFanConfig`
 * is excluded because it belongs to `configure_exhaust_fan`.
 */
const PASSTHROUGH_KEYS = [
  'temperatureSensors',
  'humiditySensors',
  'vpdSensors',
  'lightSensors',
  'circulationFanEntities',
  'exhaustFanEntities',
  'exhaustFanAcInfinityDevices',
  'circulationFanAcInfinityDevices',
  'stressThreshold',
  'moldThreshold',
  'humidifierEntities',
  'humidifierThresholds',
  'humidifierAcInfinityDevices',
  'dehumidifierEntities',
  'dehumidifierThresholds',
  'dehumidifierAcInfinityDevices',
  'soilMoistureMin',
  'soilMoistureMax',
  'substrateTemperatureSensors',
  'phSensors',
  'feedEcSensors',
  'bulkEcSensors',
  'poreEcSensors',
  'runoffEcSensors',
  'drainVolumeSensors',
  'irrigationFlowSensors',
  'powerSensors',
  'energySensors',
  'sensorGroups',
  'sensorCoordinates',
  'irrigationTanks',
  'cameraEntities',
  'lungroomTempSensors',
  'circulationFanConfig',
  'growlightEntities',
  'growlightAcInfinityDevices',
  'growlightConfig',
  'vpdOptimalOverrides',
  'lstOffset',
] as const satisfies ReadonlyArray<keyof EnvironmentConfigEventDetail>;

/** Translate a sparse patch into sparse `configure_environment` service data. */
export function environmentPatchToServiceData(
  detail: EnvironmentConfigEventDetail
): EnvironmentServiceData {
  const data: Record<string, unknown> = { growspaceId: detail.selectedGrowspaceId };

  for (const key of PASSTHROUGH_KEYS) {
    if (key in detail && detail[key] !== undefined) data[key] = detail[key];
  }

  // Cleared entity pickers arrive as '' and must reach the backend as an
  // explicit null; omitting them would keep the old sensor.
  if ('co2Sensor' in detail && detail.co2Sensor !== undefined) {
    data.co2Sensor = detail.co2Sensor || null;
  }
  if ('soilMoistureSensor' in detail && detail.soilMoistureSensor !== undefined) {
    data.soilMoistureSensor = detail.soilMoistureSensor || null;
  }

  return data as EnvironmentServiceData;
}
