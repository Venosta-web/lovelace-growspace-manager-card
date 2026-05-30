/**
 * Snapshot & Vision Actions
 *
 * Write actions (capture, trigger, updateConfig) follow the standard
 * wrap-and-toast pattern.
 *
 * Read-only fetchers (getSnapshots, getVisionHistory) propagate errors
 * but do NOT toast on success — the caller (dialog) owns that UX decision.
 */

import { ActionContext } from '../core/action-context';
import { withAction } from '../core/action-utils';
import type { VisionCheckupConfig } from '../../slices/camera';

/**
 * Fetch the snapshot list for a growspace (read-only, no toast).
 */
export async function getSnapshots(ctx: ActionContext, growspaceId: string) {
  return ctx.dataService.getSnapshots(growspaceId);
}

/**
 * Capture a new snapshot for a growspace.
 */
export async function captureSnapshot(ctx: ActionContext, growspaceId: string): Promise<void> {
  await withAction(ctx, () => ctx.dataService.captureSnapshot(growspaceId), {
    success: 'Snapshot captured',
    errorPrefix: 'Failed to capture snapshot',
    rethrow: true,
  });
}

/**
 * Fetch the vision AI history for a growspace (read-only, no toast).
 */
export async function getVisionHistory(ctx: ActionContext, growspaceId: string) {
  return ctx.dataService.getVisionHistory(growspaceId);
}

/**
 * Trigger a vision checkup for a growspace.
 */
export async function triggerVisionCheckup(ctx: ActionContext, growspaceId: string): Promise<void> {
  await withAction(
    ctx,
    async () => {
      await ctx.dataService.triggerVisionCheckup(growspaceId);
      await ctx.refreshData();
    },
    {
      success: 'Vision checkup triggered',
      errorPrefix: 'Failed to trigger checkup',
      rethrow: true,
    }
  );
}

/**
 * Update the vision checkup configuration for a growspace.
 */
export async function updateVisionCheckupConfig(
  ctx: ActionContext,
  growspaceId: string,
  config: VisionCheckupConfig
): Promise<void> {
  await withAction(
    ctx,
    async () => {
      await ctx.dataService.updateVisionCheckupConfig(growspaceId, config);
      await ctx.refreshData();
    },
    {
      success: 'Vision config saved',
      errorPrefix: 'Failed to save vision config',
      rethrow: true,
    }
  );
}
