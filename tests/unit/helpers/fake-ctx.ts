/**
 * Shared test helper: creates a minimal fake ActionContext.
 *
 * All dataService methods returned are vi.fn() stubs that resolve by default.
 * Add extra stubs as needed in individual tests:
 *
 *   const ctx = makeFakeCtx();
 *   (ctx.dataService as any).someMethod.mockRejectedValue(new Error('boom'));
 *
 * The returned ctx.dataService is typed as `any` so callers can freely call
 * `.mockResolvedValue`, `.mockRejectedValue`, etc. without TS errors.
 *
 * ctx.showToast and ctx.ui.showToast reference the SAME mock so tests can
 * assert on either path interchangeably.
 */
import { vi } from 'vitest';
import type { ActionContext } from '../../../src/store/core/action-context';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FakeCtx = Omit<ActionContext, 'dataService'> & { dataService: any; showToast: ReturnType<typeof vi.fn> };

export function makeFakeCtx(): FakeCtx {
  const showToast = vi.fn();

  const dataService: Record<string, ReturnType<typeof vi.fn>> = new Proxy(
    {},
    {
      get(target, prop) {
        if (!(prop in target)) {
          (target as any)[prop] = vi.fn().mockResolvedValue(undefined);
        }
        return (target as any)[prop];
      },
    }
  );

  return {
    dataService: dataService as any,
    showToast,
    closeDialog: vi.fn(),
    refreshData: vi.fn().mockResolvedValue(undefined),
    undoRedoManager: { pushAction: vi.fn() } as any,
    optimisticManager: {
      applyOptimisticUpdate: vi.fn(),
      confirmUpdate: vi.fn(),
      rollbackUpdate: vi.fn(),
    } as any,
    ui: {
      showToast,
      deselectPlants: vi.fn(),
      $activeDialog: { get: vi.fn().mockReturnValue({ type: 'NONE' }) },
      $isEditMode: { get: vi.fn().mockReturnValue(false) },
      setEditMode: vi.fn(),
      clearPlantSelection: vi.fn(),
    } as any,
    data: {
      $devices: { get: vi.fn().mockReturnValue([]), set: vi.fn() },
      addOptimisticDeletedPlantId: vi.fn(),
      removeOptimisticDeletedPlantId: vi.fn(),
      updateWsDataCacheGrid: vi.fn(),
    } as any,
    grid: {
      $selectedDevice: { get: vi.fn() },
    } as any,
  } as any;
}
