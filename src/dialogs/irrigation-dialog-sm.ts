/**
 * Irrigation Dialog State Machine
 *
 * Pure module — no Lit, no DOM. All interaction state for IrrigationDialog lives here.
 * The component calls `transition(sm, event)` and replaces its single `@state() _sm`.
 *
 * Structure:
 *   DialogSM
 *     .activeTab          — which tab is visible
 *     .status             — root-level async/confirm overlay
 *     .toast              — transient error message
 *     .tabs               — one typed state object per tab (draft + sub-state)
 */

import type { IrrigationStrategy, GrowspaceDevice } from '../types';
import type { ECTargetRange, SteeringMode } from '../services/types';
import type { ECRampCurve, ECRampPoint } from '../slices/nutrient';

// ─── Shared primitives ────────────────────────────────────────────────────────

export type Phase = 'p1' | 'p2' | 'p3';

export type TabId =
  | 'overview'
  | 'schedules'
  | 'steering'
  | 'config'
  | 'tanks'
  | 'water_analytics'
  | 'drain_ec'
  | 'substrate_ec'
  | 'ec_ramp'
  | 'recipes'
  | 'program';

// ─── Overview tab (read-only crop-steering diagnostics) ─────────────────────────

export interface OverviewTabState {
  sub: { kind: 'idle' };
}

// ─── Schedules tab ─────────────────────────────────────────────────────────────

export interface SchedulesDraft {
  irrigationPumpEntity: string;
  drainPumpEntity: string;
  irrigationDuration: number;
  drainDuration: number;
}

export type SchedulesSubState =
  | { kind: 'idle' }
  | { kind: 'adding-irrigation'; time: string; duration: number }
  | {
      kind: 'editing-irrigation';
      originalTime: string;
      originalDuration: number;
      time: string;
      duration: number;
    }
  | { kind: 'adding-drain'; time: string; duration: number }
  | {
      kind: 'editing-drain';
      originalTime: string;
      originalDuration: number;
      time: string;
      duration: number;
    };

export interface SchedulesTabState {
  draft: SchedulesDraft;
  sub: SchedulesSubState;
}

// ─── Steering tab ──────────────────────────────────────────────────────────────

export type SteeringSubState =
  | { kind: 'idle' }
  | { kind: 'confirm-phase'; pending: Phase }
  | { kind: 'confirm-mode'; pending: SteeringMode };

export interface SteeringTabState {
  draft: Partial<IrrigationStrategy>;
  phase: Phase;
  sub: SteeringSubState;
}

// ─── Config tab ────────────────────────────────────────────────────────────────

export interface ConfigDraft {
  pumpFlowRateMlPerSec: number;
  soilTriggerPercent: number | null;
  dailyVolumeCapLiters: number | null;
  maxCyclesPerDay: number | null;
  skipDuringDark: boolean;
  pauseOnLowTank: boolean;
  logToLogbook: boolean;
  autoAdvanceP1ToP2: boolean;
  autoAdvanceP2ToP3: boolean;
  haltOnRunoffEcThreshold: number | null;
}

export interface ConfigTabState {
  draft: ConfigDraft;
  sub: { kind: 'idle' };
}

// ─── Tanks tab ─────────────────────────────────────────────────────────────────

/** The editable Tank Config facet (see CONTEXT.md "Tank Config vs Tank Levels"). */
export interface TankDraft {
  sensorEntity: string;
  name: string;
  volumeLiters: number | null;
  warningLevel: number;
}

/**
 * Transient inline-edit sub-state for the Tanks tab — one tank at a time,
 * opened on demand and discarded on cancel (the Schedules `editing-*` shape,
 * not a persistent draft). Identity is by array `index`; if a sync push
 * reorders/removes tanks mid-edit the index can point at a different tank — a
 * known limitation carried over from the pre-decomposition component state,
 * tracked separately, deliberately not fixed in this refactor.
 */
export type TanksSubState = { kind: 'idle' } | { kind: 'editing'; index: number; draft: TankDraft };

export interface TanksTabState {
  sub: TanksSubState;
}

// ─── Water analytics tab ───────────────────────────────────────────────────────

export interface WaterAnalyticsTabState {
  stageAggregates: Record<string, number> | null;
  sub: { kind: 'idle' };
}

// ─── Drain EC tab ──────────────────────────────────────────────────────────────

export interface DrainEcDraft {
  enabled: boolean;
  maxEcDelta: number;
  targetRunoffPercent: number;
  logFeedEc: number;
  logDrainEc: number;
  logFeedVolume: number;
  logDrainVolume: number;
}

export type DrainEcSubState = { kind: 'idle' } | { kind: 'saving' } | { kind: 'logging' };

export interface DrainEcTabState {
  draft: DrainEcDraft;
  sub: DrainEcSubState;
}

// ─── Substrate & EC tab ──────────────────────────────────────────────────────
//
// Buffered draft holds only the values saved through the dialog footer: the
// pore-EC band (validated min ≤ max on save) and the per-stage feed-EC ranges.
// Shot Sizing Mode, Substrate Profile, and EC Modulation persist immediately on
// edit (ADR-0017) and are NOT part of this draft or the dirty guard.

export interface SubstrateEcDraft {
  ecTargetRanges: ECTargetRange[];
  poreEcMin: number | null;
  poreEcMax: number | null;
}

export interface SubstrateEcTabState {
  draft: SubstrateEcDraft;
  sub: { kind: 'idle' };
}

// ─── EC Ramp tab ───────────────────────────────────────────────────────────────

/**
 * The editable EC Ramp Curve draft — the partial curve open in the inline
 * editor. `id` is present only when editing an existing curve (absent for a
 * new one). Point edits operate on this `points` array.
 */
export type EcRampCurveDraft = Partial<ECRampCurve>;

/**
 * Transient inline-edit sub-state for the EC Ramp tab — mirrors the tanks
 * `editing` shape but as a LIST/EDIT discriminated view. In `list` the tab shows
 * the saved curves; in `editing` it shows the form bound to `draft`. `error`
 * carries synchronous validation copy (name required, ≥1 valid point); save and
 * remove *rejections* surface as a root toast instead (ADR-0015).
 */
export type EcRampSubState = { kind: 'list' } | { kind: 'editing'; draft: EcRampCurveDraft };

export interface EcRampTabState {
  sub: EcRampSubState;
  /** Synchronous validation error for the open editor, or null. */
  error: string | null;
}

// ─── Recipes tab ───────────────────────────────────────────────────────────────
//
// The tab holds no buffered copy of the growspace's settings: saving a recipe
// snapshots what is already persisted, and applying one is a server-side stamp.
// So its draft is only the two things the grower types or picks, and the tab
// takes no part in the dirty guard — there is nothing here to lose.

export interface RecipesDraft {
  /** Name for the recipe the save form will create. */
  name: string;
  /**
   * The recipe the grower explicitly picked, or `null` while they have not.
   * `null` is not "nothing selected": the Recipes Tab ViewModel resolves it to
   * the pre-selection its [[Recipe Provenance]] ordering puts first, so the
   * picker opens on the most relevant recipe without that guess ever becoming
   * a choice the grower did not make.
   */
  selectedRecipeId: string | null;
}

export interface RecipesTabState {
  draft: RecipesDraft;
  /**
   * The notice the backend returned from the last apply, or null.
   *
   * Held rather than toasted because it is not an error and not transient: a
   * cross-media apply **succeeded**, and what it says — that the values were
   * copied unscaled — stays true about the growspace afterwards. It is the
   * backend's own wording, so the card never paraphrases the one thing it
   * cannot re-derive.
   */
  applyWarning: string | null;
  sub: { kind: 'idle' };
}

// ─── Program tab ───────────────────────────────────────────────────────────────
//
// Like the Recipes tab, this holds no buffered copy of the growspace's
// settings: assigning writes one id, applying is a server-side stamp, and the
// auto-advance flag is persisted the moment it is confirmed. So its draft is
// only the program the grower has picked in the assign control, and the tab
// takes no part in the dirty guard.

/** A consequence the grower is shown before it is allowed to happen. */
export type ProgramConfirm =
  /**
   * Turning auto-advance on while a program is assigned. It is not a preference
   * that takes effect later: the growspace is already in a week of the plan, so
   * switching it on is consent for that week's recipe to be stamped. Saying so
   * first is the whole reason this state exists.
   */
  { kind: 'enable-auto-advance' };

export interface ProgramDraft {
  /**
   * The program the grower explicitly picked in the assign control.
   *
   * Three states, and all three are needed. `undefined` is "they have not
   * picked", which the Program Tab ViewModel resolves to whatever the growspace
   * is already bound to, so the control opens on the truth rather than on an
   * empty box. `null` is a **pick**: the grower chose "no program", which is
   * how a growspace is unbound. Collapsing the two would make unbinding
   * unreachable, because it would read as never having chosen at all.
   */
  pickedProgramId: string | null | undefined;
}

export interface ProgramTabState {
  draft: ProgramDraft;
  /** The pending confirmation, or null. */
  confirm: ProgramConfirm | null;
  sub: { kind: 'idle' };
}

// ─── Root SM ───────────────────────────────────────────────────────────────────

export interface TabStates {
  overview: OverviewTabState;
  schedules: SchedulesTabState;
  steering: SteeringTabState;
  config: ConfigTabState;
  tanks: TanksTabState;
  water_analytics: WaterAnalyticsTabState;
  drain_ec: DrainEcTabState;
  substrate_ec: SubstrateEcTabState;
  ec_ramp: EcRampTabState;
  recipes: RecipesTabState;
  program: ProgramTabState;
}

/** Root-level overlays (not scoped to a tab). */
export type DialogStatus =
  | { kind: 'idle' }
  | { kind: 'confirm-discard'; pendingTab: TabId }
  | { kind: 'applying'; action: string; params: unknown }
  | { kind: 'run-now-saving' };

export interface DialogSM {
  activeTab: TabId;
  tabs: TabStates;
  status: DialogStatus;
  toast: string | undefined;
}

// ─── Events ────────────────────────────────────────────────────────────────────

export type DialogEvent =
  // ── Navigation ──
  /**
   * Request a tab switch. If the active tab has unsaved changes the component
   * should pass this event; the SM enters `confirm-discard` state.
   * If the tab is clean, use SWITCH_TAB instead.
   */
  | { type: 'REQUEST_TAB'; tab: TabId }
  /** Direct tab switch — no dirty check. */
  | { type: 'SWITCH_TAB'; tab: TabId }
  /** User confirmed "discard changes" — reset active tab draft and switch. */
  | { type: 'DISCARD_AND_SWITCH' }
  /** User cancelled the discard prompt — stay on current tab. */
  | { type: 'CANCEL_TAB_SWITCH' }

  // ── Schedules ──
  | { type: 'BEGIN_ADD_IRRIGATION'; time: string; duration: number }
  | { type: 'BEGIN_ADD_DRAIN'; time: string; duration: number }
  | {
      type: 'BEGIN_EDIT_IRRIGATION';
      originalTime: string;
      originalDuration: number;
      time: string;
      duration: number;
    }
  | {
      type: 'BEGIN_EDIT_DRAIN';
      originalTime: string;
      originalDuration: number;
      time: string;
      duration: number;
    }
  | { type: 'CANCEL_INLINE' }
  | { type: 'UPDATE_ADD_IRRIGATION'; time?: string; duration?: number }
  | { type: 'UPDATE_ADD_DRAIN'; time?: string; duration?: number }
  | { type: 'UPDATE_EDIT_IRRIGATION'; time?: string; duration?: number }
  | { type: 'UPDATE_EDIT_DRAIN'; time?: string; duration?: number }
  | { type: 'UPDATE_SCHEDULES_DRAFT'; partial: Partial<SchedulesDraft> }

  // ── Steering ──
  | { type: 'REQUEST_PHASE_CHANGE'; phase: Phase }
  | { type: 'CONFIRM_PHASE_CHANGE' }
  | { type: 'CANCEL_PHASE_CHANGE' }
  | { type: 'REQUEST_STEERING_MODE'; mode: SteeringMode }
  | { type: 'CANCEL_STEERING_MODE' }
  | { type: 'UPDATE_STEERING_DRAFT'; partial: Partial<IrrigationStrategy> }

  // ── Config ──
  | { type: 'UPDATE_CONFIG_DRAFT'; partial: Partial<ConfigDraft> }

  // ── Tanks ──
  /** Open the inline editor for the tank at `index`, seeded with its config. */
  | { type: 'EDIT_TANK'; index: number; draft: TankDraft }
  /** Merge a field change into the open tank draft (no-op when not editing). */
  | { type: 'UPDATE_TANK_DRAFT'; partial: Partial<TankDraft> }
  /** Close the inline tank editor, discarding the draft. */
  | { type: 'CANCEL_TANK_EDIT' }

  // ── EC Ramp ──
  /** Open the editor for a brand-new curve (seeded with one default point). */
  | { type: 'EC_RAMP_START_NEW' }
  /** Open the editor seeded from an existing curve (deep-copied by the caller). */
  | { type: 'EC_RAMP_EDIT_CURVE'; draft: EcRampCurveDraft }
  /** Close the editor and return to the list. */
  | { type: 'EC_RAMP_CANCEL_EDIT' }
  /** Merge a field change (name/stage) into the open curve draft. */
  | { type: 'UPDATE_EC_RAMP_CURVE'; partial: Partial<ECRampCurve> }
  /** Append a point to the open curve draft (day/EC stepped off the last point). */
  | { type: 'EC_RAMP_ADD_POINT' }
  /** Remove the point at `index` from the open curve draft. */
  | { type: 'EC_RAMP_REMOVE_POINT'; index: number }
  /** Merge a partial into the point at `index` of the open curve draft. */
  | { type: 'EC_RAMP_UPDATE_POINT'; index: number; partial: Partial<ECRampPoint> }
  /** Set (or clear) the synchronous validation error for the open editor. */
  | { type: 'SET_EC_RAMP_ERROR'; error: string | null }

  // ── Recipes ──
  /** Type into the "save current settings as a recipe" name field. */
  | { type: 'UPDATE_RECIPE_NAME'; name: string }
  /** Pick a recipe in the apply picker, replacing the VM's pre-selection. */
  | { type: 'SELECT_RECIPE'; recipeId: string }
  /** Carry (or clear) the notice an apply returned. */
  | { type: 'SET_RECIPE_APPLY_WARNING'; warning: string | null }

  // ── Program ──
  /** Pick a program in the assign control; null is the unbind option. */
  | { type: 'SELECT_PROGRAM'; programId: string | null }
  /** Raise (or clear) the consequence the grower must accept before it happens. */
  | { type: 'SET_PROGRAM_CONFIRM'; confirm: ProgramConfirm | null }

  // ── Drain EC ──
  | { type: 'UPDATE_DRAIN_EC_DRAFT'; partial: Partial<DrainEcDraft> }
  | { type: 'SET_DRAIN_SAVING'; saving: boolean }
  | { type: 'SET_DRAIN_LOGGING'; logging: boolean }

  // ── EC Targets ──
  | { type: 'UPDATE_EC_TARGETS_DRAFT'; ranges: ECTargetRange[] }
  | { type: 'UPDATE_PORE_EC_BAND'; min: number | null; max: number | null }

  // ── Mutation run (MutationRunController seam — ADR-0015) ──
  /**
   * A synchronous handler asks to run a mutation. Moves status to
   * `applying { action, params }`; the MutationRunController runs the matching
   * effect post-render. Params travel in the status — never read sub-state in
   * the effect, it may be cleared by the time the effect runs.
   */
  | { type: 'SaveRequested'; action: string; params: unknown }
  /** Effect succeeded — return to idle. No success toast (mutate() already toasts). */
  | { type: 'SaveResolved' }
  /** Effect rejected — return to idle and surface a transient error toast. */
  | { type: 'SaveFailed'; action: string; error: unknown }

  // ── Global ──
  | { type: 'SET_TOAST'; message: string | undefined }
  | { type: 'SET_RUN_NOW_SAVING'; saving: boolean }
  | { type: 'SET_STAGE_AGGREGATES'; data: Record<string, number> | null }
  | { type: 'RESET_FROM_DEVICE'; device: GrowspaceDevice };

// ─── Initial state ──────────────────────────────────────────────────────────────

const EC_STAGES = ['seedling', 'veg', 'flower_early', 'flower_mid', 'flower_late'] as const;

function defaultSchedulesDraft(): SchedulesDraft {
  return {
    irrigationPumpEntity: '',
    drainPumpEntity: '',
    irrigationDuration: 60,
    drainDuration: 60,
  };
}

function defaultSteeringDraft(): Partial<IrrigationStrategy> {
  return {
    enabled: false,
    lightsOnTime: '06:00:00',
    p0DurationMinutes: 60,
    p2StopBeforeLightsOffMinutes: 120,
    targetVwcPercent: 45.0,
    maintenanceDrybackPercent: 3.0,
    shotDurationSeconds: 15,
    shotIntervalMinutes: 15,
    p1ShotDurationSeconds: 15,
    p1ShotIntervalMinutes: 15,
    p2ShotDurationSeconds: 15,
    p2ShotIntervalMinutes: 15,
    p1ShotVolumePercent: 4.0,
    p2ShotVolumePercent: 4.0,
    autoLightTracking: false,
    detectedLightsOnTime: null,
    declaredSteeringMode: null,
    dynamicShotEnabled: true,
    dynamicAggressiveness: 1.0,
    dynamicRecovery: 0.1,
    dynamicShotSizeFloor: 0.5,
    dynamicIntervalCeiling: 1.5,
  };
}

function defaultConfigDraft(): ConfigDraft {
  return {
    pumpFlowRateMlPerSec: 0,
    soilTriggerPercent: null,
    dailyVolumeCapLiters: null,
    maxCyclesPerDay: null,
    skipDuringDark: false,
    pauseOnLowTank: true,
    logToLogbook: true,
    autoAdvanceP1ToP2: false,
    autoAdvanceP2ToP3: false,
    haltOnRunoffEcThreshold: null,
  };
}

function defaultDrainEcDraft(): DrainEcDraft {
  return {
    enabled: false,
    maxEcDelta: 1.0,
    targetRunoffPercent: 20,
    logFeedEc: 2.0,
    logDrainEc: 2.0,
    logFeedVolume: 0,
    logDrainVolume: 0,
  };
}

function defaultEcTargetRanges(): ECTargetRange[] {
  return EC_STAGES.map((stage) => ({ stage, minEc: 0, maxEc: 0 }));
}

function defaultSubstrateEcDraft(): SubstrateEcDraft {
  return { ecTargetRanges: defaultEcTargetRanges(), poreEcMin: null, poreEcMax: null };
}

/** Seed the feed-EC ranges from device config, padding missing stages with zeros. */
function ecTargetRangesFromConfig(ranges: ECTargetRange[] | undefined): ECTargetRange[] {
  if (!ranges || ranges.length === 0) return defaultEcTargetRanges();
  return EC_STAGES.map(
    (stage) => ranges.find((r) => r.stage === stage) ?? { stage, minEc: 0, maxEc: 0 }
  );
}

function defaultRecipesDraft(): RecipesDraft {
  return { name: '', selectedRecipeId: null };
}

function defaultProgramTab(): ProgramTabState {
  return { draft: { pickedProgramId: undefined }, confirm: null, sub: { kind: 'idle' } };
}

function defaultTabs(): TabStates {
  return {
    overview: { sub: { kind: 'idle' } },
    schedules: { draft: defaultSchedulesDraft(), sub: { kind: 'idle' } },
    steering: { draft: defaultSteeringDraft(), phase: 'p2', sub: { kind: 'idle' } },
    config: { draft: defaultConfigDraft(), sub: { kind: 'idle' } },
    tanks: { sub: { kind: 'idle' } },
    water_analytics: { stageAggregates: null, sub: { kind: 'idle' } },
    drain_ec: { draft: defaultDrainEcDraft(), sub: { kind: 'idle' } },
    substrate_ec: { draft: defaultSubstrateEcDraft(), sub: { kind: 'idle' } },
    ec_ramp: { sub: { kind: 'list' }, error: null },
    recipes: { draft: defaultRecipesDraft(), applyWarning: null, sub: { kind: 'idle' } },
    program: defaultProgramTab(),
  };
}

/** Create the initial SM state, optionally seeded from a device. */
export function createInitialSM(device?: GrowspaceDevice): DialogSM {
  const sm: DialogSM = {
    activeTab: 'schedules',
    tabs: defaultTabs(),
    status: { kind: 'idle' },
    toast: undefined,
  };
  if (device) {
    return applyDeviceToSM(sm, device);
  }
  return sm;
}

/** Rebuild tab drafts from device data (used on dialog open and after RESET_FROM_DEVICE). */
function applyDeviceToSM(sm: DialogSM, device: GrowspaceDevice): DialogSM {
  const config = device.irrigationConfig ?? {};
  const strat = device.irrigationStrategy;
  const dc = device.drainConfig;

  const schedulesDraft: SchedulesDraft = {
    irrigationPumpEntity: config.irrigationPumpEntity ?? '',
    drainPumpEntity: config.drainPumpEntity ?? '',
    irrigationDuration: config.irrigationDuration ?? 60,
    drainDuration: config.drainDuration ?? 60,
  };

  const steeringDraft: Partial<IrrigationStrategy> = {
    enabled: strat?.enabled ?? false,
    lightsOnTime: strat?.lightsOnTime ?? '06:00:00',
    p0DurationMinutes: strat?.p0DurationMinutes ?? 60,
    p2StopBeforeLightsOffMinutes: strat?.p2StopBeforeLightsOffMinutes ?? 120,
    targetVwcPercent: strat?.targetVwcPercent ?? 45.0,
    maintenanceDrybackPercent: strat?.maintenanceDrybackPercent ?? 3.0,
    shotDurationSeconds: strat?.shotDurationSeconds ?? 15,
    shotIntervalMinutes: strat?.shotIntervalMinutes ?? 15,
    p1ShotDurationSeconds: strat?.p1ShotDurationSeconds ?? strat?.shotDurationSeconds ?? 15,
    p1ShotIntervalMinutes: strat?.p1ShotIntervalMinutes ?? strat?.shotIntervalMinutes ?? 15,
    p2ShotDurationSeconds: strat?.p2ShotDurationSeconds ?? strat?.shotDurationSeconds ?? 15,
    p2ShotIntervalMinutes: strat?.p2ShotIntervalMinutes ?? strat?.shotIntervalMinutes ?? 15,
    p1ShotVolumePercent: strat?.p1ShotVolumePercent ?? 4.0,
    p2ShotVolumePercent: strat?.p2ShotVolumePercent ?? 4.0,
    // shotSizingMode is intentionally absent: it persists immediately on toggle
    // (ADR-0017) and is read from the live strategy, not buffered here.
    autoLightTracking: strat?.autoLightTracking ?? false,
    detectedLightsOnTime: strat?.detectedLightsOnTime ?? null,
    declaredSteeringMode: strat?.declaredSteeringMode ?? null,
    dynamicShotEnabled: strat?.dynamicShotEnabled ?? true,
    dynamicAggressiveness: strat?.dynamicAggressiveness ?? 1.0,
    dynamicRecovery: strat?.dynamicRecovery ?? 0.1,
    dynamicShotSizeFloor: strat?.dynamicShotSizeFloor ?? 0.5,
    dynamicIntervalCeiling: strat?.dynamicIntervalCeiling ?? 1.5,
  };

  const configDraft: ConfigDraft = {
    pumpFlowRateMlPerSec: config.pumpFlowRateMlPerSec ?? 0,
    soilTriggerPercent: config.soilTriggerPercent ?? null,
    dailyVolumeCapLiters: config.dailyVolumeCapLiters ?? null,
    maxCyclesPerDay: config.maxCyclesPerDay ?? null,
    skipDuringDark: config.skipDuringDark ?? false,
    pauseOnLowTank: config.pauseOnLowTank ?? true,
    logToLogbook: config.logToLogbook ?? true,
    autoAdvanceP1ToP2: config.autoAdvanceP1ToP2 ?? false,
    autoAdvanceP2ToP3: config.autoAdvanceP2ToP3 ?? false,
    haltOnRunoffEcThreshold: config.haltOnRunoffEcThreshold ?? null,
  };

  const drainEcDraft: DrainEcDraft = {
    enabled: dc?.enabled ?? false,
    maxEcDelta: dc?.maxEcDelta ?? 1.0,
    targetRunoffPercent: dc?.targetRunoffPercent ?? 20,
    logFeedEc: sm.tabs.drain_ec.draft.logFeedEc,
    logDrainEc: sm.tabs.drain_ec.draft.logDrainEc,
    logFeedVolume: sm.tabs.drain_ec.draft.logFeedVolume,
    logDrainVolume: sm.tabs.drain_ec.draft.logDrainVolume,
  };

  const substrateEcDraft: SubstrateEcDraft = {
    ecTargetRanges: ecTargetRangesFromConfig(config.ecTargetRanges),
    poreEcMin: strat?.poreEcTargetMin ?? null,
    poreEcMax: strat?.poreEcTargetMax ?? null,
  };

  const phase: Phase = (config.activeSteeringPhase as Phase | undefined) ?? sm.tabs.steering.phase;

  return {
    ...sm,
    tabs: {
      ...sm.tabs,
      schedules: { ...sm.tabs.schedules, draft: schedulesDraft },
      steering: { ...sm.tabs.steering, draft: steeringDraft, phase },
      config: { ...sm.tabs.config, draft: configDraft },
      drain_ec: { ...sm.tabs.drain_ec, draft: drainEcDraft },
      substrate_ec: { ...sm.tabs.substrate_ec, draft: substrateEcDraft },
    },
  };
}

// ─── Dirty predicates ───────────────────────────────────────────────────────────

/** True if the schedules tab has unsaved form changes relative to the device. */
export function isSchedulesDirty(sm: DialogSM, device: GrowspaceDevice): boolean {
  const d = sm.tabs.schedules.draft;
  const c = device.irrigationConfig ?? {};
  return (
    d.irrigationPumpEntity !== (c.irrigationPumpEntity ?? '') ||
    d.drainPumpEntity !== (c.drainPumpEntity ?? '') ||
    d.irrigationDuration !== (c.irrigationDuration ?? 60) ||
    d.drainDuration !== (c.drainDuration ?? 60)
  );
}

/** True if the steering tab has unsaved form changes relative to the device. */
export function isSteeringDirty(sm: DialogSM, device: GrowspaceDevice): boolean {
  const d = sm.tabs.steering.draft;
  const s = device.irrigationStrategy;
  if (!s) return false;
  return (
    d.enabled !== s.enabled ||
    d.lightsOnTime !== s.lightsOnTime ||
    d.p0DurationMinutes !== s.p0DurationMinutes ||
    d.p2StopBeforeLightsOffMinutes !== s.p2StopBeforeLightsOffMinutes ||
    d.targetVwcPercent !== s.targetVwcPercent ||
    d.maintenanceDrybackPercent !== s.maintenanceDrybackPercent ||
    d.shotDurationSeconds !== s.shotDurationSeconds ||
    d.shotIntervalMinutes !== s.shotIntervalMinutes ||
    // Per-phase fields fall back to the legacy shared values, mirroring hydrate,
    // so a device predating the per-phase split is not reported as dirty.
    (d.p1ShotDurationSeconds ?? s.shotDurationSeconds) !==
      (s.p1ShotDurationSeconds ?? s.shotDurationSeconds) ||
    (d.p1ShotIntervalMinutes ?? s.shotIntervalMinutes) !==
      (s.p1ShotIntervalMinutes ?? s.shotIntervalMinutes) ||
    (d.p2ShotDurationSeconds ?? s.shotDurationSeconds) !==
      (s.p2ShotDurationSeconds ?? s.shotDurationSeconds) ||
    (d.p2ShotIntervalMinutes ?? s.shotIntervalMinutes) !==
      (s.p2ShotIntervalMinutes ?? s.shotIntervalMinutes) ||
    (d.p1ShotVolumePercent ?? 4.0) !== (s.p1ShotVolumePercent ?? 4.0) ||
    (d.p2ShotVolumePercent ?? 4.0) !== (s.p2ShotVolumePercent ?? 4.0) ||
    // shotSizingMode is not buffered here (ADR-0017) — it persists immediately.
    (d.autoLightTracking ?? false) !== (s.autoLightTracking ?? false) ||
    (d.detectedLightsOnTime ?? null) !== (s.detectedLightsOnTime ?? null) ||
    (d.dynamicShotEnabled ?? true) !== (s.dynamicShotEnabled ?? true) ||
    (d.dynamicAggressiveness ?? 1.0) !== (s.dynamicAggressiveness ?? 1.0) ||
    (d.dynamicRecovery ?? 0.1) !== (s.dynamicRecovery ?? 0.1) ||
    (d.dynamicShotSizeFloor ?? 0.5) !== (s.dynamicShotSizeFloor ?? 0.5) ||
    (d.dynamicIntervalCeiling ?? 1.5) !== (s.dynamicIntervalCeiling ?? 1.5)
  );
}

/** True if the config tab has unsaved form changes relative to the device. */
export function isConfigDirty(sm: DialogSM, device: GrowspaceDevice): boolean {
  const d = sm.tabs.config.draft;
  const c = device.irrigationConfig ?? {};
  return (
    d.pumpFlowRateMlPerSec !== (c.pumpFlowRateMlPerSec ?? 0) ||
    d.soilTriggerPercent !== (c.soilTriggerPercent ?? null) ||
    d.dailyVolumeCapLiters !== (c.dailyVolumeCapLiters ?? null) ||
    d.maxCyclesPerDay !== (c.maxCyclesPerDay ?? null) ||
    d.skipDuringDark !== (c.skipDuringDark ?? false) ||
    d.pauseOnLowTank !== (c.pauseOnLowTank ?? true) ||
    d.logToLogbook !== (c.logToLogbook ?? true) ||
    d.autoAdvanceP1ToP2 !== (c.autoAdvanceP1ToP2 ?? false) ||
    d.autoAdvanceP2ToP3 !== (c.autoAdvanceP2ToP3 ?? false) ||
    d.haltOnRunoffEcThreshold !== (c.haltOnRunoffEcThreshold ?? null)
  );
}

/** True if the drain_ec tab config portion has unsaved changes relative to the device. */
export function isDrainEcDirty(sm: DialogSM, device: GrowspaceDevice): boolean {
  const d = sm.tabs.drain_ec.draft;
  const dc = device.drainConfig;
  if (!dc) return false;
  return (
    d.enabled !== dc.enabled ||
    d.maxEcDelta !== dc.maxEcDelta ||
    d.targetRunoffPercent !== dc.targetRunoffPercent
  );
}

/**
 * True if the substrate_ec tab's buffered draft (feed-EC ranges + pore-EC band)
 * has unsaved changes. Shot Sizing Mode, Substrate Profile, and EC Modulation
 * persist immediately (ADR-0017) and are deliberately excluded.
 */
export function isSubstrateEcDirty(sm: DialogSM, device: GrowspaceDevice): boolean {
  const d = sm.tabs.substrate_ec.draft;
  const strat = device.irrigationStrategy;
  if ((d.poreEcMin ?? null) !== (strat?.poreEcTargetMin ?? null)) return true;
  if ((d.poreEcMax ?? null) !== (strat?.poreEcTargetMax ?? null)) return true;

  const ranges = device.irrigationConfig?.ecTargetRanges ?? [];
  const rows = d.ecTargetRanges;
  // When the device has no ranges, the SM initialises with all-zero defaults.
  // It is only dirty if the user has changed at least one value away from zero.
  if (ranges.length === 0) {
    return rows.some((r) => r.minEc !== 0 || r.maxEc !== 0);
  }
  if (rows.length !== ranges.length) return true;
  return rows.some((dr) => {
    const deviceRange = ranges.find((r) => r.stage === dr.stage);
    return !deviceRange || deviceRange.minEc !== dr.minEc || deviceRange.maxEc !== dr.maxEc;
  });
}

/**
 * Returns true if the currently-active tab has unsaved changes.
 * Pass this to decide between SWITCH_TAB and REQUEST_TAB.
 */
export function isActiveTabDirty(sm: DialogSM, device: GrowspaceDevice): boolean {
  switch (sm.activeTab) {
    case 'schedules':
      return isSchedulesDirty(sm, device);
    case 'steering':
      return isSteeringDirty(sm, device);
    case 'config':
      return isConfigDirty(sm, device);
    case 'drain_ec':
      return isDrainEcDirty(sm, device);
    case 'substrate_ec':
      return isSubstrateEcDirty(sm, device);
    default:
      return false;
  }
}

// ─── Draft reset helpers ───────────────────────────────────────────────────────

/** Reset the active tab's draft back to device state (used after DISCARD_AND_SWITCH). */
function resetActiveTabDraft(sm: DialogSM, device: GrowspaceDevice): TabStates {
  const config = device.irrigationConfig ?? {};
  const strat = device.irrigationStrategy;
  const dc = device.drainConfig;

  switch (sm.activeTab) {
    case 'schedules':
      return {
        ...sm.tabs,
        schedules: {
          draft: {
            irrigationPumpEntity: config.irrigationPumpEntity ?? '',
            drainPumpEntity: config.drainPumpEntity ?? '',
            irrigationDuration: config.irrigationDuration ?? 60,
            drainDuration: config.drainDuration ?? 60,
          },
          sub: { kind: 'idle' },
        },
      };
    case 'steering':
      return {
        ...sm.tabs,
        steering: {
          draft: {
            enabled: strat?.enabled ?? false,
            lightsOnTime: strat?.lightsOnTime ?? '06:00:00',
            p0DurationMinutes: strat?.p0DurationMinutes ?? 60,
            p2StopBeforeLightsOffMinutes: strat?.p2StopBeforeLightsOffMinutes ?? 120,
            targetVwcPercent: strat?.targetVwcPercent ?? 45.0,
            maintenanceDrybackPercent: strat?.maintenanceDrybackPercent ?? 3.0,
            shotDurationSeconds: strat?.shotDurationSeconds ?? 15,
            shotIntervalMinutes: strat?.shotIntervalMinutes ?? 15,
            autoLightTracking: strat?.autoLightTracking ?? false,
            detectedLightsOnTime: strat?.detectedLightsOnTime ?? null,
          },
          phase: sm.tabs.steering.phase,
          sub: { kind: 'idle' },
        },
      };
    case 'config':
      return {
        ...sm.tabs,
        config: {
          draft: {
            pumpFlowRateMlPerSec: config.pumpFlowRateMlPerSec ?? 0,
            soilTriggerPercent: config.soilTriggerPercent ?? null,
            dailyVolumeCapLiters: config.dailyVolumeCapLiters ?? null,
            maxCyclesPerDay: config.maxCyclesPerDay ?? null,
            skipDuringDark: config.skipDuringDark ?? false,
            pauseOnLowTank: config.pauseOnLowTank ?? true,
            logToLogbook: config.logToLogbook ?? true,
            autoAdvanceP1ToP2: config.autoAdvanceP1ToP2 ?? false,
            autoAdvanceP2ToP3: config.autoAdvanceP2ToP3 ?? false,
            haltOnRunoffEcThreshold: config.haltOnRunoffEcThreshold ?? null,
          },
          sub: { kind: 'idle' },
        },
      };
    case 'drain_ec':
      return {
        ...sm.tabs,
        drain_ec: {
          draft: {
            enabled: dc?.enabled ?? false,
            maxEcDelta: dc?.maxEcDelta ?? 1.0,
            targetRunoffPercent: dc?.targetRunoffPercent ?? 20,
            logFeedEc: sm.tabs.drain_ec.draft.logFeedEc,
            logDrainEc: sm.tabs.drain_ec.draft.logDrainEc,
            logFeedVolume: sm.tabs.drain_ec.draft.logFeedVolume,
            logDrainVolume: sm.tabs.drain_ec.draft.logDrainVolume,
          },
          sub: { kind: 'idle' },
        },
      };
    case 'substrate_ec':
      return {
        ...sm.tabs,
        substrate_ec: {
          draft: {
            ecTargetRanges: ecTargetRangesFromConfig(config.ecTargetRanges),
            poreEcMin: strat?.poreEcTargetMin ?? null,
            poreEcMax: strat?.poreEcTargetMax ?? null,
          },
          sub: { kind: 'idle' },
        },
      };
    default:
      return sm.tabs;
  }
}

// ─── Mutation error messages ──────────────────────────────────────────────────

/**
 * Per-action error toast copy for `SaveFailed`. Keeps the user-facing failure
 * message in the pure SM (action -> message) so the controller stays
 * dialog-agnostic and effects carry no UI strings.
 */
const ACTION_ERROR_MESSAGES: Record<string, string> = {
  'save-all': 'Failed to save irrigation settings',
  'save-settings': 'Failed to save irrigation settings',
  'run-now': 'Failed to run irrigation cycle',
  'edit-irrigation-time': 'Failed to save irrigation time',
  'edit-drain-time': 'Failed to save drain time',
  'save-ec-ramp-curve': 'Failed to save EC ramp curve',
  'remove-ec-ramp-curve': 'Failed to delete EC ramp curve',
  'save-recipe': 'Failed to save irrigation recipe',
  'apply-recipe': 'Failed to apply irrigation recipe',
  'assign-program': 'Failed to assign the irrigation program',
  'set-program-auto-advance': 'Failed to change program auto-advance',
};

/**
 * Actions whose backend refusal is already written for the grower, so the
 * generic fallback above must not replace it.
 *
 * Both recipe commands refuse by *naming what is missing* — the pump flow rate,
 * the per-pot substrate volume, or a live plant count — because a shot size
 * stored as a percent of substrate volume cannot be derived from, or turned
 * back into, pump seconds without them. "Failed to save irrigation recipe"
 * would throw that away and leave the grower with nothing to fix. Scoped to
 * these two actions rather than applied to every action, because no other
 * effect's backend message has been reviewed as user-facing copy.
 */
const TYPED_MESSAGE_ACTIONS: ReadonlySet<string> = new Set(['save-recipe', 'apply-recipe']);

/** A backend `validation_failed` rejection, whose message is grower-facing copy. */
function validationMessage(error: unknown): string | null {
  if (!(error instanceof Error)) return null;
  const code = (error as { code?: unknown }).code;
  return code === 'validation_failed' && error.message ? error.message : null;
}

export function actionErrorMessage(action: string, error?: unknown): string {
  const typed = TYPED_MESSAGE_ACTIONS.has(action) ? validationMessage(error) : null;
  return typed ?? ACTION_ERROR_MESSAGES[action] ?? 'Operation failed';
}

// ─── Transition function ────────────────────────────────────────────────────────

/** Pure state machine transition. Returns a new SM without mutating the input. */
export function transition(sm: DialogSM, event: DialogEvent): DialogSM {
  switch (event.type) {
    // ── Navigation ──────────────────────────────────────────────────────────

    case 'REQUEST_TAB':
      return {
        ...sm,
        status: { kind: 'confirm-discard', pendingTab: event.tab },
      };

    case 'SWITCH_TAB':
      return {
        ...sm,
        activeTab: event.tab,
        status: { kind: 'idle' },
        tabs: {
          ...sm.tabs,
          // Clear any inline editing state when leaving the current tab
          schedules:
            sm.activeTab === 'schedules'
              ? { ...sm.tabs.schedules, sub: { kind: 'idle' } }
              : sm.tabs.schedules,
          // Reset the EC Ramp tab to its list view when leaving it, so re-entering
          // never reopens a stale editor draft (replaces the old willUpdate reset).
          ec_ramp:
            sm.activeTab === 'ec_ramp' ? { sub: { kind: 'list' }, error: null } : sm.tabs.ec_ramp,
          // Same reason as ec_ramp: a half-typed recipe name is a gesture in
          // progress, not saved state, so leaving the tab abandons it.
          recipes:
            sm.activeTab === 'recipes'
              ? { draft: defaultRecipesDraft(), applyWarning: null, sub: { kind: 'idle' } }
              : sm.tabs.recipes,
          // Same reason again, and one more: an unanswered confirmation must
          // never survive leaving the tab that raised it, or it would be
          // answered later about a growspace state that has since moved.
          program: sm.activeTab === 'program' ? defaultProgramTab() : sm.tabs.program,
        },
      };

    case 'DISCARD_AND_SWITCH': {
      if (sm.status.kind !== 'confirm-discard') return sm;
      const pendingTab = sm.status.pendingTab;
      // Need device to reset draft — caller must pass RESET_FROM_DEVICE first
      // or provide the device. For pure transition, we just switch the tab and
      // note: the component should call RESET_FROM_DEVICE immediately after.
      return {
        ...sm,
        activeTab: pendingTab,
        status: { kind: 'idle' },
        tabs: {
          ...sm.tabs,
          schedules: { ...sm.tabs.schedules, sub: { kind: 'idle' } },
        },
      };
    }

    case 'CANCEL_TAB_SWITCH':
      return {
        ...sm,
        status: { kind: 'idle' },
      };

    // ── Schedules ────────────────────────────────────────────────────────────

    case 'BEGIN_ADD_IRRIGATION':
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          schedules: {
            ...sm.tabs.schedules,
            sub: { kind: 'adding-irrigation', time: event.time, duration: event.duration },
          },
        },
      };

    case 'BEGIN_ADD_DRAIN':
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          schedules: {
            ...sm.tabs.schedules,
            sub: { kind: 'adding-drain', time: event.time, duration: event.duration },
          },
        },
      };

    case 'BEGIN_EDIT_IRRIGATION':
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          schedules: {
            ...sm.tabs.schedules,
            sub: {
              kind: 'editing-irrigation',
              originalTime: event.originalTime,
              originalDuration: event.originalDuration,
              time: event.time,
              duration: event.duration,
            },
          },
        },
      };

    case 'BEGIN_EDIT_DRAIN':
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          schedules: {
            ...sm.tabs.schedules,
            sub: {
              kind: 'editing-drain',
              originalTime: event.originalTime,
              originalDuration: event.originalDuration,
              time: event.time,
              duration: event.duration,
            },
          },
        },
      };

    case 'CANCEL_INLINE':
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          schedules: { ...sm.tabs.schedules, sub: { kind: 'idle' } },
        },
      };

    case 'UPDATE_ADD_IRRIGATION': {
      const sub = sm.tabs.schedules.sub;
      if (sub.kind !== 'adding-irrigation') return sm;
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          schedules: {
            ...sm.tabs.schedules,
            sub: {
              ...sub,
              ...(event.time !== undefined && { time: event.time }),
              ...(event.duration !== undefined && { duration: event.duration }),
            },
          },
        },
      };
    }

    case 'UPDATE_ADD_DRAIN': {
      const sub = sm.tabs.schedules.sub;
      if (sub.kind !== 'adding-drain') return sm;
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          schedules: {
            ...sm.tabs.schedules,
            sub: {
              ...sub,
              ...(event.time !== undefined && { time: event.time }),
              ...(event.duration !== undefined && { duration: event.duration }),
            },
          },
        },
      };
    }

    case 'UPDATE_EDIT_IRRIGATION': {
      const sub = sm.tabs.schedules.sub;
      if (sub.kind !== 'editing-irrigation') return sm;
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          schedules: {
            ...sm.tabs.schedules,
            sub: {
              ...sub,
              ...(event.time !== undefined && { time: event.time }),
              ...(event.duration !== undefined && { duration: event.duration }),
            },
          },
        },
      };
    }

    case 'UPDATE_EDIT_DRAIN': {
      const sub = sm.tabs.schedules.sub;
      if (sub.kind !== 'editing-drain') return sm;
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          schedules: {
            ...sm.tabs.schedules,
            sub: {
              ...sub,
              ...(event.time !== undefined && { time: event.time }),
              ...(event.duration !== undefined && { duration: event.duration }),
            },
          },
        },
      };
    }

    case 'UPDATE_SCHEDULES_DRAFT':
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          schedules: {
            ...sm.tabs.schedules,
            draft: { ...sm.tabs.schedules.draft, ...event.partial },
          },
        },
      };

    // ── Steering ─────────────────────────────────────────────────────────────

    case 'REQUEST_PHASE_CHANGE':
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          steering: {
            ...sm.tabs.steering,
            sub: { kind: 'confirm-phase', pending: event.phase },
          },
        },
      };

    case 'CONFIRM_PHASE_CHANGE': {
      const sub = sm.tabs.steering.sub;
      if (sub.kind !== 'confirm-phase') return sm;
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          steering: {
            ...sm.tabs.steering,
            phase: sub.pending,
            sub: { kind: 'idle' },
          },
        },
      };
    }

    case 'CANCEL_PHASE_CHANGE':
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          steering: { ...sm.tabs.steering, sub: { kind: 'idle' } },
        },
      };

    case 'REQUEST_STEERING_MODE':
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          steering: {
            ...sm.tabs.steering,
            sub: { kind: 'confirm-mode', pending: event.mode },
          },
        },
      };

    case 'CANCEL_STEERING_MODE':
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          steering: { ...sm.tabs.steering, sub: { kind: 'idle' } },
        },
      };

    case 'UPDATE_STEERING_DRAFT':
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          steering: {
            ...sm.tabs.steering,
            draft: { ...sm.tabs.steering.draft, ...event.partial },
          },
        },
      };

    // ── Config ───────────────────────────────────────────────────────────────

    case 'UPDATE_CONFIG_DRAFT':
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          config: {
            ...sm.tabs.config,
            draft: { ...sm.tabs.config.draft, ...event.partial },
          },
        },
      };

    // ── Tanks ────────────────────────────────────────────────────────────────

    case 'EDIT_TANK':
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          tanks: { sub: { kind: 'editing', index: event.index, draft: event.draft } },
        },
      };

    case 'UPDATE_TANK_DRAFT': {
      const sub = sm.tabs.tanks.sub;
      if (sub.kind !== 'editing') return sm;
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          tanks: { sub: { ...sub, draft: { ...sub.draft, ...event.partial } } },
        },
      };
    }

    case 'CANCEL_TANK_EDIT':
      return {
        ...sm,
        tabs: { ...sm.tabs, tanks: { sub: { kind: 'idle' } } },
      };

    // ── EC Ramp ──────────────────────────────────────────────────────────────

    case 'EC_RAMP_START_NEW':
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          ec_ramp: {
            sub: {
              kind: 'editing',
              draft: { name: '', stage: 'flower', points: [{ day: 1, target_ec: 1.0 }] },
            },
            error: null,
          },
        },
      };

    case 'EC_RAMP_EDIT_CURVE':
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          ec_ramp: { sub: { kind: 'editing', draft: event.draft }, error: null },
        },
      };

    case 'EC_RAMP_CANCEL_EDIT':
      return {
        ...sm,
        tabs: { ...sm.tabs, ec_ramp: { sub: { kind: 'list' }, error: null } },
      };

    case 'UPDATE_EC_RAMP_CURVE': {
      const sub = sm.tabs.ec_ramp.sub;
      if (sub.kind !== 'editing') return sm;
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          ec_ramp: {
            ...sm.tabs.ec_ramp,
            sub: { ...sub, draft: { ...sub.draft, ...event.partial } },
          },
        },
      };
    }

    case 'EC_RAMP_ADD_POINT': {
      const sub = sm.tabs.ec_ramp.sub;
      if (sub.kind !== 'editing') return sm;
      const points = [...(sub.draft.points ?? [])];
      const lastDay = points.length > 0 ? points[points.length - 1].day : 0;
      const lastEc = points.length > 0 ? points[points.length - 1].target_ec : 1.0;
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          ec_ramp: {
            ...sm.tabs.ec_ramp,
            sub: {
              ...sub,
              draft: {
                ...sub.draft,
                points: [...points, { day: lastDay + 7, target_ec: lastEc + 0.2 }],
              },
            },
          },
        },
      };
    }

    case 'EC_RAMP_REMOVE_POINT': {
      const sub = sm.tabs.ec_ramp.sub;
      if (sub.kind !== 'editing') return sm;
      const points = [...(sub.draft.points ?? [])];
      points.splice(event.index, 1);
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          ec_ramp: { ...sm.tabs.ec_ramp, sub: { ...sub, draft: { ...sub.draft, points } } },
        },
      };
    }

    case 'EC_RAMP_UPDATE_POINT': {
      const sub = sm.tabs.ec_ramp.sub;
      if (sub.kind !== 'editing') return sm;
      const points = [...(sub.draft.points ?? [])];
      if (event.index < 0 || event.index >= points.length) return sm;
      points[event.index] = { ...points[event.index], ...event.partial };
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          ec_ramp: { ...sm.tabs.ec_ramp, sub: { ...sub, draft: { ...sub.draft, points } } },
        },
      };
    }

    case 'SET_EC_RAMP_ERROR':
      return {
        ...sm,
        tabs: { ...sm.tabs, ec_ramp: { ...sm.tabs.ec_ramp, error: event.error } },
      };

    // ── Recipes ──────────────────────────────────────────────────────────────

    case 'UPDATE_RECIPE_NAME':
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          recipes: { ...sm.tabs.recipes, draft: { ...sm.tabs.recipes.draft, name: event.name } },
        },
      };

    case 'SELECT_RECIPE':
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          recipes: {
            ...sm.tabs.recipes,
            draft: { ...sm.tabs.recipes.draft, selectedRecipeId: event.recipeId },
          },
        },
      };

    case 'SET_RECIPE_APPLY_WARNING':
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          recipes: { ...sm.tabs.recipes, applyWarning: event.warning },
        },
      };

    // ── Program ──────────────────────────────────────────────────────────────

    case 'SELECT_PROGRAM':
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          program: {
            ...sm.tabs.program,
            draft: { ...sm.tabs.program.draft, pickedProgramId: event.programId },
          },
        },
      };

    case 'SET_PROGRAM_CONFIRM':
      return {
        ...sm,
        tabs: { ...sm.tabs, program: { ...sm.tabs.program, confirm: event.confirm } },
      };

    // ── Drain EC ─────────────────────────────────────────────────────────────

    case 'UPDATE_DRAIN_EC_DRAFT':
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          drain_ec: {
            ...sm.tabs.drain_ec,
            draft: { ...sm.tabs.drain_ec.draft, ...event.partial },
          },
        },
      };

    case 'SET_DRAIN_SAVING':
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          drain_ec: {
            ...sm.tabs.drain_ec,
            sub: event.saving ? { kind: 'saving' } : { kind: 'idle' },
          },
        },
      };

    case 'SET_DRAIN_LOGGING':
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          drain_ec: {
            ...sm.tabs.drain_ec,
            sub: event.logging ? { kind: 'logging' } : { kind: 'idle' },
          },
        },
      };

    // ── EC Targets ───────────────────────────────────────────────────────────

    case 'UPDATE_EC_TARGETS_DRAFT':
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          substrate_ec: {
            ...sm.tabs.substrate_ec,
            draft: { ...sm.tabs.substrate_ec.draft, ecTargetRanges: event.ranges },
          },
        },
      };

    case 'UPDATE_PORE_EC_BAND':
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          substrate_ec: {
            ...sm.tabs.substrate_ec,
            draft: { ...sm.tabs.substrate_ec.draft, poreEcMin: event.min, poreEcMax: event.max },
          },
        },
      };

    // ── Mutation run (ADR-0015) ───────────────────────────────────────────────

    case 'SaveRequested':
      // Clear any inline schedule-editing sub-state up front: inline-edit
      // handlers used to CANCEL_INLINE before awaiting. The params the effect
      // needs travel in `status.params`, not in this (now-cleared) sub-state.
      return {
        ...sm,
        status: { kind: 'applying', action: event.action, params: event.params },
        tabs: {
          ...sm.tabs,
          schedules: { ...sm.tabs.schedules, sub: { kind: 'idle' } },
        },
      };

    case 'SaveResolved':
      // No success toast — the irrigation mutators go through mutate(), whose
      // listener already shows a success+Undo toast (see growspace-manager-card).
      return { ...sm, status: { kind: 'idle' } };

    case 'SaveFailed':
      return {
        ...sm,
        status: { kind: 'idle' },
        toast: actionErrorMessage(event.action, event.error),
      };

    // ── Global ───────────────────────────────────────────────────────────────

    case 'SET_TOAST':
      return { ...sm, toast: event.message };

    case 'SET_RUN_NOW_SAVING':
      return {
        ...sm,
        status: event.saving ? { kind: 'run-now-saving' } : { kind: 'idle' },
      };

    case 'SET_STAGE_AGGREGATES':
      return {
        ...sm,
        tabs: {
          ...sm.tabs,
          water_analytics: {
            ...sm.tabs.water_analytics,
            stageAggregates: event.data,
          },
        },
      };

    case 'RESET_FROM_DEVICE':
      return applyDeviceToSM(sm, event.device);

    default:
      return sm;
  }
}

/**
 * Transition to a new tab with dirty-state handling baked in.
 * Returns the new SM state. The component can use this helper instead of
 * checking `isActiveTabDirty` and dispatching different events manually.
 */
export function requestTabSwitch(sm: DialogSM, tab: TabId, device: GrowspaceDevice): DialogSM {
  if (sm.activeTab === tab) return sm;
  if (isActiveTabDirty(sm, device)) {
    return transition(sm, { type: 'REQUEST_TAB', tab });
  }
  return transition(sm, { type: 'SWITCH_TAB', tab });
}

/**
 * Discard the active tab's draft (reset to device state) and switch to the pending tab.
 * Convenience wrapper that handles the two-step: reset draft + switch.
 */
export function discardAndSwitch(sm: DialogSM, device: GrowspaceDevice): DialogSM {
  if (sm.status.kind !== 'confirm-discard') return sm;
  const tabs = resetActiveTabDraft(sm, device);
  return {
    ...sm,
    activeTab: sm.status.pendingTab,
    status: { kind: 'idle' },
    tabs,
  };
}
