import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { dialogStyles } from '../../styles/dialog.styles';
import { PlantUtils } from '../../utils';

@customElement('md3-date-input')
export class Md3DateInput extends LitElement {
    @property() label = '';
    @property() value = '';
    @property({ type: Boolean }) time = false; // if true, uses datetime-local

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
        let formattedValue = this.value;
        if (this.time) {
            formattedValue = PlantUtils.toDateTimeLocal(this.value);
        } else {
            formattedValue = this.value ? this.value.split('T')[0] : '';
        }

        return html`
      <div class="md3-input-group">
        <label class="md3-label">${this.label}</label>
        <input
          .type=${this.time ? 'datetime-local' : 'date'}
          class="md3-input"
          .value=${formattedValue}
          @input=${this._handleInput}
          @click=${(e: Event) => (e.target as HTMLInputElement).showPicker()}
        />
      </div>
    `;
    }
}
