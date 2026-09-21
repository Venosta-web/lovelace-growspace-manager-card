/** Lifecycle controls extend the existing HA dialog: library rows, explicit consequences,
 * and an inline review step. Opaque recovery data never enters the editing parser. */
import { LitElement, html, css, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { z } from 'zod';
import { localize } from '../../localize/localize';
import { getHass } from '../../services/hass-call';
import { TemplateDraftSchema, type LabelTemplateCapability } from '../../slices/labels';
import {
  manageTemplates,
  watchTemplateLibrary,
  downloadTemplateData,
  InspectionSchema,
  PreflightSchema,
  type ManagementLibrary,
  type Operation,
  type RecoveryDraft,
} from '../../slices/labels/management';
import type { DraftSession } from './editor/draft-session';

interface Action {
  operation: Operation;
  payload: Record<string, unknown>;
  name?: string;
  generation: number;
  key: string;
}
@customElement('growspace-template-library')
export class GrowspaceTemplateLibrary extends LitElement {
  @property({ attribute: false }) capability?: LabelTemplateCapability;
  @property() labelSizeId = '';
  @property() language = 'en';
  @property({ attribute: false }) session: DraftSession | null = null;
  @state() private library: ManagementLibrary | null = null;
  @state() private failure = '';
  @state() private busy = false;
  @state() private action: Action | null = null;
  @state() private inspection: z.infer<typeof InspectionSchema> | null = null;
  @state() private recovery: RecoveryDraft | null = null;
  @state() private preflight: z.infer<typeof PreflightSchema> | null = null;
  @state() private bundle: unknown = null;
  @state() private copies: string[] = [];
  @state() private names: Record<string, string> = {};
  private stop?: () => void;
  private reading = 0;
  static styles = css`
    :host {
      display: block;
      color: var(--primary-text-color);
    }
    section {
      margin-block: 20px;
    }
    h3 {
      margin: 0 0 8px;
    }
    p {
      line-height: 1.5;
      max-width: 70ch;
    }
    .row {
      padding-block: 12px;
      border-bottom: 1px solid var(--divider-color);
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-block: 8px;
    }
    button,
    input {
      font: inherit;
      color: inherit;
      background: var(--card-background-color);
      border: 1px solid var(--divider-color);
      border-radius: 8px;
      min-height: 44px;
      padding: 8px 12px;
      box-sizing: border-box;
    }
    button {
      cursor: pointer;
    }
    button:hover {
      background: var(--secondary-background-color);
    }
    button:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }
    :focus-visible {
      outline: 2px solid var(--primary-color);
      outline-offset: 2px;
    }
    label {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      margin-block: 8px;
    }
    input {
      max-width: 100%;
    }
    input[type='checkbox'] {
      min-height: 24px;
    }
    .review {
      padding: 16px;
      background: var(--secondary-background-color);
      border-radius: 8px;
    }
    .error {
      color: var(--error-color);
    }
    .muted {
      color: var(--secondary-text-color);
    }
    pre {
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      max-height: 240px;
      overflow: auto;
      font-size: 12px;
    }
    small {
      display: block;
      overflow-wrap: anywhere;
    }
    details {
      margin-block: 12px;
    }
    summary {
      min-height: 44px;
      cursor: pointer;
    }
  `;
  private t(key: string): string {
    return localize(`labels.library_${key}`, '', '', this.language);
  }
  connectedCallback(): void {
    super.connectedCallback();
    void this.refresh();
    void watchTemplateLibrary(() => void this.refresh())
      .then((stop) => {
        if (this.isConnected) this.stop = stop;
        else stop();
      })
      .catch((error) => {
        this.failure = String(error);
      });
  }
  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.stop?.();
    this.reading++;
  }
  protected updated(changed: PropertyValues<this>): void {
    if (changed.has('session') && this.library && this.session) {
      this.session.observeLibrary(this.library);
    }
  }
  async refresh(): Promise<void> {
    const read = ++this.reading;
    try {
      const answer = await manageTemplates('snapshot');
      if (read !== this.reading || !this.isConnected) return;
      if (answer.outcome === 'refused') {
        this.failure = answer.refusal.reason;
        this.session?.refuse(answer.refusal);
        return;
      }
      this.library = answer.library;
      this.session?.observeLibrary(answer.library);
    } catch (error) {
      if (read === this.reading) this.failure = String(error);
    }
  }
  private button(label: string, run: () => void, disabled = false): TemplateResult {
    return html`<button
      type="button"
      data-action=${label}
      ?disabled=${this.busy || disabled}
      @click=${run}
    >
      ${this.t(label)}
    </button>`;
  }
  private stage(operation: Operation, payload: Record<string, unknown>, name?: string): void {
    if (this.library?.generation == null) return;
    const storedDraft = this.library.drafts.find((draft) =>
      payload.template_id
        ? draft.template_id === payload.template_id
        : draft.label_size_id === payload.label_size_id && draft.template_id === null
    );
    if (['reload', 'replace_factory', 'discard', 'save_as'].includes(operation) && storedDraft)
      payload = { ...payload, expected_draft_version: storedDraft.version };
    if (operation === 'save_as' && this.session) {
      payload = { ...payload, recovery_document: structuredClone(this.session.state.document) };
    }
    this.action = {
      operation,
      payload,
      name,
      generation: this.library.generation,
      key: crypto.randomUUID(),
    };
    this.failure = '';
  }
  private async commit(): Promise<void> {
    const action = this.action;
    if (!action || this.busy) return;
    this.busy = true;
    try {
      const answer = await manageTemplates(
        action.operation,
        { ...action.payload, ...(action.name !== undefined ? { name: action.name } : {}) },
        { generation: action.generation, key: action.key }
      );
      if (answer.outcome === 'refused') {
        this.failure = answer.refusal.reason;
        this.action = null;
        await this.refresh();
        return;
      }
      this.library = answer.library;
      if (
        this.session &&
        (action.operation === 'reload' || action.operation === 'replace_factory')
      ) {
        const draft = TemplateDraftSchema.parse(answer.result);
        if (action.operation === 'replace_factory') this.session.replaceFromFactory(draft);
        else this.session.adopt(draft, null);
      }
      if (action.operation === 'save_as') {
        const result = z
          .object({ template: z.object({ id: z.string(), label_size_id: z.string() }) })
          .parse(answer.result);
        this.dispatchEvent(
          new CustomEvent('open-template', {
            detail: { templateId: result.template.id, labelSizeId: result.template.label_size_id },
            bubbles: true,
            composed: true,
          })
        );
      }
      if (action.operation === 'discard' && this.session)
        this.dispatchEvent(new CustomEvent('close-editor', { bubbles: true, composed: true }));
      this.session?.observeLibrary(answer.library);
      this.action = null;
      this.inspection = null;
      this.recovery = null;
      if (action.operation === 'import') {
        this.bundle = null;
        this.preflight = null;
      }
      this.failure = '';
    } catch (error) {
      this.failure = `${this.t('retry_same')} ${String(error)}`;
    } finally {
      this.busy = false;
    }
  }
  private async read(
    operation: 'inspect' | 'export',
    payload: Record<string, unknown>
  ): Promise<void> {
    this.busy = true;
    try {
      const answer = await manageTemplates(operation, payload);
      if (answer.outcome === 'refused') {
        this.failure = answer.refusal.reason;
        return;
      }
      this.library = answer.library;
      if (operation === 'inspect') this.inspection = InspectionSchema.parse(answer.result);
      else downloadTemplateData(answer.result, 'label-templates.json');
    } catch (error) {
      this.failure = String(error);
    } finally {
      this.busy = false;
    }
  }
  private async checkImport(): Promise<void> {
    this.busy = true;
    this.preflight = null;
    try {
      const answer = await manageTemplates('preflight', {
        bundle: this.bundle,
        as_copy: this.copies,
        names: this.names,
      });
      if (answer.outcome === 'refused') {
        this.failure = answer.refusal.reason;
        return;
      }
      this.library = answer.library;
      this.preflight = PreflightSchema.parse(answer.result);
      this.failure = '';
    } catch (error) {
      this.failure = String(error);
    } finally {
      this.busy = false;
    }
  }
  private async upload(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.preflight = null;
    this.copies = [];
    this.names = {};
    this.action = null;
    try {
      this.bundle = JSON.parse(await file.text());
      await this.checkImport();
    } catch (error) {
      this.bundle = null;
      this.failure = String(error);
    }
  }
  private open(templateId?: string, blank = false, draft?: RecoveryDraft): void {
    this.dispatchEvent(
      new CustomEvent('open-template', {
        detail: { templateId, labelSizeId: draft?.label_size_id ?? this.labelSizeId, blank, draft },
        bubbles: true,
        composed: true,
      })
    );
  }
  private review(): TemplateResult | typeof nothing {
    const action = this.action;
    if (!action) return nothing;
    return html`<section class="review" role="region" aria-label=${this.t(action.operation)}>
      <h3>${this.t(action.operation)}</h3>
      <p>${this.t(`${action.operation}_effect`)}</p>
      ${action.name === undefined
        ? nothing
        : html`<label
            >${this.t('name')}<input
              .value=${action.name}
              @input=${(event: Event) => {
                this.action = {
                  ...action,
                  name: (event.target as HTMLInputElement).value,
                  key: crypto.randomUUID(),
                };
              }}
          /></label>`}
      <div class="actions">
        ${this.button(
          'confirm',
          () => void this.commit(),
          action.name !== undefined && !action.name.trim()
        )}${this.button('cancel', () => {
          this.action = null;
        })}
      </div>
    </section>`;
  }
  private editorActions(): TemplateResult {
    const draft = this.session?.state.draft;
    if (!draft) return html``;
    const payload = {
      ...(draft.template_id
        ? { template_id: draft.template_id }
        : { label_size_id: draft.label_size_id }),
      draft_id: draft.id,
    };
    return html`<div class="actions">
      ${this.button('save_as', () => this.stage('save_as', payload, ''))}
      ${this.button('export_work', () =>
        downloadTemplateData(
          { ...draft, document: this.session?.state.document },
          'label-draft-recovery.json'
        )
      )}
      ${draft.template_id
        ? html`${this.button('reload', () =>
            this.stage('reload', { template_id: draft.template_id })
          )}${this.button('replace_factory', () =>
            this.stage('replace_factory', { template_id: draft.template_id })
          )}`
        : nothing}
    </div>`;
  }
  private exportEditorWork(): TemplateResult | typeof nothing {
    const draft = this.session?.state.draft;
    if (!draft) return nothing;
    return this.button('export_work', () =>
      downloadTemplateData(
        { ...draft, document: this.session?.state.document },
        'label-draft-recovery.json'
      )
    );
  }
  protected render(): TemplateResult | typeof nothing {
    if (getHass()?.user && !getHass()?.user?.is_admin)
      return html`<p role="alert">${this.t('admin')}</p>
        ${this.exportEditorWork()}`;
    const library = this.library;
    return html`
      ${this.failure
        ? html`<p class="error" role="alert">${this.failure}</p>
            ${this.button('refresh', () => void this.refresh())}`
        : nothing}
      ${this.busy ? html`<p role="status">${this.t('working')}</p>` : nothing} ${this.review()}
      ${!library
        ? html`<p role="status">${this.t('loading')}</p>`
        : !library.store.readable
          ? html`<p role="alert">
              ${this.t('newer_store')} ${library.store.found_version} / ${library.store.version}
            </p>`
          : this.session
            ? this.editorActions()
            : this.catalogue(library)}
    `;
  }
  private catalogue(library: ManagementLibrary): TemplateResult {
    const templates = library.templates.filter((item) => item.label_size_id === this.labelSizeId);
    const effective = library.effective_defaults[this.labelSizeId];
    return html`<section>
        <h3>${this.t('title')}</h3>
        <p>${this.t('default')}: ${effective?.name ?? this.t('unavailable')}</p>
        <div class="actions">
          ${this.button('blank', () => this.open(undefined, true))}${this.button(
            'clear_default',
            () => this.stage('clear_default', { label_size_id: this.labelSizeId }),
            !library.defaults[this.labelSizeId]
          )}
        </div>
        ${templates.length
          ? templates.map(
              (item) =>
                html`<div class="row">
                  <strong>${item.name}</strong> · r${item.head_revision}
                  ${item.quarantined
                    ? html`<p class="error">${this.t('quarantined')}</p>
                        <ul>
                          ${item.quarantine?.diagnostics.map((d) => html`<li>${d.message}</li>`)}
                        </ul>`
                    : nothing}
                  <div class="actions">
                    ${this.button('edit', () => this.open(item.id), item.quarantined)}
                    ${this.button('rename', () =>
                      this.stage('rename', { template_id: item.id }, item.name)
                    )}
                    ${this.button(
                      'duplicate',
                      () => this.stage('duplicate', { ref: { kind: 'named', id: item.id } }, ''),
                      item.quarantined
                    )}
                    ${this.button(
                      'set_default',
                      () =>
                        this.stage('set_default', {
                          label_size_id: item.label_size_id,
                          ref: { kind: 'named', id: item.id },
                        }),
                      item.quarantined
                    )}
                    ${this.button(
                      'inspect',
                      () => void this.read('inspect', { template_id: item.id })
                    )}
                    ${this.button(
                      'export',
                      () => void this.read('export', { refs: [{ kind: 'named', id: item.id }] })
                    )}
                    ${this.button('replace_factory', () =>
                      this.stage('replace_factory', { template_id: item.id })
                    )}
                    ${this.button('delete', () => this.stage('delete', { template_id: item.id }))}
                  </div>
                </div>`
            )
          : html`<p>${this.t('empty')}</p>`}
      </section>
      ${this.inspection
        ? html`<section>
            <h3>${this.t('inspect')}</h3>
            <small>${this.inspection.id}</small> ${this.inspection.revisions.map(
              (rev) =>
                html`<details>
                  <summary>
                    r${rev.revision} · ${rev.name} · ${rev.operation} · ${rev.published_at}
                  </summary>
                  <pre>${JSON.stringify(rev.document, null, 2)}</pre>
                  ${this.button('restore_revision', () =>
                    this.stage('restore_revision', {
                      template_id: this.inspection?.id,
                      revision: rev.revision,
                    })
                  )}
                </details>`
            )}
            ${this.button('export_history', () =>
              downloadTemplateData(this.inspection, 'label-history-recovery.json')
            )}
          </section>`
        : nothing}
      <details>
        <summary>${this.t('drafts')} (${library.drafts.length})</summary>
        <p>${this.t('ownership')}</p>
        ${library.drafts.map(
          (draft) =>
            html`<div class="row">
              <strong>${draft.name ?? draft.template_id ?? draft.label_size_id}</strong>
              <p>
                ${draft.orphaned
                  ? this.t('orphaned')
                  : draft.stale
                    ? this.t('stale')
                    : this.t('unfinished')}
              </p>
              <div class="actions">
                ${this.button('resume', () =>
                  this.open(draft.template_id ?? undefined, false, draft)
                )}
                ${this.button('export_work', () =>
                  downloadTemplateData(draft, 'label-draft-recovery.json')
                )}
                ${this.button('save_as', () =>
                  this.stage(
                    'save_as',
                    {
                      ...(draft.template_id
                        ? { template_id: draft.template_id }
                        : { label_size_id: draft.label_size_id }),
                      draft_id: draft.id,
                    },
                    ''
                  )
                )}
                ${this.button('discard', () =>
                  this.stage(
                    'discard',
                    draft.template_id
                      ? { template_id: draft.template_id }
                      : { label_size_id: draft.label_size_id }
                  )
                )}
                ${draft.recovery
                  ? this.button('inspect_recovery', () => {
                      this.recovery = draft;
                    })
                  : nothing}
              </div>
            </div>`
        )}
      </details>
      ${this.recovery
        ? html`<section>
            <h3>${this.t('inspect_recovery')}</h3>
            <pre>${JSON.stringify(this.recovery.recovery, null, 2)}</pre>
            ${this.button('export_work', () =>
              downloadTemplateData(this.recovery?.recovery, 'label-rejected-work.json')
            )}
          </section>`
        : nothing}
      <details>
        <summary>${this.t('deleted')} (${library.tombstones.length})</summary>
        ${library.tombstones.map(
          (stone) =>
            html`<div class="row">
              <strong>${stone.template.name}</strong>
              <p>${this.t('expires')} ${stone.expires_at}</p>
              <div class="actions">
                ${this.button('restore', () =>
                  this.stage('restore', { template_id: stone.template.id }, stone.template.name)
                )}${this.button(
                  'inspect',
                  () => void this.read('inspect', { template_id: stone.template.id })
                )}
              </div>
            </div>`
        )}
      </details>
      <details>
        <summary>${this.t('transfer')}</summary>
        <p>${this.t('portable')}</p>
        ${this.button('export_all', () => void this.read('export', {}))}
        <label
          >${this.t('choose_file')}<input
            type="file"
            accept="application/json,.json"
            @change=${(event: Event) => void this.upload(event)}
        /></label>
        ${this.preflight
          ? html`${this.preflight.entries.map(
                (entry) =>
                  html`<div class="row">
                    <strong>${entry.name}</strong><small>${entry.id}</small>
                    <label
                      >${this.t('name')}<input
                        .value=${this.names[entry.id] ?? entry.name}
                        @input=${(event: Event) => {
                          this.names = {
                            ...this.names,
                            [entry.id]: (event.target as HTMLInputElement).value,
                          };
                          this.preflight = this.preflight && { ...this.preflight, ready: false };
                        }}
                    /></label>
                    <label
                      ><input
                        type="checkbox"
                        .checked=${this.copies.includes(entry.id)}
                        @change=${(event: Event) => {
                          this.copies = (event.target as HTMLInputElement).checked
                            ? [...this.copies, entry.id]
                            : this.copies.filter((id) => id !== entry.id);
                          this.preflight = this.preflight && { ...this.preflight, ready: false };
                        }}
                      />${this.t('as_copy')}</label
                    >
                    <ul>
                      ${this.preflight?.issues
                        .filter((issue) => issue.template_id === entry.id)
                        .map((issue) => html`<li class="error">${issue.reason}</li>`)}
                    </ul>
                  </div>`
              )}
              <div class="actions">
                ${this.button('preflight', () => void this.checkImport())}${this.button(
                  'import',
                  () =>
                    this.stage('import', {
                      bundle: this.bundle,
                      as_copy: this.copies,
                      names: this.names,
                    }),
                  !this.preflight.ready || this.preflight.generation !== library.generation
                )}
              </div>`
          : nothing}
      </details>`;
  }
}
