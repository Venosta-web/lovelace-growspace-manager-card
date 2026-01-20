import { LitElement, html, css, TemplateResult, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { createRef, ref } from 'lit/directives/ref.js';
import { mdiPlus } from '@mdi/js';
import { repeat } from 'lit/directives/repeat.js';
import { StoreController } from '@nanostores/lit';
import { PlantEntity } from '../types';
import { GridOverlayMode, StatusLevel } from '../constants';
import { storeContext } from '../context';
import type { GrowspaceStore } from '../store/growspace-store';
// Global imports removed
import { variables } from '../styles/variables';
import { sharedStyles } from '../styles/shared.styles';
import './plant-card';

/**
 * Defines the RGBA color values for various grid overlay states.
 */
const OVERLAY_COLORS = {
  OK: 'var(--overlay-ok-color, rgba(76, 175, 80, 0.15))',
  WARNING: 'var(--overlay-warning-color, rgba(255, 152, 0, 0.15))',
  DANGER: 'var(--overlay-danger-color, rgba(244, 67, 54, 0.15))',
  ALERT: 'var(--overlay-alert-color, rgba(244, 67, 54, 0.2))',
  TRANSPARENT: 'transparent',
};

@customElement('growspace-grid')
export class GrowspaceGrid extends LitElement {
  @consume({ context: storeContext })
  private store!: GrowspaceStore;

  @property({ type: Array }) plants: (PlantEntity | null)[][] = [];
  @property({ type: Number }) rows: number = 3;
  @property({ type: Number }) cols: number = 3;

  // UI state via StoreController - direct subscription to atoms
  private _isEditModeController!: StoreController<boolean>;
  private _selectedPlantsController!: StoreController<Set<string>>;
  private _isCompactController!: StoreController<boolean>;
  private _isLoadingController!: StoreController<boolean>;

  connectedCallback() {
    super.connectedCallback();
    if (this.store) {
      this._isEditModeController = new StoreController(this, this.store.ui.$isEditMode);
      this._selectedPlantsController = new StoreController(this, this.store.ui.$selectedPlants);
      this._isCompactController = new StoreController(this, this.store.ui.$isCompactView);
      this._isLoadingController = new StoreController(this, this.store.ui.$isLoading);
      this._overlayModeController = new StoreController(this, this.store.ui.$gridOverlayMode);
    }
  }

  private _overlayModeController!: StoreController<GridOverlayMode>;

  private _draggedPlant: PlantEntity | null = null;
  private _gridRef = createRef<HTMLDivElement>();

  public focusPlant(index: number) {
    const cards = this.shadowRoot?.querySelectorAll('growspace-plant-card');
    if (cards && cards[index]) {
      (cards[index] as HTMLElement).focus();
    }
  }

  static styles = [
    variables,
    sharedStyles,
    css`
      :host {
        display: block;
        container-type: inline-size;
        container-name: growspace-grid;
        /* Overlay colors for theming */
        --overlay-ok-color: rgba(76, 175, 80, 0.15);
        --overlay-warning-color: rgba(255, 152, 0, 0.15);
        --overlay-danger-color: rgba(244, 67, 54, 0.15);
        --overlay-alert-color: rgba(244, 67, 54, 0.2);
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
        border: var(--glass-border);
        border-radius: var(--border-radius-lg, 16px);
        color: var(--secondary-text-color);
        cursor: pointer;
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
        background: rgba(255, 255, 255, 0.08);
        transform: translateY(-2px);
      }

      .grid-item-wrapper {
        position: relative;
        height: 100%;
        width: 100%;
        contain: layout;
      }

      .grid-overlay {
        position: absolute;
        inset: 0;
        border-radius: var(--border-radius-lg, 16px);
        pointer-events: none;
        z-index: 2;
        transition: background-color 0.3s ease;
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

      @container growspace-grid (max-width: 400px) {
        .grid {
          display: flex !important;
          flex-direction: column !important;
          gap: var(--spacing-sm);
        }

        .plant-card-rich {
          flex-direction: row;
          align-items: center;
          padding: 12px;
          gap: 12px;
        }

        .plant-card-empty {
          min-height: 80px;
          aspect-ratio: unset;
          flex-direction: row;
        }
      }

      /* Ghost Plant Styling */
      .ghost-plant {
        position: absolute;
        inset: 0;
        border: 2px dashed var(--primary-color, #4caf50);
        border-radius: var(--border-radius-lg, 16px);
        background: rgba(76, 175, 80, 0.1);
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0.6;
        pointer-events: none;
        animation: ghost-pulse 2s ease-in-out infinite;
      }

      @keyframes ghost-pulse {
        0%,
        100% {
          opacity: 0.4;
        }
        50% {
          opacity: 0.7;
        }
      }

      .ghost-plant-icon {
        width: 48px;
        height: 48px;
        opacity: 0.7;
        fill: var(--primary-color, #4caf50);
      }
    `,
  ];

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

    // Check for transplant data from external source (TransplantSourcePanel)
    if (e?.dataTransfer) {
      const transplantData = e.dataTransfer.getData('application/json');
      if (transplantData) {
        try {
          const data = JSON.parse(transplantData);
          if (data.type === 'transplant') {
            // Dispatch transplant event
            this.dispatchEvent(
              new CustomEvent('transplant-drop', {
                bubbles: true,
                composed: true,
                detail: {
                  plant_id: data.plant_id,
                  source_growspace_id: data.source_growspace_id,
                  target_row: targetRow,
                  target_col: targetCol,
                },
              })
            );
            return;
          }
        } catch {
          // Not transplant data, fall through to regular drop
        }
      }
    }

    // Regular internal drag-drop
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
    const { x, y, plant: sourcePlant } = e.detail;
    if (!this.shadowRoot) return;

    const targetEl = this.shadowRoot.elementFromPoint(x, y);
    if (!targetEl) return;

    const dropTarget = targetEl.closest('.plant-card-empty, growspace-plant-card');
    if (!dropTarget) return;

    let targetRow: number | undefined;
    let targetCol: number | undefined;
    let targetPlant: PlantEntity | null = null;

    if (dropTarget.classList.contains('plant-card-empty')) {
      targetRow = parseInt(dropTarget.getAttribute('data-row') ?? '1', 10);
      targetCol = parseInt(dropTarget.getAttribute('data-col') ?? '1', 10);
    } else if (dropTarget.tagName.toLowerCase() === 'growspace-plant-card') {
      const card = dropTarget as any;
      targetRow = card.row;
      targetCol = card.col;
      targetPlant = card.plant;
    }

    if (targetRow !== undefined && targetCol !== undefined) {
      this.store.handleDrop(targetRow, targetCol, targetPlant, sourcePlant);
    }
  }

  private _getOverlayColor(mode: GridOverlayMode, plant: PlantEntity): string {
    if (mode === GridOverlayMode.NONE) return OVERLAY_COLORS.TRANSPARENT;

    const growspaceId = plant.attributes.growspace_id;
    if (!growspaceId) return OVERLAY_COLORS.TRANSPARENT;

    const device = this.store.data.$devices.get().find((d) => d.deviceId === growspaceId);
    if (!device) return OVERLAY_COLORS.TRANSPARENT;

    switch (mode) {
      case GridOverlayMode.VPD: {
        const { vpdStatus } = device.biologicalMetrics;
        if (vpdStatus === 'ok') return OVERLAY_COLORS.OK;
        if (vpdStatus === StatusLevel.WARNING) return OVERLAY_COLORS.WARNING;
        if (vpdStatus === StatusLevel.DANGER) return OVERLAY_COLORS.DANGER;
        break;
      }
      case GridOverlayMode.BIO_STATUS: {
        const { hass } = this.store;
        if (!hass) return OVERLAY_COLORS.TRANSPARENT;

        const optimalEntity = hass.states[`binary_sensor.${growspaceId}_optimal_conditions`];
        const stressEntity = hass.states[`binary_sensor.${growspaceId}_plants_under_stress`];
        const moldEntity = hass.states[`binary_sensor.${growspaceId}_high_mold_risk`];

        if (stressEntity?.state === 'on' || moldEntity?.state === 'on') {
          return OVERLAY_COLORS.ALERT;
        }
        if (optimalEntity?.state === 'on') {
          return OVERLAY_COLORS.OK;
        }

        const { vpdStatus } = device.biologicalMetrics;
        if (vpdStatus === StatusLevel.WARNING || vpdStatus === StatusLevel.DANGER) {
          return OVERLAY_COLORS.WARNING;
        }
        break;
      }
    }
    return OVERLAY_COLORS.TRANSPARENT;
  }

  render() {
    const isListView = this.cols > 5;
    const gridStyle = isListView
      ? ''
      : `grid-template-columns: repeat(${this.cols}, minmax(0, 1fr)); grid-template-rows: repeat(${this.rows}, 1fr);`;

    const flatGrid = this.plants.flat();
    const isLoading = this._isLoadingController?.value;

    return html`
      <div
        class="grid ${this._isCompactController?.value ? 'compact' : ''} ${isListView
          ? 'force-list-view'
          : ''}"
        style="${gridStyle}"
        @mobile-drop=${this._handleMobileDrop}
        @dragover=${this._handleDragOver}
        ${ref(this._gridRef)}
      >
        ${isLoading
          ? this.renderSkeletonGrid()
          : repeat(
              flatGrid,
              (plant, index) =>
                plant ? plant.attributes?.plant_id || plant.entity_id : `empty-${index}`,
              (plant, index) => this._renderGridCell(plant, index)
            )}
      </div>
    `;
  }

  private _renderGridCell(plant: PlantEntity | null, index: number): TemplateResult {
    const row = Math.floor(index / this.cols) + 1;
    const col = (index % this.cols) + 1;

    if (!plant) {
      return this.renderEmptySlot(row, col);
    }

    const overlayMode = this._overlayModeController?.value || GridOverlayMode.NONE;
    const overlayColor = this._getOverlayColor(overlayMode, plant);

    return html`
      <div class="grid-item-wrapper">
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
        ${overlayMode !== GridOverlayMode.NONE
          ? html`<div class="grid-overlay" style="background-color: ${overlayColor}"></div>`
          : nothing}
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
        style="grid-row: ${row}; grid-column: ${col}; position: relative;"
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
