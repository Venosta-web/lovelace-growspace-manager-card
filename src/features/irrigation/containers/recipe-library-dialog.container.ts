/**
 * Recipe Library Dialog (ADR-0019)
 *
 * The standalone [[Irrigation Recipe]] library editor's host: it owns the
 * RecipeLibrarySM, projects it through the Recipe Library ViewModel, and runs
 * the two mutations the editor can cause — editing a recipe in place and
 * deleting one.
 *
 * It exists **beside** the irrigation dialog's Recipe tab rather than inside
 * it, because the library is global while that tab is one growspace's. A
 * grower reaches this from the header menu with no growspace in mind, which is
 * why nothing here takes a `growspaceId` — the same reason the nutrient presets
 * editor is its own surface.
 *
 * The library rides every growspace payload at `irrigation.recipes`, so this
 * dialog reads `irrigationRecipes$` rather than self-fetching on open: the data
 * is already there before the dialog is. The program library rides the same
 * payloads and is read for one thing only — naming the plans a delete would
 * leave holding.
 *
 * Effects run from `updated()` on entering an in-flight status, the pattern the
 * feed-and-water dialog's editors use — the click handlers stay synchronous and
 * only dispatch an intent, so a rejection can neither leak nor strand the
 * in-flight flag (ADR-0015).
 */

import { LitElement, css, html, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { StoreController } from '@nanostores/lit';
import { atom } from 'nanostores';
import { mdiBookmarkMultipleOutline } from '@mdi/js';
import {
  createInitialSM,
  transition,
  type RecipeDraft,
  type RecipeLibraryEvent,
  type RecipeLibrarySM,
} from '../../../dialogs/recipe-library-sm';
import {
  irrigationPrograms$,
  irrigationRecipes$,
  removeIrrigationRecipe,
  updateIrrigationRecipe,
} from '../../../slices/irrigation';
import type { CropSteeringRecipeValues, ScheduleRecipeValues } from '../../../services/types';
import { createRecipeLibraryViewModel } from '../viewmodels/recipe-library.viewmodel';
import { dialogStyles } from '../../../styles/dialog.styles';
import '../../shared/ui/gs-dialog';
import '../components/irrigation-recipe-library';

@customElement('recipe-library-dialog')
export class RecipeLibraryDialog extends LitElement {
  @property({ type: Boolean }) open = false;

  @state() private _sm: RecipeLibrarySM = createInitialSM();
  private _prevSm: RecipeLibrarySM | undefined;

  /**
   * The SM as an atom, so the ViewModel can be a `computed` over it and the
   * global library exactly as every other ADR-0019 surface is.
   */
  private readonly _sm$ = atom<RecipeLibrarySM>(this._sm);
  private readonly _vm$ = createRecipeLibraryViewModel(
    this._sm$,
    irrigationRecipes$,
    // The program library is read for one reason: the delete confirmation
    // names the plans whose slots point at the recipe.
    irrigationPrograms$
  );
  private _vm = new StoreController(this, this._vm$);

  static styles = [
    dialogStyles,
    css`
      /* dialogStyles has no toast; matching the feed-and-water dialog's. */
      .toast {
        position: absolute;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.85);
        color: var(--text-primary);
        padding: 8px 16px;
        border-radius: var(--border-radius-full, 9999px);
        font-size: 0.875rem;
        pointer-events: none;
        z-index: 20;
      }
    `,
  ];

  protected updated(changed: PropertyValues): void {
    super.updated(changed);
    if (changed.has('_sm')) this._runEffectIfNeeded(this._prevSm);
    this._prevSm = this._sm;
  }

  private _dispatch = (event: RecipeLibraryEvent): void => {
    this._sm = transition(this._sm, event);
    this._sm$.set(this._sm);
  };

  private _runEffectIfNeeded(prev: RecipeLibrarySM | undefined): void {
    const status = this._sm.status;
    if (status.kind === prev?.status.kind) return;
    if (status.kind === 'applying') this._runSave(status.draft);
    if (status.kind === 'deleting') this._runDelete(status.id);
  }

  private async _runSave(draft: RecipeDraft): Promise<void> {
    const recipe = irrigationRecipes$.get().find((r) => r.id === draft.id);
    // Which half the values belong to is the recipe's `kind`, never a guess
    // from the field names — the backend refuses the other half outright.
    const values = Object.keys(draft.values).length > 0 ? draft.values : undefined;
    try {
      await updateIrrigationRecipe({
        recipeId: draft.id,
        // Sent only when it actually changed, so a value-only edit is not
        // also a rename that happens to write the same string.
        ...(recipe && draft.name.trim() !== recipe.name ? { name: draft.name.trim() } : {}),
        ...(values && recipe?.kind === 'crop_steering'
          ? { cropSteering: values as Partial<CropSteeringRecipeValues> }
          : {}),
        ...(values && recipe?.kind === 'schedule'
          ? { schedule: values as Partial<ScheduleRecipeValues> }
          : {}),
      });
      this._dispatch({ type: 'SaveResolved' });
    } catch (err) {
      this._dispatch({ type: 'SaveFailed', message: messageOf(err) });
    }
  }

  private async _runDelete(recipeId: string): Promise<void> {
    try {
      await removeIrrigationRecipe(recipeId);
      this._dispatch({ type: 'DeleteResolved' });
    } catch (err) {
      this._dispatch({ type: 'DeleteFailed', message: messageOf(err) });
    }
  }

  // ─── Intent translation ────────────────────────────────────────────────────

  private _onSelected = (e: CustomEvent<{ recipeId: string }>) =>
    this._dispatch({ type: 'RecipeSelected', id: e.detail.recipeId });

  private _onBackToList = () => this._dispatch({ type: 'BackToList' });

  private _onEditStarted = (e: CustomEvent<{ recipeId: string }>) => {
    const recipe = irrigationRecipes$.get().find((r) => r.id === e.detail.recipeId);
    if (recipe) this._dispatch({ type: 'EditStarted', recipe });
  };

  private _onEditCancelled = () => this._dispatch({ type: 'EditCancelled' });

  private _onNameChanged = (e: CustomEvent<{ name: string }>) =>
    this._dispatch({ type: 'NameChanged', name: e.detail.name });

  private _onValueChanged = (
    e: CustomEvent<{ field: string; value: number | string | boolean | null }>
  ) => this._dispatch({ type: 'ValueChanged', field: e.detail.field, value: e.detail.value });

  private _onSaveRequested = () => this._dispatch({ type: 'SaveRequested' });

  private _onDeleteRequested = (e: CustomEvent<{ recipeId: string; name: string }>) =>
    this._dispatch({ type: 'DeleteRequested', id: e.detail.recipeId, name: e.detail.name });

  private _onDeleteConfirmed = () => this._dispatch({ type: 'DeleteConfirmed' });

  private _onDeleteCancelled = () => this._dispatch({ type: 'DeleteCancelled' });

  private _close = () =>
    this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));

  render(): TemplateResult | typeof nothing {
    if (!this.open) return nothing;
    const vm = this._vm.value;
    return html`
      <gs-dialog
        .open=${true}
        heading="Irrigation Recipes"
        subtitle="Rename, edit and delete saved recipes"
        .iconPath=${mdiBookmarkMultipleOutline}
        containerStyle="min-height: 400px;"
        @close=${this._close}
      >
        <div class="glass-dialog-container">
          <irrigation-recipe-library
            .vm=${vm}
            @recipe-selected=${this._onSelected}
            @recipe-back-to-list=${this._onBackToList}
            @recipe-edit-started=${this._onEditStarted}
            @recipe-edit-cancelled=${this._onEditCancelled}
            @recipe-name-changed=${this._onNameChanged}
            @recipe-value-changed=${this._onValueChanged}
            @recipe-save-requested=${this._onSaveRequested}
            @recipe-delete-requested=${this._onDeleteRequested}
            @recipe-delete-confirmed=${this._onDeleteConfirmed}
            @recipe-delete-cancelled=${this._onDeleteCancelled}
          ></irrigation-recipe-library>
          ${vm.toast ? html`<div class="toast">${vm.toast}</div>` : nothing}
        </div>
      </gs-dialog>
    `;
  }
}

/**
 * A WSError's own message, which for a refused edit names what the backend
 * would not take. Anything else degrades to its string form rather than to a
 * generic "failed", which would throw away the only useful part.
 */
function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

declare global {
  interface HTMLElementTagNameMap {
    'recipe-library-dialog': RecipeLibraryDialog;
  }
}
