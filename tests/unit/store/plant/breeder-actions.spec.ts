import { describe, it, expect, beforeEach, vi } from 'vitest';
import { updateBreeder, deleteBreeder } from '../../../../src/store/plant/breeder-actions';
import { makeFakeCtx } from '../../helpers/fake-ctx';

describe('updateBreeder', () => {
  let ctx: ReturnType<typeof makeFakeCtx>;

  beforeEach(() => {
    ctx = makeFakeCtx();
    ctx.dataService.updateBreeder = vi.fn().mockResolvedValue(undefined);
  });

  it('calls dataService.updateBreeder, toasts success, and refreshes', async () => {
    await updateBreeder(ctx, 'OldName', 'NewName', 'logo.png');

    expect(ctx.dataService.updateBreeder).toHaveBeenCalledWith('OldName', 'NewName', 'logo.png');
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith('Breeder updated successfully!', 'success');
    expect(ctx.refreshData).toHaveBeenCalled();
  });

  it('shows error toast and rethrows on failure', async () => {
    (ctx.dataService.updateBreeder as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('update-err'));

    await expect(updateBreeder(ctx, 'OldName', 'NewName')).rejects.toThrow('update-err');
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith('Failed to update breeder', 'error');
    expect(ctx.refreshData).not.toHaveBeenCalled();
  });
});

describe('deleteBreeder', () => {
  let ctx: ReturnType<typeof makeFakeCtx>;

  beforeEach(() => {
    ctx = makeFakeCtx();
    ctx.dataService.deleteBreeder = vi.fn().mockResolvedValue(undefined);
  });

  it('calls dataService.deleteBreeder, toasts success, and refreshes', async () => {
    await deleteBreeder(ctx, 'BreederX');

    expect(ctx.dataService.deleteBreeder).toHaveBeenCalledWith('BreederX');
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith('Breeder deleted successfully!', 'success');
    expect(ctx.refreshData).toHaveBeenCalled();
  });

  it('shows error toast and rethrows on failure', async () => {
    (ctx.dataService.deleteBreeder as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('delete-err'));

    await expect(deleteBreeder(ctx, 'BreederX')).rejects.toThrow('delete-err');
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith('Failed to delete breeder', 'error');
  });
});
