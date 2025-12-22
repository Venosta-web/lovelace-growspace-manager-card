
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GrowspaceStore } from '../../src/store/growspace-store';
import { PlantEntity } from '../../src/types';
import * as uiStore from '../../src/store/ui-store';
import * as dataStore from '../../src/store/data-store';

// Mock ui-store
vi.mock('../../src/store/ui-store', () => ({
    $activeDialog: { get: vi.fn(() => ({ type: 'NONE' })), set: vi.fn(), subscribe: vi.fn() },
    $focusedPlantIndex: { get: vi.fn(() => -1), set: vi.fn(), subscribe: vi.fn() },
    $selectedPlants: { get: vi.fn(() => new Set()), set: vi.fn(), subscribe: vi.fn() },
    $isEditMode: { get: vi.fn(() => false), set: vi.fn(), subscribe: vi.fn() },
    $viewMode: { get: vi.fn(() => 'standard'), set: vi.fn(), subscribe: vi.fn() },
    $defaultApplied: { get: vi.fn(() => false), set: vi.fn(), subscribe: vi.fn() },
    $isLoading: { get: vi.fn(() => false), set: vi.fn(), subscribe: vi.fn() },
    $notification: { set: vi.fn() },
    setEditMode: vi.fn(),
    setViewMode: vi.fn(),
    setIsLoading: vi.fn(),
    closeDialog: vi.fn(),
    setDefaultApplied: vi.fn(),
    setFocusedPlantIndex: vi.fn(),
    togglePlantSelection: vi.fn(),
    selectAllPlants: vi.fn(),
    clearPlantSelection: vi.fn(),
    setMenuOpen: vi.fn(),
    showToast: vi.fn(),
    clearToast: vi.fn(),
}));

// Mock data-store
vi.mock('../../src/store/data-store', () => ({
    $devices: { get: vi.fn(() => []), set: vi.fn(), subscribe: vi.fn() },
    $selectedDevice: { get: vi.fn(() => null), set: vi.fn(), subscribe: vi.fn() },
    $strainLibrary: { get: vi.fn(() => []), set: vi.fn(), subscribe: vi.fn() },
    $config: { get: vi.fn(() => ({})), set: vi.fn(), subscribe: vi.fn() },
    $optimisticDeletedPlantIds: { get: vi.fn(() => new Set()), set: vi.fn(), subscribe: vi.fn() },
    setDevices: vi.fn(),
    setSelectedDevice: vi.fn(),
    setStrainLibrary: vi.fn(),
    setConfig: vi.fn(),
    addOptimisticDeletedPlantId: vi.fn(),
    removeOptimisticDeletedPlantId: vi.fn(),
}));

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
    takeClone: vi.fn().mockResolvedValue({})
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

describe('GrowspaceStore', () => {
    let store: GrowspaceStore;
    let mockHost: any;

    beforeEach(() => {
        vi.clearAllMocks();

        // Reset default mock returns
        (dataStore.$devices.get as any).mockReturnValue([]);
        (dataStore.$selectedDevice.get as any).mockReturnValue(null);
        (dataStore.$strainLibrary.get as any).mockReturnValue([]);
        (dataStore.$optimisticDeletedPlantIds.get as any).mockReturnValue(new Set());
        (dataStore.$config.get as any).mockReturnValue({});

        mockDataServiceInstance.getGrowspaceDevices.mockReturnValue([]);
        mockDataServiceInstance.fetchStrainLibrary.mockResolvedValue([]);
        mockDataServiceInstance.addGrowspace.mockResolvedValue({});
        mockDataServiceInstance.updateGrowspace.mockResolvedValue({});
        mockDataServiceInstance.removePlant.mockResolvedValue({});
        mockDataServiceInstance.addPlant.mockResolvedValue({});
        mockDataServiceInstance.harvestPlant.mockResolvedValue({});
        mockDataServiceInstance.updatePlant.mockResolvedValue({});
        mockDataServiceInstance.swapPlants.mockResolvedValue({});
        mockDataServiceInstance.movePlant.mockResolvedValue({});
        mockDataServiceInstance.analyzeAllGrowspaces.mockResolvedValue({ response: 'Advice' });
        mockDataServiceInstance.getStrainRecommendation.mockResolvedValue({ response: 'Strain' });
        mockDataServiceInstance.addStrain.mockResolvedValue({});
        mockDataServiceInstance.removeStrain.mockResolvedValue({});
        mockDataServiceInstance.takeClone.mockResolvedValue({});

        mockHost = {
            addController: vi.fn(),
            requestUpdate: vi.fn(),
            dispatchEvent: vi.fn()
        };
        store = new GrowspaceStore(mockHost);
        // Ensure proxy works
        store.hass = { connection: { subscribeEvents: vi.fn() } } as any;
    });

    describe('Initialization', () => {
        it('should initialize selected device from config', () => {
            const devices = [{ device_id: 'd1', name: 'Grow 1' }] as any;
            (store as any).wsDataCache = { 'd1': {} };
            mockDataServiceInstance.getGrowspaceDevices.mockReturnValue(devices);
            (dataStore.$devices.get as any).mockReturnValue(devices);

            (dataStore.setConfig as any).mockImplementation((cfg: any) => {
                (dataStore.$config.get as any).mockReturnValue(cfg);
            });

            store.initializeSelectedDevice({ default_growspace: 'd1', type: 'standard' });

            expect(dataStore.setSelectedDevice).toHaveBeenCalledWith('d1');
            expect(uiStore.setDefaultApplied).toHaveBeenCalledWith(true);
        });

        it('should fallback to first device if config default invalid', () => {
            const devices = [{ device_id: 'd1', name: 'Grow 1' }] as any;
            (store as any).wsDataCache = { 'd1': {} };
            mockDataServiceInstance.getGrowspaceDevices.mockReturnValue(devices);
            (dataStore.$devices.get as any).mockReturnValue(devices);

            store.initializeSelectedDevice({ default_growspace: 'invalid', type: 'wrong' });

            expect(dataStore.setSelectedDevice).toHaveBeenCalledWith('d1');
            expect(uiStore.setDefaultApplied).not.toHaveBeenCalled();
        });

        it('should show loading spinner if no devices during refresh', async () => {
            (dataStore.$devices.get as any).mockReturnValue([]);
            await store.refreshData();
            expect(uiStore.setIsLoading).toHaveBeenCalledWith(true);
        });

        it('should handle refresh error', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            mockDataServiceInstance.fetchGrowspaceData.mockRejectedValue(new Error('Fetch Error'));
            await store.refreshData();
            expect(consoleSpy).toHaveBeenCalledWith('Failed to fetch growspace data', expect.any(Error));
        });
    });

    describe('Keyboard Navigation', () => {
        beforeEach(() => {
            (dataStore.$selectedDevice.get as any).mockReturnValue('d1');
            (uiStore.$isEditMode.get as any).mockReturnValue(true);
            const plants = [
                { entity_id: 's.1', attributes: { plant_id: 'p1', strain: 'S1' } },
                { entity_id: 's.2', attributes: { plant_id: 'p2', strain: 'S2' } },
                { entity_id: 's.3', attributes: { plant_id: 'p3', strain: 'S3' } }
            ];
            (dataStore.$devices.get as any).mockReturnValue([{ device_id: 'd1', plants }]);
        });

        it('should handle Enter key to open plant dialog', () => {
            (uiStore.$focusedPlantIndex.get as any).mockReturnValue(1);
            store.handleKeyboardNavigation('Enter');

            expect(uiStore.$activeDialog.set).toHaveBeenCalledWith(expect.objectContaining({ type: 'PLANT_OVERVIEW' }));
        });

        it('should delete multiple selected plants on Backspace', async () => {
            (uiStore.$selectedPlants.get as any).mockReturnValue(new Set(['p1', 'p2']));
            (uiStore.$focusedPlantIndex.get as any).mockReturnValue(-1);

            await store.handleKeyboardNavigation('Backspace');

            expect(store.dataService.removePlant).toHaveBeenCalledTimes(2);
        });

        it('should navigate left/right', () => {
            (uiStore.$focusedPlantIndex.get as any).mockReturnValue(1);
            store.handleKeyboardNavigation('ArrowRight');
            expect(uiStore.setFocusedPlantIndex).toHaveBeenCalledWith(2);

            store.handleKeyboardNavigation('ArrowLeft');
            expect(uiStore.setFocusedPlantIndex).toHaveBeenCalledWith(0); // 1-1 = 0
        });
    });

    describe('Selection & Edit Mode', () => {
        it('should handle device change', () => {
            store.handleDeviceChange('d2');
            expect(dataStore.setSelectedDevice).toHaveBeenCalledWith('d2');
        });

        it('should toggle plant selection', () => {
            store.togglePlantSelection('p1');
            expect(uiStore.togglePlantSelection).toHaveBeenCalledWith('p1');
        });

        it('should select all plants', () => {
            (dataStore.$selectedDevice.get as any).mockReturnValue('d1');
            const plants = [
                { entity_id: 's.1', attributes: { plant_id: 'p1' } },
                { entity_id: 's.2', attributes: { plant_id: 'p2' } }
            ];
            (dataStore.$devices.get as any).mockReturnValue([{ device_id: 'd1', plants }]);

            store.selectAllPlants();
            expect(uiStore.selectAllPlants).toHaveBeenCalledWith(['p1', 'p2']);
        });

        it('should clear plant selection', () => {
            store.clearPlantSelection();
            expect(uiStore.clearPlantSelection).toHaveBeenCalled();
        });

        it('should exit edit mode', () => {
            store.exitEditMode();
            expect(uiStore.setEditMode).toHaveBeenCalledWith(false);
            expect(uiStore.clearPlantSelection).toHaveBeenCalled();
        });

        it('should handle plant click (normal)', () => {
            const plant = { entity_id: 's.p1', attributes: { plant_id: 'p1' } } as any;
            store.handlePlantClick(plant);
            expect(uiStore.$activeDialog.set).toHaveBeenCalledWith(expect.objectContaining({ type: 'PLANT_OVERVIEW' }));
        });

        it('should handle plant click (edit mode)', () => {
            (uiStore.$isEditMode.get as any).mockReturnValue(true);
            (uiStore.$selectedPlants.get as any).mockReturnValue(new Set(['p2']));

            const plant = { entity_id: 's.p1', attributes: { plant_id: 'p1' } } as any;
            store.handlePlantClick(plant);

            expect(uiStore.togglePlantSelection).toHaveBeenCalledWith('p1');
            expect(uiStore.$activeDialog.set).toHaveBeenCalled();
        });
    });

    describe('Move Plant Logic', () => {
        const createPlant = (stage: string) => ({
            entity_id: 's.1',
            attributes: { plant_id: 'p1', stage, strain: 'Test' }
        } as any);

        it('should move Flower -> Dry', async () => {
            const plant = createPlant('flower');
            await store.handleMovePlantToNextStage(plant);
            expect(store.dataService.harvestPlant).toHaveBeenCalledWith('p1', 'dry');
        });

        it('should move Mother -> Clone', async () => {
            const plant = createPlant('mother');
            await store.handleMovePlantToNextStage(plant);
            expect(store.dataService.harvestPlant).toHaveBeenCalledWith('p1', 'clone');
        });

        it('should error on Seedling (not in set)', async () => {
            const plant = createPlant('seedling');
            // Mock toast
            await store.handleMovePlantToNextStage(plant);
            expect(uiStore.showToast).toHaveBeenCalledWith(expect.stringContaining('must be in mother or flower'), 'error');
            expect(store.dataService.harvestPlant).not.toHaveBeenCalled();
        });
    });

    describe('Event Handling & Cache', () => {
        it('should update cache on plant_updated', () => {
            (store as any).wsDataCache = {
                'gs1': { grid: { 'position_1_1': { plant_id: 'p1', growspace_id: 'gs1' } } }
            };

            const event = {
                data: {
                    event_type: 'plant_updated',
                    data: {
                        plant: { plant_id: 'p1', growspace_id: 'gs1', row: 2, col: 2, attributes: {} }
                    }
                }
            };

            (store as any).handleOptimisticEvent(event);

            const grid = (store as any).wsDataCache['gs1'].grid;
            expect(grid['position_1_1']).toBeFalsy();
            expect(grid['position_2_2']).toBeDefined();
            expect(grid['position_2_2'].plant_id).toBe('p1');
        });

        it('should remove plant on plant_removed', () => {
            (store as any).wsDataCache = {
                'gs1': { grid: { 'position_1_1': { plant_id: 'p1' } } }
            };

            const event = {
                data: {
                    event_type: 'plant_removed',
                    data: { plant_id: 'p1', growspace_id: 'gs1' }
                }
            };

            (store as any).handleOptimisticEvent(event);
            expect((store as any).wsDataCache['gs1'].grid['position_1_1']).toBeNull();
        });

        it('should prune optimistic deletions if present and cleared', () => {
            (dataStore.$optimisticDeletedPlantIds.get as any).mockReturnValue(new Set(['p1', 'p2']));
            // p1 still in devices (not really deleted), p2 gone (deleted)
            (dataStore.$devices.get as any).mockReturnValue([{
                plants: [{ entity_id: 's.p1', attributes: { plant_id: 'p1' } }]
            }]);

            (store as any).pruneOptimisticDeletions();
            expect(dataStore.removeOptimisticDeletedPlantId).toHaveBeenCalledWith('p2');
        });
    });

    describe('Device & Strain Logic', () => {
        it('should add strain and refresh library', async () => {
            await store.addStrain({ strain: 'New Strain' });
            expect(store.dataService.addStrain).toHaveBeenCalled();
            expect(store.dataService.fetchStrainLibrary).toHaveBeenCalled();
            expect(uiStore.showToast).toHaveBeenCalledWith(expect.stringContaining('saved'), 'success');
        });

        it('should handle add strain error', async () => {
            const spy = vi.spyOn(console, 'error').mockImplementation(() => { });
            mockDataServiceInstance.addStrain.mockRejectedValue(new Error('Fail'));
            await store.addStrain({ strain: 'Fail' });
            expect(spy).toHaveBeenCalled();
        });

        it('should remove strain', async () => {
            (dataStore.$strainLibrary.get as any).mockReturnValue([{ key: 'S1|P1', strain: 'S1' }]);
            await store.removeStrain('S1|P1');
            expect(store.dataService.removeStrain).toHaveBeenCalledWith('S1', 'P1');
        });

        it('should handle remove strain error', async () => {
            const spy = vi.spyOn(console, 'error').mockImplementation(() => { });
            mockDataServiceInstance.removeStrain.mockRejectedValue(new Error('Fail'));
            await store.removeStrain('S1');
            expect(spy).toHaveBeenCalled();
        });

        it('should toggle dehumidifier logs warning', async () => {
            const spy = vi.spyOn(console, 'warn').mockImplementation(() => { });
            await store.toggleDehumidifierControl('d1');
            expect(spy).toHaveBeenCalled();
        });
    });

    describe('Growspace Actions & Dialogs', () => {
        it('should handle add growspace error', async () => {
            mockDataServiceInstance.addGrowspace.mockRejectedValue(new Error('Name taken'));
            await store.handleAddGrowspace({ name: 'GS' });
            expect(uiStore.showToast).toHaveBeenCalledWith(expect.stringContaining('Name taken'), 'error');
        });

        it('should handle add growspace success', async () => {
            await store.handleAddGrowspace({ name: 'GS' });
            expect(store.dataService.addGrowspace).toHaveBeenCalled();
            expect(uiStore.closeDialog).toHaveBeenCalled();
        });

        it('should handle update growspace success', async () => {
            await store.handleUpdateGrowspace({ growspace_id: 'g1', name: 'G1', rows: 4, plants_per_row: 4 });
            expect(store.dataService.updateGrowspace).toHaveBeenCalled();
            expect(uiStore.closeDialog).toHaveBeenCalled();
        });

        it('should handle update growspace error', async () => {
            mockDataServiceInstance.updateGrowspace.mockRejectedValue(new Error('Fail'));
            await store.handleUpdateGrowspace({ growspace_id: 'g1', name: 'G1', rows: 4, plants_per_row: 4 });
            expect(uiStore.showToast).toHaveBeenCalledWith(expect.stringContaining('Failed to update'), 'error');
        });

        it('should open logbook dialog', () => {
            (dataStore.$selectedDevice.get as any).mockReturnValue('d1');
            store.openLogbookDialog();
            expect(uiStore.$activeDialog.set).toHaveBeenCalledWith(expect.objectContaining({ type: 'LOGBOOK' }));
        });
    });

    describe('Plant Management', () => {
        it('should update plant success', async () => {
            await store.updatePlant('p1', { notes: 'abc' });
            expect(store.dataService.updatePlant).toHaveBeenCalled();
            expect(uiStore.showToast).toHaveBeenCalledWith(expect.stringContaining('Plant updated'), 'success');
        });

        it('should update plant from dialog', async () => {
            const dialogState = {
                plant: { attributes: { plant_id: 'p1' } },
                editedAttributes: { notes: 'Edit' },
                selectedPlantIds: ['p1']
            } as any;
            await store.updatePlantFromDialog(dialogState);
            expect(store.dataService.updatePlant).toHaveBeenCalled();
            expect(uiStore.closeDialog).toHaveBeenCalled();
        });

        it('should confirm add plant', async () => {
            (dataStore.$selectedDevice.get as any).mockReturnValue('d1');
            await store.confirmAddPlant({ row: 0, col: 0, strain: 'S1', phenotype: 'P1' });
            expect(store.dataService.addPlant).toHaveBeenCalled();
            expect(uiStore.closeDialog).toHaveBeenCalled();
        });

        it('should handle confirm add plant error', async () => {
            (dataStore.$selectedDevice.get as any).mockReturnValue('d1');
            mockDataServiceInstance.addPlant.mockRejectedValue(new Error('Fail'));
            await store.confirmAddPlant({ row: 0, col: 0, strain: 'S1', phenotype: 'P1' });
            expect(uiStore.showToast).toHaveBeenCalledWith(expect.stringContaining('Failed to add'), 'error');
        });

        it('should abort add plant if no device', async () => {
            (dataStore.$selectedDevice.get as any).mockReturnValue(null);
            await store.confirmAddPlant({ row: 0, col: 0, strain: 'S1', phenotype: 'P1' });
            expect(uiStore.showToast).toHaveBeenCalledWith('No growspace selected', 'error');
        });

        it('should handle delete plant error', async () => {
            mockDataServiceInstance.removePlant.mockRejectedValue(new Error('Fail'));
            await store.handleDeletePlant('p1');
            expect(dataStore.addOptimisticDeletedPlantId).toHaveBeenCalledWith('p1');
            expect(dataStore.removeOptimisticDeletedPlantId).toHaveBeenCalledWith('p1'); // Revert on error
            expect(uiStore.showToast).toHaveBeenCalledWith(expect.stringContaining('Failed to delete'), 'error');
        });

        it('should handle delete plant success', async () => {
            await store.handleDeletePlant('p1');
            expect(uiStore.showToast).toHaveBeenCalledWith(expect.stringContaining('deleted'), 'success');
        });

        it('should handle move plant', async () => {
            await store.movePlantToGrowspace({ attributes: { plant_id: 'p1', stage: 'flower' } } as any, 'dry');
            expect(store.dataService.harvestPlant).toHaveBeenCalledWith('p1', 'dry');
        });

        it('should handle move plant error', async () => {
            mockDataServiceInstance.harvestPlant.mockRejectedValue(new Error('Fail'));
            await store.movePlantToGrowspace({ attributes: { plant_id: 'p1', stage: 'flower' } } as any, 'dry');
            expect(uiStore.showToast).toHaveBeenCalledWith(expect.stringContaining('Failed to move'), 'error');
        });

        it('should handle take clone', async () => {
            // Test wrapper again to be sure
            const plant = { entity_id: 's.p1', attributes: { plant_id: 'p1' } } as any;
            store.handleTakeClone(plant, 5);
            expect(store.dataService.takeClone).toHaveBeenCalledWith({ mother_plant_id: 'p1', num_clones: 5 });
        });

        it('should call harvest wrappers', async () => {
            const plant = { entity_id: 's.p1', attributes: { plant_id: 'p1', stage: 'flower' } } as any;
            await store.harvestPlant(plant);
            expect(store.dataService.harvestPlant).toHaveBeenCalled();

            plant.attributes.stage = 'dry';
            await store.finishDryingPlant(plant);
            expect(store.dataService.harvestPlant).toHaveBeenCalled();
        });
    });

    describe('Open Add Plant Dialog (Auto-find Slot)', () => {
        it('should open with specific coords', () => {
            store.openAddPlantDialog(5, 5);
            expect(uiStore.$activeDialog.set).toHaveBeenCalledWith(expect.objectContaining({
                type: 'ADD_PLANT', payload: { row: 5, col: 5 }
            }));
        });

        it('should find first empty slot', () => {
            (dataStore.$selectedDevice.get as any).mockReturnValue('d1');
            // Device has 2x2 grid. Plant at 0,0 (1,1 in attr).
            // Should find 0,1
            (dataStore.$devices.get as any).mockReturnValue([{
                device_id: 'd1', plants_per_row: 2, rows: 2,
                plants: [{ attributes: { row: 1, col: 1, plant_id: 'p1' } }]
            }]);

            store.openAddPlantDialog();

            expect(uiStore.$activeDialog.set).toHaveBeenCalledWith(expect.objectContaining({
                type: 'ADD_PLANT',
                payload: { row: 0, col: 1 }
            }));
        });

        it('should skip optimistic deleted plants when finding slot', () => {
            (dataStore.$selectedDevice.get as any).mockReturnValue('d1');
            (dataStore.$optimisticDeletedPlantIds.get as any).mockReturnValue(new Set(['p1']));
            // Plant p1 is at 0,0 but marked deleted. So 0,0 should be free.
            (dataStore.$devices.get as any).mockReturnValue([{
                device_id: 'd1', plants_per_row: 2, rows: 2,
                plants: [{ attributes: { row: 1, col: 1, plant_id: 'p1' } }]
            }]);

            store.openAddPlantDialog();

            expect(uiStore.$activeDialog.set).toHaveBeenCalledWith(expect.objectContaining({
                type: 'ADD_PLANT',
                payload: { row: 0, col: 0 }
            }));
        });
    });

    describe('Grow Master & Strain Recommendation', () => {
        it('should analyze growspace all', async () => {
            await store.analyzeGrowspace('Query', true);
            expect(store.dataService.analyzeAllGrowspaces).toHaveBeenCalled();
        });

        it('should handle analysis error', async () => {
            (uiStore.$activeDialog.get as any).mockReturnValue({ type: 'GROW_MASTER', payload: {} });
            mockDataServiceInstance.analyzeAllGrowspaces.mockRejectedValue(new Error('Fail'));

            await store.analyzeGrowspace('Query', true);

            expect(uiStore.$activeDialog.set).toHaveBeenCalledWith(expect.objectContaining({
                payload: expect.objectContaining({ response: 'Error: Fail' })
            }));
        });

        it('should open strain recommendation dialog', () => {
            store.openStrainRecommendationDialog();
            expect(uiStore.$activeDialog.set).toHaveBeenCalledWith(expect.objectContaining({ type: 'STRAIN_RECOMMENDATION' }));
        });

        it('should handle getStrainRecommendation error', async () => {
            (uiStore.$activeDialog.get as any).mockReturnValue({ type: 'STRAIN_RECOMMENDATION', payload: {} });
            mockDataServiceInstance.getStrainRecommendation.mockRejectedValue(new Error('Fail'));

            await expect(store.getStrainRecommendation('Query')).rejects.toThrow();

            expect(uiStore.$activeDialog.set).toHaveBeenCalledWith(expect.objectContaining({
                payload: expect.objectContaining({ response: 'Error: Fail' })
            }));
        });
    });

    describe('Import/Export Library', () => {
        it('should handle export library', async () => {
            const anchor = { click: vi.fn(), remove: vi.fn(), setAttribute: vi.fn() };
            const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(anchor as any);
            const appendSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => anchor as any);

            mockDataServiceInstance.fetchStrainLibrary.mockResolvedValue([{ strain: 'S1' }]);

            await (store as any)._handleExportLibraryLogic();

            expect(store.dataService.fetchStrainLibrary).toHaveBeenCalled();
            expect(anchor.click).toHaveBeenCalled();
            expect(anchor.remove).toHaveBeenCalled();
        });

        it('should handle import library success', async () => {
            const file = new File([''], 'test.json');
            file.text = vi.fn().mockResolvedValue('[{"strain":"S1"}]');

            await store.performImport(file, false);
            expect(store.dataService.addStrain).toHaveBeenCalledWith(expect.objectContaining({ strain: 'S1' }));
        });

        it('should handle import library failure', async () => {
            const file = new File([''], 'test.json');
            file.text = vi.fn().mockResolvedValue('invalid json');
            await store.performImport(file, false);
            expect(uiStore.showToast).toHaveBeenCalledWith(expect.stringContaining('Import failed'), 'error');
        });
    });

    describe('Advanced Drag & Drop', () => {
        it('should swap plants if target is occupied', async () => {
            (dataStore.$selectedDevice.get as any).mockReturnValue('d1');
            const source = { entity_id: 's.1', attributes: { plant_id: 'p1' } } as any;
            const target = { entity_id: 's.2', attributes: { plant_id: 'p2' } } as any;

            await store.handleDrop(1, 1, target, source);

            expect(store.dataService.swapPlants).toHaveBeenCalledWith('p1', 'p2');
        });

        it('should move plant if target is empty', async () => {
            (dataStore.$selectedDevice.get as any).mockReturnValue('d1');
            const source = { entity_id: 's.1', attributes: { plant_id: 'p1' } } as any;

            await store.handleDrop(3, 3, null, source);

            expect(store.dataService.updatePlant).toHaveBeenCalledWith(expect.objectContaining({
                plant_id: 'p1', row: 3, col: 3
            }));
        });
    });

    describe('Bulk Update', () => {
        it('should perform bulk update', async () => {
            const dialogState = {
                plant: { attributes: { plant_id: 'p1' } },
                editedAttributes: { notes: 'Bulk' },
                selectedPlantIds: ['p1', 'p2']
            } as any;

            (uiStore.$isEditMode.get as any).mockReturnValue(true);

            await store.updatePlantFromDialog(dialogState);

            expect(store.dataService.updatePlant).toHaveBeenCalledTimes(2);
            expect(uiStore.setEditMode).toHaveBeenCalledWith(false);
        });
    });

    describe('Additional Coverage', () => {
        it('should handle take clone error', async () => {
            const spy = vi.spyOn(console, 'error').mockImplementation(() => { });
            mockDataServiceInstance.takeClone.mockRejectedValue(new Error('Clone Fail'));
            const plant = { entity_id: 's.p1', attributes: { plant_id: 'p1' } } as any;

            await store.handleTakeClone(plant, 5);
            expect(spy).toHaveBeenCalledWith('Failed to take clone: Clone Fail');
        });

        it('should move clone using moveClone service', async () => {
            const plant = { entity_id: 's.c1', attributes: { plant_id: 'c1', stage: 'clone' } } as any;
            await store.movePlantToGrowspace(plant, 'veg');
            expect(store.dataService.moveClone).toHaveBeenCalledWith('c1', 'veg');
            expect(uiStore.showToast).toHaveBeenCalledWith(expect.stringContaining('moved to veg'), 'success');
        });

        it('should handle drop with same source and target', async () => {
            (dataStore.$selectedDevice.get as any).mockReturnValue('d1');
            const p1 = { entity_id: 's.1', attributes: { plant_id: 'p1' } } as any;
            await store.handleDrop(1, 1, p1, p1); // Same plant
            expect(store.dataService.swapPlants).not.toHaveBeenCalled();
        });

        it('should handle drop error', async () => {
            (dataStore.$selectedDevice.get as any).mockReturnValue('d1');
            const p1 = { entity_id: 's.1', attributes: { plant_id: 'p1' } } as any;
            const p2 = { entity_id: 's.2', attributes: { plant_id: 'p2' } } as any;

            // Revert updatePlant mock, assume swapPlants failure
            mockDataServiceInstance.swapPlants.mockRejectedValue(new Error('Swap Fail'));
            const spy = vi.spyOn(console, 'error').mockImplementation(() => { });

            await store.handleDrop(2, 2, p2, p1); // Target p2 (swap)
            expect(spy).toHaveBeenCalledWith('Error during drag-and-drop:', expect.any(Error));
        });

        it('should not show loading if devices already exist', async () => {
            (dataStore.$devices.get as any).mockReturnValue([{ device_id: 'd1' }]);
            await store.refreshData();
            expect(uiStore.setIsLoading).not.toHaveBeenCalledWith(true);
        });

        it('should not open add plant dialog if no device selected', () => {
            (dataStore.$selectedDevice.get as any).mockReturnValue(null);
            store.openAddPlantDialog();
            expect(uiStore.$activeDialog.set).not.toHaveBeenCalled();
        });

        it('should handle export library error', async () => {
            const spy = vi.spyOn(console, 'error').mockImplementation(() => { });
            mockDataServiceInstance.fetchStrainLibrary.mockRejectedValue(new Error('Export Fail'));
            await store.handleExportLibrary();
            expect(uiStore.showToast).toHaveBeenCalledWith('Failed to export library', 'error');
        });

        it('should handle import library invalid format', async () => {
            const file = new File([''], 'test.json');
            file.text = vi.fn().mockResolvedValue('{"not": "array"}'); // Valid JSON but not array
            await store.performImport(file, false);
            expect(uiStore.showToast).toHaveBeenCalledWith(expect.stringContaining('Invalid format'), 'error');
        });

        it('should ignore deleted plants in openAddPlantDialog slot finding', () => {
            (dataStore.$selectedDevice.get as any).mockReturnValue('d1');
            (dataStore.$optimisticDeletedPlantIds.get as any).mockReturnValue(new Set(['p1']));
            (dataStore.$devices.get as any).mockReturnValue([{
                device_id: 'd1', plants_per_row: 2, rows: 2,
                plants: [
                    { attributes: { row: 1, col: 1, plant_id: 'p1' } }, // Deleted
                    { attributes: { row: 1, col: 2, plant_id: 'p2' } }  // Occupied
                ]
            }]);

            store.openAddPlantDialog();
            // Should verify that p1 is treated as empty slot logic. 
            // Logic: 
            // Loop 0,0 -> empty -> target
            // Loop 0,1 -> empty -> target if 0,0 wasn't hit
            // In code: loops r=0..rows, c=0..cols. 
            // 1,1 (index 0,0) is p1 (deleted). So 0,0 should be free.
            expect(uiStore.$activeDialog.set).toHaveBeenCalledWith(expect.objectContaining({
                payload: { row: 0, col: 0 }
            }));
        });

        it('should move plant error catch', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            mockDataServiceInstance.updatePlant.mockRejectedValue(new Error('Move Fail'));
            await store.movePlant({ attributes: { plant_id: 'p1' } } as any, 1, 1);
            expect(consoleSpy).toHaveBeenCalledWith('Error moving plant:', expect.any(Error));
        });
    });

    describe('Coverage Gap Filling', () => {
        it('should not update devices if arrays are equal', () => {
            const devices = [{ device_id: 'd1', plants: [] }];
            (dataStore.$devices.get as any).mockReturnValue(devices);
            (store as any).wsDataCache = { d1: { device_id: 'd1', plants: [] } };
            mockDataServiceInstance.getGrowspaceDevices.mockReturnValue(devices);

            const spy = vi.spyOn(dataStore, 'setDevices');
            (store as any)._updateDevicesState();
            expect(spy).not.toHaveBeenCalled();
        });

        it('should skip auto-select if default already applied', () => {
            (dataStore.$devices.get as any).mockReturnValue([{ device_id: 'd1' }]);
            (dataStore.$selectedDevice.get as any).mockReturnValue(undefined);
            (uiStore.$defaultApplied.get as any).mockReturnValue(true);

            (store as any)._updateDevicesState();
            expect(dataStore.setSelectedDevice).not.toHaveBeenCalled();
        });

        it('should fallback to first device if default config not found', () => {
            // devices exist, no selected device, defaultApplied false
            const devices = [{ device_id: 'd1' }, { device_id: 'd2' }];
            (store as any).dataService.getGrowspaceDevices.mockReturnValue(devices);
            (dataStore.$devices.get as any).mockReturnValue([]); // trigger change
            (dataStore.$selectedDevice.get as any).mockReturnValue(undefined);
            (dataStore.$config.get as any).mockReturnValue({ default_growspace: 'non-existent' });
            (uiStore.$defaultApplied.get as any).mockReturnValue(false);

            (store as any)._updateDevicesState();
            expect(dataStore.setSelectedDevice).toHaveBeenCalledWith('d1');
        });

        it('should handle Escape key when not in edit mode', () => {
            (uiStore.$isEditMode.get as any).mockReturnValue(false);
            const spy = vi.spyOn(store, 'exitEditMode');
            store.handleKeyboardNavigation('Escape');
            expect(spy).not.toHaveBeenCalled();
        });

        it('should handle plant click in edit mode (toggle selection)', () => {
            (uiStore.$isEditMode.get as any).mockReturnValue(true);
            (uiStore.$selectedPlants.get as any).mockReturnValue(new Set(['p1']));
            const p2 = { attributes: { plant_id: 'p2' } } as any;

            store.handlePlantClick(p2);
            // Should toggle p2 ON
            expect(uiStore.togglePlantSelection).toHaveBeenCalledWith('p2');
        });

        it('should handle move plant validation for unknown/invalid stage', () => {
            const spy = vi.spyOn(uiStore, 'showToast');
            store.handleMovePlantToNextStage({ attributes: { stage: 'seedling' } } as any);
            expect(spy).toHaveBeenCalledWith(expect.stringContaining('must be in mother or flower'), 'error');
        });

        it('should return from addStrain if no strain name', async () => {
            await store.addStrain({ strain: '' });
            expect(store.dataService.addStrain).not.toHaveBeenCalled();
        });

        it('should handle addStrain with full optional fields', async () => {
            await store.addStrain({
                strain: 'S1',
                flowering_days_min: '60',
                flowering_days_max: '70'
            } as any);

            expect(store.dataService.addStrain).toHaveBeenCalledWith(expect.objectContaining({
                flowering_days_min: 60,
                flowering_days_max: 70
            }));
        });

        it('should handle removeStrain with "default" phenotype', async () => {
            await store.removeStrain('Strain|default');
            // Should pass undefined for phenotype
            expect(store.dataService.removeStrain).toHaveBeenCalledWith('Strain', undefined);
        });

        it('should handle full grid in openAddPlantDialog', () => {
            (dataStore.$selectedDevice.get as any).mockReturnValue('d1');
            (dataStore.$devices.get as any).mockReturnValue([{
                device_id: 'd1',
                plants_per_row: 1,
                rows: 1,
                plants: [{ attributes: { row: 1, col: 1, plant_id: 'p1' } }] // 1x1 grid full
            }]);
            (dataStore.$optimisticDeletedPlantIds.get as any).mockReturnValue(new Set());

            store.openAddPlantDialog();
            // Should default to 0,0 if not found (implict in logic initialization) or whatever last logic state was
            // In current logic: targetRow=0, targetCol=0 initialized. Loop doesn't update them if full.
            expect(uiStore.$activeDialog.set).toHaveBeenCalledWith(expect.objectContaining({
                payload: { row: 0, col: 0 }
            }));
        });

        it('should handle plant click in edit mode with no selection active', () => {
            (uiStore.$isEditMode.get as any).mockReturnValue(true);
            (uiStore.$selectedPlants.get as any).mockReturnValue(new Set()); // Empty
            const p1 = { attributes: { plant_id: 'p1' } } as any;

            store.handlePlantClick(p1);
            // specific logic: if size > 0, toggle. If size === 0, open dialog directly?
            // code: if (editMode && selected.size > 0) { ... } else { openDialog ... }
            expect(uiStore.$activeDialog.set).toHaveBeenCalledWith(expect.objectContaining({ type: 'PLANT_OVERVIEW' }));
        });

        it('should handle getStrainRecommendation race condition (dialog closed)', async () => {
            // 1. Initial State: Dialog Open
            (uiStore.$activeDialog.get as any).mockReturnValue({ type: 'STRAIN_RECOMMENDATION', payload: { isLoading: true } });

            // 2. Service returns success, BUT...
            mockDataServiceInstance.getStrainRecommendation.mockResolvedValue('Recommendation');

            // ...we spy on uiStore to verify the "if" check after await
            // We need to simulate the dialog state changing *while* the promise is pending.
            // Since we can't easily interrupt the await in this mock setup without complex deferreds,
            // we will simulate the condition by mocking uiStore.$activeDialog.get strictly.

            // First call (check type): return correct type
            // Second call (after await): return DIFFERENT type (simulating closing)
            const getSpy = (uiStore.$activeDialog.get as any);
            getSpy
                .mockReturnValueOnce({ type: 'STRAIN_RECOMMENDATION', payload: {} }) // Start of fn
                .mockReturnValueOnce({ type: 'CLOSED', payload: {} }); // After await

            await store.getStrainRecommendation('query');

            // Should NOT have called set with the result because type mismatch
            // Note: It calls set() at start to set isLoading: true.
            // We check that specific payload "response: Recommendation" was NOT set.
            expect(uiStore.$activeDialog.set).not.toHaveBeenCalledWith(expect.objectContaining({
                payload: expect.objectContaining({ response: 'Recommendation' })
            }));
        });

        it('should return early in _refreshGrowspaceData if already fetching', async () => {
            (store as any)._isFetchingWS = true;
            await store.refreshData();
            expect(store.dataService.fetchGrowspaceData).not.toHaveBeenCalled();
        });

        it('should return early in _refreshGrowspaceData if no hass', async () => {
            (store as any).hass = undefined;
            (store as any)._isFetchingWS = false;
            await store.refreshData();
            expect(store.dataService.fetchGrowspaceData).not.toHaveBeenCalled();
        });

        it('should handle plant removal global (no growspace id)', () => {
            (store as any).wsDataCache = {
                gs1: { grid: { 'p1_pos': { plant_id: 'p1' } } },
                gs2: { grid: { 'p1_pos': { plant_id: 'p1' } } } // Same plant id ?? unlikely but possible in cache
            };

            (store as any)._handlePlantRemoval('p1', undefined);

            expect((store as any).wsDataCache.gs1.grid['p1_pos']).toBeNull();
            expect((store as any).wsDataCache.gs2.grid['p1_pos']).toBeNull();
        });

        it('should handle plant update where growspace not in cache (ignored)', () => {
            (store as any).wsDataCache = {};
            // Should not throw or explode
            (store as any)._handlePlantUpdate({ plant_id: 'p1', growspace_id: 'unknown' });
        });

        it('should early return in togglePlantSelection if no ID', () => {
            const spy = vi.spyOn(uiStore, 'togglePlantSelection');
            store.togglePlantSelection('' as any); // empty string
            expect(spy).not.toHaveBeenCalled();
        });

        it('should handle keyboard navigation with no selected device', () => {
            (dataStore.$selectedDevice.get as any).mockReturnValue(undefined);
            const spy = vi.spyOn(uiStore, 'setFocusedPlantIndex');
            store.handleKeyboardNavigation('ArrowRight');
            expect(spy).not.toHaveBeenCalled();
        });

        it('should handle keyboard navigation with device but no data found', () => {
            (dataStore.$selectedDevice.get as any).mockReturnValue('d1');
            (dataStore.$devices.get as any).mockReturnValue([]); // d1 not in here
            const spy = vi.spyOn(uiStore, 'setFocusedPlantIndex');
            store.handleKeyboardNavigation('ArrowRight');
            expect(spy).not.toHaveBeenCalled();
        });

        it('should handle addGrowspace with empty name', async () => {
            await store.handleAddGrowspace({ name: '' });
            expect(uiStore.showToast).toHaveBeenCalledWith('Name is required', 'error');
            expect(store.dataService.addGrowspace).not.toHaveBeenCalled();
        });

        it('should not prune optimistic deletion if plant still exists', () => {
            (dataStore.$optimisticDeletedPlantIds.get as any).mockReturnValue(new Set(['p1']));
            (dataStore.$devices.get as any).mockReturnValue([{
                plants: [{ attributes: { plant_id: 'p1' } }]
            }]);

            (store as any).pruneOptimisticDeletions();
            expect(dataStore.removeOptimisticDeletedPlantId).not.toHaveBeenCalled();
        });

        it('should toggle compact view', () => {
            (uiStore.$viewMode.get as any).mockReturnValue('standard');
            store.setIsCompactView(true);
            expect(uiStore.setViewMode).toHaveBeenCalledWith('compact');

            (uiStore.$viewMode.get as any).mockReturnValue('compact');
            store.setIsCompactView(false);
            expect(uiStore.setViewMode).toHaveBeenCalledWith('standard');

            (uiStore.$viewMode.get as any).mockReturnValue('header');
            store.setIsCompactView(false);
            // Should verify setViewMode called correctly
            expect(uiStore.setViewMode).toHaveBeenCalledTimes(2);
        });

        it('should toggle header expansion', () => {
            (uiStore.$viewMode.get as any).mockReturnValue('header');
            store.toggleHeaderExpansion();
            expect(uiStore.setViewMode).toHaveBeenCalledWith('standard');

            (uiStore.$viewMode.get as any).mockReturnValue('standard');
            store.toggleHeaderExpansion();
            expect(uiStore.setViewMode).toHaveBeenCalledWith('header');
        });

        it('should handle clicking already selected plant in edit mode (bulk open)', () => {
            (uiStore.$isEditMode.get as any).mockReturnValue(true);
            (uiStore.$selectedPlants.get as any).mockReturnValue(new Set(['p1']));
            const p1 = { attributes: { plant_id: 'p1' } } as any;

            // Ensure togglePlantSelection is tracked
            const toggleSpy = vi.spyOn(uiStore, 'togglePlantSelection');

            store.handlePlantClick(p1);

            expect(uiStore.$activeDialog.set).toHaveBeenCalledWith(expect.objectContaining({
                type: 'PLANT_OVERVIEW',
                payload: expect.objectContaining({ selectedPlantIds: ['p1'] })
            }));
            // Should NOT toggle because p1 is already in set
            expect(toggleSpy).not.toHaveBeenCalled();
        });

        it('should handle analyzeGrowspace success (all=false) and update dialog', async () => {
            (dataStore.$selectedDevice.get as any).mockReturnValue('d1');
            (uiStore.$activeDialog.get as any).mockReturnValue({ type: 'GROW_MASTER', payload: {} });
            mockDataServiceInstance.askGrowAdvice.mockResolvedValue('Advice');

            await store.analyzeGrowspace('q', false);

            expect(store.dataService.askGrowAdvice).toHaveBeenCalledWith('d1', 'q');
            expect(uiStore.$activeDialog.set).toHaveBeenCalledWith(expect.objectContaining({
                type: 'GROW_MASTER',
                payload: expect.objectContaining({ isLoading: false, response: 'Advice' })
            }));
        });

        it('should handle analyzeGrowspace success (all=true) and update dialog', async () => {
            (uiStore.$activeDialog.get as any).mockReturnValue({ type: 'GROW_MASTER', payload: {} });
            mockDataServiceInstance.analyzeAllGrowspaces.mockResolvedValue({ response: 'All Advice' }); // Object response

            await store.analyzeGrowspace('q', true);

            expect(uiStore.$activeDialog.set).toHaveBeenCalledWith(expect.objectContaining({
                payload: expect.objectContaining({ response: 'All Advice' })
            }));
        });

        it('should handle getStrainRecommendation success and update dialog', async () => {
            (uiStore.$activeDialog.get as any).mockReturnValue({ type: 'STRAIN_RECOMMENDATION', payload: {} });
            mockDataServiceInstance.getStrainRecommendation.mockResolvedValue('Rec');

            await store.getStrainRecommendation('q');

            expect(uiStore.$activeDialog.set).toHaveBeenCalledWith(expect.objectContaining({
                type: 'STRAIN_RECOMMENDATION',
                payload: expect.objectContaining({ isLoading: false, response: 'Rec' })
            }));
        });

        it('should match analyzeGrowspace logic when dialog not open', async () => {
            (uiStore.$activeDialog.get as any).mockReturnValue({ type: 'CLOSED' });
            mockDataServiceInstance.analyzeAllGrowspaces.mockResolvedValue('Response');

            await store.analyzeGrowspace('q', true);
            // Should still call service but NOT update dialog
            expect(store.dataService.analyzeAllGrowspaces).toHaveBeenCalled();
            expect(uiStore.$activeDialog.set).not.toHaveBeenCalled();
        });

        it('should handle analyzeGrowspace error with no device selected (all=false)', async () => {
            (dataStore.$selectedDevice.get as any).mockReturnValue(undefined);
            (uiStore.$activeDialog.get as any).mockReturnValue({ type: 'GROW_MASTER', payload: {} });

            await store.analyzeGrowspace('q', false);

            expect(uiStore.$activeDialog.set).toHaveBeenCalledWith(expect.objectContaining({
                payload: expect.objectContaining({ response: 'Error: No device selected' })
            }));
        });

        it('should handle analyzeGrowspace race condition', async () => {
            const getSpy = (uiStore.$activeDialog.get as any);
            getSpy.mockReturnValueOnce({ type: 'GROW_MASTER', payload: {} }) // Init check
                .mockReturnValueOnce({ type: 'CLOSED', payload: {} }); // After await

            mockDataServiceInstance.analyzeAllGrowspaces.mockResolvedValue('Response');
            await store.analyzeGrowspace('q', true);

            expect(uiStore.$activeDialog.set).toHaveBeenCalledTimes(1); // Only the initial loading setter
            // The success setter should be skipped
            expect(uiStore.$activeDialog.set).not.toHaveBeenCalledWith(expect.objectContaining({
                payload: expect.objectContaining({ response: 'Response' })
            }));
        });

        it('should handle host lifecycle', () => {
            const unsubSpy = vi.fn();
            (store as any)._unsubEvents = unsubSpy;

            store.hostConnected(); // No-op currently but cover it
            store.hostDisconnected();

            expect(unsubSpy).toHaveBeenCalled();
            expect((store as any)._unsubEvents).toBeUndefined();

            // Call again (safe)
            store.hostDisconnected();
        });
    });
});
