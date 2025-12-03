import { LitElement, html, css, unsafeCSS, CSSResultGroup, TemplateResult, PropertyValues, svg } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCard, LovelaceCardEditor } from 'custom-card-helpers';
import { mdiPlus, mdiSprout, mdiFlower, mdiDna, mdiCannabis, mdiHairDryer, mdiMagnify, mdiChevronDown, mdiChevronRight, mdiDelete, mdiLightbulbOn, mdiLightbulbOff, mdiThermometer, mdiWaterPercent, mdiWeatherCloudy, mdiCloudOutline, mdiWeatherSunny, mdiWeatherNight, mdiCog, mdiBrain, mdiDotsVertical, mdiRadioboxMarked, mdiRadioboxBlank, mdiWater, mdiPencil, mdiCheckboxMarked, mdiCheckboxBlankOutline, mdiAirHumidifier, mdiLink, mdiFan, mdiWaterOff, mdiAirHumidifierOff } from '@mdi/js';
import { DateTime } from 'luxon';
import { variables } from './styles/variables';

// Import our modules
import {
  GrowspaceManagerCardConfig,
  PlantEntity,
  PlantStage,
  AddPlantDialogState,
  PlantOverviewDialogState,
  StrainLibraryDialogState,
  ConfigDialogState,
  GrowMasterDialogState,
  GrowspaceDevice,
  StrainEntry,
  StrainRecommendationDialogState,
  IrrigationDialogState
} from './types';
import { PlantUtils } from "./utils";
import { DataService } from './data-service';
import { DialogRenderer } from './dialog-renderer';
import './growspace-env-chart';
import './dialogs/plant-overview-dialog';
import './dialogs/strain-library-dialog';
import './components/plant-card';
import './components/growspace-header';
import './components/growspace-grid';
import { growspaceCardStyles } from './styles/growspace-card.styles';

@customElement('growspace-manager-card')
export class GrowspaceManagerCard extends LitElement implements LovelaceCard {
  @state() private _addPlantDialog: AddPlantDialogState | null = null;
  @state() private _defaultApplied = false;
  @state() private _plantOverviewDialog: PlantOverviewDialogState | null = null;
  @state() private _optimisticDeletedPlantIds: Set<string> = new Set();
  @state() private _strainLibraryDialog: StrainLibraryDialogState | null = null;
  @state() private _configDialog: ConfigDialogState | null = null;
  @state() private _growMasterDialog: GrowMasterDialogState | null = null;
  @state() private _strainRecommendationDialog: StrainRecommendationDialogState | null = null;
  @state() private _irrigationDialog: IrrigationDialogState | null = null;
  @state() private selectedDevice: string | null = null;
  @state() private _isCompactView: boolean = false;
  @state() private _isControlDehumidifier: boolean = false;
  @state() private _strainLibrary: StrainEntry[] = [];
  @state() private _historyData: any[] | null = null;
  @state() private _dehumidifierHistory: any[] | null = null;
  @state() private _exhaustHistory: any[] | null = null;
  @state() private _humidifierHistory: any[] | null = null;

  @state() private _activeEnvGraphs: Set<string> = new Set();
  @state() private _linkedGraphGroups: string[][] = [];
  @state() private _graphRanges: Record<string, '1h' | '6h' | '24h' | '7d'> = {};

  @state() private _menuOpen: boolean = false;
  @state() private _isEditMode: boolean = false;
  @state() private _selectedPlants: Set<string> = new Set();
  @state() private _focusedPlantIndex: number = -1;
  @state() private _mobileEnvExpanded: boolean = false;


  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ attribute: false }) private _config!: GrowspaceManagerCardConfig;


  private dataService!: DataService;
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
    this._fetchHistory();
    this._fetchStrainLibrary();
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    if (changedProps.has('selectedDevice')) {
      const range = this.selectedDevice ? (this._graphRanges[this.selectedDevice] || '24h') : '24h';
      this._fetchHistory(range);
      if (this._activeEnvGraphs.has('dehumidifier')) {
        this._fetchDehumidifierHistory(range);
      }
    }
  }

  private async _fetchHistory(range: '1h' | '6h' | '24h' | '7d' = '24h') {
    if (!this.hass || !this.selectedDevice) return;
    const devices = this.dataService.getGrowspaceDevices();
    const device = devices.find(d => d.device_id === this.selectedDevice);
    if (!device) return;

    let slug = device.name.toLowerCase().replace(/\s+/g, '_');
    if (device.overview_entity_id) {
      slug = device.overview_entity_id.replace('sensor.', '');
    }

    let envEntityId = `binary_sensor.${slug}_optimal_conditions`;
    // Specific logic for 'cure' and 'dry' growspaces
    if (slug === 'cure') {
      envEntityId = `binary_sensor.cure_optimal_curing`;
    } else if (slug === 'dry') {
      envEntityId = `binary_sensor.dry_optimal_drying`;
    }

    // Get history based on range
    const now = new Date();
    let startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    switch (range) {
      case '1h':
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '6h':
        startTime = new Date(now.getTime() - 6 * 60 * 60 * 1000);
        break;
      case '7d':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
    }

    try {
      const history = await this.dataService.getHistory(envEntityId, startTime, now);
      this._historyData = history;
    } catch (e) {
      console.error("Failed to fetch history", e);
    }
  }

  private async _fetchDehumidifierHistory(range: '1h' | '6h' | '24h' | '7d' = '24h') {
    if (!this.hass || !this.selectedDevice) return;
    const devices = this.dataService.getGrowspaceDevices();
    const device = devices.find(d => d.device_id === this.selectedDevice);
    if (!device || !device.overview_entity_id) return;

    const overviewEntity = this.hass.states[device.overview_entity_id];
    const dehumidifierEntityId = overviewEntity?.attributes?.dehumidifier_entity;

    if (!dehumidifierEntityId) return;

    const now = new Date();
    let startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    switch (range) {
      case '1h':
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '6h':
        startTime = new Date(now.getTime() - 6 * 60 * 60 * 1000);
        break;
      case '7d':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
    }

    try {
      const history = await this.dataService.getHistory(dehumidifierEntityId, startTime, now);
      this._dehumidifierHistory = history;
    } catch (e) {
      console.error("Failed to fetch dehumidifier history", e);
    }
  }

  private async _fetchExhaustHistory(range: '1h' | '6h' | '24h' | '7d' = '24h') {
    if (!this.hass || !this.selectedDevice) return;
    const devices = this.dataService.getGrowspaceDevices();
    const device = devices.find(d => d.device_id === this.selectedDevice);
    if (!device || !device.overview_entity_id) return;

    const overviewEntity = this.hass.states[device.overview_entity_id];
    const exhaustEntityId = overviewEntity?.attributes?.exhaust_entity;

    if (!exhaustEntityId) return;

    const now = new Date();
    let startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    switch (range) {
      case '1h':
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '6h':
        startTime = new Date(now.getTime() - 6 * 60 * 60 * 1000);
        break;
      case '7d':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
    }

    try {
      const history = await this.dataService.getHistory(exhaustEntityId, startTime, now);
      this._exhaustHistory = history;
    } catch (e) {
      console.error("Failed to fetch exhaust history", e);
    }
  }

  private async _fetchHumidifierHistory(range: '1h' | '6h' | '24h' | '7d' = '24h') {
    if (!this.hass || !this.selectedDevice) return;
    const devices = this.dataService.getGrowspaceDevices();
    const device = devices.find(d => d.device_id === this.selectedDevice);
    if (!device || !device.overview_entity_id) return;

    const overviewEntity = this.hass.states[device.overview_entity_id];
    const humidifierEntityId = overviewEntity?.attributes?.humidifier_entity;

    if (!humidifierEntityId) return;

    const now = new Date();
    let startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    switch (range) {
      case '1h':
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '6h':
        startTime = new Date(now.getTime() - 6 * 60 * 60 * 1000);
        break;
      case '7d':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
    }

    try {
      const history = await this.dataService.getHistory(humidifierEntityId, startTime, now);
      this._humidifierHistory = history;
    } catch (e) {
      console.error("Failed to fetch humidifier history", e);
    }
  }

  private async _fetchStrainLibrary() {
    if (!this.hass) return;

    // 1. Try to load from cache first for instant render
    const cachedLibrary = localStorage.getItem('growspace_strain_library');
    if (cachedLibrary) {
      try {
        this._strainLibrary = JSON.parse(cachedLibrary);
        this.requestUpdate();
      } catch (e) {
        console.warn('Failed to parse cached strain library', e);
      }
    }

    try {
      const currentStrains = await this.dataService.fetchStrainLibrary();
      this._strainLibrary = currentStrains;
      // Update cache
      localStorage.setItem('growspace_strain_library', JSON.stringify(currentStrains));
    } catch (e) {
      console.error('Failed to fetch strain library for grid:', e);
    }
  }

  private initializeSelectedDevice() {
    const devices = this.dataService.getGrowspaceDevices();
    if (!devices.length || this.selectedDevice) return;

    // Try to apply default from config
    if (this._config?.default_growspace) {
      const defaultDevice = devices.find(d =>

        d.device_id === this._config.default_growspace ||
        d.name === this._config.default_growspace
      );
      if (defaultDevice) {
        this.selectedDevice = defaultDevice.device_id;
        return;
      }
    }

    // Fallback to first device
    this.selectedDevice = devices[0].device_id;
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
      this._isCompactView = this._config.compact;
    }
  }

  public getCardSize(): number { return 4; }

  // Event handlers
  private _handleDeviceChange(e: CustomEvent): void {
    this.selectedDevice = e.detail.deviceId;
  }

  private _togglePlantSelection(plant: PlantEntity) {
    const plantId = plant.attributes.plant_id;
    if (!plantId) return;

    const newSet = new Set(this._selectedPlants);
    if (newSet.has(plantId)) {
      newSet.delete(plantId);
    } else {
      newSet.add(plantId);
    }
    this._selectedPlants = newSet;
    this.requestUpdate();
  }

  // Bulk Edit Helper Methods
  private _selectAllPlants() {
    const devices = this.dataService.getGrowspaceDevices();
    const selectedDeviceData = devices.find(d => d.device_id === this.selectedDevice);
    if (!selectedDeviceData) return;

    const allPlantIds = new Set<string>();
    selectedDeviceData.plants?.forEach(plant => {
      const plantId = plant.attributes.plant_id;
      if (plantId && !this._optimisticDeletedPlantIds.has(plantId)) {
        allPlantIds.add(plantId);
      }
    });

    this._selectedPlants = allPlantIds;
    this.requestUpdate();
  }

  private _deselectAllPlants() {
    this._selectedPlants = new Set();
    this.requestUpdate();
  }

  private _exitEditMode() {
    this._isEditMode = false;
    this._selectedPlants = new Set();
    this.requestUpdate();
  }

  private _handleKeyboardNav(e: KeyboardEvent) {
    if (!this.selectedDevice) return;
    const devices = this.dataService.getGrowspaceDevices();
    const device = devices.find(d => d.device_id === this.selectedDevice);
    if (!device) return;

    const plants = device.plants.filter(p => !this._optimisticDeletedPlantIds.has(p.attributes.plant_id || ''));
    if (plants.length === 0) return;

    if (e.key === 'ArrowRight') {
      this._focusedPlantIndex = (this._focusedPlantIndex + 1) % plants.length;
      this._focusPlantByIndex(this._focusedPlantIndex);
    } else if (e.key === 'ArrowLeft') {
      this._focusedPlantIndex = (this._focusedPlantIndex - 1 + plants.length) % plants.length;
      this._focusPlantByIndex(this._focusedPlantIndex);
    } else if (e.key === 'Enter' || e.key === ' ') {
      if (this._focusedPlantIndex >= 0 && this._focusedPlantIndex < plants.length) {
        this._handlePlantClick(plants[this._focusedPlantIndex]);
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

  private _handlePlantClick(plant: PlantEntity) {
    // If in edit mode and we have selections, open dialog for ALL selected plants
    if (this._isEditMode && this._selectedPlants.size > 0) {
      const plantId = plant.attributes.plant_id;
      // If clicked plant is NOT selected, add it to selection then open.
      if (plantId && !this._selectedPlants.has(plantId)) {
        this._togglePlantSelection(plant);
      }

      // Pass the set of IDs to the dialog
      this._openPlantOverviewDialog(plant, Array.from(this._selectedPlants));
    } else {
      // Normal behavior
      this._openPlantOverviewDialog(plant);
    }
  }

  private _openPlantOverviewDialog(plant: PlantEntity, selectedIds?: string[]) {
    this._plantOverviewDialog = {
      open: true,
      plant,
      editedAttributes: { ...plant.attributes },
      activeTab: 'dashboard',
      selectedPlantIds: selectedIds
    };
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
    const strainLibrary = this.dataService.getStrainLibrary();

    // If library has entries, default to the first one
    const defaultStrain = strainLibrary.length > 0 ? strainLibrary[0].strain : '';
    const defaultPhenotype = strainLibrary.length > 0 ? strainLibrary[0].phenotype : '';

    this._addPlantDialog = {
      open: true,
      row,
      col,
      strain: defaultStrain,
      phenotype: defaultPhenotype,
      veg_start: '',
      flower_start: '',
      seedling_start: '',
      mother_start: '',
      clone_start: '',
      dry_start: '',
      cure_start: '',
    };
  }

  private async _confirmAddPlant() {
    if (!this._addPlantDialog || !this.selectedDevice) return;
    if (!this._addPlantDialog.strain) {
      alert('Please enter a strain!');
      return;
    }

    const { row, col, strain, phenotype, veg_start, flower_start, seedling_start, mother_start, clone_start, dry_start, cure_start } = this._addPlantDialog;

    try {
      const payload: any = {
        growspace_id: this.selectedDevice,
        row: row + 1,
        col: col + 1,
        strain,
        phenotype,
      };

      const dateFields: (keyof AddPlantDialogState)[] = ['veg_start', 'flower_start', 'seedling_start', 'mother_start', 'clone_start', 'dry_start', 'cure_start'];
      dateFields.forEach(field => {
        const value = this._addPlantDialog![field] as string | undefined;
        if (value) {
          // If value is just a date (YYYY-MM-DD), append current time
          if (value.length === 10 && !value.includes('T')) {
            const now = new Date();
            const timePart = now.toTimeString().split(' ')[0]; // HH:MM:SS
            payload[field] = `${value}T${timePart}`;
          } else {
            // If it already has time or is in another format, use it as is (or format if needed)
            // Previously we stripped time, but now we want to keep it if present
            payload[field] = value;
          }
        }
      });


      console.log("Adding plant to growspace:", this.selectedDevice, payload);
      console.log("Adding plant:", payload);
      await this.dataService.addPlant(payload);

      this._addPlantDialog = null;
    } catch (err) {
      console.error('Error adding plant:', err);
    }
  }


  private async _updatePlant() {
    if (!this._plantOverviewDialog) return;

    const { plant, editedAttributes, selectedPlantIds } = this._plantOverviewDialog;
    const plantId = plant.attributes?.plant_id || plant.entity_id.replace('sensor.', '');

    // Determine target IDs: either the single plant or the bulk selection
    const targetIds = (selectedPlantIds && selectedPlantIds.length > 0) ? selectedPlantIds : [plantId];
    const isBulkEdit = targetIds.length > 1;

    const payloadTemplate: any = {};
    const dateFields = ['seedling_start', 'mother_start', 'clone_start', 'veg_start', 'flower_start', 'dry_start', 'cure_start'];

    // SAFEGUARD: For bulk edits, ONLY process date fields
    // For single edits, process all fields as before
    const fieldsToProcess = isBulkEdit
      ? dateFields
      : ['strain', 'phenotype', 'row', 'col', ...dateFields];

    fieldsToProcess.forEach(field => {
      if (editedAttributes[field] !== undefined) {
        if (dateFields.includes(field)) {
          const val = String(editedAttributes[field] || '');
          if (!val || val === 'null' || val === 'undefined') {
            // Explicitly clear the date if it's empty
            payloadTemplate[field] = null;
          } else {
            const formattedDate = PlantUtils.formatDateForBackend(val);
            if (formattedDate) {
              payloadTemplate[field] = formattedDate;
            }
          }
        } else {
          // Non-date fields (strain, phenotype, row, col) - only for single edits
          if (editedAttributes[field] !== null) {
            payloadTemplate[field] = editedAttributes[field];
          }
        }
      }
    });

    try {
      // Execute updates for all target plants
      const updatePromises = targetIds.map(id => {
        const payload = { ...payloadTemplate, plant_id: id };
        // Don't update row/col for bulk edits as it would stack them
        if (isBulkEdit) {
          delete payload.row;
          delete payload.col;
        }
        return this.dataService.updatePlant(payload);
      });

      await Promise.all(updatePromises);

      this._plantOverviewDialog = null;

      // Clear selection after successful bulk update
      if (this._isEditMode) {
        this._selectedPlants = new Set();
        this._isEditMode = false; // Optional: exit edit mode
      }
    } catch (err) {
      console.error("Error updating plant(s):", err);
    }
  }

  private async _handleDeletePlant(plantId: string) {
    if (!confirm("Are you sure you want to delete this plant?")) return;

    // Optimistic Update: Immediately track as deleted
    this._optimisticDeletedPlantIds.add(plantId);
    this.requestUpdate();

    // Close dialog immediately
    this._plantOverviewDialog = null;

    try {
      await this.dataService.removePlant(plantId);
    } catch (err) {
      console.error("Error deleting plant:", err);
      // Ideally revert the optimistic update here, but for now just alert
      alert("Failed to delete plant. It may reappear on refresh.");
      this.updateGrid(); // Force refresh to sync with backend
    }
  }
  private async _movePlantToNextStage(_: PlantEntity) {
    if (!this._plantOverviewDialog?.plant) {
      console.error("No plant found in overview dialog");
      return;
    }

    const plant = this._plantOverviewDialog.plant;
    const stage = plant.attributes?.stage;
    let targetGrowspace = "";

    const movableStages = new Set(["mother", "flower", "dry", "cure"]);
    if (!stage || !movableStages.has(stage)) {
      alert("Plant must be in mother or flower or dry or cure stage to move. stage is " + stage);
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
      this._plantOverviewDialog = null;
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
    await this._fetchStrainLibrary();
    this._strainLibraryDialog = { open: true };
    this.requestUpdate();
  }



  //Irrigation dialog methods
  private _openIrrigationDialog() {
    const devices = this.dataService.getGrowspaceDevices();
    const device = devices.find(d => d.device_id === this.selectedDevice);

    // 1. Check if device and its overview sensor entity exist
    if (!device || !device.overview_entity_id) return;

    const overviewSensor = this.hass.states[device.overview_entity_id];
    const attrs = overviewSensor?.attributes || {};

    // 2. Retrieve all necessary attributes (including the list and other settings)
    // These attributes are passed to DialogRenderer.parseScheduleString, which handles 
    // the conversion from a stringified list (if needed) to an IrrigationTime[] array.
    const irrigationTimes = attrs.irrigation_times || [];
    const drainTimes = attrs.drain_times || [];

    // Also retrieve pump entities and durations (with defaults)
    const irrigationPump = attrs.irrigation_pump_entity || '';
    const drainPump = attrs.drain_pump_entity || '';
    const iDuration = attrs.irrigation_duration || 3;
    const dDuration = attrs.drain_duration || 3;


    // 3. Initialize the dialog state with the retrieved sensor data
    this._irrigationDialog = {
      open: true,
      growspace_id: device.device_id,
      growspace_name: device.name,

      irrigation_pump_entity: irrigationPump,
      drain_pump_entity: drainPump,
      irrigation_duration: iDuration,
      drain_duration: dDuration,

      irrigation_times: irrigationTimes, // <--- FIX: Now reads sensor attribute
      drain_times: drainTimes // <--- FIX: Now reads sensor attribute
    };
  }

  private async _saveIrrigationPumpSettings() {
    if (!this._irrigationDialog) return;

    try {
      await this.dataService.setIrrigationSettings({
        growspace_id: this._irrigationDialog.growspace_id,
        irrigation_pump_entity: this._irrigationDialog.irrigation_pump_entity,
        drain_pump_entity: this._irrigationDialog.drain_pump_entity,
        irrigation_duration: this._irrigationDialog.irrigation_duration,
        drain_duration: this._irrigationDialog.drain_duration
      });
      console.log('Irrigation pump settings saved');
    } catch (err) {
      console.error('Error saving irrigation pump settings:', err);
    }
  }

  private async _addIrrigationTime(time: string, duration?: number) {
    if (!this._irrigationDialog) return;

    try {
      await this.dataService.addIrrigationTime({
        growspace_id: this._irrigationDialog.growspace_id,
        time: time,
        ...(duration !== undefined && { duration })
      });

      // Add to local state
      this._irrigationDialog.irrigation_times.push({ time, duration });
      this._irrigationDialog.adding_irrigation_time = undefined;
      this.requestUpdate();
      console.log('Irrigation time added:', time);
    } catch (err) {
      console.error('Error adding irrigation time:', err);
    }
  }

  private async _removeIrrigationTime(time: string) {
    if (!this._irrigationDialog) return;

    try {
      await this.dataService.removeIrrigationTime({
        growspace_id: this._irrigationDialog.growspace_id,
        time: time
      });

      // Remove from local state
      this._irrigationDialog.irrigation_times = this._irrigationDialog.irrigation_times.filter(t => t.time !== time);
      this.requestUpdate();
      console.log('Irrigation time removed:', time);
    } catch (err) {
      console.error('Error removing irrigation time:', err);
    }
  }

  private async _addDrainTime(time: string, duration?: number) {
    if (!this._irrigationDialog) return;

    try {
      await this.dataService.addDrainTime({
        growspace_id: this._irrigationDialog.growspace_id,
        time: time,
        ...(duration !== undefined && { duration })
      });

      // Add to local state
      this._irrigationDialog.drain_times.push({ time, duration });
      this._irrigationDialog.adding_drain_time = undefined;
      this.requestUpdate();
      console.log('Drain time added:', time);
    } catch (err) {
      console.error('Error adding drain time:', err);
    }
  }

  private async _removeDrainTime(time: string) {
    if (!this._irrigationDialog) return;

    try {
      await this.dataService.removeDrainTime({
        growspace_id: this._irrigationDialog.growspace_id,
        time: time
      });

      // Remove from local state
      this._irrigationDialog.drain_times = this._irrigationDialog.drain_times.filter(t => t.time !== time);
      this.requestUpdate();
      console.log('Drain time removed:', time);
    } catch (err) {
      console.error('Error removing drain time:', err);
    }
  }

  private _startAddingIrrigationTime(x: number, containerWidth: number) {
    if (!this._irrigationDialog) return;

    // Calculate time from position (0-24 hours)
    const hours = Math.floor((x / containerWidth) * 24);
    const minutes = Math.floor(((x / containerWidth) * 24 - hours) * 60);
    const time = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

    this._irrigationDialog.adding_irrigation_time = {
      time,
      duration: this._irrigationDialog.irrigation_duration
    };
    this.requestUpdate();
  }

  private _startAddingDrainTime(x: number, containerWidth: number) {
    if (!this._irrigationDialog) return;

    // Calculate time from position (0-24 hours)
    const hours = Math.floor((x / containerWidth) * 24);
    const minutes = Math.floor(((x / containerWidth) * 24 - hours) * 60);
    const time = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

    this._irrigationDialog.adding_drain_time = {
      time,
      duration: this._irrigationDialog.drain_duration
    };
    this.requestUpdate();
  }



  private _handleToggleEnvGraph(e: CustomEvent) {
    const metric = e.detail.metric;
    this._toggleEnvGraph(metric);
  }

  private _toggleEnvGraph(metric: string) {
    const newSet = new Set(this._activeEnvGraphs);
    if (newSet.has(metric)) {
      newSet.delete(metric);
    } else {
      newSet.add(metric);
      const range = this.selectedDevice ? (this._graphRanges[this.selectedDevice] || '24h') : '24h';
      if (metric === 'dehumidifier') {
        this._fetchDehumidifierHistory(range);
      } else if (metric === 'exhaust') {
        this._fetchExhaustHistory(range);
      } else if (metric === 'humidifier') {
        this._fetchHumidifierHistory(range);
      }
    }
    this._activeEnvGraphs = newSet;
    this.requestUpdate();
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
      await this._fetchStrainLibrary();
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
      if (this._strainLibrary) {
        this._strainLibrary = this._strainLibrary.filter(s => s.key !== strainKey);
        this.requestUpdate();
      }

      // Refresh full library for grid
      await this._fetchStrainLibrary();
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
      alert(`Import successful! ${result.imported_count || ''} strains imported.`);
      await this._fetchStrainLibrary();
    } catch (err: any) {
      console.error("Import failed:", err);
      alert(`Import failed: ${err.message}`);
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
    if (!sourcePlant || !this.selectedDevice) return;

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
        this._plantOverviewDialog = null;
      }).catch((err) => {
        console.error('Error moving clone:', err);
      });
  }

  // --- Graph Linking Logic ---

  private _handleChipDragStart(e: DragEvent, metric: string) {
    e.dataTransfer?.setData("text/plain", JSON.stringify({ type: 'env-metric', metric }));
    e.dataTransfer!.effectAllowed = "link";
  }

  private _handleChipDrop(e: DragEvent, targetMetric: string) {
    e.preventDefault();
    const data = e.dataTransfer?.getData("text/plain");
    if (!data) return;

    try {
      // Handle simple string metric (from component) or JSON payload (legacy/internal)
      let sourceMetric = data;
      try {
        const payload = JSON.parse(data);
        if (payload.type === 'env-metric') {
          sourceMetric = payload.metric;
        }
      } catch (e) {
        // Not JSON, assume raw metric string
      }

      if (sourceMetric === targetMetric) return;

      this._linkGraphs(sourceMetric, targetMetric);

    } catch (err) {
      console.error("Error parsing drop data", err);
    }
  }

  private _handleLinkGraphs(e: CustomEvent) {
    const { metric1, metric2 } = e.detail;
    this._linkGraphs(metric1, metric2);
  }

  private _linkGraphs(metric1: string, metric2: string) {
    // Check if already linked
    const existingGroupIndex = this._linkedGraphGroups.findIndex(group =>
      group.includes(metric1) || group.includes(metric2)
    );

    if (existingGroupIndex !== -1) {
      // Add to existing group if not present
      const group = [...this._linkedGraphGroups[existingGroupIndex]];
      if (!group.includes(metric1)) group.push(metric1);
      if (!group.includes(metric2)) group.push(metric2);

      const newGroups = [...this._linkedGraphGroups];
      newGroups[existingGroupIndex] = group;
      this._linkedGraphGroups = newGroups;
    } else {
      // Create new group
      this._linkedGraphGroups = [...this._linkedGraphGroups, [metric1, metric2]];
    }

    // Ensure combined graph is active
    this._activeEnvGraphs.add(metric1);
    this._activeEnvGraphs.add(metric2);
    this.requestUpdate();
  }

  private _handleHeaderAction(e: CustomEvent) {
    const action = e.detail.action;
    switch (action) {
      case 'config':
        this._openConfigDialog();
        break;
      case 'edit':
        this._isEditMode = !this._isEditMode;
        break;
      case 'compact':
        this._isCompactView = !this._isCompactView;
        break;
      case 'control_dehumidifier':
        if (this.selectedDevice) {
          const device = this.dataService.getGrowspaceDevices().find(d => d.device_id === this.selectedDevice);

          if (device && device.overview_entity_id) {
            const stateObj = this.hass.states[device.overview_entity_id];
            const attrs = stateObj?.attributes || {};

            // 1. Get current state (Default to false if attribute missing)
            // Ensure your backend GrowspaceOverviewSensor exposes this attribute!
            const currentStatus = attrs.dehumidifier_control_enabled === true;

            // 2. Call service with opposite state
            this.dataService.setDehumidifierControl(this.selectedDevice, !currentStatus)
              .then(() => {
                console.log(`Toggled dehumidifier control to ${!currentStatus} for`, this.selectedDevice);
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
    }
  }

  private _handleUnlinkGraphMetric(e: CustomEvent) {
    const metric = e.detail.metric;
    const groupIndex = this._linkedGraphGroups.findIndex(g => g.includes(metric));
    if (groupIndex !== -1) {
      this._unlinkGraphs(groupIndex);
    }
  }

  private _handleUnlinkGraphs(e: CustomEvent) {
    const groupIndex = e.detail.groupIndex;
    this._unlinkGraphs(groupIndex);
  }

  private _unlinkGraphs(groupIndex: number) {
    if (groupIndex >= 0 && groupIndex < this._linkedGraphGroups.length) {
      const newGroups = [...this._linkedGraphGroups];
      newGroups.splice(groupIndex, 1);
      this._linkedGraphGroups = newGroups;
      this.requestUpdate();
    }
  }

  private _isMetricLinked(metric: string): { linked: boolean, groupIndex: number, group: string[] } {
    const index = this._linkedGraphGroups.findIndex(g => g.includes(metric));
    return {
      linked: index !== -1,
      groupIndex: index,
      group: index !== -1 ? this._linkedGraphGroups[index] : []
    };
  }

  // Configuration Dialog Methods
  private _openConfigDialog() {
    this._configDialog = {
      open: true,
      currentTab: 'add_growspace',
      addGrowspaceData: { name: '', rows: 3, plants_per_row: 3, notification_service: '' },
      environmentData: {
        selectedGrowspaceId: '',
        temp_sensor: '',
        humidity_sensor: '',
        vpd_sensor: '',
        co2_sensor: '',
        circulation_fan: '',
        stress_threshold: 0.8,
        mold_threshold: 0.8
      }
    };
  }

  private _handleAddGrowspaceSubmit() {
    if (!this._configDialog) return;
    const d = this._configDialog.addGrowspaceData;
    if (!d.name) { alert('Name is required'); return; }
    this.dataService.addGrowspace(d)
      .then(() => { this._configDialog = null; this.requestUpdate(); })
      .catch(e => alert(`Error: ${e.message}`));
  }

  private _handleEnvSubmit() {
    if (!this._configDialog) return;
    const d = this._configDialog.environmentData;
    if (!d.selectedGrowspaceId || !d.temp_sensor || !d.humidity_sensor || !d.vpd_sensor) {
      alert('Growspace and required sensors (Temp, Hum, VPD) are mandatory');
      return;
    }
    this.dataService.configureEnvironment({
      growspace_id: d.selectedGrowspaceId,
      temperature_sensor: d.temp_sensor,
      humidity_sensor: d.humidity_sensor,
      vpd_sensor: d.vpd_sensor,
      co2_sensor: d.co2_sensor || undefined,
      circulation_fan: d.circulation_fan || undefined,
      stress_threshold: d.stress_threshold,
      mold_threshold: d.mold_threshold
    })
      .then(() => { this._configDialog = null; this.requestUpdate(); })
      .catch(e => alert(`Error: ${e.message}`));
  }

  // Grow Master Methods
  private _openGrowMasterDialog() {
    if (!this.selectedDevice) return;
    this._growMasterDialog = {
      open: true,
      growspaceId: this.selectedDevice,
      userQuery: '',
      isLoading: false,
      response: null,
      mode: 'single'
    };
  }

  private async _handleAskAdvice() {
    if (!this._growMasterDialog || !this._growMasterDialog.userQuery) return;

    this._growMasterDialog.isLoading = true;
    this._growMasterDialog.response = null;
    this.requestUpdate();

    try {
      const result = await this.dataService.askGrowAdvice(this._growMasterDialog.growspaceId, this._growMasterDialog.userQuery);
      if (this._growMasterDialog) {
        // EXTRACT RESPONSE SAFELY
        // Backend returns { response: { response: "text" } } or { response: "text" }
        if (result && result.response) {
          if (typeof result.response === 'string') {
            this._growMasterDialog.response = result.response;
          } else if (typeof result.response === 'object' && 'response' in result.response && typeof result.response.response === 'string') {
            // Nested response structure
            this._growMasterDialog.response = result.response.response;
          } else {
            // Fallback
            this._growMasterDialog.response = JSON.stringify(result, null, 2);
          }
        } else {
          this._growMasterDialog.response = JSON.stringify(result, null, 2);
        }
      }
    } catch (e: any) {
      if (this._growMasterDialog) {
        this._growMasterDialog.response = `Error: ${e.message || 'Failed to get advice.'}`;
      }
    } finally {
      if (this._growMasterDialog) {
        this._growMasterDialog.isLoading = false;
        this.requestUpdate();
      }
    }
  }

  private async _handleAnalyzeAll() {
    if (!this._growMasterDialog) return;

    this._growMasterDialog.isLoading = true;
    this._growMasterDialog.response = null;
    this._growMasterDialog.mode = 'all';
    this.requestUpdate();

    try {
      const result = await this.dataService.analyzeAllGrowspaces();
      if (this._growMasterDialog) {
        // EXTRACT RESPONSE SAFELY
        if (result && result.response) {
          if (typeof result.response === 'string') {
            this._growMasterDialog.response = result.response;
          } else if (typeof result.response === 'object' && 'response' in result.response && typeof result.response.response === 'string') {
            // Nested response structure
            this._growMasterDialog.response = result.response.response;
          } else {
            this._growMasterDialog.response = JSON.stringify(result, null, 2);
          }
        } else {
          this._growMasterDialog.response = JSON.stringify(result, null, 2);
        }
      }
    } catch (e: any) {
      if (this._growMasterDialog) {
        this._growMasterDialog.response = `Error: ${e.message || 'Failed to get advice.'}`;
      }
    } finally {
      if (this._growMasterDialog) {
        this._growMasterDialog.isLoading = false;
        this.requestUpdate();
      }
    }
  }

  private async _handleGetStrainRecommendation() {
    if (!this._strainRecommendationDialog || !this._strainRecommendationDialog.userQuery) return;

    this._strainRecommendationDialog.isLoading = true;
    this._strainRecommendationDialog.response = null;
    this.requestUpdate();

    try {
      const result = await this.dataService.getStrainRecommendation(this._strainRecommendationDialog.userQuery);
      if (this._strainRecommendationDialog) {
        // EXTRACT RESPONSE SAFELY
        if (result && typeof result.response === 'string') {
          this._strainRecommendationDialog.response = result.response;
        } else {
          this._strainRecommendationDialog.response = JSON.stringify(result, null, 2);
        }
      }
    } catch (e: any) {
      if (this._strainRecommendationDialog) {
        this._strainRecommendationDialog.response = `Error: ${e.message || 'Failed to get recommendation.'}`;
      }
    } finally {
      if (this._strainRecommendationDialog) {
        this._strainRecommendationDialog.isLoading = false;
        this.requestUpdate();
      }
    }
  }

  private _openStrainRecommendationDialog() {
    this._strainRecommendationDialog = {
      open: true,
      userQuery: '',
      isLoading: false,
      response: null
    };
  }




  protected render(): TemplateResult {
    if (!this.hass) {
      return html`<ha-card><div class="error">Home Assistant not available</div></ha-card>`;
    }

    this.dataService = new DataService(this.hass);
    const devices = this.dataService.getGrowspaceDevices();

    // Filter out optimistically deleted plants
    devices.forEach(d => {
      d.plants = d.plants.filter(p => {
        const pId = p.attributes.plant_id || p.entity_id.replace('sensor.', '');
        return !this._optimisticDeletedPlantIds.has(pId);
      });
    });

    if (!devices.length) {
      return html`<ha-card><div class="no-data">No growspace devices found.</div></ha-card>`;
    }

    // Apply default growspace logic
    if (!this._defaultApplied && this._config?.default_growspace) {
      const match = devices.find(d =>
        d.device_id === this._config.default_growspace || d.name === this._config.default_growspace
      );
      if (match) this.selectedDevice = match.device_id;
      this._defaultApplied = true;
    }

    if (!this.selectedDevice || !devices.find(d => d.device_id === this.selectedDevice)) {
      this.selectedDevice = devices[0].device_id;
    }

    const selectedDeviceData = devices.find(d => d.device_id === this.selectedDevice);
    if (!selectedDeviceData) {
      return html`<ha-card><div class="error">No valid growspace selected.</div></ha-card>`;
    }

    // Check if growspace is empty
    if (selectedDeviceData.plants.length === 0) {
      return html`
        <ha-card>
          <div class="no-data" style="text-align:center; padding: 1.5rem;">
            Growspace <strong>${selectedDeviceData.name}</strong> is currently empty.
          </div>
        </ha-card>
      `;
    }

    const growspaceOptions: Record<string, string> = {};
    const growspaces = this.hass.states['sensor.growspaces_list']?.attributes?.growspaces;
    if (growspaces) {
      Object.entries(growspaces).forEach(([id, name]) => {
        growspaceOptions[id] = name as string;
      });
    }
    // Calculate grid layout
    const effectiveRows = PlantUtils.calculateEffectiveRows(selectedDeviceData);
    const { grid } = PlantUtils.createGridLayout(
      selectedDeviceData.plants,
      effectiveRows,
      selectedDeviceData.plants_per_row
    );

    const isWide = selectedDeviceData.plants_per_row > 7;
    const strainLibrary = this._strainLibrary;

    return html`
      <ha-card class=${isWide ? 'wide-growspace' : ''}>
        <div class="sr-only-announcer" aria-live="polite"></div>
        <div class="unified-growspace-card" tabindex="0" @keydown=${this._handleKeyboardNav}>
          <growspace-header
            .hass=${this.hass}
            .config=${this._config}
            .device=${selectedDeviceData}
            .devices=${devices}
            .activeEnvGraphs=${this._activeEnvGraphs}
            .historyData=${this._historyData}
            .compact=${this._isCompactView}
            .isEditMode=${this._isEditMode}
            .selectedDevice=${this.selectedDevice}
            .growspaceOptions=${growspaceOptions}
            .linkedGraphGroups=${this._linkedGraphGroups}
            @growspace-changed=${this._handleDeviceChange}
            @toggle-env-graph=${this._handleToggleEnvGraph}
            @link-graphs=${this._handleLinkGraphs}
            @unlink-graphs=${this._handleUnlinkGraphs}
            @trigger-action=${this._handleHeaderAction}
          ></growspace-header>
          ${this.renderGraphs()}
          ${this.renderEditModeBanner()}
          ${this.renderGrid(grid, effectiveRows, selectedDeviceData.plants_per_row, strainLibrary)}
        </div>
      </ha-card>
      
      ${this.renderDialogs(growspaceOptions)}
    `;
  }

  private renderGraphs(): TemplateResult {
    if (this._activeEnvGraphs.size === 0) return html``;

    const renderedMetrics = new Set<string>();
    const graphs: TemplateResult[] = [];
    const range = this.selectedDevice ? (this._graphRanges[this.selectedDevice] || '24h') : '24h';
    const selectedDeviceData = this.dataService.getGrowspaceDevices().find(d => d.device_id === this.selectedDevice);

    if (!selectedDeviceData) return html``;

    // Render Linked Graphs
    this._linkedGraphGroups.forEach(group => {
      if (group.some(m => this._activeEnvGraphs.has(m))) {
        const activeMetrics = group.filter(m => this._activeEnvGraphs.has(m));
        if (activeMetrics.length > 0) {
          const metricConfig: Record<string, any> = {
            temperature: { color: '#ff5252', title: 'Temperature', unit: '°C' },
            humidity: { color: '#2196f3', title: 'Humidity', unit: '%' },
            vpd: { color: '#9c27b0', title: 'VPD', unit: 'kPa' },
            co2: { color: '#4caf50', title: 'CO2', unit: 'ppm' },
            light: { color: '#ffc107', title: 'Light', unit: 'state' },
            irrigation: { color: '#03a9f4', title: 'Irrigation', unit: 'state' },
            drain: { color: '#ff9800', title: 'Drain', unit: 'state' },
            exhaust: { color: '#795548', title: 'Exhaust', unit: '' },
            humidifier: { color: '#607d8b', title: 'Humidifier', unit: '' },
            dehumidifier: { color: '#546e7a', title: 'Dehumidifier', unit: '' },
            optimal: { color: '#4caf50', title: 'Optimal Conditions', unit: 'state' }
          };

          graphs.push(html`
                <growspace-env-chart
                    .hass=${this.hass}
                    .device=${selectedDeviceData}
                    .history=${this._historyData || []}
                    .metrics=${activeMetrics}
                    .isCombined=${true}
                    .metricConfig=${metricConfig}
                    .range=${range}
                    @toggle-graph=${this._handleToggleEnvGraph}
                    @unlink-graphs=${this._handleUnlinkGraphs}
                    @unlink-graph=${this._handleUnlinkGraphMetric}
                ></growspace-env-chart>
            `);
          group.forEach(m => renderedMetrics.add(m));
        }
      }
    });

    // Render Individual Graphs
    this._activeEnvGraphs.forEach(metric => {
      if (renderedMetrics.has(metric)) return;

      let color = '#fff';
      let title = metric;
      let unit = '';
      let icon = mdiMagnify;
      let type: 'line' | 'step' = 'line';
      let history = this._historyData || [];

      switch (metric) {
        case 'temperature': color = '#ff5252'; title = 'Temperature'; unit = '°C'; icon = mdiThermometer; break;
        case 'humidity': color = '#2196f3'; title = 'Humidity'; unit = '%'; icon = mdiWaterPercent; break;
        case 'vpd': color = '#9c27b0'; title = 'VPD'; unit = 'kPa'; icon = mdiCloudOutline; break;
        case 'co2': color = '#4caf50'; title = 'CO2'; unit = 'ppm'; icon = mdiWeatherCloudy; break;
        case 'light': color = '#ffc107'; title = 'Light'; unit = 'state'; icon = mdiLightbulbOn; type = 'step'; break;
        case 'irrigation': color = '#03a9f4'; title = 'Irrigation'; unit = 'state'; icon = mdiWater; type = 'step'; break;
        case 'drain': color = '#ff9800'; title = 'Drain'; unit = 'state'; icon = mdiWater; type = 'step'; break;
        case 'exhaust': color = '#795548'; title = 'Exhaust'; unit = ''; icon = mdiFan; history = this._exhaustHistory || []; break;
        case 'humidifier': color = '#607d8b'; title = 'Humidifier'; unit = ''; icon = mdiAirHumidifier; history = this._humidifierHistory || []; break;
        case 'dehumidifier': color = '#546e7a'; title = 'Dehumidifier'; unit = ''; icon = mdiAirHumidifierOff; history = this._dehumidifierHistory || []; break;
        case 'optimal': color = '#4caf50'; title = 'Optimal Conditions'; unit = 'state'; icon = mdiRadioboxMarked; type = 'step'; break;
      }

      graphs.push(html`
        <growspace-env-chart
            .hass=${this.hass}
            .device=${selectedDeviceData}
            .history=${history}
            .metricKey=${metric}
            .unit=${unit}
            .color=${color}
            .title=${title}
            .icon=${icon}
            .range=${range}
            .type=${type}
            @toggle-graph=${this._handleToggleEnvGraph}
        ></growspace-env-chart>
      `);
    });

    return html`
        <div class="graphs-container">
            ${this.renderTimeRangeSelector()}
            ${graphs}
        </div>
    `;
  }

  private renderEditModeBanner(): TemplateResult {
    if (!this._isEditMode) return html``;

    return html`
      <div class="edit-mode-banner">
        <div class="banner-content">
          <svg style="width:20px;height:20px;fill:currentColor;" viewBox="0 0 24 24">
            <path d="${mdiCheckboxMarked}"></path>
          </svg>
          <span>${this._selectedPlants.size} plant(s) selected</span>
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
        .isEditMode=${this._isEditMode}
        .selectedPlants=${this._selectedPlants}
        .compact=${this._isCompactView}
        @plant-click=${(e: CustomEvent) => this._handlePlantClick(e.detail.plant)}
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
        this._selectedPlants = e.detail.selectedPlants;
        this.requestUpdate();
      }}
      ></growspace-grid>
    `;
  }


  private _setGraphRange(range: '1h' | '6h' | '24h' | '7d') {
    if (!this.selectedDevice) return;
    this._graphRanges = {
      ...this._graphRanges,
      [this.selectedDevice]: range
    };
    this._fetchHistory(range);
    if (this._activeEnvGraphs.has('dehumidifier')) {
      this._fetchDehumidifierHistory(range);
    }
    if (this._activeEnvGraphs.has('exhaust')) {
      this._fetchExhaustHistory(range);
    }
    if (this._activeEnvGraphs.has('humidifier')) {
      this._fetchHumidifierHistory(range);
    }
  }

  private renderTimeRangeSelector(): TemplateResult {
    const currentRange = this.selectedDevice ? (this._graphRanges[this.selectedDevice] || '24h') : '24h';
    const ranges: ('1h' | '6h' | '24h' | '7d')[] = ['1h', '6h', '24h', '7d'];

    return html`
      <div class="time-range-selector">
        ${ranges.map(range => html`
          <button 
            class="range-btn ${currentRange === range ? 'active' : ''}"
            @click=${() => this._setGraphRange(range)}
          >
            ${range}
          </button>
        `)}
      </div>
    `;
  }

  private renderDialogs(growspaceOptions: Record<string, string>): TemplateResult {
    const strainLibrary = this.dataService?.getStrainLibrary() || [];
    const devices = this.dataService.getGrowspaceDevices();
    const selectedDeviceData = devices.find(d => d.device_id === this.selectedDevice);
    return html`
      ${DialogRenderer.renderAddPlantDialog(
      this._addPlantDialog,
      strainLibrary,
      selectedDeviceData?.name ?? '',
      {
        onClose: () => this._addPlantDialog = null,
        onConfirm: () => this._confirmAddPlant(),
        onStrainChange: (value) => {
          if (this._addPlantDialog) {
            // When using the dropdown, we now get the unique strain name (string)
            this._addPlantDialog.strain = value;

            // Attempt to pre-fill phenotype from library (first match)
            const entry = strainLibrary.find(s => s.strain === value);
            if (entry && entry.phenotype) {
              this._addPlantDialog.phenotype = entry.phenotype;
            } else {
              // No default phenotype or not found, keep current or clear?
              // Let's clear it if they switched strains, unless they are typing (but this is a select change)
              this._addPlantDialog.phenotype = '';
            }
            (this as any).requestUpdate();
          }
        },
        onPhenotypeChange: (value) => { if (this._addPlantDialog) this._addPlantDialog.phenotype = value; },
        onVegStartChange: (value) => { if (this._addPlantDialog) this._addPlantDialog.veg_start = value; },
        onFlowerStartChange: (value) => { if (this._addPlantDialog) this._addPlantDialog.flower_start = value; },
        onSeedlingStartChange: (value) => { if (this._addPlantDialog) this._addPlantDialog.seedling_start = value; },
        onMotherStartChange: (value) => { if (this._addPlantDialog) this._addPlantDialog.mother_start = value; },
        onCloneStartChange: (value) => { if (this._addPlantDialog) this._addPlantDialog.clone_start = value; },
        onDryStartChange: (value) => { if (this._addPlantDialog) this._addPlantDialog.dry_start = value; },
        onCureStartChange: (value) => { if (this._addPlantDialog) this._addPlantDialog.cure_start = value; },
        onRowChange: (value) => {
          if (this._addPlantDialog) {
            const val = parseInt(value);
            if (!isNaN(val) && val > 0) {
              this._addPlantDialog.row = val - 1;
              (this as any).requestUpdate();
            }
          }
        },
        onColChange: (value) => {
          if (this._addPlantDialog) {
            const val = parseInt(value);
            if (!isNaN(val) && val > 0) {
              this._addPlantDialog.col = val - 1;
              (this as any).requestUpdate();
            }
          }
        },
      }
    )}

    <plant-overview-dialog
      .dialog=${this._plantOverviewDialog}
      .growspaceOptions=${growspaceOptions}
      @close=${() => this._plantOverviewDialog = null}
      @update=${() => this._updatePlant()}
      @delete=${(e: CustomEvent) => this._handleDeletePlant(e.detail.plantId)}
      @harvest=${(e: CustomEvent) => this._harvestPlant(e.detail.plant)}
      @finish-drying=${(e: CustomEvent) => this._finishDryingPlant(e.detail.plant)}
      @take-clone=${(e: CustomEvent) => {
        this.clonePlant(e.detail.plant, e.detail.numClones);
        this._plantOverviewDialog = null;
      }}
      @move-clone=${(e: CustomEvent) => {
        const { plant, targetGrowspace } = e.detail;
        this.dataService.moveClone(plant.attributes.plant_id, targetGrowspace)
          .then(() => {
            console.log(`Clone ${plant.attributes.friendly_name} moved to ${targetGrowspace}`);
            this._plantOverviewDialog = null;
          }).catch((err) => {
            console.error('Error moving clone:', err);
          });
      }}
      @attribute-change=${(e: CustomEvent) => {
        if (this._plantOverviewDialog) {
          this._plantOverviewDialog.editedAttributes[e.detail.key] = e.detail.value;
        }
      }}
      @toggle-show-all-dates=${() => {
        if (this._plantOverviewDialog) {
          this._plantOverviewDialog.showAllDates = !this._plantOverviewDialog.showAllDates;
          this.requestUpdate();
        }
      }}
    ></plant-overview-dialog>

      <strain-library-dialog
        .open=${!!this._strainLibraryDialog?.open}
        .strains=${this._strainLibrary || []}
        @close=${() => this._strainLibraryDialog = null}
        @save-strain=${(e: CustomEvent) => this._addStrain(e.detail)}
        @delete-strain=${(e: CustomEvent) => this._removeStrain(e.detail.key)}
        @import-library=${(e: CustomEvent) => this._performImport(e.detail.file, e.detail.replace)}
        @export-library=${() => this._handleExportLibrary()}
        @get-recommendation=${() => this._openStrainRecommendationDialog()}
      ></strain-library-dialog>

      ${DialogRenderer.renderConfigDialog(
        this._configDialog,
        growspaceOptions,
        {
          onClose: () => this._configDialog = null,
          onSwitchTab: (tab) => { if (this._configDialog) { this._configDialog.currentTab = tab; this.requestUpdate(); } },
          onAddGrowspaceChange: (f, v) => { if (this._configDialog) { (this._configDialog.addGrowspaceData as any)[f] = v; this.requestUpdate(); } },
          onAddGrowspaceSubmit: () => this._handleAddGrowspaceSubmit(),
          onEnvChange: (f, v) => { if (this._configDialog) { (this._configDialog.environmentData as any)[f] = v; this.requestUpdate(); } },
          onEnvSubmit: () => this._handleEnvSubmit(),
        }
      )}

    ${this._growMasterDialog ? (() => {
        // Determine stress state for the dialog
        let isStressed = false;
        let personality = undefined;

        // Attempt to find stress sensor
        if (this.selectedDevice && this.hass) {
          // Pattern checking for stress sensor
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

        return DialogRenderer.renderGrowMasterDialog(
          this._growMasterDialog,
          isStressed,
          personality,
          {
            onClose: () => this._growMasterDialog = null,
            onQueryChange: (q) => { if (this._growMasterDialog) { this._growMasterDialog.userQuery = q; this.requestUpdate(); } },
            onAnalyze: () => this._handleAskAdvice(),
            onAnalyzeAll: () => this._handleAnalyzeAll()
          }
        );
      })() : ''}

      ${DialogRenderer.renderStrainRecommendationDialog(
        this._strainRecommendationDialog,
        {
          onClose: () => this._strainRecommendationDialog = null,
          onQueryChange: (q) => { if (this._strainRecommendationDialog) { this._strainRecommendationDialog.userQuery = q; this.requestUpdate(); } },
          onGetRecommendation: () => this._handleGetStrainRecommendation()
        }
      )}

      ${DialogRenderer.renderIrrigationDialog(
        this._irrigationDialog,
        {
          onClose: () => this._irrigationDialog = null,
          onIrrigationPumpChange: (value) => {
            if (this._irrigationDialog) {
              this._irrigationDialog.irrigation_pump_entity = value;
              this.requestUpdate();
            }
          },
          onIrrigationDurationChange: (value) => {
            if (this._irrigationDialog) {
              this._irrigationDialog.irrigation_duration = value;
              this.requestUpdate();
            }
          },
          onDrainPumpChange: (value) => {
            if (this._irrigationDialog) {
              this._irrigationDialog.drain_pump_entity = value;
              this.requestUpdate();
            }
          },
          onDrainDurationChange: (value) => {
            if (this._irrigationDialog) {
              this._irrigationDialog.drain_duration = value;
              this.requestUpdate();
            }
          },
          onSavePumpSettings: () => this._saveIrrigationPumpSettings(),
          onAddIrrigationTime: (e: Event) => {
            const container = (e.target as HTMLElement).closest('.dialog-body')?.querySelector('.irrigation-time-bar') as HTMLElement;
            if (container) {
              const rect = container.getBoundingClientRect();
              this._startAddingIrrigationTime(rect.width / 2, rect.width);
            }
          },
          onStartAddingIrrigationTime: (x, width) => this._startAddingIrrigationTime(x, width),
          onRemoveIrrigationTime: (time) => this._removeIrrigationTime(time),
          onAddDrainTime: (e: Event) => {
            const container = (e.target as HTMLElement).closest('.dialog-body')?.querySelector('.drain-time-bar') as HTMLElement;
            if (container) {
              const rect = container.getBoundingClientRect();
              this._startAddingDrainTime(rect.width / 2, rect.width);
            }
          },
          onStartAddingDrainTime: (x, width) => this._startAddingDrainTime(x, width),
          onRemoveDrainTime: (time) => this._removeDrainTime(time),
          onCancelAddingIrrigationTime: () => {
            if (this._irrigationDialog) {
              this._irrigationDialog.adding_irrigation_time = undefined;
              this.requestUpdate();
            }
          },
          onCancelAddingDrainTime: () => {
            if (this._irrigationDialog) {
              this._irrigationDialog.adding_drain_time = undefined;
              this.requestUpdate();
            }
          },
          onConfirmAddIrrigationTime: (time, duration) => {
            this._addIrrigationTime(time, duration);
          },
          onConfirmAddDrainTime: (time, duration) => {
            this._addDrainTime(time, duration);
          },
          onIrrigationTimeInputChange: (field, value) => {
            if (this._irrigationDialog?.adding_irrigation_time) {
              if (field === 'time') {
                this._irrigationDialog.adding_irrigation_time.time = value as string;
              } else {
                this._irrigationDialog.adding_irrigation_time.duration = value as number;
              }
              this.requestUpdate();
            }
          },
          onDrainTimeInputChange: (field, value) => {
            if (this._irrigationDialog?.adding_drain_time) {
              if (field === 'time') {
                this._irrigationDialog.adding_drain_time.time = value as string;
              } else {
                this._irrigationDialog.adding_drain_time.duration = value as number;
              }
              this.requestUpdate();
            }
          },
        }
      )}
    `;
  }
}
