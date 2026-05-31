import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  configureEnvironment,
  removeEnvironment,
  resetWaterTracking,
  waterPlant,
  waterGrowspace,
} from './environment-actions';
import type { ActionContext } from '../core/action-context';
import * as libraryActions from '../plant/library-actions';

vi.mock('../plant/library-actions', () => ({
  fetchNutrientInventory: vi.fn().mockResolvedValue(undefined),
}));

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

describe('waterPlant', () => {
  let ctx: ReturnType<typeof makeContext>;

  beforeEach(() => {
    ctx = makeContext();
    vi.mocked(libraryActions.fetchNutrientInventory).mockClear();
  });

  it('calls dataService without nutrient refresh when no nutrients given', async () => {
    await waterPlant(ctx, 'plant-1', 200);

    expect((ctx.dataService as any).waterPlant).toHaveBeenCalledWith('plant-1', 200, undefined, undefined);
    expect(libraryActions.fetchNutrientInventory).not.toHaveBeenCalled();
  });

  it('calls dataService and refreshes nutrient inventory when nutrients applied', async () => {
    const nutrients = { 'nutrient-a': 5 };
    await waterPlant(ctx, 'plant-1', 200, nutrients, 'preset-1');

    expect((ctx.dataService as any).waterPlant).toHaveBeenCalledWith('plant-1', 200, nutrients, 'preset-1');
    expect(libraryActions.fetchNutrientInventory).toHaveBeenCalledWith(ctx, true);
  });

  it('skips nutrient refresh for empty nutrients object', async () => {
    await waterPlant(ctx, 'plant-1', 200, {});

    expect((ctx.dataService as any).waterPlant).toHaveBeenCalledWith('plant-1', 200, {}, undefined);
    expect(libraryActions.fetchNutrientInventory).not.toHaveBeenCalled();
  });

  it('shows error toast and rethrows on failure', async () => {
    (ctx.dataService as any).waterPlant.mockRejectedValue(new Error('water-err'));

    await expect(waterPlant(ctx, 'plant-1', 200)).rejects.toThrow('water-err');
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith(expect.stringContaining('water-err'), 'error');
  });
});

describe('waterGrowspace', () => {
  let ctx: ReturnType<typeof makeContext>;

  beforeEach(() => {
    ctx = makeContext();
    vi.mocked(libraryActions.fetchNutrientInventory).mockClear();
  });

  it('calls dataService without nutrient refresh when no nutrients given', async () => {
    await waterGrowspace(ctx, 'gs-1', 500);

    expect((ctx.dataService as any).waterGrowspace).toHaveBeenCalledWith('gs-1', 500, undefined, undefined);
    expect(libraryActions.fetchNutrientInventory).not.toHaveBeenCalled();
  });

  it('calls dataService and refreshes nutrient inventory when nutrients applied', async () => {
    const nutrients = { 'nutrient-b': 10 };
    await waterGrowspace(ctx, 'gs-1', 500, nutrients, 'preset-2');

    expect((ctx.dataService as any).waterGrowspace).toHaveBeenCalledWith('gs-1', 500, nutrients, 'preset-2');
    expect(libraryActions.fetchNutrientInventory).toHaveBeenCalledWith(ctx, true);
  });

  it('skips nutrient refresh for empty nutrients object', async () => {
    await waterGrowspace(ctx, 'gs-1', 500, {});

    expect((ctx.dataService as any).waterGrowspace).toHaveBeenCalledWith('gs-1', 500, {}, undefined);
    expect(libraryActions.fetchNutrientInventory).not.toHaveBeenCalled();
  });

  it('shows error toast and rethrows on failure', async () => {
    (ctx.dataService as any).waterGrowspace.mockRejectedValue(new Error('growspace-water-err'));

    await expect(waterGrowspace(ctx, 'gs-1', 500)).rejects.toThrow('growspace-water-err');
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith(expect.stringContaining('growspace-water-err'), 'error');
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
