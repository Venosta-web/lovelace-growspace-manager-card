import type { ActionContext } from '../core/action-context';
import type { IrrigationConfig } from '../../services/types';

type IrrigationTimeParams = { growspaceId: string; time: string; duration?: number };
type RemoveTimeParams = { growspaceId: string; time: string };
type IrrigationSettingsParams = {
  growspaceId: string;
  irrigationPumpEntity: string;
  drainPumpEntity: string;
  irrigationDuration: number;
  drainDuration: number;
};

function getIrrigationConfig(ctx: ActionContext, growspaceId: string): IrrigationConfig {
  const device = ctx.data.$devices.get().find((d) => d.deviceId === growspaceId);
  return device ? { ...device.irrigationConfig } : { irrigationTimes: [], drainTimes: [] };
}

export async function addIrrigationTime(ctx: ActionContext, params: IrrigationTimeParams): Promise<void> {
  const { growspaceId, time, duration } = params;
  const prev = getIrrigationConfig(ctx, growspaceId);
  const newTime = { time, duration: duration ?? 60 };
  const next = [...prev.irrigationTimes, newTime].sort((a, b) =>
    (a.time ?? '').localeCompare(b.time ?? '')
  );

  const actionId = await ctx.optimisticManager.applyOptimisticUpdate(
    'update',
    params,
    () => ctx.data.patchDeviceIrrigationConfig(growspaceId, { irrigationTimes: next }),
    () => ctx.data.patchDeviceIrrigationConfig(growspaceId, { irrigationTimes: prev.irrigationTimes })
  );

  try {
    await ctx.dataService.addIrrigationTime({ growspaceId, time, duration });
    ctx.optimisticManager.confirmUpdate(actionId, {
      description: 'Added irrigation time',
      redo: () => addIrrigationTime(ctx, params),
    });
  } catch (e) {
    ctx.optimisticManager.rollbackUpdate(actionId);
    ctx.showToast('Failed to add irrigation time', 'error');
    throw e;
  }
}

export async function removeIrrigationTime(ctx: ActionContext, params: RemoveTimeParams): Promise<void> {
  const { growspaceId, time } = params;
  const prev = getIrrigationConfig(ctx, growspaceId);
  const next = prev.irrigationTimes.filter((t) => t.time !== time);

  const actionId = await ctx.optimisticManager.applyOptimisticUpdate(
    'delete',
    params,
    () => ctx.data.patchDeviceIrrigationConfig(growspaceId, { irrigationTimes: next }),
    () => ctx.data.patchDeviceIrrigationConfig(growspaceId, { irrigationTimes: prev.irrigationTimes })
  );

  try {
    await ctx.dataService.removeIrrigationTime({ growspaceId, time });
    ctx.optimisticManager.confirmUpdate(actionId, {
      description: 'Removed irrigation time',
      redo: () => removeIrrigationTime(ctx, params),
    });
  } catch (e) {
    ctx.optimisticManager.rollbackUpdate(actionId);
    ctx.showToast('Failed to remove irrigation time', 'error');
    throw e;
  }
}

export async function addDrainTime(ctx: ActionContext, params: IrrigationTimeParams): Promise<void> {
  const { growspaceId, time, duration } = params;
  const prev = getIrrigationConfig(ctx, growspaceId);
  const newTime = { time, duration: duration ?? 60 };
  const next = [...prev.drainTimes, newTime].sort((a, b) =>
    (a.time ?? '').localeCompare(b.time ?? '')
  );

  const actionId = await ctx.optimisticManager.applyOptimisticUpdate(
    'update',
    params,
    () => ctx.data.patchDeviceIrrigationConfig(growspaceId, { drainTimes: next }),
    () => ctx.data.patchDeviceIrrigationConfig(growspaceId, { drainTimes: prev.drainTimes })
  );

  try {
    await ctx.dataService.addDrainTime({ growspaceId, time, duration });
    ctx.optimisticManager.confirmUpdate(actionId, {
      description: 'Added drain time',
      redo: () => addDrainTime(ctx, params),
    });
  } catch (e) {
    ctx.optimisticManager.rollbackUpdate(actionId);
    ctx.showToast('Failed to add drain time', 'error');
    throw e;
  }
}

export async function removeDrainTime(ctx: ActionContext, params: RemoveTimeParams): Promise<void> {
  const { growspaceId, time } = params;
  const prev = getIrrigationConfig(ctx, growspaceId);
  const next = prev.drainTimes.filter((t) => t.time !== time);

  const actionId = await ctx.optimisticManager.applyOptimisticUpdate(
    'delete',
    params,
    () => ctx.data.patchDeviceIrrigationConfig(growspaceId, { drainTimes: next }),
    () => ctx.data.patchDeviceIrrigationConfig(growspaceId, { drainTimes: prev.drainTimes })
  );

  try {
    await ctx.dataService.removeDrainTime({ growspaceId, time });
    ctx.optimisticManager.confirmUpdate(actionId, {
      description: 'Removed drain time',
      redo: () => removeDrainTime(ctx, params),
    });
  } catch (e) {
    ctx.optimisticManager.rollbackUpdate(actionId);
    ctx.showToast('Failed to remove drain time', 'error');
    throw e;
  }
}

export async function setIrrigationSettings(
  ctx: ActionContext,
  params: IrrigationSettingsParams
): Promise<void> {
  const { growspaceId, irrigationPumpEntity, drainPumpEntity, irrigationDuration, drainDuration } = params;
  const prev = getIrrigationConfig(ctx, growspaceId);
  const patch = { irrigationPumpEntity, drainPumpEntity, irrigationDuration, drainDuration };

  const actionId = await ctx.optimisticManager.applyOptimisticUpdate(
    'update',
    params,
    () => ctx.data.patchDeviceIrrigationConfig(growspaceId, patch),
    () =>
      ctx.data.patchDeviceIrrigationConfig(growspaceId, {
        irrigationPumpEntity: prev.irrigationPumpEntity,
        drainPumpEntity: prev.drainPumpEntity,
        irrigationDuration: prev.irrigationDuration,
        drainDuration: prev.drainDuration,
      })
  );

  try {
    await ctx.dataService.setIrrigationSettings(params);
    ctx.optimisticManager.confirmUpdate(actionId, {
      description: 'Saved irrigation settings',
      redo: () => setIrrigationSettings(ctx, params),
    });
  } catch (e) {
    ctx.optimisticManager.rollbackUpdate(actionId);
    ctx.showToast('Failed to save irrigation settings', 'error');
    throw e;
  }
}
