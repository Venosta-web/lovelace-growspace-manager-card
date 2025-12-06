import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { dialogStyles } from '../../styles/dialog.styles';

export type SelectOption = string | { label: string; value: string };

@customElement('md3-select')
export class Md3Select extends LitElement {
  @property() label = '';
  @property() value = '';
  @property({ type: Array }) options: SelectOption[] = [];

  static styles = [
    dialogStyles,
    css`
      :host {
        display: block;
        width: 100%;
      }
    `
  ];

  private _handleChange(e: Event) {
    const value = (e.target as HTMLSelectElement).value;
    this.value = value;
    this.dispatchEvent(new CustomEvent('change', { detail: value, bubbles: true, composed: true }));
  }

  render() {
    return html`
      <div class="md3-input-group">
        <label class="md3-label">${this.label}</label>
        <select
          class="md3-input"
          .value=${this.value}
          @change=${this._handleChange}
        >
          <option value="">Select...</option>
          ${this.options.map(opt => {
      const label = typeof opt === 'string' ? opt : opt.label;
      const val = typeof opt === 'string' ? opt : opt.value;
      return html`<option value="${val}" ?selected=${val === this.value}>${label}</option>`;
    })}
        </select>
      </div>
    `;
  }
}
