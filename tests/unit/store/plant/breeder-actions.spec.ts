import { describe, it, expect, beforeEach, vi } from 'vitest';
import { updateBreeder, deleteBreeder } from '../../../../src/store/plant/breeder-actions';
import { makeFakeCtx } from '../../helpers/fake-ctx';

describe('updateBreeder', () => {
  let ctx: ReturnType<typeof makeFakeCtx>;

  beforeEach(() => {
    ctx = makeFakeCtx();
    ctx.dataService.strainAPI = {
      updateBreeder: vi.fn().mockResolvedValue(undefined),
      deleteBreeder: vi.fn().mockResolvedValue(undefined),
    };
  });

  it('calls strainAPI, toasts success, and refreshes', async () => {
    await updateBreeder(ctx, 'OldName', 'NewName', 'logo.png');

    expect(ctx.dataService.strainAPI.updateBreeder).toHaveBeenCalledWith('OldName', 'NewName', 'logo.png');
    expect(ctx.showToast).toHaveBeenCalledWith('Breeder updated successfully!', 'success');
    expect(ctx.refreshData).toHaveBeenCalled();
  });

  it('shows error toast and rethrows on failure', async () => {
    ctx.dataService.strainAPI.updateBreeder.mockRejectedValue(new Error('update-err'));

    await expect(updateBreeder(ctx, 'OldName', 'NewName')).rejects.toThrow('update-err');
    expect(ctx.showToast).toHaveBeenCalledWith('Failed to update breeder', 'error');
    expect(ctx.refreshData).not.toHaveBeenCalled();
  });
});

describe('deleteBreeder', () => {
  let ctx: ReturnType<typeof makeFakeCtx>;

  beforeEach(() => {
    ctx = makeFakeCtx();
    ctx.dataService.strainAPI = {
      updateBreeder: vi.fn().mockResolvedValue(undefined),
      deleteBreeder: vi.fn().mockResolvedValue(undefined),
    };
  });

  it('calls strainAPI, toasts success, and refreshes', async () => {
    await deleteBreeder(ctx, 'BreederX');

    expect(ctx.dataService.strainAPI.deleteBreeder).toHaveBeenCalledWith('BreederX');
    expect(ctx.showToast).toHaveBeenCalledWith('Breeder deleted successfully!', 'success');
    expect(ctx.refreshData).toHaveBeenCalled();
  });

  it('shows error toast and rethrows on failure', async () => {
    ctx.dataService.strainAPI.deleteBreeder.mockRejectedValue(new Error('delete-err'));

    await expect(deleteBreeder(ctx, 'BreederX')).rejects.toThrow('delete-err');
    expect(ctx.showToast).toHaveBeenCalledWith('Failed to delete breeder', 'error');
  });
});
