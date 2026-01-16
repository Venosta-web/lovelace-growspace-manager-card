import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('md3-switch')
export class Md3Switch extends LitElement {
  @property({ type: Boolean, reflect: true }) checked = false;
  @property({ type: Boolean }) disabled = false;

  static styles = css`
    :host {
      display: inline-block;
      vertical-align: middle;
      --md-switch-width: 52px;
      --md-switch-height: 32px;
      --md-switch-handle-size: 24px;
      --md-switch-track-color-on: var(--primary-color, #2196f3);
      --md-switch-track-color-off: rgba(255, 255, 255, 0.1);
      --md-switch-handle-color: #fff;
    }

    button {
      all: unset;
      position: relative;
      width: var(--md-switch-width);
      height: var(--md-switch-height);
      border-radius: calc(var(--md-switch-height) / 2);
      background: var(--md-switch-track-color-off);
      cursor: pointer;
      transition: background-color 0.2s;
      border: 1px solid rgba(255, 255, 255, 0.2);
      box-sizing: border-box;
    }

    :host([checked]) button {
      background: var(--md-switch-track-color-on);
      border-color: transparent;
    }

    .handle {
      position: absolute;
      top: 50%;
      left: 4px;
      transform: translateY(-50%);
      width: var(--md-switch-handle-size);
      height: var(--md-switch-handle-size);
      background: var(--md-switch-handle-color);
      border-radius: 50%;
      transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
    }

    :host([checked]) .handle {
      transform: translate(20px, -50%); /* 52 - 4 - 24 - 4 = 20px move */
    }
  `;

  private _handleClick() {
    if (this.disabled) return;
    this.checked = !this.checked;
    this.dispatchEvent(
      new CustomEvent('change', {
        detail: { checked: this.checked },
        bubbles: true,
        composed: true,
      })
    );
  }

  render() {
    return html`
      <button
        role="switch"
        aria-checked=${this.checked}
        @click=${this._handleClick}
        ?disabled=${this.disabled}
      >
        <div class="handle"></div>
      </button>
    `;
  }
}
