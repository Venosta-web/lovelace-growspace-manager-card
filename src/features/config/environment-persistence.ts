/**
 * Environment Draft persistence classification (ADR-0032).
 *
 * Every [[Shared Environment Draft]] key gets exactly one persistence class.
 * `Record<keyof EnvironmentDraft, ...>` makes the table *total*: adding a draft
 * field without classifying it is a compile error, which is the structural
 * replacement for the #505 composer/seeder key-parity test. Sparse output
 * cannot have key parity by design, so the guard moves from "the two lists
 * match" to "every key is accounted for".
 *
 * The classes:
 *
 * - `routing`   — not a patch field; identifies the growspace to write to.
 * - `buffered`  — travels in the `configure_environment` patch, emitted only
 *                 when its key (or atomic group) is dirty.
 * - `dedicated` — persisted by its own service, gated on the same dirtiness.
 * - `immediate` — already persisted the moment the user toggles it. It stays in
 *                 the complete draft for display, but the buffered Save must
 *                 never re-send it: doing so would rewrite a value the user did
 *                 not touch in this Save.
 */

import type { EnvironmentDraft } from '../../dialogs/config-dialog-sm';

export type PersistenceClass = 'routing' | 'buffered' | 'dedicated' | 'immediate';

export type EnvironmentDraftKey = keyof EnvironmentDraft;

/**
 * Total classification of the Shared Environment Draft. Keep this exhaustive —
 * the `Record` type is what makes an unclassified new field fail to compile.
 */
export const ENV_PERSISTENCE: Record<EnvironmentDraftKey, PersistenceClass> = {
  selectedGrowspaceId: 'routing',

  // Air sensors
  temperatureSensors: 'buffered',
  humiditySensors: 'buffered',
  vpdSensors: 'buffered',
  co2Sensor: 'buffered',
  lightSensors: 'buffered',

  // Climate devices
  exhaustFanEntities: 'buffered',
  circulationFanEntities: 'buffered',
  exhaustFanAcInfinityDevices: 'buffered',
  circulationFanAcInfinityDevices: 'buffered',
  stressThreshold: 'buffered',
  moldThreshold: 'buffered',

  // Humidity devices
  humidifierEntities: 'buffered',
  dehumidifierEntities: 'buffered',
  humidifierAcInfinityDevices: 'buffered',
  dehumidifierAcInfinityDevices: 'buffered',
  humidifierThresholds: 'buffered',
  dehumidifierThresholds: 'buffered',
  // Persisted immediately by set_humidifier_control / set_dehumidifier_control.
  humidifierControlEnabled: 'immediate',
  dehumidifierControlEnabled: 'immediate',

  // Substrate / irrigation monitoring
  soilMoistureSensor: 'buffered',
  soilMoistureMin: 'buffered',
  soilMoistureMax: 'buffered',
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

  // Heatmap / spatial
  sensorGroups: 'buffered',
  sensorCoordinates: 'buffered',

  // Tanks
  irrigationTanks: 'buffered',

  // Camera / lungroom
  cameraEntities: 'buffered',
  lungroomTempSensors: 'buffered',

  // Vision checkup — its own service, its own tab-level Save button.
  visionEnabled: 'dedicated',
  visionEarlyOffset: 'dedicated',
  visionMidHours: 'dedicated',
  visionLateOffset: 'dedicated',

  // Fan controllers — configure_environment cannot persist exhaust_fan_config.
  circulationFanConfig: 'buffered',
  exhaustFanConfig: 'dedicated',

  // Grow light controller
  growlightEntities: 'buffered',
  growlightAcInfinityDevices: 'buffered',
  growlightConfig: 'buffered',

  // VPD
  vpdOptimalOverrides: 'buffered',
  lstOffset: 'buffered',
};

/**
 * Keys that must be written together or not at all.
 *
 * The backend raises on a lone moisture bound and fails the *entire*
 * `configure_environment` call, so dirtiness propagates across the group:
 * touching either bound makes both part of the patch.
 */
export const ENV_ATOMIC_GROUPS: ReadonlyArray<readonly EnvironmentDraftKey[]> = [
  ['soilMoistureMin', 'soilMoistureMax'],
];

/** The vision-checkup fields, which its dedicated service writes as one unit. */
export const VISION_GROUP: readonly EnvironmentDraftKey[] = [
  'visionEnabled',
  'visionEarlyOffset',
  'visionMidHours',
  'visionLateOffset',
];

/**
 * Close a set of edited keys under the atomic groups: if any member is dirty,
 * every member is. Applied at the point of edit so the write set is already
 * closed by the time anything reads it.
 */
export function expandAtomicGroups(
  keys: Iterable<EnvironmentDraftKey>
): ReadonlySet<EnvironmentDraftKey> {
  const expanded = new Set<EnvironmentDraftKey>(keys);
  for (const group of ENV_ATOMIC_GROUPS) {
    if (group.some((key) => expanded.has(key))) {
      for (const key of group) expanded.add(key);
    }
  }
  return expanded;
}

/** Whether any key of the given persistence class is dirty. */
export function hasDirtyOfClass(
  dirty: ReadonlySet<EnvironmentDraftKey>,
  persistence: PersistenceClass
): boolean {
  for (const key of dirty) {
    if (ENV_PERSISTENCE[key] === persistence) return true;
  }
  return false;
}

/** Whether any key in `group` is dirty. */
export function isGroupDirty(
  dirty: ReadonlySet<EnvironmentDraftKey>,
  group: readonly EnvironmentDraftKey[]
): boolean {
  return group.some((key) => dirty.has(key));
}

/** The dirty keys the buffered `configure_environment` patch may carry. */
export function bufferedDirtyKeys(
  dirty: ReadonlySet<EnvironmentDraftKey>
): ReadonlySet<EnvironmentDraftKey> {
  const buffered = new Set<EnvironmentDraftKey>();
  for (const key of dirty) {
    if (ENV_PERSISTENCE[key] === 'buffered') buffered.add(key);
  }
  return buffered;
}
