import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GrowspaceStore } from '../../src/store/growspace-store';
import { PlantEntity } from '../../src/types';

// Mock DataService
const mockDataServiceInstance = {
    getGrowspaceDevices: vi.fn(),
    harvestPlant: vi.fn().mockResolvedValue({}),
    moveClone: vi.fn().mockResolvedValue({}),
    fetchStrainLibrary: vi.fn().mockResolvedValue([]),
    updateHass: vi.fn(),
    updateGrowspace: vi.fn().mockResolvedValue({}),
    updatePlant: vi.fn().mockResolvedValue({}),
    addPlant: vi.fn().mockResolvedValue({}),
    removePlant: vi.fn().mockResolvedValue({}),
    fetchGrowspaceData: vi.fn(),
    swapPlants: vi.fn().mockResolvedValue({}),
    addGrowspace: vi.fn().mockResolvedValue({}),
    movePlant: vi.fn().mockResolvedValue({}),
    analyzeAllGrowspaces: vi.fn().mockResolvedValue({ response: 'Advice' }),
    askGrowAdvice: vi.fn().mockResolvedValue({ response: 'Advice' }),
    getStrainRecommendation: vi.fn().mockResolvedValue({ response: 'Strain' }),
    exportStrainLibrary: vi.fn().mockResolvedValue({}),
    importStrainLibrary: vi.fn().mockResolvedValue({ imported_count: 5 }),
    setDehumidifierControl: vi.fn().mockResolvedValue({})
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
        mockDataServiceInstance.getGrowspaceDevices.mockReturnValue([]);

        mockHost = {
            addController: vi.fn(),
            requestUpdate: vi.fn(),
        };
        store = new GrowspaceStore(mockHost);
    });

    describe('movePlantToGrowspace', () => {
        it('should use moveClone for clone stage plants', async () => {
            const clonePlant = {
                entity_id: 'sensor.clone1',
                attributes: {
                    plant_id: 'clone_1',
                    stage: 'clone',
                    strain: 'Test Strain'
                }
            } as unknown as PlantEntity;

            await store.movePlantToGrowspace(clonePlant, 'veg_tent');

            expect(store.dataService.moveClone).toHaveBeenCalledWith('clone_1', 'veg_tent');
            expect(store.dataService.harvestPlant).not.toHaveBeenCalled();
        });

        it('should use harvestPlant for flower stage plants', async () => {
            const flowerPlant = {
                entity_id: 'sensor.flower1',
                attributes: {
                    plant_id: 'flower_1',
                    stage: 'flower',
                    strain: 'Test Strain'
                }
            } as unknown as PlantEntity;

            await store.movePlantToGrowspace(flowerPlant, 'dry_tent');

            expect(store.dataService.harvestPlant).toHaveBeenCalledWith('flower_1', 'dry_tent');
            expect(store.dataService.moveClone).not.toHaveBeenCalled();
        });
    });
    describe('handleUpdateGrowspace', () => {
        it('should call dataService.updateGrowspace with correct payload', async () => {
            const updateDetail = {
                growspace_id: 'gs1',
                name: 'New Name',
                rows: 5,
                plants_per_row: 6
            };

            await store.handleUpdateGrowspace(updateDetail);

            expect(store.dataService.updateGrowspace).toHaveBeenCalledWith({
                growspace_id: 'gs1',
                name: 'New Name',
                rows: 5,
                plants_per_row: 6
            });
            expect(mockHost.requestUpdate).toHaveBeenCalled();
        });

        it('should handle errors gracefully', async () => {
            mockDataServiceInstance.updateGrowspace.mockRejectedValue(new Error('Update failed'));
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            await store.handleUpdateGrowspace({ growspace_id: 'gs1' } as any);

            // Should not throw, but log error and show toast (if we could mock toast)
            // Should not throw, but log error and show toast (if we could mock toast)
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Update failed'), expect.any(Object));
            // Note: We'd need to mock showToast or inspect side effects if critical.
            // For now, ensuring it doesn't crash is good.
            consoleSpy.mockRestore();
        });
    });
    describe('View Modes', () => {
        it('should initialize to standard mode by default', () => {
            store.initializeSelectedDevice({});
            expect(store.state.viewMode).toBe('standard');
            expect(store.state.isCompactView).toBe(false);
        });

        it('should initialize to header from config', () => {
            store.initializeSelectedDevice({ initial_view_mode: 'header' });
            expect(store.state.viewMode).toBe('header');
        });

        it('should initialize to compact from legacy config', () => {
            store.initializeSelectedDevice({ compact: true });
            expect(store.state.viewMode).toBe('compact');
            // Legacy flag sync
            expect(store.state.isCompactView).toBe(true);
        });

        it('should update state when setViewMode is called', () => {
            store.setViewMode('header');
            expect(store.state.viewMode).toBe('header');

            store.setViewMode('compact');
            expect(store.state.viewMode).toBe('compact');
            // Legacy flag sync check
            expect(store.state.isCompactView).toBe(true);

            store.setViewMode('standard');
            expect(store.state.viewMode).toBe('standard');
            expect(store.state.isCompactView).toBe(false);
        });

        it('should toggle header expansion correctly', () => {
            // Case 1: Header Only -> Standard
            store.setViewMode('header');
            store.toggleHeaderExpansion();
            expect(store.state.viewMode).toBe('standard');

            // Case 2: Standard -> Header Only
            store.toggleHeaderExpansion();
            expect(store.state.viewMode).toBe('header');
        });

        it('should map old setIsCompactView to new View Modes', () => {
            store.setIsCompactView(true);
            expect(store.state.viewMode).toBe('compact');

            store.setIsCompactView(false);
            expect(store.state.viewMode).toBe('standard');
        });
    });
    describe('updatePlantFromDialog', () => {
        it('should call updateHass with correct attribute removal/addition', async () => {
            const plantMock = {
                entity_id: 'sensor.plant1',
                attributes: {
                    plant_id: 'p1',
                    stage: 'veg',
                    strain: 'Old Strain'
                }
            } as any;

            // Edit: change strain, remove generic attribute (simulated by undefined?)
            // Actually GrowspaceStore uses PlantUtils logic construction.
            // Let's test basic flow: simple update.
            const edited = {
                strain: 'New Strain',
                veg_start: '2023-01-01'
            };

            const dialogState = {
                plant: plantMock,
                editedAttributes: edited,
                selectedPlantIds: ['p1']
            };

            await store.updatePlantFromDialog(dialogState);

            // Should call updatePlant, not updateHass directly (DataService handles it)
            // updatePlant takes a single object payload
            expect(store.dataService.updatePlant).toHaveBeenCalledWith(expect.objectContaining({
                plant_id: 'p1',
                strain: 'New Strain',
                veg_start: '2023-01-01'
            }));
        });

        it('should handle bulk updates', async () => {
            const plantMock = {
                entity_id: 'sensor.plant1',
                attributes: { plant_id: 'p1' }
            } as any;

            const dialogState = {
                plant: plantMock,
                editedAttributes: { stage: 'flower' as any },
                selectedPlantIds: ['p1', 'p2'] // Bulk update
            };

            await store.updatePlantFromDialog(dialogState);

            expect(store.dataService.updatePlant).toHaveBeenCalledTimes(2);
            expect(store.dataService.updatePlant).toHaveBeenCalledWith(expect.objectContaining({ plant_id: 'p1' }));
            expect(store.dataService.updatePlant).toHaveBeenCalledWith(expect.objectContaining({ plant_id: 'p2' }));
        });
    });


    describe('Hass Updates', () => {
        it('should update state devices when hass updates', async () => {
            const mockDevices = [{ device_id: 'd1', name: 'Grow 1', plants: [] }];
            mockDataServiceInstance.getGrowspaceDevices.mockReturnValue(mockDevices);
            mockDataServiceInstance.fetchGrowspaceData.mockReturnValue(Promise.resolve(mockDevices)); // Ensure fetch returns data

            const mockHass = {
                states: {},
                connection: {
                    subscribeEvents: vi.fn()
                }
            } as any;

            store.updateHass(mockHass);

            // Wait for async operations (updateHass is void but triggers async)
            // We might need to wait for promises. _refreshGrowspaceData is async.
            // But the test expectation runs immediately. Loop/Tick waiting?
            // Let's use setTimeout or loop.
            // Actually, updateHass is not async, but calls _refreshGrowspaceData which is.
            // We can await a small delay to allow promise resolution.
            await new Promise(resolve => setTimeout(resolve, 0));

            expect(store.state.devices).toEqual(mockDevices);
            expect(mockHost.requestUpdate).toHaveBeenCalled();
        });
    });

    describe('CRUD Operations', () => {
        it('should call addPlant with correct payload', async () => {
            // Mock selected device
            store.state.selectedDevice = 'd1';
            store.state.devices = [{ device_id: 'd1', name: 'D1', rows: 4, plants_per_row: 4 }] as any;

            const plantDetail = {
                row: 0, col: 0,
                strain: 'Blueberry',
                phenotype: 'Auto',
                other: 'ignore'
            };

            await store.confirmAddPlant(plantDetail);

            // Check if backend coord conversion happened (0->1)
            expect(store.dataService.addPlant).toHaveBeenCalledWith(expect.objectContaining({
                growspace_id: 'd1',
                row: 1,
                col: 1,
                strain: 'Blueberry',
                phenotype: 'Auto'
            }));
            // Should close dialog
            expect(store.state.activeDialog.type).toBe('NONE');
        });

        it('should call removePlant and update optimistic state on delete', async () => {
            store.state.optimisticDeletedPlantIds = new Set();

            await store.handleDeletePlant('plant.123');

            expect(store.dataService.removePlant).toHaveBeenCalledWith('plant.123');
            expect(store.state.optimisticDeletedPlantIds.has('plant.123')).toBe(true);
        });

        it('should handle drop - swap plants', async () => {
            store.state.selectedDevice = 'd1';
            vi.spyOn(store.dataService, 'swapPlants').mockResolvedValue(undefined);

            const p1 = { entity_id: 's.p1', attributes: { plant_id: 'p1' } } as any;
            const p2 = { entity_id: 's.p2', attributes: { plant_id: 'p2' } } as any;

            await store.handleDrop(0, 0, p2, p1); // Drop p1 onto p2

            expect(store.dataService.swapPlants).toHaveBeenCalledWith('p1', 'p2');
        });

        it('should handle drop - move plant to empty slot', async () => {
            store.state.selectedDevice = 'd1';
            vi.spyOn(store, 'movePlant').mockResolvedValue(undefined);

            const p1 = { entity_id: 's.p1', attributes: { plant_id: 'p1' } } as any;

            await store.handleDrop(2, 3, null, p1); // Drop p1 onto empty

            expect(store.movePlant).toHaveBeenCalledWith(p1, 2, 3);
        });

        it('should call addGrowspace and refresh', async () => {
            const detail = { name: 'Tent', rows: 4 };
            vi.spyOn(store.dataService, 'addGrowspace').mockResolvedValue(undefined);
            const refreshSpy = vi.spyOn(store, 'refreshData').mockResolvedValue();

            await store.handleAddGrowspace(detail);

            expect(store.dataService.addGrowspace).toHaveBeenCalledWith(expect.objectContaining({ name: 'Tent' }));
            expect(refreshSpy).toHaveBeenCalled();
            expect(store.state.activeDialog.type).toBe('NONE');
        });

        it('should open add plant dialog with auto-found slot', () => {
            store.state.selectedDevice = 'd1';
            const plants = [{ attributes: { row: 1, col: 1 } }]; // Slot 1,1 occupied
            store.state.devices = [{
                device_id: 'd1', rows: 4, plants_per_row: 4, plants
            }] as any;

            store.openAddPlantDialog();

            expect(store.state.activeDialog.type).toBe('ADD_PLANT');
            // Should find next slot: 1,2 (backend) -> 0,1 (dialog 0-based)
            // Wait, row 1 col 1 is 0,0 0-based.
            // Source logic uses findFirstAvailableSlot which returns 1-based {row, col}.
            // Then subtracts 1 for dialog payload.
            // If 1,1 (1-based) is occupied.
            // It should find 1,2.
            // Dialog payload should be row:0, col:1.
            expect((store.state.activeDialog as any).payload).toEqual({ row: 0, col: 1 });
        });

        it('should validate and call addPlant in confirmAddPlant', async () => {
            store.state.selectedDevice = 'd1';
            store.state.devices = [{ device_id: 'd1' }] as any;

            // Missing strain
            await store.confirmAddPlant({ strain: '' } as any);
            // Should show error toast (mocked implicitly via no error thrown and console output usually, but we check if addPlant NOT called)
            expect(store.dataService.addPlant).not.toHaveBeenCalled();

            // Valid
            await store.confirmAddPlant({ strain: 'Kush', row: 1, col: 1 } as any);
            expect(store.dataService.addPlant).toHaveBeenCalledWith(expect.objectContaining({
                strain: 'Kush', growspace_id: 'd1'
            }));
        });
    });

    describe('Grow Master & Strain Advice', () => {
        it('should call analyzeAllGrowspaces for global query', async () => {
            store.setActiveDialog({
                type: 'GROW_MASTER',
                payload: {
                    mode: 'all',
                    growspaceId: '',
                    isLoading: false,
                    response: null
                }
            });
            await store.analyzeGrowspace('Help', true);

            expect(store.dataService.analyzeAllGrowspaces).toHaveBeenCalled();
            expect((store.state.activeDialog as any).payload.response).toBe('Advice');
        });

        it('should call askGrowAdvice for local query', async () => {
            store.state.selectedDevice = 'd1';
            store.setActiveDialog({
                type: 'GROW_MASTER',
                payload: {
                    mode: 'single',
                    growspaceId: 'd1',
                    isLoading: false,
                    response: null
                }
            });
            await store.analyzeGrowspace('Help', false);

            expect(store.dataService.askGrowAdvice).toHaveBeenCalledWith('d1', 'Help');
        });

        it('should get strain recommendation', async () => {
            store.setActiveDialog({
                type: 'STRAIN_RECOMMENDATION',
                payload: {
                    isLoading: false,
                    response: null
                }
            });
            await store.getStrainRecommendation('Sleepy');

            expect(store.dataService.getStrainRecommendation).toHaveBeenCalledWith('Sleepy');
            expect((store.state.activeDialog as any).payload.response).toBe('Strain');
        });
    });

    describe('Device Control', () => {
        it('should toggle dehumidifier control', async () => {
            const device = { device_id: 'd1', overview_entity_id: 'overview.d1' };
            store.state.devices = [device] as any;
            store.hass = {
                states: {
                    'overview.d1': { attributes: { dehumidifier_control_enabled: false } }
                }
            } as any;

            await store.toggleDehumidifierControl('d1');

            expect(store.dataService.setDehumidifierControl).toHaveBeenCalledWith('d1', true);
        });
    });

    describe('Strain Library Import/Export', () => {
        it('should call export service', async () => {
            store.hass = { connection: { subscribeEvents: vi.fn() } } as any;
            await store.handleExportLibrary();
            expect(store.dataService.exportStrainLibrary).toHaveBeenCalled();
        });

        it('should call import service and refresh', async () => {
            const file = new File(['{}'], 'lib.json');
            const refreshSpy = vi.spyOn(store, 'fetchStrainLibrary').mockResolvedValue();

            await store.performImport(file, true);

            expect(store.dataService.importStrainLibrary).toHaveBeenCalledWith(file, true);
            expect(refreshSpy).toHaveBeenCalled();
        });
    });

    describe('Keyboard Navigation', () => {
        it('should navigate through plants with arrow keys', () => {
            store.state.isEditMode = false;
            store.state.selectedDevice = 'd1';
            const plants = [
                { attributes: { plant_id: 'p1' } },
                { attributes: { plant_id: 'p2' } },
                { attributes: { plant_id: 'p3' } }
            ];
            store.state.devices = [{ device_id: 'd1', plants }] as any;
            store.state.focusedPlantIndex = 0;

            // ArrowRight -> index 1
            store.handleKeyboardNavigation('ArrowRight');
            expect(store.state.focusedPlantIndex).toBe(1);

            // ArrowLeft -> index 0 (circular?)
            store.handleKeyboardNavigation('ArrowLeft');
            expect(store.state.focusedPlantIndex).toBe(0);

            // ArrowLeft again -> index 2 (loop back)
            store.handleKeyboardNavigation('ArrowLeft');
            expect(store.state.focusedPlantIndex).toBe(2);
        });

        it('should delete plant on Delete key', () => {
            store.state.selectedDevice = 'd1';
            const plants = [
                { entity_id: 'sensor.p1', attributes: { plant_id: 'p1' } }
            ];
            store.state.devices = [{ device_id: 'd1', plants }] as any;
            store.state.focusedPlantIndex = 0;

            // Spy on handleDeletePlant
            const deleteSpy = vi.spyOn(store, 'handleDeletePlant');
            deleteSpy.mockImplementation(async () => { });

            store.handleKeyboardNavigation('Delete');

            expect(deleteSpy).toHaveBeenCalledWith('sensor.p1');
        });
    });

});
