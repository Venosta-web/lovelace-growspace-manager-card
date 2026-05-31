import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fetchGrowReport, exportGrowReport } from './report-actions';
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
    grid: {} as any,
  } satisfies ActionContext;
}

describe('fetchGrowReport (read-only)', () => {
  it('returns dataService result without toasting', async () => {
    const ctx = makeContext();
    const fakeReport = { summary: 'great harvest' };
    (ctx.dataService as any).fetchGrowReport.mockResolvedValue(fakeReport);

    const result = await fetchGrowReport(ctx, 'gs-1');

    expect((ctx.dataService as any).fetchGrowReport).toHaveBeenCalledWith('gs-1');
    expect(result).toEqual(fakeReport);
    expect((ctx.ui as any).showToast).not.toHaveBeenCalled();
  });

  it('propagates errors without toasting', async () => {
    const ctx = makeContext();
    (ctx.dataService as any).fetchGrowReport.mockRejectedValue(new Error('not-found'));

    await expect(fetchGrowReport(ctx, 'gs-1')).rejects.toThrow('not-found');
    expect((ctx.ui as any).showToast).not.toHaveBeenCalled();
  });
});

describe('exportGrowReport', () => {
  let ctx: ReturnType<typeof makeContext>;

  beforeEach(() => {
    ctx = makeContext();
  });

  it('calls dataService and shows success toast', async () => {
    await exportGrowReport(ctx, 'gs-1', 'pdf');

    expect((ctx.dataService as any).exportGrowReport).toHaveBeenCalledWith('gs-1', 'pdf');
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith('Grow report exported', 'success');
  });

  it('shows error toast and rethrows on failure', async () => {
    (ctx.dataService as any).exportGrowReport.mockRejectedValue(new Error('export-err'));

    await expect(exportGrowReport(ctx, 'gs-1', 'csv')).rejects.toThrow('export-err');
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith(expect.stringContaining('export-err'), 'error');
  });

  it('shows generic toast and rethrows on non-Error failure', async () => {
    (ctx.dataService as any).exportGrowReport.mockRejectedValue('unknown-failure-string');

    await expect(exportGrowReport(ctx, 'gs-1', 'csv')).rejects.toBe('unknown-failure-string');
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith(expect.stringContaining('Unknown error'), 'error');
  });
});
