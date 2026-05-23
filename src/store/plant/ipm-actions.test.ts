import { describe, it, expect, vi } from 'vitest';
import { applyIPM } from './ipm-actions';

function makeCtx(overrides: Record<string, unknown> = {}) {
  return {
    dataService: {
      applyIPM: vi.fn().mockResolvedValue(undefined),
      fetchNutrientInventory: vi.fn().mockResolvedValue({}),
    },
    data: {
      setNutrientInventory: vi.fn(),
    },
    ui: {
      showToast: vi.fn(),
    },
    ...overrides,
  } as any;
}

const detail = { preset_id: 'preset-1', growspace_id: 'grow-1', plant_ids: ['plant-1'], notes: 'test' };

describe('applyIPM', () => {
  it('calls dataService.applyIPM with the given detail', async () => {
    const ctx = makeCtx();

    await applyIPM(ctx, detail);

    expect(ctx.dataService.applyIPM).toHaveBeenCalledWith(detail);
  });

  it('refreshes nutrient inventory after applying IPM', async () => {
    const ctx = makeCtx();

    await applyIPM(ctx, detail);

    expect(ctx.dataService.fetchNutrientInventory).toHaveBeenCalled();
  });

  it('shows success toast after applying IPM', async () => {
    const ctx = makeCtx();

    await applyIPM(ctx, detail);

    expect(ctx.ui.showToast).toHaveBeenCalledWith(
      expect.stringContaining('IPM treatment applied successfully'),
      'success',
    );
  });

  it('shows error toast and rethrows when applyIPM fails', async () => {
    const ctx = makeCtx({
      dataService: {
        applyIPM: vi.fn().mockRejectedValue(new Error('service error')),
        fetchNutrientInventory: vi.fn(),
      },
    });

    await expect(applyIPM(ctx, detail)).rejects.toThrow('service error');
    expect(ctx.ui.showToast).toHaveBeenCalledWith(expect.stringContaining('service error'), 'error');
  });
});
