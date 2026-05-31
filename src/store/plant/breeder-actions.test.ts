import { describe, it, expect, beforeEach, vi } from 'vitest';
import { updateBreeder, deleteBreeder } from './breeder-actions';
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

describe('updateBreeder', () => {
  let ctx: ReturnType<typeof makeContext>;

  beforeEach(() => {
    ctx = makeContext();
  });

  it('calls dataService.updateBreeder, toasts success, and refreshes', async () => {
    await updateBreeder(ctx, 'OldName', 'NewName', 'logo.png');

    expect((ctx.dataService as any).updateBreeder).toHaveBeenCalledWith('OldName', 'NewName', 'logo.png');
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith('Breeder updated successfully!', 'success');
    expect(ctx.refreshData).toHaveBeenCalled();
  });

  it('shows error toast and rethrows on failure', async () => {
    (ctx.dataService as any).updateBreeder.mockRejectedValue(new Error('update-err'));

    await expect(updateBreeder(ctx, 'OldName', 'NewName')).rejects.toThrow('update-err');
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith('Failed to update breeder: update-err', 'error');
    expect(ctx.refreshData).not.toHaveBeenCalled();
  });
});

describe('deleteBreeder', () => {
  let ctx: ReturnType<typeof makeContext>;

  beforeEach(() => {
    ctx = makeContext();
  });

  it('calls dataService.deleteBreeder, toasts success, and refreshes', async () => {
    await deleteBreeder(ctx, 'BreederX');

    expect((ctx.dataService as any).deleteBreeder).toHaveBeenCalledWith('BreederX');
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith('Breeder deleted successfully!', 'success');
    expect(ctx.refreshData).toHaveBeenCalled();
  });

  it('shows error toast and rethrows on failure', async () => {
    (ctx.dataService as any).deleteBreeder.mockRejectedValue(new Error('delete-err'));

    await expect(deleteBreeder(ctx, 'BreederX')).rejects.toThrow('delete-err');
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith('Failed to delete breeder: delete-err', 'error');
  });
});
