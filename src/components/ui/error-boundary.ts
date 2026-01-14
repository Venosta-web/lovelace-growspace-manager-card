import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { mdiAlertCircle, mdiRefresh } from '@mdi/js';

/**
 * Error boundary component for graceful error handling.
 * Wraps child components and displays a fallback UI if rendering fails.
 * Prevents a single component crash from breaking the entire dashboard.
 */
@customElement('growspace-error-boundary')
export class GrowspaceErrorBoundary extends LitElement {
    @state() private _hasError = false;
    @state() private _error: Error | null = null;
    @state() private _errorInfo: string = '';

    static styles = css`
    :host {
      display: contents;
    }

    .error-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
      min-height: 200px;
      background: rgba(244, 67, 54, 0.1);
      border: 1px solid rgba(244, 67, 54, 0.3);
      border-radius: 12px;
      margin: 8px;
    }

    .error-icon {
      width: 48px;
      height: 48px;
      fill: var(--error-color, #f44336);
      margin-bottom: 16px;
    }

    .error-title {
      font-size: 1.1rem;
      font-weight: 600;
      color: var(--error-color, #f44336);
      margin-bottom: 8px;
    }

    .error-message {
      font-size: 0.9rem;
      color: var(--secondary-text-color, rgba(255, 255, 255, 0.7));
      text-align: center;
      margin-bottom: 16px;
      max-width: 400px;
    }

    .error-details {
      font-family: monospace;
      font-size: 0.75rem;
      background: rgba(0, 0, 0, 0.2);
      padding: 8px 12px;
      border-radius: 4px;
      max-width: 100%;
      overflow-x: auto;
      color: var(--secondary-text-color);
      margin-bottom: 16px;
    }

    .retry-button {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border: none;
      border-radius: 8px;
      background: var(--primary-color, #4caf50);
      color: var(--text-primary-color, #fff);
      font-size: 0.9rem;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.2s;
    }

    .retry-button:hover {
      filter: brightness(1.1);
    }

    .retry-button svg {
      width: 18px;
      height: 18px;
      fill: currentColor;
    }
  `;

    connectedCallback() {
        super.connectedCallback();
        // Listen for error events from child components
        this.addEventListener('error', this._handleError as EventListener);
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this.removeEventListener('error', this._handleError as EventListener);
    }

    private _handleError = (event: ErrorEvent) => {
        event.stopPropagation();
        this._hasError = true;
        this._error = event.error || new Error(event.message || 'Unknown error');
        this._errorInfo = event.message || 'An unexpected error occurred';
        console.error('[GrowspaceErrorBoundary] Caught error:', this._error);
    };

    /**
     * Call this method to programmatically trigger an error state.
     * Useful for catching async errors in child components.
     */
    public setError(error: Error, info?: string) {
        this._hasError = true;
        this._error = error;
        this._errorInfo = info || error.message;
        console.error('[GrowspaceErrorBoundary] Error set:', error);
    }

    /**
     * Clear the error state and attempt to re-render children.
     */
    public clearError() {
        this._hasError = false;
        this._error = null;
        this._errorInfo = '';
    }

    private _handleRetry() {
        this.clearError();
        this.requestUpdate();
    }

    render() {
        if (this._hasError) {
            return html`
        <div class="error-container">
          <svg class="error-icon" viewBox="0 0 24 24">
            <path d="${mdiAlertCircle}"></path>
          </svg>
          <div class="error-title">Something went wrong</div>
          <div class="error-message">
            A component encountered an error. This has been logged for debugging.
          </div>
          ${this._error?.message ? html`
            <div class="error-details">${this._error.message}</div>
          ` : ''}
          <button class="retry-button" @click=${this._handleRetry}>
            <svg viewBox="0 0 24 24">
              <path d="${mdiRefresh}"></path>
            </svg>
            Retry
          </button>
        </div>
      `;
        }

        return html`<slot></slot>`;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'growspace-error-boundary': GrowspaceErrorBoundary;
    }
}
