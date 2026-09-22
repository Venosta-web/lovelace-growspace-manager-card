/**
 * `<growspace-label-record-print>` — one strain-library label, printed through
 * a Label Template.
 *
 * The strain library's "Print label" once the integration serves the complete
 * Label Template capability. Three steps, in order:
 *
 * 1. **Setup.** Which published template, printer and profile. The template
 *    starts on the Label Size's Effective Default, the same one a plant or a
 *    batch would print.
 * 2. **Preview.** The backend renders the published revision for this saved
 *    strain and judges it exactly as the print will be. What is on screen is
 *    the bitmap the printer receives, with every reason it may not print.
 * 3. **Print.** The approved raster, by its approval and raster identity. The
 *    card never sends the content again, so it cannot print a label nobody
 *    looked at.
 *
 * A refusal — of the preview or of the print — is shown with the recovery it
 * names, and nothing else happens. In particular nothing here falls back to
 * the Classic `print_label` service: a template that could not print is an
 * answer to show, not a reason to print a different label instead.
 */

import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { localize, localizeWithParams } from '../../../localize/localize';
import { getHass } from '../../../services/hass-call';
import { getPrinters } from '../../shared/ui/printer-status-strip';
import { profilesForSize, type LabelTemplateCapability } from '../../../slices/labels';
import type { LabelRefusal } from '../../../slices/labels/schema';
import { fetchLabelTemplateLibrary } from '../../../slices/labels/drafts';
import { previewLabelRecord, printLabelRecord } from '../../../slices/labels/printing';
import type { PrintOutcome, RecordPreviewAnswer } from '../../../slices/labels/printing-schema';
import { copyKeys } from '../editor/diagnostics';
import { refusalCopy } from '../copy';

type RecordPreview = Extract<RecordPreviewAnswer, { outcome: 'ok' }>;

/** One published template this label may print from. */
interface TemplateOption {
  key: string;
  kind: string;
  id: string;
  name: string;
  labelSizeId: string;
}

/** Recoveries this view performs: a fresh preview, or a setup control to change. */
const PREVIEW_AGAIN = new Set(['refresh_preview', 'retry_preview', 'retry_print']);
const SETUP_CONTROL: Record<string, string> = {
  choose_printer: 'printer',
  select_profile: 'profile',
  choose_template: 'template',
};

@customElement('growspace-label-record-print')
export class GrowspaceLabelRecordPrint extends LitElement {
  @property({ attribute: false }) capability?: LabelTemplateCapability;
  /** The saved strain to print, by the library's own name for it. */
  @property({ type: String }) strain = '';
  @property({ attribute: false }) phenotype: string | null = null;
  @property({ type: String }) language = 'en';

  /** The library's published Named Templates; the Factory Templates come from the capability. */
  @state() private _named: TemplateOption[] = [];
  /** What each Label Size prints by default, as the library resolved it. */
  @state() private _defaults: Record<string, { kind: string; id: string } | undefined> = {};
  @state() private _templateKey = '';
  @state() private _deviceId = '';
  @state() private _profileId = '';
  @state() private _busy: 'preview' | 'print' | null = null;
  @state() private _record: RecordPreview | null = null;
  @state() private _printed: PrintOutcome | null = null;
  @state() private _refusal: LabelRefusal | null = null;
  @state() private _announcement = '';

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
    select {
      min-height: 44px;
      max-width: 100%;
      padding: 6px 8px;
      border-radius: 8px;
      border: 1px solid var(--divider-color);
      background: var(--card-background-color, transparent);
      color: inherit;
      font: inherit;
    }
    button {
      min-height: 44px;
      min-width: 44px;
      max-width: 100%;
      padding: 6px 14px;
      border-radius: 8px;
      border: 1px solid var(--divider-color);
      background: var(--secondary-background-color, transparent);
      color: inherit;
      font: inherit;
      cursor: pointer;
    }
    button.primary {
      /* Darkened from the theme's primary so white text holds 4.5:1 on the
         default blue (2.6:1 undarkened) and on any lighter one. */
      background: color-mix(in srgb, var(--primary-color) 70%, black);
      border-color: transparent;
      color: var(--text-primary-color, #fff);
    }
    button:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }
    button:focus-visible,
    select:focus-visible,
    h3:focus-visible {
      outline: 2px solid var(--primary-color);
      outline-offset: 2px;
    }
    .row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
    }
    .supporting {
      margin: 0;
      line-height: 1.45;
      color: var(--secondary-text-color);
    }
    /* Marked by the border, not the text: error-red body copy is under 4.5:1
       on Home Assistant's dark surfaces. */
    .refusal,
    .error {
      display: flex;
      flex-direction: column;
      gap: 8px;
      border: 2px solid var(--error-color);
      border-radius: 8px;
      padding: 8px 12px;
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
      height: auto;
      image-rendering: pixelated;
      border: 1px solid var(--divider-color);
    }
    ul {
      margin: 0;
      padding-left: 1.25rem;
    }
    .visually-hidden {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
      white-space: nowrap;
    }
  `;

  connectedCallback(): void {
    super.connectedCallback();
    void this.#loadTemplates();
    if (!this._deviceId) this._deviceId = getPrinters(getHass())[0]?.id ?? '';
  }

  protected willUpdate(changed: Map<string | number | symbol, unknown>): void {
    if (changed.has('capability') || changed.has('_named') || changed.has('_defaults')) {
      const templates = this._templates;
      const preferred = this._preferred;
      if (this._record === null && templates.some((item) => item.key === preferred)) {
        this._templateKey = preferred;
      } else if (!templates.some((item) => item.key === this._templateKey)) {
        this._templateKey = templates[0]?.key ?? '';
      }
    }
    if (
      changed.has('capability') ||
      changed.has('_templateKey') ||
      changed.has('_named') ||
      changed.has('_defaults')
    ) {
      if (!this._profiles.some((profile) => profile.id === this._profileId)) {
        this._profileId = this._profiles[0]?.id ?? '';
      }
    }
    // A preview is of one strain; another strain is another label.
    if (changed.has('strain') || changed.has('phenotype')) this.#invalidate();
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

  #blockerCopy(blocker: string): string {
    return this.#first([`print_blocker_${blocker}`], 'print_blocker_generic');
  }

  /** The button that performs a recovery, or null when it is guidance only. */
  #recoveryAction(recovery: string): string | null {
    if (PREVIEW_AGAIN.has(recovery)) return this._t('print_recovery_refresh_preview');
    if (SETUP_CONTROL[recovery]) return this._t(`batch_recovery_${recovery}`);
    return null;
  }

  /** What to do about a recovery this view cannot perform itself. */
  #recoveryGuidance(recovery: string): string | null {
    const key = `record_recovery_${recovery}`;
    return this._has(key) ? this._t(key) : null;
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
      this._named = named;
      this._defaults = Object.fromEntries(
        Object.entries(answer.library.effective_defaults).map(([size, item]) => [size, item?.ref])
      );
    } catch {
      // The Factory Templates are enough to print from; the library is extra.
    }
  }

  /**
   * Where every other print starts: the Effective Default of the size a
   * Classic label defaults to, which is the first one shipped.
   */
  private get _preferred(): string {
    const size = this.capability?.catalogues.factory_templates[0]?.label_size_id;
    const ref = size ? this._defaults[size] : undefined;
    return ref ? `${ref.kind}:${ref.id}` : '';
  }

  private get _templates(): TemplateOption[] {
    return [...this._named, ...this.#factoryOptions()];
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

  /** Anything the preview was taken under changed: it no longer describes the print. */
  #invalidate(): void {
    this._record = null;
    this._printed = null;
  }

  #edit(apply: () => void): void {
    apply();
    this.#invalidate();
  }

  // -------------------------------------------------------------------------
  // Acting
  // -------------------------------------------------------------------------

  #announce(message: string): void {
    this._announcement = message;
  }

  #refused(refusal: LabelRefusal): void {
    this._refusal = refusal;
    this.#announce(refusalCopy(refusal.code, this.language));
  }

  async #run(name: 'preview' | 'print', work: () => Promise<void>): Promise<void> {
    if (this._busy) return;
    this._busy = name;
    this._refusal = null;
    try {
      await work();
    } catch {
      this.#refused({
        code: 'label_template.transport_failed',
        reason: '',
        recovery: name === 'print' ? 'retry_print' : 'retry_preview',
        current: { family: '', major: 0, minor: 0, generation: 0 },
      } as LabelRefusal);
    } finally {
      this._busy = null;
    }
  }

  async #preview(): Promise<void> {
    const template = this._template;
    const deviceId = this._deviceId;
    if (!template || !deviceId || !this.strain) return;
    this._printed = null;
    await this.#run('preview', async () => {
      const answer = await previewLabelRecord({
        template: { kind: template.kind, id: template.id },
        strain: this.strain,
        phenotype: this.phenotype,
        profileId: this._profileId || null,
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
      await this.updateComplete;
      this.renderRoot.querySelector<HTMLElement>('[data-section="preview"] h3')?.focus();
    });
  }

  async #print(): Promise<void> {
    const record = this._record;
    if (!record || !record.decision.allowed) return;
    await this.#run('print', async () => {
      const answer = await printLabelRecord(record.approval_id, record.render.raster_identity);
      // Printed or refused, this approval has been spent: the next label is
      // previewed again, never printed from a picture already used.
      this._record = null;
      if (answer.outcome === 'refused') return this.#refused(answer.refusal);
      this._printed = answer.print;
      this.#announce(this._t('print_record_done', { reference: answer.print.source.reference }));
    });
  }

  async #recover(recovery: string): Promise<void> {
    if (PREVIEW_AGAIN.has(recovery)) {
      this._refusal = null;
      await this.#preview();
      return;
    }
    const control = SETUP_CONTROL[recovery];
    if (control) this.renderRoot.querySelector<HTMLElement>(`select[name="${control}"]`)?.focus();
  }

  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------

  protected render(): TemplateResult | typeof nothing {
    if (!this.capability) return nothing;
    return html`
      ${this.#renderSetup()} ${this.#renderRefusal()}
      ${this._record ? this.#renderPreview(this._record) : nothing}
      ${this._printed
        ? html`<p class="supporting" data-role="printed">
            ${this._t('print_record_done', { reference: this._printed.source.reference })}
          </p>`
        : nothing}
      <p class="visually-hidden" role="status" aria-live="polite" data-role="status">
        ${this._announcement}
      </p>
    `;
  }

  #renderSetup(): TemplateResult {
    const printers = getPrinters(getHass());
    const locked = this._busy !== null;
    const reason = !this.strain
      ? 'no_strain'
      : !this._deviceId
        ? 'no_printer'
        : !this._template
          ? 'no_template'
          : null;
    return html`
      <section data-section="setup" aria-labelledby="record-setup">
        <h3 id="record-setup">${this._t('record_setup')}</h3>
        <p class="supporting">${this._t('record_setup_hint')}</p>
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
        </div>
        ${printers.length === 0
          ? html`<p class="supporting" data-role="no-printer">
              ${this._t('record_no_printer_hint')}
            </p>`
          : nothing}
        <div class="row">
          <button
            class=${this._record ? '' : 'primary'}
            data-action="preview"
            ?disabled=${locked || reason !== null}
            aria-describedby=${reason ? 'record-reason' : nothing}
            @click=${() => void this.#preview()}
          >
            ${this._t(this._record ? 'print_recovery_refresh_preview' : 'record_preview')}
          </button>
        </div>
        ${reason
          ? html`<p class="supporting" id="record-reason" data-reason=${reason}>
              ${this.#first([`record_blocker_${reason}`], `print_blocker_${reason}`)}
            </p>`
          : nothing}
      </section>
    `;
  }

  #renderRecovery(recovery: string): TemplateResult | typeof nothing {
    const action = this.#recoveryAction(recovery);
    if (action) {
      return html`<div class="row">
        <button
          data-action="recover"
          data-recovery=${recovery}
          ?disabled=${this._busy !== null}
          @click=${() => void this.#recover(recovery)}
        >
          ${action}
        </button>
      </div>`;
    }
    const guidance = this.#recoveryGuidance(recovery);
    return guidance
      ? html`<p class="supporting" data-role="guidance" data-recovery=${recovery}>${guidance}</p>`
      : nothing;
  }

  #renderRefusal(): TemplateResult | typeof nothing {
    const refusal = this._refusal;
    if (!refusal) return nothing;
    return html`<div class="refusal" role="alert" data-role="refusal" data-code=${refusal.code}>
      <p class="supporting">${refusalCopy(refusal.code, this.language)}</p>
      ${refusal.blocked_by?.length
        ? html`<ul>
            ${refusal.blocked_by.map((blocker) => html`<li>${this.#blockerCopy(blocker)}</li>`)}
          </ul>`
        : nothing}
      ${this.#renderRecovery(refusal.recovery)}
    </div>`;
  }

  #renderPreview(record: RecordPreview): TemplateResult {
    const decision = record.decision;
    // Errors first: they are why a label does not print, warnings only advise.
    const problems = record.render.diagnostics
      .filter((item) => item.severity === 'error' || item.severity === 'warning')
      .sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'error' ? -1 : 1));
    const warnings = problems.filter((item) => item.severity === 'warning').length;
    return html`
      <section data-section="preview" aria-labelledby="record-preview">
        <h3 id="record-preview" tabindex="-1">
          ${this._t('record_preview_heading', {
            template: record.template.name,
            revision: record.template.revision,
          })}
        </h3>
        <div class="raster">
          ${record.render.raster
            ? html`<img
                src=${record.render.raster.image}
                alt=${this._t('print_record_alt', { subject: record.subject })}
                width=${record.render.raster.width}
                height=${record.render.raster.height}
              />`
            : html`<p class="supporting error" data-role="no-raster">
                ${this._t('print_blocker_no_raster')}
              </p>`}
        </div>
        ${decision.allowed
          ? html`<p class="supporting" data-role="decision" data-allowed="true">
              ${this._t('print_record_ready')}
            </p>`
          : html`<div class="error" data-role="decision" data-allowed="false">
              <p class="supporting">
                ${this._t('print_record_blocked', { count: decision.blocked_by.length })}
              </p>
              <ul data-role="blockers">
                ${decision.blocked_by.map(
                  (blocker) => html`<li data-blocker=${blocker}>${this.#blockerCopy(blocker)}</li>`
                )}
              </ul>
            </div>`}
        ${decision.allowed ? nothing : this.#renderRecovery(record.recovery)}
        ${problems.length
          ? html`<div data-role="diagnostics">
              ${warnings
                ? html`<p class="supporting">
                    ${this._t('print_record_warnings', { count: warnings })}
                  </p>`
                : nothing}
              <ul>
                ${problems.map(
                  (item) =>
                    html`<li data-severity=${item.severity}>
                      <strong>${this._t(`batch_severity_${item.severity}`)}:</strong>
                      ${this.#first(copyKeys(item), `diagnostic_severity_${item.severity}`)}
                    </li>`
                )}
              </ul>
            </div>`
          : nothing}
        <div class="row">
          <button
            class="primary"
            data-action="print"
            ?disabled=${!decision.allowed || this._busy !== null}
            aria-describedby=${decision.allowed ? nothing : 'record-blocked'}
            @click=${() => void this.#print()}
          >
            ${this._t('print_record_action')}
          </button>
        </div>
        ${decision.allowed
          ? nothing
          : html`<p class="supporting" id="record-blocked">
              ${this._t('print_record_blocked_hint')}
            </p>`}
      </section>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'growspace-label-record-print': GrowspaceLabelRecordPrint;
  }
}
