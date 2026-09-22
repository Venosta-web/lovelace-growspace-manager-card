/**
 * Irrigation Program Library Component (ADR-0019)
 *
 * The dumb presentational element for the standalone [[Irrigation Program]]
 * editor. `@property .vm: ProgramLibraryViewModel` in, semantic Library Intents
 * out, no `@state()` of its own — the selection, the draft plan and the pending
 * delete all live in the ProgramLibrarySM and arrive projected.
 *
 * Two screens, list and detail, mirroring the recipe library next door.
 *
 * The detail is a **grid**, and that is the design rather than a layout choice:
 * every `(stage, week)` position gets a cell whether or not the plan fills it,
 * so a week with no instruction reads as an empty cell rather than as a row
 * that is simply not there. A grower has to be able to see that week 4 is
 * empty, because that emptiness is what makes the tent hold.
 *
 * Library Intents (the container owns their translation to SM events):
 *   - `program-selected`         detail: { programId }
 *   - `program-back-to-list`     (no detail)
 *   - `program-create-started`   (no detail)
 *   - `program-edit-started`     detail: { programId }
 *   - `program-edit-cancelled`   (no detail)
 *   - `program-name-changed`     detail: { name }
 *   - `program-slot-changed`     detail: { stage, week, recipeId | null }
 *   - `program-stage-opened`     detail: { stage }
 *   - `program-stage-closed`     detail: { stage }
 *   - `program-week-added`       (no detail)
 *   - `program-save-requested`   (no detail)
 *   - `program-delete-requested` detail: { programId, name }
 *   - `program-delete-confirmed` (no detail)
 *   - `program-delete-cancelled` (no detail)
 */

import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { mdiArrowLeft, mdiClose, mdiDelete, mdiPencil, mdiPlus } from '@mdi/js';
import { dialogStyles } from '../../../styles/dialog.styles';
import type {
  ProgramCellVM,
  ProgramGridVM,
  ProgramLibraryViewModel,
  ProgramRowVM,
} from '../viewmodels/program-library.viewmodel';

@customElement('irrigation-program-library')
export class IrrigationProgramLibrary extends LitElement {
  @property({ attribute: false }) vm!: ProgramLibraryViewModel;

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
      /* The grid is wider than the dialog on a phone; it scrolls on its own
         rather than making the whole dialog scroll sideways. */
      .grid-scroll {
        overflow-x: auto;
        margin: 0 -4px;
        padding: 0 4px;
      }
      table.grid {
        border-collapse: separate;
        border-spacing: 6px;
        width: 100%;
      }
      table.grid th {
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--secondary-text-color);
        text-align: left;
        white-space: nowrap;
      }
      th.week-head,
      td.week-cell {
        width: 1%;
        white-space: nowrap;
        font-size: 0.75rem;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
      }
      .stage-head {
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .close-stage {
        display: inline-flex;
        padding: 0;
        border: none;
        background: none;
        color: inherit;
        cursor: pointer;
        opacity: 0.6;
      }
      .close-stage:hover {
        opacity: 1;
      }
      td.slot {
        padding: 0;
      }
      .slot-select {
        width: 100%;
        min-width: 11ch;
        padding: 7px 8px;
        border-radius: var(--border-radius-sm, 8px);
        border: 1px solid rgba(255, 255, 255, 0.12);
        background: rgba(255, 255, 255, 0.04);
        color: inherit;
        font: inherit;
        font-size: 0.8rem;
      }
      /* An empty cell is drawn as an empty cell — dashed and unfilled — so a
         gap in the plan is visible at a glance rather than inferred. */
      .slot-select.empty {
        border-style: dashed;
        background: none;
        color: var(--secondary-text-color);
      }
      .slot-select.missing {
        border-color: var(--gm-warning-color, #ff9800);
        color: var(--gm-warning-color, #ff9800);
      }
      .slot-static {
        display: block;
        padding: 7px 8px;
        border-radius: var(--border-radius-sm, 8px);
        border: 1px solid rgba(255, 255, 255, 0.12);
        font-size: 0.8rem;
      }
      .slot-static.empty {
        border-style: dashed;
        border-color: rgba(255, 255, 255, 0.1);
        color: var(--secondary-text-color);
      }
      .slot-static.missing {
        border-color: var(--gm-warning-color, #ff9800);
        color: var(--gm-warning-color, #ff9800);
      }
      .stage-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 12px;
      }
      .chip {
        padding: 4px 10px;
        border-radius: var(--border-radius-full, 9999px);
        border: 1px dashed rgba(255, 255, 255, 0.2);
        background: none;
        color: var(--secondary-text-color);
        font: inherit;
        font-size: 0.75rem;
        cursor: pointer;
      }
      .chip:hover {
        color: inherit;
        border-color: rgba(255, 255, 255, 0.4);
      }
      .legend {
        font-size: 0.75rem;
        color: var(--secondary-text-color);
        margin: 12px 0 0;
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
    if (vm.deleteConfirm) return this._renderDeleteConfirm(vm);
    // A program being created has no stored counterpart to select, so the
    // detail is reached through the draft rather than through `selected`.
    if (vm.creating || vm.selected) return this._renderDetail(vm);
    return this._renderList(vm);
  }

  // ─── List ──────────────────────────────────────────────────────────────────

  private _renderList(vm: ProgramLibraryViewModel): TemplateResult {
    return html`
      ${vm.rows.length === 0
        ? html`
            <div class="detail-card" data-empty>
              <p style="margin:0;opacity:0.7;">
                No programs yet. A program plans a whole run — which recipe each week of each stage
                should use — so a growspace can be carried week to week instead of re-tuned by hand.
              </p>
            </div>
          `
        : html`<div class="list">${vm.rows.map((row) => this._renderRow(row))}</div>`}
      <div class="button-group" style="margin-top:16px;">
        <button
          class="md3-button primary btn-new-program"
          ?disabled=${vm.busy}
          @click=${() => this._emit('program-create-started')}
        >
          <svg viewBox="0 0 24 24" style="width:18px;height:18px;" aria-hidden="true">
            <path fill="currentColor" d=${mdiPlus}></path>
          </svg>
          New program
        </button>
      </div>
    `;
  }

  private _renderRow(row: ProgramRowVM): TemplateResult {
    const weeks = `${row.slotCount} ${row.slotCount === 1 ? 'week' : 'weeks'} planned`;
    const meta = [row.spanLabel, weeks, row.createdAtLabel].filter((p) => p !== null).join(' · ');
    return html`
      <button
        type="button"
        class="list-item ${row.selected ? 'selected' : ''}"
        data-program-id=${row.id}
        @click=${() => this._emit('program-selected', { programId: row.id })}
      >
        <div class="item-body">
          <div class="item-name">${row.name}</div>
          <div class="item-meta">${meta}</div>
        </div>
      </button>
    `;
  }

  // ─── Detail ────────────────────────────────────────────────────────────────

  private _renderDetail(vm: ProgramLibraryViewModel): TemplateResult {
    const stored = vm.selected;
    return html`
      <div class="detail-card">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
          <button
            type="button"
            class="md3-button text btn-back"
            ?disabled=${vm.busy}
            @click=${() =>
              this._emit(vm.editing ? 'program-edit-cancelled' : 'program-back-to-list')}
          >
            <svg viewBox="0 0 24 24" style="width:18px;height:18px;" aria-hidden="true">
              <path fill="currentColor" d=${mdiArrowLeft}></path>
            </svg>
            ${vm.editing ? 'Cancel' : 'Library'}
          </button>
        </div>

        ${vm.editing
          ? html`
              <div class="md3-input-group">
                <label class="md3-label">Name</label>
                <input
                  class="md3-input program-name-input"
                  type="text"
                  .value=${vm.nameDraft}
                  placeholder="e.g. Full run — coco"
                  ?disabled=${vm.busy}
                  @input=${(e: Event) =>
                    this._emit('program-name-changed', {
                      name: (e.target as HTMLInputElement).value,
                    })}
                />
              </div>
            `
          : html`<h3 style="margin:0 0 10px;" data-program-name>${stored?.name}</h3>`}
        ${vm.grid ? this._renderGrid(vm, vm.grid) : nothing}
        ${vm.errorMessage ? html`<p class="error" data-save-error>${vm.errorMessage}</p>` : nothing}

        <div class="button-group" style="margin-top:16px;">
          ${vm.editing
            ? html`
                <button
                  class="md3-button primary btn-save-program"
                  ?disabled=${vm.busy || !vm.canSave}
                  @click=${() => this._emit('program-save-requested')}
                >
                  Save
                </button>
              `
            : html`
                <button
                  class="md3-button text btn-edit-program"
                  ?disabled=${vm.busy || !stored}
                  @click=${() =>
                    stored && this._emit('program-edit-started', { programId: stored.id })}
                >
                  <svg viewBox="0 0 24 24" style="width:18px;height:18px;" aria-hidden="true">
                    <path fill="currentColor" d=${mdiPencil}></path>
                  </svg>
                  Edit plan
                </button>
                <button
                  class="md3-button text danger btn-delete-program"
                  ?disabled=${vm.busy || !stored}
                  @click=${() =>
                    stored &&
                    this._emit('program-delete-requested', {
                      programId: stored.id,
                      name: stored.name,
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

  // ─── The plan grid ─────────────────────────────────────────────────────────

  private _renderGrid(vm: ProgramLibraryViewModel, grid: ProgramGridVM): TemplateResult {
    if (grid.columns.length === 0) {
      return html`
        <p class="legend" data-no-stages>
          This plan covers no stage yet. Add one below to start laying out its weeks.
        </p>
        ${this._renderStageChips(vm)}
      `;
    }
    return html`
      <div class="grid-scroll">
        <table class="grid" data-program-grid>
          <thead>
            <tr>
              <th class="week-head"></th>
              ${grid.columns.map(
                (column) => html`
                  <th data-stage=${column.stage}>
                    <span class="stage-head">
                      ${column.label}
                      ${vm.editing && column.closable
                        ? html`
                            <button
                              type="button"
                              class="close-stage"
                              title="Remove the ${column.label} column"
                              aria-label="Remove the ${column.label} column"
                              @click=${() =>
                                this._emit('program-stage-closed', { stage: column.stage })}
                            >
                              <svg
                                viewBox="0 0 24 24"
                                style="width:14px;height:14px;"
                                aria-hidden="true"
                              >
                                <path fill="currentColor" d=${mdiClose}></path>
                              </svg>
                            </button>
                          `
                        : nothing}
                    </span>
                  </th>
                `
              )}
            </tr>
          </thead>
          <tbody>
            ${grid.weeks.map(
              (week, rowIndex) => html`
                <tr>
                  <td class="week-cell">Wk ${week}</td>
                  ${grid.rows[rowIndex].map((cell) => this._renderCell(vm, cell))}
                </tr>
              `
            )}
          </tbody>
        </table>
      </div>
      ${vm.editing
        ? html`
            <div class="button-group" style="margin-top:10px;">
              <button
                class="md3-button text btn-add-week"
                ?disabled=${vm.busy}
                @click=${() => this._emit('program-week-added')}
              >
                Add a week
              </button>
            </div>
            ${this._renderStageChips(vm)}
          `
        : nothing}
      <p class="legend">
        An empty cell is not an oversight — the growspace holds that week and changes nothing.
      </p>
    `;
  }

  private _renderStageChips(vm: ProgramLibraryViewModel): TemplateResult | typeof nothing {
    if (!vm.editing || vm.openableStages.length === 0) return nothing;
    return html`
      <div class="stage-chips">
        ${vm.openableStages.map(
          (stage) => html`
            <button
              type="button"
              class="chip"
              data-open-stage=${stage.stage}
              ?disabled=${vm.busy}
              @click=${() => this._emit('program-stage-opened', { stage: stage.stage })}
            >
              + ${stage.label}
            </button>
          `
        )}
      </div>
    `;
  }

  private _renderCell(vm: ProgramLibraryViewModel, cell: ProgramCellVM): TemplateResult {
    const classes = `${cell.recipeId === null ? 'empty' : ''} ${cell.missing ? 'missing' : ''}`;
    if (!vm.editing) {
      const label = cell.missing ? 'Recipe deleted' : (cell.recipeName ?? '—');
      return html`
        <td class="slot" data-stage=${cell.stage} data-week=${cell.week}>
          <span class="slot-static ${classes}" data-empty=${cell.recipeId === null}>${label}</span>
        </td>
      `;
    }
    return html`
      <td class="slot" data-stage=${cell.stage} data-week=${cell.week}>
        <select
          class="slot-select ${classes}"
          ?disabled=${vm.busy}
          @change=${(e: Event) => {
            const value = (e.target as HTMLSelectElement).value;
            this._emit('program-slot-changed', {
              stage: cell.stage,
              week: cell.week,
              recipeId: value === '' ? null : value,
            });
          }}
        >
          <option value="" ?selected=${cell.recipeId === null}>—</option>
          ${cell.missing
            ? html`<option value=${cell.recipeId ?? ''} selected>Recipe deleted</option>`
            : nothing}
          ${vm.recipeOptions.map(
            (option) => html`
              <option value=${option.id} ?selected=${option.id === cell.recipeId}>
                ${option.name}
              </option>
            `
          )}
        </select>
      </td>
    `;
  }

  // ─── Delete confirmation ───────────────────────────────────────────────────

  private _renderDeleteConfirm(vm: ProgramLibraryViewModel): TemplateResult {
    const confirm = vm.deleteConfirm!;
    return html`
      <div class="detail-card confirm" data-delete-confirm>
        <h3 style="margin:0 0 8px;">Delete "${confirm.name}"?</h3>
        <p style="margin:0;opacity:0.7;">
          Growspaces following it keep the settings it already gave them and simply report no plan.
          The recipes it used stay in the library. This cannot be undone.
        </p>
        <div class="button-group" style="margin-top:16px;">
          <button
            class="md3-button text btn-delete-cancel"
            ?disabled=${vm.busy}
            @click=${() => this._emit('program-delete-cancelled')}
          >
            Cancel
          </button>
          <button
            class="md3-button primary danger btn-delete-confirm"
            ?disabled=${vm.busy}
            @click=${() => this._emit('program-delete-confirmed')}
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
    'irrigation-program-library': IrrigationProgramLibrary;
  }
}
