/**
 * `<growspace-label-print-panel>` — getting from a picture to a label.
 *
 * One panel, four steps a user moves through in order, each saying why it is
 * not available yet rather than greying out:
 *
 * 1. **Printer and profile.** Which printer, and which of its Capability
 *    Profiles the raster is compiled for. Changing either stales the raster,
 *    and the session asks for a new one.
 * 2. **Calibration.** Whether this printer has been measured for this profile
 *    and whether that measurement still holds — and, if not, a guided flow:
 *    print the calibration label, read five numbers off it, record them.
 * 3. **Test print.** The draft preview on screen, on paper, exactly as held.
 * 4. **Print one label.** The *published* revision for one saved strain,
 *    previewed and judged exactly as the print will be, then printed.
 *
 * And one note that no step can replace: what is exact (the bitmap), what is
 * calibrated (placement, to a tolerance), and what is physically variable
 * (ink, media, feed). The panel never claims the screen is the paper.
 *
 * Every refusal routes somewhere. A blocker this panel owns — a profile, a
 * calibration, a stale preview — is answered here; one about the layout is
 * handed to the editor as a `recovery` event, because the editor is where the
 * diagnostics and the elements are.
 */

import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';

import { localize, localizeWithParams } from '../../../localize/localize';
import { refusalCopy } from '../copy';
import { variables } from '../../../styles/variables';
import { getHass } from '../../../services/hass-call';
import { getPrinters } from '../../shared/ui/printer-status-strip';
import { fetchStrainLibrary } from '../../../slices/strain';
import { profilesForSize, type LabelTemplateCapability } from '../../../slices/labels';
import type { LabelRefusal } from '../../../slices/labels/schema';
import {
  fetchCalibrationStatus,
  previewLabelRecord,
  printCalibrationSheet,
  printLabelRecord,
  recordCalibration,
  testPrintLabelTemplateDraft,
} from '../../../slices/labels/printing';
import type {
  CalibrationStatus,
  MeasurementBounds,
  PrintOutcome,
  RecordPreviewAnswer,
} from '../../../slices/labels/printing-schema';
import { testPrintApproval, type DraftSession, type SessionState } from './draft-session';
import {
  MEASUREMENT_FIELDS,
  measurementProblems,
  testPrintBlockedBy,
  type MeasurementField,
} from './print-gate';

/** Where the calibration flow is. */
type CalibrationStep = 'closed' | 'print' | 'measure';

type RecordPreview = Extract<RecordPreviewAnswer, { outcome: 'ok' }>;

/** What one strain option is: the library's own row. */
interface StrainOption {
  key: string;
  strain: string;
  phenotype: string;
}

@customElement('growspace-label-print-panel')
export class GrowspaceLabelPrintPanel extends LitElement {
  @property({ attribute: false }) capability?: LabelTemplateCapability;
  @property({ attribute: false }) session?: DraftSession;
  @property({ attribute: false }) model?: SessionState;
  @property({ type: String }) language = 'en';

  @state() private _deviceId: string | null = null;
  @state() private _profileId: string | null = null;
  @state() private _calibration: CalibrationStatus | null = null;
  @state() private _bounds: MeasurementBounds | null = null;
  @state() private _step: CalibrationStep = 'closed';
  @state() private _sheetId: string | null = null;
  @state() private _values: Partial<Record<MeasurementField, string>> = {};
  @state() private _problems: Partial<Record<MeasurementField, string>> = {};
  @state() private _strains: StrainOption[] = [];
  @state() private _strainKey = '';
  @state() private _record: RecordPreview | null = null;
  @state() private _busy: string | null = null;
  /** The last thing that happened, said once in the panel's own live region. */
  @state() private _status = '';
  @state() private _refusal: LabelRefusal | null = null;

  @query('[data-control="profile"]') private _profileSelect?: HTMLSelectElement;
  @query('[data-control="printer"]') private _printerSelect?: HTMLSelectElement;

  static styles = [
    variables,
    css`
      :host {
        display: block;
        color: var(--primary-text-color);
      }
      section {
        border-top: 1px solid var(--divider-color);
        padding-block: 12px;
      }
      h3 {
        margin: 0 0 8px;
        font-size: 1rem;
      }
      h4 {
        margin: 8px 0 4px;
        font-size: 0.9rem;
      }
      .row {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        align-items: end;
      }
      label {
        display: grid;
        gap: 4px;
        font-size: 0.875rem;
      }
      select,
      input,
      button {
        font: inherit;
        min-height: 44px;
        min-width: 44px;
        box-sizing: border-box;
      }
      /* A printer called "B1" is a real name, and a 30 px target. */
      select {
        min-width: 12em;
        max-width: 100%;
      }
      button {
        min-width: 44px;
        padding: 0 16px;
        border-radius: 8px;
        border: 1px solid var(--divider-color);
        background: var(--card-background-color, transparent);
        color: inherit;
        cursor: pointer;
      }
      button.primary {
        /* Darkened from the theme's primary so white text holds 4.5:1 on the
           default blue (2.6:1 undarkened) and on any lighter one. */
        background: color-mix(in srgb, var(--primary-color) 70%, black);
        color: var(--text-primary-color, #fff);
        border-color: transparent;
      }
      button:disabled {
        cursor: not-allowed;
        opacity: 0.6;
      }
      button:focus-visible,
      select:focus-visible,
      input:focus-visible {
        outline: 2px solid var(--primary-color);
        outline-offset: 2px;
      }
      .reason,
      .supporting {
        margin: 4px 0 0;
        font-size: 0.875rem;
        color: var(--secondary-text-color);
      }
      .state {
        display: inline-flex;
        gap: 6px;
        align-items: baseline;
        font-weight: 500;
      }
      /* The state is carried by a written word and a shape, never by colour. */
      .state[data-state='current']::before {
        content: '✓';
      }
      .state[data-state='stale']::before,
      .state[data-state='absent']::before {
        content: '!';
      }
      .measure {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
        gap: 8px;
      }
      .problem {
        margin: 0;
        font-size: 0.8125rem;
        font-weight: 500;
      }
      .problem::before {
        content: '✕ ';
      }
      ul.blockers {
        margin: 4px 0;
        padding-inline-start: 20px;
      }
      .refusal {
        border: 2px solid var(--error-color);
        border-radius: 8px;
        padding: 8px 12px;
        margin-block: 8px;
      }
      img.record {
        display: block;
        max-width: 100%;
        image-rendering: pixelated;
        border: 1px solid var(--divider-color);
      }
      dl.fidelity {
        margin: 0;
        display: grid;
        gap: 4px;
      }
      dl.fidelity dt {
        font-weight: 500;
      }
      dl.fidelity dd {
        margin: 0 0 4px;
        font-size: 0.875rem;
        color: var(--secondary-text-color);
      }
      .visually-hidden {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip: rect(0 0 0 0);
        white-space: nowrap;
      }
      @media (prefers-reduced-motion: reduce) {
        * {
          transition: none !important;
        }
      }
    `,
  ];

  private _t(key: string, params?: Record<string, string | number>): string {
    return params
      ? localizeWithParams(`labels.${key}`, params, this.language)
      : localize(`labels.${key}`, '', '', this.language);
  }

  /** Whether a key has reviewed copy, rather than echoing itself back. */
  private _has(key: string): boolean {
    return this._t(key) !== `labels.${key}` && this._t(key) !== key;
  }

  private get _admin(): boolean {
    return getHass()?.user?.is_admin === true;
  }

  private get _labelSizeId(): string {
    return this.session?.address.labelSizeId ?? '';
  }

  private get _profiles() {
    return this.capability ? profilesForSize(this.capability, this._labelSizeId) : [];
  }

  private get _profile() {
    return this._profiles.find((profile) => profile.id === this._profileId) ?? null;
  }

  connectedCallback(): void {
    super.connectedCallback();
    void this.#loadStrains();
  }

  /**
   * Point a newly given session at this panel's printer and profile.
   *
   * On every session, not once: the editor hands over a new one when the user
   * switches templates, and a session nobody told about the printer would
   * keep rendering for the default profile while this panel showed another.
   */
  protected willUpdate(changed: Map<string | number | symbol, unknown>): void {
    if (!changed.has('session') && !changed.has('capability')) return;
    if (!this.session || !this.capability) return;
    const printers = getPrinters(getHass());
    this._deviceId ??= printers[0]?.id ?? null;
    if (!this._profiles.some((profile) => profile.id === this._profileId)) {
      this._profileId = this._profiles[0]?.id ?? null;
    }
    this.#applyTarget();
  }

  /** Open a step from outside: where the editor's diagnostics send a user. */
  async reveal(destination: 'profile' | 'calibration'): Promise<void> {
    await this.updateComplete;
    if (destination === 'calibration') {
      this._step = this._admin ? 'print' : 'closed';
      await this.updateComplete;
      this.renderRoot.querySelector<HTMLElement>('[data-section="calibration"] h3')?.focus();
      this.renderRoot
        .querySelector<HTMLElement>('[data-section="calibration"]')
        ?.scrollIntoView?.({ block: 'nearest' });
      return;
    }
    (this._profileSelect ?? this._printerSelect)?.focus();
  }

  #announce(message: string): void {
    this._status = message;
  }

  #applyTarget(): void {
    this.session?.setTarget({ profileId: this._profileId, deviceId: this._deviceId });
    this._record = null;
    void this.#loadCalibration();
  }

  async #loadCalibration(): Promise<void> {
    this._calibration = null;
    if (!this._deviceId || !this._profileId) return;
    try {
      const answer = await fetchCalibrationStatus({
        profileId: this._profileId,
        deviceId: this._deviceId,
      });
      if (answer.outcome === 'refused') {
        this._refusal = answer.refusal;
        return;
      }
      this._calibration = answer.calibration;
      this._bounds = answer.bounds;
    } catch {
      // An older backend without the command: the panel still shows the
      // profile and the test print, and says nothing it cannot know.
      this._calibration = null;
    }
  }

  async #loadStrains(): Promise<void> {
    try {
      const entries = await fetchStrainLibrary();
      this._strains = entries.map((entry) => ({
        key: entry.key,
        strain: entry.strain,
        phenotype: entry.phenotype,
      }));
      this._strainKey ||= this._strains[0]?.key ?? '';
    } catch {
      this._strains = [];
    }
  }

  // -------------------------------------------------------------------------
  // Acting
  // -------------------------------------------------------------------------

  /** Take one refusal: answer it here if it is ours, hand it up if not. */
  #refused(refusal: LabelRefusal): void {
    this._refusal = refusal;
    this.#announce(this.#refusalCopy(refusal));
  }

  async #run(name: string, work: () => Promise<void>): Promise<void> {
    if (this._busy) return;
    this._busy = name;
    this._refusal = null;
    try {
      await work();
    } catch (error) {
      this.#refused({
        code: 'label_template.transport_failed',
        reason: error instanceof Error ? error.message : String(error),
        recovery: 'none',
        current: { family: '', major: 0, minor: 0, generation: 0 },
      });
    } finally {
      this._busy = null;
    }
  }

  #printed(outcome: PrintOutcome, key: string): void {
    this.#announce(this._t(key, { reference: outcome.source.reference }));
  }

  async #printSheet(): Promise<void> {
    const profileId = this._profileId;
    const deviceId = this._deviceId;
    if (!profileId || !deviceId) return;
    await this.#run('sheet', async () => {
      const answer = await printCalibrationSheet({ profileId, deviceId });
      if (answer.outcome === 'refused') return this.#refused(answer.refusal);
      this._sheetId = answer.sheet_id;
      this._bounds = answer.bounds;
      this._values = {};
      this._problems = {};
      this._step = 'measure';
      this.#announce(this._t('print_calibration_sheet_printed'));
      await this.updateComplete;
      this.renderRoot.querySelector<HTMLInputElement>('input[data-measure="top_mm"]')?.focus();
    });
  }

  async #recordMeasurement(event: Event): Promise<void> {
    event.preventDefault();
    const bounds = this._bounds;
    const sheetId = this._sheetId;
    if (!bounds || !sheetId) return;
    const { measurement, problems } = measurementProblems(this._values, bounds);
    this._problems = Object.fromEntries(problems.map((item) => [item.field, item.reason]));
    if (measurement === null) {
      this.#announce(this._t('print_measure_problems', { count: problems.length }));
      await this.updateComplete;
      this.renderRoot
        .querySelector<HTMLInputElement>(`input[data-measure="${problems[0].field}"]`)
        ?.focus();
      return;
    }
    await this.#run('record', async () => {
      const answer = await recordCalibration(sheetId, measurement);
      if (answer.outcome === 'refused') {
        const field = answer.refusal.field as MeasurementField | null | undefined;
        if (field && MEASUREMENT_FIELDS.includes(field)) {
          this._problems = { [field]: 'refused' };
        }
        if (answer.refusal.recovery === 'print_calibration_sheet') this._step = 'print';
        return this.#refused(answer.refusal);
      }
      this._calibration = answer.calibration;
      this._step = 'closed';
      this._sheetId = null;
      this._record = null;
      this.#announce(this._t('print_calibration_recorded'));
    });
  }

  async #testPrint(): Promise<void> {
    const model = this.model;
    const session = this.session;
    const approval = model ? testPrintApproval(model) : null;
    if (!session || !approval || !this._deviceId) return;
    const deviceId = this._deviceId;
    await this.#run('test', async () => {
      const answer = await testPrintLabelTemplateDraft(session.address, approval, deviceId);
      if (answer.outcome === 'refused') return this.#refused(answer.refusal);
      this.#printed(answer.print, 'print_test_done');
    });
  }

  /** The published template this draft belongs to, or nothing to print yet. */
  private get _publishedRef(): { kind: string; id: string } | null {
    const templateId = this.model?.draft?.template_id ?? null;
    return templateId ? { kind: 'named', id: templateId } : null;
  }

  async #previewRecord(): Promise<void> {
    const template = this._publishedRef;
    const option = this._strains.find((item) => item.key === this._strainKey);
    if (!template || !option || !this._deviceId) return;
    const deviceId = this._deviceId;
    await this.#run('preview', async () => {
      const answer = await previewLabelRecord({
        template,
        strain: option.strain,
        phenotype: option.phenotype,
        profileId: this._profileId,
        deviceId,
      });
      if (answer.outcome === 'refused') {
        this._record = null;
        return this.#refused(answer.refusal);
      }
      this._record = answer;
      this.#announce(
        answer.decision.allowed
          ? this._t('print_record_ready')
          : this._t('print_record_blocked', { count: answer.decision.blocked_by.length })
      );
    });
  }

  async #printRecord(): Promise<void> {
    const record = this._record;
    if (!record || !record.decision.allowed) return;
    await this.#run('print', async () => {
      const answer = await printLabelRecord(record.approval_id, record.render.raster_identity);
      if (answer.outcome === 'refused') {
        this._record = null;
        return this.#refused(answer.refusal);
      }
      this.#printed(answer.print, 'print_record_done');
    });
  }

  /** Go where a refusal or a blocker says to go. */
  async #follow(recovery: string): Promise<void> {
    switch (recovery) {
      case 'select_profile':
      case 'choose_printer':
        await this.reveal('profile');
        return;
      case 'calibrate':
      case 'print_calibration_sheet':
        await this.reveal('calibration');
        return;
      case 'refresh_preview':
        if (this._record) await this.#previewRecord();
        else await this.session?.render();
        return;
      case 'retry_preview':
        await this.session?.render();
        return;
      default:
        // Layout, content and publishing are the editor's to answer.
        this.dispatchEvent(
          new CustomEvent('recovery', { detail: { recovery }, bubbles: true, composed: true })
        );
    }
  }

  // -------------------------------------------------------------------------
  // Copy
  // -------------------------------------------------------------------------

  #refusalCopy(refusal: LabelRefusal): string {
    return refusalCopy(refusal.code, this.language);
  }

  #blockerCopy(blocker: string): string {
    const key = `print_blocker_${blocker}`;
    return this._has(key) ? this._t(key) : this._t('print_blocker_generic');
  }

  #recoveryLabel(recovery: string): string | null {
    const key = `print_recovery_${recovery}`;
    return this._has(key) ? this._t(key) : null;
  }

  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------

  #renderTarget(): TemplateResult {
    const printers = getPrinters(getHass());
    const profile = this._profile;
    return html`
      <section data-section="target" aria-labelledby="print-target">
        <h3 id="print-target">${this._t('print_target')}</h3>
        <div class="row">
          <label>
            ${this._t('print_printer')}
            <select
              data-control="printer"
              .value=${this._deviceId ?? ''}
              @change=${(event: Event) => {
                this._deviceId = (event.target as HTMLSelectElement).value || null;
                this.#applyTarget();
              }}
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
              data-control="profile"
              .value=${this._profileId ?? ''}
              @change=${(event: Event) => {
                this._profileId = (event.target as HTMLSelectElement).value || null;
                this.#applyTarget();
              }}
            >
              ${this._profiles.map(
                (item) =>
                  html`<option value=${item.id} ?selected=${item.id === this._profileId}>
                    ${item.printer_class} · ${item.dpi} dpi
                  </option>`
              )}
            </select>
          </label>
        </div>
        ${printers.length === 0
          ? html`<p class="reason" data-role="no-printer">${this._t('print_no_printer_hint')}</p>`
          : nothing}
        ${profile
          ? html`<p class="supporting" data-role="evidence" data-evidence=${profile.evidence}>
              ${this._t(
                profile.authorizes_production
                  ? 'print_evidence_verified'
                  : 'print_evidence_provisional'
              )}
            </p>`
          : nothing}
      </section>
    `;
  }

  #renderCalibration(): TemplateResult {
    const status = this._calibration;
    const state = status?.state ?? 'unknown';
    const stateKey = ['current', 'stale', 'absent'].includes(state)
      ? `print_calibration_${state}`
      : 'print_calibration_unknown';
    return html`
      <section data-section="calibration" aria-labelledby="print-calibration">
        <h3 id="print-calibration" tabindex="-1">${this._t('print_calibration')}</h3>
        ${this._deviceId
          ? html`<p class="state" data-role="calibration-state" data-state=${state}>
              ${this._t(stateKey, { days: status?.age_days ?? 0 })}
            </p>`
          : html`<p class="reason">${this._t('print_blocker_no_printer')}</p>`}
        ${status && status.stale_reasons.length > 0
          ? html`<p class="supporting" data-role="stale-reasons">
              ${this._t('print_calibration_moved', { fields: status.stale_reasons.join(', ') })}
            </p>`
          : nothing}
        ${status?.warnings.includes('calibration_older_than_recommended')
          ? html`<p class="supporting" data-role="calibration-age">
              ${this._t('print_calibration_old', { days: status.age_days ?? 0 })}
            </p>`
          : nothing}
        ${this.#renderCalibrationFlow()}
      </section>
    `;
  }

  #renderCalibrationFlow(): TemplateResult {
    const available = this._admin && !!this._deviceId && !!this._profileId;
    if (this._step === 'closed') {
      return html`
        <button
          data-action="calibrate"
          ?disabled=${!available}
          aria-describedby=${available ? nothing : 'calibrate-reason'}
          @click=${() => {
            this._step = 'print';
          }}
        >
          ${this._t(
            this._calibration?.state === 'current'
              ? 'print_calibrate_again'
              : 'print_calibrate_start'
          )}
        </button>
        ${available
          ? nothing
          : html`<p class="reason" id="calibrate-reason">
              ${this._t(this._admin ? 'print_blocker_no_printer' : 'print_blocker_not_admin')}
            </p>`}
      `;
    }
    if (this._step === 'print') {
      return html`
        <h4>${this._t('print_calibration_step_print')}</h4>
        <p class="supporting">${this._t('print_calibration_step_print_hint')}</p>
        <div class="row">
          <button
            class="primary"
            data-action="print-sheet"
            ?disabled=${!available || this._busy !== null}
            @click=${() => void this.#printSheet()}
          >
            ${this._t('print_calibration_print_sheet')}
          </button>
          <button data-action="cancel-calibration" @click=${() => (this._step = 'closed')}>
            ${this._t('print_cancel')}
          </button>
        </div>
      `;
    }
    const bounds = this._bounds;
    return html`
      <form @submit=${(event: Event) => void this.#recordMeasurement(event)} novalidate>
        <h4>${this._t('print_calibration_step_measure')}</h4>
        <p class="supporting">${this._t('print_calibration_step_measure_hint')}</p>
        <div class="measure">
          ${MEASUREMENT_FIELDS.map((field) => {
            const problem = this._problems[field];
            return html`
              <label>
                ${this._t(`print_measure_${field}`)}
                <input
                  type="text"
                  inputmode="decimal"
                  data-measure=${field}
                  aria-invalid=${problem ? 'true' : 'false'}
                  aria-describedby=${`hint-${field}${problem ? ` problem-${field}` : ''}`}
                  .value=${this._values[field] ?? ''}
                  @input=${(event: Event) => {
                    this._values = {
                      ...this._values,
                      [field]: (event.target as HTMLInputElement).value,
                    };
                  }}
                />
                <span class="reason" id=${`hint-${field}`}>
                  ${this._t(
                    field === 'feed_mm' ? 'print_measure_hint_feed' : 'print_measure_hint_edge',
                    {
                      quantum: bounds?.quantum_mm ?? 0.01,
                    }
                  )}
                </span>
                ${problem
                  ? html`<p class="problem" id=${`problem-${field}`} data-problem=${problem}>
                      ${this._t(`print_measure_problem_${problem}`)}
                    </p>`
                  : nothing}
              </label>
            `;
          })}
        </div>
        <div class="row">
          <button
            class="primary"
            type="submit"
            data-action="record"
            ?disabled=${this._busy !== null}
          >
            ${this._t('print_calibration_record')}
          </button>
          <button type="button" data-action="reprint" @click=${() => (this._step = 'print')}>
            ${this._t('print_calibration_reprint')}
          </button>
        </div>
      </form>
    `;
  }

  #renderTestPrint(model: SessionState): TemplateResult {
    const blocked = testPrintBlockedBy(model, { admin: this._admin, deviceId: this._deviceId });
    const blockers =
      blocked === 'blocked' ? (model.render?.eligibility.test_print?.blocked_by ?? []) : [];
    return html`
      <section data-section="test-print" aria-labelledby="print-test">
        <h3 id="print-test">${this._t('print_test')}</h3>
        <p class="supporting">${this._t('print_test_hint')}</p>
        <button
          class="primary"
          data-action="test-print"
          ?disabled=${blocked !== null || this._busy !== null}
          aria-describedby=${blocked ? 'test-reason' : nothing}
          @click=${() => void this.#testPrint()}
        >
          ${this._t('print_test_action')}
        </button>
        ${blocked
          ? html`<p class="reason" id="test-reason" data-reason=${blocked}>
              ${this.#blockerCopy(blocked)}
            </p>`
          : nothing}
        ${blockers.length > 0 ? this.#renderBlockers(blockers) : nothing}
      </section>
    `;
  }

  #renderBlockers(blockers: readonly string[]): TemplateResult {
    return html`
      <ul class="blockers" data-role="blockers">
        ${blockers.map(
          (blocker) => html`<li data-blocker=${blocker}>${this.#blockerCopy(blocker)}</li>`
        )}
      </ul>
    `;
  }

  #renderRecord(): TemplateResult {
    const template = this._publishedRef;
    const record = this._record;
    const ready = !!template && !!this._deviceId && !!this._strainKey;
    const reason = !template
      ? 'unpublished'
      : !this._deviceId
        ? 'no_printer'
        : !this._strainKey
          ? 'no_strain'
          : null;
    const recovery = record && !record.decision.allowed ? record.recovery : null;
    const recoveryLabel = recovery ? this.#recoveryLabel(recovery) : null;
    return html`
      <section data-section="record" aria-labelledby="print-record">
        <h3 id="print-record">${this._t('print_record')}</h3>
        <p class="supporting">${this._t('print_record_hint')}</p>
        <div class="row">
          <label>
            ${this._t('print_strain')}
            <select
              data-control="strain"
              .value=${this._strainKey}
              @change=${(event: Event) => {
                this._strainKey = (event.target as HTMLSelectElement).value;
                this._record = null;
              }}
            >
              ${this._strains.length === 0
                ? html`<option value="">${this._t('print_no_strains')}</option>`
                : this._strains.map(
                    (option) =>
                      html`<option value=${option.key} ?selected=${option.key === this._strainKey}>
                        ${option.phenotype && option.phenotype !== 'default'
                          ? `${option.strain} · ${option.phenotype}`
                          : option.strain}
                      </option>`
                  )}
            </select>
          </label>
          <button
            data-action="preview-record"
            ?disabled=${!ready || this._busy !== null}
            aria-describedby=${reason ? 'record-reason' : nothing}
            @click=${() => void this.#previewRecord()}
          >
            ${this._t('print_record_preview')}
          </button>
        </div>
        ${reason
          ? html`<p class="reason" id="record-reason" data-reason=${reason}>
              ${this.#blockerCopy(reason)}
            </p>`
          : nothing}
        ${record
          ? html`
              ${record.render.raster
                ? html`<img
                    class="record"
                    src=${record.render.raster.image}
                    alt=${this._t('print_record_alt', { subject: record.subject })}
                    width=${record.render.raster.width}
                    height=${record.render.raster.height}
                  />`
                : html`<p class="reason">${this._t('print_blocker_no_raster')}</p>`}
              ${record.decision.allowed
                ? nothing
                : this.#renderBlockers(record.decision.blocked_by)}
              ${this.#renderWarnings(record)}
              <div class="row">
                <button
                  class="primary"
                  data-action="print-record"
                  ?disabled=${!record.decision.allowed || this._busy !== null}
                  aria-describedby=${record.decision.allowed ? nothing : 'record-blocked'}
                  @click=${() => void this.#printRecord()}
                >
                  ${this._t('print_record_action')}
                </button>
                ${recovery && recoveryLabel
                  ? html`<button
                      data-action="follow"
                      data-recovery=${recovery}
                      @click=${() => void this.#follow(recovery)}
                    >
                      ${recoveryLabel}
                    </button>`
                  : nothing}
              </div>
              ${record.decision.allowed
                ? nothing
                : html`<p class="reason" id="record-blocked">
                    ${this._t('print_record_blocked_hint')}
                  </p>`}
            `
          : nothing}
      </section>
    `;
  }

  /** Warnings are shown and never have to be acknowledged. */
  #renderWarnings(record: RecordPreview): TemplateResult | typeof nothing {
    const warnings = record.render.diagnostics.filter((item) => item.severity === 'warning');
    if (warnings.length === 0) return nothing;
    return html`<p class="supporting" data-role="record-warnings">
      ${this._t('print_record_warnings', { count: warnings.length })}
    </p>`;
  }

  #renderRefusal(): TemplateResult | typeof nothing {
    const refusal = this._refusal;
    if (!refusal) return nothing;
    const label = this.#recoveryLabel(refusal.recovery);
    return html`
      <div class="refusal" role="alert" data-code=${refusal.code}>
        <p>${this.#refusalCopy(refusal)}</p>
        ${refusal.blocked_by && refusal.blocked_by.length > 0
          ? this.#renderBlockers(refusal.blocked_by)
          : nothing}
        <div class="row">
          ${label
            ? html`<button
                data-action="follow"
                data-recovery=${refusal.recovery}
                @click=${() => {
                  this._refusal = null;
                  void this.#follow(refusal.recovery);
                }}
              >
                ${label}
              </button>`
            : nothing}
          <button data-action="dismiss-refusal" @click=${() => (this._refusal = null)}>
            ${this._t('editor_dismiss')}
          </button>
        </div>
      </div>
    `;
  }

  #renderFidelity(model: SessionState): TemplateResult {
    const quantum = this._bounds?.quantum_mm;
    return html`
      <section data-section="fidelity" aria-labelledby="print-fidelity">
        <h3 id="print-fidelity">${this._t('print_fidelity')}</h3>
        <dl class="fidelity">
          <dt>${this._t('print_fidelity_exact')}</dt>
          <dd data-role="fidelity-exact" data-settled=${model.rasterStanding === 'settled'}>
            ${this._t(
              model.rasterStanding === 'settled'
                ? 'print_fidelity_exact_settled'
                : 'print_fidelity_exact_not_settled'
            )}
          </dd>
          <dt>${this._t('print_fidelity_calibrated')}</dt>
          <dd data-role="fidelity-calibrated">
            ${this._calibration?.state === 'current'
              ? this._t('print_fidelity_calibrated_current', { quantum: quantum ?? 0.01 })
              : this._t('print_fidelity_calibrated_none')}
          </dd>
          <dt>${this._t('print_fidelity_physical')}</dt>
          <dd data-role="fidelity-physical">${this._t('print_fidelity_physical_detail')}</dd>
        </dl>
      </section>
    `;
  }

  protected render(): TemplateResult | typeof nothing {
    const model = this.model;
    if (!model || !this.capability) return nothing;
    return html`
      <h2>${this._t('print_heading')}</h2>
      ${this.#renderRefusal()} ${this.#renderTarget()} ${this.#renderCalibration()}
      ${this.#renderTestPrint(model)} ${this.#renderRecord()} ${this.#renderFidelity(model)}
      <p class="visually-hidden" role="status" aria-live="polite" data-role="print-status">
        ${this._status}
      </p>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'growspace-label-print-panel': GrowspaceLabelPrintPanel;
  }
}
