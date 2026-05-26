import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock all API classes BEFORE imports that use them.
// Explicit factories are required in browser mode — auto-mocking (vi.mock without factory)
// calls resolveManualMock via birpc, which fails when the Playwright page closes between
// test files and the RPC channel is already gone.
vi.mock('../../../src/services/api/growspace-api', () => ({
  GrowspaceAPI: vi.fn().mockImplementation(function (this: Record<string, unknown>) {
    this.updateHass = vi.fn();
    this.invalidateCache = vi.fn();
    this.fetchGrowspaceData = vi.fn();
    this.getGrowspaceDevices = vi.fn(() => []);
    this.addGrowspace = vi.fn();
    this.updateGrowspace = vi.fn();
    this.removeGrowspace = vi.fn();
    this.configureEnvironment = vi.fn();
    this.removeEnvironment = vi.fn();
    this.setDehumidifierControl = vi.fn();
    this.resetWaterTracking = vi.fn();
    this.logDrainReading = vi.fn();
    this.configureDrainMonitoring = vi.fn();
  }),
}));
vi.mock('../../../src/services/api/nutrient-api', () => ({
  NutrientAPI: vi.fn().mockImplementation(function (this: Record<string, unknown>) {
    this.updateHass = vi.fn();
    this.fetchNutrientPresets = vi.fn();
    this.fetchNutrientInventory = vi.fn();
    this.updateNutrientStock = vi.fn();
    this.addNutrientPreset = vi.fn();
    this.updateNutrientPreset = vi.fn();
    this.deleteNutrientPreset = vi.fn();
  }),
}));
vi.mock('../../../src/services/api/history-api', () => ({
  HistoryAPI: vi.fn().mockImplementation(function (this: Record<string, unknown>) {
    this.updateHass = vi.fn();
    this.getHistory = vi.fn();
    this.getHistoryStats = vi.fn();
    this.getBatchHistory = vi.fn();
  }),
}));
vi.mock('../../../src/services/api/plant-api', () => ({
  PlantAPI: vi.fn().mockImplementation(function (this: Record<string, unknown>) {
    this.updateHass = vi.fn();
    this.addPlant = vi.fn();
    this.removePlant = vi.fn();
    this.updatePlant = vi.fn();
    this.waterPlant = vi.fn();
    this.applyIPMPreset = vi.fn();
    this.removeIPMPreset = vi.fn();
  }),
}));
vi.mock('../../../src/services/api/irrigation-api', () => ({
  IrrigationAPI: vi.fn().mockImplementation(function (this: Record<string, unknown>) {
    this.updateHass = vi.fn();
    this.setIrrigationStrategy = vi.fn();
    this.runIrrigationCycle = vi.fn();
    this.getIrrigationAnalytics = vi.fn();
  }),
}));
vi.mock('../../../src/services/api/ai-api', () => ({
  AIAPI: vi.fn().mockImplementation(function (this: Record<string, unknown>) {
    this.updateHass = vi.fn();
    this.askGrowAdvice = vi.fn();
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
vi.mock('../../../src/services/api/vision-api', () => ({
  VisionAPI: vi.fn().mockImplementation(function (this: Record<string, unknown>) {
    this.updateHass = vi.fn();
    this.triggerVisionCheckup = vi.fn();
    this.getVisionHistory = vi.fn();
    this.updateVisionCheckupConfig = vi.fn();
  }),
}));
vi.mock('../../../src/services/api/report-api', () => ({
  ReportAPI: vi.fn().mockImplementation(function (this: Record<string, unknown>) {
    this.updateHass = vi.fn();
    this.exportGrowReport = vi.fn();
    this.fetchGrowReport = vi.fn();
  }),
}));
vi.mock('../../../src/services/api/genetics-api', () => ({
  GeneticsAPI: vi.fn().mockImplementation(function (this: Record<string, unknown>) {
    this.updateHass = vi.fn();
    this.fetchGeneticsData = vi.fn();
    this.addSeedBatch = vi.fn();
    this.updateSeedBatch = vi.fn();
    this.deleteSeedBatch = vi.fn();
    this.logPollination = vi.fn();
    this.updatePollination = vi.fn();
    this.deletePollination = vi.fn();
    this.harvestSeeds = vi.fn();
    this.sowSeed = vi.fn();
    this.setPlantSex = vi.fn();
    this.getLineageTree = vi.fn();
    this.getStrainLineageTree = vi.fn();
    this.updateStrainLineageTree = vi.fn();
    this.importStrainLineageTree = vi.fn();
  }),
}));

import { DataService } from '../../../src/services/data-service';
import { GrowspaceAPI } from '../../../src/services/api/growspace-api';
import { NutrientAPI } from '../../../src/services/api/nutrient-api';
import { HistoryAPI } from '../../../src/services/api/history-api';
import { PlantAPI } from '../../../src/services/api/plant-api';
import { IrrigationAPI } from '../../../src/services/api/irrigation-api';
import { AIAPI } from '../../../src/services/api/ai-api';
import * as cameraSlice from '../../../src/slices/camera';
import * as strainSlice from '../../../src/slices/strain';
import { VisionAPI } from '../../../src/services/api/vision-api';
import { ReportAPI } from '../../../src/services/api/report-api';
import { GeneticsAPI } from '../../../src/services/api/genetics-api';

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
      const plantAPIInstance = vi.mocked(PlantAPI).mock.instances[0];
      const geneticsAPIInstance = vi.mocked(GeneticsAPI).mock.instances[0];

      expect(growspaceAPIInstance.updateHass).toHaveBeenCalledWith(newHass);
      expect(plantAPIInstance.updateHass).toHaveBeenCalledWith(newHass);
      expect(geneticsAPIInstance.updateHass).toHaveBeenCalledWith(newHass);
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

  describe('NutrientAPI delegation', () => {
    it('delegates fetchNutrientPresets', () => {
      const instance = vi.mocked(NutrientAPI).mock.instances[0];
      dataService.fetchNutrientPresets();
      expect(instance.fetchNutrientPresets).toHaveBeenCalled();
    });

    it('delegates updateNutrientStock', () => {
      const instance = vi.mocked(NutrientAPI).mock.instances[0];
      dataService.updateNutrientStock('n1', 'Nutrient', 100, 1000);
      expect(instance.updateNutrientStock).toHaveBeenCalledWith('n1', 'Nutrient', 100, 1000);
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

  describe('PlantAPI delegation', () => {
    it('delegates addPlant', () => {
      const instance = vi.mocked(PlantAPI).mock.instances[0];
      const params = { growspace_id: 'gs1', row: 0, col: 0, strain: 'OG' };
      dataService.addPlant(params);
      expect(instance.addPlant).toHaveBeenCalledWith(params);
    });

    it('delegates waterPlant', () => {
      const instance = vi.mocked(PlantAPI).mock.instances[0];
      dataService.waterPlant('p1', 500);
      expect(instance.waterPlant).toHaveBeenCalledWith('p1', 500, undefined, undefined);
    });

    it('delegates updatePlant', () => {
      const instance = vi.mocked(PlantAPI).mock.instances[0];
      dataService.updatePlant({ plant_id: 'p1', notes: 'Growing well' });
      expect(instance.updatePlant).toHaveBeenCalledWith({ plant_id: 'p1', notes: 'Growing well' });
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

  describe('GeneticsAPI delegation', () => {
    it('delegates fetchGeneticsData', () => {
      const instance = vi.mocked(GeneticsAPI).mock.instances[0];
      dataService.fetchGeneticsData();
      expect(instance.fetchGeneticsData).toHaveBeenCalled();
    });

    it('delegates addSeedBatch', () => {
      const instance = vi.mocked(GeneticsAPI).mock.instances[0];
      const data = {
        strain_name: 'OG Kush',
        breeder: 'DNA Genetics',
        quantity: 10,
        acquisition_date: '2024-01-01',
        generation: 'F1',
      };
      dataService.addSeedBatch(data);
      expect(instance.addSeedBatch).toHaveBeenCalledWith(data);
    });

    it('delegates updateSeedBatch', () => {
      const instance = vi.mocked(GeneticsAPI).mock.instances[0];
      const data = { batch_id: 'b1', quantity: 8 };
      dataService.updateSeedBatch(data);
      expect(instance.updateSeedBatch).toHaveBeenCalledWith(data);
    });

    it('delegates logPollination', () => {
      const instance = vi.mocked(GeneticsAPI).mock.instances[0];
      const data = { date: '2024-03-01', donor_plant_id: 'p1', receiver_plant_id: 'p2' };
      dataService.logPollination(data);
      expect(instance.logPollination).toHaveBeenCalledWith(data);
    });

    it('delegates updatePollination', () => {
      const instance = vi.mocked(GeneticsAPI).mock.instances[0];
      const data = { event_id: 'evt-1', notes: 'Updated' };
      dataService.updatePollination(data);
      expect(instance.updatePollination).toHaveBeenCalledWith(data);
    });

    it('delegates harvestSeeds', () => {
      const instance = vi.mocked(GeneticsAPI).mock.instances[0];
      const data = { event_id: 'evt-1', quantity: 20 };
      dataService.harvestSeeds(data);
      expect(instance.harvestSeeds).toHaveBeenCalledWith(data);
    });

    it('delegates deleteSeedBatch', () => {
      const instance = vi.mocked(GeneticsAPI).mock.instances[0];
      dataService.deleteSeedBatch('b1');
      expect(instance.deleteSeedBatch).toHaveBeenCalledWith('b1');
    });

    it('delegates sowSeed', () => {
      const instance = vi.mocked(GeneticsAPI).mock.instances[0];
      dataService.sowSeed('b1', 'p1');
      expect(instance.sowSeed).toHaveBeenCalledWith('b1', 'p1');
    });

    it('delegates deletePollination', () => {
      const instance = vi.mocked(GeneticsAPI).mock.instances[0];
      dataService.deletePollination('evt-1');
      expect(instance.deletePollination).toHaveBeenCalledWith('evt-1');
    });

    it('delegates setPlantSex', () => {
      const instance = vi.mocked(GeneticsAPI).mock.instances[0];
      dataService.setPlantSex('p1', 'female');
      expect(instance.setPlantSex).toHaveBeenCalledWith('p1', 'female');
    });

    it('delegates getLineageTree', () => {
      const instance = vi.mocked(GeneticsAPI).mock.instances[0];
      dataService.getLineageTree('p1');
      expect(instance.getLineageTree).toHaveBeenCalledWith('p1');
    });

    it('delegates getStrainLineageTree', () => {
      const instance = vi.mocked(GeneticsAPI).mock.instances[0];
      dataService.getStrainLineageTree('strain1');
      expect(instance.getStrainLineageTree).toHaveBeenCalledWith('strain1');
    });

    it('delegates updateStrainLineageTree', () => {
      const instance = vi.mocked(GeneticsAPI).mock.instances[0];
      const parents = [{ name: 'P1', source: 'library' as const }];
      dataService.updateStrainLineageTree('strain1', parents);
      expect(instance.updateStrainLineageTree).toHaveBeenCalledWith('strain1', parents);
    });

    it('delegates importStrainLineageTree', () => {
      const instance = vi.mocked(GeneticsAPI).mock.instances[0];
      const tree = { name: 'OG Kush', children: [] };
      dataService.importStrainLineageTree('OG Kush', tree);
      expect(instance.importStrainLineageTree).toHaveBeenCalledWith('OG Kush', tree);
    });
  });

  describe('AI/Vision/Camera/Report delegation', () => {
    it('delegates AI operations', () => {
      const instance = vi.mocked(AIAPI).mock.instances[0];
      dataService.askGrowAdvice('gs1', 'help');
      expect(instance.askGrowAdvice).toHaveBeenCalledWith('gs1', 'help');
    });

    it('delegates Vision operations', () => {
      const instance = vi.mocked(VisionAPI).mock.instances[0];
      dataService.triggerVisionCheckup('gs1');
      expect(instance.triggerVisionCheckup).toHaveBeenCalledWith('gs1');
    });

    it('delegates getVisionHistory', () => {
      const instance = vi.mocked(VisionAPI).mock.instances[0];
      dataService.getVisionHistory('gs1', 5);
      expect(instance.getVisionHistory).toHaveBeenCalledWith('gs1', 5);
    });

    it('delegates updateVisionCheckupConfig', () => {
      const instance = vi.mocked(VisionAPI).mock.instances[0];
      const config = { enabled: true, interval_hours: 12 } as any;
      dataService.updateVisionCheckupConfig('gs1', config);
      expect(instance.updateVisionCheckupConfig).toHaveBeenCalledWith('gs1', config);
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

  // SubareaAPI delegation removed — subarea operations now go through slices/subarea directly.

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
});
