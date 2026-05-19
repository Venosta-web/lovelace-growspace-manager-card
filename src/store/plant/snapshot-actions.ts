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
import type { VisionCheckupConfig } from '../../lib/types/dialog';

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
  try {
    await ctx.dataService.captureSnapshot(growspaceId);
    ctx.ui.showToast('Snapshot captured', 'success');
  } catch (e: unknown) {
    const error = e instanceof Error ? e.message : 'Unknown error';
    ctx.ui.showToast(`Failed to capture snapshot: ${error}`, 'error');
    throw e;
  }
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
  try {
    await ctx.dataService.triggerVisionCheckup(growspaceId);
    ctx.ui.showToast('Vision checkup triggered', 'success');
    await ctx.refreshData();
  } catch (e: unknown) {
    const error = e instanceof Error ? e.message : 'Unknown error';
    ctx.ui.showToast(`Failed to trigger checkup: ${error}`, 'error');
    throw e;
  }
}

/**
 * Update the vision checkup configuration for a growspace.
 */
export async function updateVisionCheckupConfig(
  ctx: ActionContext,
  growspaceId: string,
  config: VisionCheckupConfig
): Promise<void> {
  try {
    await ctx.dataService.updateVisionCheckupConfig(growspaceId, config);
    ctx.ui.showToast('Vision config saved', 'success');
    await ctx.refreshData();
  } catch (e: unknown) {
    const error = e instanceof Error ? e.message : 'Unknown error';
    ctx.ui.showToast(`Failed to save vision config: ${error}`, 'error');
    throw e;
  }
}
