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
import type { AcInfinityDevice } from '../growspace/schema';
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

// ---------------------------------------------------------------------------
// Fan Entity Mode (ADR-0008) — one classifier, three pure mappers.
// See CONTEXT.md "Fan Entity Mode" / "classifyFanEntity" / "FanReading".
// ---------------------------------------------------------------------------

/**
 * A classified reading of a fan-slot entity. `kind` is the *type facet*
 * (id-derived, stable even when the entity is unavailable); `available` plus the
 * payload are the *reading facet*. There is deliberately no `unavailable` kind —
 * an unavailable fan still has a known type, which the graph axis depends on.
 */
export type FanReading =
  | { kind: 'ha-fan'; available: boolean; on: boolean; percentage: number | null }
  | { kind: 'speed-sensor'; available: boolean; value: number }
  | { kind: 'binary'; available: boolean; on: boolean };

/** Minimal entity shape the classifier reads — full HassEntity and raw history points both satisfy it. */
type FanEntityStateLike = { state: string; attributes?: Record<string, unknown> };

const BINARY_FAN_DOMAINS = new Set(['switch', 'input_boolean', 'binary_sensor']);

/**
 * Classify a fan-slot entity into a {@link FanReading}. The single place in the
 * codebase that inspects a fan entity; chip display, graph axis, and per-point
 * graph value are pure mappers over the result and never re-touch the entity.
 *
 * `kind` is derived from the entity-id domain (the type facet), so it is known
 * even when the entity is missing or unavailable; in that case `available` is
 * false and the mappers degrade to "no value" / a default axis.
 */
export function classifyFanEntity(
  entityId: string,
  entity: FanEntityStateLike | undefined
): FanReading {
  const domain = entityId.split('.')[0];
  const state = entity?.state;
  const available = !!state && !UNAVAILABLE_STATES.has(state);

  if (domain === 'fan') {
    if (!available) return { kind: 'ha-fan', available: false, on: false, percentage: null };
    const on = state !== 'off';
    const pct = entity!.attributes?.percentage;
    return { kind: 'ha-fan', available: true, on, percentage: pct != null ? Number(pct) : null };
  }

  const isBinaryDomain = BINARY_FAN_DOMAINS.has(domain);
  const numVal = available ? parseFloat(state!) : NaN;

  // Numeric state on a non-binary domain is a speed sensor (raw 0–10 index).
  if (!isNaN(numVal) && !isBinaryDomain) {
    return { kind: 'speed-sensor', available: true, value: Math.round(numVal) };
  }

  // Binary: numeric on a binary domain, or a recognized on/off string (any domain).
  if (available) {
    if (!isNaN(numVal)) return { kind: 'binary', available: true, on: numVal > 0 };
    if (state === 'on') return { kind: 'binary', available: true, on: true };
    if (state === 'off') return { kind: 'binary', available: true, on: false };
  }

  // Unavailable or unrecognized state: keep the id-derived type, mark not-available.
  return isBinaryDomain
    ? { kind: 'binary', available: false, on: false }
    : { kind: 'speed-sensor', available: false, value: 0 };
}

/** Map a {@link FanReading} to the chip display string, or undefined when unreadable. */
export function fanReadingToChipDisplay(reading: FanReading): string | undefined {
  if (!reading.available) return undefined;
  switch (reading.kind) {
    case 'ha-fan':
      return reading.on
        ? reading.percentage != null
          ? `${Math.round(reading.percentage)}%`
          : 'On'
        : 'Off';
    case 'speed-sensor':
      return String(reading.value);
    case 'binary':
      return reading.on ? 'On' : 'Off';
  }
}

/** Map a {@link FanReading} kind to the graph Y-axis scale (the type facet only). */
export function fanReadingToAxisScale(kind: FanReading['kind']): { min: number; max: number } {
  return kind === 'ha-fan' ? { min: 0, max: 100 } : { min: 0, max: 10 };
}

/** Map a {@link FanReading} to a normalized graph value, or undefined when unreadable. */
export function fanReadingToNormalizedValue(reading: FanReading): number | undefined {
  if (!reading.available) return undefined;
  switch (reading.kind) {
    case 'ha-fan':
      return reading.on ? (reading.percentage ?? 100) : 0;
    case 'speed-sensor':
      return reading.value;
    case 'binary':
      return reading.on ? 1 : 0;
  }
}

/** Normalize a fan entity state for chip display (ADR-0008). */
function _normalizeFanDevice(entity: HassEntity | undefined, entityId: string): string | undefined {
  return fanReadingToChipDisplay(classifyFanEntity(entityId, entity));
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

/**
 * Minimal entity-registry shape the AC Infinity resolver reads. Mirrors the
 * frontend's `hass.entities` display map (present at runtime, untyped on
 * custom-card-helpers' HomeAssistant), narrowed to the fields we need.
 */
export interface EntityRegistryLike {
  device_id?: string | null;
  translation_key?: string | null;
}
export type EntityRegistry = Record<string, EntityRegistryLike>;

/** Language-independent translation_key of the AC Infinity per-port power read-back. */
const AC_INFINITY_CURRENT_POWER_KEY = 'current_power';

/**
 * The entity whose state a bundle's chip should display. A port's speed_entity
 * is the control setpoint we *write*; its actual running level is a sibling
 * `sensor` on the same HA device tagged `current_power`. Prefer that read-back
 * when the registry exposes it, else fall back to the speed setpoint so the
 * chip still renders (a bundle with no power sensor keeps appearing).
 */
function _acInfinityDisplayEntity(device: AcInfinityDevice, registry: EntityRegistry | undefined): string {
  const deviceId = registry?.[device.speed_entity]?.device_id;
  if (registry && deviceId) {
    for (const [entityId, entry] of Object.entries(registry)) {
      if (
        entry.device_id === deviceId &&
        entry.translation_key === AC_INFINITY_CURRENT_POWER_KEY &&
        entityId.startsWith('sensor.')
      ) {
        return entityId;
      }
    }
  }
  return device.speed_entity;
}

/** Resolve each AC Infinity bundle to the entity id its chip should read. */
function _acInfinityDisplayEntities(
  devices: AcInfinityDevice[] | undefined,
  registry: EntityRegistry | undefined
): string[] {
  return (devices ?? []).map((d) => _acInfinityDisplayEntity(d, registry));
}

// ---------------------------------------------------------------------------
// Pure computation (exported — used by HeaderMetrics and tests)
// ---------------------------------------------------------------------------

/**
 * Derive a normalized DeviceSnapshot for a growspace from the current hass states.
 *
 * Thin entity-resolution adapter over the shared snapshot core: entity IDs come
 * from the device's environmentAttributes, preferring the plural list fields
 * with the legacy singular fields as fallback, plus each AC Infinity bundle's
 * display entity — its port `current_power` read-back sensor when the entity
 * registry exposes it, else the speed setpoint (a port has no `fan` entity).
 *
 * This is the canonical place to read device-controlled entity states from hass.states.
 * All downstream consumers (HeaderMetrics, cards) should subscribe to the atom
 * instead of calling this directly.
 */
export function computeDeviceSnapshot(
  device: GrowspaceDevice,
  hassStates: HassStates,
  registry?: EntityRegistry
): DeviceSnapshot {
  const env = device.environmentAttributes ?? {};

  return _buildSnapshot(
    {
      lightIds: env.lightSensors ?? (env.lightSensor ? [env.lightSensor] : []),
      exhaustIds: [
        ...(env.exhaustFanEntities ?? (env.exhaustEntity ? [env.exhaustEntity] : [])),
        ..._acInfinityDisplayEntities(env.exhaustFanAcInfinityDevices, registry),
      ],
      circulationIds: [
        ...(env.circulationFanEntities ??
          (env.circulationFanEntity ? [env.circulationFanEntity] : [])),
        ..._acInfinityDisplayEntities(env.circulationFanAcInfinityDevices, registry),
      ],
      humidifierIds: [
        ...(env.humidifierEntities ?? (env.humidifierEntity ? [env.humidifierEntity] : [])),
        ..._acInfinityDisplayEntities(env.humidifierAcInfinityDevices, registry),
      ],
      dehumidifierIds: [
        ...(env.dehumidifierEntities ?? (env.dehumidifierEntity ? [env.dehumidifierEntity] : [])),
        ..._acInfinityDisplayEntities(env.dehumidifierAcInfinityDevices, registry),
      ],
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
  hassStates: HassStates,
  registry?: EntityRegistry
): void {
  const snapshot = computeDeviceSnapshot(device, hassStates, registry);
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
