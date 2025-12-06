import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import {
  mdiClose, mdiPencil, mdiDelete, mdiCheck, mdiContentCopy, mdiFlower,
  mdiCannabis, mdiArrowRight, mdiSprout, mdiHairDryer
} from '@mdi/js';
import { PlantEntity, PlantOverviewDialogState, PlantAttributeValue } from '../types';
import { PlantUtils } from '../utils';
import { DialogRenderer } from '../dialog-renderer'; // We might need to keep using static helpers for inputs for now, or move them too.

@customElement('plant-overview-dialog')
export class PlantOverviewDialog extends LitElement {
  @property({ attribute: false }) dialog: PlantOverviewDialogState | null = null;
  @property({ attribute: false }) growspaceOptions: Record<string, string> = {};

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
      color: var(--stage-color, #4CAF50);
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
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
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
      background: var(--primary-color, #2196F3);
      color: #fff;
    }
    .md3-button.primary:hover {
      filter: brightness(1.1);
      box-shadow: 0 4px 12px rgba(33, 150, 243, 0.3);
    }
    .md3-button.danger {
      background: rgba(244, 67, 54, 0.1);
      color: #f44336;
    }
    .md3-button.danger:hover {
      background: rgba(244, 67, 54, 0.2);
    }
    .md3-input {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: #fff;
        border-radius: 4px;
        padding: 8px;
    }
    /* Add other styles from dialog-renderer as needed */
    .row-col-grid {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
    }
    .row-col-grid > * {
      flex: 1;
      min-width: 0; /* Critical for flex items to shrink below minimum content size */
    }

    @media (max-width: 450px) {
      .overview-grid {
        flex: 1;
        min-height: 0;
        padding: 8px;
      }
      .dialog-title-group {
        flex: 5;
        text-align: center;
      }
      .button-group {
        justify-content: center;
      }
      .detail-card  {
        overflow: unset
      }
      .dialog-header .md3-button.text {
        flex: 0;
      }
      .detail-card .md3-button {
        flex: 1 1 1;
      }
      .button-group .md3-button {
        flex: 1 1 auto;
        min-width: 100px;
      }
    }
  `;

  private _close() {
    this.dispatchEvent(new CustomEvent('close'));
  }

  private _update() {
    this.dispatchEvent(new CustomEvent('update'));
  }

  private _delete(plantId: string) {
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

  private _moveClone(plant: PlantEntity, targetGrowspace: string) {
    this.dispatchEvent(new CustomEvent('move-clone', { detail: { plant, targetGrowspace } }));
  }

  private _attributeChange(key: string, value: any) {
    this.dispatchEvent(new CustomEvent('attribute-change', { detail: { key, value } }));
  }

  private _toggleShowAllDates() {
    this.dispatchEvent(new CustomEvent('toggle-show-all-dates'));
  }

  render() {
    if (!this.dialog) return html``;

    const { plant, editedAttributes, selectedPlantIds } = this.dialog;
    const plantId = plant.attributes?.plant_id || plant.entity_id.replace('sensor.', '');
    const stageColor = PlantUtils.getPlantStageColor(plant.state);
    const stageIcon = PlantUtils.getPlantStageIcon(plant.state);
    const isBulkEdit = selectedPlantIds && selectedPlantIds.length > 1;

    return html`
      <ha-dialog
        open
        @closed=${this._close}
        hideActions
        .scrimClickAction=${''}
        .escapeKeyAction=${''}
      >
        <div class="glass-dialog-container" style="--stage-color: ${stageColor}">

          <!-- BULK EDIT BANNER -->
          ${isBulkEdit ? html`
            <div style="
              background: rgba(34, 197, 94, 0.1);
              border: 1px solid rgba(34, 197, 94, 0.3);
              border-radius: 8px;
              padding: 12px 16px;
              margin-bottom: 16px;
              color: #22c55e;
              display: flex;
              align-items: center;
              gap: 12px;
            ">
              <svg style="width:20px;height:20px;fill:currentColor;" viewBox="0 0 24 24">
                <path d="${mdiPencil}"></path>
              </svg>
              <div>
                <strong>Bulk Editing ${selectedPlantIds!.length} Plants</strong>
                <div style="font-size: 0.85rem; opacity: 0.8; margin-top: 4px;">
                  Only date fields can be edited in bulk mode. Identity & location fields are protected.
                </div>
              </div>
            </div>
          ` : nothing}

          <!-- HEADER -->
          <div class="dialog-header">
            <div class="dialog-icon">
              <svg style="width:32px;height:32px;fill:currentColor;" viewBox="0 0 24 24">
                <path d="${stageIcon}"></path>
              </svg>
            </div>
            <div class="dialog-title-group">
               <h2 class="dialog-title">${editedAttributes.strain || 'Unknown Strain'}</h2>
               <div class="dialog-subtitle">${plant.state} Stage • ${editedAttributes.phenotype || 'No Phenotype'}</div>
            </div>
            <button class="md3-button text" @click=${this._close} style="min-width: auto; padding: 8px;">
               <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24">
                 <path d="${mdiClose}"></path>
               </svg>
            </button>
          </div>

          <div class="overview-grid">
             <!-- IDENTITY & LOCATION CARD -->
             <div class="detail-card" style="${isBulkEdit ? 'opacity: 0.5; pointer-events: none;' : ''}">
               <h3>Identity & Location ${isBulkEdit ? '(Read-only in bulk mode)' : ''}</h3>
               ${DialogRenderer.renderMD3TextInput('Strain Name', editedAttributes.strain || '', (v) => this._attributeChange('strain', v))}
               ${DialogRenderer.renderMD3TextInput('Phenotype', editedAttributes.phenotype || '', (v) => this._attributeChange('phenotype', v))}
               <div class="row-col-grid">
                 ${DialogRenderer.renderMD3NumberInput('Row', editedAttributes.row || 1, (v) => this._attributeChange('row', parseInt(v)))}
                 ${DialogRenderer.renderMD3NumberInput('Col', editedAttributes.col || 1, (v) => this._attributeChange('col', parseInt(v)))}
               </div>
             </div>

             <!-- TIMELINE CARD -->
             <div class="detail-card">
               <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                 <h3 style="margin: 0;">Timeline</h3>
                 <button class="md3-button text" style="min-width: auto; padding: 4px;" @click=${this._toggleShowAllDates}>
                    <svg style="width:20px;height:20px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiPencil}"></path></svg>
                 </button>
               </div>
               
               ${this.dialog!.showAllDates ? html`
                  ${DialogRenderer.renderMD3DateTimeInput('Seedling Start', editedAttributes.seedling_start ?? '', (v) => this._attributeChange('seedling_start', v))}
                  ${DialogRenderer.renderMD3DateTimeInput('Mother Start', editedAttributes.mother_start ?? '', (v) => this._attributeChange('mother_start', v))}
                  ${DialogRenderer.renderMD3DateTimeInput('Clone Start', editedAttributes.clone_start ?? '', (v) => this._attributeChange('clone_start', v))}
                  ${DialogRenderer.renderMD3DateTimeInput('Vegetative Start', editedAttributes.veg_start ?? '', (v) => this._attributeChange('veg_start', v))}
                  ${DialogRenderer.renderMD3DateTimeInput('Flower Start', editedAttributes.flower_start ?? '', (v) => this._attributeChange('flower_start', v))}
                  ${DialogRenderer.renderMD3DateTimeInput('Dry Start', editedAttributes.dry_start ?? '', (v) => this._attributeChange('dry_start', v))}
                  ${DialogRenderer.renderMD3DateTimeInput('Cure Start', editedAttributes.cure_start ?? '', (v) => this._attributeChange('cure_start', v))}
               ` : html`
                  ${editedAttributes.stage === 'mother'
          ? DialogRenderer.renderMD3DateTimeInput('Mother Start', editedAttributes.mother_start ?? '', (v) => this._attributeChange('mother_start', v))
          : nothing}
                  ${editedAttributes.stage === 'clone'
          ? DialogRenderer.renderMD3DateTimeInput('Clone Start', editedAttributes.clone_start ?? '', (v) => this._attributeChange('clone_start', v))
          : nothing}
                  ${editedAttributes.stage === 'veg' || editedAttributes.stage === 'flower'
          ? DialogRenderer.renderMD3DateTimeInput('Vegetative Start', editedAttributes.veg_start ?? '', (v) => this._attributeChange('veg_start', v))
          : nothing}
                  ${editedAttributes.stage === 'flower'
          ? DialogRenderer.renderMD3DateTimeInput('Flower Start', editedAttributes.flower_start ?? '', (v) => this._attributeChange('flower_start', v))
          : nothing}
                  ${editedAttributes.stage === 'dry' || editedAttributes.stage === 'cure'
          ? DialogRenderer.renderMD3DateTimeInput('Dry Start', editedAttributes.dry_start ?? '', (v) => this._attributeChange('dry_start', v))
          : nothing}
                  ${editedAttributes.stage === 'cure'
          ? DialogRenderer.renderMD3DateTimeInput('Cure Start', editedAttributes.cure_start ?? '', (v) => this._attributeChange('cure_start', v))
          : nothing}
               `}
             </div>

             <!-- STATS CARD -->
             ${DialogRenderer.renderPlantStatsMD3(plant)}

          </div>

          <!-- ACTION BUTTONS -->
          <div class="button-group">
             <button class="md3-button danger" @click=${() => this._delete(plantId)}>
               <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiDelete}"></path></svg>
               Delete
             </button>

             <button class="md3-button tonal" @click=${this._update}>
               <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiCheck}"></path></svg>
               Save Changes
             </button>

             <!-- DYNAMIC ACTIONS BASED ON STAGE -->
             ${plant.state.toLowerCase() === 'mother' ? html`
                <div class="take-clone-container" style="display:contents;" data-plant-id="${plant.entity_id}">
                  <!-- Ideally this input should be styled nicely too, but for now inline -->
                   <input
                    type="number"
                    min="1"
                    max="10"
                    value="1"
                    class="num-clones-input md3-input"
                    style="width: 60px; height: 40px; background: rgba(255,255,255,0.05); border-radius: 8px; text-align:center; padding:0;"
                  >
                  <button class="md3-button primary"
                    @click=${(e: MouseEvent) => {
          const btn = e.currentTarget as HTMLElement;
          // Find the input sibling (since we used display:contents, they are siblings in the flex container)
          const input = btn.previousElementSibling as HTMLInputElement;
          const numClones = input ? parseInt(input.value, 10) : 1;
          this._takeClone(plant, numClones);
        }}
                  >
                    <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiContentCopy}"></path></svg>
                    Take Clone
                  </button>
                </div>
             ` : nothing}

             ${plant.state.toLowerCase() === 'flower' ? html`
               <button class="md3-button primary" @click=${() => this._harvest(plant)}>
                 <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiFlower}"></path></svg>
                 Harvest
               </button>
             ` : nothing}

             ${plant.state.toLowerCase() === 'dry' ? html`
               <button class="md3-button primary" @click=${() => this._finishDrying(plant)}>
                 <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiCannabis}"></path></svg>
                 Finish Drying
               </button>
             ` : nothing}

             ${plant.state.toLowerCase() === 'clone' ? html`
               <div style="display:contents;">
                  <select class="md3-input" style="width: auto; height: 40px; background: rgba(255,255,255,0.05); border-radius: 20px; padding: 0 16px;" id="clone-target-select">
                    <option value="">Move to...</option>
                    ${Object.entries(this.growspaceOptions).map(([id, name]) => html`<option value="${id}">${name}</option>`)}
                  </select>
                  <button class="md3-button primary"
                    @click=${(e: MouseEvent) => {
          const btn = e.currentTarget as HTMLElement;
          const select = btn.previousElementSibling as HTMLSelectElement;
          if (!select.value) { alert('Select a growspace'); return; }
          this._moveClone(plant, select.value);
        }}
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
