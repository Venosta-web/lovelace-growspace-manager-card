import { LitElement, html, CSSResultGroup, TemplateResult, PropertyValues, ReactiveControllerHost } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { provide } from '@lit/context';
import { hassContext, configContext } from './context';
import { HomeAssistant, LovelaceCard, LovelaceCardEditor } from 'custom-card-helpers';
import { mdiCheckboxMarked } from '@mdi/js';
import { DateTime } from 'luxon';
import { variables } from './styles/variables';

import {
  GrowspaceManagerCardConfig,
  PlantEntity,
  GrowspaceDevice,
  StrainEntry,
} from './types';
import { ActiveDialogState } from './ui-state';
import { PlantUtils } from "./utils";
import { DataService } from './data-service';
import { GrowspaceHistoryController, GrowspaceCardHost } from './controllers/growspace-history-controller';
import './growspace-env-chart';
import './dialogs/plant-overview-dialog';
import './dialogs/strain-library-dialog';
import './dialogs/irrigation-dialog';
import './dialogs/add-plant-dialog';
import './dialogs/config-dialog';
import './dialogs/grow-master-dialog';
import './dialogs/strain-recommendation-dialog';
import './dialogs/logbook-dialog';
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
  MoveCloneEvent
} from './events';
import './components/growspace-grid';
import './components/growspace-analytics';
import { growspaceCardStyles } from './styles/growspace-card.styles';
import { GrowspaceStore } from './store/growspace-store';

@customElement('growspace-manager-card')
export class GrowspaceManagerCard extends LitElement implements LovelaceCard, GrowspaceCardHost {
  public store = new GrowspaceStore(this);
  /* Getter for convenience/compatibility if needed, or update call sites */
  get selectedDevice() { return this.store.state.selectedDevice; }

  // History controller manages history state
  public historyController = new GrowspaceHistoryController(this);

  // Memoization properties
  private _cachedGridLayout: { effectiveRows: number, grid: any[] } | null = null;
  private _lastDeviceDataForGrid: string = '';

  // Getter to satisfy GrowspaceCardHost interface and allow external access
  get dataService() {
    return this.store.dataService;
  }

  @provide({ context: hassContext })
  @property({ attribute: false }) public hass!: HomeAssistant;

  @provide({ context: configContext })
  @property({ attribute: false }) private _config!: GrowspaceManagerCardConfig;



  static styles: CSSResultGroup = [
    variables,
    growspaceCardStyles
  ];


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

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    if (changedProps.has('hass')) {
      this.store.updateHass(this.hass);
    }
    // Handle focus update from store state
    if (this.store.state.focusedPlantIndex >= 0) {
      this._focusPlantByIndex(this.store.state.focusedPlantIndex);
    }
  }


  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    // path must match where the editor JS is served relative to the card script
    await import("./growspace-manager-card-editor.js");
    const el = document.createElement("growspace-manager-card-editor") as unknown as LovelaceCardEditor;
    return el;
  }
  public static getStubConfig() {
    return {
      default_growspace: "4x4",
      compact: true
    };
  }

  public setConfig(config: GrowspaceManagerCardConfig): void {
    if (!config) throw new Error("Invalid configuration");
    this._config = config;
    // handled in initializeSelectedDevice or store setter, but we can set initial state here if store exists?
    // Actually store exists in constructor.
    if (this._config.compact !== undefined) {
      this.store.state.isCompactView = this._config.compact;
    }
  }

  public getCardSize(): number { return 4; }

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
        selectedPlantIds: selectedIds
      }
    });
  }
  private _handleTakeClone = (motherPlant: PlantEntity) => {
    const plantId = motherPlant.attributes?.plant_id || motherPlant.entity_id.replace('sensor.', '');

    this.store.dataService.takeClone({
      mother_plant_id: plantId
    }).then(() => {
      console.log(`Clone taken from ${motherPlant.attributes?.strain || 'plant'}`);
    }).catch((error: any) => {
      console.error(`Failed to take clone: ${error.message}`);
    });
  };

  private getHaDateTimeString(): string {
    // hass.config.time_zone is your Home Assistant timezone
    const tz = this.hass.config.time_zone || Intl.DateTimeFormat().resolvedOptions().timeZone;

    return DateTime.now()
      .setZone(tz)                  // Use HA timezone
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
      payload: {}
    });
  }




  //Irrigation dialog methods
  private _openIrrigationDialog() {
    if (!this.store.state.selectedDevice) return;
    this.store.setActiveDialog({
      type: 'IRRIGATION',
      payload: true
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
      console.error("Failed to call export service", err);
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
      this.store.showToast(`Import successful! ${result.imported_count || ''} strains imported.`, 'success');
      await this.store.fetchStrainLibrary();
    } catch (err: any) {
      console.error("Import failed:", err);
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
    this.store.dataService.moveClone(plantId, targetGrowspace)
      .then(() => {
        console.log(`Moved clone ${plant.attributes.friendly_name} to ${targetGrowspace}`);
        // Optionally refresh local state
        this.store.closeActiveDialog();
      }).catch((err) => {
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
          const device = this.store.state.devices.find(d => d.device_id === this.store.state.selectedDevice);

          if (device && device.overview_entity_id) {
            const stateObj = this.hass.states[device.overview_entity_id];
            const attrs = stateObj?.attributes || {};

            // 1. Get current state (Default to false if attribute missing)
            // Ensure your backend GrowspaceOverviewSensor exposes this attribute!
            const currentStatus = attrs.dehumidifier_control_enabled === true;

            // 2. Call service with opposite state
            this.store.dataService.setDehumidifierControl(this.store.state.selectedDevice, !currentStatus)
              .then(() => {
                console.log(`Toggled dehumidifier control to ${!currentStatus} for`, this.store.state.selectedDevice);
              }).catch(err => {
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
          mold_threshold: 0.8
        }
      }
    });
  }

  private async _handleAddGrowspace(detail: any) {
    if (this.store.state.activeDialog?.type !== 'CONFIG') return;

    await this.store.handleAddGrowspace(detail);
  }

  private async _handleEnvironmentConfig(detail: any) {
    if (this.store.state.activeDialog?.type !== 'CONFIG') return;

    const {
      selectedGrowspaceId, temp_sensor, humidity_sensor, vpd_sensor,
      co2_sensor, circulation_fan, stress_threshold, mold_threshold
    } = detail;

    if (!selectedGrowspaceId || !temp_sensor || !humidity_sensor || !vpd_sensor) {
      this.store.showToast('Growspace and required sensors (Temp, Hum, VPD) are mandatory', 'error');
      return;
    }

    try {
      await this.store.dataService.configureEnvironment({
        growspace_id: selectedGrowspaceId,
        temperature_sensor: temp_sensor,
        humidity_sensor: humidity_sensor,
        vpd_sensor: vpd_sensor,
        co2_sensor: co2_sensor || undefined,
        circulation_fan: circulation_fan || undefined,
        stress_threshold: stress_threshold,
        mold_threshold: mold_threshold
      });
      this.store.showToast('Environment configured successfully!', 'success');
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
        mode: isStressed ? 'all' : 'single'
      }
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
      payload: { ...this.store.state.activeDialog.payload, isLoading: true, response: null }
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
          payload: { ...this.store.state.activeDialog.payload, isLoading: false, response: responseText }
        });
      }
    } catch (e: any) {
      console.error(e);
      if (this.store.state.activeDialog.type === 'GROW_MASTER') {
        this.store.setActiveDialog({
          type: 'GROW_MASTER',
          payload: { ...this.store.state.activeDialog.payload, isLoading: false, response: `Error: ${e.message || 'Failed to get analysis.'}` }
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
        response: null
      }
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
          payload: { ...this.store.state.activeDialog.payload, isLoading: false, response: responseText }
        });
      }
    } catch (e: any) {
      if (this.store.state.activeDialog?.type === 'STRAIN_RECOMMENDATION') {
        this.store.setActiveDialog({
          type: 'STRAIN_RECOMMENDATION',
          payload: { ...this.store.state.activeDialog.payload, isLoading: false, response: `Error: ${e.message || 'Failed to get recommendation.'}` }
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
        growspaceId: this.selectedDevice
      }
    });
  }


  private get _activeDevices(): GrowspaceDevice[] {
    if (!this.hass) return [];

    // updateHass is handled in updated() lifecycle, do not call here to avoid loops.

    // Use store state
    const devices = this.store.state.devices;

    // Filter out optimistically deleted plants
    return devices.map(d => ({
      ...d,
      plants: d.plants.filter(p => {
        const pId = p.attributes.plant_id || p.entity_id.replace('sensor.', '');
        return !this.store.state.optimisticDeletedPlantIds.has(pId);
      })
    }));
  }

  private _calculateCurrentGridLayout(deviceData: GrowspaceDevice) {
    // Create a signature that uniquely identifies the data state for the grid
    // Use deviceData.last_updated effectively as it changes on any attribute change (including grid)
    const signature = `${deviceData.device_id}_${deviceData.plants_per_row}_${deviceData.last_updated}`;

    if (this._cachedGridLayout && this._lastDeviceDataForGrid === signature) {
      return this._cachedGridLayout;
    }

    const effectiveRows = PlantUtils.calculateEffectiveRows(deviceData);
    const { grid } = PlantUtils.createGridLayout(
      deviceData.plants,
      effectiveRows,
      deviceData.plants_per_row
    );

    this._cachedGridLayout = { effectiveRows, grid };
    this._lastDeviceDataForGrid = signature;

    return { effectiveRows, grid };
  }

  protected render(): TemplateResult {
    if (!this.hass) {
      return html`<ha-card><div class="error">Home Assistant not available</div></ha-card>`;
    }

    const devices = this._activeDevices;

    if (!devices.length) {
      return html`<ha-card><div class="no-data">No growspace devices found.</div></ha-card>`;
    }

    // Apply default growspace logic
    if (!this.store.state.defaultApplied && this._config?.default_growspace) {
      const match = devices.find(d =>
        d.device_id === this._config.default_growspace || d.name === this._config.default_growspace
      );
      if (match) this.store.handleDeviceChange(match.device_id); // Use store method
      this.store.setDefaultApplied(true);
    }

    if (!this.selectedDevice || !devices.find(d => d.device_id === this.selectedDevice)) {
      this.store.handleDeviceChange(devices[0].device_id); // Use store method
    }

    const selectedDeviceData = devices.find(d => d.device_id === this.selectedDevice);
    if (!selectedDeviceData) {
      return html`<ha-card><div class="error">No valid growspace selected.</div></ha-card>`;
    }

    const growspaceOptions: Record<string, string> = {};
    const growspaces = this.hass.states['sensor.growspaces_list']?.attributes?.growspaces;
    if (growspaces) {
      Object.entries(growspaces).forEach(([id, name]) => {
        growspaceOptions[id] = name as string;
      });
    }

    // Calculate grid layout
    const { effectiveRows, grid } = this._calculateCurrentGridLayout(selectedDeviceData);

    const isWide = selectedDeviceData.plants_per_row > 7;
    const strainLibrary = this.store.state.strainLibrary || [];

    return html`
      <ha-card class=${isWide ? 'wide-growspace' : ''}>
        <div class="sr-only-announcer" aria-live="polite"></div>
        <div class="unified-growspace-card" tabindex="0" @keydown=${this._handleKeyboardNav}>
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
            @toggle-env-graph=${(e: ToggleEnvGraphEvent) => this.historyController.toggleEnvGraph({ metric: e.detail.metric, visible: true })}
            @link-graphs=${(e: LinkGraphsEvent) => this.historyController.linkGraphs(e.detail.metric1, e.detail.metric2)}
            @unlink-graphs=${(e: UnlinkGraphsEvent) => this.historyController.unlinkGraphGroup(e.detail.groupIndex)}
            @trigger-action=${this._handleHeaderAction}
          ></growspace-header>
          <growspace-analytics
            .device=${selectedDeviceData}
            .historyData=${this.historyController.historyData || []}
            .dehumidifierHistory=${this.historyController.dehumidifierHistory || []}
            .exhaustHistory=${this.historyController.exhaustHistory || []}
            .humidifierHistory=${this.historyController.humidifierHistory || []}
            .soilMoistureHistory=${this.historyController.soilMoistureHistory || []}
            .activeEnvGraphs=${this.historyController.activeEnvGraphs}
            .linkedGraphGroups=${this.historyController.linkedGraphGroups}
            .range=${this.historyController.getRange()}
            @range-change=${(e: RangeChangeEvent) => this.historyController.setGraphRange(e.detail.range)}
            @toggle-graph=${(e: ToggleEnvGraphEvent) => this.historyController.toggleEnvGraph({ metric: e.detail.metric, visible: true })}
            @unlink-graphs=${(e: UnlinkGraphsEvent) => this.historyController.unlinkGraphGroup(e.detail.groupIndex)}
            @unlink-graph=${(e: UnlinkGraphMetricEvent) => this.historyController.unlinkGraphMetric(e.detail.metric)}
          ></growspace-analytics>
          ${this.renderEditModeBanner()}
          ${this.renderGrid(grid, effectiveRows, selectedDeviceData.plants_per_row, strainLibrary)}
        </div>
      </ha-card>


          ${this.store.state.notification ? html`
            <div class="toast-notification ${this.store.state.notification.type}">
              ${this.store.state.notification.message}
            </div>
          ` : ''}
          ${this.renderDialogs(growspaceOptions)}
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

  private renderGrid(grid: (PlantEntity | null)[][], rows: number, cols: number, strainLibrary: StrainEntry[]): TemplateResult {
    return html`
      <growspace-grid
        .plants=${grid}
        .rows=${rows}
        .cols=${cols}
        .strainLibrary=${strainLibrary}
        .isEditMode=${this.store.state.isEditMode}
        .selectedPlants=${this.store.state.selectedPlants}
        .compact=${this.store.state.isCompactView}
        @plant-click=${(e: PlantClickEvent) => this._handlePlantClick(e.detail.plant)}
        @add-plant-click=${(e: AddPlantClickEvent) => this._openAddPlantDialog(e.detail.row, e.detail.col)}
        @plant-drop=${(e: PlantDropEvent) =>
        this._handleDrop(
          e.detail.originalEvent,
          e.detail.targetRow,
          e.detail.targetCol,
          e.detail.targetPlant,
          e.detail.sourcePlant
        )
      }
        @selection-changed=${(e: SelectionChangedEvent) => {
        this.store.setSelectedPlants(e.detail.selectedPlants);
      }}
      ></growspace-grid>
    `;
  }




  private async _confirmAddPlant(detail: any) {
    const devices = this.store.state.devices;
    const selectedDeviceData = devices.find(d => d.device_id === this.store.state.selectedDevice);
    if (!selectedDeviceData) return;

    const {
      strain, phenotype, row, col,
      veg_start, flower_start, seedling_start, mother_start, clone_start, dry_start, cure_start
    } = detail;

    if (!strain) {
      this.store.showToast("Please select a strain", "error");
      return;
    }

    try {
      await this.store.dataService.addPlant({
        growspace_id: selectedDeviceData.device_id,
        strain,
        phenotype: phenotype || '',
        row,
        col,
        veg_start, flower_start, seedling_start, mother_start, clone_start, dry_start, cure_start
      });
      this.store.showToast("Plant added successfully", "success");
      this.store.closeActiveDialog();
    } catch (e: any) {
      console.error(e);
      this.store.showToast("Failed to add plant", "error");
    }
  }

  private _renderAddPlantDialog(active: ActiveDialogState, strainLibrary: StrainEntry[], selectedDeviceData?: GrowspaceDevice): TemplateResult {
    if (active.type !== 'ADD_PLANT') return html``;
    const dialogState = active.payload;
    return html`
      <add-plant-dialog
        .open=${true}
        .strainLibrary=${strainLibrary}
        .growspaceName=${selectedDeviceData?.name ?? ''}
        .row=${dialogState.row}
        .col=${dialogState.col}
        @close=${() => this.store.closeActiveDialog()}
        @add-plant-submit=${(e: CustomEvent) => this.store.confirmAddPlant(e.detail)}
      ></add-plant-dialog>
    `;
  }

  private _renderPlantOverviewDialog(active: ActiveDialogState, growspaceOptions: Record<string, string>): TemplateResult {
    if (active.type !== 'PLANT_OVERVIEW') return html``;
    const dialogState = active.payload;
    return html`
      <plant-overview-dialog
        .open=${true}
        .dialog=${dialogState}
        .plant=${dialogState.plant}
        .growspaceOptions=${growspaceOptions}
        @close=${() => this.store.closeActiveDialog()}
        @update-plant=${(e: UpdatePlantEvent) => {
        const payload = active.payload;
        this.store.updatePlantFromDialog({
          plant: payload.plant,
          editedAttributes: e.detail,
          selectedPlantIds: payload.selectedPlantIds
        });
      }}
        @delete-plant=${(e: DeletePlantEvent) => this.store.handleDeletePlant(e.detail.plantId)}
        @harvest-plant=${(e: HarvestPlantEvent) => this.store.handleMovePlantToNextStage(e.detail.plant)}
        @finish-drying=${(e: FinishDryingEvent) => this.store.handleMovePlantToNextStage(e.detail.plant)}
        @take-clone=${(e: TakeCloneEvent) => {
        const { plant, numClones } = e.detail;
        this.store.handleTakeClone(plant, numClones);
      }}
        @move-clone=${(e: MoveCloneEvent) => {
        const { plant, targetGrowspace } = e.detail;
        const plantId = plant.attributes.plant_id || plant.entity_id.replace('sensor.', '');
        this.store.dataService.moveClone(plantId, targetGrowspace)
          .then(() => {
            console.log(`Clone ${plant.attributes.friendly_name} moved to ${targetGrowspace}`);
            this.store.closeActiveDialog();
          }).catch((err: any) => {
            console.error('Error moving clone:', err);
          });
      }}
        @attribute-change=${(e: CustomEvent) => {
        const payload = active.payload;
        payload.editedAttributes[e.detail.key] = e.detail.value;
        this.requestUpdate();
      }}
        @toggle-show-all-dates=${() => {
        const payload = active.payload;
        payload.showAllDates = !payload.showAllDates;
        this.requestUpdate();
      }}
      ></plant-overview-dialog>
    `;
  }

  private _renderStrainLibraryDialog(active: ActiveDialogState, strainLibrary: StrainEntry[]): TemplateResult {
    if (active.type !== 'STRAIN_LIBRARY') return html``;
    return html`
      <strain-library-dialog
        .open=${true}
        .strains=${strainLibrary}
        @close=${() => this.store.closeActiveDialog()}
        @save-strain=${(e: CustomEvent) => this._addStrain(e.detail)}
        @delete-strain=${(e: CustomEvent) => this._removeStrain(e.detail.key)}
        @import-library=${(e: CustomEvent) => this.store.performImport(e.detail.file, e.detail.replace)}
        @export-library=${() => this.store.handleExportLibrary()}
        @get-recommendation=${() => this._openStrainRecommendationDialog()}
      ></strain-library-dialog>
    `;
  }

  private _renderConfigDialog(active: ActiveDialogState, growspaceOptions: Record<string, string>): TemplateResult {
    if (active.type !== 'CONFIG') return html``;
    const dialogState = active.payload;
    return html`
      <config-dialog
        .open=${true}
        .growspaceOptions=${growspaceOptions}
        @close=${() => this.store.closeActiveDialog()}
        @add-growspace-submit=${(e: CustomEvent) => this._handleAddGrowspace(e.detail)}
        @configure-environment-submit=${(e: CustomEvent) => this._handleEnvironmentConfig(e.detail)}
        .setInitialState=${(el: any) => {
        // Pass initial state if needed
        if (el) el.setInitialState(dialogState.currentTab, dialogState.environmentData);
      }}
      ></config-dialog>
    `;
  }

  private _renderGrowMasterDialog(active: ActiveDialogState): TemplateResult {
    if (active.type !== 'GROW_MASTER') return html``;
    const dialogState = active.payload;

    // Determine stress state for the dialog
    let isStressed = false;
    let personality = undefined;

    // Attempt to find stress sensor
    if (this.selectedDevice && this.hass) {
      const id = this.selectedDevice;
      const stressEntityIds = [
        `binary_sensor.${id}_plants_under_stress`,
        `binary_sensor.${id}_stress`,
        `binary_sensor.growspace_manager_${id}_stress`
      ];

      for (const eid of stressEntityIds) {
        const ent = this.hass.states[eid];
        if (ent && ent.state === 'on') {
          isStressed = true;
          break;
        }
      }
    }

    // Personality check
    if (this.hass) {
      const manager = this.hass.states['sensor.growspace_manager'];
      if (manager && manager.attributes && manager.attributes.ai_settings) {
        personality = manager.attributes.personality || manager.attributes.ai_settings.personality;
      }
    }

    return html`
      <grow-master-dialog
        .open=${true}
        .isStressed=${isStressed}
        .personality=${personality}
        .isLoading=${dialogState.isLoading}
        .response=${dialogState.response}
        @close=${() => this.store.closeActiveDialog()}
        @analyze-growspace=${(e: CustomEvent) => this.store.analyzeGrowspace(e.detail.query, false)}
        @analyze-all-growspaces=${(e: CustomEvent) => this.store.analyzeGrowspace(e.detail.query, true)}
      ></grow-master-dialog>
    `;
  }

  private _renderStrainRecommendationDialog(active: ActiveDialogState): TemplateResult {
    if (active.type !== 'STRAIN_RECOMMENDATION') return html``;
    const dialogState = active.payload;
    return html`
      <strain-recommendation-dialog
        .open=${true}
        .isLoading=${dialogState.isLoading}
        .response=${dialogState.response}
        @close=${() => this.store.closeActiveDialog()}
        @get-recommendation=${(e: CustomEvent) => this.store.getStrainRecommendation(e.detail.query)}
      ></strain-recommendation-dialog>
    `;
  }

  private _renderIrrigationDialog(active: ActiveDialogState, selectedDeviceData?: GrowspaceDevice): TemplateResult {
    if (active.type !== 'IRRIGATION') return html``;
    return html`
       <irrigation-dialog
        .open=${true}
        .growspaceId=${selectedDeviceData?.device_id || ''}
        .growspaceName=${selectedDeviceData?.name || ''}
        .growspaceEntityId=${selectedDeviceData?.overview_entity_id || ''}
        @close=${() => this.store.closeActiveDialog()}
       ></irrigation-dialog>
    `;
  }

  private _renderLogbookDialog(active: ActiveDialogState): TemplateResult {
    if (active.type !== 'LOGBOOK') return html``;
    const dialogState = active.payload;
    return html`
      <logbook-dialog
        .open=${true}
        .growspaceId=${dialogState.growspaceId}
        @close=${() => this.store.closeActiveDialog()}
      ></logbook-dialog>
    `;
  }

  private renderDialogs(growspaceOptions: Record<string, string>): TemplateResult {
    const active = this.store.state.activeDialog;
    if (active.type === 'NONE') return html``;

    const strainLibrary = this.store.state.strainLibrary || [];
    const devices = this.store.dataService.getGrowspaceDevices();
    const selectedDeviceData = devices.find(d => d.device_id === this.store.state.selectedDevice);

    switch (active.type) {
      case 'ADD_PLANT':
        return this._renderAddPlantDialog(active, strainLibrary, selectedDeviceData);
      case 'PLANT_OVERVIEW':
        return this._renderPlantOverviewDialog(active, growspaceOptions);
      case 'STRAIN_LIBRARY':
        return this._renderStrainLibraryDialog(active, strainLibrary);
      case 'CONFIG':
        return this._renderConfigDialog(active, growspaceOptions);
      case 'GROW_MASTER':
        return this._renderGrowMasterDialog(active);
      case 'STRAIN_RECOMMENDATION':
        return this._renderStrainRecommendationDialog(active);
      case 'IRRIGATION':
        return this._renderIrrigationDialog(active, selectedDeviceData);
      case 'LOGBOOK':
        return this._renderLogbookDialog(active);
      default:
        return html``;
    }
  }
}
