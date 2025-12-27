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
    private accessor store!: GrowspaceStore;

    private _notificationController!: StoreController<{ message: string; type: "success" | "error" | "info" } | null>;
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
            this._timeoutId = window.setTimeout(() => {
                this.store.ui.clearToast();
            }, 3000);
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
            padding: 12px 24px;
            border-radius: 24px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            font-size: 14px;
            font-weight: 500;
            display: flex;
            align-items: center;
            justify-content: center;
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
    `;

    render() {
        const notification = this._notificationController.value;
        const isVisible = !!notification;

        return html`
            <div class=${classMap({
            'toast-notification': true,
            'visible': isVisible,
            [notification?.type || 'info']: true
        })}>
                ${notification?.message || ''}
            </div>
        `;
    }
}
