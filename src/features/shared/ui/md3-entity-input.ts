import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { dialogStyles } from '../../../styles/dialog.styles';
import type { HomeAssistant } from 'custom-card-helpers';

@customElement('md3-entity-input')
export class Md3EntityInput extends LitElement {
  @property() label = '';
  @property() value = '';
  @property({ type: Array }) domains: string[] = [];
  @property({ attribute: false }) hass: HomeAssistant | undefined;

  private _listId = `entity-list-${Math.random().toString(36).substr(2, 9)}`;

  static styles = [
    dialogStyles,
    css`
      :host {
        display: block;
        width: 100%;
      }
    `,
  ];

  private _getEntities(): string[] {
    if (!this.hass) return [];
    return Object.keys(this.hass.states || {})
      .filter((eid) => {
        if (this.domains.length === 0) return true;
        return this.domains.includes(eid.split('.')[0]);
      })
      .sort();
  }

  private _handleChange(e: Event) {
    const val = (e.target as HTMLInputElement).value;
    this.value = val;
    this.dispatchEvent(
      new CustomEvent('change', { detail: val || null, bubbles: true, composed: true })
    );
  }

  render() {
    const entities = this._getEntities();
    return html`
      <div class="md3-input-group">
        <label class="md3-label">${this.label}</label>
        <input
          class="md3-input"
          list="${this._listId}"
          .value=${this.value}
          placeholder="Search entity..."
          @change=${this._handleChange}
        />
        <datalist id="${this._listId}">
          ${entities.map((eid) => html`<option value="${eid}"></option>`)}
        </datalist>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'md3-entity-input': Md3EntityInput;
  }
}
