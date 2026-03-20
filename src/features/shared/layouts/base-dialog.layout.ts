/**
 * Base Dialog Layout - Reusable dialog shell component
 *
 * Provides a consistent dialog structure with:
 * - Header with title and subtitle
 * - Optional tabs
 * - Content area (via slot)
 * - Actions area (via slot)
 * - Loading state
 */

import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { mdiClose } from '@mdi/js';
import { FocusTrapController } from '../controllers/focus-trap.controller.js';

export interface TabConfig {
  id: string;
  label: string;
  icon?: string;
}

/**
 * Base dialog layout component
 *
 * Usage:
 * ```html
 * <base-dialog-layout
 *   .open=${true}
 *   .title=${"My Dialog"}
 *   .subtitle=${"Optional subtitle"}
 *   .tabs=${[{ id: 'tab1', label: 'Tab 1' }]}
 *   .activeTab=${"tab1"}
 *   @tab-changed=${this._handleTabChange}
 *   @closed=${this._handleClose}
 * >
 *   <div>Dialog content goes here</div>
 *   <div slot="actions">
 *     <button>Save</button>
 *     <button>Cancel</button>
 *   </div>
 * </base-dialog-layout>
 * ```
 */
@customElement('base-dialog-layout')
export class BaseDialogLayout extends LitElement {
  @property({ type: Boolean, reflect: true }) open = false;
  @property() title = '';
  @property() subtitle?: string;
  @property({ type: Boolean }) loading = false;
  @property({ type: Array }) tabs?: TabConfig[];
  @property() activeTab?: string;
  @property({ type: Boolean }) hideCloseButton = false;

  private _focusTrap?: FocusTrapController;
  private _boundHandleKeydown!: (e: KeyboardEvent) => void;

  static styles = css`
    :host {
      display: contents;
    }

    .dialog-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 999;
      display: none;
      backdrop-filter: blur(4px);
    }

    :host([open]) .dialog-backdrop {
      display: block;
    }

    .dialog-container {
      position: fixed;
      inset: 0;
      z-index: 1000;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }

    :host([open]) .dialog-container {
      display: flex;
    }

    .dialog {
      background: var(--card-background-color, #1c1c1c);
      border-radius: var(--border-radius-lg, 16px);
      box-shadow: var(--elevation-8, 0 8px 32px rgba(0, 0, 0, 0.3));
      max-width: 600px;
      width: 100%;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    @media (max-width: 768px) {
      .dialog {
        max-width: 100%;
        max-height: 100vh;
        border-radius: 0;
      }
    }

    .dialog-header {
      padding: 24px 24px 16px;
      border-bottom: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
      display: flex;
      align-items: flex-start;
      gap: 16px;
    }

    .dialog-header-text {
      flex: 1;
      min-width: 0;
    }

    .dialog-title {
      font-size: 1.5rem;
      font-weight: 500;
      margin: 0;
      color: var(--primary-text-color, #fff);
    }

    .dialog-subtitle {
      font-size: 0.875rem;
      color: var(--secondary-text-color, rgba(255, 255, 255, 0.7));
      margin: 4px 0 0;
    }

    .dialog-close-button {
      background: transparent;
      border: none;
      color: var(--secondary-text-color, rgba(255, 255, 255, 0.7));
      cursor: pointer;
      padding: 8px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
    }

    .dialog-close-button:hover {
      background: rgba(255, 255, 255, 0.1);
      color: var(--primary-text-color, #fff);
    }

    .dialog-close-button:focus-visible {
      outline: 2px solid var(--primary-color, #4caf50);
      outline-offset: 2px;
    }

    .dialog-tabs {
      display: flex;
      gap: 4px;
      padding: 0 16px;
      background: var(--secondary-background-color, rgba(255, 255, 255, 0.05));
      border-bottom: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
    }

    .dialog-tab {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 12px 16px;
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      color: var(--secondary-text-color, rgba(255, 255, 255, 0.7));
      cursor: pointer;
      transition: all 0.2s ease;
      font-size: 0.875rem;
      font-family: inherit;
      white-space: nowrap;
    }

    .dialog-tab:hover {
      background: rgba(255, 255, 255, 0.05);
      color: var(--primary-text-color, #fff);
    }

    .dialog-tab.active {
      color: var(--primary-color, #4caf50);
      border-bottom-color: var(--primary-color, #4caf50);
    }

    .dialog-content {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
    }

    @media (max-width: 450px) {
      .dialog-content {
        padding: 16px;
      }
    }

    .dialog-actions {
      padding: 16px 24px;
      border-top: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    }

    .loading-container {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 48px;
    }

    .loading-spinner {
      width: 48px;
      height: 48px;
      border: 4px solid var(--divider-color, rgba(255, 255, 255, 0.1));
      border-top-color: var(--primary-color, #4caf50);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    .icon {
      width: 20px;
      height: 20px;
      fill: currentColor;
    }
  `;

  connectedCallback(): void {
    super.connectedCallback();
    this._boundHandleKeydown = this._handleKeydown.bind(this);
    document.addEventListener('keydown', this._boundHandleKeydown);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    document.removeEventListener('keydown', this._boundHandleKeydown);
  }

  updated(changedProps: Map<string, unknown>): void {
    super.updated(changedProps);
    if (changedProps.has('open')) {
      if (this.open) {
        // Initialize focus trap when dialog opens
        if (!this._focusTrap) {
          this._focusTrap = new FocusTrapController(this, {
            selector: '.dialog-close-button',
            restoreFocus: true,
            delay: 50,
          });
        } else {
          // Re-activate on subsequent opens
          this._focusTrap.hostConnected();
        }
      } else {
        // Restore focus when dialog closes
        this._focusTrap?.hostDisconnected();
      }
    }
  }

  private _handleKeydown(e: KeyboardEvent): void {
    if (this.open && e.key === 'Escape') {
      // Note: stopPropagation does not prevent document-level listeners on other instances.
      // If nested dialogs are used simultaneously, all open instances would receive this event.
      // TODO: Implement topmost-dialog tracking before enabling nested sheet dialogs (Task 5).
      e.stopPropagation();
      this._handleClose();
    }
  }

  render(): TemplateResult {
    return html`
      <div class="dialog-backdrop" @click=${this._handleBackdropClick}></div>
      <div class="dialog-container">
        <div
          class="dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="base-dialog-title"
          @click=${(e: Event) => e.stopPropagation()}
        >
          ${this._renderHeader()}
          ${this.tabs ? this._renderTabs() : nothing}
          ${this._renderContent()}
          ${this._renderActions()}
        </div>
      </div>
    `;
  }

  private _renderHeader(): TemplateResult {
    return html`
      <div class="dialog-header">
        <div class="dialog-header-text">
          <h2 class="dialog-title" id="base-dialog-title">${this.title}</h2>
          ${this.subtitle
            ? html`<div class="dialog-subtitle">${this.subtitle}</div>`
            : nothing}
        </div>
        ${!this.hideCloseButton
          ? html`
              <button
                class="dialog-close-button"
                @click=${this._handleClose}
                aria-label="Close dialog"
              >
                <svg class="icon" viewBox="0 0 24 24">
                  <path d=${mdiClose} />
                </svg>
              </button>
            `
          : nothing}
      </div>
    `;
  }

  private _renderTabs(): TemplateResult {
    if (!this.tabs || this.tabs.length === 0) {
      return html``;
    }

    return html`
      <div class="dialog-tabs" role="tablist">
        ${this.tabs.map(
          (tab) => html`
            <button
              class="dialog-tab ${tab.id === this.activeTab ? 'active' : ''}"
              role="tab"
              aria-selected=${tab.id === this.activeTab}
              @click=${() => this._handleTabClick(tab.id)}
            >
              ${tab.icon
                ? html`
                    <svg class="icon" viewBox="0 0 24 24">
                      <path d=${tab.icon} />
                    </svg>
                  `
                : nothing}
              <span>${tab.label}</span>
            </button>
          `
        )}
      </div>
    `;
  }

  private _renderContent(): TemplateResult {
    if (this.loading) {
      return html`
        <div class="loading-container">
          <div class="loading-spinner"></div>
        </div>
      `;
    }

    return html`
      <div class="dialog-content">
        <slot></slot>
      </div>
    `;
  }

  private _renderActions(): TemplateResult {
    return html`
      <div class="dialog-actions">
        <slot name="actions"></slot>
      </div>
    `;
  }

  private _handleBackdropClick(): void {
    this._handleClose();
  }

  private _handleClose(): void {
    this.dispatchEvent(
      new CustomEvent('closed', {
        bubbles: true,
        composed: true,
      })
    );
  }

  private _handleTabClick(tabId: string): void {
    this.dispatchEvent(
      new CustomEvent('tab-changed', {
        detail: { tabId },
        bubbles: true,
        composed: true,
      })
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'base-dialog-layout': BaseDialogLayout;
  }
}
