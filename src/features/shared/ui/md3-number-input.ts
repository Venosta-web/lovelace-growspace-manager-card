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
      /* The floating .md3-label is pointer-events:none and occupies the
         field's top-left, so the trigger takes the top-right corner and
         restores its own interactivity. It sits above the input's own top
         padding, clear of the vertically-centred unit span. */
      .md3-help {
        position: absolute;
        top: 4px;
        inset-inline-end: 6px;
        z-index: 1;
        pointer-events: auto;
      }
      .md3-error {
        margin-top: 4px;
        font-size: 0.75rem;
        line-height: 1.4;
        overflow-wrap: anywhere;
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
        <label class="md3-label" for=${this._inputId}>${this.label}</label>
        ${this.help
          ? html`<gs-help-tooltip
              class="md3-help"
              .content=${this.help.content}
              label=${this.help.label}
            ></gs-help-tooltip>`
          : nothing}
        <div style="display: flex; align-items: center;">
          <input
            type="number"
            id=${this._inputId}
            class="md3-input"
            aria-label=${this.inputAriaLabel || nothing}
            aria-invalid=${this.error ? 'true' : nothing}
            aria-describedby=${this.error ? this._errorId : nothing}
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
