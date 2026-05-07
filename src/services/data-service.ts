import { HomeAssistant } from 'custom-card-helpers';
import type { IrrigationStrategy, GrowspaceAPIResponse } from './types';
import type { CropMeta } from '../features/plants/types';
import type { SensorGroup } from '../features/environment/types';

// Import all API services
import { GrowspaceAPI } from './api/growspace-api';
import { StrainAPI } from './api/strain-api';
import { NutrientAPI } from './api/nutrient-api';
import { HistoryAPI } from './api/history-api';
import { PlantAPI } from './api/plant-api';
import { IrrigationAPI } from './api/irrigation-api';
import { AIAPI } from './api/ai-api';
import { CameraAPI } from './api/camera-api';
import { VisionAPI } from './api/vision-api';
import { ReportAPI } from './api/report-api';
import { GeneticsAPI } from './api/genetics-api';
import { SubareaAPI } from './api/subarea-api';
import type { VisionCheckupConfig } from '../lib/types/dialog';
import type { Subarea, EnvironmentConfig } from './types';

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
  private _cameraAPI: CameraAPI;
  private _visionAPI: VisionAPI;
  private _reportAPI: ReportAPI;
  private _geneticsAPI: GeneticsAPI;
  private _subareaAPI: SubareaAPI;

  constructor(hass?: HomeAssistant) {
    // Initialize all API services
    this._growspaceAPI = new GrowspaceAPI(hass);
    this._strainAPI = new StrainAPI(hass);
    this._nutrientAPI = new NutrientAPI(hass);
    this._historyAPI = new HistoryAPI(hass);
    this._plantAPI = new PlantAPI(hass);
    this._irrigationAPI = new IrrigationAPI(hass);
    this._aiAPI = new AIAPI(hass);
    this._cameraAPI = new CameraAPI(hass);
    this._visionAPI = new VisionAPI(hass);
    this._reportAPI = new ReportAPI(hass);
    this._geneticsAPI = new GeneticsAPI(hass);
    this._subareaAPI = new SubareaAPI(hass);

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
      this._cameraAPI,
      this._visionAPI,
      this._reportAPI,
      this._geneticsAPI,
      this._subareaAPI,
    ].forEach((api) => api.updateHass(hass));
  }

  /**
   * Expose StrainAPI for direct access to breeder operations.
   */
  get strainAPI(): StrainAPI {
    return this._strainAPI;
  }

  /**
   * Expose GeneticsAPI for direct access to genetics operations.
   */
  get geneticsAPI(): GeneticsAPI {
    return this._geneticsAPI;
  }

  // ========================================
  // Growspace API Delegations
  // ========================================

  fetchGrowspaceData = (growspaceId?: string) => this._growspaceAPI.fetchGrowspaceData(growspaceId);

  getGrowspaceDevices = (wsDataMap?: Record<string, GrowspaceAPIResponse>) =>
    this._growspaceAPI.getGrowspaceDevices(wsDataMap);

  invalidateCache = (growspaceId?: string) => this._growspaceAPI.invalidateCache(growspaceId);

  addGrowspace = (data: {
    name: string;
    rows: number;
    plantsPerRow: number;
    notificationService?: string;
  }) => this._growspaceAPI.addGrowspace(data);

  updateGrowspace = (data: {
    growspaceId: string;
    name?: string;
    rows?: number;
    plantsPerRow?: number;
    notificationService?: string;
  }) => this._growspaceAPI.updateGrowspace(data);

  removeGrowspace = (growspaceId: string) => this._growspaceAPI.removeGrowspace(growspaceId);

  configureEnvironment = (data: {
    growspaceId: string;
    temperatureSensors?: string[];
    humiditySensors?: string[];
    vpdSensors?: string[];
    co2Sensor?: string;
    circulationFanEntity?: string;
    circulationFanEntities?: string[];
    stressThreshold?: number;
    moldThreshold?: number;
    lightSensor?: string;
    lightSensors?: string[];
    exhaustEntity?: string;
    exhaustFanEntities?: string[];
    humidifierEntity?: string;
    humidifierEntities?: string[];
    humidifierThresholds?: Record<string, Record<string, { on: number; off: number }>>;
    controlHumidifier?: boolean;
    dehumidifierEntity?: string;
    dehumidifierEntities?: string[];
    dehumidifierThresholds?: Record<string, Record<string, { on: number; off: number }>>;
    soilMoistureSensor?: string;
    controlDehumidifier?: boolean;
    vegDayHours?: number;
    flowerEarlyDayHours?: number;
    flowerMidDayHours?: number;
    flowerLateDayHours?: number;
    minimumSourceAirTemperature?: number;
    sensorGroups?: SensorGroup[];
    sensorCoordinates?: Record<string, { x: number; y: number; z: number; rotation?: number }>;
    irrigationTanks?: any[];
    cameraEntities?: string[];
    substrateTemperatureSensors?: string[];
    phSensors?: string[];
    feedEcSensors?: string[];
    substrateEcSensors?: string[];
    runoffEcSensors?: string[];
    drainVolumeSensors?: string[];
    irrigationFlowSensors?: string[];
    powerSensors?: string[];
    energySensors?: string[];
  }) => this._growspaceAPI.configureEnvironment(data);

  setDehumidifierControl = (growspaceId: string, enabled: boolean) =>
    this._growspaceAPI.setDehumidifierControl(growspaceId, enabled);

  removeEnvironment = (growspaceId: string) => this._growspaceAPI.removeEnvironment(growspaceId);

  resetWaterTracking = (growspaceId: string) => this._growspaceAPI.resetWaterTracking(growspaceId);

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
    breeder_logo?: string;
  }) => this._strainAPI.addStrain(data);

  removeStrain = (strain: string, phenotype?: string) =>
    this._strainAPI.removeStrain(strain, phenotype);

  exportStrainLibrary = () => this._strainAPI.exportStrainLibrary();

  importStrainLibrary = (file: File, replace: boolean) =>
    this._strainAPI.importStrainLibrary(file, replace);

  clearStrainLibrary = () => this._strainAPI.clearStrainLibrary();

  updateStrainMeta = (data: {
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
    breeder_logo?: string;
  }) => this._strainAPI.updateStrainMeta(data);

  // ========================================
  // Nutrient API Delegations
  // ========================================

  fetchNutrientPresets = () => this._nutrientAPI.fetchNutrientPresets();

  fetchNutrientInventory = () => this._nutrientAPI.fetchNutrientInventory();

  updateNutrientStock = (nutrientId: string, name: string, currentMl: number, initialMl: number) =>
    this._nutrientAPI.updateNutrientStock(nutrientId, name, currentMl, initialMl);

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

  fetchECRampCurves = () => this._nutrientAPI.fetchECRampCurves();

  saveECRampCurve = (data: {
    curve_id?: string;
    name: string;
    stage?: string;
    points: { day: number; target_ec: number }[];
  }) => this._nutrientAPI.saveECRampCurve(data);

  removeECRampCurve = (curveId: string) => this._nutrientAPI.removeECRampCurve(curveId);

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
    seed_batch_id?: string;
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

  harvestPlant = (
    plantId: string,
    target?: string,
    metrics?: {
      wet_weight?: number;
      dry_weight?: number;
      trim_weight?: number;
      thc_percentage?: number;
      cbd_percentage?: number;
      terpene_profile?: string;
    }
  ) => this._plantAPI.harvestPlant(plantId, target, metrics);

  takeClone = (params: {
    mother_plant_id: string;
    num_clones?: number;
    target_growspace_id?: string;
  }) => this._plantAPI.takeClone(params);

  moveClone = (plantId: string, targetGrowspaceId: string, transitionDate?: string) =>
    this._plantAPI.moveClone(plantId, targetGrowspaceId, transitionDate);

  movePlant = (plantId: string, targetGrowspaceId: string, transitionDate?: string) =>
    this._plantAPI.movePlant(plantId, targetGrowspaceId, transitionDate);

  swapPlants = (plant1Id: string, plant2Id: string) =>
    this._plantAPI.swapPlants(plant1Id, plant2Id);

  waterPlant = (
    plantId: string,
    amount: number,
    nutrients?: Record<string, number>,
    presetId?: string
  ) => this._plantAPI.waterPlant(plantId, amount, nutrients, presetId);

  printLabel = (params: {
    plant_id?: string;
    strain?: string;
    phenotype?: string;
    breeder?: string;
    lineage?: string;
    breeder_logo?: string;
    device_id?: string;
    preview?: boolean;
    base_url?: string;
  }): Promise<any> => this._plantAPI.printLabel(params);

  scorePlant = (params: {
    plant_id: string;
    vigor?: number | null;
    structure?: number | null;
    aroma?: number | null;
    resin?: number | null;
    pest_resistance?: number | null;
  }) => this._plantAPI.scorePlant(params);

  updateHarvestMetrics = (params: {
    plant_id: string;
    wet_weight?: number | null;
    dry_weight?: number | null;
    trim_weight?: number | null;
    thc_percentage?: number | null;
    cbd_percentage?: number | null;
    terpene_profile?: string | null;
  }) => this._plantAPI.updateHarvestMetrics(params);

  // ========================================
  // Irrigation API Delegations
  // ========================================

  setIrrigationSettings = (params: {
    growspaceId: string;
    irrigationPumpEntity: string;
    drainPumpEntity: string;
    irrigationDuration: number;
    drainDuration: number;
  }) => this._irrigationAPI.setIrrigationSettings(params);

  addIrrigationTime = (params: { growspaceId: string; time: string; duration?: number }) =>
    this._irrigationAPI.addIrrigationTime(params);

  removeIrrigationTime = (params: { growspaceId: string; time: string }) =>
    this._irrigationAPI.removeIrrigationTime(params);

  addDrainTime = (params: { growspaceId: string; time: string; duration?: number }) =>
    this._irrigationAPI.addDrainTime(params);

  removeDrainTime = (params: { growspaceId: string; time: string }) =>
    this._irrigationAPI.removeDrainTime(params);

  setIrrigationStrategy = (growspaceId: string, strategy: Partial<IrrigationStrategy>) =>
    this._irrigationAPI.setIrrigationStrategy(growspaceId, strategy);

  configureDrainMonitoring = (
    growspaceId: string,
    params: { enabled?: boolean; maxEcDelta?: number; targetRunoffPercent?: number }
  ) => this._irrigationAPI.configureDrainMonitoring(growspaceId, params);

  logDrainReading = (
    growspaceId: string,
    params: { feedEc: number; drainEc: number; feedVolumeMl?: number; drainVolumeMl?: number }
  ) => this._irrigationAPI.logDrainReading(growspaceId, params);

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
  // Camera API Delegations
  // ========================================

  captureSnapshot = (growspaceId: string) => this._cameraAPI.captureSnapshot(growspaceId);

  getSnapshots = (growspaceId: string, limit?: number, offset?: number) => this._cameraAPI.getSnapshots(growspaceId, limit, offset);

  // ========================================
  // Vision API Delegations
  // ========================================

  getVisionHistory = (growspaceId: string, limit?: number) =>
    this._visionAPI.getVisionHistory(growspaceId, limit);

  triggerVisionCheckup = (growspaceId: string) =>
    this._visionAPI.triggerVisionCheckup(growspaceId);

  updateVisionCheckupConfig = (growspaceId: string, config: VisionCheckupConfig) =>
    this._visionAPI.updateVisionCheckupConfig(growspaceId, config);

  // ========================================
  // Report API Delegations
  // ========================================

  exportGrowReport = (growspaceId: string, format?: string) => this._reportAPI.exportGrowReport(growspaceId, format);

  fetchGrowReport = (growspaceId: string) => this._reportAPI.fetchGrowReport(growspaceId);

  // ========================================
  // Genetics API Delegations
  // ========================================

  fetchGeneticsData = () => this._geneticsAPI.fetchGeneticsData();

  addSeedBatch = (data: Parameters<GeneticsAPI['addSeedBatch']>[0]) =>
    this._geneticsAPI.addSeedBatch(data);

  updateSeedBatch = (data: Parameters<GeneticsAPI['updateSeedBatch']>[0]) =>
    this._geneticsAPI.updateSeedBatch(data);

  logPollination = (data: Parameters<GeneticsAPI['logPollination']>[0]) =>
    this._geneticsAPI.logPollination(data);

  updatePollination = (data: Parameters<GeneticsAPI['updatePollination']>[0]) =>
    this._geneticsAPI.updatePollination(data);

  deletePollination = (event_id: string) =>
    this._geneticsAPI.deletePollination(event_id);

  harvestSeeds = (data: Parameters<GeneticsAPI['harvestSeeds']>[0]) =>
    this._geneticsAPI.harvestSeeds(data);

  deleteSeedBatch = (batch_id: string) =>
    this._geneticsAPI.deleteSeedBatch(batch_id);

  setPlantSex = (plant_id: string, sex: string) =>
    this._geneticsAPI.setPlantSex(plant_id, sex);

  sowSeed = (batch_id: string, plant_id: string) =>
    this._geneticsAPI.sowSeed(batch_id, plant_id);

  getLineageTree = (plant_id: string) =>
    this._geneticsAPI.getLineageTree(plant_id);

  getStrainLineageTree = (strain_name: string) =>
    this._geneticsAPI.getStrainLineageTree(strain_name);

  updateStrainLineageTree = (
    strain_name: string,
    parents: Array<{ name: string; source: 'library' | 'manual' }>
  ) => this._geneticsAPI.updateStrainLineageTree(strain_name, parents);

  // ========================================
  // Subarea API Delegations
  // ========================================

  getSubareas = (growspaceId: string): Promise<Subarea[]> =>
    this._subareaAPI.getSubareas(growspaceId);

  addSubarea = (growspaceId: string, name: string): Promise<Subarea> =>
    this._subareaAPI.addSubarea(growspaceId, name);

  updateSubarea = (
    growspaceId: string,
    subareaId: string,
    environmentConfig: Partial<EnvironmentConfig>
  ): Promise<Subarea> =>
    this._subareaAPI.updateSubarea(growspaceId, subareaId, environmentConfig);

  removeSubarea = (growspaceId: string, subareaId: string): Promise<void> =>
    this._subareaAPI.removeSubarea(growspaceId, subareaId);

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
