
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GrowspaceStore } from '../../src/store/growspace-store';
import * as _dataStore from '../../src/store/data-store';
import * as _uiStore from '../../src/store/ui-store';

const dataStore = _dataStore as any;
const uiStore = _uiStore as any;

// Mock dependencies
vi.mock('../../src/store/optimistic-manager', () => ({
    OptimisticManager: class {
        constructor() { }
        applyOptimisticUpdate = vi.fn();
        confirmUpdate = vi.fn();
        rollbackUpdate = vi.fn();
    }
}));

vi.mock('../../src/store/ui-store', () => {
    const atoms = {
        $activeDialog: { get: vi.fn(), set: vi.fn() },
        $focusedPlantIndex: { get: vi.fn() },
        $selectedPlants: { get: vi.fn(() => new Set()) },
        $isEditMode: { get: vi.fn(), set: vi.fn() },
        $viewMode: { get: vi.fn() },
        $defaultApplied: { get: vi.fn(), set: vi.fn() },
        $isLoading: { get: vi.fn(), set: vi.fn() },
        $notification: { set: vi.fn() },
        $menuOpen: { get: vi.fn(), set: vi.fn() }
    };
    return {
        ...atoms,
        GrowspaceUIStore: class {
            constructor() { Object.assign(this, atoms); }
            closeDialog = vi.fn();
            showToast = vi.fn();
            clearPlantSelection = vi.fn();
            setEditMode = vi.fn();
        }
    };
});

vi.mock('../../src/store/data-store', () => {
    const atoms = {
        $devices: { get: vi.fn(() => []), subscribe: vi.fn() },
        $selectedDevice: { get: vi.fn(), subscribe: vi.fn() },
        $strainLibrary: { get: vi.fn(() => []), subscribe: vi.fn() },
        $config: { get: vi.fn(() => ({})), subscribe: vi.fn() },
        $optimisticDeletedPlantIds: { get: vi.fn(() => new Set()), subscribe: vi.fn() },
        $wsDataCache: { get: vi.fn(() => ({})), subscribe: vi.fn() },
        $plantToDeviceMap: { get: vi.fn(() => new Map()), subscribe: vi.fn() },
        $nutrientPresets: { get: vi.fn(() => ({})), subscribe: vi.fn() },
        $ipmPresets: { get: vi.fn(() => ({})), subscribe: vi.fn() },
        $nutrientInventory: { get: vi.fn(() => []), subscribe: vi.fn() },
    };
    return {
        ...atoms,
        GrowspaceDataStore: class {
            constructor() { Object.assign(this, atoms); }
            addOptimisticDeletedPlantId = vi.fn();
            removeOptimisticDeletedPlantId = vi.fn();
        }
    }
});

vi.mock('../../src/data-service', () => {
    return {
        DataService: class {
            callService = vi.fn().mockResolvedValue({});
            addStrain = vi.fn().mockResolvedValue({});
            fetchStrainLibrary = vi.fn();
            updateHass = vi.fn();
            fetchGrowspaceData = vi.fn().mockResolvedValue({});
        }
    };
});

// Mock action-dispatcher to avoid circular deps if any
vi.mock('../../src/store/action-dispatcher', () => ({
    ActionDispatcher: class { }
}));

describe('GrowspaceStore Custom Coverage', () => {
    let store: GrowspaceStore;
    let mockDataService: any;

    beforeEach(() => {
        vi.clearAllMocks();
        store = new GrowspaceStore();
        mockDataService = store.dataService;
    });

    describe('_pruneOptimisticDeletions coverage', () => {
        it('should return early if no optimistic ids', () => {
            (dataStore.$optimisticDeletedPlantIds.get as any).mockReturnValue(new Set());
            // Access private method
            (store as any)._pruneOptimisticDeletions();
            expect(dataStore.$devices.get).not.toHaveBeenCalled();
        });

        it('should remove optimistic ID if plant is confirmed missing (correctly deleted)', () => {
            (dataStore.$optimisticDeletedPlantIds.get as any).mockReturnValue(new Set(['p1']));
            (dataStore.$devices.get as any).mockReturnValue([]); // No plants, so p1 is indeed gone

            (store as any)._pruneOptimisticDeletions();
            expect(store.data.removeOptimisticDeletedPlantId).toHaveBeenCalledWith('p1');
        });

        it('should NOT remove optimistic ID if plant Reappears (deletion failed/reverted)', () => {
            (dataStore.$optimisticDeletedPlantIds.get as any).mockReturnValue(new Set(['p1']));
            (dataStore.$devices.get as any).mockReturnValue([
                { plants: [{ attributes: { plant_id: 'p1' } }] }
            ]);

            (store as any)._pruneOptimisticDeletions();
            expect(store.data.removeOptimisticDeletedPlantId).not.toHaveBeenCalled();
        });
    });

    describe('updateGrid coverage', () => {
        it('should handle missing hass', () => {
            store.hass = undefined as any;
            store.updateGrid();
            expect(mockDataService.updateHass).not.toHaveBeenCalled();
            expect(mockDataService.fetchGrowspaceData).not.toHaveBeenCalled();
        });
    });

    describe('performImport coverage', () => {
        it('should handle valid JSON that is NOT an array', async () => {
            const file = new File(['{"not": "array"}'], 'test.json', { type: 'application/json' });
            await store.performImport(file, false);

            expect(store.ui.showToast).toHaveBeenCalledWith(expect.stringContaining('Import failed: Invalid format'), 'error', undefined);
        });

        it('should handle invalid JSON syntax', async () => {
            const file = new File(['{ invalid json'], 'test.json', { type: 'application/json' });
            await store.performImport(file, false);

            expect(store.ui.showToast).toHaveBeenCalledWith(expect.stringContaining('Import failed'), 'error', undefined);
        });
    });

    describe('batchAction coverage', () => {
        it('should return early if empty entityIds', async () => {
            await store.batchAction('remove', []);
            expect(mockDataService.callService).not.toHaveBeenCalled();
        });

        it('should handle remove action success (add optimistic ids)', async () => {
            await store.batchAction('remove', ['p1']);
            expect(store.data.addOptimisticDeletedPlantId).toHaveBeenCalledWith('p1');
            expect(mockDataService.callService).toHaveBeenCalled();
            expect(store.data.removeOptimisticDeletedPlantId).not.toHaveBeenCalled();
        });

        it('should handle remove action failure (revert optimistic ids)', async () => {
            mockDataService.callService.mockRejectedValue(new Error('Batch fail'));

            await store.batchAction('remove', ['p1']);

            expect(store.data.addOptimisticDeletedPlantId).toHaveBeenCalledWith('p1');
            expect(mockDataService.callService).toHaveBeenCalled();
            expect(store.data.removeOptimisticDeletedPlantId).toHaveBeenCalledWith('p1');
            expect(store.ui.showToast).toHaveBeenCalledWith(expect.stringContaining('Batch remove failed'), 'error', undefined);
        });

        it('should handle non-remove action failure (no optimistic revert needed)', async () => {
            mockDataService.callService.mockRejectedValue(new Error('Batch fail'));

            await store.batchAction('transition', ['p1']);

            expect(store.data.addOptimisticDeletedPlantId).not.toHaveBeenCalled();
            expect(store.data.removeOptimisticDeletedPlantId).not.toHaveBeenCalled();
            expect(store.ui.showToast).toHaveBeenCalledWith(expect.stringContaining('Batch transition failed'), 'error', undefined);
        });
    });
});
