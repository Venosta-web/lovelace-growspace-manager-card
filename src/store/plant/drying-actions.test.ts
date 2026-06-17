import { describe, it, expect, beforeEach, vi } from 'vitest';
import { logDryingWeight, logMoistureReading, setVisualTag } from './drying-actions';
import type { ActionContext } from '../core/action-context';

vi.mock('../../slices/plant', () => ({
  logDryingWeight: vi.fn().mockResolvedValue(undefined),
  logMoistureReading: vi.fn().mockResolvedValue(undefined),
  setVisualTag: vi.fn().mockResolvedValue(undefined),
  updatePlant: vi.fn().mockResolvedValue(undefined),
  deletePlant: vi.fn().mockResolvedValue(undefined),
  harvestPlant: vi.fn().mockResolvedValue(undefined),
  moveClone: vi.fn().mockResolvedValue(undefined),
  takeClone: vi.fn().mockResolvedValue(undefined),
  swapPlants: vi.fn().mockResolvedValue(undefined),
  addPlant: vi.fn().mockResolvedValue(undefined),
  addPlants: vi.fn().mockResolvedValue(undefined),
  printLabel: vi.fn().mockResolvedValue(undefined),
  saveHarvestMetrics: vi.fn().mockResolvedValue(undefined),
  scorePlant: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../services/hass-call', () => ({
  callService: vi.fn().mockResolvedValue(undefined),
  hassCall: vi.fn().mockResolvedValue(undefined),
  setHass: vi.fn(),
  getHass: vi.fn(),
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

// ─── logDryingWeight ──────────────────────────────────────────────────────────

describe('logDryingWeight', () => {
  let ctx: ReturnType<typeof makeContext>;
  beforeEach(() => { ctx = makeContext(); });

  it('calls slice with correct args and toasts success', async () => {
    await logDryingWeight(ctx, 'plant-1', 42.5, '2024-06-01');

    expect(plantSlice.logDryingWeight).toHaveBeenCalledWith('plant-1', 42.5, '2024-06-01');
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith('Weight logged', 'success');
  });

  it('works without an optional date', async () => {
    await logDryingWeight(ctx, 'plant-1', 30);

    expect(plantSlice.logDryingWeight).toHaveBeenCalledWith('plant-1', 30, undefined);
  });

  it('toasts error and rethrows on failure', async () => {
    vi.mocked(plantSlice.logDryingWeight).mockRejectedValueOnce(new Error('weight-fail'));

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

  it('calls slice with correct args and toasts success', async () => {
    await logMoistureReading(ctx, 'plant-1', 62.3, '2024-06-02');

    expect(plantSlice.logMoistureReading).toHaveBeenCalledWith('plant-1', 62.3, '2024-06-02');
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith('Moisture logged', 'success');
  });

  it('works without an optional date', async () => {
    await logMoistureReading(ctx, 'plant-1', 55);

    expect(plantSlice.logMoistureReading).toHaveBeenCalledWith('plant-1', 55, undefined);
  });

  it('toasts error and rethrows on failure', async () => {
    vi.mocked(plantSlice.logMoistureReading).mockRejectedValueOnce(new Error('moisture-fail'));

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

  it('calls slice with tag and toasts success', async () => {
    await setVisualTag(ctx, 'plant-1', 'purple');

    expect(plantSlice.setVisualTag).toHaveBeenCalledWith('plant-1', 'purple');
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith('Visual tag saved', 'success');
  });

  it('accepts null to clear a tag', async () => {
    await setVisualTag(ctx, 'plant-1', null);

    expect(plantSlice.setVisualTag).toHaveBeenCalledWith('plant-1', null);
  });

  it('toasts error and rethrows on failure', async () => {
    vi.mocked(plantSlice.setVisualTag).mockRejectedValueOnce(new Error('tag-fail'));

    await expect(setVisualTag(ctx, 'plant-1', 'red')).rejects.toThrow('tag-fail');
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith(
      expect.stringContaining('tag-fail'),
      'error'
    );
  });
});
