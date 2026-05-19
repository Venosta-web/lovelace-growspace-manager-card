/**
 * Genetics Actions (Seed Batch + Pollination)
 *
 * Write-side operations for managing seed batches and pollination events.
 * All follow the standard wrap-and-toast pattern.
 */

import type { LineageNode } from '../../features/plants/types';
import { ActionContext } from '../core/action-context';

type AddSeedBatchData = Parameters<ActionContext['dataService']['addSeedBatch']>[0];
type UpdateSeedBatchData = Parameters<ActionContext['dataService']['updateSeedBatch']>[0];
type LogPollinationData = Parameters<ActionContext['dataService']['logPollination']>[0];
type UpdatePollinationData = Parameters<ActionContext['dataService']['updatePollination']>[0];
type HarvestSeedsData = Parameters<ActionContext['dataService']['harvestSeeds']>[0];

/** Add a new seed batch to the genetics library */
export async function addSeedBatch(ctx: ActionContext, data: AddSeedBatchData): Promise<void> {
  try {
    await ctx.dataService.addSeedBatch(data);
    ctx.ui.showToast('Seed batch added', 'success');
    await ctx.refreshData();
  } catch (e: unknown) {
    const error = e instanceof Error ? e.message : 'Unknown error';
    ctx.ui.showToast(`Failed to add seed batch: ${error}`, 'error');
    throw e;
  }
}

/** Update an existing seed batch */
export async function updateSeedBatch(
  ctx: ActionContext,
  data: UpdateSeedBatchData
): Promise<void> {
  try {
    await ctx.dataService.updateSeedBatch(data);
    ctx.ui.showToast('Seed batch updated', 'success');
    await ctx.refreshData();
  } catch (e: unknown) {
    const error = e instanceof Error ? e.message : 'Unknown error';
    ctx.ui.showToast(`Failed to update seed batch: ${error}`, 'error');
    throw e;
  }
}

/** Log a new pollination event */
export async function logPollination(
  ctx: ActionContext,
  data: LogPollinationData
): Promise<void> {
  try {
    await ctx.dataService.logPollination(data);
    ctx.ui.showToast('Pollination event logged', 'success');
    await ctx.refreshData();
  } catch (e: unknown) {
    const error = e instanceof Error ? e.message : 'Unknown error';
    ctx.ui.showToast(`Failed to log pollination: ${error}`, 'error');
    throw e;
  }
}

/** Update an existing pollination event */
export async function updatePollination(
  ctx: ActionContext,
  data: UpdatePollinationData
): Promise<void> {
  try {
    await ctx.dataService.updatePollination(data);
    ctx.ui.showToast('Pollination event updated', 'success');
    await ctx.refreshData();
  } catch (e: unknown) {
    const error = e instanceof Error ? e.message : 'Unknown error';
    ctx.ui.showToast(`Failed to update pollination: ${error}`, 'error');
    throw e;
  }
}

/** Delete a pollination event by ID */
export async function deletePollination(ctx: ActionContext, eventId: string): Promise<void> {
  try {
    await ctx.dataService.deletePollination(eventId);
    ctx.ui.showToast('Pollination event deleted', 'success');
    await ctx.refreshData();
  } catch (e: unknown) {
    const error = e instanceof Error ? e.message : 'Unknown error';
    ctx.ui.showToast(`Failed to delete pollination: ${error}`, 'error');
    throw e;
  }
}

/** Harvest seeds from a pollination event */
export async function harvestSeeds(ctx: ActionContext, data: HarvestSeedsData): Promise<void> {
  try {
    await ctx.dataService.harvestSeeds(data);
    ctx.ui.showToast('Seeds harvested', 'success');
    await ctx.refreshData();
  } catch (e: unknown) {
    const error = e instanceof Error ? e.message : 'Unknown error';
    ctx.ui.showToast(`Failed to harvest seeds: ${error}`, 'error');
    throw e;
  }
}

/** Fetch genetics data (seed batches and pollination events) */
export async function fetchGeneticsData(ctx: ActionContext) {
  try {
    return await ctx.dataService.fetchGeneticsData();
  } catch (e: unknown) {
    const error = e instanceof Error ? e.message : 'Unknown error';
    ctx.ui.showToast(`Failed to fetch genetics data: ${error}`, 'error');
    throw e;
  }
}

/** Delete a seed batch by ID */
export async function deleteSeedBatch(ctx: ActionContext, batchId: string): Promise<void> {
  try {
    await ctx.dataService.deleteSeedBatch(batchId);
    ctx.ui.showToast('Seed batch deleted', 'success');
    await ctx.refreshData();
  } catch (e: unknown) {
    const error = e instanceof Error ? e.message : 'Unknown error';
    ctx.ui.showToast(`Failed to delete seed batch: ${error}`, 'error');
    throw e;
  }
}

/** Set the sex of a plant */
export async function setPlantSex(
  ctx: ActionContext,
  plantId: string,
  sex: string
): Promise<void> {
  try {
    await ctx.dataService.setPlantSex(plantId, sex);
    ctx.ui.showToast('Plant sex updated', 'success');
    await ctx.refreshData();
  } catch (e: unknown) {
    const error = e instanceof Error ? e.message : 'Unknown error';
    ctx.ui.showToast(`Failed to set plant sex: ${error}`, 'error');
    throw e;
  }
}

/** Link a plant to its origin seed batch (decrements batch quantity) */
export async function sowSeed(
  ctx: ActionContext,
  batchId: string,
  plantId: string
): Promise<void> {
  try {
    await ctx.dataService.sowSeed(batchId, plantId);
    ctx.ui.showToast('Seed sown — plant linked to batch', 'success');
    await ctx.refreshData();
  } catch (e: unknown) {
    const error = e instanceof Error ? e.message : 'Unknown error';
    ctx.ui.showToast(`Failed to sow seed: ${error}`, 'error');
    throw e;
  }
}

/** Fetch the lineage tree for a plant */
export async function getLineageTree(
  ctx: ActionContext,
  plantId: string
): Promise<LineageNode | null> {
  try {
    return await ctx.dataService.getLineageTree(plantId);
  } catch (e: unknown) {
    const error = e instanceof Error ? e.message : 'Unknown error';
    ctx.ui.showToast(`Failed to fetch lineage tree: ${error}`, 'error');
    throw e;
  }
}

/** Fetch the lineage tree for a strain */
export async function getStrainLineageTree(
  ctx: ActionContext,
  strainName: string
): Promise<LineageNode | null> {
  try {
    return await ctx.dataService.getStrainLineageTree(strainName);
  } catch (e: unknown) {
    const error = e instanceof Error ? e.message : 'Unknown error';
    ctx.ui.showToast(`Failed to fetch strain lineage tree: ${error}`, 'error');
    throw e;
  }
}

/** Update the lineage tree for a strain */
export async function updateStrainLineageTree(
  ctx: ActionContext,
  strainName: string,
  parents: Array<{ name: string; source: 'library' | 'manual' }>
): Promise<{ lineage: string }> {
  try {
    const result = await ctx.dataService.updateStrainLineageTree(strainName, parents);
    return result;
  } catch (e: unknown) {
    const error = e instanceof Error ? e.message : 'Unknown error';
    ctx.ui.showToast(`Failed to update strain lineage tree: ${error}`, 'error');
    throw e;
  }
}
