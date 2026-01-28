/**
 * Growspace Grid Container
 *
 * Smart container that connects the growspace grid ViewModel to the presentational component.
 * - Consumes store context
 * - Subscribes to ViewModel
 * - Dispatches actions
 * - Handles events from UI component
 */

import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { StoreController } from '@nanostores/lit';
import type { ReadableAtom } from 'nanostores';
import type { PlantEntity } from '../../../types';
import type { GrowspaceStore } from '../../../store/core/growspace-store';
import { storeContext } from '../../../context';
import { createGrowspaceGridViewModel, type GrowspaceGridViewModel } from '../viewmodels/growspace-grid.viewmodel';
import type { GridCellClickEvent, GridDropEvent, GridMobileDropEvent } from '../components/growspace-grid-ui';
import '../components/growspace-grid-ui';
import '../containers/plant-card.container';

@customElement('growspace-grid-container')
export class GrowspaceGridContainer extends LitElement {
  @consume({ context: storeContext })
  private store!: GrowspaceStore;

  /** 2D array of plants in grid layout */
  @property({ type: Array }) plants: (PlantEntity | null)[][] = [];

  /** Number of rows in grid */
  @property({ type: Number }) rows = 3;

  /** Number of columns in grid */
  @property({ type: Number }) cols = 3;

  private viewModel!: ReadableAtom<GrowspaceGridViewModel>;
  private viewModelController!: StoreController<GrowspaceGridViewModel>;

  connectedCallback() {
    super.connectedCallback();
    if (this.store) {
      this.viewModel = createGrowspaceGridViewModel(this.plants, this.rows, this.cols, this.store);
      this.viewModelController = new StoreController(this, this.viewModel);
    }
  }

  updated(changedProps: Map<string, any>) {
    super.updated(changedProps);

    // Recreate ViewModel if grid layout or plants change
    if (changedProps.has('plants') || changedProps.has('rows') || changedProps.has('cols')) {
      if (this.store) {
        this.viewModel = createGrowspaceGridViewModel(this.plants, this.rows, this.cols, this.store);
        this.viewModelController = new StoreController(this, this.viewModel);
      }
    }
  }

  render() {
    if (!this.viewModelController) {
      return html`<div>Loading grid...</div>`;
    }

    const vm = this.viewModelController.value;

    return html`
      <growspace-grid-ui
        .rows=${vm.rows}
        .cols=${vm.cols}
        .isListView=${vm.isListView}
        .cells=${vm.cells}
        .isEditMode=${vm.isEditMode}
        .isCompactView=${vm.isCompactView}
        .isLoading=${vm.isLoading}
        .overlayMode=${vm.overlayMode}
        @cell-click=${this._handleCellClick}
        @empty-slot-click=${this._handleEmptySlotClick}
        @grid-drop=${this._handleGridDrop}
        @grid-mobile-drop=${this._handleGridMobileDrop}
      ></growspace-grid-ui>
    `;
  }

  /**
   * Handle cell click - opens plant overview dialog
   */
  private _handleCellClick(e: CustomEvent<GridCellClickEvent>) {
    const { cell } = e.detail;
    if (cell.plant) {
      this.store.actions.ui.handlePlantClick(cell.plant);
    }
  }

  /**
   * Handle empty slot click - opens add plant dialog
   */
  private _handleEmptySlotClick(e: CustomEvent<{ row: number; col: number }>) {
    const { row, col } = e.detail;
    // Convert from 1-based (display) to 0-based (API)
    this.store.actions.ui.openAddPlantDialog(row - 1, col - 1);
  }

  /**
   * Handle grid drop - move or switch plants
   */
  private async _handleGridDrop(e: CustomEvent<GridDropEvent>) {
    const { targetRow, targetCol, targetPlant, draggedPlant, originalEvent } = e.detail;

    // Check for transplant data from external source
    if (originalEvent?.dataTransfer) {
      const transplantData = originalEvent.dataTransfer.getData('application/json');
      if (transplantData) {
        try {
          const data = JSON.parse(transplantData);
          if (data.type === 'transplant') {
            // Dispatch transplant event to parent
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

    // Regular internal drag-drop - use the dragged plant from the event
    if (draggedPlant) {
      await this.store.actions.plant.drop(targetRow, targetCol, targetPlant, draggedPlant);
    }
  }

  /**
   * Handle mobile drop - coordinate-based plant placement
   */
  private async _handleGridMobileDrop(e: CustomEvent<GridMobileDropEvent>) {
    const { x, y, plant: sourcePlant } = e.detail;
    if (!this.shadowRoot) return;

    // Find target element at coordinates
    const targetEl = this.shadowRoot.elementFromPoint(x, y);
    if (!targetEl) return;

    const dropTarget = targetEl.closest('.plant-card-empty, plant-card-container');
    if (!dropTarget) return;

    let targetRow: number | undefined;
    let targetCol: number | undefined;
    let targetPlant: PlantEntity | null = null;

    if (dropTarget.classList.contains('plant-card-empty')) {
      targetRow = parseInt(dropTarget.getAttribute('data-row') ?? '1', 10);
      targetCol = parseInt(dropTarget.getAttribute('data-col') ?? '1', 10);
    } else if (dropTarget.tagName.toLowerCase() === 'plant-card-container') {
      const card = dropTarget as HTMLElement & { plant: PlantEntity; row: number; col: number };
      targetRow = card.row;
      targetCol = card.col;
      targetPlant = card.plant;
    }

    if (targetRow !== undefined && targetCol !== undefined) {
      await this.store.actions.plant.drop(targetRow, targetCol, targetPlant, sourcePlant);
    }
  }

  /**
   * Public method to focus a specific plant card
   */
  public focusPlant(index: number) {
    const gridUI = this.shadowRoot?.querySelector('growspace-grid-ui');
    if (gridUI) {
      const cards = gridUI.shadowRoot?.querySelectorAll('plant-card-container');
      if (cards && cards[index]) {
        (cards[index] as HTMLElement).focus();
      }
    }
  }
}
