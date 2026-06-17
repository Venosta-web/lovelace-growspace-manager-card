import { describe, it, expect, beforeEach, vi } from 'vitest';
import { saveHarvestMetrics, scorePhenotype } from './plant-actions';
import type { ActionContext } from '../core/action-context';

vi.mock('../../slices/plant', () => ({
  saveHarvestMetrics: vi.fn().mockResolvedValue(undefined),
  scorePlant: vi.fn().mockResolvedValue(undefined),
  updatePlant: vi.fn().mockResolvedValue(undefined),
  deletePlant: vi.fn().mockResolvedValue(undefined),
  harvestPlant: vi.fn().mockResolvedValue(undefined),
  moveClone: vi.fn().mockResolvedValue(undefined),
  takeClone: vi.fn().mockResolvedValue(undefined),
  swapPlants: vi.fn().mockResolvedValue(undefined),
  addPlant: vi.fn().mockResolvedValue(undefined),
  addPlants: vi.fn().mockResolvedValue(undefined),
  printLabel: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../services/hass-call', () => ({
  callService: vi.fn().mockResolvedValue(undefined),
  hassCall: vi.fn().mockResolvedValue(undefined),
  setHass: vi.fn(),
  getHass: vi.fn(),
  callApi: vi.fn().mockResolvedValue(undefined),
  callFetch: vi.fn().mockResolvedValue(undefined),
  callServiceReturning: vi.fn().mockResolvedValue(undefined),
}));

import * as plantSlice from '../../slices/plant';

beforeEach(() => {
  vi.clearAllMocks();
});

function makeContext() {
  const showToast = vi.fn();
  return {
    ui: { showToast } as unknown as ActionContext['ui'],
    refreshData: vi.fn().mockResolvedValue(undefined),
    closeDialog: vi.fn(),
    grid: {} as any,
  } satisfies ActionContext;
}

describe('saveHarvestMetrics', () => {
  let ctx: ReturnType<typeof makeContext>;

  beforeEach(() => {
    ctx = makeContext();
  });

  it('calls slice, shows success toast, and refreshes', async () => {
    await saveHarvestMetrics(ctx, 'plant-1', { wet_weight: 120, dry_weight: 28 });

    expect(plantSlice.saveHarvestMetrics).toHaveBeenCalledWith('plant-1', { wet_weight: 120, dry_weight: 28 });
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith(
      expect.stringContaining('Harvest metrics saved'),
      'success'
    );
    expect(ctx.refreshData).toHaveBeenCalled();
  });

  it('shows error toast and rethrows on failure', async () => {
    vi.mocked(plantSlice.saveHarvestMetrics).mockRejectedValueOnce(new Error('boom'));

    await expect(saveHarvestMetrics(ctx, 'p', { wet_weight: 10 })).rejects.toThrow('boom');

    expect((ctx.ui as any).showToast).toHaveBeenCalledWith(expect.stringContaining('boom'), 'error');
    expect(ctx.refreshData).not.toHaveBeenCalled();
  });

  it('skips slice call when metrics object is empty', async () => {
    await saveHarvestMetrics(ctx, 'p', {});

    expect(plantSlice.saveHarvestMetrics).not.toHaveBeenCalled();
    expect((ctx.ui as any).showToast).not.toHaveBeenCalled();
    expect(ctx.refreshData).not.toHaveBeenCalled();
  });
});

describe('scorePhenotype', () => {
  let ctx: ReturnType<typeof makeContext>;

  beforeEach(() => {
    ctx = makeContext();
  });

  it('calls slice, toasts success, and refreshes', async () => {
    await scorePhenotype(ctx, 'p', { vigor: 4, aroma: 5 });

    expect(plantSlice.scorePlant).toHaveBeenCalledWith('p', { vigor: 4, aroma: 5 });
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith(expect.stringContaining('Scores saved'), 'success');
    expect(ctx.refreshData).toHaveBeenCalled();
  });

  it('no-ops when all scores are null', async () => {
    await scorePhenotype(ctx, 'p', { vigor: null, aroma: null });

    expect(plantSlice.scorePlant).not.toHaveBeenCalled();
    expect((ctx.ui as any).showToast).not.toHaveBeenCalled();
    expect(ctx.refreshData).not.toHaveBeenCalled();
  });

  it('no-ops when scores object is empty', async () => {
    await scorePhenotype(ctx, 'p', {});

    expect(plantSlice.scorePlant).not.toHaveBeenCalled();
  });

  it('shows error toast and rethrows on failure', async () => {
    vi.mocked(plantSlice.scorePlant).mockRejectedValueOnce(new Error('score boom'));

    await expect(scorePhenotype(ctx, 'p', { vigor: 3 })).rejects.toThrow('score boom');

    expect((ctx.ui as any).showToast).toHaveBeenCalledWith(expect.stringContaining('score boom'), 'error');
    expect(ctx.refreshData).not.toHaveBeenCalled();
  });

  it('calls with only non-null scores mixed in', async () => {
    await scorePhenotype(ctx, 'p', { vigor: 4, aroma: null, structure: 3 });

    expect(plantSlice.scorePlant).toHaveBeenCalledWith('p', { vigor: 4, aroma: null, structure: 3 });
  });
});
