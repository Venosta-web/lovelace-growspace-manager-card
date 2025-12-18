import { LitElement, html, css, TemplateResult, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { styleMap } from 'lit/directives/style-map.js';
import { consume } from '@lit/context';
import { strainLibraryContext } from '../context';
import {
  mdiSprout,
  mdiFlower,
  mdiHairDryer,
  mdiCannabis,
  mdiCheckboxMarked,
  mdiCheckboxBlankOutline,
} from '@mdi/js';
import { PlantEntity, StrainEntry, PlantStage, STAGE_CONFIG } from '../types';
import { PlantUtils } from '../utils/plant-utils';
import { sharedStyles } from '../styles/shared.styles';

interface StageDisplay {
  days: number;
  icon: string;
  title: string;
  stage: PlantStage;
  isCurrent: boolean;
  color: string;
}

interface PlantDisplayData {
  stageColor: string;
  strainName: string;
  pheno: string;
  imageUrl?: string;
  imageCropMeta?: any;
  stages: StageDisplay[];
}

@customElement('growspace-plant-card')
export class GrowspacePlantCard extends LitElement {
  @property({ attribute: false }) accessor plant!: PlantEntity;
  @property({ type: Number }) accessor row!: number;
  @property({ type: Number }) accessor col!: number;

  @consume({ context: strainLibraryContext, subscribe: true })
  accessor strainLibrary: StrainEntry[] = [];

  @property({ type: Boolean }) accessor isEditMode = false;
  @property({ type: Boolean }) accessor selected = false;

  @state() accessor _displayData: PlantDisplayData | null = null;
  @state() accessor _longPressTimer: number | undefined;
  @state() accessor _isDraggingMobile = false;

  private _startX = 0;
  private _startY = 0;
  private _initialLeft = 0;
  private _initialTop = 0;

  static styles = [
    sharedStyles,
    css`
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
      background: var(--glass-bg);
      backdrop-filter: var(--glass-blur);
      -webkit-backdrop-filter: var(--glass-blur);
      border: var(--glass-border);
      box-shadow: var(--ha-card-box-shadow, 0 4px 6px rgba(0, 0, 0, 0.1));
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      cursor: pointer;
      aspect-ratio: 1;
      box-sizing: border-box;
      color: var(--primary-text-color);
    }

    .plant-card-rich:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
      border-color: var(--primary-color, rgba(255, 255, 255, 0.2));
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
      transition: filter 0.3s ease;
    }

    .plant-card-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(
        to top,
        rgba(0, 0, 0, 0.9) 0%,
        rgba(0, 0, 0, 0.6) 50%,
        rgba(0, 0, 0, 0.3) 100%
      );
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
      color: var(--primary-text-color, #fff);
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
    }

    .pc-pheno {
      font-size: 0.9rem;
      color: var(--secondary-text-color, rgba(255, 255, 255, 0.7));
      font-weight: 500;
    }

    .pc-stage {
      font-size: 1rem;
      font-weight: 600;
      margin-top: 8px;
      color: var(--stage-color);
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
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
      color: var(--primary-text-color, #fff);
    }

    .current-stage {
      /* Add any specific styles for current stage if needed */
    }

    .plant-card-rich.dragging {
      opacity: 0.5;
      transform: rotate(5deg);
    }

    .plant-card-rich.dragging-mobile {
      opacity: 0.8;
      transform: scale(1.05);
      box-shadow: 0 12px 24px rgba(0, 0, 0, 0.3);
      z-index: 1000;
      pointer-events: none; /* Let events pass through to grid for elementFromPoint */
    }
  `];

  protected willUpdate(changedProps: PropertyValues): void {
    if (changedProps.has('plant') || changedProps.has('strainLibrary')) {
      this._calculateDisplayData();
    }
  }

  private _calculateDisplayData() {
    if (!this.plant) {
      this._displayData = null;
      return;
    }

    const plant = this.plant;
    const stageColor = PlantUtils.getPlantStageColor(plant.state);
    const strainName = plant.attributes?.strain || 'Unknown Strain';
    const pheno = plant.attributes?.phenotype || '';

    // Image logic
    let imageUrl: string | undefined;
    let imageCropMeta: any | undefined;
    const library = this.strainLibrary || [];

    if (strainName !== 'Unknown Strain') {
      const phenoMatch = library.find(
        (s) => s.strain === strainName && s.phenotype === pheno
      );
      if (phenoMatch && phenoMatch.image) {
        imageUrl = phenoMatch.image;
        imageCropMeta = phenoMatch.image_crop_meta;
      } else {
        const strainMatch = library.find(
          (s) => s.strain === strainName && (!s.phenotype || s.phenotype === 'default')
        );
        if (strainMatch && strainMatch.image) {
          imageUrl = strainMatch.image;
          imageCropMeta = strainMatch.image_crop_meta;
        } else if (!imageUrl) {
          const anyMatch = library.find((s) => s.strain === strainName && s.image);
          if (anyMatch) {
            imageUrl = anyMatch.image;
            imageCropMeta = anyMatch.image_crop_meta;
          }
        }
      }
    }

    // Correction: I need to update imports first to include STAGE_CONFIG
    // Assuming STAGE_CONFIG from ../types is available. 
    // I will write the cleaned up logic below using STAGE_CONFIG imported from ../types

    // Stages logic refactored
    const stagesData = Object.entries(STAGE_CONFIG).map(([stage, config]) => {
      const daysAttr = `${stage}_days` as keyof typeof plant.attributes;
      const days = plant.attributes?.[daysAttr] as number | undefined;
      return {
        days,
        stage: stage as PlantStage,
        icon: config.icon,
        title: config.title,
      };
    }).filter(d => d.days !== undefined && d.days !== null);

    const currentStage = (plant.state || '').toLowerCase();
    let visibleDays = stagesData.filter((d) => d.days);

    if (currentStage === PlantStage.DRY) {
      visibleDays = visibleDays.filter((d) => d.stage === PlantStage.DRY);
    } else if (currentStage === PlantStage.CURE) {
      visibleDays = visibleDays.filter((d) => d.stage === PlantStage.CURE);
    }

    const normalizedCurrent =
      currentStage === 'veg' || currentStage === 'vegetative' ? PlantStage.VEG : currentStage;

    const stages: StageDisplay[] = visibleDays.map((d) => ({
      days: d.days as number,
      icon: d.icon,
      title: d.title,
      stage: d.stage,
      isCurrent: d.stage === normalizedCurrent,
      color: PlantUtils.getPlantStageColor(d.stage),
    }));

    this._displayData = {
      stageColor,
      strainName,
      pheno,
      imageUrl,
      imageCropMeta,
      stages,
    };
  }

  private _handleTouchStart(e: TouchEvent) {
    if (this.isEditMode) return;
    if (e.touches.length !== 1) return;

    this._startX = e.touches[0].clientX;
    this._startY = e.touches[0].clientY;

    const card = this.shadowRoot?.querySelector('.plant-card-rich') as HTMLElement;
    const rect = card.getBoundingClientRect();
    this._initialLeft = rect.left;
    this._initialTop = rect.top;

    this._longPressTimer = window.setTimeout(() => {
      this._startMobileDrag(e);
    }, 500);
  }

  private _handleTouchMove(e: TouchEvent) {
    if (this._isDraggingMobile) {
      e.preventDefault();
      const touch = e.touches[0];
      const card = this.shadowRoot?.querySelector('.plant-card-rich') as HTMLElement;

      const deltaX = touch.clientX - this._startX;
      const deltaY = touch.clientY - this._startY;

      card.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(1.05)`;
    } else {
      const touch = e.touches[0];
      if (
        Math.abs(touch.clientX - this._startX) > 10 ||
        Math.abs(touch.clientY - this._startY) > 10
      ) {
        clearTimeout(this._longPressTimer);
      }
    }
  }

  private _handleTouchEnd(e: TouchEvent) {
    clearTimeout(this._longPressTimer);
    if (this._isDraggingMobile) {
      this._endMobileDrag(e);
    }
  }

  private _startMobileDrag(e: TouchEvent) {
    this._isDraggingMobile = true;
    const card = this.shadowRoot?.querySelector('.plant-card-rich') as HTMLElement;
    card.classList.add('dragging-mobile');

    this.dispatchEvent(
      new CustomEvent('mobile-drag-start', {
        detail: { plant: this.plant },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _endMobileDrag(e: TouchEvent) {
    this._isDraggingMobile = false;
    const card = this.shadowRoot?.querySelector('.plant-card-rich') as HTMLElement;
    card.classList.remove('dragging-mobile');
    card.style.transform = '';

    const touch = e.changedTouches[0];

    this.dispatchEvent(
      new CustomEvent('mobile-drop', {
        detail: {
          x: touch.clientX,
          y: touch.clientY,
          plant: this.plant,
        },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _handleDragStart(e: DragEvent) {
    if (this.isEditMode) {
      e.preventDefault();
      return;
    }

    const target = e.target as HTMLElement;
    target.classList.add('dragging');

    if (e.dataTransfer) {
      e.dataTransfer.setData('text/plain', JSON.stringify({ id: this.plant.entity_id }));
      e.dataTransfer.effectAllowed = 'move';
    }

    this.dispatchEvent(
      new CustomEvent('plant-drag-start', {
        detail: { plant: this.plant },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _handleDragEnd(e: DragEvent) {
    const target = e.target as HTMLElement;
    target.classList.remove('dragging');
  }

  private _handleDrop(e: DragEvent) {
    e.preventDefault();
    if (this.isEditMode) return;

    this.dispatchEvent(
      new CustomEvent('plant-drop', {
        detail: {
          originalEvent: e,
          row: this.row,
          col: this.col,
          plant: this.plant,
        },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _handleDragOver(e: DragEvent) {
    e.preventDefault();
  }

  private _handleClick() {
    this.dispatchEvent(
      new CustomEvent('plant-click', {
        detail: { plant: this.plant },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _toggleSelection(e: Event) {
    e.stopPropagation();
    this.dispatchEvent(
      new CustomEvent('plant-toggle-selection', {
        detail: { plant: this.plant },
        bubbles: true,
        composed: true,
      })
    );
  }

  private renderPlantDaysRich(stages: StageDisplay[]): TemplateResult {
    return html`
      ${stages.map((d) => {
      return html`
          <div class="pc-stat-item ${d.isCurrent ? 'current-stage' : ''}">
            <svg style="color: ${d.color};" viewBox="0 0 24 24"><path d="${d.icon}"></path></svg>
            <div class="pc-stat-text">${d.days}d</div>
          </div>
        `;
    })}
    `;
  }

  render() {
    if (!this.plant || !this._displayData) return html``;

    const { stageColor, strainName, pheno, imageUrl, imageCropMeta, stages } = this._displayData;

    return html`
      <div
        class="plant-card-rich"
        style="--stage-color: ${stageColor}"
        draggable="true"
        @dragstart=${this._handleDragStart}
        @dragend=${this._handleDragEnd}
        @dragover=${this._handleDragOver}
        @drop=${this._handleDrop}
        @touchstart=${this._handleTouchStart}
        @touchmove=${this._handleTouchMove}
        @touchend=${this._handleTouchEnd}
        @click=${this._handleClick}
      >
        ${imageUrl
        ? html`
              <img
                class="plant-card-bg"
                src="${imageUrl}"
                loading="lazy"
                alt="${strainName}"
                style="${PlantUtils.getImgStyle(imageCropMeta)}"
              />
              <div class="plant-card-overlay"></div>
            `
        : ''}
        ${this.isEditMode
        ? html`
              <div
                class="plant-card-checkbox ${this.selected ? 'selected' : ''}"
                @click=${this._toggleSelection}
              >
                <svg
                  viewBox="0 0 24 24"
                  style="width: 24px; height: 24px; fill: ${this.selected
            ? 'var(--primary-color)'
            : 'rgba(255,255,255,0.7)'};"
                >
                  <path d="${this.selected ? mdiCheckboxMarked : mdiCheckboxBlankOutline}"></path>
                </svg>
              </div>
            `
        : ''}

        <div class="plant-card-content">
          <div class="pc-info">
            <div class="pc-strain-name" title="${strainName}">${strainName}</div>
            ${pheno ? html`<div class="pc-pheno">${pheno}</div>` : ''}
            <div class="pc-stage">${this.plant.state || 'Unknown'}</div>
          </div>

          <div class="pc-stats">${this.renderPlantDaysRich(stages)}</div>
        </div>
      </div>
    `;
  }
}
