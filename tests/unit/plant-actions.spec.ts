import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    updatePlant,
    updatePlantsFromDialog,
    deletePlants,
    movePlantToNextStage,
    movePlantToGrowspace,
    takeClone,
    movePlantPosition,
    handlePlantDrop,
    addPlant,
    PlantActionContext,
} from '../../src/store/plant-actions';
import { PlantEntity } from '../../src/types';

describe('plant-actions', () => {
    let ctx: PlantActionContext;
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
        mockDataService = {
            updatePlant: vi.fn().mockResolvedValue({}),
            removePlant: vi.fn().mockResolvedValue({}),
            harvestPlant: vi.fn().mockResolvedValue({}),
            moveClone: vi.fn().mockResolvedValue({}),
            takeClone: vi.fn().mockResolvedValue({}),
            swapPlants: vi.fn().mockResolvedValue({}),
            addPlant: vi.fn().mockResolvedValue({}),
        };

        ctx = {
            dataService: mockDataService,
            showToast: vi.fn(),
            closeDialog: vi.fn(),
            refreshData: vi.fn().mockResolvedValue(undefined),
        };
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

    describe('updatePlantsFromDialog', () => {
        it('should update single plant from dialog state', async () => {
            const dialogState = {
                plant: mockPlant,
                editedAttributes: { strain: 'Updated Strain' },
                selectedPlantIds: undefined,
            };

            const result = await updatePlantsFromDialog(ctx, dialogState);

            expect(result).toBe(true);
            expect(mockDataService.updatePlant).toHaveBeenCalledTimes(1);
        });

        it('should bulk update multiple plants', async () => {
            const dialogState = {
                plant: mockPlant,
                editedAttributes: { strain: 'Bulk Update' },
                selectedPlantIds: ['plant1', 'plant2', 'plant3'],
            };

            const result = await updatePlantsFromDialog(ctx, dialogState);

            expect(result).toBe(true);
            expect(mockDataService.updatePlant).toHaveBeenCalledTimes(3);
        });

        it('should return false on error', async () => {
            mockDataService.updatePlant.mockRejectedValue(new Error('Update failed'));

            const dialogState = {
                plant: mockPlant,
                editedAttributes: { strain: 'Test' },
                selectedPlantIds: undefined,
            };

            const result = await updatePlantsFromDialog(ctx, dialogState);

            expect(result).toBe(false);
        });

        it('should use entity_id fallback when plant_id is missing', async () => {
            const plantNoId = { ...mockPlant, attributes: { ...mockPlant.attributes, plant_id: '' } };
            const dialogState = {
                plant: plantNoId,
                editedAttributes: { strain: 'Fallback Update' },
                selectedPlantIds: undefined,
            };

            const result = await updatePlantsFromDialog(ctx, dialogState);

            expect(result).toBe(true);
            expect(mockDataService.updatePlant).toHaveBeenCalledWith({
                plant_id: 'plant_test123',
                strain: 'Fallback Update',
            });
        });
    });

    describe('deletePlants', () => {
        it('should delete plants and show success toast', async () => {
            const addOptimistic = vi.fn();
            const removeOptimistic = vi.fn();

            const result = await deletePlants(ctx, ['plant1', 'plant2'], addOptimistic, removeOptimistic);

            expect(result).toBe(true);
            expect(addOptimistic).toHaveBeenCalledTimes(2);
            expect(mockDataService.removePlant).toHaveBeenCalledTimes(2);
            expect(mockDataService.removePlant).toHaveBeenCalledTimes(2);
        });

        it('should remove optimistic IDs on failure', async () => {
            mockDataService.removePlant.mockRejectedValue(new Error('Delete failed'));
            const addOptimistic = vi.fn();
            const removeOptimistic = vi.fn();

            const result = await deletePlants(ctx, ['plant1'], addOptimistic, removeOptimistic);

            expect(result).toBe(false);
            expect(removeOptimistic).toHaveBeenCalledWith('plant1');
            expect(ctx.showToast).toHaveBeenCalledWith('Failed to delete: Delete failed', 'error');
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
    });

    describe('addPlant', () => {
        it('should add plant successfully', async () => {
            const result = await addPlant(ctx, 'growspace1', 2, 3, 'Blue Dream', 'Pheno A');

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
        });

        it('should add plant without phenotype', async () => {
            const result = await addPlant(ctx, 'growspace1', 1, 1, 'OG Kush');

            expect(result).toBe(true);
            expect(mockDataService.addPlant).toHaveBeenCalledWith({
                growspace_id: 'growspace1',
                row: 1,
                col: 1,
                strain: 'OG Kush',
                phenotype: undefined,
            });
        });

        it('should return false and show error on failure', async () => {
            mockDataService.addPlant.mockRejectedValue(new Error('Add failed'));

            const result = await addPlant(ctx, 'gs1', 1, 1, 'Test');

            expect(result).toBe(false);
            expect(ctx.showToast).toHaveBeenCalledWith('Failed to add plant: Add failed', 'error');
        });
    });
});
