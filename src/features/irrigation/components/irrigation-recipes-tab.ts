/**
 * Irrigation Recipes Tab Component (ADR-0019)
 *
 * The dumb presentational element for the Irrigation Dialog's Recipe tab.
 * `@property .vm: RecipesTabViewModel` in, semantic Tab Intents out, no
 * `@state()` of its own — the typed name and the picked recipe live in the
 * DialogStateMachine and arrive projected through the VM.
 *
 * The tab reads top-down as the story it tells: what this growspace is running
 * on now, then the picker that changes it, then the save form that turns the
 * current settings into a recipe of their own. Saving sits here rather than on
 * the tabs it snapshots because it is one gesture over all of them.
 *
 * Tab Intents (the Dialog Shell owns their translation to SM events):
 *   - `recipe-name-changed`   detail: { name }
 *   - `recipe-selected`       detail: { recipeId }
 *   - `recipe-save-requested` (no detail)
 *   - `recipe-apply-requested` detail: { recipeId }
 */

import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { dialogStyles } from '../../../styles/dialog.styles';
import '../../shared/ui/gs-help-tooltip';
import { RECIPES } from '../help-copy';
import type {
  AppliedRecipeVM,
  RecipeOptionVM,
  RecipesTabViewModel,
} from '../viewmodels/recipes-tab.viewmodel';

const DRIFT_TEXT: Record<AppliedRecipeVM['drift'], string> = {
  'in-sync': 'Matches the recipe',
  drifted: 'Drifted from the recipe',
  unknown: 'Drift unknown',
};

@customElement('irrigation-recipes-tab')
export class IrrigationRecipesTab extends LitElement {
  @property({ attribute: false }) vm!: RecipesTabViewModel;

  static styles = [
    dialogStyles,
    css`
      :host {
        display: block;
      }
      .applied-line {
        display: flex;
        align-items: baseline;
        gap: 10px;
        flex-wrap: wrap;
      }
      .applied-name {
        font-size: var(--font-size-md, 15px);
        font-weight: 600;
      }
      .applied-when {
        font-size: 11.5px;
        opacity: 0.5;
        font-variant-numeric: tabular-nums;
      }
      .drift-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 2px 10px;
        border-radius: var(--border-radius-full, 9999px);
        font-size: 11.5px;
        font-weight: 600;
        border: 1px solid currentColor;
      }
      .drift-badge.in-sync {
        color: var(--gm-primary-color, #4caf50);
      }
      .drift-badge.drifted {
        color: var(--gm-warning-color, #ff9800);
      }
      .drift-badge.unknown {
        color: rgba(255, 255, 255, 0.45);
      }
      .recipe-row {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 9px 12px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: var(--border-radius-md, 12px);
        background: rgba(255, 255, 255, 0.02);
        cursor: pointer;
        text-align: left;
        width: 100%;
        color: inherit;
        font: inherit;
      }
      .recipe-row.selected {
        border-color: var(--gm-info-color, #2196f3);
        background: rgba(33, 150, 243, 0.08);
      }
      .recipe-row-info {
        flex: 1;
        min-width: 0;
      }
      .recipe-row-name {
        font-size: var(--font-size-supporting);
        font-weight: 500;
      }
      .recipe-row-sub {
        font-size: 11px;
        opacity: 0.5;
        margin-top: 2px;
      }
      .stage-match {
        font-size: 10.5px;
        font-weight: 700;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: var(--gm-info-color, #2196f3);
        flex-shrink: 0;
      }
      .note {
        font-size: var(--font-size-sm);
        opacity: 0.65;
        margin: 10px 0 0;
      }
    `,
  ];

  private _emit(type: string, detail?: unknown): void {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }

  render(): TemplateResult {
    const vm = this.vm;
    if (!vm) return html``;
    return html` ${this._renderApplied(vm)} ${this._renderPicker(vm)} ${this._renderSaveForm(vm)} `;
  }

  private _renderApplied(vm: RecipesTabViewModel): TemplateResult {
    const applied = vm.applied;
    return html`
      <div class="detail-card">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
          <h3 style="margin:0;">Applied Recipe</h3>
          <gs-help-tooltip
            .content=${this._renderSectionExplainer()}
            label=${RECIPES.section.label}
          ></gs-help-tooltip>
        </div>
        ${applied === null
          ? html`<p style="margin:0;opacity:0.7;">
              No recipe has been applied to this growspace yet.
            </p>`
          : html`
              <div class="applied-line">
                <span class="applied-name"
                  >${applied.name ?? 'Recipe no longer in the library'}</span
                >
                ${applied.appliedAtLabel
                  ? html`<span class="applied-when">applied ${applied.appliedAtLabel}</span>`
                  : nothing}
                <span class="drift-badge ${applied.drift}" data-drift=${applied.drift}>
                  ${DRIFT_TEXT[applied.drift]}
                </span>
                ${applied.drift === 'drifted'
                  ? html`<gs-help-tooltip
                      content=${RECIPES.drift.content}
                      label=${RECIPES.drift.label}
                    ></gs-help-tooltip>`
                  : nothing}
              </div>
            `}
        ${vm.applyWarning
          ? html`<p class="note" data-apply-warning>${vm.applyWarning}</p>`
          : nothing}
      </div>
    `;
  }

  private _renderPicker(vm: RecipesTabViewModel): TemplateResult {
    const kindLabel = vm.runningKind === 'crop_steering' ? 'crop-steering' : 'schedule';
    return html`
      <div class="detail-card">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
          <h3 style="margin:0;">Apply a Recipe</h3>
          <gs-help-tooltip
            content=${RECIPES.apply.content}
            label=${RECIPES.apply.label}
          ></gs-help-tooltip>
        </div>
        ${vm.options.length === 0
          ? html`<p style="margin:0;opacity:0.7;">
              No ${kindLabel} recipes saved yet. Save this growspace's settings below to start the
              library.
            </p>`
          : html`
              <div style="display:flex;flex-direction:column;gap:8px;">
                ${vm.options.map((option) => this._renderOption(option, vm.selectedRecipeId))}
              </div>
              ${vm.mediaMismatch
                ? html`
                    <p class="note" data-media-mismatch>
                      Authored in ${vm.mediaMismatch.authored}, this growspace runs
                      ${vm.mediaMismatch.target}. Values are applied unscaled.
                      <gs-help-tooltip
                        content=${RECIPES.media.content}
                        label=${RECIPES.media.label}
                      ></gs-help-tooltip>
                    </p>
                  `
                : nothing}
              <div class="button-group" style="margin-top:14px;">
                <button
                  class="md3-button primary btn-apply-recipe"
                  ?disabled=${vm.busy || vm.selectedRecipeId === null}
                  @click=${() =>
                    this._emit('recipe-apply-requested', { recipeId: vm.selectedRecipeId })}
                >
                  Apply
                </button>
              </div>
            `}
        ${vm.hiddenByKindCount > 0
          ? html`
              <p class="note" data-hidden-by-kind>
                ${vm.hiddenByKindCount} ${vm.hiddenByKindCount === 1 ? 'recipe is' : 'recipes are'}
                not listed — this growspace is running ${kindLabel} irrigation.
                <gs-help-tooltip
                  content=${RECIPES.kind.content}
                  label=${RECIPES.kind.label}
                ></gs-help-tooltip>
              </p>
            `
          : nothing}
      </div>
    `;
  }

  private _renderOption(option: RecipeOptionVM, selectedId: string | null): TemplateResult {
    const sub = [option.provenanceLabel, option.plumbingLabel]
      .filter((p) => p !== null)
      .join(' · ');
    return html`
      <button
        type="button"
        class="recipe-row ${option.id === selectedId ? 'selected' : ''}"
        data-recipe-id=${option.id}
        aria-pressed=${option.id === selectedId}
        @click=${() => this._emit('recipe-selected', { recipeId: option.id })}
      >
        <div class="recipe-row-info">
          <div class="recipe-row-name">${option.name}</div>
          <div class="recipe-row-sub">${sub}</div>
        </div>
        ${option.matchesCurrentStage ? html`<span class="stage-match">This week</span>` : nothing}
      </button>
    `;
  }

  private _renderSaveForm(vm: RecipesTabViewModel): TemplateResult {
    return html`
      <div class="detail-card">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
          <h3 style="margin:0;">Save Current Settings</h3>
          <gs-help-tooltip
            content=${RECIPES.save.content}
            label=${RECIPES.save.label}
          ></gs-help-tooltip>
        </div>
        <div class="md3-input-group">
          <label class="md3-label">Recipe Name</label>
          <input
            class="md3-input recipe-name-input"
            type="text"
            .value=${vm.nameDraft}
            placeholder="e.g. Flower week 3 — generative"
            @input=${(e: Event) =>
              this._emit('recipe-name-changed', { name: (e.target as HTMLInputElement).value })}
          />
        </div>
        <div class="button-group" style="margin-top:12px;">
          <button
            class="md3-button primary btn-save-recipe"
            ?disabled=${vm.busy || !vm.canSave}
            @click=${() => this._emit('recipe-save-requested')}
          >
            Save as Recipe
          </button>
        </div>
      </div>
    `;
  }

  private _renderSectionExplainer(): TemplateResult {
    return html`
      <p style="margin:0 0 8px;">${RECIPES.section.lead}</p>
      <p style="margin:0;">${RECIPES.section.body}</p>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'irrigation-recipes-tab': IrrigationRecipesTab;
  }
}
