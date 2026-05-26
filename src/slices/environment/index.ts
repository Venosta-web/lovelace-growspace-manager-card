/**
 * Environment slice — the single place in the codebase that reads hass.states
 * for environmental sensors and exposes normalized EnvSnapshot atoms.
 *
 * Public API (atoms):
 *   envSnapshots$     — read: Map<growspaceId, EnvSnapshot> (one entry per growspace)
 *
 * Public API (bootstrap writes):
 *   setEnvSnapshot()  — compute + store snapshot for a growspace (called by SyncService
 *                       on every hass update)
 *
 * Public API (pure computation):
 *   computeEnvSnapshot() — derive an EnvSnapshot from a device + hass states snapshot.
 *                          Exported so HeaderMetrics and tests can call it directly.
 *
 * Action type, payload shapes, and zod schemas are private to this module.
 */

import { atom } from 'nanostores';
import type { HassEntity } from 'home-assistant-js-websocket';
import type { GrowspaceDevice } from '../../services/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

/** Derive VPD status from overview entity or threshold comparison. */
function _resolveVpdStatus(
  vpd: number | null,
  overviewEntity: HassEntity | undefined
): EnvSnapshot['vpdStatus'] {
  // 1. Prefer the backend-computed status from the overview entity
  const fromEntity = overviewEntity?.attributes?.vpd_status;
  if (fromEntity && fromEntity !== 'unknown') {
    const s = String(fromEntity);
    if (s === 'optimal' || s === 'warning' || s === 'danger') return s;
  }

  // 2. Derive from thresholds when vpd is known
  if (vpd === null) return null;

  const targetMin = overviewEntity?.attributes?.vpd_target_min;
  const targetMax = overviewEntity?.attributes?.vpd_target_max;
  const dangerMin = overviewEntity?.attributes?.vpd_danger_min;
  const dangerMax = overviewEntity?.attributes?.vpd_danger_max;

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
  };
}

// ---------------------------------------------------------------------------
// Atoms (public)
// ---------------------------------------------------------------------------

/** Per-growspace env snapshots — keyed by growspaceId. */
export const envSnapshots$ = atom<Map<string, EnvSnapshot>>(new Map());

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
