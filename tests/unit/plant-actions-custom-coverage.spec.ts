
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ActionContext } from '../../src/store/core/action-context';
import {
    movePlantToNextStage,
    handlePlantDrop
} from '../../src/store/plant/plant-actions';
import { PlantEntity } from '../../src/types';

// Mock library actions
vi.mock('../../src/store/plant/library-actions', () => ({
    fetchNutrientInventory: vi.fn(),
    fetchIPMPresets: vi.fn(),
    fetchStrainLibrary: vi.fn().mockResolvedValue(undefined)
}));

describe('plant-actions-custom-coverage', () => {

    let ctx: ActionContext;
    let mockDataService: any;

    const mockPlant: PlantEntity = {
        entity_id: 'sensor.plant_test123',
        state: 'active',
        last_changed: '',
        last_updated: '',
        context: { id: '1', parent_id: null, user_id: null },
        attributes: {
            plant_id: 'test123',
            entity_id: 'sensor.plant_test123',
            strain: 'Test Strain',
            phenotype: '',
            stage: 'flower',
            row: 1,
            col: 1,
            growspace_id: 'gs1',
            veg_start: '2024-01-01',
            flower_start: '2024-01-15'
        } as any,
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockDataService = {
            updatePlant: vi.fn().mockResolvedValue({}),
            removePlant: vi.fn().mockResolvedValue({}),
            harvestPlant: vi.fn().mockResolvedValue({}),
            moveClone: vi.fn().mockResolvedValue({}),
            takeClone: vi.fn().mockResolvedValue({}),
            swapPlants: vi.fn().mockResolvedValue({}),
            addPlant: vi.fn().mockResolvedValue({}),
            addPlants: vi.fn().mockResolvedValue({}),
            waterPlant: vi.fn().mockResolvedValue({}),
            waterGrowspace: vi.fn().mockResolvedValue({}),
            addStrain: vi.fn().mockResolvedValue({}),
        };

        ctx = {
            dataService: mockDataService,
            showToast: vi.fn(),
            closeDialog: vi.fn(),
            undoRedoManager: { pushAction: vi.fn() },
            refreshData: vi.fn().mockResolvedValue(undefined),
            ui: {
                showToast: vi.fn(),
                deselectPlants: vi.fn(),
                $activeDialog: { get: vi.fn().mockReturnValue({ type: 'NONE' }) },
                $isEditMode: { get: vi.fn().mockReturnValue(false) },
                setEditMode: vi.fn(),
                clearPlantSelection: vi.fn()
            },
            data: {
                $devices: { get: vi.fn().mockReturnValue([]), set: vi.fn() },
                addOptimisticDeletedPlantId: vi.fn(),
                removeOptimisticDeletedPlantId: vi.fn(),
                updateWsDataCacheGrid: vi.fn()
            } as any,
            grid: {
                $selectedDevice: { get: vi.fn() },
            } as any,
            optimisticManager: {
                applyOptimisticUpdate: vi.fn().mockImplementation(async (type, payload, apply) => {
                    await apply(payload);
                    return 'mock-optimistic-id';
                }),
                confirmUpdate: vi.fn().mockImplementation((id, options) => {
                    if (options) {
                        ctx.undoRedoManager.pushAction({
                            type: 'swap',
                            description: options.description,
                            reverse: async () => { },
                            redo: options.redo
                        });
                    }
                }),
                rollbackUpdate: vi.fn()
            } as any
        } as any;
    });

    describe('movePlantToNextStage coverage', () => {
        it('should catch and log errors during harvestPlant', async () => {
            mockDataService.harvestPlant.mockRejectedValue(new Error('Harvest failed'));
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            const flowerPlant = { ...mockPlant, attributes: { ...mockPlant.attributes, stage: 'flower' } };
            const result = await movePlantToNextStage(ctx, flowerPlant);

            expect(result).toBe(false);
            expect(consoleSpy).toHaveBeenCalledWith('Failed to move plant', expect.any(Error));
            consoleSpy.mockRestore();
        });
    });

    describe('handlePlantDrop coverage', () => {
        const targetPlant: PlantEntity = {
            ...mockPlant,
            entity_id: 'sensor.plant_target',
            attributes: { ...mockPlant.attributes, plant_id: 'target456', row: 2, col: 2 },
        };

        it('should handle optimistic grid update where plant is NOT in the grid (missing sourceKey or targetKey)', async () => {
            const sourceWithGs = { ...mockPlant, attributes: { ...mockPlant.attributes, growspace_id: 'gs1' } };
            const targetWithGs = { ...targetPlant, attributes: { ...targetPlant.attributes, growspace_id: 'gs1' } };

            // Grid does NOT contain the plants (simulating desync or missing data)
            const mockGrid = {
                'posOther': { plant_id: 'other', row: 5, col: 5 }
            };

            // Setup updateWsDataCacheGrid to run the callback with our mock grid
            (ctx.data.updateWsDataCacheGrid as any).mockImplementation((_id: string, callback: any) => {
                callback(mockGrid);
            });

            // Make dataService.swapPlants succeed
            (ctx.dataService.swapPlants as any).mockResolvedValue(true);
            (ctx.data.$devices.get as any).mockReturnValue([{ deviceId: 'gs1', grid: mockGrid }]);

            await handlePlantDrop(ctx, 2, 2, targetWithGs, sourceWithGs);

            // Since keys were not found, grid should NOT be modified
            expect(mockGrid['posOther'].plant_id).toBe('other');
            // source and target were not found, so no swap logic in the grid
        });

        it('should catch and log errors during handlePlantDrop entire flow', async () => {
            // Force an error at the start
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            const sourceWithGs = { ...mockPlant, attributes: { ...mockPlant.attributes, growspace_id: 'gs1' } };

            // Mock optimisticManager to throw
            ctx.optimisticManager.applyOptimisticUpdate = vi.fn().mockRejectedValue(new Error('Manager failed'));

            const result = await handlePlantDrop(ctx, 2, 2, targetPlant, sourceWithGs);

            expect(result).toBe(false);
            expect(consoleSpy).toHaveBeenCalledWith('Error during drag-and-drop:', expect.any(Error));
            expect(ctx.refreshData).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });
    });
});
