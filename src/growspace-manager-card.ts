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
import { ref } from 'lit/directives/ref.js';
import { hassContext, configContext, strainLibraryContext } from './context';
import { HomeAssistant, LovelaceCard, LovelaceCardEditor } from 'custom-card-helpers';
import { mdiCheckboxMarked } from '@mdi/js';
import { DateTime } from 'luxon';
import { variables } from './styles/variables';

import { GrowspaceManagerCardConfig, PlantEntity, GrowspaceDevice, StrainEntry } from './types';
import { ActiveDialogState } from './ui-state';

import { PlantUtils } from './utils';
import { DataService } from './data-service';
import {
  GrowspaceHistoryController,
  GrowspaceCardHost,
} from './controllers/growspace-history-controller';
import './growspace-env-chart';
import './components/manager/dialog-host';
import './components/plant-card';
import './components/growspace-header';
import {
  DeviceChangeEvent,
  TriggerActionEvent,
  ToggleEnvGraphEvent,
  LinkGraphsEvent,
  UnlinkGraphsEvent,
  RangeChangeEvent,
  UnlinkGraphMetricEvent,
  PlantClickEvent,
  AddPlantClickEvent,
  PlantDropEvent,
  SelectionChangedEvent,
  UpdatePlantEvent,
  DeletePlantEvent,
  HarvestPlantEvent,
  FinishDryingEvent,
  TakeCloneEvent,
  MoveCloneEvent,
} from './events';
import './components/growspace-grid';
import './components/growspace-analytics';
import { sharedStyles } from './styles/shared.styles';
import { growspaceCardStyles } from './styles/growspace-card.styles';
import { GrowspaceStore } from './store/growspace-store';

@customElement('growspace-manager-card')
export class GrowspaceManagerCard extends LitElement implements LovelaceCard, GrowspaceCardHost {
  public store = new GrowspaceStore(this);
  /* Getter for convenience/compatibility if needed, or update call sites */
  get selectedDevice() {
    return this.store.state.selectedDevice;
  }

  // History controller manages history state
  public historyController = new GrowspaceHistoryController(this);

  // Memoization properties
  private _cachedActiveDevices: GrowspaceDevice[] = [];
  private _cachedGridLayout: { effectiveRows: number; grid: (PlantEntity | null)[][] } = {
    effectiveRows: 0,
    grid: [],
  };

  @provide({ context: strainLibraryContext })
  @state()
  private _strainLibrary: StrainEntry[] = [];

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
  public hass!: HomeAssistant;

  @provide({ context: configContext })
  @property({ attribute: false })
  private _config!: GrowspaceManagerCardConfig;



  static styles: CSSResultGroup = [variables, sharedStyles, growspaceCardStyles];

  connectedCallback() {
    super.connectedCallback();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
  }

  protected firstUpdated() {
    this.store.updateHass(this.hass);
    this.store.initializeSelectedDevice(this._config);
    this.store.fetchStrainLibrary();
  }

  protected willUpdate(changedProps: PropertyValues): void {
    // 1. Recalculate Active Devices if needed
    // We do this every update to ensure fresh data from store, but we filter in place.
    // Ideally we would check for changes, but this is already better than doing it in render().
    if (changedProps.has('hass')) {
      this.store.updateHass(this.hass);
    }

    // 1. Recalculate Active Devices if needed
    // We do this every update to ensure fresh data from store, but we filter in place.
    // Ideally we would check for changes, but this is already better than doing it in render().
    if (this.store && this.store.state) {
      // Sync strain library to context provider
      if (this.store.state.strainLibrary !== this._strainLibrary) {
        this._strainLibrary = this.store.state.strainLibrary || [];
      }

      const devices = this.store.state.devices || [];
      this._cachedActiveDevices = devices.map((d) => ({
        ...d,
        plants: d.plants.filter((p) => {
          const pId = p.attributes.plant_id || p.entity_id.replace('sensor.', '');
          return !this.store.state.optimisticDeletedPlantIds.has(pId);
        }),
      }));

      // 2. Recalculate Grid Layout
      const selectedDeviceId = this.store.state.selectedDevice;
      const selectedDeviceData = this._cachedActiveDevices.find(
        (d) => d.device_id === selectedDeviceId
      );

      if (selectedDeviceData) {
        const effectiveRows = PlantUtils.calculateEffectiveRows(selectedDeviceData);
        const { grid } = PlantUtils.createGridLayout(
          selectedDeviceData.plants,
          effectiveRows,
          selectedDeviceData.plants_per_row
        );
        this._cachedGridLayout = { effectiveRows, grid };
      } else {
        this._cachedGridLayout = { effectiveRows: 0, grid: [] };
      }
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
    if (this._config.compact !== undefined) {
      this.store.state.isCompactView = this._config.compact;
    }
  }

  public getCardSize(): number {
    return 4;
  }

  // Event handlers
  private _handleDeviceChange(e: DeviceChangeEvent): void {
    this.store.handleDeviceChange(e.detail.deviceId);
  }

  private _togglePlantSelection(plant: PlantEntity) {
    const plantId = plant.attributes.plant_id;
    if (!plantId) return;

    this.store.togglePlantSelection(plantId);
  }

  // Bulk Edit Helper Methods
  private _selectAllPlants() {
    this.store.selectAllPlants();
  }

  private _deselectAllPlants() {
    this.store.clearPlantSelection();
  }

  private _exitEditMode() {
    this.store.setEditMode(false);
    this.store.clearPlantSelection();
  }

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

  private _announceToScreenReader(message: string) {
    const announcer = this.shadowRoot?.querySelector('.sr-only-announcer');
    if (announcer) {
      announcer.textContent = message;
    }
  }

  private _handlePlantClick(plant: PlantEntity) {
    // If in edit mode and we have selections, open dialog for ALL selected plants
    if (this.store.state.isEditMode && this.store.state.selectedPlants.size > 0) {
      const plantId = plant.attributes.plant_id;
      // If clicked plant is NOT selected, add it to selection then open.
      if (plantId && !this.store.state.selectedPlants.has(plantId)) {
        this._togglePlantSelection(plant);
      }

      // Pass the set of IDs to the dialog
      this._openPlantOverviewDialog(plant, Array.from(this.store.state.selectedPlants));
    } else {
      // Normal behavior
      this._openPlantOverviewDialog(plant);
    }
  }

  private _openPlantOverviewDialog(plant: PlantEntity, selectedIds?: string[]) {
    this.store.setActiveDialog({
      type: 'PLANT_OVERVIEW',
      payload: {
        plant,
        editedAttributes: { ...plant.attributes },
        activeTab: 'dashboard',
        selectedPlantIds: selectedIds,
      },
    });
  }

  private _handleTakeClone = (motherPlant: PlantEntity) => {
    const plantId =
      motherPlant.attributes?.plant_id || motherPlant.entity_id.replace('sensor.', '');

    this.store.dataService
      .takeClone({
        mother_plant_id: plantId,
      })
      .then(() => {
        console.log(`Clone taken from ${motherPlant.attributes?.strain || 'plant'}`);
      })
      .catch((error: any) => {
        console.error(`Failed to take clone: ${error.message}`);
      });
  };

  private getHaDateTimeString(): string {
    // hass.config.time_zone is your Home Assistant timezone
    const tz = this.hass.config.time_zone || Intl.DateTimeFormat().resolvedOptions().timeZone;

    return DateTime.now()
      .setZone(tz) // Use HA timezone
      .toFormat("yyyy-LL-dd'T'HH:mm"); // Format for datetime-local input
  }

  private _openAddPlantDialog(row: number, col: number) {
    this.store.openAddPlantDialog(row, col);
  }

  // Strain library methods
  private async _openStrainLibraryDialog() {
    if (!this.store.state.strainLibrary || this.store.state.strainLibrary.length === 0) {
      this.store.fetchStrainLibrary();
    }
    this.store.setActiveDialog({
      type: 'STRAIN_LIBRARY',
      payload: {},
    });
  }

  // Irrigation dialog methods
  private _openIrrigationDialog() {
    if (!this.store.state.selectedDevice) return;
    this.store.setActiveDialog({
      type: 'IRRIGATION',
      payload: true,
    });
  }

  private async _addStrain(strainData: Partial<StrainEntry>) {
    this.store.addStrain(strainData);
  }

  private async _removeStrain(strainKey: string) {
    this.store.removeStrain(strainKey);
  }

  private async _handleExportLibrary() {
    // 1. Subscribe to the completion event
    const unsubscribe = await this.hass.connection.subscribeEvents((event: any) => {
      // Check if the URL exists in the event data
      if (event.data && event.data.url) {
        // 2. Trigger the download in the browser
        this._downloadFile(event.data.url);

        // 3. Clean up the listener
        unsubscribe();
      }
    }, 'growspace_manager_strain_library_exported');

    // 4. Call the backend service to start the export
    try {
      await this.store.dataService.exportStrainLibrary();
      // Optional: Show a "Exporting..." toast or spinner here
    } catch (err) {
      console.error('Failed to call export service', err);
      unsubscribe(); // Cleanup if call fails
    }
  }

  private _downloadFile(url: string) {
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = url.split('/').pop() || 'export.zip'; // Sets filename from URL
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  private async _performImport(file: File, replace: boolean) {
    if (!file) return;

    try {
      const result = await this.store.dataService.importStrainLibrary(file, replace);
      this.store.showToast(
        `Import successful! ${result.imported_count || ''} strains imported.`,
        'success'
      );
      await this.store.fetchStrainLibrary();
    } catch (err: any) {
      console.error('Import failed:', err);
      this.store.showToast(`Import failed: ${err.message}`, 'error');
    }
  }

  private updateGrid(): void {
    // Refresh data from Home Assistant
    if (this.hass) {
      this.store.updateHass(this.hass);
    }
    // Force Lit to re-render
    this.requestUpdate();
    this.store.updateGrid();
  }

  private async _handleDrop(
    e: DragEvent | null,
    targetRow: number,
    targetCol: number,
    targetPlant: PlantEntity | null,
    sourcePlant: PlantEntity | null
  ) {
    if (e) e.preventDefault();
    this.store.handleDrop(targetRow, targetCol, targetPlant, sourcePlant);
  }

  _moveClonePlant(plant: PlantEntity, targetGrowspace: string) {
    const plantId = plant.attributes.plant_id || plant.entity_id.replace('sensor.', '');
    this.store.dataService
      .moveClone(plantId, targetGrowspace)
      .then(() => {
        console.log(`Moved clone ${plant.attributes.friendly_name} to ${targetGrowspace}`);
        // Optionally refresh local state
        this.store.closeActiveDialog();
      })
      .catch((err) => {
        console.error('Error moving clone:', err);
      });
  }

  private _handleHeaderAction(e: TriggerActionEvent) {
    const action = e.detail.action;
    switch (action) {
      case 'add_plant':
        this.store.openAddPlantDialog();
        break;
      case 'config':
        this._openConfigDialog();
        break;
      case 'edit':
        this.store.setEditMode(!this.store.state.isEditMode);
        break;
      case 'compact':
        this.store.setIsCompactView(!this.store.state.isCompactView);
        break;
      case 'control_dehumidifier':
        if (this.store.state.selectedDevice) {
          const device = this.store.state.devices.find(
            (d) => d.device_id === this.store.state.selectedDevice
          );

          if (device && device.overview_entity_id) {
            const stateObj = this.hass.states[device.overview_entity_id];
            const attrs = stateObj?.attributes || {};

            // 1. Get current state (Default to false if attribute missing)
            // Ensure your backend GrowspaceOverviewSensor exposes this attribute!
            const currentStatus = attrs.dehumidifier_control_enabled === true;

            // 2. Call service with opposite state
            this.store.dataService
              .setDehumidifierControl(this.store.state.selectedDevice, !currentStatus)
              .then(() => {
                console.log(
                  `Toggled dehumidifier control to ${!currentStatus} for`,
                  this.store.state.selectedDevice
                );
              })
              .catch((err) => {
                console.error('Failed to toggle dehumidifier control:', err);
              });
          }
        }
        break;
      case 'strains':
        this._openStrainLibraryDialog();
        break;
      case 'irrigation':
        this._openIrrigationDialog();
        break;
      case 'ai':
        this._openGrowMasterDialog();
        break;
      case 'logbook':
        this._openLogbookDialog();
        break;
    }
  }

  // Configuration Dialog Methods
  private _openConfigDialog() {
    this.store.setActiveDialog({
      type: 'CONFIG',
      payload: {
        currentTab: 'environment',
        environmentData: {
          selectedGrowspaceId: this.store.state.selectedDevice || '',
          temp_sensor: '',
          humidity_sensor: '',
          vpd_sensor: '',
          co2_sensor: '',
          circulation_fan: '',
          stress_threshold: 0.8,
          mold_threshold: 0.8,
        },
      },
    });
  }

  private async _handleAddGrowspace(detail: any) {
    if (this.store.state.activeDialog?.type !== 'CONFIG') return;

    await this.store.handleAddGrowspace(detail);
  }

  private async _handleEnvironmentConfig(detail: any) {
    if (this.store.state.activeDialog?.type !== 'CONFIG') return;

    const {
      selectedGrowspaceId,
      temp_sensor,
      humidity_sensor,
      vpd_sensor,
      co2_sensor,
      circulation_fan,
      stress_threshold,
      mold_threshold,
    } = detail;

    if (!selectedGrowspaceId || !temp_sensor || !humidity_sensor) {
      console.error('Missing mandatory fields', {
        selectedGrowspaceId,
        temp_sensor,
        humidity_sensor,
      });
      this.store.showToast('Growspace, Temperature, and Humidity sensors are mandatory', 'error');
      return;
    }

    console.log('Submitting environment config', detail);

    try {
      await this.store.dataService.configureEnvironment({
        growspace_id: selectedGrowspaceId,
        temperature_sensor: temp_sensor,
        humidity_sensor,
        vpd_sensor: vpd_sensor || undefined,
        co2_sensor: co2_sensor || undefined,
        circulation_fan: circulation_fan || undefined,
        stress_threshold,
        mold_threshold,
      });
      this.store.showToast('Environment configured successfully!', 'success');
      await this.store.refreshData();
      this.store.closeActiveDialog();
    } catch (e: any) {
      this.store.showToast(`Error: ${e.message}`, 'error');
    }
  }

  // Grow Master Methods
  private async _openGrowMasterDialog(isStressed = false, personality?: string) {
    this.store.setActiveDialog({
      type: 'GROW_MASTER',
      payload: {
        growspaceId: this.store.state.selectedDevice || '',
        isLoading: false,
        response: null,
        mode: isStressed ? 'all' : 'single',
      },
    });
    if (isStressed) {
      this.store.analyzeGrowspace('', true);
    }
  }

  private async _analyzeGrowspace(query: string, all: boolean) {
    if (this.store.state.activeDialog?.type !== 'GROW_MASTER') return;

    // Set loading state
    this.store.setActiveDialog({
      type: 'GROW_MASTER',
      payload: { ...this.store.state.activeDialog.payload, isLoading: true, response: null },
    });

    try {
      let result: { response: string | { response: string } };
      let responseText: string;

      if (all) {
        result = await this.store.dataService.analyzeAllGrowspaces();
      } else {
        result = await this.store.dataService.askGrowAdvice(this.selectedDevice || '', query);
      }

      if (result && typeof result.response === 'object' && result.response.response) {
        responseText = result.response.response;
      } else if (result && typeof result.response === 'string') {
        responseText = result.response;
      } else {
        responseText = JSON.stringify(result, null, 2);
      }

      // Update with response
      if (this.store.state.activeDialog.type === 'GROW_MASTER') {
        this.store.setActiveDialog({
          type: 'GROW_MASTER',
          payload: {
            ...this.store.state.activeDialog.payload,
            isLoading: false,
            response: responseText,
          },
        });
      }
    } catch (e: any) {
      console.error(e);
      if (this.store.state.activeDialog.type === 'GROW_MASTER') {
        this.store.setActiveDialog({
          type: 'GROW_MASTER',
          payload: {
            ...this.store.state.activeDialog.payload,
            isLoading: false,
            response: `Error: ${e.message || 'Failed to get analysis.'}`,
          },
        });
      }
    } finally {
      this.requestUpdate();
    }
  }

  private _openStrainRecommendationDialog() {
    this.store.setActiveDialog({
      type: 'STRAIN_RECOMMENDATION',
      payload: {
        isLoading: false,
        response: null,
      },
    });
  }

  private async _getStrainRecommendation(query?: string) {
    if (this.store.state.activeDialog?.type !== 'STRAIN_RECOMMENDATION') return;
    // We actually need the query from the event or state.

    // We actually need the query from the event or state.
    // Since component holds state, we expect event to pass it.
    // Refactoring: _getStrainRecommendation(query: string)

    this.requestUpdate();

    try {
      const response = await this.store.dataService.getStrainRecommendation(query || '');
      if (this.store.state.activeDialog?.type === 'STRAIN_RECOMMENDATION') {
        let responseText: string | null = null;
        if (response && typeof response.response === 'string') {
          responseText = response.response;
        } else {
          responseText = JSON.stringify(response, null, 2);
        }
        this.store.setActiveDialog({
          type: 'STRAIN_RECOMMENDATION',
          payload: {
            ...this.store.state.activeDialog.payload,
            isLoading: false,
            response: responseText,
          },
        });
      }
    } catch (e: any) {
      if (this.store.state.activeDialog?.type === 'STRAIN_RECOMMENDATION') {
        this.store.setActiveDialog({
          type: 'STRAIN_RECOMMENDATION',
          payload: {
            ...this.store.state.activeDialog.payload,
            isLoading: false,
            response: `Error: ${e.message || 'Failed to get recommendation.'}`,
          },
        });
      }
    } finally {
      this.requestUpdate();
    }
  }

  private _openLogbookDialog() {
    if (!this.selectedDevice) return;
    this.store.setActiveDialog({
      type: 'LOGBOOK',
      payload: {
        growspaceId: this.selectedDevice,
      },
    });
  }

  protected render(): TemplateResult {
    if (!this.hass) {
      return html`<ha-card><div class="error">Home Assistant not available</div></ha-card>`;
    }

    const devices = this._cachedActiveDevices;

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

    // Apply default growspace logic
    if (!this.store.state.defaultApplied && this._config?.default_growspace) {
      const match = devices.find(
        (d) =>
          d.device_id === this._config.default_growspace ||
          d.name === this._config.default_growspace
      );
      if (match) this.store.handleDeviceChange(match.device_id); // Use store method
      this.store.setDefaultApplied(true);
    }

    // Fallback selection handled in store.updateHass / willUpdate
    // if (!this.selectedDevice || !devices.find(d => d.device_id === this.selectedDevice)) {
    //   this.store.handleDeviceChange(devices[0].device_id);
    // }

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
    const { effectiveRows, grid } = this._cachedGridLayout;

    const isWide = selectedDeviceData.plants_per_row > 7;
    const strainLibrary = this.store.state.strainLibrary || [];

    return html`
      <ha-card class=${isWide ? 'wide-growspace' : ''}>
        <div class="sr-only-announcer" aria-live="polite"></div>
        <div class="unified-growspace-card glass-surface glass-panel" tabindex="0" @keydown=${this._handleKeyboardNav}>
          <growspace-header
            .device=${selectedDeviceData}
            .devices=${devices}
            .activeEnvGraphs=${this.historyController.activeEnvGraphs}
            .historyData=${this.historyController.historyData || null}
            .compact=${this.store.state.isCompactView}
            .isEditMode=${this.store.state.isEditMode}
            .selectedDevice=${this.store.state.selectedDevice}
            .growspaceOptions=${growspaceOptions}
            .linkedGraphGroups=${this.historyController.linkedGraphGroups}
            @growspace-changed=${this._handleDeviceChange}
            @toggle-env-graph=${(e: ToggleEnvGraphEvent) =>
        this.historyController.toggleEnvGraph({ metric: e.detail.metric, visible: true })}
            @link-graphs=${(e: LinkGraphsEvent) =>
        this.historyController.linkGraphs(e.detail.metric1, e.detail.metric2)}
            @unlink-graphs=${(e: UnlinkGraphsEvent) =>
        this.historyController.unlinkGraphGroup(e.detail.groupIndex)}
            @trigger-action=${this._handleHeaderAction}
          ></growspace-header>
          <growspace-analytics
            .device=${selectedDeviceData}
            .historyData=${this.historyController.historyData || []}
            .optimalHistory=${this.historyController.optimalHistory || []}
            .dehumidifierHistory=${this.historyController.dehumidifierHistory || []}
            .exhaustHistory=${this.historyController.exhaustHistory || []}
            .humidifierHistory=${this.historyController.humidifierHistory || []}
            .circulationFanHistory=${this.historyController.circulationFanHistory || []}
            .soilMoistureHistory=${this.historyController.soilMoistureHistory || []}
            .lightHistory=${this.historyController.lightHistory || []}
            .irrigationHistory=${this.historyController.irrigationHistory || []}
            .drainHistory=${this.historyController.drainHistory || []}
            .temperatureHistory=${this.historyController.temperatureHistory || []}
            .humidityHistory=${this.historyController.humidityHistory || []}
            .vpdHistory=${this.historyController.vpdHistory || []}
            .co2History=${this.historyController.co2History || []}
            .activeEnvGraphs=${this.historyController.activeEnvGraphs}
            .linkedGraphGroups=${this.historyController.linkedGraphGroups}
            .range=${this.historyController.getRange()}
            @range-change=${(e: RangeChangeEvent) =>
        this.historyController.setGraphRange(e.detail.range)}
            @toggle-graph=${(e: ToggleEnvGraphEvent) =>
        this.historyController.toggleEnvGraph({ metric: e.detail.metric, visible: true })}
            @unlink-graphs=${(e: UnlinkGraphsEvent) =>
        this.historyController.unlinkGraphGroup(e.detail.groupIndex)}
            @unlink-graph=${(e: UnlinkGraphMetricEvent) =>
        this.historyController.unlinkGraphMetric(e.detail.metric)}
          ></growspace-analytics>
          ${this.renderEditModeBanner()}
          ${this.renderGrid(grid, effectiveRows, selectedDeviceData.plants_per_row, strainLibrary)}
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
      <div class="edit-mode-banner">
        <div class="banner-content">
          <svg style="width:20px;height:20px;fill:currentColor;" viewBox="0 0 24 24">
            <path d="${mdiCheckboxMarked}"></path>
          </svg>
          <span>${this.store.state.selectedPlants.size} plant(s) selected</span>
        </div>
        <div class="banner-actions">
          <button class="md3-button text" @click=${this._selectAllPlants}>Select All</button>
          <button class="md3-button text" @click=${this._deselectAllPlants}>Clear</button>
          <button class="md3-button text" @click=${this._exitEditMode}>Exit</button>
        </div>
      </div>
    `;
  }

  private renderGrid(
    grid: (PlantEntity | null)[][],
    rows: number,
    cols: number,
    strainLibrary: StrainEntry[]
  ): TemplateResult {
    return html`
      <growspace-grid
        .plants=${grid}
        .rows=${rows}
        .cols=${cols}
        .strainLibrary=${strainLibrary}
        .isEditMode=${this.store.state.isEditMode}
        .selectedPlants=${this.store.state.selectedPlants}
        .compact=${this.store.state.isCompactView}
        .isLoading=${this.store.state.isLoading}
        @plant-click=${(e: PlantClickEvent) => this._handlePlantClick(e.detail.plant)}
        @add-plant-click=${(e: AddPlantClickEvent) =>
        this._openAddPlantDialog(e.detail.row, e.detail.col)}
        @plant-drop=${(e: PlantDropEvent) =>
        this._handleDrop(
          e.detail.originalEvent,
          e.detail.targetRow,
          e.detail.targetCol,
          e.detail.targetPlant,
          e.detail.sourcePlant
        )}
        @selection-changed=${(e: SelectionChangedEvent) => {
        this.store.setSelectedPlants(e.detail.selectedPlants);
      }}
      ></growspace-grid>
    `;
  }

  private renderDialogs(): TemplateResult {
    return html`<growspace-dialog-host 
      .store=${this.store} 
      .activeDialogState=${this.store.state.activeDialog}
    ></growspace-dialog-host>`;
  }
}
