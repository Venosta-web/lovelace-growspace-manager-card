import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant } from 'custom-card-helpers';
import { mdiBrain, mdiClose, mdiLoading } from '@mdi/js';
import { dialogStyles } from '../styles/dialog.styles';

@customElement('strain-recommendation-dialog')
export class StrainRecommendationDialog extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ type: Boolean }) public open = false;
  @property({ type: Boolean }) public isLoading = false;
  @property({ attribute: false }) public response: string | null = null;
  @property({ type: String }) public userQuery: string = '';

  static styles = [
    dialogStyles,
    css`
        :host {
            display: block;
        }
        .content-padding {
            padding: 24px;
            display: flex;
            flex-direction: column;
            gap: 16px;
        }
        .sd-textarea {
            width: 100%;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            color: #fff;
            padding: 12px;
            font-family: inherit;
            resize: vertical;
            box-sizing: border-box;
            font-size: 1rem;
        }
        .sd-textarea:focus {
            outline: none;
            border-color: #4CAF50;
            background: rgba(255, 255, 255, 0.08);
        }
        .gm-loading {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 40px;
            color: rgba(255, 255, 255, 0.7);
            gap: 12px;
        }
        .spinner {
            width: 24px;
            height: 24px;
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
            margin-top: 16px;
        }
    `];

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
        <div class="glass-dialog-container">
           <div class="dialog-header">
              <div class="dialog-icon" style="color: #4CAF50">
                 <svg style="width:28px;height:28px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiBrain}"></path></svg>
              </div>
              <div class="dialog-title-group">
                 <h2 class="dialog-title">Get Strain Recommendation</h2>
              </div>
              <button class="md3-button text" @click=${this._close} style="min-width:auto; padding:8px;">
                 <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiClose}"></path></svg>
              </button>
           </div>

           <div class="content-padding">
              <!-- Input Area -->
              <div class="md3-input-group">
                 <label class="md3-label">Your Preferences</label>
                 <textarea
                    class="sd-textarea"
                    placeholder="e.g., something fruity and good for daytime use..."
                    .value=${this.userQuery}
                    @input=${(e: any) => this.userQuery = e.target.value}
                    style="min-height: 80px;"
                 ></textarea>
              </div>

              <!-- Action -->
              <div class="button-group" style="padding: 0; justify-content: flex-end;">
                 <button
                    class="md3-button tonal"
                    @click=${this._close}
                 >
                    Cancel
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
