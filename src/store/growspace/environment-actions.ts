/**
 * Environment Actions
 *
 * Write-side operations for configuring, removing, and resetting growspace
 * environment sensors. All follow the standard wrap-and-toast pattern.
 */

import { ActionContext } from '../core/action-context';
import { withAction } from '../core/action-utils';
import * as libraryActions from '../plant/library-actions';

type ConfigureEnvironmentData = Parameters<ActionContext['dataService']['configureEnvironment']>[0];

/** Configure the sensor layout for a growspace */
export async function configureEnvironment(ctx: ActionContext, data: ConfigureEnvironmentData): Promise<void> {
  await withAction(ctx, async () => { await ctx.dataService.configureEnvironment(data); await ctx.refreshData(); }, {
    success: 'Environment configured successfully!', errorPrefix: 'Failed to configure environment', rethrow: true,
  });
}

/** Remove a growspace environment configuration */
export async function removeEnvironment(ctx: ActionContext, growspaceId: string): Promise<void> {
  await withAction(ctx, async () => { await ctx.dataService.removeEnvironment(growspaceId); await ctx.refreshData(); }, {
    success: 'Environment configuration removed', errorPrefix: 'Failed to remove environment', rethrow: true,
  });
}

/** Reset watering-tracking data for a growspace */
export async function resetWaterTracking(ctx: ActionContext, growspaceId: string): Promise<void> {
  await withAction(ctx, async () => { await ctx.dataService.resetWaterTracking(growspaceId); await ctx.refreshData(); }, {
    success: 'Water tracking reset', errorPrefix: 'Failed to reset water tracking', rethrow: true,
  });
}

/** Water a single plant and refresh nutrient inventory if nutrients were applied */
export async function waterPlant(ctx: ActionContext, plantId: string, amount: number, nutrients?: Record<string, number>, presetId?: string): Promise<void> {
  await withAction(ctx, async () => {
    await ctx.dataService.waterPlant(plantId, amount, nutrients, presetId);
    if (nutrients && Object.keys(nutrients).length > 0) await libraryActions.fetchNutrientInventory(ctx, true);
  }, { errorPrefix: 'Failed to water plant', rethrow: true });
}

/** Water an entire growspace and refresh nutrient inventory if nutrients were applied */
export async function waterGrowspace(ctx: ActionContext, growspaceId: string, amount: number, nutrients?: Record<string, number>, presetId?: string): Promise<void> {
  await withAction(ctx, async () => {
    await ctx.dataService.waterGrowspace(growspaceId, amount, nutrients, presetId);
    if (nutrients && Object.keys(nutrients).length > 0) await libraryActions.fetchNutrientInventory(ctx, true);
  }, { errorPrefix: 'Failed to water growspace', rethrow: true });
}
