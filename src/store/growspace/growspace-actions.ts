/**
 * Growspace Actions - CRUD operations for growspace management.
 */

import { ActionContext } from '../core/action-context';

export async function addGrowspace(
  ctx: ActionContext,
  name: string,
  rows: number = 4,
  plantsPerRow: number = 4,
  notificationService: string = 'mobile_app_notify'
): Promise<boolean> {
  if (!name) {
    ctx.ui.showToast('Name is required', 'error');
    return false;
  }

  try {
    await ctx.dataService.addGrowspace({
      name,
      rows,
      plantsPerRow,
      notificationService,
    });
    ctx.ui.showToast('Growspace added successfully!', 'success');
    await ctx.refreshData();
    ctx.closeDialog();
    return true;
  } catch (e: unknown) {
    const error = e instanceof Error ? e.message : 'Unknown error';
    ctx.ui.showToast(`Error: ${error}`, 'error');
    return false;
  }
}

export async function updateGrowspace(
  ctx: ActionContext,
  growspaceId: string,
  name: string,
  rows: number,
  plantsPerRow: number
): Promise<boolean> {
  try {
    const devices = ctx.data.$devices.get();
    const deviceIdx = devices.findIndex((d) => d.deviceId === growspaceId);

    if (deviceIdx >= 0) {
      const newDevices = [...devices];
      newDevices[deviceIdx] = { ...newDevices[deviceIdx], name, rows, plantsPerRow };
      ctx.data.$devices.set(newDevices);
    }

    await ctx.dataService.updateGrowspace({ growspaceId, name, rows, plantsPerRow });
    await ctx.refreshData();
    ctx.ui.showToast('Growspace updated successfully', 'success');
    ctx.closeDialog();
    return true;
  } catch (e: unknown) {
    const error = e instanceof Error ? e.message : 'Unknown error';
    ctx.ui.showToast(`Failed to update growspace: ${error}`, 'error');
    return false;
  }
}

export async function removeGrowspace(ctx: ActionContext, growspaceId: string): Promise<boolean> {
  try {
    await ctx.dataService.removeGrowspace(growspaceId);
    ctx.ui.showToast('Growspace removed successfully', 'success');
    await ctx.refreshData();
    ctx.closeDialog();
    return true;
  } catch (e: unknown) {
    const error = e instanceof Error ? e.message : 'Unknown error';
    ctx.ui.showToast(`Failed to remove growspace: ${error}`, 'error');
    return false;
  }
}
