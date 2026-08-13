/**
 * Growspace Grid Container
 *
 * Smart container that connects the growspace grid ViewModel to the presentational component.
 * - Consumes store context
 * - Subscribes to ViewModel
 * - Dispatches actions
 * - Handles events from UI component
 */

import { LitElement, html, type PropertyValues } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { StoreController } from '@nanostores/lit';
import type { ReadableAtom } from 'nanostores';
import type { PlantEntity } from '../../../types';
import type { GrowspaceStore } from '../../../store/core/growspace-store';
import { storeContext } from '../../../context';
import {
  createGrowspaceGridViewModel,
  type GrowspaceGridViewModel,
} from '../viewmodels/growspace-grid.viewmodel';
import type {
  GridCellClickEvent,
  GridDropEvent,
  GridMobileDropEvent,
} from '../components/growspace-grid-ui';
import { GrowspaceGridUI } from '../components/growspace-grid-ui';
import { gridInteraction$, select } from '../../../slices/grid-interaction';
import * as uiSlice from '../../../slices/ui';
import { localizeWithParams } from '../../../localize/localize';
import '../components/growspace-grid-ui';
import '../containers/plant-card.container';

@customElement('growspace-grid-container')
export class GrowspaceGridContainer extends LitElement {
  @consume({ context: storeContext, subscribe: true })
  @property({ attribute: false })
  public store!: GrowspaceStore;

  @query('growspace-grid-ui') private _gridUI?: GrowspaceGridUI;

  /** 2D array of plants in grid layout */
  @property({ type: Array }) plants: (PlantEntity | null)[][] = [];

  /** Number of rows in grid */
  @property({ type: Number }) rows = 3;

  /** Number of columns in grid */
  @property({ type: Number }) cols = 3;

  private viewModel!: ReadableAtom<GrowspaceGridViewModel>;
  private viewModelController!: StoreController<GrowspaceGridViewModel>;
  private _gridInteractionUnsub?: () => void;

  connectedCallback() {
    super.connectedCallback();
    if (this.store) {
      this.viewModel = createGrowspaceGridViewModel(this.plants, this.rows, this.cols, this.store);
      this.viewModelController = new StoreController(this, this.viewModel);
    }
    this._gridInteractionUnsub = gridInteraction$.listen((state) => {
      if (state.status === 'selected') {
        this._openDialogForPlant(state.plantId);
      }
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._gridInteractionUnsub?.();
  }

  updated(changedProps: PropertyValues) {
    super.updated(changedProps);

    // Recreate ViewModel if grid layout or plants change
    if (changedProps.has('plants') || changedProps.has('rows') || changedProps.has('cols')) {
      if (this.store) {
        this.viewModel = createGrowspaceGridViewModel(
          this.plants,
          this.rows,
          this.cols,
          this.store
        );
        this.viewModelController = new StoreController(this, this.viewModel);
      }
    }
  }

  render() {
    if (!this.viewModelController) {
      return html`<div>Loading grid...</div>`;
    }

    const vm = this.viewModelController.value;
    const task = this.store.ui.$taskState?.get?.() ?? { kind: 'idle' };

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
        .arrangeActive=${task.kind === 'arrange'}
        .arrangePlantPicked=${task.kind === 'arrange' && Boolean(task.pickedPlantId)}
        .language=${this.store.ui.$language?.get?.() ?? 'en'}
        @cell-click=${this._handleCellClick}
        @empty-slot-click=${this._handleEmptySlotClick}
        @grid-drop=${this._handleGridDrop}
        @grid-mobile-drop=${this._handleGridMobileDrop}
        @keydown=${this._handleArrangeKeydown}
      ></growspace-grid-ui>
    `;
  }

  /**
   * Handle cell click — updates GridInteraction state, which triggers dialog opening via subscription.
   */
  private _handleCellClick(e: CustomEvent<GridCellClickEvent>) {
    const { cell } = e.detail;
    const plantId = cell.plant?.attributes?.plant_id;
    if (!plantId || !cell.plant) return;
    const task = this.store.ui.$taskState?.get?.() ?? { kind: 'idle' };
    if (task.kind === 'select_plants') {
      this.store.ui.togglePlantSelection(plantId);
      return;
    }
    if (task.kind === 'arrange') {
      if (task.pickedPlantId) this._placeArrangement(cell.row, cell.col);
      else this.store.ui.pickArrangementPlant(plantId, this._plantName(cell.plant));
      return;
    }
    select(plantId);
  }

  /** Find a plant in the current grid by its plant_id. */
  private _findPlant(plantId: string): PlantEntity | null {
    for (const row of this.plants) {
      for (const cell of row) {
        if (cell?.attributes?.plant_id === plantId) return cell;
      }
    }
    return null;
  }

  /** Open the plant overview dialog, preserving edit-mode multi-selection behaviour. */
  private _openDialogForPlant(plantId: string): void {
    const plant = this._findPlant(plantId);
    if (!plant) return;
    if (this.store.ui.$isEditMode.get() && this.store.ui.$selectedPlants.get().size > 0) {
      if (plantId && !this.store.ui.$selectedPlants.get().has(plantId)) {
        this.store.ui.togglePlantSelection(plantId);
      }
      uiSlice.openPlantOverviewDialog(plant, Array.from(this.store.ui.$selectedPlants.get()));
    } else {
      uiSlice.openPlantOverviewDialog(plant);
    }
  }

  /**
   * Handle empty slot click - opens add plant dialog
   */
  private _handleEmptySlotClick(e: CustomEvent<{ row: number; col: number }>) {
    const { row, col } = e.detail;
    const task = this.store.ui.$taskState?.get?.() ?? { kind: 'idle' };
    if (task.kind === 'arrange') {
      if (task.pickedPlantId) this._placeArrangement(row, col);
      return;
    }
    if (task.kind === 'select_plants') return;
    // Convert from 1-based (display) to 0-based (API)
    uiSlice.openAddPlantDialog(this.store.grid.$selectedDevice.get(), row - 1, col - 1);
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
      await this._handlePlantDrop(targetRow, targetCol, targetPlant, draggedPlant);
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
      await this._handlePlantDrop(targetRow, targetCol, targetPlant, sourcePlant);
    }
  }

  /**
   * Drag-drop between grid cells: swap two plants, or move one to an empty cell.
   * The optimistic grid update + undo now live in the Plant slice mutators
   * (`swapPlants` / `movePlantPosition`); this just routes and refreshes.
   */
  private async _handlePlantDrop(
    targetRow: number,
    targetCol: number,
    targetPlant: PlantEntity | null,
    sourcePlant: PlantEntity | null
  ): Promise<void> {
    if (!sourcePlant?.attributes) return;
    const sourceId =
      sourcePlant.attributes.plant_id || sourcePlant.entity_id?.replace('sensor.', '') || '';
    const targetId =
      targetPlant?.attributes.plant_id || targetPlant?.entity_id?.replace('sensor.', '') || '';
    if (sourceId === targetId) return;
    if (!sourcePlant.attributes.growspace_id) return;

    const task = this.store.ui.$taskState?.get?.() ?? { kind: 'idle' };
    if (task.kind === 'arrange' && task.status === 'editing') {
      this.store.ui.pickArrangementPlant(sourceId, this._plantName(sourcePlant));
      this._placeArrangement(targetRow, targetCol);
      return;
    }
    // Plant layout changes are provisional and task-scoped. Outside Arrange,
    // activation opens details and dragging cannot write a position.
    return;
  }

  private _plantName(plant: PlantEntity): string {
    return plant.attributes.strain || plant.attributes.friendly_name || plant.attributes.plant_id;
  }

  private _plantNames(): Record<string, string> {
    return Object.fromEntries(
      this.plants
        .flat()
        .filter((plant): plant is PlantEntity => Boolean(plant))
        .map((plant) => [
          plant.attributes.plant_id || plant.entity_id.replace('sensor.', ''),
          this._plantName(plant),
        ])
    );
  }

  private _placeArrangement(displayRow: number, displayCol: number): void {
    this.store.ui.placeArrangementPlant(displayRow - 1, displayCol - 1, this._plantNames());
  }

  private _handleArrangeKeydown(event: KeyboardEvent): void {
    const task = this.store.ui.$taskState?.get?.() ?? { kind: 'idle' };
    if (task.kind !== 'arrange' || task.status !== 'editing' || !task.pickedPlantId) return;
    const delta: Record<string, [number, number]> = {
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
    };
    const move = delta[event.key];
    if (!move) return;
    const path = event.composedPath();
    const cell = path.find(
      (node): node is HTMLElement =>
        node instanceof HTMLElement &&
        (node.hasAttribute('data-grid-row') || node.tagName === 'PLANT-CARD-CONTAINER')
    );
    const currentRow = Number(cell?.getAttribute('data-grid-row') ?? (cell as any)?.row ?? 1);
    const currentCol = Number(cell?.getAttribute('data-grid-col') ?? (cell as any)?.col ?? 1);
    const row = Math.min(this.rows, Math.max(1, currentRow + move[0]));
    const col = Math.min(this.cols, Math.max(1, currentCol + move[1]));
    event.preventDefault();
    event.stopPropagation();
    this._gridUI?.focusCell(row, col);
    const occupant = Object.entries(task.draft).find(
      ([, placement]) => placement.row === row - 1 && placement.col === col - 1
    )?.[0];
    const names = this._plantNames();
    this.store.ui.announce(
      localizeWithParams(
        'tasks.plant_target',
        {
          row,
          col,
          occupancy:
            (occupant ? (names[occupant] ?? occupant) : null) ??
            localizeWithParams('tasks.empty', {}, this.store.ui.$language.get()),
        },
        this.store.ui.$language.get()
      )
    );
  }

  public focusPlant(index: number): void {
    this._gridUI?.focusCard(index);
  }
}
