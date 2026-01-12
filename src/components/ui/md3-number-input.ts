import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { dialogStyles } from '../../styles/dialog.styles';

@customElement('md3-number-input')
export class Md3NumberInput extends LitElement {
  @property() label = '';
  @property({ type: Number }) value = 0;
  @property({ type: Number }) min = 0;
  @property({ type: Number }) max: number | undefined;
  @property() placeholder = '';

  static styles = [
    dialogStyles,
    css`
      :host {
        display: block;
        width: 100%;
      }
    `,
  ];

  @property() unit = '';

  private _handleInput(e: Event) {
    const value = (e.target as HTMLInputElement).value;
    this.value = Number(value);
    this.dispatchEvent(new CustomEvent('change', { detail: value, bubbles: true, composed: true }));
  }

  render() {
    return html`
      <div class="md3-input-group">
        <label class="md3-label">${this.label}</label>
        <div style="display: flex; align-items: center;">
             <input
               type="number"
               class="md3-input"
               .min=${this.min}
               .max=${this.max}
               .value=${this.value}
               .placeholder=${this.placeholder}
               @input=${this._handleInput}
               style="${this.unit ? 'padding-bottom: 16px;' : ''}"
             />
             ${this.unit
        ? html`<span 
                    style="
                      position: absolute;
                      right: 12px;
                      pointer-events: none;
                      color: var(--secondary-text-color, rgba(255,255,255,0.5));
                      font-size: 0.9em;
                    "
                  >${this.unit}</span>`
        : nothing
      }
        </div>
      </div>
    `;
  }
}
