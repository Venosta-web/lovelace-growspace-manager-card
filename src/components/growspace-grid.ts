import { LitElement, html, css, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { mdiPlus } from '@mdi/js';
import { PlantEntity, StrainEntry, GrowspaceManagerCardConfig } from '../types';
import './plant-card';

@customElement('growspace-grid')
export class GrowspaceGrid extends LitElement {
  @property({ type: Array }) plants: (PlantEntity | null)[][] = [];
  @property({ type: Number }) rows: number = 3;
  @property({ type: Number }) cols: number = 3;
  @property({ type: Array }) strainLibrary: StrainEntry[] = [];
  @property({ type: Boolean }) isEditMode: boolean = false;
  @property({ type: Object }) selectedPlants: Set<string> = new Set();
  @property({ type: Boolean }) compact: boolean = false;

  private _draggedPlant: PlantEntity | null = null;

  static styles = css`
      :host {
        display: block;
      }

      .grid {
        display: grid;
        gap: var(--spacing-md);
      }

      .grid.compact {
        gap: var(--spacing-sm);
      }

      /* Empty Plant Card Styles */
      .plant-card-empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        aspect-ratio: 1;
        border: 2px dashed rgba(255, 255, 255, 0.2);
        border-radius: 16px;
        color: var(--secondary-text-color);
        cursor: pointer;
        transition: all 0.2s ease;
        background: rgba(255, 255, 255, 0.02);
      }

      .plant-card-empty:hover {
        border-color: var(--primary-color);
        color: var(--primary-color);
        background: rgba(255, 255, 255, 0.05);
        transform: translateY(-2px);
      }

      .plant-card-rich, .plant-card-empty {
         min-width: 0;
      }

      .plant-header {
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 8px;
      }

      /* Force List View for Wide Grids on Desktop */
      .grid.force-list-view {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
          /* Remove grid template */
          grid-template-columns: 1fr !important;
          grid-template-rows: auto !important;
      }

      .grid.force-list-view .plant-card-rich {
          min-height: auto;
          aspect-ratio: unset;
          flex-direction: row;
          align-items: center;
          padding: 12px;
          gap: 12px;
      }

      .grid.force-list-view .plant-card-bg {
           position: relative;
           width: 64px;
           height: 64px;
           border-radius: 8px;
           flex-shrink: 0;
           background-color: rgba(0,0,0,0.2);
      }

      .grid.force-list-view .plant-card-overlay {
           display: none;
      }

      .grid.force-list-view .plant-card-content {
           flex-direction: row;
           padding: 0;
           align-items: center;
           width: 100%;
           justify-content: space-between;
           gap: 8px;
      }

      .grid.force-list-view .pc-info {
           margin-top: 0;
           align-items: flex-start;
           text-align: left;
           flex: 1;
           gap: 2px;
      }

      .grid.force-list-view .pc-strain-name {
           font-size: 1rem;
      }

      .grid.force-list-view .pc-pheno {
           font-size: 0.85rem;
      }

      .grid.force-list-view .pc-stage {
           margin-top: 2px;
           font-size: 0.85rem;
      }

      .grid.force-list-view .pc-stats {
           width: auto;
           padding: 0;
           gap: 12px;
           flex-shrink: 0;
      }

      .grid.force-list-view .pc-stat-item svg {
           width: 20px;
           height: 20px;
      }

      .grid.force-list-view .plant-card-empty {
           min-height: 80px;
           aspect-ratio: unset;
           flex-direction: row;
           justify-content: flex-start;
           padding: 0 24px;
           gap: 16px;
      }

      @media (max-width: 600px) {
        .grid {
          display: flex !important;
          flex-direction: column !important;
          gap: var(--spacing-sm);
          grid-template-columns: unset !important;
          grid-template-rows: unset !important;
        }

        /* Mobile List View for Rich Cards */
        .plant-card-rich {
          width: 100%;
          box-sizing: border-box;
          min-height: auto;
          aspect-ratio: unset;
          flex-direction: row;
          align-items: center;
          padding: 12px;
          gap: 12px;
        }

        .plant-card-bg {
           /* Turn background into a thumbnail on mobile */
           position: relative !important;
           width: 64px !important;
           height: 64px !important;
           border-radius: 8px;
           flex-shrink: 0;
           background-color: rgba(0,0,0,0.2);
           object-fit: cover !important;
        }

        .plant-card-overlay {
           display: none;
        }

        .plant-card-content {
           position: static;
           z-index: auto;
           display: flex;
           flex: 1;
           min-width: 0;
           width: 100%;
           flex-direction: row;
           padding: 0;
           align-items: center;
           justify-content: space-between;
           gap: 12px;
        }

        .pc-info {
           display: flex;
           flex-direction: column;
           margin-top: 0;
           align-items: flex-start;
           text-align: left;
           flex: 1;
           gap: 2px;
           min-width: 0;
        }

        .pc-strain-name {
           font-size: 0.9rem;
           color: #fff !important;
           font-weight: 700;
        }

        .pc-pheno {
           font-size: 0.8rem;
           color: rgba(255,255,255,0.7) !important;
        }

        .pc-stage {
           margin-top: 2px;
           font-size: 0.8rem;
           color: var(--stage-color, #fff) !important;
           font-weight: 600;
        }

        .pc-stats {
           width: auto;
           padding: 0;
           gap: 12px;
           flex-shrink: 0;
        }

        .pc-stat-item svg {
           width: 20px;
           height: 20px;
        }

        /* Hide non-current stages on mobile */
        .pc-stat-item:not(.current-stage) {
           display: none;
        }

        /* Empty Slot in List View */
        .plant-card-empty {
           min-height: 80px;
           aspect-ratio: unset;
           flex-direction: row;
           justify-content: flex-start;
           padding: 0 24px;
           gap: 16px;
        }
      }
  `;

  private _handleDragStart(plant: PlantEntity) {
    this._draggedPlant = plant;
  }

  private _handleDragOver(e: DragEvent) {
    e.preventDefault();
  }

  private _handleDrop(
    e: DragEvent,
    targetRow: number,
    targetCol: number,
    targetPlant: PlantEntity | null
  ) {
    e.preventDefault();
    if (!this._draggedPlant) return;

    this.dispatchEvent(new CustomEvent('plant-drop', {
      detail: {
        originalEvent: e,
        sourcePlant: this._draggedPlant,
        targetRow,
        targetCol,
        targetPlant
      },
      bubbles: true,
      composed: true
    }));

    this._draggedPlant = null;
  }

  private _handlePlantClick(plant: PlantEntity) {
    this.dispatchEvent(new CustomEvent('plant-click', {
      detail: { plant },
      bubbles: true,
      composed: true
    }));
  }

  private _togglePlantSelection(plant: PlantEntity) {
    const plantId = plant.attributes.plant_id;
    if (!plantId) return;

    const newSet = new Set(this.selectedPlants);
    if (newSet.has(plantId)) {
      newSet.delete(plantId);
    } else {
      newSet.add(plantId);
    }

    this.dispatchEvent(new CustomEvent('selection-changed', {
        detail: { selectedPlants: newSet },
        bubbles: true,
        composed: true
    }));
  }

  render() {
    const isListView = this.cols > 5;
    const gridStyle = isListView
      ? ''
      : `grid-template-columns: repeat(${this.cols}, minmax(0, 1fr)); grid-template-rows: repeat(${this.rows}, 1fr);`;

    // Flatten grid for rendering
    // Assuming plants input is (PlantEntity | null)[][]
    const flatGrid = this.plants.flat();

    return html`
      <div class="grid ${this.compact ? 'compact' : ''} ${isListView ? 'force-list-view' : ''}"
           style="${gridStyle}">
        ${flatGrid.map((plant, index) => {
          // Recalculate row/col based on grid index
          const row = Math.floor(index / this.cols) + 1;
          const col = (index % this.cols) + 1;

          if (!plant) {
            return this.renderEmptySlot(row, col);
          }

          const plantId = plant.attributes?.plant_id || plant.entity_id.replace('sensor.', '');
          const isSelected = this.selectedPlants.has(plantId);

          return html`
            <growspace-plant-card
              .plant=${plant}
              .row=${row}
              .col=${col}
              .strainLibrary=${this.strainLibrary}
              .isEditMode=${this.isEditMode}
              .selected=${isSelected}
              @plant-click=${() => this._handlePlantClick(plant)}
              @plant-drag-start=${() => this._handleDragStart(plant)}
              @plant-drop=${(e: CustomEvent) => this._handleDrop(e.detail.originalEvent, row, col, plant)}
              @plant-toggle-selection=${() => this._togglePlantSelection(plant)}
            ></growspace-plant-card>
          `;
        })}
      </div>
    `;
  }

  private renderEmptySlot(row: number, col: number): TemplateResult {
    return html`
      <div
        class="plant-card-empty"
        style="grid-row: ${row}; grid-column: ${col}"
        @click=${() => this.dispatchEvent(new CustomEvent('add-plant-click', { detail: { row: row - 1, col: col - 1 } }))}
        @dragover=${this._handleDragOver}
        @drop=${(e: DragEvent) => this._handleDrop(e, row, col, null)}
      >
        <div class="plant-header">
          <svg style="width: 48px; height: 48px; opacity: 0.5; fill: currentColor;" viewBox="0 0 24 24">
            <path d="${mdiPlus}"></path>
          </svg>
        </div>
        <div style="font-weight: 500; opacity: 0.8;">Add Plant</div>
      </div>
    `;
  }
}
