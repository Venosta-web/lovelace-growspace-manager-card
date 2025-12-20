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
import './components/views/growspace-view-compact';
import './components/views/growspace-view-header';
import './components/views/growspace-view-standard';
import { sharedStyles } from './styles/shared.styles';
import { uiStyles } from './styles/ui.styles';
import { growspaceCardStyles } from './styles/growspace-card.styles';
import { variables } from './styles/variables';
import { GrowspaceStore } from './store/growspace-store';
import { GrowspaceGridController } from './controllers/grid-controller';

@customElement('growspace-manager-card')
export class GrowspaceManagerCard extends LitElement implements LovelaceCard, GrowspaceCardHost {
  @provide({ context: storeContext })
  accessor store = new GrowspaceStore(this);

  // Controllers
  @provide({ context: historyContext })
  accessor historyController = new GrowspaceHistoryController(this);
  public gridController = new GrowspaceGridController(this, this.store);

  /* Getter for convenience/compatibility if needed, or update call sites */
  get selectedDevice() {
    return this.store.state.selectedDevice;
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
    return this.store.state.devices;
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
    if (this.store && this.store.state && this.store.state.strainLibrary !== this._strainLibrary) {
      this._strainLibrary = this.store.state.strainLibrary || [];
    }

    // Apply default growspace logic
    const devices = this.gridController.activeDevices;
    if (!this.store.state.defaultApplied && this._config?.default_growspace && devices.length > 0) {
      const match = devices.find(
        (d) =>
          d.device_id === this._config.default_growspace ||
          d.name === this._config.default_growspace
      );
      if (match) {
        this.store.handleDeviceChange(match.device_id);
      }
      this.store.setDefaultApplied(true);
    }

    // Handle focus update from store state
    if (this.store.state.focusedPlantIndex >= 0) {
      this._focusPlantByIndex(this.store.state.focusedPlantIndex);
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
      // already valid if matched type
    } else if (this._config.compact !== undefined && this._config.compact) {
      this.store.state.viewMode = 'compact';
      this.store.state.isCompactView = true;
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
    const activeView = this.shadowRoot?.querySelector(
      'growspace-view-standard, growspace-view-compact'
    );

    if (activeView && 'focusPlant' in activeView) {
      (activeView as any).focusPlant(index);
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
    this.store.setViewMode(e.detail.mode);
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

  private _handleExitEditMode() {
    this.store.setEditMode(false);
    this.store.clearPlantSelection();
  }

  protected render(): TemplateResult {
    if (!this.hass) {
      return html`<ha-card><div class="error">Home Assistant not available</div></ha-card>`;
    }

    const devices = this.gridController.activeDevices;

    // Show loading spinner if initially loading and no devices yet
    if (this.store.state.isLoading) {
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

    const growspaceOptions: Record<string, string> = {};
    devices.forEach((d) => {
      growspaceOptions[d.device_id] = d.name;
    });

    // Calculate grid layout - now using cached value from willUpdate
    const { effectiveRows, grid } = this.gridController.gridLayout;
    const isWide = selectedDeviceData.plants_per_row > 7;
    const viewMode = this.store.state.viewMode;

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
          ${this._renderView(viewMode, selectedDeviceData, growspaceOptions, grid, effectiveRows)}
        </div>
      </ha-card>

      ${this.store.state.notification
        ? html`
            <div class="toast-notification ${this.store.state.notification.type}">
              ${this.store.state.notification.message}
            </div>
          `
        : ''}
      ${this.renderDialogs()}
    `;
  }

  private _renderView(
    viewMode: string,
    device: GrowspaceDevice,
    growspaceOptions: Record<string, string>,
    grid: (PlantEntity | null)[][],
    effectiveRows: number
  ): TemplateResult {
    if (viewMode === 'compact') {
      return html`
        <growspace-view-compact
            .grid=${grid}
            .rows=${effectiveRows}
            .cols=${device.plants_per_row}
            .isLoading=${this.store.state.isLoading}
        ></growspace-view-compact>
      `;
    }

    if (viewMode === 'header') {
      return html`
        <growspace-view-header
            .device=${device}
            .growspaceOptions=${growspaceOptions}
        ></growspace-view-header>
      `;
    }

    // Standard Mode
    return html`
      <growspace-view-standard
        .device=${device}
        .growspaceOptions=${growspaceOptions}
        .grid=${grid}
        .rows=${effectiveRows}
        .cols=${device.plants_per_row}
        .isEditMode=${this.store.state.isEditMode}
        .isCompact=${this.store.state.isCompactView}
        .selectedCount=${this.store.state.selectedPlants.size}
        .config=${this._config}
        .isLoading=${this.store.state.isLoading}
      ></growspace-view-standard>
    `;
  }

  private renderDialogs(): TemplateResult {
    return html`<growspace-dialog-host
      .activeDialogState=${this.store.state.activeDialog}
      .devices=${this.store.state.devices}
    ></growspace-dialog-host>`;
  }
}


