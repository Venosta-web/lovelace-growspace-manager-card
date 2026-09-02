/**
 * Irrigation Program Tab Component (ADR-0019)
 *
 * The dumb presentational element for the Irrigation Dialog's Program tab.
 * `@property .vm: ProgramTabViewModel` in, semantic Tab Intents out, no
 * `@state()` of its own — the picked program and the pending confirmation live
 * in the DialogStateMachine and arrive projected through the VM.
 *
 * The tab reads top-down as the question a grower actually has: what is this
 * tent following, where in that plan is it, what happens next, and who decides
 * — them or the program. The status block comes first because on most days it
 * is the only line that matters, and on the days it is holding it is the only
 * line that explains why nothing happened.
 *
 * Tab Intents (the Dialog Shell owns their translation to SM events):
 *   - `program-selected`            detail: { programId: string | null }
 *   - `program-assign-requested`    detail: { programId: string | null }
 *   - `program-recipe-apply-requested` detail: { recipeId }
 *   - `program-auto-advance-changed`   detail: { enabled }
 *   - `program-confirm-accepted`    (no detail)
 *   - `program-confirm-cancelled`   (no detail)
 */

import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { dialogStyles } from '../../../styles/dialog.styles';
import '../../shared/ui/gs-help-tooltip';
import { PROGRAM } from '../help-copy';
import type { ProgramTabViewModel } from '../viewmodels/program-tab.viewmodel';

/** The unbind option's value. The empty string is not a program id. */
const UNBOUND = '';

@customElement('irrigation-program-tab')
export class IrrigationProgramTab extends LitElement {
  @property({ attribute: false }) vm!: ProgramTabViewModel;

  static styles = [
    dialogStyles,
    css`
      :host {
        display: block;
      }
      .status-title {
        font-size: var(--font-size-md, 15px);
        font-weight: 600;
        margin: 0 0 4px;
      }
      .status-detail {
        margin: 0;
        opacity: 0.75;
        font-size: var(--font-size-sm);
      }
      /* One accent per answer, so the three a grower meets most — running,
         waiting on them, holding — are told apart before the words are read. */
      .status.up_to_date {
        border-left: 3px solid var(--gm-primary-color, #4caf50);
      }
      .status.available,
      .status.due {
        border-left: 3px solid var(--gm-info-color, #2196f3);
      }
      .status.held {
        border-left: 3px solid var(--gm-warning-color, #ff9800);
      }
      .status {
        padding-left: 12px;
      }
      .position-grid {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 6px 14px;
        font-size: var(--font-size-sm);
        margin-top: 12px;
      }
      .position-label {
        opacity: 0.55;
        white-space: nowrap;
      }
      .position-value {
        font-weight: 500;
      }
      .position-value.empty {
        font-weight: 400;
        opacity: 0.6;
      }
      .position-value.missing {
        color: var(--gm-warning-color, #ff9800);
      }
      .drift-fields {
        margin: 8px 0 0;
        font-size: var(--font-size-sm);
        opacity: 0.75;
      }
      .toggle-row {
        display: flex;
        align-items: flex-start;
        gap: 10px;
      }
      .toggle-row input {
        margin-top: 3px;
      }
      .toggle-copy {
        flex: 1;
        min-width: 0;
      }
      .toggle-note {
        margin: 4px 0 0;
        font-size: 11.5px;
        opacity: 0.55;
      }
      .confirm {
        border-color: var(--gm-warning-color, #ff9800);
      }
      select.md3-input {
        width: 100%;
      }
    `,
  ];

  private _emit(type: string, detail?: unknown): void {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }

  render(): TemplateResult {
    const vm = this.vm;
    if (!vm) return html``;
    if (vm.confirm) return this._renderConfirm(vm);
    return html`
      ${this._renderStatus(vm)} ${this._renderAssign(vm)} ${this._renderAutoAdvance(vm)}
    `;
  }

  // ─── Status: the plan, the week, and what is being done about it ───────────

  private _renderStatus(vm: ProgramTabViewModel): TemplateResult {
    if (vm.assignedProgramId === null) {
      return html`
        <div class="detail-card">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
            <h3 style="margin:0;">Irrigation Program</h3>
            <gs-help-tooltip
              .content=${this._renderSectionExplainer()}
              label=${PROGRAM.section.label}
            ></gs-help-tooltip>
          </div>
          <p style="margin:0;opacity:0.7;" data-unassigned>
            This growspace follows no program. Assign one below and it will report which week of the
            plan it is in and which recipe that week calls for.
          </p>
        </div>
      `;
    }
    const progression = vm.progression;
    return html`
      <div class="detail-card">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
          <h3 style="margin:0;">${vm.assignedName ?? 'Program no longer in the library'}</h3>
          <gs-help-tooltip
            .content=${this._renderSectionExplainer()}
            label=${PROGRAM.section.label}
          ></gs-help-tooltip>
        </div>

        ${progression
          ? html`
              <div
                class="status ${progression.state ?? 'unknown'}"
                data-progression-state=${progression.state ?? 'unknown'}
                data-progression-hold=${progression.hold ?? ''}
              >
                <p class="status-title" data-progression-title>${progression.title}</p>
                <p class="status-detail" data-progression-detail>${progression.detail}</p>
              </div>
            `
          : nothing}
        ${this._renderDrift(vm)} ${this._renderPosition(vm)} ${this._renderAvailable(vm)}
      </div>
    `;
  }

  private _renderPosition(vm: ProgramTabViewModel): TemplateResult | typeof nothing {
    const position = vm.position;
    if (!position) return nothing;
    return html`
      <div class="position-grid">
        <span class="position-label">This week</span>
        <span class="position-value" data-current-week>
          ${position.stageLabel === null
            ? 'No live plants, so no week of the plan'
            : `${position.stageLabel} week ${position.week}`}
        </span>

        <span class="position-label">Calls for</span>
        ${position.missing
          ? html`<span class="position-value missing" data-current-recipe
              >Recipe deleted from the library</span
            >`
          : html`<span
              class="position-value ${position.recipeName === null ? 'empty' : ''}"
              data-current-recipe
              >${position.recipeName ?? 'Nothing — the plan leaves this week alone'}</span
            >`}

        <span class="position-label"
          >${vm.next?.isNextWeek ? 'Next week' : 'Next in the plan'}</span
        >
        ${vm.next
          ? html`<span class="position-value" data-next-slot>
              ${vm.next.stageLabel} week ${vm.next.week} —
              ${vm.next.recipeName ?? 'a recipe that has been deleted'}
            </span>`
          : html`<span class="position-value empty" data-next-slot
              >Nothing — this is the end of the plan</span
            >`}
      </div>
    `;
  }

  /**
   * The drift annotation. It never states the verdict — the status block above
   * already carries the backend's — it only names what the card can see differ,
   * and says nothing rather than guessing when it can see nothing.
   */
  private _renderDrift(vm: ProgramTabViewModel): TemplateResult | typeof nothing {
    const drift = vm.drift;
    if (!drift) return nothing;
    return html`
      <p class="drift-fields" data-drift-fields>
        ${drift.fields.length > 0
          ? html`Changed since
              ${drift.appliedRecipeName ? html`“${drift.appliedRecipeName}”` : 'the last recipe'}
              was applied: <strong>${drift.fields.join(', ')}</strong>.`
          : html`The settings no longer match
            ${drift.appliedRecipeName
              ? html`“${drift.appliedRecipeName}”`
              : 'the recipe last applied'}.`}
        Applying this week’s recipe replaces them.
        <gs-help-tooltip
          content=${PROGRAM.drift.content}
          label=${PROGRAM.drift.label}
        ></gs-help-tooltip>
      </p>
    `;
  }

  private _renderAvailable(vm: ProgramTabViewModel): TemplateResult | typeof nothing {
    const available = vm.available;
    if (!available) return nothing;
    return html`
      <div class="button-group" style="margin-top:14px;">
        <button
          class="md3-button primary btn-apply-program-recipe"
          ?disabled=${vm.busy}
          @click=${() =>
            this._emit('program-recipe-apply-requested', { recipeId: available.recipeId })}
        >
          Apply “${available.name}”
        </button>
      </div>
    `;
  }

  // ─── Assign ────────────────────────────────────────────────────────────────

  private _renderAssign(vm: ProgramTabViewModel): TemplateResult {
    return html`
      <div class="detail-card">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
          <h3 style="margin:0;">Follow a Program</h3>
          <gs-help-tooltip
            content=${PROGRAM.assign.content}
            label=${PROGRAM.assign.label}
          ></gs-help-tooltip>
        </div>
        ${vm.options.length === 0
          ? html`<p style="margin:0;opacity:0.7;" data-no-programs>
              No programs saved yet. Build one from the header menu’s Irrigation Programs entry,
              then come back to assign it.
            </p>`
          : html`
              <div class="md3-input-group">
                <label class="md3-label">Program</label>
                <select
                  class="md3-input program-select"
                  ?disabled=${vm.busy}
                  @change=${(e: Event) => {
                    const value = (e.target as HTMLSelectElement).value;
                    this._emit('program-selected', {
                      programId: value === UNBOUND ? null : value,
                    });
                  }}
                >
                  <option value=${UNBOUND} ?selected=${vm.selectedProgramId === null}>
                    No program
                  </option>
                  ${vm.options.map(
                    (option) => html`
                      <option value=${option.id} ?selected=${option.id === vm.selectedProgramId}>
                        ${option.name}${option.spanLabel ? ` · ${option.spanLabel}` : ''}
                      </option>
                    `
                  )}
                </select>
              </div>
              <div class="button-group" style="margin-top:12px;">
                <button
                  class="md3-button primary btn-assign-program"
                  ?disabled=${vm.busy || !vm.canAssign}
                  @click=${() =>
                    this._emit('program-assign-requested', { programId: vm.selectedProgramId })}
                >
                  ${vm.selectedProgramId === null ? 'Stop following' : 'Assign'}
                </button>
              </div>
            `}
      </div>
    `;
  }

  // ─── Auto-advance ──────────────────────────────────────────────────────────

  private _renderAutoAdvance(vm: ProgramTabViewModel): TemplateResult {
    return html`
      <div class="detail-card">
        <div class="toggle-row">
          <input
            type="checkbox"
            class="program-auto-advance"
            .checked=${vm.autoAdvance}
            ?disabled=${vm.busy}
            @change=${(e: Event) =>
              this._emit('program-auto-advance-changed', {
                enabled: (e.target as HTMLInputElement).checked,
              })}
          />
          <div class="toggle-copy">
            <div style="display:flex;align-items:center;gap:8px;">
              <strong>Advance automatically</strong>
              <gs-help-tooltip
                content=${PROGRAM.autoAdvance.content}
                label=${PROGRAM.autoAdvance.label}
              ></gs-help-tooltip>
            </div>
            <p class="toggle-note">
              Off by default. With it off this growspace tells you when a new week’s recipe is ready
              and waits for you.
            </p>
          </div>
        </div>
      </div>
    `;
  }

  // ─── Confirmation ──────────────────────────────────────────────────────────

  private _renderConfirm(vm: ProgramTabViewModel): TemplateResult {
    const confirm = vm.confirm!;
    return html`
      <div class="detail-card confirm" data-program-confirm=${confirm.kind}>
        <h3 style="margin:0 0 8px;">${confirm.title}</h3>
        <p style="margin:0;opacity:0.8;" data-confirm-message>${confirm.message}</p>
        <div class="button-group" style="margin-top:16px;">
          <button
            class="md3-button text btn-confirm-cancel"
            ?disabled=${vm.busy}
            @click=${() => this._emit('program-confirm-cancelled')}
          >
            Cancel
          </button>
          <button
            class="md3-button primary btn-confirm-accept"
            ?disabled=${vm.busy}
            @click=${() => this._emit('program-confirm-accepted')}
          >
            ${confirm.confirmLabel}
          </button>
        </div>
      </div>
    `;
  }

  private _renderSectionExplainer(): TemplateResult {
    return html`
      <p style="margin:0 0 8px;">${PROGRAM.section.lead}</p>
      <p style="margin:0;">${PROGRAM.section.body}</p>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'irrigation-program-tab': IrrigationProgramTab;
  }
}
