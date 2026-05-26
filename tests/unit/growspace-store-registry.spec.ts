import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockDestroy = vi.fn();

vi.mock('../../src/store/core/growspace-shared-store', () => ({
    GrowspaceSharedStore: class {
        destroy = mockDestroy;
    },
}));

// Import after mock so the module picks up the mock
const { growspaceStoreRegistry } = await import('../../src/store/core/growspace-store-registry');

describe('GrowspaceStoreRegistry', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset registry to a clean state between tests by releasing any held refs
        const entry = (growspaceStoreRegistry as any)._entry;
        if (entry) {
            entry.refs = 1;
            growspaceStoreRegistry.release();
        }
    });

    it('creates a new shared store on first acquire', () => {
        const store = growspaceStoreRegistry.acquire();
        expect(store).toBeDefined();
        expect(store.destroy).toBeDefined();
    });

    it('returns the same store instance on subsequent acquires', () => {
        const store1 = growspaceStoreRegistry.acquire();
        const store2 = growspaceStoreRegistry.acquire();
        expect(store1).toBe(store2);
        // cleanup
        growspaceStoreRegistry.release();
        growspaceStoreRegistry.release();
    });

    it('does not destroy the store when refs > 0 after release', () => {
        growspaceStoreRegistry.acquire();
        growspaceStoreRegistry.acquire();
        growspaceStoreRegistry.release();
        expect(mockDestroy).not.toHaveBeenCalled();
        growspaceStoreRegistry.release();
    });

    it('destroys the store when all refs are released', () => {
        growspaceStoreRegistry.acquire();
        growspaceStoreRegistry.release();
        expect(mockDestroy).toHaveBeenCalledTimes(1);
    });

    it('creates a fresh store after all refs are released and acquire is called again', () => {
        const store1 = growspaceStoreRegistry.acquire();
        growspaceStoreRegistry.release();

        const store2 = growspaceStoreRegistry.acquire();
        expect(store2).not.toBe(store1);
        growspaceStoreRegistry.release();
    });

    it('release is a no-op when there is no active entry', () => {
        expect(() => growspaceStoreRegistry.release()).not.toThrow();
        expect(mockDestroy).not.toHaveBeenCalled();
    });
});
