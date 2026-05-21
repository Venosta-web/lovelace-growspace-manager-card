import { HomeAssistant } from 'custom-card-helpers';
import type { GrowspaceAPIResponse } from './types';

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

/**
 * DataService — single hass-propagation point for all domain API clients.
 *
 * Owns updateHass() so callers update one object instead of twelve.
 * All other methods delegate directly to the appropriate API client.
 */
export class DataService {
  public hass!: HomeAssistant;

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

  /** Propagate a new hass instance to all API clients atomically. */
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

  // ── Growspace ────────────────────────────────────────────────────────────

  fetchGrowspaceData = (growspaceId?: string) =>
    this._growspaceAPI.fetchGrowspaceData(growspaceId);

  getGrowspaceDevices = (wsDataMap?: Record<string, GrowspaceAPIResponse>) =>
    this._growspaceAPI.getGrowspaceDevices(wsDataMap);

  invalidateCache = (growspaceId?: string) =>
    this._growspaceAPI.invalidateCache(growspaceId);

  addGrowspace = (data: Parameters<GrowspaceAPI['addGrowspace']>[0]) =>
    this._growspaceAPI.addGrowspace(data);

  updateGrowspace = (data: Parameters<GrowspaceAPI['updateGrowspace']>[0]) =>
    this._growspaceAPI.updateGrowspace(data);

  removeGrowspace = (growspaceId: string) =>
    this._growspaceAPI.removeGrowspace(growspaceId);

  configureEnvironment = (data: Parameters<GrowspaceAPI['configureEnvironment']>[0]) =>
    this._growspaceAPI.configureEnvironment(data);

  setDehumidifierControl = (growspaceId: string, enabled: boolean) =>
    this._growspaceAPI.setDehumidifierControl(growspaceId, enabled);

  removeEnvironment = (growspaceId: string) =>
    this._growspaceAPI.removeEnvironment(growspaceId);

  resetWaterTracking = (growspaceId: string) =>
    this._growspaceAPI.resetWaterTracking(growspaceId);

  updateSensorCoordinates = (
    growspaceId: string,
    entityId: string,
    x: number,
    y: number,
    z: number,
    rotation?: number
  ) =>
    this._growspaceAPI.updateSensorCoordinates(growspaceId, entityId, x, y, z, rotation);

  // ── Strain ───────────────────────────────────────────────────────────────

  getStrainLibrary = () => this._strainAPI.getStrainLibrary();

  fetchStrainLibrary = () => this._strainAPI.fetchStrainLibrary();

  addStrain = (data: Parameters<StrainAPI['addStrain']>[0]) =>
    this._strainAPI.addStrain(data);

  updateStrainMeta = (data: Parameters<StrainAPI['updateStrainMeta']>[0]) =>
    this._strainAPI.updateStrainMeta(data);

  removeStrain = (strain: string, phenotype?: string) =>
    this._strainAPI.removeStrain(strain, phenotype);

  exportStrainLibrary = () => this._strainAPI.exportStrainLibrary();

  importStrainLibrary = (file: File, replace: boolean) =>
    this._strainAPI.importStrainLibrary(file, replace);

  clearStrainLibrary = () => this._strainAPI.clearStrainLibrary();

  updateBreeder = (oldName: string, newName: string, logo?: string) =>
    this._strainAPI.updateBreeder(oldName, newName, logo);

  deleteBreeder = (name: string) =>
    this._strainAPI.deleteBreeder(name);

  importStrainLineageTree = (strain_name: string, tree: Record<string, unknown>) =>
    this._geneticsAPI.importStrainLineageTree(strain_name, tree);

  // ── Nutrient ─────────────────────────────────────────────────────────────

  fetchNutrientPresets = () => this._nutrientAPI.fetchNutrientPresets();

  fetchNutrientInventory = () => this._nutrientAPI.fetchNutrientInventory();

  updateNutrientStock = (nutrientId: string, name: string, currentMl: number, initialMl: number) =>
    this._nutrientAPI.updateNutrientStock(nutrientId, name, currentMl, initialMl);

  removeNutrientStock = (nutrientId: string) =>
    this._nutrientAPI.removeNutrientStock(nutrientId);

  fetchIPMPresets = () => this._nutrientAPI.fetchIPMPresets();

  saveIPMPreset = (data: Parameters<NutrientAPI['saveIPMPreset']>[0]) =>
    this._nutrientAPI.saveIPMPreset(data);

  removeIPMPreset = (presetId: string) =>
    this._nutrientAPI.removeIPMPreset(presetId);

  saveNutrientPreset = (data: Parameters<NutrientAPI['saveNutrientPreset']>[0]) =>
    this._nutrientAPI.saveNutrientPreset(data);

  removeNutrientPreset = (presetId: string) =>
    this._nutrientAPI.removeNutrientPreset(presetId);

  applyIPM = (data: Parameters<NutrientAPI['applyIPM']>[0]) =>
    this._nutrientAPI.applyIPM(data);

  fetchECRampCurves = () => this._nutrientAPI.fetchECRampCurves();

  saveECRampCurve = (data: Parameters<NutrientAPI['saveECRampCurve']>[0]) =>
    this._nutrientAPI.saveECRampCurve(data);

  removeECRampCurve = (curveId: string) =>
    this._nutrientAPI.removeECRampCurve(curveId);

  // ── History ──────────────────────────────────────────────────────────────

  getHistory = (...args: Parameters<HistoryAPI['getHistory']>) =>
    this._historyAPI.getHistory(...args);

  getBatchHistory = (...args: Parameters<HistoryAPI['getBatchHistory']>) =>
    this._historyAPI.getBatchHistory(...args);

  getHistoryStats = (...args: Parameters<HistoryAPI['getHistoryStats']>) =>
    this._historyAPI.getHistoryStats(...args);

  // ── Plant ────────────────────────────────────────────────────────────────

  addPlant = (params: Parameters<PlantAPI['addPlant']>[0]) =>
    this._plantAPI.addPlant(params);

  addPlants = (params: Parameters<PlantAPI['addPlants']>[0]) =>
    this._plantAPI.addPlants(params);

  updatePlant = (params: Parameters<PlantAPI['updatePlant']>[0]) =>
    this._plantAPI.updatePlant(params);

  removePlant = (plantId: string) =>
    this._plantAPI.removePlant(plantId);

  harvestPlant = (...args: Parameters<PlantAPI['harvestPlant']>) =>
    this._plantAPI.harvestPlant(...args);

  takeClone = (params: Parameters<PlantAPI['takeClone']>[0]) =>
    this._plantAPI.takeClone(params);

  moveClone = (plantId: string, targetGrowspaceId: string, transitionDate?: string) =>
    this._plantAPI.moveClone(plantId, targetGrowspaceId, transitionDate);

  movePlant = (plantId: string, targetGrowspaceId: string, transitionDate?: string) =>
    this._plantAPI.movePlant(plantId, targetGrowspaceId, transitionDate);

  swapPlants = (plant1Id: string, plant2Id: string) =>
    this._plantAPI.swapPlants(plant1Id, plant2Id);

  waterPlant = (plantId: string, amount: number, nutrients?: Record<string, number>, presetId?: string) =>
    this._plantAPI.waterPlant(plantId, amount, nutrients, presetId);

  printLabel = (params: Parameters<PlantAPI['printLabel']>[0]) =>
    this._plantAPI.printLabel(params);

  scorePlant = (params: Parameters<PlantAPI['scorePlant']>[0]) =>
    this._plantAPI.scorePlant(params);

  updateHarvestMetrics = (params: Parameters<PlantAPI['updateHarvestMetrics']>[0]) =>
    this._plantAPI.updateHarvestMetrics(params);

  logDryingWeight = (params: Parameters<PlantAPI['logDryingWeight']>[0]) =>
    this._plantAPI.logDryingWeight(params);

  logMoistureReading = (params: Parameters<PlantAPI['logMoistureReading']>[0]) =>
    this._plantAPI.logMoistureReading(params);

  setVisualTag = (params: Parameters<PlantAPI['setVisualTag']>[0]) =>
    this._plantAPI.setVisualTag(params);

  // ── Irrigation ───────────────────────────────────────────────────────────

  setIrrigationSettings = (params: Parameters<IrrigationAPI['setIrrigationSettings']>[0]) =>
    this._irrigationAPI.setIrrigationSettings(params);

  addIrrigationTime = (params: Parameters<IrrigationAPI['addIrrigationTime']>[0]) =>
    this._irrigationAPI.addIrrigationTime(params);

  removeIrrigationTime = (params: Parameters<IrrigationAPI['removeIrrigationTime']>[0]) =>
    this._irrigationAPI.removeIrrigationTime(params);

  addDrainTime = (params: Parameters<IrrigationAPI['addDrainTime']>[0]) =>
    this._irrigationAPI.addDrainTime(params);

  removeDrainTime = (params: Parameters<IrrigationAPI['removeDrainTime']>[0]) =>
    this._irrigationAPI.removeDrainTime(params);

  setIrrigationStrategy = (...args: Parameters<IrrigationAPI['setIrrigationStrategy']>) =>
    this._irrigationAPI.setIrrigationStrategy(...args);

  configureDrainMonitoring = (...args: Parameters<IrrigationAPI['configureDrainMonitoring']>) =>
    this._irrigationAPI.configureDrainMonitoring(...args);

  logDrainReading = (...args: Parameters<IrrigationAPI['logDrainReading']>) =>
    this._irrigationAPI.logDrainReading(...args);

  waterGrowspace = (growspaceId: string, amount: number, nutrients?: Record<string, number>, presetId?: string) =>
    this._irrigationAPI.waterGrowspace(growspaceId, amount, nutrients, presetId);

  // ── AI ───────────────────────────────────────────────────────────────────

  askGrowAdvice = (growspaceId: string, userQuery: string) =>
    this._aiAPI.askGrowAdvice(growspaceId, userQuery);

  analyzeAllGrowspaces = () => this._aiAPI.analyzeAllGrowspaces();

  getStrainRecommendation = (userQuery: string) =>
    this._aiAPI.getStrainRecommendation(userQuery);

  // ── Camera ───────────────────────────────────────────────────────────────

  captureSnapshot = (growspaceId: string) =>
    this._cameraAPI.captureSnapshot(growspaceId);

  getSnapshots = (growspaceId: string, limit?: number, offset?: number) =>
    this._cameraAPI.getSnapshots(growspaceId, limit, offset);

  // ── Vision ───────────────────────────────────────────────────────────────

  getVisionHistory = (growspaceId: string, limit?: number) =>
    this._visionAPI.getVisionHistory(growspaceId, limit);

  triggerVisionCheckup = (growspaceId: string) =>
    this._visionAPI.triggerVisionCheckup(growspaceId);

  updateVisionCheckupConfig = (...args: Parameters<VisionAPI['updateVisionCheckupConfig']>) =>
    this._visionAPI.updateVisionCheckupConfig(...args);

  // ── Report ───────────────────────────────────────────────────────────────

  exportGrowReport = (growspaceId: string, format?: string) =>
    this._reportAPI.exportGrowReport(growspaceId, format);

  fetchGrowReport = (growspaceId: string) =>
    this._reportAPI.fetchGrowReport(growspaceId);

  // ── Genetics ─────────────────────────────────────────────────────────────

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

  updateStrainLineageTree = (...args: Parameters<GeneticsAPI['updateStrainLineageTree']>) =>
    this._geneticsAPI.updateStrainLineageTree(...args);

  // ── Subarea ──────────────────────────────────────────────────────────────

  getSubareas = (...args: Parameters<SubareaAPI['getSubareas']>) =>
    this._subareaAPI.getSubareas(...args);

  addSubarea = (...args: Parameters<SubareaAPI['addSubarea']>) =>
    this._subareaAPI.addSubarea(...args);

  updateSubarea = (...args: Parameters<SubareaAPI['updateSubarea']>) =>
    this._subareaAPI.updateSubarea(...args);

  removeSubarea = (...args: Parameters<SubareaAPI['removeSubarea']>) =>
    this._subareaAPI.removeSubarea(...args);

  // ── Generic ──────────────────────────────────────────────────────────────

  async callService(domain: string, service: string, serviceData: Record<string, unknown>): Promise<void> {
    if (!this.hass) {
      console.error('[DataService:callService] Hass instance is missing');
      return;
    }
    await this.hass.callService(domain, service, serviceData);
  }
}
