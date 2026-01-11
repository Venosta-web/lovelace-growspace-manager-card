
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
const mockDataServiceInstance = {
    getGrowspaceDevices: vi.fn(),
    harvestPlant: vi.fn().mockResolvedValue({}),
    moveClone: vi.fn().mockResolvedValue({}),
    fetchStrainLibrary: vi.fn().mockResolvedValue([]),
    addStrain: vi.fn().mockResolvedValue({}),
    removeStrain: vi.fn().mockResolvedValue({}),
    updateHass: vi.fn(),
    updateGrowspace: vi.fn().mockResolvedValue({}),
    updatePlant: vi.fn().mockResolvedValue({}),
    addPlant: vi.fn().mockResolvedValue({}),
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
    fetchIPMPresets: vi.fn().mockResolvedValue({})
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
            const undoSpy = vi.spyOn(store, 'undo').mockImplementation(async () => { });
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

});
