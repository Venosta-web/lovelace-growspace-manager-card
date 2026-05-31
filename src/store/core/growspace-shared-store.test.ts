import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GrowspaceSharedStore } from './growspace-shared-store';

describe('GrowspaceSharedStore.addOnStale', () => {
  let store: GrowspaceSharedStore;

  beforeEach(() => {
    store = new GrowspaceSharedStore();
  });

  it('fires registered callback when a WS event arrives', async () => {
    const cb = vi.fn().mockResolvedValue(undefined);
    store.addOnStale(cb);

    (store as any)._handleEvent({});

    await Promise.resolve();
    expect(cb).toHaveBeenCalledOnce();
  });

  it('fires all registered callbacks when a WS event arrives', async () => {
    const cb1 = vi.fn().mockResolvedValue(undefined);
    const cb2 = vi.fn().mockResolvedValue(undefined);
    store.addOnStale(cb1);
    store.addOnStale(cb2);

    (store as any)._handleEvent({});

    await Promise.resolve();
    expect(cb1).toHaveBeenCalledOnce();
    expect(cb2).toHaveBeenCalledOnce();
  });

  it('does not fire callback after unsubscribe', async () => {
    const cb = vi.fn().mockResolvedValue(undefined);
    const unsub = store.addOnStale(cb);
    unsub();

    (store as any)._handleEvent({});

    await Promise.resolve();
    expect(cb).not.toHaveBeenCalled();
  });
});
