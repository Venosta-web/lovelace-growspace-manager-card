/**
 * Environment slice — the single place in the codebase that reads hass.states
 * for environmental sensors and exposes normalized EnvSnapshot atoms.
 *
 * Public API (atoms):
 *   envSnapshots$        — read: Map<growspaceId, EnvSnapshot> (one entry per growspace)
 *   subareaEnvSnapshots$ — read: Map<subareaId, EnvSnapshot> (one entry per subarea)
 *
 * Public API (bootstrap writes):
 *   setEnvSnapshot()        — compute + store snapshot for a growspace (called by
 *                             SyncService on every hass update)
 *   setSubareaEnvSnapshot() — compute + store snapshot for a subarea (called by
 *                             SyncService alongside the growspace snapshots)
 *
 * Public API (pure computation):
 *   computeEnvSnapshot()        — derive an EnvSnapshot from a device + hass states
 *                                 snapshot. Exported so HeaderMetrics and tests can
 *                                 call it directly.
 *   computeSubareaEnvSnapshot() — derive an EnvSnapshot from a subarea's
 *                                 environment_config + hass states snapshot.
 *
 * Internally the two compute functions are thin entity-resolution adapters over a
 * shared read-and-aggregate core (ADR-0018): the growspace adapter resolves entity
 * IDs from the device slug / overview entity (with the growspace calculated-VPD
 * fallback chain), while the subarea adapter resolves directly from the subarea's
 * environment_config sensor lists (with the per-temp/hum-pair subarea
 * calculated-VPD resolution).
 *
 * Action type, payload shapes, and zod schemas are private to this module.
 */

import { atom } from 'nanostores';
import type { HassEntity } from 'home-assistant-js-websocket';
import type { GrowspaceDevice } from '../../services/types';
import type { Subarea } from '../subarea/schema';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Per-sensor readings for a multi-entity metric.
 *
 * null top-level means "not configured" (no sensor IDs defined for this metric).
 * avg === null with non-empty entityIds means all configured sensors are unavailable.
 * perSensor is parallel to entityIds; null entries mark individual unavailable sensors.
 * sum is the total of all available sensors (null when none are available).
 */
export interface SensorReadings {
  avg: number | null;
  sum: number | null;
  perSensor: (number | null)[];
  entityIds: string[];
}

export interface EnvSnapshot {
  temperature: number | null;
  humidity: number | null;
  vpd: number | null;
  vpdStatus: 'optimal' | 'warning' | 'danger' | null;
  co2: number | null;
  /**
   * Per-sensor readings behind the hero metrics. Populated by the subarea
   * adapter (explicit sensor lists; resolved calculated-VPD entity IDs land in
   * vpdReadings.entityIds). Null from the growspace adapter, whose hero values
   * are backend-aggregated scalars without per-sensor breakdowns.
   */
  temperatureReadings: SensorReadings | null;
  humidityReadings: SensorReadings | null;
  vpdReadings: SensorReadings | null;
  co2Readings: SensorReadings | null;
  isLightsOn: boolean | null;
  hasLightSensor: boolean;
  dli: number | null;
  optimalConditions: { isOptimal: boolean; reasons: string[] } | null;
  // Substrate / medium sensors (Monitoring tab)
  soilMoisture: SensorReadings | null;
  substrateTemperature: SensorReadings | null;
  // Irrigation monitoring sensors (Irrigation tab)
  ph: SensorReadings | null;
  feedEc: SensorReadings | null;
  bulkEc: SensorReadings | null;
  poreEc: SensorReadings | null;
  runoffEc: SensorReadings | null;
  drainVolume: SensorReadings | null;
  irrigationFlow: SensorReadings | null;
  power: SensorReadings | null;
  energy: SensorReadings | null;
}

type HassStates = Record<string, HassEntity>;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const UNAVAILABLE_STATES = new Set(['unavailable', 'unknown']);

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Convert device name to slug (e.g. "Tent 1" → "tent_1"). */
function _slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^\w-]+/g, '')
    .replace(/[_-]+/g, '_')
    .replace(/^[_-]+/, '')
    .replace(/[_-]+$/, '');
}

/** Resolve the slug used for entity ID construction. */
function _resolveSlug(device: GrowspaceDevice): string {
  if (device.overviewEntityId) {
    return device.overviewEntityId.replace('sensor.', '').replace(/_overview$/, '');
  }
  return _slugify(device.name);
}

/** Return the env entity ID for the device type. */
function _envEntityId(slug: string, deviceType: GrowspaceDevice['type']): string {
  if (deviceType === 'cure') return 'binary_sensor.cure_optimal_curing';
  if (deviceType === 'dry') return 'binary_sensor.dry_optimal_drying';
  return `binary_sensor.${slug}_optimal_conditions`;
}

/** Read a numeric attribute from an entity, returning null if absent or NaN. */
function _numAttr(entity: HassEntity | undefined, key: string): number | null {
  if (!entity) return null;
  const val = entity.attributes[key];
  if (val === undefined || val === null) return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

/** Parse a hass entity state as a float, returning null if unavailable/unknown/NaN. */
function _parseState(entity: HassEntity | undefined): number | null {
  if (!entity) return null;
  if (UNAVAILABLE_STATES.has(entity.state)) return null;
  const n = parseFloat(entity.state);
  return isNaN(n) ? null : n;
}

/** Resolve a metric using the two-tier fallback chain: attribute → sensor entity. */
function _resolveFromSensor(
  attrValue: number | null,
  sensorId: string | undefined,
  hassStates: HassStates
): number | null {
  if (attrValue !== null) return attrValue;
  if (sensorId) {
    const val = _parseState(hassStates[sensorId]);
    if (val !== null) return val;
  }
  return null;
}

/** Resolve VPD using the three-tier fallback chain. */
function _resolveVpd(
  envEntity: HassEntity | undefined,
  device: GrowspaceDevice,
  slug: string,
  hassStates: HassStates
): number | null {
  // 1. From env entity attributes
  const fromAttrs = _numAttr(envEntity, 'vpd');
  if (fromAttrs !== null) return fromAttrs;

  // 2. From envAttrs.vpdSensor
  const vpdSensorId = device.environmentAttributes?.vpdSensor;
  if (vpdSensorId) {
    const val = _parseState(hassStates[vpdSensorId]);
    if (val !== null) return val;
  }

  // 3a. Calculated VPD — name-slug ID
  const calcNameSlug = _slugify(`${device.name} Calculated VPD`);
  const calcNameId = `sensor.${calcNameSlug}`;
  const fromNameSlug = _parseState(hassStates[calcNameId]);
  if (fromNameSlug !== null) return fromNameSlug;

  // 3b. Calculated VPD — UUID-based legacy ID
  const calcUuidId = `sensor.${device.deviceId}_calculated_vpd`;
  const fromUuid = _parseState(hassStates[calcUuidId]);
  if (fromUuid !== null) return fromUuid;

  return null;
}

/** Resolve a multi-or-single sensor config field into an explicit entity ID list. */
function _idList(single: string | null | undefined, multi: string[] | undefined): string[] {
  if (multi && multi.length > 0) return [...multi];
  if (single) return [single];
  return [];
}

/**
 * Shared read-and-aggregate core (ADR-0018): explicit sensor entity IDs →
 * SensorReadings. Both the growspace and subarea adapters resolve their own
 * entity IDs and feed them through here.
 * Returns null when no IDs are configured (metric not set up by the user).
 */
function _aggregate(ids: string[], hassStates: HassStates): SensorReadings | null {
  if (ids.length === 0) return null;

  const perSensor: (number | null)[] = ids.map((id) => _parseState(hassStates[id]));
  const defined = perSensor.filter((v): v is number => v !== null);
  const total = defined.length > 0 ? defined.reduce((a, b) => a + b, 0) : null;
  const avg = total !== null ? total / defined.length : null;

  return { avg, sum: total, perSensor, entityIds: ids };
}

/**
 * Read a multi-or-single sensor config field and return a SensorReadings object.
 * Returns null when no IDs are configured (metric not set up by the user).
 */
function _resolveSensors(
  single: string | undefined,
  multi: string[] | undefined,
  hassStates: HassStates
): SensorReadings | null {
  return _aggregate(_idList(single, multi), hassStates);
}

/** Derive VPD status from overview entity or threshold comparison. */
function _resolveVpdStatus(
  vpd: number | null,
  overviewEntity: HassEntity | undefined
): EnvSnapshot['vpdStatus'] {
  // VPD attributes are nested under attributes.metrics in the overview entity.
  // Fall back to flat attributes for forward/backward compatibility.
  const m = overviewEntity?.attributes?.metrics as Record<string, unknown> | undefined;

  // 1. Prefer the backend-computed status (already stage+cycle-aware)
  const fromEntity = m?.vpd_status ?? overviewEntity?.attributes?.vpd_status;
  if (fromEntity && fromEntity !== 'unknown') {
    const s = String(fromEntity);
    if (s === 'optimal' || s === 'warning' || s === 'danger') return s;
  }

  // 2. Derive from thresholds when vpd is known
  // vpd_target_min/max and vpd_danger_min/max in metrics are already
  // the current-period (day or night) values computed by the backend.
  if (vpd === null) return null;

  const targetMin = m?.vpd_target_min ?? overviewEntity?.attributes?.vpd_target_min;
  const targetMax = m?.vpd_target_max ?? overviewEntity?.attributes?.vpd_target_max;
  const dangerMin = m?.vpd_danger_min ?? overviewEntity?.attributes?.vpd_danger_min;
  const dangerMax = m?.vpd_danger_max ?? overviewEntity?.attributes?.vpd_danger_max;

  if (
    targetMin === undefined ||
    targetMax === undefined ||
    dangerMin === undefined ||
    dangerMax === undefined
  ) {
    return null;
  }

  if (vpd < Number(dangerMin) || vpd > Number(dangerMax)) return 'danger';
  if (vpd < Number(targetMin) || vpd > Number(targetMax)) return 'warning';
  return 'optimal';
}

// ---------------------------------------------------------------------------
// Pure computation (exported — used by HeaderMetrics and tests)
// ---------------------------------------------------------------------------

/**
 * Derive a normalized EnvSnapshot for a growspace from the current hass states.
 *
 * This is the canonical place to read environmental sensor data from hass.states.
 * All downstream consumers (HeaderMetrics, cards) should subscribe to the atom
 * instead of calling this directly.
 */
export function computeEnvSnapshot(device: GrowspaceDevice, hassStates: HassStates): EnvSnapshot {
  const slug = _resolveSlug(device);
  const isSpecial = device.type === 'cure' || device.type === 'dry';

  const envEntityId = _envEntityId(slug, device.type);
  const envEntity = hassStates[envEntityId];

  const overviewEntity = device.overviewEntityId ? hassStates[device.overviewEntityId] : undefined;

  // Core readings
  const envAttrs = device.environmentAttributes;
  const temperature = _resolveFromSensor(
    _numAttr(envEntity, 'temperature'),
    envAttrs?.temperatureSensor,
    hassStates
  );
  const humidity = _resolveFromSensor(
    _numAttr(envEntity, 'humidity'),
    envAttrs?.humiditySensor,
    hassStates
  );
  const vpd = _resolveVpd(envEntity, device, slug, hassStates);
  const vpdStatus = _resolveVpdStatus(vpd, overviewEntity);

  // co2 — absent for cure/dry spaces; falls back to co2Sensor when attribute is missing
  const co2Raw = _resolveFromSensor(_numAttr(envEntity, 'co2'), envAttrs?.co2Sensor, hassStates);
  const co2 = isSpecial ? null : co2Raw;

  // Lights
  const isLightsOnRaw = envEntity?.attributes?.is_lights_on;
  const hasLightSensor = isLightsOnRaw !== undefined && isLightsOnRaw !== null;
  const isLightsOn = hasLightSensor ? isLightsOnRaw === true : null;

  // DLI
  const dliEntityId = `sensor.${slug}_dli`;
  const dli = _parseState(hassStates[dliEntityId]);

  // Optimal conditions — envEntity IS the binary_sensor.${slug}_optimal_conditions entity
  const optimalConditions = envEntity
    ? {
        isOptimal: envEntity.state === 'on',
        reasons: Array.isArray(envEntity.attributes.reasons) ? envEntity.attributes.reasons : [],
      }
    : null;

  // Substrate / medium sensors
  const soilMoisture = _resolveSensors(
    envAttrs?.soilMoistureSensor,
    envAttrs?.soilMoistureSensors,
    hassStates
  );
  const substrateTemperature = _resolveSensors(
    undefined,
    envAttrs?.substrateTemperatureSensors,
    hassStates
  );

  // Irrigation monitoring sensors
  const ph = _resolveSensors(undefined, envAttrs?.phSensors, hassStates);
  const feedEc = _resolveSensors(undefined, envAttrs?.feedEcSensors, hassStates);
  const bulkEc = _resolveSensors(undefined, envAttrs?.bulkEcSensors, hassStates);
  const poreEc = _resolveSensors(undefined, envAttrs?.poreEcSensors, hassStates);
  const runoffEc = _resolveSensors(undefined, envAttrs?.runoffEcSensors, hassStates);
  const drainVolume = _resolveSensors(undefined, envAttrs?.drainVolumeSensors, hassStates);
  const irrigationFlow = _resolveSensors(undefined, envAttrs?.irrigationFlowSensors, hassStates);
  const power = _resolveSensors(undefined, envAttrs?.powerSensors, hassStates);
  const energy = _resolveSensors(undefined, envAttrs?.energySensors, hassStates);

  return {
    temperature,
    humidity,
    vpd,
    vpdStatus,
    co2,
    // Growspace hero values are backend-aggregated scalars — no per-sensor
    // readings to expose (the subarea adapter populates these).
    temperatureReadings: null,
    humidityReadings: null,
    vpdReadings: null,
    co2Readings: null,
    isLightsOn,
    hasLightSensor,
    dli,
    optimalConditions,
    soilMoisture,
    substrateTemperature,
    ph,
    feedEc,
    bulkEc,
    poreEc,
    runoffEc,
    drainVolume,
    irrigationFlow,
    power,
    energy,
  };
}

// ---------------------------------------------------------------------------
// Subarea adapter (exported — used by SyncService, the subarea card, and tests)
// ---------------------------------------------------------------------------

/**
 * Parent growspace context for subarea calculated-VPD entity resolution.
 * Either field may be missing (e.g. before the device list has loaded) — the
 * resolution then falls back to whichever ID pattern is still constructible.
 */
export interface SubareaParentContext {
  growspaceId?: string;
  growspaceName?: string;
}

/**
 * Resolve the VPD entity IDs for a subarea, one per temperature/humidity pair.
 *
 * For pair i: an explicitly configured VPD sensor wins unless it is itself a
 * calculated_vpd entity; otherwise resolve the backend-created calculated-VPD
 * sensor — name-based `sensor.{growspace} {subarea} calculated vpd[ i+1]`
 * (slugified) preferred when available, UUID-based
 * `sensor.growspace_manager_{gsId}_subarea_{subId}_calculated_vpd[_i]` as the
 * legacy fallback. When neither entity is available the constructible ID is
 * still returned so history fetching keys stay stable.
 */
function _resolveSubareaVpdIds(
  subarea: Subarea,
  parent: SubareaParentContext,
  tempIds: string[],
  humIds: string[],
  hassStates: HassStates
): string[] {
  const ec = subarea.environment_config;
  const explicit = _idList(ec.vpd_sensor, ec.vpd_sensors);

  const numPairs = Math.min(tempIds.length, humIds.length);
  if (numPairs === 0) return explicit;

  const isAvailable = (id: string): boolean => {
    const entity = hassStates[id];
    return entity !== undefined && !UNAVAILABLE_STATES.has(entity.state);
  };

  const resolved: string[] = [];
  for (let i = 0; i < numPairs; i++) {
    const existingVpd = explicit[i];
    if (existingVpd && !existingVpd.includes('calculated_vpd')) {
      resolved.push(existingVpd);
      continue;
    }

    const index = numPairs > 1 ? i : null;
    const nameSuffix = index !== null ? ` ${index + 1}` : '';
    const uuidSuffix = index !== null ? `_${index}` : '';

    const nameId =
      parent.growspaceName && subarea.name
        ? `sensor.${_slugify(`${parent.growspaceName} ${subarea.name} Calculated VPD${nameSuffix}`)}`
        : '';
    const uuidId =
      parent.growspaceId && subarea.id
        ? `sensor.growspace_manager_${parent.growspaceId}_subarea_${subarea.id}_calculated_vpd${uuidSuffix}`
        : '';

    if (nameId && isAvailable(nameId)) resolved.push(nameId);
    else if (uuidId && isAvailable(uuidId)) resolved.push(uuidId);
    else if (nameId || uuidId) resolved.push(nameId || uuidId);
  }
  return resolved;
}

/**
 * Derive a normalized EnvSnapshot for a subarea from the current hass states.
 *
 * Thin entity-resolution adapter over the shared aggregation core: entity IDs
 * come directly from the subarea's environment_config sensor lists (plus the
 * per-temp/hum-pair calculated-VPD resolution). Fields without configured
 * sensors are null — including everything only a growspace has (lights, DLI,
 * optimal conditions, VPD status from the overview entity).
 */
export function computeSubareaEnvSnapshot(
  subarea: Subarea,
  parent: SubareaParentContext,
  hassStates: HassStates
): EnvSnapshot {
  const ec = subarea.environment_config;

  const tempIds = _idList(ec.temperature_sensor, ec.temperature_sensors);
  const humIds = _idList(ec.humidity_sensor, ec.humidity_sensors);
  const vpdIds = _resolveSubareaVpdIds(subarea, parent, tempIds, humIds, hassStates);

  const temperatureReadings = _aggregate(tempIds, hassStates);
  const humidityReadings = _aggregate(humIds, hassStates);
  const vpdReadings = _aggregate(vpdIds, hassStates);
  const co2Readings = _aggregate(_idList(ec.co2_sensor, undefined), hassStates);

  return {
    temperature: temperatureReadings?.avg ?? null,
    humidity: humidityReadings?.avg ?? null,
    vpd: vpdReadings?.avg ?? null,
    vpdStatus: null,
    co2: co2Readings?.avg ?? null,
    temperatureReadings,
    humidityReadings,
    vpdReadings,
    co2Readings,
    isLightsOn: null,
    hasLightSensor: false,
    dli: null,
    optimalConditions: null,
    soilMoisture: _aggregate(_idList(ec.soil_moisture_sensor, undefined), hassStates),
    substrateTemperature: _aggregate(ec.substrate_temperature_sensors ?? [], hassStates),
    ph: _aggregate(ec.ph_sensors ?? [], hassStates),
    feedEc: _aggregate(ec.feed_ec_sensors ?? [], hassStates),
    bulkEc: _aggregate(ec.bulk_ec_sensors ?? [], hassStates),
    poreEc: _aggregate(ec.pore_ec_sensors ?? [], hassStates),
    runoffEc: _aggregate(ec.runoff_ec_sensors ?? [], hassStates),
    drainVolume: _aggregate(ec.drain_volume_sensors ?? [], hassStates),
    irrigationFlow: _aggregate(ec.irrigation_flow_sensors ?? [], hassStates),
    power: _aggregate(ec.power_sensors ?? [], hassStates),
    energy: _aggregate(ec.energy_sensors ?? [], hassStates),
  };
}

/**
 * All entity IDs referenced by a snapshot's SensorReadings fields.
 * Used by SyncService to register watched entities for subarea snapshots.
 */
export function envSnapshotEntityIds(snapshot: EnvSnapshot): string[] {
  const readings = [
    snapshot.temperatureReadings,
    snapshot.humidityReadings,
    snapshot.vpdReadings,
    snapshot.co2Readings,
    snapshot.soilMoisture,
    snapshot.substrateTemperature,
    snapshot.ph,
    snapshot.feedEc,
    snapshot.bulkEc,
    snapshot.poreEc,
    snapshot.runoffEc,
    snapshot.drainVolume,
    snapshot.irrigationFlow,
    snapshot.power,
    snapshot.energy,
  ];
  return readings.flatMap((r) => r?.entityIds ?? []);
}

// ---------------------------------------------------------------------------
// Atoms (public)
// ---------------------------------------------------------------------------

/** Per-growspace env snapshots — keyed by growspaceId. */
export const envSnapshots$ = atom<Map<string, EnvSnapshot>>(new Map());

/** Per-subarea env snapshots — keyed by subareaId. */
export const subareaEnvSnapshots$ = atom<Map<string, EnvSnapshot>>(new Map());

// ---------------------------------------------------------------------------
// Bootstrap writes (public)
// ---------------------------------------------------------------------------

/**
 * Compute and store the EnvSnapshot for a growspace.
 * Called by SyncService after each hass update.
 */
export function setEnvSnapshot(
  growspaceId: string,
  device: GrowspaceDevice,
  hassStates: HassStates
): void {
  const snapshot = computeEnvSnapshot(device, hassStates);
  const updated = new Map(envSnapshots$.get());
  updated.set(growspaceId, snapshot);
  envSnapshots$.set(updated);
}

/**
 * Compute and store the EnvSnapshot for a subarea.
 * Called by SyncService alongside the growspace snapshots, and by the subarea
 * card once after it has loaded its subarea (bootstrap seed).
 */
export function setSubareaEnvSnapshot(
  subareaId: string,
  subarea: Subarea,
  parent: SubareaParentContext,
  hassStates: HassStates
): void {
  const snapshot = computeSubareaEnvSnapshot(subarea, parent, hassStates);
  const updated = new Map(subareaEnvSnapshots$.get());
  updated.set(subareaId, snapshot);
  subareaEnvSnapshots$.set(updated);
}
