
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GrowspaceStore } from '../../src/store/growspace-store';
import * as _uiStore from '../../src/store/ui-store';
import * as _dataStore from '../../src/store/data-store';

const uiStore = _uiStore as any;
const dataStore = _dataStore as any;

// Mock ui-store
vi.mock('../../src/store/ui-store', () => {
    const atoms = {
        $activeDialog: { get: vi.fn(() => ({ type: 'NONE' })), set: vi.fn(), subscribe: vi.fn() },
        $focusedPlantIndex: { get: vi.fn(() => -1), set: vi.fn(), subscribe: vi.fn() },
        $selectedPlants: { get: vi.fn(() => new Set()), set: vi.fn(), subscribe: vi.fn() },
        $isEditMode: { get: vi.fn(() => false), set: vi.fn(), subscribe: vi.fn() },
        $viewMode: { get: vi.fn(() => 'standard'), set: vi.fn(), subscribe: vi.fn() },
        $defaultApplied: { get: vi.fn(() => false), set: vi.fn(), subscribe: vi.fn() },
        $isLoading: { get: vi.fn(() => false), set: vi.fn(), subscribe: vi.fn() },
        $notification: { set: vi.fn() },
        $menuOpen: { get: vi.fn(() => false), set: vi.fn(), subscribe: vi.fn() },
    };
    const actions = {
        setEditMode: vi.fn((v) => atoms.$isEditMode.set(v)),
        setViewMode: vi.fn((v) => atoms.$viewMode.set(v)),
        setIsLoading: vi.fn((v) => atoms.$isLoading.set(v)),
        setActiveDialog: vi.fn((v) => atoms.$activeDialog.set(v)),
        closeDialog: vi.fn(() => atoms.$activeDialog.set({ type: 'NONE' })),
        setDefaultApplied: vi.fn((v) => atoms.$defaultApplied.set(v)),
        setFocusedPlantIndex: vi.fn((v) => atoms.$focusedPlantIndex.set(v)),
        togglePlantSelection: vi.fn(),
        selectAllPlants: vi.fn(),
        clearPlantSelection: vi.fn(),
        deselectPlants: vi.fn(),
        setMenuOpen: vi.fn((v) => atoms.$menuOpen.set(v)),
        showToast: vi.fn(),
        clearToast: vi.fn(),
    };
    const mocks = { ...atoms, ...actions };
    return {
        ...mocks,
        GrowspaceUIStore: class {
            constructor() {
                Object.assign(this, mocks);
            }
        }
    };
});

// Mock data-store
vi.mock('../../src/store/data-store', () => {
    const atoms = {
        $devices: { get: vi.fn(() => []), set: vi.fn(), subscribe: vi.fn() },
        $selectedDevice: { get: vi.fn(() => null), set: vi.fn(), subscribe: vi.fn() },
        $strainLibrary: { get: vi.fn(() => []), set: vi.fn(), subscribe: vi.fn() },
        $config: { get: vi.fn(() => ({})), set: vi.fn(), subscribe: vi.fn() },
        $optimisticDeletedPlantIds: { get: vi.fn(() => new Set()), set: vi.fn(), subscribe: vi.fn() },
        $wsDataCache: { get: vi.fn(() => ({})), set: vi.fn(), subscribe: vi.fn() },
        $plantToDeviceMap: { get: vi.fn(() => new Map()), set: vi.fn(), subscribe: vi.fn() },
        $nutrientPresets: { get: vi.fn(() => ({})), set: vi.fn(), subscribe: vi.fn() },
        $ipmPresets: { get: vi.fn(() => ({})), set: vi.fn(), subscribe: vi.fn() },
    };
    const actions = {
        setDevices: vi.fn((v) => atoms.$devices.set(v)),
        setSelectedDevice: vi.fn((v) => atoms.$selectedDevice.set(v)),
        setStrainLibrary: vi.fn((v) => atoms.$strainLibrary.set(v)),
        setConfig: vi.fn((v) => atoms.$config.set(v)),
        addOptimisticDeletedPlantId: vi.fn(),
        removeOptimisticDeletedPlantId: vi.fn(),
        setWsDataCache: vi.fn((v) => atoms.$wsDataCache.set(v)),
        updateWsDataCacheGrid: vi.fn(),
        removePlantFromWsCache: vi.fn(),
        setNutrientPresets: vi.fn((v) => atoms.$nutrientPresets.set(v)),
        setIPMPresets: vi.fn((v) => atoms.$ipmPresets.set(v)),
    };
    const mocks = { ...atoms, ...actions };
    return {
        ...mocks,
        GrowspaceDataStore: class {
            $devices = atoms.$devices;
            $strainLibrary = atoms.$strainLibrary;
            $config = atoms.$config;
            $optimisticDeletedPlantIds = atoms.$optimisticDeletedPlantIds;
            $wsDataCache = atoms.$wsDataCache;
            $selectedDevice = atoms.$selectedDevice;
            $plantToDeviceMap = atoms.$plantToDeviceMap;
            $nutrientPresets = atoms.$nutrientPresets;
            $ipmPresets = atoms.$ipmPresets;

            setDevices = actions.setDevices;
            setSelectedDevice = actions.setSelectedDevice;
            setConfig = actions.setConfig;
            setStrainLibrary = actions.setStrainLibrary;
            addOptimisticDeletedPlantId = actions.addOptimisticDeletedPlantId;
            removeOptimisticDeletedPlantId = actions.removeOptimisticDeletedPlantId;
            setWsDataCache = actions.setWsDataCache;
            updateWsDataCacheGrid = actions.updateWsDataCacheGrid;
            removePlantFromWsCache = actions.removePlantFromWsCache;
            setNutrientPresets = actions.setNutrientPresets;
            setIPMPresets = actions.setIPMPresets;

            constructor() {
                // Properties assigned via class fields
            }

            get devices() { return this.$devices.get(); }
            get selectedDevice() { return this.$selectedDevice.get(); }
            get strainLibrary() { return this.$strainLibrary.get(); }
            get config() { return this.$config.get(); }
            get optimisticDeletedPlantIds() { return this.$optimisticDeletedPlantIds.get(); }
            get wsDataCache() { return this.$wsDataCache.get(); }
            get plantToDeviceMap() { return this.$plantToDeviceMap.get(); }
            get nutrientPresets() { return this.$nutrientPresets.get(); }
            get ipmPresets() { return this.$ipmPresets.get(); }
        }
    };
});

// Mock DataService
const mockDataServiceInstance: any = {
    getGrowspaceDevices: vi.fn(),
    harvestPlant: vi.fn().mockResolvedValue({}),
    moveClone: vi.fn().mockResolvedValue({}),
    fetchStrainLibrary: vi.fn().mockResolvedValue([]),
    addStrain: vi.fn().mockResolvedValue({}),
    removeStrain: vi.fn().mockResolvedValue({}),
    updateHass: vi.fn(function(this: any, h) { this.hass = h; }),
    updateGrowspace: vi.fn().mockResolvedValue({}),
    updatePlant: vi.fn().mockResolvedValue({}),
    addPlant: vi.fn().mockResolvedValue({}),
    addPlants: vi.fn().mockResolvedValue({}),
    removePlant: vi.fn().mockResolvedValue({}),
    fetchGrowspaceData: vi.fn().mockResolvedValue({}),
    swapPlants: vi.fn().mockResolvedValue({}),
    addGrowspace: vi.fn().mockResolvedValue({}),
    movePlant: vi.fn().mockResolvedValue({}),
    analyzeAllGrowspaces: vi.fn().mockResolvedValue({ response: 'Advice' }),
    askGrowAdvice: vi.fn().mockResolvedValue({ response: 'Advice' }),
    getStrainRecommendation: vi.fn().mockResolvedValue({ response: 'Strain' }),
    exportStrainLibrary: vi.fn().mockResolvedValue({}),
    importStrainLibrary: vi.fn().mockResolvedValue({ imported_count: 5 }),
    setDehumidifierControl: vi.fn().mockResolvedValue({}),
    takeClone: vi.fn().mockResolvedValue({}),
    callService: vi.fn().mockResolvedValue({}),
    fetchNutrientPresets: vi.fn().mockResolvedValue({}),
    fetchIPMPresets: vi.fn().mockResolvedValue({}),
    hass: { connection: {} } // Default to avoid early returns
};

vi.mock('../../src/data-service', () => {
    return {
        DataService: class {
            constructor() {
                return mockDataServiceInstance;
            }
        }
    };
});

// Helper
const createMockHass = () => ({
    states: {},
    services: {
        call: vi.fn(),
    },
    connection: {
        subscribeMessage: vi.fn(),
        sendMessagePromise: vi.fn(),
    },
    callService: vi.fn(),
} as any);

describe('GrowspaceStore Branch Coverage', () => {
    let store: GrowspaceStore;

    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        store = new GrowspaceStore();
        store.hass = { connection: { sendMessagePromise: vi.fn(), subscribeEvents: vi.fn() } } as any;

        // Default mock behaviors needed for basic ops
        (dataStore.$optimisticDeletedPlantIds.get as any).mockReturnValue(new Set());
        mockDataServiceInstance.getGrowspaceDevices.mockReturnValue([]);
    });

    describe('Optimization Logic', () => {
        it('should track environment sensor entities', async () => {
            // 1. Mock DataService to return a device with env attributes
            const mockDevices = [{
                device_id: 'd1',
                name: 'D1',
                plants: [],
                environment_attributes: {
                    temperature_sensor: 'sensor.temp',
                    humidity_sensor: 'sensor.hum',
                    simple_value: 123
                }
            }];

            (store.dataService.getGrowspaceDevices as any).mockReturnValue(mockDevices);
            // Verify this fix: ensure cache is not empty so we skip "initial fetch" block
            (store.data.$wsDataCache.get as any).mockReturnValue({ 'd1': {} });
            store.data.setWsDataCache({ 'd1': {} } as any); // Trigger update logic path

            // 2. Trigger update 
            // We need to bypass the "no cache" check or ensure cache is populated
            // updateDevicesState is called when we updateHass if cache exists
            const hass = createMockHass();
            store.updateHass(hass);

            // 3. Verify watched entities
            // Accessed via private property casting on syncService
            const watched = (store.syncService as any)._watchedEntities as Set<string>;
            expect(watched.has('sensor.temp')).toBe(true);
            expect(watched.has('sensor.hum')).toBe(true);
            expect(watched.size).toBeGreaterThanOrEqual(2);
        });

        it('should skip update if watched entities have not changed', () => {
            // Setup initial state with watched entity
            const mockDevices = [{
                device_id: 'd1',
                plants: [{ entity_id: 'sensor.plant1', attributes: { plant_id: 'p1' } } as any],
            }];
            (store.dataService.getGrowspaceDevices as any).mockReturnValue(mockDevices);
            store.data.setWsDataCache({ 'd1': {} } as any);

            // Initial HASS
            const hass1 = createMockHass();
            hass1.states['sensor.plant1'] = { state: 'ok', last_updated: 't1' } as any;
            store.updateHass(hass1);

            // Verify watched on syncService
            const watched = (store.syncService as any)._watchedEntities as Set<string>;
            expect(watched.has('sensor.plant1')).toBe(true);

            // Spy on internal update on syncService
            const updateSpy = vi.spyOn(store.syncService as any, 'updateDevicesState');

            // Second HASS: Different ref, same state for watched entity
            const hass2 = { ...hass1, states: { ...hass1.states } } as any; // Shallow copy
            store.updateHass(hass2);

            expect(updateSpy).not.toHaveBeenCalled();
        });

        it('should proceed with update if watched entity changed', () => {
            // Setup
            const mockDevices = [{
                device_id: 'd1',
                plants: [{ entity_id: 'sensor.plant1', attributes: { plant_id: 'p1' } } as any],
            }];
            (store.dataService.getGrowspaceDevices as any).mockReturnValue(mockDevices);
            store.data.setWsDataCache({ 'd1': {} } as any);

            const hass1 = createMockHass();
            hass1.states['sensor.plant1'] = { state: 'ok', last_updated: 't1' } as any;
            store.updateHass(hass1);

            const updateSpy = vi.spyOn(store.syncService as any, 'updateDevicesState');

            // HASS 2: Change state
            const hass2 = {
                ...hass1,
                states: {
                    ...hass1.states,
                    'sensor.plant1': { state: 'problem', last_updated: 't2' }
                }
            } as any;
            store.updateHass(hass2);

            expect(updateSpy).toHaveBeenCalled();
        });
    });

    describe('Undo/Redo & State Handling', () => {
        it('should updateHass and skip refresh if cache populated', () => {
            (dataStore.$wsDataCache.get as any).mockReturnValue({ 'd1': {} });
            store.updateHass({ connection: {} } as any);
            expect(mockDataServiceInstance.fetchGrowspaceData).not.toHaveBeenCalled();
        });

        it('should handle undo stack overflow', () => {
            store.pushUndoAction({ type: 'move', description: '1', reverse: async () => { }, redo: async () => { } });
            store.pushUndoAction({ type: 'move', description: '2', reverse: async () => { }, redo: async () => { } });
            store.pushUndoAction({ type: 'move', description: '3', reverse: async () => { }, redo: async () => { } });

            expect(store.canUndo).toBe(true);

            store.pushUndoAction({ type: 'move', description: '4', reverse: async () => { }, redo: async () => { } });

            // Check private stack length if possible or just ensure no error
        });

        it('should clear redo stack on new action', async () => {
            store.pushUndoAction({ type: 'move', description: '1', reverse: async () => { }, redo: async () => { } });
            await store.undo();
            expect(store.canRedo).toBe(true);

            store.pushUndoAction({ type: 'move', description: '2', reverse: async () => { }, redo: async () => { } });
            expect(store.canRedo).toBe(false);
        });

        it('should handle undo error', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            store.pushUndoAction({
                type: 'move',
                description: 'Bad',
                reverse: async () => { throw new Error('Undo Fail'); },
                redo: async () => { }
            });

            await store.undo();

            expect(uiStore.showToast).toHaveBeenLastCalledWith('Undo failed', 'error', undefined);
            expect(consoleSpy).toHaveBeenCalledWith('[Undo failed]', expect.any(Error));
        });

        it('should handle redo error', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            store.pushUndoAction({
                type: 'move',
                description: 'Bad',
                reverse: async () => { },
                redo: async () => { throw new Error('Redo Fail'); }
            });

            await store.undo(); // Move to redo stack
            await store.redo();

            expect(uiStore.showToast).toHaveBeenLastCalledWith('Redo failed', 'error', undefined);
            expect(consoleSpy).toHaveBeenCalledWith('[Redo failed]', expect.any(Error));
        });

        it('should execute undo callback from toast', () => {
            const undoSpy = vi.spyOn(store.undoRedoManager, 'undo').mockImplementation(async () => { });
            store.pushUndoAction({ type: 'move', description: 'Action', reverse: async () => { }, redo: async () => { } });

            // Capture the toast call
            // uiStore.showToast is mocked, we check the last call's 3rd argument (action object)
            expect(uiStore.showToast).toHaveBeenCalled();
            const calls = (uiStore.showToast as any).mock.calls;
            const lastCall = calls[calls.length - 1];
            expect(lastCall[2].label).toBe('Undo');

            // Execute callback
            lastCall[2].callback();
            expect(undoSpy).toHaveBeenCalled();
        });

        it('should safe guard undo/redo when empty', async () => {
            await store.redo();
            await store.undo();
        });
    });

    describe('Batch Actions', () => {
        it('should handle batch remove success', async () => {
            const ids = ['p1', 'p2'];
            await store.batchAction('remove', ids);

            // Optimistic update
            expect(dataStore.addOptimisticDeletedPlantId).toHaveBeenCalledTimes(2);
            expect(dataStore.addOptimisticDeletedPlantId).toHaveBeenCalledWith('p1');

            // Service call
            expect(store.dataService.callService).toHaveBeenCalledWith('growspace_manager', 'batch_action', {
                entity_ids: ids,
                action: 'remove',
                data: {}
            });

            // Cleanup
            expect(uiStore.clearPlantSelection).toHaveBeenCalled();
            expect(uiStore.setEditMode).toHaveBeenCalledWith(false);

            // Success Toast
            expect(uiStore.showToast).toHaveBeenCalledWith(expect.stringContaining('completed'), 'success', undefined);
        });

        it('should rollback optimistic remove on error', async () => {
            const ids = ['p1'];
            // Mock failure
            mockDataServiceInstance.callService.mockRejectedValue(new Error('Batch Fail'));
            const spy = vi.spyOn(console, 'error').mockImplementation(() => { });

            await store.batchAction('remove', ids);

            expect(dataStore.addOptimisticDeletedPlantId).toHaveBeenCalledWith('p1');
            expect(store.dataService.callService).toHaveBeenCalled();

            // Rollback
            expect(dataStore.removeOptimisticDeletedPlantId).toHaveBeenCalledWith('p1');
            expect(uiStore.showToast).toHaveBeenCalledWith(expect.stringContaining('Batch remove failed'), 'error', undefined);
        });

        it('should handle batch transition', async () => {
            const ids = ['p1'];
            await store.batchAction('transition', ids, { stage: 'flower' });

            expect(store.dataService.callService).toHaveBeenCalledWith('growspace_manager', 'batch_action', {
                entity_ids: ids,
                action: 'transition',
                data: { stage: 'flower' }
            });

            // No optimistic deletion for transition
            expect(dataStore.addOptimisticDeletedPlantId).not.toHaveBeenCalled();
        });

        it('should do nothing if no ids provided', async () => {
            await store.batchAction('remove', []);
            expect(store.dataService.callService).not.toHaveBeenCalled();
        });
    });

    describe('Preset Fetching', () => {
        it('should handle fetchNutrientPresets success and caching', async () => {
            const presets = { 'p1': { id: 'p1', name: 'P1' } };
            mockDataServiceInstance.fetchNutrientPresets.mockResolvedValue(presets);
            await store.fetchNutrientPresets();
            expect(mockDataServiceInstance.fetchNutrientPresets).toHaveBeenCalled();
            // Verify cache
            const cache = JSON.parse(localStorage.getItem('growspace_nutrient_presets') || '{}');
            expect(cache.data).toEqual(presets);
        });

        it('should use valid cache for nutrient presets', async () => {
            const presets = { 'p1': { id: 'p1', name: 'Cached' } };
            const cache = { timestamp: Date.now(), data: presets };
            localStorage.setItem('growspace_nutrient_presets', JSON.stringify(cache));

            mockDataServiceInstance.fetchNutrientPresets.mockClear();
            await store.fetchNutrientPresets();
            expect(mockDataServiceInstance.fetchNutrientPresets).not.toHaveBeenCalled();
            expect(store.data.setNutrientPresets).toHaveBeenCalledWith(presets);
        });

        it('should ignore expired cache', async () => {
            // 1 hour + 1 ms
            const presets = { 'p1': { id: 'p1', name: 'Expired' } };
            const cache = { timestamp: Date.now() - (60 * 60 * 1000 + 100), data: presets };
            localStorage.setItem('growspace_nutrient_presets', JSON.stringify(cache));

            mockDataServiceInstance.fetchNutrientPresets.mockResolvedValue({});
            await store.fetchNutrientPresets();
            expect(mockDataServiceInstance.fetchNutrientPresets).toHaveBeenCalled();
        });

        it('should handle corrupt cache', async () => {
            localStorage.setItem('growspace_nutrient_presets', 'invalid json');
            mockDataServiceInstance.fetchNutrientPresets.mockResolvedValue({});
            await store.fetchNutrientPresets();
            expect(localStorage.getItem('growspace_nutrient_presets')).not.toBe('invalid json');
            expect(mockDataServiceInstance.fetchNutrientPresets).toHaveBeenCalled();
        });

        it('should handle fetch error', async () => {
            const spy = vi.spyOn(console, 'error').mockImplementation(() => { });
            mockDataServiceInstance.fetchNutrientPresets.mockRejectedValue(new Error('Fetch Fail'));
            await store.fetchNutrientPresets(true);
            expect(spy).toHaveBeenCalledWith('Failed to fetch nutrient presets:', expect.any(Error));
        });

        it('should fetch IPM presets with similar logic', async () => {
            const presets = { 'p1': { id: 'p1', name: 'IPM1' } };
            mockDataServiceInstance.fetchIPMPresets.mockResolvedValue(presets);
            await store.fetchIPMPresets();
            expect(mockDataServiceInstance.fetchIPMPresets).toHaveBeenCalled();
        });

        it('should handle corrupt IPM cache', async () => {
            localStorage.setItem('growspace_ipm_presets', 'invalid json');
            mockDataServiceInstance.fetchIPMPresets.mockResolvedValue({});
            await store.fetchIPMPresets();
            expect(localStorage.getItem('growspace_ipm_presets')).not.toBe('invalid json');
            expect(mockDataServiceInstance.fetchIPMPresets).toHaveBeenCalled();
        });

        it('should handle IPM fetch error', async () => {
            const spy = vi.spyOn(console, 'error').mockImplementation(() => { });
            mockDataServiceInstance.fetchIPMPresets.mockRejectedValue(new Error('IPM Fail'));
            await store.fetchIPMPresets(true);
            expect(spy).toHaveBeenCalledWith('Failed to fetch IPM presets:', expect.any(Error));
        });
    });



    describe('Additional Coverage', () => {
        it('should handle handleDrop swap logic', async () => {
            const source = { entity_id: 's1', attributes: { plant_id: 'p1', strain: 'S1', row: 1, col: 1 } } as any;
            const target = { entity_id: 's2', attributes: { plant_id: 'p2', strain: 'S2', row: 2, col: 2 } } as any;
            (dataStore.$selectedDevice.get as any).mockReturnValue('d1');

            // Pass through plantActions real logic (which uses mocked service)
            // or we might need to rely on the fact that plantActions calls service.
            // But plantActions is not mocked here.
            // We assume plantAction calls move/swap which calls service.

            // Note: Since plantActions is not mocked, it will execute logic.
            // We need to ensure dependencies for plantActions work.
            // plantActions.handlePlantDrop calls swapPlants on service if target exists.

            await store.handleDrop(2, 2, target, source);

            // Verify undo action pushed
            expect(store.canUndo).toBe(true);

            // Undo (Swap back)
            await store.undo();
            expect(mockDataServiceInstance.swapPlants).toHaveBeenCalledWith('p1', 'p2');
        });

        it('should handle handleDrop move to empty logic', async () => {
            const source = { entity_id: 's1', attributes: { plant_id: 'p1', strain: 'S1', row: 1, col: 1 } } as any;
            (dataStore.$selectedDevice.get as any).mockReturnValue('d1');

            await store.handleDrop(3, 3, null, source);

            // Undo (Move back to 1,1)
            await store.undo();
            // plantActions.movePlantPosition -> service.updatePlant
            expect(mockDataServiceInstance.updatePlant).toHaveBeenCalledWith(expect.objectContaining({
                plant_id: 'p1',
                row: 1,
                col: 1
            }));
        });

        it('should handle _refreshGrowspaceData error and loading state', async () => {
            const spy = vi.spyOn(console, 'error').mockImplementation(() => { });
            mockDataServiceInstance.fetchGrowspaceData.mockRejectedValue(new Error('Fetch API Fail'));

            // Force loading check
            (dataStore.$devices.get as any).mockReturnValue([]);

            await store.refreshData();

            expect(uiStore.setIsLoading).toHaveBeenCalledWith(true);
            expect(spy).toHaveBeenCalledWith('Failed to fetch growspace data', expect.any(Error));
            expect(uiStore.setIsLoading).toHaveBeenCalledWith(false);
        });

        it('should find next available slot in openAddPlantDialog', () => {
            (dataStore.$selectedDevice.get as any).mockReturnValue('d1');
            const plants = [
                { attributes: { row: 1, col: 1, plant_id: 'p1' } }, // 0,0 occupied
                // 0,1 empty
            ];
            (dataStore.$devices.get as any).mockReturnValue([{
                device_id: 'd1',
                rows: 2,
                plants_per_row: 2,
                plants
            }]);

            store.openAddPlantDialog();

            expect(uiStore.setActiveDialog).toHaveBeenCalledWith({
                type: 'ADD_PLANT',
                payload: { row: 0, col: 1 }
            });
        });

        it('should handle openBatchWateringDialog mixed growspaces', () => {
            const selectedIds = new Set(['p1', 'p2']);
            (uiStore.$selectedPlants.get as any).mockReturnValue(selectedIds);

            const map = new Map();
            map.set('p1', 'd1');
            map.set('p2', 'd2'); // Mixed
            (dataStore.$plantToDeviceMap.get as any).mockReturnValue(map);

            store.openBatchWateringDialog();

            expect(uiStore.setActiveDialog).toHaveBeenCalledWith({
                type: 'WATERING',
                payload: expect.objectContaining({ growspaceId: undefined })
            });
        });

        it('should handle getStrainRecommendation responses', async () => {
            (uiStore.$activeDialog.get as any).mockReturnValue({ type: 'STRAIN_RECOMMENDATION', payload: {} });

            // 1. String response
            mockDataServiceInstance.getStrainRecommendation.mockResolvedValue('Just text');
            await store.getStrainRecommendation('query');
            expect(uiStore.setActiveDialog).toHaveBeenCalledWith(expect.objectContaining({
                payload: expect.objectContaining({ response: 'Just text' })
            }));

            // 2. Object with response string
            mockDataServiceInstance.getStrainRecommendation.mockResolvedValue({ response: 'Nested text' });
            await store.getStrainRecommendation('query');
            expect(uiStore.setActiveDialog).toHaveBeenCalledWith(expect.objectContaining({
                payload: expect.objectContaining({ response: 'Nested text' })
            }));
        });

        it('should handle openBatchTrainingDialog', () => {
            const selectedIds = new Set(['p1']);
            (uiStore.$selectedPlants.get as any).mockReturnValue(selectedIds);
            const map = new Map();
            map.set('p1', 'd1');
            (dataStore.$plantToDeviceMap.get as any).mockReturnValue(map);

            store.openBatchTrainingDialog();

            expect(uiStore.setActiveDialog).toHaveBeenCalledWith({
                type: 'TRAINING',
                payload: expect.objectContaining({
                    isOpen: true,
                    growspaceId: 'd1',
                    plantIds: ['p1']
                })
            });
        });
        it('should handle addBatch action success', async () => {
            (dataStore.$selectedDevice.get as any).mockReturnValue('d1');
            mockDataServiceInstance.addPlants = vi.fn().mockResolvedValue({});

            await store.actions.plant.addBatch({ count: 5 });

            expect(mockDataServiceInstance.addPlants).toHaveBeenCalledWith({ growspace_id: 'd1', count: 5 });
            expect(uiStore.closeDialog).toHaveBeenCalled();
        });

        it('should handle addBatch action failure', async () => {
            (dataStore.$selectedDevice.get as any).mockReturnValue('d1');
            // showToast is mocked
            mockDataServiceInstance.addPlants = vi.fn().mockRejectedValue(new Error('Batch Fail'));

            await store.actions.plant.addBatch({ count: 5 });

            expect(uiStore.showToast).toHaveBeenCalledWith('Error: Batch Fail', 'error', undefined);
        });

        it('should handle addBatch with no device selected', async () => {
            (dataStore.$selectedDevice.get as any).mockReturnValue(null);
            await store.actions.plant.addBatch({});
            expect(uiStore.showToast).toHaveBeenCalledWith('No growspace selected', 'error', undefined);
        });
        it('should handle openIPMDialog defaults', () => {
            (dataStore.$selectedDevice.get as any).mockReturnValue('d1');
            store.openIPMDialog();
            expect(uiStore.setActiveDialog).toHaveBeenCalledWith(expect.objectContaining({
                type: 'IPM',
                payload: { growspaceId: 'd1', plantIds: undefined }
            }));
        });

        it('should handle openIPMDialog with context', () => {
            store.openIPMDialog({ growspaceId: 'd2' });
            expect(uiStore.setActiveDialog).toHaveBeenCalledWith(expect.objectContaining({
                type: 'IPM',
                payload: { growspaceId: 'd2' }
            }));
        });

        it('should handle openIPMDialog with plantIds should not set growspaceId from selection', () => {
            (dataStore.$selectedDevice.get as any).mockReturnValue('d1');
            store.openIPMDialog({ plantIds: ['p1'] });
            expect(uiStore.setActiveDialog).toHaveBeenCalledWith(expect.objectContaining({
                type: 'IPM',
                payload: { growspaceId: undefined, plantIds: ['p1'] }
            }));
        });

        it('should handle batchAction unknown error', async () => {
            mockDataServiceInstance.callService.mockRejectedValue({}); // No message
            await store.batchAction('remove', ['p1']);
            expect(uiStore.showToast).toHaveBeenCalledWith('Batch remove failed: Unknown error', 'error', undefined);
        });

        it('should handle export library success', async () => {
            mockDataServiceInstance.fetchStrainLibrary.mockResolvedValue([{ name: 'S1' }]);

            // Mock DOM methods
            const clickMock = vi.fn();
            const removeMock = vi.fn();
            const setAttributeMock = vi.fn();

            const elementMock = {
                click: clickMock,
                remove: removeMock,
                setAttribute: setAttributeMock
            } as any;

            vi.spyOn(document, 'createElement').mockReturnValue(elementMock);
            vi.spyOn(document.body, 'appendChild').mockImplementation(() => elementMock);

            await store.handleExportLibrary();

            expect(clickMock).toHaveBeenCalled();
            expect(removeMock).toHaveBeenCalled();
        });

        it('should handle export library fail', async () => {
            mockDataServiceInstance.fetchStrainLibrary.mockRejectedValue(new Error('Export Fail'));
            const spy = vi.spyOn(console, 'error').mockImplementation(() => { });

            await store.handleExportLibrary();

            expect(uiStore.showToast).toHaveBeenCalledWith('Failed to export library', 'error', undefined);
        });

        it('should cover openNutrientPresetsDialog', () => {
            store.openNutrientPresetsDialog();
            expect(uiStore.setActiveDialog).toHaveBeenCalledWith({ type: 'NUTRIENT_PRESETS', payload: {} });
        });

        it('should cover openLogbookDialog', () => {
            (dataStore.$selectedDevice.get as any).mockReturnValue('d1');
            store.openLogbookDialog();
            expect(uiStore.setActiveDialog).toHaveBeenCalledWith({ type: 'LOGBOOK', payload: { growspaceId: 'd1' } });
        });
        it('should handle handleDeletePlant with non-existent plant', async () => {
            (dataStore.$devices.get as any).mockReturnValue([
                { device_id: 'd1', plants: [] }
            ]);
            await store.handleDeletePlant('p-missing');
            expect(mockDataServiceInstance.removePlant).toHaveBeenCalledWith('p-missing');
        });

        it('should auto-expand view mode when enabling graph in header mode', () => {
            (store as any).history = { toggleEnvGraph: vi.fn().mockReturnValue(true) };
            (uiStore.$viewMode.get as any).mockReturnValue('header');

            store.toggleEnvGraph('temp');

            expect(uiStore.setViewMode).toHaveBeenCalledWith('standard');
        });

        it('should not auto-expand view mode if graph disabled', () => {
            (store as any).history = { toggleEnvGraph: vi.fn().mockReturnValue(false) };
            (uiStore.$viewMode.get as any).mockReturnValue('header');

            store.toggleEnvGraph('temp');

            expect(uiStore.setViewMode).not.toHaveBeenCalled();
        });

        it('should not auto-expand if already in standard mode', () => {
            (store as any).history = { toggleEnvGraph: vi.fn().mockReturnValue(true) };
            (uiStore.$viewMode.get as any).mockReturnValue('standard');

            store.toggleEnvGraph('temp');

            expect(uiStore.setViewMode).not.toHaveBeenCalled();
        });
    });
    describe('Coverage Top-up', () => {
        it('should return early in fetchNutrientPresets if no hass', async () => {
            store.hass = undefined as any;
            await store.fetchNutrientPresets();
            expect(mockDataServiceInstance.fetchNutrientPresets).not.toHaveBeenCalled();
        });

        it('should return early in fetchIPMPresets if no hass', async () => {
            store.hass = undefined as any;
            await store.fetchIPMPresets();
            expect(mockDataServiceInstance.fetchIPMPresets).not.toHaveBeenCalled();
        });

        it('should return early in toggleEnvGraph if no history store', () => {
            (store as any).history = undefined;
            store.toggleEnvGraph('temp');
            // No error, return
        });

        it('should handle handleDrop early returns', async () => {
            (dataStore.$selectedDevice.get as any).mockReturnValue(null); // No device
            await store.handleDrop(1, 1, null, {} as any);
            // No calls
            expect(mockDataServiceInstance.swapPlants).not.toHaveBeenCalled();
            expect(mockDataServiceInstance.updatePlant).not.toHaveBeenCalled();

            (dataStore.$selectedDevice.get as any).mockReturnValue('d1'); // Device exists
            await store.handleDrop(1, 1, null, null); // No source
            expect(mockDataServiceInstance.swapPlants).not.toHaveBeenCalled();
        });

        it('should handle analyzeGrowspace parsing logic', async () => {
            (uiStore.$activeDialog.get as any).mockReturnValue({ type: 'GROW_MASTER', payload: {} });
            (dataStore.$selectedDevice.get as any).mockReturnValue('d1');

            // 1. String
            mockDataServiceInstance.askGrowAdvice.mockResolvedValue('Advice string');
            await store.analyzeGrowspace('q', false);
            expect(uiStore.setActiveDialog).toHaveBeenCalledWith(expect.objectContaining({
                payload: expect.objectContaining({ response: 'Advice string' })
            }));

            // 2. Object with response key
            mockDataServiceInstance.askGrowAdvice.mockResolvedValue({ response: 'Nested advice' });
            await store.analyzeGrowspace('q', false);
            expect(uiStore.setActiveDialog).toHaveBeenCalledWith(expect.objectContaining({
                payload: expect.objectContaining({ response: 'Nested advice' })
            }));

            // 3. Object without response key
            mockDataServiceInstance.askGrowAdvice.mockResolvedValue({ other: 'data' });
            await store.analyzeGrowspace('q', false);
            expect(uiStore.setActiveDialog).toHaveBeenCalledWith(expect.objectContaining({
                payload: expect.objectContaining({ response: '{"other":"data"}' })
            }));

            // 4. Object with null response - JSON stringify null is 'null'
            mockDataServiceInstance.askGrowAdvice.mockResolvedValue({ response: null });
            await store.analyzeGrowspace('q', false);
            expect(uiStore.setActiveDialog).toHaveBeenCalledWith(expect.objectContaining({
                payload: expect.objectContaining({ response: '{"response":null}' })
            }));
        });

        it('should return early in _refreshGrowspaceData if hass missing', async () => {
            store.hass = undefined as any;
            mockDataServiceInstance.hass = undefined; // SyncService checks this
            await store.refreshData(); // calls refreshGrowspaceData
            expect(mockDataServiceInstance.fetchGrowspaceData).not.toHaveBeenCalled();
        });
    });

    describe('Deep Branch Coverage', () => {
        it('should handle selectAllPlants with missing device data', () => {
            (dataStore.$devices.get as any).mockReturnValue([{ device_id: 'd2' }]); // mismatch
            (dataStore.$selectedDevice.get as any).mockReturnValue('d1');
            store.selectAllPlants();
            expect(uiStore.selectAllPlants).not.toHaveBeenCalled();
        });

        it('should handle selectAllPlants with undefined plants array', () => {
            const device = { device_id: 'd1', plants: undefined };
            (dataStore.$devices.get as any).mockReturnValue([device]);
            (dataStore.$selectedDevice.get as any).mockReturnValue('d1');
            store.selectAllPlants();
            expect(uiStore.selectAllPlants).not.toHaveBeenCalled();
        });

        it('should updatePlantFromDialog without clearing selection if not in edit mode', async () => {
            const dialogState = {
                plant: { entity_id: 's.p1', attributes: { plant_id: 'p1' } },
                editedAttributes: {},
                selectedPlantIds: ['p1']
            };
            (uiStore.$isEditMode.get as any).mockReturnValue(false); // Key: Not in edit mode

            await store.updatePlantFromDialog(dialogState as any);

            expect(mockDataServiceInstance.updatePlant).toHaveBeenCalled();
            expect(uiStore.closeDialog).toHaveBeenCalled();
            // Should NOT call these:
            expect(uiStore.clearPlantSelection).not.toHaveBeenCalled();
            expect(uiStore.setEditMode).not.toHaveBeenCalled();
        });

        it('should handle fetchStrainLibraryImpl early return if no hass', async () => {
            store.hass = undefined as any;
            await store.fetchStrainLibrary();
            expect(mockDataServiceInstance.fetchStrainLibrary).not.toHaveBeenCalled();
        });

        it('should handle fetchStrainLibraryImpl invalid cache type', async () => {
            // Cache exists but is not array data
            const cache = { version: 2, timestamp: Date.now(), data: "not-array" };
            localStorage.setItem('growspace_strain_library_v2', JSON.stringify(cache));

            await store.fetchStrainLibrary(); // Should fall through to fetch

            expect(mockDataServiceInstance.fetchStrainLibrary).toHaveBeenCalled();
        });

        it('should handle fetchIPMPresets API returning null/undefined', async () => {
            mockDataServiceInstance.fetchIPMPresets.mockResolvedValue(null);
            await store.fetchIPMPresets();
            expect(dataStore.setIPMPresets).not.toHaveBeenCalled();
        });

        it('should handle fetchNutrientPresets API returning null/undefined', async () => {
            mockDataServiceInstance.fetchNutrientPresets.mockResolvedValue(null);
            await store.fetchNutrientPresets();
            expect(dataStore.setNutrientPresets).not.toHaveBeenCalled();
        });
    });
});
