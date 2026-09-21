/**
 * `<growspace-label-batch>` — one batch of plant labels, reviewed, printed,
 * watched and retried through the Label Template path.
 *
 * Four phases, each the answer to one question:
 *
 * 1. **Setup.** Which published template, printer, profile and copy count.
 * 2. **Review.** The backend's preflight of every plant: every record's
 *    raster, its problems, and the exact order the labels will print in.
 *    Review opens on the first error, else the first warning, and the user
 *    can jump between them. A hard error anywhere prevents all output;
 *    warnings are acknowledged against the exact preflight identity, and any
 *    change to the setup afterwards visibly voids that acknowledgement.
 * 3. **Printing.** The job, polled: every record and copy, pending, printed
 *    or failed, in plan order.
 * 4. **Done.** What reached paper and what did not. Retry sends only the
 *    failed copies, from the snapshots and settings already reviewed — and
 *    says so, because "retry" that re-read a plant would print a label
 *    nobody looked at.
 *
 * Every rule about what may be pressed is in `batch-review.ts`; the backend
 * decides again on every call regardless.
 */

import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { localize, localizeWithParams } from '../../../localize/localize';
import { getHass } from '../../../services/hass-call';
import { getPrinters } from '../../shared/ui/printer-status-strip';
import { profilesForSize, type LabelTemplateCapability } from '../../../slices/labels';
import type { LabelRefusal } from '../../../slices/labels/schema';
import { fetchLabelTemplateLibrary } from '../../../slices/labels/drafts';
import {
  MAX_BATCH_COPIES,
  fetchLabelBatchJob,
  preflightLabelBatch,
  printLabelBatch,
  retryLabelBatch,
} from '../../../slices/labels/batch';
import type {
  BatchJob,
  BatchJobAnswer,
  BatchPreflightAnswer,
} from '../../../slices/labels/batch-schema';
import { copyKeys } from '../editor/diagnostics';
import {
  acknowledgementState,
  batchBlockers,
  failedAttempts,
  initialFocus,
  jobProgress,
  mayPrint,
  mayRetry,
  nextFlagged,
  recordDiagnostics,
  recordSeverity,
  severityCounts,
  warningCount,
} from './batch-review';

type Review = Extract<BatchPreflightAnswer, { outcome: 'ok' }>;

/** One published template the batch may print. */
interface TemplateOption {
  key: string;
  kind: string;
  id: string;
  name: string;
  labelSizeId: string;
}

/** How often a running job is read back. */
export const BATCH_POLL_MS = 750;

@customElement('growspace-label-batch')
export class GrowspaceLabelBatch extends LitElement {
  @property({ attribute: false }) capability?: LabelTemplateCapability;
  /** The plants to print, in the order their labels are wanted. */
  @property({ attribute: false }) plantIds: string[] = [];
  /** A human name for a plant ID; the ID itself when not given. */
  @property({ attribute: false }) describePlant?: (plantId: string) => string;
  @property({ type: String }) language = 'en';

  @state() private _templates: TemplateOption[] = [];
  @state() private _templateKey = '';
  @state() private _deviceId = '';
  @state() private _profileId = '';
  @state() private _copies = 1;
  @state() private _busy = false;
  @state() private _refusal: LabelRefusal | null = null;
  @state() private _review: Review | null = null;
  /** The setup moved after the review was taken; it no longer describes the job. */
  @state() private _changed = false;
  /** The preflight identity the user consented to, if any. */
  @state() private _acknowledged: string | null = null;
  @state() private _focus = 0;
  @state() private _job: BatchJob | null = null;
  @state() private _announcement = '';

  #poll: ReturnType<typeof setTimeout> | null = null;

  static styles = css`
    :host {
      display: block;
      color: var(--primary-text-color);
    }
    section {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 12px 0;
      border-bottom: 1px solid var(--divider-color);
    }
    section:last-of-type {
      border-bottom: 0;
    }
    h3 {
      margin: 0;
      font-size: 1rem;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 10px;
    }
    label {
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: 0.85rem;
    }
    select,
    input[type='number'] {
      min-height: 40px;
      padding: 6px 8px;
      border-radius: 8px;
      border: 1px solid var(--divider-color);
      background: var(--card-background-color, transparent);
      color: inherit;
      font: inherit;
    }
    button {
      min-height: 40px;
      padding: 6px 14px;
      border-radius: 8px;
      border: 1px solid var(--divider-color);
      background: var(--secondary-background-color, transparent);
      color: inherit;
      font: inherit;
      cursor: pointer;
    }
    button.primary {
      background: var(--primary-color);
      border-color: transparent;
      color: var(--text-primary-color, #fff);
    }
    button:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }
    button:focus-visible,
    select:focus-visible,
    input:focus-visible {
      outline: 2px solid var(--primary-color);
      outline-offset: 2px;
    }
    .row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
    }
    label.consent {
      flex-direction: row;
      align-items: flex-start;
      gap: 10px;
      font-size: inherit;
      line-height: 1.45;
    }
    label.consent input {
      flex: none;
      width: 20px;
      height: 20px;
      margin: 2px 0 0;
    }
    .supporting {
      margin: 0;
      opacity: 0.8;
      line-height: 1.45;
    }
    .refusal,
    .error {
      color: var(--error-color);
    }
    .warning {
      color: var(--warning-color);
    }
    .stale {
      padding: 8px 10px;
      border-radius: 8px;
      border: 1px solid var(--warning-color);
    }
    .record {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr);
      gap: 12px;
      align-items: start;
    }
    .raster {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 120px;
      padding: 8px;
    }
    .raster img {
      display: block;
      max-width: 100%;
      image-rendering: pixelated;
      border: 1px solid var(--divider-color);
    }
    ul,
    ol {
      margin: 0;
      padding-left: 1.25rem;
    }
    .plan {
      max-height: 220px;
      overflow-y: auto;
    }
    .plan li {
      padding: 2px 0;
    }
    .status {
      font-weight: 600;
    }
    .status[data-status='failed'] {
      color: var(--error-color);
    }
    .status[data-status='printed'] {
      color: var(--success-color);
    }
    progress {
      width: 100%;
    }
    .visually-hidden {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
      white-space: nowrap;
    }
    @media (max-width: 600px) {
      .record {
        grid-template-columns: 1fr;
      }
    }
  `;

  connectedCallback(): void {
    super.connectedCallback();
    void this.#loadTemplates();
    const printers = getPrinters(getHass());
    if (!this._deviceId) this._deviceId = printers[0]?.id ?? '';
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#stopPolling();
  }

  protected willUpdate(changed: Map<string | number | symbol, unknown>): void {
    if (changed.has('capability') && this.capability && this._templates.length === 0) {
      this._templates = this.#factoryOptions();
      this._templateKey ||= this._templates[0]?.key ?? '';
    }
    if (changed.has('capability') || changed.has('_templateKey')) {
      const profiles = this._profiles;
      if (!profiles.some((profile) => profile.id === this._profileId)) {
        this._profileId = profiles[0]?.id ?? '';
      }
    }
  }

  // -------------------------------------------------------------------------
  // Copy
  // -------------------------------------------------------------------------

  private _t(key: string, params?: Record<string, string | number>): string {
    return params
      ? localizeWithParams(`labels.${key}`, params, this.language)
      : localize(`labels.${key}`, '', '', this.language);
  }

  private _has(key: string): boolean {
    return this._t(key) !== `labels.${key}` && this._t(key) !== key;
  }

  #first(keys: string[], fallback: string): string {
    const found = keys.find((key) => this._has(key));
    return found ? this._t(found) : this._t(fallback);
  }

  #plant(plantId: string): string {
    return this.describePlant?.(plantId) || plantId;
  }

  #refusalCopy(refusal: LabelRefusal): string {
    const code = refusal.code.replace(/^label_template\./, '');
    return this.#first([`batch_refusal_${code}`, `refusal_${code}`], 'refusal_generic');
  }

  #blockerCopy(blocker: string): string {
    return this.#first(
      [`batch_blocker_${blocker}`, `print_blocker_${blocker}`],
      'print_blocker_generic'
    );
  }

  // -------------------------------------------------------------------------
  // Setup
  // -------------------------------------------------------------------------

  #factoryOptions(): TemplateOption[] {
    return (this.capability?.catalogues.factory_templates ?? []).map((item) => ({
      key: `factory:${item.id}`,
      kind: 'factory',
      id: item.id,
      name: item.name,
      labelSizeId: item.label_size_id,
    }));
  }

  async #loadTemplates(): Promise<void> {
    try {
      const answer = await fetchLabelTemplateLibrary();
      if (answer.outcome !== 'ok') return;
      const named = answer.library.templates
        .filter((item) => item.head_revision > 0)
        .map((item) => ({
          key: `named:${item.id}`,
          kind: item.kind,
          id: item.id,
          name: item.name,
          labelSizeId: item.label_size_id,
        }));
      this._templates = [...named, ...this.#factoryOptions()];
      if (!this._templates.some((item) => item.key === this._templateKey)) {
        this._templateKey = this._templates[0]?.key ?? '';
      }
    } catch {
      // The Factory Templates are enough to print from; the library is extra.
    }
  }

  private get _template(): TemplateOption | null {
    return this._templates.find((item) => item.key === this._templateKey) ?? null;
  }

  private get _profiles() {
    const template = this._template;
    return this.capability && template
      ? profilesForSize(this.capability, template.labelSizeId)
      : [];
  }

  #edit(apply: () => void): void {
    apply();
    // Anything the preflight was taken under now differs from the screen.
    if (this._review) this._changed = true;
  }

  // -------------------------------------------------------------------------
  // Review
  // -------------------------------------------------------------------------

  async #preflight(): Promise<void> {
    const template = this._template;
    if (!template || !this._deviceId || this.plantIds.length === 0) return;
    this._busy = true;
    this._refusal = null;
    try {
      const answer = await preflightLabelBatch({
        template: { kind: template.kind, id: template.id },
        plantIds: this.plantIds,
        copies: this._copies,
        profileId: this._profileId || null,
        deviceId: this._deviceId,
      });
      if (answer.outcome === 'refused') {
        this._refusal = answer.refusal;
        return;
      }
      this._review = answer;
      this._changed = false;
      this._job = null;
      this._focus = initialFocus(answer.preflight);
      const counts = severityCounts(answer.preflight);
      this.#announce(
        this._t('batch_reviewed', {
          records: answer.preflight.records.length,
          labels: answer.preflight.attempts.length,
          errors: counts.error,
          warnings: counts.warning,
        })
      );
      await this.updateComplete;
      this.renderRoot.querySelector<HTMLElement>('[data-role="record"] h4')?.focus();
    } catch {
      this._refusal = this.#transportRefusal();
    } finally {
      this._busy = false;
    }
  }

  #goTo(index: number | null): void {
    if (index === null) return;
    this._focus = index;
  }

  #acknowledge(checked: boolean): void {
    this._acknowledged = checked && this._review ? this._review.preflight.identity : null;
  }

  // -------------------------------------------------------------------------
  // Printing
  // -------------------------------------------------------------------------

  async #print(): Promise<void> {
    const review = this._review;
    if (!review || !mayPrint(review.preflight, this._acknowledged, this._changed)) return;
    await this.#start(() => printLabelBatch(review.preflight_id, this.#consent()));
  }

  async #retry(): Promise<void> {
    const job = this._job;
    if (!job || !mayRetry(job)) return;
    await this.#start(() => retryLabelBatch(job.id, this.#consent()));
  }

  #consent(): string | null {
    const review = this._review;
    if (!review) return null;
    return acknowledgementState(review.preflight, this._acknowledged) === 'current'
      ? this._acknowledged
      : null;
  }

  async #start(call: () => Promise<BatchJobAnswer>): Promise<void> {
    this._busy = true;
    this._refusal = null;
    try {
      const answer = await call();
      if (answer.outcome === 'refused') {
        this._refusal = answer.refusal;
        return;
      }
      this.#take(answer.job);
    } catch {
      this._refusal = this.#transportRefusal();
    } finally {
      this._busy = false;
    }
  }

  #take(job: BatchJob): void {
    this._job = job;
    const progress = jobProgress(job);
    if (progress.finished) {
      this.#stopPolling();
      this.#announce(
        job.state === 'refused'
          ? this._t('batch_job_refused')
          : this._t('batch_done', { printed: progress.printedOverall, failed: progress.failed })
      );
      return;
    }
    this.#schedulePoll();
  }

  #schedulePoll(): void {
    this.#stopPolling();
    this.#poll = setTimeout(() => void this.#readJob(), BATCH_POLL_MS);
  }

  #stopPolling(): void {
    if (this.#poll !== null) clearTimeout(this.#poll);
    this.#poll = null;
  }

  async #readJob(): Promise<void> {
    const job = this._job;
    if (!job || !this.isConnected) return;
    try {
      const answer = await fetchLabelBatchJob(job.id);
      if (answer.outcome === 'refused') {
        this._refusal = answer.refusal;
        this.#stopPolling();
        return;
      }
      this.#take(answer.job);
    } catch {
      // A missed read is not a failed label; ask again.
      this.#schedulePoll();
    }
  }

  // -------------------------------------------------------------------------
  // Recovery
  // -------------------------------------------------------------------------

  async #recover(recovery: string): Promise<void> {
    switch (recovery) {
      case 'preflight_again':
        this._acknowledged = null;
        await this.#preflight();
        return;
      case 'acknowledge_warnings':
        this.renderRoot.querySelector<HTMLElement>('[data-role="acknowledge"] input')?.focus();
        return;
      case 'choose_printer':
        this.renderRoot.querySelector<HTMLElement>('select[name="printer"]')?.focus();
        return;
      case 'select_profile':
        this.renderRoot.querySelector<HTMLElement>('select[name="profile"]')?.focus();
        return;
      case 'choose_template':
        this.renderRoot.querySelector<HTMLElement>('select[name="template"]')?.focus();
        return;
      default:
        return;
    }
  }

  #transportRefusal(): LabelRefusal {
    return {
      code: 'label_template.transport_failed',
      reason: '',
      recovery: 'none',
      current: { family: '', major: 0, minor: 0, generation: 0 },
    } as LabelRefusal;
  }

  #announce(message: string): void {
    this._announcement = message;
  }

  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------

  protected render(): TemplateResult {
    const printing = this._job !== null && !jobProgress(this._job).finished;
    return html`
      ${this.#renderSetup(printing)} ${this.#renderRefusal()}
      ${this._review ? this.#renderReview(this._review, printing) : nothing}
      ${this._job ? this.#renderJob(this._job) : nothing}
      <p class="visually-hidden" role="status" aria-live="polite">${this._announcement}</p>
    `;
  }

  #renderSetup(printing: boolean): TemplateResult {
    const printers = getPrinters(getHass());
    const locked = this._busy || printing;
    return html`
      <section data-section="setup" aria-labelledby="batch-setup">
        <h3 id="batch-setup">${this._t('batch_setup', { plants: this.plantIds.length })}</h3>
        <div class="grid">
          <label>
            ${this._t('batch_template')}
            <select
              name="template"
              .value=${this._templateKey}
              ?disabled=${locked}
              @change=${(e: Event) =>
                this.#edit(() => {
                  this._templateKey = (e.target as HTMLSelectElement).value;
                })}
            >
              ${this._templates.map(
                (item) =>
                  html`<option value=${item.key} ?selected=${item.key === this._templateKey}>
                    ${item.name} (${item.labelSizeId})
                  </option>`
              )}
            </select>
          </label>
          <label>
            ${this._t('print_printer')}
            <select
              name="printer"
              .value=${this._deviceId}
              ?disabled=${locked}
              @change=${(e: Event) =>
                this.#edit(() => {
                  this._deviceId = (e.target as HTMLSelectElement).value;
                })}
            >
              ${printers.length === 0
                ? html`<option value="">${this._t('print_no_printer')}</option>`
                : printers.map(
                    (printer) =>
                      html`<option value=${printer.id} ?selected=${printer.id === this._deviceId}>
                        ${printer.name}
                      </option>`
                  )}
            </select>
          </label>
          <label>
            ${this._t('print_profile')}
            <select
              name="profile"
              .value=${this._profileId}
              ?disabled=${locked}
              @change=${(e: Event) =>
                this.#edit(() => {
                  this._profileId = (e.target as HTMLSelectElement).value;
                })}
            >
              ${this._profiles.map(
                (profile) =>
                  html`<option value=${profile.id} ?selected=${profile.id === this._profileId}>
                    ${profile.printer_class} · ${profile.dpi} dpi
                  </option>`
              )}
            </select>
          </label>
          <label>
            ${this._t('batch_copies')}
            <input
              name="copies"
              type="number"
              min="1"
              max=${MAX_BATCH_COPIES}
              .value=${String(this._copies)}
              ?disabled=${locked}
              @change=${(e: Event) => {
                const value = Number.parseInt((e.target as HTMLInputElement).value, 10);
                const copies = Number.isNaN(value)
                  ? 1
                  : Math.min(Math.max(value, 1), MAX_BATCH_COPIES);
                (e.target as HTMLInputElement).value = String(copies);
                this.#edit(() => {
                  this._copies = copies;
                });
              }}
            />
          </label>
        </div>
        ${printers.length === 0
          ? html`<p class="supporting" data-role="no-printer">
              ${this._t('print_no_printer_hint')}
            </p>`
          : nothing}
        <div class="row">
          <button
            class=${this._review ? '' : 'primary'}
            data-action="preflight"
            ?disabled=${locked || !this._template || !this._deviceId || this.plantIds.length === 0}
            @click=${() => void this.#preflight()}
          >
            ${this._t(this._review ? 'batch_review_again' : 'batch_review', {
              labels: this.plantIds.length * this._copies,
            })}
          </button>
        </div>
      </section>
    `;
  }

  #renderRefusal(): TemplateResult | typeof nothing {
    const refusal = this._refusal;
    if (!refusal) return nothing;
    const action = this._has(`batch_recovery_${refusal.recovery}`)
      ? this._t(`batch_recovery_${refusal.recovery}`)
      : null;
    return html`<div class="refusal" role="alert" data-role="refusal" data-code=${refusal.code}>
      <p class="supporting">${this.#refusalCopy(refusal)}</p>
      ${refusal.blocked_by?.length
        ? html`<ul>
            ${refusal.blocked_by.map((blocker) => html`<li>${this.#blockerCopy(blocker)}</li>`)}
          </ul>`
        : nothing}
      ${action
        ? html`<button data-action="recover" @click=${() => void this.#recover(refusal.recovery)}>
            ${action}
          </button>`
        : nothing}
    </div>`;
  }

  #renderReview(review: Review, printing: boolean): TemplateResult {
    const preflight = review.preflight;
    const counts = severityCounts(preflight);
    const blockers = batchBlockers(preflight);
    return html`
      <section data-section="review" aria-labelledby="batch-review">
        <h3 id="batch-review">
          ${this._t('batch_review_heading', {
            records: preflight.records.length,
            labels: preflight.attempts.length,
          })}
        </h3>
        <p class="supporting" data-role="summary">
          ${this._t('batch_review_summary', {
            template: review.template.name,
            revision: review.template.revision,
            errors: counts.error,
            warnings: counts.warning,
          })}
        </p>
        ${this._changed
          ? html`<p class="stale" role="alert" data-role="changed">
              ${this._t('batch_changed_since_review')}
            </p>`
          : nothing}
        ${!preflight.allowed
          ? html`<div class="error" data-role="blocked">
              <p class="supporting">${this._t('batch_blocked')}</p>
              ${blockers.length
                ? html`<ul>
                    ${blockers.map((blocker) => html`<li>${this.#blockerCopy(blocker)}</li>`)}
                  </ul>`
                : nothing}
              ${this._has(`batch_recovery_${review.recovery}`)
                ? html`<p class="supporting">${this._t(`batch_recovery_${review.recovery}`)}</p>`
                : nothing}
            </div>`
          : nothing}
        ${this.#renderNavigation(review)} ${this.#renderRecord(review)}
        ${this.#renderPlan(review, this._job)} ${this.#renderConsent(review)}
        <div class="row">
          <button
            class="primary"
            data-action="print"
            ?disabled=${this._busy ||
            printing ||
            this._job !== null ||
            !mayPrint(preflight, this._acknowledged, this._changed)}
            @click=${() => void this.#print()}
          >
            ${this._t('batch_print', { labels: preflight.attempts.length })}
          </button>
        </div>
      </section>
    `;
  }

  #renderNavigation(review: Review): TemplateResult {
    const preflight = review.preflight;
    const count = preflight.records.length;
    const at = this._focus;
    const jump = (severity: 'error' | 'warning', direction: 1 | -1) =>
      nextFlagged(preflight, at, severity, direction);
    return html`<nav class="row" aria-label=${this._t('batch_navigation')} data-role="navigation">
      <button
        data-action="previous-record"
        ?disabled=${at === 0}
        @click=${() => this.#goTo(at - 1)}
      >
        ${this._t('batch_previous_record')}
      </button>
      <span data-role="position">${this._t('batch_position', { at: at + 1, count })}</span>
      <button
        data-action="next-record"
        ?disabled=${at >= count - 1}
        @click=${() => this.#goTo(at + 1)}
      >
        ${this._t('batch_next_record')}
      </button>
      <button
        data-action="previous-error"
        ?disabled=${jump('error', -1) === null}
        @click=${() => this.#goTo(jump('error', -1))}
      >
        ${this._t('batch_previous_error')}
      </button>
      <button
        data-action="next-error"
        ?disabled=${jump('error', 1) === null}
        @click=${() => this.#goTo(jump('error', 1))}
      >
        ${this._t('batch_next_error')}
      </button>
      <button
        data-action="previous-warning"
        ?disabled=${jump('warning', -1) === null}
        @click=${() => this.#goTo(jump('warning', -1))}
      >
        ${this._t('batch_previous_warning')}
      </button>
      <button
        data-action="next-warning"
        ?disabled=${jump('warning', 1) === null}
        @click=${() => this.#goTo(jump('warning', 1))}
      >
        ${this._t('batch_next_warning')}
      </button>
    </nav>`;
  }

  #renderRecord(review: Review): TemplateResult | typeof nothing {
    const preflight = review.preflight;
    const record = preflight.records[this._focus];
    if (!record) return nothing;
    const severity = recordSeverity(preflight, record.index);
    const diagnostics = recordDiagnostics(preflight, record.index);
    const name = this.#plant(record.subject);
    return html`<div
      class="record"
      data-role="record"
      data-index=${record.index}
      data-severity=${severity}
    >
      <div class="raster">
        ${record.render.raster
          ? html`<img
              src=${record.render.raster.image}
              alt=${this._t('batch_record_alt', { plant: name })}
            />`
          : html`<p class="supporting error">${this._t('print_blocker_no_raster')}</p>`}
      </div>
      <div>
        <h4 tabindex="-1">${name}</h4>
        <p class="supporting ${severity === 'ok' ? '' : severity}">
          ${this._t(`batch_record_${severity}`, { count: diagnostics.length })}
        </p>
        ${diagnostics.length
          ? html`<ul data-role="diagnostics">
              ${diagnostics.map(
                (item) =>
                  html`<li class=${item.diagnostic.severity}>
                    <strong>${this._t(`batch_severity_${item.diagnostic.severity}`)}:</strong>
                    ${this.#first(copyKeys(item.diagnostic), 'diagnostic_severity_warning')}
                  </li>`
              )}
            </ul>`
          : nothing}
      </div>
    </div>`;
  }

  #renderPlan(review: Review, job: BatchJob | null): TemplateResult {
    const statuses = new Map(job?.attempts.map((attempt) => [attempt.id, attempt]) ?? []);
    return html`<div>
      <h4 id="batch-plan">${this._t('batch_plan')}</h4>
      <p class="supporting">${this._t('batch_plan_hint')}</p>
      <ol class="plan" data-role="plan" aria-labelledby="batch-plan">
        ${review.preflight.attempts.map((attempt) => {
          const current = statuses.get(attempt.id);
          const status = current?.status ?? 'queued';
          return html`<li data-attempt=${attempt.id} data-status=${status}>
            ${this._t('batch_attempt', {
              plant: this.#plant(attempt.subject),
              copy: attempt.copy_index,
            })}
            —
            <span class="status" data-status=${status}
              >${this.#first([`batch_status_${status}`], 'batch_status_pending')}</span
            >
            ${current?.error
              ? html`<span class="supporting" data-role="attempt-error">(${current.error})</span>`
              : nothing}
          </li>`;
        })}
      </ol>
    </div>`;
  }

  #renderConsent(review: Review): TemplateResult | typeof nothing {
    const preflight = review.preflight;
    const consent = acknowledgementState(preflight, this._acknowledged);
    if (consent === 'not_required') return nothing;
    return html`<div data-role="acknowledge" data-state=${consent}>
      ${consent === 'stale'
        ? html`<p class="stale" role="alert" data-role="acknowledgement-stale">
            ${this._t('batch_acknowledgement_stale')}
          </p>`
        : nothing}
      <label class="consent">
        <input
          type="checkbox"
          .checked=${consent === 'current'}
          ?disabled=${this._busy || this._job !== null || !preflight.allowed}
          @change=${(e: Event) => this.#acknowledge((e.target as HTMLInputElement).checked)}
        />
        ${this._t('batch_acknowledge', {
          warnings: warningCount(preflight),
          review: preflight.identity.replace(/^sha256:/, '').slice(0, 8),
        })}
      </label>
    </div>`;
  }

  #renderJob(job: BatchJob): TemplateResult {
    const progress = jobProgress(job);
    const failed = failedAttempts(job);
    return html`<section data-section="job" aria-labelledby="batch-job" data-state=${job.state}>
      <h3 id="batch-job">
        ${this._t(job.retry_of ? 'batch_job_retry' : 'batch_job', {
          labels: progress.selected,
        })}
      </h3>
      <progress
        max=${Math.max(progress.selected, 1)}
        .value=${progress.printed + progress.failed}
        aria-label=${this._t('batch_progress', {
          done: progress.printed + progress.failed,
          total: progress.selected,
        })}
      ></progress>
      <p class="supporting" data-role="progress">
        ${this._t('batch_progress_counts', {
          printed: progress.printed,
          failed: progress.failed,
          pending: progress.pending,
        })}
      </p>
      ${job.state === 'refused' && job.refusal
        ? html`<div class="refusal" role="alert" data-role="job-refused">
            <p class="supporting">${this._t('batch_job_refused')}</p>
            <ul>
              ${job.refusal.blocked_by.map(
                (blocker) => html`<li>${this.#blockerCopy(blocker)}</li>`
              )}
            </ul>
            <button data-action="recover" @click=${() => void this.#recover('preflight_again')}>
              ${this._t('batch_recovery_preflight_again')}
            </button>
          </div>`
        : nothing}
      ${progress.finished && job.state !== 'refused'
        ? html`<p class="supporting" data-role="done">
            ${failed.length === 0
              ? this._t('batch_all_printed', { labels: progress.printedOverall })
              : this._t('batch_partial', {
                  printed: progress.printedOverall,
                  failed: failed.length,
                })}
          </p>`
        : nothing}
      ${mayRetry(job)
        ? html`<div data-role="retry">
            <p class="supporting">${this._t('batch_retry_hint')}</p>
            <button
              class="primary"
              data-action="retry"
              ?disabled=${this._busy}
              @click=${() => void this.#retry()}
            >
              ${this._t('batch_retry', { labels: failed.length })}
            </button>
          </div>`
        : nothing}
    </section>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'growspace-label-batch': GrowspaceLabelBatch;
  }
}
