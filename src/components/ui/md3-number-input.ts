import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { dialogStyles } from '../../styles/dialog.styles';

@customElement('md3-number-input')
export class Md3NumberInput extends LitElement {
  @property() label = '';
  @property({ type: Number }) value = 0;
  @property({ type: Number }) min = 0;
  @property({ type: Number }) max?: number;
  @property() placeholder = '';

  static styles = [
    dialogStyles,
    css`
      :host {
        display: block;
        width: 100%;
      }
    `
  ];

  private _handleInput(e: Event) {
    const value = (e.target as HTMLInputElement).value;
    this.value = Number(value);
    this.dispatchEvent(new CustomEvent('change', { detail: value, bubbles: true, composed: true }));
  }

  render() {
    return html`
      <div class="md3-input-group">
        <label class="md3-label">${this.label}</label>
        <input
          type="number"
          class="md3-input"
          .min=${this.min}
          .max=${this.max}
          .value=${this.value}
          .placeholder=${this.placeholder}
          @input=${this._handleInput}
        />
      </div>
    `;
  }
}
