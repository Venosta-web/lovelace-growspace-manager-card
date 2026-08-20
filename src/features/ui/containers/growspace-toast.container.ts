import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { StoreController } from '@nanostores/lit';
import { storeContext } from '../../../context';
import type { GrowspaceStore } from '../../../store/core/growspace-store';
import type { ToastNotification } from '../components/growspace-toast-ui';
import '../components/growspace-toast-ui';

@customElement('growspace-toast')
export class GrowspaceToastContainer extends LitElement {
  @consume({ context: storeContext })
  private store!: GrowspaceStore;

  private _controller!: StoreController<ToastNotification>;
  private _timeoutId: number | null = null;

  private _initControllers() {
    if (this.store && !this._controller) {
      this._controller = new StoreController(this, this.store.ui.$notification);
    }
  }

  connectedCallback() {
    super.connectedCallback();
    this._initControllers();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._clearTimeout();
  }

  protected updated() {
    const notification = this._controller?.value;
    if (notification) {
      this._clearTimeout();
      const duration = notification.action ? 6000 : 3000;
      this._timeoutId = window.setTimeout(() => {
        this.store?.ui?.clearToast();
      }, duration);
    }
  }

  private _clearTimeout() {
    if (this._timeoutId !== null) {
      window.clearTimeout(this._timeoutId);
      this._timeoutId = null;
    }
  }

  render() {
    if (!this._controller) return html``;
    return html`
      <growspace-toast-ui
        .notification=${this._controller.value}
        @toast-action-clicked=${this._handleActionClicked}
      ></growspace-toast-ui>
    `;
  }

  private _handleActionClicked() {
    this._controller.value?.action?.callback();
    this.store?.ui?.clearToast();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'growspace-toast': GrowspaceToastContainer;
  }
}
