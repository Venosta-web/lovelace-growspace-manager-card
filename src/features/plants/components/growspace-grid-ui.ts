/**
 * Growspace Grid UI - Presentational Component
 *
 * Pure Lit component that renders the plant grid.
 * Receives all data via props, emits events for user interactions.
 * No store access, no business logic.
 */

import { LitElement, html, css, TemplateResult, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { createRef, ref } from 'lit/directives/ref.js';
import { mdiPlus } from '@mdi/js';
import { repeat } from 'lit/directives/repeat.js';
import type { GridCellData } from '../viewmodels/growspace-grid.viewmodel';
import type { PlantEntity } from '../../../types';
import { GridOverlayMode } from '../../../features/environment/constants';
import { variables } from '../../../styles/variables';
import { sharedStyles } from '../../../styles/shared.styles';

/**
 * Grid interaction events
 */
export interface GridCellClickEvent {
  cell: GridCellData;
}

export interface GridDropEvent {
  targetRow: number;
  targetCol: number;
  targetPlant: PlantEntity | null;
  draggedPlant: PlantEntity | null;
  originalEvent: DragEvent | null;
}

export interface GridMobileDropEvent {
  x: number;
  y: number;
  plant: PlantEntity;
}

@customElement('growspace-grid-ui')
export class GrowspaceGridUI extends LitElement {
  // Grid data from ViewModel
  @property({ type: Number }) rows = 3;
  @property({ type: Number }) cols = 3;
  @property({ type: Boolean }) isListView = false;
  @property({ type: Array }) cells: GridCellData[] = [];

  // UI state
  @property({ type: Boolean }) isEditMode = false;
  @property({ type: Boolean }) isCompactView = false;
  @property({ type: Boolean }) isLoading = false;
  @property() overlayMode: GridOverlayMode = GridOverlayMode.NONE;

  // Drag state (managed internally by UI component)
  private _draggedPlant: PlantEntity | null = null;
  private _gridRef = createRef<HTMLDivElement>();

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
    this.dispatchEvent(
      new CustomEvent('plant-drag-start', {
        bubbles: true,
        composed: true,
        detail: { plant },
      })
    );
  }

  private _handleDragOver(e: DragEvent) {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
  }

  private _handleDrop(e: DragEvent | null, targetRow: number, targetCol: number, targetPlant: PlantEntity | null) {
    if (e) e.preventDefault();

    // Emit drop event to container with the dragged plant
    this.dispatchEvent(
      new CustomEvent<GridDropEvent>('grid-drop', {
        bubbles: true,
        composed: true,
        detail: {
          targetRow,
          targetCol,
          targetPlant,
          draggedPlant: this._draggedPlant,
          originalEvent: e,
        },
      })
    );

    this._draggedPlant = null;
  }

  private _handleMobileDrop(e: CustomEvent<GridMobileDropEvent>) {
    // Forward mobile drop event to container
    this.dispatchEvent(
      new CustomEvent('grid-mobile-drop', {
        bubbles: true,
        composed: true,
        detail: e.detail,
      })
    );
  }

  private _handleCellClick(cell: GridCellData) {
    // Emit cell click event
    this.dispatchEvent(
      new CustomEvent<GridCellClickEvent>('cell-click', {
        bubbles: true,
        composed: true,
        detail: { cell },
      })
    );
  }

  private _handleEmptySlotClick(row: number, col: number) {
    // Emit empty slot click event (opens add plant dialog)
    this.dispatchEvent(
      new CustomEvent('empty-slot-click', {
        bubbles: true,
        composed: true,
        detail: { row, col },
      })
    );
  }

  render() {
    const gridStyle = this.isListView
      ? ''
      : `grid-template-columns: repeat(${this.cols}, minmax(0, 1fr)); grid-template-rows: repeat(${this.rows}, 1fr);`;

    return html`
      <div
        class="grid ${this.isCompactView ? 'compact' : ''} ${this.isListView ? 'force-list-view' : ''}"
        style="${gridStyle}"
        @mobile-drop=${this._handleMobileDrop}
        @dragover=${this._handleDragOver}
        ${ref(this._gridRef)}
      >
        ${this.isLoading
          ? this._renderSkeletonGrid()
          : repeat(
              this.cells,
              (cell) => (cell.plant ? cell.plant.attributes?.plant_id || cell.plant.entity_id : `empty-${cell.row}-${cell.col}`),
              (cell) => this._renderGridCell(cell)
            )}
      </div>
    `;
  }

  private _renderGridCell(cell: GridCellData): TemplateResult {
    if (!cell.plant) {
      return this._renderEmptySlot(cell.row, cell.col);
    }

    return html`
      <div class="grid-item-wrapper">
        <plant-card-container
          .plant=${cell.plant}
          .row=${cell.row}
          .col=${cell.col}
          @plant-click=${() => this._handleCellClick(cell)}
          @plant-drag-start=${() => this._handleDragStart(cell.plant!)}
          @plant-drop=${(e: CustomEvent) => this._handleDrop(e.detail.originalEvent, cell.row, cell.col, cell.plant)}
        ></plant-card-container>
        ${this.overlayMode !== GridOverlayMode.NONE
          ? html`<div class="grid-overlay" style="background-color: ${cell.overlayColor}"></div>`
          : nothing}
      </div>
    `;
  }

  private _renderEmptySlot(row: number, col: number): TemplateResult {
    return html`
      <div
        class="plant-card-empty"
        data-row="${row}"
        data-col="${col}"
        style="grid-row: ${row}; grid-column: ${col}; position: relative;"
        @click=${() => this._handleEmptySlotClick(row, col)}
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

  private _renderSkeletonGrid(): TemplateResult[] {
    const count = this.rows * this.cols;
    return Array(count)
      .fill(0)
      .map(() => html`<div class="skeleton-card"></div>`);
  }
}
