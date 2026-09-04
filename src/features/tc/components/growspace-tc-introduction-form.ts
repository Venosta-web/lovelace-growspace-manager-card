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

import { LitElement, html, css, nothing, type CSSResultGroup, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { localize } from '../../../localize/localize';
import { sharedStyles } from '../../../styles/shared.styles';
import { variables } from '../../../styles/variables';
import {
  draftIntroduction,
  type CultureStage,
  type IntroductionDraft,
  type PhenotypeOption,
} from '../../../slices/tc';
import './growspace-tc-phenotype-picker';

@customElement('growspace-tc-introduction-form')
export class GrowspaceTcIntroductionForm extends LitElement {
  @property({ attribute: false }) phenotypes: PhenotypeOption[] = [];
  @property({ type: Boolean }) saving = false;
  /** A backend rejection, already phrased for the grower by the backend. */
  @property({ type: String }) error = '';
  @property({ type: String }) language = 'en';

  @state() private _draft: IntroductionDraft = draftIntroduction();

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

  private _t(key: string): string {
    return localize(`tc.${key}`, '', '', this.language);
  }

  private _set<K extends keyof IntroductionDraft>(key: K, value: IntroductionDraft[K]): void {
    this._draft = { ...this._draft, [key]: value };
  }

  /**
   * Record both halves of the reference at once.
   *
   * The name is what the backend snapshots, so it is taken from the option the
   * grower actually clicked rather than looked up again at save time.
   */
  private _selectPhenotype(event: CustomEvent<{ id: string; name: string }>): void {
    this._draft = {
      ...this._draft,
      phenotype_id: event.detail.id,
      phenotype_name: event.detail.name,
    };
  }

  private _setInterval(stage: CultureStage, event: Event): void {
    // An empty or half-typed field becomes NaN rather than 0: the backend
    // rejects it with a sentence naming the stage, which is a better answer
    // than recording an interval nobody chose.
    this._set('replate_interval_days', {
      ...this._draft.replate_interval_days,
      [stage]: Number((event.target as HTMLInputElement).value),
    });
  }

  private _setPlantletCount(event: Event): void {
    // Left blank stays null. "Nobody counted" and "the vessel is empty" are
    // different facts, and only one of them is a zero.
    const raw = (event.target as HTMLInputElement).value.trim();
    this._set('plantlet_count', raw === '' ? null : Number(raw));
  }

  private _submit(event: Event): void {
    event.preventDefault();
    this.dispatchEvent(
      new CustomEvent('introduction-requested', {
        detail: { draft: this._draft },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _cancel(): void {
    this.dispatchEvent(
      new CustomEvent('introduction-cancelled', { bubbles: true, composed: true })
    );
  }

  protected render(): TemplateResult {
    const chosen = this._draft.phenotype_id !== '';

    return html`
      <form @submit=${this._submit}>
        <h3>${this._t('introduction_title')}</h3>
        <p class="supporting">${this._t('introduction_explainer')}</p>

        <fieldset>
          <legend>${this._t('introduction_phenotype')}</legend>
          ${chosen
            ? html`<p class="chosen">${this._draft.phenotype_name}</p>`
            : html`<p class="supporting">${this._t('introduction_phenotype_none')}</p>`}
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
                @input=${(e: Event) => this._setInterval('multiplication', e)}
              />
            </label>
            <label>
              ${this._t('line_interval_rooting')}
              <input
                type="number"
                min="1"
                step="1"
                .value=${String(this._draft.replate_interval_days.rooting)}
                @input=${(e: Event) => this._setInterval('rooting', e)}
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
                @change=${(e: Event) =>
                  this._set('stage', (e.target as HTMLSelectElement).value as CultureStage)}
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
                @input=${(e: Event) => this._set('location', (e.target as HTMLInputElement).value)}
              />
            </label>
          </div>
        </fieldset>

        ${this.error ? html`<p class="error" role="alert">${this.error}</p>` : nothing}

        <div class="buttons">
          <button type="button" @click=${this._cancel}>${this._t('medium_cancel')}</button>
          <button type="submit" ?disabled=${this.saving || !chosen}>
            ${this._t(this.saving ? 'introduction_saving' : 'introduction_save')}
          </button>
        </div>
      </form>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'growspace-tc-introduction-form': GrowspaceTcIntroductionForm;
  }
}
