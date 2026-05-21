/**
 * Grow Report Actions
 *
 * fetch is read-only (propagates errors, no toast).
 * export is a write action (toasts on success/error).
 */

import { ActionContext } from '../core/action-context';
import { withAction } from '../core/action-utils';

/**
 * Fetch the grow report data for a growspace (read-only, no toast).
 */
export async function fetchGrowReport(ctx: ActionContext, growspaceId: string) {
  return ctx.dataService.fetchGrowReport(growspaceId);
}

/**
 * Export the grow report in a given format.
 */
export async function exportGrowReport(ctx: ActionContext, growspaceId: string, format: string): Promise<void> {
  await withAction(ctx, () => ctx.dataService.exportGrowReport(growspaceId, format), {
    success: 'Grow report exported', errorPrefix: 'Failed to export report', rethrow: true,
  });
}
