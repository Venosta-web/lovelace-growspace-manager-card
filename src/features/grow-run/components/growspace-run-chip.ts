import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { PropertyValues } from 'lit';
import { mdiFlagCheckered, mdiHelpCircleOutline, mdiHistory, mdiPlus, mdiSprout } from '@mdi/js';

import { LAZY_CHUNKS, loadLazyChunk } from '../../../lib/lazy-chunk';
import { localize, localizeWithParams } from '../../../localize/localize';
import { listGrowRuns, type RunView } from '../../../slices/grow-run';
import type { RunSummary } from '../../../slices/grow-run/schema';
import type { RunViewAction, RunViewTab } from './growspace-run-view';
import '../../shared/ui/lazy-chunk-error';

/**
 * The Active Run chip (GSM#668, GSM#797 "UI placement").
 *
 * The main card carries no more of Grow Runs than this: the Active Run as one
 * compact chip beside the growspace name — `Run #4 · 61 days · 17 plants` —
 * or, without one, a `Start run` chip. Selecting an Active Run opens the Grow
 * Run View (GSM#675) on it, a lazy chunk: its overview, Participants,
 * performance, the growspace's Run history and the Run Comparison. Without an
 * Active Run, a `Runs` chip opens the same View on the newest Run, so history
 * never depends on something being active.
 *
 * Starting is one small dialog, `growspace-run-start-dialog`, fetched as its
 * own chunk the first time it opens (GSM#670 made it large enough to earn
 * one: a start may name an earlier day and preview what it would claim).
 * Nothing is optimistic. The chip changes when the Active Run Sensor does.
 *
 * Completing starts from the Active Run's View (GSM#671), and opens the Run
 * Completion Preview in its own lazy chunk. It stays open after the sensor
 * reads `none`, so the grower sees the completed Run and its Pending metrics.
 *
 * A Completed Run waits to be finalized (GSM#673), often for weeks while its
 * harvest dries, and by then another Run may be Active. The chip asks for the
 * growspace's Runs whenever the Run Revision moves and, while one is still
 * Completed, offers `Finalize Run #3` beside itself; the dialog is a lazy chunk.
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
  /** The Grow Run View's chunk, and which Run and tab it opens on. */
  @state() private _view: 'closed' | 'loading' | 'ready' | 'missing' = 'closed';
  @state() private _viewRun: string | null = null;
  @state() private _viewTab: RunViewTab = 'overview';
  /** The newest Run of any status, which the `Runs` chip opens. */
  @state() private _newest: RunSummary | null = null;
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
  /** The growspace and Run Revision the Run list was last asked for. */
  private _listed = '';

  static styles = css`
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
  `;

  private _t(key: string, params: Record<string, string | number> = {}): string {
    return Object.keys(params).length
      ? localizeWithParams(`grow_run.${key}`, params, this.language)
      : localize(`grow_run.${key}`, '', '', this.language);
  }

  private _openDetails(): void {
    if (!this.view) return;
    if (this.view.state === 'active' && this.view.runId) {
      void this._openView(this.view.runId);
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

  private async _openView(runId: string, tab: RunViewTab = 'overview'): Promise<void> {
    this._viewRun = runId;
    this._viewTab = tab;
    this._view = 'loading';
    const loaded = await loadLazyChunk(LAZY_CHUNKS.runView, () => import('./growspace-run-view'));
    if (this._view === 'loading') this._view = loaded ? 'ready' : 'missing';
  }

  /** The View asks; completing and finalizing stay this chip's own dialogs. */
  private _onViewAction(event: CustomEvent<RunViewAction>): void {
    this._view = 'closed';
    if (event.detail.action === 'complete') void this._openCompletion();
    else void this._openFinalization(event.detail.runId);
  }

  private _renderView(growspaceId: string) {
    const close = () => (this._view = 'closed');
    if (this._view === 'ready' && this._viewRun) {
      return html`<growspace-run-view
        .growspaceId=${growspaceId}
        .runId=${this._viewRun}
        .tab=${this._viewTab}
        .language=${this.language}
        @closed=${close}
        @run-view-action=${this._onViewAction}
      ></growspace-run-view>`;
    }
    if (this._view === 'missing') {
      return html`<ha-dialog open .headerTitle=${this._t('history_heading')} @closed=${close}>
        <growspace-lazy-chunk-error .chunk=${LAZY_CHUNKS.runView}></growspace-lazy-chunk-error>
      </ha-dialog>`;
    }
    return nothing;
  }

  private _renderNewest(view: RunView) {
    const run = this._newest;
    if (view.state !== 'none' || !run) return nothing;
    return html`<button
      class="chip"
      data-action="run-history"
      aria-haspopup="dialog"
      aria-label=${this._t('history_chip_label')}
      @click=${() => this._openView(run.run_id)}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d=${mdiHistory}></path></svg>
      <span>${this._t('history_chip')}</span>
    </button>`;
  }

  private async _openCompletion(): Promise<void> {
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

  protected updated(changed: PropertyValues<this>): void {
    if (!changed.has('view')) return;
    const view = this.view;
    const key = view && view.runRevision !== null ? `${view.growspaceId}:${view.runRevision}` : '';
    if (key === this._listed) return;
    this._listed = key;
    if (!key || !view) {
      this._awaiting = null;
      this._newest = null;
      return;
    }
    void this._list(view.growspaceId, key);
  }

  /**
   * Find the Completed Run waiting longest, and the newest Run the `Runs` chip
   * opens; a failed read offers neither.
   */
  private async _list(growspaceId: string, key: string): Promise<void> {
    let runs: RunSummary[] = [];
    try {
      const result = await listGrowRuns(growspaceId);
      runs = result.outcome === 'listed' ? result.runs : [];
    } catch {
      // A backend before GSM#673 has no Run list, and nothing to finalize.
    }
    if (this._listed !== key) return;
    // Newest first, so the last Completed one has waited longest.
    this._awaiting = runs.filter((run) => run.status === 'completed').pop() ?? null;
    this._newest = runs[0] ?? null;
  }

  private async _openFinalization(runId = this._awaiting?.run_id): Promise<void> {
    this._finalizing = runId ?? null;
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
      @click=${() => this._openFinalization()}
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
    return html`${this._renderChip(view)}${this._renderNewest(
      view
    )}${this._renderAwaiting()}${this._renderView(view.growspaceId)}${this._renderCompletion(
      view.growspaceId
    )}${this._renderFinalization(view.growspaceId)}`;
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
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'growspace-run-chip': GrowspaceRunChip;
  }
}
