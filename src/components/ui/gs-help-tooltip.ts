import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { mdiInformationOutline } from '@mdi/js';

@customElement('gs-help-tooltip')
export class GsHelpTooltip extends LitElement {
  @property({ type: String }) content = '';
  @property({ type: String, reflect: true }) placement: 'top' | 'bottom' | 'left' | 'right' = 'top';
  @property({ type: String }) label = 'Help';

  static styles = css`
    :host {
      display: inline-flex;
      align-items: center;
      vertical-align: middle;
    }

    .help-trigger {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      background: none;
      border: none;
      padding: 0;
      cursor: pointer;
      color: var(--secondary-text-color, rgba(255, 255, 255, 0.5));
      border-radius: 50%;
      transition: color 0.2s;
      flex-shrink: 0;
    }

    .help-trigger:hover,
    .help-trigger:focus-visible {
      color: var(--primary-color, #2196f3);
      outline: none;
    }

    .help-trigger svg {
      width: 16px;
      height: 16px;
      fill: currentColor;
      pointer-events: none;
    }

    .help-popover {
      position: fixed;
      inset: auto;
      position-try-fallbacks: flip-block, flip-inline;
      margin: 0;
      border: none;
      padding: 0;
      background: transparent;
    }

    .help-popover[popover]:popover-open {
      display: block;
    }

    .help-popover-inner {
      background: var(--card-background-color, #2a2a2a);
      border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.15));
      border-radius: 8px;
      padding: 8px 12px;
      max-width: 240px;
      font-size: 0.8rem;
      line-height: 1.5;
      color: var(--primary-text-color, rgba(255, 255, 255, 0.9));
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
      animation: tooltip-fade-in 0.15s ease-out;
      white-space: normal;
    }

    @keyframes tooltip-fade-in {
      from { opacity: 0; transform: translateY(-4px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    :host([placement='top']) .help-popover {
      bottom: anchor(top);
      left: anchor(center);
      translate: -50% -6px;
    }

    :host([placement='bottom']) .help-popover {
      top: anchor(bottom);
      left: anchor(center);
      translate: -50% 6px;
    }

    :host([placement='left']) .help-popover {
      right: anchor(left);
      top: anchor(center);
      translate: -6px -50%;
    }

    :host([placement='right']) .help-popover {
      left: anchor(right);
      top: anchor(center);
      translate: 6px -50%;
    }
  `;

  private _popoverId = `gs-help-${Math.random().toString(36).slice(2)}`;

  render() {
    if (!this.content) return nothing;

    return html`
      <button
        class="help-trigger"
        style="anchor-name: --${this._popoverId};"
        popovertarget="${this._popoverId}"
        aria-label="Help: ${this.label}"
        title="${this.label}"
      >
        <svg viewBox="0 0 24 24"><path d="${mdiInformationOutline}"></path></svg>
      </button>
      <div
        id="${this._popoverId}"
        class="help-popover"
        popover="auto"
        style="position-anchor: --${this._popoverId};"
      >
        <div class="help-popover-inner">${this.content}</div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'gs-help-tooltip': GsHelpTooltip;
  }
}
