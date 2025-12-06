import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { dialogStyles } from '../../styles/dialog.styles';

@customElement('md3-text-input')
export class Md3TextInput extends LitElement {
  @property() label = '';
  @property() value = '';
  @property() type = 'text';
  @property() placeholder = '';
  @property() list = '';

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
    this.value = value;
    this.dispatchEvent(new CustomEvent('change', { detail: value, bubbles: true, composed: true }));
  }

  render() {
    return html`
      <div class="md3-input-group">
        <label class="md3-label">${this.label}</label>
        <input
          .type=${this.type}
          class="md3-input"
          .value=${this.value}
          .placeholder=${this.placeholder}
          .list=${this.list}
          @input=${this._handleInput}
        />
      </div>
    `;
  }
}
