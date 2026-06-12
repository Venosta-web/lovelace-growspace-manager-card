/**
 * Environment slice — the single place in the codebase that reads hass.states
 * for environmental sensors and exposes normalized EnvSnapshot atoms.
 *
 * Public API (atoms):
 *   envSnapshots$        — read: Map<growspaceId, EnvSnapshot> (one entry per growspace)
 *   subareaEnvSnapshots$ — read: Map<`${growspaceId}:${subareaId}`, EnvSnapshot>
 *                          (one entry per subarea)
 *
 * Public API (bootstrap writes):
 *   setEnvSnapshot()        — compute + store snapshot for a growspace (called by
 *                             SyncService on every hass update)
 *   setSubareaEnvSnapshot() — compute + store snapshot for a subarea (called by
 *                             SyncService in the same pass)
 *
 * Public API (pure computation):
 *   computeEnvSnapshot()        — derive an EnvSnapshot from a device + hass states snapshot.
 *                                 Exported so HeaderMetrics and tests can call it directly.
 *   computeSubareaEnvSnapshot() — derive an EnvSnapshot from a subarea's own
 *                                 environment_config + hass states snapshot.
 *
 * Action type, payload shapes, and zod schemas are private to this module.
 */

import { atom } from 'nanostores';
import type { HassEntity } from 'home-assistant-js-websocket';
import type { GrowspaceDevice, Subarea } from '../../services/types';

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

/**
 * Resolve VPD using the three-tier fallback chain:
 * env entity attribute → explicit VPD sensor → calculated-VPD candidate entity
 * IDs (first available wins).
 *
 * Callers supply the calculated-VPD candidate IDs so the same chain serves both
 * growspace-scoped (name-slug / device-UUID IDs) and subarea-scoped
 * (growspace+subarea name-slug / UUID IDs) resolution.
 */
function _resolveVpd(
  envEntity: HassEntity | undefined,
  vpdSensorId: string | undefined,
  calculatedVpdIds: string[],
  hassStates: HassStates
): number | null {
  // 1. From env entity attributes
  const fromAttrs = _numAttr(envEntity, 'vpd');
  if (fromAttrs !== null) return fromAttrs;

  // 2. From the explicitly configured VPD sensor
  if (vpdSensorId) {
    const val = _parseState(hassStates[vpdSensorId]);
    if (val !== null) return val;
  }

  // 3. Calculated-VPD candidates, in priority order
  for (const id of calculatedVpdIds) {
    const val = _parseState(hassStates[id]);
    if (val !== null) return val;
  }

  return null;
}

/**
 * Build the calculated-VPD candidate entity IDs for a subarea, mirroring the
 * backend's naming: a friendly-name slug ID first, then the UUID-based legacy ID.
 *
 * pairIndex is non-null when the subarea has multiple temperature/humidity
 * sensor pairs — each pair gets its own suffixed calculated-VPD entity
 * (" 2" in the friendly name, "_1" in the UUID form for the second pair).
 */
function _subareaCalculatedVpdIds(
  subarea: Subarea,
  growspace: { id?: string; name?: string } | undefined,
  pairIndex: number | null
): string[] {
  const nameSuffix = pairIndex !== null ? ` ${pairIndex + 1}` : '';
  const uuidSuffix = pairIndex !== null ? `_${pairIndex}` : '';

  const ids: string[] = [];
  if (growspace?.name && subarea.name) {
    ids.push(`sensor.${_slugify(`${growspace.name} ${subarea.name} Calculated VPD${nameSuffix}`)}`);
  }
  if (growspace?.id) {
    ids.push(
      `sensor.growspace_manager_${growspace.id}_subarea_${subarea.id}_calculated_vpd${uuidSuffix}`
    );
  }
  return ids;
}

/**
 * Read a list of sensor entity IDs and return a SensorReadings object.
 * Returns null when no IDs are configured (metric not set up by the user).
 */
function _resolveSensors(
  single: string | undefined,
  multi: string[] | undefined,
  hassStates: HassStates
): SensorReadings | null {
  const ids: string[] = [];
  if (multi && multi.length > 0) ids.push(...multi);
  else if (single) ids.push(single);
  if (ids.length === 0) return null;

  const perSensor: (number | null)[] = ids.map((id) => _parseState(hassStates[id]));
  const defined = perSensor.filter((v): v is number => v !== null);
  const total = defined.length > 0 ? defined.reduce((a, b) => a + b, 0) : null;
  const avg = total !== null ? total / defined.length : null;

  return { avg, sum: total, perSensor, entityIds: ids };
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
  const vpd = _resolveVpd(
    envEntity,
    envAttrs?.vpdSensor,
    [
      `sensor.${_slugify(`${device.name} Calculated VPD`)}`,
      `sensor.${device.deviceId}_calculated_vpd`,
    ],
    hassStates
  );
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

/**
 * Derive a normalized EnvSnapshot for a subarea from its own environment_config.
 *
 * Returns the same EnvSnapshot shape as computeEnvSnapshot so downstream
 * chip-building code can treat growspace- and subarea-scoped snapshots
 * uniformly. Fields with no subarea-scope equivalent (lights, DLI, optimal
 * conditions, growspace-only sensor lists) resolve to null/false.
 *
 * VPD mirrors the legacy MetricsUtils.computeSubareaMetrics resolution: one
 * reading per temperature/humidity sensor pair, where an explicitly configured
 * (non-calculated) VPD sensor wins and calculated-VPD entities — resolved from
 * the growspace/subarea names and IDs in `growspace` — fill the gaps.
 *
 * @param growspace - parent growspace identity used to resolve calculated-VPD
 *                    entity IDs; without it only explicit VPD sensors resolve.
 */
export function computeSubareaEnvSnapshot(
  subarea: Subarea,
  hassStates: HassStates,
  growspace?: { id?: string; name?: string }
): EnvSnapshot {
  const ec = subarea.environment_config;

  const temperatureReadings = _resolveSensors(
    ec.temperature_sensor ?? undefined,
    ec.temperature_sensors,
    hassStates
  );
  const humidityReadings = _resolveSensors(
    ec.humidity_sensor ?? undefined,
    ec.humidity_sensors,
    hassStates
  );
  const temperature = temperatureReadings?.avg ?? null;
  const humidity = humidityReadings?.avg ?? null;

  // VPD — one reading per temperature/humidity sensor pair
  const tempIds = temperatureReadings?.entityIds ?? [];
  const humIds = humidityReadings?.entityIds ?? [];
  const explicitVpdIds: string[] = [];
  if (ec.vpd_sensors && ec.vpd_sensors.length > 0) explicitVpdIds.push(...ec.vpd_sensors);
  else if (ec.vpd_sensor) explicitVpdIds.push(ec.vpd_sensor);

  const numPairs = Math.min(tempIds.length, humIds.length);
  let vpd: number | null = null;
  if (numPairs > 0) {
    const pairValues: number[] = [];
    for (let i = 0; i < numPairs; i++) {
      const explicit = explicitVpdIds[i];
      // Stale calculated-VPD IDs stored in config are ignored and re-resolved
      const value =
        explicit && !explicit.includes('calculated_vpd')
          ? _resolveVpd(undefined, explicit, [], hassStates)
          : _resolveVpd(
              undefined,
              undefined,
              _subareaCalculatedVpdIds(subarea, growspace, numPairs > 1 ? i : null),
              hassStates
            );
      if (value !== null) pairValues.push(value);
    }
    vpd = pairValues.length > 0 ? pairValues.reduce((a, b) => a + b, 0) / pairValues.length : null;
  } else {
    vpd = _resolveSensors(ec.vpd_sensor ?? undefined, ec.vpd_sensors, hassStates)?.avg ?? null;
  }

  // No overview entity at subarea scope — thresholds are unavailable, so this
  // resolves to null until the backend exposes subarea-level VPD targets.
  const vpdStatus = _resolveVpdStatus(vpd, undefined);

  const co2 = _resolveFromSensor(null, ec.co2_sensor ?? undefined, hassStates);

  return {
    temperature,
    humidity,
    vpd,
    vpdStatus,
    co2,
    // Not applicable at subarea scope
    isLightsOn: null,
    hasLightSensor: false,
    dli: null,
    optimalConditions: null,
    soilMoisture: null,
    // Subarea-configured secondary sensors
    substrateTemperature: _resolveSensors(undefined, ec.substrate_temperature_sensors, hassStates),
    ph: _resolveSensors(undefined, ec.ph_sensors, hassStates),
    feedEc: _resolveSensors(undefined, ec.feed_ec_sensors, hassStates),
    bulkEc: _resolveSensors(undefined, ec.bulk_ec_sensors, hassStates),
    poreEc: _resolveSensors(undefined, ec.pore_ec_sensors, hassStates),
    // Not configurable per subarea
    runoffEc: null,
    drainVolume: null,
    irrigationFlow: null,
    power: null,
    energy: null,
  };
}

// ---------------------------------------------------------------------------
// Atoms (public)
// ---------------------------------------------------------------------------

/** Per-growspace env snapshots — keyed by growspaceId. */
export const envSnapshots$ = atom<Map<string, EnvSnapshot>>(new Map());

/** Per-subarea env snapshots — keyed by `${growspaceId}:${subareaId}`. */
export const subareaEnvSnapshots$ = atom<Map<string, EnvSnapshot>>(new Map());

// ---------------------------------------------------------------------------
// Bootstrap write (public)
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
 * Called by SyncService in the same pass as setEnvSnapshot.
 *
 * @param growspaceName - parent growspace display name, needed to resolve
 *                        friendly-name-based calculated-VPD entity IDs.
 */
export function setSubareaEnvSnapshot(
  growspaceId: string,
  subarea: Subarea,
  hassStates: HassStates,
  growspaceName?: string
): void {
  const snapshot = computeSubareaEnvSnapshot(subarea, hassStates, {
    id: growspaceId,
    name: growspaceName,
  });
  const updated = new Map(subareaEnvSnapshots$.get());
  updated.set(`${growspaceId}:${subarea.id}`, snapshot);
  subareaEnvSnapshots$.set(updated);
}
