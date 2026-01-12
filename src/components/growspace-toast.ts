import { LitElement, html, css, PropertyValues } from 'lit';
import { customElement } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { storeContext } from '../context';
import type { GrowspaceStore } from '../store/growspace-store';
import { StoreController } from '@nanostores/lit';
// Global imports removed
import { classMap } from 'lit/directives/class-map.js';

@customElement('growspace-toast')
export class GrowspaceToast extends LitElement {
    @consume({ context: storeContext })
    private store!: GrowspaceStore;

    private _notificationController!: StoreController<{
        message: string;
        type: "success" | "error" | "info";
        action?: { label: string; callback: () => void };
    } | null>;
    private _timeoutId: number | null = null;

    connectedCallback() {
        super.connectedCallback();
        if (this.store) {
            this._notificationController = new StoreController(this, this.store.ui.$notification);
        }
    }

    protected updated(changedProps: PropertyValues): void {
        super.updated(changedProps);

        const notification = this._notificationController?.value;

        if (notification) {
            this._resetTimeout();
            // Longer duration for actions
            const duration = notification.action ? 6000 : 3000;
            this._timeoutId = window.setTimeout(() => {
                this.store.ui.clearToast();
            }, duration);
        }
    }

    private _resetTimeout() {
        if (this._timeoutId) {
            window.clearTimeout(this._timeoutId);
            this._timeoutId = null;
        }
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this._resetTimeout();
    }

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
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            font-size: 14px;
            font-weight: 500;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 16px;
            opacity: 0;
            transform: translateY(20px);
            transition: opacity 0.3s ease, transform 0.3s ease;
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
        if (!this._notificationController) return html``;
        const notification = this._notificationController.value;
        const isVisible = !!notification;

        return html`
            <div class=${classMap({
            'toast-notification': true,
            'visible': isVisible,
            [notification?.type || 'info']: true
        })}>
                <span class="toast-message">${notification?.message || ''}</span>
                ${notification?.action ? html`
                    <button class="toast-action" @click=${() => {
                    notification.action?.callback();
                    this.store.ui.clearToast();
                }}>
                        ${notification.action.label}
                    </button>
                ` : ''}
            </div>
        `;
    }
}
