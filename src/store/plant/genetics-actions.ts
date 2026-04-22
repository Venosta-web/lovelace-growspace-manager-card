/**
 * Genetics Actions (Seed Batch + Pollination)
 *
 * Write-side operations for managing seed batches and pollination events.
 * All follow the standard wrap-and-toast pattern.
 */

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
    ctx.showToast('Seed batch added', 'success');
    await ctx.refreshData();
  } catch (e: unknown) {
    const error = e instanceof Error ? e.message : 'Unknown error';
    ctx.showToast(`Failed to add seed batch: ${error}`, 'error');
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
    ctx.showToast('Seed batch updated', 'success');
    await ctx.refreshData();
  } catch (e: unknown) {
    const error = e instanceof Error ? e.message : 'Unknown error';
    ctx.showToast(`Failed to update seed batch: ${error}`, 'error');
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
    ctx.showToast('Pollination event logged', 'success');
    await ctx.refreshData();
  } catch (e: unknown) {
    const error = e instanceof Error ? e.message : 'Unknown error';
    ctx.showToast(`Failed to log pollination: ${error}`, 'error');
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
    ctx.showToast('Pollination event updated', 'success');
    await ctx.refreshData();
  } catch (e: unknown) {
    const error = e instanceof Error ? e.message : 'Unknown error';
    ctx.showToast(`Failed to update pollination: ${error}`, 'error');
    throw e;
  }
}

/** Delete a pollination event by ID */
export async function deletePollination(ctx: ActionContext, eventId: string): Promise<void> {
  try {
    await ctx.dataService.deletePollination(eventId);
    ctx.showToast('Pollination event deleted', 'success');
    await ctx.refreshData();
  } catch (e: unknown) {
    const error = e instanceof Error ? e.message : 'Unknown error';
    ctx.showToast(`Failed to delete pollination: ${error}`, 'error');
    throw e;
  }
}

/** Harvest seeds from a pollination event */
export async function harvestSeeds(ctx: ActionContext, data: HarvestSeedsData): Promise<void> {
  try {
    await ctx.dataService.harvestSeeds(data);
    ctx.showToast('Seeds harvested', 'success');
    await ctx.refreshData();
  } catch (e: unknown) {
    const error = e instanceof Error ? e.message : 'Unknown error';
    ctx.showToast(`Failed to harvest seeds: ${error}`, 'error');
    throw e;
  }
}

/** Fetch genetics data (seed batches and pollination events) */
export async function fetchGeneticsData(ctx: ActionContext) {
  try {
    return await ctx.dataService.fetchGeneticsData();
  } catch (e: unknown) {
    const error = e instanceof Error ? e.message : 'Unknown error';
    ctx.showToast(`Failed to fetch genetics data: ${error}`, 'error');
    throw e;
  }
}
