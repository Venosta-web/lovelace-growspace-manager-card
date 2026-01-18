import { HomeAssistant } from 'custom-card-helpers';
import {
  GrowspaceDevice,
  StrainEntry,
  CropMeta,
  IrrigationStrategy,
  GrowspaceAPIResponse,
  HistorySensorState,
  GrowAdviceResponse,
} from './types';
import {
  GrowspaceAPICollection,
  NutrientPresetsResponse,
  IPMPresetsResponse,
  NutrientInventoryResponse,
} from './schemas/api-schema';

// Import all API services
import { GrowspaceAPI } from './services/api/growspace-api';
import { StrainAPI } from './services/api/strain-api';
import { NutrientAPI } from './services/api/nutrient-api';
import { HistoryAPI } from './services/api/history-api';
import { PlantAPI } from './services/api/plant-api';
import { IrrigationAPI } from './services/api/irrigation-api';
import { AIAPI } from './services/api/ai-api';

/**
 * DataService - Thin facade coordinating domain-specific API services.
 * 
 * This service delegates all operations to focused domain services:
 * - GrowspaceAPI: Growspace data, CRUD, caching
 * - StrainAPI: Strain library management
 * - NutrientAPI: Nutrient presets, inventory, IPM
 * - HistoryAPI: Historical sensor data
 * - PlantAPI: Plant CRUD and lifecycle
 * - IrrigationAPI: Irrigation control
 * - AIAPI: AI assistant operations
 */
export class DataService {
  public hass!: HomeAssistant;

  // Domain-specific API services
  private _growspaceAPI: GrowspaceAPI;
  private _strainAPI: StrainAPI;
  private _nutrientAPI: NutrientAPI;
  private _historyAPI: HistoryAPI;
  private _plantAPI: PlantAPI;
  private _irrigationAPI: IrrigationAPI;
  private _aiAPI: AIAPI;

  constructor(hass?: HomeAssistant) {
    // Initialize all API services
    this._growspaceAPI = new GrowspaceAPI(hass);
    this._strainAPI = new StrainAPI(hass);
    this._nutrientAPI = new NutrientAPI(hass);
    this._historyAPI = new HistoryAPI(hass);
    this._plantAPI = new PlantAPI(hass);
    this._irrigationAPI = new IrrigationAPI(hass);
    this._aiAPI = new AIAPI(hass);

    if (hass) {
      this.hass = hass;
    }
  }

  /**
   * Update Home Assistant instance across all services.
   */
  updateHass(hass: HomeAssistant): void {
    this.hass = hass;
    [
      this._growspaceAPI,
      this._strainAPI,
      this._nutrientAPI,
      this._historyAPI,
      this._plantAPI,
      this._irrigationAPI,
      this._aiAPI,
    ].forEach((api) => api.updateHass(hass));
  }

  // ========================================
  // Growspace API Delegations
  // ========================================

  fetchGrowspaceData = (growspaceId?: string) =>
    this._growspaceAPI.fetchGrowspaceData(growspaceId);

  getGrowspaceDevices = (wsDataMap?: Record<string, GrowspaceAPIResponse>) =>
    this._growspaceAPI.getGrowspaceDevices(wsDataMap);

  invalidateCache = (growspaceId?: string) => this._growspaceAPI.invalidateCache(growspaceId);

  addGrowspace = (data: {
    name: string;
    rows: number;
    plants_per_row: number;
    notification_service?: string;
  }) => this._growspaceAPI.addGrowspace(data);

  updateGrowspace = (data: {
    growspace_id: string;
    name?: string;
    rows?: number;
    plants_per_row?: number;
    notification_service?: string;
  }) => this._growspaceAPI.updateGrowspace(data);

  removeGrowspace = (growspaceId: string) => this._growspaceAPI.removeGrowspace(growspaceId);

  configureEnvironment = (data: {
    growspace_id: string;
    temperature_sensor: string;
    humidity_sensor: string;
    vpd_sensor?: string;
    co2_sensor?: string;
    circulation_fan_entity?: string;
    circulation_fan_entities?: string[];
    stress_threshold?: number;
    mold_threshold?: number;
    light_sensor?: string;
    light_sensors?: string[];
    exhaust_entity?: string;
    exhaust_fan_entities?: string[];
    humidifier_entity?: string;
    humidifier_entities?: string[];
    dehumidifier_entity?: string;
    dehumidifier_entities?: string[];
    dehumidifier_thresholds?: Record<string, Record<string, { on: number; off: number }>>;
    soil_moisture_sensor?: string;
    control_dehumidifier?: boolean;
    veg_day_hours?: number;
    flower_early_day_hours?: number;
    flower_mid_day_hours?: number;
    flower_late_day_hours?: number;
    minimum_source_air_temperature?: number;
  }) => this._growspaceAPI.configureEnvironment(data);

  setDehumidifierControl = (growspaceId: string, enabled: boolean) =>
    this._growspaceAPI.setDehumidifierControl(growspaceId, enabled);

  // ========================================
  // Strain API Delegations
  // ========================================

  getStrainLibrary = () => this._strainAPI.getStrainLibrary();

  fetchStrainLibrary = () => this._strainAPI.fetchStrainLibrary();

  addStrain = (data: {
    strain: string;
    phenotype?: string;
    breeder?: string;
    type?: string;
    flowering_days_min?: number;
    flowering_days_max?: number;
    lineage?: string;
    sex?: string;
    description?: string;
    image?: string;
    image_crop_meta?: CropMeta;
    sativa_percentage?: number;
    indica_percentage?: number;
  }) => this._strainAPI.addStrain(data);

  removeStrain = (strain: string, phenotype?: string) =>
    this._strainAPI.removeStrain(strain, phenotype);

  exportStrainLibrary = () => this._strainAPI.exportStrainLibrary();

  importStrainLibrary = (file: File, replace: boolean) =>
    this._strainAPI.importStrainLibrary(file, replace);

  clearStrainLibrary = () => this._strainAPI.clearStrainLibrary();

  // ========================================
  // Nutrient API Delegations
  // ========================================

  fetchNutrientPresets = () => this._nutrientAPI.fetchNutrientPresets();

  fetchNutrientInventory = () => this._nutrientAPI.fetchNutrientInventory();

  updateNutrientStock = (
    nutrientId: string,
    name: string,
    currentMl: number,
    initialMl: number
  ) => this._nutrientAPI.updateNutrientStock(nutrientId, name, currentMl, initialMl);

  removeNutrientStock = (nutrientId: string) => this._nutrientAPI.removeNutrientStock(nutrientId);

  fetchIPMPresets = () => this._nutrientAPI.fetchIPMPresets();

  saveIPMPreset = (data: {
    preset_id?: string;
    name: string;
    type: string;
    items: { name: string; dose_amount: number; dose_unit: string }[];
    stage?: string;
    min_days_in_stage?: number;
  }) => this._nutrientAPI.saveIPMPreset(data);

  removeIPMPreset = (presetId: string) => this._nutrientAPI.removeIPMPreset(presetId);

  saveNutrientPreset = (data: {
    preset_id?: string;
    name: string;
    nutrients: { name: string; dose_ml_l: number }[];
    stage?: string;
    min_days_in_stage?: number;
  }) => this._nutrientAPI.saveNutrientPreset(data);

  removeNutrientPreset = (presetId: string) => this._nutrientAPI.removeNutrientPreset(presetId);

  applyIPM = (data: {
    preset_id: string;
    growspace_id?: string;
    plant_ids?: string[];
    notes?: string;
  }) => this._nutrientAPI.applyIPM(data);

  // ========================================
  // History API Delegations
  // ========================================

  getHistory = (entityId: string, startTime: Date, endTime?: Date) =>
    this._historyAPI.getHistory(entityId, startTime, endTime);

  getBatchHistory = (entityIds: string[], startTime: Date, endTime?: Date) =>
    this._historyAPI.getBatchHistory(entityIds, startTime, endTime);

  getHistoryStats = (
    entityIds: string[],
    startTime: Date,
    endTime?: Date,
    intervalMinutes?: number,
    significantChangesOnly?: boolean
  ) =>
    this._historyAPI.getHistoryStats(
      entityIds,
      startTime,
      endTime,
      intervalMinutes,
      significantChangesOnly
    );

  // ========================================
  // Plant API Delegations
  // ========================================

  addPlant = (params: {
    growspace_id: string;
    row: number;
    col: number;
    strain: string;
    phenotype?: string;
    veg_start?: string;
    flower_start?: string;
    mother_start?: string;
    clone_start?: string;
    seedling_start?: string;
    dry_start?: string;
    cure_start?: string;
  }) => this._plantAPI.addPlant(params);

  addPlants = (params: {
    growspace_id: string;
    strain: string;
    amount: number;
    start_number?: number;
    veg_start?: string;
    flower_start?: string;
    mother_start?: string;
    clone_start?: string;
    seedling_start?: string;
    dry_start?: string;
    cure_start?: string;
  }) => this._plantAPI.addPlants(params);

  updatePlant = (params: { plant_id: string;[key: string]: unknown }) =>
    this._plantAPI.updatePlant(params);

  removePlant = (plantId: string) => this._plantAPI.removePlant(plantId);

  harvestPlant = (plantId: string, target?: string) =>
    this._plantAPI.harvestPlant(plantId, target);

  takeClone = (params: {
    mother_plant_id: string;
    num_clones?: number;
    target_growspace_id?: string;
  }) => this._plantAPI.takeClone(params);

  moveClone = (plantId: string, targetGrowspaceId: string, transitionDate?: string) =>
    this._plantAPI.moveClone(plantId, targetGrowspaceId, transitionDate);

  swapPlants = (plant1Id: string, plant2Id: string) =>
    this._plantAPI.swapPlants(plant1Id, plant2Id);

  waterPlant = (
    plantId: string,
    amount: number,
    nutrients?: Record<string, number>,
    presetId?: string
  ) => this._plantAPI.waterPlant(plantId, amount, nutrients, presetId);

  // ========================================
  // Irrigation API Delegations
  // ========================================

  setIrrigationSettings = (params: {
    growspace_id: string;
    irrigation_pump_entity: string;
    drain_pump_entity: string;
    irrigation_duration: number;
    drain_duration: number;
  }) => this._irrigationAPI.setIrrigationSettings(params);

  addIrrigationTime = (params: { growspace_id: string; time: string; duration?: number }) =>
    this._irrigationAPI.addIrrigationTime(params);

  removeIrrigationTime = (params: { growspace_id: string; time: string }) =>
    this._irrigationAPI.removeIrrigationTime(params);

  addDrainTime = (params: { growspace_id: string; time: string; duration?: number }) =>
    this._irrigationAPI.addDrainTime(params);

  removeDrainTime = (params: { growspace_id: string; time: string }) =>
    this._irrigationAPI.removeDrainTime(params);

  setIrrigationStrategy = (growspaceId: string, strategy: Partial<IrrigationStrategy>) =>
    this._irrigationAPI.setIrrigationStrategy(growspaceId, strategy);

  waterGrowspace = (
    growspaceId: string,
    amount: number,
    nutrients?: Record<string, number>,
    presetId?: string
  ) => this._irrigationAPI.waterGrowspace(growspaceId, amount, nutrients, presetId);

  // ========================================
  // AI API Delegations
  // ========================================

  askGrowAdvice = (growspaceId: string, userQuery: string) =>
    this._aiAPI.askGrowAdvice(growspaceId, userQuery);

  analyzeAllGrowspaces = () => this._aiAPI.analyzeAllGrowspaces();

  getStrainRecommendation = (userQuery: string) => this._aiAPI.getStrainRecommendation(userQuery);

  // ========================================
  // Legacy/Generic Service Call Support
  // ========================================

  /**
   * Generic service call wrapper for dynamic/batch operations.
   * Delegates to BaseAPI's callService method.
   */
  async callService(
    domain: string,
    service: string,
    serviceData: Record<string, unknown>
  ): Promise<void> {
    if (!this.hass) {
      console.error('[DataService:callService] Hass instance is missing');
      return;
    }
    console.log(`[DataService:callService] ${domain}.${service}`, serviceData);
    await this.hass.callService(domain, service, serviceData);
  }
}
