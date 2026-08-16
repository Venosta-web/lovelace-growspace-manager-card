import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { HomeAssistant } from 'custom-card-helpers';
import './gm-entity-picker';

/**
 * Domain-filtered single entity field. Kept as its own element for the callers
 * that filter by domain rather than by a pre-built option list; the picking
 * itself is `gm-entity-picker` (ADR 0043).
 */
@customElement('md3-entity-input')
export class Md3EntityInput extends LitElement {
  @property() label = '';
  @property() value = '';
  @property({ type: Array }) domains: string[] = [];
  @property({ attribute: false }) hass: HomeAssistant | undefined;

  static styles = css`
    :host {
      display: block;
      width: 100%;
    }
  `;

  private _getEntities(): string[] {
    if (!this.hass) return [];
    return Object.keys(this.hass.states || {})
      .filter((eid) => this.domains.length === 0 || this.domains.includes(eid.split('.')[0]))
      .sort();
  }

  render() {
    return html`
      <gm-entity-picker
        .hass=${this.hass}
        .label=${this.label}
        .value=${this.value}
        .options=${this._getEntities()}
        @entity-picked=${this._handleChange}
      ></gm-entity-picker>
    `;
  }

  private _handleChange(event: CustomEvent<string>) {
    event.stopPropagation();
    this.value = event.detail;
    this.dispatchEvent(
      new CustomEvent('change', { detail: this.value || null, bubbles: true, composed: true })
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'md3-entity-input': Md3EntityInput;
  }
}
