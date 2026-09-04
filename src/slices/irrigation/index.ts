/**
 * Irrigation slice — atoms and mutators for Irrigation domain data.
 *
 * Public API (atoms):
 *   irrigationConfigs$    — read: Map<growspaceId, IrrigationConfig>
 *   irrigationStrategies$ — read: Map<growspaceId, IrrigationStrategy>
 *   tankLevels$           — read: Map<growspaceId, IrrigationTank[]>
 *   irrigationRecipes$    — read: IrrigationRecipe[] (the GLOBAL recipe library)
 *   irrigationPrograms$   — read: IrrigationProgram[] (the GLOBAL program library)
 *
 * Public API (bootstrap writes — called by SyncService):
 *   setIrrigationConfig()   — replace the IrrigationConfig for a growspace
 *   setIrrigationStrategy() — replace the IrrigationStrategy for a growspace
 *   setTankLevels()         — replace the IrrigationTank list for a growspace
 *   setIrrigationRecipes()  — replace the global Irrigation Recipe library
 *   setIrrigationPrograms() — replace the global Irrigation Program library
 *
 * Public API (pure computation):
 *   computeIrrigationMode()  — derive 'manual' | 'crop_steering' from strategy
 *   computePhaseWindows()    — derive P0–P3 phase windows from strategy
 *
 * Public API (mutators):
 *   toggleIrrigationMode()       — optimistic: flip strategy.enabled
 *   addIrrigationTime()          — optimistic: append + sort irrigation schedule
 *   removeIrrigationTime()       — optimistic: remove from irrigation schedule
 *   addDrainTime()               — optimistic: append + sort drain schedule
 *   removeDrainTime()            — optimistic: remove from drain schedule
 *   updateIrrigationStrategy()   — optimistic: merge strategy fields
 *   setSteeringPhase()           — optimistic: override the active phase
 *   saveIrrigationSettings()     — optimistic: merge config settings
 *   logDrainReading()            — fire-and-forget
 *   configureDrainMonitoring()   — fire-and-forget
 *   runIrrigationCycle()         — fire-and-forget
 *   fetchCropSteeringHistory()   — fetches sensor-driven VWC/EC history for one growspace
 *   saveIrrigationRecipe()       — snapshot a growspace's settings into the library
 *   updateIrrigationRecipe()     — rename / correct a stored recipe in place
 *   removeIrrigationRecipe()     — drop a recipe from the library
 *   applyIrrigationRecipe()      — stamp a saved recipe into a growspace
 *   saveIrrigationProgram()      — save a whole-run plan of (stage, week) slots
 *   removeIrrigationProgram()    — drop a program from the library
 *   assignIrrigationProgram()    — bind a growspace to a program, or unbind it
 *   setProgramAutoAdvance()      — opt a growspace in or out of unattended stamps
 *
 * Action type, payload shapes, and zod schemas are private to this module.
 * Tank data absorption: this slice is the authoritative source for tank levels,
 * superseding direct reads from store/growspace or services/api/TankAPI.
 */

import { atom } from 'nanostores';
import { z } from 'zod';
import type {
  CropSteeringRecipeValues,
  IrrigationConfig,
  IrrigationProgram,
  IrrigationRecipe,
  IrrigationStrategy,
  IrrigationTank,
  ProgramSlot,
  ScheduleRecipeValues,
  ECTargetRange,
} from '../../services/types';
import { mutate } from '../../services/mutate';
import { callService, hassCall } from '../../services/hass-call';
import type { IrrigationMode, PhaseWindows, IrrigationAnalytics } from './schema';
import { IrrigationAnalyticsSchema } from './schema';
import {
  patchDeviceIrrigationConfig,
  patchDeviceProgramBinding,
  patchDeviceRecipeStamp,
  patchDeviceStrategy,
} from '../grid';
import { CropSteeringHistorySchema, type CropSteeringHistory } from '../../schemas/api-schema';
import { ApplySteeringModeResultSchema, type SteeringMode } from './schema';
import {
  ApplyIrrigationRecipeResultSchema,
  AssignIrrigationProgramResultSchema,
  IrrigationProgramSchema,
  IrrigationRecipeSchema,
  type ApplyIrrigationRecipeResult,
  type IrrigationRecipeKind,
  type SerializedIrrigationProgram,
  type SerializedIrrigationRecipe,
} from './schema';
import { computePhases } from '../../features/environment/crop-steering-model';

// ---------------------------------------------------------------------------
// Atoms (public read)
// ---------------------------------------------------------------------------

export const irrigationConfigs$ = atom<Map<string, IrrigationConfig>>(new Map());
export const irrigationStrategies$ = atom<Map<string, IrrigationStrategy>>(new Map());
export const tankLevels$ = atom<Map<string, IrrigationTank[]>>(new Map());
export const cropSteeringHistory$ = atom<Map<string, CropSteeringHistory>>(new Map());
/**
 * The [[Irrigation Recipe]] library — **global**, not keyed by growspace: a
 * recipe saved from one tent is listed from every other. It rides every
 * growspace payload, so hydration sets this once from whichever device carries
 * it rather than fetching it separately.
 */
export const irrigationRecipes$ = atom<IrrigationRecipe[]>([]);
/**
 * The [[Irrigation Program]] library — **global** for the same reason the recipe
 * library above is, and riding the same payloads. A program is a plan that
 * exists whether or not any growspace is bound to it.
 */
export const irrigationPrograms$ = atom<IrrigationProgram[]>([]);

// ---------------------------------------------------------------------------
// Bootstrap writes (called by SyncService when fresh data arrives)
// ---------------------------------------------------------------------------

export function setIrrigationConfig(growspaceId: string, config: IrrigationConfig): void {
  const updated = new Map(irrigationConfigs$.get());
  updated.set(growspaceId, config);
  irrigationConfigs$.set(updated);
}

export function setIrrigationStrategy(growspaceId: string, strategy: IrrigationStrategy): void {
  const updated = new Map(irrigationStrategies$.get());
  updated.set(growspaceId, strategy);
  irrigationStrategies$.set(updated);
}

export function setTankLevels(growspaceId: string, tanks: IrrigationTank[]): void {
  const updated = new Map(tankLevels$.get());
  updated.set(growspaceId, tanks);
  tankLevels$.set(updated);
}

/** Replace the global Irrigation Recipe library. Takes no growspace id — the
 * library is one list shared by every tent. */
export function setIrrigationRecipes(recipes: IrrigationRecipe[]): void {
  irrigationRecipes$.set(recipes);
}

/** Replace the global Irrigation Program library. Takes no growspace either. */
export function setIrrigationPrograms(programs: IrrigationProgram[]): void {
  irrigationPrograms$.set(programs);
}

// ---------------------------------------------------------------------------
// Pure computation (exported — used by components and tests)
// ---------------------------------------------------------------------------

/**
 * Derive irrigation mode from the strategy's enabled flag.
 * 'crop_steering' when strategy.enabled is true, 'manual' otherwise.
 */
export function computeIrrigationMode(strategy: IrrigationStrategy | undefined): IrrigationMode {
  return strategy?.enabled === true ? 'crop_steering' : 'manual';
}

/**
 * Derive P0–P3 phase windows from a crop-steering strategy.
 *
 * Returns null when strategy is undefined or disabled. Otherwise a thin wrapper
 * over `computePhases` — the one implementation of the [[Phase Windows]] — so the
 * two cannot drift apart again. It once carried its own copy, which is how P0 came
 * to be missing from one and present in the other.
 *
 * Schedule-only: it passes no live `IrrigationConfig` and no measured Saturation
 * Target crossing, so P3 sits on its scheduled boundary and P1 owns the whole shot
 * window. A view that has either should call `computePhases` directly.
 */
export function computePhaseWindows(
  strategy: IrrigationStrategy | undefined,
  vegDayHours = 18
): PhaseWindows | null {
  if (!strategy?.enabled) return null;
  return computePhases(
    { ...strategy, lightsOnTime: strategy.lightsOnTime ?? '06:00' },
    vegDayHours,
    null
  );
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function _getConfig(growspaceId: string): IrrigationConfig {
  return irrigationConfigs$.get().get(growspaceId) ?? { irrigationTimes: [], drainTimes: [] };
}

function _getStrategy(growspaceId: string): IrrigationStrategy {
  return (
    irrigationStrategies$.get().get(growspaceId) ?? {
      enabled: false,
      lightsOnTime: '06:00',
      p0DurationMinutes: 60,
      p2StopBeforeLightsOffMinutes: 120,
      targetVwcPercent: 65,
      maintenanceDrybackPercent: 3,
      shotDurationSeconds: 30,
      shotIntervalMinutes: 15,
    }
  );
}

function _patchConfig(growspaceId: string, patch: Partial<IrrigationConfig>): void {
  const updated = new Map(irrigationConfigs$.get());
  updated.set(growspaceId, { ..._getConfig(growspaceId), ...patch });
  irrigationConfigs$.set(updated);
}

function _patchStrategy(growspaceId: string, patch: Partial<IrrigationStrategy>): void {
  const updated = new Map(irrigationStrategies$.get());
  updated.set(growspaceId, { ..._getStrategy(growspaceId), ...patch });
  irrigationStrategies$.set(updated);
}

/** Sort schedule items by time string (HH:MM or HH:MM:SS). */
function _sortByTime<T extends { time?: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''));
}

// ---------------------------------------------------------------------------
// Mutators (public write)
// ---------------------------------------------------------------------------

/**
 * Toggle irrigation mode between 'manual' and 'crop_steering'.
 *
 * Optimistic: flips strategy.enabled in irrigationStrategies$.
 * Apply: calls growspace_manager.set_irrigation_strategy with the new enabled flag.
 * Inverse: restores previous enabled value on failure.
 */
export async function toggleIrrigationMode(growspaceId: string): Promise<void> {
  const prev = _getStrategy(growspaceId);
  const nextEnabled = !prev.enabled;

  await mutate(
    {
      type: 'toggleIrrigationMode',
      optimistic: () => _patchStrategy(growspaceId, { enabled: nextEnabled }),
      inverse: () => _patchStrategy(growspaceId, { enabled: prev.enabled }),
      apply: () =>
        callService('growspace_manager', 'set_irrigation_strategy', {
          growspace_id: growspaceId,
          enabled: nextEnabled,
        }),
    },
    growspaceId
  );
}

/**
 * Add a manual irrigation time to the schedule.
 *
 * Optimistic: appends the new time and sorts irrigationTimes.
 * Apply: calls growspace_manager.add_irrigation_time.
 * Inverse: restores the previous irrigationTimes list on failure.
 */
export async function addIrrigationTime(
  growspaceId: string,
  time: string,
  duration = 60
): Promise<void> {
  const prev = _getConfig(growspaceId);
  const next = _sortByTime([...prev.irrigationTimes, { time, duration }]);

  await mutate(
    {
      type: 'addIrrigationTime',
      optimistic: () => {
        _patchConfig(growspaceId, { irrigationTimes: next });
        patchDeviceIrrigationConfig(growspaceId, { irrigationTimes: next });
      },
      inverse: () => {
        _patchConfig(growspaceId, { irrigationTimes: prev.irrigationTimes });
        patchDeviceIrrigationConfig(growspaceId, { irrigationTimes: prev.irrigationTimes });
      },
      apply: () =>
        callService('growspace_manager', 'add_irrigation_time', {
          growspace_id: growspaceId,
          time,
          duration,
        }),
    },
    growspaceId
  );
}

/**
 * Remove a manual irrigation time from the schedule.
 *
 * Optimistic: removes the matching time from irrigationTimes.
 * Apply: calls growspace_manager.remove_irrigation_time.
 * Inverse: restores the previous irrigationTimes list on failure.
 */
export async function removeIrrigationTime(growspaceId: string, time: string): Promise<void> {
  const prev = _getConfig(growspaceId);
  const next = prev.irrigationTimes.filter((t) => t.time !== time);

  await mutate(
    {
      type: 'removeIrrigationTime',
      optimistic: () => {
        _patchConfig(growspaceId, { irrigationTimes: next });
        patchDeviceIrrigationConfig(growspaceId, { irrigationTimes: next });
      },
      inverse: () => {
        _patchConfig(growspaceId, { irrigationTimes: prev.irrigationTimes });
        patchDeviceIrrigationConfig(growspaceId, { irrigationTimes: prev.irrigationTimes });
      },
      apply: () =>
        callService('growspace_manager', 'remove_irrigation_time', {
          growspace_id: growspaceId,
          time,
        }),
    },
    growspaceId
  );
}

/**
 * Add a drain time to the schedule.
 *
 * Optimistic: appends the new drain time and sorts drainTimes.
 * Apply: calls growspace_manager.add_drain_time.
 * Inverse: restores the previous drainTimes list on failure.
 */
export async function addDrainTime(
  growspaceId: string,
  time: string,
  duration = 60
): Promise<void> {
  const prev = _getConfig(growspaceId);
  const next = _sortByTime([...prev.drainTimes, { time, duration }]);

  await mutate(
    {
      type: 'addDrainTime',
      optimistic: () => {
        _patchConfig(growspaceId, { drainTimes: next });
        patchDeviceIrrigationConfig(growspaceId, { drainTimes: next });
      },
      inverse: () => {
        _patchConfig(growspaceId, { drainTimes: prev.drainTimes });
        patchDeviceIrrigationConfig(growspaceId, { drainTimes: prev.drainTimes });
      },
      apply: () =>
        callService('growspace_manager', 'add_drain_time', {
          growspace_id: growspaceId,
          time,
          duration,
        }),
    },
    growspaceId
  );
}

/**
 * Remove a drain time from the schedule.
 *
 * Optimistic: removes the matching drain time from drainTimes.
 * Apply: calls growspace_manager.remove_drain_time.
 * Inverse: restores the previous drainTimes list on failure.
 */
export async function removeDrainTime(growspaceId: string, time: string): Promise<void> {
  const prev = _getConfig(growspaceId);
  const next = prev.drainTimes.filter((t) => t.time !== time);

  await mutate(
    {
      type: 'removeDrainTime',
      optimistic: () => {
        _patchConfig(growspaceId, { drainTimes: next });
        patchDeviceIrrigationConfig(growspaceId, { drainTimes: next });
      },
      inverse: () => {
        _patchConfig(growspaceId, { drainTimes: prev.drainTimes });
        patchDeviceIrrigationConfig(growspaceId, { drainTimes: prev.drainTimes });
      },
      apply: () =>
        callService('growspace_manager', 'remove_drain_time', {
          growspace_id: growspaceId,
          time,
        }),
    },
    growspaceId
  );
}

/**
 * Merge partial strategy updates into the active irrigation strategy.
 *
 * Optimistic: patches irrigationStrategies$ with the provided fields.
 * Apply: calls growspace_manager.set_irrigation_strategy with serialized payload.
 * Inverse: restores the previous strategy on failure.
 */
export async function updateIrrigationStrategy(
  growspaceId: string,
  updates: Partial<IrrigationStrategy>
): Promise<void> {
  const prev = _getStrategy(growspaceId);

  const payload: Record<string, unknown> = { growspace_id: growspaceId };
  if (updates.enabled !== undefined) payload.enabled = updates.enabled;
  if (updates.lightsOnTime !== undefined) payload.lights_on_time = updates.lightsOnTime;
  if (updates.p0DurationMinutes !== undefined)
    payload.p0_duration_minutes = updates.p0DurationMinutes;
  if (updates.p2StopBeforeLightsOffMinutes !== undefined)
    payload.p2_stop_before_lights_off_minutes = updates.p2StopBeforeLightsOffMinutes;
  if (updates.targetVwcPercent !== undefined) payload.target_vwc_percent = updates.targetVwcPercent;
  if (updates.maintenanceDrybackPercent !== undefined)
    payload.maintenance_dryback_percent = updates.maintenanceDrybackPercent;
  if (updates.shotDurationSeconds !== undefined)
    payload.shot_duration_seconds = updates.shotDurationSeconds;
  if (updates.shotIntervalMinutes !== undefined)
    payload.shot_interval_minutes = updates.shotIntervalMinutes;
  if (updates.p1ShotDurationSeconds !== undefined)
    payload.p1_shot_duration_seconds = updates.p1ShotDurationSeconds;
  if (updates.p1ShotIntervalMinutes !== undefined)
    payload.p1_shot_interval_minutes = updates.p1ShotIntervalMinutes;
  if (updates.p2ShotDurationSeconds !== undefined)
    payload.p2_shot_duration_seconds = updates.p2ShotDurationSeconds;
  if (updates.p2ShotIntervalMinutes !== undefined)
    payload.p2_shot_interval_minutes = updates.p2ShotIntervalMinutes;
  if (updates.p1ShotVolumePercent !== undefined)
    payload.p1_shot_volume_percent = updates.p1ShotVolumePercent;
  if (updates.p2ShotVolumePercent !== undefined)
    payload.p2_shot_volume_percent = updates.p2ShotVolumePercent;
  if (updates.skipP2AfterP1 !== undefined) payload.skip_p2_after_p1 = updates.skipP2AfterP1;
  if (updates.shotSizingMode !== undefined) payload.shot_sizing_mode = updates.shotSizingMode;
  // Substrate Profile serializes to the backend's flat keys (folded into the
  // nested substrate_profile server-side); the read side stays nested.
  if (updates.substrateProfile !== undefined) {
    payload.substrate_media_type = updates.substrateProfile.mediaType;
    payload.substrate_liters_per_pot = updates.substrateProfile.litersPerPot;
  }
  if (updates.poreEcTargetMin !== undefined) payload.pore_ec_target_min = updates.poreEcTargetMin;
  if (updates.poreEcTargetMax !== undefined) payload.pore_ec_target_max = updates.poreEcTargetMax;
  if (updates.ecModulationEnabled !== undefined)
    payload.ec_modulation_enabled = updates.ecModulationEnabled;
  if (updates.autoLightTracking !== undefined)
    payload.auto_light_tracking = updates.autoLightTracking;
  if (updates.dynamicShotEnabled !== undefined)
    payload.dynamic_shot_enabled = updates.dynamicShotEnabled;
  if (updates.dynamicAggressiveness !== undefined)
    payload.dynamic_aggressiveness = updates.dynamicAggressiveness;
  if (updates.dynamicRecovery !== undefined) payload.dynamic_recovery = updates.dynamicRecovery;
  if (updates.dynamicShotSizeFloor !== undefined)
    payload.dynamic_shot_size_floor = updates.dynamicShotSizeFloor;
  if (updates.dynamicIntervalCeiling !== undefined)
    payload.dynamic_interval_ceiling = updates.dynamicIntervalCeiling;

  await mutate(
    {
      type: 'updateIrrigationStrategy',
      // Patch both the strategy read-model atom and the device the dialog reads,
      // so immediate-persist controls (sizing mode, profile, modulation) reflect
      // optimistically without waiting for a full device sync (ADR-0017).
      optimistic: () => {
        _patchStrategy(growspaceId, updates);
        patchDeviceStrategy(growspaceId, updates);
      },
      inverse: () => {
        _patchStrategy(growspaceId, prev);
        patchDeviceStrategy(growspaceId, prev);
      },
      apply: () => callService('growspace_manager', 'set_irrigation_strategy', payload),
    },
    growspaceId
  );
}

/**
 * Stamp a Steering Mode's server-owned preset into the strategy (ADR-0012).
 *
 * The server owns the preset table and writes the new field values; the WS
 * command returns only the declared mode. We optimistically reflect the
 * selected mode so the selector highlights immediately — the stamped numeric
 * field values arrive through the normal device sync.
 */
export async function applySteeringMode(growspaceId: string, mode: SteeringMode): Promise<void> {
  const prev = _getStrategy(growspaceId);

  await mutate(
    {
      type: 'applySteeringMode',
      optimistic: () => _patchStrategy(growspaceId, { declaredSteeringMode: mode }),
      inverse: () => _patchStrategy(growspaceId, prev),
      apply: async () => {
        await hassCall(
          'growspace_manager/apply_steering_mode',
          { growspace_id: growspaceId, steering_mode: mode },
          ApplySteeringModeResultSchema
        );
      },
    },
    growspaceId
  );
}

/**
 * One command reply → the library's own shape.
 *
 * Shared by save and update so the two cannot disagree about a recipe the
 * library already holds. The two halves are carried verbatim rather than
 * camelised — see `IrrigationRecipe` in services/types.ts for why.
 */
function toIrrigationRecipe(wire: SerializedIrrigationRecipe): IrrigationRecipe {
  return {
    id: wire.id,
    name: wire.name,
    kind: wire.kind,
    provenance: {
      mediaType: wire.provenance.media_type,
      litersPerPot: wire.provenance.liters_per_pot,
      pumpFlowRateMlPerSec: wire.provenance.pump_flow_rate_ml_per_sec,
      stage: wire.provenance.stage,
      week: wire.provenance.week,
    },
    cropSteering: wire.crop_steering,
    schedule: wire.schedule,
    createdAt: wire.created_at,
  };
}

/**
 * Save a growspace's current irrigation settings as a named [[Irrigation
 * Recipe]] (ADR-0045).
 *
 * Not a `mutate()`: nothing about the growspace changes, and the recipe the
 * library gains cannot be constructed locally — the backend derives its
 * [[Recipe Provenance]] and, in Seconds [[Shot Sizing Mode]], recovers the shot
 * percents through the target's own flow rate and pot volume. So there is
 * nothing to show optimistically and nothing to roll back; the saved recipe is
 * merged into the library from the command's own reply.
 *
 * A refusal (Seconds Mode without the inputs to derive a percent) arrives as a
 * `validation_failed` WSError whose message names the missing prerequisite.
 * Callers surface that message rather than a generic failure.
 */
export async function saveIrrigationRecipe(params: {
  growspaceId: string;
  name: string;
  kind: IrrigationRecipeKind;
  /** Present only when overwriting an existing recipe. */
  recipeId?: string;
}): Promise<void> {
  const saved = await hassCall(
    'growspace_manager/save_irrigation_recipe',
    {
      growspace_id: params.growspaceId,
      name: params.name,
      kind: params.kind,
      ...(params.recipeId ? { recipe_id: params.recipeId } : {}),
    },
    IrrigationRecipeSchema
  );

  const recipe = toIrrigationRecipe(saved);

  // Upsert by id and keep the name ordering the adapter establishes, so the
  // picker does not reshuffle when the next sync replaces this list.
  const rest = irrigationRecipes$.get().filter((r) => r.id !== recipe.id);
  irrigationRecipes$.set([...rest, recipe].sort((a, b) => a.name.localeCompare(b.name)));
}

/**
 * Rename a stored [[Irrigation Recipe]] and/or correct the values it holds.
 *
 * Sparse, exactly as the command is: a field this call does not name keeps
 * what the recipe stores, so renaming carries no values. `kind` and
 * [[Recipe Provenance]] are not writable — provenance records where the recipe
 * came from, not what it should say.
 *
 * Not a `mutate()`, for the same reason `saveIrrigationRecipe` is not: no
 * growspace changes. Applying a recipe is a by-value stamp, so a growspace
 * that carries this one keeps the numbers it was given and simply starts
 * reading as drifted — a server-derived flag, arriving on the next sync rather
 * than something the card may invent locally.
 *
 * The library is updated from the command's own reply, which is the whole
 * edited recipe.
 */
export async function updateIrrigationRecipe(params: {
  recipeId: string;
  name?: string;
  cropSteering?: Partial<CropSteeringRecipeValues>;
  schedule?: Partial<ScheduleRecipeValues>;
}): Promise<IrrigationRecipe> {
  const saved = await hassCall(
    'growspace_manager/update_irrigation_recipe',
    {
      recipe_id: params.recipeId,
      ...(params.name !== undefined ? { name: params.name } : {}),
      ...(params.cropSteering ? { crop_steering: params.cropSteering } : {}),
      ...(params.schedule ? { schedule: params.schedule } : {}),
    },
    IrrigationRecipeSchema
  );

  const recipe = toIrrigationRecipe(saved);
  const rest = irrigationRecipes$.get().filter((r) => r.id !== recipe.id);
  irrigationRecipes$.set([...rest, recipe].sort((a, b) => a.name.localeCompare(b.name)));
  return recipe;
}

/**
 * Drop a recipe from the global library.
 *
 * Never refused and never cascading: a growspace that had this recipe applied
 * keeps its stamped `appliedRecipeId`, which is why the Recipe tab reports an
 * applied recipe with no name rather than pretending nothing was applied. A
 * program slot pointing here degrades to "no instruction", which the
 * [[Program Hold]] rule already treats as "change nothing".
 */
export async function removeIrrigationRecipe(recipeId: string): Promise<void> {
  await hassCall(
    'growspace_manager/remove_irrigation_recipe',
    { recipe_id: recipeId },
    z.unknown()
  );
  irrigationRecipes$.set(irrigationRecipes$.get().filter((r) => r.id !== recipeId));
}

/**
 * Stamp a saved [[Irrigation Recipe]] into a growspace ([[Recipe Stamp]]).
 *
 * The server owns the stamp: it re-expresses the recipe's substrate-relative
 * shot sizes in this growspace's own units and writes them into the ordinary
 * editable fields. We optimistically reflect only what was *recorded* — which
 * recipe, when, and that the growspace therefore no longer differs from it —
 * so the Recipe tab updates immediately; the stamped numeric field values
 * arrive through the normal device sync, exactly as for the Steering Mode
 * stamp.
 *
 * Returns the command's reply so the caller can surface `warning`: a
 * cross-media apply **succeeds** and warns, naming both media, because pot size
 * normalises across growspaces and media does not.
 */
export async function applyIrrigationRecipe(
  growspaceId: string,
  recipeId: string
): Promise<ApplyIrrigationRecipeResult> {
  const prev = _getStrategy(growspaceId);
  const prevStamp = {
    appliedRecipeId: prev.appliedRecipeId ?? null,
    recipeAppliedAt: prev.recipeAppliedAt ?? null,
  };
  let result!: ApplyIrrigationRecipeResult;

  await mutate(
    {
      type: 'applyIrrigationRecipe',
      optimistic: () => {
        _patchStrategy(growspaceId, { appliedRecipeId: recipeId });
        patchDeviceRecipeStamp(growspaceId, { appliedRecipeId: recipeId });
      },
      // Failure rollback only. A committed stamp has no inverse — it overwrote
      // the previous setpoints and they are not recoverable — so, exactly as for
      // the Steering Mode stamp, the way back is to re-apply the recipe the
      // growspace was on. The drift verdict is deliberately untouched here: if
      // the apply never committed, the verdict the backend last gave is still
      // the right one.
      inverse: () => {
        _patchStrategy(growspaceId, prevStamp);
        patchDeviceRecipeStamp(growspaceId, prevStamp);
      },
      apply: async () => {
        result = await hassCall(
          'growspace_manager/apply_irrigation_recipe',
          { growspace_id: growspaceId, recipe_id: recipeId },
          ApplyIrrigationRecipeResultSchema
        );
        // The reply carries the authoritative stamp; a fresh stamp cannot have
        // drifted, so the tab's verdict is known without waiting for a sync.
        _patchStrategy(growspaceId, {
          appliedRecipeId: result.applied_recipe_id,
          recipeAppliedAt: result.recipe_applied_at,
        });
        patchDeviceRecipeStamp(growspaceId, {
          appliedRecipeId: result.applied_recipe_id,
          recipeAppliedAt: result.recipe_applied_at,
          drifted: false,
        });
      },
    },
    growspaceId
  );

  return result;
}

/**
 * One command reply → the program library's own shape.
 *
 * Shared by save and the library hydration for the same reason
 * `toIrrigationRecipe` is: the two must not disagree about a program the
 * library already holds. Slot order is preserved because the backend already
 * sorted it into run order, which is what says when a part of the plan applies.
 */
function toIrrigationProgram(wire: SerializedIrrigationProgram): IrrigationProgram {
  return {
    id: wire.id,
    name: wire.name,
    slots: wire.slots.map((slot) => ({
      stage: slot.stage,
      week: slot.week,
      recipeId: slot.recipe_id,
    })),
    createdAt: wire.created_at,
  };
}

/**
 * Save a whole-run plan of `(stage, week)` slots as a named [[Irrigation
 * Program]].
 *
 * Saving **replaces** the program's whole slot list rather than merging into
 * it, so the editor sends the plan it is showing and a slot the grower emptied
 * is actually gone. Recipes are held by reference — a slot carries a recipe id
 * and nothing else — so this writes no values into any growspace.
 *
 * Not a `mutate()`: no growspace changes, and the stored program cannot be
 * constructed locally (the backend assigns the id and puts the slots in run
 * order). The library is updated from the command's own reply.
 *
 * A refusal — a stage no growspace could ever resolve to, a week below 1, two
 * slots claiming the same position — arrives as a `validation_failed` WSError
 * whose message names the offending slot.
 */
export async function saveIrrigationProgram(params: {
  name: string;
  slots: ProgramSlot[];
  /** Present only when overwriting an existing program. */
  programId?: string;
}): Promise<IrrigationProgram> {
  const saved = await hassCall(
    'growspace_manager/save_irrigation_program',
    {
      name: params.name,
      slots: params.slots.map((slot) => ({
        stage: slot.stage,
        week: slot.week,
        recipe_id: slot.recipeId,
      })),
      ...(params.programId ? { program_id: params.programId } : {}),
    },
    IrrigationProgramSchema
  );

  const program = toIrrigationProgram(saved);
  const rest = irrigationPrograms$.get().filter((p) => p.id !== program.id);
  irrigationPrograms$.set([...rest, program].sort((a, b) => a.name.localeCompare(b.name)));
  return program;
}

/**
 * Drop a program from the global library.
 *
 * Never refused and never cascading: a growspace bound to it keeps the id it
 * was given and simply reports no current slot, exactly as a deleted recipe
 * leaves `appliedRecipeId` dangling. Nothing is written to any growspace.
 */
export async function removeIrrigationProgram(programId: string): Promise<void> {
  await hassCall(
    'growspace_manager/remove_irrigation_program',
    { program_id: programId },
    z.unknown()
  );
  irrigationPrograms$.set(irrigationPrograms$.get().filter((p) => p.id !== programId));
}

/**
 * Bind a growspace to an [[Irrigation Program]], or unbind it with `null`.
 *
 * **Binding only.** It writes that one id and no setpoint, so picking a program
 * from a dropdown cannot change what a pump does that same minute — which is
 * why the optimistic patch here moves the binding and nothing else. The one
 * exception is the backend's, not the card's: with auto-advance already on, the
 * server applies the current slot immediately, and the values that arrives with
 * come back through the ordinary device sync like every other stamp.
 *
 * Unbinding clears the resolved position too, because there is no program left
 * to have one. Binding does not invent it: which slot the growspace lands in is
 * the backend's answer.
 */
export async function assignIrrigationProgram(
  growspaceId: string,
  programId: string | null
): Promise<void> {
  const prev = _getStrategy(growspaceId);
  const prevProgramId = prev.irrigationProgramId ?? null;

  await mutate(
    {
      type: 'assignIrrigationProgram',
      optimistic: () => {
        _patchStrategy(growspaceId, { irrigationProgramId: programId });
        patchDeviceProgramBinding(
          growspaceId,
          programId === null
            ? { irrigationProgramId: null, programState: null }
            : { irrigationProgramId: programId }
        );
      },
      // Binding writes nothing else, so restoring the id restores everything
      // this call did. The resolved position is only cleared on an unbind, and
      // the next sync re-derives it either way.
      inverse: () => {
        _patchStrategy(growspaceId, { irrigationProgramId: prevProgramId });
        patchDeviceProgramBinding(growspaceId, { irrigationProgramId: prevProgramId });
      },
      apply: async () => {
        const result = await hassCall(
          'growspace_manager/assign_irrigation_program',
          { growspace_id: growspaceId, program_id: programId },
          AssignIrrigationProgramResultSchema
        );
        // The reply is authoritative about what the growspace now holds.
        _patchStrategy(growspaceId, { irrigationProgramId: result.irrigation_program_id });
        patchDeviceProgramBinding(growspaceId, {
          irrigationProgramId: result.irrigation_program_id,
        });
      },
    },
    growspaceId
  );
}

/**
 * Opt a growspace in or out of unattended [[Irrigation Program]] progression.
 *
 * A **sparse** `set_irrigation_settings` carrying this one field, unlike
 * `saveIrrigationSettings` below, which persists the whole buffered form. The
 * toggle is a single consent gesture on the Program tab and re-sending the pump
 * entities and durations beside it would quietly make another tab's draft part
 * of it. The service takes every field but the growspace id as optional, so a
 * one-field call is the contract rather than a shortcut through it.
 *
 * Turning it **on** is what makes the current slot due: the next evaluation
 * stamps it. That is a consequence the caller must have put to the grower
 * first — nothing here asks.
 */
export async function setProgramAutoAdvance(growspaceId: string, enabled: boolean): Promise<void> {
  const prev = _getConfig(growspaceId);
  const prevValue = prev.programAutoAdvance ?? false;

  await mutate(
    {
      type: 'setProgramAutoAdvance',
      optimistic: () => {
        _patchConfig(growspaceId, { programAutoAdvance: enabled });
        patchDeviceIrrigationConfig(growspaceId, { programAutoAdvance: enabled });
      },
      inverse: () => {
        _patchConfig(growspaceId, { programAutoAdvance: prevValue });
        patchDeviceIrrigationConfig(growspaceId, { programAutoAdvance: prevValue });
      },
      apply: () =>
        callService('growspace_manager', 'set_irrigation_settings', {
          growspace_id: growspaceId,
          program_auto_advance: enabled,
        }),
    },
    growspaceId
  );
}

/**
 * Override the active crop-steering phase by hand (ADR-0012).
 *
 * Its **own** action rather than a field of `saveIrrigationSettings` below: the
 * phase is the backend steering machine's to decide every tick, so a settings
 * save that carried it would write whatever phase this dialog last hydrated
 * over whatever the machine has since decided. The override holds until the
 * machine next transitions on its own — a correction, not a lock.
 *
 * Optimistic: patches the phase the steering tab and the day chart read.
 */
export async function setSteeringPhase(
  growspaceId: string,
  phase: 'p1' | 'p2' | 'p3'
): Promise<void> {
  const prevValue = _getConfig(growspaceId).activeSteeringPhase;

  await mutate(
    {
      type: 'setSteeringPhase',
      optimistic: () => {
        _patchConfig(growspaceId, { activeSteeringPhase: phase });
        patchDeviceIrrigationConfig(growspaceId, { activeSteeringPhase: phase });
      },
      inverse: () => {
        _patchConfig(growspaceId, { activeSteeringPhase: prevValue });
        patchDeviceIrrigationConfig(growspaceId, { activeSteeringPhase: prevValue });
      },
      apply: () =>
        callService('growspace_manager', 'set_steering_phase', {
          growspace_id: growspaceId,
          steering_phase: phase,
        }),
    },
    growspaceId
  );
}

/**
 * Persist irrigation settings (pump entities, durations, caps, flags).
 *
 * Optimistic: patches irrigationConfigs$ with the new settings.
 * Apply: calls growspace_manager.set_irrigation_settings with serialized payload.
 * Inverse: restores the previous config on failure.
 */
export async function saveIrrigationSettings(
  growspaceId: string,
  settings: {
    irrigationPumpEntity: string;
    pumpFlowRateMlPerSec?: number;
    drainPumpEntity: string;
    irrigationDuration: number;
    drainDuration: number;
    soilTriggerPercent?: number | null;
    dailyVolumeCapLiters?: number | null;
    maxCyclesPerDay?: number | null;
    skipDuringDark?: boolean;
    pauseOnLowTank?: boolean;
    logToLogbook?: boolean;
    autoAdvanceP1ToP2?: boolean;
    autoAdvanceP2ToP3?: boolean;
    haltOnRunoffEcThreshold?: number | null;
  }
): Promise<void> {
  const prev = _getConfig(growspaceId);

  const patch: Partial<IrrigationConfig> = {
    irrigationPumpEntity: settings.irrigationPumpEntity,
    drainPumpEntity: settings.drainPumpEntity,
    irrigationDuration: settings.irrigationDuration,
    drainDuration: settings.drainDuration,
    soilTriggerPercent: settings.soilTriggerPercent,
    dailyVolumeCapLiters: settings.dailyVolumeCapLiters,
    maxCyclesPerDay: settings.maxCyclesPerDay,
    skipDuringDark: settings.skipDuringDark,
    pauseOnLowTank: settings.pauseOnLowTank,
    logToLogbook: settings.logToLogbook,
    autoAdvanceP1ToP2: settings.autoAdvanceP1ToP2,
    autoAdvanceP2ToP3: settings.autoAdvanceP2ToP3,
    haltOnRunoffEcThreshold: settings.haltOnRunoffEcThreshold,
  };
  if (settings.pumpFlowRateMlPerSec !== undefined)
    patch.pumpFlowRateMlPerSec = settings.pumpFlowRateMlPerSec;

  const payload: Record<string, unknown> = {
    growspace_id: growspaceId,
    irrigation_pump_entity: settings.irrigationPumpEntity,
    drain_pump_entity: settings.drainPumpEntity,
    irrigation_duration: settings.irrigationDuration,
    drain_duration: settings.drainDuration,
  };
  if (settings.pumpFlowRateMlPerSec !== undefined)
    payload.pump_flow_rate_ml_per_sec = settings.pumpFlowRateMlPerSec;
  if (settings.soilTriggerPercent !== undefined)
    payload.soil_trigger_percent = settings.soilTriggerPercent;
  if (settings.dailyVolumeCapLiters !== undefined)
    payload.daily_volume_cap_liters = settings.dailyVolumeCapLiters;
  if (settings.maxCyclesPerDay !== undefined) payload.max_cycles_per_day = settings.maxCyclesPerDay;
  if (settings.skipDuringDark !== undefined) payload.skip_during_dark = settings.skipDuringDark;
  if (settings.pauseOnLowTank !== undefined) payload.pause_on_low_tank = settings.pauseOnLowTank;
  if (settings.logToLogbook !== undefined) payload.log_to_logbook = settings.logToLogbook;
  if (settings.autoAdvanceP1ToP2 !== undefined)
    payload.auto_advance_p1_to_p2 = settings.autoAdvanceP1ToP2;
  if (settings.autoAdvanceP2ToP3 !== undefined)
    payload.auto_advance_p2_to_p3 = settings.autoAdvanceP2ToP3;
  if (settings.haltOnRunoffEcThreshold !== undefined)
    payload.halt_on_runoff_ec_threshold = settings.haltOnRunoffEcThreshold;

  await mutate(
    {
      type: 'saveIrrigationSettings',
      optimistic: () => {
        _patchConfig(growspaceId, patch);
        patchDeviceIrrigationConfig(growspaceId, patch);
      },
      inverse: () => {
        const restored = new Map(irrigationConfigs$.get());
        restored.set(growspaceId, prev);
        irrigationConfigs$.set(restored);
        patchDeviceIrrigationConfig(growspaceId, prev);
      },
      apply: () => callService('growspace_manager', 'set_irrigation_settings', payload),
    },
    growspaceId
  );
}

/**
 * Record a drain/runoff EC reading.
 *
 * Fire-and-forget — no optimistic update, no undo.
 */
export async function logDrainReading(
  growspaceId: string,
  params: { feedEc: number; drainEc: number; feedVolumeMl?: number; drainVolumeMl?: number }
): Promise<void> {
  const payload: Record<string, unknown> = {
    growspace_id: growspaceId,
    feed_ec: params.feedEc,
    drain_ec: params.drainEc,
  };
  if (params.feedVolumeMl !== undefined) payload.feed_volume_ml = params.feedVolumeMl;
  if (params.drainVolumeMl !== undefined) payload.drain_volume_ml = params.drainVolumeMl;

  await callService('growspace_manager', 'log_drain_reading', payload);
}

/**
 * Configure drain EC monitoring thresholds.
 *
 * Fire-and-forget — no optimistic update, no undo.
 */
export async function configureDrainMonitoring(
  growspaceId: string,
  params: { enabled?: boolean; maxEcDelta?: number; targetRunoffPercent?: number }
): Promise<void> {
  const payload: Record<string, unknown> = { growspace_id: growspaceId };
  if (params.enabled !== undefined) payload.enabled = params.enabled;
  if (params.maxEcDelta !== undefined) payload.max_ec_delta = params.maxEcDelta;
  if (params.targetRunoffPercent !== undefined)
    payload.target_runoff_percent = params.targetRunoffPercent;

  await callService('growspace_manager', 'configure_drain_monitoring', payload);
}

/**
 * Set per-stage EC target ranges. One service call per range.
 *
 * Fire-and-forget — no optimistic update, no undo.
 */
export async function setEcTargetRanges(
  growspaceId: string,
  ranges: ECTargetRange[]
): Promise<void> {
  for (const r of ranges) {
    await callService('growspace_manager', 'set_ec_target_range', {
      growspace_id: growspaceId,
      stage: r.stage,
      feed_ec_min: r.minEc,
      feed_ec_max: r.maxEc,
    });
  }
}

/**
 * Trigger a manual irrigation cycle.
 *
 * Fire-and-forget — no optimistic update, no undo.
 */
export async function runIrrigationCycle(growspaceId: string, duration?: number): Promise<void> {
  const payload: Record<string, unknown> = { growspace_id: growspaceId };
  if (duration !== undefined) payload.duration = duration;

  await callService('growspace_manager', 'run_irrigation_cycle', payload);
}

export async function fetchCropSteeringHistory(growspaceId: string): Promise<void> {
  const result = await hassCall(
    'growspace_manager/get_crop_steering_history',
    { growspace_id: growspaceId },
    CropSteeringHistorySchema
  );
  const updated = new Map(cropSteeringHistory$.get());
  updated.set(growspaceId, result);
  cropSteeringHistory$.set(updated);
}

/**
 * Fetch irrigation analytics for a growspace.
 *
 * Returns null when the backend call fails so callers can treat absent analytics
 * the same way as the legacy IrrigationAPI.getIrrigationAnalytics (sendWebSocketSafe).
 */
export async function getIrrigationAnalytics(
  growspaceId: string
): Promise<IrrigationAnalytics | null> {
  try {
    return await hassCall(
      'growspace_manager/irrigation_analytics',
      { growspace_id: growspaceId },
      IrrigationAnalyticsSchema
    );
  } catch (err) {
    console.error(
      '[IrrigationSlice] getIrrigationAnalytics failed:',
      err instanceof Error ? err.message : err
    );
    return null;
  }
}
