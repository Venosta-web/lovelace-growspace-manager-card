/**
 * Plant Card Container - Smart Component
 *
 * Connects ViewModel to UI component and dispatches actions.
 * Handles store access, subscriptions, and event-to-action mapping.
 */

import { LitElement, html, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { StoreController } from '@nanostores/lit';
import type { ReadableAtom } from 'nanostores';
import { storeContext } from '../../../context';
import type { GrowspaceStore } from '../../../store/core/growspace-store';
import type { PlantEntity } from '../../../types';
import { DragDropController, DragDropHost } from '../../../controllers/drag-drop-controller';
import {
  createPlantCardViewModel,
  type PlantCardViewModel,
} from '../viewmodels/plant-card.viewmodel';
import '../components/plant-card-ui';

/**
 * Container component for plant card
 */
@customElement('plant-card-container')
export class PlantCardContainer extends LitElement implements DragDropHost {
  // Input props
  @property({ attribute: false }) plant!: PlantEntity;
  @property({ type: Number }) row!: number;
  @property({ type: Number }) col!: number;
  @property({ type: Boolean }) forceDraggable = false;

  // Store access
  @consume({ context: storeContext })
  private store!: GrowspaceStore;

  // ViewModel
  private viewModel!: ReadableAtom<PlantCardViewModel>;
  private viewModelController!: StoreController<PlantCardViewModel>;

  // Drag & drop controller
  private dragController = new DragDropController(this);

  // Satisfy DragDropHost interface
  get isEditMode(): boolean {
    return this.viewModelController?.value?.isEditMode ?? false;
  }

  get selected(): boolean {
    return this.viewModelController?.value?.isSelected ?? false;
  }

  connectedCallback(): void {
    super.connectedCallback();

    if (this.plant && this.store) {
      // Create ViewModel for this plant
      this.viewModel = createPlantCardViewModel(this.plant, this.store);
      this.viewModelController = new StoreController(this, this.viewModel);
    }
  }

  /**
   * Focus the card
   */
  public focus(options?: FocusOptions): void {
    const cardUI = this.shadowRoot?.querySelector('plant-card-ui') as any;
    if (cardUI && typeof cardUI.focus === 'function') {
      cardUI.focus(options);
    } else {
      super.focus(options);
    }
  }

  render(): TemplateResult {
    if (!this.viewModelController) {
      return html``;
    }

    const vm = this.viewModelController.value;

    return html`
      <plant-card-ui
        .plant=${vm.plant}
        .displayData=${vm.displayData}
        .statusIndicators=${vm.statusIndicators}
        .isSelected=${vm.isSelected}
        .isEditMode=${vm.isEditMode}
        .isDraggable=${vm.isDraggable}
        .growthDeviation=${vm.growthDeviation}
        .ariaLabel=${vm.ariaLabel}
        .checkboxAriaLabel=${vm.checkboxAriaLabel}
        @plant-click=${this._handlePlantClick}
        @plant-toggle-selection=${this._handleToggleSelection}
      ></plant-card-ui>
    `;
  }

  // Event handlers - dispatch actions through store

  private _handlePlantClick(e: CustomEvent): void {
    const { plant } = e.detail;

    // Open plant overview dialog
    this.store.ui.setActiveDialog({
      type: 'PLANT_OVERVIEW',
      payload: {
        plant,
        editedAttributes: {},
        activeTab: 'dashboard',
      },
    });
  }

  private _handleToggleSelection(e: CustomEvent): void {
    const { plant } = e.detail;
    const plantId = plant.attributes?.plant_id || plant.entity_id.replace('sensor.', '');

    // Toggle plant selection
    this.store.ui.togglePlantSelection(plantId);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'plant-card-container': PlantCardContainer;
  }
}
