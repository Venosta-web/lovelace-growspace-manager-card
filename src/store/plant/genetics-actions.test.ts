import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  addSeedBatch,
  updateSeedBatch,
  logPollination,
  updatePollination,
  deletePollination,
  harvestSeeds,
  fetchGeneticsData,
  deleteSeedBatch,
  getLineageTree,
  getStrainLineageTree,
  updateStrainLineageTree,
} from './genetics-actions';
import type { ActionContext } from '../core/action-context';

vi.mock('../../slices/genetics', () => ({
  addSeedBatch: vi.fn().mockResolvedValue(undefined),
  updateSeedBatch: vi.fn().mockResolvedValue(undefined),
  removeSeedBatch: vi.fn().mockResolvedValue(undefined),
  logPollinationEvent: vi.fn().mockResolvedValue(undefined),
  updatePollinationEvent: vi.fn().mockResolvedValue(undefined),
  deletePollinationEvent: vi.fn().mockResolvedValue(undefined),
  harvestSeeds: vi.fn().mockResolvedValue(undefined),
  fetchGeneticsData: vi.fn().mockResolvedValue(undefined),
  sowSeed: vi.fn().mockResolvedValue(undefined),
  setPlantSex: vi.fn().mockResolvedValue(undefined),
  unlinkSeedBatch: vi.fn().mockResolvedValue(undefined),
  getLineageTree: vi.fn().mockResolvedValue(undefined),
  getStrainLineageTree: vi.fn().mockResolvedValue(undefined),
  updateStrainLineageTree: vi.fn().mockResolvedValue(undefined),
  importStrainLineageTree: vi.fn().mockResolvedValue(undefined),
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

import * as geneticsSlice from '../../slices/genetics';

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

const seedBatchData = {
  strain_name: 'OG Kush',
  breeder: 'DNA',
  quantity: 10,
  acquisition_date: '2024-01-01',
  generation: 'F1',
} as any;

const pollinationData = {
  mother_strain: 'OG Kush',
  father_strain: 'Headband',
  date: '2024-04-01',
} as any;

describe('addSeedBatch', () => {
  let ctx: ReturnType<typeof makeContext>;
  beforeEach(() => { ctx = makeContext(); });

  it('calls slice, toasts, and refreshes on success', async () => {
    await addSeedBatch(ctx, seedBatchData);

    expect(geneticsSlice.addSeedBatch).toHaveBeenCalledWith(seedBatchData);
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith('Seed batch added', 'success');
    expect(ctx.refreshData).toHaveBeenCalled();
  });

  it('toasts error and rethrows', async () => {
    vi.mocked(geneticsSlice.addSeedBatch).mockRejectedValueOnce(new Error('add-err'));

    await expect(addSeedBatch(ctx, seedBatchData)).rejects.toThrow('add-err');
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith(expect.stringContaining('add-err'), 'error');
  });

  it('uses "Unknown error" when thrown value is not an Error', async () => {
    vi.mocked(geneticsSlice.addSeedBatch).mockRejectedValueOnce('raw string');
    await expect(addSeedBatch(ctx, seedBatchData)).rejects.toBe('raw string');
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith(expect.stringContaining('Unknown error'), 'error');
  });
});

describe('updateSeedBatch', () => {
  let ctx: ReturnType<typeof makeContext>;
  beforeEach(() => { ctx = makeContext(); });

  it('calls slice, toasts, and refreshes on success', async () => {
    const data = { batch_id: 'b1', quantity: 5 } as any;
    await updateSeedBatch(ctx, data);

    expect(geneticsSlice.updateSeedBatch).toHaveBeenCalledWith(data);
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith('Seed batch updated', 'success');
    expect(ctx.refreshData).toHaveBeenCalled();
  });

  it('toasts error and rethrows', async () => {
    vi.mocked(geneticsSlice.updateSeedBatch).mockRejectedValueOnce(new Error('upd-err'));
    await expect(updateSeedBatch(ctx, { batch_id: 'b1' } as any)).rejects.toThrow('upd-err');
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith(expect.stringContaining('upd-err'), 'error');
  });

  it('uses "Unknown error" when thrown value is not an Error', async () => {
    vi.mocked(geneticsSlice.updateSeedBatch).mockRejectedValueOnce(42);
    await expect(updateSeedBatch(ctx, { batch_id: 'b1' } as any)).rejects.toBe(42);
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith(expect.stringContaining('Unknown error'), 'error');
  });
});

describe('logPollination', () => {
  let ctx: ReturnType<typeof makeContext>;
  beforeEach(() => { ctx = makeContext(); });

  it('calls slice, toasts, and refreshes on success', async () => {
    await logPollination(ctx, pollinationData);

    expect(geneticsSlice.logPollinationEvent).toHaveBeenCalledWith(pollinationData);
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith('Pollination event logged', 'success');
    expect(ctx.refreshData).toHaveBeenCalled();
  });

  it('toasts error and rethrows', async () => {
    vi.mocked(geneticsSlice.logPollinationEvent).mockRejectedValueOnce(new Error('poll-err'));
    await expect(logPollination(ctx, pollinationData)).rejects.toThrow('poll-err');
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith(expect.stringContaining('poll-err'), 'error');
  });

  it('uses "Unknown error" when thrown value is not an Error', async () => {
    vi.mocked(geneticsSlice.logPollinationEvent).mockRejectedValueOnce(null);
    await expect(logPollination(ctx, pollinationData)).rejects.toBeNull();
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith(expect.stringContaining('Unknown error'), 'error');
  });
});

describe('updatePollination', () => {
  let ctx: ReturnType<typeof makeContext>;
  beforeEach(() => { ctx = makeContext(); });

  it('calls slice, toasts, and refreshes on success', async () => {
    const data = { event_id: 'ev-1', notes: 'great' } as any;
    await updatePollination(ctx, data);

    expect(geneticsSlice.updatePollinationEvent).toHaveBeenCalledWith(data);
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith('Pollination event updated', 'success');
    expect(ctx.refreshData).toHaveBeenCalled();
  });

  it('toasts error and rethrows', async () => {
    vi.mocked(geneticsSlice.updatePollinationEvent).mockRejectedValueOnce(new Error('upd2-err'));
    await expect(updatePollination(ctx, { event_id: 'ev-1' } as any)).rejects.toThrow('upd2-err');
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith(expect.stringContaining('upd2-err'), 'error');
  });

  it('uses "Unknown error" when thrown value is not an Error', async () => {
    vi.mocked(geneticsSlice.updatePollinationEvent).mockRejectedValueOnce('oops');
    await expect(updatePollination(ctx, { event_id: 'ev-1' } as any)).rejects.toBe('oops');
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith(expect.stringContaining('Unknown error'), 'error');
  });
});

describe('deletePollination', () => {
  let ctx: ReturnType<typeof makeContext>;
  beforeEach(() => { ctx = makeContext(); });

  it('calls slice, toasts, and refreshes on success', async () => {
    await deletePollination(ctx, 'ev-1');

    expect(geneticsSlice.deletePollinationEvent).toHaveBeenCalledWith('ev-1');
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith('Pollination event deleted', 'success');
    expect(ctx.refreshData).toHaveBeenCalled();
  });

  it('toasts error and rethrows', async () => {
    vi.mocked(geneticsSlice.deletePollinationEvent).mockRejectedValueOnce(new Error('del-err'));
    await expect(deletePollination(ctx, 'ev-1')).rejects.toThrow('del-err');
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith(expect.stringContaining('del-err'), 'error');
  });

  it('uses "Unknown error" when thrown value is not an Error', async () => {
    vi.mocked(geneticsSlice.deletePollinationEvent).mockRejectedValueOnce({});
    await expect(deletePollination(ctx, 'ev-1')).rejects.toEqual({});
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith(expect.stringContaining('Unknown error'), 'error');
  });
});

describe('harvestSeeds', () => {
  let ctx: ReturnType<typeof makeContext>;
  beforeEach(() => { ctx = makeContext(); });

  it('calls slice, toasts, and refreshes on success', async () => {
    const data = { pollination_event_id: 'ev-1', seed_count: 20 } as any;
    await harvestSeeds(ctx, data);

    expect(geneticsSlice.harvestSeeds).toHaveBeenCalledWith(data);
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith('Seeds harvested', 'success');
    expect(ctx.refreshData).toHaveBeenCalled();
  });

  it('toasts error and rethrows', async () => {
    vi.mocked(geneticsSlice.harvestSeeds).mockRejectedValueOnce(new Error('harvest-err'));
    await expect(harvestSeeds(ctx, { pollination_event_id: 'ev-1' } as any)).rejects.toThrow('harvest-err');
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith(expect.stringContaining('harvest-err'), 'error');
  });

  it('uses "Unknown error" when thrown value is not an Error', async () => {
    vi.mocked(geneticsSlice.harvestSeeds).mockRejectedValueOnce('bad');
    await expect(harvestSeeds(ctx, { pollination_event_id: 'ev-1' } as any)).rejects.toBe('bad');
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith(expect.stringContaining('Unknown error'), 'error');
  });
});

describe('fetchGeneticsData', () => {
  let ctx: ReturnType<typeof makeContext>;
  beforeEach(() => { ctx = makeContext(); });

  it('returns data from slice on success', async () => {
    const fakeData = { seed_batches: [], pollination_events: [] };
    vi.mocked(geneticsSlice.fetchGeneticsData).mockResolvedValueOnce(fakeData as any);

    const result = await fetchGeneticsData(ctx);

    expect(geneticsSlice.fetchGeneticsData).toHaveBeenCalled();
    expect(result).toBe(fakeData);
  });

  it('toasts error and rethrows on failure', async () => {
    vi.mocked(geneticsSlice.fetchGeneticsData).mockRejectedValueOnce(new Error('fetch-err'));
    await expect(fetchGeneticsData(ctx)).rejects.toThrow('fetch-err');
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith(expect.stringContaining('fetch-err'), 'error');
  });

  it('uses "Unknown error" when thrown value is not an Error', async () => {
    vi.mocked(geneticsSlice.fetchGeneticsData).mockRejectedValueOnce('nope');
    await expect(fetchGeneticsData(ctx)).rejects.toBe('nope');
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith(expect.stringContaining('Unknown error'), 'error');
  });
});

describe('deleteSeedBatch', () => {
  let ctx: ReturnType<typeof makeContext>;
  beforeEach(() => { ctx = makeContext(); });

  it('calls slice.removeSeedBatch, toasts, and refreshes on success', async () => {
    await deleteSeedBatch(ctx, 'batch-1');

    expect(geneticsSlice.removeSeedBatch).toHaveBeenCalledWith('batch-1');
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith('Seed batch deleted', 'success');
    expect(ctx.refreshData).toHaveBeenCalled();
  });

  it('toasts error and rethrows', async () => {
    vi.mocked(geneticsSlice.removeSeedBatch).mockRejectedValueOnce(new Error('del-err'));
    await expect(deleteSeedBatch(ctx, 'batch-1')).rejects.toThrow('del-err');
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith(expect.stringContaining('del-err'), 'error');
  });

  it('uses "Unknown error" when thrown value is not an Error', async () => {
    vi.mocked(geneticsSlice.removeSeedBatch).mockRejectedValueOnce('del-err-raw');
    await expect(deleteSeedBatch(ctx, 'batch-1')).rejects.toBe('del-err-raw');
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith(expect.stringContaining('Unknown error'), 'error');
  });
});

describe('getLineageTree', () => {
  let ctx: ReturnType<typeof makeContext>;
  beforeEach(() => { ctx = makeContext(); });

  it('returns data from slice on success', async () => {
    const fakeTree = { name: 'Root' } as any;
    vi.mocked(geneticsSlice.getLineageTree).mockResolvedValueOnce(fakeTree);

    const result = await getLineageTree(ctx, 'plant-1');

    expect(geneticsSlice.getLineageTree).toHaveBeenCalledWith('plant-1');
    expect(result).toBe(fakeTree);
  });

  it('toasts error and rethrows on failure', async () => {
    vi.mocked(geneticsSlice.getLineageTree).mockRejectedValueOnce(new Error('tree-err'));
    await expect(getLineageTree(ctx, 'plant-1')).rejects.toThrow('tree-err');
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith(expect.stringContaining('tree-err'), 'error');
  });

  it('uses "Unknown error" when thrown value is not an Error', async () => {
    vi.mocked(geneticsSlice.getLineageTree).mockRejectedValueOnce('tree-err-raw');
    await expect(getLineageTree(ctx, 'plant-1')).rejects.toBe('tree-err-raw');
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith(expect.stringContaining('Unknown error'), 'error');
  });
});

describe('getStrainLineageTree', () => {
  let ctx: ReturnType<typeof makeContext>;
  beforeEach(() => { ctx = makeContext(); });

  it('returns data from slice on success', async () => {
    const fakeTree = { name: 'Strain' } as any;
    vi.mocked(geneticsSlice.getStrainLineageTree).mockResolvedValueOnce(fakeTree);

    const result = await getStrainLineageTree(ctx, 'OG Kush');

    expect(geneticsSlice.getStrainLineageTree).toHaveBeenCalledWith('OG Kush');
    expect(result).toBe(fakeTree);
  });

  it('toasts error and rethrows on failure', async () => {
    vi.mocked(geneticsSlice.getStrainLineageTree).mockRejectedValueOnce(new Error('strain-tree-err'));
    await expect(getStrainLineageTree(ctx, 'OG Kush')).rejects.toThrow('strain-tree-err');
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith(expect.stringContaining('strain-tree-err'), 'error');
  });

  it('uses "Unknown error" when thrown value is not an Error', async () => {
    vi.mocked(geneticsSlice.getStrainLineageTree).mockRejectedValueOnce('strain-tree-err-raw');
    await expect(getStrainLineageTree(ctx, 'OG Kush')).rejects.toBe('strain-tree-err-raw');
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith(expect.stringContaining('Unknown error'), 'error');
  });
});

describe('updateStrainLineageTree', () => {
  let ctx: ReturnType<typeof makeContext>;
  beforeEach(() => { ctx = makeContext(); });

  it('returns data from slice on success', async () => {
    const parents = [{ name: 'Parent', source: 'library' }] as any;
    const fakeResult = { lineage: 'json' };
    vi.mocked(geneticsSlice.updateStrainLineageTree).mockResolvedValueOnce(fakeResult as any);

    const result = await updateStrainLineageTree(ctx, 'OG Kush', parents);

    expect(geneticsSlice.updateStrainLineageTree).toHaveBeenCalledWith('OG Kush', parents);
    expect(result).toBe(fakeResult);
  });

  it('toasts error and rethrows on failure', async () => {
    vi.mocked(geneticsSlice.updateStrainLineageTree).mockRejectedValueOnce(new Error('upd-tree-err'));
    await expect(updateStrainLineageTree(ctx, 'OG Kush', [])).rejects.toThrow('upd-tree-err');
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith(expect.stringContaining('upd-tree-err'), 'error');
  });

  it('uses "Unknown error" when thrown value is not an Error', async () => {
    vi.mocked(geneticsSlice.updateStrainLineageTree).mockRejectedValueOnce('upd-tree-err-raw');
    await expect(updateStrainLineageTree(ctx, 'OG Kush', [])).rejects.toBe('upd-tree-err-raw');
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith(expect.stringContaining('Unknown error'), 'error');
  });
});
