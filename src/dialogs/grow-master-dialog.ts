import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { mdiClose, mdiBrain, mdiLoading } from '@mdi/js';
import { dialogStyles } from '../styles/dialog.styles';

@customElement('grow-master-dialog')
export class GrowMasterDialog extends LitElement {
   @property({ type: Boolean, reflect: true }) open = false;

   // Props from parent
   @property({ type: Boolean }) isStressed = false;
   @property({ type: String }) personality?: string;
   @property({ type: Boolean }) isLoading = false;
   @property({ type: String }) response: string | null = null;
   @state() private userQuery = '';

   static styles = [
      dialogStyles,
      css`
        :host {
            display: block;
        }
        
        /* Specific overrides or additions */
        .gm-response-box {
            background: rgba(255,255,255,0.05);
            border-radius: 16px;
            padding: 20px;
            line-height: 1.6;
            font-size: 0.95rem;
            white-space: pre-wrap;
            position: relative;
            margin-top: 20px;
        }
        .gm-loading {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 40px;
            color: rgba(255, 255, 255, 0.7);
            gap: 12px;
        }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .spinner {
            animation: spin 1s linear infinite;
            width: 24px;
            height: 24px;
        }
        
        .sd-textarea {
            width: 100%;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            padding: 12px;
            color: #fff;
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

        .content-padding {
            padding: 24px;
            overflow-y: auto;
            flex: 1;
            display: flex;
            flex-direction: column;
        }
    `];

   private _close() {
      this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
   }

   private _analyze() {
      this.dispatchEvent(new CustomEvent('analyze-growspace', {
         detail: { query: this.userQuery },
         bubbles: true,
         composed: true
      }));
   }

   private _analyzeAll() {
      this.dispatchEvent(new CustomEvent('analyze-all-growspaces', {
         detail: { query: this.userQuery },
         bubbles: true,
         composed: true
      }));
   }

   render() {
      if (!this.open) return html``;

      const borderColor = this.isStressed ? '#FF9800' : '#4CAF50';
      const title = this.personality ? `Ask the ${this.personality}` : 'Ask the Grow Master';

      return html`
      <ha-dialog
        open
        @closed=${this._close}
        hideActions
        .scrimClickAction=${''}
        .escapeKeyAction=${''}
      >
        <div class="glass-dialog-container" style="border-color: ${borderColor}">
           <div class="dialog-header">
              <div class="dialog-icon" style="color: ${borderColor}">
                 <svg style="width:28px;height:28px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiBrain}"></path></svg>
              </div>
              <div class="dialog-title-group">
                 <h2 class="dialog-title">${title}</h2>
                 <div class="dialog-subtitle">
                    ${this.isStressed ? 'Warning: Plant Stress Detected' : 'All systems normal'}
                 </div>
              </div>
              <button class="md3-button text" @click=${this._close} style="min-width:auto; padding:8px;">
                 <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiClose}"></path></svg>
              </button>
           </div>

           <div class="content-padding">
              <!-- Input Area -->
              <div class="md3-input-group">
                 <label class="md3-label">Your Question</label>
                 <textarea
                    class="sd-textarea"
                    placeholder="Ask about this growspace..."
                    .value=${this.userQuery}
                    @input=${(e: any) => this.userQuery = e.target.value}
                    style="min-height: 80px;"
                 ></textarea>
              </div>

              <!-- Action -->
              <div class="button-group" style="padding: 12px 0; justify-content: flex-end;">
                 <button
                    class="md3-button tonal"
                    @click=${this._analyzeAll}
                    ?disabled=${this.isLoading}
                    style="opacity: ${this.isLoading ? 0.7 : 1}"
                 >
                    Analyze All
                 </button>
                 <button
                    class="md3-button primary"
                    @click=${this._analyze}
                    ?disabled=${this.isLoading}
                    style="opacity: ${this.isLoading ? 0.7 : 1}"
                 >
                    ${this.isLoading ? 'Analyzing...' : 'Analyze Environment'}
                 </button>
              </div>

              <!-- Response Area -->
              ${this.isLoading ? html`
                 <div class="gm-loading">
                    <svg class="spinner" viewBox="0 0 24 24"><path d="${mdiLoading}" fill="currentColor"></path></svg>
                    <span>Consulting the archives...</span>
                 </div>
              ` : nothing}

              ${!this.isLoading && this.response ? html`
                 <div class="gm-response-box" style="border: 2px solid ${borderColor};">
                    ${this.response}
                 </div>
              ` : nothing}
           </div>
        </div>
      </ha-dialog>
    `;
   }
}
