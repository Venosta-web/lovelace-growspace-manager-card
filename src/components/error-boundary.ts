import { LitElement, html, css, TemplateResult, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { mdiAlertCircle, mdiRefresh, mdiRestart } from '@mdi/js';

/**
 * ErrorBoundary - Catches and handles errors in child components
 * 
 * Usage:
 * ```html
 * <error-boundary
 *   .fallbackMessage=${"Something went wrong"}
 *   .onRetry=${() => this.requestUpdate()}
 *   .onReset=${() => this.resetState()}
 * >
 *   <my-component></my-component>
 * </error-boundary>
 * ```
 */
@customElement('error-boundary')
export class ErrorBoundary extends LitElement {
  @property({ type: String }) fallbackMessage = 'An error occurred';
  @property({ attribute: false }) onRetry?: () => void;
  @property({ attribute: false }) onReset?: () => void;
  @property({ attribute: false }) onError?: (error: Error, errorInfo: any) => void;
  @property({ type: Boolean }) showDetails = false;

  @state() private _error: Error | null = null;
  @state() private _errorInfo: any = null;
  @state() private _errorCount = 0;
  @state() private _lastErrorTime = 0;

  private readonly MAX_ERROR_COUNT = 5;
  private readonly ERROR_RESET_INTERVAL = 5000; // 5 seconds

  static styles = css`
        :host {
            display: block;
        }

        .error-container {
            padding: 24px;
            background: var(--error-color, #f44336);
            color: white;
            border-radius: 8px;
            margin: 16px;
        }

        .error-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 16px;
        }

        .error-icon {
            --mdc-icon-size: 32px;
        }

        .error-title {
            font-size: 1.2rem;
            font-weight: 500;
            margin: 0;
        }

        .error-message {
            margin: 0 0 16px 0;
            opacity: 0.9;
            line-height: 1.5;
        }

        .error-details {
            background: rgba(0, 0, 0, 0.2);
            padding: 12px;
            border-radius: 4px;
            margin-bottom: 16px;
            font-family: monospace;
            font-size: 0.85rem;
            overflow-x: auto;
            white-space: pre-wrap;
            word-break: break-word;
        }

        .error-actions {
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
        }

        .error-button {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 8px 16px;
            background: rgba(255, 255, 255, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.3);
            border-radius: 4px;
            color: white;
            cursor: pointer;
            font-size: 0.9rem;
            transition: background 0.2s;
        }

        .error-button:hover {
            background: rgba(255, 255, 255, 0.3);
        }

        .error-button ha-svg-icon {
            --mdc-icon-size: 18px;
        }

        .too-many-errors {
            background: var(--error-color, #d32f2f);
            padding: 16px;
            border-radius: 8px;
            margin: 16px;
            color: white;
        }

        .too-many-errors p {
            margin: 0 0 12px 0;
        }

        details summary {
            cursor: pointer;
            margin-bottom: 8px;
            user-select: none;
        }
    `;

  connectedCallback() {
    super.connectedCallback();
    // Listen for error events bubbling from children
    this.addEventListener('recoverable-error', this._handleErrorEvent);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('recoverable-error', this._handleErrorEvent);
  }

  protected updated(changedProperties: Map<string | number | symbol, unknown>): void {
    super.updated(changedProperties);

    // Reset error count if enough time has passed
    const now = Date.now();
    if (now - this._lastErrorTime > this.ERROR_RESET_INTERVAL) {
      this._errorCount = 0;
    }
  }

  private _handleErrorEvent = (e: Event) => {
    const customEvent = e as CustomEvent;
    if (customEvent.detail && customEvent.detail.error) {
      this._catchError(customEvent.detail.error, customEvent.detail.errorInfo);
      e.stopPropagation();
    }
  };

  private _catchError(error: Error, errorInfo?: any) {
    const now = Date.now();

    // Increment error count
    this._errorCount++;
    this._lastErrorTime = now;

    // Store error state
    this._error = error;
    this._errorInfo = errorInfo;

    // Log to console
    console.error('[ErrorBoundary] Caught error:', error);
    if (errorInfo) {
      console.error('[ErrorBoundary] Error info:', errorInfo);
    }

    // Call optional error callback
    if (this.onError) {
      try {
        this.onError(error, errorInfo);
      } catch (callbackError) {
        console.error('[ErrorBoundary] Error in onError callback:', callbackError);
      }
    }

    // Emit custom event
    this.dispatchEvent(
      new CustomEvent('error-caught', {
        detail: { error, errorInfo, errorCount: this._errorCount },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _handleRetry() {
    this._error = null;
    this._errorInfo = null;

    if (this.onRetry) {
      try {
        this.onRetry();
      } catch (error: any) {
        this._catchError(error, { context: 'retry' });
      }
    } else {
      this.requestUpdate();
    }

    this.dispatchEvent(new CustomEvent('error-reset'));
  }

  private _handleReset() {
    this._error = null;
    this._errorInfo = null;
    this._errorCount = 0;

    if (this.onReset) {
      try {
        this.onReset();
      } catch (error: any) {
        this._catchError(error, { context: 'reset' });
      }
    } else {
      this.requestUpdate();
    }

    this.dispatchEvent(new CustomEvent('error-reset'));
  }

  /**
   * Public method to manually trigger error state
   * Useful for testing or programmatic error handling
   */
  public setError(error: Error, errorInfo?: any) {
    this._catchError(error, errorInfo);
  }

  /**
   * Public method to clear error state
   */
  public clearError() {
    this._error = null;
    this._errorInfo = null;
  }

  protected get _isDev(): boolean {
    return window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1';
  }

  protected render(): TemplateResult {
    // Check for too many errors (potential infinite loop)
    if (this._errorCount >= this.MAX_ERROR_COUNT) {
      return html`
                <div class="too-many-errors">
                    <p><strong>Too many errors detected</strong></p>
                    <p>
                        This component has encountered ${this._errorCount} errors in a short time.
                        This may indicate a critical issue.
                    </p>
                    <button class="error-button" @click=${this._handleReset}>
                        <ha-svg-icon .path=${mdiRestart}></ha-svg-icon>
                        Force Reset
                    </button>
                </div>
            `;
    }

    // Show error fallback if error exists
    if (this._error) {
      const isDev = this._isDev;

      return html`
                <div class="error-container">
                    <div class="error-header">
                        <ha-svg-icon class="error-icon" .path=${mdiAlertCircle}></ha-svg-icon>
                        <h3 class="error-title">${this.fallbackMessage}</h3>
                    </div>

                    <p class="error-message">
                        ${this._error.message || 'An unexpected error occurred'}
                    </p>

                    ${isDev && this._error.stack
          ? html`
                            <details ?open=${this.showDetails}>
                                <summary>
                                    ${this.showDetails ? 'Hide' : 'Show'} technical details
                                </summary>
                                <div class="error-details">${this._error.stack}</div>
                            </details>
                          `
          : nothing}

                    <div class="error-actions">
                        <button class="error-button" @click=${this._handleRetry}>
                            <ha-svg-icon .path=${mdiRefresh}></ha-svg-icon>
                            Retry
                        </button>
                        ${this.onReset
          ? html`
                                <button class="error-button" @click=${this._handleReset}>
                                    <ha-svg-icon .path=${mdiRestart}></ha-svg-icon>
                                    Reset
                                </button>
                              `
          : nothing}
                    </div>
                </div>
            `;
    }

    // No error - render children
    return html`<slot></slot>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'error-boundary': ErrorBoundary;
  }
}
