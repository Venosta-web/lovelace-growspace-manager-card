/**
 * Port Pre-fill resolver (ADR-0028). Pure, DOM-free translation-key resolution of
 * an AC Infinity *port device* into its bundle member entities, plus the helpers
 * the picker needs (list the port devices, derive the picked device from a saved
 * mode entity). The card resolves at the moment of the pick only — never at save
 * or runtime — and the saved config stays the explicit entity bundle.
 *
 * Output is keyed by *role-neutral* names, not by either bundle's field names: the
 * `on_power` number is the actuator bundle's `speed_entity` but the grow-light
 * bundle's `power_entity`, so both slices (#445 actuator, #446 grow light) map from
 * the same `power` role without one inheriting the other's vocabulary.
 */

import type { AcInfinityDevice, AcInfinityGrowLight } from '../../../slices/growspace/schema';

/** The subset of a frontend `hass.entities[eid]` entry this module reads. */
export interface AcInfinityRegistryEntry {
  platform?: string;
  device_id?: string;
  translation_key?: string;
}

/** A snapshot of the frontend entity registry (`hass.entities`). */
export type EntityRegistrySnapshot = Record<string, AcInfinityRegistryEntry>;

/** The six ADR-0028 bundle roles, named independently of either bundle's schema. */
export type AcInfinityRole =
  | 'mode'
  | 'power'
  | 'onTime'
  | 'offTime'
  | 'sunriseSwitch'
  | 'sunriseDuration';

/** Role → the entity `domain` + `ac_infinity` `translation_key` that identifies it. */
export const AC_INFINITY_ROLE_MAP: Record<
  AcInfinityRole,
  { domain: string; translationKey: string }
> = {
  mode: { domain: 'select', translationKey: 'active_mode' },
  power: { domain: 'number', translationKey: 'on_power' },
  onTime: { domain: 'time', translationKey: 'schedule_mode_on_time' },
  offTime: { domain: 'time', translationKey: 'schedule_mode_off_time' },
  sunriseSwitch: { domain: 'switch', translationKey: 'sunrise_timer_enabled' },
  sunriseDuration: { domain: 'number', translationKey: 'sunrise_timer_minutes' },
};

const PLATFORM = 'ac_infinity';
const { domain: MODE_DOMAIN, translationKey: MODE_TK } = AC_INFINITY_ROLE_MAP.mode;

/** A pickable AC Infinity port: its device-registry id and display label. */
export interface PortDeviceOption {
  id: string;
  label: string;
}

/**
 * The pickable port devices: every device that exposes an `ac_infinity`
 * `active_mode` select (what distinguishes a controllable port from the
 * controller parent), each listed once and labeled via the injected
 * device-name resolver (`name_by_user || name`). Sorted by label.
 */
export function listAcInfinityPortDevices(
  registry: EntityRegistrySnapshot,
  deviceName: (deviceId: string) => string
): PortDeviceOption[] {
  const deviceIds = new Set<string>();
  for (const [eid, e] of Object.entries(registry)) {
    if (
      e.platform === PLATFORM &&
      e.translation_key === MODE_TK &&
      e.device_id &&
      eid.split('.')[0] === MODE_DOMAIN
    ) {
      deviceIds.add(e.device_id);
    }
  }
  return [...deviceIds]
    .map((id) => ({ id, label: deviceName(id) }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * The device a saved bundle points at, for the picker's value on reopen: the
 * `device_id` of the bundle's mode entity, or '' when unset/unknown.
 */
export function deviceIdForModeEntity(
  registry: EntityRegistrySnapshot,
  modeEntity: string
): string {
  if (!modeEntity) return '';
  return registry[modeEntity]?.device_id ?? '';
}

/** The actuator bundle's two resolved roles, in the order the warning names them. */
const ACTUATOR_ROLES: {
  role: AcInfinityRole;
  label: string;
  field: 'mode_entity' | 'speed_entity';
}[] = [
  { role: 'mode', label: 'Mode', field: 'mode_entity' },
  { role: 'power', label: 'Speed', field: 'speed_entity' },
];

/**
 * Apply a port pick to an actuator bundle: overwrite both role fields from the
 * resolved roles, clearing any that did not resolve (never left stale from a
 * previously picked port), and preserve `on_speed`. `missing` names the roles
 * that resolved to nothing, for the inline warning.
 */
export function fillAcInfinityActuatorPort(
  current: AcInfinityDevice,
  roles: Partial<Record<AcInfinityRole, string>>
): { device: AcInfinityDevice; missing: string[] } {
  const device: AcInfinityDevice = { ...current, mode_entity: '', speed_entity: '' };
  const missing: string[] = [];
  for (const { role, label, field } of ACTUATOR_ROLES) {
    const eid = roles[role];
    if (eid) device[field] = eid;
    else missing.push(label);
  }
  return { device, missing };
}

/** The grow-light bundle's six roles, in the order the warning names them. */
const GROWLIGHT_ROLES: { role: AcInfinityRole; label: string; field: keyof AcInfinityGrowLight }[] =
  [
    { role: 'mode', label: 'Mode', field: 'mode_entity' },
    { role: 'onTime', label: 'On time', field: 'on_time_entity' },
    { role: 'offTime', label: 'Off time', field: 'off_time_entity' },
    { role: 'power', label: 'Power', field: 'power_entity' },
    { role: 'sunriseSwitch', label: 'Sunrise switch', field: 'sunrise_switch_entity' },
    { role: 'sunriseDuration', label: 'Sunrise duration', field: 'sunrise_duration_entity' },
  ];

/**
 * Apply a port pick to a grow-light bundle: overwrite all six role fields from
 * the resolved roles in one pass, clearing any that did not resolve (sunrise
 * roles included — a port without them saves with empty sunrise fields).
 * `missing` names the roles that resolved to nothing, for the inline warning.
 */
export function fillAcInfinityGrowLightPort(
  current: AcInfinityGrowLight,
  roles: Partial<Record<AcInfinityRole, string>>
): { device: AcInfinityGrowLight; missing: string[] } {
  const device = { ...current };
  const missing: string[] = [];
  for (const { role, label, field } of GROWLIGHT_ROLES) {
    const eid = roles[role];
    device[field] = eid ?? '';
    if (!eid) missing.push(label);
  }
  return { device, missing };
}

/**
 * Resolve the picked port device to its role → entity-id map. A role is present
 * only when a matching `ac_infinity` entity of the right domain + translation key
 * on that device exists (disabled entities are absent from the registry, so they
 * resolve as missing). Registry keys are matched in sorted order so a device that
 * happens to expose two entities of one role resolves deterministically.
 */
export function resolveAcInfinityPort(
  registry: EntityRegistrySnapshot,
  deviceId: string
): Partial<Record<AcInfinityRole, string>> {
  const result: Partial<Record<AcInfinityRole, string>> = {};
  if (!deviceId) return result;
  const eids = Object.keys(registry).sort();
  for (const [role, { domain, translationKey }] of Object.entries(AC_INFINITY_ROLE_MAP) as [
    AcInfinityRole,
    { domain: string; translationKey: string },
  ][]) {
    if (result[role]) continue;
    const match = eids.find((eid) => {
      const e = registry[eid];
      return (
        e.platform === PLATFORM &&
        e.device_id === deviceId &&
        e.translation_key === translationKey &&
        eid.split('.')[0] === domain
      );
    });
    if (match) result[role] = match;
  }
  return result;
}
