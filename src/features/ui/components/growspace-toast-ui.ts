import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';

export type ToastNotification = {
  message: string;
  type: 'success' | 'error' | 'info';
  action?: { label: string; callback: () => void };
} | null;

@customElement('growspace-toast-ui')
export class GrowspaceToastUI extends LitElement {
  @property({ attribute: false }) notification: ToastNotification = null;

  static styles = css`
    :host {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 1000;
      pointer-events: none;
    }

    .toast-notification {
      background: var(--ha-card-background, var(--card-background-color, white));
      color: var(--primary-text-color);
      padding: 8px 16px 8px 24px;
      border-radius: 24px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      font-size: 14px;
      font-weight: 500;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      opacity: 0;
      transform: translateY(20px);
      transition:
        opacity 0.3s ease,
        transform 0.3s ease;
      pointer-events: auto;
      border: 1px solid var(--divider-color, #eee);
    }

    .toast-notification.visible {
      opacity: 1;
      transform: translateY(0);
    }

    .toast-notification.success {
      border-left: 4px solid var(--success-color, #4caf50);
    }

    .toast-notification.error {
      border-left: 4px solid var(--error-color, #f44336);
    }

    .toast-notification.info {
      border-left: 4px solid var(--primary-color, #03a9f4);
    }

    .toast-message {
      flex: 1;
    }

    .toast-action {
      background: none;
      border: none;
      color: var(--primary-color);
      font-weight: 600;
      text-transform: uppercase;
      cursor: pointer;
      padding: 8px 12px;
      border-radius: 4px;
      transition: background 0.2s ease;
      font-size: 12px;
      letter-spacing: 0.5px;
    }

    .toast-action:hover {
      background: rgba(var(--rgb-primary-color), 0.1);
    }
  `;

  render() {
    const isVisible = !!this.notification;
    return html`
      <div
        class=${classMap({
          'toast-notification': true,
          visible: isVisible,
          [this.notification?.type || 'info']: true,
        })}
      >
        <span class="toast-message">${this.notification?.message || ''}</span>
        ${this.notification?.action
          ? html`
              <button
                class="toast-action"
                @click=${this._handleActionClick}
              >
                ${this.notification.action.label}
              </button>
            `
          : ''}
      </div>
    `;
  }

  private _handleActionClick() {
    this.dispatchEvent(new CustomEvent('toast-action-clicked', { bubbles: true, composed: true }));
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'growspace-toast-ui': GrowspaceToastUI;
  }
}
