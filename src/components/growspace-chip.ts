import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { mdiLink } from '@mdi/js';
import { sharedStyles } from '../styles/shared.styles';

@customElement('growspace-chip')
export class GrowspaceChip extends LitElement {
  @property({ type: String }) icon = '';
  @property({ type: String }) label = '';
  @property({ type: String }) value: string | number | undefined = undefined;
  @property({ type: Array }) multiValues: string[] | undefined = undefined;
  @property({ type: String }) status: 'optimal' | 'warning' | 'danger' | '' = '';
  @property({ type: Boolean, reflect: true }) active = false;
  @property({ type: Boolean }) linked = false;
  @property({ type: String }) tooltip = '';

  static styles = [
    sharedStyles,
    css`
      :host {
        display: inline-flex;
        vertical-align: middle;
        outline: none;
        -webkit-tap-highlight-color: transparent;
      }

      .stat-chip {
        display: flex;
        align-items: center;
        gap: 8px;
        background: var(--glass-bg);
        border: var(--glass-border);
        border-radius: 12px;
        padding: 8px 16px;
        font-size: 0.875rem;
        font-weight: 500;
        color: var(--primary-text-color, rgba(255, 255, 255, 0.9));
        backdrop-filter: var(--glass-blur);
        cursor: pointer;
        transition: all 0.2s ease;
        position: relative;
        user-select: none;
        flex-shrink: 0;
        white-space: nowrap;
        touch-action: auto;
      }

      /* Status Colors */
      @keyframes pulse-red {
        0% {
          box-shadow: 0 0 0 0 rgba(244, 67, 54, 0.7);
        }
        70% {
          box-shadow: 0 0 0 10px rgba(244, 67, 54, 0);
        }
        100% {
          box-shadow: 0 0 0 0 rgba(244, 67, 54, 0);
        }
      }

      .stat-chip.status-optimal {
        color: #2e7d32 !important;
        background: rgba(46, 125, 50, 0.1) !important;
      }

      .stat-chip.status-warning {
        color: #ffa726 !important;
        border-color: rgba(255, 167, 38, 0.5) !important;
        background: rgba(255, 167, 38, 0.1) !important;
      }

      .stat-chip.status-danger {
        color: #ef5350 !important;
        border-color: rgba(239, 83, 80, 0.5) !important;
        background: rgba(239, 83, 80, 0.1) !important;
        animation: pulse-red 2s infinite;
      }

      .stat-chip:hover {
        background: var(--secondary-background-color, rgba(255, 255, 255, 0.1));
        border-color: var(--divider-color, rgba(255, 255, 255, 0.2));
        transform: translateY(-1px);
      }

      :host([active]) .stat-chip {
        background: color-mix(
          in srgb,
          var(--primary-color, #03a9f4) 15%,
          var(--glass-bg, rgba(255, 255, 255, 0.05))
        );
        border-color: var(--primary-color, #03a9f4);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        color: var(--primary-text-color, #fff);
      }

      .icon {
        width: 18px;
        height: 18px;
        display: flex;
      }

      .icon svg {
        width: 100%;
        height: 100%;
        fill: currentColor;
        opacity: 0.8;
        pointer-events: none;
      }

      .link-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 16px;
        height: 16px;
        margin-left: -8px;
        margin-right: -8px;
        opacity: 0.8;
        cursor: pointer;
      }

      .link-icon svg {
        width: 100%;
        height: 100%;
        fill: var(--primary-color, #03a9f4);
      }
    `,
  ];

  render() {
    // Determine classes based on meaningful status string
    const statusClass = this.status ? `status-${this.status}` : '';

    return html`
      <div class="stat-chip ${statusClass}" title="${this.tooltip}">
        <div class="icon">
          <svg viewBox="0 0 24 24"><path d="${this.icon}"></path></svg>
        </div>
        ${this.label ? html`${this.label}: ` : ''}${this.multiValues && this.multiValues.length > 0
        ? html`<div style="display: flex; align-items: center; gap: 8px;">
              ${this.multiValues.map(
          (val, idx) =>
            html`${idx > 0
              ? html`<div
                          style="width: 1px; height: 12px; background: rgba(255,255,255,0.2);"
                        ></div>`
              : ''}<span>${val}</span>`
        )}
            </div>`
        : this.value}
        ${this.linked
        ? html`
              <div class="link-icon" @click=${this._handleLinkClick} title="Unlink Graph">
                <svg viewBox="0 0 24 24"><path d="${mdiLink}"></path></svg>
              </div>
            `
        : ''}
      </div>
    `;
  }

  private _handleLinkClick(e: Event) {
    e.stopPropagation();
    this.dispatchEvent(new CustomEvent('unlink', { bubbles: true, composed: true }));
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'growspace-chip': GrowspaceChip;
  }
}
