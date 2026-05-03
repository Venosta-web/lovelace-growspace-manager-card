import { LitElement, html, CSSResultGroup, TemplateResult, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { provide } from '@lit/context';

import { hassContext, configContext, strainLibraryContext, storeContext } from './lib/context';
import { HomeAssistant, LovelaceCard, LovelaceCardEditor } from 'custom-card-helpers';

import type { GrowspaceManagerCardConfig } from './lib/types/config';
import type { StrainEntry } from './features/plants/types';
import { ViewMode } from './features/environment/constants';

import { SubscriptionController } from './controllers/subscription-controller';
import './growspace-env-chart';
import './features/ui/containers/growspace-dialog-host.container';
import type { GrowspaceDialogHost } from './features/ui/containers/growspace-dialog-host.container';
import './features/ui/components/growspace-edit-mode-banner-ui';
import './features/ui/containers/growspace-header.container';
import './features/ui/containers/growspace-toast.container';

import { LibraryExportReadyEvent } from './lib/events';
import './features/shared/layouts/growspace-view-switcher';
import './features/shared/ui'; // Register MD3 components
import './features/shared/ui/error-boundary';
import { sharedStyles } from './styles/shared.styles';
import { uiStyles } from './styles/ui.styles';
import { growspaceCardStyles } from './styles/growspace-card.styles';
import { variables } from './styles/variables';
import { GrowspaceStore } from './store/core/growspace-store';
import { StoreController } from '@nanostores/lit';

@customElement('growspace-manager-card')
export class GrowspaceManagerCard extends LitElement implements LovelaceCard {
  @provide({ context: storeContext })
  store = new GrowspaceStore();

  private _dialogPortal: GrowspaceDialogHost | null = null;

  protected _subscriptionController = new SubscriptionController(
    this,
    this.store.data,
    (refresh) => {
      this.store.updateHass(this.hass);
      if (refresh) {
        this.store.refreshData(true);
      }
    }
  );

  protected _viewController = new StoreController(this, this.store.$mainCardState);

  get selectedDevice() {
    return this._viewController.value.grid.selectedDevice;
  }

  @provide({ context: strainLibraryContext })
  @state()
  _strainLibrary: StrainEntry[] = [];

  // Getter to satisfy GrowspaceCardHost interface and allow external access
  get dataService() {
    return this.store.dataService;
  }

  get devices() {
    return this._viewController.value.grid.devices;
  }

  @provide({ context: hassContext })
  @property({ attribute: false })
  hass!: HomeAssistant;

  @provide({ context: configContext })
  @property({ attribute: false })
  _config!: GrowspaceManagerCardConfig;

  static styles: CSSResultGroup = [variables, sharedStyles, uiStyles, growspaceCardStyles];

  protected firstUpdated() {
    if (this.hass) {
      this.store.updateHass(this.hass);
    }
    this.store.initializeSelectedDevice(this._config);
    this.store.fetchStrainLibrary();
    this.store.fetchNutrientPresets();
    this.store.fetchIPMPresets();
    this.store.fetchNutrientInventory();

    // Check for deep link
    this._checkDeepLink();
  }

  private _checkDeepLink() {
    const urlParams = new URLSearchParams(window.location.search);
    const plantId = urlParams.get('plantId');

    // Use a global tracker to prevent multiple instances from processing the same deep link
    const globalTracker = (window as any).GROWSPACE_DEEP_LINK_TRACKED;

    if (plantId && globalTracker !== plantId) {
      (window as any).GROWSPACE_DEEP_LINK_TRACKED = plantId;
      console.log('[GrowspaceCard] Deep link detected for plant:', plantId);

      // Cleanup URL immediately to prevent other instances from picking it up
      const url = new URL(window.location.href);
      url.searchParams.delete('plantId');
      window.history.replaceState({}, '', url.toString());

      this.store.handleDeepLink(plantId);
    }
  }

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener(LibraryExportReadyEvent.TYPE, this._handleLibraryExportReady);
    if (!this._dialogPortal) {
      const portal = document.createElement('growspace-dialog-host') as GrowspaceDialogHost;
      portal.store = this.store;
      if (this.hass) portal.hass = this.hass;
      document.body.appendChild(portal);
      this._dialogPortal = portal;
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener(LibraryExportReadyEvent.TYPE, this._handleLibraryExportReady);
    if (this._dialogPortal) {
      document.body.removeChild(this._dialogPortal);
      this._dialogPortal = null;
    }
    this.store.destroy();
  }

  private _handleLibraryExportReady = (e: LibraryExportReadyEvent) => {
    this._downloadFile(e.detail.url);
  };

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);

    if (changedProps.has('hass')) {
      this.store.updateHass(this.hass);
      this._subscriptionController.updateHass(this.hass);
      if (this._dialogPortal) {
        this._dialogPortal.hass = this.hass;
      }

      // Re-check for pending deep link when hass (and thus devices) updates
      const pendingId = this.store.ui.$pendingDeepLinkPlantId.get();
      if (pendingId) {
        this.store.handleDeepLink(pendingId);
      }
    }

    if (this._dialogPortal && (changedProps.has('hass') || changedProps.has('_config'))) {
      this._dialogPortal.config = this._config;
    }

    // Sync strain library to context provider
    const currentStrainLibrary = this._viewController.value?.strainLibrary;
    if (currentStrainLibrary !== this._strainLibrary) {
      this._strainLibrary = (currentStrainLibrary || []) as StrainEntry[];
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

  private _handlePrintLabelsSelected() {
    this.store.openBatchPrintLabelsDialog();
  }

  private _handleCloneSelected() {
    this.store.openBatchCloneDialog();
  }

  private _handleDeleteSelected = () => {
    this.store.deleteSelectedPlants();
  };

  private _handleTransplantMode = () => {
    this.store.ui.toggleTransplantMode();
  };

  protected render(): TemplateResult {
    if (!this.hass) {
      return html`<ha-card><div class="error">Home Assistant not available</div></ha-card>`;
    }

    const { devices, selectedDevice, growspaceOptions, gridLayout } = this._viewController.value.grid;
    const { effectiveRows, grid } = gridLayout;

    if (this._viewController.value.ui.isLoading) {
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

    const selectedDeviceData = devices.find((d) => d.deviceId === selectedDevice);
    if (!selectedDeviceData) {
      return html`<ha-card><div class="error">No valid growspace selected.</div></ha-card>`;
    }

    const isWide = selectedDeviceData.plantsPerRow > 7;

    return html`
      <error-boundary
        .fallbackMessage=${'Failed to load Growspace Manager'}
        .onError=${this._handleError}
      >
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
            @print-labels-selected=${this._handlePrintLabelsSelected}
            @clone-selected=${this._handleCloneSelected}
            @delete-selected=${this._handleDeleteSelected}
            @transplant-mode=${this._handleTransplantMode}
            @exit-edit-mode=${this._handleExitEditMode}
          >
            <growspace-view-switcher
              .viewMode=${this._viewController.value.ui.viewMode}
              .hass=${this.hass}
              .device=${selectedDeviceData}
              .growspaceOptions=${growspaceOptions}
              .grid=${grid}
              .rows=${effectiveRows}
              .isEditMode=${this._viewController.value.ui.isEditMode}
              .isCompact=${this._viewController.value.ui.isCompact}
              .selectedCount=${this._viewController.value.ui.selectedPlants.size}
              .config=${this._config}
              .isLoading=${this._viewController.value.ui.isLoading}
              .focusedPlantIndex=${this._viewController.value.ui.focusedPlantIndex}
            ></growspace-view-switcher>
          </div>
        </ha-card>

        <growspace-toast></growspace-toast>
      </error-boundary>
    `;
  }

  private _handleError = (error: Error, errorInfo: unknown) => {
    // Always log to console
    console.error('Growspace Manager Card caught error:', error, errorInfo);

    // Report to Home Assistant system log
    if (this.hass) {
      this.hass.callService('system_log', 'write', {
        message: `Growspace Manager Card Error: ${error.message}. Info: ${JSON.stringify(errorInfo)}`,
        level: 'error',
        logger: 'lovelace_growspace_manager_card',
      });
    }
  };
}
