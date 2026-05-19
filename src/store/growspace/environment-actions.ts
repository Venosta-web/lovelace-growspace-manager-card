/**
 * Environment Actions
 *
 * Write-side operations for configuring, removing, and resetting growspace
 * environment sensors. All follow the standard wrap-and-toast pattern.
 */

import { ActionContext } from '../core/action-context';
import * as libraryActions from '../plant/library-actions';

type ConfigureEnvironmentData = Parameters<ActionContext['dataService']['configureEnvironment']>[0];

/** Configure the sensor layout for a growspace */
export async function configureEnvironment(
  ctx: ActionContext,
  data: ConfigureEnvironmentData
): Promise<void> {
  try {
    await ctx.dataService.configureEnvironment(data);
    ctx.ui.showToast('Environment configured successfully!', 'success');
    await ctx.refreshData();
  } catch (e: unknown) {
    const error = e instanceof Error ? e.message : 'Unknown error';
    ctx.ui.showToast(`Error: ${error}`, 'error');
    throw e;
  }
}

/** Remove a growspace environment configuration */
export async function removeEnvironment(ctx: ActionContext, growspaceId: string): Promise<void> {
  try {
    await ctx.dataService.removeEnvironment(growspaceId);
    ctx.ui.showToast('Environment configuration removed', 'success');
    await ctx.refreshData();
  } catch (e: unknown) {
    const error = e instanceof Error ? e.message : 'Unknown error';
    ctx.ui.showToast(`Failed to remove environment: ${error}`, 'error');
    throw e;
  }
}

/** Reset watering-tracking data for a growspace */
export async function resetWaterTracking(ctx: ActionContext, growspaceId: string): Promise<void> {
  try {
    await ctx.dataService.resetWaterTracking(growspaceId);
    ctx.ui.showToast('Water tracking reset', 'success');
    await ctx.refreshData();
  } catch (e: unknown) {
    const error = e instanceof Error ? e.message : 'Unknown error';
    ctx.ui.showToast(`Failed to reset water tracking: ${error}`, 'error');
    throw e;
  }
}

/** Water a single plant and refresh nutrient inventory if nutrients were applied */
export async function waterPlant(
  ctx: ActionContext,
  plantId: string,
  amount: number,
  nutrients?: Record<string, number>,
  presetId?: string
): Promise<void> {
  try {
    await ctx.dataService.waterPlant(plantId, amount, nutrients, presetId);
    if (nutrients && Object.keys(nutrients).length > 0) {
      await libraryActions.fetchNutrientInventory(ctx, true);
    }
  } catch (e: unknown) {
    const error = e instanceof Error ? e.message : 'Unknown error';
    ctx.ui.showToast(`Failed to water plant: ${error}`, 'error');
    throw e;
  }
}

/** Water an entire growspace and refresh nutrient inventory if nutrients were applied */
export async function waterGrowspace(
  ctx: ActionContext,
  growspaceId: string,
  amount: number,
  nutrients?: Record<string, number>,
  presetId?: string
): Promise<void> {
  try {
    await ctx.dataService.waterGrowspace(growspaceId, amount, nutrients, presetId);
    if (nutrients && Object.keys(nutrients).length > 0) {
      await libraryActions.fetchNutrientInventory(ctx, true);
    }
  } catch (e: unknown) {
    const error = e instanceof Error ? e.message : 'Unknown error';
    ctx.ui.showToast(`Failed to water growspace: ${error}`, 'error');
    throw e;
  }
}
