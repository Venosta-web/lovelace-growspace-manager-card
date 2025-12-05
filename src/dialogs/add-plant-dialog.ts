
import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant } from 'custom-card-helpers';
import { mdiClose, mdiSprout } from '@mdi/js';
import { StrainEntry, IrrigationTime } from '../types';
import { DialogRenderer } from '../dialog-renderer';

@customElement('add-plant-dialog')
export class AddPlantDialog extends LitElement {
    @property({ attribute: false }) hass!: HomeAssistant;
    @property({ type: Array }) strainLibrary: StrainEntry[] = [];
    @property({ type: String }) growspaceName = '';
    @property({ type: Boolean, reflect: true }) open = false;

    // Initialize with values passed via methods or defaults
    @state() private strain = '';
    @state() private phenotype = '';
    @state() private row = 0;
    @state() private col = 0;

    // Date fields
    @state() private veg_start = '';
    @state() private flower_start = '';
    @state() private seedling_start = '';
    @state() private mother_start = '';
    @state() private clone_start = '';
    @state() private dry_start = '';
    @state() private cure_start = '';

    static styles = css`
    :host {
      display: block;
    }
    
    /* Copied from original styles */
    .glass-dialog-container {
      position: relative;
      padding: 0;
      background: rgba(20, 20, 20, 0.6);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-radius: 20px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
      overflow: hidden;
      width: 500px;
      max-width: 90vw;
      font-family: 'Roboto', sans-serif;
    }

    .dialog-header {
      padding: 20px 24px;
      background: rgba(255, 255, 255, 0.03);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .dialog-title {
      font-size: 1.25rem;
      font-weight: 500;
      color: #e0e0e0;
      margin: 0;
      letter-spacing: 0.5px;
    }

    .dialog-subtitle {
      font-size: 0.85rem;
      color: #9ca3af;
      margin-top: 4px;
    }

    .overview-grid {
      display: grid;
      gap: 16px;
      padding: 24px;
    }

    .detail-card {
      background: rgba(30, 30, 30, 0.5);
      border-radius: 12px;
      padding: 16px;
      border: 1px solid rgba(255, 255, 255, 0.05);
    }
    
    .detail-card h3 {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #6b7280;
      margin: 0 0 16px 0;
      font-weight: 600;
    }

    .button-group {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 20px 24px;
      background: rgba(0, 0, 0, 0.2);
      border-top: 1px solid rgba(255, 255, 255, 0.05);
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
      letter-spacing: 0.1px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.2s ease;
      position: relative;
      overflow: hidden;
    }

    .md3-button.text {
      color: #e0e0e0;
    }
    .md3-button.text:hover {
      background: rgba(255, 255, 255, 0.05);
    }

    .md3-button.tonal {
      background: rgba(255, 255, 255, 0.1);
      color: #e0e0e0;
    }
    .md3-button.tonal:hover {
      background: rgba(255, 255, 255, 0.15);
      box-shadow: 0 4px 8px rgba(0,0,0,0.2);
    }

    .md3-button.primary {
      background: #4CAF50;
      color: #003300;
    }
    .md3-button.primary:hover {
      box-shadow: 0 4px 12px rgba(76, 175, 80, 0.4);
      filter: brightness(1.1);
    }
  `;

    // Provide a method to set initial data from parent if needed
    public setInitialState(row: number, col: number, strain: string = '', phenotype: string = '') {
        this.row = row;
        this.col = col;
        this.strain = strain;
        this.phenotype = phenotype;
        // resetting dates
        this.veg_start = '';
        this.flower_start = '';
        this.seedling_start = '';
        this.mother_start = '';
        this.clone_start = '';
        this.dry_start = '';
        this.cure_start = '';
    }

    private _close() {
        this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
    }

    private _confirm() {
        const payload = {
            row: this.row,
            col: this.col,
            strain: this.strain,
            phenotype: this.phenotype,
            veg_start: this.veg_start,
            flower_start: this.flower_start,
            seedling_start: this.seedling_start,
            mother_start: this.mother_start,
            clone_start: this.clone_start,
            dry_start: this.dry_start,
            cure_start: this.cure_start,
        };

        this.dispatchEvent(new CustomEvent('add-plant-submit', {
            detail: payload,
            bubbles: true,
            composed: true
        }));
    }

    render() {
        if (!this.open) return html``;

        const uniqueStrains = [...new Set(this.strainLibrary.map(s => s.strain))].sort();

        return html`
    <ha-dialog
      open
      @closed=${this._close}
      hideActions
      .scrimClickAction=${''}
      .escapeKeyAction=${''}
    >
      <div class="glass-dialog-container" style="--stage-color: var(--plant-border-color-default)">

        <!-- HEADER -->
        <div class="dialog-header">
          <div class="dialog-title-group">
             <h2 class="dialog-title">Add New Plant</h2>
             <div class="dialog-subtitle">Enter plant details below</div>
          </div>
          <button class="md3-button text" @click=${this._close} style="min-width: auto; padding: 8px;">
             <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24">
               <path d="${mdiClose}"></path>
             </svg>
          </button>
        </div>

        <div class="overview-grid">
           <!-- IDENTITY CARD -->
           <div class="detail-card">
             <h3>Identity & Location</h3>
             ${DialogRenderer.renderMD3SelectInput('Strain *', this.strain, uniqueStrains, (v) => this.strain = v)}
             ${DialogRenderer.renderMD3TextInput('Phenotype', this.phenotype, (v) => this.phenotype = v)}
             <div style="display:flex; gap:16px;">
               ${DialogRenderer.renderMD3NumberInput('Row', this.row + 1, (v) => this.row = parseInt(v) - 1)}
               ${DialogRenderer.renderMD3NumberInput('Col', this.col + 1, (v) => this.col = parseInt(v) - 1)}
             </div>
           </div>

           <!-- TIMELINE CARD -->
           <div class="detail-card">
              ${this.renderTimelineContent()}
           </div>
        </div>

        <!-- ACTION BUTTONS -->
        <div class="button-group">
          <button class="md3-button tonal" @click=${this._close}>
            Cancel
          </button>
          <button class="md3-button primary" @click=${this._confirm}>
            <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiSprout}"></path></svg>
            Add Plant
          </button>
        </div>

      </div>
    </ha-dialog>
  `;
    }

    private renderTimelineContent() {
        const name = this.growspaceName.toLowerCase();

        if (name.includes('mother')) {
            return html`${DialogRenderer.renderMD3DateInput('Mother Start', this.mother_start, (v) => this.mother_start = v)}`;
        } else if (name.includes('clone')) {
            return html`${DialogRenderer.renderMD3DateInput('Clone Start', this.clone_start, (v) => this.clone_start = v)}`;
        } else if (name.includes('dry')) {
            return html`${DialogRenderer.renderMD3DateInput('Dry Start', this.dry_start, (v) => this.dry_start = v)}`;
        } else if (name.includes('cure')) {
            return html`${DialogRenderer.renderMD3DateInput('Cure Start', this.cure_start, (v) => this.cure_start = v)}`;
        } else {
            return html`
         ${DialogRenderer.renderMD3DateInput('Seedling Start', this.seedling_start, (v) => this.seedling_start = v)}
         ${DialogRenderer.renderMD3DateInput('Veg Start', this.veg_start, (v) => this.veg_start = v)}
         ${DialogRenderer.renderMD3DateInput('Flower Start', this.flower_start, (v) => this.flower_start = v)}
       `;
        }
    }
}
