import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { dialogStyles } from '../../styles/dialog.styles';

@customElement('md3-text-input')
export class Md3TextInput extends LitElement {
  @property() label = '';
  @property() value = '';
  @property() type = 'text';
  @property() placeholder = '';
  @property({ type: Array }) suggestions: string[] = [];
  @property() list = '';

  private _listId = `datalist-${Math.random().toString(36).substr(2, 9)}`;

  static styles = [
    dialogStyles,
    css`
      :host {
        display: block;
        width: 100%;
      }
    `,
  ];

  private _handleInput(e: Event) {
    const value = (e.target as HTMLInputElement).value;
    this.value = value;
    this.dispatchEvent(new CustomEvent('change', { detail: value, bubbles: true, composed: true }));
  }

  render() {
    const listId = this.suggestions.length > 0 ? this._listId : this.list;

    return html`
      <div class="md3-input-group">
        <label class="md3-label">${this.label}</label>
        <input
          .type=${this.type}
          class="md3-input"
          .value=${this.value}
          .placeholder=${this.placeholder}
          list=${listId || nothing}
          @input=${this._handleInput}
        />
        ${this.suggestions.length > 0
          ? html`
              <datalist id=${this._listId}>
                ${this.suggestions.map((s) => html`<option value=${s}></option>`)}
              </datalist>
            `
          : nothing}
      </div>
    `;
  }
}
