import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DataService } from '../../src/services/data-service';
import { HomeAssistant } from 'custom-card-helpers';
import { WS_TYPE_GET_DATA } from '../../src/constants';

vi.mock('../../src/slices/nutrient', () => ({
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

// Strain operations now go through slices/strain, not StrainAPI
vi.mock('../../src/slices/strain', () => ({
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

import * as strainSlice from '../../src/slices/strain';
import * as nutrientSlice from '../../src/slices/nutrient';

describe('DataService Coverage Gap Fill', () => {
    let service: DataService;
    let mockHass: HomeAssistant;

    beforeEach(() => {
        service = new DataService();
        mockHass = {
            states: {},
            connection: {
                sendMessagePromise: vi.fn().mockResolvedValue({}),
            },
            callService: vi.fn(),
        } as any;
        service.updateHass(mockHass);
    });

    describe('fetchGrowspaceData Cache', () => {
        it('should return cached data if called twice within TTL', async () => {
            const mockData = {
                identity: { growspace_id: 'gs1', name: 'Cached GS', type: 'normal' },
                grid: { rows: 2, plants_per_row: 2, total_plants: 0, grid: {} },
                environment: {},
                sensors: { sensor_types: {}, sensor_coordinates: {}, sensor_groups: [] },
                irrigation: { irrigation_config: { irrigation_times: [], drain_times: [] } },
                metrics: { vpd_status: 'ok', granular_stage: 'unknown', is_day: false },
            };
            // First call - should hit API
            (mockHass.connection.sendMessagePromise as any).mockResolvedValueOnce(mockData);

            const result1 = await service.fetchGrowspaceData('gs1');
            expect((result1 as any).identity.growspace_id).toBe('gs1');
            expect(mockHass.connection.sendMessagePromise).toHaveBeenCalledTimes(1);

            // Second call - should hit Cache (no new API call)
            const result2 = await service.fetchGrowspaceData('gs1');
            expect((result2 as any).identity.growspace_id).toBe('gs1');
            expect(mockHass.connection.sendMessagePromise).toHaveBeenCalledTimes(1); // Call count remains 1
        });
    });

    describe('fetchStrainLibrary slice delegation', () => {
        it('delegates fetchStrainLibrary to strain slice', async () => {
            await service.fetchStrainLibrary();
            expect(strainSlice.fetchStrainLibrary).toHaveBeenCalled();
        });
    });

    describe('invalidateCache', () => {
        it('should invalidate specific growspace and collection', () => {
            const growspaceAPI = (service as any)._growspaceAPI;
            growspaceAPI._cache.set('g1', { data: {}, timestamp: Date.now() });
            growspaceAPI._cache.set('__all__', { data: {}, timestamp: Date.now() });
            growspaceAPI._cache.set('g2', { data: {}, timestamp: Date.now() });

            service.invalidateCache('g1');

            expect(growspaceAPI._cache.has('g1')).toBe(false);
            expect(growspaceAPI._cache.has('__all__')).toBe(false);
            expect(growspaceAPI._cache.has('g2')).toBe(true);
        });

        it('should invalidate all if no ID provided', () => {
            const growspaceAPI = (service as any)._growspaceAPI;
            growspaceAPI._cache.set('g1', { data: {}, timestamp: Date.now() });
            service.invalidateCache();
            expect(growspaceAPI._cache.size).toBe(0);
        });
    });

    describe('fetchNutrientInventory', () => {
        it('delegates to nutrient slice', async () => {
            await service.fetchNutrientInventory();
            expect(nutrientSlice.fetchNutrientInventory).toHaveBeenCalled();
        });
    });

    describe('Delegation Tests', () => {
        it('should delegate Growspace API calls', async () => {
            const spy = vi.spyOn((service as any)._growspaceAPI, 'getGrowspaceDevices');
            service.getGrowspaceDevices({});
            expect(spy).toHaveBeenCalled();

            const addSpy = vi.spyOn((service as any)._growspaceAPI, 'addGrowspace');
            service.addGrowspace({ name: 'test', rows: 1, plantsPerRow: 1 });
            expect(addSpy).toHaveBeenCalled();

            const updateSpy = vi.spyOn((service as any)._growspaceAPI, 'updateGrowspace');
            service.updateGrowspace({ growspaceId: 'g1', name: 'new name' });
            expect(updateSpy).toHaveBeenCalled();

            const removeSpy = vi.spyOn((service as any)._growspaceAPI, 'removeGrowspace');
            service.removeGrowspace('g1');
            expect(removeSpy).toHaveBeenCalled();

            const configSpy = vi.spyOn((service as any)._growspaceAPI, 'configureEnvironment');
            service.configureEnvironment({ growspaceId: 'g1' } as any);
            expect(configSpy).toHaveBeenCalled();

            const setDehumSpy = vi.spyOn((service as any)._growspaceAPI, 'setDehumidifierControl');
            service.setDehumidifierControl('g1', true);
            expect(setDehumSpy).toHaveBeenCalled();
        });

        it('should delegate Strain API calls to strain slice', async () => {
            vi.clearAllMocks();

            await service.fetchStrainLibrary();
            expect(strainSlice.fetchStrainLibrary).toHaveBeenCalled();

            await service.addStrain({ strain: 'S1' } as any);
            expect(strainSlice.addStrain).toHaveBeenCalled();

            await service.removeStrain('S1', 'pheno1');
            expect(strainSlice.removeStrain).toHaveBeenCalled();

            await service.exportStrainLibrary();
            expect(strainSlice.exportStrainLibrary).toHaveBeenCalled();

            await service.importStrainLibrary({} as any, true);
            expect(strainSlice.importStrainLibrary).toHaveBeenCalled();

            await service.clearStrainLibrary();
            expect(strainSlice.clearStrainLibrary).toHaveBeenCalled();
        });

        it('should delegate Nutrient calls to nutrient slice', async () => {
            service.fetchNutrientPresets();
            expect(nutrientSlice.fetchNutrientPresets).toHaveBeenCalled();

            service.updateNutrientStock('n1', 'N1', 100, 1000);
            expect(nutrientSlice.updateNutrientStock).toHaveBeenCalledWith('n1', 'N1', 100, 1000);

            service.removeNutrientStock('n1');
            expect(nutrientSlice.removeNutrientStock).toHaveBeenCalledWith('n1');

            service.fetchIPMPresets();
            expect(nutrientSlice.fetchIPMPresets).toHaveBeenCalled();

            service.saveIPMPreset({ name: 'IPM1', type: 'foliar', items: [] });
            expect(nutrientSlice.saveIPMPreset).toHaveBeenCalled();

            service.removeIPMPreset('ipm1');
            expect(nutrientSlice.removeIPMPreset).toHaveBeenCalledWith('ipm1');

            service.saveNutrientPreset({ name: 'Base', nutrients: [] });
            expect(nutrientSlice.saveNutrientPreset).toHaveBeenCalled();

            service.removeNutrientPreset('p1');
            expect(nutrientSlice.removeNutrientPreset).toHaveBeenCalledWith('p1');

            service.applyIPM({ preset_id: 'p1' });
            expect(nutrientSlice.applyIPM).toHaveBeenCalled();
        });

        it('should delegate History API calls', async () => {
            const batchSpy = vi.spyOn((service as any)._historyAPI, 'getBatchHistory');
            service.getBatchHistory(['e1'], new Date());
            expect(batchSpy).toHaveBeenCalled();

            const statsSpy = vi.spyOn((service as any)._historyAPI, 'getHistoryStats');
            service.getHistoryStats(['e1'], new Date());
            expect(statsSpy).toHaveBeenCalled();
        });

        it('should delegate Plant API calls', async () => {
            const addSpy = vi.spyOn((service as any)._plantAPI, 'addPlant');
            service.addPlant({ growspace_id: 'g1', row: 0, col: 0, strain: 'S1' });
            expect(addSpy).toHaveBeenCalled();

            const addManySpy = vi.spyOn((service as any)._plantAPI, 'addPlants');
            service.addPlants({ growspace_id: 'g1', strain: 'S1', amount: 5 });
            expect(addManySpy).toHaveBeenCalled();

            const updateSpy = vi.spyOn((service as any)._plantAPI, 'updatePlant');
            service.updatePlant({ plant_id: 'p1' });
            expect(updateSpy).toHaveBeenCalled();

            const removeSpy = vi.spyOn((service as any)._plantAPI, 'removePlant');
            service.removePlant('p1');
            expect(removeSpy).toHaveBeenCalled();

            const harvestSpy = vi.spyOn((service as any)._plantAPI, 'harvestPlant');
            service.harvestPlant('p1');
            expect(harvestSpy).toHaveBeenCalled();

            const cloneSpy = vi.spyOn((service as any)._plantAPI, 'takeClone');
            service.takeClone({ mother_plant_id: 'p1' });
            expect(cloneSpy).toHaveBeenCalled();

            const moveSpy = vi.spyOn((service as any)._plantAPI, 'moveClone');
            service.moveClone('p1', 'g2');
            expect(moveSpy).toHaveBeenCalled();

            const swapSpy = vi.spyOn((service as any)._plantAPI, 'swapPlants');
            service.swapPlants('p1', 'p2');
            expect(swapSpy).toHaveBeenCalled();

            const waterSpy = vi.spyOn((service as any)._plantAPI, 'waterPlant');
            service.waterPlant('p1', 500);
            expect(waterSpy).toHaveBeenCalled();
        });

        it('should delegate Irrigation API calls', async () => {
            const setSettingsSpy = vi.spyOn((service as any)._irrigationAPI, 'setIrrigationSettings');
            service.setIrrigationSettings({ growspaceId: 'g1' } as any);
            expect(setSettingsSpy).toHaveBeenCalled();

            const addIrrSpy = vi.spyOn((service as any)._irrigationAPI, 'addIrrigationTime');
            service.addIrrigationTime({ growspaceId: 'g1', time: '10:00' });
            expect(addIrrSpy).toHaveBeenCalled();

            const remIrrSpy = vi.spyOn((service as any)._irrigationAPI, 'removeIrrigationTime');
            service.removeIrrigationTime({ growspaceId: 'g1', time: '10:00' });
            expect(remIrrSpy).toHaveBeenCalled();

            const addDrainSpy = vi.spyOn((service as any)._irrigationAPI, 'addDrainTime');
            service.addDrainTime({ growspaceId: 'g1', time: '10:00' });
            expect(addDrainSpy).toHaveBeenCalled();

            const remDrainSpy = vi.spyOn((service as any)._irrigationAPI, 'removeDrainTime');
            service.removeDrainTime({ growspaceId: 'g1', time: '10:00' });
            expect(remDrainSpy).toHaveBeenCalled();

            const strategySpy = vi.spyOn((service as any)._irrigationAPI, 'setIrrigationStrategy');
            service.setIrrigationStrategy('g1', {});
            expect(strategySpy).toHaveBeenCalled();

            const waterSpy = vi.spyOn((service as any)._irrigationAPI, 'waterGrowspace');
            service.waterGrowspace('g1', 1000);
            expect(waterSpy).toHaveBeenCalled();
        });

        it('should delegate AI API calls', async () => {
            const adviseSpy = vi.spyOn((service as any)._aiAPI, 'askGrowAdvice');
            service.askGrowAdvice('g1', 'help');
            expect(adviseSpy).toHaveBeenCalled();

            const analyzeSpy = vi.spyOn((service as any)._aiAPI, 'analyzeAllGrowspaces');
            service.analyzeAllGrowspaces();
            expect(analyzeSpy).toHaveBeenCalled();

            const recSpy = vi.spyOn((service as any)._aiAPI, 'getStrainRecommendation');
            service.getStrainRecommendation('something fruity');
            expect(recSpy).toHaveBeenCalled();
        });
    });
});
