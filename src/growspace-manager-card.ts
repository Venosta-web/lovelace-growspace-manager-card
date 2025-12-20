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
import './components/growspace-grid';
import './components/growspace-analytics';
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
        // We can't await this here, causing a potential race if it depends on async,
        // but handleDeviceChange is essentially synchronous in setting state, though it might fetch data.
        // It's better than in render() anyway.
        // Use a timeout to avoid property change during update cycle errors if immediate state change is needed
        // but since we are in willUpdate, state changes should be fine if strictly internal or upcoming.
        this.store.handleDeviceChange(match.device_id);
      }
      this.store.setDefaultApplied(true);
    }
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    // updateHass moved to willUpdate for immediate state consistency
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
    // handled in initializeSelectedDevice or store setter, but we can set initial state here if store exists?
    // Actually store exists in constructor.
    if (this._config.initial_view_mode) {
      // already valid if matched type
    } else if (this._config.compact !== undefined && this._config.compact) {
      this.store.state.viewMode = 'compact';
      // Sync legacy
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
    const grid = this.shadowRoot?.querySelector('.growspace-grid');
    if (grid) {
      const plantCards = grid.querySelectorAll('.plant-card-rich');
      if (plantCards[index]) {
        (plantCards[index] as HTMLElement).focus();
      }
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

    // Apply default growspace logic - MOVED TO willUpdate


    const selectedDeviceData = devices.find((d) => d.device_id === this.selectedDevice);
    if (!selectedDeviceData) {
      return html`<ha-card><div class="error">No valid growspace selected.</div></ha-card>`;
    }

    const growspaceOptions: Record<string, string> = {};
    // Use cached devices to ensure dropdown matches available devices
    devices.forEach((d) => {
      growspaceOptions[d.device_id] = d.name;
    });

    // Calculate grid layout - now using cached value from willUpdate
    const { effectiveRows, grid } = this.gridController.gridLayout;

    const isWide = selectedDeviceData.plants_per_row > 7;

    return html`
      <ha-card class=${isWide ? 'wide-growspace' : ''}>
        <div class="sr-only-announcer" aria-live="polite"></div>
        <div class="unified-growspace-card glass-surface glass-panel" tabindex="0" @keydown=${this._handleKeyboardNav}>
          ${this.renderViewContent(selectedDeviceData, growspaceOptions, grid, effectiveRows)}
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

  private renderEditModeBanner(): TemplateResult {
    if (!this.store.state.isEditMode) return html``;

    return html`
      <growspace-edit-mode-banner
        .selectedCount=${this.store.state.selectedPlants.size}
        @select-all=${() => this.store.selectAllPlants()}
        @clear-selection=${() => this.store.clearPlantSelection()}
        @exit-edit-mode=${() => {
        this.store.setEditMode(false);
        this.store.clearPlantSelection();
      }}
      ></growspace-edit-mode-banner>
    `;
  }

  private renderGrid(
    grid: (PlantEntity | null)[][],
    rows: number,
    cols: number
  ): TemplateResult {
    return html`
      <growspace-grid
        .plants=${grid}
        .rows=${rows}
        .cols=${cols}
        .compact=${this.store.state.isCompactView}
        .isLoading=${this.store.state.isLoading}
      ></growspace-grid>
    `;
  }

  private renderViewContent(
    selectedDeviceData: GrowspaceDevice,
    growspaceOptions: Record<string, string>,
    grid: (PlantEntity | null)[][],
    effectiveRows: number
  ): TemplateResult {
    const viewMode = this.store.state.viewMode;

    if (viewMode === 'compact') {
      return html`
        <div class="view-mode-container compact">
          ${this.renderGrid(grid, effectiveRows, selectedDeviceData.plants_per_row)}
          <button
            class="md3-button compact-exit-fab"
            @click=${() => this.store.setViewMode('standard')}
            title="Exit Compact Mode"
          >
            <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24">
              <path d="${mdiFullscreenExit}"></path>
            </svg>
          </button>
        </div>
      `;
    }

    if (viewMode === 'header') {
      return html`
        <div class="view-mode-container header">
          <growspace-header
            .device=${selectedDeviceData}
            .growspaceOptions=${growspaceOptions}
            @growspace-changed=${(e: any) => this.store.handleDeviceChange(e.target.value)}
          ></growspace-header>
          <button class="expand-handle" @click=${() => this.store.toggleHeaderExpansion()}>
            <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24">
              <path d="${mdiChevronDown}"></path>
            </svg>
          </button>
        </div>
      `;
    }

    // Standard Mode
    return html`
      <growspace-header
        .device=${selectedDeviceData}
        .growspaceOptions=${growspaceOptions}
        @growspace-changed=${(e: any) => this.store.handleDeviceChange(e.target.value)}
      ></growspace-header>
      <growspace-analytics
        .device=${selectedDeviceData}
      ></growspace-analytics>
      ${this.renderEditModeBanner()}
      ${this.renderGrid(grid, effectiveRows, selectedDeviceData.plants_per_row)}
      
      ${this._config?.initial_view_mode === 'header'
        ? html`
            <button class="collapse-handle" @click=${() => this.store.toggleHeaderExpansion()}>
              <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24">
                <path d="${mdiChevronUp}"></path>
              </svg>
            </button>
          `
        : ''}
    `;
  }

  private renderDialogs(): TemplateResult {
    return html`<growspace-dialog-host
      .activeDialogState=${this.store.state.activeDialog}
      .devices=${this.store.state.devices}
    ></growspace-dialog-host>`;
  }
}
