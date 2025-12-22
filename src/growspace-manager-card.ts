import {
  LitElement,
  html,
  CSSResultGroup,
  TemplateResult,
  PropertyValues,
  ReactiveControllerHost,
} from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { provide } from '@lit/context';

import { hassContext, configContext, strainLibraryContext, storeContext, historyContext } from './context';
import { HomeAssistant, LovelaceCard, LovelaceCardEditor } from 'custom-card-helpers';
import { mdiCheckboxMarked, mdiFullscreenExit, mdiChevronDown, mdiChevronUp } from '@mdi/js';


import { GrowspaceManagerCardConfig, PlantEntity, GrowspaceDevice, StrainEntry } from './types';

import {
  GrowspaceHistoryController,
  GrowspaceCardHost,
} from './controllers/growspace-history-controller';
import './growspace-env-chart';
import './components/manager/dialog-host';
import './components/manager/edit-mode-banner';
import './components/plant-card';
import './components/growspace-header';
import { LibraryExportReadyEvent } from './events';
import './components/growspace-view-switcher';
import { sharedStyles } from './styles/shared.styles';
import { uiStyles } from './styles/ui.styles';
import { growspaceCardStyles } from './styles/growspace-card.styles';
import { variables } from './styles/variables';
import { GrowspaceStore } from './store/growspace-store';
import { GrowspaceGridController } from './controllers/grid-controller';

import { StoreController } from '@nanostores/lit';
import { $viewMode, $isLoading, $activeDialog, $focusedPlantIndex, $menuOpen, setViewMode, selectAllPlants, clearPlantSelection, setEditMode, setFocusedPlantIndex, $isEditMode, $isCompactView, $selectedPlants, $notification } from './store/ui-store';
import { $devices, $selectedDevice, $strainLibrary } from './store/data-store';

@customElement('growspace-manager-card')
export class GrowspaceManagerCard extends LitElement implements LovelaceCard, GrowspaceCardHost {
  @provide({ context: storeContext })
  accessor store = new GrowspaceStore(this);

  // UI Store Controllers
  protected _viewModeController = new StoreController(this, $viewMode);
  protected _isLoadingController = new StoreController(this, $isLoading);
  protected _focusedPlantIndexController = new StoreController(this, $focusedPlantIndex);
  protected _activeDialogController = new StoreController(this, $activeDialog);
  protected _isEditModeController = new StoreController(this, $isEditMode);
  protected _isCompactController = new StoreController(this, $isCompactView); // Computed
  protected _selectedPlantsController = new StoreController(this, $selectedPlants);
  protected _notificationController = new StoreController(this, $notification);

  // Data Store Controllers (for reactivity)
  protected _devicesController = new StoreController(this, $devices);
  protected _selectedDeviceController = new StoreController(this, $selectedDevice);
  protected _strainLibraryController = new StoreController(this, $strainLibrary);

  // Controllers
  @provide({ context: historyContext })
  accessor historyController = new GrowspaceHistoryController(this);
  public gridController = new GrowspaceGridController(this, this.store);

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
    this.addEventListener(LibraryExportReadyEvent.TYPE, this._handleLibraryExportReady as EventListener);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener(LibraryExportReadyEvent.TYPE, this._handleLibraryExportReady as EventListener);
  }

  private _handleLibraryExportReady = (e: LibraryExportReadyEvent) => {
    this._downloadFile(e.detail.url);
  };

  protected willUpdate(changedProps: PropertyValues): void {
    // Logic moved to updated() to avoid side-effects during update cycle
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);

    if (changedProps.has('hass')) {
      this.store.updateHass(this.hass);
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
      setViewMode(this._config.initial_view_mode);
    } else if (this._config.compact !== undefined && this._config.compact) {
      setViewMode('compact');
    }
  }

  public getCardSize(): number {
    return 4;
  }

  // Event handlers
  private _handleKeyboardNav(e: KeyboardEvent) {
    this.store.handleKeyboardNavigation(e.key);
  }

  private _focusPlantByIndex(index: number) {
    const switcher = this.shadowRoot?.querySelector('growspace-view-switcher') as any;
    if (switcher && typeof switcher.focusPlant === 'function') {
      switcher.focusPlant(index);
    }
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
    setViewMode(e.detail.mode);
  }

  private _handleGrowspaceChanged(e: CustomEvent) {
    this.store.handleDeviceChange(e.detail);
  }

  private _handleSelectAll() {
    // We need plant IDs. This logic might need to stay in store or move to data-store if it requires knowing all plants.
    // For now, delegate to store but store should use ui-store atoms.
    this.store.selectAllPlants();
  }

  private _handleClearSelection() {
    clearPlantSelection();
  }

  private _handleExitEditMode() {
    setEditMode(false);
  }

  protected render(): TemplateResult {
    if (!this.hass) {
      return html`<ha-card><div class="error">Home Assistant not available</div></ha-card>`;
    }

    const devices = this.gridController.activeDevices;

    // Show loading spinner if initially loading and no devices yet
    if (this._isLoadingController.value) {
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

    // Use memoized values from grid controller
    const growspaceOptions = this.gridController.growspaceOptions;
    const { effectiveRows, grid } = this.gridController.gridLayout;
    const isWide = selectedDeviceData.plants_per_row > 7;
    // const viewMode unused here if passed directly to switcher, but let's keep var if check needed logic
    // const viewMode = this._viewModeController.value;

    return html`
      <ha-card class=${isWide ? 'wide-growspace' : ''}>
        <div class="sr-only-announcer" aria-live="polite"></div>
        <div 
            class="unified-growspace-card glass-surface glass-panel" 
            tabindex="0" 
            @keydown=${this._handleKeyboardNav}
            @view-mode-changed=${this._handleViewModeChanged}
            @growspace-changed=${this._handleGrowspaceChanged}
            @toggle-expansion=${() => this.store.toggleHeaderExpansion()}
            @select-all=${this._handleSelectAll}
            @clear-selection=${this._handleClearSelection}
            @exit-edit-mode=${this._handleExitEditMode}
        >
          <growspace-view-switcher
            .viewMode=${this._viewModeController.value}
            .device=${selectedDeviceData}
            .growspaceOptions=${growspaceOptions}
            .grid=${grid}
            .rows=${effectiveRows}
            .isEditMode=${this._isEditModeController.value}
            .isCompact=${this._isCompactController.value}
            .selectedCount=${this._selectedPlantsController.value.size}
            .config=${this._config}
            .isLoading=${this._isLoadingController.value}
            .focusedPlantIndex=${this._focusedPlantIndexController.value}
          ></growspace-view-switcher>
        </div>
      </ha-card>

      ${this._notificationController.value
        ? html`
            <div class="toast-notification ${this._notificationController.value.type}">
              ${this._notificationController.value.message}
            </div>
          `
        : ''}
      ${this.renderDialogs()}
    `;
  }

  private renderDialogs(): TemplateResult {
    return html`<growspace-dialog-host
      .devices=${this._devicesController.value}
    ></growspace-dialog-host>`;
  }
}


