/**
 * Growspace Actions - CRUD operations for growspace management.
 */

import { ActionContext } from '../core/action-context';
import { withAction } from '../core/action-utils';
import { devices$, setDevices } from '../../slices/grid';
import { callService } from '../../services/hass-call';
import { DOMAIN, SERVICES } from '../../lib/constants';

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
      await callService(DOMAIN, SERVICES.ADD_GROWSPACE, {
        name,
        rows,
        plants_per_row: plantsPerRow,
        notification_target: notificationService,
      });
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
      const currentDevices = devices$.get();
      const deviceIdx = currentDevices.findIndex((d) => d.deviceId === growspaceId);
      if (deviceIdx >= 0) {
        const newDevices = [...currentDevices];
        newDevices[deviceIdx] = { ...newDevices[deviceIdx], name, rows, plantsPerRow };
        setDevices(newDevices);
      }
      const payload: Record<string, unknown> = { growspace_id: growspaceId };
      if (name) payload.name = name;
      if (rows) payload.rows = rows;
      if (plantsPerRow) payload.plants_per_row = plantsPerRow;
      await callService(DOMAIN, SERVICES.UPDATE_GROWSPACE, payload);
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
      await callService(DOMAIN, SERVICES.REMOVE_GROWSPACE, { growspace_id: growspaceId });
      await ctx.refreshData();
      ctx.closeDialog();
      return true as const;
    },
    { success: 'Growspace removed successfully', errorPrefix: 'Failed to remove growspace' }
  );
  return ok !== undefined;
}
