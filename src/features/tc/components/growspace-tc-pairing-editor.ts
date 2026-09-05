import { LitElement, html, css, nothing, type CSSResultGroup, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { localize } from '../../../localize/localize';
import { sharedStyles } from '../../../styles/shared.styles';
import { portalVariables } from '../../../styles/variables';
import {
  resolvePhenotype,
  type CultureMedium,
  type Pairing,
  type PairingDraft,
  type PhenotypeOption,
} from '../../../slices/tc';
import './growspace-tc-phenotype-picker';

/** Data in, requests out. Both orientations group exactly the same pairing set. */
@customElement('growspace-tc-pairing-editor')
export class GrowspaceTcPairingEditor extends LitElement {
  @property({ attribute: false }) pairings: Pairing[] = [];
  @property({ attribute: false }) media: CultureMedium[] = [];
  @property({ attribute: false }) phenotypes: PhenotypeOption[] = [];
  @property({ type: Boolean }) libraryLoaded = false;
  @property({ type: Boolean }) saving = false;
  @property({ type: String }) error = '';
  @property({ type: String }) language = 'en';
  @state() private _by: 'medium' | 'phenotype' = 'medium';
  @state() private _draft?: PairingDraft;
  @state() private _editingId?: string;
  @state() private _removing?: string;
  private _returnFocus?: HTMLElement;

  static styles: CSSResultGroup = [
    portalVariables,
    sharedStyles,
    css`
      :host {
        display: block;
        margin-top: 24px;
      }
      h3 {
        margin: 0 0 8px;
      }
      h4 {
        margin: 20px 0 4px;
        overflow-wrap: anywhere;
      }
      p {
        margin: 4px 0 12px;
      }
      .supporting {
        color: var(--secondary-text-color);
      }
      .toolbar,
      .actions {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px;
      }
      .toolbar {
        justify-content: space-between;
        margin: 16px 0;
      }
      ul {
        list-style: none;
        padding: 0;
        margin: 0;
      }
      li {
        padding: 12px 0;
        border-bottom: 1px solid var(--divider-color);
        overflow-wrap: anywhere;
      }
      .notes {
        white-space: pre-wrap;
      }
      form {
        margin: 16px 0;
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

  /** Called only after a successful mutation; rejected saves retain the draft. */
  finishEditing(): void {
    this._draft = undefined;
    this._editingId = undefined;
    this._removing = undefined;
    void this.updateComplete.then(() => {
      const target = this._returnFocus?.isConnected
        ? this._returnFocus
        : this.shadowRoot?.querySelector<HTMLElement>('.toolbar button');
      target?.focus();
    });
  }

  private _edit(pairing?: Pairing, event?: Event): void {
    if (event?.currentTarget instanceof HTMLElement) this._returnFocus = event.currentTarget;
    this._editingId = pairing?.id;
    this._draft = pairing
      ? {
          phenotype_id: pairing.phenotype.id,
          phenotype_name:
            this.phenotypes.find((p) => p.id === pairing.phenotype.id)?.name ??
            pairing.phenotype.name_snapshot,
          medium_id: pairing.medium_id,
          notes: pairing.notes,
        }
      : { phenotype_id: '', phenotype_name: '', medium_id: this.media[0]?.id ?? '', notes: '' };
    void this.updateComplete.then(async () => {
      const picker = this.shadowRoot?.querySelector('growspace-tc-phenotype-picker');
      await picker?.updateComplete;
      const target =
        picker?.shadowRoot?.querySelector<HTMLElement>('input') ??
        this.shadowRoot?.querySelector<HTMLElement>('form select');
      target?.focus();
    });
  }

  private _request(name: string, detail: object): void {
    this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
  }

  private _renderForm(draft: PairingDraft): TemplateResult {
    const duplicate = this.pairings.some(
      (row) =>
        row.id !== this._editingId &&
        row.medium_id === draft.medium_id &&
        row.phenotype.id === draft.phenotype_id
    );
    const valid =
      draft.phenotype_id && this.media.some((m) => m.id === draft.medium_id) && !duplicate;
    return html`<form
      @submit=${(event: Event) => {
        event.preventDefault();
        if (valid && !this.saving)
          this._request('pairing-save-requested', { id: this._editingId, draft });
      }}
    >
      <fieldset ?disabled=${this.saving}>
        <legend>${this._t(this._editingId ? 'pairing_edit' : 'pairing_add')}</legend>
        <growspace-tc-phenotype-picker
          .phenotypes=${this.phenotypes}
          .selected=${draft.phenotype_id}
          .language=${this.language}
          @phenotype-selected=${(event: CustomEvent<PhenotypeOption>) => {
            if (!this.saving)
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
        <label
          >${this._t('pairing_medium')}<select
            required
            .value=${draft.medium_id}
            @change=${(event: Event) =>
              (this._draft = { ...draft, medium_id: (event.target as HTMLSelectElement).value })}
          >
            <option value="">${this._t('pairing_choose_medium')}</option>
            ${this.media.map(
              (m) =>
                html`<option value=${m.id} ?selected=${m.id === draft.medium_id}>${m.name}</option>`
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
        <div class="actions">
          <button type="button" @click=${this.finishEditing}>${this._t('medium_cancel')}</button
          ><button type="submit" ?disabled=${!valid || this.saving}>
            ${this._t(this.saving ? 'pairing_saving' : 'medium_save')}
          </button>
        </div>
      </fieldset>
    </form>`;
  }

  protected render(): TemplateResult {
    const names = new Map(this.phenotypes.map((p) => [p.id, p.name]));
    const mediumNames = new Map(this.media.map((m) => [m.id, m.name]));
    const groups = new Map<string, { name: string; rows: Pairing[] }>();
    for (const row of this.pairings) {
      const key = this._by === 'medium' ? row.medium_id : row.phenotype.id;
      const name =
        this._by === 'medium'
          ? (mediumNames.get(key) ?? this._t('pairing_missing_medium'))
          : resolvePhenotype(row.phenotype, names, this.libraryLoaded).name;
      const group = groups.get(key) ?? { name, rows: [] };
      group.rows.push(row);
      groups.set(key, group);
    }
    return html`<section aria-label=${this._t('pairing_title')}>
      <h3>${this._t('pairing_title')}</h3>
      <p class="supporting">${this._t('pairing_body')}</p>
      <div class="toolbar">
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
          ?disabled=${this.saving || !this.media.length || !this.libraryLoaded}
          @click=${(event: Event) => this._edit(undefined, event)}
        >
          ${this._t('pairing_add')}
        </button>
      </div>
      ${!this.media.length
        ? html`<p class="supporting">${this._t('pairing_needs_medium')}</p>`
        : nothing}
      ${this.error ? html`<p class="error" role="alert">${this.error}</p>` : nothing}
      ${this._draft ? this._renderForm(this._draft) : nothing}
      ${!this.pairings.length ? html`<p>${this._t('pairing_empty')}</p>` : nothing}
      ${[...groups.values()]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(
          (group) =>
            html`<h4>${group.name}</h4>
              <ul>
                ${group.rows.map((row) => {
                  const phenotype = resolvePhenotype(row.phenotype, names, this.libraryLoaded);
                  return html`<li data-pairing-id=${row.id}>
                    <strong
                      >${this._by === 'medium'
                        ? phenotype.name
                        : (mediumNames.get(row.medium_id) ??
                          this._t('pairing_missing_medium'))}</strong
                    >
                    ${phenotype.status === 'missing'
                      ? html`<p class="error">${this._t('pairing_missing_phenotype')}</p>`
                      : nothing}
                    ${row.notes ? html`<p class="notes">${row.notes}</p>` : nothing}
                    <div class="actions">
                      <button
                        ?disabled=${this.saving}
                        @click=${(event: Event) => this._edit(row, event)}
                      >
                        ${this._t('pairing_edit')}
                      </button>
                      ${this._removing === row.id
                        ? html`<span>${this._t('pairing_remove_confirm')}</span
                            ><button
                              ?disabled=${this.saving}
                              @click=${() =>
                                this._request('pairing-delete-requested', { id: row.id })}
                            >
                              ${this._t('pairing_remove')}</button
                            ><button
                              ?disabled=${this.saving}
                              @click=${() => (this._removing = undefined)}
                            >
                              ${this._t('medium_cancel')}
                            </button>`
                        : html`<button
                            ?disabled=${this.saving}
                            @click=${() => (this._removing = row.id)}
                          >
                            ${this._t('pairing_remove')}
                          </button>`}
                    </div>
                  </li>`;
                })}
              </ul>`
        )}
    </section>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'growspace-tc-pairing-editor': GrowspaceTcPairingEditor;
  }
}
