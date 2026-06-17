import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GrowspaceStore } from './growspace-store';
import { GrowspaceSharedStore } from './growspace-shared-store';
import { DATA_STALE_EVENT } from '../../features/shared/events';

describe('GrowspaceStore stale wiring', () => {
  let shared: GrowspaceSharedStore;
  let store: GrowspaceStore;

  beforeEach(() => {
    shared = new GrowspaceSharedStore();
    store = new GrowspaceStore(shared);
  });

  it('calls refreshCallback then emits data:stale on eventBus when WS event arrives', async () => {
    const refreshCb = vi.fn().mockResolvedValue(undefined);
    store.setRefreshCallback(refreshCb);
    const emitSpy = vi.spyOn(store.eventBus, 'emit');

    (shared as any)._handleEvent({});
    await Promise.resolve();
    await Promise.resolve();

    expect(refreshCb).toHaveBeenCalledOnce();
    expect(emitSpy).toHaveBeenCalledWith(DATA_STALE_EVENT, undefined);
    expect(refreshCb.mock.invocationCallOrder[0]).toBeLessThan(
      emitSpy.mock.invocationCallOrder[0]
    );
  });
});
