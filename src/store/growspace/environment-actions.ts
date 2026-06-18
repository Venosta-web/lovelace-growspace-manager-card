/**
 * Environment Actions
 *
 * Write-side operations for configuring, removing, and resetting growspace
 * environment sensors. All follow the standard wrap-and-toast pattern.
 */

import { ActionContext } from '../core/action-context';
import { withAction } from '../core/action-utils';
import * as libraryActions from '../plant/library-actions';
import type { CirculationFanConfig, ExhaustFanConfig } from '../../slices/growspace/schema';
import {
  configureEnvironment as growspaceSliceConfigureEnvironment,
  configureCirculationFan as growspaceSliceConfigureCirculationFan,
  configureExhaustFan as growspaceSliceConfigureExhaustFan,
  removeEnvironment as growspaceSliceRemoveEnvironment,
  resetWaterTracking as growspaceSliceResetWaterTracking,
} from '../../slices/growspace';
import {
  waterPlant as plantSliceWaterPlant,
  waterGrowspace as plantSliceWaterGrowspace,
} from '../../slices/plant';

type ConfigureEnvironmentData = Parameters<typeof growspaceSliceConfigureEnvironment>[0];

/** Configure the sensor layout for a growspace */
export async function configureEnvironment(
  ctx: ActionContext,
  data: ConfigureEnvironmentData
): Promise<void> {
  await withAction(
    ctx,
    async () => {
      await growspaceSliceConfigureEnvironment(data);
      await ctx.refreshData();
    },
    {
      success: 'Environment configured successfully!',
      errorPrefix: 'Failed to configure environment',
      rethrow: true,
    }
  );
}

/** Remove a growspace environment configuration */
export async function removeEnvironment(ctx: ActionContext, growspaceId: string): Promise<void> {
  await withAction(
    ctx,
    async () => {
      await growspaceSliceRemoveEnvironment(growspaceId);
      await ctx.refreshData();
    },
    {
      success: 'Environment configuration removed',
      errorPrefix: 'Failed to remove environment',
      rethrow: true,
    }
  );
}

/** Reset watering-tracking data for a growspace */
export async function resetWaterTracking(ctx: ActionContext, growspaceId: string): Promise<void> {
  await withAction(
    ctx,
    async () => {
      await growspaceSliceResetWaterTracking(growspaceId);
      await ctx.refreshData();
    },
    {
      success: 'Water tracking reset',
      errorPrefix: 'Failed to reset water tracking',
      rethrow: true,
    }
  );
}

/** Water a single plant and refresh nutrient inventory if nutrients were applied */
export async function waterPlant(
  ctx: ActionContext,
  plantId: string,
  amount: number,
  nutrients?: Record<string, number>,
  presetId?: string
): Promise<void> {
  await withAction(
    ctx,
    async () => {
      await plantSliceWaterPlant(plantId, amount, nutrients, presetId);
      if (nutrients && Object.keys(nutrients).length > 0)
        await libraryActions.fetchNutrientInventory(ctx, true);
    },
    { errorPrefix: 'Failed to water plant', rethrow: true }
  );
}

/**
 * Water an entire growspace.
 *
 * The nutrient-inventory refetch (when nutrients were applied) lives inside the
 * plant-slice mutator, so every caller gets correct inventory — see CONTEXT.md
 * "Cross-slice mutation".
 */
export async function waterGrowspace(
  ctx: ActionContext,
  growspaceId: string,
  amount: number,
  nutrients?: Record<string, number>,
  presetId?: string
): Promise<void> {
  await withAction(
    ctx,
    async () => {
      await plantSliceWaterGrowspace(growspaceId, amount, nutrients, presetId);
    },
    { errorPrefix: 'Failed to water growspace', rethrow: true }
  );
}

/** Configure the circulation fan controller for a growspace */
export async function configureFanController(
  ctx: ActionContext,
  data: { growspaceId: string; fanConfig: CirculationFanConfig }
): Promise<void> {
  await withAction(
    ctx,
    async () => {
      await growspaceSliceConfigureCirculationFan(data);
      await ctx.refreshData();
    },
    {
      success: 'Fan controller configured successfully!',
      errorPrefix: 'Failed to configure fan controller',
      rethrow: true,
    }
  );
}

/** Configure the exhaust fan controller for a growspace */
export async function configureExhaustFan(
  ctx: ActionContext,
  data: { growspaceId: string; fanConfig: ExhaustFanConfig }
): Promise<void> {
  await withAction(
    ctx,
    async () => {
      await growspaceSliceConfigureExhaustFan(data);
      await ctx.refreshData();
    },
    {
      success: 'Exhaust fan controller configured successfully!',
      errorPrefix: 'Failed to configure exhaust fan controller',
      rethrow: true,
    }
  );
}
