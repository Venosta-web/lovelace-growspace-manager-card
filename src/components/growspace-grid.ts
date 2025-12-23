import { LitElement, html, css, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { createRef, ref } from 'lit/directives/ref.js';
import { mdiPlus } from '@mdi/js';
import { repeat } from 'lit/directives/repeat.js';
import { StoreController } from '@nanostores/lit';
import { PlantEntity, StrainEntry } from '../types';
import { storeContext } from '../context';
import type { GrowspaceStore } from '../store/growspace-store';
import { $isEditMode, $selectedPlants, $isCompactView, $isLoading } from '../store/ui-store';
import { variables } from '../styles/variables';
import { sharedStyles } from '../styles/shared.styles';
import './plant-card';

@customElement('growspace-grid')
export class GrowspaceGrid extends LitElement {
  @consume({ context: storeContext })
  private accessor store!: GrowspaceStore;

  @property({ type: Array }) accessor plants: (PlantEntity | null)[][] = [];
  @property({ type: Number }) accessor rows: number = 3;
  @property({ type: Number }) accessor cols: number = 3;

  // UI state via StoreController - direct subscription to atoms
  private _isEditModeController = new StoreController(this, $isEditMode);
  private _selectedPlantsController = new StoreController(this, $selectedPlants);
  private _isCompactController = new StoreController(this, $isCompactView);
  private _isLoadingController = new StoreController(this, $isLoading);

  private _draggedPlant: PlantEntity | null = null;
  private _gridRef = createRef<HTMLDivElement>();

  public focusPlant(index: number) {
    const cards = this.shadowRoot?.querySelectorAll('growspace-plant-card');
    if (cards && cards[index]) {
      (cards[index] as any).focus();
    }
  }

  static styles = [
    variables,
    sharedStyles,
    css`
    :host {
      display: block;
    }

    .grid {
      display: grid;
      gap: var(--spacing-md);
      /* Position relative needed for coordinate calculation */
      position: relative;
      contain: layout;
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
      height: 100%;
      aspect-ratio: 1;
      border: var(--glass-border);
      border-radius: var(--border-radius-lg, 16px);
      color: var(--secondary-text-color);
      cursor: pointer;
      transition: all 0.2s ease;
      transition: all 0.2s ease;
      background: var(--glass-bg);
    }

    /* Skeleton Loading */
    .skeleton-card {
      height: 100%;
      aspect-ratio: 1;
      border-radius: var(--border-radius-lg, 16px);
      background: var(--glass-bg);
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
      color: var(--primary-color);
      background: rgba(255, 255, 255, 0.08);
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
        color: var(--primary-text-color, #fff) !important;
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
  `];

  private _handleDragStart(plant: PlantEntity) {
    this._draggedPlant = plant;
  }

  private _handleDragOver(e: DragEvent) {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
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

    // Hide the dragged element temporarily so we can see what's underneath
    // Note: The dragged element (avatar) usually follows pointer, but here 'plant' is the source data.
    // The "ghost" or original card might be under the finger if we are not careful.
    // However, usually pointer-events: none is set on the drag avatar.
    // If we are dragging the actual card element via transform, it IS under the finger.
    // WE MUST HIDE IT or use pointer-events.

    // The DragDropController scales the card and moves it.
    // We can't easily access the specific card DOM element here to hide it without traversing.
    // But `document.elementsFromPoint` returns ALL elements.

    // const elements = document.elementsFromPoint(x, y); // Removed unused call causing JSDOM error

    // Look for a drop target
    // We are looking for <growspace-plant-card> or <div class="plant-card-empty">
    // But these are inside shadow roots potentially?
    // "document.elementsFromPoint" does NOT penetrate shadow roots automatically in all browsers/modes,
    // but usually "composed path" is needed.
    // Actually, GrowspaceGrid is in Shadow DOM of GrowspaceManagerCard? No, it's a lit element.
    // The plants are inside GrowspaceGrid's shadow root.
    // elementsFromPoint on document might stop at GrowspaceGrid host.

    // Better strategy: Use the ShadowRoot of this grid if possible, or recursive probing.
    // But `this.shadowRoot.elementFromPoint(x, y)` exists!

    const shadowRoot = this.shadowRoot;
    if (!shadowRoot) return;

    const targetEl = shadowRoot.elementFromPoint(x, y);

    if (!targetEl) return;

    // Traverse up from targetEl to find a slot or card
    let current: Element | null = targetEl;
    let targetRow: number | undefined;
    let targetCol: number | undefined;
    let targetPlant: PlantEntity | null = null;

    while (current && current !== this) {
      // Check for empty slot
      if (current.classList?.contains('plant-card-empty')) {
        targetRow = parseInt(current.getAttribute('data-row') || '0');
        targetCol = parseInt(current.getAttribute('data-col') || '0');
        break;
      }

      // Check for populated card
      if (current.tagName.toLowerCase() === 'growspace-plant-card') {
        targetRow = (current as any).row; // We set .row prop on it
        targetCol = (current as any).col;
        targetPlant = (current as any).plant;
        break;
      }

      current = current.parentElement;
    }

    if (targetRow !== undefined && targetCol !== undefined) {
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
        class="grid ${this._isCompactController.value ? 'compact' : ''} ${isListView ? 'force-list-view' : ''}"
        style="${gridStyle}"
        @mobile-drop=${this._handleMobileDrop}
        @dragover=${this._handleDragOver}
        ${ref(this._gridRef)}
      >
        ${this._isLoadingController.value ? this.renderSkeletonGrid() : ''}
        ${!this._isLoadingController.value
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

            return html`
                  <growspace-plant-card
                    .plant=${plant}
                    .row=${row}
                    .col=${col}
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
