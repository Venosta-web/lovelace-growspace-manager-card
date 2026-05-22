import { describe, it, expect, vi, beforeEach } from 'vitest';
import { saveIPMPreset } from './library-actions';

function makeCtx(overrides: Record<string, unknown> = {}) {
  return {
    dataService: {
      saveIPMPreset: vi.fn().mockResolvedValue(undefined),
      fetchIPMPresets: vi.fn().mockResolvedValue({}),
    },
    data: {
      setIPMPresets: vi.fn(),
    },
    ui: {
      showToast: vi.fn(),
    },
    ...overrides,
  } as any;
}

const validPreset = {
  name: 'Weekly Neem',
  type: 'foliar' as const,
  items: [{ name: 'Neem Oil', dose_amount: 5, dose_unit: 'ml/L', phi_days: 3 }],
};

describe('saveIPMPreset', () => {
  it('calls dataService.saveIPMPreset with the preset data', async () => {
    const ctx = makeCtx();

    await saveIPMPreset(ctx, validPreset);

    expect(ctx.dataService.saveIPMPreset).toHaveBeenCalledWith(validPreset);
  });

  it('refreshes IPM presets after saving', async () => {
    const ctx = makeCtx();

    await saveIPMPreset(ctx, validPreset);

    expect(ctx.dataService.fetchIPMPresets).toHaveBeenCalled();
  });

  it('shows success toast after saving', async () => {
    const ctx = makeCtx();

    await saveIPMPreset(ctx, validPreset);

    expect(ctx.ui.showToast).toHaveBeenCalledWith(
      expect.stringContaining('Weekly Neem'),
      'success'
    );
  });

  it('shows error toast and rethrows when save fails', async () => {
    const ctx = makeCtx({
      dataService: {
        saveIPMPreset: vi.fn().mockRejectedValue(new Error('network error')),
        fetchIPMPresets: vi.fn(),
      },
    });

    await expect(saveIPMPreset(ctx, validPreset)).rejects.toThrow('network error');
    expect(ctx.ui.showToast).toHaveBeenCalledWith(expect.stringContaining('network error'), 'error');
  });
});
