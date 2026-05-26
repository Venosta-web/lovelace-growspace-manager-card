import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { mdiClose } from '@mdi/js';

/**
 * Shell component that owns the ha-dialog wrapper, glass container, and standard header.
 * Dialogs supply title/subtitle/icon as properties and place their body in the default slot.
 *
 * Dispatches a composed "close" event on close-button click or ha-dialog's native closed event.
 */
@customElement('gs-dialog')
export class GsDialog extends LitElement {
  @property({ type: Boolean, reflect: true }) open = false;
  @property({ type: String }) heading = '';
  @property({ type: String }) subtitle = '';
  @property({ type: String }) iconPath = '';
  @property({ type: String }) stageColor = '';
  @property({ type: Boolean }) submitting = false;
  @property({ type: String }) containerStyle = '';

  static styles = css`
    :host {
      display: contents;
    }

    ha-dialog {
      --dialog-surface-margin-top: 40px;
      --ha-dialog-min-height: 85vh;
      --dialog-content-padding: 0;
    }

    .glass-dialog-container {
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      width: 100%;
      min-width: 0;
      min-height: 0;
      max-height: 85vh;
      overflow: hidden;
      position: relative;
      color: var(--primary-text-color, #fff);
      font-family: 'Roboto', sans-serif;
    }

    .dialog-header {
      display: flex;
      align-items: center;
      padding: 16px 24px;
      border-bottom: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.2));
      flex-shrink: 0;
    }

    .dialog-icon {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.05);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 16px;
      flex-shrink: 0;
      color: var(--stage-color, #4caf50);
    }

    .dialog-icon ha-svg-icon {
      width: 24px;
      height: 24px;
    }

    .dialog-title-group {
      flex: 1;
      min-width: 0;
    }

    .dialog-title {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 500;
      color: var(--primary-text-color, #fff);
    }

    .dialog-subtitle {
      font-size: 0.85rem;
      opacity: 0.7;
      margin-top: 2px;
      color: var(--secondary-text-color);
    }

    .dialog-close-btn {
      min-width: auto;
      padding: 8px;
      background: transparent;
      border: none;
      cursor: pointer;
      color: var(--primary-text-color, #fff);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s;
      flex-shrink: 0;
    }

    .dialog-close-btn:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.08);
    }

    .dialog-close-btn:disabled {
      opacity: 0.4;
      cursor: default;
    }

    .dialog-close-btn ha-svg-icon {
      width: 24px;
      height: 24px;
    }

    @media (max-width: 450px) {
      .glass-dialog-container {
        width: 100vw;
        max-width: 100%;
        height: 100vh;
        border-radius: 0;
      }

      .dialog-header {
        padding: 12px 16px;
      }
    }
  `;

  private _dispatchClose(): void {
    this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
  }

  render() {
    if (!this.open) return nothing;

    const containerStyle = [
      this.stageColor ? `--stage-color: ${this.stageColor}` : '',
      this.containerStyle,
    ]
      .filter(Boolean)
      .join('; ');

    return html`
      <ha-dialog
        open
        hideActions
        without-header
        .scrimClickAction=${''}
        .escapeKeyAction=${'close'}
        width="large"
        @closed=${this._dispatchClose}
      >
        <div class="glass-dialog-container" style=${containerStyle}>
          <div class="dialog-header">
            ${this.iconPath
              ? html`<div class="dialog-icon">
                  <ha-svg-icon .path=${this.iconPath}></ha-svg-icon>
                </div>`
              : nothing}
            <div class="dialog-title-group">
              <h2 class="dialog-title">${this.heading}</h2>
              ${this.subtitle ? html`<div class="dialog-subtitle">${this.subtitle}</div>` : nothing}
            </div>
            <slot name="header-extra"></slot>
            <button
              class="dialog-close-btn"
              @click=${this._dispatchClose}
              ?disabled=${this.submitting}
              aria-label="Close"
            >
              <ha-svg-icon .path=${mdiClose}></ha-svg-icon>
            </button>
          </div>
          <slot></slot>
        </div>
      </ha-dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'gs-dialog': GsDialog;
  }
}
