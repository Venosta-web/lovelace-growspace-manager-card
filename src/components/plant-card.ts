import { LitElement, html, css, TemplateResult, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { strainLibraryContext } from '../context';
import {
  mdiCheckboxMarked,
  mdiCheckboxBlankOutline,
} from '@mdi/js';
import { PlantEntity, StrainEntry, PlantDisplayData, StageDisplay } from '../types';
import { PlantUtils } from '../utils/plant-utils';
import { DragDropController, DragDropHost } from '../controllers/drag-drop-controller';
import { sharedStyles } from '../styles/shared.styles';

@customElement('growspace-plant-card')
export class GrowspacePlantCard extends LitElement implements DragDropHost {
  @property({ attribute: false }) accessor plant!: PlantEntity;
  @property({ type: Number }) accessor row!: number;
  @property({ type: Number }) accessor col!: number;

  @consume({ context: strainLibraryContext, subscribe: true })
  accessor strainLibrary: StrainEntry[] = [];

  @property({ type: Boolean }) accessor isEditMode = false;
  @property({ type: Boolean }) accessor selected = false;

  // Instantiate controller
  private dragController = new DragDropController(this);

  // Computed display data
  get displayData(): PlantDisplayData | null {
    if (!this.plant) return null;
    return PlantUtils.getPlantDisplayData(this.plant, this.strainLibrary);
  }

  static styles = [
    sharedStyles,
    css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      contain: layout paint style;
    }

    .plant-card-rich {
      position: relative;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      border-radius: 16px;
      overflow: hidden;
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
      will-change: transform;
      user-select: none;
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
      display: grid;
      flex-direction: column;
      justify-content: stretch;
      gap: 16px;
      padding: 16px;
      box-sizing: border-box;
      align-content: stretch;
      align-items: end;
      justify-items: center;
      margin-top: auto;
  }

    .pc-info {
      text-align: center;
      display: flex;
      flex-direction: column;
      gap: 4px;
      align-items: center;
      backdrop-filter: blur(1px);
      -webkit-backdrop-filter: blur(1px);

      border-top: 1px solid rgba(0, 0, 0, 0.2);
      color: white;
      --primary-text-color: white;
      --secondary-text-color: rgba(255, 255, 255, 0.8);
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

    .current-stage {}

    .plant-card-rich.dragging {
      opacity: 0.5;
      transform: rotate(5deg);
    }

    .plant-card-rich.dragging-mobile {
      opacity: 0.8;
      transform: scale(1.05);
      box-shadow: 0 12px 24px rgba(0, 0, 0, 0.3);
      z-index: 1000;
      pointer-events: none;
    }
  `];

  // --- Click Handlers ---

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
    const data = this.displayData;
    if (!this.plant || !data) return html``;

    const { stageColor, strainName, pheno, imageUrl, imageCropMeta, stages } = data;

    return html`
      <div
        class="plant-card-rich"
        style="--stage-color: ${stageColor}"
        draggable="true"
        @click=${this._handleClick}
      >
        ${imageUrl
        ? html`
              <img
                class="plant-card-bg"
                src="${imageUrl}"
                loading="lazy"
                decoding="async"
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
