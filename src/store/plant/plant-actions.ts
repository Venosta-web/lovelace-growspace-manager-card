/**
 * Plant Actions - Unified business logic for plant operations.
 */

import { PlantEntity, PlantOverviewDialogState, PlantAttributes, AddPlantsDialogState } from '../../types';
import { PlantUtils } from '../../utils/plant-utils';
import { ActionContext } from '../core/action-context';
import * as libraryActions from './library-actions';

/**
 * Update a single plant with new attributes.
 */
export async function updatePlant(
  ctx: ActionContext,
  plantId: string,
  updates: Partial<PlantEntity['attributes']>
): Promise<void> {
  try {
    await ctx.dataService.updatePlant({ plant_id: plantId, ...updates });
    ctx.showToast('Plant updated', 'success');
  } catch (e: unknown) {
    const error = e instanceof Error ? e.message : 'Unknown error';
    console.error('Failed to update plant:', e);
    ctx.showToast(`Failed to update plant: ${error}`, 'error');
  }
}

/**
 * Bulk update plants from dialog state.
 */
export async function updatePlantFromDialog(
  ctx: ActionContext,
  dialogState: Pick<PlantOverviewDialogState, 'plant' | 'editedAttributes' | 'selectedPlantIds'>
): Promise<void> {
  const { plant, editedAttributes, selectedPlantIds } = dialogState;
  const plantId = plant.attributes?.plant_id || plant.entity_id.replace('sensor.', '');

  const targetIds = selectedPlantIds && selectedPlantIds.length > 0 ? selectedPlantIds : [plantId];
  const isBulkEdit = targetIds.length > 1;

  const payloadTemplate = PlantUtils.mapDialogToApiPayload(editedAttributes, isBulkEdit);

  try {
    const updatePromises = targetIds.map((id: string) => {
      const payload = { ...payloadTemplate, plant_id: id };
      return ctx.dataService.updatePlant(payload);
    });

    await Promise.all(updatePromises);

    ctx.closeDialog();
    await ctx.refreshData();

    if (ctx.ui.$isEditMode.get()) {
      ctx.ui.clearPlantSelection();
      ctx.ui.setEditMode(false);
    }
  } catch (err) {
    console.error('Error updating plant(s):', err);
  }
}

/**
 * Internal helper for API deletion with optimistic updates
 */
async function _deletePlantsApi(ctx: ActionContext, plantIds: string[]): Promise<boolean> {
  plantIds.forEach((id) => ctx.data.addOptimisticDeletedPlantId(id));

  try {
    await Promise.all(plantIds.map((id) => ctx.dataService.removePlant(id)));
    return true;
  } catch (e: unknown) {
    const error = e instanceof Error ? e.message : 'Unknown error';
    console.error('Failed to delete plant:', e);
    ctx.showToast(`Failed to delete: ${error}`, 'error');
    plantIds.forEach((id) => ctx.data.removeOptimisticDeletedPlantId(id));
    return false;
  }
}

/**
 * High-level delete action with Undo/Redo
 */
export async function handleDeletePlant(ctx: ActionContext, plantId: string | string[]) {
  const ids = Array.isArray(plantId) ? plantId : [plantId];

  const plantsToRestore: Partial<PlantAttributes>[] = [];
  const devices = ctx.data.$devices.get();
  ids.forEach((id) => {
    for (const device of devices) {
      const plant = device.plants?.find(
        (p) => (p.attributes.plant_id || p.entity_id.replace('sensor.', '')) === id
      );
      if (plant) {
        plantsToRestore.push({
          growspace_id: plant.attributes.growspace_id || device.deviceId,
          row: plant.attributes.row,
          col: plant.attributes.col,
          strain: plant.attributes.strain,
          phenotype: plant.attributes.phenotype,
          veg_start: plant.attributes.veg_start,
          flower_start: plant.attributes.flower_start,
          mother_start: plant.attributes.mother_start,
          clone_start: plant.attributes.clone_start,
          seedling_start: plant.attributes.seedling_start,
          dry_start: plant.attributes.dry_start,
          cure_start: plant.attributes.cure_start,
        });
        break;
      }
    }
  });

  const success = await _deletePlantsApi(ctx, ids);

  if (success) {
    ctx.undoRedoManager.pushAction({
      type: ids.length > 1 ? 'batch-delete' : 'delete',
      description:
        ids.length > 1
          ? `Deleted ${ids.length} plants`
          : `Deleted ${plantsToRestore[0]?.strain || 'plant'}`,
      reverse: async () => {
        for (const p of plantsToRestore) {
          // plantsToRestore contains required fields from the original plant - assert to API type
          await ctx.dataService.addPlant(p as Parameters<typeof ctx.dataService.addPlant>[0]);
        }
        await ctx.refreshData();
      },
      redo: async () => {
        await handleDeletePlant(ctx, ids);
      },
    });

    // UI Updates
    // Note: deselectPlants logic needs to be checked. UI store has toggle but not explicit deselect multiple?
    // ctx.ui.deselectPlants(ids) was in the original code, implying ui store has it.
    // Assuming ctx.ui has a method to deselect.
    // If not, we iterate.
    // Checking ui-store.ts would confirm, assuming it has specific method.
    // We'll trust the original code's intent or use remove.
    ctx.ui.deselectPlants(ids);

    if (ctx.ui.$activeDialog.get().type === 'PLANT_OVERVIEW') {
      ctx.closeDialog();
    }

    ctx.refreshData(); // updateGrid equivalent
  }
}

/**
 * Move plant to next stage (flower→dry, dry→cure, mother→clone).
 */
export async function movePlantToNextStage(
  ctx: ActionContext,
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
    await new Promise((resolve) => setTimeout(resolve, 500));
    await ctx.refreshData();
    ctx.closeDialog();
    return true;
  } catch (err) {
    console.error('Error moving plant to next stage:', err);
    return false;
  }
}

/**
 * Internal API move clone wrapper
 */
async function _movePlantApi(ctx: ActionContext, plant: PlantEntity, targetGrowspaceId: string) {
  const plantId = plant.attributes?.plant_id || plant.entity_id.replace('sensor.', '');

  if (plant.attributes.stage === 'clone') {
    await ctx.dataService.moveClone(plantId, targetGrowspaceId);
  } else {
    // Note: historically this integration used harvestPlant for general room moves
    await ctx.dataService.harvestPlant(plantId, targetGrowspaceId);
  }
}

/**
 * Move plant to a specific growspace with Undo/Redo.
 */
export async function movePlantToGrowspace(
  ctx: ActionContext,
  plant: PlantEntity,
  targetGrowspace: string
): Promise<boolean> {
  const originalGrowspace = plant.attributes.growspace_id || 'unknown';

  try {
    await _movePlantApi(ctx, plant, targetGrowspace);

    // Small delay to allow backend commit to complete before fetching updated data
    await new Promise((resolve) => setTimeout(resolve, 500));
    await ctx.refreshData();
    ctx.closeDialog();

    // Push Undo
    ctx.undoRedoManager.pushAction({
      type: 'move',
      description: `Moved ${plant.attributes.strain || 'plant'} to ${targetGrowspace}`,
      reverse: async () => {
        await movePlantToGrowspace(ctx, plant, originalGrowspace);
      },
      redo: async () => {
        await movePlantToGrowspace(ctx, plant, targetGrowspace);
      },
    });

    return true;
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error moving plant:', err);
    ctx.showToast(`Failed to move plant: ${error}`, 'error');
    return false;
  }
}

/**
 * Take clones from a mother plant.
 */
export async function takeClone(
  ctx: ActionContext,
  motherPlant: PlantEntity,
  numClones?: number,
  targetGrowspaceId?: string
): Promise<boolean> {
  const plantId = motherPlant.attributes?.plant_id || motherPlant.entity_id.replace('sensor.', '');

  try {
    await ctx.dataService.takeClone({
      mother_plant_id: plantId,
      num_clones: numClones,
      target_growspace_id: targetGrowspaceId,
    });
    console.log(
      `Clone taken from ${motherPlant.attributes?.strain || 'plant'}`,
      targetGrowspaceId ? `to ${targetGrowspaceId}` : ''
    );
    return true;
  } catch (error: unknown) {
    const e = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Failed to take clone: ${e}`);
    return false;
  }
}

/**
 * Move plant to new grid position (Internal)
 */
export async function movePlantPosition(
  ctx: ActionContext,
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
 * Handle drag and drop between grid cells with Undo/Redo
 */
export async function handlePlantDrop(
  ctx: ActionContext,
  targetRow: number,
  targetCol: number,
  targetPlant: PlantEntity | null,
  sourcePlant: PlantEntity | null
): Promise<boolean> {
  if (!sourcePlant || !sourcePlant.attributes) return false;

  const originalRow = sourcePlant.attributes.row;
  const originalCol = sourcePlant.attributes.col;
  const sourceId =
    sourcePlant.attributes.plant_id || sourcePlant.entity_id?.replace('sensor.', '') || '';
  const targetId =
    targetPlant?.attributes.plant_id || targetPlant?.entity_id?.replace('sensor.', '') || '';

  console.log('handlePlantDrop:', {
    sourceId,
    targetId,
    growspaceId: sourcePlant.attributes.growspace_id,
  });

  if (sourceId === targetId) return false;

  const growspaceId = sourcePlant.attributes.growspace_id;

  if (!growspaceId) return false;

  // Helper to perform optimistic grid update
  const performOptimisticGridUpdate = (isRevert: boolean = false) => {
    // growspaceId is guaranteed truthy by closure capture from outer scope check

    const updateGridLogic = (grid: Record<string, any>) => {
      let sourceKey: string | null = null;
      let targetKey: string | null = null;

      Object.entries(grid).forEach(([key, plant]) => {
        if (!plant) return;
        const pId = plant.plant_id || plant.entity_id.replace('sensor.', '');
        if (pId === sourceId) sourceKey = key;
        if (targetId && pId === targetId) targetKey = key;
      });

      if (sourceKey && targetKey) {
        const sData = grid[sourceKey];
        const tData = grid[targetKey];

        const newSourceRow = isRevert ? originalRow : targetRow;
        const newSourceCol = isRevert ? originalCol : targetCol;
        const newTargetRow = isRevert ? targetRow : originalRow;
        const newTargetCol = isRevert ? targetCol : originalCol;

        // sData and tData are guaranteed to exist because sourceKey and targetKey came from the grid iteration
        sData.row = newSourceRow;
        sData.col = newSourceCol;
        tData.row = newTargetRow;
        tData.col = newTargetCol;

        grid[sourceKey] = tData;
        grid[targetKey] = sData;
      }
    };

    // 1. Update Cache
    ctx.data.updateWsDataCacheGrid(growspaceId, updateGridLogic);

    // 2. Update Devices Atom (for immediate UI Reactivity)
    const devices = ctx.data.$devices.get();
    const deviceIdx = devices.findIndex((d) => d.deviceId === growspaceId);
    if (deviceIdx >= 0) {
      const newDevices = [...devices];
      const device = { ...newDevices[deviceIdx] };
      const newGrid = { ...device.grid };

      updateGridLogic(newGrid);

      device.grid = newGrid;
      newDevices[deviceIdx] = device;
      ctx.data.$devices.set(newDevices);
    }
  };

  try {
    if (targetPlant && growspaceId) {
      // Use OptimisticManager
      const actionId = await ctx.optimisticManager.applyOptimisticUpdate(
        'swap',
        {
          sourceId,
          targetId: targetId!,
          growspaceId,
          originalRow,
          originalCol,
          targetRow,
          targetCol,
        },
        () => performOptimisticGridUpdate(false), // Apply
        () => performOptimisticGridUpdate(true) // Revert
      );

      // Perform actual API call
      await ctx.dataService.swapPlants(sourceId, targetId!);

      // Confirm update and add to history
      ctx.optimisticManager.confirmUpdate(actionId, {
        description: `Swapped ${sourcePlant.attributes.strain || 'plant'} and ${targetPlant.attributes.strain || 'plant'}`,
        redo: async () => {
          await handlePlantDrop(ctx, targetRow, targetCol, targetPlant, sourcePlant);
        },
      });

      return true;
    } else {
      // Non-swap move (to empty) - keep existing logic for now or refactor later
      await movePlantPosition(ctx, sourcePlant, targetRow, targetCol);

      ctx.undoRedoManager.pushAction({
        type: 'move',
        description: `Moved ${sourcePlant.attributes.strain || 'plant'} to (${targetRow},${targetCol})`,
        reverse: async () => {
          await movePlantPosition(ctx, sourcePlant, originalRow, originalCol);
          await ctx.refreshData();
        },
        redo: async () => {
          await handlePlantDrop(ctx, targetRow, targetCol, targetPlant, sourcePlant);
        },
      });

      await ctx.refreshData();
      return true;
    }
  } catch (err: unknown) {
    console.error('Error during drag-and-drop:', err);
    ctx.refreshData();
    return false;
  }
}

export interface AddPlantOptions {
  phenotype?: string;
  veg_start?: string;
  flower_start?: string;
  seedling_start?: string;
  mother_start?: string;
  clone_start?: string;
  dry_start?: string;
  cure_start?: string;
}

/**
 * Add a new plant to a growspace.
 */
export async function confirmAddPlant(
  ctx: ActionContext,
  detail: {
    row: number;
    col: number;
    strain: string;
    phenotype?: string;
    veg_start?: string;
    flower_start?: string;
    seedling_start?: string;
    mother_start?: string;
    clone_start?: string;
    dry_start?: string;
    cure_start?: string;
    addToLibrary?: boolean;
  }
): Promise<boolean> {
  const selectedDevice = ctx.data.$selectedDevice.get();
  if (!selectedDevice) {
    ctx.showToast('No growspace selected', 'error');
    return false;
  }

  try {
    if (detail.addToLibrary) {
      try {
        await ctx.dataService.addStrain({
          strain: detail.strain,
          phenotype: detail.phenotype,
        });
        await libraryActions.fetchStrainLibrary(ctx, true);
        ctx.showToast(`Added ${detail.strain} ${detail.phenotype} to library`, 'success');
      } catch (e) {
        console.error('Failed to add strain to library:', e);
        ctx.showToast(`Failed to add strain to library, conducting plant addition`, 'info');
      }
    }

    await ctx.dataService.addPlant({
      growspace_id: selectedDevice,
      row: detail.row,
      col: detail.col,
      strain: detail.strain,
      phenotype: detail.phenotype,
      veg_start: detail.veg_start,
      flower_start: detail.flower_start,
      seedling_start: detail.seedling_start,
      mother_start: detail.mother_start,
      clone_start: detail.clone_start,
      dry_start: detail.dry_start,
      cure_start: detail.cure_start,
    });
    ctx.closeDialog();
    await ctx.refreshData();
    ctx.showToast('Plant added successfully', 'success');
    return true;
  } catch (e: unknown) {
    const error = e instanceof Error ? e.message : 'Unknown error';
    console.error('Failed to add plant:', e);
    ctx.showToast(`Failed to add plant: ${error}`, 'error');
    return false;
  }
}

/**
 * Batch add plants with Undo/Redo
 */
export async function confirmAddPlants(ctx: ActionContext, detail: AddPlantsDialogState): Promise<void> {
  const selectedDevice = ctx.data.$selectedDevice.get();
  if (!selectedDevice) {
    ctx.showToast('No growspace selected', 'error');
    return;
  }

  const devices = ctx.data.$devices.get();
  const beforeIds = new Set<string>();
  devices.forEach((d) => d.plants?.forEach((p) => beforeIds.add(p.attributes.plant_id || '')));

  try {
    if (detail.addToLibrary) {
      try {
        const amount = detail.amount || 1; // Dialog uses 'amount'
        const startNumber = detail.start_number || 1;
        const promises: Promise<any>[] = [];

        for (let i = 0; i < amount; i++) {
          const currentNumber = startNumber + i;
          // Format: "Phenotype #1"
          // If phenotype is provided, rely on it. If not, backend defaults to Strain name,
          // but typically we only add to library if phenotype is explicit or we want "Strain #1".
          // User request specific to "phenotype + #Number".
          const phenoName = detail.phenotype
            ? `${detail.phenotype} #${currentNumber}`
            : `Strain #${currentNumber}`; // Fallback if no phenotype, similar to plant naming

          if (detail.strain) {
            promises.push(
              ctx.dataService.addStrain({
                strain: detail.strain,
                phenotype: phenoName,
              })
            );
          }
        }

        await Promise.all(promises);
        await libraryActions.fetchStrainLibrary(ctx, true);
        ctx.showToast(`Added ${amount} strain variants to library`, 'success');
      } catch (e) {
        console.error('Failed to add strains to library:', e);
        ctx.showToast(`Failed to add strains to library, conducting plant addition`, 'info');
      }
    }

    // Exclude addToLibrary from payload sent to backend
    const { addToLibrary: _, ...apiPayload } = detail;

    // detail is guaranteed to have strain and amount as required fields from caller
    await ctx.dataService.addPlants({
      ...apiPayload,
      growspace_id: selectedDevice,
    } as Parameters<typeof ctx.dataService.addPlants>[0]);

    await ctx.refreshData();

    const afterDevices = ctx.data.$devices.get();
    const addedIds: string[] = [];
    afterDevices.forEach((d) =>
      d.plants?.forEach((p) => {
        const id = p.attributes.plant_id || '';
        if (id && !beforeIds.has(id)) {
          addedIds.push(id);
        }
      })
    );

    if (addedIds.length > 0) {
      ctx.undoRedoManager.pushAction({
        type: 'batch-delete',
        description: `Added ${addedIds.length} plants`,
        reverse: async () => {
          await handleDeletePlant(ctx, addedIds); // Re-use delete logic? Or simple delete.
          // handleDeletePlant pushes undo action. We probably don't want nested undo actions here.
          // So we use _deletePlantsApi.
          await _deletePlantsApi(ctx, addedIds);
          await ctx.refreshData();
        },
        redo: async () => {
          await confirmAddPlants(ctx, detail);
        },
      });
    }

    ctx.showToast('Batch plants added successfully', 'success');
    ctx.closeDialog();
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    ctx.showToast(`Error: ${error}`, 'error');
  }
}

/**
 * Water a single plant and refresh inventory.
 */
export async function waterPlant(
  ctx: ActionContext,
  plantId: string,
  amount: number,
  nutrients?: Record<string, number>,
  presetId?: string
): Promise<void> {
  try {
    await ctx.dataService.waterPlant(plantId, amount, nutrients, presetId);
    // If nutrients were used, refresh the inventory
    if (nutrients && Object.keys(nutrients).length > 0) {
      await libraryActions.fetchNutrientInventory(ctx, true);
    }
  } catch (e: unknown) {
    const error = e instanceof Error ? e.message : 'Unknown error';
    console.error('Failed to water plant:', e);
    ctx.showToast(`Failed to water plant: ${error}`, 'error');
    throw e;
  }
}

/**
 * Water a growspace and refresh inventory.
 */
export async function waterGrowspace(
  ctx: ActionContext,
  growspaceId: string,
  amount: number,
  nutrients?: Record<string, number>,
  presetId?: string
): Promise<void> {
  try {
    await ctx.dataService.waterGrowspace(growspaceId, amount, nutrients, presetId);
    // If nutrients were used, refresh the inventory
    if (nutrients && Object.keys(nutrients).length > 0) {
      await libraryActions.fetchNutrientInventory(ctx, true);
    }
  } catch (e: unknown) {
    const error = e instanceof Error ? e.message : 'Unknown error';
    console.error('Failed to water growspace:', e);
    ctx.showToast(`Failed to water growspace: ${error}`, 'error');
    throw e;
  }
}

/**
 * Print a label for a plant or strain.
 */
export async function printLabel(
  ctx: ActionContext,
  params: {
    plantId?: string;
    strain?: string;
    phenotype?: string;
    breeder?: string;
    lineage?: string;
    breederLogo?: string;
    deviceId?: string;
    preview?: boolean;
  }
): Promise<any> {
  const { plantId, strain, phenotype, breeder, lineage, breederLogo, deviceId, preview } = params;
  const baseUrl = window.location.origin + window.location.pathname;

  try {
    const result = await ctx.dataService.printLabel({
      plant_id: plantId,
      strain,
      phenotype,
      breeder,
      lineage,
      breeder_logo: breederLogo,
      device_id: deviceId,
      preview,
      base_url: baseUrl,
    });
    if (!preview) {
      ctx.showToast('Label printing command sent', 'success');
    }
    return result;
  } catch (e: unknown) {
    const error = e instanceof Error ? e.message : 'Unknown error';
    console.error('Failed to print label:', e);
    ctx.showToast(`Failed to print label: ${error}`, 'error');
    throw e;
  }
}

/**
 * Save harvest yield metrics for a plant.
 * No-ops if the metrics object has no keys (nothing to persist).
 */
export async function saveHarvestMetrics(
  ctx: ActionContext,
  plantId: string,
  metrics: Record<string, unknown>
): Promise<void> {
  if (Object.keys(metrics).length === 0) return;
  try {
    await ctx.dataService.updateHarvestMetrics({ plant_id: plantId, ...metrics });
    ctx.showToast('Harvest metrics saved', 'success');
    await ctx.refreshData();
  } catch (error) {
    ctx.showToast(`Failed to save harvest metrics: ${error}`, 'error');
    throw error;
  }
}

/**
 * Score a plant's phenotype traits.
 * No-ops if every value in the scores map is null or undefined.
 */
export async function scorePhenotype(
  ctx: ActionContext,
  plantId: string,
  scores: Record<string, number | null>
): Promise<void> {
  const hasValue = Object.values(scores).some((v) => v !== null && v !== undefined);
  if (!hasValue) return;
  try {
    await ctx.dataService.scorePlant({ plant_id: plantId, ...scores });
    ctx.showToast('Scores saved', 'success');
    await ctx.refreshData();
  } catch (error) {
    ctx.showToast(`Failed to save scores: ${error}`, 'error');
    throw error;
  }
}
