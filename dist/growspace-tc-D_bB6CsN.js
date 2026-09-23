/*! growspace-e2e-build source=599a44e8151e324681367adcf7e8089474d6f17720af07b6c7be8ba2fe75583a id=58223d861eadfa8c6554b7846add6392 */
const { i, cK: variables, bR: sharedStyles, _: __decorate, n, w: r, t, g: i$1, A: localize, en: draftReplate, bX: localizeWithParams, x, E, eo: draftIntroduction, ep: devices$, eq: cultureLines$, d9: strainLibrary$, er: cultureMedia$, es: fetchCultureLines, a0: fetchStrainLibrary, et: fetchGraduationDestinations, eu: phenotypeOptions, ev: phenotypeNameIndex, ew: resolvePhenotype, ex: worklistEntries, ey: fetchMaintenanceHistory, ez: recordMaintenance, eA: introduceCultureLine, eB: relinkPhenotype, eC: setCultureLineArchived, eD: locationOptions, eE: draftFromMedium, eF: fetchCultureMedia, eG: updateCultureMedium, eH: createCultureMedium, eI: deleteCultureMedium, dL: portalVariables, eJ: pairings$, eK: fetchPairings, eL: savePairing, eM: deletePairing, y: tcSurfaces, eN: TC_FEATURE_MAINTENANCE } = await import(window.__growspaceEntryUrl ?? './growspace-manager-card.js');

/**
 * The spatial system every Tissue Culture surface shares.
 *
 * The same surfaces are mounted by two hosts of very different widths: the
 * standalone `growspace-tc-card`, often one narrow dashboard column, and the
 * Tissue Culture dialog, which takes the whole Home Assistant surface. A
 * viewport media query cannot tell those apart, so each surface is its own
 * inline-size container and lays itself out against the width it was given.
 *
 * Three primitives, used the same way on every tab:
 *
 * - **Surface head** — the title and its explainer on the left, the surface's
 *   own controls on the right, wrapping under once they no longer fit.
 * - **Record** — one row of a list: an identity (what this is), a detail (what
 *   it holds) and its actions. Stacked when narrow. From 36rem a short pair of
 *   actions joins the identity's line (a full set of five waits for 44rem and
 *   takes the right of both lines), and from 60rem (72rem for five) the three
 *   sit side by side with the identity on a fixed track, so the detail column starts at the same x
 *   on every row and scans as a column. Whatever a record expands into
 *   (`.record-more`) spans the full row beneath it.
 * - **Split** — a form whose two halves are independent (the phenotype picker
 *   beside the fields it feeds) goes to two columns from 45rem, instead of
 *   stretching single inputs across the dialog.
 */
const tcLayoutStyles = i `
  :host {
    container-type: inline-size;
  }

  /* A field's min-height is its whole height, so an input and a select in the
     same row come out the same size. */
  input,
  select,
  textarea {
    box-sizing: border-box;
    min-width: 0;
  }

  .surface-head {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px 24px;
    margin-bottom: 16px;
  }

  .surface-head .title {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
    max-width: 65ch;
  }

  .surface-head h3 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    line-height: 1.3;
  }

  .surface-head .title p {
    margin: 0;
  }

  .surface-head .controls {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 12px;
  }

  .record {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas:
      'identity'
      'detail'
      'actions'
      'more';
    gap: 8px 24px;
    align-items: start;
  }

  .record-identity {
    grid-area: identity;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    min-width: 0;
  }

  .record-detail {
    grid-area: detail;
    min-width: 0;
  }

  .record-actions {
    grid-area: actions;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
  }

  .record-more {
    grid-area: more;
    min-width: 0;
  }

  .record-more:empty {
    display: none;
  }

  /* A record whose actions are a short pair can share the identity's line
     early; a full set of five cannot until there is room for all three. */
  @container (min-width: 36rem) {
    .record:not(.many-actions) {
      grid-template-columns: minmax(0, 1fr) auto;
      grid-template-areas:
        'identity actions'
        'detail detail'
        'more more';
    }

    .record:not(.many-actions) .record-actions {
      justify-content: flex-end;
    }
  }

  @container (min-width: 44rem) {
    .record.many-actions {
      grid-template-columns: minmax(0, 1fr) auto;
      grid-template-areas:
        'identity actions'
        'detail actions'
        'more more';
    }

    .record.many-actions .record-actions {
      justify-content: flex-end;
      align-self: center;
    }
  }

  @container (min-width: 60rem) {
    .record:not(.many-actions) {
      grid-template-columns: minmax(0, 17rem) minmax(0, 1fr) auto;
      grid-template-areas:
        'identity detail actions'
        'more more more';
    }
  }

  /* Five actions take ~30rem on their own, so the detail column only has room
     beside them once the container is this wide. */
  @container (min-width: 72rem) {
    .record.many-actions {
      grid-template-columns: minmax(0, 17rem) minmax(0, 1fr) auto;
      grid-template-areas:
        'identity detail actions'
        'more more more';
    }
  }

  /* Label over value, as many to a row as fit. For a record's facts, where a
     label beside every value would spend the width on repetition. */
  dl.spec {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 9rem), 1fr));
    gap: 10px 20px;
    margin: 0;
    font-size: 0.8125rem;
  }

  dl.spec > div {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  dl.spec > div.wide {
    grid-column: 1 / -1;
  }

  dl.spec dt {
    font-size: 0.75rem;
    color: var(--secondary-text-color, rgba(255, 255, 255, 0.7));
  }

  dl.spec dd {
    margin: 0;
    overflow-wrap: anywhere;
  }

  .split {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 12px 24px;
    align-items: start;
  }

  .split > .column {
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;
  }

  @container (min-width: 45rem) {
    .split {
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    }
  }
`;

/**
 * The Maintenance Action dialog — one element for all five acts.
 *
 * One element rather than five, because four of the acts ask the same question
 * ("record this against the vessel, with an optional note") and the fifth —
 * Replate — is the only one with a form. Five near-identical elements would put
 * the shared explainer, the shared buttons and the shared error handling in
 * five places, and the difference between them would be harder to see, not
 * easier.
 *
 * Each act carries its own explainer because each does something the grower
 * cannot take back or would otherwise mis-read: a Discard keeps the vessel in
 * history rather than deleting it, a move to rooting does not re-plate, and a
 * Graduation optionally creates a plant in Growspace Manager.
 *
 * Dumb by contract (ADR-0019): a culture, the media it could be poured onto and
 * its recorded history in; one `maintenance-requested` intent out.
 */
const DISCARD_REASONS = ['contamination', 'spent', 'mistake'];
let GrowspaceTcActionDialog = class GrowspaceTcActionDialog extends i$1 {
    constructor() {
        super(...arguments);
        this.action = 'note';
        /** The name to show for the vessel's line — already resolved by the caller. */
        this.lineName = '';
        this.media = [];
        this.history = [];
        this.historyLoading = false;
        this.saving = false;
        /** A backend rejection, already phrased for the grower by the backend. */
        this.error = '';
        this.language = 'en';
        this.graduationBridge = false;
        this.growspaces = [];
        /**
         * Whether `growspaces` has been established. Defaults to `ready`, because a
         * caller that hands over a list is stating it as fact; only a caller that
         * fetches lazily has anything else to say.
         */
        this.growspacesStatus = 'ready';
        this._createPlant = false;
        this._plant = {
            growspace_id: '',
            strain: '',
            phenotype: '',
            row: 1,
            col: 1,
        };
        this._note = '';
        this._reason = 'contamination';
        this._showHistory = false;
    }
    _t(key) {
        return localize(`tc.${key}`, '', '', this.language);
    }
    willUpdate(changed) {
        if (changed.has('culture')) {
            this._createPlant = false;
            this._note = '';
            this._showHistory = false;
            this._plant = {
                growspace_id: this.growspaces[0]?.deviceId ?? '',
                strain: this.genetics?.strain ?? '',
                phenotype: this.genetics?.phenotype === 'default' ? '' : (this.genetics?.phenotype ?? ''),
                row: 1,
                col: 1,
            };
        }
        // The destinations can land after the dialog is already open: on a
        // dashboard with no manager card they are fetched when a Graduation first
        // asks for them. Re-seeding when the list changes — and only when what is
        // selected is not in it — is what makes the first option the default there
        // too, without overwriting a choice the grower has already made.
        if (changed.has('growspaces') &&
            !this.growspaces.some((entry) => entry.deviceId === this._plant.growspace_id)) {
            this._plant = {
                ...this._plant,
                growspace_id: this.growspaces[0]?.deviceId ?? '',
                row: 1,
                col: 1,
            };
        }
        // The Replate draft is seeded from the vessel being replated, so what the
        // dialog sends is always what the grower is looking at: this culture's
        // count and shelf, and the medium it would most likely be poured onto.
        if ((changed.has('culture') || changed.has('media')) && this.culture) {
            this._replate = draftReplate(this.culture, this.media[0]);
        }
    }
    get _draft() {
        return this._replate ?? { medium_id: '', medium_version: 1, vessels: [], note: '' };
    }
    _setDraft(patch) {
        this._replate = { ...this._draft, ...patch };
    }
    _setVessel(index, patch) {
        this._setDraft({
            vessels: this._draft.vessels.map((vessel, at) => at === index ? { ...vessel, ...patch } : vessel),
        });
    }
    /**
     * Pick a medium and the version to pin in one gesture.
     *
     * Always the current version: a Plating pins what was actually poured, and
     * offering an older version would let a grower record a formulation they did
     * not use. The history keeps the older ones readable; this form does not
     * reach back into them.
     */
    _selectMedium(event) {
        const medium = this.media.find((entry) => entry.id === event.target.value);
        if (!medium)
            return;
        this._setDraft({ medium_id: medium.id, medium_version: medium.current_version });
    }
    _addVessel() {
        const last = this._draft.vessels[this._draft.vessels.length - 1];
        this._setDraft({
            vessels: [...this._draft.vessels, { plantlet_count: null, location: last?.location ?? '' }],
        });
    }
    _removeVessel(index) {
        this._setDraft({ vessels: this._draft.vessels.filter((_vessel, at) => at !== index) });
    }
    _request() {
        const cultureId = this.culture?.id;
        if (!cultureId)
            return null;
        if (this.action === 'replate') {
            return { action: 'replate', cultureId, draft: { ...this._draft, note: this._note } };
        }
        if (this.action === 'discard') {
            return { action: 'discard', cultureId, reason: this._reason, note: this._note };
        }
        if (this.action === 'graduate') {
            return {
                action: 'graduate',
                cultureId,
                note: this._note,
                ...(this.graduationBridge && this._createPlant ? { plant: { ...this._plant } } : {}),
            };
        }
        return { action: this.action, cultureId, note: this._note };
    }
    _submit(event) {
        event.preventDefault();
        if (this.saving || this.culture?.status !== 'active')
            return;
        if (!event.target.reportValidity())
            return;
        const request = this._request();
        if (!request)
            return;
        this.dispatchEvent(new CustomEvent('maintenance-requested', {
            detail: { request },
            bubbles: true,
            composed: true,
        }));
    }
    _cancel() {
        this.dispatchEvent(new CustomEvent('maintenance-cancelled', { bubbles: true, composed: true }));
    }
    /** The day a stamp names, or the raw stamp if it cannot be read. */
    _day(iso) {
        const taken = new Date(iso);
        return Number.isNaN(taken.getTime()) ? iso : taken.toLocaleDateString(this.language);
    }
    _mediumName(mediumId) {
        if (mediumId === null)
            return this._t('history_medium_unknown');
        return (this.media.find((entry) => entry.id === mediumId)?.name ?? this._t('history_medium_unknown'));
    }
    /** One recorded act as a sentence. Every act type has one; none is skipped. */
    _historyLine(action) {
        switch (action.action) {
            case 'replate':
                return localizeWithParams(action.vessels.length > 1 ? 'tc.history_replate_divided' : 'tc.history_replate', {
                    medium: this._mediumName(action.medium_id),
                    version: action.medium_version ?? '?',
                    count: action.vessels.length,
                }, this.language);
            case 'discard':
                return localizeWithParams('tc.history_discard', { reason: this._t(`action_reason_${action.reason ?? 'mistake'}`) }, this.language);
            default:
                return this._t(`history_${action.action}`);
        }
    }
    /**
     * Ask the host to show the graduated plant, instead of navigating here.
     *
     * The two hosts have different correct answers, which is what an event at a
     * seam is for. The standalone card may be on a dashboard with no Growspace
     * Manager card at all, so the full-page navigation the `href` describes is
     * what makes the link work there. Inside the Tissue Culture dialog the
     * manager card is on the page and can open the Plant Overview directly, with
     * no reload and nothing destroyed. TC has no business deciding between them.
     *
     * The `href` stays real so the link is still a link — modified clicks keep
     * opening a tab, and a host that listens for nothing still navigates.
     */
    _requestPlantView(event, plantId) {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey)
            return;
        event.preventDefault();
        this.dispatchEvent(new CustomEvent('plant-view-requested', {
            detail: { plantId },
            bubbles: true,
            composed: true,
        }));
    }
    _renderHistory() {
        if (this.historyLoading) {
            return x `<p class="supporting">${this._t('history_loading')}</p>`;
        }
        if (!this.history.length) {
            return x `<p class="supporting">${this._t('history_empty')}</p>`;
        }
        return x `
      <ol class="history">
        ${this.history.map((action) => x `
            <li>
              <span class="when">${this._day(action.recorded_at)}</span>
              — ${this._historyLine(action)}${action.note ? x ` — ${action.note}` : E}
              ${action.plant_id
            ? x ` —
                    <a
                      href=${`?plantId=${encodeURIComponent(action.plant_id)}`}
                      @click=${(event) => this._requestPlantView(event, action.plant_id)}
                      >${this._t('graduation_view_plant')}</a
                    >`
            : E}
            </li>
          `)}
      </ol>
    `;
    }
    _renderVessels() {
        return x `
      <fieldset>
        <legend>${this._t('action_vessels')}</legend>
        <p class="supporting">${this._t('action_replate_explainer')}</p>
        ${this._draft.vessels.map((vessel, index) => x `
            <div class="vessel">
              <span class="vessel-name">
                ${index === 0
            ? this._t('action_vessel_replated')
            : localizeWithParams('tc.action_vessel_new', { index }, this.language)}
              </span>
              <label>
                ${this._t('culture_plantlets')}
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder=${this._t('culture_plantlets_uncounted')}
                  .value=${vessel.plantlet_count === null ? '' : String(vessel.plantlet_count)}
                  @input=${(e) => {
            // Left blank stays null. After a division the old number
            // describes a vessel that no longer exists, so "nobody
            // counted" has to stay recordable.
            const raw = e.target.value.trim();
            this._setVessel(index, { plantlet_count: raw === '' ? null : Number(raw) });
        }}
                />
              </label>
              <label>
                ${this._t('culture_location')}
                <input
                  .value=${vessel.location}
                  @input=${(e) => this._setVessel(index, { location: e.target.value })}
                />
              </label>
              ${index === 0
            ? E
            : x `<button type="button" @click=${() => this._removeVessel(index)}>
                    ${this._t('action_vessel_remove')}
                  </button>`}
            </div>
          `)}
        <button type="button" @click=${this._addVessel}>${this._t('action_vessel_add')}</button>
      </fieldset>
    `;
    }
    _renderReplate() {
        if (!this.media.length) {
            return x `<p class="supporting" role="status">${this._t('action_medium_none')}</p>`;
        }
        return x `
      <label>
        ${this._t('action_medium')}
        <select .value=${this._draft.medium_id} @change=${this._selectMedium}>
          ${this.media.map((medium) => x `<option value=${medium.id}>
                ${medium.name} —
                ${localizeWithParams('tc.action_medium_version', { version: medium.current_version }, this.language)}
              </option>`)}
        </select>
      </label>
      ${this._renderVessels()}
    `;
    }
    _renderDiscard() {
        return x `
      <label>
        ${this._t('action_reason')}
        <select
          .value=${this._reason}
          @change=${(e) => (this._reason = e.target.value)}
        >
          ${DISCARD_REASONS.map((reason) => x `<option value=${reason}>${this._t(`action_reason_${reason}`)}</option>`)}
        </select>
      </label>
    `;
    }
    /**
     * What to say under the bridge toggle.
     *
     * Four sentences, not two. A list that has not arrived and a list that
     * arrived empty look identical from here, and telling a grower with a full tent that
     * "no growspace is available" is worse than telling them nothing — so the
     * status decides the sentence and only `ready` may claim there is nowhere to
     * put the plant.
     */
    get _bridgeHelpKey() {
        if (this.growspacesStatus === 'loading')
            return 'graduation_growspaces_loading';
        if (this.growspacesStatus === 'failed')
            return 'graduation_growspaces_failed';
        return this.growspaces.length ? 'graduation_bridge_help' : 'graduation_no_growspace';
    }
    _renderGraduation() {
        if (!this.graduationBridge)
            return x `${E}`;
        const destination = this.growspaces.find((entry) => entry.deviceId === this._plant.growspace_id);
        // Offerable only once the list is known to hold something. Everything else
        // — pending, failed, genuinely empty — leaves the graduation recordable
        // and the bridge out of reach, which is the unchanged behaviour.
        const offerable = this.growspacesStatus === 'ready' && this.growspaces.length > 0;
        return x `
      <label class="bridge-toggle">
        <input
          type="checkbox"
          name="createPlant"
          .checked=${this._createPlant}
          ?disabled=${this.saving || !offerable}
          @change=${(event) => (this._createPlant = event.target.checked)}
        />
        ${this._t('graduation_create_plant')}
      </label>
      <p class="supporting">${this._t(this._bridgeHelpKey)}</p>
      ${this._createPlant
            ? x `<div class="plant-fields">
            <label
              >${this._t('graduation_growspace')}
              <select
                name="growspace"
                required
                .value=${this._plant.growspace_id}
                ?disabled=${this.saving}
                @change=${(e) => {
                this._plant = {
                    ...this._plant,
                    growspace_id: e.target.value,
                    row: 1,
                    col: 1,
                };
            }}
              >
                ${this.growspaces.map((entry) => x `<option value=${entry.deviceId}>${entry.name}</option>`)}
              </select>
            </label>
            <label
              >${this._t('graduation_strain')}
              <input
                name="strain"
                required
                .value=${this._plant.strain}
                ?disabled=${this.saving}
                @input=${(e) => {
                this._plant = { ...this._plant, strain: e.target.value };
            }}
              />
            </label>
            <label
              >${this._t('graduation_phenotype')}
              <input
                name="phenotype"
                .value=${this._plant.phenotype}
                ?disabled=${this.saving}
                @input=${(e) => {
                this._plant = { ...this._plant, phenotype: e.target.value };
            }}
              />
            </label>
            ${['row', 'col'].map((field) => x `<label
                  >${this._t(`graduation_${field}`)}
                  <input
                    name=${field}
                    type="number"
                    required
                    min="1"
                    step="1"
                    max=${destination
                ? field === 'row'
                    ? destination.rows
                    : destination.plantsPerRow
                : 1}
                    .value=${String(this._plant[field])}
                    ?disabled=${this.saving}
                    @input=${(e) => {
                this._plant = {
                    ...this._plant,
                    [field]: Number(e.target.value),
                };
            }}
                  />
                </label>`)}
          </div>`
            : E}
    `;
    }
    render() {
        if (!this.culture)
            return x `${E}`;
        if (this.culture.status !== 'active')
            return x `<form
        role="dialog"
        aria-label=${this._t('history_show')}
        @submit=${(event) => event.preventDefault()}
      >
        <h3>${this.lineName} — ${this._t('history_show')}</h3>
        ${this._renderHistory()}
        <div class="buttons">
          <button type="button" @click=${this._cancel}>${this._t('history_close')}</button>
        </div>
      </form>`;
        const replating = this.action === 'replate';
        // A Replate cannot be recorded without a medium to pin, and a note that
        // says nothing is not an act — both are refused on the wire, so the button
        // says so here rather than sending a call that is going to fail.
        const blocked = (replating && !this.media.length) || (this.action === 'note' && this._note.trim() === '');
        return x `
      <form @submit=${this._submit} role="dialog" aria-label=${this._t(`action_${this.action}`)}>
        <h3>
          ${localizeWithParams('tc.action_on_vessel', { action: this._t(`action_${this.action}`), name: this.lineName }, this.language)}
        </h3>
        <p class="supporting">
          ${this._t(replating ? 'action_replate_explainer' : `action_${this.action}_explainer`)}
        </p>

        <div class="split">
          <div class="column">
            ${replating ? this._renderReplate() : E}
            ${this.action === 'discard' ? this._renderDiscard() : E}
            ${this.action === 'graduate' ? this._renderGraduation() : E}

            <label>
              ${this._t('action_note_label')}
              <textarea
                .value=${this._note}
                @input=${(e) => (this._note = e.target.value)}
              ></textarea>
            </label>
          </div>

          <div class="column history-column">
            <button
              type="button"
              class="link"
              aria-expanded=${this._showHistory ? 'true' : 'false'}
              @click=${() => (this._showHistory = !this._showHistory)}
            >
              ${this._t(this._showHistory ? 'history_hide' : 'history_show')}
            </button>
            ${this._showHistory ? this._renderHistory() : E}
          </div>
        </div>
        ${this.error ? x `<p class="error" role="alert">${this.error}</p>` : E}

        <div class="buttons">
          <button type="button" @click=${this._cancel}>${this._t('medium_cancel')}</button>
          <button type="submit" ?disabled=${this.saving || blocked}>
            ${this._t(this.saving ? 'action_saving' : 'action_record')}
          </button>
        </div>
      </form>
    `;
    }
};
GrowspaceTcActionDialog.styles = [
    variables,
    sharedStyles,
    tcLayoutStyles,
    i `
      :host {
        display: block;
      }

      form {
        display: flex;
        flex-direction: column;
        gap: 12px;
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.12));
        border-radius: 12px;
        padding: 14px 14px 14px 16px;
        margin-bottom: 12px;
      }

      /* The vessel's history is the column beside the act, read while
         deciding it; the toggle stays where the history will appear. */
      .history-column {
        align-items: flex-start;
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
      select,
      textarea {
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

      /* Plantlets, location, and the remove button the divisions carry. Explicit
         tracks: the full-width name row would keep auto-fit from collapsing the
         empty ones, and the two fields would sit at a fixed 130px. */
      .vessel {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 2fr) auto;
        gap: 10px;
        align-items: end;
        padding: 8px 0;
        border-bottom: 1px solid var(--divider-color, rgba(255, 255, 255, 0.12));
      }

      .vessel:last-of-type {
        border-bottom: none;
      }

      .vessel-name {
        grid-column: 1 / -1;
        font-size: 0.8125rem;
        font-weight: 600;
      }

      ol.history {
        list-style: none;
        margin: 8px 0 0;
        padding: 0;
        font-size: 0.8125rem;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      ol.history .when {
        opacity: 0.7;
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

      button.link {
        border: none;
        padding: 6px 0;
        text-decoration: underline;
        min-height: 32px;
      }

      .bridge-toggle {
        flex-direction: row;
        align-items: center;
        gap: 8px;
      }
      .bridge-toggle input {
        min-height: 24px;
        width: 24px;
        accent-color: var(--primary-color);
      }
      .plant-fields {
        display: grid;
        gap: 12px;
        grid-template-columns: repeat(auto-fit, minmax(min(100%, 150px), 1fr));
      }
      .plant-fields select,
      .plant-fields input {
        min-width: 0;
        width: 100%;
        box-sizing: border-box;
      }
      a {
        color: var(--primary-color);
        text-underline-offset: 3px;
      }
      button:disabled {
        cursor: default;
        opacity: 0.5;
      }
      :is(button, input, select, a):focus-visible {
        outline: 2px solid var(--primary-color);
        outline-offset: 3px;
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
    n({ type: String })
], GrowspaceTcActionDialog.prototype, "action", void 0);
__decorate([
    n({ attribute: false })
], GrowspaceTcActionDialog.prototype, "culture", void 0);
__decorate([
    n({ type: String })
], GrowspaceTcActionDialog.prototype, "lineName", void 0);
__decorate([
    n({ attribute: false })
], GrowspaceTcActionDialog.prototype, "media", void 0);
__decorate([
    n({ attribute: false })
], GrowspaceTcActionDialog.prototype, "history", void 0);
__decorate([
    n({ type: Boolean })
], GrowspaceTcActionDialog.prototype, "historyLoading", void 0);
__decorate([
    n({ type: Boolean })
], GrowspaceTcActionDialog.prototype, "saving", void 0);
__decorate([
    n({ type: String })
], GrowspaceTcActionDialog.prototype, "error", void 0);
__decorate([
    n({ type: String })
], GrowspaceTcActionDialog.prototype, "language", void 0);
__decorate([
    n({ type: Boolean })
], GrowspaceTcActionDialog.prototype, "graduationBridge", void 0);
__decorate([
    n({ attribute: false })
], GrowspaceTcActionDialog.prototype, "growspaces", void 0);
__decorate([
    n({ type: String })
], GrowspaceTcActionDialog.prototype, "growspacesStatus", void 0);
__decorate([
    n({ attribute: false })
], GrowspaceTcActionDialog.prototype, "genetics", void 0);
__decorate([
    r()
], GrowspaceTcActionDialog.prototype, "_createPlant", void 0);
__decorate([
    r()
], GrowspaceTcActionDialog.prototype, "_plant", void 0);
__decorate([
    r()
], GrowspaceTcActionDialog.prototype, "_note", void 0);
__decorate([
    r()
], GrowspaceTcActionDialog.prototype, "_reason", void 0);
__decorate([
    r()
], GrowspaceTcActionDialog.prototype, "_replate", void 0);
__decorate([
    r()
], GrowspaceTcActionDialog.prototype, "_showHistory", void 0);
GrowspaceTcActionDialog = __decorate([
    t('growspace-tc-action-dialog')
], GrowspaceTcActionDialog);

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
 * Expanding a line shows its vessels, their Replate Due Dates and the five
 * Maintenance Actions. The worklist above answers "what has to be done today";
 * the board is where a vessel that is not due yet — or one that has already
 * ended — can still be acted on, which is why the actions live in both places
 * rather than only on the urgent list.
 *
 * Dumb by contract (ADR-0019): lines and resolutions in, intents out. Which
 * line's vessels are expanded is the only state it owns.
 */
/**
 * The five Maintenance Actions, in the order a vessel meets them: the routine
 * one first, the endings last.
 */
const OFFERED_ACTIONS$1 = [
    'replate',
    'move_to_rooting',
    'note',
    'discard',
    'graduate',
];
let GrowspaceTcCultureBoard = class GrowspaceTcCultureBoard extends i$1 {
    constructor() {
        super(...arguments);
        this.lines = [];
        /** How each line's phenotype resolved, keyed by line ID. */
        this.resolutions = new Map();
        /** Whether archived lines are shown. Archived lines are never dropped. */
        this.showArchived = false;
        /**
         * Whether this installation serves Maintenance Actions.
         *
         * Gated on the manifest feature rather than assumed: a TC release older than
         * the acts answers the board perfectly well, and offering five buttons whose
         * every call comes back `unknown_command` would be worse than not offering
         * them.
         */
        this.actionable = false;
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
      <div class="vessels">
        <table class="cultures">
          <thead>
            <tr>
              <th>${this._t('culture_stage')}</th>
              <th>${this._t('culture_status')}</th>
              <th>${this._t('culture_plantlets')}</th>
              <th>${this._t('culture_location')}</th>
              <th>${this._t('culture_started')}</th>
              <th>${this._t('culture_due')}</th>
              <th></th>
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
                  <td>
                    ${culture.replate_due_at === null
            ? this._t('culture_due_none')
            : this._day(culture.replate_due_at)}
                  </td>
                  <td>${this._renderActions(culture)}</td>
                </tr>
              `)}
          </tbody>
        </table>
      </div>
    `;
    }
    /**
     * The five acts, offered only while the vessel is still being maintained.
     *
     * An ended Culture keeps its row — it is history, not clutter — but every act
     * is refused on it by the backend, so offering the buttons would be an
     * invitation to an error message.
     */
    _renderActions(culture) {
        if (!this.actionable)
            return x `${E}`;
        if (culture.status !== 'active')
            return x `<button
        class="small"
        @click=${() => this._emit('culture-action-requested', { cultureId: culture.id, action: 'graduate' })}
      >
        ${this._t('history_show')}
      </button>`;
        return x `
      <div class="culture-actions">
        ${OFFERED_ACTIONS$1.map((action) => x `<button
              class="small"
              @click=${() => this._emit('culture-action-requested', { cultureId: culture.id, action })}
            >
              ${this._t(`action_${action}`)}
            </button>`)}
      </div>
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
      <li class="line record ${missing ? 'missing' : ''} ${archived ? 'archived' : ''}">
        <div class="record-identity">
          <div class="line-head">
            <h4>${resolution.name}</h4>
            ${missing
            ? x `<span class="chip missing">${this._t('line_missing_chip')}</span>`
            : E}
            ${archived ? x `<span class="chip">${this._t('line_archived_chip')}</span>` : E}
          </div>
          ${missing ? this._renderMissing(line) : E}
          <button
            class="link"
            aria-expanded=${open ? 'true' : 'false'}
            @click=${() => this._toggleVessels(line.id)}
          >
            ${localizeWithParams(open ? 'tc.line_hide_vessels' : 'tc.line_show_vessels', { count: line.cultures.length }, this.language)}
          </button>
        </div>
        <dl class="intervals record-detail">
          <dt>${this._t('line_interval_multiplication')}</dt>
          <dd>
            ${localizeWithParams('tc.line_interval_days', { days: line.replate_interval_days.multiplication }, this.language)}
          </dd>
          <dt>${this._t('line_interval_rooting')}</dt>
          <dd>
            ${localizeWithParams('tc.line_interval_days', { days: line.replate_interval_days.rooting }, this.language)}
          </dd>
        </dl>
        <div class="actions record-actions">
          <button @click=${() => this._emit('line-relink-requested', { id: line.id })}>
            ${this._t('line_relink')}
          </button>
          <button
            @click=${() => this._emit('line-archive-requested', { id: line.id, archived: !archived })}
          >
            ${this._t(archived ? 'line_unarchive' : 'line_archive')}
          </button>
        </div>
        ${open
            ? x `<div class="record-more">${this._renderCultures(line.cultures)}</div>`
            : E}
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
        <header class="board surface-head">
          <div class="title">
            <h3>${this._t('board_title')}</h3>
          </div>
          <div class="header-actions controls">
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
    tcLayoutStyles,
    i `
      :host {
        display: block;
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
        padding: 12px 14px 12px 16px;
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

      .missing-note {
        margin: 4px 0 0;
        font-size: 0.8125rem;
        color: var(--warning-color, #ffa726);
      }

      dl.intervals {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 2px 16px;
        margin: 0;
        font-size: 0.8125rem;
      }

      dl.intervals dt {
        color: var(--secondary-text-color, rgba(255, 255, 255, 0.7));
      }

      dl.intervals dd {
        font-variant-numeric: tabular-nums;
      }

      dd {
        margin: 0;
      }

      /* The vessels are the one part of a line that is genuinely tabular, so
         they keep a table, and it scrolls sideways inside the line rather than
         pushing the dialog wider on a narrow card. */
      .vessels {
        overflow-x: auto;
        margin-top: 4px;
        border-top: 1px solid var(--divider-color, rgba(255, 255, 255, 0.12));
      }

      table.cultures {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.8125rem;
        font-variant-numeric: tabular-nums;
      }

      table.cultures th,
      table.cultures td {
        text-align: left;
        vertical-align: middle;
        padding: 6px 16px 6px 0;
        border-bottom: 1px solid var(--divider-color, rgba(255, 255, 255, 0.12));
        white-space: nowrap;
      }

      table.cultures tr:last-child td {
        border-bottom: none;
      }

      table.cultures td:last-child {
        padding-right: 0;
        width: 1%;
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

      button.small {
        font-size: 0.75rem;
        padding: 2px 10px;
        min-height: 28px;
      }

      .culture-actions {
        display: flex;
        gap: 4px;
        justify-content: flex-end;
      }

      button:hover {
        background: var(--secondary-background-color, rgba(255, 255, 255, 0.05));
      }

      button.link:hover {
        background: none;
      }

      .empty {
        margin: 0;
        padding: 20px 0;
        text-align: center;
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
    n({ type: Boolean })
], GrowspaceTcCultureBoard.prototype, "actionable", void 0);
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
        min-height: 40px;
        padding: 8px 10px;
        font: inherit;
        color: inherit;
        background: var(--card-background-color, transparent);
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.12));
        border-radius: 8px;
      }

      input[type='search']:focus-visible {
        outline: 2px solid var(--primary-color);
        outline-offset: 2px;
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

        <div class="split">
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

          <div class="column">
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
                    <option value="multiplication">
                      ${this._t('culture_stage_multiplication')}
                    </option>
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
          </div>
        </div>

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
    tcLayoutStyles,
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
        margin: 0 0 8px;
      }

      fieldset .supporting {
        margin-bottom: 8px;
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
 * The due/overdue worklist — what the TC view lands on.
 *
 * The first thing a grower wants from a tissue-culture bench is not the whole
 * board, it is the answer to "what has to be replated today". So the worklist
 * leads, and it defaults to showing only what is due or overdue: an upcoming
 * replate three weeks out is not work, and a list that mixed the two would make
 * the grower do the filtering the card exists to do.
 *
 * **Overdue is decided against the clock, in the container.** This element is
 * handed entries that already carry their urgency, so what it renders never
 * disagrees with what the calendar entity draws — and a test can fix the clock
 * rather than wait for one.
 *
 * Location is free text on purpose (TC CONTEXT.md), so the filter's options are
 * whatever the grower has actually typed rather than a hierarchy nobody
 * maintains.
 *
 * Dumb by contract (ADR-0019): entries in, intents out. Which filters are on is
 * the only state it owns, because nothing else needs to know.
 */
const OFFERED_ACTIONS = [
    'replate',
    'move_to_rooting',
    'note',
    'discard',
    'graduate',
];
let GrowspaceTcWorklist = class GrowspaceTcWorklist extends i$1 {
    constructor() {
        super(...arguments);
        this.entries = [];
        /** How each line's phenotype resolved, keyed by line ID. */
        this.names = new Map();
        /** The Locations in use, for the filter. */
        this.locations = [];
        this.language = 'en';
        this._location = '';
        this._onlyDue = true;
    }
    _t(key) {
        return localize(`tc.${key}`, '', '', this.language);
    }
    _emit(type, detail) {
        this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
    }
    get _shown() {
        return this.entries.filter((entry) => (!this._onlyDue || entry.urgency !== 'scheduled') &&
            (this._location === '' ||
                entry.culture.location.toLowerCase() === this._location.toLowerCase()));
    }
    /** How far off the due day is, said the way a grower would say it. */
    _whenDue(entry) {
        const { daysUntilDue } = entry;
        if (daysUntilDue === 0)
            return this._t('worklist_due_today');
        if (daysUntilDue === 1)
            return this._t('worklist_due_tomorrow');
        if (daysUntilDue === -1)
            return this._t('worklist_overdue_yesterday');
        return localizeWithParams(daysUntilDue < 0 ? 'tc.worklist_overdue_by' : 'tc.worklist_due_in', { days: Math.abs(daysUntilDue) }, this.language);
    }
    _nameOf(entry) {
        // Falls back to the snapshot rather than to the opaque ID: the phenotype
        // join is the container's, and a vessel with an unresolvable reference
        // still has to be findable on the shelf it is on.
        return this.names.get(entry.line.id) ?? entry.line.phenotype.name_snapshot;
    }
    _renderEntry(entry) {
        const { culture, urgency } = entry;
        return x `
      <li class="entry record many-actions ${urgency}">
        <div class="record-identity">
          <div class="entry-head">
            <h4>${this._nameOf(entry)}</h4>
            ${urgency === 'scheduled'
            ? E
            : x `<span class="chip ${urgency}">
                  ${this._t(urgency === 'overdue' ? 'worklist_overdue_chip' : 'worklist_due_chip')}
                </span>`}
          </div>
        </div>
        <p class="facts record-detail">
          ${this._whenDue(entry)} · ${this._t(`culture_stage_${culture.stage}`)} ·
          ${culture.location || this._t('culture_location_none')} ·
          ${culture.plantlet_count === null
            ? this._t('culture_plantlets_uncounted')
            : localizeWithParams('tc.worklist_plantlets', { count: culture.plantlet_count }, this.language)}
        </p>
        <div class="actions record-actions">
          ${OFFERED_ACTIONS.map((action) => x `<button
                class=${action === 'replate' ? 'primary' : ''}
                @click=${() => this._emit('culture-action-requested', { cultureId: culture.id, action })}
              >
                ${this._t(`action_${action}`)}
              </button>`)}
        </div>
      </li>
    `;
    }
    render() {
        const shown = this._shown;
        return x `
      <section aria-label=${this._t('worklist_title')}>
        <header class="worklist surface-head">
          <div class="title">
            <h3>${this._t('worklist_title')}</h3>
            <p class="supporting">${this._t('worklist_explainer')}</p>
          </div>
          <div class="filters controls">
            <label>
              ${this._t('worklist_filter_location')}
              <select
                .value=${this._location}
                @change=${(e) => (this._location = e.target.value)}
              >
                <option value="">${this._t('worklist_all_locations')}</option>
                ${this.locations.map((location) => x `<option value=${location}>${location}</option>`)}
              </select>
            </label>
            <button
              class="link"
              aria-pressed=${this._onlyDue ? 'true' : 'false'}
              @click=${() => (this._onlyDue = !this._onlyDue)}
            >
              ${this._t(this._onlyDue ? 'worklist_show_upcoming' : 'worklist_only_due')}
            </button>
            <span class="supporting count">
              ${localizeWithParams('tc.worklist_counted', { shown: shown.length, total: this.entries.length }, this.language)}
            </span>
          </div>
        </header>
        ${shown.length
            ? x `<ul>
              ${shown.map((entry) => this._renderEntry(entry))}
            </ul>`
            : x `<p class="empty supporting">
              ${this._t(this.entries.length ? 'worklist_empty_filtered' : 'worklist_empty')}
            </p>`}
      </section>
    `;
    }
};
GrowspaceTcWorklist.styles = [
    variables,
    sharedStyles,
    tcLayoutStyles,
    i `
      :host {
        display: block;
      }

      .filters {
        font-size: 0.8125rem;
      }

      .filters label {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .count {
        font-variant-numeric: tabular-nums;
      }

      select {
        font: inherit;
        color: inherit;
        background: var(--card-background-color, transparent);
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.12));
        border-radius: 8px;
        padding: 6px 8px;
        min-height: 36px;
      }

      ul {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      li.entry {
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.12));
        border-radius: 12px;
        padding: 10px 12px 10px 16px;
        align-items: center;
      }

      li.entry.overdue {
        border-color: var(--error-color, #f44336);
      }

      li.entry.due {
        border-color: var(--warning-color, #ffa726);
      }

      .entry-head {
        display: flex;
        align-items: baseline;
        gap: 8px;
        flex-wrap: wrap;
      }

      .entry-head h4 {
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

      .chip.overdue {
        border-color: var(--error-color, #f44336);
        color: var(--error-color, #f44336);
      }

      .chip.due {
        border-color: var(--warning-color, #ffa726);
        color: var(--warning-color, #ffa726);
      }

      .facts {
        margin: 0;
        font-size: 0.8125rem;
        color: var(--secondary-text-color, rgba(255, 255, 255, 0.7));
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

      /* The act the worklist exists for. The fill carries the emphasis; the
         label stays the theme's text colour so it reads on any theme. */
      button.primary {
        background: color-mix(in srgb, var(--primary-color, #4caf50) 16%, transparent);
        border-color: color-mix(in srgb, var(--primary-color, #4caf50) 55%, transparent);
      }

      button:hover {
        background: var(--secondary-background-color, rgba(255, 255, 255, 0.05));
      }

      button.primary:hover {
        background: color-mix(in srgb, var(--primary-color, #4caf50) 26%, transparent);
      }

      button.link {
        border: none;
        padding: 6px 0;
        text-decoration: underline;
        min-height: 32px;
      }

      button.link:hover {
        background: none;
      }

      .supporting {
        opacity: 0.7;
        font-size: 0.8125rem;
      }

      .empty {
        margin: 0;
        padding: 20px 0;
        text-align: center;
      }
    `,
];
__decorate([
    n({ attribute: false })
], GrowspaceTcWorklist.prototype, "entries", void 0);
__decorate([
    n({ attribute: false })
], GrowspaceTcWorklist.prototype, "names", void 0);
__decorate([
    n({ attribute: false })
], GrowspaceTcWorklist.prototype, "locations", void 0);
__decorate([
    n({ type: String })
], GrowspaceTcWorklist.prototype, "language", void 0);
__decorate([
    r()
], GrowspaceTcWorklist.prototype, "_location", void 0);
__decorate([
    r()
], GrowspaceTcWorklist.prototype, "_onlyDue", void 0);
GrowspaceTcWorklist = __decorate([
    t('growspace-tc-worklist')
], GrowspaceTcWorklist);

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
 *
 * The same rule is why it fetches Growspace Manager's growspaces itself. That
 * list reaches the card through the manager card's bootstrap and through
 * nothing else, so on a dashboard holding only `custom:growspace-tc-card` a
 * Graduation could never create a plant, however many tents had free positions.
 * It is fetched when a Graduation first asks — a TC-only dashboard should not
 * pay for a payload most sessions never open — and a pending or failed fetch is
 * reported as itself, never as "Growspace Manager has nowhere to put a plant".
 *
 * It also owns the second clock-dependent judgement on this surface: **overdue**.
 * The backend states a Replate Due Date and nothing more, because whether that
 * date has passed depends on when the card is looking. The worklist is built
 * here against a clock this element reads, so a board left open overnight is one
 * render away from telling the truth again.
 */
var GrowspaceTcCultures_1;
let GrowspaceTcCultures = GrowspaceTcCultures_1 = class GrowspaceTcCultures extends i$1 {
    constructor() {
        super(...arguments);
        /**
         * Whether this installation serves Maintenance Actions.
         *
         * The worklist reads `replate_due_at` and the dialogs call the five commands,
         * so both are gated on the manifest feature rather than on TC merely being
         * installed — an older release would answer the board and none of the rest.
         */
        this.maintenance = false;
        this.graduationBridge = false;
        this.language = 'en';
        this._devices = [];
        /**
         * How far the graduation destinations have got.
         *
         * `idle` is "nobody has needed them" — a TC-only dashboard issues no
         * growspace request until a Graduation asks — and is never rendered, because
         * the load starts before the dialog that reads this opens.
         */
        this._destinations = 'idle';
        this._graduationNotice = '';
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
        this._media = [];
        this._acting = { open: false };
        this._history = [];
        this._historyLoading = false;
        /**
         * The clock the worklist is built against, re-read on every load and after
         * every act. A `Date` in a render would make the element re-sort itself on
         * unrelated updates and make a test wait for midnight.
         */
        this._now = new Date();
        this._unsubscribe = [];
    }
    /**
     * Drop every atom subscription this element holds, and leave it holding none.
     *
     * Both lifecycle callbacks go through here. `devices$` and the three TC atoms
     * are module-global, so a subscription that outlives the element keeps
     * writing `@state()` on a detached node and pins it for the life of the page;
     * and an unsubscribe function that is overwritten rather than called can
     * never be called again, so each connect/disconnect cycle would strand one
     * more subscriber. Draining on connect as well as on disconnect makes a
     * re-connect safe whatever the previous cycle left behind — which matters as
     * soon as a host mounts and unmounts this view rather than keeping it for the
     * life of the dashboard.
     */
    _drainSubscriptions() {
        for (const unsubscribe of this._unsubscribe)
            unsubscribe();
        this._unsubscribe = [];
    }
    connectedCallback() {
        super.connectedCallback();
        this._drainSubscriptions();
        this._unsubscribe = [
            devices$.subscribe((devices) => {
                this._devices = [...devices];
                // A hydrated grid is an answer and costs nothing: on a dashboard that
                // also holds the manager card the destinations are already here, so a
                // Graduation asks the backend for nothing. An *empty* grid proves
                // nothing — the subscription fires once on subscribe, before any host
                // has hydrated anything — so it is left for `_loadDestinations` to
                // settle, the same rule the strain library is read under.
                if (devices.length)
                    this._destinations = 'ready';
            }),
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
            // Read, never fetched here: the view container owns the one call that
            // fills this atom for the medium library, and the Replate dialog needs
            // the same list to pin a Medium Version from.
            cultureMedia$.subscribe((media) => {
                this._media = [...media];
            }),
        ];
        void this._load();
    }
    disconnectedCallback() {
        this._drainSubscriptions();
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
        this._now = new Date();
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
    /**
     * Fetch the growspaces a graduating Culture could be planted into, once.
     *
     * Lazily, and only for the act that needs them: this view is the whole card
     * on a TC-only dashboard, and most of what a grower does on it never opens a
     * Graduation. Deliberately not fetched on load for that reason.
     *
     * A failure is kept as a failure rather than collapsing to an empty list.
     * The dialog's "No growspace is available" is a statement about Growspace
     * Manager, and a grower with a half-empty tent must not be told it because
     * the network was down.
     */
    async _loadDestinations() {
        if (this._destinations === 'ready' || this._destinations === 'loading')
            return;
        this._destinations = 'loading';
        try {
            this._devices = await fetchGraduationDestinations();
            this._destinations = 'ready';
        }
        catch {
            this._destinations = 'failed';
        }
    }
    /** The growspaces a plant may be created in — a tent or a cloner, never a subarea. */
    get _graduationGrowspaces() {
        return this._devices.filter((device) => device.type === 'normal' || device.type === 'clone');
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
    /** The name to show per line — the resolution's, whichever answer it was. */
    get _lineNames() {
        return new Map([...this._resolutions].map(([lineId, resolution]) => [lineId, resolution.name]));
    }
    get _worklist() {
        return worklistEntries(this._lines, this._now);
    }
    /**
     * Open an action dialog over one vessel, and fetch what has been recorded
     * against it.
     *
     * The history is fetched on open rather than held in an atom: it is
     * append-only and asked about one vessel at a time, so a shared copy would
     * only ever be a snapshot of whichever dialog was opened last.
     */
    async _startAction(event) {
        const { cultureId, action } = event.detail;
        const line = this._lines.find((entry) => entry.cultures.some((culture) => culture.id === cultureId));
        const culture = line?.cultures.find((entry) => entry.id === cultureId);
        if (!line || !culture)
            return;
        this._saveError = '';
        this._history = [];
        // Before the dialog opens, so its first render already says "loading"
        // rather than flashing an empty destination list. A no-op once the
        // destinations are known, which on a dashboard with a manager card on it
        // they always are.
        if (action === 'graduate' && this.graduationBridge)
            void this._loadDestinations();
        this._acting = { open: true, action, culture, line };
        this._historyLoading = true;
        try {
            this._history = await fetchMaintenanceHistory({ cultureId });
        }
        catch {
            // Swallowed: the dialog's job is to record the next act, and a history
            // panel that failed to load is no reason to refuse to do it.
            this._history = [];
        }
        finally {
            this._historyLoading = false;
        }
    }
    _cancelAction() {
        this._acting = { open: false };
        this._saveError = '';
    }
    async _record(event) {
        this._saving = true;
        this._saveError = '';
        try {
            const request = event.detail.request;
            const action = await recordMaintenance(request);
            this._graduationNotice =
                request.action === 'graduate' && request.plant && !action.plant_id
                    ? this._t('graduation_unlinked')
                    : '';
            this._acting = { open: false };
            // The act moved a due date, so the worklist is re-judged against the
            // clock as it reads now rather than as it read when the board loaded.
            this._now = new Date();
        }
        catch (error) {
            // The dialog stays open holding the draft: the backend rejected a value,
            // and throwing the grower's typing away would be the second failure.
            this._saveError = GrowspaceTcCultures_1._message(error);
        }
        finally {
            this._saving = false;
        }
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
    /** The dialog for the act being recorded, over the vessel it names. */
    _renderActionDialog(acting) {
        return x `<growspace-tc-action-dialog
      .action=${acting.action}
      .culture=${acting.culture}
      .lineName=${this._lineNames.get(acting.line.id) ?? acting.line.phenotype.name_snapshot}
      .media=${this._media}
      .graduationBridge=${this.graduationBridge}
      .growspaces=${this._graduationGrowspaces}
      .growspacesStatus=${this._destinations === 'idle' ? 'loading' : this._destinations}
      .genetics=${this._library.find((entry) => entry.key === acting.line.phenotype.id)}
      .history=${this._history}
      .historyLoading=${this._historyLoading}
      .saving=${this._saving}
      .error=${this._saveError}
      .language=${this.language}
      @maintenance-requested=${this._record}
      @maintenance-cancelled=${this._cancelAction}
    ></growspace-tc-action-dialog>`;
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
        // An open action replaces the panes rather than sitting above them, the way
        // the introduction already does. Both are one thing the grower is doing,
        // and cancelling either returns to exactly the pane it was opened from —
        // the surface never moved, only what is drawn in it.
        if (this._acting.open)
            return this._renderActionDialog(this._acting);
        return x `
      <div class="stack">
        ${this._error ? x `<p class="error" role="alert">${this._error}</p>` : E}
        ${this._graduationNotice ? x `<p role="status">${this._graduationNotice}</p>` : E}
        ${this._relinking.open ? this._renderRelink(this._relinking.line) : E}
        ${this.maintenance
            ? x `<growspace-tc-worklist
              ?hidden=${this.surface === 'cultures'}
              .entries=${this._worklist}
              .names=${this._lineNames}
              .locations=${locationOptions(this._lines)}
              .language=${this.language}
              @culture-action-requested=${this._startAction}
            ></growspace-tc-worklist>`
            : E}
        <growspace-tc-culture-board
          ?hidden=${this.surface === 'worklist'}
          .lines=${this._lines}
          .resolutions=${this._resolutions}
          .showArchived=${this._showArchived}
          .actionable=${this.maintenance}
          .language=${this.language}
          @line-introduce-requested=${this._startIntroduction}
          @line-relink-requested=${this._startRelink}
          @line-archive-requested=${this._setArchived}
          @line-show-archived-toggled=${() => (this._showArchived = !this._showArchived)}
          @culture-action-requested=${this._startAction}
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

      /* Beats the hidden pane's own :host display rule. A rule in the tree an
         element lives in outranks the :host rules inside it. */
      [hidden] {
        display: none;
      }

      /* The worklist and the board stack in the standalone card; in the dialog
         one of them is hidden and the gap goes with it. */
      .stack {
        display: flex;
        flex-direction: column;
        gap: 32px;
      }

      .stack > p {
        margin: 0;
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

      .relink growspace-tc-phenotype-picker {
        display: block;
        max-width: 40rem;
        margin-bottom: 8px;
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
    n({ type: Boolean })
], GrowspaceTcCultures.prototype, "maintenance", void 0);
__decorate([
    n({ type: Boolean })
], GrowspaceTcCultures.prototype, "graduationBridge", void 0);
__decorate([
    n({ type: String })
], GrowspaceTcCultures.prototype, "language", void 0);
__decorate([
    n({ type: String })
], GrowspaceTcCultures.prototype, "surface", void 0);
__decorate([
    r()
], GrowspaceTcCultures.prototype, "_devices", void 0);
__decorate([
    r()
], GrowspaceTcCultures.prototype, "_destinations", void 0);
__decorate([
    r()
], GrowspaceTcCultures.prototype, "_graduationNotice", void 0);
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
__decorate([
    r()
], GrowspaceTcCultures.prototype, "_media", void 0);
__decorate([
    r()
], GrowspaceTcCultures.prototype, "_acting", void 0);
__decorate([
    r()
], GrowspaceTcCultures.prototype, "_history", void 0);
__decorate([
    r()
], GrowspaceTcCultures.prototype, "_historyLoading", void 0);
__decorate([
    r()
], GrowspaceTcCultures.prototype, "_now", void 0);
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
      <dl class="spec">
        <div>
          <dt>${this._t('medium_base_salts')}</dt>
          <dd>${version.base_salts}</dd>
        </div>
        <div>
          <dt>${this._t('medium_hormones')}</dt>
          <dd>${this._components(version.hormones)}</dd>
        </div>
        <div>
          <dt>${this._t('medium_additives')}</dt>
          <dd>${this._components(version.additives)}</dd>
        </div>
        <div>
          <dt>${this._t('medium_agar')}</dt>
          <dd>${version.agar_g_per_l} g/L</dd>
        </div>
        <div>
          <dt>${this._t('medium_sugar')}</dt>
          <dd>${version.sugar_g_per_l} g/L</dd>
        </div>
        <div>
          <dt>${this._t('medium_ph')}</dt>
          <dd>${version.ph_target}</dd>
        </div>
        ${version.notes
            ? x `<div class="wide">
              <dt>${this._t('medium_notes')}</dt>
              <dd>${version.notes}</dd>
            </div>`
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
      <li class="medium record">
        <div class="record-identity">
          <div class="medium-head">
            <h4>${medium.name}</h4>
            <span class="version-chip">
              ${localizeWithParams('tc.medium_version_label', { version: medium.current_version }, this.language)}
            </span>
          </div>
          <button
            class="link"
            aria-expanded=${open ? 'true' : 'false'}
            @click=${() => this._toggleHistory(medium.id)}
          >
            ${localizeWithParams(open ? 'tc.medium_hide_history' : 'tc.medium_show_history', { count: medium.versions.length }, this.language)}
          </button>
        </div>
        <div class="record-detail">${current ? this._renderFormulation(current) : E}</div>
        <div class="actions record-actions">
          <button @click=${() => this._emit('medium-edit-requested', { id: medium.id })}>
            ${this._t('medium_edit')}
          </button>
          <button @click=${() => this._emit('medium-delete-requested', { id: medium.id })}>
            ${this._t('medium_delete')}
          </button>
        </div>
        ${open ? x `<div class="record-more">${this._renderHistory(medium)}</div>` : E}
      </li>
    `;
    }
    render() {
        return x `
      <section aria-label=${this._t('medium_library_title')}>
        <header class="library surface-head">
          <div class="title">
            <h3>${this._t('medium_library_title')}</h3>
          </div>
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
    tcLayoutStyles,
    i `
      :host {
        display: block;
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
        padding: 12px 14px 14px 16px;
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

      .history {
        margin-top: 4px;
        border-top: 1px solid var(--divider-color, rgba(255, 255, 255, 0.12));
        padding-top: 12px;
      }

      .history > p {
        margin: 0;
        font-size: 0.8125rem;
        max-width: 65ch;
      }

      /* Versions side by side, newest on the left: the question a history
         answers is what changed, and that is read across, not down. */
      .history ol {
        list-style: none;
        margin: 12px 0 0;
        padding: 0;
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(min(100%, 18rem), 1fr));
        gap: 16px 24px;
      }

      .history li {
        padding-top: 10px;
        border-top: 1px solid var(--divider-color, rgba(255, 255, 255, 0.12));
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .history li.current {
        border-top-color: var(--primary-color);
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
        margin: 0;
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

      button:hover {
        background: var(--secondary-background-color, rgba(255, 255, 255, 0.05));
      }

      button.link {
        border: none;
        padding: 4px 0;
        text-decoration: underline;
        min-height: 32px;
      }

      button.link:hover {
        background: none;
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

        <div class="split">
          <div class="column">
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
          </div>
          <div class="column">
            ${this._renderComponents('hormones', this._t('medium_hormones'))}
            ${this._renderComponents('additives', this._t('medium_additives'))}
          </div>
        </div>

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
    tcLayoutStyles,
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

/**
 * The Culture Medium library's container: the fetch, the editor and the
 * deletion the grower has to confirm.
 *
 * It was extracted out of `growspace-tc-view` unchanged. The view was two
 * things at once — the composition of TC's surfaces, and one of those surfaces
 * — which is exactly the shape that cannot be selected between. With the media
 * surface in a container of its own, mirroring cultures and pairings, the view
 * holds no state at all and becomes a pure function of its properties: the
 * property that lets it be mounted by two hosts which agree on nothing else.
 */
var GrowspaceTcMedia_1;
let GrowspaceTcMedia = GrowspaceTcMedia_1 = class GrowspaceTcMedia extends i$1 {
    constructor() {
        super(...arguments);
        this.language = 'en';
        this._media = [];
        this._loading = false;
        this._error = '';
        this._saving = false;
        this._saveError = '';
        this._editing = { open: false };
    }
    connectedCallback() {
        super.connectedCallback();
        this._unsubscribe?.();
        this._unsubscribe = cultureMedia$.subscribe((media) => {
            this._media = [...media];
        });
        // This element is rendered only where the manifest serves the feature, so
        // being connected is the whole condition for fetching — the view no longer
        // needs a latch to keep a manifest update from fetching twice.
        void this._load();
    }
    disconnectedCallback() {
        this._unsubscribe?.();
        this._unsubscribe = undefined;
        super.disconnectedCallback();
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
            this._error = GrowspaceTcMedia_1._message(error);
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
            this._saveError = GrowspaceTcMedia_1._message(error);
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
            this._error = GrowspaceTcMedia_1._message(error);
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
        return x `
      <div>
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
GrowspaceTcMedia.styles = [
    variables,
    sharedStyles,
    i `
      :host {
        display: block;
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
    n({ type: String })
], GrowspaceTcMedia.prototype, "language", void 0);
__decorate([
    r()
], GrowspaceTcMedia.prototype, "_media", void 0);
__decorate([
    r()
], GrowspaceTcMedia.prototype, "_loading", void 0);
__decorate([
    r()
], GrowspaceTcMedia.prototype, "_error", void 0);
__decorate([
    r()
], GrowspaceTcMedia.prototype, "_saving", void 0);
__decorate([
    r()
], GrowspaceTcMedia.prototype, "_saveError", void 0);
__decorate([
    r()
], GrowspaceTcMedia.prototype, "_editing", void 0);
__decorate([
    r()
], GrowspaceTcMedia.prototype, "_pendingDelete", void 0);
GrowspaceTcMedia = GrowspaceTcMedia_1 = __decorate([
    t('growspace-tc-media')
], GrowspaceTcMedia);

/** Owns one Pairing editing session, from draft through mutation and focus return. */
let GrowspaceTcPairings = class GrowspaceTcPairings extends i$1 {
    constructor() {
        super(...arguments);
        this._pairings = [];
        this._media = [];
        this._phenotypes = [];
        this._libraryLoaded = false;
        this._saving = false;
        this._error = '';
        this.language = 'en';
        this._by = 'medium';
        this._loading = true;
        this._loadError = '';
        this._unsubscribe = [];
        this._session = 0;
    }
    connectedCallback() {
        super.connectedCallback();
        this._unsubscribe = [
            pairings$.subscribe((rows) => (this._pairings = [...rows])),
            cultureMedia$.subscribe((rows) => (this._media = [...rows])),
            strainLibrary$.subscribe((rows) => (this._phenotypes = phenotypeOptions([...rows]))),
        ];
        void this._load();
    }
    disconnectedCallback() {
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
    async _load() {
        const session = this._session;
        this._loading = true;
        this._loadError = '';
        this._libraryLoaded = false;
        const results = await Promise.allSettled([fetchPairings(), fetchStrainLibrary()]);
        if (!this.isConnected || session !== this._session)
            return;
        this._libraryLoaded = results[1].status === 'fulfilled';
        this._loadError = results
            .filter((result) => result.status === 'rejected')
            .map((result) => String(result.reason))
            .join(' ');
        this._loading = false;
    }
    async _mutate(action) {
        if (this._saving || !this.isConnected)
            return;
        const session = this._session;
        this._saving = true;
        this._error = '';
        try {
            await action();
            if (this.isConnected && session === this._session)
                this._finishEditing();
        }
        catch (error) {
            if (this.isConnected && session === this._session)
                this._error = error instanceof Error ? error.message : String(error);
        }
        finally {
            if (this.isConnected && session === this._session)
                this._saving = false;
        }
    }
    _t(key) {
        return localize(`tc.${key}`, '', '', this.language);
    }
    _visible() {
        return this.isConnected && this.checkVisibility({ visibilityProperty: true });
    }
    _finishEditing() {
        const restoreFocus = this._visible() && !!this.shadowRoot?.activeElement;
        const session = this._session;
        const origin = this._returnFocus;
        this._draft = undefined;
        this._editingId = undefined;
        this._removing = undefined;
        this._error = '';
        this._returnFocus = undefined;
        void this.updateComplete.then(() => {
            if (!restoreFocus || session !== this._session || !this._visible())
                return;
            // Removing the form can leave focus on body. Otherwise respect any focus
            // the user moved outside this surface while the render was pending.
            if (!this.shadowRoot?.activeElement &&
                this.ownerDocument.activeElement !== this.ownerDocument.body)
                return;
            const row = [...this.shadowRoot.querySelectorAll('[data-pairing-id]')].find((element) => element.dataset.pairingId === origin?.pairingId);
            const target = origin?.pairingId
                ? row?.querySelector(`[data-action="${origin.action}"]`)
                : undefined;
            (target ?? this.shadowRoot?.querySelector('[data-action="add"]'))?.focus();
        });
    }
    _edit(pairing) {
        if (this._saving)
            return;
        this._error = '';
        this._removing = undefined;
        this._returnFocus = { pairingId: pairing?.id, action: pairing ? 'edit' : 'add' };
        const session = this._session;
        this._editingId = pairing?.id;
        this._draft = pairing
            ? {
                phenotype_id: pairing.phenotype.id,
                phenotype_name: this._phenotypes.find((p) => p.id === pairing.phenotype.id)?.name ??
                    pairing.phenotype.name_snapshot,
                medium_id: pairing.medium_id,
                notes: pairing.notes,
            }
            : { phenotype_id: '', phenotype_name: '', medium_id: this._media[0]?.id ?? '', notes: '' };
        void this.updateComplete.then(async () => {
            const picker = this.shadowRoot?.querySelector('growspace-tc-phenotype-picker');
            await picker?.updateComplete;
            if (session !== this._session || !this._visible())
                return;
            const target = picker?.shadowRoot?.querySelector('input') ??
                this.shadowRoot?.querySelector('form select');
            target?.focus();
        });
    }
    _renderForm(draft) {
        const duplicate = this._pairings.some((row) => row.id !== this._editingId &&
            row.medium_id === draft.medium_id &&
            row.phenotype.id === draft.phenotype_id);
        const valid = draft.phenotype_id && this._media.some((m) => m.id === draft.medium_id) && !duplicate;
        return x `<form
      @submit=${(event) => {
            event.preventDefault();
            if (valid && !this._saving)
                void this._mutate(() => savePairing(draft, this._editingId));
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
              @phenotype-selected=${(event) => {
            if (!this._saving)
                this._draft = {
                    ...draft,
                    phenotype_id: event.detail.id,
                    phenotype_name: event.detail.name,
                };
        }}
            ></growspace-tc-phenotype-picker>
            ${draft.phenotype_name
            ? x `<p>${this._t('pairing_phenotype')}: ${draft.phenotype_name}</p>`
            : E}
          </div>
          <div class="column">
            <label
              >${this._t('pairing_medium')}<select
                required
                .value=${draft.medium_id}
                @change=${(event) => (this._draft = {
            ...draft,
            medium_id: event.target.value,
        })}
              >
                <option value="">${this._t('pairing_choose_medium')}</option>
                ${this._media.map((m) => x `<option value=${m.id} ?selected=${m.id === draft.medium_id}>
                      ${m.name}
                    </option>`)}
              </select></label
            >
            <label
              >${this._t('pairing_notes')}<textarea
                maxlength="4000"
                .value=${draft.notes}
                @input=${(event) => (this._draft = { ...draft, notes: event.target.value })}
              ></textarea>
            </label>
            ${duplicate
            ? x `<p class="error" role="alert">${this._t('pairing_duplicate')}</p>`
            : E}
            <div class="actions form-actions">
              <button
                type="button"
                @click=${() => {
            if (!this._saving)
                this._finishEditing();
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
    render() {
        return x `
      ${this._loading
            ? x `<p class="status supporting" role="status">${this._t('pairing_loading')}</p>`
            : E}
      ${this._loadError
            ? x `<div class="status actions">
            <p role="alert">${this._loadError}</p>
            <button @click=${this._load}>${this._t('pairing_retry')}</button>
          </div>`
            : E}
      ${this._renderPairings()}
    `;
    }
    _renderPairings() {
        const names = new Map(this._phenotypes.map((p) => [p.id, p.name]));
        const mediumNames = new Map(this._media.map((m) => [m.id, m.name]));
        const groups = new Map();
        for (const row of this._pairings) {
            const key = this._by === 'medium' ? row.medium_id : row.phenotype.id;
            const name = this._by === 'medium'
                ? (mediumNames.get(key) ?? this._t('pairing_missing_medium'))
                : resolvePhenotype(row.phenotype, names, this._libraryLoaded).name;
            const group = groups.get(key) ?? { name, rows: [] };
            group.rows.push(row);
            groups.set(key, group);
        }
        return x `<section aria-label=${this._t('pairing_title')}>
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
              @change=${(event) => (this._by =
            event.target.value === 'medium' ? 'medium' : 'phenotype')}
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
            ? x `<p class="supporting">${this._t('pairing_needs_medium')}</p>`
            : E}
      ${this._error ? x `<p class="error" role="alert">${this._error}</p>` : E}
      ${this._draft ? this._renderForm(this._draft) : E}
      ${!this._pairings.length
            ? x `<p class="empty supporting">${this._t('pairing_empty')}</p>`
            : E}
      <div class="groups">
        ${[...groups.values()]
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((group) => x `<div class="group">
                <h4>${group.name}</h4>
                <ul>
                  ${group.rows.map((row) => {
            const phenotype = resolvePhenotype(row.phenotype, names, this._libraryLoaded);
            return x `<li class="record" data-pairing-id=${row.id}>
                      <div class="record-identity">
                        <strong
                          >${this._by === 'medium'
                ? phenotype.name
                : (mediumNames.get(row.medium_id) ??
                    this._t('pairing_missing_medium'))}</strong
                        >
                        ${phenotype.status === 'missing'
                ? x `<p class="error supporting">
                              ${this._t('pairing_missing_phenotype')}
                            </p>`
                : E}
                      </div>
                      <div class="record-detail">
                        ${row.notes ? x `<p class="notes">${row.notes}</p>` : E}
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
                ? x `<span>${this._t('pairing_remove_confirm')}</span
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
                : x `<button
                              ?disabled=${this._saving}
                              data-action="remove"
                              @click=${() => {
                    if (this._saving)
                        return;
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
              </div>`)}
      </div>
    </section>`;
    }
};
GrowspaceTcPairings.styles = [
    portalVariables,
    sharedStyles,
    tcLayoutStyles,
    i `
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
__decorate([
    r()
], GrowspaceTcPairings.prototype, "_pairings", void 0);
__decorate([
    r()
], GrowspaceTcPairings.prototype, "_media", void 0);
__decorate([
    r()
], GrowspaceTcPairings.prototype, "_phenotypes", void 0);
__decorate([
    r()
], GrowspaceTcPairings.prototype, "_libraryLoaded", void 0);
__decorate([
    r()
], GrowspaceTcPairings.prototype, "_saving", void 0);
__decorate([
    r()
], GrowspaceTcPairings.prototype, "_error", void 0);
__decorate([
    n({ type: String })
], GrowspaceTcPairings.prototype, "language", void 0);
__decorate([
    r()
], GrowspaceTcPairings.prototype, "_by", void 0);
__decorate([
    r()
], GrowspaceTcPairings.prototype, "_draft", void 0);
__decorate([
    r()
], GrowspaceTcPairings.prototype, "_editingId", void 0);
__decorate([
    r()
], GrowspaceTcPairings.prototype, "_removing", void 0);
__decorate([
    r()
], GrowspaceTcPairings.prototype, "_loading", void 0);
__decorate([
    r()
], GrowspaceTcPairings.prototype, "_loadError", void 0);
GrowspaceTcPairings = __decorate([
    t('growspace-tc-pairings')
], GrowspaceTcPairings);

/**
 * The tissue-culture view.
 *
 * It composes TC's four surfaces — the due/overdue worklist, the culture board,
 * the Culture Medium library and the curated pairing editor — and owns none of
 * them. The worklist leads because it is the answer to the question a grower
 * opens this view with: what has to be replated. The board is what they reach
 * for once that is done.
 *
 * Which surfaces exist is `tcSurfaces(manifest)`'s answer, not this element's:
 * every surface is gated on a manifest feature rather than on the installed
 * release, because a TC that predates the medium library answers the presence
 * probe perfectly well, and the honest response to that is a view without a
 * library rather than a library whose every call fails.
 *
 * **Two hosts mount this element**: the standalone `growspace-tc-card`, which
 * sets no `surface` and gets the stacked composition, and the Tissue Culture
 * dialog, which names one surface per tab. So it holds no state, reads no
 * `hass`, no context and no per-card store, and declares neither height nor
 * overflow — the chrome, the geometry and what a plant link means belong to the
 * host, and the seam between the two is this property interface.
 */
let GrowspaceTcView = class GrowspaceTcView extends i$1 {
    constructor() {
        super(...arguments);
        this.language = 'en';
    }
    _t(key) {
        return localize(`tc.${key}`, '', '', this.language);
    }
    /** Whether a surface this installation offers is not the one being shown. */
    _hidden(...ids) {
        return this.surface !== undefined && !ids.includes(this.surface);
    }
    render() {
        const surfaces = tcSurfaces(this.manifest);
        // Nothing this release can serve: an installation older than every surface
        // answers the presence probe perfectly well, and a view of broken calls
        // would be worse than one that says so. The copy says *capabilities*, not
        // data — an installation with no supported features is not an empty one,
        // and both hosts render this same state.
        if (surfaces.length === 0) {
            return x `
        <div class="state" role="region" aria-label=${this._t('view_title')}>
          <h3>${this._t('incompatible_title')}</h3>
          <p class="supporting">${this._t('incompatible_body')}</p>
        </div>
      `;
        }
        return x `
      <div class="surfaces" role="region" aria-label=${this._t('view_title')}>
        ${surfaces.includes('cultures')
            ? x `<growspace-tc-cultures
              ?hidden=${this._hidden('worklist', 'cultures')}
              .surface=${this.surface === 'worklist' || this.surface === 'cultures'
                ? this.surface
                : undefined}
              .maintenance=${this.manifest?.features.includes(TC_FEATURE_MAINTENANCE) ?? false}
              .graduationBridge=${this.manifest?.features.includes('graduation_bridge') ?? false}
              .language=${this.language}
            ></growspace-tc-cultures>`
            : E}
        ${surfaces.includes('media')
            ? x `<growspace-tc-media
              ?hidden=${this._hidden('media')}
              .language=${this.language}
            ></growspace-tc-media>`
            : E}
        ${surfaces.includes('pairings')
            ? x `<growspace-tc-pairings
              ?hidden=${this._hidden('pairings')}
              .language=${this.language}
            ></growspace-tc-pairings>`
            : E}
      </div>
    `;
    }
};
GrowspaceTcView.styles = [
    variables,
    sharedStyles,
    i `
      :host {
        /* The host tunes the inset without a JS property: an ha-card wants
           the 16px, a dialog whose frame already pads its content pane may
           want none of it. */
        display: block;
        padding: var(--growspace-tc-view-padding, 16px);
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

      .surfaces {
        display: flex;
        flex-direction: column;
        gap: 32px;
      }

      /* Beats the hidden surface's own :host display rule. A rule in the tree
         an element lives in outranks the :host rules inside it. */
      [hidden] {
        display: none;
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
    n({ type: String })
], GrowspaceTcView.prototype, "surface", void 0);
GrowspaceTcView = __decorate([
    t('growspace-tc-view')
], GrowspaceTcView);

export { GrowspaceTcCultures, GrowspaceTcMedia, GrowspaceTcView };
//# sourceMappingURL=growspace-tc-D_bB6CsN.js.map
