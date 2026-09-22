/**
 * Irrigation Command — the card's one compiler and executor for irrigation
 * configuration writes.
 *
 * The interface stays the slice's named mutators (`saveIrrigationSettings`,
 * `updateIrrigationStrategy`, `toggleIrrigationMode`, `applySteeringMode`,
 * `setSteeringPhase`, `setProgramAutoAdvance`). This module is what they are
 * all built on, and it is deliberately **not** re-exported from `index.ts`: a
 * component asks for the change it means, never for a generic command.
 *
 * What the module owns:
 *
 * - **Field ownership and domain-to-wire compilation.** One table per model,
 *   total over the domain type, so a new strategy field without a row is a
 *   compile error rather than a value silently dropped on the wire.
 * - **Omission and clearing semantics.** `undefined` omits a field and leaves
 *   the growspace's stored value alone; `null` clears, but only where the
 *   backend accepts a clear. A null pump entity compiles to the empty string
 *   the action has always taken.
 * - **Strict outbound validation.** Every payload is parsed by the matching
 *   strict schema before anything else happens, so a malformed command or an
 *   unsupported clear fails with neither a projection nor a service call.
 * - **The optimistic transaction.** A valid command projects onto the
 *   irrigation read model *and* the growspace-device projection the dialogs
 *   read, and a transport failure restores both.
 *
 * What stays outside, because each is a collection or a runtime action rather
 * than a sparse edit of the two configuration models: schedule collections,
 * per-stage EC target ranges, Drain Monitoring, drain readings, manual cycles,
 * analytics, and read-model hydration. This mirrors the boundary the backend's
 * own Irrigation Change seam draws (growspace_manager ADR-0046), which is what
 * makes "refused by name" a shared rule rather than two guesses.
 */

import type { ZodType } from 'zod';
import type { IrrigationConfig, IrrigationStrategy, SubstrateProfile } from '../../services/types';
import { callService, hassCall } from '../../services/hass-call';
import { mutate } from '../../services/mutate';
import { devices$, patchDeviceIrrigationConfig, patchDeviceStrategy } from '../grid';
import {
  ApplySteeringModePayloadSchema,
  ApplySteeringModeResultSchema,
  SaveIrrigationSettingsPayloadSchema,
  SetIrrigationStrategyPayloadSchema,
  SetSteeringPhasePayloadSchema,
  type SteeringMode,
} from './schema';
import {
  irrigationConfigs$,
  irrigationStrategies$,
  patchIrrigationConfig,
  patchIrrigationStrategy,
} from './read-model';

// ---------------------------------------------------------------------------
// The command
// ---------------------------------------------------------------------------

/** The manual phase override's three values (ADR-0012). */
export type SteeringPhase = 'p1' | 'p2' | 'p3';

/**
 * The settings a caller may change.
 *
 * Every field is optional and `undefined` means "leave it alone" — this is a
 * sparse change, not a form snapshot. `saveIrrigationSettings` narrows it back
 * down for the whole-form save, which does require the four hardware fields.
 */
export interface IrrigationSettingsChange {
  irrigationPumpEntity?: string | null;
  pumpFlowRateMlPerSec?: number;
  drainPumpEntity?: string | null;
  irrigationDuration?: number;
  drainDuration?: number;
  soilTriggerPercent?: number | null;
  dailyVolumeCapLiters?: number | null;
  maxCyclesPerDay?: number | null;
  skipDuringDark?: boolean;
  pauseOnLowTank?: boolean;
  logToLogbook?: boolean;
  autoAdvanceP1ToP2?: boolean;
  autoAdvanceP2ToP3?: boolean;
  programAutoAdvance?: boolean;
  haltOnRunoffEcThreshold?: number | null;
}

interface CommandEnvelope {
  /** The undo-stack entry this command records; one per named mutator. */
  readonly type: string;
  readonly growspaceId: string;
}

export type IrrigationCommand = Readonly<
  | (CommandEnvelope & { kind: 'settings'; settings: Readonly<IrrigationSettingsChange> })
  | (CommandEnvelope & { kind: 'strategy'; strategy: Readonly<Partial<IrrigationStrategy>> })
  | (CommandEnvelope & { kind: 'steering-phase'; phase: SteeringPhase })
  | (CommandEnvelope & { kind: 'steering-mode'; mode: SteeringMode })
>;

/** A command that cannot be compiled. Thrown before any state change. */
export class IrrigationCommandError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IrrigationCommandError';
  }
}

// ---------------------------------------------------------------------------
// Field ownership
// ---------------------------------------------------------------------------

/**
 * What a field's `null` compiles to.
 *
 * - `send` — the action accepts null and clears the stored value.
 * - `empty` — the action takes a string and has always read the empty string as
 *   "no entity"; the pump entities, and only them.
 * - `refuse` — the action has no clear for this field, so a null is a caller
 *   bug. Refusing by name beats sending a null the service rejects with a
 *   voluptuous error nobody can trace back to a form control.
 */
type ClearPolicy = 'send' | 'empty' | 'refuse';

type WireRule = Readonly<{ owner: 'wire'; wireKey: string; clear: ClearPolicy }>;

/**
 * A strategy field that is not a sparse strategy write.
 *
 * - `observed` — the backend measures it (`detectedLightsOnTime`).
 * - `stamp` — another operation writes it: the Steering Mode stamp, the
 *   [[Recipe Stamp]], the [[Irrigation Program]] binding.
 *
 * They are dropped rather than refused because the Steering tab's draft carries
 * them: it is seeded from the whole strategy, so a save legitimately hands this
 * module fields it must not write. Dropping them here is also what stops a
 * settings save from optimistically wiping a stamped mode until the next sync.
 */
type NonWriteRule = Readonly<{ owner: 'observed' | 'stamp' }>;

/** The Substrate Profile is nested in the domain and flat on the wire. */
type ExpandRule = Readonly<{ owner: 'expand' }>;

const SETTINGS_FIELDS = {
  irrigationPumpEntity: { owner: 'wire', wireKey: 'irrigation_pump_entity', clear: 'empty' },
  drainPumpEntity: { owner: 'wire', wireKey: 'drain_pump_entity', clear: 'empty' },
  pumpFlowRateMlPerSec: {
    owner: 'wire',
    wireKey: 'pump_flow_rate_ml_per_sec',
    clear: 'refuse',
  },
  irrigationDuration: { owner: 'wire', wireKey: 'irrigation_duration', clear: 'refuse' },
  drainDuration: { owner: 'wire', wireKey: 'drain_duration', clear: 'refuse' },
  soilTriggerPercent: { owner: 'wire', wireKey: 'soil_trigger_percent', clear: 'send' },
  dailyVolumeCapLiters: { owner: 'wire', wireKey: 'daily_volume_cap_liters', clear: 'send' },
  maxCyclesPerDay: { owner: 'wire', wireKey: 'max_cycles_per_day', clear: 'send' },
  skipDuringDark: { owner: 'wire', wireKey: 'skip_during_dark', clear: 'refuse' },
  pauseOnLowTank: { owner: 'wire', wireKey: 'pause_on_low_tank', clear: 'refuse' },
  logToLogbook: { owner: 'wire', wireKey: 'log_to_logbook', clear: 'refuse' },
  autoAdvanceP1ToP2: { owner: 'wire', wireKey: 'auto_advance_p1_to_p2', clear: 'refuse' },
  autoAdvanceP2ToP3: { owner: 'wire', wireKey: 'auto_advance_p2_to_p3', clear: 'refuse' },
  programAutoAdvance: { owner: 'wire', wireKey: 'program_auto_advance', clear: 'refuse' },
  haltOnRunoffEcThreshold: {
    owner: 'wire',
    wireKey: 'halt_on_runoff_ec_threshold',
    clear: 'send',
  },
} as const satisfies Record<keyof IrrigationSettingsChange, WireRule>;

const STRATEGY_FIELDS = {
  enabled: { owner: 'wire', wireKey: 'enabled', clear: 'refuse' },
  lightsOnTime: { owner: 'wire', wireKey: 'lights_on_time', clear: 'refuse' },
  p0DurationMinutes: { owner: 'wire', wireKey: 'p0_duration_minutes', clear: 'refuse' },
  p2StopBeforeLightsOffMinutes: {
    owner: 'wire',
    wireKey: 'p2_stop_before_lights_off_minutes',
    clear: 'refuse',
  },
  targetVwcPercent: { owner: 'wire', wireKey: 'target_vwc_percent', clear: 'refuse' },
  maintenanceDrybackPercent: {
    owner: 'wire',
    wireKey: 'maintenance_dryback_percent',
    clear: 'refuse',
  },
  shotDurationSeconds: { owner: 'wire', wireKey: 'shot_duration_seconds', clear: 'refuse' },
  shotIntervalMinutes: { owner: 'wire', wireKey: 'shot_interval_minutes', clear: 'refuse' },
  p1ShotDurationSeconds: {
    owner: 'wire',
    wireKey: 'p1_shot_duration_seconds',
    clear: 'refuse',
  },
  p1ShotIntervalMinutes: {
    owner: 'wire',
    wireKey: 'p1_shot_interval_minutes',
    clear: 'refuse',
  },
  p2ShotDurationSeconds: {
    owner: 'wire',
    wireKey: 'p2_shot_duration_seconds',
    clear: 'refuse',
  },
  p2ShotIntervalMinutes: {
    owner: 'wire',
    wireKey: 'p2_shot_interval_minutes',
    clear: 'refuse',
  },
  p1ShotVolumePercent: { owner: 'wire', wireKey: 'p1_shot_volume_percent', clear: 'refuse' },
  p2ShotVolumePercent: { owner: 'wire', wireKey: 'p2_shot_volume_percent', clear: 'refuse' },
  skipP2AfterP1: { owner: 'wire', wireKey: 'skip_p2_after_p1', clear: 'refuse' },
  shotSizingMode: { owner: 'wire', wireKey: 'shot_sizing_mode', clear: 'refuse' },
  substrateProfile: { owner: 'expand' },
  poreEcTargetMin: { owner: 'wire', wireKey: 'pore_ec_target_min', clear: 'send' },
  poreEcTargetMax: { owner: 'wire', wireKey: 'pore_ec_target_max', clear: 'send' },
  ecModulationEnabled: { owner: 'wire', wireKey: 'ec_modulation_enabled', clear: 'refuse' },
  autoLightTracking: { owner: 'wire', wireKey: 'auto_light_tracking', clear: 'refuse' },
  dynamicShotEnabled: { owner: 'wire', wireKey: 'dynamic_shot_enabled', clear: 'refuse' },
  dynamicAggressiveness: {
    owner: 'wire',
    wireKey: 'dynamic_aggressiveness',
    clear: 'refuse',
  },
  dynamicRecovery: { owner: 'wire', wireKey: 'dynamic_recovery', clear: 'refuse' },
  dynamicShotSizeFloor: { owner: 'wire', wireKey: 'dynamic_shot_size_floor', clear: 'refuse' },
  dynamicIntervalCeiling: {
    owner: 'wire',
    wireKey: 'dynamic_interval_ceiling',
    clear: 'refuse',
  },
  detectedLightsOnTime: { owner: 'observed' },
  declaredSteeringMode: { owner: 'stamp' },
  appliedRecipeId: { owner: 'stamp' },
  recipeAppliedAt: { owner: 'stamp' },
  irrigationProgramId: { owner: 'stamp' },
} as const satisfies Record<keyof IrrigationStrategy, WireRule | NonWriteRule | ExpandRule>;

// ---------------------------------------------------------------------------
// Compilation
// ---------------------------------------------------------------------------

/**
 * A compiled command: the validated wire payload, plus the two optimistic
 * projections it justifies. A projection is `null` when the command touches
 * that model not at all.
 */
export interface IrrigationCommandPlan {
  readonly payload: Readonly<Record<string, unknown>>;
  readonly configPatch: Readonly<Partial<IrrigationConfig>> | null;
  readonly strategyPatch: Readonly<Partial<IrrigationStrategy>> | null;
}

/**
 * The last gate before a payload leaves: parse it through the strict schema for
 * its action, and re-throw as this module's own error so a caller has one thing
 * to catch and one message to show. Strictness matters both ways — an unknown
 * key means the compiler invented one, and the backend refuses a field it does
 * not own by name.
 */
function parseOutbound<T>(
  schema: ZodType<T>,
  payload: Record<string, unknown>,
  subject: string
): T {
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const at = first?.path.join('.') || '(payload)';
    throw new IrrigationCommandError(`${subject} is not sendable: ${at} — ${first?.message}`);
  }
  return parsed.data;
}

/** Compile one field through its rule, or refuse the clear it does not have. */
function compileWireField(
  field: string,
  rule: WireRule,
  value: unknown,
  payload: Record<string, unknown>
): void {
  if (value !== null) {
    payload[rule.wireKey] = value;
    return;
  }
  if (rule.clear === 'send') {
    payload[rule.wireKey] = null;
    return;
  }
  if (rule.clear === 'empty') {
    payload[rule.wireKey] = '';
    return;
  }
  throw new IrrigationCommandError(
    `${field} cannot be cleared: the action defines no clear for it. Sending the ` +
      `null anyway would come back as a service error naming a wire key no ` +
      `control is labelled with.`
  );
}

function compileSettings(
  growspaceId: string,
  settings: Readonly<IrrigationSettingsChange>
): IrrigationCommandPlan {
  const payload: Record<string, unknown> = { growspace_id: growspaceId };
  const configPatch: Partial<IrrigationConfig> = {};

  for (const [field, rule] of Object.entries(SETTINGS_FIELDS)) {
    const value = settings[field as keyof IrrigationSettingsChange];
    if (value === undefined) continue;
    compileWireField(field, rule, value, payload);
    // The read model keeps the domain spelling: a growspace with no pump holds
    // whatever the caller meant by "none", and only the wire says empty string.
    Object.assign(configPatch, { [field]: value });
  }

  requireNamedField(payload, 'A settings change');
  return {
    payload: parseOutbound(SaveIrrigationSettingsPayloadSchema, payload, 'A settings change'),
    configPatch,
    strategyPatch: null,
  };
}

function compileStrategy(
  growspaceId: string,
  strategy: Readonly<Partial<IrrigationStrategy>>
): IrrigationCommandPlan {
  const payload: Record<string, unknown> = { growspace_id: growspaceId };
  const strategyPatch: Partial<IrrigationStrategy> = {};

  for (const [field, rule] of Object.entries(STRATEGY_FIELDS)) {
    const value = strategy[field as keyof IrrigationStrategy];
    if (value === undefined) continue;
    if (rule.owner === 'observed' || rule.owner === 'stamp') continue;
    if (rule.owner === 'expand') {
      compileSubstrateProfile(value, payload);
      strategyPatch.substrateProfile = value as SubstrateProfile;
      continue;
    }
    compileWireField(field, rule, value, payload);
    Object.assign(strategyPatch, { [field]: value });
  }

  requireNamedField(payload, 'A strategy change');
  return {
    payload: parseOutbound(SetIrrigationStrategyPayloadSchema, payload, 'A strategy change'),
    configPatch: null,
    strategyPatch,
  };
}

/**
 * The [[Substrate Profile]] is nested here and flat on the wire.
 *
 * The action takes `substrate_media_type` and `substrate_liters_per_pot` and
 * folds them into the nested profile server-side; the read side is nested at
 * both ends. Compiling it in one place is what keeps the two spellings from
 * being a thing every caller has to know.
 */
function compileSubstrateProfile(value: unknown, payload: Record<string, unknown>): void {
  if (value === null) {
    throw new IrrigationCommandError(
      'substrateProfile cannot be cleared: a growspace always has a growing medium, ' +
        'and set_irrigation_strategy has no clear for it.'
    );
  }
  const profile = value as SubstrateProfile;
  payload.substrate_media_type = profile.mediaType;
  payload.substrate_liters_per_pot = profile.litersPerPot;
}

/**
 * A change that names no field is a caller mistake, not a no-op worth sending.
 * The whole payload is `{ growspace_id }` when every field was omitted or
 * owned elsewhere, and a service call that writes nothing still costs a
 * round trip and an undo entry that undoes nothing.
 */
function requireNamedField(payload: Record<string, unknown>, subject: string): void {
  if (Object.keys(payload).length === 1) {
    throw new IrrigationCommandError(`${subject} must name at least one field to write.`);
  }
}

export function compileIrrigationCommand(command: IrrigationCommand): IrrigationCommandPlan {
  switch (command.kind) {
    case 'settings':
      return compileSettings(command.growspaceId, command.settings);
    case 'strategy':
      return compileStrategy(command.growspaceId, command.strategy);
    case 'steering-phase':
      return {
        payload: parseOutbound(
          SetSteeringPhasePayloadSchema,
          { growspace_id: command.growspaceId, steering_phase: command.phase },
          'A steering phase override'
        ),
        configPatch: { activeSteeringPhase: command.phase },
        strategyPatch: null,
      };
    case 'steering-mode':
      return {
        payload: parseOutbound(
          ApplySteeringModePayloadSchema,
          { growspace_id: command.growspaceId, steering_mode: command.mode },
          'A Steering Mode stamp'
        ),
        configPatch: null,
        // The server owns the preset table and writes the numeric fields; the
        // only thing we can honestly show before the next sync is the intent.
        strategyPatch: { declaredSteeringMode: command.mode },
      };
  }
}

// ---------------------------------------------------------------------------
// Transport
// ---------------------------------------------------------------------------

async function sendIrrigationCommand(
  command: IrrigationCommand,
  payload: Readonly<Record<string, unknown>>
): Promise<void> {
  switch (command.kind) {
    case 'settings':
      return callService('growspace_manager', 'set_irrigation_settings', { ...payload });
    case 'strategy':
      return callService('growspace_manager', 'set_irrigation_strategy', { ...payload });
    case 'steering-phase':
      return callService('growspace_manager', 'set_steering_phase', { ...payload });
    case 'steering-mode':
      await hassCall(
        'growspace_manager/apply_steering_mode',
        { ...payload },
        ApplySteeringModeResultSchema
      );
      return;
  }
}

// ---------------------------------------------------------------------------
// The optimistic transaction
// ---------------------------------------------------------------------------

/**
 * The inverse of one patch against the state it was applied to.
 *
 * It names exactly the keys the patch named, so restoring cannot resurrect a
 * field a later sync removed, and a key the projection *added* is restored to
 * absent rather than left behind.
 */
function revertPatch<T extends object>(before: T | undefined, applied: Partial<T>): Partial<T> {
  const reverted: Partial<T> = {};
  for (const key of Object.keys(applied) as (keyof T)[]) {
    reverted[key] = before?.[key];
  }
  return reverted;
}

function restoreEntry<T>(
  store: { get(): Map<string, T>; set(next: Map<string, T>): void },
  growspaceId: string,
  before: T | undefined
): void {
  const restored = new Map(store.get());
  if (before === undefined) restored.delete(growspaceId);
  else restored.set(growspaceId, before);
  store.set(restored);
}

/**
 * Compile, project, send, and restore on failure.
 *
 * Compilation runs first and throws before anything is touched, so a refused
 * command leaves no optimistic state to explain and no request to trace. A
 * transport failure restores the irrigation read model from its own snapshot
 * and the device projection from the inverse of what was applied — both, every
 * time, because the dialogs read one and the grid reads the other and a
 * half-restored pair shows a growspace two states at once.
 */
export async function runIrrigationCommand(command: IrrigationCommand): Promise<void> {
  const plan = compileIrrigationCommand(command);
  const { growspaceId } = command;

  const configBefore = irrigationConfigs$.get().get(growspaceId);
  const strategyBefore = irrigationStrategies$.get().get(growspaceId);
  const device = devices$.get().find((d) => d.deviceId === growspaceId);
  const deviceConfigBefore = device?.irrigationConfig;
  const deviceStrategyBefore = device?.irrigationStrategy;

  await mutate(
    {
      type: command.type,
      optimistic: () => {
        if (plan.configPatch) {
          patchIrrigationConfig(growspaceId, plan.configPatch);
          patchDeviceIrrigationConfig(growspaceId, plan.configPatch);
        }
        if (plan.strategyPatch) {
          patchIrrigationStrategy(growspaceId, plan.strategyPatch);
          patchDeviceStrategy(growspaceId, plan.strategyPatch);
        }
      },
      inverse: () => {
        if (plan.configPatch) {
          restoreEntry(irrigationConfigs$, growspaceId, configBefore);
          patchDeviceIrrigationConfig(
            growspaceId,
            revertPatch(deviceConfigBefore, plan.configPatch)
          );
        }
        if (plan.strategyPatch) {
          restoreEntry(irrigationStrategies$, growspaceId, strategyBefore);
          patchDeviceStrategy(growspaceId, revertPatch(deviceStrategyBefore, plan.strategyPatch));
        }
      },
      apply: () => sendIrrigationCommand(command, plan.payload),
    },
    growspaceId
  );
}
