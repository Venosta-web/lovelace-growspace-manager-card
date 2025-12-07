import { LitElement, html, CSSResultGroup, TemplateResult, PropertyValues } from 'lit';
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
import { GrowspaceStore } from './store/growspace-store';
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
import './components/growspace-grid';
import './components/growspace-analytics';
import { growspaceCardStyles } from './styles/growspace-card.styles';

@customElement('growspace-manager-card')
export class GrowspaceManagerCard extends LitElement implements LovelaceCard, GrowspaceCardHost {
  // Store instance
  public store = new GrowspaceStore(this);

  // History controller manages history state
  public historyController = new GrowspaceHistoryController(this);

  @state() private _menuOpen: boolean = false;
  @state() private _focusedPlantIndex: number = -1;
  @state() private _notification: { message: string, type: 'info' | 'error' | 'success' } | null = null;

  private _showToast(message: string, type: 'info' | 'error' | 'success' = 'info') {
    this._notification = { message, type };
    setTimeout(() => {
      this._notification = null;
    }, 4000);
  }


  @provide({ context: hassContext })
  @property({ attribute: false }) public hass!: HomeAssistant;

  @provide({ context: configContext })
  @property({ attribute: false }) private _config!: GrowspaceManagerCardConfig;


  public dataService!: DataService;
  static styles: CSSResultGroup = [
    variables,
    growspaceCardStyles
  ];


  connectedCallback() {
    super.connectedCallback();
    document.addEventListener('click', this._handleDocumentClick);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('click', this._handleDocumentClick);
  }

  private _handleDocumentClick = (e: Event) => {
    if (this._menuOpen) {
      const path = e.composedPath();
      const menuContainer = this.shadowRoot?.querySelector('.menu-container');
      if (menuContainer && !path.includes(menuContainer)) {
        this._menuOpen = false;
      }
    }
  };

  protected firstUpdated() {
    this.dataService = new DataService(this.hass);
    this.initializeSelectedDevice();
    this.store.fetchStrainLibrary();
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
  }





  private initializeSelectedDevice() {
    const devices = this.dataService.getGrowspaceDevices();
    if (!devices.length || this.store.selectedDevice) return;

    // Try to apply default from config
    if (this._config?.default_growspace) {
      const defaultDevice = devices.find(d =>

        d.device_id === this._config.default_growspace ||
        d.name === this._config.default_growspace
      );
      if (defaultDevice) {
        this.store.selectedDevice = defaultDevice.device_id;
        return;
      }
    }

    // Fallback to first device
    this.store.selectedDevice = devices[0].device_id;
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
    if (this._config.compact !== undefined) {
      this.store.isCompactView = this._config.compact;
    }
  }

  public getCardSize(): number { return 4; }

  // Event handlers
  private _handleDeviceChange(e: CustomEvent): void {
    this.store.selectedDevice = e.detail.deviceId;
  }





  private _handleKeyboardNav(e: KeyboardEvent) {
    if (!this.store.selectedDevice) return;
    const devices = this.dataService.getGrowspaceDevices();
    const device = devices.find(d => d.device_id === this.store.selectedDevice);
    if (!device) return;

    const plants = device.plants.filter(p => !this.store.optimisticDeletedPlantIds.has(p.attributes.plant_id || ''));
    if (plants.length === 0) return;

    if (e.key === 'ArrowRight') {
      this._focusedPlantIndex = (this._focusedPlantIndex + 1) % plants.length;
      this._focusPlantByIndex(this._focusedPlantIndex);
    } else if (e.key === 'ArrowLeft') {
      this._focusedPlantIndex = (this._focusedPlantIndex - 1 + plants.length) % plants.length;
      this._focusPlantByIndex(this._focusedPlantIndex);
    } else if (e.key === 'Enter' || e.key === ' ') {
      if (this._focusedPlantIndex >= 0 && this._focusedPlantIndex < plants.length) {
        this.store.handlePlantClick(plants[this._focusedPlantIndex]);
      }
    }
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




  private _handleTakeClone = (motherPlant: PlantEntity) => {
    const plantId = motherPlant.attributes?.plant_id || motherPlant.entity_id.replace('sensor.', '');

    this.dataService.takeClone({
      mother_plant_id: plantId
    }).then(() => {
      console.log(`Clone taken from ${motherPlant.attributes?.strain || 'plant'}`);
    }).catch((error) => {
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
    this.store.activeDialog = {
      type: 'ADD_PLANT',
      payload: {
        row,
        col
      }
    };
  }







  private async _movePlantToNextStage(_: PlantEntity) {
    if (this.store.activeDialog.type !== 'PLANT_OVERVIEW') {
      console.error("No plant found in overview dialog");
      return;
    }

    const plant = this.store.activeDialog.payload.plant;
    const stage = plant.attributes?.stage;
    let targetGrowspace = "";

    const movableStages = new Set(["mother", "flower", "dry", "cure"]);
    if (!stage || !movableStages.has(stage)) {
      this._showToast("Plant must be in mother or flower or dry or cure stage to move. stage is " + stage, 'error');
      return;
    }

    // Decide the target growspace

    if (stage === "flower") {
      targetGrowspace = "dry"; // move to curing
    } else if (stage === "dry") {
      targetGrowspace = "cure"; // final harvested
    } else if (stage === "mother") {
      targetGrowspace = "clone"; // move to curing
    }
    else {
      console.error("Unknown stage, cannot move plant", targetGrowspace);
      targetGrowspace = "error"; // fallback to dry
    }

    try {
      const plantId =
        plant.attributes?.plant_id || plant.entity_id.replace("sensor.", "");

      // Call your coordinator/service
      await this.dataService.harvestPlant(plantId, targetGrowspace);

      // Close dialog
      this.store.activeDialog = { type: 'NONE' };
    } catch (err) {
      console.error("Error moving plant to next stage:", err);
    }
  }
  private async _harvestPlant(plantEntity: PlantEntity): Promise<void> {
    await this._movePlantToNextStage(plantEntity);
  }

  private async _finishDryingPlant(plantEntity: PlantEntity): Promise<void> {
    await this._movePlantToNextStage(plantEntity);
  }
  private clonePlant = (motherPlant: PlantEntity, numClones: number) => {
    const plantId = motherPlant.attributes?.plant_id || motherPlant.entity_id.replace('sensor.', '');
    const num_clones = numClones

    this.dataService.takeClone({
      mother_plant_id: plantId,
      num_clones: num_clones,
    }).then(() => {
      console.log(`Clone taken from ${motherPlant.attributes?.strain || 'plant'}`);
    }).catch((error) => {
      console.error(`Failed to take clone: ${error.message}`);
    });
  };


  // Strain library methods
  private async _openStrainLibraryDialog() {
    await this.store.fetchStrainLibrary();
    this.store.activeDialog = {
      type: 'STRAIN_LIBRARY',
      payload: {}
    };
    this.requestUpdate();
  }



  //Irrigation dialog methods
  private _openIrrigationDialog() {
    if (!this.store.selectedDevice) return;
    this.store.activeDialog = {
      type: 'IRRIGATION',
      payload: true
    };
  }





  private async _addStrain(strainData: Partial<StrainEntry>) {
    if (!strainData.strain) return;

    const payload = {
      strain: strainData.strain,
      phenotype: strainData.phenotype,
      breeder: strainData.breeder,
      type: strainData.type,
      flowering_days_min: strainData.flowering_days_min ? Number(strainData.flowering_days_min) : undefined,
      flowering_days_max: strainData.flowering_days_max ? Number(strainData.flowering_days_max) : undefined,
      lineage: strainData.lineage,
      sex: strainData.sex,
      description: strainData.description,
      image: strainData.image,
      image_crop_meta: strainData.image_crop_meta,
      sativa_percentage: strainData.sativa_percentage,
      indica_percentage: strainData.indica_percentage
    };

    try {
      await this.dataService.addStrain(payload);
      // Refresh full library
      await this.store.fetchStrainLibrary();
    } catch (err) {
      console.error("Error adding strain:", err);
    }
  }

  private async _removeStrain(strainKey: string) {
    try {
      // The key is constructed as "Strain|Phenotype" or "Strain|default" in data-service
      const parts = strainKey.split('|');
      const strain = parts[0];
      const phenotype = parts.length > 1 && parts[1] !== 'default' ? parts[1] : undefined;

      await this.dataService.removeStrain(strain, phenotype);

      // Optimistic update
      if (this.store.strainLibrary) {
        this.store.strainLibrary = this.store.strainLibrary.filter(s => s.key !== strainKey);
        this.requestUpdate();
      }

      // Refresh full library for grid
      await this.store.fetchStrainLibrary();
    } catch (err) {
      console.error("Error removing strain:", err);
    }
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
      await this.dataService.exportStrainLibrary();
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
      const result = await this.dataService.importStrainLibrary(file, replace);
      this._showToast(`Import successful! ${result.imported_count || ''} strains imported.`, 'success');
      await this.store.fetchStrainLibrary();
    } catch (err: any) {
      console.error("Import failed:", err);
      this._showToast(`Import failed: ${err.message}`, 'error');
    }
  }

  private updateGrid(): void {
    // Refresh data from Home Assistant
    this.dataService = new DataService(this.hass);

    // Force Lit to re-render
    this.requestUpdate();
  }

  private async _handleDrop(
    e: DragEvent,
    targetRow: number,
    targetCol: number,
    targetPlant: PlantEntity | null,
    sourcePlant: PlantEntity | null
  ) {
    e.preventDefault();
    if (!sourcePlant || !this.store.selectedDevice) return;

    try {
      if (targetPlant) {
        const sourceId = sourcePlant.attributes.plant_id || sourcePlant.entity_id.replace("sensor.", "");
        const targetId = targetPlant.attributes.plant_id || targetPlant.entity_id.replace("sensor.", "");

        // Call backend swap function (atomic, correct)
        await this.dataService.swapPlants(sourceId, targetId);

        // Ask HA for updated state
        this.updateGrid();
      } else {
        // Move plant to empty slot
        await this._movePlant(sourcePlant, targetRow, targetCol);
      }
    } catch (err) {
      console.error("Error during drag-and-drop:", err);
    }
  }


  private async _movePlant(plant: PlantEntity, newRow: number, newCol: number) {
    try {
      const plantId = plant.attributes?.plant_id || plant.entity_id.replace('sensor.', '');
      await this.dataService.updatePlant({
        plant_id: plantId,
        row: newRow,
        col: newCol,
      });
    } catch (err) {
      console.error("Error moving plant:", err);
    }
  }
  _moveClonePlant(plant: PlantEntity, targetGrowspace: string) {
    const plantId = plant.attributes.plant_id || plant.entity_id.replace('sensor.', '');
    this.dataService.moveClone(plantId, targetGrowspace)
      .then(() => {
        console.log(`Moved clone ${plant.attributes.friendly_name} to ${targetGrowspace}`);
        // Optionally refresh local state
        this.store.activeDialog = { type: 'NONE' };
      }).catch((err) => {
        console.error('Error moving clone:', err);
      });
  }

  private _handleHeaderAction(e: CustomEvent) {
    const action = e.detail.action;
    switch (action) {
      case 'config':
        this._openConfigDialog();
        break;
      case 'edit':
        this.store.isEditMode = !this.store.isEditMode;
        this.requestUpdate();
        break;
      case 'compact':
        this.store.isCompactView = !this.store.isCompactView;
        this.requestUpdate();
        break;
      case 'control_dehumidifier':
        console.warn('Dehumidifier control logic implementation pending.');
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
    this.store.activeDialog = {
      type: 'CONFIG',
      payload: {
        currentTab: 'environment',
        environmentData: {
          selectedGrowspaceId: this.store.selectedDevice || '',
          temp_sensor: '',
          humidity_sensor: '',
          vpd_sensor: '',
          co2_sensor: '',
          circulation_fan: '',
          stress_threshold: 0.8,
          mold_threshold: 0.8
        }
      }
    };
  }

  private async _handleAddGrowspace(detail: any) {
    if (this.store.activeDialog?.type !== 'CONFIG') return;

    const { name, rows, plants_per_row, notification_service } = detail;
    if (!name) { this._showToast('Name is required', 'error'); return; }

    try {
      await this.dataService.addGrowspace({
        name,
        rows: rows || 4,
        plants_per_row: plants_per_row || 4,
        notification_service: notification_service || 'mobile_app_notify'
      });
      this._showToast('Growspace added successfully!', 'success');
      this.store.activeDialog = { type: 'NONE' };
    } catch (e: any) {
      this._showToast(`Error: ${e.message}`, 'error');
    }
  }

  private async _handleEnvironmentConfig(detail: any) {
    if (this.store.activeDialog?.type !== 'CONFIG') return;

    const {
      selectedGrowspaceId, temp_sensor, humidity_sensor, vpd_sensor,
      co2_sensor, circulation_fan, stress_threshold, mold_threshold
    } = detail;

    if (!selectedGrowspaceId || !temp_sensor || !humidity_sensor || !vpd_sensor) {
      this._showToast('Growspace and required sensors (Temp, Hum, VPD) are mandatory', 'error');
      return;
    }

    try {
      await this.dataService.configureEnvironment({
        growspace_id: selectedGrowspaceId,
        temperature_sensor: temp_sensor,
        humidity_sensor: humidity_sensor,
        vpd_sensor: vpd_sensor,
        co2_sensor: co2_sensor || undefined,
        circulation_fan: circulation_fan || undefined,
        stress_threshold: stress_threshold,
        mold_threshold: mold_threshold
      });
      this._showToast('Environment configured successfully!', 'success');
      this.store.activeDialog = { type: 'NONE' };
    } catch (e: any) {
      this._showToast(`Error: ${e.message}`, 'error');
    }
  }

  // Grow Master Methods
  private async _openGrowMasterDialog(isStressed = false, personality?: string) {
    this.store.activeDialog = {
      type: 'GROW_MASTER',
      payload: {
        growspaceId: this.store.selectedDevice || '',
        isLoading: false,
        response: null,
        mode: isStressed ? 'all' : 'single'
      }
    };
    if (isStressed) {
      this._analyzeGrowspace('', true);
    }
  }




  private async _analyzeGrowspace(query: string, all: boolean) {
    if (this.store.activeDialog.type !== 'GROW_MASTER') return;

    // Set loading state
    this.store.activeDialog = {
      type: 'GROW_MASTER',
      payload: { ...this.store.activeDialog.payload, isLoading: true, response: null }
    };

    try {
      let result: { response: string | { response: string } };
      let responseText: string;

      if (all) {
        result = await this.dataService.analyzeAllGrowspaces();
      } else {
        result = await this.dataService.askGrowAdvice(this.store.selectedDevice || '', query);
      }

      if (result && typeof result.response === 'object' && result.response.response) {
        responseText = result.response.response;
      } else if (result && typeof result.response === 'string') {
        responseText = result.response;
      } else {
        responseText = JSON.stringify(result, null, 2);
      }

      // Update with response
      if (this.store.activeDialog.type === 'GROW_MASTER') {
        this.store.activeDialog = {
          type: 'GROW_MASTER',
          payload: { ...this.store.activeDialog.payload, isLoading: false, response: responseText }
        };
      }
    } catch (e: any) {
      console.error(e);
      if (this.store.activeDialog.type === 'GROW_MASTER') {
        this.store.activeDialog = {
          type: 'GROW_MASTER',
          payload: { ...this.store.activeDialog.payload, isLoading: false, response: `Error: ${e.message || 'Failed to get analysis.'}` }
        };
      }
    } finally {
      this.requestUpdate();
    }
  }

  private _openStrainRecommendationDialog() {
    this.store.activeDialog = {
      type: 'STRAIN_RECOMMENDATION',
      payload: {
        isLoading: false,
        response: null
      }
    };
  }

  private async _getStrainRecommendation(query?: string) {
    if (this.store.activeDialog?.type !== 'STRAIN_RECOMMENDATION') return;
    // We actually need the query from the event or state.

    // We actually need the query from the event or state.
    // Since component holds state, we expect event to pass it.
    // Refactoring: _getStrainRecommendation(query: string)

    this.requestUpdate();

    try {
      const response = await this.dataService.getStrainRecommendation(query || '');
      if (this.store.activeDialog?.type === 'STRAIN_RECOMMENDATION') {
        let responseText: string | null = null;
        if (response && typeof response.response === 'string') {
          responseText = response.response;
        } else {
          responseText = JSON.stringify(response, null, 2);
        }
        this.store.activeDialog = {
          type: 'STRAIN_RECOMMENDATION',
          payload: { ...this.store.activeDialog.payload, isLoading: false, response: responseText }
        };
      }
    } catch (e: any) {
      if (this.store.activeDialog?.type === 'STRAIN_RECOMMENDATION') {
        this.store.activeDialog = {
          type: 'STRAIN_RECOMMENDATION',
          payload: { ...this.store.activeDialog.payload, isLoading: false, response: `Error: ${e.message || 'Failed to get recommendation.'}` }
        };
      }
    } finally {
      this.requestUpdate();
    }
  }

  private _openLogbookDialog() {
    if (!this.store.selectedDevice) return;
    this.store.activeDialog = {
      type: 'LOGBOOK',
      payload: {
        growspaceId: this.store.selectedDevice
      }
    };
  }


  private get _activeDevices(): GrowspaceDevice[] {
    if (!this.hass) return [];

    // Ensure we have the latest HASS reference
    this.dataService = new DataService(this.hass);
    const devices = this.dataService.getGrowspaceDevices();

    // Filter out optimistically deleted plants
    devices.forEach(d => {
      d.plants = d.plants.filter(p => {
        const pId = p.attributes.plant_id || p.entity_id.replace('sensor.', '');
        return !this.store.optimisticDeletedPlantIds.has(pId);
      });
    });

    return devices;
  }

  private _calculateCurrentGridLayout(deviceData: GrowspaceDevice) {
    const effectiveRows = PlantUtils.calculateEffectiveRows(deviceData);
    const { grid } = PlantUtils.createGridLayout(
      deviceData.plants,
      effectiveRows,
      deviceData.plants_per_row
    );
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
    if (!this.store.defaultApplied && this._config?.default_growspace) {
      const match = devices.find(d =>
        d.device_id === this._config.default_growspace || d.name === this._config.default_growspace
      );
      if (match) this.store.selectedDevice = match.device_id;
      this.store.defaultApplied = true;
    }

    if (!this.store.selectedDevice || !devices.find(d => d.device_id === this.store.selectedDevice)) {
      this.store.selectedDevice = devices[0].device_id;
    }

    const selectedDeviceData = devices.find(d => d.device_id === this.store.selectedDevice);
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
    const strainLibrary = this.store.strainLibrary;

    return html`
      <ha-card class=${isWide ? 'wide-growspace' : ''}>
        <div class="sr-only-announcer" aria-live="polite"></div>
        <div class="unified-growspace-card" tabindex="0" @keydown=${this._handleKeyboardNav}>
          <growspace-header
            .device=${selectedDeviceData}
            .devices=${devices}
            .activeEnvGraphs=${this.historyController.activeEnvGraphs}
            .historyData=${this.historyController.historyData || null}
            .compact=${this.store.isCompactView}
            .isEditMode=${this.store.isEditMode}
            .selectedDevice=${this.store.selectedDevice}
            .growspaceOptions=${growspaceOptions}
            .linkedGraphGroups=${this.historyController.linkedGraphGroups}
            @growspace-changed=${this._handleDeviceChange}
            @toggle-env-graph=${(e: CustomEvent) => this.historyController.toggleEnvGraph({ metric: e.detail.metric, visible: true })}
            @link-graphs=${(e: CustomEvent) => this.historyController.linkGraphs(e.detail.metric1, e.detail.metric2)}
            @unlink-graphs=${(e: CustomEvent) => this.historyController.unlinkGraphGroup(e.detail.groupIndex)}
            @trigger-action=${this._handleHeaderAction}
          ></growspace-header>
          <growspace-analytics
            .hass=${this.hass}
            .device=${selectedDeviceData}
            .historyData=${this.historyController.historyData || []}
            .dehumidifierHistory=${this.historyController.dehumidifierHistory || []}
            .exhaustHistory=${this.historyController.exhaustHistory || []}
            .humidifierHistory=${this.historyController.humidifierHistory || []}
            .soilMoistureHistory=${this.historyController.soilMoistureHistory || []}
            .activeEnvGraphs=${this.historyController.activeEnvGraphs}
            .linkedGraphGroups=${this.historyController.linkedGraphGroups}
            .range=${this.historyController.getRange()}
            @range-change=${(e: CustomEvent) => this.historyController.setGraphRange(e.detail.range)}
            @toggle-graph=${(e: CustomEvent) => this.historyController.toggleEnvGraph({ metric: e.detail.metric, visible: true })}
            @unlink-graphs=${(e: CustomEvent) => this.historyController.unlinkGraphGroup(e.detail.groupIndex)}
            @unlink-graph=${(e: CustomEvent) => this.historyController.unlinkGraphMetric(e.detail.metric)}
          ></growspace-analytics>
          ${this.renderEditModeBanner()}
          ${this.renderGrid(grid, effectiveRows, selectedDeviceData.plants_per_row, strainLibrary)}
        </div>
      </ha-card>


          ${this._notification ? html`
            <div class="toast-notification ${this._notification.type}">
              ${this._notification.message}
            </div>
          ` : ''}
          ${this.renderDialogs(growspaceOptions)}
        `;
  }



  private renderEditModeBanner(): TemplateResult {
    if (!this.store.isEditMode) return html``;

    return html`
      <div class="edit-mode-banner">
        <div class="banner-content">
          <svg style="width:20px;height:20px;fill:currentColor;" viewBox="0 0 24 24">
            <path d="${mdiCheckboxMarked}"></path>
          </svg>
          <span>${this.store.selectedPlants.size} plant(s) selected</span>
        </div>
        <div class="banner-actions">
          <button class="md3-button text" @click=${() => this.store.selectAllPlants()}>Select All</button>
          <button class="md3-button text" @click=${() => this.store.deselectAllPlants()}>Clear</button>
          <button class="md3-button text" @click=${() => this.store.exitEditMode()}>Exit</button>
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
        .isEditMode=${this.store.isEditMode}
        .selectedPlants=${this.store.selectedPlants}
        .compact=${this.store.isCompactView}
        @plant-click=${(e: CustomEvent) => this.store.handlePlantClick(e.detail.plant)}
        @add-plant-click=${(e: CustomEvent) => this._openAddPlantDialog(e.detail.row, e.detail.col)}
        @plant-drop=${(e: CustomEvent) =>
        this._handleDrop(
          e.detail.originalEvent,
          e.detail.targetRow,
          e.detail.targetCol,
          e.detail.targetPlant,
          e.detail.sourcePlant
        )
      }
        @selection-changed=${(e: CustomEvent) => {
        this.store.selectedPlants = e.detail.selectedPlants;
        this.requestUpdate();
      }}
      ></growspace-grid>
    `;
  }




  private async _confirmAddPlant(detail: any) {
    const devices = this.dataService.getGrowspaceDevices();
    const selectedDeviceData = devices.find(d => d.device_id === this.store.selectedDevice);
    if (!selectedDeviceData) return;

    const {
      strain, phenotype, row, col,
      veg_start, flower_start, seedling_start, mother_start, clone_start, dry_start, cure_start
    } = detail;

    if (!strain) {
      this._showToast("Please select a strain", "error");
      return;
    }

    try {
      await this.dataService.addPlant({
        growspace_id: selectedDeviceData.device_id,
        strain,
        phenotype: phenotype || '',
        row,
        col,
        veg_start, flower_start, seedling_start, mother_start, clone_start, dry_start, cure_start
      });
      this._showToast("Plant added successfully", "success");
      this.store.activeDialog = { type: 'NONE' };
    } catch (e: any) {
      console.error(e);
      this._showToast("Failed to add plant", "error");
    }
  }

  private renderDialogs(growspaceOptions: Record<string, string>): TemplateResult {
    const active = this.store.activeDialog;
    if (active.type === 'NONE') return html``;

    const strainLibrary = this.dataService?.getStrainLibrary() || [];
    const devices = this.dataService.getGrowspaceDevices();
    const selectedDeviceData = devices.find(d => d.device_id === this.store.selectedDevice);

    // ADD PLANT DIALOG
    if (active.type === 'ADD_PLANT') {
      const dialogState = active.payload;
      return html`
        <add-plant-dialog
          .hass=${this.hass}
          .open=${true}
          .strainLibrary=${strainLibrary}
          .growspaceName=${selectedDeviceData?.name ?? ''}
          .row=${dialogState.row}
          .col=${dialogState.col}
          @close=${() => this.store.activeDialog = { type: 'NONE' }}
          @add-plant-submit=${(e: CustomEvent) => this._confirmAddPlant(e.detail)}
        ></add-plant-dialog>
      `;
    }

    // PLANT OVERVIEW DIALOG
    if (active.type === 'PLANT_OVERVIEW') {
      return html`
        <plant-overview-dialog
          .dialog=${active.payload}
          .growspaceOptions=${growspaceOptions}
          @close=${() => this.store.activeDialog = { type: 'NONE' }}
          @update=${() => this.store.updatePlant()}
          @delete=${(e: CustomEvent) => this.store.handleDeletePlant(e.detail.plantId, () => this.updateGrid())}
          @harvest=${(e: CustomEvent) => this._harvestPlant(e.detail.plant)}
          @finish-drying=${(e: CustomEvent) => this._finishDryingPlant(e.detail.plant)}
          @take-clone=${(e: CustomEvent) => {
          this.clonePlant(e.detail.plant, e.detail.numClones);
          this.store.activeDialog = { type: 'NONE' };
        }}
          @move-clone=${(e: CustomEvent) => {
          const { plant, targetGrowspace } = e.detail;
          this.dataService.moveClone(plant.attributes.plant_id, targetGrowspace)
            .then(() => {
              console.log(`Clone ${plant.attributes.friendly_name} moved to ${targetGrowspace}`);
              this.store.activeDialog = { type: 'NONE' };
            }).catch((err) => {
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

    // STRAIN LIBRARY DIALOG
    if (active.type === 'STRAIN_LIBRARY') {
      return html`
        <strain-library-dialog
          .open=${true}
          .strains=${this.store.strainLibrary || []}
          @close=${() => this.store.activeDialog = { type: 'NONE' }}
          @save-strain=${(e: CustomEvent) => this._addStrain(e.detail)}
          @delete-strain=${(e: CustomEvent) => this._removeStrain(e.detail.key)}
          @import-library=${(e: CustomEvent) => this._performImport(e.detail.file, e.detail.replace)}
          @export-library=${() => this._handleExportLibrary()}
          @get-recommendation=${() => this._openStrainRecommendationDialog()}
        ></strain-library-dialog>
      `;
    }

    // CONFIG DIALOG
    if (active.type === 'CONFIG') {
      const dialogState = active.payload;
      return html`
        <config-dialog
          .open=${true}
          .growspaceOptions=${growspaceOptions}
          @close=${() => this.store.activeDialog = { type: 'NONE' }}
          @add-growspace-submit=${(e: CustomEvent) => this._handleAddGrowspace(e.detail)}
          @configure-environment-submit=${(e: CustomEvent) => this._handleEnvironmentConfig(e.detail)}
          .setInitialState=${(el: any) => {
          // Pass initial state if needed
          if (el) el.setInitialState(dialogState.currentTab, dialogState.environmentData);
        }}
        ></config-dialog>
      `;
    }

    // GROW MASTER DIALOG
    if (active.type === 'GROW_MASTER') {
      const dialogState = active.payload;
      // Determine stress state for the dialog
      let isStressed = false;
      let personality = undefined;

      // Attempt to find stress sensor
      if (this.store.selectedDevice && this.hass) {
        // Pattern checking for stress sensor
        const id = this.store.selectedDevice;
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
          @close=${() => this.store.activeDialog = { type: 'NONE' }}
          @analyze-growspace=${(e: CustomEvent) => this._analyzeGrowspace(e.detail.query, false)}
          @analyze-all-growspaces=${(e: CustomEvent) => this._analyzeGrowspace(e.detail.query, true)}
        ></grow-master-dialog>
      `;
    }

    // STRAIN RECOMMENDATION DIALOG
    if (active.type === 'STRAIN_RECOMMENDATION') {
      const dialogState = active.payload;
      return html`
        <strain-recommendation-dialog
          .open=${true}
          .hass=${this.hass}
          .isLoading=${dialogState.isLoading}
          .response=${dialogState.response}
          @close=${() => this.store.activeDialog = { type: 'NONE' }}
          @get-recommendation=${(e: CustomEvent) => this._getStrainRecommendation(e.detail.query)}
        ></strain-recommendation-dialog>
      `;
    }

    // IRRIGATION DIALOG
    if (active.type === 'IRRIGATION') {
      return html`
         <irrigation-dialog
           .hass=${this.hass}
           .open=${true}
           .growspaceId=${this.store.selectedDevice}
           .growspaceName=${selectedDeviceData?.name || ''}
           .growspaceEntityId=${selectedDeviceData?.overview_entity_id || ''}
           @close=${() => this.store.activeDialog = { type: 'NONE' }}
         ></irrigation-dialog>
        `;
    }

    // LOGBOOK DIALOG
    if (active.type === 'LOGBOOK') {
      const dialogState = active.payload;
      return html`
        <logbook-dialog
          .hass=${this.hass}
          .open=${true}
          .growspaceId=${dialogState.growspaceId}
          @close=${() => this.store.activeDialog = { type: 'NONE' }}
        ></logbook-dialog>
      `;
    }


    return html``;
  }
}
