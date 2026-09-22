/**
 * Program Library Dialog (ADR-0019)
 *
 * The standalone [[Irrigation Program]] editor's host: it owns the
 * ProgramLibrarySM, projects it through the Program Library ViewModel, and runs
 * the two mutations the editor can cause — saving a plan and deleting one.
 *
 * It takes **no growspace**, exactly as the recipe library editor beside it
 * does and for the same reason: a program is a plan that exists whether or not
 * any tent follows it. Binding one to a growspace is the irrigation dialog's
 * Program tab.
 *
 * Both libraries ride every growspace payload, so this reads `irrigationPrograms$`
 * and `irrigationRecipes$` rather than self-fetching on open — the data is
 * already there before the dialog is. It needs both: a slot stores a recipe id
 * and nothing else, so without the recipe library a cell could only show an
 * opaque identifier.
 *
 * Effects run from `updated()` on entering an in-flight status, the pattern the
 * recipe library editor uses — the click handlers stay synchronous and only
 * dispatch an intent, so a rejection can neither leak nor strand the in-flight
 * flag (ADR-0015).
 */

import { LitElement, css, html, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { StoreController } from '@nanostores/lit';
import { atom } from 'nanostores';
import { mdiCalendarClock } from '@mdi/js';
import {
  createInitialSM,
  transition,
  type ProgramDraft,
  type ProgramLibraryEvent,
  type ProgramLibrarySM,
} from '../../../dialogs/program-library-sm';
import {
  irrigationPrograms$,
  irrigationRecipes$,
  removeIrrigationProgram,
  saveIrrigationProgram,
} from '../../../slices/irrigation';
import { createProgramLibraryViewModel } from '../viewmodels/program-library.viewmodel';
import { dialogStyles } from '../../../styles/dialog.styles';
import '../../shared/ui/gs-dialog';
import '../components/irrigation-program-library';

@customElement('program-library-dialog')
export class ProgramLibraryDialog extends LitElement {
  @property({ type: Boolean }) open = false;

  @state() private _sm: ProgramLibrarySM = createInitialSM();
  private _prevSm: ProgramLibrarySM | undefined;

  /**
   * The SM as an atom, so the ViewModel can be a `computed` over it and the two
   * global libraries exactly as every other ADR-0019 surface is.
   */
  private readonly _sm$ = atom<ProgramLibrarySM>(this._sm);
  private readonly _vm$ = createProgramLibraryViewModel(
    this._sm$,
    irrigationPrograms$,
    irrigationRecipes$
  );
  private _vm = new StoreController(this, this._vm$);

  static styles = [
    dialogStyles,
    css`
      /* dialogStyles has no toast; matching the recipe library dialog's. */
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

  private _dispatch = (event: ProgramLibraryEvent): void => {
    this._sm = transition(this._sm, event);
    this._sm$.set(this._sm);
  };

  private _runEffectIfNeeded(prev: ProgramLibrarySM | undefined): void {
    const status = this._sm.status;
    if (status.kind === prev?.status.kind) return;
    if (status.kind === 'applying') this._runSave(status.draft);
    if (status.kind === 'deleting') this._runDelete(status.id);
  }

  private async _runSave(draft: ProgramDraft): Promise<void> {
    try {
      // The whole plan, because the command replaces the whole slot list — a
      // cell the grower emptied is gone precisely because it is not sent.
      const saved = await saveIrrigationProgram({
        name: draft.name.trim(),
        slots: draft.slots,
        ...(draft.id ? { programId: draft.id } : {}),
      });
      this._dispatch({ type: 'SaveResolved', id: saved.id });
    } catch (err) {
      this._dispatch({ type: 'SaveFailed', message: messageOf(err) });
    }
  }

  private async _runDelete(programId: string): Promise<void> {
    try {
      await removeIrrigationProgram(programId);
      this._dispatch({ type: 'DeleteResolved' });
    } catch (err) {
      this._dispatch({ type: 'DeleteFailed', message: messageOf(err) });
    }
  }

  // ─── Intent translation ────────────────────────────────────────────────────

  private _onSelected = (e: CustomEvent<{ programId: string }>) =>
    this._dispatch({ type: 'ProgramSelected', id: e.detail.programId });

  private _onBackToList = () => this._dispatch({ type: 'BackToList' });

  private _onCreateStarted = () => this._dispatch({ type: 'CreateStarted' });

  private _onEditStarted = (e: CustomEvent<{ programId: string }>) => {
    const program = irrigationPrograms$.get().find((p) => p.id === e.detail.programId);
    if (program) this._dispatch({ type: 'EditStarted', program });
  };

  private _onEditCancelled = () => this._dispatch({ type: 'EditCancelled' });

  private _onNameChanged = (e: CustomEvent<{ name: string }>) =>
    this._dispatch({ type: 'NameChanged', name: e.detail.name });

  private _onSlotChanged = (
    e: CustomEvent<{ stage: string; week: number; recipeId: string | null }>
  ) =>
    this._dispatch({
      type: 'SlotChanged',
      stage: e.detail.stage,
      week: e.detail.week,
      recipeId: e.detail.recipeId,
    });

  private _onStageOpened = (e: CustomEvent<{ stage: string }>) =>
    this._dispatch({ type: 'StageOpened', stage: e.detail.stage });

  private _onStageClosed = (e: CustomEvent<{ stage: string }>) =>
    this._dispatch({ type: 'StageClosed', stage: e.detail.stage });

  private _onWeekAdded = () => this._dispatch({ type: 'WeekAdded' });

  private _onSaveRequested = () => this._dispatch({ type: 'SaveRequested' });

  private _onDeleteRequested = (e: CustomEvent<{ programId: string; name: string }>) =>
    this._dispatch({ type: 'DeleteRequested', id: e.detail.programId, name: e.detail.name });

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
        heading="Irrigation Programs"
        subtitle="Plan a whole run, week by week"
        .iconPath=${mdiCalendarClock}
        containerStyle="min-height: 400px;"
        @close=${this._close}
      >
        <div class="glass-dialog-container">
          <irrigation-program-library
            .vm=${vm}
            @program-selected=${this._onSelected}
            @program-back-to-list=${this._onBackToList}
            @program-create-started=${this._onCreateStarted}
            @program-edit-started=${this._onEditStarted}
            @program-edit-cancelled=${this._onEditCancelled}
            @program-name-changed=${this._onNameChanged}
            @program-slot-changed=${this._onSlotChanged}
            @program-stage-opened=${this._onStageOpened}
            @program-stage-closed=${this._onStageClosed}
            @program-week-added=${this._onWeekAdded}
            @program-save-requested=${this._onSaveRequested}
            @program-delete-requested=${this._onDeleteRequested}
            @program-delete-confirmed=${this._onDeleteConfirmed}
            @program-delete-cancelled=${this._onDeleteCancelled}
          ></irrigation-program-library>
          ${vm.toast ? html`<div class="toast">${vm.toast}</div>` : nothing}
        </div>
      </gs-dialog>
    `;
  }
}

/**
 * A WSError's own message, which for a refused plan names the offending slot.
 * Anything else degrades to its string form rather than to a generic "failed",
 * which would throw away the only useful part.
 */
function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

declare global {
  interface HTMLElementTagNameMap {
    'program-library-dialog': ProgramLibraryDialog;
  }
}
