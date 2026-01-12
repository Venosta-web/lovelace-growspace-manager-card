import {
  LitElement,
  html,
  CSSResultGroup,
  TemplateResult,
  PropertyValues,
} from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { provide } from '@lit/context';

import { hassContext, configContext, strainLibraryContext, storeContext } from './context';
import { HomeAssistant, LovelaceCard, LovelaceCardEditor } from 'custom-card-helpers';



import { GrowspaceManagerCardConfig, PlantEntity, GrowspaceDevice, StrainEntry } from './types';
import { ViewMode } from './constants';

import { SubscriptionController } from './controllers/subscription-controller';
import './growspace-env-chart';
import './components/manager/dialog-host';
import './components/manager/edit-mode-banner';
import './components/plant-card';
import './components/growspace-header';
import './components/growspace-toast';
import './components/manager/batch-action-bar';
import { LibraryExportReadyEvent } from './events';
import './components/growspace-view-switcher';
import './components/ui'; // Register MD3 components
import { sharedStyles } from './styles/shared.styles';
import { uiStyles } from './styles/ui.styles';
import { growspaceCardStyles } from './styles/growspace-card.styles';
import { variables } from './styles/variables';
import { GrowspaceStore } from './store/growspace-store';
import { StoreController } from '@nanostores/lit';



@customElement('growspace-manager-card')
export class GrowspaceManagerCard extends LitElement implements LovelaceCard {
  @provide({ context: storeContext })
  accessor store = new GrowspaceStore();

  protected _subscriptionController = new SubscriptionController(this, this.store.data, () => this.store.updateHass(this.hass));

  // UI Store Controllers
  // Consolidated UI Controller
  protected _cardViewController = new StoreController(this, this.store.ui.$cardViewState);
  protected _selectedPlantsController = new StoreController(this, this.store.ui.$selectedPlants);

  // Data Store Controllers (for reactivity)
  protected _devicesController = new StoreController(this, this.store.data.$devices);
  protected _selectedDeviceController = new StoreController(this, this.store.data.$selectedDevice);
  protected _strainLibraryController = new StoreController(this, this.store.data.$strainLibrary);

  // Grid derived atoms
  protected _activeDevicesController = new StoreController(this, this.store.grid.$activeDevices);
  protected _gridLayoutController = new StoreController(this, this.store.grid.$gridLayout);
  protected _growspaceOptionsController = new StoreController(this, this.store.grid.$growspaceOptions);

  /* Getter for convenience/compatibility if needed, or update call sites */
  get selectedDevice() {
    return this._selectedDeviceController.value;
  }

  @provide({ context: strainLibraryContext })
  @state()
  accessor _strainLibrary: StrainEntry[] = [];

  // Getter to satisfy GrowspaceCardHost interface and allow external access
  get dataService() {
    return this.store.dataService;
  }

  // Getter to provide pre-loaded devices to the history controller
  get devices() {
    return this._devicesController.value as GrowspaceDevice[];
  }

  @provide({ context: hassContext })
  @property({ attribute: false })
  accessor hass!: HomeAssistant;

  @provide({ context: configContext })
  @property({ attribute: false })
  accessor _config!: GrowspaceManagerCardConfig;

  static styles: CSSResultGroup = [variables, sharedStyles, uiStyles, growspaceCardStyles];

  protected firstUpdated() {
    this.store.updateHass(this.hass);
    this.store.initializeSelectedDevice(this._config);
    this.store.fetchStrainLibrary();
  }

  connectedCallback() {
    super.connectedCallback();
    // Listen for export ready events from store
    this.addEventListener(LibraryExportReadyEvent.TYPE, this._handleLibraryExportReady);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener(LibraryExportReadyEvent.TYPE, this._handleLibraryExportReady);
  }

  private _handleLibraryExportReady = (e: LibraryExportReadyEvent) => {
    this._downloadFile(e.detail.url);
  };

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);

    if (changedProps.has('hass')) {
      this.store.updateHass(this.hass);
      this._subscriptionController.updateHass(this.hass);
    }

    // Sync strain library to context provider
    if (this._strainLibraryController.value !== this._strainLibrary) {
      this._strainLibrary = (this._strainLibraryController.value || []) as StrainEntry[];
    }
  }

  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    // path must match where the editor JS is served relative to the card script
    await import('./growspace-manager-card-editor.js');
    const el = document.createElement(
      'growspace-manager-card-editor'
    ) as unknown as LovelaceCardEditor;
    return el;
  }

  public static getStubConfig() {
    return {
      default_growspace: '4x4',
      compact: true,
    };
  }

  public setConfig(config: GrowspaceManagerCardConfig): void {
    if (!config) throw new Error('Invalid configuration');
    this._config = config;
    if (this._config.initial_view_mode) {
      this.store.ui.setViewMode(this._config.initial_view_mode);
    } else if (this._config.compact !== undefined && this._config.compact) {
      this.store.ui.setViewMode(ViewMode.COMPACT);
    }

    // Initialize store config immediately to prevent race conditions with updateHass
    this.store.initializeSelectedDevice(this._config);
  }

  public getCardSize(): number {
    return 4;
  }

  // Event handlers
  private _handleKeyboardNav(e: KeyboardEvent) {
    this.store.handleKeyboardNavigation(e.key);
  }



  private _downloadFile(url: string) {
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = url.split('/').pop() || 'export.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  private _handleViewModeChanged(e: CustomEvent) {
    this.store.ui.setViewMode(e.detail.mode);
  }

  private _handleGrowspaceChanged(e: CustomEvent) {
    this.store.handleDeviceChange(e.detail);
  }

  private _handleSelectAll() {
    this.store.selectAllPlants();
  }

  private _handleClearSelection() {
    this.store.clearPlantSelection();
  }

  private _handleWaterSelected() {
    this.store.openBatchWateringDialog();
  }

  private _handleExitEditMode() {
    this.store.ui.setEditMode(false);
  }

  private _handleIPMSelected() {
    this.store.openIPMDialog();
  }

  private _handleToggleExpansion() {
    this.store.toggleHeaderExpansion();
  }

  private _handleTrainingSelected() {
    this.store.openBatchTrainingDialog();
  }

  private _handleBatchAddPlants() {
    this.store.ui.setActiveDialog({ type: 'ADD_PLANTS', payload: {} });
  }

  protected render(): TemplateResult {
    if (!this.hass) {
      return html`<ha-card><div class="error">Home Assistant not available</div></ha-card>`;
    }

    const devices = this._activeDevicesController.value;

    // Show loading spinner if initially loading and no devices yet
    if (this._cardViewController.value.isLoading) {
      return html`
        <ha-card>
          <div class="loading-container">
            <div class="loading-spinner"></div>
          </div>
        </ha-card>
      `;
    }

    if (!devices.length) {
      return html`<ha-card><div class="no-data">No growspace devices found.</div></ha-card>`;
    }

    const selectedDeviceData = devices.find((d) => d.device_id === this.selectedDevice);
    if (!selectedDeviceData) {
      return html`<ha-card><div class="error">No valid growspace selected.</div></ha-card>`;
    }

    // Use memoized values from grid store atoms
    const growspaceOptions = this._growspaceOptionsController.value;
    const { effectiveRows, grid } = this._gridLayoutController.value;
    const isWide = selectedDeviceData.plants_per_row > 7;

    return html`
      <ha-card class=${isWide ? 'wide-growspace' : ''}>
        <div class="sr-only-announcer" aria-live="polite"></div>
        <div 
            class="unified-growspace-card glass-surface glass-panel" 
            role="region"
            aria-label="Growspace: ${selectedDeviceData.name}"
            tabindex="0" 
            @keydown=${this._handleKeyboardNav}
            @view-mode-changed=${this._handleViewModeChanged}
            @growspace-changed=${this._handleGrowspaceChanged}
            @toggle-expansion=${this._handleToggleExpansion}
            @select-all=${this._handleSelectAll}
            @clear-selection=${this._handleClearSelection}
            @water-selected=${this._handleWaterSelected}
            @training-selected=${this._handleTrainingSelected}
            @ipm-selected=${this._handleIPMSelected}
            @batch-add-plants=${this._handleBatchAddPlants}
            @exit-edit-mode=${this._handleExitEditMode}
        >
          <growspace-view-switcher
            .viewMode=${this._cardViewController.value.viewMode}
            .device=${selectedDeviceData}
            .growspaceOptions=${growspaceOptions}
            .grid=${grid}
            .rows=${effectiveRows}
            .isEditMode=${this._cardViewController.value.isEditMode}
            .isCompact=${this._cardViewController.value.isCompact}
            .selectedCount=${this._selectedPlantsController.value.size}
            .config=${this._config}
            .isLoading=${this._cardViewController.value.isLoading}
            .focusedPlantIndex=${this._cardViewController.value.focusedPlantIndex}
          ></growspace-view-switcher>
          
          <batch-action-bar></batch-action-bar>
        </div>
      </ha-card>

      <growspace-toast></growspace-toast>
      ${this.renderDialogs()}
    `;
  }

  private renderDialogs(): TemplateResult {
    return html`<growspace-dialog-host
      .devices=${this._devicesController.value}
    ></growspace-dialog-host>`;
  }
}


