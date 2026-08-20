import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GrowspaceStoreRegistry } from '../../../../src/store/core/growspace-store-registry';
import type { GrowspaceSharedStore } from '../../../../src/store/core/growspace-shared-store';

function makeStoreStub(): GrowspaceSharedStore {
  return { destroy: vi.fn() } as unknown as GrowspaceSharedStore;
}

// Subclass that injects stub stores instead of real ones.
class TestRegistry extends GrowspaceStoreRegistry {
  readonly stubs: GrowspaceSharedStore[] = [];

  protected override createStore(): GrowspaceSharedStore {
    const s = makeStoreStub();
    this.stubs.push(s);
    return s;
  }
}

describe('GrowspaceStoreRegistry', () => {
  let registry: TestRegistry;

  beforeEach(() => {
    registry = new TestRegistry();
  });

  it('creates a new store on first acquire', () => {
    registry.acquire();
    expect(registry.stubs).toHaveLength(1);
  });

  it('returns the same store instance on repeated acquires', () => {
    const a = registry.acquire();
    const b = registry.acquire();
    expect(a).toBe(b);
  });

  it('does not construct a second store on the second acquire', () => {
    registry.acquire();
    registry.acquire();
    expect(registry.stubs).toHaveLength(1);
  });

  it('does not destroy the store while refs remain', () => {
    const store = registry.acquire();
    registry.acquire(); // refs = 2
    registry.release(); // refs = 1
    expect(store.destroy).not.toHaveBeenCalled();
  });

  it('destroys the store when the last ref is released', () => {
    const store = registry.acquire();
    registry.release();
    expect(store.destroy).toHaveBeenCalled();
  });

  it('nulls the entry after full release so acquire creates a fresh store', () => {
    registry.acquire();
    registry.release();
    registry.acquire();
    expect(registry.stubs).toHaveLength(2);
  });

  it('fresh store after full release is a different instance', () => {
    const first = registry.acquire();
    registry.release();
    const second = registry.acquire();
    expect(first).not.toBe(second);
  });

  it('release() is a no-op when nothing has been acquired', () => {
    expect(() => registry.release()).not.toThrow();
  });

  it('release() does not go negative — extra releases are no-ops', () => {
    const store = registry.acquire();
    registry.release(); // refs reach 0, store destroyed
    registry.release(); // entry is null, should not throw
    expect(store.destroy).toHaveBeenCalledOnce();
  });
});
