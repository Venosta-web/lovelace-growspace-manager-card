import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { localize, localizePlural, localizeWithParams } from '../../../localize/localize';
import { getHass } from '../../../services/hass-call';
import { getGrowRun } from '../../../slices/grow-run';
import { refusalText } from '../../../slices/grow-run/start';
import type { RunSnapshot, RunSummary } from '../../../slices/grow-run/schema';
import {
  finalizeGrowRun,
  previewGrowRunFinalization,
  type FinalizationPreview,
} from '../../../slices/grow-run/finalization';
import { reopenGrowRun } from '../../../slices/grow-run/correction';
import { MAX_REASON_LENGTH } from '../../../slices/grow-run/correction-schema';

/** Refusals after which the snapshot has moved and must be read again. */
const RELOAD_ON = new Set(['grow_run.acknowledgement_required', 'grow_run.revision_conflict']);

const KNOWN_MISSING = new Set([
  'dry_weight',
  'outcome_incomplete',
  'entered_dry_at',
  'participant_identity',
  'harvest_source_plants',
]);

type Metric = RunSnapshot['metrics'][number];

/**
 * Finalizing a Completed Run (GSM#673).
 *
 * Finalization freezes the Run's results for good, so the dialog shows the
 * Run Finalization Snapshot exactly as it would land — boundaries, Harvest
 * Window, who took part, Strains, Yield and every fact still missing — before
 * anything is sent. A snapshot with a missing fact needs one tick to
 * acknowledge it; the fact stays missing in the frozen snapshot and is never
 * counted as zero. After finalizing, the dialog shows the frozen snapshot the
 * backend returned, which no later change to a Plant or the growspace moves.
 *
 * Opened on a Run that is already Finalized, it shows that Run's frozen
 * snapshot instead. There a Home Assistant administrator may reopen it
 * (GSM#917), saying why: the Run goes back to Completed with its dates
 * unchanged, the dialog returns to the preview so the grower can correct and
 * finalize it again, and the old snapshot is kept as superseded.
 *
 * It is a lazy chunk: the run chip imports it when the grower asks to finalize.
 */
@customElement('growspace-run-finalization-dialog')
export class GrowspaceRunFinalizationDialog extends LitElement {
  @property() growspaceId = '';
  @property() runId = '';
  @property() language = 'en';

  @state() private _preview: FinalizationPreview | null = null;
  @state() private _loadError: string | null = null;
  @state() private _acknowledged: ReadonlySet<string> = new Set();
  @state() private _busy = false;
  @state() private _refusal: string | null = null;
  @state() private _finalized: { run: RunSummary; snapshot: RunSnapshot } | null = null;
  /** How many snapshots earlier reopenings set aside, when the Run says. */
  @state() private _superseded = 0;
  /** Whether the reopen form is showing, and what it holds. */
  @state() private _reopenOpen = false;
  @state() private _reason = '';
  @state() private _reopenRefusal: string | null = null;
  /** Said once the Run is reopened, above the preview it returns to. */
  @state() private _notice: string | null = null;

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
    ul,
    dl {
      margin: 0;
    }

    ul {
      padding-left: 20px;
    }

    dl {
      display: grid;
      grid-template-columns: minmax(0, max-content) minmax(0, 1fr);
      gap: 4px 16px;
    }

    dt {
      color: var(--secondary-text-color);
    }

    dd {
      margin: 0;
      font-variant-numeric: tabular-nums;
    }

    .muted {
      color: var(--secondary-text-color);
    }

    .warning {
      padding: 10px 12px;
      border-radius: 8px;
      border-left: 3px solid var(--warning-color, #ff9800);
      background: var(--secondary-background-color, rgba(255, 255, 255, 0.04));
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

    .badge {
      align-self: flex-start;
      padding: 2px 10px;
      border-radius: 12px;
      border: 1px solid var(--primary-color, #4caf50);
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
    input:focus-visible {
      outline: 2px solid var(--primary-color, #4caf50);
      outline-offset: 2px;
    }

    .refusal {
      color: var(--error-color, #f44336);
    }

    label.reason {
      display: flex;
      flex-direction: column;
      gap: 6px;
      font-size: 0.875rem;
    }

    textarea {
      min-height: 64px;
      padding: 8px 10px;
      border-radius: 8px;
      border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.24));
      background: transparent;
      color: var(--primary-text-color);
      font: inherit;
      resize: vertical;
    }

    textarea:focus-visible {
      outline: 2px solid var(--primary-color, #4caf50);
      outline-offset: 2px;
    }
  `;

  connectedCallback(): void {
    super.connectedCallback();
    if (!this._preview && !this._finalized) void this._load();
  }

  private _t(key: string, params: Record<string, string | number> = {}): string {
    return Object.keys(params).length
      ? localizeWithParams(`grow_run.${key}`, params, this.language)
      : localize(`grow_run.${key}`, '', '', this.language);
  }

  private _plural(key: string, count: number): string {
    return localizePlural(`grow_run.${key}`, count, {}, this.language);
  }

  private get _locale(): string {
    return this.language.replace(/_/, '-');
  }

  /** A moment's local date, in the Run Timezone the snapshot froze. */
  private _when(iso: string, zone: string): string {
    return new Date(iso).toLocaleDateString(this._locale, { dateStyle: 'medium', timeZone: zone });
  }

  /** A local calendar day, which has no timezone left to convert. */
  private _day(isoDate: string): string {
    return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString(this._locale, {
      dateStyle: 'medium',
      timeZone: 'UTC',
    });
  }

  /** Read the snapshot; keep only acknowledgements that still apply. */
  private async _load(): Promise<void> {
    try {
      const result = await previewGrowRunFinalization(this.growspaceId, this.runId);
      if (result.outcome === 'refused') {
        this._preview = null;
        if (result.refusal.code === 'grow_run.not_completed' && (await this._showFinalized())) {
          return;
        }
        this._loadError = refusalText(result.refusal, this.language);
        return;
      }
      this._loadError = null;
      this._preview = result.preview;
      const live = new Set(result.preview.warnings);
      this._acknowledged = new Set([...this._acknowledged].filter((code) => live.has(code)));
    } catch (error) {
      this._loadError = this._t('refused', { message: messageOf(error) });
    }
  }

  /**
   * A Run that is already Finalized is shown frozen, as the backend holds it.
   * Anything else, a failed read included, leaves the refusal to say why.
   */
  private async _showFinalized(): Promise<boolean> {
    let details;
    try {
      details = await getGrowRun(this.growspaceId, this.runId);
    } catch {
      return false;
    }
    if (details?.outcome !== 'found' || details.run.status !== 'finalized') return false;
    const { snapshot, superseded_snapshots: superseded, ...run } = details.run;
    if (!snapshot) return false;
    this._finalized = { run, snapshot };
    this._superseded = superseded.length;
    return true;
  }

  private get _isAdmin(): boolean {
    return getHass()?.user?.is_admin === true;
  }

  private async _reopen(event: Event): Promise<void> {
    event.preventDefault();
    const done = this._finalized;
    if (!done || this._busy || !this._reason.trim()) return;
    this._busy = true;
    this._reopenRefusal = null;
    try {
      const result = await reopenGrowRun(
        this.growspaceId,
        done.run.run_id,
        done.run.run_revision,
        this._reason.trim()
      );
      if (result.outcome === 'reopened') {
        this._notice = this._t('reopen_done', { number: result.run.sequence_number });
        this._finalized = null;
        this._reopenOpen = false;
        this._reason = '';
        this._acknowledged = new Set();
        await this._load();
        return;
      }
      this._reopenRefusal =
        result.refusal.code === 'grow_run.not_authorized'
          ? this._t('reopen_not_authorized')
          : refusalText(result.refusal, this.language);
    } catch (error) {
      this._reopenRefusal = this._t('refused', { message: messageOf(error) });
    } finally {
      this._busy = false;
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
      !!preview && !this._busy && preview.warnings.every((code) => this._acknowledged.has(code))
    );
  }

  private async _submit(event: Event): Promise<void> {
    event.preventDefault();
    const preview = this._preview;
    if (!preview || !this._ready) return;
    this._busy = true;
    this._refusal = null;
    try {
      const result = await finalizeGrowRun(
        this.growspaceId,
        preview.run.run_id,
        preview.run.run_revision,
        [...this._acknowledged]
      );
      if (result.outcome === 'finalized') {
        this._finalized = { run: result.run, snapshot: result.snapshot };
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

  /** A Participant as the snapshot named them, or their ID when it could not. */
  private _plantName(snapshot: RunSnapshot, plantId: string | null): string {
    const plant = snapshot.participants.find((row) => row.plant_id === plantId);
    return plant?.plant_name || plant?.strain_name || plantId || '';
  }

  private _metricValue(metric: Metric): TemplateResult {
    if (metric.value === null) {
      return html`<span class="muted">${this._t('metric_incomplete')}</span>`;
    }
    const value = metric.value.toLocaleString(this._locale, { maximumFractionDigits: 2 });
    return html`${value} ${metric.unit}`;
  }

  private _metricName(metric: string): string {
    return ['yield', 'yield_per_harvest_source_plant'].includes(metric)
      ? this._t(`metric_${metric}`)
      : metric.replaceAll('_', ' ');
  }

  private _harvestWindow(snapshot: RunSnapshot): string {
    const window = snapshot.harvest_window;
    if (window) {
      return window.first === window.last
        ? this._day(window.first)
        : this._t('gap_range', { start: this._day(window.first), end: this._day(window.last) });
    }
    return snapshot.counts.harvest_source_plants === 0
      ? this._t('snapshot_harvest_none')
      : this._t('snapshot_harvest_unknown');
  }

  private _missingText(snapshot: RunSnapshot, kind: string, plantId: string | null): string {
    const plant = this._plantName(snapshot, plantId);
    return KNOWN_MISSING.has(kind)
      ? this._t(`missing_${kind}`, { plant })
      : this._t('missing_other', { plant, kind: kind.replaceAll('_', ' ') });
  }

  private _renderSnapshot(snapshot: RunSnapshot): TemplateResult {
    const zone = snapshot.timezone;
    return html`
      <section data-testid="snapshot-boundaries">
        <h3>${this._t('snapshot_heading')}</h3>
        <dl>
          <dt>${this._t('snapshot_boundaries')}</dt>
          <dd>
            ${this._t('gap_range', {
              start: this._when(snapshot.started_at, zone),
              end: this._when(snapshot.completed_at, zone),
            })}
            · ${this._plural('days', snapshot.duration_days)}
          </dd>
          <dt>${this._t('snapshot_harvest')}</dt>
          <dd data-testid="snapshot-harvest-window">${this._harvestWindow(snapshot)}</dd>
          <dt>${this._t('participants_heading')}</dt>
          <dd data-testid="snapshot-counts">
            ${this._plural('plants', snapshot.counts.participants)} ·
            ${this._plural('snapshot_harvested', snapshot.counts.harvest_source_plants)}
          </dd>
          ${snapshot.metrics.map(
            (metric) => html`
              <dt>${this._metricName(metric.metric)}</dt>
              <dd data-metric=${metric.metric}>
                ${this._metricValue(metric)}
                <span class="muted"
                  >${this._t('metric_version', { version: metric.definition_version })}</span
                >
              </dd>
            `
          )}
        </dl>
        <p class="muted">${this._t('snapshot_timezone', { zone })}</p>
      </section>
      ${snapshot.strains.length
        ? html`<section>
            <h3>${this._t('snapshot_strains')}</h3>
            <ul data-testid="snapshot-strains">
              ${snapshot.strains.map(
                (row) =>
                  html`<li>
                    ${row.strain_name || this._t('snapshot_strain_unknown')} ·
                    ${this._plural('plants', row.participants)}
                  </li>`
              )}
            </ul>
          </section>`
        : nothing}
      <section>
        <h3>${this._t('completion_coverage_heading')}</h3>
        ${snapshot.coverage.length
          ? html`<ul>
              ${snapshot.coverage.map(
                (row) =>
                  html`<li>
                    ${this._metricName(row.metric)} · ${Math.round(row.coverage_percent)}%
                  </li>`
              )}
            </ul>`
          : html`<p class="muted">${this._t('completion_coverage_none')}</p>`}
        ${snapshot.uncovered_gaps.length
          ? html`<p class="muted" data-testid="snapshot-gaps">
              ${this._plural('snapshot_gaps', snapshot.uncovered_gaps.length)}
            </p>`
          : nothing}
      </section>
      ${snapshot.missing.length
        ? html`<section data-testid="snapshot-missing">
            <h3>${this._t('snapshot_missing')}</h3>
            <ul>
              ${snapshot.missing.map(
                (row) => html`<li>${this._missingText(snapshot, row.kind, row.plant_id)}</li>`
              )}
            </ul>
          </section>`
        : nothing}
    `;
  }

  private _renderWarnings(preview: FinalizationPreview): TemplateResult[] {
    return preview.warnings.map(
      (code) => html`
        <section class="warning" data-warning=${code}>
          <label class="ack">
            <input
              type="checkbox"
              data-ack=${code}
              .checked=${this._acknowledged.has(code)}
              @change=${(event: Event) => this._toggle(code, event)}
            />
            <span
              >${code === 'incomplete_snapshot'
                ? this._t('ack_incomplete_snapshot')
                : this._t('ack_other', { code })}</span
            >
          </label>
        </section>
      `
    );
  }

  private _renderForm(preview: FinalizationPreview | null): TemplateResult {
    return html`
      <form class="body" @submit=${this._submit}>
        ${this._notice
          ? html`<p role="status" data-testid="reopen-notice">${this._notice}</p>`
          : nothing}
        ${this._loadError
          ? html`<p class="refusal" role="alert">${this._loadError}</p>`
          : preview
            ? html`<p>${this._t('finalization_intro')}</p>
                ${this._renderSnapshot(preview.snapshot)} ${this._renderWarnings(preview)}`
            : html`<p>${this._t('completion_loading')}</p>`}
        ${this._refusal
          ? html`<p class="refusal" role="alert" data-testid="finalization-refusal">
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
                data-action="finalize"
                ?disabled=${!this._ready}
              >
                ${this._busy ? this._t('finalizing') : this._t('finalize')}
              </button>`
            : nothing}
        </div>
      </form>
    `;
  }

  private _renderFinalized(run: RunSummary, snapshot: RunSnapshot): TemplateResult {
    const admin = this._isAdmin;
    return html`
      <div class="body" data-testid="finalization-done">
        <p role="status">${this._t('finalization_done', { number: run.sequence_number })}</p>
        <span class="badge" data-testid="metrics-state">${this._t('metrics_frozen')}</span>
        <p class="muted">${this._t('metrics_frozen_detail')}</p>
        ${this._superseded
          ? html`<p class="muted" data-testid="superseded">
              ${this._plural('superseded', this._superseded)}
            </p>`
          : nothing}
        ${this._renderSnapshot(snapshot)}
        ${admin && this._reopenOpen ? this._renderReopen(run) : nothing}
        <div class="row">
          ${admin && !this._reopenOpen
            ? html`<button
                type="button"
                data-action="reopen-offer"
                @click=${() => (this._reopenOpen = true)}
              >
                ${this._t('reopen_offer')}
              </button>`
            : nothing}
          <button type="button" class="primary" data-action="close" @click=${this._close}>
            ${this._t('close')}
          </button>
        </div>
      </div>
    `;
  }

  private _renderReopen(run: RunSummary): TemplateResult {
    return html`
      <form class="warning" data-testid="reopen-form" @submit=${this._reopen}>
        <section>
          <p>${this._t('reopen_intro', { number: run.sequence_number })}</p>
          <label class="reason">
            ${this._t('reopen_reason')}
            <textarea
              data-field="reason"
              required
              maxlength=${MAX_REASON_LENGTH}
              .value=${this._reason}
              @input=${(event: Event) =>
                (this._reason = (event.target as HTMLTextAreaElement).value)}
            ></textarea>
          </label>
          ${this._reopenRefusal
            ? html`<p class="refusal" role="alert" data-testid="reopen-refusal">
                ${this._reopenRefusal}
              </p>`
            : nothing}
          <div class="row">
            <button
              type="button"
              data-action="reopen-cancel"
              ?disabled=${this._busy}
              @click=${() => {
                this._reopenOpen = false;
                this._reopenRefusal = null;
              }}
            >
              ${this._t('cancel')}
            </button>
            <button
              type="submit"
              class="primary"
              data-action="reopen"
              ?disabled=${this._busy || !this._reason.trim()}
            >
              ${this._busy ? this._t('reopening') : this._t('reopen')}
            </button>
          </div>
        </section>
      </form>
    `;
  }

  render() {
    const done = this._finalized;
    const number = this._preview?.run.sequence_number ?? done?.run.sequence_number ?? '';
    return html`
      <ha-dialog
        open
        width="medium"
        .headerTitle=${this._t('finalization_title', { number })}
        @closed=${this._close}
      >
        ${done ? this._renderFinalized(done.run, done.snapshot) : this._renderForm(this._preview)}
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
    'growspace-run-finalization-dialog': GrowspaceRunFinalizationDialog;
  }
}
