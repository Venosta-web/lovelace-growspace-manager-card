/*! growspace-e2e-build source=6895af5a0ad5368094340b85c788321aefc4d701742b48363e6abc3fce2d2db3 id=f846c8183f5c9a3dd4026da34d5dd503 */
const { cF: variables, bK: sharedStyles, i, _: __decorate, n, A: r, t, g: i$1, bQ: localize, x, bR: localizeWithParams, E, eg: draftIntroduction, eh: cultureLines$, d5: strainLibrary$, ei: fetchCultureLines, W: fetchStrainLibrary, ej: phenotypeOptions, ek: phenotypeNameIndex, el: resolvePhenotype, em: introduceCultureLine, en: relinkPhenotype, eo: setCultureLineArchived, ep: draftFromMedium, eq: TC_FEATURE_CULTURE_MEDIA, er: TC_FEATURE_CULTURE_LINES, es: cultureMedia$, et: fetchCultureMedia, eu: updateCultureMedium, ev: createCultureMedium, ew: deleteCultureMedium } = await import(window.__growspaceEntryUrl ?? './growspace-manager-card.js');

/**
 * The culture board — every Culture Line with the vessels it is kept in.
 *
 * The board's real subject is the Phenotype Reference. TC stores an opaque
 * phenotype ID owned by Growspace Manager and a display-name snapshot taken
 * when the reference was made (TC ADR-0002, ADR-0006); the join happens in the
 * card, and this element renders whichever of the three answers it was handed.
 * A reference that no longer resolves is drawn as an explicit **Missing
 * Phenotype** — named from the snapshot, offering a re-link and an archive —
 * and never as a line that quietly disappeared or as a blank name.
 *
 * The third answer matters as much as the other two: while the strain library
 * has not loaded, a line is `unresolved` and shows its snapshot without any
 * missing-phenotype claim. An empty library and a deleted phenotype look
 * identical from the join alone, and marking every line missing because a fetch
 * failed would be a worse lie than a stale name.
 *
 * Dumb by contract (ADR-0019): lines and resolutions in, intents out. Which
 * line's vessels are expanded is the only state it owns.
 */
let GrowspaceTcCultureBoard = class GrowspaceTcCultureBoard extends i$1 {
    constructor() {
        super(...arguments);
        this.lines = [];
        /** How each line's phenotype resolved, keyed by line ID. */
        this.resolutions = new Map();
        /** Whether archived lines are shown. Archived lines are never dropped. */
        this.showArchived = false;
        this.language = 'en';
        this._openLines = new Set();
    }
    _t(key) {
        return localize(`tc.${key}`, '', '', this.language);
    }
    _emit(type, detail) {
        this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
    }
    _toggleVessels(lineId) {
        const open = new Set(this._openLines);
        if (!open.delete(lineId))
            open.add(lineId);
        this._openLines = open;
    }
    /** The day a stamp names, or the raw stamp if it cannot be read. */
    _day(iso) {
        const taken = new Date(iso);
        return Number.isNaN(taken.getTime()) ? iso : taken.toLocaleDateString(this.language);
    }
    _resolutionOf(line) {
        // A line the container has not resolved yet is `unresolved` rather than
        // missing, for the same reason an unloaded library is.
        return (this.resolutions.get(line.id) ?? {
            status: 'unresolved',
            name: line.phenotype.name_snapshot,
        });
    }
    _renderCultures(cultures) {
        return x `
      <table class="cultures">
        <thead>
          <tr>
            <th>${this._t('culture_stage')}</th>
            <th>${this._t('culture_status')}</th>
            <th>${this._t('culture_plantlets')}</th>
            <th>${this._t('culture_location')}</th>
            <th>${this._t('culture_started')}</th>
          </tr>
        </thead>
        <tbody>
          ${cultures.map((culture) => x `
              <tr>
                <td>${this._t(`culture_stage_${culture.stage}`)}</td>
                <td>${this._t(`culture_status_${culture.status}`)}</td>
                <td>
                  ${culture.plantlet_count === null
            ? this._t('culture_plantlets_uncounted')
            : culture.plantlet_count}
                </td>
                <td>${culture.location || this._t('culture_location_none')}</td>
                <td>${this._day(culture.started_at)}</td>
              </tr>
            `)}
        </tbody>
      </table>
    `;
    }
    /**
     * The Missing Phenotype state: the snapshot, said to be a snapshot, and the
     * two ways out. Never a silent drop and never a bare ID.
     */
    _renderMissing(line) {
        return x `
      <p class="missing-note" role="status">
        ${localizeWithParams('tc.line_missing_phenotype', { name: line.phenotype.name_snapshot }, this.language)}
      </p>
    `;
    }
    _renderLine(line) {
        const resolution = this._resolutionOf(line);
        const missing = resolution.status === 'missing';
        const archived = line.archived_at !== null;
        const open = this._openLines.has(line.id);
        return x `
      <li class="line ${missing ? 'missing' : ''} ${archived ? 'archived' : ''}">
        <div class="line-head">
          <h4>${resolution.name}</h4>
          ${missing
            ? x `<span class="chip missing">${this._t('line_missing_chip')}</span>`
            : E}
          ${archived ? x `<span class="chip">${this._t('line_archived_chip')}</span>` : E}
          <div class="actions">
            <button @click=${() => this._emit('line-relink-requested', { id: line.id })}>
              ${this._t('line_relink')}
            </button>
            <button
              @click=${() => this._emit('line-archive-requested', { id: line.id, archived: !archived })}
            >
              ${this._t(archived ? 'line_unarchive' : 'line_archive')}
            </button>
          </div>
        </div>
        ${missing ? this._renderMissing(line) : E}
        <dl class="intervals">
          <dt>${this._t('line_interval_multiplication')}</dt>
          <dd>
            ${localizeWithParams('tc.line_interval_days', { days: line.replate_interval_days.multiplication }, this.language)}
          </dd>
          <dt>${this._t('line_interval_rooting')}</dt>
          <dd>
            ${localizeWithParams('tc.line_interval_days', { days: line.replate_interval_days.rooting }, this.language)}
          </dd>
        </dl>
        <button
          class="link"
          aria-expanded=${open ? 'true' : 'false'}
          @click=${() => this._toggleVessels(line.id)}
        >
          ${localizeWithParams(open ? 'tc.line_hide_vessels' : 'tc.line_show_vessels', { count: line.cultures.length }, this.language)}
        </button>
        ${open ? this._renderCultures(line.cultures) : E}
      </li>
    `;
    }
    render() {
        // Archived lines are filtered here rather than dropped from the payload:
        // the backend keeps listing them, so hiding one is a view decision the
        // grower can take back with the toggle beside it.
        const archivedCount = this.lines.filter((line) => line.archived_at !== null).length;
        const shown = this.showArchived
            ? this.lines
            : this.lines.filter((line) => line.archived_at === null);
        return x `
      <section aria-label=${this._t('board_title')}>
        <header class="board">
          <h3>${this._t('board_title')}</h3>
          <div class="header-actions">
            ${archivedCount || this.showArchived
            ? x `<button
                  class="link"
                  aria-pressed=${this.showArchived ? 'true' : 'false'}
                  @click=${() => this._emit('line-show-archived-toggled')}
                >
                  ${localizeWithParams(this.showArchived ? 'tc.board_hide_archived' : 'tc.board_show_archived', { count: archivedCount }, this.language)}
                </button>`
            : E}
            <button @click=${() => this._emit('line-introduce-requested')}>
              ${this._t('line_introduce')}
            </button>
          </div>
        </header>
        ${shown.length
            ? x `<ul>
              ${shown.map((line) => this._renderLine(line))}
            </ul>`
            : x `<p class="empty supporting">${this._t('board_empty')}</p>`}
      </section>
    `;
    }
};
GrowspaceTcCultureBoard.styles = [
    variables,
    sharedStyles,
    i `
      :host {
        display: block;
      }

      header.board {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
        margin-bottom: 12px;
      }

      header.board h3 {
        margin: 0;
        font-size: 1rem;
        font-weight: 600;
      }

      .header-actions {
        display: flex;
        gap: 8px;
        align-items: center;
      }

      ul {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      li.line {
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.12));
        border-radius: 12px;
        padding: 12px 14px;
      }

      li.line.missing {
        border-color: var(--warning-color, #ffa726);
      }

      li.line.archived {
        opacity: 0.65;
      }

      .line-head {
        display: flex;
        align-items: baseline;
        gap: 8px;
        flex-wrap: wrap;
      }

      .line-head h4 {
        margin: 0;
        font-size: 0.9375rem;
        font-weight: 600;
      }

      .chip {
        font-size: 0.75rem;
        font-weight: 600;
        padding: 1px 8px;
        border-radius: 999px;
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.12));
      }

      .chip.missing {
        border-color: var(--warning-color, #ffa726);
        color: var(--warning-color, #ffa726);
      }

      .actions {
        margin-left: auto;
        display: flex;
        gap: 4px;
      }

      .missing-note {
        margin: 8px 0 0;
        font-size: 0.8125rem;
        color: var(--warning-color, #ffa726);
      }

      dl.intervals {
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

      table.cultures {
        width: 100%;
        margin-top: 10px;
        border-collapse: collapse;
        font-size: 0.8125rem;
      }

      table.cultures th,
      table.cultures td {
        text-align: left;
        padding: 4px 8px 4px 0;
        border-bottom: 1px solid var(--divider-color, rgba(255, 255, 255, 0.12));
      }

      table.cultures th {
        opacity: 0.7;
        font-weight: 500;
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

      button.link {
        border: none;
        padding: 6px 0;
        text-decoration: underline;
        min-height: 32px;
      }
    `,
];
__decorate([
    n({ attribute: false })
], GrowspaceTcCultureBoard.prototype, "lines", void 0);
__decorate([
    n({ attribute: false })
], GrowspaceTcCultureBoard.prototype, "resolutions", void 0);
__decorate([
    n({ type: Boolean })
], GrowspaceTcCultureBoard.prototype, "showArchived", void 0);
__decorate([
    n({ type: String })
], GrowspaceTcCultureBoard.prototype, "language", void 0);
__decorate([
    r()
], GrowspaceTcCultureBoard.prototype, "_openLines", void 0);
GrowspaceTcCultureBoard = __decorate([
    t('growspace-tc-culture-board')
], GrowspaceTcCultureBoard);

/**
 * The phenotype picker — one list of Growspace Manager's phenotypes.
 *
 * It exists as its own element because two flows need exactly the same
 * question: the Introduction, which takes the first reference, and the re-link
 * that repairs a Missing Phenotype. Both must send the ID *and* the name they
 * were looking at, because the name is snapshotted at reference time
 * (TC ADR-0006) — a picker that emitted only the ID would leave the backend to
 * invent a snapshot it has no way to read.
 *
 * A strain library is hundreds of rows, so it filters. Filtering is view state
 * and stays here; the selection is the caller's.
 *
 * Dumb by contract (ADR-0019): options in, a chosen phenotype out.
 */
/** How many matches are listed before the grower is asked to keep typing. */
const MAX_SHOWN = 30;
let GrowspaceTcPhenotypePicker = class GrowspaceTcPhenotypePicker extends i$1 {
    constructor() {
        super(...arguments);
        this.phenotypes = [];
        /** The chosen phenotype's ID, or '' for none. */
        this.selected = '';
        this.language = 'en';
        this._filter = '';
    }
    _t(key) {
        return localize(`tc.${key}`, '', '', this.language);
    }
    get _matches() {
        const needle = this._filter.trim().toLocaleLowerCase(this.language);
        if (!needle)
            return this.phenotypes;
        return this.phenotypes.filter((option) => option.name.toLocaleLowerCase(this.language).includes(needle));
    }
    _choose(option) {
        this.dispatchEvent(new CustomEvent('phenotype-selected', {
            detail: { id: option.id, name: option.name },
            bubbles: true,
            composed: true,
        }));
    }
    render() {
        // An empty library is not the same as no matches: nothing was fetched, so
        // saying "no phenotype matches" would blame the search box for it.
        if (!this.phenotypes.length) {
            return x `<p class="supporting">${this._t('picker_library_empty')}</p>`;
        }
        const matches = this._matches;
        const shown = matches.slice(0, MAX_SHOWN);
        return x `
      <div>
        <label>
          ${this._t('picker_filter')}
          <input
            type="search"
            .value=${this._filter}
            @input=${(event) => (this._filter = event.target.value)}
          />
        </label>
        ${shown.length
            ? x `<ul role="listbox" aria-label=${this._t('picker_label')}>
              ${shown.map((option) => x `
                  <li>
                    <button
                      type="button"
                      role="option"
                      aria-selected=${option.id === this.selected ? 'true' : 'false'}
                      aria-pressed=${option.id === this.selected ? 'true' : 'false'}
                      @click=${() => this._choose(option)}
                    >
                      ${option.name}
                    </button>
                  </li>
                `)}
            </ul>`
            : x `<p class="supporting">${this._t('picker_no_matches')}</p>`}
        ${matches.length > shown.length
            ? x `<p class="supporting">
              ${localizeWithParams('tc.picker_more_matches', { count: matches.length - shown.length }, this.language)}
            </p>`
            : E}
      </div>
    `;
    }
};
GrowspaceTcPhenotypePicker.styles = [
    variables,
    sharedStyles,
    i `
      :host {
        display: block;
      }

      input[type='search'] {
        width: 100%;
        box-sizing: border-box;
      }

      ul {
        list-style: none;
        margin: 8px 0 0;
        padding: 0;
        max-height: 220px;
        overflow-y: auto;
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.12));
        border-radius: 10px;
      }

      li button {
        display: block;
        width: 100%;
        text-align: left;
        font: inherit;
        color: inherit;
        background: none;
        border: none;
        border-bottom: 1px solid var(--divider-color, rgba(255, 255, 255, 0.12));
        padding: 8px 10px;
        min-height: 40px;
        cursor: pointer;
      }

      li:last-child button {
        border-bottom: none;
      }

      li button[aria-pressed='true'] {
        background: var(--primary-color);
        color: var(--text-primary-color, #fff);
      }

      .supporting {
        opacity: 0.7;
        font-size: 0.8125rem;
        margin: 6px 0 0;
      }
    `,
];
__decorate([
    n({ attribute: false })
], GrowspaceTcPhenotypePicker.prototype, "phenotypes", void 0);
__decorate([
    n({ type: String })
], GrowspaceTcPhenotypePicker.prototype, "selected", void 0);
__decorate([
    n({ type: String })
], GrowspaceTcPhenotypePicker.prototype, "language", void 0);
__decorate([
    r()
], GrowspaceTcPhenotypePicker.prototype, "_filter", void 0);
GrowspaceTcPhenotypePicker = __decorate([
    t('growspace-tc-phenotype-picker')
], GrowspaceTcPhenotypePicker);

/**
 * The Introduction form — starting a Culture Line from a phenotype.
 *
 * One Introduction produces one line and its first vessel, so this form asks
 * for both at once: the phenotype to reference, the replate interval for each
 * Culture Stage, and the first Culture's stage, plantlet count and location.
 * Splitting them into two steps would allow a line with no vessel, which is a
 * lineage nobody is keeping alive.
 *
 * The interval fields are per stage and neither is optional. The number is the
 * grower's protocol; a defaulted one would produce a Replate Due Date that
 * looks authoritative and was invented. The form seeds them with a common
 * starting point and says they are editable rather than hiding them.
 *
 * Dumb by contract (ADR-0019): phenotypes in, a draft out.
 */
let GrowspaceTcIntroductionForm = class GrowspaceTcIntroductionForm extends i$1 {
    constructor() {
        super(...arguments);
        this.phenotypes = [];
        this.saving = false;
        /** A backend rejection, already phrased for the grower by the backend. */
        this.error = '';
        this.language = 'en';
        this._draft = draftIntroduction();
    }
    _t(key) {
        return localize(`tc.${key}`, '', '', this.language);
    }
    _set(key, value) {
        this._draft = { ...this._draft, [key]: value };
    }
    /**
     * Record both halves of the reference at once.
     *
     * The name is what the backend snapshots, so it is taken from the option the
     * grower actually clicked rather than looked up again at save time.
     */
    _selectPhenotype(event) {
        this._draft = {
            ...this._draft,
            phenotype_id: event.detail.id,
            phenotype_name: event.detail.name,
        };
    }
    _setInterval(stage, event) {
        // An empty or half-typed field becomes NaN rather than 0: the backend
        // rejects it with a sentence naming the stage, which is a better answer
        // than recording an interval nobody chose.
        this._set('replate_interval_days', {
            ...this._draft.replate_interval_days,
            [stage]: Number(event.target.value),
        });
    }
    _setPlantletCount(event) {
        // Left blank stays null. "Nobody counted" and "the vessel is empty" are
        // different facts, and only one of them is a zero.
        const raw = event.target.value.trim();
        this._set('plantlet_count', raw === '' ? null : Number(raw));
    }
    _submit(event) {
        event.preventDefault();
        this.dispatchEvent(new CustomEvent('introduction-requested', {
            detail: { draft: this._draft },
            bubbles: true,
            composed: true,
        }));
    }
    _cancel() {
        this.dispatchEvent(new CustomEvent('introduction-cancelled', { bubbles: true, composed: true }));
    }
    render() {
        const chosen = this._draft.phenotype_id !== '';
        return x `
      <form @submit=${this._submit}>
        <h3>${this._t('introduction_title')}</h3>
        <p class="supporting">${this._t('introduction_explainer')}</p>

        <fieldset>
          <legend>${this._t('introduction_phenotype')}</legend>
          ${chosen
            ? x `<p class="chosen">${this._draft.phenotype_name}</p>`
            : x `<p class="supporting">${this._t('introduction_phenotype_none')}</p>`}
          <growspace-tc-phenotype-picker
            .phenotypes=${this.phenotypes}
            .selected=${this._draft.phenotype_id}
            .language=${this.language}
            @phenotype-selected=${this._selectPhenotype}
          ></growspace-tc-phenotype-picker>
        </fieldset>

        <fieldset>
          <legend>${this._t('introduction_intervals')}</legend>
          <p class="supporting">${this._t('introduction_intervals_explainer')}</p>
          <div class="row">
            <label>
              ${this._t('line_interval_multiplication')}
              <input
                type="number"
                min="1"
                step="1"
                .value=${String(this._draft.replate_interval_days.multiplication)}
                @input=${(e) => this._setInterval('multiplication', e)}
              />
            </label>
            <label>
              ${this._t('line_interval_rooting')}
              <input
                type="number"
                min="1"
                step="1"
                .value=${String(this._draft.replate_interval_days.rooting)}
                @input=${(e) => this._setInterval('rooting', e)}
              />
            </label>
          </div>
        </fieldset>

        <fieldset>
          <legend>${this._t('introduction_first_culture')}</legend>
          <div class="row">
            <label>
              ${this._t('culture_stage')}
              <select
                .value=${this._draft.stage}
                @change=${(e) => this._set('stage', e.target.value)}
              >
                <option value="multiplication">${this._t('culture_stage_multiplication')}</option>
                <option value="rooting">${this._t('culture_stage_rooting')}</option>
              </select>
            </label>
            <label>
              ${this._t('culture_plantlets')}
              <input
                type="number"
                min="0"
                step="1"
                placeholder=${this._t('culture_plantlets_uncounted')}
                .value=${this._draft.plantlet_count === null
            ? ''
            : String(this._draft.plantlet_count)}
                @input=${this._setPlantletCount}
              />
            </label>
            <label>
              ${this._t('culture_location')}
              <input
                .value=${this._draft.location}
                @input=${(e) => this._set('location', e.target.value)}
              />
            </label>
          </div>
        </fieldset>

        ${this.error ? x `<p class="error" role="alert">${this.error}</p>` : E}

        <div class="buttons">
          <button type="button" @click=${this._cancel}>${this._t('medium_cancel')}</button>
          <button type="submit" ?disabled=${this.saving || !chosen}>
            ${this._t(this.saving ? 'introduction_saving' : 'introduction_save')}
          </button>
        </div>
      </form>
    `;
    }
};
GrowspaceTcIntroductionForm.styles = [
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
      select {
        font: inherit;
        color: inherit;
        background: var(--card-background-color, transparent);
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.12));
        border-radius: 8px;
        padding: 8px 10px;
        min-height: 40px;
      }

      fieldset {
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.12));
        border-radius: 10px;
        padding: 10px 12px;
        margin: 0;
      }

      legend {
        font-size: 0.8125rem;
        opacity: 0.7;
      }

      .row {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        gap: 10px;
      }

      .chosen {
        font-weight: 600;
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

      .error {
        color: var(--error-color, #f44336);
      }

      .supporting {
        opacity: 0.7;
        font-size: 0.8125rem;
        margin: 0;
      }
    `,
];
__decorate([
    n({ attribute: false })
], GrowspaceTcIntroductionForm.prototype, "phenotypes", void 0);
__decorate([
    n({ type: Boolean })
], GrowspaceTcIntroductionForm.prototype, "saving", void 0);
__decorate([
    n({ type: String })
], GrowspaceTcIntroductionForm.prototype, "error", void 0);
__decorate([
    n({ type: String })
], GrowspaceTcIntroductionForm.prototype, "language", void 0);
__decorate([
    r()
], GrowspaceTcIntroductionForm.prototype, "_draft", void 0);
GrowspaceTcIntroductionForm = __decorate([
    t('growspace-tc-introduction-form')
], GrowspaceTcIntroductionForm);

/**
 * The culture board's container: the fetch, the join, and the two ways out.
 *
 * The join is the reason this element exists. TC stores an opaque phenotype ID
 * and a display-name snapshot and never resolves either (TC ADR-0002), so the
 * card resolves them against Growspace Manager's strain library — data the card
 * already fetches for its own dialogs. That join is what turns a dangling
 * reference into a Missing Phenotype the grower can act on (TC ADR-0006), and
 * both actions on it are backend commands: re-link, or archive.
 *
 * One honesty rule runs through it. A phenotype is only reported missing once
 * the strain library has actually loaded. An empty library and a deleted
 * phenotype are indistinguishable from the join alone, so a failed fetch would
 * otherwise mark every line missing and offer to repair references that were
 * never broken.
 */
var GrowspaceTcCultures_1;
let GrowspaceTcCultures = GrowspaceTcCultures_1 = class GrowspaceTcCultures extends i$1 {
    constructor() {
        super(...arguments);
        this.language = 'en';
        this._lines = [];
        this._library = [];
        this._libraryLoaded = false;
        this._loading = false;
        this._error = '';
        this._saving = false;
        this._saveError = '';
        this._introducing = false;
        this._relinking = { open: false };
        this._showArchived = false;
        this._unsubscribe = [];
    }
    connectedCallback() {
        super.connectedCallback();
        this._unsubscribe = [
            cultureLines$.subscribe((lines) => {
                this._lines = [...lines];
            }),
            strainLibrary$.subscribe((library) => {
                this._library = [...library];
                // A subscription fires once on subscribe, before anything was
                // fetched. Only a non-empty library proves the fetch landed; an empty
                // one is settled by `_load` instead, which knows whether it threw.
                if (library.length)
                    this._libraryLoaded = true;
            }),
        ];
        void this._load();
    }
    disconnectedCallback() {
        for (const unsubscribe of this._unsubscribe)
            unsubscribe();
        this._unsubscribe = [];
        super.disconnectedCallback();
    }
    _t(key) {
        return localize(`tc.${key}`, '', '', this.language);
    }
    static _message(error) {
        return error instanceof Error ? error.message : String(error);
    }
    /**
     * Fetch the board, and the library the board is read through.
     *
     * The two are independent: a board that arrives without a library is still
     * worth rendering — from the snapshots, with nothing claimed missing — so a
     * library failure never fails the board.
     */
    async _load() {
        this._loading = true;
        this._error = '';
        const library = this._loadLibrary();
        try {
            await fetchCultureLines();
        }
        catch (error) {
            this._error = GrowspaceTcCultures_1._message(error);
        }
        finally {
            await library;
            this._loading = false;
        }
    }
    /**
     * Fetch the strain library, and know whether it arrived.
     *
     * Deliberately not `fetchStrainLibrary({ cache: true })`. That variant
     * swallows a failure and resolves with whatever the atom already held, which
     * for this element is indistinguishable from an empty library that really
     * loaded — and would mark every line's phenotype missing because the network
     * was down. The uncached call throws, and only a resolved one sets the flag.
     */
    async _loadLibrary() {
        try {
            await fetchStrainLibrary();
            this._libraryLoaded = true;
        }
        catch {
            // Swallowed here rather than surfaced: the board is still worth
            // rendering from its snapshots, and nothing is accused of being missing.
            this._libraryLoaded = false;
        }
    }
    get _phenotypes() {
        return phenotypeOptions(this._library);
    }
    /** How each line's phenotype resolved, keyed by line ID. */
    get _resolutions() {
        const names = phenotypeNameIndex(this._library);
        return new Map(this._lines.map((line) => [
            line.id,
            resolvePhenotype(line.phenotype, names, this._libraryLoaded),
        ]));
    }
    _startIntroduction() {
        this._saveError = '';
        this._introducing = true;
    }
    _cancelIntroduction() {
        this._introducing = false;
        this._saveError = '';
    }
    async _introduce(event) {
        this._saving = true;
        this._saveError = '';
        try {
            await introduceCultureLine(event.detail.draft);
            this._introducing = false;
        }
        catch (error) {
            // The form stays open holding the draft: the backend rejected a value,
            // and throwing the grower's typing away would be the second failure.
            this._saveError = GrowspaceTcCultures_1._message(error);
        }
        finally {
            this._saving = false;
        }
    }
    _startRelink(event) {
        const line = this._lines.find((entry) => entry.id === event.detail.id);
        if (!line)
            return;
        this._error = '';
        this._relinking = { open: true, line };
    }
    async _relink(event) {
        if (!this._relinking.open)
            return;
        const { line } = this._relinking;
        this._relinking = { open: false };
        try {
            await relinkPhenotype(line.id, event.detail.id, event.detail.name);
        }
        catch (error) {
            this._error = GrowspaceTcCultures_1._message(error);
        }
    }
    async _setArchived(event) {
        try {
            await setCultureLineArchived(event.detail.id, event.detail.archived);
        }
        catch (error) {
            this._error = GrowspaceTcCultures_1._message(error);
        }
    }
    /**
     * The re-link panel: the same picker the Introduction uses, over the line
     * whose reference went missing, and never a free-text ID field.
     */
    _renderRelink(line) {
        return x `
      <div class="relink" role="region" aria-label=${this._t('line_relink')}>
        <h4>${this._t('line_relink')}</h4>
        <p class="supporting">
          ${localizeWithParams('tc.line_relink_explainer', { name: line.phenotype.name_snapshot }, this.language)}
        </p>
        <growspace-tc-phenotype-picker
          .phenotypes=${this._phenotypes}
          .selected=${line.phenotype.id}
          .language=${this.language}
          @phenotype-selected=${this._relink}
        ></growspace-tc-phenotype-picker>
        <button @click=${() => (this._relinking = { open: false })}>
          ${this._t('medium_cancel')}
        </button>
      </div>
    `;
    }
    render() {
        if (this._introducing) {
            return x `<growspace-tc-introduction-form
        .phenotypes=${this._phenotypes}
        .saving=${this._saving}
        .error=${this._saveError}
        .language=${this.language}
        @introduction-requested=${this._introduce}
        @introduction-cancelled=${this._cancelIntroduction}
      ></growspace-tc-introduction-form>`;
        }
        return x `
      <div>
        ${this._error ? x `<p class="error" role="alert">${this._error}</p>` : E}
        ${this._relinking.open ? this._renderRelink(this._relinking.line) : E}
        <growspace-tc-culture-board
          .lines=${this._lines}
          .resolutions=${this._resolutions}
          .showArchived=${this._showArchived}
          .language=${this.language}
          @line-introduce-requested=${this._startIntroduction}
          @line-relink-requested=${this._startRelink}
          @line-archive-requested=${this._setArchived}
          @line-show-archived-toggled=${() => (this._showArchived = !this._showArchived)}
        ></growspace-tc-culture-board>
        ${this._loading ? x `<p class="supporting">${this._t('board_loading')}</p>` : E}
      </div>
    `;
    }
};
GrowspaceTcCultures.styles = [
    variables,
    sharedStyles,
    i `
      :host {
        display: block;
      }

      .error {
        color: var(--error-color, #f44336);
      }

      .supporting {
        opacity: 0.7;
      }

      .relink {
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.12));
        border-radius: 10px;
        padding: 12px;
        margin-bottom: 12px;
      }

      .relink h4 {
        margin: 0 0 4px;
        font-size: 0.9375rem;
      }

      .relink p {
        margin: 0 0 8px;
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
    n({ type: String })
], GrowspaceTcCultures.prototype, "language", void 0);
__decorate([
    r()
], GrowspaceTcCultures.prototype, "_lines", void 0);
__decorate([
    r()
], GrowspaceTcCultures.prototype, "_library", void 0);
__decorate([
    r()
], GrowspaceTcCultures.prototype, "_libraryLoaded", void 0);
__decorate([
    r()
], GrowspaceTcCultures.prototype, "_loading", void 0);
__decorate([
    r()
], GrowspaceTcCultures.prototype, "_error", void 0);
__decorate([
    r()
], GrowspaceTcCultures.prototype, "_saving", void 0);
__decorate([
    r()
], GrowspaceTcCultures.prototype, "_saveError", void 0);
__decorate([
    r()
], GrowspaceTcCultures.prototype, "_introducing", void 0);
__decorate([
    r()
], GrowspaceTcCultures.prototype, "_relinking", void 0);
__decorate([
    r()
], GrowspaceTcCultures.prototype, "_showArchived", void 0);
GrowspaceTcCultures = GrowspaceTcCultures_1 = __decorate([
    t('growspace-tc-cultures')
], GrowspaceTcCultures);

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
 * It holds the culture board and the Culture Medium library today; the
 * remaining V1 model tickets add the due/overdue worklist and the pairing
 * editor around them. What it proves is the whole load path — the presence
 * probe answered, the chunk was fetched, and the surface rendered inside a card
 * that ships no TC code in its entry bundle.
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
    get _hasCultureBoard() {
        return this.manifest?.features.includes(TC_FEATURE_CULTURE_LINES) ?? false;
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
        // Nothing this release can serve: an installation older than every surface
        // answers the presence probe perfectly well, and a view of broken calls
        // would be worse than one that says there is nothing here yet.
        if (!this._hasMediumLibrary && !this._hasCultureBoard) {
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
        ${this._hasCultureBoard
            ? x `<growspace-tc-cultures .language=${this.language}></growspace-tc-cultures>`
            : E}
        ${this._hasMediumLibrary ? this._renderMediumLibrary() : E}
      </div>
    `;
    }
    /** The Culture Medium library, and whichever of its panels is open. */
    _renderMediumLibrary() {
        return x `
      <div>
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

export { GrowspaceTcCultures, GrowspaceTcView };
//# sourceMappingURL=growspace-tc-C0e7lmIH.js.map
