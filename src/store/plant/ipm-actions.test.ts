import { describe, it, expect, vi, beforeEach } from 'vitest';
import { applyIPM } from './ipm-actions';
import { ActionContext } from '../core/action-context';
import * as libraryActions from './library-actions';
import { WSError } from '../../services/base-api';

// Mock library actions in the same directory to isolate unit tests
vi.mock('./library-actions', () => ({
  fetchNutrientInventory: vi.fn(),
  fetchIPMPresets: vi.fn(),
}));

describe('applyIPM', () => {
  let ctx: ActionContext;
  let mockDataService: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockDataService = {
      applyIPM: vi.fn().mockResolvedValue(undefined),
    };

    ctx = {
      dataService: mockDataService,
      data: {} as any,
      ui: {
        showToast: vi.fn(),
      } as any,
      grid: {} as any,
      undoRedoManager: {} as any,
      optimisticManager: {} as any,
      closeDialog: vi.fn(),
      refreshData: vi.fn(),
    } as unknown as ActionContext;
  });

  const detail = {
    preset_id: 'preset-1',
    growspace_id: 'grow-1',
    plant_ids: ['plant-1'],
    notes: 'test',
  };

  it('calls dataService.applyIPM and refreshes inventory on success', async () => {
    await applyIPM(ctx, detail);

    expect(mockDataService.applyIPM).toHaveBeenCalledWith(detail);
    expect(libraryActions.fetchNutrientInventory).toHaveBeenCalledWith(ctx, true);
    expect(ctx.ui.showToast).toHaveBeenCalledWith(
      'IPM treatment applied successfully',
      'success'
    );
  });

  it('shows error toast and rethrows when applyIPM fails with a standard Error', async () => {
    const error = new Error('service error');
    mockDataService.applyIPM.mockRejectedValue(error);

    await expect(applyIPM(ctx, detail)).rejects.toThrow('service error');

    expect(ctx.ui.showToast).toHaveBeenCalledWith(
      'Failed to apply IPM: service error',
      'error'
    );
    expect(libraryActions.fetchNutrientInventory).not.toHaveBeenCalled();
  });

  it('shows error toast and rethrows when applyIPM fails with a non-Error exception', async () => {
    mockDataService.applyIPM.mockRejectedValue('String error');

    await expect(applyIPM(ctx, detail)).rejects.toBe('String error');

    expect(ctx.ui.showToast).toHaveBeenCalledWith(
      'Failed to apply IPM: Unknown error',
      'error'
    );
    expect(libraryActions.fetchNutrientInventory).not.toHaveBeenCalled();
  });

  it('shows error toast and rethrows when applyIPM fails with a WSError (coordinator_not_ready)', async () => {
    const wsError = new WSError('coordinator_not_ready', 'Original Message');
    mockDataService.applyIPM.mockRejectedValue(wsError);

    await expect(applyIPM(ctx, detail)).rejects.toThrow(wsError);

    expect(ctx.ui.showToast).toHaveBeenCalledWith(
      'Failed to apply IPM: Integration not loaded — try reloading the page',
      'error'
    );
    expect(libraryActions.fetchNutrientInventory).not.toHaveBeenCalled();
  });

  it('shows error toast and rethrows when applyIPM fails with a WSError (validation_failed)', async () => {
    const wsError = new WSError('validation_failed', 'Original Message');
    mockDataService.applyIPM.mockRejectedValue(wsError);

    await expect(applyIPM(ctx, detail)).rejects.toThrow(wsError);

    expect(ctx.ui.showToast).toHaveBeenCalledWith(
      'Failed to apply IPM: Invalid input',
      'error'
    );
    expect(libraryActions.fetchNutrientInventory).not.toHaveBeenCalled();
  });

  it('shows error toast and rethrows when applyIPM fails with a WSError (entity_not_found)', async () => {
    const wsError = new WSError('entity_not_found', 'Original Message');
    mockDataService.applyIPM.mockRejectedValue(wsError);

    await expect(applyIPM(ctx, detail)).rejects.toThrow(wsError);

    expect(ctx.ui.showToast).toHaveBeenCalledWith(
      'Failed to apply IPM: Item not found — it may have been removed',
      'error'
    );
    expect(libraryActions.fetchNutrientInventory).not.toHaveBeenCalled();
  });

  it('shows error toast and rethrows when applyIPM fails with a WSError (internal_error)', async () => {
    const wsError = new WSError('internal_error', 'Original Message');
    mockDataService.applyIPM.mockRejectedValue(wsError);

    await expect(applyIPM(ctx, detail)).rejects.toThrow(wsError);

    expect(ctx.ui.showToast).toHaveBeenCalledWith(
      'Failed to apply IPM: Internal error',
      'error'
    );
    expect(libraryActions.fetchNutrientInventory).not.toHaveBeenCalled();
  });
});
