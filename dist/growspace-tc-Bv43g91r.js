/*! growspace-e2e-build source=2e889c2b34d29831e2a9ea84775b90a4da9f3cee9ea88a606cf6b525559cfb18 id=705911f9e6b0c1280f6dfdcefba8c7d7 */
const { cF: variables, bK: sharedStyles, i, _: __decorate, n, A: r, t, g: i$1, bQ: localize, E, x, bR: localizeWithParams, eg: draftFromMedium, eh: TC_FEATURE_CULTURE_MEDIA, ei: cultureMedia$, ej: fetchCultureMedia, ek: updateCultureMedium, el: createCultureMedium, em: deleteCultureMedium } = await import(window.__growspaceEntryUrl ?? './growspace-manager-card.js');

/**
 * The Culture Medium library, with the version history of every medium.
 *
 * The history is the reason this view exists rather than a decoration on it:
 * editing a medium forks a new Medium Version and rewrites none of the old
 * ones (TC ADR-0004), so a Plating that pinned version 2 still describes what
 * was really poured. A library that showed only the current formulation would
 * hide exactly the property the data model is paying for, so every version is
 * reachable here — newest first, each stamped with the day it was taken, and
 * the current one marked as the one a new Plating would pin.
 *
 * Dumb by contract (ADR-0019): media in, intents out. Which medium's history
 * is open is the only state it owns, because that is view state and nothing
 * outside this element has an opinion about it.
 */
let GrowspaceTcMediumLibrary = class GrowspaceTcMediumLibrary extends i$1 {
    constructor() {
        super(...arguments);
        this.media = [];
        this.language = 'en';
        this._openHistory = new Set();
    }
    _t(key) {
        return localize(`tc.${key}`, '', '', this.language);
    }
    _emit(type, detail) {
        this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
    }
    _toggleHistory(mediumId) {
        const open = new Set(this._openHistory);
        if (!open.delete(mediumId))
            open.add(mediumId);
        this._openHistory = open;
    }
    /** The day a version was taken, or the raw stamp if it cannot be read. */
    _day(iso) {
        const taken = new Date(iso);
        return Number.isNaN(taken.getTime()) ? iso : taken.toLocaleDateString(this.language);
    }
    _components(entries) {
        return entries.length
            ? entries.map((entry) => `${entry.name} ${entry.amount} ${entry.unit}`).join(', ')
            : this._t('medium_none');
    }
    _renderFormulation(version) {
        return x `
      <dl>
        <dt>${this._t('medium_base_salts')}</dt>
        <dd>${version.base_salts}</dd>
        <dt>${this._t('medium_hormones')}</dt>
        <dd>${this._components(version.hormones)}</dd>
        <dt>${this._t('medium_additives')}</dt>
        <dd>${this._components(version.additives)}</dd>
        <dt>${this._t('medium_agar')}</dt>
        <dd>${version.agar_g_per_l} g/L</dd>
        <dt>${this._t('medium_sugar')}</dt>
        <dd>${version.sugar_g_per_l} g/L</dd>
        <dt>${this._t('medium_ph')}</dt>
        <dd>${version.ph_target}</dd>
        ${version.notes
            ? x `<dt>${this._t('medium_notes')}</dt>
              <dd>${version.notes}</dd>`
            : E}
      </dl>
    `;
    }
    _renderHistory(medium) {
        // Newest first: the reader is looking for what changed, and the most recent
        // fork is the change they are most likely asking about.
        const versions = [...medium.versions].sort((a, b) => b.version - a.version);
        return x `
      <div class="history">
        <p class="supporting">${this._t('medium_history_explainer')}</p>
        <ol>
          ${versions.map((version) => x `
              <li class=${version.version === medium.current_version ? 'current' : ''}>
                <div class="history-head">
                  <strong>
                    ${localizeWithParams('tc.medium_version_label', { version: version.version }, this.language)}
                  </strong>
                  <span class="taken">${this._day(version.created_at)}</span>
                  ${version.version === medium.current_version
            ? x `<span class="version-chip">${this._t('medium_current')}</span>`
            : E}
                </div>
                ${this._renderFormulation(version)}
              </li>
            `)}
        </ol>
      </div>
    `;
    }
    _renderMedium(medium) {
        const current = medium.versions.find((version) => version.version === medium.current_version) ??
            medium.versions[medium.versions.length - 1];
        const open = this._openHistory.has(medium.id);
        return x `
      <li class="medium">
        <div class="medium-head">
          <h4>${medium.name}</h4>
          <span class="version-chip">
            ${localizeWithParams('tc.medium_version_label', { version: medium.current_version }, this.language)}
          </span>
          <div class="actions">
            <button @click=${() => this._emit('medium-edit-requested', { id: medium.id })}>
              ${this._t('medium_edit')}
            </button>
            <button @click=${() => this._emit('medium-delete-requested', { id: medium.id })}>
              ${this._t('medium_delete')}
            </button>
          </div>
        </div>
        ${current ? this._renderFormulation(current) : E}
        <button
          class="link"
          aria-expanded=${open ? 'true' : 'false'}
          @click=${() => this._toggleHistory(medium.id)}
        >
          ${localizeWithParams(open ? 'tc.medium_hide_history' : 'tc.medium_show_history', { count: medium.versions.length }, this.language)}
        </button>
        ${open ? this._renderHistory(medium) : E}
      </li>
    `;
    }
    render() {
        return x `
      <section aria-label=${this._t('medium_library_title')}>
        <header class="library">
          <h3>${this._t('medium_library_title')}</h3>
          <button @click=${() => this._emit('medium-create-requested')}>
            ${this._t('medium_add')}
          </button>
        </header>
        ${this.media.length
            ? x `<ul>
              ${this.media.map((medium) => this._renderMedium(medium))}
            </ul>`
            : x `<p class="empty supporting">${this._t('medium_library_empty')}</p>`}
      </section>
    `;
    }
};
GrowspaceTcMediumLibrary.styles = [
    variables,
    sharedStyles,
    i `
      :host {
        display: block;
      }

      header.library {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
        margin-bottom: 12px;
      }

      header.library h3 {
        margin: 0;
        font-size: 1rem;
        font-weight: 600;
      }

      ul {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      li.medium {
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.12));
        border-radius: 12px;
        padding: 12px 14px;
      }

      .medium-head {
        display: flex;
        align-items: baseline;
        gap: 8px;
        flex-wrap: wrap;
      }

      .medium-head h4 {
        margin: 0;
        font-size: 0.9375rem;
        font-weight: 600;
      }

      .version-chip {
        font-size: 0.75rem;
        font-weight: 600;
        padding: 1px 8px;
        border-radius: 999px;
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.12));
      }

      .actions {
        margin-left: auto;
        display: flex;
        gap: 4px;
      }

      dl {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 2px 10px;
        margin: 8px 0 0;
        font-size: 0.8125rem;
      }

      dt {
        opacity: 0.7;
      }

      dd {
        margin: 0;
      }

      .history {
        margin-top: 10px;
        border-top: 1px solid var(--divider-color, rgba(255, 255, 255, 0.12));
        padding-top: 8px;
      }

      .history ol {
        list-style: none;
        margin: 8px 0 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .history li {
        padding-left: 10px;
        border-left: 2px solid var(--divider-color, rgba(255, 255, 255, 0.12));
      }

      .history li.current {
        border-left-color: var(--primary-color);
      }

      .history-head {
        display: flex;
        align-items: baseline;
        gap: 8px;
        flex-wrap: wrap;
        font-size: 0.8125rem;
      }

      .history-head strong {
        font-weight: 600;
      }

      .supporting,
      .taken {
        opacity: 0.7;
      }

      .empty {
        padding: 20px 0;
        text-align: center;
      }

      button {
        font: inherit;
        color: inherit;
        background: none;
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.12));
        border-radius: 999px;
        padding: 4px 12px;
        min-height: 32px;
        cursor: pointer;
      }

      button.link {
        border: none;
        padding: 4px 0;
        text-decoration: underline;
        min-height: 32px;
      }
    `,
];
__decorate([
    n({ attribute: false })
], GrowspaceTcMediumLibrary.prototype, "media", void 0);
__decorate([
    n({ type: String })
], GrowspaceTcMediumLibrary.prototype, "language", void 0);
__decorate([
    r()
], GrowspaceTcMediumLibrary.prototype, "_openHistory", void 0);
GrowspaceTcMediumLibrary = __decorate([
    t('growspace-tc-medium-library')
], GrowspaceTcMediumLibrary);

/**
 * The Culture Medium editor — one form for creating and for editing.
 *
 * It says out loud what saving will do. Editing a medium forks a new Medium
 * Version and rewrites none of the old ones (TC ADR-0004), and hiding that
 * would be the same mistake as making versions mutable: the grower would think
 * they were correcting a recipe when they were recording a new one. Equally,
 * a save that changes nothing forks nothing and a rename forks nothing — the
 * backend decides, so the form promises a fork only for a formulation change
 * it can actually see in the draft.
 *
 * Dumb by contract (ADR-0019): a medium in, a draft out. It owns the draft
 * while it is being typed and nothing else.
 */
let GrowspaceTcMediumForm = class GrowspaceTcMediumForm extends i$1 {
    constructor() {
        super(...arguments);
        this.saving = false;
        /** A backend rejection, already localized by the backend. */
        this.error = '';
        this.language = 'en';
        this._draft = draftFromMedium();
    }
    willUpdate(changed) {
        // Re-seed only when the element is pointed at a different medium: a
        // re-render while the grower is typing must not throw the draft away.
        if (changed.has('medium'))
            this._draft = draftFromMedium(this.medium);
    }
    _t(key) {
        return localize(`tc.${key}`, '', '', this.language);
    }
    _set(key, value) {
        this._draft = { ...this._draft, [key]: value };
    }
    _setText(key, event) {
        this._set(key, event.target.value);
    }
    _setNumber(key, event) {
        // An empty or half-typed field becomes NaN rather than 0: the backend
        // rejects it with a sentence naming the field, which is a better answer
        // than silently recording a medium with no sugar in it.
        this._set(key, Number(event.target.value));
    }
    _setComponent(field, index, key, event) {
        const raw = event.target.value;
        const entries = this._draft[field].map((entry, position) => position === index ? { ...entry, [key]: key === 'amount' ? Number(raw) : raw } : entry);
        this._set(field, entries);
    }
    _addComponent(field) {
        this._set(field, [...this._draft[field], { name: '', amount: 0, unit: 'mg/L' }]);
    }
    _removeComponent(field, index) {
        this._set(field, this._draft[field].filter((_, position) => position !== index));
    }
    /** Whether saving this draft would fork a Medium Version. */
    get _forks() {
        if (!this.medium)
            return false;
        const { name: _draftName, ...formulation } = this._draft;
        const current = this.medium.versions.find((version) => version.version === this.medium?.current_version);
        if (!current)
            return true;
        const { version: _version, created_at: _createdAt, ...pinned } = current;
        return JSON.stringify(formulation) !== JSON.stringify(pinned);
    }
    _submit(event) {
        event.preventDefault();
        this.dispatchEvent(new CustomEvent('medium-save-requested', {
            detail: { id: this.medium?.id, draft: this._draft },
            bubbles: true,
            composed: true,
        }));
    }
    _cancel() {
        this.dispatchEvent(new CustomEvent('medium-cancel-requested', { bubbles: true, composed: true }));
    }
    _renderComponents(field, legend) {
        return x `
      <fieldset>
        <legend>${legend}</legend>
        ${this._draft[field].map((entry, index) => x `
            <div class="component-row">
              <label>
                ${this._t('medium_component_name')}
                <input
                  .value=${entry.name}
                  @input=${(event) => this._setComponent(field, index, 'name', event)}
                />
              </label>
              <label>
                ${this._t('medium_component_amount')}
                <input
                  type="number"
                  step="any"
                  .value=${String(entry.amount)}
                  @input=${(event) => this._setComponent(field, index, 'amount', event)}
                />
              </label>
              <label>
                ${this._t('medium_component_unit')}
                <input
                  .value=${entry.unit}
                  @input=${(event) => this._setComponent(field, index, 'unit', event)}
                />
              </label>
              <button
                type="button"
                aria-label=${this._t('medium_component_remove')}
                @click=${() => this._removeComponent(field, index)}
              >
                ${this._t('medium_component_remove')}
              </button>
            </div>
          `)}
        <button type="button" @click=${() => this._addComponent(field)}>
          ${this._t('medium_component_add')}
        </button>
      </fieldset>
    `;
    }
    render() {
        return x `
      <form @submit=${this._submit}>
        <h3>${this._t(this.medium ? 'medium_form_edit_title' : 'medium_form_new_title')}</h3>

        <label>
          ${this._t('medium_name')}
          <input .value=${this._draft.name} @input=${(e) => this._setText('name', e)} />
        </label>

        <label>
          ${this._t('medium_base_salts')}
          <input
            .value=${this._draft.base_salts}
            @input=${(e) => this._setText('base_salts', e)}
          />
        </label>

        ${this._renderComponents('hormones', this._t('medium_hormones'))}
        ${this._renderComponents('additives', this._t('medium_additives'))}

        <div class="numbers">
          <label>
            ${this._t('medium_agar')}
            <input
              type="number"
              step="any"
              .value=${String(this._draft.agar_g_per_l)}
              @input=${(e) => this._setNumber('agar_g_per_l', e)}
            />
          </label>
          <label>
            ${this._t('medium_sugar')}
            <input
              type="number"
              step="any"
              .value=${String(this._draft.sugar_g_per_l)}
              @input=${(e) => this._setNumber('sugar_g_per_l', e)}
            />
          </label>
          <label>
            ${this._t('medium_ph')}
            <input
              type="number"
              step="any"
              .value=${String(this._draft.ph_target)}
              @input=${(e) => this._setNumber('ph_target', e)}
            />
          </label>
        </div>

        <label>
          ${this._t('medium_notes')}
          <textarea
            .value=${this._draft.notes}
            @input=${(e) => this._setText('notes', e)}
          ></textarea>
        </label>

        ${this.medium
            ? x `<p class="supporting">
              ${this._t(this._forks ? 'medium_will_fork' : 'medium_will_not_fork')}
            </p>`
            : E}
        ${this.error ? x `<p class="error" role="alert">${this.error}</p>` : E}

        <div class="buttons">
          <button type="button" @click=${this._cancel}>${this._t('medium_cancel')}</button>
          <button type="submit" ?disabled=${this.saving}>
            ${this._t(this.saving ? 'medium_saving' : 'medium_save')}
          </button>
        </div>
      </form>
    `;
    }
};
GrowspaceTcMediumForm.styles = [
    variables,
    sharedStyles,
    i `
      :host {
        display: block;
      }

      form {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      h3 {
        margin: 0;
        font-size: 1rem;
        font-weight: 600;
      }

      label {
        display: flex;
        flex-direction: column;
        gap: 4px;
        font-size: 0.8125rem;
      }

      input,
      textarea {
        font: inherit;
        color: inherit;
        background: var(--card-background-color, rgba(255, 255, 255, 0.04));
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.12));
        border-radius: 8px;
        padding: 8px 10px;
        min-height: 36px;
      }

      .numbers {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
        gap: 12px;
      }

      fieldset {
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.12));
        border-radius: 10px;
        padding: 10px 12px;
        margin: 0;
      }

      legend {
        font-size: 0.8125rem;
        opacity: 0.8;
        padding: 0 4px;
      }

      .component-row {
        display: grid;
        grid-template-columns: 2fr 1fr 1fr auto;
        gap: 8px;
        align-items: end;
        margin-bottom: 8px;
      }

      .supporting {
        opacity: 0.7;
        font-size: 0.8125rem;
        margin: 0;
      }

      .error {
        color: var(--error-color, #f44336);
        font-size: 0.8125rem;
        margin: 0;
      }

      .buttons {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
      }

      button {
        font: inherit;
        color: inherit;
        background: none;
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.12));
        border-radius: 999px;
        padding: 6px 14px;
        min-height: 36px;
        cursor: pointer;
      }

      button[type='submit'] {
        border-color: var(--primary-color);
      }

      button[disabled] {
        opacity: 0.5;
        cursor: default;
      }
    `,
];
__decorate([
    n({ attribute: false })
], GrowspaceTcMediumForm.prototype, "medium", void 0);
__decorate([
    n({ type: Boolean })
], GrowspaceTcMediumForm.prototype, "saving", void 0);
__decorate([
    n({ type: String })
], GrowspaceTcMediumForm.prototype, "error", void 0);
__decorate([
    n({ type: String })
], GrowspaceTcMediumForm.prototype, "language", void 0);
__decorate([
    r()
], GrowspaceTcMediumForm.prototype, "_draft", void 0);
GrowspaceTcMediumForm = __decorate([
    t('growspace-tc-medium-form')
], GrowspaceTcMediumForm);

var GrowspaceTcView_1;
/**
 * The tissue-culture view.
 *
 * It holds the Culture Medium library today; the remaining V1 model tickets add
 * the due/overdue worklist, the culture board and the pairing editor around it.
 * What it proves is the whole load path — the presence probe answered, the
 * chunk was fetched, and the surface rendered inside a card that ships no TC
 * code in its entry bundle.
 *
 * Every surface is gated on a manifest feature rather than on the installed
 * release: a TC that predates the medium library answers the presence probe
 * perfectly well, and the honest response to that is a view without a library,
 * not a library whose every call fails.
 */
let GrowspaceTcView = GrowspaceTcView_1 = class GrowspaceTcView extends i$1 {
    constructor() {
        super(...arguments);
        this.language = 'en';
        this._media = [];
        this._loading = false;
        this._error = '';
        this._saving = false;
        this._saveError = '';
        this._editing = { open: false };
        this._requested = false;
    }
    get _hasMediumLibrary() {
        return this.manifest?.features.includes(TC_FEATURE_CULTURE_MEDIA) ?? false;
    }
    connectedCallback() {
        super.connectedCallback();
        this._unsubscribe = cultureMedia$.subscribe((media) => {
            this._media = [...media];
        });
    }
    disconnectedCallback() {
        this._unsubscribe?.();
        this._unsubscribe = undefined;
        super.disconnectedCallback();
    }
    updated(changed) {
        // Driven by the manifest rather than by the first render: the card sets
        // `.manifest` once the presence probe answers, and a view that fetched in
        // `firstUpdated` would decide against a manifest it did not have yet.
        if (changed.has('manifest') && this._hasMediumLibrary && !this._requested) {
            this._requested = true;
            void this._load();
        }
    }
    _t(key) {
        return localize(`tc.${key}`, '', '', this.language);
    }
    static _message(error) {
        return error instanceof Error ? error.message : String(error);
    }
    async _load() {
        this._loading = true;
        this._error = '';
        try {
            await fetchCultureMedia();
        }
        catch (error) {
            this._error = GrowspaceTcView_1._message(error);
        }
        finally {
            this._loading = false;
        }
    }
    _startCreate() {
        this._saveError = '';
        this._editing = { open: true };
    }
    _startEdit(event) {
        const medium = this._media.find((entry) => entry.id === event.detail.id);
        if (!medium)
            return;
        this._saveError = '';
        this._editing = { open: true, medium };
    }
    _cancelEdit() {
        this._editing = { open: false };
        this._saveError = '';
    }
    async _save(event) {
        const { id, draft } = event.detail;
        this._saving = true;
        this._saveError = '';
        try {
            if (id) {
                await updateCultureMedium(id, draft);
            }
            else {
                await createCultureMedium(draft);
            }
            this._editing = { open: false };
        }
        catch (error) {
            // The form stays open holding the draft: the backend rejected a value,
            // and throwing the grower's typing away would be the second failure.
            this._saveError = GrowspaceTcView_1._message(error);
        }
        finally {
            this._saving = false;
        }
    }
    _askToDelete(event) {
        this._pendingDelete = this._media.find((entry) => entry.id === event.detail.id);
    }
    async _confirmDelete() {
        const medium = this._pendingDelete;
        if (!medium)
            return;
        this._pendingDelete = undefined;
        try {
            await deleteCultureMedium(medium.id);
            if (this._editing.open && this._editing.medium?.id === medium.id) {
                this._editing = { open: false };
            }
        }
        catch (error) {
            this._error = GrowspaceTcView_1._message(error);
        }
    }
    /**
     * Deleting a medium takes its whole version history with it, so the prompt
     * says so and counts the versions rather than asking "are you sure?".
     */
    _renderDeleteConfirmation(medium) {
        return x `
      <div class="confirm" role="alertdialog" aria-label=${this._t('medium_delete')}>
        <p>
          ${localizeWithParams('tc.medium_delete_confirm', { name: medium.name, count: medium.versions.length }, this.language)}
        </p>
        <div class="confirm-buttons">
          <button @click=${() => (this._pendingDelete = undefined)}>
            ${this._t('medium_cancel')}
          </button>
          <button @click=${this._confirmDelete}>${this._t('medium_delete')}</button>
        </div>
      </div>
    `;
    }
    render() {
        if (!this._hasMediumLibrary) {
            return x `
        <div class="state" role="region" aria-label=${this._t('view_title')}>
          <h3>${this._t('empty_title')}</h3>
          <p class="supporting">${this._t('empty_body')}</p>
        </div>
      `;
        }
        return x `
      <div role="region" aria-label=${this._t('view_title')}>
        ${this._error ? x `<p class="error" role="alert">${this._error}</p>` : E}
        ${this._pendingDelete ? this._renderDeleteConfirmation(this._pendingDelete) : E}
        ${this._editing.open
            ? x `<growspace-tc-medium-form
              .medium=${this._editing.medium}
              .saving=${this._saving}
              .error=${this._saveError}
              .language=${this.language}
              @medium-save-requested=${this._save}
              @medium-cancel-requested=${this._cancelEdit}
            ></growspace-tc-medium-form>`
            : x `<growspace-tc-medium-library
              .media=${this._media}
              .language=${this.language}
              @medium-create-requested=${this._startCreate}
              @medium-edit-requested=${this._startEdit}
              @medium-delete-requested=${this._askToDelete}
            ></growspace-tc-medium-library>`}
        ${this._loading ? x `<p class="supporting">${this._t('medium_loading')}</p>` : E}
      </div>
    `;
    }
};
GrowspaceTcView.styles = [
    variables,
    sharedStyles,
    i `
      :host {
        display: block;
        padding: 16px;
      }

      .state {
        padding: 24px 16px;
        text-align: center;
      }

      h3 {
        margin: 0 0 4px;
      }

      .supporting {
        opacity: 0.7;
      }

      .error {
        color: var(--error-color, #f44336);
      }

      .confirm {
        border: 1px solid var(--error-color, #f44336);
        border-radius: 10px;
        padding: 12px;
        margin-bottom: 12px;
      }

      .confirm p {
        margin: 0 0 8px;
      }

      .confirm-buttons {
        display: flex;
        gap: 8px;
      }

      button {
        font: inherit;
        color: inherit;
        background: none;
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.12));
        border-radius: 999px;
        padding: 6px 14px;
        min-height: 36px;
        cursor: pointer;
      }
    `,
];
__decorate([
    n({ attribute: false })
], GrowspaceTcView.prototype, "manifest", void 0);
__decorate([
    n({ type: String })
], GrowspaceTcView.prototype, "language", void 0);
__decorate([
    r()
], GrowspaceTcView.prototype, "_media", void 0);
__decorate([
    r()
], GrowspaceTcView.prototype, "_loading", void 0);
__decorate([
    r()
], GrowspaceTcView.prototype, "_error", void 0);
__decorate([
    r()
], GrowspaceTcView.prototype, "_saving", void 0);
__decorate([
    r()
], GrowspaceTcView.prototype, "_saveError", void 0);
__decorate([
    r()
], GrowspaceTcView.prototype, "_editing", void 0);
__decorate([
    r()
], GrowspaceTcView.prototype, "_pendingDelete", void 0);
GrowspaceTcView = GrowspaceTcView_1 = __decorate([
    t('growspace-tc-view')
], GrowspaceTcView);

export { GrowspaceTcView };
//# sourceMappingURL=growspace-tc-Bv43g91r.js.map
