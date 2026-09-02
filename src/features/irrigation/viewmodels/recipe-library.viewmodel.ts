/**
 * Recipe Library ViewModel (ADR-0019)
 *
 * The pure derivation behind the standalone [[Irrigation Recipe]] library
 * editor — the library as an object in its own right: every saved recipe with
 * its kind and its [[Recipe Provenance]], the detail of whichever one is open,
 * the edit form's current values, and the delete confirmation.
 *
 * This is deliberately a *different* surface from the irrigation dialog's
 * Recipe tab, and the split is not cosmetic. The tab answers "what is this
 * growspace running, and what should it run next?", so everything on it is
 * measured against one tent — the picker is ordered by that tent's stage, the
 * kind gate hides what that tent cannot apply, and drift is that tent's drift.
 * The library is **global**: a recipe exists whether or not any growspace is
 * open, so nothing here filters, orders or gates by a growspace, and both kinds
 * are always listed. Editing here is editing the object; the tab is where a
 * growspace gets one.
 *
 * The editable values are the recipe's own half, wire-shaped, because that is
 * what `update_irrigation_recipe` accepts and the card has no other use for
 * them (see `IrrigationRecipe` in services/types.ts).
 */

import { computed, type ReadableAtom } from 'nanostores';
import type {
  CropSteeringRecipeValues,
  IrrigationRecipe,
  ScheduleRecipeValues,
} from '../../../services/types';
import type { RecipeLibrarySM } from '../../../dialogs/recipe-library-sm';
import type { IrrigationRecipeKind } from '../../../slices/irrigation/schema';

/** One row of the library list. */
export interface RecipeRowVM {
  id: string;
  name: string;
  kind: IrrigationRecipeKind;
  /** "Crop steering" / "Schedule" — the half this recipe carries. */
  kindLabel: string;
  /** "Flower · week 3", or null when it was authored with no live cohort. */
  provenanceLabel: string | null;
  /** "5 L coco @ 11 ml/s" — the plumbing it was captured from. */
  plumbingLabel: string;
  /** Formatted creation time, or null when it does not parse. */
  createdAtLabel: string | null;
  selected: boolean;
}

/** One editable field of the open recipe, already resolved to what to show. */
export interface RecipeFieldVM {
  /** The backend's own field name — what a save sends back. */
  field: string;
  label: string;
  /** How the UI should render an input for it. */
  type: 'number' | 'text' | 'boolean';
  /** The draft value when the grower changed it, else the stored one. */
  value: number | string | boolean | null;
  /** True when this field differs from what the recipe stores. */
  changed: boolean;
  /** Unit suffix, or null. */
  unit: string | null;
}

/** The delete confirmation, with what deleting would leave behind. */
export interface DeleteConfirmVM {
  id: string;
  name: string;
  /**
   * The [[Irrigation Program]]s whose slots point at this recipe.
   *
   * Deleting is never refused and never cascades — a slot pointing at a deleted
   * recipe degrades to "no instruction", which the [[Program Hold]] rule
   * already treats as "change nothing". So this names them rather than blocking
   * on them. Empty until programs exist (#107 supplies the source); an empty
   * list renders as a plain confirmation, not as "referenced by nothing".
   */
  referencingPrograms: string[];
}

/** Complete render input for `<irrigation-recipe-library>`. */
export interface RecipeLibraryViewModel {
  /** Every saved recipe, name-ordered. Empty → the library's empty state. */
  rows: RecipeRowVM[];
  /** The recipe whose detail is open, or null for the list. */
  selected: IrrigationRecipe | null;
  /** The open recipe's fields, or empty when the list is showing. */
  fields: RecipeFieldVM[];
  /** True while the edit form is open (including after a refused save). */
  editing: boolean;
  /** The name in the form; the stored name when not editing. */
  nameDraft: string;
  /** Whether the form has a change worth saving. */
  canSave: boolean;
  /** The backend's refusal from the last save, verbatim, or null. */
  errorMessage: string | null;
  /** The pending delete confirmation, or null. */
  deleteConfirm: DeleteConfirmVM | null;
  /** A mutation is in flight — the form and the buttons disable. */
  busy: boolean;
  toast: string | undefined;
}

const KIND_LABELS: Record<IrrigationRecipeKind, string> = {
  crop_steering: 'Crop steering',
  schedule: 'Schedule',
};

const STAGE_LABELS: Record<string, string> = {
  seedling: 'Seedling',
  clone: 'Clone',
  mother: 'Mother',
  veg: 'Veg',
  flower: 'Flower',
};

/**
 * The editable fields of each half, in the order a grower reads them, with the
 * label and unit each one shows.
 *
 * A hand-written list rather than a walk over the stored object's keys: the
 * order is editorial, `p1_shot_volume_percent` is not a self-describing label,
 * and a field the backend adds should appear here deliberately with a name
 * chosen for it — not as a raw identifier with no unit.
 */
const CROP_STEERING_FIELDS: {
  field: keyof CropSteeringRecipeValues;
  label: string;
  type: RecipeFieldVM['type'];
  unit: string | null;
}[] = [
  { field: 'lights_on_time', label: 'Lights on', type: 'text', unit: null },
  { field: 'target_vwc_percent', label: 'Target VWC', type: 'number', unit: '%' },
  {
    field: 'maintenance_dryback_percent',
    label: 'Maintenance dryback',
    type: 'number',
    unit: '%',
  },
  { field: 'p0_duration_minutes', label: 'P0 duration', type: 'number', unit: 'min' },
  {
    field: 'p1_shot_volume_percent',
    label: 'P1 shot size',
    type: 'number',
    unit: '% of pot',
  },
  { field: 'p1_shot_interval_minutes', label: 'P1 interval', type: 'number', unit: 'min' },
  {
    field: 'p2_shot_volume_percent',
    label: 'P2 shot size',
    type: 'number',
    unit: '% of pot',
  },
  { field: 'p2_shot_interval_minutes', label: 'P2 interval', type: 'number', unit: 'min' },
  {
    field: 'p2_stop_before_lights_off_minutes',
    label: 'P2 stops before lights off',
    type: 'number',
    unit: 'min',
  },
  { field: 'auto_light_tracking', label: 'Auto light tracking', type: 'boolean', unit: null },
  { field: 'dynamic_shot_enabled', label: 'Dynamic shots', type: 'boolean', unit: null },
  {
    field: 'dynamic_aggressiveness',
    label: 'Dynamic aggressiveness',
    type: 'number',
    unit: null,
  },
  { field: 'dynamic_recovery', label: 'Dynamic recovery', type: 'number', unit: null },
  {
    field: 'dynamic_shot_size_floor',
    label: 'Dynamic shot floor',
    type: 'number',
    unit: null,
  },
  {
    field: 'dynamic_interval_ceiling',
    label: 'Dynamic interval ceiling',
    type: 'number',
    unit: null,
  },
  { field: 'ec_modulation_enabled', label: 'EC modulation', type: 'boolean', unit: null },
  { field: 'pore_ec_target_min', label: 'Pore EC min', type: 'number', unit: 'mS/cm' },
  { field: 'pore_ec_target_max', label: 'Pore EC max', type: 'number', unit: 'mS/cm' },
];

const SCHEDULE_FIELDS: {
  field: keyof ScheduleRecipeValues;
  label: string;
  type: RecipeFieldVM['type'];
  unit: string | null;
}[] = [
  { field: 'irrigation_duration', label: 'Irrigation duration', type: 'number', unit: 's' },
  { field: 'drain_duration', label: 'Drain duration', type: 'number', unit: 's' },
  { field: 'daily_volume_cap_liters', label: 'Daily volume cap', type: 'number', unit: 'L' },
  { field: 'max_cycles_per_day', label: 'Max cycles per day', type: 'number', unit: null },
  { field: 'skip_during_dark', label: 'Skip during dark', type: 'boolean', unit: null },
];

function stageLabel(stage: string): string {
  return STAGE_LABELS[stage] ?? stage;
}

/** Timestamp formatting, matching the Recipe tab's applied-at style. */
function formatTimestamp(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function toRow(recipe: IrrigationRecipe, selectedId: string | null): RecipeRowVM {
  const p = recipe.provenance;
  return {
    id: recipe.id,
    name: recipe.name,
    kind: recipe.kind,
    kindLabel: KIND_LABELS[recipe.kind],
    provenanceLabel: p.stage ? `${stageLabel(p.stage)} · week ${p.week}` : null,
    plumbingLabel: `${p.litersPerPot} L ${p.mediaType} @ ${p.pumpFlowRateMlPerSec} ml/s`,
    createdAtLabel: formatTimestamp(recipe.createdAt),
    selected: recipe.id === selectedId,
  };
}

/**
 * The stored values of whichever half `kind` names.
 *
 * Reading the half `kind` declares rather than whichever one happens to be
 * populated: the library guarantees they agree, and trusting `kind` is what
 * makes a corrupt entry show as an empty form instead of silently editing the
 * wrong half.
 */
function storedValues(recipe: IrrigationRecipe): Record<string, unknown> {
  const half = recipe.kind === 'crop_steering' ? recipe.cropSteering : recipe.schedule;
  return (half ?? {}) as Record<string, unknown>;
}

function toFields(recipe: IrrigationRecipe, draftValues: Record<string, unknown>): RecipeFieldVM[] {
  const stored = storedValues(recipe);
  const spec = recipe.kind === 'crop_steering' ? CROP_STEERING_FIELDS : SCHEDULE_FIELDS;
  return spec
    .filter(({ field }) => field in stored)
    .map(({ field, label, type, unit }) => {
      const changed = field in draftValues;
      return {
        field,
        label,
        type,
        value: (changed ? draftValues[field] : stored[field]) as RecipeFieldVM['value'],
        changed,
        unit,
      };
    });
}

/**
 * Pure factory: SM atom + the Irrigation slice's global `irrigationRecipes$` →
 * one library VM atom.
 *
 * No device atom, and that absence is the point: this surface is about the
 * library, not about any one growspace.
 */
export function createRecipeLibraryViewModel(
  $sm: ReadableAtom<RecipeLibrarySM>,
  $recipes: ReadableAtom<IrrigationRecipe[]>
): ReadableAtom<RecipeLibraryViewModel> {
  return computed([$sm, $recipes], (sm, recipes) => {
    const status = sm.status;
    // A selection whose recipe has left the library (deleted in another
    // session) falls back to the list rather than showing an empty detail.
    const selected = recipes.find((r) => r.id === sm.selectedId) ?? null;

    const draft =
      status.kind === 'editing' || status.kind === 'applying' || status.kind === 'error'
        ? status.draft
        : null;
    const draftValues = (draft?.values ?? {}) as Record<string, unknown>;

    const busy = status.kind === 'applying' || status.kind === 'deleting';
    const nameDraft = draft ? draft.name : (selected?.name ?? '');
    const nameChanged = selected !== null && nameDraft.trim() !== selected.name;

    return {
      rows: recipes.map((r) => toRow(r, sm.selectedId)),
      selected,
      fields: selected ? toFields(selected, draftValues) : [],
      editing: status.kind === 'editing' || status.kind === 'error',
      nameDraft,
      canSave:
        draft !== null &&
        nameDraft.trim() !== '' &&
        (nameChanged || Object.keys(draftValues).length > 0),
      errorMessage: status.kind === 'error' ? status.message : null,
      deleteConfirm:
        status.kind === 'confirm-delete'
          ? { id: status.id, name: status.name, referencingPrograms: [] }
          : null,
      busy,
      toast: sm.toast,
    };
  });
}
