import { ActionContext } from '../core/action-context';

export function handleDeviceChange(ctx: ActionContext, deviceId: string) {
  ctx.grid.setSelectedDevice(deviceId);
}
