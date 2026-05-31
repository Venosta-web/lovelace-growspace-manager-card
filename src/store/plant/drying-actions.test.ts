import { describe, it, expect, beforeEach, vi } from 'vitest';
import { logDryingWeight, logMoistureReading, setVisualTag } from './drying-actions';
import type { ActionContext } from '../core/action-context';

function makeDataService() {
  return new Proxy({} as any, {
    get(target, prop) {
      if (!(prop in target)) target[prop] = vi.fn().mockResolvedValue(undefined);
      return target[prop];
    },
  });
}

function makeContext() {
  const showToast = vi.fn();
  return {
    dataService: makeDataService(),
    ui: { showToast } as unknown as ActionContext['ui'],
    refreshData: vi.fn().mockResolvedValue(undefined),
    closeDialog: vi.fn(),
    undoRedoManager: {} as any,
    optimisticManager: {} as any,
    grid: {} as any,
  } satisfies ActionContext;
}

// ─── logDryingWeight ──────────────────────────────────────────────────────────

describe('logDryingWeight', () => {
  let ctx: ReturnType<typeof makeContext>;
  beforeEach(() => { ctx = makeContext(); });

  it('calls dataService with correct payload and toasts success', async () => {
    await logDryingWeight(ctx, 'plant-1', 42.5, '2024-06-01');

    expect((ctx.dataService as any).logDryingWeight).toHaveBeenCalledWith({
      plant_id: 'plant-1',
      weight_grams: 42.5,
      date: '2024-06-01',
    });
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith('Weight logged', 'success');
  });

  it('works without an optional date', async () => {
    await logDryingWeight(ctx, 'plant-1', 30);

    expect((ctx.dataService as any).logDryingWeight).toHaveBeenCalledWith(
      expect.objectContaining({ date: undefined })
    );
  });

  it('toasts error and rethrows on failure', async () => {
    (ctx.dataService as any).logDryingWeight.mockRejectedValue(new Error('weight-fail'));

    await expect(logDryingWeight(ctx, 'plant-1', 10)).rejects.toThrow('weight-fail');
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith(
      expect.stringContaining('weight-fail'),
      'error'
    );
  });
});

// ─── logMoistureReading ───────────────────────────────────────────────────────

describe('logMoistureReading', () => {
  let ctx: ReturnType<typeof makeContext>;
  beforeEach(() => { ctx = makeContext(); });

  it('calls dataService with correct payload and toasts success', async () => {
    await logMoistureReading(ctx, 'plant-1', 62.3, '2024-06-02');

    expect((ctx.dataService as any).logMoistureReading).toHaveBeenCalledWith({
      plant_id: 'plant-1',
      moisture_percent: 62.3,
      date: '2024-06-02',
    });
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith('Moisture logged', 'success');
  });

  it('works without an optional date', async () => {
    await logMoistureReading(ctx, 'plant-1', 55);

    expect((ctx.dataService as any).logMoistureReading).toHaveBeenCalledWith(
      expect.objectContaining({ date: undefined })
    );
  });

  it('toasts error and rethrows on failure', async () => {
    (ctx.dataService as any).logMoistureReading.mockRejectedValue(new Error('moisture-fail'));

    await expect(logMoistureReading(ctx, 'plant-1', 50)).rejects.toThrow('moisture-fail');
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith(
      expect.stringContaining('moisture-fail'),
      'error'
    );
  });
});

// ─── setVisualTag ─────────────────────────────────────────────────────────────

describe('setVisualTag', () => {
  let ctx: ReturnType<typeof makeContext>;
  beforeEach(() => { ctx = makeContext(); });

  it('calls dataService with tag and toasts success', async () => {
    await setVisualTag(ctx, 'plant-1', 'purple');

    expect((ctx.dataService as any).setVisualTag).toHaveBeenCalledWith({
      plant_id: 'plant-1',
      visual_tag: 'purple',
    });
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith('Visual tag saved', 'success');
  });

  it('accepts null to clear a tag', async () => {
    await setVisualTag(ctx, 'plant-1', null);

    expect((ctx.dataService as any).setVisualTag).toHaveBeenCalledWith({
      plant_id: 'plant-1',
      visual_tag: null,
    });
  });

  it('toasts error and rethrows on failure', async () => {
    (ctx.dataService as any).setVisualTag.mockRejectedValue(new Error('tag-fail'));

    await expect(setVisualTag(ctx, 'plant-1', 'red')).rejects.toThrow('tag-fail');
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith(
      expect.stringContaining('tag-fail'),
      'error'
    );
  });
});
