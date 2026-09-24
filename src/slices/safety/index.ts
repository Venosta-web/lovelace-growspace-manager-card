/**
 * Irrigation safety — the controller state, its reasons, and the operator
 * controls around it (GSM#783, GSM#791).
 *
 * The read side is Home Assistant entity state, not the growspace payload: the
 * backend publishes `sensor.<gs>_irrigation_controller`, two switches and a
 * button per growspace, and this module finds them through the entity and
 * device registries by their language-independent `translation_key` and the
 * growspace device identifier, never by guessing an entity ID from a name.
 *
 * Nothing here is optimistic. A safety state the card showed before the
 * backend agreed would be exactly the kind of lie these controls exist to
 * prevent, so every write is a plain service call and the view is re-derived
 * from the entity state it produces.
 */

import type { HomeAssistant } from 'custom-card-helpers';
import { callService } from '../../services/hass-call';
import { localize, localizeWithParams } from '../../localize/localize';
import {
  IrrigationControllerSchema,
  SafetyServicePayloadSchema,
  type ControllerState,
  type SafetyReason,
} from './schema';

export { CONTROLLER_STATES } from './schema';

const DOMAIN = 'growspace_manager';

// ---------------------------------------------------------------------------
// Entity resolution
// ---------------------------------------------------------------------------

interface RegistryEntity {
  device_id?: string | null;
  platform?: string;
  translation_key?: string | null;
}

interface RegistryDevice {
  identifiers?: [string, string][];
}

/** The per-growspace safety entities; only the controller is required. */
export interface SafetyEntities {
  controller: string;
  automation: string | null;
  irrigationArmed: string | null;
  emergencyStop: string | null;
}

const ROLES = {
  irrigation_controller: ['controller', 'sensor.'],
  automation: ['automation', 'switch.'],
  irrigation_armed: ['irrigationArmed', 'switch.'],
  emergency_stop: ['emergencyStop', 'button.'],
} as const satisfies Record<string, [keyof SafetyEntities, string]>;

const resolved = new WeakMap<object, WeakMap<object, Map<string, SafetyEntities | null>>>();

/**
 * Find a growspace's safety entities. Memoised on the two registry snapshots,
 * which Home Assistant replaces rather than mutates, because the header
 * re-renders on every state change and the entity registry can run to
 * thousands of rows.
 */
export function resolveSafetyEntities(
  growspaceId: string,
  hass: HomeAssistant | undefined
): SafetyEntities | null {
  const registries = hass as unknown as
    | {
        entities?: Record<string, RegistryEntity>;
        devices?: Record<string, RegistryDevice>;
      }
    | undefined;
  const entities = registries?.entities;
  const devices = registries?.devices;
  if (!entities || !devices || !growspaceId) return null;

  let byDevices = resolved.get(entities);
  if (!byDevices) resolved.set(entities, (byDevices = new WeakMap()));
  let byGrowspace = byDevices.get(devices);
  if (!byGrowspace) byDevices.set(devices, (byGrowspace = new Map()));
  if (byGrowspace.has(growspaceId)) return byGrowspace.get(growspaceId) ?? null;

  const deviceIds = new Set(
    Object.entries(devices)
      .filter(([, device]) =>
        device.identifiers?.some(([domain, id]) => domain === DOMAIN && id === growspaceId)
      )
      .map(([id]) => id)
  );
  const found: Partial<SafetyEntities> = {};
  if (deviceIds.size > 0) {
    for (const [entityId, entry] of Object.entries(entities)) {
      if (entry.platform !== DOMAIN || !entry.device_id || !deviceIds.has(entry.device_id)) {
        continue;
      }
      const role = ROLES[entry.translation_key as keyof typeof ROLES];
      if (role && entityId.startsWith(role[1])) found[role[0]] = entityId;
    }
  }
  const result: SafetyEntities | null = found.controller
    ? {
        controller: found.controller,
        automation: found.automation ?? null,
        irrigationArmed: found.irrigationArmed ?? null,
        emergencyStop: found.emergencyStop ?? null,
      }
    : null;
  byGrowspace.set(growspaceId, result);
  return result;
}

// ---------------------------------------------------------------------------
// The view
// ---------------------------------------------------------------------------

/** How loudly the chip speaks. */
type SafetySeverity = 'quiet' | 'ok' | 'active' | 'warning' | 'danger';

/** A controller the card cannot read is shown as such, never as `idle`. */
export type SafetyViewState = ControllerState | 'unavailable';

export interface SafetyReasonView extends SafetyReason {
  /** The code without its entity scope: `fault_off_unconfirmed`. */
  kind: string;
  /** The entity the code is scoped to, when it has one. */
  subject: string | null;
  label: string;
}

export interface SafetyView {
  growspaceId: string;
  state: SafetyViewState;
  severity: SafetySeverity;
  label: string;
  /** The label the chip shows: the state, and the reason that decides it. */
  summary: string;
  reasons: SafetyReasonView[];
  since: string | null;
  requiresAck: boolean;
  entities: SafetyEntities;
  /** `null` when the switch is missing or unreadable. */
  irrigationArmed: boolean | null;
  automationEnabled: boolean | null;
  /**
   * The outputs `acknowledge_fault` will insist read OFF, and which of them do
   * not. The backend refuses while any does, so the card says so first.
   */
  faultOutputs: string[];
  faultOutputsNotOff: string[];
}

const SEVERITY: Record<SafetyViewState, SafetySeverity> = {
  idle: 'quiet',
  ready: 'ok',
  running: 'active',
  inhibited: 'warning',
  fault: 'danger',
  emergency_stop: 'danger',
  unavailable: 'quiet',
};

/**
 * Every reason code the backend emits (GSM#783, #785, #786, #790, #791), and
 * those its open siblings name (#789). A code with no entry still renders,
 * under a generic label that names it, with the backend's own detail below.
 */
export const KNOWN_REASON_KINDS = [
  'startup_inhibit',
  'automation_off',
  'irrigation_disarmed',
  'tank_low',
  'tank_unknown',
  'sensor_stale',
  'sensor_implausible',
  'cap_cycles',
  'cap_volume',
  'dark',
  'emergency_stop',
  'fault_off_unconfirmed',
  'fault_watchdog_off_unconfirmed',
  'fault_on_command_failed',
  'fault_on_unconfirmed',
  'fault_record_unreadable',
] as const;

const KNOWN = new Set<string>(KNOWN_REASON_KINDS);

export function reasonLabel(code: string, language = 'en'): string {
  const kind = code.split(':', 1)[0];
  return KNOWN.has(kind)
    ? localize(`safety.reason_${kind}`, '', '', language)
    : localizeWithParams('safety.reason_unrecognised', { code: kind }, language);
}

export function stateLabel(state: SafetyViewState, language = 'en'): string {
  return localize(`safety.state_${state}`, '', '', language);
}

function toReasonView(reason: SafetyReason, language: string): SafetyReasonView {
  const separator = reason.code.indexOf(':');
  return {
    ...reason,
    kind: separator < 0 ? reason.code : reason.code.slice(0, separator),
    subject: separator < 0 ? null : reason.code.slice(separator + 1) || null,
    label: reasonLabel(reason.code, language),
  };
}

function switchState(hass: HomeAssistant, entityId: string | null): boolean | null {
  const state = entityId ? hass.states[entityId]?.state : undefined;
  return state === 'on' ? true : state === 'off' ? false : null;
}

/**
 * Derive a growspace's safety view, or `null` when the backend publishes no
 * controller for it (a release before GSM#783).
 *
 * `configuredPumps` are the growspace's irrigation and drain pumps. A fault
 * names its own output in its code; an unreadable safety record names none,
 * and the backend then checks every configured pump, so the card does too.
 */
export function deriveSafetyView(
  growspaceId: string,
  hass: HomeAssistant | undefined,
  configuredPumps: readonly (string | null | undefined)[] = [],
  language = 'en'
): SafetyView | null {
  const entities = resolveSafetyEntities(growspaceId, hass);
  if (!hass || !entities) return null;

  const parsed = IrrigationControllerSchema.safeParse(hass.states[entities.controller]);
  const state: SafetyViewState = parsed.success ? parsed.data.state : 'unavailable';
  const attributes = parsed.success ? parsed.data.attributes : null;
  const reasons = (attributes?.reasons ?? []).map((r) => toReasonView(r, language));

  const faultOutputs =
    state === 'fault'
      ? [
          ...new Set([
            ...reasons
              .filter((r) => r.kind.startsWith('fault_') && r.subject)
              .map((r) => r.subject!),
            ...(reasons.some((r) => r.kind === 'fault_record_unreadable')
              ? configuredPumps.filter((e): e is string => !!e)
              : []),
          ]),
        ]
      : [];

  const label = stateLabel(state, language);
  const decisive = state === 'emergency_stop' ? undefined : reasons[0];
  return {
    growspaceId,
    state,
    severity: SEVERITY[state],
    label,
    summary: decisive ? `${label} · ${decisive.label}` : label,
    reasons,
    since: attributes?.since ?? null,
    requiresAck: attributes?.requires_ack ?? false,
    entities,
    irrigationArmed: switchState(hass, entities.irrigationArmed),
    automationEnabled: switchState(hass, entities.automation),
    faultOutputs,
    // The backend's own test: a missing entity is not OFF either.
    faultOutputsNotOff: faultOutputs.filter((e) => hass.states[e]?.state !== 'off'),
  };
}

/** The reasons that explain an unreadable or held tank, for the tank card. */
export function tankHoldReasons(view: SafetyView | null): SafetyReasonView[] {
  if (view?.state !== 'inhibited') return [];
  return view.reasons.filter((r) => r.kind.startsWith('tank_') || r.kind.startsWith('sensor_'));
}

/**
 * "12 minutes ago", in the viewer's language. An unparseable instant yields
 * `null` rather than "NaN years ago".
 */
export function formatSince(since: string | null, now: number, language = 'en'): string | null {
  const at = since ? Date.parse(since) : NaN;
  if (Number.isNaN(at)) return null;
  const seconds = Math.round((at - now) / 1000);
  const format = new Intl.RelativeTimeFormat(language.replace(/_/, '-'), { numeric: 'auto' });
  const abs = Math.abs(seconds);
  if (abs < 60) return format.format(seconds, 'second');
  if (abs < 3600) return format.format(Math.round(seconds / 60), 'minute');
  if (abs < 86400) return format.format(Math.round(seconds / 3600), 'hour');
  return format.format(Math.round(seconds / 86400), 'day');
}

// ---------------------------------------------------------------------------
// Operator controls
// ---------------------------------------------------------------------------

function safetyPayload(growspaceId: string): Record<string, unknown> {
  return SafetyServicePayloadSchema.parse({ growspace_id: growspaceId });
}

/** Latch an emergency stop and command every managed output safe (GSM#791). */
export function emergencyStop(growspaceId: string): Promise<void> {
  return callService(DOMAIN, 'emergency_stop', safetyPayload(growspaceId));
}

/** Clear an emergency stop. Admin only; refused while any output reads unsafe. */
export function resetSafety(growspaceId: string): Promise<void> {
  return callService(DOMAIN, 'reset_safety', safetyPayload(growspaceId));
}

/** Clear a latched fault. Admin only; refused while an affected output reads ON. */
export function acknowledgeFault(growspaceId: string): Promise<void> {
  return callService(DOMAIN, 'acknowledge_fault', safetyPayload(growspaceId));
}

/** Arm or disarm automatic irrigation through its switch entity. */
export function setIrrigationArmed(entityId: string, armed: boolean): Promise<void> {
  return callService('switch', armed ? 'turn_on' : 'turn_off', { entity_id: entityId });
}

/**
 * The text of a refusal. Home Assistant rejects a service call with a plain
 * `{ code, message }` object, not an Error, and the backend's refusals —
 * "outputs not confirmed OFF: switch.pump" — are written for the operator.
 */
export function refusalMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message) return message;
  }
  return String(error);
}
