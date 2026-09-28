import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { localize, localizePlural, localizeWithParams } from '../../../localize/localize';
import { refusalText } from '../../../slices/grow-run/start';
import type { RunSummary } from '../../../slices/grow-run/schema';
import {
  completeGrowRun,
  previewGrowRunCompletion,
  type CompletionPreview,
} from '../../../slices/grow-run/completion';

/** Refusals after which the preview has moved and must be read again. */
const RELOAD_ON = new Set([
  'grow_run.acknowledgement_required',
  'grow_run.irrigation_delivering',
  'grow_run.revision_conflict',
]);

const KNOWN_WARNINGS = new Set(['plants_present', 'missing_outcomes', 'attribution_gaps']);

/**
 * The Run Completion Preview and its confirmation (GSM#671).
 *
 * Completing ends the Run's operating interval, so the dialog shows what the
 * boundary closes and what it leaves at risk before anything is sent. Each
 * warning is one checkbox the grower ticks to acknowledge it; none of them
 * prevents a deliberate completion. Irrigation delivering water is the one
 * thing that does, and the dialog says so and offers to check again.
 *
 * The backend rebuilds the preview when the command lands. A warning that
 * appeared since — a plant moved in, a movement is still unrecorded — comes
 * back as a refusal, and the dialog re-reads the preview and keeps only the
 * acknowledgements that still apply.
 *
 * It is a lazy chunk: the chip imports it when the grower asks to complete.
 */
@customElement('growspace-run-completion-dialog')
export class GrowspaceRunCompletionDialog extends LitElement {
  @property() growspaceId = '';
  @property() language = 'en';

  @state() private _preview: CompletionPreview | null = null;
  @state() private _loadError: string | null = null;
  @state() private _acknowledged: ReadonlySet<string> = new Set();
  @state() private _note = '';
  @state() private _busy = false;
  @state() private _refusal: string | null = null;
  @state() private _completed: RunSummary | null = null;

  static styles = css`
    .body {
      display: flex;
      flex-direction: column;
      gap: 16px;
      color: var(--primary-text-color);
    }

    section {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    h3 {
      margin: 0;
      font-size: 0.9375rem;
      font-weight: 600;
    }

    p,
    ul {
      margin: 0;
    }

    ul {
      padding-left: 20px;
    }

    .muted {
      color: var(--secondary-text-color);
    }

    .warning,
    .blocker {
      padding: 10px 12px;
      border-radius: 8px;
      border-left: 3px solid var(--warning-color, #ff9800);
      background: var(--secondary-background-color, rgba(255, 255, 255, 0.04));
    }

    .blocker {
      border-left-color: var(--error-color, #f44336);
    }

    .ack {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      font-size: 0.875rem;
      cursor: pointer;
    }

    .ack input {
      margin: 2px 0 0;
      width: 18px;
      height: 18px;
      flex-shrink: 0;
    }

    label.note {
      display: flex;
      flex-direction: column;
      gap: 6px;
      font-size: 0.875rem;
    }

    textarea {
      font: inherit;
      min-height: 72px;
      resize: vertical;
      padding: 8px 10px;
      border-radius: 8px;
      border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.24));
      background: var(--card-background-color, transparent);
      color: var(--primary-text-color);
    }

    .badge {
      align-self: flex-start;
      padding: 2px 10px;
      border-radius: 12px;
      border: 1px solid var(--warning-color, #ff9800);
      font-size: 0.75rem;
      font-weight: 600;
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

    button:focus-visible,
    input:focus-visible,
    textarea:focus-visible {
      outline: 2px solid var(--primary-color, #4caf50);
      outline-offset: 2px;
    }

    .refusal {
      color: var(--error-color, #f44336);
    }
  `;

  connectedCallback(): void {
    super.connectedCallback();
    if (!this._preview && !this._completed) void this._load();
  }

  private _t(key: string, params: Record<string, string | number> = {}): string {
    return Object.keys(params).length
      ? localizeWithParams(`grow_run.${key}`, params, this.language)
      : localize(`grow_run.${key}`, '', '', this.language);
  }

  private _plural(key: string, count: number): string {
    return localizePlural(`grow_run.${key}`, count, {}, this.language);
  }

  private _when(iso: string): string {
    return new Date(iso).toLocaleString(this.language.replace(/_/, '-'), {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  }

  /** Read the preview; keep the note being typed and only live acknowledgements. */
  private async _load(): Promise<void> {
    const first = this._preview === null;
    try {
      const result = await previewGrowRunCompletion(this.growspaceId);
      if (result.outcome === 'refused') {
        this._preview = null;
        this._loadError = refusalText(result.refusal, this.language);
        return;
      }
      this._loadError = null;
      this._preview = result.preview;
      const live = new Set(result.preview.warnings);
      this._acknowledged = new Set([...this._acknowledged].filter((code) => live.has(code)));
      if (first) this._note = result.preview.retrospective_note ?? '';
    } catch (error) {
      this._loadError = this._t('refused', { message: messageOf(error) });
    }
  }

  private _toggle(code: string, event: Event): void {
    const next = new Set(this._acknowledged);
    if ((event.target as HTMLInputElement).checked) next.add(code);
    else next.delete(code);
    this._acknowledged = next;
  }

  private get _ready(): boolean {
    const preview = this._preview;
    return (
      !!preview &&
      !this._busy &&
      preview.blockers.length === 0 &&
      preview.warnings.every((code) => this._acknowledged.has(code))
    );
  }

  private async _submit(event: Event): Promise<void> {
    event.preventDefault();
    const preview = this._preview;
    if (!preview || !this._ready) return;
    this._busy = true;
    this._refusal = null;
    try {
      const result = await completeGrowRun(
        this.growspaceId,
        preview.run.run_id,
        preview.run.run_revision,
        [...this._acknowledged],
        this._note
      );
      if (result.outcome === 'completed') {
        this._completed = result.run;
        return;
      }
      this._refusal = refusalText(result.refusal, this.language);
      if (RELOAD_ON.has(result.refusal.code)) await this._load();
    } catch (error) {
      this._refusal = this._t('refused', { message: messageOf(error) });
    } finally {
      this._busy = false;
    }
  }

  private _close(): void {
    this.dispatchEvent(new CustomEvent('closed'));
  }

  /** A warning the grower must tick, with what it is about above the box. */
  private _warning(code: string, body: TemplateResult): TemplateResult {
    const label = KNOWN_WARNINGS.has(code)
      ? this._t(`ack_${code}`)
      : this._t('ack_other', { code });
    return html`
      <section class="warning" data-warning=${code}>
        ${body}
        <label class="ack">
          <input
            type="checkbox"
            data-ack=${code}
            .checked=${this._acknowledged.has(code)}
            @change=${(event: Event) => this._toggle(code, event)}
          />
          <span>${label}</span>
        </label>
      </section>
    `;
  }

  private _plantName(plant: CompletionPreview['plants_present'][number]): string {
    const name = [plant.strain_name, plant.phenotype_name].filter(Boolean).join(' ');
    return name || plant.plant_id;
  }

  private _renderBoundary(preview: CompletionPreview): TemplateResult {
    const closing = preview.closing_participations.length;
    return html`
      <section data-testid="completion-boundary">
        <h3>${this._t('completion_boundary_heading')}</h3>
        <p>
          ${this._t('completion_boundary', {
            when: this._when(preview.completed_at),
            duration: this._plural('days', preview.duration_days),
          })}
        </p>
        <p class="muted" data-testid="completion-closing">
          ${closing === 0
            ? this._t('completion_closing_none')
            : this._plural('completion_closing', closing)}
        </p>
      </section>
    `;
  }

  private _renderWarnings(preview: CompletionPreview): TemplateResult {
    return html`
      ${preview.plants_present.length
        ? this._warning(
            'plants_present',
            html`<h3>${this._t('completion_present_heading')}</h3>
              <p>${this._plural('completion_present', preview.plants_present.length)}</p>
              <ul data-testid="completion-present">
                ${preview.plants_present.map((plant) => html`<li>${this._plantName(plant)}</li>`)}
              </ul>`
          )
        : nothing}
      ${preview.missing_outcomes.length
        ? this._warning(
            'missing_outcomes',
            html`<h3>${this._t('completion_outcomes_heading')}</h3>
              <p>${this._plural('completion_outcomes', preview.missing_outcomes.length)}</p>
              <ul data-testid="completion-outcomes">
                ${preview.missing_outcomes.map(
                  (row) =>
                    html`<li>
                      ${[row.strain, row.phenotype].filter(Boolean).join(' ') || row.plant_id} ·
                      ${row.state === 'incomplete'
                        ? this._t('completion_outcome_incomplete')
                        : this._t('completion_outcome_no_dry_weight')}
                    </li>`
                )}
              </ul>`
          )
        : nothing}
      ${preview.attribution_gaps.length
        ? this._warning(
            'attribution_gaps',
            html`<h3>${this._t('completion_gaps_heading')}</h3>
              <ul data-testid="completion-gaps">
                ${preview.attribution_gaps.map(
                  (gap) =>
                    html`<li>
                      ${gap.kind === 'pending_fact' && gap.at
                        ? this._t('completion_gap_pending', {
                            plant: gap.plant_id,
                            when: this._when(gap.at),
                          })
                        : this._t('completion_gap_unrecorded', { plant: gap.plant_id })}
                    </li>`
                )}
              </ul>`
          )
        : nothing}
      ${preview.warnings
        .filter((code) => !KNOWN_WARNINGS.has(code))
        .map((code) => this._warning(code, html``))}
    `;
  }

  private _renderPreview(preview: CompletionPreview): TemplateResult {
    return html`
      ${this._renderBoundary(preview)}
      ${preview.blockers.length
        ? html`<section class="blocker" role="alert" data-testid="completion-blocker">
            <p>
              ${preview.blockers.includes('grow_run.irrigation_delivering')
                ? this._t('completion_irrigation', {
                    outputs: preview.delivering_outputs.join(', '),
                  })
                : this._t('completion_blocked', { codes: preview.blockers.join(', ') })}
            </p>
            <div class="row">
              <button type="button" data-action="recheck" @click=${() => this._load()}>
                ${this._t('completion_recheck')}
              </button>
            </div>
          </section>`
        : nothing}
      ${this._renderWarnings(preview)}
      <section data-testid="completion-coverage">
        <h3>${this._t('completion_coverage_heading')}</h3>
        ${preview.coverage.length
          ? html`<ul>
              ${preview.coverage.map(
                (row) => html`<li>${row.metric} · ${Math.round(row.coverage_percent)}%</li>`
              )}
            </ul>`
          : html`<p class="muted">${this._t('completion_coverage_none')}</p>`}
      </section>
      <label class="note">
        ${this._t('completion_note')}
        <textarea
          id="run-note"
          maxlength="2000"
          .value=${this._note}
          @input=${(event: Event) => (this._note = (event.target as HTMLTextAreaElement).value)}
        ></textarea>
      </label>
    `;
  }

  private _renderCompleted(run: RunSummary): TemplateResult {
    const days =
      run.completed_at == null
        ? null
        : Math.max(
            0,
            Math.floor((Date.parse(run.completed_at) - Date.parse(run.started_at)) / 86_400_000)
          );
    return html`
      <div class="body" data-testid="completion-done">
        <p role="status">${this._t('completion_done', { number: run.sequence_number })}</p>
        <span class="badge" data-testid="metrics-state">${this._t('metrics_pending')}</span>
        <p class="muted">${this._t('metrics_pending_detail')}</p>
        <p data-testid="completion-summary">
          ${[
            days === null ? null : this._plural('days', days),
            this._plural('plants', run.participant_count),
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
        <div class="row">
          <button type="button" class="primary" data-action="close" @click=${this._close}>
            ${this._t('close')}
          </button>
        </div>
      </div>
    `;
  }

  private _renderForm(preview: CompletionPreview | null): TemplateResult {
    return html`
      <form class="body" @submit=${this._submit}>
        ${this._loadError
          ? html`<p class="refusal" role="alert">${this._loadError}</p>`
          : preview
            ? this._renderPreview(preview)
            : html`<p>${this._t('completion_loading')}</p>`}
        ${this._refusal
          ? html`<p class="refusal" role="alert" data-testid="completion-refusal">
              ${this._refusal}
            </p>`
          : nothing}
        <div class="row">
          <button type="button" data-action="cancel" ?disabled=${this._busy} @click=${this._close}>
            ${this._t('cancel')}
          </button>
          ${preview
            ? html`<button
                type="submit"
                class="primary"
                data-action="complete"
                ?disabled=${!this._ready}
              >
                ${this._busy ? this._t('completing') : this._t('complete')}
              </button>`
            : nothing}
        </div>
      </form>
    `;
  }

  render() {
    const preview = this._preview;
    const number = preview?.run.sequence_number ?? this._completed?.sequence_number ?? '';
    return html`
      <ha-dialog
        open
        width="medium"
        .headerTitle=${this._t('completion_title', { number })}
        @closed=${this._close}
      >
        ${this._completed ? this._renderCompleted(this._completed) : this._renderForm(preview)}
      </ha-dialog>
    `;
  }
}

function messageOf(error: unknown): string {
  return error && typeof error === 'object' && 'message' in error
    ? String((error as { message: unknown }).message)
    : String(error);
}

declare global {
  interface HTMLElementTagNameMap {
    'growspace-run-completion-dialog': GrowspaceRunCompletionDialog;
  }
}
