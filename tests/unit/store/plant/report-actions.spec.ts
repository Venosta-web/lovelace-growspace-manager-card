import { describe, it, expect, beforeEach } from 'vitest';
import { fetchGrowReport, exportGrowReport } from '../../../../src/store/plant/report-actions';
import { makeFakeCtx } from '../../helpers/fake-ctx';

describe('fetchGrowReport (read-only)', () => {
  it('returns dataService result without toasting', async () => {
    const ctx = makeFakeCtx();
    const fakeReport = { summary: 'great harvest' };
    ctx.dataService.fetchGrowReport.mockResolvedValue(fakeReport);

    const result = await fetchGrowReport(ctx, 'gs-1');

    expect(ctx.dataService.fetchGrowReport).toHaveBeenCalledWith('gs-1');
    expect(result).toEqual(fakeReport);
    expect((ctx.ui as any).showToast).not.toHaveBeenCalled();
  });

  it('propagates errors without toasting', async () => {
    const ctx = makeFakeCtx();
    ctx.dataService.fetchGrowReport.mockRejectedValue(new Error('not-found'));

    await expect(fetchGrowReport(ctx, 'gs-1')).rejects.toThrow('not-found');
    expect((ctx.ui as any).showToast).not.toHaveBeenCalled();
  });
});

describe('exportGrowReport', () => {
  let ctx: ReturnType<typeof makeFakeCtx>;

  beforeEach(() => {
    ctx = makeFakeCtx();
  });

  it('calls dataService and shows success toast', async () => {
    await exportGrowReport(ctx, 'gs-1', 'pdf');

    expect(ctx.dataService.exportGrowReport).toHaveBeenCalledWith('gs-1', 'pdf');
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith('Grow report exported', 'success');
  });

  it('shows error toast and rethrows on failure', async () => {
    ctx.dataService.exportGrowReport.mockRejectedValue(new Error('export-err'));

    await expect(exportGrowReport(ctx, 'gs-1', 'csv')).rejects.toThrow('export-err');
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith(expect.stringContaining('export-err'), 'error');
  });
});
