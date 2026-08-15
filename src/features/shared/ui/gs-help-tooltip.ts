import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { mdiInformationOutline } from '@mdi/js';
import { reducedMotion } from '../../../styles/reduced-motion.styles';

// CSS Anchor Positioning is scoped to the shadow tree, but the popover API
// promotes the popover element to the document top layer (outside all shadow
// roots), so `position-anchor` silently breaks. We use a JS fallback instead.

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
      margin: 0;
      border: none;
      padding: 0;
      background: transparent;
      translate: -50% 0;
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
      font-size: var(--font-size-supporting);
      line-height: 1.5;
      color: var(--primary-text-color, rgba(255, 255, 255, 0.9));
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
      animation: tooltip-fade-in 0.15s ease-out;
      white-space: normal;
    }

    @keyframes tooltip-fade-in {
      from {
        opacity: 0;
        transform: translateY(-4px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    ${reducedMotion}
  `;

  private _popoverId = `gs-help-${Math.random().toString(36).slice(2)}`;

  private _positionPopover = (e: Event) => {
    const te = e as ToggleEvent;
    const popover = this.shadowRoot!.querySelector<HTMLElement>('.help-popover');
    const btn = this.shadowRoot!.querySelector<HTMLButtonElement>('.help-trigger');
    if (!popover || !btn) return;

    if (te.newState === 'open') {
      const rect = btn.getBoundingClientRect();
      switch (this.placement) {
        case 'bottom':
          popover.style.top = `${rect.bottom + 6}px`;
          popover.style.left = `${rect.left + rect.width / 2}px`;
          break;
        case 'left':
          popover.style.top = `${rect.top + rect.height / 2}px`;
          popover.style.left = `${rect.left - popover.offsetWidth - 6}px`;
          break;
        case 'right':
          popover.style.top = `${rect.top + rect.height / 2}px`;
          popover.style.left = `${rect.right + 6}px`;
          break;
        default: // top
          popover.style.top = `${rect.top - popover.offsetHeight - 6}px`;
          popover.style.left = `${rect.left + rect.width / 2}px`;
      }
    } else {
      popover.style.top = '';
      popover.style.left = '';
    }
  };

  override firstUpdated() {
    this.shadowRoot!.querySelector('.help-popover')?.addEventListener(
      'toggle',
      this._positionPopover
    );
  }

  render() {
    if (!this.content) return nothing;

    return html`
      <button
        class="help-trigger"
        popovertarget="${this._popoverId}"
        aria-label="Help: ${this.label}"
        title="${this.label}"
      >
        <svg viewBox="0 0 24 24"><path d="${mdiInformationOutline}"></path></svg>
      </button>
      <div id="${this._popoverId}" class="help-popover" popover="auto">
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
