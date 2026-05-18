import { ActionContext } from '../core/action-context';
import { GrowspaceManagerCardConfig } from '../../types';

export function initializeSelectedDevice(ctx: ActionContext, config: GrowspaceManagerCardConfig) {
  ctx.data.setConfig(config);

  // Set view mode from config
  if (config?.initial_view_mode) {
    ctx.ui.setViewMode(config.initial_view_mode);
  }

  // Trigger update logic via sync service
  ctx.syncService.updateDevicesState();
}

export function handleDeviceChange(ctx: ActionContext, deviceId: string) {
  ctx.grid.setSelectedDevice(deviceId);
}
