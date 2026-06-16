import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock all API classes BEFORE imports that use them.
vi.mock('../../../src/services/api/growspace-api', () => ({
  GrowspaceAPI: vi.fn().mockImplementation(function (this: Record<string, unknown>) {
    this.updateHass = vi.fn();
    this.invalidateCache = vi.fn();
    this.fetchGrowspaceData = vi.fn();
    this.getGrowspaceDevices = vi.fn(() => []);
    this.addGrowspace = vi.fn();
    this.updateGrowspace = vi.fn();
    this.removeGrowspace = vi.fn();
  }),
}));
vi.mock('../../../src/slices/nutrient', () => ({
  nutrientPresets$: { get: vi.fn(() => null), set: vi.fn() },
  ipmPresets$: { get: vi.fn(() => null), set: vi.fn() },
  nutrientInventory$: { get: vi.fn(() => null), set: vi.fn() },
  ecRampCurves$: { get: vi.fn(() => null), set: vi.fn() },
  fetchNutrientPresets: vi.fn().mockResolvedValue(undefined),
  fetchNutrientInventory: vi.fn().mockResolvedValue(undefined),
  updateNutrientStock: vi.fn().mockResolvedValue(undefined),
  removeNutrientStock: vi.fn().mockResolvedValue(undefined),
  fetchIPMPresets: vi.fn().mockResolvedValue(undefined),
  saveIPMPreset: vi.fn().mockResolvedValue(undefined),
  removeIPMPreset: vi.fn().mockResolvedValue(undefined),
  saveNutrientPreset: vi.fn().mockResolvedValue(undefined),
  removeNutrientPreset: vi.fn().mockResolvedValue(undefined),
  applyIPM: vi.fn().mockResolvedValue(undefined),
  fetchECRampCurves: vi.fn().mockResolvedValue(undefined),
  saveECRampCurve: vi.fn().mockResolvedValue(undefined),
  removeECRampCurve: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../../src/services/api/history-api', () => ({
  HistoryAPI: vi.fn().mockImplementation(function (this: Record<string, unknown>) {
    this.updateHass = vi.fn();
    this.getHistory = vi.fn();
    this.getHistoryStats = vi.fn();
    this.getBatchHistory = vi.fn();
  }),
}));
vi.mock('../../../src/services/api/irrigation-api', () => ({
  IrrigationAPI: vi.fn().mockImplementation(function (this: Record<string, unknown>) {
    this.updateHass = vi.fn();
    this.setIrrigationSettings = vi.fn();
    this.addIrrigationTime = vi.fn();
    this.removeIrrigationTime = vi.fn();
    this.addDrainTime = vi.fn();
    this.removeDrainTime = vi.fn();
    this.setIrrigationStrategy = vi.fn();
    this.configureDrainMonitoring = vi.fn();
    this.logDrainReading = vi.fn();
    this.waterGrowspace = vi.fn();
    this.runIrrigationCycle = vi.fn();
    this.getIrrigationAnalytics = vi.fn();
    this.setEcTargetRanges = vi.fn();
  }),
}));
vi.mock('../../../src/services/api/ai-api', () => ({
  AIAPI: vi.fn().mockImplementation(function (this: Record<string, unknown>) {
    this.updateHass = vi.fn();
    this.askGrowAdvice = vi.fn();
    this.analyzeAllGrowspaces = vi.fn();
    this.getStrainRecommendation = vi.fn();
  }),
}));
vi.mock('../../../src/slices/camera', () => ({
  captureSnapshot: vi.fn().mockResolvedValue({ growspace_id: 'gs1', timestamp: '', snapshots: [] }),
  getSnapshots: vi.fn().mockResolvedValue({ growspace_id: 'gs1', snapshots: [], total: 0 }),
  setSnapshots: vi.fn(),
  snapshots$: { get: vi.fn(() => []), set: vi.fn(), subscribe: vi.fn() },
}));
vi.mock('../../../src/slices/strain', () => ({
  fetchStrainLibrary: vi.fn().mockResolvedValue([]),
  addStrain: vi.fn().mockResolvedValue(undefined),
  updateStrainMeta: vi.fn().mockResolvedValue(undefined),
  removeStrain: vi.fn().mockResolvedValue(undefined),
  exportStrainLibrary: vi.fn().mockResolvedValue(undefined),
  importStrainLibrary: vi.fn().mockResolvedValue({ success: true }),
  clearStrainLibrary: vi.fn().mockResolvedValue(undefined),
  updateBreeder: vi.fn().mockResolvedValue(undefined),
  deleteBreeder: vi.fn().mockResolvedValue(undefined),
  setStrainLibrary: vi.fn(),
  strainLibrary$: { get: vi.fn(() => []), set: vi.fn(), subscribe: vi.fn() },
}));

vi.mock('../../../src/services/api/report-api', () => ({
  ReportAPI: vi.fn().mockImplementation(function (this: Record<string, unknown>) {
    this.updateHass = vi.fn();
    this.exportGrowReport = vi.fn();
    this.fetchGrowReport = vi.fn();
  }),
}));
vi.mock('../../../src/slices/plant', () => ({
  plants$: { get: vi.fn(() => []), set: vi.fn(), subscribe: vi.fn() },
  addPlant: vi.fn().mockResolvedValue(undefined),
  addPlants: vi.fn().mockResolvedValue(undefined),
  updatePlant: vi.fn().mockResolvedValue(undefined),
  deletePlant: vi.fn().mockResolvedValue(undefined),
  harvestPlant: vi.fn().mockResolvedValue(undefined),
  takeClone: vi.fn().mockResolvedValue(undefined),
  moveClone: vi.fn().mockResolvedValue(undefined),
  swapPlants: vi.fn().mockResolvedValue(undefined),
  waterPlant: vi.fn().mockResolvedValue(undefined),
  printLabel: vi.fn().mockResolvedValue(undefined),
  scorePlant: vi.fn().mockResolvedValue(undefined),
  saveHarvestMetrics: vi.fn().mockResolvedValue(undefined),
  logDryingWeight: vi.fn().mockResolvedValue(undefined),
  logMoistureReading: vi.fn().mockResolvedValue(undefined),
  setVisualTag: vi.fn().mockResolvedValue(undefined),
  movePlantToGrowspace: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../../src/slices/genetics', () => ({
  seedBatches$: { get: vi.fn(() => []), set: vi.fn(), subscribe: vi.fn() },
  pollinationEvents$: { get: vi.fn(() => []), set: vi.fn(), subscribe: vi.fn() },
  fetchGeneticsData: vi.fn().mockResolvedValue(undefined),
  addSeedBatch: vi.fn().mockResolvedValue(undefined),
  updateSeedBatch: vi.fn().mockResolvedValue(undefined),
  removeSeedBatch: vi.fn().mockResolvedValue(undefined),
  logPollinationEvent: vi.fn().mockResolvedValue(undefined),
  updatePollinationEvent: vi.fn().mockResolvedValue(undefined),
  deletePollinationEvent: vi.fn().mockResolvedValue(undefined),
  harvestSeeds: vi.fn().mockResolvedValue(undefined),
  sowSeed: vi.fn().mockResolvedValue(undefined),
  setPlantSex: vi.fn().mockResolvedValue(undefined),
  unlinkSeedBatch: vi.fn().mockResolvedValue(undefined),
  getLineageTree: vi.fn().mockResolvedValue(null),
  getStrainLineageTree: vi.fn().mockResolvedValue(null),
  updateStrainLineageTree: vi.fn().mockResolvedValue({ lineage: '' }),
  importStrainLineageTree: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../../src/slices/growspace', () => ({
  growspaceDevices$: { get: vi.fn(() => null), set: vi.fn() },
  getGrowspaceDevices: vi.fn().mockReturnValue([]),
  fetchGrowspaceData: vi.fn().mockResolvedValue(undefined),
  configureEnvironment: vi.fn().mockResolvedValue(undefined),
  configureCirculationFan: vi.fn().mockResolvedValue(undefined),
  configureExhaustFan: vi.fn().mockResolvedValue(undefined),
  setDehumidifierControl: vi.fn().mockResolvedValue(undefined),
  removeEnvironment: vi.fn().mockResolvedValue(undefined),
  resetWaterTracking: vi.fn().mockResolvedValue(undefined),
  updateSensorCoordinates: vi.fn().mockResolvedValue(undefined),
}));

import { DataService } from '../../../src/services/data-service';
import { GrowspaceAPI } from '../../../src/services/api/growspace-api';
import { HistoryAPI } from '../../../src/services/api/history-api';
import * as nutrientSlice from '../../../src/slices/nutrient';
import { IrrigationAPI } from '../../../src/services/api/irrigation-api';
import { AIAPI } from '../../../src/services/api/ai-api';
import * as cameraSlice from '../../../src/slices/camera';
import * as strainSlice from '../../../src/slices/strain';
import { VisionAPI } from '../../../src/services/api/vision-api';
import { ReportAPI } from '../../../src/services/api/report-api';
import * as plantSlice from '../../../src/slices/plant';
import * as geneticsSlice from '../../../src/slices/genetics';

describe('DataService Delegation', () => {
  let dataService: DataService;
  const mockHass = {
    callService: vi.fn(),
    callWS: vi.fn(),
    connection: {
      sendMessagePromise: vi.fn(),
    },
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    dataService = new DataService(mockHass);
  });

  describe('updateHass', () => {
    it('updates hass on all sub-services', () => {
      const newHass = { ...mockHass, new: true } as any;
      dataService.updateHass(newHass);

      expect(dataService.hass).toBe(newHass);

      const growspaceAPIInstance = vi.mocked(GrowspaceAPI).mock.instances[0];
      expect(growspaceAPIInstance.updateHass).toHaveBeenCalledWith(newHass);
    });
  });

  describe('GrowspaceAPI delegation', () => {
    it('delegates fetchGrowspaceData', () => {
      const instance = vi.mocked(GrowspaceAPI).mock.instances[0];
      dataService.fetchGrowspaceData('gs1');
      expect(instance.fetchGrowspaceData).toHaveBeenCalledWith('gs1');
    });

    it('delegates addGrowspace', () => {
      const instance = vi.mocked(GrowspaceAPI).mock.instances[0];
      const data = { name: 'Test', rows: 2, plantsPerRow: 2 };
      dataService.addGrowspace(data);
      expect(instance.addGrowspace).toHaveBeenCalledWith(data);
    });
  });

  describe('Strain slice delegation', () => {
    it('delegates fetchStrainLibrary to strain slice', async () => {
      await dataService.fetchStrainLibrary();
      expect(strainSlice.fetchStrainLibrary).toHaveBeenCalled();
    });

    it('delegates addStrain to strain slice', async () => {
      const data = { strain: 'OG' };
      await dataService.addStrain(data as any);
      expect(strainSlice.addStrain).toHaveBeenCalledWith(expect.objectContaining({ strain: 'OG' }));
    });
  });

  describe('Nutrient slice delegation', () => {
    it('delegates fetchNutrientPresets to nutrient slice', () => {
      dataService.fetchNutrientPresets();
      expect(nutrientSlice.fetchNutrientPresets).toHaveBeenCalled();
    });

    it('delegates updateNutrientStock to nutrient slice', () => {
      dataService.updateNutrientStock('n1', 'Nutrient', 100, 1000);
      expect(nutrientSlice.updateNutrientStock).toHaveBeenCalledWith('n1', 'Nutrient', 100, 1000);
    });
  });

  describe('HistoryAPI delegation', () => {
    it('delegates getHistory', () => {
      const instance = vi.mocked(HistoryAPI).mock.instances[0];
      const start = new Date();
      dataService.getHistory('ent1', start);
      expect(instance.getHistory).toHaveBeenCalledWith('ent1', start);
    });

    it('delegates getHistoryStats', () => {
      const instance = vi.mocked(HistoryAPI).mock.instances[0];
      const start = new Date();
      dataService.getHistoryStats(['e1'], start);
      expect(instance.getHistoryStats).toHaveBeenCalledWith(['e1'], start);
    });
  });

  describe('Plant slice delegation', () => {
    it('delegates addPlant', () => {
      const params = { growspace_id: 'gs1', row: 0, col: 0, strain: 'OG' };
      dataService.addPlant(params);
      expect(plantSlice.addPlant).toHaveBeenCalledWith(params);
    });

    it('delegates waterPlant', () => {
      dataService.waterPlant('p1', 500);
      expect(plantSlice.waterPlant).toHaveBeenCalledWith('p1', 500, undefined, undefined);
    });

    it('delegates updatePlant — extracts plant_id from params', () => {
      dataService.updatePlant({ plant_id: 'p1', notes: 'Growing well' });
      expect(plantSlice.updatePlant).toHaveBeenCalledWith('p1', { notes: 'Growing well' });
    });

    it('delegates removePlant to deletePlant', () => {
      dataService.removePlant('p1');
      expect(plantSlice.deletePlant).toHaveBeenCalledWith('p1');
    });

    it('delegates moveClone', () => {
      dataService.moveClone('p1', 'g2');
      expect(plantSlice.moveClone).toHaveBeenCalledWith('p1', 'g2', undefined);
    });
  });

  describe('IrrigationAPI delegation', () => {
    it('delegates setIrrigationStrategy', () => {
      const instance = vi.mocked(IrrigationAPI).mock.instances[0];
      dataService.setIrrigationStrategy('gs1', { enabled: true });
      expect(instance.setIrrigationStrategy).toHaveBeenCalledWith('gs1', { enabled: true });
    });

    it('delegates runIrrigationCycle', () => {
      const instance = vi.mocked(IrrigationAPI).mock.instances[0];
      const params = { growspaceId: 'gs1', duration: 300 };
      dataService.runIrrigationCycle(params);
      expect(instance.runIrrigationCycle).toHaveBeenCalledWith(params);
    });

    it('delegates getIrrigationAnalytics', () => {
      const instance = vi.mocked(IrrigationAPI).mock.instances[0];
      dataService.getIrrigationAnalytics('gs1');
      expect(instance.getIrrigationAnalytics).toHaveBeenCalledWith('gs1');
    });
  });

  describe('Genetics slice delegation', () => {
    it('delegates fetchGeneticsData', () => {
      dataService.fetchGeneticsData();
      expect(geneticsSlice.fetchGeneticsData).toHaveBeenCalled();
    });

    it('delegates addSeedBatch', () => {
      const data = {
        strain_name: 'OG Kush',
        breeder: 'DNA Genetics',
        quantity: 10,
        acquisition_date: '2024-01-01',
        generation: 'F1',
      };
      dataService.addSeedBatch(data);
      expect(geneticsSlice.addSeedBatch).toHaveBeenCalledWith(data);
    });

    it('delegates updateSeedBatch', () => {
      const data = { batch_id: 'b1', quantity: 8 };
      dataService.updateSeedBatch(data);
      expect(geneticsSlice.updateSeedBatch).toHaveBeenCalledWith(data);
    });

    it('delegates logPollination to logPollinationEvent', () => {
      const data = { date: '2024-03-01', donor_plant_id: 'p1', receiver_plant_id: 'p2' };
      dataService.logPollination(data);
      expect(geneticsSlice.logPollinationEvent).toHaveBeenCalledWith(data);
    });

    it('delegates updatePollination to updatePollinationEvent', () => {
      const data = { event_id: 'evt-1', notes: 'Updated' };
      dataService.updatePollination(data);
      expect(geneticsSlice.updatePollinationEvent).toHaveBeenCalledWith(data);
    });

    it('delegates harvestSeeds', () => {
      const data = { event_id: 'evt-1', quantity: 20 };
      dataService.harvestSeeds(data);
      expect(geneticsSlice.harvestSeeds).toHaveBeenCalledWith(data);
    });

    it('delegates deleteSeedBatch to removeSeedBatch', () => {
      dataService.deleteSeedBatch('b1');
      expect(geneticsSlice.removeSeedBatch).toHaveBeenCalledWith('b1');
    });

    it('delegates deletePollination to deletePollinationEvent', () => {
      dataService.deletePollination('evt-1');
      expect(geneticsSlice.deletePollinationEvent).toHaveBeenCalledWith('evt-1');
    });

    it('delegates getLineageTree', () => {
      dataService.getLineageTree('p1');
      expect(geneticsSlice.getLineageTree).toHaveBeenCalledWith('p1');
    });

    it('delegates getStrainLineageTree', () => {
      dataService.getStrainLineageTree('strain1');
      expect(geneticsSlice.getStrainLineageTree).toHaveBeenCalledWith('strain1');
    });

    it('delegates updateStrainLineageTree', () => {
      const parents = [{ name: 'P1', source: 'library' as const }];
      dataService.updateStrainLineageTree('strain1', parents);
      expect(geneticsSlice.updateStrainLineageTree).toHaveBeenCalledWith('strain1', parents);
    });

    it('delegates importStrainLineageTree', () => {
      const tree = { name: 'OG Kush', children: [] };
      dataService.importStrainLineageTree('OG Kush', tree);
      expect(geneticsSlice.importStrainLineageTree).toHaveBeenCalledWith('OG Kush', tree);
    });
  });

  describe('AI/Vision/Camera/Report delegation', () => {
    it('delegates AI operations', () => {
      const instance = vi.mocked(AIAPI).mock.instances[0];
      dataService.askGrowAdvice('gs1', 'help');
      expect(instance.askGrowAdvice).toHaveBeenCalledWith('gs1', 'help');
    });

    it('delegates Vision operations', () => {
      const spy = vi.spyOn(VisionAPI.prototype, 'triggerVisionCheckup').mockResolvedValue(null);
      dataService.triggerVisionCheckup('gs1');
      expect(spy).toHaveBeenCalledWith('gs1');
    });

    it('delegates getVisionHistory', () => {
      const spy = vi.spyOn(VisionAPI.prototype, 'getVisionHistory').mockResolvedValue(null);
      dataService.getVisionHistory('gs1', 5);
      expect(spy).toHaveBeenCalledWith('gs1', 5);
    });

    it('delegates updateVisionCheckupConfig', () => {
      const spy = vi.spyOn(VisionAPI.prototype, 'updateVisionCheckupConfig').mockResolvedValue(null);
      const config = { enabled: true, interval_hours: 12 } as any;
      dataService.updateVisionCheckupConfig('gs1', config);
      expect(spy).toHaveBeenCalledWith('gs1', config);
    });

    it('delegates Camera operations', () => {
      dataService.captureSnapshot('gs1');
      expect(cameraSlice.captureSnapshot).toHaveBeenCalledWith('gs1');
    });

    it('delegates getSnapshots', () => {
      dataService.getSnapshots('gs1', 10, 0);
      expect(cameraSlice.getSnapshots).toHaveBeenCalledWith('gs1', 10, 0);
    });

    it('delegates Report operations', () => {
      const instance = vi.mocked(ReportAPI).mock.instances[0];
      dataService.fetchGrowReport('gs1');
      expect(instance.fetchGrowReport).toHaveBeenCalledWith('gs1');
    });
  });

  describe('callService', () => {
    it('calls hass.callService', async () => {
      await dataService.callService('dom', 'svc', { foo: 'bar' });
      expect(mockHass.callService).toHaveBeenCalledWith('dom', 'svc', { foo: 'bar' });
    });

    it('errors if hass is missing', async () => {
      const dsNoHass = new DataService();
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      await dsNoHass.callService('dom', 'svc', {});
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('Strain slice – remaining delegations', () => {
    it('delegates updateStrainMeta to strain slice', () => {
      const data = { strain: 'OG Kush', notes: 'Updated' };
      dataService.updateStrainMeta(data as any);
      expect(strainSlice.updateStrainMeta).toHaveBeenCalledWith(data);
    });

    it('delegates updateBreeder to strain slice', () => {
      dataService.updateBreeder('OldName', 'NewName', 'logo.png');
      expect(strainSlice.updateBreeder).toHaveBeenCalledWith('OldName', 'NewName', 'logo.png');
    });
  });

  describe('Nutrient slice – EC ramp curves', () => {
    it('delegates fetchECRampCurves to nutrient slice', () => {
      dataService.fetchECRampCurves();
      expect(nutrientSlice.fetchECRampCurves).toHaveBeenCalled();
    });

    it('delegates saveECRampCurve to nutrient slice', () => {
      const data = { name: 'Veg Ramp', points: [{ day: 1, ec: 1.2 }] };
      dataService.saveECRampCurve(data as any);
      expect(nutrientSlice.saveECRampCurve).toHaveBeenCalledWith(data);
    });
  });

  describe('Plant slice – takeClone', () => {
    it('finds plant by plant_id and delegates takeClone', () => {
      const plant = { entity_id: 'sensor.p1', attributes: { plant_id: 'p1' } } as any;
      vi.mocked(plantSlice.plants$.get).mockReturnValue([plant]);
      dataService.takeClone({ mother_plant_id: 'p1', num_clones: 2 });
      expect(plantSlice.takeClone).toHaveBeenCalledWith(plant, 2, undefined);
    });

    it('falls back to entity_id when plant_id attribute is absent', () => {
      const plant = { entity_id: 'sensor.my-plant', attributes: {} } as any;
      vi.mocked(plantSlice.plants$.get).mockReturnValue([plant]);
      dataService.takeClone({ mother_plant_id: 'my-plant' });
      expect(plantSlice.takeClone).toHaveBeenCalledWith(plant, undefined, undefined);
    });

    it('throws when plant is not found', () => {
      vi.mocked(plantSlice.plants$.get).mockReturnValue([]);
      expect(() => dataService.takeClone({ mother_plant_id: 'ghost' })).toThrow(
        'Plant not found: ghost'
      );
    });
  });

  describe('Plant slice – printLabel, scorePlant, updateHarvestMetrics, logDryingWeight, logMoistureReading, setVisualTag', () => {
    it('delegates printLabel to plant slice with mapped params', () => {
      dataService.printLabel({ plant_id: 'p1', strain: 'OG', preview: true });
      expect(plantSlice.printLabel).toHaveBeenCalledWith(
        expect.objectContaining({ plantId: 'p1', strain: 'OG', preview: true })
      );
    });

    it('delegates scorePlant — extracts plant_id from params', () => {
      dataService.scorePlant({ plant_id: 'p1', growth_rate: 8 });
      expect(plantSlice.scorePlant).toHaveBeenCalledWith('p1', { growth_rate: 8 });
    });

    it('delegates updateHarvestMetrics — extracts plant_id from params', () => {
      dataService.updateHarvestMetrics({ plant_id: 'p1', wet_weight: 120 });
      expect(plantSlice.saveHarvestMetrics).toHaveBeenCalledWith('p1', { wet_weight: 120 });
    });

    it('delegates logDryingWeight to plant slice', () => {
      dataService.logDryingWeight({ plant_id: 'p1', weight_grams: 45.5, date: '2024-01-15' });
      expect(plantSlice.logDryingWeight).toHaveBeenCalledWith('p1', 45.5, '2024-01-15');
    });

    it('delegates logMoistureReading to plant slice', () => {
      dataService.logMoistureReading({ plant_id: 'p1', moisture_percent: 62 });
      expect(plantSlice.logMoistureReading).toHaveBeenCalledWith('p1', 62, undefined);
    });

    it('delegates setVisualTag to plant slice', () => {
      dataService.setVisualTag({ plant_id: 'p1', visual_tag: 'red' });
      expect(plantSlice.setVisualTag).toHaveBeenCalledWith('p1', 'red');
    });
  });

  describe('IrrigationAPI – remaining delegations', () => {
    it('delegates configureDrainMonitoring', () => {
      const instance = vi.mocked(IrrigationAPI).mock.instances[0];
      dataService.configureDrainMonitoring('gs1', { enabled: true } as any);
      expect(instance.configureDrainMonitoring).toHaveBeenCalledWith('gs1', { enabled: true });
    });

    it('delegates logDrainReading', () => {
      const instance = vi.mocked(IrrigationAPI).mock.instances[0];
      dataService.logDrainReading('gs1', 1.8 as any);
      expect(instance.logDrainReading).toHaveBeenCalledWith('gs1', 1.8);
    });

    it('delegates setEcTargetRanges', () => {
      const instance = vi.mocked(IrrigationAPI).mock.instances[0];
      dataService.setEcTargetRanges('gs1', { min: 1.2, max: 2.0 } as any);
      expect(instance.setEcTargetRanges).toHaveBeenCalledWith('gs1', { min: 1.2, max: 2.0 });
    });
  });

  describe('ReportAPI – exportGrowReport', () => {
    it('delegates exportGrowReport to report API', () => {
      const instance = vi.mocked(ReportAPI).mock.instances[0];
      dataService.exportGrowReport('gs1', 'pdf');
      expect(instance.exportGrowReport).toHaveBeenCalledWith('gs1', 'pdf');
    });
  });
});
