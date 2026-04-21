/**
 * Grow Report Actions
 *
 * fetch is read-only (propagates errors, no toast).
 * export is a write action (toasts on success/error).
 */

import { ActionContext } from '../core/action-context';

/**
 * Fetch the grow report data for a growspace (read-only, no toast).
 */
export async function fetchGrowReport(ctx: ActionContext, growspaceId: string) {
  return ctx.dataService.fetchGrowReport(growspaceId);
}

/**
 * Export the grow report in a given format.
 */
export async function exportGrowReport(
  ctx: ActionContext,
  growspaceId: string,
  format: string
): Promise<void> {
  try {
    await ctx.dataService.exportGrowReport(growspaceId, format);
    ctx.showToast('Grow report exported', 'success');
  } catch (e: unknown) {
    const error = e instanceof Error ? e.message : 'Unknown error';
    ctx.showToast(`Failed to export report: ${error}`, 'error');
    throw e;
  }
}
