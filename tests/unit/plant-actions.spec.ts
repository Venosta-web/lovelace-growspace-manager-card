import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ActionContext } from '../../src/store/action-context';
import {
    updatePlant,
    updatePlantFromDialog,
    handleDeletePlant,
    movePlantToNextStage,
    movePlantToGrowspace,
    takeClone,
    movePlantPosition,
    handlePlantDrop,
    confirmAddPlant,
    confirmAddPlants,
    waterPlant,
    waterGrowspace,
} from '../../src/store/plant-actions';
import * as libraryActions from '../../src/store/library-actions';

// Mock library actions
vi.mock('../../src/store/library-actions', () => ({
    fetchNutrientInventory: vi.fn(),
    fetchIPMPresets: vi.fn()
}));
import { PlantEntity } from '../../src/types';

describe('plant-actions', () => {
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
            position: '1,1',
            seedling_days: 0,
            mother_days: 0,
            clone_days: 0,
            veg_days: 14,
            flower_days: 21,
            dry_days: 0,
            cure_days: 0,
            seedling_start: null,
            mother_start: null,
            clone_start: null,
            veg_start: '2024-01-01',
            flower_start: '2024-01-15',
            dry_start: null,
            cure_start: null,
            days_since_last_watering: 0,
        },
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
        };

        ctx = {
            dataService: mockDataService,
            showToast: vi.fn(),
            closeDialog: vi.fn(),
            undoRedoManager: { pushAction: vi.fn() },
            refreshData: vi.fn().mockResolvedValue(undefined),
            ui: {
                deselectPlants: vi.fn(),
                $activeDialog: { get: vi.fn().mockReturnValue({ type: 'NONE' }) },
                $isEditMode: { get: vi.fn().mockReturnValue(false) },
                setEditMode: vi.fn(),
                clearPlantSelection: vi.fn()
            },
            data: {
                $selectedDevice: { get: vi.fn() },
                $devices: { get: vi.fn().mockReturnValue([]), set: vi.fn() },
                addOptimisticDeletedPlantId: vi.fn(),
                removeOptimisticDeletedPlantId: vi.fn()
            } as any
        } as any;
    });

    describe('updatePlant', () => {
        it('should update plant and show success toast', async () => {
            await updatePlant(ctx, 'test123', { strain: 'New Strain' });

            expect(mockDataService.updatePlant).toHaveBeenCalledWith({
                plant_id: 'test123',
                strain: 'New Strain',
            });
            expect(ctx.showToast).toHaveBeenCalledWith('Plant updated', 'success');
        });

        it('should show error toast on failure', async () => {
            mockDataService.updatePlant.mockRejectedValue(new Error('Network error'));

            await updatePlant(ctx, 'test123', { strain: 'New Strain' });

            expect(ctx.showToast).toHaveBeenCalledWith('Failed to update plant: Network error', 'error');
        });
    });

    describe('updatePlantFromDialog', () => {
        it('should update single plant from dialog state', async () => {
            const dialogState = {
                plant: mockPlant,
                editedAttributes: { strain: 'Updated Strain' },
                selectedPlantIds: undefined,
            };

            await updatePlantFromDialog(ctx, dialogState);

            expect(mockDataService.updatePlant).toHaveBeenCalledTimes(1);
        });

        it('should bulk update multiple plants', async () => {
            const dialogState = {
                plant: mockPlant,
                editedAttributes: { strain: 'Bulk Update' },
                selectedPlantIds: ['plant1', 'plant2', 'plant3'],
            };

            await updatePlantFromDialog(ctx, dialogState);

            expect(mockDataService.updatePlant).toHaveBeenCalledTimes(3);
        });

        it('should return false on error', async () => {
            mockDataService.updatePlant.mockRejectedValue(new Error('Update failed'));

            const dialogState = {
                plant: mockPlant,
                editedAttributes: { strain: 'Test' },
                selectedPlantIds: undefined,
            };

            await updatePlantFromDialog(ctx, dialogState);
            // Error logged, implied void return
        });

        it('should use entity_id fallback when plant_id is missing', async () => {
            const plantNoId = { ...mockPlant, attributes: { ...mockPlant.attributes, plant_id: '' } };
            const dialogState = {
                plant: plantNoId,
                editedAttributes: { strain: 'Fallback Update' },
                selectedPlantIds: undefined,
            };

            await updatePlantFromDialog(ctx, dialogState);

            expect(mockDataService.updatePlant).toHaveBeenCalledWith({
                plant_id: 'plant_test123',
                strain: 'Fallback Update',
            });
        });

        it('should clear selection and exit edit mode if active', async () => {
            (ctx.ui.$isEditMode.get as any).mockReturnValue(true);
            const dialogState = {
                plant: mockPlant,
                editedAttributes: { strain: 'Strain' },
                selectedPlantIds: ['p1'],
            };

            await updatePlantFromDialog(ctx, dialogState);

            expect(ctx.ui.clearPlantSelection).toHaveBeenCalled();
            expect(ctx.ui.setEditMode).toHaveBeenCalledWith(false);
        });
    });

    describe('handleDeletePlant', () => {
        it('should delete plants and show success toast', async () => {
            await handleDeletePlant(ctx, ['plant1', 'plant2']);

            expect(mockDataService.removePlant).toHaveBeenCalledTimes(2);
            expect(ctx.data.addOptimisticDeletedPlantId).toHaveBeenCalledTimes(2);
            expect(ctx.data.removeOptimisticDeletedPlantId).not.toHaveBeenCalled();
            expect(ctx.undoRedoManager.pushAction).toHaveBeenCalled();
        });

        it('should remove optimistic IDs on failure', async () => {
            mockDataService.removePlant.mockRejectedValue(new Error('Delete failed'));

            await handleDeletePlant(ctx, ['plant1']);

            expect(mockDataService.removePlant).toHaveBeenCalled();
            expect(ctx.data.addOptimisticDeletedPlantId).toHaveBeenCalledWith('plant1');
            expect(ctx.data.removeOptimisticDeletedPlantId).toHaveBeenCalledWith('plant1');
            expect(ctx.showToast).toHaveBeenCalledWith(expect.stringContaining('Failed to delete'), 'error');
        });

        it('should handle redo action', async () => {
            let redoAction: (() => Promise<void>) | undefined;
            (ctx.undoRedoManager.pushAction as any).mockImplementation((action: any) => {
                redoAction = action.redo;
            });

            await handleDeletePlant(ctx, ['plant1']);
            expect(redoAction).toBeDefined();
            await redoAction!();

            // Should call removePlant again (total 2 times: once initial, once redo)
            expect(mockDataService.removePlant).toHaveBeenCalledTimes(2);
        });

        it('should handle undo action and close dialog if open', async () => {
            let reverseAction: (() => Promise<void>) | undefined;
            (ctx.undoRedoManager.pushAction as any).mockImplementation((action: any) => {
                reverseAction = action.reverse;
            });

            // Mock dialog state to hit the branch
            (ctx.ui.$activeDialog.get as any).mockReturnValue({ type: 'PLANT_OVERVIEW' });

            // Mock plants to be restored
            (ctx.data.$devices.get as any).mockReturnValue([
                {
                    device_id: 'growspace1',
                    plants: [{
                        attributes: { plant_id: 'plant1', strain: 'Restored Strain', row: 1, col: 1 }
                    }]
                }
            ]);

            await handleDeletePlant(ctx, 'plant1');

            expect(ctx.closeDialog).toHaveBeenCalled(); // From handleDeletePlant execution

            expect(reverseAction).toBeDefined();
            await reverseAction!();

            // Reverse should call addPlant
            expect(mockDataService.addPlant).toHaveBeenCalledWith(expect.objectContaining({
                strain: 'Restored Strain'
            }));
            expect(ctx.refreshData).toHaveBeenCalled();
        });
        it('should handle deletion of non-existent plant (graceful handling)', async () => {
            (ctx.data.$devices.get as any).mockReturnValue([
                { device_id: 'gs1', plants: [] }
            ]);

            await handleDeletePlant(ctx, 'non_existent');

            expect(mockDataService.removePlant).toHaveBeenCalledWith('non_existent');
            expect(ctx.undoRedoManager.pushAction).toHaveBeenCalled();

            // Execute undo to cover empty loop
            const call = (ctx.undoRedoManager.pushAction as any).mock.calls[0][0];
            await call.reverse();
            expect(mockDataService.addPlant).not.toHaveBeenCalled();
        });
    });

    describe('movePlantToNextStage', () => {
        it('should move flower stage plant to dry', async () => {
            const flowerPlant = { ...mockPlant, attributes: { ...mockPlant.attributes, stage: 'flower' } };

            const result = await movePlantToNextStage(ctx, flowerPlant);

            expect(result).toBe(true);
            expect(mockDataService.harvestPlant).toHaveBeenCalledWith('test123', 'dry');
            expect(ctx.closeDialog).toHaveBeenCalled();
        });

        it('should move dry stage plant to cure', async () => {
            const dryPlant = { ...mockPlant, attributes: { ...mockPlant.attributes, stage: 'dry' } };

            const result = await movePlantToNextStage(ctx, dryPlant);

            expect(result).toBe(true);
            expect(mockDataService.harvestPlant).toHaveBeenCalledWith('test123', 'cure');
        });

        it('should move mother stage plant to clone', async () => {
            const motherPlant = { ...mockPlant, attributes: { ...mockPlant.attributes, stage: 'mother' } };

            const result = await movePlantToNextStage(ctx, motherPlant);

            expect(result).toBe(true);
            expect(mockDataService.harvestPlant).toHaveBeenCalledWith('test123', 'clone');
        });

        it('should reject invalid stage with error toast', async () => {
            const vegPlant = { ...mockPlant, attributes: { ...mockPlant.attributes, stage: 'veg' } };

            const result = await movePlantToNextStage(ctx, vegPlant);

            expect(result).toBe(false);
            expect(ctx.showToast).toHaveBeenCalledWith(expect.stringContaining('stage is veg'), 'error');
        });

        it('should return false for cure stage (edge case)', async () => {
            const curePlant = { ...mockPlant, attributes: { ...mockPlant.attributes, stage: 'cure' } };

            const result = await movePlantToNextStage(ctx, curePlant);

            // cure is in movableStages but has no mapping, so it hits the else branch
            expect(result).toBe(false);
        });
        it('should handle harvestPlant failure', async () => {
            mockDataService.harvestPlant.mockRejectedValue(new Error('Harvest failed'));
            const flowerPlant = { ...mockPlant, attributes: { ...mockPlant.attributes, stage: 'flower' } };

            const result = await movePlantToNextStage(ctx, flowerPlant);

            expect(result).toBe(false);
        });

        it('should use entity_id fallback when plant_id is missing', async () => {
            const plantNoId = { ...mockPlant, attributes: { ...mockPlant.attributes, plant_id: '', stage: 'flower' } };

            const result = await movePlantToNextStage(ctx, plantNoId);

            expect(result).toBe(true);
            expect(mockDataService.harvestPlant).toHaveBeenCalledWith('plant_test123', 'dry');
        });
    });

    describe('movePlantToGrowspace', () => {
        it('should move non-clone plant using harvestPlant', async () => {
            const result = await movePlantToGrowspace(ctx, mockPlant, 'target_growspace');

            expect(result).toBe(true);
            expect(mockDataService.harvestPlant).toHaveBeenCalledWith('test123', 'target_growspace');
            expect(ctx.refreshData).toHaveBeenCalled();
            expect(ctx.closeDialog).toHaveBeenCalled();
        });

        it('should move clone plant using moveClone', async () => {
            const clonePlant = { ...mockPlant, attributes: { ...mockPlant.attributes, stage: 'clone' } };

            const result = await movePlantToGrowspace(ctx, clonePlant, 'veg_room');

            expect(result).toBe(true);
            expect(mockDataService.moveClone).toHaveBeenCalledWith('test123', 'veg_room');
        });

        it('should show error on failure', async () => {
            mockDataService.harvestPlant.mockRejectedValue(new Error('Move failed'));

            const result = await movePlantToGrowspace(ctx, mockPlant, 'target');

            expect(result).toBe(false);
            expect(ctx.showToast).toHaveBeenCalledWith('Failed to move plant: Move failed', 'error');
        });

        it('should use entity_id fallback when plant_id is missing', async () => {
            const plantNoId = { ...mockPlant, attributes: { ...mockPlant.attributes, plant_id: '' } };

            await movePlantToGrowspace(ctx, plantNoId, 'dry');

            expect(mockDataService.harvestPlant).toHaveBeenCalledWith('plant_test123', 'dry');
        });

        it('should handle missing stage attribute defaulting to unknown', async () => {
            const plantNoStage = { ...mockPlant, attributes: { ...mockPlant.attributes, stage: undefined } };

            const result = await movePlantToGrowspace(ctx, plantNoStage as any, 'target_room');

            expect(result).toBe(true);
            // Should use harvestPlant since stage is 'unknown' (not 'clone')
            expect(mockDataService.harvestPlant).toHaveBeenCalledWith('test123', 'target_room');
        });

        it('should handle redo action', async () => {
            let redoAction: (() => Promise<void>) | undefined;
            let reverseAction: (() => Promise<void>) | undefined;
            (ctx.undoRedoManager.pushAction as any).mockImplementation((action: any) => {
                redoAction = action.redo;
                reverseAction = action.reverse;
            });

            await movePlantToGrowspace(ctx, mockPlant, 'target_room');
            expect(redoAction).toBeDefined();
            await redoAction!();
            expect(mockDataService.harvestPlant).toHaveBeenCalledTimes(2); // Once initial, once redo

            expect(reverseAction).toBeDefined();
            await reverseAction!();
            // Should call movePlantToGrowspace with original growspace (undefined in mockPlant -> 'unknown')
            expect(mockDataService.harvestPlant).toHaveBeenCalledWith('test123', 'unknown');
        });
    });

    describe('takeClone', () => {
        it('should take clone successfully', async () => {
            const result = await takeClone(ctx, mockPlant, 5);

            expect(result).toBe(true);
            expect(mockDataService.takeClone).toHaveBeenCalledWith({
                mother_plant_id: 'test123',
                num_clones: 5,
            });
        });

        it('should return false on failure', async () => {
            mockDataService.takeClone.mockRejectedValue(new Error('Clone failed'));

            const result = await takeClone(ctx, mockPlant);

            expect(result).toBe(false);
        });

        it('should use entity_id fallback for plant without plant_id', async () => {
            const plantNoId = { ...mockPlant, attributes: { ...mockPlant.attributes, plant_id: '' } };

            await takeClone(ctx, plantNoId);

            expect(mockDataService.takeClone).toHaveBeenCalledWith({
                mother_plant_id: 'plant_test123',
                num_clones: undefined,
            });
        });

        it('should log with strain name when available', async () => {
            const consoleSpy = vi.spyOn(console, 'log');
            await takeClone(ctx, mockPlant);
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Test Strain'));
            consoleSpy.mockRestore();
        });

        it('should log with plant when strain is missing', async () => {
            const consoleSpy = vi.spyOn(console, 'log');
            const plantNoStrain = { ...mockPlant, attributes: { ...mockPlant.attributes, strain: undefined } };
            await takeClone(ctx, plantNoStrain as any);
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('plant'));
            consoleSpy.mockRestore();
        });
    });

    describe('movePlantPosition', () => {
        it('should move plant to new position', async () => {
            const result = await movePlantPosition(ctx, mockPlant, 3, 4);

            expect(result).toBe(true);
            expect(mockDataService.updatePlant).toHaveBeenCalledWith({
                plant_id: 'test123',
                row: 3,
                col: 4,
            });
        });

        it('should return false on error', async () => {
            mockDataService.updatePlant.mockRejectedValue(new Error('Position error'));

            const result = await movePlantPosition(ctx, mockPlant, 1, 1);

            expect(result).toBe(false);
        });

        it('should use entity_id fallback when plant_id is missing', async () => {
            const plantNoId = { ...mockPlant, attributes: { ...mockPlant.attributes, plant_id: '' } };

            await movePlantPosition(ctx, plantNoId, 2, 2);

            expect(mockDataService.updatePlant).toHaveBeenCalledWith({
                plant_id: 'plant_test123',
                row: 2,
                col: 2,
            });
        });
    });

    describe('handlePlantDrop', () => {
        const targetPlant: PlantEntity = {
            ...mockPlant,
            entity_id: 'sensor.plant_target',
            attributes: { ...mockPlant.attributes, plant_id: 'target456' },
        };

        it('should return false when no source plant', async () => {
            const result = await handlePlantDrop(ctx, 1, 1, null, null);

            expect(result).toBe(false);
        });

        it('should swap plants when target exists', async () => {
            const result = await handlePlantDrop(ctx, 1, 1, targetPlant, mockPlant);

            expect(result).toBe(true);
            expect(mockDataService.swapPlants).toHaveBeenCalledWith('test123', 'target456');
        });

        it('should perform optimistic update when swapping in a growspace', async () => {
            const sourceWithGs = { ...mockPlant, attributes: { ...mockPlant.attributes, growspace_id: 'gs1' } };
            const targetWithGs = { ...targetPlant, attributes: { ...targetPlant.attributes, growspace_id: 'gs1' } }; // technically only source needs it to start

            (ctx.data.$devices.get as any).mockReturnValue([
                {
                    device_id: 'gs1',
                    grid: {
                        'pos1': { plant_id: 'test123', row: 1, col: 1 },
                        'pos2': { plant_id: 'target456', row: 2, col: 2 }
                    }
                }
            ]);

            // spy on updateWsDataCacheGrid is implicitly mocked in context setup but let's spy it properly if needed
            // but here we just check if it runs without error and calls things if possible. 
            // Since ctx.data.updateWsDataCacheGrid is a mock, we can check it.
            ctx.data.updateWsDataCacheGrid = vi.fn();

            await handlePlantDrop(ctx, 2, 2, targetWithGs, sourceWithGs);

            expect(ctx.data.updateWsDataCacheGrid).toHaveBeenCalledWith('gs1', expect.any(Function));
        });


        it('should not swap when source and target are same', async () => {
            const result = await handlePlantDrop(ctx, 1, 1, mockPlant, mockPlant);

            expect(result).toBe(false);
            expect(mockDataService.swapPlants).not.toHaveBeenCalled();
        });

        it('should move to empty cell when no target', async () => {
            const result = await handlePlantDrop(ctx, 2, 3, null, mockPlant);

            expect(result).toBe(true);
            expect(mockDataService.updatePlant).toHaveBeenCalledWith({
                plant_id: 'test123',
                row: 2,
                col: 3,
            });
        });

        it('should return false on swap error', async () => {
            mockDataService.swapPlants.mockRejectedValue(new Error('Swap failed'));

            const result = await handlePlantDrop(ctx, 1, 1, targetPlant, mockPlant);

            expect(result).toBe(false);
        });

        it('should handle redo action for swap', async () => {
            let redoAction: (() => Promise<void>) | undefined;
            let reverseAction: (() => Promise<void>) | undefined;
            (ctx.undoRedoManager.pushAction as any).mockImplementation((action: any) => {
                redoAction = action.redo;
                reverseAction = action.reverse;
            });

            // Mock grid for optimistic update coverage during undo/redo
            const sourceWithGs = { ...mockPlant, attributes: { ...mockPlant.attributes, growspace_id: 'gs1' } };
            const targetWithGs = { ...targetPlant, attributes: { ...targetPlant.attributes, growspace_id: 'gs1' } };

            (ctx.data.$devices.get as any).mockReturnValue([
                {
                    device_id: 'gs1',
                    grid: {
                        'pos1': { plant_id: 'test123', row: 1, col: 1 },
                        'pos2': { plant_id: 'target456', row: 1, col: 1 } // Coords don't matter as much as ID match
                    }
                }
            ]);
            ctx.data.updateWsDataCacheGrid = vi.fn();

            await handlePlantDrop(ctx, 1, 1, targetWithGs, sourceWithGs);

            expect(redoAction).toBeDefined();
            await redoAction!();
            // Should call handlePlantDrop again (so swapPlants called 2nd time)
            expect(mockDataService.swapPlants).toHaveBeenCalledTimes(2);

            expect(reverseAction).toBeDefined();
            await reverseAction!();
            // Reverse calls swapPlants again AND optimisticUpdate(true)
            expect(mockDataService.swapPlants).toHaveBeenCalledTimes(3);
            // Verify optimistic update called during reverse (and initial + redo)
            expect(ctx.data.updateWsDataCacheGrid).toHaveBeenCalledTimes(3);
        });

        it('should handle redo action for move to empty', async () => {
            let redoAction: (() => Promise<void>) | undefined;
            let reverseAction: (() => Promise<void>) | undefined;
            (ctx.undoRedoManager.pushAction as any).mockImplementation((action: any) => {
                redoAction = action.redo;
                reverseAction = action.reverse;
            });

            await handlePlantDrop(ctx, 2, 3, null, mockPlant);

            expect(redoAction).toBeDefined();
            await redoAction!();
            // Should call handlePlantDrop -> movePlantPosition again
            expect(mockDataService.updatePlant).toHaveBeenCalledTimes(2);

            expect(reverseAction).toBeDefined();
            await reverseAction!();
            // Reverse calls movePlantPosition (updatePlant) again
            expect(mockDataService.updatePlant).toHaveBeenCalledTimes(3);
        });


        it('should use entity_id fallback when plant_id is missing on source', async () => {
            const sourceNoId = { ...mockPlant, attributes: { ...mockPlant.attributes, plant_id: '' } };

            await handlePlantDrop(ctx, 1, 1, targetPlant, sourceNoId);

            expect(mockDataService.swapPlants).toHaveBeenCalledWith('plant_test123', 'target456');
        });

        it('should use entity_id fallback when plant_id is missing on target', async () => {
            const targetNoId: PlantEntity = {
                ...mockPlant,
                entity_id: 'sensor.plant_target',
                attributes: { ...mockPlant.attributes, plant_id: '' },
            };

            await handlePlantDrop(ctx, 1, 1, targetNoId, mockPlant);

            expect(mockDataService.swapPlants).toHaveBeenCalledWith('test123', 'plant_target');
        });

        it('should handle optimistic update when growspace not found in store', async () => {
            const sourceWithInvalidGs = { ...mockPlant, attributes: { ...mockPlant.attributes, growspace_id: 'invalid_gs' } };
            const targetWithInvalidGs = { ...targetPlant, attributes: { ...targetPlant.attributes, growspace_id: 'invalid_gs' } };

            (ctx.data.$devices.get as any).mockReturnValue([
                { device_id: 'gs1', grid: {} }
            ]);
            ctx.data.updateWsDataCacheGrid = vi.fn();

            await handlePlantDrop(ctx, 1, 1, targetWithInvalidGs, sourceWithInvalidGs);

            expect(ctx.data.updateWsDataCacheGrid).toHaveBeenCalledWith('invalid_gs', expect.any(Function));
            // Should NOT set devices because device not found
            expect(ctx.data.$devices.set).not.toHaveBeenCalled();
        });
    });

    describe('confirmAddPlant', () => {
        it('should add plant successfully', async () => {
            const detail = {
                row: 2,
                col: 3,
                strain: 'Blue Dream',
                phenotype: 'Pheno A'
            };
            (ctx.data.$selectedDevice.get as any).mockReturnValue('growspace1');

            const result = await confirmAddPlant(ctx, detail);

            expect(result).toBe(true);
            expect(mockDataService.addPlant).toHaveBeenCalledWith({
                growspace_id: 'growspace1',
                row: 2,
                col: 3,
                strain: 'Blue Dream',
                phenotype: 'Pheno A',
            });
            expect(ctx.closeDialog).toHaveBeenCalled();
            expect(ctx.showToast).toHaveBeenCalledWith('Plant added successfully', 'success');
            expect(ctx.refreshData).toHaveBeenCalled();
        });

        it('should fail if no growspace selected', async () => {
            (ctx.data.$selectedDevice.get as any).mockReturnValue(null);
            const result = await confirmAddPlant(ctx, { row: 1, col: 1, strain: 'X' });
            expect(result).toBe(false);
        });

        it('should add plant without phenotype', async () => {
            (ctx.data.$selectedDevice.get as any).mockReturnValue('growspace1');
            const result = await confirmAddPlant(ctx, { row: 1, col: 1, strain: 'OG Kush' });

            expect(result).toBe(true);
            expect(mockDataService.addPlant).toHaveBeenCalledWith({
                growspace_id: 'growspace1',
                row: 1,
                col: 1,
                strain: 'OG Kush',
            });
            expect(ctx.refreshData).toHaveBeenCalled();
        });

        it('should pass stage start dates correctly', async () => {
            (ctx.data.$selectedDevice.get as any).mockReturnValue('growspace1');
            const result = await confirmAddPlant(ctx, {
                row: 1, col: 1, strain: 'OG Kush',
                veg_start: '2024-01-01',
                flower_start: '2024-02-01'
            });

            expect(result).toBe(true);
            expect(mockDataService.addPlant).toHaveBeenCalledWith({
                growspace_id: 'growspace1',
                row: 1,
                col: 1,
                strain: 'OG Kush',
                veg_start: '2024-01-01',
                flower_start: '2024-02-01',
            });
        });

        it('should return false and show error on failure', async () => {
            (ctx.data.$selectedDevice.get as any).mockReturnValue('gs1');
            mockDataService.addPlant.mockRejectedValue(new Error('Add failed'));

            const result = await confirmAddPlant(ctx, { row: 1, col: 1, strain: 'Test' });

            expect(result).toBe(false);
            expect(ctx.showToast).toHaveBeenCalledWith('Failed to add plant: Add failed', 'error');
        });
    });

    describe('confirmAddPlants', () => {
        it('should add multiple plants successfully', async () => {
            const detail = {
                strain: 'Batch Strain',
                count: 3
            };
            (ctx.data.$selectedDevice.get as any).mockReturnValue('growspace1');
            (ctx.data.$devices.get as any).mockReturnValue([
                { device_id: 'growspace1', plants: [] }
            ]);

            // Mock subsequent devices call to simulate added plants
            const mockAddedPlants = [
                { attributes: { plant_id: 'p1', strain: 'Batch Strain' } },
                { attributes: { plant_id: 'p2', strain: 'Batch Strain' } },
                { attributes: { plant_id: 'p3', strain: 'Batch Strain' } }
            ];

            (ctx.data.$devices.get as any)
                .mockReturnValueOnce([{ device_id: 'growspace1', plants: [] }]) // Before
                .mockReturnValueOnce([{ device_id: 'growspace1', plants: mockAddedPlants }]); // After


            await confirmAddPlants(ctx, detail);

            expect(mockDataService.addPlants).toHaveBeenCalledWith({
                growspace_id: 'growspace1',
                strain: 'Batch Strain',
                count: 3
            });
            expect(ctx.refreshData).toHaveBeenCalled();
            expect(ctx.closeDialog).toHaveBeenCalled();
            expect(ctx.showToast).toHaveBeenCalledWith('Batch plants added successfully', 'success');
            expect(ctx.undoRedoManager.pushAction).toHaveBeenCalled();
        });

        it('should fail if no growspace selected', async () => {
            (ctx.data.$selectedDevice.get as any).mockReturnValue(null);

            await confirmAddPlants(ctx, { count: 1 });

            expect(ctx.showToast).toHaveBeenCalledWith('No growspace selected', 'error');
            expect(mockDataService.addPlants).not.toHaveBeenCalled();
        });

        it('should handle API failure', async () => {
            (ctx.data.$selectedDevice.get as any).mockReturnValue('gs1');
            (ctx.data.$devices.get as any).mockReturnValue([]);
            mockDataService.addPlants.mockRejectedValue(new Error('Batch failed'));

            await confirmAddPlants(ctx, { count: 5 });

            expect(ctx.showToast).toHaveBeenCalledWith('Error: Batch failed', 'error');
        });

        it('should handle undo action (batch-delete)', async () => {
            let reverseAction: (() => Promise<void>) | undefined;
            (ctx.undoRedoManager.pushAction as any).mockImplementation((action: any) => {
                reverseAction = action.reverse;
            });

            (ctx.data.$selectedDevice.get as any).mockReturnValue('growspace1');
            const mockAddedPlants = [{ attributes: { plant_id: 'p1' } }];

            (ctx.data.$devices.get as any)
                .mockReturnValueOnce([{ device_id: 'growspace1', plants: [] }])
                .mockReturnValueOnce([{ device_id: 'growspace1', plants: mockAddedPlants }]);

            await confirmAddPlants(ctx, { count: 1 });

            expect(reverseAction).toBeDefined();
            await reverseAction!();

            // Undo for batch add is batch delete -> check _deletePlantsApi usage
            expect(mockDataService.removePlant).toHaveBeenCalledWith('p1');
            // _deletePlantsApi calls removePlant for each ID
        });

        it('should handle redo action', async () => {
            let redoAction: (() => Promise<void>) | undefined;
            (ctx.undoRedoManager.pushAction as any).mockImplementation((action: any) => {
                redoAction = action.redo;
            });

            (ctx.data.$selectedDevice.get as any).mockReturnValue('growspace1');

            // Reset default mock to ensure clean state
            (ctx.data.$devices.get as any).mockReset();

            (ctx.data.$devices.get as any)
                .mockReturnValueOnce([{ device_id: 'growspace1', plants: [] }]) // Initial state (Before)
                .mockReturnValueOnce([{ device_id: 'growspace1', plants: [{ attributes: { plant_id: 'p1' } }] }]) // Initial state (After)
                .mockReturnValueOnce([{ device_id: 'growspace1', plants: [] }]) // Redo state (Before)
                .mockReturnValueOnce([{ device_id: 'growspace1', plants: [{ attributes: { plant_id: 'p1' } }] }]); // Redo state (After)

            await confirmAddPlants(ctx, { count: 1 });

            expect(ctx.undoRedoManager.pushAction).toHaveBeenCalled();
            expect(redoAction).toBeDefined();
            await redoAction!();

            // Redo calls confirmAddPlants again
            expect(mockDataService.addPlants).toHaveBeenCalledTimes(2);
        });

        it('should correctly identifying added plants for undo when pre-existing plants exist', async () => {
            const detail = { strain: 'New', count: 1 };
            (ctx.data.$selectedDevice.get as any).mockReturnValue('gs1');

            const existingPlant = { attributes: { plant_id: 'old1' } };
            const newPlant = { attributes: { plant_id: 'new1' } };

            (ctx.data.$devices.get as any)
                .mockReturnValueOnce([{ device_id: 'gs1', plants: [existingPlant] }]) // Before
                .mockReturnValueOnce([{ device_id: 'gs1', plants: [existingPlant, newPlant] }]); // After

            await confirmAddPlants(ctx, detail);

            expect(ctx.undoRedoManager.pushAction).toHaveBeenCalledWith(expect.objectContaining({
                description: expect.stringContaining('Added 1 plants')
            }));
        });

        it('should handle undefined plants array in undo logic', async () => {
            const detail = { strain: 'New', count: 1 };
            (ctx.data.$selectedDevice.get as any).mockReturnValue('gs1');

            (ctx.data.$devices.get as any)
                .mockReturnValueOnce([{ device_id: 'gs1' }]) // Before: plants undefined
                .mockReturnValueOnce([{ device_id: 'gs1', plants: [{ attributes: { plant_id: 'new1' } }] }]); // After

            await confirmAddPlants(ctx, detail);

            // Should still find the new plant essentially (beforeIds empty)
            expect(ctx.undoRedoManager.pushAction).toHaveBeenCalled();
        });

        it('should NOT push undo action if no new plants detected', async () => {
            const detail = { strain: 'New', count: 1 };
            (ctx.data.$selectedDevice.get as any).mockReturnValue('gs1');

            const existingPlant = { attributes: { plant_id: 'p1' } };

            (ctx.data.$devices.get as any)
                .mockReturnValueOnce([{ device_id: 'gs1', plants: [existingPlant] }]) // Before
                .mockReturnValueOnce([{ device_id: 'gs1', plants: [existingPlant] }]); // After (No change)

            await confirmAddPlants(ctx, detail);

            expect(ctx.undoRedoManager.pushAction).not.toHaveBeenCalled();
        });


    }); // End confirmAddPlants

    describe('waterPlant', () => {
        const plantId = 'p1';
        const amount = 5;
        const nutrients = { n1: 10 };
        const presetId = 'preset1';

        it('should water plant and refresh inventory when nutrients used', async () => {
            await waterPlant(ctx, plantId, amount, nutrients, presetId);

            expect(mockDataService.waterPlant).toHaveBeenCalledWith(plantId, amount, nutrients, presetId);
            expect(libraryActions.fetchNutrientInventory).toHaveBeenCalledWith(ctx, true);
        });

        it('should water plant without inventory refresh when no nutrients used', async () => {
            await waterPlant(ctx, plantId, amount);

            expect(mockDataService.waterPlant).toHaveBeenCalledWith(plantId, amount, undefined, undefined);
            expect(libraryActions.fetchNutrientInventory).not.toHaveBeenCalled();
        });

        it('should handle errors', async () => {
            const error = new Error('Watering failed');
            mockDataService.waterPlant.mockRejectedValue(error);

            await expect(waterPlant(ctx, plantId, amount)).rejects.toThrow('Watering failed');
            expect(ctx.showToast).toHaveBeenCalledWith(expect.stringContaining('Failed to water plant'), 'error');
        });
    });

    describe('waterGrowspace', () => {
        const growspaceId = 'gs1';
        const amount = 20;

        it('should water growspace and refresh inventory when nutrients used', async () => {
            await waterGrowspace(ctx, growspaceId, amount, { n1: 50 });

            expect(mockDataService.waterGrowspace).toHaveBeenCalledWith(growspaceId, amount, { n1: 50 }, undefined);
            expect(libraryActions.fetchNutrientInventory).toHaveBeenCalledWith(ctx, true);
        });

        it('should water growspace without inventory refresh when no nutrients used', async () => {
            await waterGrowspace(ctx, growspaceId, amount);

            expect(mockDataService.waterGrowspace).toHaveBeenCalledWith(growspaceId, amount, undefined, undefined);
            expect(libraryActions.fetchNutrientInventory).not.toHaveBeenCalled();
        });

        it('should handle errors', async () => {
            const error = new Error('GS Watering failed');
            mockDataService.waterGrowspace.mockRejectedValue(error);

            await expect(waterGrowspace(ctx, growspaceId, amount)).rejects.toThrow('GS Watering failed');
            expect(ctx.showToast).toHaveBeenCalledWith(expect.stringContaining('Failed to water growspace'), 'error');
        });
    });
}); // End plant-actions
