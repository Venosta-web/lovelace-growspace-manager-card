import { describe, it, expect } from 'vitest';
import { GrowspaceDataStore } from '../core/data-store';
import { GrowspaceGridStore } from '../grid/grid-store';
import type { ActionContext } from '../core/action-context';
import { handleDeviceChange } from './device-actions';

function makeContext(overrides: Partial<ActionContext> = {}): ActionContext {
  const data = new GrowspaceDataStore();
  const grid = new GrowspaceGridStore(data);

  return {
    data,
    grid,
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
