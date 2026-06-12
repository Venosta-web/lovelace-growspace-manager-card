/**
 * DeviceState slice — the single place in the codebase that reads hass.states
 * for device-controlled entities and exposes normalized DeviceSnapshot atoms.
 *
 * Public API (atoms):
 *   deviceSnapshots$        — read: Map<growspaceId, DeviceSnapshot> (one entry per growspace)
 *   subareaDeviceSnapshots$ — read: Map<subareaId, DeviceSnapshot> (one entry per subarea)
 *
 * Public API (bootstrap writes):
 *   setDeviceSnapshot()        — compute + store snapshot for a growspace (called by
 *                                SyncService on every hass update)
 *   setSubareaDeviceSnapshot() — compute + store snapshot for a subarea (called by
 *                                SyncService alongside the growspace snapshots)
 *
 * Public API (pure computation):
 *   computeDeviceSnapshot()        — derive a DeviceSnapshot from a device + hass states
 *                                    snapshot. Exported so HeaderMetrics and tests can
 *                                    call it directly.
 *   computeSubareaDeviceSnapshot() — derive a DeviceSnapshot from a subarea's
 *                                    environment_config device lists + hass states.
 *
 * Internally the two compute functions are thin entity-resolution adapters over a
 * shared snapshot-building core (ADR-0018): the growspace adapter resolves entity
 * IDs from the device's environmentAttributes (with the singular-field fallbacks),
 * while the subarea adapter resolves directly from the subarea's environment_config
 * device lists. Fan Entity Mode detection (ADR-0008) lives in the shared normalizers.
 */

import { atom } from 'nanostores';
import { mdiLightbulbOn, mdiFan, mdiAirHumidifier, mdiAirHumidifierOff } from '@mdi/js';
import type { HassEntity } from 'home-assistant-js-websocket';
import type { GrowspaceDevice } from '../../services/types';
import type { Subarea } from '../subarea/schema';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Normalized state for a single category of device-controlled entities. */
export interface DeviceEntry {
  /** Entity IDs that belong to this device category. */
  entityIds: string[];
  /**
   * Aggregated display value:
   *   - Single entity: "On", "Off", a percentage string (e.g. "70%"), or undefined when unavailable.
   *   - Multiple entities: "Multiple" (individual values are in multiValues).
   */
  value: string | undefined;
  /** Per-entity formatted values — present only when there are multiple entities. */
  multiValues?: string[];
  /** MDI icon path for this device category. */
  icon: string;
}

/** All device-controlled entity states for one growspace. */
export interface DeviceSnapshot {
  lightSensors: DeviceEntry | null;
  exhaustFans: DeviceEntry | null;
  circulationFans: DeviceEntry | null;
  humidifiers: DeviceEntry | null;
  dehumidifiers: DeviceEntry | null;
}

type HassStates = Record<string, HassEntity>;

// ---------------------------------------------------------------------------
// Internal constants
// ---------------------------------------------------------------------------

const UNAVAILABLE_STATES = new Set(['unavailable', 'unknown']);

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Normalize a light sensor entity state.
 * - If `unit_of_measurement` is `%`: return a rounded percentage string.
 * - Otherwise: return "On" / "Off" for binary states.
 */
function _normalizeLightSensor(entity: HassEntity | undefined): string | undefined {
  if (!entity) return undefined;
  if (UNAVAILABLE_STATES.has(entity.state)) return undefined;
  const unit = entity.attributes?.unit_of_measurement;
  if (unit === '%') {
    const n = parseFloat(entity.state);
    return isNaN(n) ? undefined : `${Math.round(n)}%`;
  }
  if (entity.state === 'on') return 'On';
  if (entity.state === 'off') return 'Off';
  const n = parseFloat(entity.state);
  if (!isNaN(n)) return String(Math.round(n));
  return undefined;
}

/** Normalize an on/off device entity state to "On", "Off", or undefined. */
function _normalizeOnOff(entity: HassEntity | undefined): string | undefined {
  if (!entity) return undefined;
  if (UNAVAILABLE_STATES.has(entity.state)) return undefined;
  if (entity.state === 'on') return 'On';
  if (entity.state === 'off') return 'Off';
  const n = parseFloat(entity.state);
  if (!isNaN(n)) return n > 0 ? 'On' : 'Off';
  return undefined;
}

/**
 * Normalize a fan entity state for chip display.
 *
 * Three Fan Entity Modes (see ADR-0008):
 *   - HA fan entity (fan.* domain): read attributes.percentage → "70%" or "Off"
 *   - Speed sensor (numeric state, non-fan domain): show raw integer string "5"
 *   - Binary (switch / input_boolean): "On" / "Off"
 */
function _normalizeFanDevice(entity: HassEntity | undefined, entityId: string): string | undefined {
  if (!entity) return undefined;
  if (UNAVAILABLE_STATES.has(entity.state)) return undefined;

  const isFanDomain = entityId.startsWith('fan.');
  if (isFanDomain) {
    if (entity.state === 'off') return 'Off';
    const pct = entity.attributes?.percentage;
    return pct != null ? `${Math.round(Number(pct))}%` : 'On';
  }

  const numVal = parseFloat(entity.state);
  if (!isNaN(numVal)) {
    const domain = entityId.split('.')[0];
    const isBinaryDomain = ['switch', 'input_boolean', 'binary_sensor'].includes(domain);
    if (!isBinaryDomain) return String(Math.round(numVal));
    return numVal > 0 ? 'On' : 'Off';
  }

  if (entity.state === 'on') return 'On';
  if (entity.state === 'off') return 'Off';
  return undefined;
}

/**
 * Build a DeviceEntry for a list of entity IDs using the given normalizer.
 * Returns null when the entity list is empty (device category not configured).
 */
function _buildEntry(
  entityIds: string[],
  hassStates: HassStates,
  icon: string,
  normalizer: (entity: HassEntity | undefined, entityId: string) => string | undefined
): DeviceEntry | null {
  if (entityIds.length === 0) return null;

  if (entityIds.length === 1) {
    const value = normalizer(hassStates[entityIds[0]], entityIds[0]);
    return { entityIds, value, icon };
  }

  // Multiple entities: collect individual values; surface "Multiple" as the aggregate.
  const multiValues = entityIds
    .map((id) => normalizer(hassStates[id], id))
    .filter((v): v is string => v !== undefined);

  return {
    entityIds,
    value: 'Multiple',
    multiValues: multiValues.length > 0 ? multiValues : undefined,
    icon,
  };
}

/** Explicit per-category entity ID lists — the shared core's only input shape. */
interface DeviceEntityIds {
  lightIds: string[];
  exhaustIds: string[];
  circulationIds: string[];
  humidifierIds: string[];
  dehumidifierIds: string[];
}

/**
 * Shared snapshot-building core (ADR-0018): explicit device entity ID lists →
 * DeviceSnapshot. Both the growspace and subarea adapters resolve their own
 * entity IDs and feed them through here.
 */
function _buildSnapshot(ids: DeviceEntityIds, hassStates: HassStates): DeviceSnapshot {
  return {
    lightSensors: _buildEntry(ids.lightIds, hassStates, mdiLightbulbOn, _normalizeLightSensor),
    exhaustFans: _buildEntry(ids.exhaustIds, hassStates, mdiFan, _normalizeFanDevice),
    circulationFans: _buildEntry(ids.circulationIds, hassStates, mdiFan, _normalizeFanDevice),
    humidifiers: _buildEntry(ids.humidifierIds, hassStates, mdiAirHumidifier, _normalizeOnOff),
    dehumidifiers: _buildEntry(ids.dehumidifierIds, hassStates, mdiAirHumidifierOff, _normalizeOnOff),
  };
}

// ---------------------------------------------------------------------------
// Pure computation (exported — used by HeaderMetrics and tests)
// ---------------------------------------------------------------------------

/**
 * Derive a normalized DeviceSnapshot for a growspace from the current hass states.
 *
 * Thin entity-resolution adapter over the shared snapshot core: entity IDs come
 * from the device's environmentAttributes, preferring the plural list fields
 * with the legacy singular fields as fallback.
 *
 * This is the canonical place to read device-controlled entity states from hass.states.
 * All downstream consumers (HeaderMetrics, cards) should subscribe to the atom
 * instead of calling this directly.
 */
export function computeDeviceSnapshot(
  device: GrowspaceDevice,
  hassStates: HassStates
): DeviceSnapshot {
  const env = device.environmentAttributes ?? {};

  return _buildSnapshot(
    {
      lightIds: env.lightSensors ?? (env.lightSensor ? [env.lightSensor] : []),
      exhaustIds: env.exhaustFanEntities ?? (env.exhaustEntity ? [env.exhaustEntity] : []),
      circulationIds:
        env.circulationFanEntities ?? (env.circulationFanEntity ? [env.circulationFanEntity] : []),
      humidifierIds: env.humidifierEntities ?? (env.humidifierEntity ? [env.humidifierEntity] : []),
      dehumidifierIds:
        env.dehumidifierEntities ?? (env.dehumidifierEntity ? [env.dehumidifierEntity] : []),
    },
    hassStates
  );
}

/**
 * Derive a normalized DeviceSnapshot for a subarea from the current hass states.
 *
 * Thin entity-resolution adapter over the shared snapshot core: entity IDs come
 * directly from the subarea's environment_config device lists. Categories
 * without configured entities are null, exactly like the growspace adapter.
 */
export function computeSubareaDeviceSnapshot(
  subarea: Subarea,
  hassStates: HassStates
): DeviceSnapshot {
  const ec = subarea.environment_config;

  return _buildSnapshot(
    {
      lightIds: ec.light_sensors ?? [],
      exhaustIds: ec.exhaust_fan_entities ?? [],
      circulationIds: ec.circulation_fan_entities ?? [],
      humidifierIds: ec.humidifier_entities ?? [],
      dehumidifierIds: ec.dehumidifier_entities ?? [],
    },
    hassStates
  );
}

/**
 * All entity IDs referenced by a snapshot's DeviceEntry fields.
 * Used by SyncService to register watched entities for subarea snapshots.
 */
export function deviceSnapshotEntityIds(snapshot: DeviceSnapshot): string[] {
  const entries = [
    snapshot.lightSensors,
    snapshot.exhaustFans,
    snapshot.circulationFans,
    snapshot.humidifiers,
    snapshot.dehumidifiers,
  ];
  return entries.flatMap((e) => e?.entityIds ?? []);
}

// ---------------------------------------------------------------------------
// Atoms (public)
// ---------------------------------------------------------------------------

/** Per-growspace device state snapshots — keyed by growspaceId. */
export const deviceSnapshots$ = atom<Map<string, DeviceSnapshot>>(new Map());

/** Per-subarea device state snapshots — keyed by subareaId. */
export const subareaDeviceSnapshots$ = atom<Map<string, DeviceSnapshot>>(new Map());

// ---------------------------------------------------------------------------
// Bootstrap writes (public)
// ---------------------------------------------------------------------------

/**
 * Compute and store the DeviceSnapshot for a growspace.
 * Called by SyncService after each hass update.
 */
export function setDeviceSnapshot(
  growspaceId: string,
  device: GrowspaceDevice,
  hassStates: HassStates
): void {
  const snapshot = computeDeviceSnapshot(device, hassStates);
  const updated = new Map(deviceSnapshots$.get());
  updated.set(growspaceId, snapshot);
  deviceSnapshots$.set(updated);
}

/**
 * Compute and store the DeviceSnapshot for a subarea.
 * Called by SyncService alongside the growspace snapshots, and by the subarea
 * card once after it has loaded its subarea (bootstrap seed).
 */
export function setSubareaDeviceSnapshot(
  subareaId: string,
  subarea: Subarea,
  hassStates: HassStates
): void {
  const snapshot = computeSubareaDeviceSnapshot(subarea, hassStates);
  const updated = new Map(subareaDeviceSnapshots$.get());
  updated.set(subareaId, snapshot);
  subareaDeviceSnapshots$.set(updated);
}
