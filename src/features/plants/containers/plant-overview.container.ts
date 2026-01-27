/**
 * Plant Overview Container - Smart Component
 *
 * Connects ViewModel to UI components and dispatches actions.
 * Handles store access, subscriptions, and event-to-action mapping.
 */

import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { StoreController } from '@nanostores/lit';
import type { ReadableAtom } from 'nanostores';
import { mdiClose, mdiDna, mdiDelete, mdiCheck } from '@mdi/js';
import { hassContext, storeContext } from '../../../context';
import type { GrowspaceStore } from '../../../store/core/growspace-store';
import type { PlantEntity, PlantOverviewEditedAttributes, PlantAttributeValue } from '../../../types';
import { PlantUtils } from '../../../utils/plant-utils';
import { dialogStyles } from '../../../styles/dialog.styles';
import {
  createPlantOverviewViewModel,
  type PlantOverviewViewModel,
} from '../viewmodels/plant-overview.viewmodel';
import type { HomeAssistant } from 'custom-card-helpers';
import {
  UpdatePlantEvent,
  DeletePlantEvent,
  HarvestPlantEvent,
  FinishDryingEvent,
  TakeCloneEvent,
  MoveCloneEvent,
} from '../../../events';

// Import UI components
import '../components/plant-dashboard-tab';
import '../components/plant-actions-tab';
import '../components/plant-timeline-tab';

/**
 * Container component for plant overview dialog
 */
@customElement('plant-overview-container')
export class PlantOverviewContainer extends LitElement {
  // Context
  @consume({ context: hassContext, subscribe: true })
  hass!: HomeAssistant;

  @consume({ context: storeContext })
  private store!: GrowspaceStore;

  // Input props
  @property({ attribute: false }) plant!: PlantEntity;
  @property({ attribute: false }) editedAttributes!: PlantOverviewEditedAttributes;
  @property({ type: Boolean, reflect: true }) open = false;

  // Local UI state
  @state() private _activeTab: 'dashboard' | 'actions' | 'timeline' = 'dashboard';
  @state() private _isEditing = true;
  @state() private _showAllDates = false;
  @state() private _showDeleteConfirmation = false;

  // ViewModel
  private viewModel!: ReadableAtom<PlantOverviewViewModel>;
  private viewModelController!: StoreController<PlantOverviewViewModel>;

  static styles = [
    dialogStyles,
    css`
      :host {
        display: block;
      }

      .overview-grid {
        padding: 24px;
        overflow-y: auto;
        max-height: 60vh;
      }

      .tabs-container {
        display: flex;
        gap: 0;
        padding: 0 24px;
        border-bottom: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
      }

      .tab-btn {
        background: transparent;
        border: none;
        color: var(--primary-text-color);
        cursor: pointer;
        padding: 12px 16px;
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 0.9rem;
        border-bottom: 2px solid transparent;
        transition: all 0.2s;
      }

      .tab-btn:hover {
        background: var(--secondary-background-color, rgba(255, 255, 255, 0.05));
      }

      .tab-btn.active {
        border-bottom-color: var(--primary-color, #4caf50);
        color: var(--primary-color, #4caf50);
      }

      .tab-btn svg {
        width: 20px;
        height: 20px;
        fill: currentColor;
      }

      .delete-overlay {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.95);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        backdrop-filter: blur(4px);
      }

      .delete-confirm-card {
        background: var(--card-background-color, #2c2c2c);
        border-radius: 16px;
        padding: 32px;
        max-width: 400px;
        text-align: center;
      }

      .delete-confirm-card h3 {
        margin: 0 0 16px 0;
        color: var(--error-color, #f44336);
      }

      .delete-confirm-card p {
        margin: 0 0 24px 0;
        opacity: 0.8;
      }

      .delete-actions {
        display: flex;
        gap: 12px;
        justify-content: center;
      }
    `,
  ];

  connectedCallback(): void {
    super.connectedCallback();

    if (this.plant && this.store) {
      // Create ViewModel for this dialog
      this.viewModel = createPlantOverviewViewModel(
        this.plant,
        this.editedAttributes,
        {
          activeTab: this._activeTab,
          isEditing: this._isEditing,
          showAllDates: this._showAllDates,
          showDeleteConfirmation: this._showDeleteConfirmation,
        },
        this.store
      );
      this.viewModelController = new StoreController(this, this.viewModel);
    }
  }

  willUpdate(changedProps: Map<string, unknown>): void {
    // Recreate ViewModel if inputs change
    if (
      (changedProps.has('plant') ||
        changedProps.has('editedAttributes') ||
        changedProps.has('_activeTab') ||
        changedProps.has('_isEditing') ||
        changedProps.has('_showAllDates') ||
        changedProps.has('_showDeleteConfirmation')) &&
      this.plant &&
      this.store
    ) {
      this.viewModel = createPlantOverviewViewModel(
        this.plant,
        this.editedAttributes,
        {
          activeTab: this._activeTab,
          isEditing: this._isEditing,
          showAllDates: this._showAllDates,
          showDeleteConfirmation: this._showDeleteConfirmation,
        },
        this.store
      );
      // Recreate controller with new ViewModel
      this.viewModelController = new StoreController(this, this.viewModel);
    }
  }

  render(): TemplateResult {
    if (!this.viewModelController) {
      return html``;
    }

    const vm = this.viewModelController.value;

    return html`
      <ha-dialog
        open
        @closed=${this._handleClose}
        hideActions
        .scrimClickAction=${''}
        .escapeKeyAction=${'close'}
      >
        <div class="glass-dialog-container" style="--stage-color: ${vm.stageColor}">
          ${this._showDeleteConfirmation ? this._renderDeleteOverlay(vm) : nothing}

          <!-- HEADER -->
          ${this._renderHeader(vm)}

          <!-- TABS -->
          ${this._renderTabs()}

          <!-- CONTENT -->
          <div class="overview-grid">
            ${this._activeTab === 'dashboard' ? this._renderDashboard(vm) : nothing}
            ${this._activeTab === 'actions' ? this._renderActions(vm) : nothing}
            ${this._activeTab === 'timeline' ? this._renderTimeline(vm) : nothing}
          </div>

          <!-- ACTIONS -->
          ${this._renderFooter(vm)}
        </div>
      </ha-dialog>
    `;
  }

  private _renderHeader(vm: PlantOverviewViewModel): TemplateResult {
    return html`
      <div class="dialog-header">
        <div class="dialog-icon">
          <svg style="width:32px;height:32px;fill:currentColor;" viewBox="0 0 24 24">
            <path d="${vm.stageIcon}"></path>
          </svg>
        </div>
        <div class="dialog-title-group">
          <h2 class="dialog-title">${vm.displayName}</h2>
          <div class="dialog-subtitle">${vm.displaySubtitle}</div>
        </div>
        <button
          class="md3-button text"
          @click=${this._openStrainEditor}
          style="min-width: auto; padding: 8px;"
          title="Edit Strain Library Entry"
        >
          <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24">
            <path d="${mdiDna}"></path>
          </svg>
        </button>
        <button
          class="md3-button text"
          @click=${this._handleClose}
          style="min-width: auto; padding: 8px;"
          aria-label="Close"
          title="Close"
        >
          <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24">
            <path d="${mdiClose}"></path>
          </svg>
        </button>
      </div>
    `;
  }

  private _renderTabs(): TemplateResult {
    return html`
      <div class="tabs-container">
        <button
          class="tab-btn ${this._activeTab === 'dashboard' ? 'active' : ''}"
          @click=${() => (this._activeTab = 'dashboard')}
        >
          <svg viewBox="0 0 24 24">
            <path
              d="M13,3V9H21V3M13,21H21V11H13M3,21H11V15H3M3,13H11V3H3V13Z"
            ></path>
          </svg>
          Overview
        </button>
        <button
          class="tab-btn ${this._activeTab === 'actions' ? 'active' : ''}"
          @click=${() => (this._activeTab = 'actions')}
        >
          <svg viewBox="0 0 24 24">
            <path
              d="M7,2V13H10V22L17,10H13L17,2H7Z"
            ></path>
          </svg>
          Actions
        </button>
        <button
          class="tab-btn ${this._activeTab === 'timeline' ? 'active' : ''}"
          @click=${() => (this._activeTab = 'timeline')}
        >
          <svg viewBox="0 0 24 24">
            <path
              d="M12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22C6.47,22 2,17.5 2,12A10,10 0 0,1 12,2M12.5,7V12.25L17,14.92L16.25,16.15L11,13V7H12.5Z"
            ></path>
          </svg>
          Timeline
        </button>
      </div>
    `;
  }

  private _renderDashboard(vm: PlantOverviewViewModel): TemplateResult {
    return html`
      <plant-dashboard-tab
        .plant=${vm.plant}
        .editedAttributes=${vm.editedAttributes}
        .plantStats=${vm.plantStats}
        .isEditing=${vm.isEditing}
        .showAllDates=${vm.showAllDates}
        @attribute-change=${this._handleAttributeChange}
        @toggle-dates=${this._handleToggleDates}
      ></plant-dashboard-tab>
    `;
  }

  private _renderActions(vm: PlantOverviewViewModel): TemplateResult {
    return html`
      <plant-actions-tab
        .availableActions=${vm.availableActions}
        @action-click=${this._handleActionClick}
      ></plant-actions-tab>
    `;
  }

  private _renderTimeline(vm: PlantOverviewViewModel): TemplateResult {
    return html`
      <plant-timeline-tab .timelineEvents=${vm.timelineEvents}></plant-timeline-tab>
    `;
  }

  private _renderFooter(vm: PlantOverviewViewModel): TemplateResult {
    return html`
      <div
        class="dialog-actions"
        style="display:flex; justify-content:space-between; align-items:center; gap:12px; padding: 16px 24px; border-top: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1)); flex-wrap: wrap;"
      >
        <div class="standard-actions" style="display:flex; gap:12px;">
          <button class="md3-button danger" @click=${() => this._handleDelete(vm.plantId)}>
            <svg
              style="width:18px;height:18px;fill:currentColor;margin-right:4px;"
              viewBox="0 0 24 24"
            >
              <path d="${mdiDelete}"></path>
            </svg>
            Delete
          </button>
        </div>
        <div class="primary-actions" style="display:flex; gap:12px;">
          <button class="md3-button outlined" @click=${this._handleClose}>Cancel</button>
          <button
            class="md3-button filled"
            @click=${this._handleSave}
            ?disabled=${!vm.canSave}
          >
            <svg
              style="width:18px;height:18px;fill:currentColor;margin-right:4px;"
              viewBox="0 0 24 24"
            >
              <path d="${mdiCheck}"></path>
            </svg>
            Save Changes
          </button>
        </div>
      </div>
    `;
  }

  private _renderDeleteOverlay(vm: PlantOverviewViewModel): TemplateResult {
    return html`
      <div class="delete-overlay">
        <div class="delete-confirm-card">
          <h3>Delete Plant?</h3>
          <p>
            Are you sure you want to delete <strong>${vm.displayName}</strong>? This action cannot
            be undone.
          </p>
          <div class="delete-actions">
            <button class="md3-button outlined" @click=${this._cancelDelete}>Cancel</button>
            <button class="md3-button danger" @click=${this._confirmDelete}>Delete</button>
          </div>
        </div>
      </div>
    `;
  }

  // Event handlers

  private _handleClose(): void {
    this.store.ui.closeDialog();
  }

  private _handleAttributeChange(e: CustomEvent): void {
    const { key, value } = e.detail;
    this.editedAttributes = {
      ...this.editedAttributes,
      [key]: value,
    };
  }

  private _handleToggleDates(): void {
    this._showAllDates = !this._showAllDates;
  }

  private _handleSave(): void {
    // Update plant through store
    const plantId = this.plant.attributes?.plant_id || this.plant.entity_id.replace('sensor.', '');
    this.store.updatePlantFromDialog({
      plant: this.plant,
      editedAttributes: this.editedAttributes,
      selectedPlantIds: [plantId],
    });
    this._handleClose();
  }

  private _handleDelete(plantId: string): void {
    this._showDeleteConfirmation = true;
  }

  private _confirmDelete(): void {
    const plantId = this.plant.attributes?.plant_id || this.plant.entity_id.replace('sensor.', '');
    this.store.actions.plant.delete(plantId);
    this._handleClose();
  }

  private _cancelDelete(): void {
    this._showDeleteConfirmation = false;
  }

  private _handleActionClick(e: CustomEvent): void {
    const { actionId } = e.detail;

    // Open appropriate dialogs based on action
    switch (actionId) {
      case 'water':
        this._openWatering();
        break;
      case 'training':
        this._openTraining();
        break;
      case 'ipm':
        this._openIPM();
        break;
      case 'clone':
        this._openClone();
        break;
    }
  }

  private _openWatering(): void {
    const plantId = this.plant.attributes?.plant_id || this.plant.entity_id.replace('sensor.', '');
    this.store.ui.setActiveDialog({
      type: 'WATERING',
      payload: {
        plantIds: [plantId],
        growspaceId: this.plant.attributes?.growspace_id,
        mode: 'plant',
      },
    });
  }

  private _openTraining(): void {
    const plantId = this.plant.attributes?.plant_id || this.plant.entity_id.replace('sensor.', '');
    this.store.ui.setActiveDialog({
      type: 'TRAINING',
      payload: {
        isOpen: true,
        plantIds: [plantId],
        growspaceId: this.plant.attributes?.growspace_id,
      },
    });
  }

  private _openIPM(): void {
    const plantId = this.plant.attributes?.plant_id || this.plant.entity_id.replace('sensor.', '');
    this.store.ui.setActiveDialog({
      type: 'IPM',
      payload: {
        plantIds: [plantId],
        growspaceId: this.plant.attributes?.growspace_id,
      },
    });
  }

  private _openClone(): void {
    this.store.ui.setActiveDialog({
      type: 'TAKE_CLONE',
      payload: {
        sourcePlant: this.plant,
        defaultGrowspaceId: this.plant.attributes?.growspace_id || '',
      },
    });
  }

  private _openStrainEditor(): void {
    this.store.ui.setActiveDialog({
      type: 'STRAIN_LIBRARY',
      payload: {},
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'plant-overview-container': PlantOverviewContainer;
  }
}
