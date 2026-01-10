/**
 * Plant Actions - Pure functions for plant business logic.
 * These functions encapsulate plant manipulation operations without
 * coupling to the store lifecycle or UI state management.
 */

import { PlantEntity, StrainEntry, PlantOverviewDialogState } from '../types';
import { DataService } from '../data-service';
import { PlantUtils } from '../utils/plant-utils';

export interface PlantActionContext {
    dataService: DataService;
    showToast: (message: string, type: 'info' | 'error' | 'success') => void;
    closeDialog: () => void;
    refreshData: () => Promise<void>;
}

/**
 * Update a single plant with new attributes.
 */
export async function updatePlant(
    ctx: PlantActionContext,
    plantId: string,
    updates: Partial<PlantEntity['attributes']>
): Promise<void> {
    try {
        await ctx.dataService.updatePlant({ plant_id: plantId, ...updates });
        ctx.showToast('Plant updated', 'success');
    } catch (e: any) {
        console.error('Failed to update plant:', e);
        ctx.showToast(`Failed to update plant: ${e.message}`, 'error');
    }
}

/**
 * Bulk update plants from dialog state.
 */
export async function updatePlantsFromDialog(
    ctx: PlantActionContext,
    dialogState: Pick<PlantOverviewDialogState, 'plant' | 'editedAttributes' | 'selectedPlantIds'>
): Promise<boolean> {
    const { plant, editedAttributes, selectedPlantIds } = dialogState;
    const plantId = plant.attributes?.plant_id || plant.entity_id.replace('sensor.', '');

    const targetIds =
        selectedPlantIds && selectedPlantIds.length > 0 ? selectedPlantIds : [plantId];
    const isBulkEdit = targetIds.length > 1;

    const payloadTemplate = PlantUtils.mapDialogToApiPayload(editedAttributes, isBulkEdit);

    try {
        const updatePromises = targetIds.map((id: string) => {
            const payload = { ...payloadTemplate, plant_id: id };
            return ctx.dataService.updatePlant(payload);
        });

        await Promise.all(updatePromises);
        return true;
    } catch (err) {
        console.error('Error updating plant(s):', err);
        return false;
    }
}

/**
 * Delete one or more plants with optimistic UI support.
 */
export async function deletePlants(
    ctx: PlantActionContext,
    plantIds: string[],
    addOptimisticId: (id: string) => void,
    removeOptimisticId: (id: string) => void
): Promise<boolean> {
    plantIds.forEach(id => addOptimisticId(id));

    try {
        await Promise.all(plantIds.map((id) => ctx.dataService.removePlant(id)));
        return true;
    } catch (e: any) {
        console.error('Failed to delete plant:', e);
        ctx.showToast(`Failed to delete: ${e.message}`, 'error');
        plantIds.forEach(id => removeOptimisticId(id));
        return false;
    }
}

/**
 * Move plant to next stage (flower→dry, dry→cure, mother→clone).
 */
export async function movePlantToNextStage(
    ctx: PlantActionContext,
    plant: PlantEntity
): Promise<boolean> {
    const stage = plant.attributes?.stage;
    let targetGrowspace = '';

    const movableStages = new Set(['mother', 'flower', 'dry', 'cure']);
    if (!stage || !movableStages.has(stage)) {
        ctx.showToast(
            'Plant must be in mother or flower or dry or cure stage to move. stage is ' + stage,
            'error'
        );
        return false;
    }

    if (stage === 'flower') {
        targetGrowspace = 'dry';
    } else if (stage === 'dry') {
        targetGrowspace = 'cure';
    } else if (stage === 'mother') {
        targetGrowspace = 'clone';
    } else {
        console.error('Unknown stage, cannot move plant', targetGrowspace);
        return false;
    }

    try {
        const plantId = plant.attributes?.plant_id || plant.entity_id.replace('sensor.', '');
        await ctx.dataService.harvestPlant(plantId, targetGrowspace);
        ctx.showToast(`Plant moved to ${targetGrowspace}`, 'success');
        // Small delay to allow backend commit to complete before fetching updated data
        await new Promise(resolve => setTimeout(resolve, 500));
        await ctx.refreshData();
        ctx.closeDialog();
        return true;
    } catch (err) {
        console.error('Error moving plant to next stage:', err);
        return false;
    }
}

/**
 * Move plant to a specific growspace.
 */
export async function movePlantToGrowspace(
    ctx: PlantActionContext,
    plant: PlantEntity,
    targetGrowspace: string
): Promise<boolean> {
    const plantId = plant.attributes?.plant_id || plant.entity_id.replace('sensor.', '');
    const currentStage = plant.attributes?.stage || 'unknown';

    try {
        if (currentStage === 'clone') {
            await ctx.dataService.moveClone(plantId, targetGrowspace);
        } else {
            await ctx.dataService.harvestPlant(plantId, targetGrowspace);
        }

        // Small delay to allow backend commit to complete before fetching updated data
        await new Promise(resolve => setTimeout(resolve, 500));
        await ctx.refreshData();
        ctx.closeDialog();
        return true;
    } catch (err: any) {
        console.error('Error moving plant:', err);
        ctx.showToast(`Failed to move plant: ${err.message}`, 'error');
        return false;
    }
}

/**
 * Take clones from a mother plant.
 */
export async function takeClone(
    ctx: PlantActionContext,
    motherPlant: PlantEntity,
    numClones?: number
): Promise<boolean> {
    const plantId =
        motherPlant.attributes?.plant_id || motherPlant.entity_id.replace('sensor.', '');

    try {
        await ctx.dataService.takeClone({
            mother_plant_id: plantId,
            num_clones: numClones,
        });
        console.log(`Clone taken from ${motherPlant.attributes?.strain || 'plant'}`);
        return true;
    } catch (error: any) {
        console.error(`Failed to take clone: ${error.message}`);
        return false;
    }
}

/**
 * Move plant to new grid position.
 */
export async function movePlantPosition(
    ctx: PlantActionContext,
    plant: PlantEntity,
    newRow: number,
    newCol: number
): Promise<boolean> {
    try {
        const plantId = plant.attributes?.plant_id || plant.entity_id.replace('sensor.', '');
        await ctx.dataService.updatePlant({
            plant_id: plantId,
            row: newRow,
            col: newCol,
        });
        return true;
    } catch (err) {
        console.error('Error moving plant:', err);
        return false;
    }
}

/**
 * Handle drag and drop between grid cells.
 */
export async function handlePlantDrop(
    ctx: PlantActionContext,
    targetRow: number,
    targetCol: number,
    targetPlant: PlantEntity | null,
    sourcePlant: PlantEntity | null
): Promise<boolean> {
    if (!sourcePlant) return false;

    try {
        if (targetPlant) {
            const sourceId =
                sourcePlant.attributes.plant_id || sourcePlant.entity_id.replace('sensor.', '');
            const targetId =
                targetPlant.attributes.plant_id || targetPlant.entity_id.replace('sensor.', '');

            if (sourceId === targetId) return false;

            await ctx.dataService.swapPlants(sourceId, targetId);
        } else {
            await movePlantPosition(ctx, sourcePlant, targetRow, targetCol);
        }
        return true;
    } catch (err) {
        console.error('Error during drag-and-drop:', err);
        return false;
    }
}

/**
 * Add a new plant to a growspace.
 */
export async function addPlant(
    ctx: PlantActionContext,
    growspaceId: string,
    row: number,
    col: number,
    strain: string,
    phenotype?: string
): Promise<boolean> {
    try {
        await ctx.dataService.addPlant({
            growspace_id: growspaceId,
            row,
            col,
            strain,
            phenotype: phenotype || undefined,
        });
        ctx.closeDialog();
        ctx.showToast('Plant added successfully', 'success');
        return true;
    } catch (e: any) {
        console.error('Failed to add plant:', e);
        ctx.showToast(`Failed to add plant: ${e.message}`, 'error');
        return false;
    }
}
