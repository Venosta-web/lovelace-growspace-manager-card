import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { mdiCameraPlus, mdiSend, mdiClose } from '@mdi/js';

/**
 * Quick note input component with image upload support
 * Extracted from plant-timeline for reusability
 */
@customElement('quick-note-input')
export class QuickNoteInput extends LitElement {
  @property({ type: String }) placeholder = 'Add a cultivation note...';
  @property({ type: Boolean }) allowImages = true;
  @property({ type: Boolean }) disabled = false;

  @state() private _text = '';
  @state() private _images: string[] = [];
  @state() private _isSaving = false;

  static styles = css`
    :host {
      display: block;
      margin-bottom: 24px;
    }

    .container {
      padding: 12px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px dashed var(--divider-color);
    }

    .input-wrapper {
      display: flex;
      gap: 8px;
      align-items: flex-start;
    }

    textarea {
      flex: 1;
      background: transparent;
      border: none;
      color: var(--primary-text-color);
      font-size: 0.9rem;
      font-family: inherit;
      resize: none;
      padding: 4px;
      outline: none;
      min-height: 40px;
    }

    textarea::placeholder {
      color: var(--secondary-text-color);
      opacity: 0.6;
    }

    .actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 8px;
    }

    .action-buttons {
      display: flex;
      gap: 8px;
    }

    button {
      background: transparent;
      border: none;
      cursor: pointer;
      padding: 8px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s;
    }

    button:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.1);
    }

    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    button.submit-btn {
      background: var(--primary-color, #03a9f4);
      color: white;
    }

    button.submit-btn:hover:not(:disabled) {
      background: var(--primary-color-dark, #0288d1);
    }

    svg {
      width: 24px;
      height: 24px;
      fill: currentColor;
    }

    .image-previews {
      display: flex;
      gap: 8px;
      margin-top: 8px;
      overflow-x: auto;
      scrollbar-width: thin;
    }

    .preview-item {
      position: relative;
      width: 60px;
      height: 60px;
      flex-shrink: 0;
    }

    .preview-item img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 4px;
      border: 1px solid var(--divider-color);
    }

    .remove-img {
      position: absolute;
      top: -4px;
      right: -4px;
      background: var(--error-color, #f44336);
      color: white;
      border-radius: 50%;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      padding: 0;
      border: none;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    }

    .remove-img svg {
      width: 14px;
      height: 14px;
    }

    .remove-img:hover {
      background: var(--error-color-dark, #d32f2f);
    }

    input[type='file'] {
      display: none;
    }
  `;

  /**
   * Resize and compress an image file
   */
  private async _resizeImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }

          // Max dimensions
          const MAX_WIDTH = 1024;
          const MAX_HEIGHT = 1024;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);

          // Compress to JPEG 0.8
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          resolve(dataUrl);
        };
        img.onerror = (e) => reject(e);
        img.src = e.target?.result as string;
      };
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(file);
    });
  }

  private async _handleFileSelect(e: Event) {
    const input = e.target as HTMLInputElement;
    if (!input.files) return;

    const files = Array.from(input.files);
    for (const file of files) {
      try {
        const resized = await this._resizeImage(file);
        this._images = [...this._images, resized];
      } catch (err) {
        console.error('Error processing image:', err);
      }
    }

    // Clear input to allow re-selecting same file
    input.value = '';
  }

  private _removeImage(index: number) {
    this._images = this._images.filter((_, i) => i !== index);
  }

  private async _submit() {
    if (!this._text.trim() && !this._images.length) return;

    this._isSaving = true;

    // Dispatch event with note data
    this.dispatchEvent(
      new CustomEvent('submit', {
        detail: {
          text: this._text.trim(),
          images: this._images,
        },
        bubbles: true,
        composed: true,
      })
    );

    // Note: The parent component should handle the actual submission
    // and call clear() method on success
  }

  /**
   * Public method to clear the input after successful submission
   */
  public clear() {
    this._text = '';
    this._images = [];
    this._isSaving = false;
  }

  /**
   * Public method to set saving state (called by parent during submission)
   */
  public setSaving(saving: boolean) {
    this._isSaving = saving;
  }

  render() {
    const canSubmit = (this._text.trim() || this._images.length > 0) && !this._isSaving;

    return html`
      <div class="container">
        <div class="input-wrapper">
          <textarea
            placeholder="${this.placeholder}"
            .value=${this._text}
            @input=${(e: InputEvent) => (this._text = (e.target as HTMLTextAreaElement).value)}
            rows="2"
            ?disabled=${this.disabled || this._isSaving}
          ></textarea>
        </div>

        ${this._images.length > 0
        ? html`
              <div class="image-previews">
                ${this._images.map(
          (img, i) => html`
                    <div class="preview-item">
                      <img src=${img} alt="Preview ${i + 1}" />
                      <button
                        class="remove-img"
                        @click=${() => this._removeImage(i)}
                        ?disabled=${this._isSaving}
                        aria-label="Remove image"
                      >
                        <svg viewBox="0 0 24 24">
                          <path d="${mdiClose}" />
                        </svg>
                      </button>
                    </div>
                  `
        )}
              </div>
            `
        : nothing}

        <div class="actions">
          <div class="action-buttons">
            ${this.allowImages
        ? html`
                  <input
                    type="file"
                    id="fileInput"
                    @change=${this._handleFileSelect}
                    multiple
                    accept="image/*"
                    capture="environment"
                  />
                  <button
                    @click=${() => this.shadowRoot?.getElementById('fileInput')?.click()}
                    ?disabled=${this.disabled || this._isSaving}
                    aria-label="Add image"
                    title="Add image"
                  >
                    <svg viewBox="0 0 24 24">
                      <path d="${mdiCameraPlus}" />
                    </svg>
                  </button>
                `
        : nothing}
          </div>
          <button
            class="submit-btn"
            @click=${this._submit}
            ?disabled=${!canSubmit || this.disabled}
            aria-label="Submit note"
            title="Submit note"
          >
            <svg viewBox="0 0 24 24">
              <path d="${mdiSend}" />
            </svg>
          </button>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'quick-note-input': QuickNoteInput;
  }
}
