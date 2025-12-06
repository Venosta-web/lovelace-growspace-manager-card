import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import {
  mdiClose, mdiPencil,
  mdiFlower, mdiContentCopy, mdiCheck,
  mdiDelete, mdiCannabis, mdiArrowRight
} from '@mdi/js';
import { HomeAssistant } from 'custom-card-helpers';
import { PlantEntity, PlantOverviewEditedAttributes, PlantOverviewDialogState } from '../types';
import { PlantUtils } from '../utils';
import { dialogStyles } from '../styles/dialog.styles';
import '../components/ui/md3-text-input';
import '../components/ui/md3-number-input';
import '../components/ui/md3-select';
import '../components/ui/md3-date-input';

@customElement('plant-overview-dialog')
export class PlantOverviewDialog extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;
  @property({ type: Boolean, reflect: true }) open = false;
  @property({ attribute: false }) dialog?: PlantOverviewDialogState;
  @property({ type: Object }) plant?: PlantEntity;
  @property({ type: Object }) growspaceOptions: Record<string, string> = {};

  @state() private editedAttributes: PlantOverviewEditedAttributes = {};
  @state() private isEditing = true;
  @state() private showAllDates = false;
  @state() private cloneTargetId = '';

  willUpdate(changedProps: Map<string, any>) {
    if (changedProps.has('dialog') && this.dialog) {
      this.plant = this.dialog.plant;
      this.editedAttributes = this.dialog.editedAttributes || {
        strain: this.plant?.attributes.strain,
        phenotype: this.plant?.attributes.phenotype,
        stage: this.plant?.state,
        veg_start: this.plant?.attributes.veg_start,
        flower_start: this.plant?.attributes.flower_start,
        seedling_start: this.plant?.attributes.seedling_start,
        mother_start: this.plant?.attributes.mother_start,
        clone_start: this.plant?.attributes.clone_start,
        dry_start: this.plant?.attributes.dry_start,
        cure_start: this.plant?.attributes.cure_start,
      };
      this.cloneTargetId = '';
    }
  }

  static styles = [
    dialogStyles,
    css`
      :host {
        display: block;
      }
      
      .overview-grid {
        padding: 24px;
        overflow-y: auto;
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 16px;
      }

      /* Timeline Styles */
      .timeline {
        position: relative;
        padding-left: 24px;
        border-left: 2px solid rgba(255, 255, 255, 0.1);
        margin-top: 16px;
      }
      .timeline-event {
        margin-bottom: 24px;
        position: relative;
      }
      .timeline-event::before {
        content: '';
        position: absolute;
        left: -31px;
        top: 0;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: var(--event-color, #4CAF50);
        border: 2px solid #2c2c2c;
      }
      .timeline-date {
        font-size: 0.8rem;
        opacity: 0.6;
        margin-bottom: 4px;
      }
      .timeline-content {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        padding: 12px;
      }

      /* Stat Grid */
      .stat-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
        gap: 12px;
      }
      .stat-item {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        padding: 12px;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
      }
      .stat-value {
        font-size: 1.1rem;
        font-weight: 500;
      }
      .stat-label {
        font-size: 0.75rem;
        opacity: 0.7;
      }

      /* Image Gallery */
      .image-gallery {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
        gap: 8px;
        margin-top: 12px;
      }
      .plant-image {
        width: 100%;
        aspect-ratio: 1;
        object-fit: cover;
        border-radius: 8px;
        cursor: pointer;
        transition: transform 0.2s;
        border: 1px solid rgba(255, 255, 255, 0.1);
      }
      .plant-image:hover {
        transform: scale(1.05);
      }
      
      .md3-input-group {
        display: flex;
        flex-direction: column;
        gap: 4px;
        flex: 1;
        margin-bottom: 12px;
      }

      @media(max-width: 600px) {
        .overview-grid {
          grid-template-columns: 1fr;
          padding: 16px;
        }
      }
      @media(max-width: 450px) {
        .glass-dialog-container {
          border-radius: 0;
          width: 100vw;
          height: 100vh;
          max-width: 100%;
        }
        .overview-grid {
          padding: 16px;
          display: flex;
          flex-direction: column;
        }
        .dialog-header {
          padding: 12px 16px;
        }
      }
    `
  ];



  private _close() {
    this.dispatchEvent(new CustomEvent('close'));
  }

  private _update() {
    this.dispatchEvent(new CustomEvent('update', { detail: this.editedAttributes }));
  }

  private _delete(plantId: string) {
    if (!confirm('Are you sure you want to delete this plant? This action cannot be undone.')) return;
    this.dispatchEvent(new CustomEvent('delete', { detail: { plantId } }));
  }

  private _harvest(plant: PlantEntity) {
    this.dispatchEvent(new CustomEvent('harvest', { detail: { plant } }));
  }

  private _finishDrying(plant: PlantEntity) {
    this.dispatchEvent(new CustomEvent('finish-drying', { detail: { plant } }));
  }

  private _takeClone(plant: PlantEntity, numClones: number) {
    this.dispatchEvent(new CustomEvent('take-clone', { detail: { plant, numClones } }));
  }

  private _moveClone(plant: PlantEntity) {
    if (!this.cloneTargetId) {
      // alert is not ideal but keeping for now as per previous logic
      alert('Select a growspace');
      return;
    }
    this.dispatchEvent(new CustomEvent('move-clone', { detail: { plant, targetGrowspace: this.cloneTargetId } }));
  }

  private _attributeChange(key: string, value: any) {
    this.editedAttributes = { ...this.editedAttributes, [key]: value };
    this.requestUpdate();
  }

  private _toggleShowAllDates() {
    this.showAllDates = !this.showAllDates;
  }

  private _renderStatItem(label: string, value: any, unit: string = '') {
    if (value === undefined || value === null || value === '') return nothing;
    return html`
        <div class="stat-item">
            <span class="stat-value">${value} ${unit}</span>
            <span class="stat-label">${label}</span>
        </div>
      `;
  }

  private _renderPlantStats(plant: PlantEntity) {
    if (!plant.attributes) return nothing;

    const currentStage = (plant.state || '').toLowerCase();
    const normalize = (s: string) => {
      if (s === 'veg') return 'vegetative';
      if (s === 'mom') return 'mother';
      return s;
    };
    const normCurrent = normalize(currentStage);

    const stats = [
      { label: 'Vegetative Days', value: plant.attributes.veg_days, unit: 'days', stage: 'vegetative' },
      { label: 'Flowering Days', value: plant.attributes.flower_days, unit: 'days', stage: 'flower' },
      { label: 'Mother Days', value: plant.attributes.mom_days, unit: 'days', stage: 'mother' },
      { label: 'Clone Days', value: plant.attributes.clone_days, unit: 'days', stage: 'clone' },
      { label: 'Drying Days', value: plant.attributes.dry_days, unit: 'days', stage: 'dry' },
      { label: 'Curing Days', value: plant.attributes.cure_days, unit: 'days', stage: 'cure' },
    ].filter(s => {
      if (s.value === undefined || s.value === null) return false;
      const val = Number(s.value);
      if (val > 0) return true;
      // Show if 0 but it's the current stage
      return s.stage === normCurrent;
    });

    if (stats.length === 0) return nothing;

    return html`
        <div class="detail-card">
            <h3>Days in Stage</h3>
            <div class="stat-grid">
               ${stats.map(s => this._renderStatItem(s.label, s.value, s.unit))}
            </div>
        </div>
      `;
  }

  render() {
    if (!this.plant) return html``;

    const plantId = this.plant.attributes?.plant_id || this.plant.entity_id.replace('sensor.', '');
    const stageColor = PlantUtils.getPlantStageColor(this.plant.state);
    const stageIcon = PlantUtils.getPlantStageIcon(this.plant.state);
    const isBulkEdit = false;

    return html`
      <ha-dialog
        open
        @closed=${this._close}
        hideActions
        .scrimClickAction=${''}
        .escapeKeyAction=${''}
      >
        <div class="glass-dialog-container" style="--stage-color: ${stageColor}">
        
          <!-- HEADER -->
          <div class="dialog-header">
            <div class="dialog-icon">
              <svg style="width:32px;height:32px;fill:currentColor;" viewBox="0 0 24 24">
                <path d="${stageIcon}"></path>
              </svg>
            </div>
            <div class="dialog-title-group">
              <h2 class="dialog-title">${this.editedAttributes.strain || 'Unknown Strain'}</h2>
              <div class="dialog-subtitle">${this.plant.state} Stage • ${this.editedAttributes.phenotype || 'No Phenotype'}</div>
            </div>
            <button class="md3-button text" @click=${this._close} style="min-width: auto; padding: 8px;">
               <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24">
                 <path d="${mdiClose}"></path>
               </svg>
            </button>
          </div>

          <div class="overview-grid">
             <!-- IDENTITY & LOCATION CARD -->
             <div class="detail-card">
                <h3>Identity & Location</h3>
                ${this.isEditing ? html`
                   <md3-text-input
                     label="Strain Name"
                     .value=${this.editedAttributes.strain || ''}
                     @change=${(e: CustomEvent) => this._attributeChange('strain', e.detail)}
                   ></md3-text-input>
                   <md3-text-input
                     label="Phenotype"
                     .value=${this.editedAttributes.phenotype || ''}
                     @change=${(e: CustomEvent) => this._attributeChange('phenotype', e.detail)}
                   ></md3-text-input>
                ` : html`
                   <div class="stat-grid">
                      <div class="stat-item">
                        <span class="stat-value">${this.plant.attributes.strain}</span>
                        <span class="stat-label">Strain</span>
                      </div>
                      <div class="stat-item">
                        <span class="stat-value">${this.plant.attributes.phenotype || 'N/A'}</span>
                        <span class="stat-label">Phenotype</span>
                      </div>
                   </div>
                `}
             </div>
             <!-- STATS CARD -->
             ${this._renderPlantStats(this.plant)}
             
             <!-- TIMELINE CARD -->
             <div class="detail-card">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                  <h3 style="margin: 0;">Timeline</h3>
                  <button class="md3-button text" style="min-width: auto; padding: 4px;" @click=${this._toggleShowAllDates}>
                    <svg style="width:20px;height:20px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiPencil}"></path></svg>
                  </button>
                </div>
                
                ${this.showAllDates ? html`
                   <md3-date-input label="Seedling Start" .value=${this.editedAttributes.seedling_start ?? ''} ?time=${true} @change=${(e: CustomEvent) => this._attributeChange('seedling_start', e.detail)}></md3-date-input>
                   <md3-date-input label="Mother Start" .value=${this.editedAttributes.mother_start ?? ''} ?time=${true} @change=${(e: CustomEvent) => this._attributeChange('mother_start', e.detail)}></md3-date-input>
                   <md3-date-input label="Clone Start" .value=${this.editedAttributes.clone_start ?? ''} ?time=${true} @change=${(e: CustomEvent) => this._attributeChange('clone_start', e.detail)}></md3-date-input>
                   <md3-date-input label="Vegetative Start" .value=${this.editedAttributes.veg_start ?? ''} ?time=${true} @change=${(e: CustomEvent) => this._attributeChange('veg_start', e.detail)}></md3-date-input>
                   <md3-date-input label="Flower Start" .value=${this.editedAttributes.flower_start ?? ''} ?time=${true} @change=${(e: CustomEvent) => this._attributeChange('flower_start', e.detail)}></md3-date-input>
                   <md3-date-input label="Dry Start" .value=${this.editedAttributes.dry_start ?? ''} ?time=${true} @change=${(e: CustomEvent) => this._attributeChange('dry_start', e.detail)}></md3-date-input>
                   <md3-date-input label="Cure Start" .value=${this.editedAttributes.cure_start ?? ''} ?time=${true} @change=${(e: CustomEvent) => this._attributeChange('cure_start', e.detail)}></md3-date-input>
                ` : html`
                   ${this.editedAttributes.stage === 'mother' ? html`
                       <md3-date-input label="Mother Start" .value=${this.editedAttributes.mother_start ?? ''} ?time=${true} @change=${(e: CustomEvent) => this._attributeChange('mother_start', e.detail)}></md3-date-input>
                   ` : nothing}
                   ${this.editedAttributes.stage === 'clone' ? html`
                       <md3-date-input label="Clone Start" .value=${this.editedAttributes.clone_start ?? ''} ?time=${true} @change=${(e: CustomEvent) => this._attributeChange('clone_start', e.detail)}></md3-date-input>
                   ` : nothing}
                   ${this.editedAttributes.stage === 'veg' || this.editedAttributes.stage === 'flower' ? html`
                       <md3-date-input label="Vegetative Start" .value=${this.editedAttributes.veg_start ?? ''} ?time=${true} @change=${(e: CustomEvent) => this._attributeChange('veg_start', e.detail)}></md3-date-input>
                   ` : nothing}
                   ${this.editedAttributes.stage === 'flower' ? html`
                       <md3-date-input label="Flower Start" .value=${this.editedAttributes.flower_start ?? ''} ?time=${true} @change=${(e: CustomEvent) => this._attributeChange('flower_start', e.detail)}></md3-date-input>
                   ` : nothing}
                   ${this.editedAttributes.stage === 'dry' || this.editedAttributes.stage === 'cure' ? html`
                       <md3-date-input label="Dry Start" .value=${this.editedAttributes.dry_start ?? ''} ?time=${true} @change=${(e: CustomEvent) => this._attributeChange('dry_start', e.detail)}></md3-date-input>
                   ` : nothing}
                   ${this.editedAttributes.stage === 'cure' ? html`
                       <md3-date-input label="Cure Start" .value=${this.editedAttributes.cure_start ?? ''} ?time=${true} @change=${(e: CustomEvent) => this._attributeChange('cure_start', e.detail)}></md3-date-input>
                   ` : nothing}
                `}
             </div>
            
          </div>

          <!-- ACTION BUTTONS -->
          <div class="button-group" style="padding: 16px 24px;">
             <button class="md3-button danger" @click=${() => this._delete(plantId)}>
                <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiDelete}"></path></svg>
                Delete
             </button>

             <button class="md3-button tonal" @click=${this._update}>
                <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiCheck}"></path></svg>
                Save
             </button>

             <!-- DYNAMIC ACTIONS -->
             ${this.plant.state.toLowerCase() === 'mother' ? html`
                 <div class="take-clone-container" style="display:contents;" data-plant-id="${this.plant.entity_id}">
                    <md3-number-input
                      .min=${1}
                      .max=${10}
                      .value=${1}
                      id="clone-count-input"
                      style="width: 80px;"
                    ></md3-number-input>
                    <button class="md3-button primary"
                      @click=${(e: MouseEvent) => {
          const btn = e.currentTarget as HTMLElement;
          const container = btn.parentElement;
          const inputEl = container?.querySelector('md3-number-input') as any;
          const numClones = inputEl ? Number(inputEl.value) : 1;
          this._takeClone(this.plant!, numClones);
        }}
                    >
                      <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiContentCopy}"></path></svg>
                      Take Clone
                    </button>
                 </div>
             ` : nothing}

             ${this.plant.state.toLowerCase() === 'flower' ? html`
                <button class="md3-button primary" @click=${() => this._harvest(this.plant!)}>
                  <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiFlower}"></path></svg>
                  Harvest
                </button>
             ` : nothing}

             ${this.plant.state.toLowerCase() === 'dry' ? html`
                <button class="md3-button primary" @click=${() => this._finishDrying(this.plant!)}>
                  <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiCannabis}"></path></svg>
                  Finish Drying
                </button>
             ` : nothing}
             
             ${this.plant.state.toLowerCase() === 'clone' ? html`
                <div style="display:contents; display:flex; gap: 8px; align-items: center;">
                     <md3-select
                       .options=${Object.entries(this.growspaceOptions).map(([id, name]) => ({ label: name, value: id }))}
                       .value=${this.cloneTargetId}
                       @change=${(e: CustomEvent) => this.cloneTargetId = e.detail}
                       style="min-width: 150px;"
                     ></md3-select>
                     <button class="md3-button primary"
                       @click=${() => this._moveClone(this.plant!)}
                     >
                       <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiArrowRight}"></path></svg>
                       Move
                     </button>
                </div>
             ` : nothing}
          </div>
        </div>
      </ha-dialog>
    `;
  }
}
