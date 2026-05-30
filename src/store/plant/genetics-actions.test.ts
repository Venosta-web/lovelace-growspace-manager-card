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

  it('calls dataService, toasts, and refreshes on success', async () => {
    await addSeedBatch(ctx, seedBatchData);

    expect((ctx.dataService as any).addSeedBatch).toHaveBeenCalledWith(seedBatchData);
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith('Seed batch added', 'success');
    expect(ctx.refreshData).toHaveBeenCalled();
  });

  it('toasts error and rethrows', async () => {
    (ctx.dataService as any).addSeedBatch.mockRejectedValue(new Error('add-err'));

    await expect(addSeedBatch(ctx, seedBatchData)).rejects.toThrow('add-err');
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith(expect.stringContaining('add-err'), 'error');
  });

  it('uses "Unknown error" when thrown value is not an Error', async () => {
    (ctx.dataService as any).addSeedBatch.mockRejectedValue('raw string');
    await expect(addSeedBatch(ctx, seedBatchData)).rejects.toBe('raw string');
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith(expect.stringContaining('Unknown error'), 'error');
  });
});

describe('updateSeedBatch', () => {
  let ctx: ReturnType<typeof makeContext>;
  beforeEach(() => { ctx = makeContext(); });

  it('calls dataService, toasts, and refreshes on success', async () => {
    const data = { batch_id: 'b1', quantity: 5 } as any;
    await updateSeedBatch(ctx, data);

    expect((ctx.dataService as any).updateSeedBatch).toHaveBeenCalledWith(data);
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith('Seed batch updated', 'success');
    expect(ctx.refreshData).toHaveBeenCalled();
  });

  it('toasts error and rethrows', async () => {
    (ctx.dataService as any).updateSeedBatch.mockRejectedValue(new Error('upd-err'));
    await expect(updateSeedBatch(ctx, { batch_id: 'b1' } as any)).rejects.toThrow('upd-err');
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith(expect.stringContaining('upd-err'), 'error');
  });

  it('uses "Unknown error" when thrown value is not an Error', async () => {
    (ctx.dataService as any).updateSeedBatch.mockRejectedValue(42);
    await expect(updateSeedBatch(ctx, { batch_id: 'b1' } as any)).rejects.toBe(42);
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith(expect.stringContaining('Unknown error'), 'error');
  });
});

describe('logPollination', () => {
  let ctx: ReturnType<typeof makeContext>;
  beforeEach(() => { ctx = makeContext(); });

  it('calls dataService, toasts, and refreshes on success', async () => {
    await logPollination(ctx, pollinationData);

    expect((ctx.dataService as any).logPollination).toHaveBeenCalledWith(pollinationData);
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith('Pollination event logged', 'success');
    expect(ctx.refreshData).toHaveBeenCalled();
  });

  it('toasts error and rethrows', async () => {
    (ctx.dataService as any).logPollination.mockRejectedValue(new Error('poll-err'));
    await expect(logPollination(ctx, pollinationData)).rejects.toThrow('poll-err');
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith(expect.stringContaining('poll-err'), 'error');
  });

  it('uses "Unknown error" when thrown value is not an Error', async () => {
    (ctx.dataService as any).logPollination.mockRejectedValue(null);
    await expect(logPollination(ctx, pollinationData)).rejects.toBeNull();
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith(expect.stringContaining('Unknown error'), 'error');
  });
});

describe('updatePollination', () => {
  let ctx: ReturnType<typeof makeContext>;
  beforeEach(() => { ctx = makeContext(); });

  it('calls dataService, toasts, and refreshes on success', async () => {
    const data = { event_id: 'ev-1', notes: 'great' } as any;
    await updatePollination(ctx, data);

    expect((ctx.dataService as any).updatePollination).toHaveBeenCalledWith(data);
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith('Pollination event updated', 'success');
    expect(ctx.refreshData).toHaveBeenCalled();
  });

  it('toasts error and rethrows', async () => {
    (ctx.dataService as any).updatePollination.mockRejectedValue(new Error('upd2-err'));
    await expect(updatePollination(ctx, { event_id: 'ev-1' } as any)).rejects.toThrow('upd2-err');
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith(expect.stringContaining('upd2-err'), 'error');
  });

  it('uses "Unknown error" when thrown value is not an Error', async () => {
    (ctx.dataService as any).updatePollination.mockRejectedValue('oops');
    await expect(updatePollination(ctx, { event_id: 'ev-1' } as any)).rejects.toBe('oops');
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith(expect.stringContaining('Unknown error'), 'error');
  });
});

describe('deletePollination', () => {
  let ctx: ReturnType<typeof makeContext>;
  beforeEach(() => { ctx = makeContext(); });

  it('calls dataService, toasts, and refreshes on success', async () => {
    await deletePollination(ctx, 'ev-1');

    expect((ctx.dataService as any).deletePollination).toHaveBeenCalledWith('ev-1');
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith('Pollination event deleted', 'success');
    expect(ctx.refreshData).toHaveBeenCalled();
  });

  it('toasts error and rethrows', async () => {
    (ctx.dataService as any).deletePollination.mockRejectedValue(new Error('del-err'));
    await expect(deletePollination(ctx, 'ev-1')).rejects.toThrow('del-err');
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith(expect.stringContaining('del-err'), 'error');
  });

  it('uses "Unknown error" when thrown value is not an Error', async () => {
    (ctx.dataService as any).deletePollination.mockRejectedValue({});
    await expect(deletePollination(ctx, 'ev-1')).rejects.toEqual({});
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith(expect.stringContaining('Unknown error'), 'error');
  });
});

describe('harvestSeeds', () => {
  let ctx: ReturnType<typeof makeContext>;
  beforeEach(() => { ctx = makeContext(); });

  it('calls dataService, toasts, and refreshes on success', async () => {
    const data = { pollination_event_id: 'ev-1', seed_count: 20 } as any;
    await harvestSeeds(ctx, data);

    expect((ctx.dataService as any).harvestSeeds).toHaveBeenCalledWith(data);
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith('Seeds harvested', 'success');
    expect(ctx.refreshData).toHaveBeenCalled();
  });

  it('toasts error and rethrows', async () => {
    (ctx.dataService as any).harvestSeeds.mockRejectedValue(new Error('harvest-err'));
    await expect(harvestSeeds(ctx, { pollination_event_id: 'ev-1' } as any)).rejects.toThrow('harvest-err');
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith(expect.stringContaining('harvest-err'), 'error');
  });

  it('uses "Unknown error" when thrown value is not an Error', async () => {
    (ctx.dataService as any).harvestSeeds.mockRejectedValue('bad');
    await expect(harvestSeeds(ctx, { pollination_event_id: 'ev-1' } as any)).rejects.toBe('bad');
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith(expect.stringContaining('Unknown error'), 'error');
  });
});

describe('fetchGeneticsData', () => {
  let ctx: ReturnType<typeof makeContext>;
  beforeEach(() => { ctx = makeContext(); });

  it('returns data from dataService on success', async () => {
    const fakeData = { seed_batches: [], pollination_events: [] };
    (ctx.dataService as any).fetchGeneticsData.mockResolvedValue(fakeData);

    const result = await fetchGeneticsData(ctx);

    expect((ctx.dataService as any).fetchGeneticsData).toHaveBeenCalled();
    expect(result).toBe(fakeData);
  });

  it('toasts error and rethrows on failure', async () => {
    (ctx.dataService as any).fetchGeneticsData.mockRejectedValue(new Error('fetch-err'));
    await expect(fetchGeneticsData(ctx)).rejects.toThrow('fetch-err');
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith(expect.stringContaining('fetch-err'), 'error');
  });

  it('uses "Unknown error" when thrown value is not an Error', async () => {
    (ctx.dataService as any).fetchGeneticsData.mockRejectedValue('nope');
    await expect(fetchGeneticsData(ctx)).rejects.toBe('nope');
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith(expect.stringContaining('Unknown error'), 'error');
  });
});

describe('deleteSeedBatch', () => {
  let ctx: ReturnType<typeof makeContext>;
  beforeEach(() => { ctx = makeContext(); });

  it('calls dataService, toasts, and refreshes on success', async () => {
    await deleteSeedBatch(ctx, 'batch-1');

    expect((ctx.dataService as any).deleteSeedBatch).toHaveBeenCalledWith('batch-1');
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith('Seed batch deleted', 'success');
    expect(ctx.refreshData).toHaveBeenCalled();
  });

  it('toasts error and rethrows', async () => {
    (ctx.dataService as any).deleteSeedBatch.mockRejectedValue(new Error('del-err'));
    await expect(deleteSeedBatch(ctx, 'batch-1')).rejects.toThrow('del-err');
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith(expect.stringContaining('del-err'), 'error');
  });

  it('uses "Unknown error" when thrown value is not an Error', async () => {
    (ctx.dataService as any).deleteSeedBatch.mockRejectedValue('del-err-raw');
    await expect(deleteSeedBatch(ctx, 'batch-1')).rejects.toBe('del-err-raw');
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith(expect.stringContaining('Unknown error'), 'error');
  });
});

describe('getLineageTree', () => {
  let ctx: ReturnType<typeof makeContext>;
  beforeEach(() => { ctx = makeContext(); });

  it('returns data from dataService on success', async () => {
    const fakeTree = { name: 'Root' } as any;
    (ctx.dataService as any).getLineageTree.mockResolvedValue(fakeTree);

    const result = await getLineageTree(ctx, 'plant-1');

    expect((ctx.dataService as any).getLineageTree).toHaveBeenCalledWith('plant-1');
    expect(result).toBe(fakeTree);
  });

  it('toasts error and rethrows on failure', async () => {
    (ctx.dataService as any).getLineageTree.mockRejectedValue(new Error('tree-err'));
    await expect(getLineageTree(ctx, 'plant-1')).rejects.toThrow('tree-err');
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith(expect.stringContaining('tree-err'), 'error');
  });

  it('uses "Unknown error" when thrown value is not an Error', async () => {
    (ctx.dataService as any).getLineageTree.mockRejectedValue('tree-err-raw');
    await expect(getLineageTree(ctx, 'plant-1')).rejects.toBe('tree-err-raw');
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith(expect.stringContaining('Unknown error'), 'error');
  });
});

describe('getStrainLineageTree', () => {
  let ctx: ReturnType<typeof makeContext>;
  beforeEach(() => { ctx = makeContext(); });

  it('returns data from dataService on success', async () => {
    const fakeTree = { name: 'Strain' } as any;
    (ctx.dataService as any).getStrainLineageTree.mockResolvedValue(fakeTree);

    const result = await getStrainLineageTree(ctx, 'OG Kush');

    expect((ctx.dataService as any).getStrainLineageTree).toHaveBeenCalledWith('OG Kush');
    expect(result).toBe(fakeTree);
  });

  it('toasts error and rethrows on failure', async () => {
    (ctx.dataService as any).getStrainLineageTree.mockRejectedValue(new Error('strain-tree-err'));
    await expect(getStrainLineageTree(ctx, 'OG Kush')).rejects.toThrow('strain-tree-err');
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith(expect.stringContaining('strain-tree-err'), 'error');
  });

  it('uses "Unknown error" when thrown value is not an Error', async () => {
    (ctx.dataService as any).getStrainLineageTree.mockRejectedValue('strain-tree-err-raw');
    await expect(getStrainLineageTree(ctx, 'OG Kush')).rejects.toBe('strain-tree-err-raw');
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith(expect.stringContaining('Unknown error'), 'error');
  });
});

describe('updateStrainLineageTree', () => {
  let ctx: ReturnType<typeof makeContext>;
  beforeEach(() => { ctx = makeContext(); });

  it('returns data from dataService on success', async () => {
    const parents = [{ name: 'Parent', source: 'library' }] as any;
    const fakeResult = { lineage: 'json' };
    (ctx.dataService as any).updateStrainLineageTree.mockResolvedValue(fakeResult);

    const result = await updateStrainLineageTree(ctx, 'OG Kush', parents);

    expect((ctx.dataService as any).updateStrainLineageTree).toHaveBeenCalledWith('OG Kush', parents);
    expect(result).toBe(fakeResult);
  });

  it('toasts error and rethrows on failure', async () => {
    (ctx.dataService as any).updateStrainLineageTree.mockRejectedValue(new Error('upd-tree-err'));
    await expect(updateStrainLineageTree(ctx, 'OG Kush', [])).rejects.toThrow('upd-tree-err');
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith(expect.stringContaining('upd-tree-err'), 'error');
  });

  it('uses "Unknown error" when thrown value is not an Error', async () => {
    (ctx.dataService as any).updateStrainLineageTree.mockRejectedValue('upd-tree-err-raw');
    await expect(updateStrainLineageTree(ctx, 'OG Kush', [])).rejects.toBe('upd-tree-err-raw');
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith(expect.stringContaining('Unknown error'), 'error');
  });
});
