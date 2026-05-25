/**
 * DeviceState slice — the single place in the codebase that reads hass.states
 * for device-controlled entities and exposes normalized DeviceSnapshot atoms.
 *
 * Public API (atoms):
 *   deviceSnapshots$        — read: Map<growspaceId, DeviceSnapshot> (one entry per growspace)
 *
 * Public API (bootstrap writes):
 *   setDeviceSnapshot()     — compute + store snapshot for a growspace (called by SyncService
 *                             on every hass update)
 *
 * Public API (pure computation):
 *   computeDeviceSnapshot() — derive a DeviceSnapshot from a device + hass states snapshot.
 *                             Exported so HeaderMetrics and tests can call it directly.
 */

import { atom } from 'nanostores';
import {
  mdiLightbulbOn,
  mdiFan,
  mdiAirHumidifier,
  mdiAirHumidifierOff,
} from '@mdi/js';
import type { HassEntity } from 'home-assistant-js-websocket';
import type { GrowspaceDevice } from '../../services/types';

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
  return undefined;
}

/** Normalize an on/off device entity state to "On", "Off", or undefined. */
function _normalizeOnOff(entity: HassEntity | undefined): string | undefined {
  if (!entity) return undefined;
  if (UNAVAILABLE_STATES.has(entity.state)) return undefined;
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
  normalizer: (entity: HassEntity | undefined) => string | undefined,
): DeviceEntry | null {
  if (entityIds.length === 0) return null;

  if (entityIds.length === 1) {
    const value = normalizer(hassStates[entityIds[0]]);
    return { entityIds, value, icon };
  }

  // Multiple entities: collect individual values; surface "Multiple" as the aggregate.
  const multiValues = entityIds
    .map((id) => normalizer(hassStates[id]))
    .filter((v): v is string => v !== undefined);

  return {
    entityIds,
    value: 'Multiple',
    multiValues: multiValues.length > 0 ? multiValues : undefined,
    icon,
  };
}

// ---------------------------------------------------------------------------
// Pure computation (exported — used by HeaderMetrics and tests)
// ---------------------------------------------------------------------------

/**
 * Derive a normalized DeviceSnapshot for a growspace from the current hass states.
 *
 * This is the canonical place to read device-controlled entity states from hass.states.
 * All downstream consumers (HeaderMetrics, cards) should subscribe to the atom
 * instead of calling this directly.
 */
export function computeDeviceSnapshot(device: GrowspaceDevice, hassStates: HassStates): DeviceSnapshot {
  const env = device.environmentAttributes ?? {};

  const lightIds = env.lightSensors ?? (env.lightSensor ? [env.lightSensor] : []);
  const exhaustIds = env.exhaustFanEntities ?? (env.exhaustEntity ? [env.exhaustEntity] : []);
  const circulationIds = env.circulationFanEntities ?? (env.circulationFanEntity ? [env.circulationFanEntity] : []);
  const humidifierIds = env.humidifierEntities ?? (env.humidifierEntity ? [env.humidifierEntity] : []);
  const dehumidifierIds = env.dehumidifierEntities ?? (env.dehumidifierEntity ? [env.dehumidifierEntity] : []);

  return {
    lightSensors: _buildEntry(lightIds, hassStates, mdiLightbulbOn, _normalizeLightSensor),
    exhaustFans: _buildEntry(exhaustIds, hassStates, mdiFan, _normalizeOnOff),
    circulationFans: _buildEntry(circulationIds, hassStates, mdiFan, _normalizeOnOff),
    humidifiers: _buildEntry(humidifierIds, hassStates, mdiAirHumidifier, _normalizeOnOff),
    dehumidifiers: _buildEntry(dehumidifierIds, hassStates, mdiAirHumidifierOff, _normalizeOnOff),
  };
}

// ---------------------------------------------------------------------------
// Atoms (public)
// ---------------------------------------------------------------------------

/** Per-growspace device state snapshots — keyed by growspaceId. */
export const deviceSnapshots$ = atom<Map<string, DeviceSnapshot>>(new Map());

// ---------------------------------------------------------------------------
// Bootstrap write (public)
// ---------------------------------------------------------------------------

/**
 * Compute and store the DeviceSnapshot for a growspace.
 * Called by SyncService after each hass update.
 */
export function setDeviceSnapshot(
  growspaceId: string,
  device: GrowspaceDevice,
  hassStates: HassStates,
): void {
  const snapshot = computeDeviceSnapshot(device, hassStates);
  const updated = new Map(deviceSnapshots$.get());
  updated.set(growspaceId, snapshot);
  deviceSnapshots$.set(updated);
}
