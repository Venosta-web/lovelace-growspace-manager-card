import { LitElement, html, CSSResultGroup, PropertyValues, css, TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { provide } from '@lit/context';

import { hassContext, configContext } from '../lib/context';
import { storeContext } from '../lib/context';
import { HomeAssistant, LovelaceCard, LovelaceCardEditor } from 'custom-card-helpers';

import type { GrowspaceManagerCardConfig } from '../lib/types/config';
import { ViewMode } from '../features/environment/constants';

import { growspaceStoreRegistry } from '../store/core/growspace-store-registry';
import '../features/ui/containers/growspace-dialog-host.container';
import '../features/ui/containers/growspace-toast.container';
import '../features/shared/layouts/growspace-view-switcher';
import '../features/shared/ui/error-boundary';

import { sharedStyles } from '../styles/shared.styles';
import { uiStyles } from '../styles/ui.styles';
import { growspaceCardStyles } from '../styles/growspace-card.styles';
import { variables } from '../styles/variables';

import { GrowspaceStore } from '../store/core/growspace-store';
import { StoreController } from '@nanostores/lit';
import { startTransplant, completeTransplant, gridInteraction$ } from '../slices/grid-interaction';

@customElement('growspace-grid-card')
export class GrowspaceGridCard extends LitElement implements LovelaceCard {
  private _sharedStore = growspaceStoreRegistry.acquire();

  @provide({ context: storeContext })
  store = new GrowspaceStore(this._sharedStore);

  protected _viewController = new StoreController(this, this.store.$sharedCardViewState);

  get selectedDevice() {
    return this._viewController.value.grid.selectedDevice;
  }

  @provide({ context: hassContext })
  @property({ attribute: false })
  hass!: HomeAssistant;

  @provide({ context: configContext })
  @property({ attribute: false })
  _config!: GrowspaceManagerCardConfig;

  static styles: CSSResultGroup = [
    variables,
    sharedStyles,
    uiStyles,
    growspaceCardStyles,
    css`
      ha-card {
        padding: 0;
        background: transparent;
        border: none;
        box-shadow: none;
      }
      .unified-growspace-card {
        /* Remove default margins/padding to fit nicely in nested cards */
        margin: 0;
      }
    `,
  ];

  protected firstUpdated() {
    if (this.hass) {
      this.store.updateHass(this.hass);
    }
    const forcedConfig = {
      ...this._config,
      compact: true,
      initial_view_mode: ViewMode.STANDARD as unknown as string,
    };
    this.store.initializeSelectedDevice(forcedConfig as GrowspaceManagerCardConfig);
    this.store.ui.setViewMode(ViewMode.STANDARD);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.store.destroy();
    growspaceStoreRegistry.release();
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);

    if (changedProps.has('hass') && this.hass) {
      this.store.updateHass(this.hass);
    }
  }

  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import('./editors/growspace-grid-card-editor.js');
    return document.createElement('growspace-grid-card-editor') as unknown as LovelaceCardEditor;
  }

  public static getStubConfig() {
    return {
      type: 'custom:growspace-grid-card',
      default_growspace: '',
    };
  }

  public setConfig(config: GrowspaceManagerCardConfig): void {
    if (!config) throw new Error('Invalid configuration');
    this._config = config;

    // Force configuration overrides for the dedicated grid card
    const forcedConfig = {
      ...this._config,
      compact: true,
      initial_view_mode: ViewMode.STANDARD as unknown as string,
    };
    this.store.initializeSelectedDevice(forcedConfig as GrowspaceManagerCardConfig);
    this.store.ui.setViewMode(ViewMode.STANDARD);
  }

  public getCardSize(): number {
    return 3;
  }

  public getLayoutOptions() {
    return {
      grid_columns: 12,
      grid_min_columns: 6,
      grid_min_rows: 4,
    };
  }

  // Event handlers
  private _handleKeyboardNav(e: KeyboardEvent) {
    this.store.actions.ui.handleKeyboardNavigation(e.key);
  }

  private _handleSelectAll = () => this.store.actions.ui.selectAllPlants();
  private _handleClearSelection = () => this.store.actions.ui.clearPlantSelection();
  private _handleWaterSelected = () => this.store.actions.ui.openBatchWateringDialog();
  private _handleExitEditMode = () => this.store.ui.setEditMode(false);
  private _handleIPMSelected = () => this.store.actions.ui.openIPMDialog();
  private _handleTrainingSelected = () => this.store.actions.ui.openBatchTrainingDialog();
  private _handleBatchAddPlants = () =>
    this.store.ui.setActiveDialog({ type: 'ADD_PLANTS', payload: {} });
  private _handleDeleteSelected = () => void this.store.actions.ui.deleteSelectedPlants();
  private _handleTransplantMode = () => {
    if (gridInteraction$.get().status === 'transplanting') {
      completeTransplant();
      this.store.ui.setEditMode(true);
    } else {
      this.store.ui.setEditMode(false);
      startTransplant();
    }
  };

  // We ignore growspace changes and view mode changes as this card is dedicated
  // to a specific view. Growspace changes are handled contextually if needed.
  private _handleGrowspaceChanged(e: CustomEvent) {
    this.store.handleDeviceChange(e.detail);
  }

  protected render(): TemplateResult {
    if (!this.hass) {
      return html`<ha-card><div class="error">Home Assistant not available</div></ha-card>`;
    }

    const { devices, selectedDevice, growspaceOptions, gridLayout } =
      this._viewController.value.grid;
    const { effectiveRows, grid } = gridLayout;

    if (this._viewController.value.ui.isLoading) {
      return html`
        <ha-card>
          <div class="loading-container">
            <ha-circular-progress active></ha-circular-progress>
          </div>
        </ha-card>
      `;
    }

    if (!devices.length) {
      return html`<ha-card><div class="no-data">No growspace devices found.</div></ha-card>`;
    }

    const selectedDeviceData = devices.find((d) => d.deviceId === selectedDevice);
    if (!selectedDeviceData) {
      return html`<ha-card
        ><div class="error">No valid growspace selected. Please configure the card.</div></ha-card
      >`;
    }

    const isWide = selectedDeviceData.plantsPerRow > 7;

    return html`
      <error-boundary
        .fallbackMessage=${'Failed to load Growspace Grid'}
        .onError=${this._handleError}
      >
        <ha-card class=${isWide ? 'wide-growspace' : ''}>
          <div
            class="unified-growspace-card glass-surface glass-panel"
            role="region"
            aria-label="Growspace Grid: ${selectedDeviceData.name}"
            tabindex="0"
            @keydown=${this._handleKeyboardNav}
            @growspace-changed=${this._handleGrowspaceChanged}
            @select-all=${this._handleSelectAll}
            @clear-selection=${this._handleClearSelection}
            @water-selected=${this._handleWaterSelected}
            @training-selected=${this._handleTrainingSelected}
            @ipm-selected=${this._handleIPMSelected}
            @batch-add-plants=${this._handleBatchAddPlants}
            @delete-selected=${this._handleDeleteSelected}
            @transplant-mode=${this._handleTransplantMode}
            @exit-edit-mode=${this._handleExitEditMode}
          >
            <!-- Render the switcher but essentially lock it to standard grid -->
            <growspace-view-switcher
              .viewMode=${ViewMode.STANDARD}
              .hass=${this.hass}
              .device=${selectedDeviceData}
              .growspaceOptions=${growspaceOptions}
              .grid=${grid}
              .rows=${effectiveRows}
              .isEditMode=${this._viewController.value.ui.isEditMode}
              .isCompact=${true}
              .selectedCount=${this._viewController.value.ui.selectedPlants.size}
              .config=${this._config}
              .isLoading=${this._viewController.value.ui.isLoading}
              .focusedPlantIndex=${this._viewController.value.ui.focusedPlantIndex}
            ></growspace-view-switcher>
          </div>
        </ha-card>

        <growspace-toast></growspace-toast>
        <growspace-dialog-host .devices=${devices}></growspace-dialog-host>
      </error-boundary>
    `;
  }

  private _handleError = (error: Error, errorInfo: unknown) => {
    console.error('Growspace Grid Card caught error:', error, errorInfo);
    if (this.hass) {
      this.hass.callService('system_log', 'write', {
        message: `Growspace Grid Card Error: ${error.message}`,
        level: 'error',
        logger: 'lovelace_growspace_manager_card',
      });
    }
  };
}
