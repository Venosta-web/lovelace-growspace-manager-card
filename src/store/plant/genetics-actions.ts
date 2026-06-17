/**
 * Genetics Actions (Seed Batch + Pollination)
 *
 * Write-side operations for managing seed batches and pollination events.
 * All follow the standard wrap-and-toast pattern.
 */

import type { LineageNode } from '../../features/plants/types';
import { ActionContext } from '../core/action-context';
import { withAction } from '../core/action-utils';
import {
  addSeedBatch as geneticsSliceAddSeedBatch,
  updateSeedBatch as geneticsSliceUpdateSeedBatch,
  removeSeedBatch as geneticsSliceRemoveSeedBatch,
  logPollinationEvent as geneticsSliceLogPollinationEvent,
  updatePollinationEvent as geneticsSliceUpdatePollinationEvent,
  deletePollinationEvent as geneticsSliceDeletePollinationEvent,
  harvestSeeds as geneticsSliceHarvestSeeds,
  fetchGeneticsData as geneticsSliceFetchData,
  sowSeed as geneticsSliceSowSeed,
  setPlantSex as geneticsSliceSetPlantSex,
  unlinkSeedBatch as geneticsSliceUnlinkSeedBatch,
  getLineageTree as geneticsSliceGetLineageTree,
  getStrainLineageTree as geneticsSliceGetStrainLineageTree,
  updateStrainLineageTree as geneticsSliceUpdateStrainLineageTree,
} from '../../slices/genetics';

type AddSeedBatchData = Parameters<typeof geneticsSliceAddSeedBatch>[0];
type UpdateSeedBatchData = Parameters<typeof geneticsSliceUpdateSeedBatch>[0];
type LogPollinationData = Parameters<typeof geneticsSliceLogPollinationEvent>[0];
type UpdatePollinationData = Parameters<typeof geneticsSliceUpdatePollinationEvent>[0];
type HarvestSeedsData = Parameters<typeof geneticsSliceHarvestSeeds>[0];

/** Add a new seed batch to the genetics library */
export async function addSeedBatch(ctx: ActionContext, data: AddSeedBatchData): Promise<void> {
  await withAction(
    ctx,
    async () => {
      await geneticsSliceAddSeedBatch(data);
      await ctx.refreshData();
    },
    {
      success: 'Seed batch added',
      errorPrefix: 'Failed to add seed batch',
      rethrow: true,
    }
  );
}

/** Update an existing seed batch */
export async function updateSeedBatch(
  ctx: ActionContext,
  data: UpdateSeedBatchData
): Promise<void> {
  await withAction(
    ctx,
    async () => {
      await geneticsSliceUpdateSeedBatch(data);
      await ctx.refreshData();
    },
    {
      success: 'Seed batch updated',
      errorPrefix: 'Failed to update seed batch',
      rethrow: true,
    }
  );
}

/** Log a new pollination event */
export async function logPollination(ctx: ActionContext, data: LogPollinationData): Promise<void> {
  await withAction(
    ctx,
    async () => {
      await geneticsSliceLogPollinationEvent(data);
      await ctx.refreshData();
    },
    {
      success: 'Pollination event logged',
      errorPrefix: 'Failed to log pollination',
      rethrow: true,
    }
  );
}

/** Update an existing pollination event */
export async function updatePollination(
  ctx: ActionContext,
  data: UpdatePollinationData
): Promise<void> {
  await withAction(
    ctx,
    async () => {
      await geneticsSliceUpdatePollinationEvent(data);
      await ctx.refreshData();
    },
    {
      success: 'Pollination event updated',
      errorPrefix: 'Failed to update pollination',
      rethrow: true,
    }
  );
}

/** Delete a pollination event by ID */
export async function deletePollination(ctx: ActionContext, eventId: string): Promise<void> {
  await withAction(
    ctx,
    async () => {
      await geneticsSliceDeletePollinationEvent(eventId);
      await ctx.refreshData();
    },
    {
      success: 'Pollination event deleted',
      errorPrefix: 'Failed to delete pollination',
      rethrow: true,
    }
  );
}

/** Harvest seeds from a pollination event */
export async function harvestSeeds(ctx: ActionContext, data: HarvestSeedsData): Promise<void> {
  await withAction(
    ctx,
    async () => {
      await geneticsSliceHarvestSeeds(data);
      await ctx.refreshData();
    },
    {
      success: 'Seeds harvested',
      errorPrefix: 'Failed to harvest seeds',
      rethrow: true,
    }
  );
}

/** Fetch genetics data (seed batches and pollination events) */
export async function fetchGeneticsData(ctx: ActionContext) {
  return withAction(ctx, () => geneticsSliceFetchData(), {
    errorPrefix: 'Failed to fetch genetics data',
    rethrow: true,
  });
}

/** Delete a seed batch by ID */
export async function deleteSeedBatch(ctx: ActionContext, batchId: string): Promise<void> {
  await withAction(
    ctx,
    async () => {
      await geneticsSliceRemoveSeedBatch(batchId);
      await ctx.refreshData();
    },
    {
      success: 'Seed batch deleted',
      errorPrefix: 'Failed to delete seed batch',
      rethrow: true,
    }
  );
}

/** Link a plant to its origin seed batch (decrements batch quantity, copies generation) */
export async function sowSeed(ctx: ActionContext, batchId: string, plantId: string): Promise<void> {
  await withAction(
    ctx,
    async () => {
      await geneticsSliceSowSeed(batchId, plantId);
      await ctx.refreshData();
    },
    {
      success: 'Seed sown — plant linked to batch',
      errorPrefix: 'Failed to sow seed',
      rethrow: true,
    }
  );
}

/** Set the biological sex of a plant */
export async function setPlantSex(
  ctx: ActionContext,
  plantId: string,
  sex: string
): Promise<void> {
  await withAction(
    ctx,
    async () => {
      await geneticsSliceSetPlantSex(plantId, sex);
      await ctx.refreshData();
    },
    {
      success: 'Plant sex updated',
      errorPrefix: 'Failed to set plant sex',
      rethrow: true,
    }
  );
}

/** Clear a plant's seed batch association */
export async function unlinkSeedBatch(ctx: ActionContext, plantId: string): Promise<void> {
  await withAction(
    ctx,
    async () => {
      await geneticsSliceUnlinkSeedBatch(plantId);
      await ctx.refreshData();
    },
    {
      success: 'Seed batch unlinked',
      errorPrefix: 'Failed to unlink seed batch',
      rethrow: true,
    }
  );
}

/** Fetch the lineage tree for a plant */
export async function getLineageTree(
  ctx: ActionContext,
  plantId: string
): Promise<LineageNode | null> {
  return withAction(ctx, () => geneticsSliceGetLineageTree(plantId), {
    errorPrefix: 'Failed to fetch lineage tree',
    rethrow: true,
  }) as Promise<LineageNode | null>;
}

/** Fetch the lineage tree for a strain */
export async function getStrainLineageTree(
  ctx: ActionContext,
  strainName: string
): Promise<LineageNode | null> {
  return withAction(ctx, () => geneticsSliceGetStrainLineageTree(strainName), {
    errorPrefix: 'Failed to fetch strain lineage tree',
    rethrow: true,
  }) as Promise<LineageNode | null>;
}

/** Update the lineage tree for a strain */
export async function updateStrainLineageTree(
  ctx: ActionContext,
  strainName: string,
  parents: Array<{ name: string; source: 'library' | 'manual' }>
): Promise<{ lineage: string }> {
  return withAction(ctx, () => geneticsSliceUpdateStrainLineageTree(strainName, parents), {
    errorPrefix: 'Failed to update strain lineage tree',
    rethrow: true,
  }) as Promise<{ lineage: string }>;
}
