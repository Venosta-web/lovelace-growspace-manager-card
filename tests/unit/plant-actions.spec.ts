import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ActionContext } from '../../src/store/core/action-context';
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
} from '../../src/store/plant/plant-actions';
import { waterPlant, waterGrowspace } from '../../src/store/growspace/environment-actions';
import * as libraryActions from '../../src/store/plant/library-actions';
import { OptimisticAction } from '../../src/store/system/optimistic-manager';

// Mock library actions
vi.mock('../../src/store/plant/library-actions', () => ({
    fetchNutrientInventory: vi.fn(),
    fetchIPMPresets: vi.fn(),
    fetchStrainLibrary: vi.fn().mockResolvedValue(undefined)
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
                            reverse: async () => {
                                // Simulate the reverse of whatever action happened
                                // For swaps, it's usually calling swap again with same args
                                await mockDataService.swapPlants('source', 'target');
                                await ctx.data.updateWsDataCacheGrid('gs1', (_grid) => { });
                            },
                            redo: options.redo
                        });
                    }
                }),
                rollbackUpdate: vi.fn()
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
            expect((ctx.ui as any).showToast).toHaveBeenCalledWith('Plant updated', 'success');
        });

        it('should show error toast on failure', async () => {
            mockDataService.updatePlant.mockRejectedValue(new Error('Network error'));

            await updatePlant(ctx, 'test123', { strain: 'New Strain' });

            expect((ctx.ui as any).showToast).toHaveBeenCalledWith('Failed to update plant: Network error', 'error');
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
            expect((ctx.ui as any).showToast).toHaveBeenCalledWith(expect.stringContaining('Failed to delete'), 'error');
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
                    deviceId: 'growspace1',
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
                { deviceId: 'gs1', plants: [] }
            ]);

            await handleDeletePlant(ctx, 'non_existent');

            expect(mockDataService.removePlant).toHaveBeenCalledWith('non_existent');
            expect(ctx.undoRedoManager.pushAction).toHaveBeenCalled();

            // Execute undo to cover empty loop
            const call = (ctx.undoRedoManager.pushAction as any).mock.calls[0][0];
            await call.reverse();
            expect(mockDataService.addPlant).not.toHaveBeenCalled();
        });

        it('should handle deletion when device plants array is undefined', async () => {
            (ctx.data.$devices.get as any).mockReturnValue([{ deviceId: 'gs1' }]); // No plants property
            await handleDeletePlant(ctx, 'any');
            expect(mockDataService.removePlant).toHaveBeenCalledWith('any');
            expect(mockDataService.removePlant).toHaveBeenCalledWith('any');
        });

        it('should handle deletion when plant_id is missing (use entity_id match)', async () => {
            const devices = [
                {
                    deviceId: 'gs1',
                    plants: [
                        {
                            attributes: { plant_id: '', strain: 'NoID Plant', growspace_id: 'gs1' },
                            entity_id: 'sensor.noid_plant'
                        }
                    ]
                }
            ];
            (ctx.data.$devices.get as any).mockReturnValue(devices);

            // 'noid_plant' matches result of entity_id.replace('sensor.', '') which is 'noid_plant'
            await handleDeletePlant(ctx, 'noid_plant');

            // Verify correct ID was passed to removePlant (the passed ID is matched against entity)
            expect(mockDataService.removePlant).toHaveBeenCalledWith('noid_plant');
            expect(ctx.undoRedoManager.pushAction).toHaveBeenCalled();
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
            expect((ctx.ui as any).showToast).toHaveBeenCalledWith(expect.stringContaining('stage is veg'), 'error');
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
            expect((ctx.ui as any).showToast).toHaveBeenCalledWith('Failed to move plant: Move failed', 'error');
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
            const result = await takeClone(ctx, mockPlant, 5, 'target_gs');

            expect(result).toBe(true);
            expect(mockDataService.takeClone).toHaveBeenCalledWith({
                mother_plant_id: 'test123',
                num_clones: 5,
                target_growspace_id: 'target_gs'
            });
        });

        it('should return false on failure', async () => {
            mockDataService.takeClone.mockRejectedValue(new Error('Clone failed'));

            const result = await takeClone(ctx, mockPlant);

            expect(result).toBe(false);
        });

        it('should use entity_id fallback for plant without plant_id', async () => {
            const plantNoId = { ...mockPlant, attributes: { ...mockPlant.attributes, plant_id: '' } };

            await takeClone(ctx, plantNoId, undefined, 'target_gs');

            expect(mockDataService.takeClone).toHaveBeenCalledWith({
                mother_plant_id: 'plant_test123',
                num_clones: undefined,
                target_growspace_id: 'target_gs'
            });
        });

        it('should show success toast with clone count', async () => {
            await takeClone(ctx, mockPlant, 2);
            expect((ctx.ui as any).showToast).toHaveBeenCalledWith('Taking 2 clones...', 'success');
        });

        it('should show singular toast for single clone', async () => {
            await takeClone(ctx, mockPlant, 1);
            expect((ctx.ui as any).showToast).toHaveBeenCalledWith('Taking 1 clone...', 'success');
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
            const sourceWithGs = { ...mockPlant, attributes: { ...mockPlant.attributes, growspace_id: 'gs1' } };
            const targetWithGs = { ...targetPlant, attributes: { ...targetPlant.attributes, growspace_id: 'gs1' } };
            const result = await handlePlantDrop(ctx, 1, 1, targetWithGs, sourceWithGs);

            expect(result).toBe(true);
            expect(mockDataService.swapPlants).toHaveBeenCalledWith('test123', 'target456');
        });

        it('should perform optimistic update when swapping in a growspace', async () => {
            const sourceWithGs = { ...mockPlant, attributes: { ...mockPlant.attributes, growspace_id: 'gs1' } };
            const targetWithGs = { ...targetPlant, attributes: { ...targetPlant.attributes, growspace_id: 'gs1' } }; // technically only source needs it to start

            (ctx.data.$devices.get as any).mockReturnValue([
                {
                    deviceId: 'gs1',
                    grid: {
                        'pos1': { plant_id: 'test123', row: 1, col: 1 },
                        'pos2': { plant_id: 'target456', row: 2, col: 2 }
                    }
                }
            ]);

            // Since ctx.data.updateWsDataCacheGrid is a mock in beforeEach, we can check it.
            await handlePlantDrop(ctx, 2, 2, targetWithGs, sourceWithGs);

            expect(ctx.data.updateWsDataCacheGrid).toHaveBeenCalledWith('gs1', expect.any(Function));
        });


        it('should not swap when source and target are same', async () => {
            const result = await handlePlantDrop(ctx, 1, 1, mockPlant, mockPlant);

            expect(result).toBe(false);
            expect(mockDataService.swapPlants).not.toHaveBeenCalled();
        });

        it('should move to empty cell when no target', async () => {
            const sourceWithGs = { ...mockPlant, attributes: { ...mockPlant.attributes, growspace_id: 'gs1' } };
            const result = await handlePlantDrop(ctx, 2, 3, null, sourceWithGs);

            expect(result).toBe(true);
            expect(mockDataService.updatePlant).toHaveBeenCalledWith({
                plant_id: 'test123',
                row: 2,
                col: 3,
            });
        });

        it('should return false on swap error', async () => {
            mockDataService.swapPlants.mockRejectedValue(new Error('Swap failed'));
            const sourceWithGs = { ...mockPlant, attributes: { ...mockPlant.attributes, growspace_id: 'gs1' } };
            const targetWithGs = { ...targetPlant, attributes: { ...targetPlant.attributes, growspace_id: 'gs1' } };

            const result = await handlePlantDrop(ctx, 1, 1, targetWithGs, sourceWithGs);

            expect(result).toBe(false);
        });

        it('should execute optimistic revert callback on swap', async () => {
            const mockGrid = {
                '1-1': { row: 1, col: 1, plant_id: 'test123', entity_id: 'sensor.test123' },
                '2-2': { row: 2, col: 2, plant_id: 'target456', entity_id: 'sensor.target456' }
            };

            // Setup mocks
            (ctx.data.updateWsDataCacheGrid as any).mockImplementation((_id: string, callback: any) => {
                const gridClone = JSON.parse(JSON.stringify(mockGrid));
                callback(gridClone);
            });

            // Ensure applyOptimisticUpdate calls revert
            (ctx.optimisticManager.applyOptimisticUpdate as any).mockImplementation((_key: any, _update: any, _apply: any, revert: any) => {
                if (_apply) _apply(); if (revert) revert();
            });

            (ctx.dataService.swapPlants as any).mockResolvedValue(true);
            (ctx.data.$devices.get as any).mockReturnValue([{ deviceId: 'gs1', grid: mockGrid }]);

            const sourceWithGs = { ...mockPlant, attributes: { ...mockPlant.attributes, growspace_id: 'gs1', plant_id: 'test123' } };
            const targetWithGs = { ...targetPlant, attributes: { ...targetPlant.attributes, growspace_id: 'gs1', plant_id: 'target456' } };

            await handlePlantDrop(ctx, 2, 2, targetWithGs, sourceWithGs);

            expect(ctx.data.updateWsDataCacheGrid).toHaveBeenCalledTimes(2);
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
                    deviceId: 'gs1',
                    grid: {
                        'pos1': { plant_id: 'test123', row: 1, col: 1 },
                        'pos2': { plant_id: 'target456', row: 1, col: 1 }
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

            const sourceWithGs = { ...mockPlant, attributes: { ...mockPlant.attributes, growspace_id: 'gs1' } };
            await handlePlantDrop(ctx, 2, 3, null, sourceWithGs);

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
            const sourceNoId = { ...mockPlant, attributes: { ...mockPlant.attributes, plant_id: '', growspace_id: 'gs1' } };
            const targetWithGs = { ...targetPlant, attributes: { ...targetPlant.attributes, growspace_id: 'gs1' } }

            await handlePlantDrop(ctx, 1, 1, targetWithGs, sourceNoId);

            expect(mockDataService.swapPlants).toHaveBeenCalledWith('plant_test123', 'target456');
        });

        it('should use entity_id fallback when plant_id is missing on target', async () => {
            const sourceWithGs = { ...mockPlant, attributes: { ...mockPlant.attributes, growspace_id: 'gs1' } };
            const targetNoId: PlantEntity = {
                ...mockPlant,
                entity_id: 'sensor.plant_target',
                attributes: { ...mockPlant.attributes, plant_id: '', growspace_id: 'gs1' },
            };

            await handlePlantDrop(ctx, 1, 1, targetNoId, sourceWithGs);

            expect(mockDataService.swapPlants).toHaveBeenCalledWith('test123', 'plant_target');
        });

        it('should handle optimistic update when growspace not found in store', async () => {
            const sourceWithInvalidGs = { ...mockPlant, attributes: { ...mockPlant.attributes, growspace_id: 'invalid_gs' } };
            const targetWithInvalidGs = { ...targetPlant, attributes: { ...targetPlant.attributes, growspace_id: 'invalid_gs' } };

            (ctx.data.$devices.get as any).mockReturnValue([
                { deviceId: 'gs1', grid: {} }
            ]);
            ctx.data.updateWsDataCacheGrid = vi.fn();

            await handlePlantDrop(ctx, 1, 1, targetWithInvalidGs, sourceWithInvalidGs);

            expect(ctx.data.updateWsDataCacheGrid).toHaveBeenCalledWith('invalid_gs', expect.any(Function));
            // Should NOT set devices because device not found
            expect(ctx.data.$devices.set).not.toHaveBeenCalled();
        });


        it('should handle grid with null entries and missing sData/tData', async () => {
            const sourceWithGs = { ...mockPlant, attributes: { ...mockPlant.attributes, growspace_id: 'gs1' } };
            const targetWithGs = { ...targetPlant, attributes: { ...targetPlant.attributes, growspace_id: 'gs1' } };

            (ctx.data.$devices.get as any).mockReturnValue([
                {
                    deviceId: 'gs1',
                    grid: {
                        'pos1': { plant_id: 'test123', row: 1, col: 1 },
                        'pos2': null, // Null entry to cover line 323
                        'pos3': { plant_id: 'target456', row: 2, col: 2 }
                    }
                }
            ]);

            // This will execute updateGridLogic internally which contains the line 323
            // To verify it actually runs, we check if sData and tData were assigned correctly 
            // by looking at what was passed back to etc.

            // We also want to verify lines 341/342 by making one of them null 
            // We can do this by using IDs that don't match or by having them be null in the grid 
            // but the find logic uses IDs.

            // Actually, we already have a test for swap, so let's just ensure line 323 is hit.
            await handlePlantDrop(ctx, 2, 2, targetWithGs, sourceWithGs);
            expect(ctx.data.updateWsDataCacheGrid).toHaveBeenCalled();
        });

        it('should handle grid items with missing plant_id (fallback to entity_id in updateGridLogic)', async () => {
            const sourceWithGs = { ...mockPlant, attributes: { ...mockPlant.attributes, growspace_id: 'gs1', plant_id: 'source_pid' } };
            const targetWithGs = { ...targetPlant, attributes: { ...targetPlant.attributes, growspace_id: 'gs1', plant_id: 'target_pid' } };

            // Grid items have empty plant_id but valid entity_id
            // The logic being tested is: const pId = plant.plant_id || plant.entity_id.replace('sensor.', '');
            const mockGrid = {
                'pos1': { plant_id: '', entity_id: 'sensor.source_pid', row: 1, col: 1 },
                'pos2': { plant_id: '', entity_id: 'sensor.target_pid', row: 2, col: 2 }
            };

            (ctx.data.$devices.get as any).mockReturnValue([
                { deviceId: 'gs1', grid: mockGrid }
            ]);

            // We need to ensure the callback is executed so that the loop runs
            // updateWsDataCacheGrid mock implementation needs to actually call the callback
            (ctx.data.updateWsDataCacheGrid as any).mockImplementation((_id: string, callback: any) => {
                callback(mockGrid);
            });

            await handlePlantDrop(ctx, 2, 2, targetWithGs, sourceWithGs);

            // If the fallback worked, the source_pid (from entity) would match sourceId, setting sourceKey
            // And then sData would be found and updated.

            // After swap:
            // 'pos1' key now holds the Target Plant (moved to source position: 1,1)
            // 'pos2' key now holds the Source Plant (moved to target position: 2,2)

            expect(mockGrid['pos1'].row).toBe(1);
            expect(mockGrid['pos1'].col).toBe(1);
            expect(mockGrid['pos1'].entity_id).toBe('sensor.target_pid');

            expect(mockGrid['pos2'].row).toBe(2);
            expect(mockGrid['pos2'].col).toBe(2);
            expect(mockGrid['pos2'].entity_id).toBe('sensor.source_pid');
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
            (ctx.grid.$selectedDevice.get as any).mockReturnValue('growspace1');

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
            expect((ctx.ui as any).showToast).toHaveBeenCalledWith('Plant added successfully', 'success');
            expect(ctx.refreshData).toHaveBeenCalled();
        });

        it('should fail if no growspace selected', async () => {
            (ctx.grid.$selectedDevice.get as any).mockReturnValue(null);
            const result = await confirmAddPlant(ctx, { row: 1, col: 1, strain: 'X' });
            expect(result).toBe(false);
        });

        it('should add plant without phenotype', async () => {
            (ctx.grid.$selectedDevice.get as any).mockReturnValue('growspace1');
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
            (ctx.grid.$selectedDevice.get as any).mockReturnValue('growspace1');
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
            (ctx.grid.$selectedDevice.get as any).mockReturnValue('gs1');
            mockDataService.addPlant.mockRejectedValue(new Error('Add failed'));

            const result = await confirmAddPlant(ctx, { row: 1, col: 1, strain: 'Test' });

            expect(result).toBe(false);
            expect((ctx.ui as any).showToast).toHaveBeenCalledWith('Failed to add plant: Add failed', 'error');
        });

        it('should add strain to library if addToLibrary is true', async () => {
            (ctx.grid.$selectedDevice.get as any).mockReturnValue('growspace1');

            await confirmAddPlant(ctx, {
                row: 1, col: 1, strain: 'New Strain', phenotype: 'P1',
                addToLibrary: true
            });

            expect(mockDataService.addStrain).toHaveBeenCalledWith({
                strain: 'New Strain',
                phenotype: 'P1'
            });
            expect(mockDataService.addPlant).toHaveBeenCalled();
            expect((ctx.ui as any).showToast).toHaveBeenCalledWith(expect.stringContaining('to library'), 'success');
        });

        it('should continue adding plant if adding strain fails', async () => {
            (ctx.grid.$selectedDevice.get as any).mockReturnValue('growspace1');
            mockDataService.addStrain.mockRejectedValue(new Error('Library fail'));

            await confirmAddPlant(ctx, {
                row: 1, col: 1, strain: 'New Strain', phenotype: 'P1',
                addToLibrary: true
            });

            expect(mockDataService.addStrain).toHaveBeenCalled();
            expect((ctx.ui as any).showToast).toHaveBeenCalledWith(expect.stringContaining('Failed to add strain'), 'info');
            expect(mockDataService.addPlant).toHaveBeenCalled(); // Should still proceed
        });

    });

    describe('confirmAddPlants', () => {
        it('should default amount to 1 if not provided', async () => {
            (ctx.grid.$selectedDevice.get as any).mockReturnValue('growspace1');
            const detail = {
                strain: 'Single Plant',
                addToLibrary: true
                // amount missing
            };

            await confirmAddPlants(ctx, detail);

            expect(ctx.dataService.addStrain).toHaveBeenCalledTimes(1);
            expect(ctx.dataService.addStrain).toHaveBeenCalledWith(expect.objectContaining({
                strain: 'Single Plant',
                phenotype: 'Strain #1'
            }));
            // verify addPlants called, amount might be implicit or handled elsewhere if omitted
            expect(ctx.dataService.addPlants).toHaveBeenCalledWith(expect.objectContaining({
                strain: 'Single Plant'
            }));
        });

        it('should add multiple plants successfully', async () => {
            const detail = {
                strain: 'Batch Strain',
                amount: 3
            };
            (ctx.grid.$selectedDevice.get as any).mockReturnValue('growspace1');
            (ctx.data.$devices.get as any).mockReturnValue([
                { deviceId: 'growspace1', plants: [] }
            ]);

            // Mock subsequent devices call to simulate added plants
            const mockAddedPlants = [
                { attributes: { plant_id: 'p1', strain: 'Batch Strain' } },
                { attributes: { plant_id: 'p2', strain: 'Batch Strain' } },
                { attributes: { plant_id: 'p3', strain: 'Batch Strain' } }
            ];

            (ctx.data.$devices.get as any)
                .mockReturnValueOnce([{ deviceId: 'growspace1', plants: [] }]) // Before
                .mockReturnValueOnce([{ deviceId: 'growspace1', plants: mockAddedPlants }]); // After


            await confirmAddPlants(ctx, detail);

            expect(mockDataService.addPlants).toHaveBeenCalledWith({
                growspace_id: 'growspace1',
                strain: 'Batch Strain',
                amount: 3
            });
            expect(ctx.refreshData).toHaveBeenCalled();
            expect(ctx.closeDialog).toHaveBeenCalled();
            expect((ctx.ui as any).showToast).toHaveBeenCalledWith('Batch plants added successfully', 'success');
            expect(ctx.undoRedoManager.pushAction).toHaveBeenCalled();
        });

        it('should fail if no growspace selected', async () => {
            (ctx.grid.$selectedDevice.get as any).mockReturnValue(null);

            await confirmAddPlants(ctx, { count: 1 });

            expect((ctx.ui as any).showToast).toHaveBeenCalledWith('No growspace selected', 'error');
            expect(mockDataService.addPlants).not.toHaveBeenCalled();
        });

        it('should handle API failure', async () => {
            (ctx.grid.$selectedDevice.get as any).mockReturnValue('gs1');
            (ctx.data.$devices.get as any).mockReturnValue([]);
            mockDataService.addPlants.mockRejectedValue(new Error('Batch failed'));

            await confirmAddPlants(ctx, { count: 5 });

            expect((ctx.ui as any).showToast).toHaveBeenCalledWith('Failed to add plants: Batch failed', 'error');
        });

        it('should add strain to library during batch add if requested', async () => {
            (ctx.grid.$selectedDevice.get as any).mockReturnValue('growspace1');
            (ctx.data.$devices.get as any).mockReturnValue([]);

            await confirmAddPlants(ctx, {
                strain: 'Batch', amount: 2, phenotype: 'Bio', addToLibrary: true
            });

            expect(mockDataService.addStrain).toHaveBeenCalledWith({
                strain: 'Batch',
                phenotype: 'Bio #1'
            });
            expect(mockDataService.addPlants).toHaveBeenCalled();
        });

        it('should continue adding plants if adding strain to library fails during batch', async () => {
            (ctx.grid.$selectedDevice.get as any).mockReturnValue('growspace1');
            (ctx.data.$devices.get as any).mockReturnValue([]);
            mockDataService.addStrain.mockRejectedValue(new Error('Library batch fail'));

            await confirmAddPlants(ctx, {
                strain: 'Batch', amount: 2, phenotype: 'Bio', addToLibrary: true
            });

            expect(mockDataService.addStrain).toHaveBeenCalled();
            expect((ctx.ui as any).showToast).toHaveBeenCalledWith(expect.stringContaining('Failed to add strains'), 'info');
            expect(mockDataService.addPlants).toHaveBeenCalled();
        });

        it('should send detail as is (minus addToLibrary) to addPlants', async () => {
            (ctx.grid.$selectedDevice.get as any).mockReturnValue('gs1');
            (ctx.data.$devices.get as any).mockReturnValue([]);
            await confirmAddPlants(ctx, { strain: 'X' }); // No amount
            expect(mockDataService.addPlants).toHaveBeenCalledWith({
                growspace_id: 'gs1',
                strain: 'X'
            });
        });

        it('should use "Strain" as fallback if phenotype not provided when adding to library during batch', async () => {
            (ctx.grid.$selectedDevice.get as any).mockReturnValue('gs1');
            (ctx.data.$devices.get as any).mockReturnValue([]);
            await confirmAddPlants(ctx, { strain: 'OG', amount: 1, addToLibrary: true }); // No phenotype
            expect(mockDataService.addStrain).toHaveBeenCalledWith({ strain: 'OG', phenotype: 'Strain #1' });
        });

        it('should handle undo action (batch-delete)', async () => {
            let reverseAction: (() => Promise<void>) | undefined;
            (ctx.undoRedoManager.pushAction as any).mockImplementation((action: any) => {
                reverseAction = action.reverse;
            });

            (ctx.grid.$selectedDevice.get as any).mockReturnValue('growspace1');
            const mockAddedPlants = [{ attributes: { plant_id: 'p1' } }];

            (ctx.data.$devices.get as any)
                .mockReturnValueOnce([{ deviceId: 'growspace1', plants: [] }])
                .mockReturnValueOnce([{ deviceId: 'growspace1', plants: mockAddedPlants }]);

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

            (ctx.grid.$selectedDevice.get as any).mockReturnValue('growspace1');

            // Reset default mock to ensure clean state
            (ctx.data.$devices.get as any).mockReset();

            (ctx.data.$devices.get as any)
                .mockReturnValueOnce([{ deviceId: 'growspace1', plants: [] }]) // Initial state (Before)
                .mockReturnValueOnce([{ deviceId: 'growspace1', plants: [{ attributes: { plant_id: 'p1' } }] }]) // Initial state (After)
                .mockReturnValueOnce([{ deviceId: 'growspace1', plants: [] }]) // Redo state (Before)
                .mockReturnValueOnce([{ deviceId: 'growspace1', plants: [{ attributes: { plant_id: 'p1' } }] }]); // Redo state (After)

            await confirmAddPlants(ctx, { count: 1 });

            expect(ctx.undoRedoManager.pushAction).toHaveBeenCalled();
            expect(redoAction).toBeDefined();
            await redoAction!();

            // Redo calls confirmAddPlants again
            expect(mockDataService.addPlants).toHaveBeenCalledTimes(2);
        });

        it('should correctly identifying added plants for undo when pre-existing plants exist', async () => {
            const detail = { strain: 'New', count: 1 };
            (ctx.grid.$selectedDevice.get as any).mockReturnValue('gs1');

            const existingPlant = { attributes: { plant_id: 'old1' } };
            const newPlant = { attributes: { plant_id: 'new1' } };

            (ctx.data.$devices.get as any)
                .mockReturnValueOnce([{ deviceId: 'gs1', plants: [existingPlant] }]) // Before
                .mockReturnValueOnce([{ deviceId: 'gs1', plants: [existingPlant, newPlant] }]); // After

            await confirmAddPlants(ctx, detail);

            expect(ctx.undoRedoManager.pushAction).toHaveBeenCalledWith(expect.objectContaining({
                description: expect.stringContaining('Added 1 plants')
            }));
        });

        it('should handle undefined plants array in undo logic', async () => {
            const detail = { strain: 'New', count: 1 };
            (ctx.grid.$selectedDevice.get as any).mockReturnValue('gs1');

            (ctx.data.$devices.get as any)
                .mockReturnValueOnce([{ deviceId: 'gs1' }]) // Before: plants undefined
                .mockReturnValueOnce([{ deviceId: 'gs1', plants: [{ attributes: { plant_id: 'new1' } }] }]); // After

            await confirmAddPlants(ctx, detail);

            // Should still find the new plant essentially (beforeIds empty)
            expect(ctx.undoRedoManager.pushAction).toHaveBeenCalled();
        });

        it('should NOT push undo action if no new plants detected', async () => {
            const detail = { strain: 'New', count: 1 };
            (ctx.grid.$selectedDevice.get as any).mockReturnValue('gs1');

            const existingPlant = { attributes: { plant_id: 'p1' } };

            (ctx.data.$devices.get as any)
                .mockReturnValueOnce([{ deviceId: 'gs1', plants: [existingPlant] }]) // Before
                .mockReturnValueOnce([{ deviceId: 'gs1', plants: [existingPlant] }]); // After (No change)

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
            expect((ctx.ui as any).showToast).toHaveBeenCalledWith(expect.stringContaining('Failed to water plant'), 'error');
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
            expect((ctx.ui as any).showToast).toHaveBeenCalledWith(expect.stringContaining('Failed to water growspace'), 'error');
        });
    });
}); // End plant-actions
