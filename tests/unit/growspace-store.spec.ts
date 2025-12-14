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
    updateGrowspace: vi.fn().mockResolvedValue({})
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

            await store.handleUpdateGrowspace({ growspace_id: 'gs1' });

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

        it('should initialize to header_only from config', () => {
            store.initializeSelectedDevice({ initial_view_mode: 'header_only' });
            expect(store.state.viewMode).toBe('header_only');
        });

        it('should initialize to grid_only from compact legacy config', () => {
            store.initializeSelectedDevice({ compact: true });
            expect(store.state.viewMode).toBe('grid_only');
            // Legacy flag sync
            expect(store.state.isCompactView).toBe(true);
        });

        it('should update state when setViewMode is called', () => {
            store.setViewMode('header_only');
            expect(store.state.viewMode).toBe('header_only');

            store.setViewMode('grid_only');
            expect(store.state.viewMode).toBe('grid_only');
            // Legacy flag sync check
            expect(store.state.isCompactView).toBe(true);

            store.setViewMode('standard');
            expect(store.state.viewMode).toBe('standard');
            expect(store.state.isCompactView).toBe(false);
        });

        it('should toggle header expansion correctly', () => {
            // Case 1: Header Only -> Standard
            store.setViewMode('header_only');
            store.toggleHeaderExpansion();
            expect(store.state.viewMode).toBe('standard');

            // Case 2: Standard -> Header Only
            // Note: toggleHeaderExpansion currently switches back to header_only if not in header_only
            store.toggleHeaderExpansion();
            expect(store.state.viewMode).toBe('header_only');
        });

        it('should map old setIsCompactView to new View Modes', () => {
            store.setIsCompactView(true);
            expect(store.state.viewMode).toBe('grid_only');

            store.setIsCompactView(false);
            expect(store.state.viewMode).toBe('standard');
        });
    });
});
