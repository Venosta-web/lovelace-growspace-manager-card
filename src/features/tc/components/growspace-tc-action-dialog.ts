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

import { LitElement, html, css, nothing, type CSSResultGroup, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { localize, localizeWithParams } from '../../../localize/localize';
import { sharedStyles } from '../../../styles/shared.styles';
import { variables } from '../../../styles/variables';
import {
  draftReplate,
  type GraduationPlant,
  type Culture,
  type CultureMedium,
  type DiscardReason,
  type MaintenanceAction,
  type MaintenanceActionType,
  type MaintenanceRequest,
  type ReplateDraft,
  type ReplateVesselDraft,
} from '../../../slices/tc';

type GraduationGrowspace = { deviceId: string; name: string; rows: number; plantsPerRow: number };

const DISCARD_REASONS: DiscardReason[] = ['contamination', 'spent', 'mistake'];

@customElement('growspace-tc-action-dialog')
export class GrowspaceTcActionDialog extends LitElement {
  @property({ type: String }) action: MaintenanceActionType = 'note';
  @property({ attribute: false }) culture?: Culture;
  /** The name to show for the vessel's line — already resolved by the caller. */
  @property({ type: String }) lineName = '';
  @property({ attribute: false }) media: CultureMedium[] = [];
  @property({ attribute: false }) history: MaintenanceAction[] = [];
  @property({ type: Boolean }) historyLoading = false;
  @property({ type: Boolean }) saving = false;
  /** A backend rejection, already phrased for the grower by the backend. */
  @property({ type: String }) error = '';
  @property({ type: String }) language = 'en';
  @property({ type: Boolean }) graduationBridge = false;
  @property({ attribute: false }) growspaces: GraduationGrowspace[] = [];
  @property({ attribute: false }) genetics?: { strain: string; phenotype?: string };

  @state() private _createPlant = false;
  @state() private _plant: GraduationPlant = {
    growspace_id: '',
    strain: '',
    phenotype: '',
    row: 1,
    col: 1,
  };

  @state() private _note = '';
  @state() private _reason: DiscardReason = 'contamination';
  @state() private _replate?: ReplateDraft;
  @state() private _showHistory = false;

  static styles: CSSResultGroup = [
    variables,
    sharedStyles,
    css`
      :host {
        display: block;
      }

      form {
        display: flex;
        flex-direction: column;
        gap: 12px;
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.12));
        border-radius: 12px;
        padding: 12px 14px;
        margin-bottom: 12px;
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

      .vessel {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
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

  private _t(key: string): string {
    return localize(`tc.${key}`, '', '', this.language);
  }

  protected willUpdate(changed: Map<string | number | symbol, unknown>): void {
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
    // The Replate draft is seeded from the vessel being replated, so what the
    // dialog sends is always what the grower is looking at: this culture's
    // count and shelf, and the medium it would most likely be poured onto.
    if ((changed.has('culture') || changed.has('media')) && this.culture) {
      this._replate = draftReplate(this.culture, this.media[0]);
    }
  }

  private get _draft(): ReplateDraft {
    return this._replate ?? { medium_id: '', medium_version: 1, vessels: [], note: '' };
  }

  private _setDraft(patch: Partial<ReplateDraft>): void {
    this._replate = { ...this._draft, ...patch };
  }

  private _setVessel(index: number, patch: Partial<ReplateVesselDraft>): void {
    this._setDraft({
      vessels: this._draft.vessels.map((vessel, at) =>
        at === index ? { ...vessel, ...patch } : vessel
      ),
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
  private _selectMedium(event: Event): void {
    const medium = this.media.find(
      (entry) => entry.id === (event.target as HTMLSelectElement).value
    );
    if (!medium) return;
    this._setDraft({ medium_id: medium.id, medium_version: medium.current_version });
  }

  private _addVessel(): void {
    const last = this._draft.vessels[this._draft.vessels.length - 1];
    this._setDraft({
      vessels: [...this._draft.vessels, { plantlet_count: null, location: last?.location ?? '' }],
    });
  }

  private _removeVessel(index: number): void {
    this._setDraft({ vessels: this._draft.vessels.filter((_vessel, at) => at !== index) });
  }

  private _request(): MaintenanceRequest | null {
    const cultureId = this.culture?.id;
    if (!cultureId) return null;
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

  private _submit(event: Event): void {
    event.preventDefault();
    if (this.saving || this.culture?.status !== 'active') return;
    if (!(event.target as HTMLFormElement).reportValidity()) return;
    const request = this._request();
    if (!request) return;
    this.dispatchEvent(
      new CustomEvent('maintenance-requested', {
        detail: { request },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _cancel(): void {
    this.dispatchEvent(new CustomEvent('maintenance-cancelled', { bubbles: true, composed: true }));
  }

  /** The day a stamp names, or the raw stamp if it cannot be read. */
  private _day(iso: string): string {
    const taken = new Date(iso);
    return Number.isNaN(taken.getTime()) ? iso : taken.toLocaleDateString(this.language);
  }

  private _mediumName(mediumId: string | null): string {
    if (mediumId === null) return this._t('history_medium_unknown');
    return (
      this.media.find((entry) => entry.id === mediumId)?.name ?? this._t('history_medium_unknown')
    );
  }

  /** One recorded act as a sentence. Every act type has one; none is skipped. */
  private _historyLine(action: MaintenanceAction): string {
    switch (action.action) {
      case 'replate':
        return localizeWithParams(
          action.vessels.length > 1 ? 'tc.history_replate_divided' : 'tc.history_replate',
          {
            medium: this._mediumName(action.medium_id),
            version: action.medium_version ?? '?',
            count: action.vessels.length,
          },
          this.language
        );
      case 'discard':
        return localizeWithParams(
          'tc.history_discard',
          { reason: this._t(`action_reason_${action.reason ?? 'mistake'}`) },
          this.language
        );
      default:
        return this._t(`history_${action.action}`);
    }
  }

  private _renderHistory(): TemplateResult {
    if (this.historyLoading) {
      return html`<p class="supporting">${this._t('history_loading')}</p>`;
    }
    if (!this.history.length) {
      return html`<p class="supporting">${this._t('history_empty')}</p>`;
    }
    return html`
      <ol class="history">
        ${this.history.map(
          (action) => html`
            <li>
              <span class="when">${this._day(action.recorded_at)}</span>
              — ${this._historyLine(action)}${action.note ? html` — ${action.note}` : nothing}
              ${action.plant_id
                ? html` —
                    <a href=${`?plantId=${encodeURIComponent(action.plant_id)}`}
                      >${this._t('graduation_view_plant')}</a
                    >`
                : nothing}
            </li>
          `
        )}
      </ol>
    `;
  }

  private _renderVessels(): TemplateResult {
    return html`
      <fieldset>
        <legend>${this._t('action_vessels')}</legend>
        <p class="supporting">${this._t('action_replate_explainer')}</p>
        ${this._draft.vessels.map(
          (vessel, index) => html`
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
                  @input=${(e: Event) => {
                    // Left blank stays null. After a division the old number
                    // describes a vessel that no longer exists, so "nobody
                    // counted" has to stay recordable.
                    const raw = (e.target as HTMLInputElement).value.trim();
                    this._setVessel(index, { plantlet_count: raw === '' ? null : Number(raw) });
                  }}
                />
              </label>
              <label>
                ${this._t('culture_location')}
                <input
                  .value=${vessel.location}
                  @input=${(e: Event) =>
                    this._setVessel(index, { location: (e.target as HTMLInputElement).value })}
                />
              </label>
              ${index === 0
                ? nothing
                : html`<button type="button" @click=${() => this._removeVessel(index)}>
                    ${this._t('action_vessel_remove')}
                  </button>`}
            </div>
          `
        )}
        <button type="button" @click=${this._addVessel}>${this._t('action_vessel_add')}</button>
      </fieldset>
    `;
  }

  private _renderReplate(): TemplateResult {
    if (!this.media.length) {
      return html`<p class="supporting" role="status">${this._t('action_medium_none')}</p>`;
    }
    return html`
      <label>
        ${this._t('action_medium')}
        <select .value=${this._draft.medium_id} @change=${this._selectMedium}>
          ${this.media.map(
            (medium) =>
              html`<option value=${medium.id}>
                ${medium.name} —
                ${localizeWithParams(
                  'tc.action_medium_version',
                  { version: medium.current_version },
                  this.language
                )}
              </option>`
          )}
        </select>
      </label>
      ${this._renderVessels()}
    `;
  }

  private _renderDiscard(): TemplateResult {
    return html`
      <label>
        ${this._t('action_reason')}
        <select
          .value=${this._reason}
          @change=${(e: Event) =>
            (this._reason = (e.target as HTMLSelectElement).value as DiscardReason)}
        >
          ${DISCARD_REASONS.map(
            (reason) => html`<option value=${reason}>${this._t(`action_reason_${reason}`)}</option>`
          )}
        </select>
      </label>
    `;
  }

  private _renderGraduation(): TemplateResult {
    if (!this.graduationBridge) return html`${nothing}`;
    const destination = this.growspaces.find(
      (entry) => entry.deviceId === this._plant.growspace_id
    );
    return html`
      <label class="bridge-toggle">
        <input
          type="checkbox"
          name="createPlant"
          .checked=${this._createPlant}
          ?disabled=${this.saving || !this.growspaces.length}
          @change=${(event: Event) =>
            (this._createPlant = (event.target as HTMLInputElement).checked)}
        />
        ${this._t('graduation_create_plant')}
      </label>
      <p class="supporting">
        ${this._t(this.growspaces.length ? 'graduation_bridge_help' : 'graduation_no_growspace')}
      </p>
      ${this._createPlant
        ? html`<div class="plant-fields">
            <label
              >${this._t('graduation_growspace')}
              <select
                name="growspace"
                required
                .value=${this._plant.growspace_id}
                ?disabled=${this.saving}
                @change=${(e: Event) => {
                  this._plant = {
                    ...this._plant,
                    growspace_id: (e.target as HTMLSelectElement).value,
                    row: 1,
                    col: 1,
                  };
                }}
              >
                ${this.growspaces.map(
                  (entry) => html`<option value=${entry.deviceId}>${entry.name}</option>`
                )}
              </select>
            </label>
            <label
              >${this._t('graduation_strain')}
              <input
                name="strain"
                required
                .value=${this._plant.strain}
                ?disabled=${this.saving}
                @input=${(e: Event) => {
                  this._plant = { ...this._plant, strain: (e.target as HTMLInputElement).value };
                }}
              />
            </label>
            <label
              >${this._t('graduation_phenotype')}
              <input
                name="phenotype"
                .value=${this._plant.phenotype}
                ?disabled=${this.saving}
                @input=${(e: Event) => {
                  this._plant = { ...this._plant, phenotype: (e.target as HTMLInputElement).value };
                }}
              />
            </label>
            ${(['row', 'col'] as const).map(
              (field) =>
                html`<label
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
                    @input=${(e: Event) => {
                      this._plant = {
                        ...this._plant,
                        [field]: Number((e.target as HTMLInputElement).value),
                      };
                    }}
                  />
                </label>`
            )}
          </div>`
        : nothing}
    `;
  }

  protected render(): TemplateResult {
    if (!this.culture) return html`${nothing}`;
    if (this.culture.status !== 'active')
      return html`<form
        role="dialog"
        aria-label=${this._t('history_show')}
        @submit=${(event: Event) => event.preventDefault()}
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
    const blocked =
      (replating && !this.media.length) || (this.action === 'note' && this._note.trim() === '');

    return html`
      <form @submit=${this._submit} role="dialog" aria-label=${this._t(`action_${this.action}`)}>
        <h3>
          ${localizeWithParams(
            'tc.action_on_vessel',
            { action: this._t(`action_${this.action}`), name: this.lineName },
            this.language
          )}
        </h3>
        <p class="supporting">
          ${this._t(replating ? 'action_replate_explainer' : `action_${this.action}_explainer`)}
        </p>

        ${replating ? this._renderReplate() : nothing}
        ${this.action === 'discard' ? this._renderDiscard() : nothing}
        ${this.action === 'graduate' ? this._renderGraduation() : nothing}

        <label>
          ${this._t('action_note_label')}
          <textarea
            .value=${this._note}
            @input=${(e: Event) => (this._note = (e.target as HTMLTextAreaElement).value)}
          ></textarea>
        </label>

        <button
          type="button"
          class="link"
          aria-expanded=${this._showHistory ? 'true' : 'false'}
          @click=${() => (this._showHistory = !this._showHistory)}
        >
          ${this._t(this._showHistory ? 'history_hide' : 'history_show')}
        </button>
        ${this._showHistory ? this._renderHistory() : nothing}
        ${this.error ? html`<p class="error" role="alert">${this.error}</p>` : nothing}

        <div class="buttons">
          <button type="button" @click=${this._cancel}>${this._t('medium_cancel')}</button>
          <button type="submit" ?disabled=${this.saving || blocked}>
            ${this._t(this.saving ? 'action_saving' : 'action_record')}
          </button>
        </div>
      </form>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'growspace-tc-action-dialog': GrowspaceTcActionDialog;
  }
}
