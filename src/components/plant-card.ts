import { LitElement, html, css, TemplateResult, PropertyValues } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { mdiSprout, mdiFlower, mdiHairDryer, mdiCannabis, mdiCheckboxMarked, mdiCheckboxBlankOutline } from '@mdi/js';
import { PlantEntity, StrainEntry } from '../types';
import { PlantUtils } from '../utils';
import { DialogRenderer } from '../dialog-renderer';

@customElement('growspace-plant-card')
export class GrowspacePlantCard extends LitElement {
  @property({ attribute: false }) public plant!: PlantEntity;
  @property({ type: Number }) public row!: number;
  @property({ type: Number }) public col!: number;
  @property({ attribute: false }) public strainLibrary: StrainEntry[] = [];
  @property({ type: Boolean }) public isEditMode = false;
  @property({ type: Boolean }) public selected = false;

  static styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }

    .plant-card-rich {
      position: relative;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      border-radius: 16px;
      overflow: hidden;
      /* Default background if no image */
      background: rgba(255, 255, 255, 0.05);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      cursor: pointer;
      aspect-ratio: 1;
      box-sizing: border-box;
    }

    .plant-card-rich:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
      border-color: rgba(255, 255, 255, 0.2);
    }
    .plant-card-rich:focus {
        outline: 2px solid var(--primary-color, #22c55e);
        outline-offset: 2px;
    }  

    .plant-card-bg {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-size: cover;
      z-index: 0;
    }

    .plant-card-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.6) 50%, rgba(0,0,0,0.3) 100%);
      z-index: 1;
    }

    .plant-card-checkbox {
      position: absolute;
      top: 8px;
      right: 8px;
      z-index: 10;
      background: rgba(0, 0, 0, 0.5);
      border-radius: 50%;
      padding: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .plant-card-checkbox:hover {
      background: rgba(0, 0, 0, 0.8);
      transform: scale(1.1);
    }

    .plant-card-content {
      position: relative;
      z-index: 2;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      gap: 16px;
      height: 100%;
      padding: 16px;
      box-sizing: border-box;
    }

    .pc-info {
      text-align: center;
      display: flex;
      flex-direction: column;
      gap: 4px;
      align-items: center;
    }

    .pc-strain-name {
      font-size: 1.1rem;
      font-weight: 700;
      color: #fff;
      text-shadow: 0 2px 4px rgba(0,0,0,0.8);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
    }

    .pc-pheno {
      font-size: 0.9rem;
      color: rgba(255,255,255,0.7);
      font-weight: 500;
    }

    .pc-stage {
      font-size: 1rem;
      font-weight: 600;
      margin-top: 8px;
      color: var(--stage-color);
      text-shadow: 0 1px 2px rgba(0,0,0,0.8);
      text-transform: capitalize;
    }

    .pc-stats {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
      padding: 0 12px;
      box-sizing: border-box;
    }

    .pc-stat-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
    }

    .pc-stat-item svg {
      width: 24px;
      height: 24px;
      fill: currentColor;
    }

    .pc-stat-text {
      font-size: 0.85rem;
      font-weight: 500;
      color: #fff;
    }
    
    .current-stage {
        /* Add any specific styles for current stage if needed, 
           though logic was mainly setting color in SVG which is handled in render */
    }

    .plant-card-rich.dragging {
      opacity: 0.5;
      transform: rotate(5deg);
    }
  `;

  private _handleDragStart(e: DragEvent) {
    if (this.isEditMode) {
      e.preventDefault();
      return;
    }

    const target = e.target as HTMLElement;
    target.classList.add('dragging');

    if (e.dataTransfer) {
      e.dataTransfer.setData("text/plain", JSON.stringify({ id: this.plant.entity_id }));
      e.dataTransfer.effectAllowed = 'move';
    }

    // Dispatch event to parent to track dragged plant state
    this.dispatchEvent(new CustomEvent('plant-drag-start', {
      detail: { plant: this.plant },
      bubbles: true,
      composed: true
    }));
  }

  private _handleDragEnd(e: DragEvent) {
    const target = e.target as HTMLElement;
    target.classList.remove('dragging');
  }

  private _handleDrop(e: DragEvent) {
    e.preventDefault();
    if (this.isEditMode) return;

    this.dispatchEvent(new CustomEvent('plant-drop', {
      detail: {
        originalEvent: e,
        row: this.row,
        col: this.col,
        plant: this.plant
      },
      bubbles: true,
      composed: true
    }));
  }

  private _handleDragOver(e: DragEvent) {
    e.preventDefault();
    // Optional: Add visual feedback
  }

  private _handleClick() {
    this.dispatchEvent(new CustomEvent('plant-click', {
      detail: { plant: this.plant },
      bubbles: true,
      composed: true
    }));
  }

  private _toggleSelection(e: Event) {
    e.stopPropagation();
    this.dispatchEvent(new CustomEvent('plant-toggle-selection', {
      detail: { plant: this.plant },
      bubbles: true,
      composed: true
    }));
  }

  private renderPlantDaysRich(plant: PlantEntity): TemplateResult {
    const days = [
      { days: plant.attributes?.seedling_days, icon: mdiSprout, title: "Seedling", stage: "seedling" },
      { days: plant.attributes?.mother_days, icon: mdiSprout, title: "Mother", stage: "mother" },
      { days: plant.attributes?.clone_days, icon: mdiSprout, title: "Clone", stage: "clone" },
      { days: plant.attributes?.veg_days, icon: mdiSprout, title: "Veg", stage: "vegetative" },
      { days: plant.attributes?.flower_days, icon: mdiFlower, title: "Flower", stage: "flower" },
      { days: plant.attributes?.dry_days, icon: mdiHairDryer, title: "Dry", stage: "dry" },
      { days: plant.attributes?.cure_days, icon: mdiCannabis, title: "Cure", stage: "cure" }
    ].filter(d => d.days !== undefined && d.days !== null);

    const visibleDays = days.filter(d => d.days);

    const currentStage = (plant.state || '').toLowerCase();
    const normalizedCurrent = currentStage === 'veg' ? 'vegetative' : currentStage;

    return html`
      ${visibleDays.map(d => {
      const color = PlantUtils.getPlantStageColor(d.stage);
      const isCurrent = d.stage === normalizedCurrent;

      return html`
          <div class="pc-stat-item ${isCurrent ? 'current-stage' : ''}">
            <svg style="color: ${color};" viewBox="0 0 24 24"><path d="${d.icon}"></path></svg>
            <div class="pc-stat-text">${d.days}d</div>
          </div>
        `;
    })}
    `;
  }

  render() {
    if (!this.plant) return html``;

    const stageColor = PlantUtils.getPlantStageColor(this.plant.state);
    const strainName = this.plant.attributes?.strain;
    const pheno = this.plant.attributes?.phenotype;

    let imageUrl: string | undefined;
    let imageCropMeta: any | undefined;

    if (strainName) {
      const phenoMatch = this.strainLibrary.find(s => s.strain === strainName && s.phenotype === pheno);
      if (phenoMatch && phenoMatch.image) {
        imageUrl = phenoMatch.image;
        imageCropMeta = phenoMatch.image_crop_meta;
      } else {
        const strainMatch = this.strainLibrary.find(s => s.strain === strainName && (!s.phenotype || s.phenotype === 'default'));
        if (strainMatch && strainMatch.image) {
          imageUrl = strainMatch.image;
          imageCropMeta = strainMatch.image_crop_meta;
        } else if (!imageUrl) {
          const anyMatch = this.strainLibrary.find(s => s.strain === strainName && s.image);
          if (anyMatch) {
            imageUrl = anyMatch.image;
            imageCropMeta = anyMatch.image_crop_meta;
          }
        }
      }
    }

    return html`
      <div
        class="plant-card-rich"
        style="--stage-color: ${stageColor}"
        draggable="true"
        @dragstart=${this._handleDragStart}
        @dragend=${this._handleDragEnd}
        @dragover=${this._handleDragOver}
        @drop=${this._handleDrop}
        @click=${this._handleClick}
      >
        ${imageUrl ? html`
          <img 
            class="plant-card-bg" 
            src="${imageUrl}" 
            loading="lazy" 
            alt="${strainName || 'Plant'}"
            style="${DialogRenderer.getImgStyle(imageCropMeta)}"
          />
          <div class="plant-card-overlay"></div>
        ` : ''}

        ${this.isEditMode ? html`
          <div class="plant-card-checkbox ${this.selected ? 'selected' : ''}" @click=${this._toggleSelection}>
             <svg viewBox="0 0 24 24" style="width: 24px; height: 24px; fill: ${this.selected ? 'var(--primary-color)' : 'rgba(255,255,255,0.7)'};">
               <path d="${this.selected ? mdiCheckboxMarked : mdiCheckboxBlankOutline}"></path>
             </svg>
          </div>
        ` : ''}

        <div class="plant-card-content">
          <div class="pc-info">
            <div class="pc-strain-name" title="${this.plant.attributes?.strain || ''}">
              ${this.plant.attributes?.strain || 'Unknown Strain'}
            </div>
            ${this.plant.attributes?.phenotype ? html`<div class="pc-pheno">${this.plant.attributes.phenotype}</div>` : ''}
            <div class="pc-stage">
              ${this.plant.state || 'Unknown'}
            </div>
          </div>

          <div class="pc-stats">
            ${this.renderPlantDaysRich(this.plant)}
          </div>
        </div>
      </div>
    `;
  }
}
