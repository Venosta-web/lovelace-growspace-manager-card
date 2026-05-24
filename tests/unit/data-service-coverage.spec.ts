import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DataService } from '../../src/services/data-service';
import { HomeAssistant } from 'custom-card-helpers';
import { WS_TYPE_GET_DATA, WS_TYPE_GET_NUTRIENT_INVENTORY } from '../../src/constants';

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

    describe('getStrainLibrary Entity Lookup', () => {
        it('should find library in known entity sensor.strain_library', () => {
            service.updateHass({
                states: {
                    'sensor.strain_library': {
                        attributes: {
                            strains: ['Strain A', 'Strain B']
                        }
                    }
                }
            } as any);

            const strains = service.getStrainLibrary();
            expect(strains).toHaveLength(2);
            expect(strains[0].strain).toBe('Strain A');
        });

        it('should find library in known entity sensor.growspace_manager_strain_library', () => {
            service.updateHass({
                states: {
                    'sensor.growspace_manager_strain_library': {
                        attributes: {
                            strains: ['Strain C']
                        }
                    }
                }
            } as any);

            const strains = service.getStrainLibrary();
            expect(strains).toHaveLength(1);
            expect(strains[0].strain).toBe('Strain C');
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
        it('should strictly return parsed data on success', async () => {
            const mockInventory = {
                nutrients: {
                    'n1': { id: 'n1', name: 'N1', type: 'Bottle', current_ml: 100, initial_ml: 1000 }
                }
            };
            (mockHass.connection.sendMessagePromise as any).mockResolvedValue(mockInventory);

            const result = await service.fetchNutrientInventory();
            expect(result).toEqual(mockInventory);
            expect(mockHass.connection.sendMessagePromise).toHaveBeenCalledWith({
                type: WS_TYPE_GET_NUTRIENT_INVENTORY
            });
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

        it('should delegate Strain API calls', async () => {
            const fetchSpy = vi.spyOn((service as any)._strainAPI, 'fetchStrainLibrary');
            service.fetchStrainLibrary();
            expect(fetchSpy).toHaveBeenCalled();

            const addSpy = vi.spyOn((service as any)._strainAPI, 'addStrain');
            service.addStrain({ strain: 'S1' });
            expect(addSpy).toHaveBeenCalled();

            const removeSpy = vi.spyOn((service as any)._strainAPI, 'removeStrain');
            service.removeStrain('S1');
            expect(removeSpy).toHaveBeenCalled();

            const exportSpy = vi.spyOn((service as any)._strainAPI, 'exportStrainLibrary');
            service.exportStrainLibrary();
            expect(exportSpy).toHaveBeenCalled();

            const importSpy = vi.spyOn((service as any)._strainAPI, 'importStrainLibrary');
            service.importStrainLibrary({} as any, true);
            expect(importSpy).toHaveBeenCalled();

            const clearSpy = vi.spyOn((service as any)._strainAPI, 'clearStrainLibrary');
            service.clearStrainLibrary();
            expect(clearSpy).toHaveBeenCalled();
        });

        it('should delegate Nutrient API calls', async () => {
            const fetchPresetsSpy = vi.spyOn((service as any)._nutrientAPI, 'fetchNutrientPresets');
            service.fetchNutrientPresets();
            expect(fetchPresetsSpy).toHaveBeenCalled();

            const updateStockSpy = vi.spyOn((service as any)._nutrientAPI, 'updateNutrientStock');
            service.updateNutrientStock('n1', 'N1', 100, 1000);
            expect(updateStockSpy).toHaveBeenCalled();

            const removeStockSpy = vi.spyOn((service as any)._nutrientAPI, 'removeNutrientStock');
            service.removeNutrientStock('n1');
            expect(removeStockSpy).toHaveBeenCalled();

            const fetchIPMSpy = vi.spyOn((service as any)._nutrientAPI, 'fetchIPMPresets');
            service.fetchIPMPresets();
            expect(fetchIPMSpy).toHaveBeenCalled();

            const saveIPMSpy = vi.spyOn((service as any)._nutrientAPI, 'saveIPMPreset');
            service.saveIPMPreset({ name: 'IPM1', type: 'Foliar', items: [] });
            expect(saveIPMSpy).toHaveBeenCalled();

            const removeIPMSpy = vi.spyOn((service as any)._nutrientAPI, 'removeIPMPreset');
            service.removeIPMPreset('ipm1');
            expect(removeIPMSpy).toHaveBeenCalled();

            const saveNutrientSpy = vi.spyOn((service as any)._nutrientAPI, 'saveNutrientPreset');
            service.saveNutrientPreset({ name: 'Base', nutrients: [] });
            expect(saveNutrientSpy).toHaveBeenCalled();

            const removeNutrientSpy = vi.spyOn((service as any)._nutrientAPI, 'removeNutrientPreset');
            service.removeNutrientPreset('p1');
            expect(removeNutrientSpy).toHaveBeenCalled();

            const applyIPMSpy = vi.spyOn((service as any)._nutrientAPI, 'applyIPM');
            service.applyIPM({ preset_id: 'p1' });
            expect(applyIPMSpy).toHaveBeenCalled();
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
