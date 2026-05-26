/**
 * Growspace Actions - CRUD operations for growspace management.
 */

import { ActionContext } from '../core/action-context';
import { withAction } from '../core/action-utils';

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

  const ok = await withAction(
    ctx,
    async () => {
      await ctx.dataService.addGrowspace({ name, rows, plantsPerRow, notificationService });
      await ctx.refreshData();
      ctx.closeDialog();
      return true as const;
    },
    { success: 'Growspace added successfully!', errorPrefix: 'Failed to add growspace' }
  );
  return ok !== undefined;
}

export async function updateGrowspace(
  ctx: ActionContext,
  growspaceId: string,
  name: string,
  rows: number,
  plantsPerRow: number
): Promise<boolean> {
  const ok = await withAction(
    ctx,
    async () => {
      const devices = ctx.data.$devices.get();
      const deviceIdx = devices.findIndex((d) => d.deviceId === growspaceId);
      if (deviceIdx >= 0) {
        const newDevices = [...devices];
        newDevices[deviceIdx] = { ...newDevices[deviceIdx], name, rows, plantsPerRow };
        ctx.data.$devices.set(newDevices);
      }
      await ctx.dataService.updateGrowspace({ growspaceId, name, rows, plantsPerRow });
      await ctx.refreshData();
      ctx.closeDialog();
      return true as const;
    },
    { success: 'Growspace updated successfully', errorPrefix: 'Failed to update growspace' }
  );
  return ok !== undefined;
}

export async function removeGrowspace(ctx: ActionContext, growspaceId: string): Promise<boolean> {
  const ok = await withAction(
    ctx,
    async () => {
      await ctx.dataService.removeGrowspace(growspaceId);
      await ctx.refreshData();
      ctx.closeDialog();
      return true as const;
    },
    { success: 'Growspace removed successfully', errorPrefix: 'Failed to remove growspace' }
  );
  return ok !== undefined;
}
