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

import { LitElement, html, css, nothing, type CSSResultGroup, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { localize } from '../../../localize/localize';
import { sharedStyles } from '../../../styles/shared.styles';
import { variables } from '../../../styles/variables';
import {
  draftFromMedium,
  type CultureMedium,
  type CultureMediumDraft,
  type MediumComponent,
} from '../../../slices/tc';

type ComponentField = 'additives' | 'hormones';

@customElement('growspace-tc-medium-form')
export class GrowspaceTcMediumForm extends LitElement {
  /** The medium being edited, or undefined when creating one. */
  @property({ attribute: false }) medium?: CultureMedium;
  @property({ type: Boolean }) saving = false;
  /** A backend rejection, already localized by the backend. */
  @property({ type: String }) error = '';
  @property({ type: String }) language = 'en';

  @state() private _draft: CultureMediumDraft = draftFromMedium();

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

  protected willUpdate(changed: Map<string | number | symbol, unknown>): void {
    // Re-seed only when the element is pointed at a different medium: a
    // re-render while the grower is typing must not throw the draft away.
    if (changed.has('medium')) this._draft = draftFromMedium(this.medium);
  }

  private _t(key: string): string {
    return localize(`tc.${key}`, '', '', this.language);
  }

  private _set<K extends keyof CultureMediumDraft>(key: K, value: CultureMediumDraft[K]): void {
    this._draft = { ...this._draft, [key]: value };
  }

  private _setText(key: 'name' | 'base_salts' | 'notes', event: Event): void {
    this._set(key, (event.target as HTMLInputElement).value);
  }

  private _setNumber(key: 'agar_g_per_l' | 'sugar_g_per_l' | 'ph_target', event: Event): void {
    // An empty or half-typed field becomes NaN rather than 0: the backend
    // rejects it with a sentence naming the field, which is a better answer
    // than silently recording a medium with no sugar in it.
    this._set(key, Number((event.target as HTMLInputElement).value));
  }

  private _setComponent(
    field: ComponentField,
    index: number,
    key: keyof MediumComponent,
    event: Event
  ): void {
    const raw = (event.target as HTMLInputElement).value;
    const entries = this._draft[field].map((entry, position) =>
      position === index ? { ...entry, [key]: key === 'amount' ? Number(raw) : raw } : entry
    );
    this._set(field, entries);
  }

  private _addComponent(field: ComponentField): void {
    this._set(field, [...this._draft[field], { name: '', amount: 0, unit: 'mg/L' }]);
  }

  private _removeComponent(field: ComponentField, index: number): void {
    this._set(
      field,
      this._draft[field].filter((_, position) => position !== index)
    );
  }

  /** Whether saving this draft would fork a Medium Version. */
  private get _forks(): boolean {
    if (!this.medium) return false;
    const { name: _draftName, ...formulation } = this._draft;
    const current = this.medium.versions.find(
      (version) => version.version === this.medium?.current_version
    );
    if (!current) return true;
    const { version: _version, created_at: _createdAt, ...pinned } = current;
    return JSON.stringify(formulation) !== JSON.stringify(pinned);
  }

  private _submit(event: Event): void {
    event.preventDefault();
    this.dispatchEvent(
      new CustomEvent('medium-save-requested', {
        detail: { id: this.medium?.id, draft: this._draft },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _cancel(): void {
    this.dispatchEvent(
      new CustomEvent('medium-cancel-requested', { bubbles: true, composed: true })
    );
  }

  private _renderComponents(field: ComponentField, legend: string): TemplateResult {
    return html`
      <fieldset>
        <legend>${legend}</legend>
        ${this._draft[field].map(
          (entry, index) => html`
            <div class="component-row">
              <label>
                ${this._t('medium_component_name')}
                <input
                  .value=${entry.name}
                  @input=${(event: Event) => this._setComponent(field, index, 'name', event)}
                />
              </label>
              <label>
                ${this._t('medium_component_amount')}
                <input
                  type="number"
                  step="any"
                  .value=${String(entry.amount)}
                  @input=${(event: Event) => this._setComponent(field, index, 'amount', event)}
                />
              </label>
              <label>
                ${this._t('medium_component_unit')}
                <input
                  .value=${entry.unit}
                  @input=${(event: Event) => this._setComponent(field, index, 'unit', event)}
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
          `
        )}
        <button type="button" @click=${() => this._addComponent(field)}>
          ${this._t('medium_component_add')}
        </button>
      </fieldset>
    `;
  }

  protected render(): TemplateResult {
    return html`
      <form @submit=${this._submit}>
        <h3>${this._t(this.medium ? 'medium_form_edit_title' : 'medium_form_new_title')}</h3>

        <label>
          ${this._t('medium_name')}
          <input .value=${this._draft.name} @input=${(e: Event) => this._setText('name', e)} />
        </label>

        <label>
          ${this._t('medium_base_salts')}
          <input
            .value=${this._draft.base_salts}
            @input=${(e: Event) => this._setText('base_salts', e)}
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
              @input=${(e: Event) => this._setNumber('agar_g_per_l', e)}
            />
          </label>
          <label>
            ${this._t('medium_sugar')}
            <input
              type="number"
              step="any"
              .value=${String(this._draft.sugar_g_per_l)}
              @input=${(e: Event) => this._setNumber('sugar_g_per_l', e)}
            />
          </label>
          <label>
            ${this._t('medium_ph')}
            <input
              type="number"
              step="any"
              .value=${String(this._draft.ph_target)}
              @input=${(e: Event) => this._setNumber('ph_target', e)}
            />
          </label>
        </div>

        <label>
          ${this._t('medium_notes')}
          <textarea
            .value=${this._draft.notes}
            @input=${(e: Event) => this._setText('notes', e)}
          ></textarea>
        </label>

        ${this.medium
          ? html`<p class="supporting">
              ${this._t(this._forks ? 'medium_will_fork' : 'medium_will_not_fork')}
            </p>`
          : nothing}
        ${this.error ? html`<p class="error" role="alert">${this.error}</p>` : nothing}

        <div class="buttons">
          <button type="button" @click=${this._cancel}>${this._t('medium_cancel')}</button>
          <button type="submit" ?disabled=${this.saving}>
            ${this._t(this.saving ? 'medium_saving' : 'medium_save')}
          </button>
        </div>
      </form>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'growspace-tc-medium-form': GrowspaceTcMediumForm;
  }
}
