import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { PropertyValues } from 'lit';
import { mdiFlagCheckered, mdiHelpCircleOutline, mdiPlus, mdiSprout } from '@mdi/js';

import { LAZY_CHUNKS, loadLazyChunk } from '../../../lib/lazy-chunk';
import { localize, localizeWithParams } from '../../../localize/localize';
import {
  getGrowRun,
  listGrowRuns,
  type GetGrowRunResult,
  type RunView,
} from '../../../slices/grow-run';
import type { RunSummary } from '../../../slices/grow-run/schema';
import '../../shared/ui/lazy-chunk-error';

/**
 * The Active Run chip (GSM#668, GSM#797 "UI placement").
 *
 * The main card carries no more of Grow Runs than this: the Active Run as one
 * compact chip beside the growspace name — `Run #4 · 61 days · 17 plants` —
 * or, without one, a `Start run` chip. Selecting an Active Run shows its
 * Participants and movement history.
 *
 * Starting is one small dialog, `growspace-run-start-dialog`, fetched as its
 * own chunk the first time it opens (GSM#670 made it large enough to earn
 * one: a start may name an earlier day and preview what it would claim).
 * Nothing is optimistic. The chip changes when the Active Run Sensor does.
 *
 * Completing starts from the Active Run's details (GSM#671), and opens the Run
 * Completion Preview in its own lazy chunk. It stays open after the sensor
 * reads `none`, so the grower sees the completed Run and its Pending metrics.
 *
 * A Completed Run waits to be finalized (GSM#673), often for weeks while its
 * harvest dries, and by then another Run may be Active. The chip asks for the
 * growspace's Runs whenever the Run Revision moves and, while one is still
 * Completed, offers `Finalize Run #3` beside itself; the dialog is a lazy chunk.
 *
 * An Active Run whose details show nothing recorded can also be discarded
 * (GSM#917), the undo of a start. The details offer it only then, and the
 * confirmation is its own lazy chunk; the backend still judges, and a
 * refusal lists the activity it found.
 */
@customElement('growspace-run-chip')
export class GrowspaceRunChip extends LitElement {
  @property({ attribute: false }) view: RunView | null = null;
  /** How many Plants stand in the growspace now: the Participants a start takes. */
  @property({ type: Number }) plantCount = 0;
  @property() language = 'en';
  /** Home Assistant's timezone, so "today" in the start dialog is the Run's. */
  @property() timeZone?: string;

  @state() private _open = false;
  @state() private _startLoaded = false;
  @state() private _startMissing = false;
  @state() private _detailsOpen = false;
  @state() private _details: GetGrowRunResult | null = null;
  @state() private _detailError: string | null = null;
  /** The completion dialog's chunk: not asked for, arriving, here, or missing. */
  @state() private _completion: 'closed' | 'loading' | 'ready' | 'missing' = 'closed';
  /** The oldest Completed Run, which the finalize chip offers. */
  @state() private _awaiting: RunSummary | null = null;
  @state() private _finalization: 'closed' | 'loading' | 'ready' | 'missing' = 'closed';
  /**
   * The Run the open finalization dialog is about. Kept apart from
   * `_awaiting`, which empties the moment the Run is finalized and the list
   * is read again: the dialog stays to show the frozen snapshot.
   */
  @state() private _finalizing: string | null = null;
  @state() private _discard: 'closed' | 'loading' | 'ready' | 'missing' = 'closed';
  /** The Active Run the open discard dialog is about, as its details read. */
  @state() private _discarding: { runId: string; number: number; revision: number } | null = null;
  /** The growspace and Run Revision the Run list was last asked for. */
  private _listed = '';

  static styles = css`
    .muted {
      color: var(--secondary-text-color);
    }

    :host {
      display: inline-flex;
      flex-wrap: wrap;
      gap: 6px;
      min-width: 0;
    }

    .chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      min-width: 0;
      max-width: 100%;
      min-height: 32px;
      padding: 4px 12px 4px 8px;
      border-radius: 16px;
      border: 1px solid var(--chip-outline, rgba(255, 255, 255, 0.12));
      background: var(--chip-fill, rgba(255, 255, 255, 0.05));
      color: var(--primary-text-color, #fff);
      font: inherit;
      font-size: 0.8125rem;
      font-weight: 500;
      cursor: pointer;
    }

    .chip.start {
      border-style: dashed;
      color: var(--secondary-text-color, rgba(255, 255, 255, 0.7));
    }

    .chip:focus-visible,
    button:focus-visible {
      outline: 2px solid var(--primary-color, #4caf50);
      outline-offset: 2px;
    }

    .chip span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    svg {
      width: 18px;
      height: 18px;
      flex-shrink: 0;
      fill: var(--cue, currentColor);
    }

    .active {
      --cue: var(--primary-color, #4caf50);
    }

    p {
      margin: 0;
    }

    .row {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 8px;
    }

    .row button {
      min-height: 36px;
      padding: 6px 16px;
      border-radius: 18px;
      border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.24));
      background: transparent;
      color: var(--primary-text-color);
      font: inherit;
      cursor: pointer;
    }

    .row button.primary {
      border-color: transparent;
      background: var(--primary-color, #4caf50);
      color: var(--text-primary-color, #fff);
    }

    button:disabled {
      cursor: default;
      opacity: 0.6;
    }

    .refusal {
      color: var(--error-color, #f44336);
    }
  `;

  private _t(key: string, params: Record<string, string | number> = {}): string {
    return Object.keys(params).length
      ? localizeWithParams(`grow_run.${key}`, params, this.language)
      : localize(`grow_run.${key}`, '', '', this.language);
  }

  private _movementKind(kind: string): string {
    const known = ['entry', 'removal', 'move', 're_entry', 'harvest', 'transplant'];
    return known.includes(kind) ? this._t(`movement_${kind}`) : kind.replaceAll('_', ' ');
  }

  private async _openDetails(): Promise<void> {
    if (!this.view) return;
    if (this.view.state === 'active' && this.view.runId) {
      this._detailsOpen = true;
      this._details = null;
      this._detailError = null;
      try {
        this._details = await getGrowRun(this.view.growspaceId, this.view.runId);
      } catch (error) {
        this._detailError = String(error);
      }
      return;
    }
    this.dispatchEvent(
      new CustomEvent('hass-more-info', {
        detail: { entityId: this.view.entityId },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _renderDetails() {
    const run = this._details?.outcome === 'found' ? this._details.run : null;
    return html`
      <ha-dialog
        open
        width="medium"
        .headerTitle=${this._t('details_title', { number: this.view?.sequenceNumber ?? '' })}
        @closed=${() => (this._detailsOpen = false)}
      >
        ${this._detailError
          ? html`<p class="refusal" role="alert">${this._detailError}</p>`
          : this._details?.outcome === 'not_found'
            ? html`<p>${this._t('details_missing')}</p>`
            : !run
              ? html`<p>${this._t('details_loading')}</p>`
              : html`
                  ${run.metrics_state === 'live'
                    ? html`<p class="muted" data-testid="run-metrics-state">
                        ${this._t('metrics_live')}
                      </p>`
                    : nothing}
                  <h3>${this._t('participants_heading')}</h3>
                  ${run.participations.length
                    ? html`<ul data-testid="run-participations">
                        ${run.participations.map(
                          (row) =>
                            html`<li>
                              ${row.plant_id} · ${new Date(row.opened_at).toLocaleString()}
                              ${row.closed_at
                                ? html`– ${new Date(row.closed_at).toLocaleString()}`
                                : html`– ${this._t('present')}`}
                            </li>`
                        )}
                      </ul>`
                    : html`<p>${this._t('none_yet')}</p>`}
                  <h3>${this._t('movement_heading')}</h3>
                  ${run.movement_history.length
                    ? html`<ul data-testid="run-movements">
                        ${run.movement_history.map(
                          (row) =>
                            html`<li>
                              ${new Date(row.at).toLocaleString()} · ${row.plant_id} ·
                              ${this._movementKind(row.kind)} (${row.source_growspace_id ?? '—'} →
                              ${row.target_growspace_id ?? '—'})
                            </li>`
                        )}
                      </ul>`
                    : html`<p>${this._t('none_yet')}</p>`}
                  <h3>Harvest outcomes</h3>
                  ${(run.harvest_outcomes ?? []).length
                    ? html`<ul data-testid="run-harvest-outcomes">
                        ${(run.harvest_outcomes ?? []).map(
                          (outcome) =>
                            html`<li>
                              ${outcome.strain || outcome.plant_id}
                              ${outcome.phenotype ? `· ${outcome.phenotype}` : ''} ·
                              ${outcome.state === 'no_usable_yield'
                                ? `No Usable Yield (0 g): ${outcome.reason}`
                                : outcome.state === 'incomplete'
                                  ? 'Incomplete outcome'
                                  : outcome.metrics.dry_weight == null
                                    ? 'Dry weight unknown'
                                    : `${outcome.metrics.dry_weight} g dry`}
                            </li>`
                        )}
                      </ul>`
                    : html`<p>${this._t('none_yet')}</p>`}
                `}
        <div class="row">
          ${run?.status === 'active' &&
          !run.movement_history.length &&
          !(run.harvest_outcomes ?? []).length
            ? html`<button
                type="button"
                data-action="discard-run"
                @click=${() => this._openDiscard(run)}
              >
                ${this._t('discard_offer')}
              </button>`
            : nothing}
          ${run?.status === 'active'
            ? html`<button type="button" data-action="complete-run" @click=${this._openCompletion}>
                ${this._t('complete_run')}
              </button>`
            : nothing}
          <button type="button" @click=${() => (this._detailsOpen = false)}>
            ${this._t('close')}
          </button>
        </div>
      </ha-dialog>
    `;
  }

  private async _openCompletion(): Promise<void> {
    this._detailsOpen = false;
    this._completion = 'loading';
    const loaded = await loadLazyChunk(
      LAZY_CHUNKS.runCompletionDialog,
      () => import('./growspace-run-completion-dialog')
    );
    if (this._completion === 'loading') this._completion = loaded ? 'ready' : 'missing';
  }

  private _renderCompletion(growspaceId: string) {
    const close = () => (this._completion = 'closed');
    if (this._completion === 'ready') {
      return html`<growspace-run-completion-dialog
        .growspaceId=${growspaceId}
        .language=${this.language}
        @closed=${close}
      ></growspace-run-completion-dialog>`;
    }
    if (this._completion === 'missing') {
      return html`<ha-dialog open .headerTitle=${this._t('complete')} @closed=${close}>
        <growspace-lazy-chunk-error
          .chunk=${LAZY_CHUNKS.runCompletionDialog}
        ></growspace-lazy-chunk-error>
      </ha-dialog>`;
    }
    return nothing;
  }

  private async _openDiscard(run: {
    run_id: string;
    sequence_number: number;
    run_revision: number;
  }): Promise<void> {
    this._detailsOpen = false;
    this._discarding = {
      runId: run.run_id,
      number: run.sequence_number,
      revision: run.run_revision,
    };
    this._discard = 'loading';
    const loaded = await loadLazyChunk(
      LAZY_CHUNKS.runDiscardDialog,
      () => import('./growspace-run-discard-dialog')
    );
    if (this._discard === 'loading') this._discard = loaded ? 'ready' : 'missing';
  }

  private _renderDiscard(growspaceId: string) {
    const close = () => (this._discard = 'closed');
    const run = this._discarding;
    if (this._discard === 'ready' && run) {
      return html`<growspace-run-discard-dialog
        .growspaceId=${growspaceId}
        .runId=${run.runId}
        .sequenceNumber=${run.number}
        .runRevision=${run.revision}
        .language=${this.language}
        @closed=${close}
      ></growspace-run-discard-dialog>`;
    }
    if (this._discard === 'missing') {
      return html`<ha-dialog open .headerTitle=${this._t('discard')} @closed=${close}>
        <growspace-lazy-chunk-error
          .chunk=${LAZY_CHUNKS.runDiscardDialog}
        ></growspace-lazy-chunk-error>
      </ha-dialog>`;
    }
    return nothing;
  }

  protected updated(changed: PropertyValues<this>): void {
    if (!changed.has('view')) return;
    const view = this.view;
    const key = view && view.runRevision !== null ? `${view.growspaceId}:${view.runRevision}` : '';
    if (key === this._listed) return;
    this._listed = key;
    if (!key || !view) {
      this._awaiting = null;
      return;
    }
    void this._list(view.growspaceId, key);
  }

  /** Find the Completed Run waiting longest; a failed read offers none. */
  private async _list(growspaceId: string, key: string): Promise<void> {
    let awaiting: RunSummary | null = null;
    try {
      const result = await listGrowRuns(growspaceId);
      // Newest first, so the last Completed one has waited longest.
      const runs = result.outcome === 'listed' ? result.runs : [];
      awaiting = runs.filter((run) => run.status === 'completed').pop() ?? null;
    } catch {
      // A backend before GSM#673 has no Run list, and nothing to finalize.
    }
    if (this._listed === key) this._awaiting = awaiting;
  }

  private async _openFinalization(): Promise<void> {
    this._finalizing = this._awaiting?.run_id ?? null;
    this._finalization = 'loading';
    const loaded = await loadLazyChunk(
      LAZY_CHUNKS.runFinalizationDialog,
      () => import('./growspace-run-finalization-dialog')
    );
    if (this._finalization === 'loading') this._finalization = loaded ? 'ready' : 'missing';
  }

  private _renderFinalization(growspaceId: string) {
    const close = () => (this._finalization = 'closed');
    if (this._finalization === 'ready' && this._finalizing) {
      return html`<growspace-run-finalization-dialog
        .growspaceId=${growspaceId}
        .runId=${this._finalizing}
        .language=${this.language}
        @closed=${close}
      ></growspace-run-finalization-dialog>`;
    }
    if (this._finalization === 'missing') {
      return html`<ha-dialog open .headerTitle=${this._t('finalize')} @closed=${close}>
        <growspace-lazy-chunk-error
          .chunk=${LAZY_CHUNKS.runFinalizationDialog}
        ></growspace-lazy-chunk-error>
      </ha-dialog>`;
    }
    return nothing;
  }

  private _renderAwaiting() {
    const run = this._awaiting;
    if (!run) return nothing;
    return html`<button
      class="chip"
      data-action="finalize-run"
      aria-haspopup="dialog"
      aria-label=${this._t('finalize_chip_label', { number: run.sequence_number })}
      @click=${this._openFinalization}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d=${mdiFlagCheckered}></path></svg>
      <span>${this._t('finalize_chip', { number: run.sequence_number })}</span>
    </button>`;
  }

  private _openStart(): void {
    this._open = true;
    if (this._startLoaded) return;
    void loadLazyChunk(
      LAZY_CHUNKS.runStartDialog,
      () => import('./growspace-run-start-dialog')
    ).then((chunk) => {
      if (chunk) this._startLoaded = true;
      else this._startMissing = true;
    });
  }

  private _renderStart() {
    if (this._startMissing) {
      return html`<growspace-lazy-chunk-error
        .chunk=${LAZY_CHUNKS.runStartDialog}
      ></growspace-lazy-chunk-error>`;
    }
    if (!this._startLoaded) return nothing;
    return html`<growspace-run-start-dialog
      .view=${this.view}
      .plantCount=${this.plantCount}
      .language=${this.language}
      .timeZone=${this.timeZone}
      @closed=${() => (this._open = false)}
    ></growspace-run-start-dialog>`;
  }

  render() {
    const view = this.view;
    if (!view) return nothing;
    // One stable slot, so the completion dialog outlives the chip's own switch
    // from the Active Run to `Start run` when the sensor catches up.
    return html`${this._renderChip(view)}${this._renderAwaiting()}${this._renderCompletion(
      view.growspaceId
    )}${this._renderFinalization(view.growspaceId)}${this._renderDiscard(view.growspaceId)}`;
  }

  private _renderChip(view: RunView) {
    if (view.state === 'none') {
      return html`
        <button
          class="chip start"
          data-state="none"
          aria-haspopup="dialog"
          aria-label=${this._t('start_label')}
          @click=${this._openStart}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d=${mdiPlus}></path></svg>
          <span>${view.summary}</span>
        </button>
        ${this._open ? this._renderStart() : nothing}
      `;
    }

    const active = view.state === 'active';
    const label = active
      ? this._t('chip_label', { summary: view.summary })
      : this._t('unavailable_label');
    return html`
      <button
        class="chip ${active ? 'active' : ''}"
        data-state=${view.state}
        aria-label=${label}
        title=${active ? view.summary : this._t('unavailable_label')}
        aria-haspopup=${active ? 'dialog' : 'false'}
        @click=${this._openDetails}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d=${active ? mdiSprout : mdiHelpCircleOutline}></path>
        </svg>
        <span>${view.summary}</span>
      </button>
      ${this._detailsOpen ? this._renderDetails() : nothing}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'growspace-run-chip': GrowspaceRunChip;
  }
}
