import { describe, it, expect, beforeEach } from 'vitest';
import { gridSlice, setSelectedDeviceId } from '../../slices/grid';
import type { ActionContext } from '../core/action-context';
import { handleDeviceChange } from './device-actions';

function makeContext(overrides: Partial<ActionContext> = {}): ActionContext {
  return {
    grid: gridSlice,
    dataService: {} as ActionContext['dataService'],
    ui: {} as ActionContext['ui'],
    undoRedoManager: {} as ActionContext['undoRedoManager'],
    optimisticManager: {} as ActionContext['optimisticManager'],
    closeDialog: () => {},
    refreshData: async () => {},
    ...overrides,
  } satisfies ActionContext;
}

describe('handleDeviceChange', () => {
  beforeEach(() => {
    setSelectedDeviceId(null);
  });

  it('sets the selected device on the grid', () => {
    const ctx = makeContext();

    handleDeviceChange(ctx, 'gs1');

    expect(ctx.grid.$selectedDevice.get()).toBe('gs1');
  });

  it('replaces a previously selected device', () => {
    const ctx = makeContext();
    handleDeviceChange(ctx, 'gs1');

    handleDeviceChange(ctx, 'gs2');

    expect(ctx.grid.$selectedDevice.get()).toBe('gs2');
  });
});
