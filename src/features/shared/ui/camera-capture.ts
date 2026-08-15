import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';
import { mdiCamera, mdiClose, mdiCameraFlip, mdiImageMultiple } from '@mdi/js';

/**
 * Shared image-capture component.
 *
 * Owns the whole "add a photo" flow after the consumer triggers it: a bottom-sheet
 * menu (Take Photo / Choose from Library), the two hidden file inputs, and a live
 * fullscreen camera overlay. Emits the selected/captured files via a `capture`
 * event — persistence stays with the consumer (strain → WS upload; notes → base64).
 *
 * Inside the HA companion-app WebView the `<input capture>` attribute is ignored and
 * only opens the gallery, so the live camera is driven directly via getUserMedia. See
 * ADR 0021. The hidden file input is the fallback when MediaDevices is unavailable.
 *
 * Usage:
 *   <camera-capture .multiple=${true} @capture=${this._onCapture}></camera-capture>
 *   // then call open() on the element to start the flow
 */
@customElement('camera-capture')
export class CameraCapture extends LitElement {
  /** Allow selecting multiple files from the library. Live camera always emits one. */
  @property({ type: Boolean }) multiple = false;

  @state() private _menuOpen = false;
  @state() private _cameraStream: MediaStream | null = null;
  @state() private _cameraError: string | null = null;
  private _cameraFacing: 'environment' | 'user' = 'environment';

  @query('#gallery-camera-input') private _cameraInput!: HTMLInputElement;
  @query('#gallery-library-input') private _libraryInput!: HTMLInputElement;

  static styles = css`
    /* The element generates no layout box of its own: the menu/overlay are
       position:fixed and the file inputs are display:none. Without this the host
       would occupy a grid cell (strain gallery) / flex slot (note action bar). */
    :host {
      display: contents;
    }

    .scrim {
      position: fixed;
      inset: 0;
      z-index: 500;
      background: rgba(0, 0, 0, 0.5);
    }

    .sheet {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      z-index: 501;
      background: var(--card-background-color, #1e1e1e);
      border-radius: 16px 16px 0 0;
      padding: 16px 16px 32px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .sheet-handle {
      width: 40px;
      height: 4px;
      border-radius: 2px;
      background: rgba(255, 255, 255, 0.2);
      margin: 0 auto 8px;
    }

    .sheet-action {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px;
      border-radius: 12px;
      border: none;
      background: rgba(255, 255, 255, 0.05);
      color: var(--primary-text-color, #fff);
      font-size: 1rem;
      font-family: inherit;
      cursor: pointer;
      text-align: left;
    }

    .sheet-action svg {
      width: 24px;
      height: 24px;
      fill: var(--accent-green, #4caf50);
      flex-shrink: 0;
    }

    .overlay {
      position: fixed;
      inset: 0;
      z-index: 600;
      background: #000;
      display: flex;
      flex-direction: column;
    }

    .overlay-error {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 16px;
      padding: 24px;
      text-align: center;
      color: var(--text-primary);
    }

    .overlay-error svg {
      width: 48px;
      height: 48px;
      fill: var(--gm-error-color);
    }

    .overlay-error-message {
      max-width: 320px;
      font-size: var(--font-size-md);
    }

    video {
      flex: 1;
      width: 100%;
      height: 100%;
      object-fit: cover;
      background: #000;
    }

    .overlay-top {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      display: flex;
      justify-content: space-between;
      padding: 16px;
    }

    .overlay-icon-btn {
      background: rgba(0, 0, 0, 0.5);
      border: none;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      cursor: pointer;
      color: var(--text-primary);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .overlay-icon-btn svg {
      width: 24px;
      height: 24px;
      fill: currentColor;
    }

    .overlay-bottom {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      display: flex;
      justify-content: center;
      padding: 24px;
    }

    .shutter {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      border: 4px solid rgba(255, 255, 255, 0.4);
      background: var(--text-primary);
      cursor: pointer;
    }

    .close-btn {
      padding: 10px 20px;
      border-radius: 8px;
      border: none;
      background: rgba(255, 255, 255, 0.1);
      color: var(--text-primary);
      font-family: inherit;
      font-size: var(--font-size-md);
      cursor: pointer;
    }

    input[type='file'] {
      display: none;
    }
  `;

  /** Open the bottom-sheet photo menu. Called by the consumer's trigger. */
  public open(): void {
    this._menuOpen = true;
  }

  private _closeMenu(): void {
    this._menuOpen = false;
  }

  private _emit(files: File[]): void {
    if (!files.length) return;
    this.dispatchEvent(
      new CustomEvent('capture', {
        detail: { files },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _handleFileChange(e: Event): void {
    const input = e.target as HTMLInputElement;
    const files = input.files ? Array.from(input.files) : [];
    input.value = '';
    this._closeMenu();
    this._emit(files);
  }

  /**
   * Open the live camera. Inside the HA companion-app WebView the
   * `<input capture="environment">` hint is not honoured and only opens the gallery,
   * so we drive the camera directly via getUserMedia. Falls back to the hidden file
   * input when the MediaDevices API is unavailable.
   */
  private async _openCameraCapture(): Promise<void> {
    this._closeMenu();
    if (!navigator.mediaDevices?.getUserMedia) {
      this._cameraInput?.click();
      return;
    }
    this._cameraError = null;
    try {
      this._cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: this._cameraFacing } },
        audio: false,
      });
    } catch (err) {
      // Permission denied / no camera / not a secure context.
      console.error('Camera access failed:', err);
      this._cameraError =
        'Could not access the camera. Grant the Home Assistant app camera permission, or use “Choose from Library”.';
    }
  }

  private _stopCameraStream(): void {
    this._cameraStream?.getTracks().forEach((t) => t.stop());
    this._cameraStream = null;
  }

  private _closeCameraCapture(): void {
    this._stopCameraStream();
    this._cameraError = null;
  }

  private async _switchCamera(): Promise<void> {
    this._cameraFacing = this._cameraFacing === 'environment' ? 'user' : 'environment';
    this._stopCameraStream();
    await this._openCameraCapture();
  }

  private _capturePhoto(): void {
    const stream = this._cameraStream;
    if (!stream) return;
    const video = this.shadowRoot?.getElementById('camera-preview') as HTMLVideoElement | null;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
          this._emit([file]);
        }
        this._closeCameraCapture();
      },
      'image/jpeg',
      0.92
    );
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._stopCameraStream();
  }

  private _renderMenu(): TemplateResult | typeof nothing {
    if (!this._menuOpen) return nothing;
    return html`
      <div class="scrim" @click=${this._closeMenu}></div>
      <div class="sheet">
        <div class="sheet-handle"></div>
        <button
          class="sheet-action"
          @click=${(e: Event) => {
            e.stopPropagation();
            this._openCameraCapture();
          }}
        >
          <svg viewBox="0 0 24 24"><path d="${mdiCamera}"></path></svg>
          Take Photo
        </button>
        <button
          class="sheet-action"
          @click=${(e: Event) => {
            e.stopPropagation();
            this._closeMenu();
            this._libraryInput?.click();
          }}
        >
          <svg viewBox="0 0 24 24"><path d="${mdiImageMultiple}"></path></svg>
          Choose from Library
        </button>
      </div>
    `;
  }

  private _renderOverlay(): TemplateResult | typeof nothing {
    if (!this._cameraStream && !this._cameraError) return nothing;
    return html`
      <div class="overlay">
        ${this._cameraError
          ? html`
              <div class="overlay-error">
                <svg viewBox="0 0 24 24"><path d="${mdiCamera}"></path></svg>
                <div class="overlay-error-message">${this._cameraError}</div>
                <button class="close-btn" @click=${() => this._closeCameraCapture()}>Close</button>
              </div>
            `
          : html`
              <video
                id="camera-preview"
                autoplay
                playsinline
                muted
                .srcObject=${this._cameraStream}
              ></video>
              <div class="overlay-top">
                <button
                  class="overlay-icon-btn"
                  title="Close"
                  @click=${() => this._closeCameraCapture()}
                >
                  <svg viewBox="0 0 24 24"><path d="${mdiClose}"></path></svg>
                </button>
                <button
                  class="overlay-icon-btn"
                  title="Switch camera"
                  @click=${() => this._switchCamera()}
                >
                  <svg viewBox="0 0 24 24"><path d="${mdiCameraFlip}"></path></svg>
                </button>
              </div>
              <div class="overlay-bottom">
                <button class="shutter" title="Capture" @click=${() => this._capturePhoto()}></button>
              </div>
            `}
      </div>
    `;
  }

  render(): TemplateResult {
    return html`
      <input
        id="gallery-camera-input"
        type="file"
        accept="image/*"
        capture="environment"
        @change=${this._handleFileChange}
      />
      <input
        id="gallery-library-input"
        type="file"
        accept="image/*"
        ?multiple=${this.multiple}
        @change=${this._handleFileChange}
      />
      ${this._renderMenu()}${this._renderOverlay()}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'camera-capture': CameraCapture;
  }
}
