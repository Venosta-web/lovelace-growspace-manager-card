import { describe, it, expect, beforeEach, vi } from 'vitest';
import { configureEnvironment, removeEnvironment, resetWaterTracking } from './environment-actions';
import type { ActionContext } from '../core/action-context';

function makeContext() {
  const showToast = vi.fn();
  const dataService = new Proxy({}, {
    get(target: any, prop) {
      if (!(prop in target)) {
        target[prop] = vi.fn().mockResolvedValue(undefined);
      }
      return target[prop];
    },
  });
  return {
    dataService,
    ui: { showToast } as unknown as ActionContext['ui'],
    refreshData: vi.fn().mockResolvedValue(undefined),
    closeDialog: vi.fn(),
    undoRedoManager: {} as any,
    optimisticManager: {} as any,
    data: {} as any,
    grid: {} as any,
  } satisfies ActionContext;
}

const baseConfig = {
  growspaceId: 'gs-1',
  temperatureSensor: 'sensor.temp',
  humiditySensor: 'sensor.humid',
} as any;

describe('configureEnvironment', () => {
  let ctx: ReturnType<typeof makeContext>;

  beforeEach(() => {
    ctx = makeContext();
  });

  it('calls dataService, toasts success, and refreshes', async () => {
    await configureEnvironment(ctx, baseConfig);

    expect((ctx.dataService as any).configureEnvironment).toHaveBeenCalledWith(baseConfig);
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith('Environment configured successfully!', 'success');
    expect(ctx.refreshData).toHaveBeenCalled();
  });

  it('shows error toast and rethrows on failure', async () => {
    (ctx.dataService as any).configureEnvironment.mockRejectedValue(new Error('env-err'));

    await expect(configureEnvironment(ctx, baseConfig)).rejects.toThrow('env-err');
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith(expect.stringContaining('env-err'), 'error');
    expect(ctx.refreshData).not.toHaveBeenCalled();
  });

  it('handles non-Error exceptions', async () => {
    (ctx.dataService as any).configureEnvironment.mockRejectedValue('string-error');

    await expect(configureEnvironment(ctx, baseConfig)).rejects.toBe('string-error');
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith(expect.stringContaining('Unknown error'), 'error');
  });
});

describe('removeEnvironment', () => {
  let ctx: ReturnType<typeof makeContext>;

  beforeEach(() => {
    ctx = makeContext();
  });

  it('calls dataService, toasts success, and refreshes', async () => {
    await removeEnvironment(ctx, 'gs-1');

    expect((ctx.dataService as any).removeEnvironment).toHaveBeenCalledWith('gs-1');
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith('Environment configuration removed', 'success');
    expect(ctx.refreshData).toHaveBeenCalled();
  });

  it('shows error toast and rethrows on failure', async () => {
    (ctx.dataService as any).removeEnvironment.mockRejectedValue(new Error('remove-err'));

    await expect(removeEnvironment(ctx, 'gs-1')).rejects.toThrow('remove-err');
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith(expect.stringContaining('remove-err'), 'error');
  });

  it('handles non-Error exceptions', async () => {
    (ctx.dataService as any).removeEnvironment.mockRejectedValue('string-error');

    await expect(removeEnvironment(ctx, 'gs-1')).rejects.toBe('string-error');
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith(expect.stringContaining('Unknown error'), 'error');
  });
});

describe('resetWaterTracking', () => {
  let ctx: ReturnType<typeof makeContext>;

  beforeEach(() => {
    ctx = makeContext();
  });

  it('calls dataService, toasts success, and refreshes', async () => {
    await resetWaterTracking(ctx, 'gs-1');

    expect((ctx.dataService as any).resetWaterTracking).toHaveBeenCalledWith('gs-1');
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith('Water tracking reset', 'success');
    expect(ctx.refreshData).toHaveBeenCalled();
  });

  it('shows error toast and rethrows on failure', async () => {
    (ctx.dataService as any).resetWaterTracking.mockRejectedValue(new Error('reset-err'));

    await expect(resetWaterTracking(ctx, 'gs-1')).rejects.toThrow('reset-err');
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith(expect.stringContaining('reset-err'), 'error');
  });

  it('handles non-Error exceptions', async () => {
    (ctx.dataService as any).resetWaterTracking.mockRejectedValue('string-error');

    await expect(resetWaterTracking(ctx, 'gs-1')).rejects.toBe('string-error');
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith(expect.stringContaining('Unknown error'), 'error');
  });
});
