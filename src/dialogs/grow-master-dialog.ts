
import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { mdiClose, mdiBrain, mdiLoading } from '@mdi/js';

@customElement('grow-master-dialog')
export class GrowMasterDialog extends LitElement {
    @property({ type: Boolean, reflect: true }) open = false;

    // Props from parent
    @property({ type: Boolean }) isStressed = false;
    @property({ type: String }) personality?: string;
    @property({ type: Boolean }) isLoading = false;
    @property({ type: String }) response: string | null = null;
    @state() private userQuery = '';

    static styles = css`
    :host {
      display: block;
    }
    
    .gm-container {
      background: #1a1a1a;
      color: #fff;
      width: 500px;
      max-width: 90vw;
      border-radius: 24px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      font-family: 'Roboto', sans-serif;
      border: 1px solid rgba(255,255,255,0.1);
    }
    .gm-header {
      background: #2d2d2d;
      padding: 20px 24px;
      display: flex;
      align-items: center;
      gap: 16px;
      border-bottom: 1px solid rgba(255,255,255,0.1);
    }
    .gm-content {
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 20px;
      overflow-y: auto;
      max-height: 70vh;
    }
    .gm-response-box {
      background: rgba(255,255,255,0.05);
      border-radius: 16px;
      padding: 20px;
      line-height: 1.6;
      font-size: 0.95rem;
      white-space: pre-wrap;
      position: relative;
    }
    .gm-loading {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px;
      color: var(--secondary-text-color);
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
      color: #e0e0e0;
      font-family: inherit;
      resize: vertical;
      box-sizing: border-box;
    }
    .sd-textarea:focus {
      outline: none;
      border-color: #4CAF50;
      background: rgba(255, 255, 255, 0.08);
    }

    .md3-button {
      background: none;
      border: none;
      padding: 0 24px;
      height: 40px;
      border-radius: 20px;
      font-family: 'Roboto', sans-serif;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.2s ease;
    }
    .md3-button.text { color: #e0e0e0; }
    .md3-button.text:hover { background: rgba(255,255,255,0.05); }
    .md3-button.tonal { background: rgba(255,255,255,0.1); color: #e0e0e0; }
    .md3-button.tonal:hover { background: rgba(255,255,255,0.15); }
    .md3-button.primary { background: #4CAF50; color: #003300; }
    .md3-button.primary:hover { filter: brightness(1.1); }
    
    /* Disabled state */
    button[disabled] {
      cursor: not-allowed;
      opacity: 0.5;
    }
  `;

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
        <div class="gm-container" style="border-color: ${borderColor}">
           <div class="gm-header">
              <div style="background: rgba(255,255,255,0.1); padding: 10px; border-radius: 12px; color: ${borderColor}">
                 <svg style="width:28px;height:28px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiBrain}"></path></svg>
              </div>
              <div style="flex:1">
                 <h2 style="margin:0; font-size:1.25rem;">${title}</h2>
                 <div style="font-size:0.8rem; color:var(--secondary-text-color); margin-top:4px;">
                    ${this.isStressed ? 'Warning: Plant Stress Detected' : 'All systems normal'}
                 </div>
              </div>
              <button class="md3-button text" @click=${this._close} style="min-width:auto; padding:8px;">
                 <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiClose}"></path></svg>
              </button>
           </div>

           <div class="gm-content">
              <!-- Input Area -->
              <div style="display:flex; flex-direction:column; gap:8px;">
                 <label style="font-size:0.9rem; font-weight:500; color:#ccc;">Your Question</label>
                 <textarea
                    class="sd-textarea"
                    placeholder="Ask about this growspace..."
                    .value=${this.userQuery}
                    @input=${(e: any) => this.userQuery = e.target.value}
                    style="min-height: 80px;"
                 ></textarea>
              </div>

              <!-- Action -->
              <div style="display:flex; justify-content:flex-end; gap: 12px;">
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
