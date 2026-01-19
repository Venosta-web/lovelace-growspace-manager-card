import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { mdiDelete, mdiClose } from '@mdi/js';

/**
 * Reusable confirmation dialog for delete operations
 * Used by plant-timeline and potentially other components
 */
@customElement('confirm-delete-dialog')
export class ConfirmDeleteDialog extends LitElement {
  @property({ type: Boolean }) open = false;
  @property({ type: String }) title = 'Confirm Deletion';
  @property({ type: String }) message =
    'Are you sure you want to delete this entry? This action cannot be undone.';

  static styles = css`
    :host {
      display: none;
    }

    :host([open]) {
      display: block;
    }

    .overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.8);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .dialog {
      width: 90%;
      max-width: 420px;
      padding: 24px;
      background: var(--card-background-color, #1c1c1c);
      border-radius: 16px;
      border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
      box-shadow: var(--ha-card-box-shadow, 0 4px 24px rgba(0, 0, 0, 0.4));
    }

    h2 {
      margin: 0 0 12px 0;
      font-size: 1.25rem;
      color: var(--primary-text-color);
    }

    p {
      margin: 0 0 24px 0;
      color: var(--secondary-text-color);
      font-size: 0.95rem;
      line-height: 1.5;
    }

    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }

    button {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 10px 20px;
      border-radius: 8px;
      font-size: 0.95rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      border: none;
    }

    .cancel-btn {
      background: rgba(255, 255, 255, 0.1);
      color: var(--primary-text-color);
    }

    .cancel-btn:hover {
      background: rgba(255, 255, 255, 0.15);
    }

    .delete-btn {
      background: var(--error-color, #f44336);
      color: white;
    }

    .delete-btn:hover {
      background: var(--error-color-dark, #d32f2f);
      box-shadow: 0 2px 8px rgba(244, 67, 54, 0.4);
    }

    svg {
      width: 18px;
      height: 18px;
      fill: currentColor;
    }
  `;

  private _handleCancel(e: Event) {
    e.stopPropagation();
    this.open = false;
    this.dispatchEvent(new CustomEvent('cancel'));
  }

  private _handleConfirm(e: Event) {
    e.stopPropagation();
    this.open = false;
    this.dispatchEvent(new CustomEvent('confirm'));
  }

  private _handleOverlayClick(e: Event) {
    if (e.target === e.currentTarget) {
      this._handleCancel(e);
    }
  }

  render() {
    if (!this.open) return null;

    return html`
      <div class="overlay" @click=${this._handleOverlayClick}>
        <div class="dialog" @click=${(e: Event) => e.stopPropagation()}>
          <h2>${this.title}</h2>
          <p>${this.message}</p>
          <div class="actions">
            <button class="cancel-btn" @click=${this._handleCancel}>
              <svg viewBox="0 0 24 24">
                <path d="${mdiClose}" />
              </svg>
              Cancel
            </button>
            <button class="delete-btn" @click=${this._handleConfirm}>
              <svg viewBox="0 0 24 24">
                <path d="${mdiDelete}" />
              </svg>
              Delete
            </button>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'confirm-delete-dialog': ConfirmDeleteDialog;
  }
}
