/**
 * IPM Actions - Unified business logic for Integrated Pest Management operations.
 */

import { ActionContext } from '../core/action-context';
import { withAction } from '../core/action-utils';
import * as libraryActions from './library-actions';

/**
 * Apply IPM treatment and refresh inventory if needed.
 */
export async function applyIPM(ctx: ActionContext, detail: { preset_id: string; growspace_id?: string; plant_ids?: string[]; notes?: string }): Promise<void> {
  await withAction(ctx, async () => {
    await ctx.dataService.applyIPM(detail);
    // Refresh nutrient inventory as IPM products often deduct from stock
    await libraryActions.fetchNutrientInventory(ctx, true);
  }, { success: 'IPM treatment applied successfully', errorPrefix: 'Failed to apply IPM', rethrow: true });
}
