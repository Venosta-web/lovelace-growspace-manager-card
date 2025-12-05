import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant } from 'custom-card-helpers';
import { mdiBrain, mdiClose, mdiLoading } from '@mdi/js';
import { DialogRenderer } from '../dialog-renderer';

@customElement('strain-recommendation-dialog')
export class StrainRecommendationDialog extends LitElement {
    @property({ attribute: false }) public hass!: HomeAssistant;
    @property({ type: Boolean }) public open = false;
    @property({ type: Boolean }) public isLoading = false;
    @property({ attribute: false }) public response: string | null = null;
    @property({ type: String }) public userQuery: string = '';

    static styles = css`
    :host {
      display: block;
    }
    .gm-container {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 8px;
    }
    .gm-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 8px;
    }
    .gm-content {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .sd-textarea {
      width: 100%;
      background: rgba(0, 0, 0, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      color: var(--primary-text-color);
      padding: 12px;
      font-family: inherit;
      resize: vertical;
      box-sizing: border-box;
    }
    .sd-textarea:focus {
      outline: none;
      border-color: var(--primary-color);
    }
    .md3-button {
      border: none;
      border-radius: 20px;
      padding: 10px 24px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      font-size: 14px;
    }
    .md3-button.tonal {
      background: rgba(255, 255, 255, 0.1);
      color: var(--primary-text-color);
    }
    .md3-button.tonal:hover {
      background: rgba(255, 255, 255, 0.15);
    }
    .md3-button.primary {
      background: var(--primary-color);
      color: var(--text-primary-color);
    }
    .md3-button.primary:hover {
      filter: brightness(1.1);
    }
    .md3-button.text {
      background: transparent;
      color: var(--primary-text-color);
      padding: 8px;
    }
    .md3-button.text:hover {
      background: rgba(255, 255, 255, 0.05);
    }
    .gm-loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 24px;
      color: var(--secondary-text-color);
    }
    .spinner {
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      100% { transform: rotate(360deg); }
    }
    .gm-response-box {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      padding: 16px;
      line-height: 1.5;
      white-space: pre-wrap;
    }
  `;

    private _close() {
        this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
    }

    private _handleGetRecommendation() {
        this.dispatchEvent(new CustomEvent('get-recommendation', {
            detail: { query: this.userQuery },
            bubbles: true,
            composed: true
        }));
    }

    render() {
        if (!this.open) return nothing;

        return html`
      <ha-dialog
        open
        @closed=${this._close}
        hideActions
        .scrimClickAction=${''}
        .escapeKeyAction=${''}
      >
        <div class="gm-container">
           <div class="gm-header">
              <div style="background: rgba(255,255,255,0.1); padding: 10px; border-radius: 12px; color: #4CAF50">
                 <svg style="width:28px;height:28px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiBrain}"></path></svg>
              </div>
              <div style="flex:1">
                 <h2 style="margin:0; font-size:1.25rem;">Get Strain Recommendation</h2>
              </div>
              <button class="md3-button text" @click=${this._close} style="min-width:auto; padding:8px;">
                 <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiClose}"></path></svg>
              </button>
           </div>

           <div class="gm-content">
              <!-- Input Area -->
              <div style="display:flex; flex-direction:column; gap:8px;">
                 <label style="font-size:0.9rem; font-weight:500; color:#ccc;">Your Preferences</label>
                 <textarea
                    class="sd-textarea"
                    placeholder="e.g., something fruity and good for daytime use..."
                    .value=${this.userQuery}
                    @input=${(e: any) => this.userQuery = e.target.value}
                    style="min-height: 80px;"
                 ></textarea>
              </div>

              <!-- Action -->
              <div style="display:flex; justify-content:flex-end; gap: 12px;">
                 <button
                    class="md3-button tonal"
                    @click=${this._close}
                 >
                    OK
                 </button>
                 <button
                    class="md3-button primary"
                    @click=${this._handleGetRecommendation}
                    ?disabled=${this.isLoading}
                    style="opacity: ${this.isLoading ? 0.7 : 1}"
                 >
                    ${this.isLoading ? 'Getting Recommendation...' : 'Get Recommendation'}
                 </button>
              </div>

              ${this.isLoading ? html`
                 <div class="gm-loading">
                    <svg class="spinner" viewBox="0 0 24 24"><path d="${mdiLoading}" fill="currentColor"></path></svg>
                    <span>Consulting the archives...</span>
                 </div>
              ` : nothing}

              ${!this.isLoading && this.response ? html`
                 <div class="gm-response-box">
                    ${this.response}
                 </div>
              ` : nothing}
           </div>
        </div>
      </ha-dialog>
    `;
    }
}
