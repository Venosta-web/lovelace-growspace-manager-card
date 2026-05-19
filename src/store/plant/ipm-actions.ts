/**
 * IPM Actions - Unified business logic for Integrated Pest Management operations.
 */

import { ActionContext } from '../core/action-context';
import * as libraryActions from './library-actions';

/**
 * Apply IPM treatment and refresh inventory if needed.
 */
export async function applyIPM(
  ctx: ActionContext,
  detail: {
    preset_id: string;
    growspace_id?: string;
    plant_ids?: string[];
    notes?: string;
  }
): Promise<void> {
  try {
    await ctx.dataService.applyIPM(detail);

    // Refresh nutrient inventory as IPM products often deduct from stock
    await libraryActions.fetchNutrientInventory(ctx, true);

    ctx.ui.showToast('IPM treatment applied successfully', 'success');
  } catch (e: unknown) {
    const error = e instanceof Error ? e.message : 'Unknown error';
    console.error('Failed to apply IPM:', e);
    ctx.ui.showToast(`Failed to apply IPM: ${error}`, 'error');
    throw e;
  }
}
