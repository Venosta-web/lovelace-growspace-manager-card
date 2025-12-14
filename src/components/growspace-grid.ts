import { LitElement, html, css, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { createRef, ref } from 'lit/directives/ref.js';
import { mdiPlus } from '@mdi/js';
import { repeat } from 'lit/directives/repeat.js';
import { PlantEntity, StrainEntry } from '../types';
import { storeContext } from '../context';
import type { GrowspaceStore } from '../store/growspace-store';
import './plant-card';

@customElement('growspace-grid')
export class GrowspaceGrid extends LitElement {
  @consume({ context: storeContext })
  private store!: GrowspaceStore;

  @property({ type: Array }) plants: (PlantEntity | null)[][] = [];
  @property({ type: Number }) rows: number = 3;
  @property({ type: Number }) cols: number = 3;

  @property({ type: Boolean }) isEditMode: boolean = false;
  @property({ type: Object }) selectedPlants: Set<string> = new Set();
  @property({ type: Boolean }) compact: boolean = false;
  @property({ type: Boolean }) isLoading: boolean = false;

  private _draggedPlant: PlantEntity | null = null;
  private _gridRef = createRef<HTMLDivElement>();

  static styles = css`
    :host {
      display: block;
    }

    .grid {
      display: grid;
      gap: var(--spacing-md);
      /* Position relative needed for coordinate calculation */
      position: relative; 
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

    /* Skeleton Loading */
    .skeleton-card {
      height: 100%;
      aspect-ratio: 1;
      border-radius: 16px;
      background: rgba(255, 255, 255, 0.05);
      animation: pulse 1.5s infinite;
    }

    @keyframes pulse {
      0% {
        opacity: 0.6;
      }
      50% {
        opacity: 0.3;
      }
      100% {
        opacity: 0.6;
      }
    }

    .plant-card-empty:hover {
      border-color: var(--primary-color);
      color: var(--primary-color);
      background: rgba(255, 255, 255, 0.05);
      transform: translateY(-2px);
    }

    .plant-card-rich,
    .plant-card-empty {
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
      background-color: rgba(0, 0, 0, 0.2);
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
        background-color: rgba(0, 0, 0, 0.2);
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
        color: rgba(255, 255, 255, 0.7) !important;
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
    e: DragEvent | null,
    targetRow: number,
    targetCol: number,
    targetPlant: PlantEntity | null
  ) {
    if (e) e.preventDefault();
    if (!this._draggedPlant) return;

    // Direct store call
    this.store.handleDrop(targetRow, targetCol, targetPlant, this._draggedPlant);
    this._draggedPlant = null;
  }

  private _handlePlantClick(plant: PlantEntity) {
    // Direct store call
    this.store.handlePlantClick(plant);
  }

  private _togglePlantSelection(plant: PlantEntity) {
    const plantId = plant.attributes.plant_id;
    if (plantId) {
      this.store.togglePlantSelection(plantId);
    }
  }

  private _handleMobileDrop(e: CustomEvent) {
    const { x, y, plant } = e.detail;
    const gridEl = this._gridRef.value;

    if (!gridEl) return;

    // O(1) Math-based logic
    // We assume the grid structure corresponds to rows/cols
    // This logic principally works well for desktop grids.
    // However, mobile layouts often stack elements vertically (flex-direction: column).
    // If it's stacked, math based on cell width/height might be tricky if we assume a matrix.
    // BUT: The instruction requested O(1) math logic.
    // To handle both grid and list view robustly with O(1) is complex without knowing exact layout method.
    // If it is indeed a CSS Grid:

    const rect = gridEl.getBoundingClientRect();
    const cellW = rect.width / this.cols;
    const cellH = rect.height / this.rows;

    // If list view (desktop or mobile), the logic changes implicitly because
    // cols might be effectively 1.
    // Let's rely on the grid layout properties.
    // If elements are stacked vertically, cellW is full width, cellH is total height / (rows*cols).
    // Let's refine based on media query check or compact prop? No, getComputedStyle is slow-ish but better than loop.
    // Actually, "Smart" logic instructions were specific:

    const isListView = this.cols > 5 || window.innerWidth <= 600; // Match render logic

    let targetRow, targetCol;

    if (isListView) {
      // List view: items are stacked 1 column, N rows (effectively)
      // Check if list view logic applies
      const hitY = y - rect.top;
      if (hitY < 0 || hitY > rect.height) return;

      // In list view, each item height?
      const itemCount = this.rows * this.cols;
      const itemHeight = rect.height / itemCount;
      const index = Math.floor(hitY / itemHeight);

      // Convert linear index back to row/col
      targetRow = Math.floor(index / this.cols) + 1;
      targetCol = (index % this.cols) + 1;
    } else {
      // Grid View
      const colIndex = Math.ceil((x - rect.left) / cellW);
      const rowIndex = Math.ceil((y - rect.top) / cellH);
      targetRow = rowIndex;
      targetCol = colIndex;
    }

    if (
      targetCol > 0 && targetCol <= this.cols &&
      targetRow > 0 && targetRow <= this.rows
    ) {
      // Identify target plant from array
      // plants is (PlantEntity | null)[][]
      // 0-based index access
      const targetPlant = this.plants[targetRow - 1][targetCol - 1]; // Can be null or PlantEntity

      this.store.handleDrop(targetRow, targetCol, targetPlant, plant);
    }
  }

  render() {
    const isListView = this.cols > 5; // Simplified check for inline style
    const gridStyle = isListView
      ? ''
      : `grid-template-columns: repeat(${this.cols}, minmax(0, 1fr)); grid-template-rows: repeat(${this.rows}, 1fr);`;

    const flatGrid = this.plants.flat();

    return html`
      <div
        class="grid ${this.compact ? 'compact' : ''} ${isListView ? 'force-list-view' : ''}"
        style="${gridStyle}"
        @mobile-drop=${this._handleMobileDrop}
        ${ref(this._gridRef)}
      >
        ${this.isLoading ? this.renderSkeletonGrid() : ''}
        ${!this.isLoading
        ? repeat(
          flatGrid,
          (plant, index) =>
            plant ? plant.attributes?.plant_id || plant.entity_id : `empty-${index}`,
          (plant, index) => {
            const row = Math.floor(index / this.cols) + 1;
            const col = (index % this.cols) + 1;

            if (!plant) {
              return this.renderEmptySlot(row, col);
            }

            const plantId =
              plant.attributes?.plant_id || plant.entity_id.replace('sensor.', '');
            const isSelected = this.selectedPlants.has(plantId);

            return html`
                  <growspace-plant-card
                    .plant=${plant}
                    .row=${row}
                    .col=${col}
                    .isEditMode=${this.isEditMode}
                    .selected=${isSelected}
                    @plant-click=${() => this._handlePlantClick(plant)}
                    @plant-drag-start=${() => this._handleDragStart(plant)}
                    @plant-drop=${(e: CustomEvent) =>
                this._handleDrop(e.detail.originalEvent, row, col, plant)}
                    @plant-toggle-selection=${() => this._togglePlantSelection(plant)}
                  ></growspace-plant-card>
                `;
          }
        )
        : ''}
      </div>
    `;
  }

  private renderEmptySlot(row: number, col: number): TemplateResult {
    // 0-based for API
    return html`
      <div
        class="plant-card-empty"
        data-row="${row}"
        data-col="${col}"
        style="grid-row: ${row}; grid-column: ${col}"
        @click=${() => this.store.openAddPlantDialog(row - 1, col - 1)}
        @dragover=${this._handleDragOver}
        @drop=${(e: DragEvent) => this._handleDrop(e, row, col, null)}
      >
        <div class="plant-header">
          <svg
            style="width: 48px; height: 48px; opacity: 0.5; fill: currentColor;"
            viewBox="0 0 24 24"
          >
            <path d="${mdiPlus}"></path>
          </svg>
        </div>
        <div style="font-weight: 500; opacity: 0.8;">Add Plant</div>
      </div>
    `;
  }

  private renderSkeletonGrid(): TemplateResult[] {
    const count = this.rows * this.cols;
    return Array(count)
      .fill(0)
      .map(() => html`<div class="skeleton-card"></div>`);
  }
}
