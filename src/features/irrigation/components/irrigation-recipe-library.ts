/**
 * Irrigation Recipe Library Component (ADR-0019)
 *
 * The dumb presentational element for the standalone [[Irrigation Recipe]]
 * library editor. `@property .vm: RecipeLibraryViewModel` in, semantic Library
 * Intents out, no `@state()` of its own — the selection, the draft and the
 * pending delete all live in the RecipeLibrarySM and arrive projected.
 *
 * Two screens, list and detail, mirroring the nutrient presets editor next
 * door: the library is a set of named things, and editing one is a place you
 * go rather than a row that expands.
 *
 * Library Intents (the container owns their translation to SM events):
 *   - `recipe-selected`        detail: { recipeId }
 *   - `recipe-back-to-list`    (no detail)
 *   - `recipe-edit-started`    detail: { recipeId }
 *   - `recipe-edit-cancelled`  (no detail)
 *   - `recipe-name-changed`    detail: { name }
 *   - `recipe-value-changed`   detail: { field, value }
 *   - `recipe-save-requested`  (no detail)
 *   - `recipe-delete-requested`  detail: { recipeId, name }
 *   - `recipe-delete-confirmed`  (no detail)
 *   - `recipe-delete-cancelled`  (no detail)
 */

import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { mdiPencil, mdiDelete, mdiArrowLeft, mdiWater, mdiClockOutline } from '@mdi/js';
import { dialogStyles } from '../../../styles/dialog.styles';
import type {
  DeleteConfirmVM,
  RecipeFieldVM,
  RecipeLibraryViewModel,
  RecipeRowVM,
} from '../viewmodels/recipe-library.viewmodel';

@customElement('irrigation-recipe-library')
export class IrrigationRecipeLibrary extends LitElement {
  @property({ attribute: false }) vm!: RecipeLibraryViewModel;

  static styles = [
    dialogStyles,
    css`
      :host {
        display: block;
      }
      .list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .list-item {
        display: flex;
        align-items: center;
        gap: 12px;
        width: 100%;
        padding: 12px 16px;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: var(--border-radius-md, 12px);
        color: inherit;
        font: inherit;
        text-align: left;
        cursor: pointer;
        transition: background 0.15s;
      }
      .list-item:hover {
        background: rgba(255, 255, 255, 0.08);
      }
      .list-item.selected {
        border-color: var(--gm-primary-color, #4caf50);
      }
      .kind-icon {
        flex-shrink: 0;
        width: 20px;
        height: 20px;
        opacity: 0.7;
      }
      .item-body {
        flex: 1;
        min-width: 0;
      }
      .item-name {
        font-weight: 500;
        font-size: 0.9rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .item-meta {
        font-size: 0.75rem;
        color: var(--secondary-text-color);
        margin-top: 2px;
      }
      .kind-chip {
        flex-shrink: 0;
        padding: 2px 10px;
        border-radius: var(--border-radius-full, 9999px);
        border: 1px solid currentColor;
        font-size: 11.5px;
        font-weight: 600;
        opacity: 0.75;
      }
      .field-grid {
        display: grid;
        grid-template-columns: 1fr auto;
        align-items: center;
        gap: 10px 12px;
      }
      .field-label {
        font-size: 0.85rem;
      }
      .field-label.changed::after {
        content: ' •';
        color: var(--gm-primary-color, #4caf50);
      }
      .field-value {
        display: flex;
        align-items: center;
        gap: 6px;
        justify-content: flex-end;
      }
      .field-value .md3-input {
        width: 8ch;
        text-align: right;
        font-variant-numeric: tabular-nums;
      }
      .field-unit {
        font-size: 0.75rem;
        color: var(--secondary-text-color);
        min-width: 5ch;
      }
      .field-static {
        font-variant-numeric: tabular-nums;
        opacity: 0.85;
      }
      .provenance {
        font-size: 0.75rem;
        color: var(--secondary-text-color);
        margin: 0 0 12px;
      }
      .error {
        color: var(--gm-error-color, #f44336);
        font-size: 0.8rem;
        margin: 10px 0 0;
      }
      .danger {
        color: var(--gm-error-color, #f44336);
      }
      .confirm {
        border-color: var(--gm-error-color, #f44336);
      }
    `,
  ];

  private _emit(type: string, detail?: unknown): void {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }

  render(): TemplateResult {
    const vm = this.vm;
    if (!vm) return html``;
    if (vm.deleteConfirm) return this._renderDeleteConfirm(vm.deleteConfirm, vm.busy);
    return vm.selected ? this._renderDetail(vm) : this._renderList(vm);
  }

  // ─── List ──────────────────────────────────────────────────────────────────

  private _renderList(vm: RecipeLibraryViewModel): TemplateResult {
    if (vm.rows.length === 0) {
      return html`
        <div class="detail-card" data-empty>
          <p style="margin:0;opacity:0.7;">
            No recipes saved yet. Save a growspace's irrigation settings from its Recipe tab and it
            will appear here, ready to apply to any other growspace.
          </p>
        </div>
      `;
    }
    return html`<div class="list">${vm.rows.map((row) => this._renderRow(row))}</div>`;
  }

  private _renderRow(row: RecipeRowVM): TemplateResult {
    const meta = [row.provenanceLabel, row.plumbingLabel].filter((p) => p !== null).join(' · ');
    return html`
      <button
        type="button"
        class="list-item ${row.selected ? 'selected' : ''}"
        data-recipe-id=${row.id}
        @click=${() => this._emit('recipe-selected', { recipeId: row.id })}
      >
        <svg class="kind-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="currentColor"
            d=${row.kind === 'crop_steering' ? mdiWater : mdiClockOutline}
          ></path>
        </svg>
        <div class="item-body">
          <div class="item-name">${row.name}</div>
          <div class="item-meta">${meta}</div>
        </div>
        <span class="kind-chip">${row.kindLabel}</span>
      </button>
    `;
  }

  // ─── Detail ────────────────────────────────────────────────────────────────

  private _renderDetail(vm: RecipeLibraryViewModel): TemplateResult {
    const recipe = vm.selected!;
    const row = vm.rows.find((r) => r.id === recipe.id);
    return html`
      <div class="detail-card">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
          <button
            type="button"
            class="md3-button text btn-back"
            @click=${() => this._emit('recipe-back-to-list')}
          >
            <svg viewBox="0 0 24 24" style="width:18px;height:18px;" aria-hidden="true">
              <path fill="currentColor" d=${mdiArrowLeft}></path>
            </svg>
            Library
          </button>
        </div>

        ${vm.editing
          ? html`
              <div class="md3-input-group">
                <label class="md3-label">Name</label>
                <input
                  class="md3-input recipe-name-input"
                  type="text"
                  .value=${vm.nameDraft}
                  ?disabled=${vm.busy}
                  @input=${(e: Event) =>
                    this._emit('recipe-name-changed', {
                      name: (e.target as HTMLInputElement).value,
                    })}
                />
              </div>
            `
          : html`<h3 style="margin:0 0 4px;" data-recipe-name>${recipe.name}</h3>`}

        <p class="provenance" data-provenance>
          ${row?.kindLabel}${row?.provenanceLabel ? html` · saved in ${row.provenanceLabel}` : ''} ·
          ${row?.plumbingLabel}${row?.createdAtLabel ? html` · created ${row.createdAtLabel}` : ''}
        </p>

        <div class="field-grid">
          ${vm.fields.map((field) => this._renderField(field, vm.editing, vm.busy))}
        </div>

        ${vm.errorMessage ? html`<p class="error" data-save-error>${vm.errorMessage}</p>` : nothing}

        <div class="button-group" style="margin-top:16px;">
          ${vm.editing
            ? html`
                <button
                  class="md3-button text btn-cancel-edit"
                  ?disabled=${vm.busy}
                  @click=${() => this._emit('recipe-edit-cancelled')}
                >
                  Cancel
                </button>
                <button
                  class="md3-button primary btn-save-recipe"
                  ?disabled=${vm.busy || !vm.canSave}
                  @click=${() => this._emit('recipe-save-requested')}
                >
                  Save
                </button>
              `
            : html`
                <button
                  class="md3-button text btn-edit-recipe"
                  ?disabled=${vm.busy}
                  @click=${() => this._emit('recipe-edit-started', { recipeId: recipe.id })}
                >
                  <svg viewBox="0 0 24 24" style="width:18px;height:18px;" aria-hidden="true">
                    <path fill="currentColor" d=${mdiPencil}></path>
                  </svg>
                  Rename &amp; edit
                </button>
                <button
                  class="md3-button text danger btn-delete-recipe"
                  ?disabled=${vm.busy}
                  @click=${() =>
                    this._emit('recipe-delete-requested', {
                      recipeId: recipe.id,
                      name: recipe.name,
                    })}
                >
                  <svg viewBox="0 0 24 24" style="width:18px;height:18px;" aria-hidden="true">
                    <path fill="currentColor" d=${mdiDelete}></path>
                  </svg>
                  Delete
                </button>
              `}
        </div>
      </div>
    `;
  }

  private _renderField(field: RecipeFieldVM, editing: boolean, busy: boolean): TemplateResult {
    return html`
      <span class="field-label ${field.changed ? 'changed' : ''}">${field.label}</span>
      <span class="field-value" data-field=${field.field}>
        ${editing ? this._renderInput(field, busy) : this._renderStatic(field)}
        <span class="field-unit">${field.unit ?? ''}</span>
      </span>
    `;
  }

  private _renderStatic(field: RecipeFieldVM): TemplateResult {
    if (field.type === 'boolean') {
      return html`<span class="field-static">${field.value ? 'On' : 'Off'}</span>`;
    }
    return html`<span class="field-static">${field.value ?? '—'}</span>`;
  }

  private _renderInput(field: RecipeFieldVM, busy: boolean): TemplateResult {
    if (field.type === 'boolean') {
      return html`
        <input
          type="checkbox"
          .checked=${field.value === true}
          ?disabled=${busy}
          @change=${(e: Event) =>
            this._emit('recipe-value-changed', {
              field: field.field,
              value: (e.target as HTMLInputElement).checked,
            })}
        />
      `;
    }
    if (field.type === 'text') {
      return html`
        <input
          class="md3-input"
          type="text"
          .value=${String(field.value ?? '')}
          ?disabled=${busy}
          @input=${(e: Event) =>
            this._emit('recipe-value-changed', {
              field: field.field,
              value: (e.target as HTMLInputElement).value,
            })}
        />
      `;
    }
    return html`
      <input
        class="md3-input"
        type="number"
        step="any"
        .value=${field.value === null || field.value === undefined ? '' : String(field.value)}
        ?disabled=${busy}
        @input=${(e: Event) => {
          const raw = (e.target as HTMLInputElement).value;
          // An emptied number field is the nullable fields' "unset", not 0 —
          // a pore EC band of zero is a real setpoint and would be a lie here.
          this._emit('recipe-value-changed', {
            field: field.field,
            value: raw === '' ? null : Number(raw),
          });
        }}
      />
    `;
  }

  // ─── Delete confirmation ───────────────────────────────────────────────────

  private _renderDeleteConfirm(confirm: DeleteConfirmVM, busy: boolean): TemplateResult {
    return html`
      <div class="detail-card confirm" data-delete-confirm>
        <h3 style="margin:0 0 8px;">Delete "${confirm.name}"?</h3>
        ${confirm.referencingPrograms.length > 0
          ? html`
              <p style="margin:0 0 8px;" data-referencing-programs>
                ${confirm.referencingPrograms.length === 1
                  ? html`The program <strong>${confirm.referencingPrograms[0]}</strong> uses this
                      recipe.`
                  : html`These programs use this recipe:
                      <strong>${confirm.referencingPrograms.join(', ')}</strong>.`}
                Their slots will hold instead of watering, and nothing else changes.
              </p>
            `
          : nothing}
        <p style="margin:0;opacity:0.7;">
          Growspaces it was already applied to keep the settings it gave them. This cannot be
          undone.
        </p>
        <div class="button-group" style="margin-top:16px;">
          <button
            class="md3-button text btn-delete-cancel"
            ?disabled=${busy}
            @click=${() => this._emit('recipe-delete-cancelled')}
          >
            Cancel
          </button>
          <button
            class="md3-button primary danger btn-delete-confirm"
            ?disabled=${busy}
            @click=${() => this._emit('recipe-delete-confirmed')}
          >
            Delete
          </button>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'irrigation-recipe-library': IrrigationRecipeLibrary;
  }
}
