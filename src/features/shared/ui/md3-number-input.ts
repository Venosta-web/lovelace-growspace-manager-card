import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { dialogStyles } from '../../../styles/dialog.styles';
import './gs-help-tooltip';
import type { HelpCopy } from './gs-help-tooltip';

@customElement('md3-number-input')
export class Md3NumberInput extends LitElement {
  @property() label = '';
  @property() value: number | string = 0;
  @property({ type: Number }) min = 0;
  @property({ type: Number }) max: number | undefined;
  @property() step = '1';
  @property() placeholder = '';
  @property({ attribute: 'input-aria-label' }) inputAriaLabel = '';
  @property() error = '';
  @property({ type: Boolean, reflect: true }) disabled = false;
  /**
   * Optional explanation for this field, rendered as a help trigger in the
   * field's top-right corner. Taken as a `{ label, content }` pair so the
   * accessible label cannot drift from the copy it describes.
   */
  @property({ attribute: false }) help?: HelpCopy;

  private static _nextInputId = 0;
  private readonly _inputId = `md3-number-input-${Md3NumberInput._nextInputId++}`;
  private readonly _errorId = `${this._inputId}-error`;

  static styles = [
    dialogStyles,
    css`
      :host {
        display: block;
        width: 100%;
      }
      .md3-input-group.has-error .md3-label,
      .md3-error {
        color: var(--error-color, #f44336);
      }
      .md3-input-group.has-error .md3-input {
        border-bottom-color: var(--error-color, #f44336);
      }
      /* The trigger has to sit beside the label text it explains. Anchoring it
         to the field's top-right corner looked right in isolation, but these
         fields render ~700px wide inside a dialog, which left the icon most of
         a field-width away from its label and reading as unattached.

         So label and trigger share one absolutely-positioned row, occupying the
         slot .md3-label held on its own. The row inherits the label's
         pointer-events:none; only the trigger takes interactivity back.

         This layout applies ONLY when help is set — a field without help
         renders exactly the markup it always did. .md3-label is shared by
         every dialog's inputs, so the no-help path stays byte-identical rather
         than re-positioning a label thousands of call sites depend on. */
      .md3-label-row {
        position: absolute;
        top: 8px;
        left: 16px;
        right: 16px;
        display: flex;
        align-items: center;
        gap: 6px;
        pointer-events: none;
        z-index: 1;
      }
      /* Two classes, so this beats the shared single-class .md3-label rule
         regardless of stylesheet order. */
      .md3-label-row .md3-label {
        position: static;
        left: auto;
        top: auto;
      }
      .md3-label-row .md3-help {
        pointer-events: auto;
      }
      .md3-error {
        margin-top: 4px;
        font-size: 0.75rem;
        line-height: 1.4;
        overflow-wrap: anywhere;
      }
      :host([disabled]) {
        opacity: 0.55;
      }
      .md3-input:disabled {
        cursor: not-allowed;
      }
    `,
  ];

  @property() unit = '';

  private _handleInput(e: Event) {
    const value = (e.target as HTMLInputElement).value;
    this.value = value === '' ? '' : Number(value);
    this.dispatchEvent(new CustomEvent('change', { detail: value, bubbles: true, composed: true }));
  }

  render() {
    return html`
      <div class="md3-input-group ${this.error ? 'has-error' : ''}">
        ${this.help
          ? html`<div class="md3-label-row">
              <label class="md3-label" for=${this._inputId}>${this.label}</label>
              <gs-help-tooltip
                class="md3-help"
                .content=${this.help.content}
                label=${this.help.label}
              ></gs-help-tooltip>
            </div>`
          : html`<label class="md3-label" for=${this._inputId}>${this.label}</label>`}
        <div style="display: flex; align-items: center;">
          <input
            type="number"
            id=${this._inputId}
            class="md3-input"
            aria-label=${this.inputAriaLabel || nothing}
            aria-invalid=${this.error ? 'true' : nothing}
            aria-describedby=${this.error ? this._errorId : nothing}
            ?disabled=${this.disabled}
            .min=${this.min}
            .max=${this.max}
            .step=${this.step}
            .value=${this.value}
            .placeholder=${this.placeholder}
            @input=${this._handleInput}
            style="${this.unit ? 'padding-bottom: 16px;' : ''}"
          />
          ${this.unit
            ? html`<span
                style="
                      position: absolute;
                      inset-inline-end: 12px;
                      pointer-events: none;
                      color: var(--secondary-text-color, rgba(255,255,255,0.5));
                      font-size: 0.9em;
                    "
                >${this.unit}</span
              >`
            : nothing}
        </div>
        ${this.error
          ? html`<div id=${this._errorId} class="md3-error">${this.error}</div>`
          : nothing}
      </div>
    `;
  }
}
