import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { hassContext } from '../context';
import { HomeAssistant } from 'custom-card-helpers';
import { mdiClose, mdiSprout } from '@mdi/js';
import { StrainEntry } from '../types';
import { dialogStyles } from '../styles/dialog.styles';
import '../components/ui/md3-text-input';
import '../components/ui/md3-number-input';
import '../components/ui/md3-select';
import '../components/ui/md3-date-input';

@customElement('add-plant-dialog')
export class AddPlantDialog extends LitElement {
  @consume({ context: hassContext, subscribe: true })
  @property({ attribute: false })
  hass!: HomeAssistant;

  @property({ type: Array }) strainLibrary: StrainEntry[] = [];
  @property({ type: String }) growspaceName = '';
  @property({ type: Boolean, reflect: true }) open = false;

  // Initialize with values passed via methods or defaults
  @state() private strain = '';
  @state() private phenotype = '';
  @property({ type: Number }) row = 0;
  @property({ type: Number }) col = 0;

  // Date fields
  @state() private veg_start = '';
  @state() private flower_start = '';
  @state() private seedling_start = '';
  @state() private mother_start = '';
  @state() private clone_start = '';
  @state() private dry_start = '';
  @state() private cure_start = '';

  static styles = [
    dialogStyles,
    css`
      :host {
        display: block;
      }
      .overview-grid {
        padding: 24px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      @media (max-width: 450px) {
        .overview-grid {
          flex: 1;
          min-height: 0;
          padding: 16px;
        }
      }
    `
  ];

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
             <md3-select
               label="Strain *"
               .value=${this.strain}
               .options=${uniqueStrains}
               @change=${(e: CustomEvent) => this.strain = e.detail}
             ></md3-select>
             <md3-text-input
               label="Phenotype"
               .value=${this.phenotype}
               @change=${(e: CustomEvent) => this.phenotype = e.detail}
             ></md3-text-input>
             <div class="row-col-grid">
               <md3-number-input
                 label="Row"
                 .value=${this.row + 1}
                 @change=${(e: CustomEvent) => this.row = parseInt(e.detail) - 1}
               ></md3-number-input>
               <md3-number-input
                 label="Col"
                 .value=${this.col + 1}
                 @change=${(e: CustomEvent) => this.col = parseInt(e.detail) - 1}
               ></md3-number-input>
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
      return html`<md3-date-input label="Mother Start" .value=${this.mother_start} @change=${(e: CustomEvent) => this.mother_start = e.detail}></md3-date-input>`;
    } else if (name.includes('clone')) {
      return html`<md3-date-input label="Clone Start" .value=${this.clone_start} @change=${(e: CustomEvent) => this.clone_start = e.detail}></md3-date-input>`;
    } else if (name.includes('dry')) {
      return html`<md3-date-input label="Dry Start" .value=${this.dry_start} @change=${(e: CustomEvent) => this.dry_start = e.detail}></md3-date-input>`;
    } else if (name.includes('cure')) {
      return html`<md3-date-input label="Cure Start" .value=${this.cure_start} @change=${(e: CustomEvent) => this.cure_start = e.detail}></md3-date-input>`;
    } else {
      return html`
         <md3-date-input label="Seedling Start" .value=${this.seedling_start} @change=${(e: CustomEvent) => this.seedling_start = e.detail}></md3-date-input>
         <md3-date-input label="Veg Start" .value=${this.veg_start} @change=${(e: CustomEvent) => this.veg_start = e.detail}></md3-date-input>
         <md3-date-input label="Flower Start" .value=${this.flower_start} @change=${(e: CustomEvent) => this.flower_start = e.detail}></md3-date-input>
       `;
    }
  }
}
