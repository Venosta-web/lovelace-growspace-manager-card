import { describe, it, expect, beforeEach } from 'vitest';
import {
  addSeedBatch,
  updateSeedBatch,
  logPollination,
  updatePollination,
  deletePollination,
  harvestSeeds,
} from '../../../../src/store/plant/genetics-actions';
import { makeFakeCtx } from '../../helpers/fake-ctx';

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
  let ctx: ReturnType<typeof makeFakeCtx>;
  beforeEach(() => { ctx = makeFakeCtx(); });

  it('calls dataService, toasts, and refreshes on success', async () => {
    await addSeedBatch(ctx, seedBatchData);

    expect(ctx.dataService.addSeedBatch).toHaveBeenCalledWith(seedBatchData);
    expect(ctx.showToast).toHaveBeenCalledWith('Seed batch added', 'success');
    expect(ctx.refreshData).toHaveBeenCalled();
  });

  it('toasts error and rethrows', async () => {
    ctx.dataService.addSeedBatch.mockRejectedValue(new Error('add-err'));

    await expect(addSeedBatch(ctx, seedBatchData)).rejects.toThrow('add-err');
    expect(ctx.showToast).toHaveBeenCalledWith(expect.stringContaining('add-err'), 'error');
  });
});

describe('updateSeedBatch', () => {
  let ctx: ReturnType<typeof makeFakeCtx>;
  beforeEach(() => { ctx = makeFakeCtx(); });

  it('calls dataService, toasts, and refreshes on success', async () => {
    const data = { batch_id: 'b1', quantity: 5 } as any;
    await updateSeedBatch(ctx, data);

    expect(ctx.dataService.updateSeedBatch).toHaveBeenCalledWith(data);
    expect(ctx.showToast).toHaveBeenCalledWith('Seed batch updated', 'success');
    expect(ctx.refreshData).toHaveBeenCalled();
  });

  it('toasts error and rethrows', async () => {
    ctx.dataService.updateSeedBatch.mockRejectedValue(new Error('upd-err'));
    await expect(updateSeedBatch(ctx, { batch_id: 'b1' } as any)).rejects.toThrow('upd-err');
    expect(ctx.showToast).toHaveBeenCalledWith(expect.stringContaining('upd-err'), 'error');
  });
});

describe('logPollination', () => {
  let ctx: ReturnType<typeof makeFakeCtx>;
  beforeEach(() => { ctx = makeFakeCtx(); });

  it('calls dataService, toasts, and refreshes on success', async () => {
    await logPollination(ctx, pollinationData);

    expect(ctx.dataService.logPollination).toHaveBeenCalledWith(pollinationData);
    expect(ctx.showToast).toHaveBeenCalledWith('Pollination event logged', 'success');
    expect(ctx.refreshData).toHaveBeenCalled();
  });

  it('toasts error and rethrows', async () => {
    ctx.dataService.logPollination.mockRejectedValue(new Error('poll-err'));
    await expect(logPollination(ctx, pollinationData)).rejects.toThrow('poll-err');
    expect(ctx.showToast).toHaveBeenCalledWith(expect.stringContaining('poll-err'), 'error');
  });
});

describe('updatePollination', () => {
  let ctx: ReturnType<typeof makeFakeCtx>;
  beforeEach(() => { ctx = makeFakeCtx(); });

  it('calls dataService, toasts, and refreshes on success', async () => {
    const data = { event_id: 'ev-1', notes: 'great' } as any;
    await updatePollination(ctx, data);

    expect(ctx.dataService.updatePollination).toHaveBeenCalledWith(data);
    expect(ctx.showToast).toHaveBeenCalledWith('Pollination event updated', 'success');
    expect(ctx.refreshData).toHaveBeenCalled();
  });

  it('toasts error and rethrows', async () => {
    ctx.dataService.updatePollination.mockRejectedValue(new Error('upd2-err'));
    await expect(updatePollination(ctx, { event_id: 'ev-1' } as any)).rejects.toThrow('upd2-err');
    expect(ctx.showToast).toHaveBeenCalledWith(expect.stringContaining('upd2-err'), 'error');
  });
});

describe('deletePollination', () => {
  let ctx: ReturnType<typeof makeFakeCtx>;
  beforeEach(() => { ctx = makeFakeCtx(); });

  it('calls dataService, toasts, and refreshes on success', async () => {
    await deletePollination(ctx, 'ev-1');

    expect(ctx.dataService.deletePollination).toHaveBeenCalledWith('ev-1');
    expect(ctx.showToast).toHaveBeenCalledWith('Pollination event deleted', 'success');
    expect(ctx.refreshData).toHaveBeenCalled();
  });

  it('toasts error and rethrows', async () => {
    ctx.dataService.deletePollination.mockRejectedValue(new Error('del-err'));
    await expect(deletePollination(ctx, 'ev-1')).rejects.toThrow('del-err');
    expect(ctx.showToast).toHaveBeenCalledWith(expect.stringContaining('del-err'), 'error');
  });
});

describe('harvestSeeds', () => {
  let ctx: ReturnType<typeof makeFakeCtx>;
  beforeEach(() => { ctx = makeFakeCtx(); });

  it('calls dataService, toasts, and refreshes on success', async () => {
    const data = { pollination_event_id: 'ev-1', seed_count: 20 } as any;
    await harvestSeeds(ctx, data);

    expect(ctx.dataService.harvestSeeds).toHaveBeenCalledWith(data);
    expect(ctx.showToast).toHaveBeenCalledWith('Seeds harvested', 'success');
    expect(ctx.refreshData).toHaveBeenCalled();
  });

  it('toasts error and rethrows', async () => {
    ctx.dataService.harvestSeeds.mockRejectedValue(new Error('harvest-err'));
    await expect(harvestSeeds(ctx, { pollination_event_id: 'ev-1' } as any)).rejects.toThrow('harvest-err');
    expect(ctx.showToast).toHaveBeenCalledWith(expect.stringContaining('harvest-err'), 'error');
  });
});
