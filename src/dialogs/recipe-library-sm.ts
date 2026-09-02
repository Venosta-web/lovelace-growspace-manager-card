/**
 * Recipe Library State Machine
 *
 * Pure module — no Lit, no DOM, no hassCall. All interaction state for the
 * standalone [[Irrigation Recipe]] library editor lives here. The container
 * calls `transition(sm, event)` and replaces its single `@state() _sm`.
 *
 * Does NOT satisfy DialogStateMachine — the library editor has no navigation
 * tabs with per-tab draft state. Shape is flat, like the Inbox panel's.
 *
 * The editor is a **library** surface, not a growspace one: it edits recipes
 * as objects, and the growspaces that carry them are not in scope here. That
 * is what makes the state this small — a selection, an optional draft over the
 * selected recipe, and the delete confirmation.
 *
 * The draft holds the values wire-shaped, exactly as `IrrigationRecipe` carries
 * them, because that is what `update_irrigation_recipe` accepts. Only the
 * fields the grower actually changed are sent, so the sparse edit stays sparse:
 * a rename travels with no values at all.
 */

import type {
  CropSteeringRecipeValues,
  IrrigationRecipe,
  ScheduleRecipeValues,
} from '../services/types';

// ─── Draft ────────────────────────────────────────────────────────────────────

/**
 * The values a grower has changed on the selected recipe, and nothing else.
 *
 * Sparse on purpose. An empty `values` with a changed `name` is a rename; an
 * empty draft entirely is "opened the form and touched nothing", which saves
 * cleanly as a no-op rather than re-writing every field back over itself.
 */
export interface RecipeDraft {
  /** The recipe being edited. Identity is never editable. */
  id: string;
  /** The name as typed. Starts as the stored name. */
  name: string;
  /** Changed fields of the recipe's own half, keyed as the backend names them. */
  values: Partial<CropSteeringRecipeValues> & Partial<ScheduleRecipeValues>;
}

// ─── Status ───────────────────────────────────────────────────────────────────

export type RecipeLibraryStatus =
  | { kind: 'idle' }
  | { kind: 'editing'; draft: RecipeDraft }
  | { kind: 'applying'; draft: RecipeDraft }
  | { kind: 'error'; draft: RecipeDraft; message: string }
  | { kind: 'confirm-delete'; id: string; name: string }
  | { kind: 'deleting'; id: string; name: string };

export interface RecipeLibrarySM {
  /** The recipe whose detail is open, or null for the list. */
  selectedId: string | null;
  status: RecipeLibraryStatus;
  toast: string | undefined;
}

// ─── Events ───────────────────────────────────────────────────────────────────

export type RecipeLibraryEvent =
  | { type: 'RecipeSelected'; id: string }
  | { type: 'BackToList' }
  | { type: 'EditStarted'; recipe: IrrigationRecipe }
  | { type: 'EditCancelled' }
  | { type: 'NameChanged'; name: string }
  | { type: 'ValueChanged'; field: string; value: number | string | boolean | null }
  | { type: 'SaveRequested' }
  | { type: 'SaveResolved' }
  | { type: 'SaveFailed'; message: string }
  | { type: 'DeleteRequested'; id: string; name: string }
  | { type: 'DeleteConfirmed' }
  | { type: 'DeleteCancelled' }
  | { type: 'DeleteResolved' }
  | { type: 'DeleteFailed'; message: string }
  | { type: 'SET_TOAST'; message: string | undefined };

// ─── Initial state ────────────────────────────────────────────────────────────

export function createInitialSM(): RecipeLibrarySM {
  return { selectedId: null, status: { kind: 'idle' }, toast: undefined };
}

/** Open an edit form seeded from what the recipe currently stores. */
export function draftFromRecipe(recipe: IrrigationRecipe): RecipeDraft {
  return { id: recipe.id, name: recipe.name, values: {} };
}

// ─── Transition ───────────────────────────────────────────────────────────────

/** The statuses that own a draft, and so survive a field edit. */
function draftOf(status: RecipeLibraryStatus): RecipeDraft | null {
  return status.kind === 'editing' || status.kind === 'error' ? status.draft : null;
}

export function transition(sm: RecipeLibrarySM, event: RecipeLibraryEvent): RecipeLibrarySM {
  switch (event.type) {
    case 'RecipeSelected':
      return { ...sm, selectedId: event.id, status: { kind: 'idle' } };

    case 'BackToList':
      return { ...sm, selectedId: null, status: { kind: 'idle' } };

    case 'EditStarted':
      return {
        ...sm,
        selectedId: event.recipe.id,
        status: { kind: 'editing', draft: draftFromRecipe(event.recipe) },
      };

    case 'EditCancelled':
      return { ...sm, status: { kind: 'idle' } };

    case 'NameChanged': {
      const draft = draftOf(sm.status);
      if (draft === null) return sm;
      // Leaving `error` on the first keystroke: the message described the
      // payload that was rejected, and the grower has just changed it.
      return {
        ...sm,
        status: { kind: 'editing', draft: { ...draft, name: event.name } },
      };
    }

    case 'ValueChanged': {
      const draft = draftOf(sm.status);
      if (draft === null) return sm;
      return {
        ...sm,
        status: {
          kind: 'editing',
          draft: { ...draft, values: { ...draft.values, [event.field]: event.value } },
        },
      };
    }

    case 'SaveRequested': {
      const draft = draftOf(sm.status);
      // A blank name is refused by the backend; not offering it is cheaper
      // than surfacing that refusal.
      if (draft === null || draft.name.trim() === '') return sm;
      return { ...sm, status: { kind: 'applying', draft } };
    }

    case 'SaveResolved':
      if (sm.status.kind !== 'applying') return sm;
      return { ...sm, status: { kind: 'idle' }, toast: 'Recipe saved' };

    case 'SaveFailed':
      if (sm.status.kind !== 'applying') return sm;
      // The draft is kept, so a refusal the grower can act on — a value the
      // backend would not take — leaves their typing on screen.
      return {
        ...sm,
        status: { kind: 'error', draft: sm.status.draft, message: event.message },
      };

    case 'DeleteRequested':
      return { ...sm, status: { kind: 'confirm-delete', id: event.id, name: event.name } };

    case 'DeleteConfirmed':
      if (sm.status.kind !== 'confirm-delete') return sm;
      return {
        ...sm,
        status: { kind: 'deleting', id: sm.status.id, name: sm.status.name },
      };

    case 'DeleteCancelled':
      return { ...sm, status: { kind: 'idle' } };

    case 'DeleteResolved':
      if (sm.status.kind !== 'deleting') return sm;
      // Back to the list: the recipe the detail was showing is gone.
      return {
        ...sm,
        selectedId: null,
        status: { kind: 'idle' },
        toast: `Deleted "${sm.status.name}"`,
      };

    case 'DeleteFailed':
      if (sm.status.kind !== 'deleting') return sm;
      return { ...sm, status: { kind: 'idle' }, toast: event.message };

    case 'SET_TOAST':
      return { ...sm, toast: event.message };
  }
}
