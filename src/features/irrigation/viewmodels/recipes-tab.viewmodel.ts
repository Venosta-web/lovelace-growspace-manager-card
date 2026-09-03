/**
 * Recipes Tab ViewModel (ADR-0019)
 *
 * The pure derivation behind the Irrigation Dialog's Recipe tab — the whole
 * grower story of the [[Irrigation Recipe]] library as one render input: which
 * recipe this growspace last had stamped into it, when, whether its settings
 * have drifted from it since, and the ordered picker for applying another.
 *
 * Two exclusions live here and they are **not** the same rule:
 *
 * - **Kind gates.** A recipe carries exactly one half — crop steering or a time
 *   schedule — and the backend refuses to apply the half a growspace is not
 *   running. The picker therefore never offers it; `hiddenByKindCount` keeps
 *   that exclusion visible rather than silently shortening the list.
 * - **[[Recipe Provenance]] only orders.** The authoring stage and week sort the
 *   picker and decide what it opens on, and that is all they ever do. Applying
 *   a flower-week-3 recipe to a week-5 tent is a supported deliberate act, so
 *   nothing is filtered or blocked on it.
 *
 * The recipes come from the Irrigation slice's `irrigationRecipes$` (a global
 * library, not a per-growspace read); the device supplies the stamp, the drift
 * verdict, and the growspace's own stage/week.
 */

import { computed, type ReadableAtom } from 'nanostores';
import type { DialogSM } from '../../../dialogs/irrigation-dialog-sm';
import type {
  GrowspaceDevice,
  IrrigationRecipe,
  SubstrateMediaType,
} from '../../../services/types';
import type { IrrigationRecipeKind } from '../../../slices/irrigation/schema';

/**
 * The growspace's own authoring context — what the picker's ordering is
 * measured against, in the same vocabulary [[Recipe Provenance]] records.
 */
export interface AuthoringContext {
  /** `null` when the growspace is not in a live stage a recipe can be authored in. */
  stage: string | null;
  /** `null` when the stage is known but its week is not. */
  week: number | null;
}

/** One row of the apply picker. */
export interface RecipeOptionVM {
  id: string;
  name: string;
  /** "Flower · week 3" — the authoring context, or null when it had none. */
  provenanceLabel: string | null;
  /** "5 L coco @ 11 ml/s" — the plumbing the recipe was captured from. */
  plumbingLabel: string;
  mediaType: SubstrateMediaType;
  /** True when this recipe's stage and week both match the growspace's own. */
  matchesCurrentStage: boolean;
}

/** Whether the growspace still holds what its applied recipe stamped. */
export type RecipeDriftVerdict = 'in-sync' | 'drifted' | 'unknown';

/** The stamp this growspace carries, resolved against the library. */
export interface AppliedRecipeVM {
  id: string;
  /** The recipe's name, or null when it has since left the library. */
  name: string | null;
  /** Formatted apply time, or null when the backend recorded none. */
  appliedAtLabel: string | null;
  drift: RecipeDriftVerdict;
}

/** Complete render input for `<irrigation-recipes-tab>`. */
export interface RecipesTabViewModel {
  /** The stamp, or null when no recipe was ever applied — a real third state. */
  applied: AppliedRecipeVM | null;
  /** Which half a save captures and an apply can write, here and now. */
  runningKind: IrrigationRecipeKind;
  /** The growspace's stage and week, as the picker's ordering reads them. */
  context: AuthoringContext;
  /** Applicable recipes, best match first. Empty → the picker's empty state. */
  options: RecipeOptionVM[];
  /** Recipes the running kind excludes — surfaced so the gap is explained. */
  hiddenByKindCount: number;
  /** The resolved selection: the grower's pick, else the pre-selection. */
  selectedRecipeId: string | null;
  /** The selected row, or null when the library offers nothing to select. */
  selected: RecipeOptionVM | null;
  /**
   * Set when the selected recipe was authored in a different medium. Applying
   * still succeeds and the values are deliberately not scaled — pot size
   * normalises across growspaces and media does not.
   */
  mediaMismatch: { authored: SubstrateMediaType; target: SubstrateMediaType } | null;
  /**
   * The backend's own notice from the last apply, verbatim, or null. Shown
   * beside the stamp rather than as a toast: the apply succeeded, and what the
   * notice says stays true about the growspace afterwards.
   */
  applyWarning: string | null;
  /** The name typed into the save form. */
  nameDraft: string;
  /** Whether the save form has enough to submit. */
  canSave: boolean;
  /** A mutation is in flight — both buttons disable. */
  busy: boolean;
}

const FLOWER_STAGES = new Set(['flower_early', 'flower_mid', 'flower_late', 'flower']);
const SEEDLING_STAGES = new Set(['seedling', 'clone', 'mother']);

/**
 * Read the growspace's stage and week in [[Recipe Provenance]]'s vocabulary.
 *
 * The payload names the display stage (`flower_early`…) and carries a week per
 * stage family, while provenance records the collapsed live stage (`flower`)
 * and the week within it — so flower's sub-stages fold together and dry, cure
 * and empty resolve to no stage at all, matching the `(None, 0)` the backend
 * gives a growspace with no live cohort.
 *
 * Seedling, clone and mother resolve to a stage with **no** week: the payload's
 * `vegWeek` is the veg-stage age, and reporting it as their week would be an
 * invention. Ordering degrades to stage-match alone, which is the honest answer
 * and costs nothing — provenance only ever orders.
 */
export function authoringContext(device: GrowspaceDevice | undefined): AuthoringContext {
  const metrics = device?.biologicalMetrics;
  const stage = metrics?.granularStage;
  if (!stage) return { stage: null, week: null };
  if (FLOWER_STAGES.has(stage)) return { stage: 'flower', week: metrics?.flowerWeek ?? null };
  if (stage === 'veg') return { stage: 'veg', week: metrics?.vegWeek ?? null };
  if (SEEDLING_STAGES.has(stage)) return { stage, week: null };
  return { stage: null, week: null };
}

/**
 * Rank one recipe against the growspace's context: 0 an exact stage+week match,
 * 1 the same stage, 2 anything else. A context with no stage ranks everything
 * equally — there is nothing to be closer to.
 */
function provenanceRank(recipe: IrrigationRecipe, context: AuthoringContext): number {
  if (context.stage === null) return 2;
  if (recipe.provenance.stage !== context.stage) return 2;
  return context.week !== null && recipe.provenance.week === context.week ? 0 : 1;
}

/**
 * Order the picker: closest authoring context first, then by how many weeks
 * separate them, then by name. Pure and total — it removes nothing.
 */
export function sortByProvenance(
  recipes: IrrigationRecipe[],
  context: AuthoringContext
): IrrigationRecipe[] {
  return [...recipes].sort((a, b) => {
    const rank = provenanceRank(a, context) - provenanceRank(b, context);
    if (rank !== 0) return rank;
    if (context.week !== null && context.stage !== null) {
      const weekGap =
        (a.provenance.stage === context.stage ? Math.abs(a.provenance.week - context.week) : 0) -
        (b.provenance.stage === context.stage ? Math.abs(b.provenance.week - context.week) : 0);
      if (weekGap !== 0) return weekGap;
    }
    return a.name.localeCompare(b.name);
  });
}

const STAGE_LABELS: Record<string, string> = {
  seedling: 'Seedling',
  clone: 'Clone',
  mother: 'Mother',
  veg: 'Veg',
  flower: 'Flower',
};

function stageLabel(stage: string): string {
  return STAGE_LABELS[stage] ?? stage;
}

function toOption(recipe: IrrigationRecipe, context: AuthoringContext): RecipeOptionVM {
  const p = recipe.provenance;
  return {
    id: recipe.id,
    name: recipe.name,
    provenanceLabel: p.stage ? `${stageLabel(p.stage)} · week ${p.week}` : null,
    plumbingLabel: `${p.litersPerPot} L ${p.mediaType} @ ${p.pumpFlowRateMlPerSec} ml/s`,
    mediaType: p.mediaType,
    matchesCurrentStage: provenanceRank(recipe, context) === 0,
  };
}

/** Timestamp formatting, matching the dialog footer's "last cycle" style. */
function formatAppliedAt(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function deriveApplied(
  device: GrowspaceDevice | undefined,
  recipes: IrrigationRecipe[]
): AppliedRecipeVM | null {
  const strategy = device?.irrigationStrategy;
  const id = strategy?.appliedRecipeId ?? null;
  if (!id) return null;
  const drifted = device?.appliedRecipeDrifted;
  return {
    id,
    // null when the applied recipe has since been removed: deleting leaves the
    // reference dangling rather than cascading, and the tab says so.
    name: recipes.find((r) => r.id === id)?.name ?? null,
    appliedAtLabel: formatAppliedAt(strategy?.recipeAppliedAt),
    drift: drifted == null ? 'unknown' : drifted ? 'drifted' : 'in-sync',
  };
}

/**
 * Pure factory: SM atom + the Irrigation slice's global `irrigationRecipes$` +
 * the device atom → one Recipes VM atom. No `$caps`: the tab's only capability
 * question is which half the growspace runs, which is the strategy's own
 * `enabled` flag and not a cross-tab gate.
 */
export function createRecipesTabViewModel(
  $sm: ReadableAtom<DialogSM>,
  $recipes: ReadableAtom<IrrigationRecipe[]>,
  $device: ReadableAtom<GrowspaceDevice | undefined>
): ReadableAtom<RecipesTabViewModel> {
  return computed([$sm, $recipes, $device], (sm, recipes, device) => {
    const draft = sm.tabs.recipes.draft;
    const context = authoringContext(device);
    // `enabled` is what decides which half is running, exactly as the backend
    // decides it — so the card's offer and the backend's refusal agree.
    const runningKind: IrrigationRecipeKind = device?.irrigationStrategy?.enabled
      ? 'crop_steering'
      : 'schedule';

    const applicable = recipes.filter((r) => r.kind === runningKind);
    const options = sortByProvenance(applicable, context).map((r) => toOption(r, context));

    const preselected = options[0]?.id ?? null;
    const explicit = draft.selectedRecipeId;
    // An explicit pick that is no longer offered (its recipe left the library,
    // or the growspace switched halves) falls back to the pre-selection rather
    // than leaving the picker pointing at nothing.
    const selectedRecipeId =
      explicit && options.some((o) => o.id === explicit) ? explicit : preselected;
    const selected = options.find((o) => o.id === selectedRecipeId) ?? null;

    const targetMedia = device?.irrigationStrategy?.substrateProfile?.mediaType;
    const mediaMismatch =
      selected && targetMedia && selected.mediaType !== targetMedia
        ? { authored: selected.mediaType, target: targetMedia }
        : null;

    return {
      applied: deriveApplied(device, recipes),
      runningKind,
      context,
      options,
      hiddenByKindCount: recipes.length - applicable.length,
      selectedRecipeId,
      selected,
      mediaMismatch,
      applyWarning: sm.tabs.recipes.applyWarning,
      nameDraft: draft.name,
      canSave: draft.name.trim().length > 0,
      busy: sm.status.kind === 'applying',
    };
  });
}
