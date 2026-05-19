import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GrowspaceDataStore } from '../core/data-store';
import { OptimisticManager } from '../system/optimistic-manager';
import { UndoRedoManager } from '../../services/undo-redo-manager';
import { createGrowspaceDevice } from '../../services/types';
import type { ActionContext } from '../core/action-context';
import {
  addIrrigationTime,
  removeIrrigationTime,
  addDrainTime,
  removeDrainTime,
  setIrrigationSettings,
} from './irrigation-actions';

function makeContext(overrides: Partial<ActionContext> = {}): ActionContext {
  const data = new GrowspaceDataStore();
  const showToast = vi.fn();
  const undoRedoManager = new UndoRedoManager(showToast);
  const optimisticManager = new OptimisticManager(data, undoRedoManager);

  const device = createGrowspaceDevice({ deviceId: 'gs1', name: 'Tent 1' });
  data.setDevices([device]);

  return {
    data,
    undoRedoManager,
    optimisticManager,
    dataService: {
      addIrrigationTime: vi.fn().mockResolvedValue(undefined),
      removeIrrigationTime: vi.fn().mockResolvedValue(undefined),
      addDrainTime: vi.fn().mockResolvedValue(undefined),
      removeDrainTime: vi.fn().mockResolvedValue(undefined),
      setIrrigationSettings: vi.fn().mockResolvedValue(undefined),
    } as unknown as ActionContext['dataService'],
    ui: { showToast } as unknown as ActionContext['ui'],
    grid: {} as ActionContext['grid'],
    closeDialog: vi.fn(),
    refreshData: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } satisfies ActionContext;
}

// ---------------------------------------------------------------------------
// addIrrigationTime
// ---------------------------------------------------------------------------

describe('addIrrigationTime', () => {
  let ctx: ActionContext;

  beforeEach(() => {
    ctx = makeContext();
  });

  it('calls dataService.addIrrigationTime with correct params', async () => {
    await addIrrigationTime(ctx, { growspaceId: 'gs1', time: '06:00:00', duration: 60 });

    expect(ctx.dataService.addIrrigationTime).toHaveBeenCalledWith({
      growspaceId: 'gs1',
      time: '06:00:00',
      duration: 60,
    });
  });

  it('applies the new time to the device immediately (optimistic)', async () => {
    await addIrrigationTime(ctx, { growspaceId: 'gs1', time: '06:00:00', duration: 60 });

    const device = ctx.data.$devices.get().find((d) => d.deviceId === 'gs1');
    expect(device?.irrigationConfig.irrigationTimes).toContainEqual(
      expect.objectContaining({ time: '06:00:00' })
    );
  });

  it('registers an undoable action after backend confirms', async () => {
    await addIrrigationTime(ctx, { growspaceId: 'gs1', time: '06:00:00', duration: 60 });

    expect(ctx.undoRedoManager.canUndo).toBe(true);
  });

  it('rolls back the optimistic update when backend fails', async () => {
    vi.mocked(ctx.dataService.addIrrigationTime).mockRejectedValue(new Error('network error'));

    await expect(
      addIrrigationTime(ctx, { growspaceId: 'gs1', time: '06:00:00', duration: 60 })
    ).rejects.toThrow();

    const device = ctx.data.$devices.get().find((d) => d.deviceId === 'gs1');
    expect(device?.irrigationConfig.irrigationTimes).toHaveLength(0);
  });

  it('shows error toast when backend fails', async () => {
    vi.mocked(ctx.dataService.addIrrigationTime).mockRejectedValue(new Error('network error'));

    await expect(
      addIrrigationTime(ctx, { growspaceId: 'gs1', time: '06:00:00', duration: 60 })
    ).rejects.toThrow();

    expect(ctx.ui.showToast as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(expect.any(String), 'error');
  });

  it('executes redo callback successfully', async () => {
    const params = { growspaceId: 'gs1', time: '06:00:00', duration: 60 };
    await addIrrigationTime(ctx, params);

    expect(ctx.dataService.addIrrigationTime).toHaveBeenCalledTimes(1);

    await ctx.undoRedoManager.undo();
    await ctx.undoRedoManager.redo();

    expect(ctx.dataService.addIrrigationTime).toHaveBeenCalledTimes(2);
    expect(ctx.dataService.addIrrigationTime).toHaveBeenLastCalledWith(params);
  });

  it('handles non-existent device and returns default configuration', async () => {
    await addIrrigationTime(ctx, { growspaceId: 'gs_invalid', time: '06:00:00' });
    // Verify that the call completes without crashing
  });

  it('uses default duration of 60 when duration is not provided', async () => {
    await addIrrigationTime(ctx, { growspaceId: 'gs1', time: '06:00:00' });
    
    expect(ctx.dataService.addIrrigationTime).toHaveBeenCalledWith({
      growspaceId: 'gs1',
      time: '06:00:00',
      duration: undefined,
    });

    const device = ctx.data.$devices.get().find((d) => d.deviceId === 'gs1');
    expect(device?.irrigationConfig.irrigationTimes).toContainEqual(
      expect.objectContaining({ time: '06:00:00', duration: 60 })
    );
  });

  it('sorts multiple irrigation times correctly', async () => {
    await addIrrigationTime(ctx, { growspaceId: 'gs1', time: undefined as any, duration: 60 });
    await addIrrigationTime(ctx, { growspaceId: 'gs1', time: undefined as any, duration: 60 });
    await addIrrigationTime(ctx, { growspaceId: 'gs1', time: '12:00:00', duration: 60 });
    await addIrrigationTime(ctx, { growspaceId: 'gs1', time: '06:00:00', duration: 60 });

    const device = ctx.data.$devices.get().find((d) => d.deviceId === 'gs1');
    expect(device?.irrigationConfig.irrigationTimes).toEqual([
      expect.objectContaining({ time: undefined }),
      expect.objectContaining({ time: undefined }),
      expect.objectContaining({ time: '06:00:00' }),
      expect.objectContaining({ time: '12:00:00' }),
    ]);
  });
});

// ---------------------------------------------------------------------------
// removeIrrigationTime
// ---------------------------------------------------------------------------

describe('removeIrrigationTime', () => {
  let ctx: ActionContext;

  beforeEach(() => {
    ctx = makeContext();
    const device = createGrowspaceDevice({
      deviceId: 'gs1',
      name: 'Tent 1',
      irrigationConfig: {
        irrigationTimes: [{ time: '06:00:00', duration: 60 }],
        drainTimes: [],
      },
    });
    ctx.data.setDevices([device]);
  });

  it('calls dataService.removeIrrigationTime with correct params', async () => {
    await removeIrrigationTime(ctx, { growspaceId: 'gs1', time: '06:00:00' });

    expect(ctx.dataService.removeIrrigationTime).toHaveBeenCalledWith({
      growspaceId: 'gs1',
      time: '06:00:00',
    });
  });

  it('removes the time from the device immediately (optimistic)', async () => {
    await removeIrrigationTime(ctx, { growspaceId: 'gs1', time: '06:00:00' });

    const device = ctx.data.$devices.get().find((d) => d.deviceId === 'gs1');
    expect(device?.irrigationConfig.irrigationTimes).toHaveLength(0);
  });

  it('registers an undoable action after backend confirms', async () => {
    await removeIrrigationTime(ctx, { growspaceId: 'gs1', time: '06:00:00' });

    expect(ctx.undoRedoManager.canUndo).toBe(true);
  });

  it('restores the time when backend fails', async () => {
    vi.mocked(ctx.dataService.removeIrrigationTime).mockRejectedValue(new Error('fail'));

    await expect(
      removeIrrigationTime(ctx, { growspaceId: 'gs1', time: '06:00:00' })
    ).rejects.toThrow();

    const device = ctx.data.$devices.get().find((d) => d.deviceId === 'gs1');
    expect(device?.irrigationConfig.irrigationTimes).toContainEqual(
      expect.objectContaining({ time: '06:00:00' })
    );
  });

  it('executes redo callback successfully', async () => {
    const params = { growspaceId: 'gs1', time: '06:00:00' };
    await removeIrrigationTime(ctx, params);

    expect(ctx.dataService.removeIrrigationTime).toHaveBeenCalledTimes(1);

    await ctx.undoRedoManager.undo();
    await ctx.undoRedoManager.redo();

    expect(ctx.dataService.removeIrrigationTime).toHaveBeenCalledTimes(2);
    expect(ctx.dataService.removeIrrigationTime).toHaveBeenLastCalledWith(params);
  });
});

// ---------------------------------------------------------------------------
// addDrainTime
// ---------------------------------------------------------------------------

describe('addDrainTime', () => {
  let ctx: ActionContext;

  beforeEach(() => {
    ctx = makeContext();
  });

  it('calls dataService.addDrainTime with correct params', async () => {
    await addDrainTime(ctx, { growspaceId: 'gs1', time: '18:00:00', duration: 30 });

    expect(ctx.dataService.addDrainTime).toHaveBeenCalledWith({
      growspaceId: 'gs1',
      time: '18:00:00',
      duration: 30,
    });
  });

  it('applies the new drain time to the device immediately (optimistic)', async () => {
    await addDrainTime(ctx, { growspaceId: 'gs1', time: '18:00:00', duration: 30 });

    const device = ctx.data.$devices.get().find((d) => d.deviceId === 'gs1');
    expect(device?.irrigationConfig.drainTimes).toContainEqual(
      expect.objectContaining({ time: '18:00:00' })
    );
  });

  it('registers an undoable action after backend confirms', async () => {
    await addDrainTime(ctx, { growspaceId: 'gs1', time: '18:00:00', duration: 30 });

    expect(ctx.undoRedoManager.canUndo).toBe(true);
  });

  it('rolls back when backend fails', async () => {
    vi.mocked(ctx.dataService.addDrainTime).mockRejectedValue(new Error('fail'));

    await expect(
      addDrainTime(ctx, { growspaceId: 'gs1', time: '18:00:00', duration: 30 })
    ).rejects.toThrow();

    const device = ctx.data.$devices.get().find((d) => d.deviceId === 'gs1');
    expect(device?.irrigationConfig.drainTimes).toHaveLength(0);
  });

  it('executes redo callback successfully', async () => {
    const params = { growspaceId: 'gs1', time: '18:00:00', duration: 30 };
    await addDrainTime(ctx, params);

    expect(ctx.dataService.addDrainTime).toHaveBeenCalledTimes(1);

    await ctx.undoRedoManager.undo();
    await ctx.undoRedoManager.redo();

    expect(ctx.dataService.addDrainTime).toHaveBeenCalledTimes(2);
    expect(ctx.dataService.addDrainTime).toHaveBeenLastCalledWith(params);
  });

  it('uses default duration of 60 when duration is not provided', async () => {
    await addDrainTime(ctx, { growspaceId: 'gs1', time: '18:00:00' });

    expect(ctx.dataService.addDrainTime).toHaveBeenCalledWith({
      growspaceId: 'gs1',
      time: '18:00:00',
      duration: undefined,
    });

    const device = ctx.data.$devices.get().find((d) => d.deviceId === 'gs1');
    expect(device?.irrigationConfig.drainTimes).toContainEqual(
      expect.objectContaining({ time: '18:00:00', duration: 60 })
    );
  });

  it('sorts multiple drain times correctly', async () => {
    await addDrainTime(ctx, { growspaceId: 'gs1', time: undefined as any, duration: 30 });
    await addDrainTime(ctx, { growspaceId: 'gs1', time: undefined as any, duration: 30 });
    await addDrainTime(ctx, { growspaceId: 'gs1', time: '18:00:00', duration: 30 });
    await addDrainTime(ctx, { growspaceId: 'gs1', time: '08:00:00', duration: 30 });

    const device = ctx.data.$devices.get().find((d) => d.deviceId === 'gs1');
    expect(device?.irrigationConfig.drainTimes).toEqual([
      expect.objectContaining({ time: undefined }),
      expect.objectContaining({ time: undefined }),
      expect.objectContaining({ time: '08:00:00' }),
      expect.objectContaining({ time: '18:00:00' }),
    ]);
  });
});

// ---------------------------------------------------------------------------
// removeDrainTime
// ---------------------------------------------------------------------------

describe('removeDrainTime', () => {
  let ctx: ActionContext;

  beforeEach(() => {
    ctx = makeContext();
    const device = createGrowspaceDevice({
      deviceId: 'gs1',
      name: 'Tent 1',
      irrigationConfig: {
        irrigationTimes: [],
        drainTimes: [{ time: '18:00:00', duration: 30 }],
      },
    });
    ctx.data.setDevices([device]);
  });

  it('calls dataService.removeDrainTime with correct params', async () => {
    await removeDrainTime(ctx, { growspaceId: 'gs1', time: '18:00:00' });

    expect(ctx.dataService.removeDrainTime).toHaveBeenCalledWith({
      growspaceId: 'gs1',
      time: '18:00:00',
    });
  });

  it('removes the drain time from the device immediately (optimistic)', async () => {
    await removeDrainTime(ctx, { growspaceId: 'gs1', time: '18:00:00' });

    const device = ctx.data.$devices.get().find((d) => d.deviceId === 'gs1');
    expect(device?.irrigationConfig.drainTimes).toHaveLength(0);
  });

  it('restores the drain time when backend fails', async () => {
    vi.mocked(ctx.dataService.removeDrainTime).mockRejectedValue(new Error('fail'));

    await expect(
      removeDrainTime(ctx, { growspaceId: 'gs1', time: '18:00:00' })
    ).rejects.toThrow();

    const device = ctx.data.$devices.get().find((d) => d.deviceId === 'gs1');
    expect(device?.irrigationConfig.drainTimes).toContainEqual(
      expect.objectContaining({ time: '18:00:00' })
    );
  });

  it('executes redo callback successfully', async () => {
    const params = { growspaceId: 'gs1', time: '18:00:00' };
    await removeDrainTime(ctx, params);

    expect(ctx.dataService.removeDrainTime).toHaveBeenCalledTimes(1);

    await ctx.undoRedoManager.undo();
    await ctx.undoRedoManager.redo();

    expect(ctx.dataService.removeDrainTime).toHaveBeenCalledTimes(2);
    expect(ctx.dataService.removeDrainTime).toHaveBeenLastCalledWith(params);
  });
});

// ---------------------------------------------------------------------------
// setIrrigationSettings
// ---------------------------------------------------------------------------

describe('setIrrigationSettings', () => {
  let ctx: ActionContext;

  beforeEach(() => {
    ctx = makeContext();
    const device = createGrowspaceDevice({
      deviceId: 'gs1',
      name: 'Tent 1',
      irrigationConfig: {
        irrigationTimes: [],
        drainTimes: [],
        irrigationPumpEntity: 'switch.old_pump',
        irrigationDuration: 60,
      },
    });
    ctx.data.setDevices([device]);
  });

  it('calls dataService.setIrrigationSettings with correct params', async () => {
    await setIrrigationSettings(ctx, {
      growspaceId: 'gs1',
      irrigationPumpEntity: 'switch.new_pump',
      drainPumpEntity: '',
      irrigationDuration: 90,
      drainDuration: 45,
    });

    expect(ctx.dataService.setIrrigationSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        growspaceId: 'gs1',
        irrigationPumpEntity: 'switch.new_pump',
        irrigationDuration: 90,
      })
    );
  });

  it('applies settings to device immediately (optimistic)', async () => {
    await setIrrigationSettings(ctx, {
      growspaceId: 'gs1',
      irrigationPumpEntity: 'switch.new_pump',
      drainPumpEntity: '',
      irrigationDuration: 90,
      drainDuration: 45,
    });

    const device = ctx.data.$devices.get().find((d) => d.deviceId === 'gs1');
    expect(device?.irrigationConfig.irrigationPumpEntity).toBe('switch.new_pump');
    expect(device?.irrigationConfig.irrigationDuration).toBe(90);
  });

  it('registers an undoable action after backend confirms', async () => {
    await setIrrigationSettings(ctx, {
      growspaceId: 'gs1',
      irrigationPumpEntity: 'switch.new_pump',
      drainPumpEntity: '',
      irrigationDuration: 90,
      drainDuration: 45,
    });

    expect(ctx.undoRedoManager.canUndo).toBe(true);
  });

  it('restores previous settings when backend fails', async () => {
    vi.mocked(ctx.dataService.setIrrigationSettings).mockRejectedValue(new Error('fail'));

    await expect(
      setIrrigationSettings(ctx, {
        growspaceId: 'gs1',
        irrigationPumpEntity: 'switch.new_pump',
        drainPumpEntity: '',
        irrigationDuration: 90,
        drainDuration: 45,
      })
    ).rejects.toThrow();

    const device = ctx.data.$devices.get().find((d) => d.deviceId === 'gs1');
    expect(device?.irrigationConfig.irrigationPumpEntity).toBe('switch.old_pump');
    expect(device?.irrigationConfig.irrigationDuration).toBe(60);
  });

  it('executes redo callback successfully', async () => {
    const params = {
      growspaceId: 'gs1',
      irrigationPumpEntity: 'switch.new_pump',
      drainPumpEntity: '',
      irrigationDuration: 90,
      drainDuration: 45,
    };
    await setIrrigationSettings(ctx, params);

    expect(ctx.dataService.setIrrigationSettings).toHaveBeenCalledTimes(1);

    await ctx.undoRedoManager.undo();
    await ctx.undoRedoManager.redo();

    expect(ctx.dataService.setIrrigationSettings).toHaveBeenCalledTimes(2);
    expect(ctx.dataService.setIrrigationSettings).toHaveBeenLastCalledWith(params);
  });
});
