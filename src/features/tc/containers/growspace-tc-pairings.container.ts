import { LitElement, html, css, nothing, type CSSResultGroup, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { localize } from '../../../localize/localize';
import { fetchStrainLibrary, strainLibrary$ } from '../../../slices/strain';
import { sharedStyles } from '../../../styles/shared.styles';
import { portalVariables } from '../../../styles/variables';
import { tcLayoutStyles } from '../tc-layout.styles';
import {
  resolvePhenotype,
  cultureMedia$,
  pairings$,
  fetchPairings,
  savePairing,
  deletePairing,
  phenotypeOptions,
  type CultureMedium,
  type Pairing,
  type PairingDraft,
  type PhenotypeOption,
} from '../../../slices/tc';
import '../components/growspace-tc-phenotype-picker';

/** Owns one Pairing editing session, from draft through mutation and focus return. */
@customElement('growspace-tc-pairings')
export class GrowspaceTcPairings extends LitElement {
  @state() private _pairings: Pairing[] = [];
  @state() private _media: CultureMedium[] = [];
  @state() private _phenotypes: PhenotypeOption[] = [];
  @state() private _libraryLoaded = false;
  @state() private _saving = false;
  @state() private _error = '';
  @property({ type: String }) language = 'en';
  @state() private _by: 'medium' | 'phenotype' = 'medium';
  @state() private _draft?: PairingDraft;
  @state() private _editingId?: string;
  @state() private _removing?: string;
  private _returnFocus?: { pairingId?: string; action: 'add' | 'edit' | 'remove' };
  @state() private _loading = true;
  @state() private _loadError = '';
  private _unsubscribe: Array<() => void> = [];
  private _session = 0;

  connectedCallback(): void {
    super.connectedCallback();
    this._unsubscribe = [
      pairings$.subscribe((rows) => (this._pairings = [...rows])),
      cultureMedia$.subscribe((rows) => (this._media = [...rows])),
      strainLibrary$.subscribe((rows) => (this._phenotypes = phenotypeOptions([...rows]))),
    ];
    void this._load();
  }

  disconnectedCallback(): void {
    this._unsubscribe.forEach((unsubscribe) => unsubscribe());
    this._unsubscribe = [];
    // Closing ends the local edit, not the slice's in-flight write. A reconnect
    // starts a new session which must not consume the previous one's result.
    this._session++;
    this._draft = undefined;
    this._editingId = undefined;
    this._removing = undefined;
    this._returnFocus = undefined;
    this._saving = false;
    this._error = '';
    super.disconnectedCallback();
  }

  private async _load(): Promise<void> {
    const session = this._session;
    this._loading = true;
    this._loadError = '';
    this._libraryLoaded = false;
    const results = await Promise.allSettled([fetchPairings(), fetchStrainLibrary()]);
    if (!this.isConnected || session !== this._session) return;
    this._libraryLoaded = results[1].status === 'fulfilled';
    this._loadError = results
      .filter((result) => result.status === 'rejected')
      .map((result) => String(result.reason))
      .join(' ');
    this._loading = false;
  }

  private async _mutate(action: () => Promise<unknown>): Promise<void> {
    if (this._saving || !this.isConnected) return;
    const session = this._session;
    this._saving = true;
    this._error = '';
    try {
      await action();
      if (this.isConnected && session === this._session) this._finishEditing();
    } catch (error) {
      if (this.isConnected && session === this._session)
        this._error = error instanceof Error ? error.message : String(error);
    } finally {
      if (this.isConnected && session === this._session) this._saving = false;
    }
  }

  static styles: CSSResultGroup = [
    portalVariables,
    sharedStyles,
    tcLayoutStyles,
    css`
      :host {
        display: block;
      }
      p {
        margin: 0;
      }
      .supporting {
        color: var(--secondary-text-color);
        font-size: 0.8125rem;
      }
      .toolbar label {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 0.8125rem;
      }
      .toolbar select {
        width: auto;
        min-height: 44px;
      }
      .actions {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 6px;
      }
      /* One bordered group per medium (or phenotype), its pairings divided by
         hairlines inside it, so the grouping is carried by the container and
         the rows can stay quiet. */
      .groups {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .group {
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.12));
        border-radius: 12px;
        padding: 4px 14px 4px 16px;
      }
      h4 {
        margin: 0;
        padding: 10px 0 8px;
        font-size: 0.9375rem;
        font-weight: 600;
        overflow-wrap: anywhere;
        border-bottom: 1px solid var(--divider-color, rgba(255, 255, 255, 0.12));
      }
      ul {
        list-style: none;
        padding: 0;
        margin: 0;
      }
      li.record {
        padding: 10px 0;
        border-bottom: 1px solid var(--divider-color, rgba(255, 255, 255, 0.12));
        overflow-wrap: anywhere;
        align-items: center;
      }
      li:last-child {
        border-bottom: none;
      }
      li strong {
        font-weight: 600;
        font-size: 0.875rem;
      }
      .notes {
        white-space: pre-wrap;
        font-size: 0.8125rem;
      }
      form {
        margin: 0 0 16px;
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.12));
        border-radius: 12px;
        padding: 12px 14px 14px 16px;
      }
      legend {
        padding: 0;
        margin-bottom: 12px;
        font-weight: 600;
      }
      .form-actions {
        justify-content: flex-end;
      }
      .status {
        margin-bottom: 12px;
      }
      .empty {
        padding: 20px 0;
        text-align: center;
      }
      fieldset {
        border: 0;
        margin: 0;
        padding: 0;
        min-width: 0;
        display: grid;
        gap: 12px;
      }
      label {
        display: grid;
        gap: 4px;
        min-width: 0;
      }
      select,
      textarea {
        box-sizing: border-box;
        width: 100%;
        font: inherit;
        color: var(--primary-text-color);
        background: var(--card-background-color);
        border: 1px solid var(--divider-color);
        border-radius: 8px;
        padding: 8px;
      }
      textarea {
        resize: vertical;
        min-height: 80px;
      }
      button {
        font: inherit;
        color: inherit;
        background: none;
        border: 1px solid var(--divider-color);
        border-radius: 999px;
        min-height: 44px;
        padding: 6px 14px;
        cursor: pointer;
      }
      button:hover:not(:disabled) {
        background: var(--secondary-background-color);
      }
      button:disabled {
        opacity: 0.5;
        cursor: default;
      }
      button:focus-visible,
      select:focus-visible,
      textarea:focus-visible {
        outline: 2px solid var(--primary-color);
        outline-offset: 2px;
      }
      .error {
        color: var(--primary-text-color);
      }
    `,
  ];

  private _t(key: string): string {
    return localize(`tc.${key}`, '', '', this.language);
  }

  private _visible(): boolean {
    return this.isConnected && this.checkVisibility({ visibilityProperty: true });
  }

  private _finishEditing(): void {
    const restoreFocus = this._visible() && !!this.shadowRoot?.activeElement;
    const session = this._session;
    const origin = this._returnFocus;
    this._draft = undefined;
    this._editingId = undefined;
    this._removing = undefined;
    this._error = '';
    this._returnFocus = undefined;
    void this.updateComplete.then(() => {
      if (!restoreFocus || session !== this._session || !this._visible()) return;
      // Removing the form can leave focus on body. Otherwise respect any focus
      // the user moved outside this surface while the render was pending.
      if (
        !this.shadowRoot?.activeElement &&
        this.ownerDocument.activeElement !== this.ownerDocument.body
      )
        return;
      const row = [...this.shadowRoot!.querySelectorAll<HTMLElement>('[data-pairing-id]')].find(
        (element) => element.dataset.pairingId === origin?.pairingId
      );
      const target = origin?.pairingId
        ? row?.querySelector<HTMLButtonElement>(`[data-action="${origin.action}"]`)
        : undefined;
      (target ?? this.shadowRoot?.querySelector<HTMLButtonElement>('[data-action="add"]'))?.focus();
    });
  }

  private _edit(pairing?: Pairing): void {
    if (this._saving) return;
    this._error = '';
    this._removing = undefined;
    this._returnFocus = { pairingId: pairing?.id, action: pairing ? 'edit' : 'add' };
    const session = this._session;
    this._editingId = pairing?.id;
    this._draft = pairing
      ? {
          phenotype_id: pairing.phenotype.id,
          phenotype_name:
            this._phenotypes.find((p) => p.id === pairing.phenotype.id)?.name ??
            pairing.phenotype.name_snapshot,
          medium_id: pairing.medium_id,
          notes: pairing.notes,
        }
      : { phenotype_id: '', phenotype_name: '', medium_id: this._media[0]?.id ?? '', notes: '' };
    void this.updateComplete.then(async () => {
      const picker = this.shadowRoot?.querySelector('growspace-tc-phenotype-picker');
      await picker?.updateComplete;
      if (session !== this._session || !this._visible()) return;
      const target =
        picker?.shadowRoot?.querySelector<HTMLElement>('input') ??
        this.shadowRoot?.querySelector<HTMLElement>('form select');
      target?.focus();
    });
  }

  private _renderForm(draft: PairingDraft): TemplateResult {
    const duplicate = this._pairings.some(
      (row) =>
        row.id !== this._editingId &&
        row.medium_id === draft.medium_id &&
        row.phenotype.id === draft.phenotype_id
    );
    const valid =
      draft.phenotype_id && this._media.some((m) => m.id === draft.medium_id) && !duplicate;
    return html`<form
      @submit=${(event: Event) => {
        event.preventDefault();
        if (valid && !this._saving) void this._mutate(() => savePairing(draft, this._editingId));
      }}
    >
      <fieldset ?disabled=${this._saving}>
        <legend>${this._t(this._editingId ? 'pairing_edit' : 'pairing_add')}</legend>
        <div class="split">
          <div class="column">
            <growspace-tc-phenotype-picker
              .phenotypes=${this._phenotypes}
              .selected=${draft.phenotype_id}
              .language=${this.language}
              @phenotype-selected=${(event: CustomEvent<PhenotypeOption>) => {
                if (!this._saving)
                  this._draft = {
                    ...draft,
                    phenotype_id: event.detail.id,
                    phenotype_name: event.detail.name,
                  };
              }}
            ></growspace-tc-phenotype-picker>
            ${draft.phenotype_name
              ? html`<p>${this._t('pairing_phenotype')}: ${draft.phenotype_name}</p>`
              : nothing}
          </div>
          <div class="column">
            <label
              >${this._t('pairing_medium')}<select
                required
                .value=${draft.medium_id}
                @change=${(event: Event) =>
                  (this._draft = {
                    ...draft,
                    medium_id: (event.target as HTMLSelectElement).value,
                  })}
              >
                <option value="">${this._t('pairing_choose_medium')}</option>
                ${this._media.map(
                  (m) =>
                    html`<option value=${m.id} ?selected=${m.id === draft.medium_id}>
                      ${m.name}
                    </option>`
                )}
              </select></label
            >
            <label
              >${this._t('pairing_notes')}<textarea
                maxlength="4000"
                .value=${draft.notes}
                @input=${(event: Event) =>
                  (this._draft = { ...draft, notes: (event.target as HTMLTextAreaElement).value })}
              ></textarea>
            </label>
            ${duplicate
              ? html`<p class="error" role="alert">${this._t('pairing_duplicate')}</p>`
              : nothing}
            <div class="actions form-actions">
              <button
                type="button"
                @click=${() => {
                  if (!this._saving) this._finishEditing();
                }}
              >
                ${this._t('medium_cancel')}</button
              ><button type="submit" ?disabled=${!valid || this._saving}>
                ${this._t(this._saving ? 'pairing_saving' : 'medium_save')}
              </button>
            </div>
          </div>
        </div>
      </fieldset>
    </form>`;
  }

  protected render(): TemplateResult {
    return html`
      ${this._loading
        ? html`<p class="status supporting" role="status">${this._t('pairing_loading')}</p>`
        : nothing}
      ${this._loadError
        ? html`<div class="status actions">
            <p role="alert">${this._loadError}</p>
            <button @click=${this._load}>${this._t('pairing_retry')}</button>
          </div>`
        : nothing}
      ${this._renderPairings()}
    `;
  }

  private _renderPairings(): TemplateResult {
    const names = new Map(this._phenotypes.map((p) => [p.id, p.name]));
    const mediumNames = new Map(this._media.map((m) => [m.id, m.name]));
    const groups = new Map<string, { name: string; rows: Pairing[] }>();
    for (const row of this._pairings) {
      const key = this._by === 'medium' ? row.medium_id : row.phenotype.id;
      const name =
        this._by === 'medium'
          ? (mediumNames.get(key) ?? this._t('pairing_missing_medium'))
          : resolvePhenotype(row.phenotype, names, this._libraryLoaded).name;
      const group = groups.get(key) ?? { name, rows: [] };
      group.rows.push(row);
      groups.set(key, group);
    }
    return html`<section aria-label=${this._t('pairing_title')}>
      <div class="surface-head">
        <div class="title">
          <h3>${this._t('pairing_title')}</h3>
          <p class="supporting">${this._t('pairing_body')}</p>
        </div>
        <div class="toolbar controls">
          <label
            >${this._t('pairing_view')}<select
              aria-label=${this._t('pairing_view')}
              .value=${this._by}
              @change=${(event: Event) =>
                (this._by =
                  (event.target as HTMLSelectElement).value === 'medium' ? 'medium' : 'phenotype')}
            >
              <option value="medium">${this._t('pairing_by_medium')}</option>
              <option value="phenotype">${this._t('pairing_by_phenotype')}</option>
            </select></label
          >
          <button
            ?disabled=${this._saving || !this._media.length || !this._libraryLoaded}
            data-action="add"
            @click=${() => this._edit()}
          >
            ${this._t('pairing_add')}
          </button>
        </div>
      </div>
      ${!this._media.length
        ? html`<p class="supporting">${this._t('pairing_needs_medium')}</p>`
        : nothing}
      ${this._error ? html`<p class="error" role="alert">${this._error}</p>` : nothing}
      ${this._draft ? this._renderForm(this._draft) : nothing}
      ${!this._pairings.length
        ? html`<p class="empty supporting">${this._t('pairing_empty')}</p>`
        : nothing}
      <div class="groups">
        ${[...groups.values()]
          .sort((a, b) => a.name.localeCompare(b.name))
          .map(
            (group) =>
              html`<div class="group">
                <h4>${group.name}</h4>
                <ul>
                  ${group.rows.map((row) => {
                    const phenotype = resolvePhenotype(row.phenotype, names, this._libraryLoaded);
                    return html`<li class="record" data-pairing-id=${row.id}>
                      <div class="record-identity">
                        <strong
                          >${this._by === 'medium'
                            ? phenotype.name
                            : (mediumNames.get(row.medium_id) ??
                              this._t('pairing_missing_medium'))}</strong
                        >
                        ${phenotype.status === 'missing'
                          ? html`<p class="error supporting">
                              ${this._t('pairing_missing_phenotype')}
                            </p>`
                          : nothing}
                      </div>
                      <div class="record-detail">
                        ${row.notes ? html`<p class="notes">${row.notes}</p>` : nothing}
                      </div>
                      <div class="actions record-actions">
                        <button
                          ?disabled=${this._saving}
                          data-action="edit"
                          @click=${() => this._edit(row)}
                        >
                          ${this._t('pairing_edit')}
                        </button>
                        ${this._removing === row.id
                          ? html`<span>${this._t('pairing_remove_confirm')}</span
                              ><button
                                ?disabled=${this._saving}
                                @click=${() => void this._mutate(() => deletePairing(row.id))}
                              >
                                ${this._t('pairing_remove')}</button
                              ><button
                                ?disabled=${this._saving}
                                @click=${() => (this._removing = undefined)}
                              >
                                ${this._t('medium_cancel')}
                              </button>`
                          : html`<button
                              ?disabled=${this._saving}
                              data-action="remove"
                              @click=${() => {
                                if (this._saving) return;
                                this._error = '';
                                this._removing = row.id;
                                this._returnFocus = { pairingId: row.id, action: 'remove' };
                              }}
                            >
                              ${this._t('pairing_remove')}
                            </button>`}
                      </div>
                    </li>`;
                  })}
                </ul>
              </div>`
          )}
      </div>
    </section>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'growspace-tc-pairings': GrowspaceTcPairings;
  }
}
