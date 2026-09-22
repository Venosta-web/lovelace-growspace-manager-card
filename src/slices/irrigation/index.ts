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
 *
 * The configuration mutators — settings, strategy (mode toggle and the
 * immediate lights-on edit included), the manual phase override, the Program
 * auto-advance consent and the Steering Mode stamp — are adapters over the
 * [[Irrigation Command]] module in `irrigation-command.ts`, which owns
 * compilation, clearing semantics, strict outbound validation, the optimistic
 * projections and their inverse. That module is deliberately not re-exported:
 * callers ask for the change they mean by name. Schedules, Drain Monitoring,
 * readings, cycles, analytics, the recipe and program stamps, and hydration
 * are outside it and keep their own writers here.
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
import {
  irrigationConfigs$,
  irrigationStrategies$,
  patchIrrigationConfig,
  patchIrrigationStrategy,
  readIrrigationConfig,
  readIrrigationStrategy,
} from './read-model';
import {
  runIrrigationCommand,
  type IrrigationSettingsChange,
  type SteeringPhase,
} from './irrigation-command';
import type { IrrigationMode, PhaseWindows, IrrigationAnalytics } from './schema';
import { IrrigationAnalyticsSchema } from './schema';
import {
  patchDeviceIrrigationConfig,
  patchDeviceProgramBinding,
  patchDeviceRecipeStamp,
} from '../grid';
import { CropSteeringHistorySchema, type CropSteeringHistory } from '../../schemas/api-schema';
import type { SteeringMode } from './schema';
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

export { irrigationConfigs$, irrigationStrategies$ } from './read-model';
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
 * One strategy field, so it is an [[Irrigation Command]] like any other
 * strategy change; the flip is computed from the stored value here because the
 * gesture is "the other one", not a value the caller names.
 */
export async function toggleIrrigationMode(growspaceId: string): Promise<void> {
  await runIrrigationCommand({
    kind: 'strategy',
    type: 'toggleIrrigationMode',
    growspaceId,
    strategy: { enabled: !readIrrigationStrategy(growspaceId).enabled },
  });
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
  const prev = readIrrigationConfig(growspaceId);
  const next = _sortByTime([...prev.irrigationTimes, { time, duration }]);

  await mutate(
    {
      type: 'addIrrigationTime',
      optimistic: () => {
        patchIrrigationConfig(growspaceId, { irrigationTimes: next });
        patchDeviceIrrigationConfig(growspaceId, { irrigationTimes: next });
      },
      inverse: () => {
        patchIrrigationConfig(growspaceId, { irrigationTimes: prev.irrigationTimes });
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
  const prev = readIrrigationConfig(growspaceId);
  const next = prev.irrigationTimes.filter((t) => t.time !== time);

  await mutate(
    {
      type: 'removeIrrigationTime',
      optimistic: () => {
        patchIrrigationConfig(growspaceId, { irrigationTimes: next });
        patchDeviceIrrigationConfig(growspaceId, { irrigationTimes: next });
      },
      inverse: () => {
        patchIrrigationConfig(growspaceId, { irrigationTimes: prev.irrigationTimes });
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
  const prev = readIrrigationConfig(growspaceId);
  const next = _sortByTime([...prev.drainTimes, { time, duration }]);

  await mutate(
    {
      type: 'addDrainTime',
      optimistic: () => {
        patchIrrigationConfig(growspaceId, { drainTimes: next });
        patchDeviceIrrigationConfig(growspaceId, { drainTimes: next });
      },
      inverse: () => {
        patchIrrigationConfig(growspaceId, { drainTimes: prev.drainTimes });
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
  const prev = readIrrigationConfig(growspaceId);
  const next = prev.drainTimes.filter((t) => t.time !== time);

  await mutate(
    {
      type: 'removeDrainTime',
      optimistic: () => {
        patchIrrigationConfig(growspaceId, { drainTimes: next });
        patchDeviceIrrigationConfig(growspaceId, { drainTimes: next });
      },
      inverse: () => {
        patchIrrigationConfig(growspaceId, { drainTimes: prev.drainTimes });
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
 * The whole-form Steering save and every immediate-persist control come through
 * here, including the Growlights tab's lights-on edit. It is a **sparse** change
 * — an omitted field keeps whatever the growspace has stored — and the fields
 * the backend does not let a strategy write name (the detected lights-on time,
 * the declared Steering Mode, the recipe and program stamps) are dropped by the
 * [[Irrigation Command]] compiler rather than refused, because the Steering
 * tab's draft is seeded from the whole strategy and legitimately carries them.
 */
export async function updateIrrigationStrategy(
  growspaceId: string,
  updates: Partial<IrrigationStrategy>
): Promise<void> {
  await runIrrigationCommand({
    kind: 'strategy',
    type: 'updateIrrigationStrategy',
    growspaceId,
    strategy: updates,
  });
}

/**
 * Stamp a Steering Mode's server-owned preset into the strategy (ADR-0012).
 *
 * The server owns the preset table and writes the new field values; the WS
 * command returns only the declared mode, so the only thing shown optimistically
 * is the selected intent — the stamped numeric values arrive with the next
 * device sync. Its own command kind rather than a strategy field: naming a mode
 * is the whole payload, and the preset values are unwritable through it.
 */
export async function applySteeringMode(growspaceId: string, mode: SteeringMode): Promise<void> {
  await runIrrigationCommand({
    kind: 'steering-mode',
    type: 'applySteeringMode',
    growspaceId,
    mode,
  });
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
  const prev = readIrrigationStrategy(growspaceId);
  const prevStamp = {
    appliedRecipeId: prev.appliedRecipeId ?? null,
    recipeAppliedAt: prev.recipeAppliedAt ?? null,
  };
  let result!: ApplyIrrigationRecipeResult;

  await mutate(
    {
      type: 'applyIrrigationRecipe',
      optimistic: () => {
        patchIrrigationStrategy(growspaceId, { appliedRecipeId: recipeId });
        patchDeviceRecipeStamp(growspaceId, { appliedRecipeId: recipeId });
      },
      // Failure rollback only. A committed stamp has no inverse — it overwrote
      // the previous setpoints and they are not recoverable — so, exactly as for
      // the Steering Mode stamp, the way back is to re-apply the recipe the
      // growspace was on. The drift verdict is deliberately untouched here: if
      // the apply never committed, the verdict the backend last gave is still
      // the right one.
      inverse: () => {
        patchIrrigationStrategy(growspaceId, prevStamp);
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
        patchIrrigationStrategy(growspaceId, {
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
  const prev = readIrrigationStrategy(growspaceId);
  const prevProgramId = prev.irrigationProgramId ?? null;

  await mutate(
    {
      type: 'assignIrrigationProgram',
      optimistic: () => {
        patchIrrigationStrategy(growspaceId, { irrigationProgramId: programId });
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
        patchIrrigationStrategy(growspaceId, { irrigationProgramId: prevProgramId });
        patchDeviceProgramBinding(growspaceId, { irrigationProgramId: prevProgramId });
      },
      apply: async () => {
        const result = await hassCall(
          'growspace_manager/assign_irrigation_program',
          { growspace_id: growspaceId, program_id: programId },
          AssignIrrigationProgramResultSchema
        );
        // The reply is authoritative about what the growspace now holds.
        patchIrrigationStrategy(growspaceId, { irrigationProgramId: result.irrigation_program_id });
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
  await runIrrigationCommand({
    kind: 'settings',
    type: 'setProgramAutoAdvance',
    growspaceId,
    settings: { programAutoAdvance: enabled },
  });
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
export async function setSteeringPhase(growspaceId: string, phase: SteeringPhase): Promise<void> {
  await runIrrigationCommand({
    kind: 'steering-phase',
    type: 'setSteeringPhase',
    growspaceId,
    phase,
  });
}

/**
 * Persist irrigation settings (pump entities, durations, caps, flags).
 *
 * The whole-form save from the Irrigation dialog, which is why the four
 * hardware fields are required here while every other settings field — and
 * every field of a sparse settings command — stays optional. A `null` pump
 * entity means "no pump"; the [[Irrigation Command]] compiler turns it into the
 * empty string the action has always read that way. `null` also clears the
 * three optional caps and the runoff-EC halt; anything else the backend has no
 * clear for is refused before the growspace is touched.
 */
export async function saveIrrigationSettings(
  growspaceId: string,
  settings: IrrigationSettingsChange & {
    irrigationPumpEntity: string | null;
    drainPumpEntity: string | null;
    irrigationDuration: number;
    drainDuration: number;
  }
): Promise<void> {
  await runIrrigationCommand({
    kind: 'settings',
    type: 'saveIrrigationSettings',
    growspaceId,
    settings,
  });
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
