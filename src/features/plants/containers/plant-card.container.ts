/**
 * Plant Card Container - Smart Component
 *
 * Connects ViewModel to UI component and dispatches actions.
 * Handles store access, subscriptions, and event-to-action mapping.
 */

import { LitElement, html, css, type TemplateResult } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { StoreController } from '@nanostores/lit';
import { atom, computed, type ReadableAtom } from 'nanostores';
import { storeContext } from '../../../context';
import type { GrowspaceStore } from '../../../store/core/growspace-store';
import type { PlantEntity } from '../../../types';
import { nutrientPresets$ } from '../../../slices/nutrient';
import { strainLibrary$ } from '../../../slices/strain';
import { DragDropController, DragDropHost } from '../../../controllers/drag-drop-controller';
import {
  createPlantCardViewModel,
  type PlantCardViewModel,
} from '../viewmodels/plant-card.viewmodel';
import { PlantCardUI } from '../components/plant-card-ui';
import '../components/plant-card-ui';

/**
 * Container component for plant card
 */
@customElement('plant-card-container')
export class PlantCardContainer extends LitElement implements DragDropHost {
  static styles = css`
    .plant-card-skeleton {
      aspect-ratio: 1;
      border-radius: 8px;
      background: var(--card-background-color, #1c1c1e);
      animation: skeleton-pulse 1.5s ease-in-out infinite;
    }
    @keyframes skeleton-pulse {
      0%,
      100% {
        opacity: 0.4;
      }
      50% {
        opacity: 0.8;
      }
    }
  `;

  // Input props
  @property({ attribute: false }) plant!: PlantEntity;
  @property({ type: Number }) row!: number;
  @property({ type: Number }) col!: number;
  @property({ type: Boolean }) forceDraggable = false;

  @query('plant-card-ui') private _cardUI?: PlantCardUI;

  // Store access
  @consume({ context: storeContext, subscribe: true })
  @property({ attribute: false })
  public store!: GrowspaceStore;

  // Reactive plant atom — updated via willUpdate so the ViewModel reacts to entity changes
  private $plant = atom<PlantEntity | null>(null);

  // ViewModel
  private viewModel!: ReadableAtom<PlantCardViewModel | null>;
  private viewModelController!: StoreController<PlantCardViewModel | null>;

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
    if (this.plant) {
      this.$plant.set(this.plant);
    }
    if (this.store) {
      this.viewModel = createPlantCardViewModel(this.$plant, {
        $isEditMode: this.store.ui.$isEditMode,
        $selectedPlants: this.store.ui.$selectedPlants,
        $strainLibrary: strainLibrary$,
        $nutrientPresets: computed([nutrientPresets$], (p) => p ?? {}),
        $devices: this.store.data.$devices,
      });
      this.viewModelController = new StoreController(this, this.viewModel);
    }
  }

  willUpdate(changedProperties: Map<string, unknown>): void {
    if (changedProperties.has('plant') && this.plant) {
      this.$plant.set(this.plant);
    }
  }

  /**
   * Focus the card
   */
  public focus(options?: FocusOptions): void {
    if (this._cardUI && typeof this._cardUI.focus === 'function') {
      this._cardUI.focus(options);
    } else {
      super.focus(options);
    }
  }

  render(): TemplateResult {
    const vm = this.viewModelController?.value ?? null;
    if (!vm) {
      return html`<div class="plant-card-skeleton"></div>`;
    }

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
