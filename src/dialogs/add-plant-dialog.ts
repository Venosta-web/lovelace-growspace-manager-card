
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
    .glass-dialog-container {
      background: rgba(20, 20, 20, 0.6);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      max-height: 85vh;
      color: #fff;
      font-family: 'Roboto', sans-serif;
      box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
      width: 500px;
      max-width: 90vw;
    }
    .dialog-header {
      display: flex;
      align-items: center;
      padding: 16px 24px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      background: rgba(0, 0, 0, 0.2);
    }
    .dialog-icon {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.05);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 16px;
      color: var(--primary-color, #4CAF50);
    }
    .dialog-title-group {
      flex: 1;
    }
    .dialog-title {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 500;
    }
    .dialog-subtitle {
      font-size: 0.85rem;
      opacity: 0.7;
      margin-top: 2px;
    }
    .overview-grid {
      padding: 24px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .detail-card {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      padding: 16px;
      overflow: hidden;
      max-width: 100%;
      box-sizing: border-box;
    }
    .detail-card h3 {
      margin-top: 0;
      margin-bottom: 16px;
      font-size: 1rem;
      font-weight: 500;
      opacity: 0.9;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      padding-bottom: 8px;
    }
    .button-group {
      padding: 16px 24px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      background: rgba(0, 0, 0, 0.2);
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      flex-wrap: wrap;
    }

    @media (max-width: 450px) {
      .glass-dialog-container {
        width: 100vw;
        max-width: 100%;
        height: 100vh;
        border-radius: 0;
      }
      .overview-grid {
        flex: 1;
        min-height: 0;
        padding: 16px;
      }
      .dialog-header {
         padding: 12px 16px;
      }
      .button-group {
        justify-content: center;
      }
      .md3-button {
        flex: 1 1 auto;
        min-width: 100px;
      }
    }

    .md3-button {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 0 24px;
      height: 40px;
      border-radius: 20px;
      border: none;
      font-family: inherit;
      font-size: 0.9rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }
    .md3-button.text {
      background: transparent;
      color: rgba(255, 255, 255, 0.7);
      padding: 0 12px;
    }
    .md3-button.text:hover {
      background: rgba(255, 255, 255, 0.05);
      color: #fff;
    }
    .md3-button.tonal {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
    }
    .md3-button.tonal:hover {
      background: rgba(255, 255, 255, 0.15);
    }
    .md3-button.primary {
      background: var(--primary-color, #4CAF50);
      color: #fff;
    }
    .md3-button.primary:hover {
      filter: brightness(1.1);
      box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
    }
    
    .row-col-grid {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
    }
    .row-col-grid > * {
      flex: 1;
      min-width: 0;
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
      <div class="glass-dialog-container">

        <!-- HEADER -->
        <div class="dialog-header">
           <div class="dialog-icon">
              <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24">
                <path d="${mdiSprout}"></path>
              </svg>
           </div>
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
             <div class="row-col-grid">
               ${DialogRenderer.renderMD3NumberInput('Row', this.row + 1, (v) => this.row = parseInt(v) - 1)}
               ${DialogRenderer.renderMD3NumberInput('Col', this.col + 1, (v) => this.col = parseInt(v) - 1)}
             </div>
           </div>

           <!-- TIMELINE CARD -->
           <div class="detail-card">
              <h3>Timeline</h3>
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
