import { describe, it, expect, beforeEach } from 'vitest';
import { saveHarvestMetrics, scorePhenotype } from '../../../../src/store/plant/plant-actions';
import { makeFakeCtx } from '../../helpers/fake-ctx';

describe('saveHarvestMetrics', () => {
  let ctx: ReturnType<typeof makeFakeCtx>;

  beforeEach(() => {
    ctx = makeFakeCtx();
  });

  it('calls dataService, shows success toast, and refreshes', async () => {
    await saveHarvestMetrics(ctx, 'plant-1', { wet_weight: 120, dry_weight: 28 });

    expect(ctx.dataService.updateHarvestMetrics).toHaveBeenCalledWith({
      plant_id: 'plant-1',
      wet_weight: 120,
      dry_weight: 28,
    });
    expect(ctx.showToast).toHaveBeenCalledWith(
      expect.stringContaining('Harvest metrics saved'),
      'success'
    );
    expect(ctx.refreshData).toHaveBeenCalled();
  });

  it('shows error toast and rethrows on failure', async () => {
    ctx.dataService.updateHarvestMetrics.mockRejectedValue(new Error('boom'));

    await expect(saveHarvestMetrics(ctx, 'p', { wet_weight: 10 })).rejects.toThrow('boom');

    expect(ctx.showToast).toHaveBeenCalledWith(expect.stringContaining('boom'), 'error');
    expect(ctx.refreshData).not.toHaveBeenCalled();
  });

  it('skips dataService call when metrics object is empty', async () => {
    await saveHarvestMetrics(ctx, 'p', {});

    expect(ctx.dataService.updateHarvestMetrics).not.toHaveBeenCalled();
    expect(ctx.showToast).not.toHaveBeenCalled();
    expect(ctx.refreshData).not.toHaveBeenCalled();
  });
});

describe('scorePhenotype', () => {
  let ctx: ReturnType<typeof makeFakeCtx>;

  beforeEach(() => {
    ctx = makeFakeCtx();
  });

  it('calls dataService, toasts success, and refreshes', async () => {
    await scorePhenotype(ctx, 'p', { vigor: 4, aroma: 5 });

    expect(ctx.dataService.scorePlant).toHaveBeenCalledWith({
      plant_id: 'p',
      vigor: 4,
      aroma: 5,
    });
    expect(ctx.showToast).toHaveBeenCalledWith(expect.stringContaining('Scores saved'), 'success');
    expect(ctx.refreshData).toHaveBeenCalled();
  });

  it('no-ops when all scores are null', async () => {
    await scorePhenotype(ctx, 'p', { vigor: null, aroma: null });

    expect(ctx.dataService.scorePlant).not.toHaveBeenCalled();
    expect(ctx.showToast).not.toHaveBeenCalled();
    expect(ctx.refreshData).not.toHaveBeenCalled();
  });

  it('no-ops when scores object is empty', async () => {
    await scorePhenotype(ctx, 'p', {});

    expect(ctx.dataService.scorePlant).not.toHaveBeenCalled();
  });

  it('shows error toast and rethrows on failure', async () => {
    ctx.dataService.scorePlant.mockRejectedValue(new Error('score boom'));

    await expect(scorePhenotype(ctx, 'p', { vigor: 3 })).rejects.toThrow('score boom');

    expect(ctx.showToast).toHaveBeenCalledWith(expect.stringContaining('score boom'), 'error');
    expect(ctx.refreshData).not.toHaveBeenCalled();
  });

  it('calls with only non-null scores mixed in', async () => {
    await scorePhenotype(ctx, 'p', { vigor: 4, aroma: null, structure: 3 });

    // Should call despite some null values — hasValue = true because vigor=4, structure=3
    expect(ctx.dataService.scorePlant).toHaveBeenCalledWith({
      plant_id: 'p',
      vigor: 4,
      aroma: null,
      structure: 3,
    });
  });
});
