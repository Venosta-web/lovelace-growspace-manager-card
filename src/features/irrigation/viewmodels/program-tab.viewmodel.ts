/**
 * Program Tab ViewModel (ADR-0019)
 *
 * The pure derivation behind the Irrigation Dialog's Program tab — one
 * growspace's whole relationship with the [[Irrigation Program]] it follows:
 * which plan it is bound to, which week of that plan it is in, what the plan
 * holds next, whether unattended progression is on, and what the program layer
 * is doing about all of it right now.
 *
 * **The progression is read, never re-derived.** `state`, `hold` and `detail`
 * are the backend's own answer — the same resolution its refresh acts on — so
 * the card can never say a week is held while the tick stamps it. This module
 * decides what to *call* those answers and nothing about what they are.
 *
 * The one thing it does derive is the drift annotation, and only ever as an
 * annotation: when the backend has already said the growspace drifted, the
 * fields it can compare like-for-like are listed so "modified since" is not
 * left as an assertion the grower has to take on trust. It never contributes to
 * the verdict, and it stays silent about the fields whose units depend on the
 * growspace ([[Substrate-Relative Shot Storage]]) rather than guessing at them.
 */

import { computed, type ReadableAtom } from 'nanostores';
import type { DialogSM, ProgramConfirm } from '../../../dialogs/irrigation-dialog-sm';
import type {
  CropSteeringRecipeValues,
  GrowspaceDevice,
  IrrigationConfig,
  IrrigationProgram,
  IrrigationRecipe,
  IrrigationStrategy,
  ProgramHold,
  ProgramProgressionState,
  ProgramSlot,
  ScheduleRecipeValues,
} from '../../../services/types';
import { PROGRAM_STAGES } from '../../../slices/irrigation/schema';
import { programSpanLabel, programStageLabel } from './program-library.viewmodel';

/** One option of the assign control. */
export interface ProgramOptionVM {
  id: string;
  name: string;
  /** "Veg 1–4 · Flower 1–8", or null for a plan with no slots yet. */
  spanLabel: string | null;
}

/** One `(stage, week)` position of the plan, resolved against the library. */
export interface ProgramPositionVM {
  /** "Flower", or null when the growspace has no live plants. */
  stageLabel: string | null;
  week: number;
  /** The recipe this position calls for, or null when it is a gap. */
  recipeName: string | null;
  /** True when the position names a recipe the library no longer holds. */
  missing: boolean;
}

/** The next instruction the plan holds after the current position. */
export interface NextInstructionVM {
  stageLabel: string;
  week: number;
  recipeName: string | null;
  /** True when it is literally next week rather than further down the run. */
  isNextWeek: boolean;
}

/** What the program layer is doing, in the card's own words plus the backend's. */
export interface ProgressionVM {
  state: ProgramProgressionState | null;
  hold: ProgramHold | null;
  /** A short heading naming this answer — one per cause, so they are told apart. */
  title: string;
  /** The backend's own grower-facing sentence, verbatim. */
  detail: string;
}

/** The recipe a week is offering, while auto-advance is off. */
export interface AvailableRecipeVM {
  recipeId: string;
  name: string;
  stageLabel: string;
  week: number;
}

/** The drift annotation shown beside a `drifted` hold. */
export interface DriftDetailVM {
  /**
   * Labels of the fields the card can compare that differ from the applied
   * recipe. Empty when the difference is in a field whose stored unit depends
   * on the growspace — the honest answer there is to name nothing.
   */
  fields: string[];
  /** The recipe the growspace was last given, or null when it was deleted. */
  appliedRecipeName: string | null;
}

/** The pending confirmation, with the sentence the grower is asked to accept. */
export interface ProgramConfirmVM {
  kind: ProgramConfirm['kind'];
  title: string;
  message: string;
  confirmLabel: string;
}

/** Complete render input for `<irrigation-program-tab>`. */
export interface ProgramTabViewModel {
  /** Every saved program, name-ordered. Empty → the tab's empty state. */
  options: ProgramOptionVM[];
  /** The bound program's name, or null when the bound id names no program. */
  assignedName: string | null;
  /** The id the growspace is actually bound to, or null. */
  assignedProgramId: string | null;
  /** The assign control's resolved value: the grower's pick, else the binding. */
  selectedProgramId: string | null;
  /** True when the picked program differs from the one already bound. */
  canAssign: boolean;
  /** Where the growspace sits in its plan. Null when nothing is bound. */
  position: ProgramPositionVM | null;
  /** What the plan holds after that. Null when the plan is finished or empty. */
  next: NextInstructionVM | null;
  autoAdvance: boolean;
  progression: ProgressionVM | null;
  /** Set only while a week's recipe is waiting on the grower. */
  available: AvailableRecipeVM | null;
  /** Set only alongside a `drifted` hold. */
  drift: DriftDetailVM | null;
  confirm: ProgramConfirmVM | null;
  /** A mutation is in flight — every control disables. */
  busy: boolean;
}

/**
 * A heading per progression answer, so a finished run, a gap in the plan and a
 * hand-tuned growspace are told apart at a glance rather than only by reading
 * the sentence underneath. This is the whole reason the backend names a cause:
 * the behaviour is identical in every case, and the causes are not.
 */
const HOLD_TITLES: Record<ProgramHold, string> = {
  no_position: 'Holding — no live plants',
  no_slot: 'Holding — this week has no recipe',
  program_complete: 'Program complete',
  recipe_missing: 'Holding — the recipe was deleted',
  drifted: 'Holding — settings were changed',
  not_applicable: 'Holding — this recipe cannot be applied here',
};

const STATE_TITLES: Record<ProgramProgressionState, string> = {
  up_to_date: 'Following the program',
  available: "This week's recipe is ready",
  due: 'Applying this week’s recipe',
  held: 'Holding',
};

/** Run order, matching the backend's slot sort. Unknown stages sort last. */
function stageRank(stage: string): number {
  const index = (PROGRAM_STAGES as readonly string[]).indexOf(stage);
  return index === -1 ? PROGRAM_STAGES.length : index;
}

/**
 * The first slot the plan holds strictly after `(stage, week)`.
 *
 * The *next instruction*, not the next week: a run crosses stages, so veg week
 * 4 is often followed by flower week 1 and never by veg week 5. Answering with
 * the slot's own position — and saying whether it happens to be next week —
 * tells the truth in both cases, where a bare "next week" lookup would report
 * nothing for every stage handover.
 */
export function nextInstruction(
  slots: ProgramSlot[],
  stage: string,
  week: number
): ProgramSlot | null {
  const after = slots
    .filter(
      (slot) =>
        stageRank(slot.stage) > stageRank(stage) || (slot.stage === stage && slot.week > week)
    )
    .sort((a, b) => stageRank(a.stage) - stageRank(b.stage) || a.week - b.week);
  return after[0] ?? null;
}

/**
 * The crop-steering fields a recipe and a growspace store in the *same* unit,
 * and so can be compared without knowing anything about the growspace.
 *
 * The two shot sizes are deliberately absent. A recipe stores them as a percent
 * of substrate volume and a Seconds Mode growspace holds pump seconds, so
 * comparing them would need the flow rate, the pot volume and the live plant
 * count — the derivation the backend owns. Naming a field that merely looks
 * different is worse than naming none.
 */
const COMPARABLE_STEERING_FIELDS: {
  field: keyof CropSteeringRecipeValues;
  label: string;
  read: (strategy: IrrigationStrategy) => unknown;
}[] = [
  { field: 'lights_on_time', label: 'Lights on', read: (s) => s.lightsOnTime },
  { field: 'p0_duration_minutes', label: 'P0 duration', read: (s) => s.p0DurationMinutes },
  {
    field: 'p2_stop_before_lights_off_minutes',
    label: 'P2 stop buffer',
    read: (s) => s.p2StopBeforeLightsOffMinutes,
  },
  { field: 'target_vwc_percent', label: 'Target VWC', read: (s) => s.targetVwcPercent },
  {
    field: 'maintenance_dryback_percent',
    label: 'Maintenance dryback',
    read: (s) => s.maintenanceDrybackPercent,
  },
  {
    field: 'p1_shot_interval_minutes',
    label: 'P1 interval',
    read: (s) => s.p1ShotIntervalMinutes,
  },
  {
    field: 'p2_shot_interval_minutes',
    label: 'P2 interval',
    read: (s) => s.p2ShotIntervalMinutes,
  },
  { field: 'auto_light_tracking', label: 'Auto light tracking', read: (s) => s.autoLightTracking },
  { field: 'dynamic_shot_enabled', label: 'Dynamic shots', read: (s) => s.dynamicShotEnabled },
  {
    field: 'dynamic_aggressiveness',
    label: 'Dynamic aggressiveness',
    read: (s) => s.dynamicAggressiveness,
  },
  { field: 'dynamic_recovery', label: 'Dynamic recovery', read: (s) => s.dynamicRecovery },
  {
    field: 'dynamic_shot_size_floor',
    label: 'Dynamic shot floor',
    read: (s) => s.dynamicShotSizeFloor,
  },
  {
    field: 'dynamic_interval_ceiling',
    label: 'Dynamic interval ceiling',
    read: (s) => s.dynamicIntervalCeiling,
  },
  { field: 'ec_modulation_enabled', label: 'EC modulation', read: (s) => s.ecModulationEnabled },
  { field: 'pore_ec_target_min', label: 'Pore EC min', read: (s) => s.poreEcTargetMin },
  { field: 'pore_ec_target_max', label: 'Pore EC max', read: (s) => s.poreEcTargetMax },
];

/**
 * The schedule fields that compare the same way. The times themselves are left
 * out: they are a list the backend carries in two spellings, and a difference
 * of ordering is not a difference of plan.
 */
const COMPARABLE_SCHEDULE_FIELDS: {
  field: keyof ScheduleRecipeValues;
  label: string;
  read: (config: IrrigationConfig) => unknown;
}[] = [
  { field: 'irrigation_duration', label: 'Irrigation duration', read: (c) => c.irrigationDuration },
  { field: 'drain_duration', label: 'Drain duration', read: (c) => c.drainDuration },
  {
    field: 'daily_volume_cap_liters',
    label: 'Daily volume cap',
    read: (c) => c.dailyVolumeCapLiters,
  },
  { field: 'max_cycles_per_day', label: 'Max cycles per day', read: (c) => c.maxCyclesPerDay },
  { field: 'skip_during_dark', label: 'Skip during dark', read: (c) => c.skipDuringDark },
];

/**
 * Which of the comparable fields differ from what the recipe stores.
 *
 * An **annotation on a verdict the backend already gave**, never a verdict of
 * its own. Absent values on either side compare equal, because "the backend did
 * not send it" is not a change the grower made.
 */
export function driftedFieldLabels(
  recipe: IrrigationRecipe,
  strategy: IrrigationStrategy | undefined,
  config: IrrigationConfig | undefined
): string[] {
  if (recipe.kind === 'crop_steering') {
    const stored = recipe.cropSteering;
    if (!stored || !strategy) return [];
    return COMPARABLE_STEERING_FIELDS.filter(({ field, read }) => {
      const live = read(strategy);
      return live !== undefined && live !== stored[field];
    }).map(({ label }) => label);
  }
  const stored = recipe.schedule;
  if (!stored || !config) return [];
  return COMPARABLE_SCHEDULE_FIELDS.filter(({ field, read }) => {
    const live = read(config);
    return live !== undefined && live !== stored[field];
  }).map(({ label }) => label);
}

/**
 * The sentence a confirmation asks the grower to accept.
 *
 * Written here rather than in the component because it is a claim about what
 * the backend will then do: turning auto-advance on does not schedule anything
 * for later, it makes the week the growspace is *already in* due, and the next
 * evaluation stamps it.
 */
function confirmVm(confirm: ProgramConfirm, position: ProgramPositionVM | null): ProgramConfirmVM {
  const target =
    position?.recipeName && position.stageLabel
      ? `“${position.recipeName}” — the recipe ${position.stageLabel.toLowerCase()} week ${position.week} calls for —`
      : 'the recipe this week calls for';
  return {
    kind: confirm.kind,
    title: 'Turn on auto-advance?',
    message:
      `This growspace is already in a week of its program, so turning auto-advance on applies ` +
      `${target} to it shortly. Every hold still applies: a week with no recipe, a finished ` +
      `program, or settings you have changed since the last apply all leave it alone.`,
    confirmLabel: 'Turn on and apply',
  };
}

/**
 * Pure factory: SM atom + the two global libraries + the device atom → one
 * Program VM atom.
 *
 * It reads the program library for the assign control and for the plan's later
 * slots — the payload's `program` block answers about *now*, and "what does
 * next week hold" is a question about the plan, which only the library holds.
 */
export function createProgramTabViewModel(
  $sm: ReadableAtom<DialogSM>,
  $programs: ReadableAtom<IrrigationProgram[]>,
  $recipes: ReadableAtom<IrrigationRecipe[]>,
  $device: ReadableAtom<GrowspaceDevice | undefined>
): ReadableAtom<ProgramTabViewModel> {
  return computed([$sm, $programs, $recipes, $device], (sm, programs, recipes, device) => {
    const tab = sm.tabs.program;
    const state = device?.irrigationProgram ?? null;
    const assignedProgramId = device?.irrigationStrategy?.irrigationProgramId ?? null;

    const options = programs.map((program) => ({
      id: program.id,
      name: program.name,
      spanLabel: programSpanLabel(program.slots),
    }));

    // `undefined` is "not picked" and resolves to the binding; `null` is the
    // deliberate pick of no program, which is how a growspace is unbound. An
    // explicit pick whose program has left the library falls back to the
    // binding rather than leaving the control pointing at nothing.
    const picked = tab.draft.pickedProgramId;
    const selectedProgramId =
      picked === undefined || (picked !== null && !options.some((o) => o.id === picked))
        ? assignedProgramId
        : picked;

    const position: ProgramPositionVM | null = state
      ? {
          stageLabel: state.stage === null ? null : programStageLabel(state.stage),
          week: state.week,
          recipeName: state.recipe?.name ?? null,
          missing: state.slot !== null && state.recipe === null,
        }
      : null;

    const boundProgram = programs.find((p) => p.id === state?.programId) ?? null;
    const upcoming =
      boundProgram && state?.stage !== null && state !== null
        ? nextInstruction(boundProgram.slots, state.stage, state.week)
        : null;
    const next: NextInstructionVM | null =
      upcoming && state
        ? {
            stageLabel: programStageLabel(upcoming.stage),
            week: upcoming.week,
            recipeName: recipes.find((r) => r.id === upcoming.recipeId)?.name ?? null,
            isNextWeek: upcoming.stage === state.stage && upcoming.week === state.week + 1,
          }
        : null;

    const progression: ProgressionVM | null = state
      ? {
          state: state.progression.state,
          hold: state.progression.hold,
          // A named hold beats the generic `held` heading; an answer the card
          // does not recognise falls back to the backend's own sentence, which
          // is why `detail` is always rendered and never optional.
          title:
            (state.progression.hold ? HOLD_TITLES[state.progression.hold] : null) ??
            (state.progression.state ? STATE_TITLES[state.progression.state] : null) ??
            'Irrigation program',
          detail: state.progression.detail,
        }
      : null;

    const available: AvailableRecipeVM | null =
      state?.progression.state === 'available' &&
      state.slot !== null &&
      state.recipe !== null &&
      state.stage !== null
        ? {
            recipeId: state.slot.recipeId,
            name: state.recipe.name,
            stageLabel: programStageLabel(state.stage),
            week: state.week,
          }
        : null;

    const appliedRecipeId = device?.irrigationStrategy?.appliedRecipeId ?? null;
    const appliedRecipe = recipes.find((r) => r.id === appliedRecipeId) ?? null;
    const drift: DriftDetailVM | null =
      state?.progression.hold === 'drifted'
        ? {
            fields: appliedRecipe
              ? driftedFieldLabels(
                  appliedRecipe,
                  device?.irrigationStrategy,
                  device?.irrigationConfig
                )
              : [],
            appliedRecipeName: appliedRecipe?.name ?? null,
          }
        : null;

    return {
      options,
      assignedName: programs.find((p) => p.id === assignedProgramId)?.name ?? null,
      assignedProgramId,
      selectedProgramId,
      canAssign: selectedProgramId !== assignedProgramId,
      position,
      next,
      autoAdvance: state?.autoAdvance ?? device?.irrigationConfig?.programAutoAdvance ?? false,
      progression,
      available,
      drift,
      confirm: tab.confirm ? confirmVm(tab.confirm, position) : null,
      busy: sm.status.kind === 'applying',
    };
  });
}
