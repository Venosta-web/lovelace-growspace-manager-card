import { HomeAssistant } from 'custom-card-helpers';
import type { GrowspaceAPIResponse } from './types';

import { GrowspaceAPI } from './api/growspace-api';
import {
  configureEnvironment as growspaceSliceConfigureEnvironment,
  setDehumidifierControl as growspaceSliceSetDehumidifierControl,
  removeEnvironment as growspaceSliceRemoveEnvironment,
  resetWaterTracking as growspaceSliceResetWaterTracking,
  updateSensorCoordinates as growspaceSliceUpdateSensorCoordinates,
} from '../slices/growspace';
import { setHass } from './hass-call';
import { HistoryAPI } from './api/history-api';
import { IrrigationAPI } from './api/irrigation-api';
import { AIAPI } from './api/ai-api';
import {
  captureSnapshot as cameraSliceCaptureSnapshot,
  getSnapshots as cameraSliceGetSnapshots,
} from '../slices/camera';
import {
  fetchNutrientPresets as nutrientSliceFetchPresets,
  fetchNutrientInventory as nutrientSliceFetchInventory,
  updateNutrientStock as nutrientSliceUpdateStock,
  removeNutrientStock as nutrientSliceRemoveStock,
  fetchIPMPresets as nutrientSliceFetchIPMPresets,
  saveIPMPreset as nutrientSliceSaveIPMPreset,
  removeIPMPreset as nutrientSliceRemoveIPMPreset,
  saveNutrientPreset as nutrientSliceSavePreset,
  removeNutrientPreset as nutrientSliceRemovePreset,
  applyIPM as nutrientSliceApplyIPM,
  fetchECRampCurves as nutrientSliceFetchECRampCurves,
  saveECRampCurve as nutrientSliceSaveECRampCurve,
  removeECRampCurve as nutrientSliceRemoveECRampCurve,
  type ECRampPoint,
} from '../slices/nutrient';
import {
  fetchStrainLibrary as strainSliceFetchLibrary,
  addStrain as strainSliceAdd,
  updateStrainMeta as strainSliceUpdateMeta,
  removeStrain as strainSliceRemove,
  exportStrainLibrary as strainSliceExport,
  importStrainLibrary as strainSliceImport,
  clearStrainLibrary as strainSliceClear,
  updateBreeder as strainSliceUpdateBreeder,
  deleteBreeder as strainSliceDeleteBreeder,
} from '../slices/strain';
import {
  addPlant as plantSliceAddPlant,
  addPlants as plantSliceAddPlants,
  updatePlant as plantSliceUpdatePlant,
  deletePlant as plantSliceDeletePlant,
  harvestPlant as plantSliceHarvestPlant,
  takeClone as plantSliceTakeClone,
  moveClone as plantSliceMoveClone,
  swapPlants as plantSliceSwapPlants,
  waterPlant as plantSliceWaterPlant,
  printLabel as plantSlicePrintLabel,
  scorePlant as plantSliceScorePlant,
  saveHarvestMetrics as plantSliceSaveHarvestMetrics,
  logDryingWeight as plantSliceLogDryingWeight,
  logMoistureReading as plantSliceLogMoistureReading,
  setVisualTag as plantSliceSetVisualTag,
  plants$,
} from '../slices/plant';
import {
  fetchGeneticsData as geneticsSliceFetchData,
  addSeedBatch as geneticsSliceAddSeedBatch,
  updateSeedBatch as geneticsSliceUpdateSeedBatch,
  removeSeedBatch as geneticsSliceRemoveSeedBatch,
  logPollinationEvent as geneticsSliceLogPollinationEvent,
  updatePollinationEvent as geneticsSliceUpdatePollinationEvent,
  deletePollinationEvent as geneticsSliceDeletePollinationEvent,
  harvestSeeds as geneticsSliceHarvestSeeds,
  sowSeed as geneticsSliceSowSeed,
  setPlantSex as geneticsSliceSetPlantSex,
  unlinkSeedBatch as geneticsSliceUnlinkSeedBatch,
  getLineageTree as geneticsSliceGetLineageTree,
  getStrainLineageTree as geneticsSliceGetStrainLineageTree,
  updateStrainLineageTree as geneticsSliceUpdateStrainLineageTree,
  importStrainLineageTree as geneticsSliceImportStrainLineageTree,
} from '../slices/genetics';
import type { PlantEntity } from '../features/plants/types';
import { VisionAPI } from './api/vision-api';
import { ReportAPI } from './api/report-api';

/**
 * DataService — single hass-propagation point for all domain API clients.
 *
 * Owns updateHass() so callers update one object instead of twelve.
 * All other methods delegate directly to the appropriate API client.
 */
export class DataService {
  public hass!: HomeAssistant;

  private _growspaceAPI: GrowspaceAPI;
  private _historyAPI: HistoryAPI;
  private _irrigationAPI: IrrigationAPI;
  private _aiAPI: AIAPI;
  private _visionAPI: VisionAPI;
  private _reportAPI: ReportAPI;

  constructor(hass?: HomeAssistant) {
    this._growspaceAPI = new GrowspaceAPI(hass);
    this._historyAPI = new HistoryAPI(hass);
    this._irrigationAPI = new IrrigationAPI(hass);
    this._aiAPI = new AIAPI(hass);
    this._visionAPI = new VisionAPI(hass);
    this._reportAPI = new ReportAPI(hass);

    if (hass) {
      this.hass = hass;
      setHass(hass);
    }
  }

  /** Propagate a new hass instance to all API clients atomically. */
  updateHass(hass: HomeAssistant): void {
    this.hass = hass;
    [
      this._growspaceAPI,
      this._historyAPI,
      this._irrigationAPI,
      this._aiAPI,
      this._visionAPI,
      this._reportAPI,
    ].forEach((api) => api.updateHass(hass));
    setHass(hass);
  }

  // ── Growspace ────────────────────────────────────────────────────────────

  fetchGrowspaceData = (growspaceId?: string) => this._growspaceAPI.fetchGrowspaceData(growspaceId);

  getGrowspaceDevices = (wsDataMap?: Record<string, GrowspaceAPIResponse>) =>
    this._growspaceAPI.getGrowspaceDevices(wsDataMap);

  invalidateCache = (growspaceId?: string) => this._growspaceAPI.invalidateCache(growspaceId);

  addGrowspace = (data: Parameters<GrowspaceAPI['addGrowspace']>[0]) =>
    this._growspaceAPI.addGrowspace(data);

  updateGrowspace = (data: Parameters<GrowspaceAPI['updateGrowspace']>[0]) =>
    this._growspaceAPI.updateGrowspace(data);

  removeGrowspace = (growspaceId: string) => this._growspaceAPI.removeGrowspace(growspaceId);

  configureEnvironment = (data: Parameters<typeof growspaceSliceConfigureEnvironment>[0]) =>
    growspaceSliceConfigureEnvironment(data);

  setDehumidifierControl = (growspaceId: string, enabled: boolean) =>
    growspaceSliceSetDehumidifierControl(growspaceId, enabled);

  removeEnvironment = (growspaceId: string) => growspaceSliceRemoveEnvironment(growspaceId);

  resetWaterTracking = (growspaceId: string) => growspaceSliceResetWaterTracking(growspaceId);

  updateSensorCoordinates = (
    growspaceId: string,
    entityId: string,
    x: number,
    y: number,
    z: number,
    rotation?: number
  ) => growspaceSliceUpdateSensorCoordinates(growspaceId, entityId, x, y, z, rotation);

  // ── Strain (delegated to slices/strain) ──────────────────────────────────

  fetchStrainLibrary = () => strainSliceFetchLibrary();

  addStrain = (data: Parameters<typeof strainSliceAdd>[0]) => strainSliceAdd(data);

  updateStrainMeta = (data: Parameters<typeof strainSliceUpdateMeta>[0]) =>
    strainSliceUpdateMeta(data);

  removeStrain = (strain: string, phenotype?: string) =>
    strainSliceRemove(phenotype ? `${strain}|${phenotype}` : `${strain}|default`);

  exportStrainLibrary = () => strainSliceExport();

  importStrainLibrary = (file: File, replace: boolean) => strainSliceImport(file, replace);

  clearStrainLibrary = () => strainSliceClear();

  updateBreeder = (oldName: string, newName: string, logo?: string) =>
    strainSliceUpdateBreeder(oldName, newName, logo);

  deleteBreeder = (name: string) => strainSliceDeleteBreeder(name);

  // ── Nutrient (delegated to slices/nutrient) ──────────────────────────────

  fetchNutrientPresets = () => nutrientSliceFetchPresets();

  fetchNutrientInventory = () => nutrientSliceFetchInventory();

  updateNutrientStock = (nutrientId: string, name: string, currentMl: number, initialMl: number) =>
    nutrientSliceUpdateStock(nutrientId, name, currentMl, initialMl);

  removeNutrientStock = (nutrientId: string) => nutrientSliceRemoveStock(nutrientId);

  fetchIPMPresets = () => nutrientSliceFetchIPMPresets();

  saveIPMPreset = (data: Parameters<typeof nutrientSliceSaveIPMPreset>[0]) =>
    nutrientSliceSaveIPMPreset(data);

  removeIPMPreset = (presetId: string) => nutrientSliceRemoveIPMPreset(presetId);

  saveNutrientPreset = (data: Parameters<typeof nutrientSliceSavePreset>[0]) =>
    nutrientSliceSavePreset(data);

  removeNutrientPreset = (presetId: string) => nutrientSliceRemovePreset(presetId);

  applyIPM = (data: Parameters<typeof nutrientSliceApplyIPM>[0]) => nutrientSliceApplyIPM(data);

  fetchECRampCurves = () => nutrientSliceFetchECRampCurves();

  saveECRampCurve = (data: { curve_id?: string; name: string; stage?: string; points: ECRampPoint[] }) =>
    nutrientSliceSaveECRampCurve(data);

  removeECRampCurve = (curveId: string) => nutrientSliceRemoveECRampCurve(curveId);

  // ── History ──────────────────────────────────────────────────────────────

  getHistory = (...args: Parameters<HistoryAPI['getHistory']>) =>
    this._historyAPI.getHistory(...args);

  getBatchHistory = (...args: Parameters<HistoryAPI['getBatchHistory']>) =>
    this._historyAPI.getBatchHistory(...args);

  getHistoryStats = (...args: Parameters<HistoryAPI['getHistoryStats']>) =>
    this._historyAPI.getHistoryStats(...args);

  // ── Plant (delegated to slices/plant) ────────────────────────────────────

  addPlant = (params: Parameters<typeof plantSliceAddPlant>[0]) => plantSliceAddPlant(params);

  addPlants = (params: Parameters<typeof plantSliceAddPlants>[0]) => plantSliceAddPlants(params);

  updatePlant = (params: { plant_id: string; [key: string]: unknown }) => {
    const { plant_id, ...updates } = params;
    return plantSliceUpdatePlant(plant_id, updates as Partial<PlantEntity['attributes']>);
  };

  removePlant = (plantId: string) => plantSliceDeletePlant(plantId);

  harvestPlant = (
    plantId: string,
    targetGrowspaceId: string,
    metrics?: Parameters<typeof plantSliceHarvestPlant>[2]
  ) => plantSliceHarvestPlant(plantId, targetGrowspaceId, metrics);

  takeClone = (params: { mother_plant_id: string; num_clones?: number; target_growspace_id?: string }) => {
    const plant = plants$
      .get()
      .find(
        (p: PlantEntity) =>
          (p.attributes.plant_id ?? p.entity_id.replace('sensor.', '')) === params.mother_plant_id
      );
    if (!plant) throw new Error(`Plant not found: ${params.mother_plant_id}`);
    return plantSliceTakeClone(plant, params.num_clones, params.target_growspace_id);
  };

  moveClone = (plantId: string, targetGrowspaceId: string, transitionDate?: string) =>
    plantSliceMoveClone(plantId, targetGrowspaceId, transitionDate);

  swapPlants = (plant1Id: string, plant2Id: string) => plantSliceSwapPlants(plant1Id, plant2Id);

  waterPlant = (
    plantId: string,
    amount: number,
    nutrients?: Record<string, number>,
    presetId?: string
  ) => plantSliceWaterPlant(plantId, amount, nutrients, presetId);

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
  }) =>
    plantSlicePrintLabel({
      plantId: params.plant_id,
      strain: params.strain,
      phenotype: params.phenotype,
      breeder: params.breeder,
      lineage: params.lineage,
      breederLogo: params.breeder_logo,
      deviceId: params.device_id,
      preview: params.preview,
      baseUrl: params.base_url,
    });

  scorePlant = (params: { plant_id: string; [key: string]: unknown }) => {
    const { plant_id, ...scores } = params;
    return plantSliceScorePlant(plant_id, scores as Record<string, number | null>);
  };

  updateHarvestMetrics = (params: { plant_id: string; [key: string]: unknown }) => {
    const { plant_id, ...metrics } = params;
    return plantSliceSaveHarvestMetrics(plant_id, metrics);
  };

  logDryingWeight = (params: { plant_id: string; weight_grams: number; date?: string }) =>
    plantSliceLogDryingWeight(params.plant_id, params.weight_grams, params.date);

  logMoistureReading = (params: { plant_id: string; moisture_percent: number; date?: string }) =>
    plantSliceLogMoistureReading(params.plant_id, params.moisture_percent, params.date);

  setVisualTag = (params: { plant_id: string; visual_tag: string | null }) =>
    plantSliceSetVisualTag(params.plant_id, params.visual_tag);

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

  waterGrowspace = (
    growspaceId: string,
    amount: number,
    nutrients?: Record<string, number>,
    presetId?: string
  ) => this._irrigationAPI.waterGrowspace(growspaceId, amount, nutrients, presetId);

  runIrrigationCycle = (params: Parameters<IrrigationAPI['runIrrigationCycle']>[0]) =>
    this._irrigationAPI.runIrrigationCycle(params);

  getIrrigationAnalytics = (growspaceId: string) =>
    this._irrigationAPI.getIrrigationAnalytics(growspaceId);

  setEcTargetRanges = (...args: Parameters<IrrigationAPI['setEcTargetRanges']>) =>
    this._irrigationAPI.setEcTargetRanges(...args);

  // ── AI ───────────────────────────────────────────────────────────────────

  askGrowAdvice = (growspaceId: string, userQuery: string) =>
    this._aiAPI.askGrowAdvice(growspaceId, userQuery);

  analyzeAllGrowspaces = () => this._aiAPI.analyzeAllGrowspaces();

  getStrainRecommendation = (userQuery: string) => this._aiAPI.getStrainRecommendation(userQuery);

  // ── Camera ───────────────────────────────────────────────────────────────

  captureSnapshot = (growspaceId: string) => cameraSliceCaptureSnapshot(growspaceId);

  getSnapshots = (growspaceId: string, limit?: number, offset?: number) =>
    cameraSliceGetSnapshots(growspaceId, limit, offset);

  // ── Vision ───────────────────────────────────────────────────────────────

  getVisionHistory = (growspaceId: string, limit?: number) =>
    this._visionAPI.getVisionHistory(growspaceId, limit);

  triggerVisionCheckup = (growspaceId: string) => this._visionAPI.triggerVisionCheckup(growspaceId);

  updateVisionCheckupConfig = (...args: Parameters<VisionAPI['updateVisionCheckupConfig']>) =>
    this._visionAPI.updateVisionCheckupConfig(...args);

  // ── Report ───────────────────────────────────────────────────────────────

  exportGrowReport = (growspaceId: string, format?: string) =>
    this._reportAPI.exportGrowReport(growspaceId, format);

  fetchGrowReport = (growspaceId: string) => this._reportAPI.fetchGrowReport(growspaceId);

  // ── Genetics (delegated to slices/genetics) ──────────────────────────────

  fetchGeneticsData = () => geneticsSliceFetchData();

  addSeedBatch = (data: Parameters<typeof geneticsSliceAddSeedBatch>[0]) =>
    geneticsSliceAddSeedBatch(data);

  updateSeedBatch = (data: Parameters<typeof geneticsSliceUpdateSeedBatch>[0]) =>
    geneticsSliceUpdateSeedBatch(data);

  deleteSeedBatch = (batch_id: string) => geneticsSliceRemoveSeedBatch(batch_id);

  logPollination = (data: Parameters<typeof geneticsSliceLogPollinationEvent>[0]) =>
    geneticsSliceLogPollinationEvent(data);

  updatePollination = (data: Parameters<typeof geneticsSliceUpdatePollinationEvent>[0]) =>
    geneticsSliceUpdatePollinationEvent(data);

  deletePollination = (event_id: string) => geneticsSliceDeletePollinationEvent(event_id);

  harvestSeeds = (data: Parameters<typeof geneticsSliceHarvestSeeds>[0]) =>
    geneticsSliceHarvestSeeds(data);

  getLineageTree = (plant_id: string) => geneticsSliceGetLineageTree(plant_id);

  getStrainLineageTree = (strain_name: string) => geneticsSliceGetStrainLineageTree(strain_name);

  updateStrainLineageTree = (
    strain_name: string,
    parents: Array<{ name: string; source: 'library' | 'manual' }>
  ) => geneticsSliceUpdateStrainLineageTree(strain_name, parents);

  importStrainLineageTree = (strain_name: string, tree: Record<string, unknown>) =>
    geneticsSliceImportStrainLineageTree(strain_name, tree);

  sowSeed = (batch_id: string, plant_id: string) => geneticsSliceSowSeed(batch_id, plant_id);

  setPlantSex = (plant_id: string, sex: string) => geneticsSliceSetPlantSex(plant_id, sex);

  unlinkSeedBatch = (plant_id: string) => geneticsSliceUnlinkSeedBatch(plant_id);

  // ── Generic ──────────────────────────────────────────────────────────────

  async callService(
    domain: string,
    service: string,
    serviceData: Record<string, unknown>
  ): Promise<void> {
    if (!this.hass) {
      console.error('[DataService:callService] Hass instance is missing');
      return;
    }
    await this.hass.callService(domain, service, serviceData);
  }
}
