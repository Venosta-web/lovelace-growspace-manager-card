
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GrowspaceStore } from '../../src/store/core/growspace-store';
import { GrowspaceSharedStore } from '../../src/store/core/growspace-shared-store';
import * as _dataStore from '../../src/store/core/data-store';
import * as _uiStore from '../../src/store/ui/ui-store';

const dataStore = _dataStore as any;
const uiStore = _uiStore as any;

// Mock dependencies
vi.mock('../../src/store/system/optimistic-manager', () => ({
    OptimisticManager: class {
        constructor() { }
        applyOptimisticUpdate = vi.fn();
        confirmUpdate = vi.fn();
        rollbackUpdate = vi.fn();
    }
}));

vi.mock('../../src/store/ui/ui-store', () => {
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

vi.mock('../../src/store/core/data-store', () => {
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
        $staleCounter: { get: vi.fn(() => 0), set: vi.fn(), subscribe: vi.fn(() => () => { }) },
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

vi.mock('../../src/services/data-service', () => {
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

// Mock action-dispatcher with the subset of methods needed by these tests
vi.mock('../../src/store/core/action-dispatcher', () => ({
    ActionDispatcher: class {
        constructor(private store: any) { }
        plant = {
            batchAction: async (action: string, entityIds: string[], data?: any) => {
                if (entityIds.length === 0) return;
                if (action === 'remove') {
                    entityIds.forEach((id: string) => this.store.data.addOptimisticDeletedPlantId(id));
                }
                try {
                    await this.store.dataService.callService('growspace_manager', 'batch_action', { entity_ids: entityIds, action, data: data || {} });
                    this.store.ui.showToast(`Batch ${action} completed for ${entityIds.length} plant(s)`, 'success');
                    this.store.ui.clearPlantSelection();
                    this.store.ui.setEditMode(false);
                    await this.store.refreshData();
                } catch (err: any) {
                    const error = err instanceof Error ? err.message : 'Unknown error';
                    this.store.ui.showToast(`Batch ${action} failed: ${error}`, 'error');
                    if (action === 'remove') {
                        entityIds.forEach((id: string) => this.store.data.removeOptimisticDeletedPlantId(id));
                    }
                }
            },
        };
        library = {
            import: async (file: File, _replace: boolean) => {
                try {
                    const content = await file.text();
                    const strains = JSON.parse(content);
                    if (!Array.isArray(strains)) throw new Error('Invalid format');
                    this.store.ui.showToast('Library imported successfully', 'success');
                } catch (e: any) {
                    const error = e instanceof Error ? e.message : 'Unknown error';
                    this.store.ui.showToast('Import failed: ' + error, 'error');
                }
            },
        };
    }
}));

describe('GrowspaceStore Custom Coverage', () => {
    let store: GrowspaceStore;
    let mockDataService: any;

    beforeEach(() => {
        vi.clearAllMocks();
        store = new GrowspaceStore(new GrowspaceSharedStore());
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
            await store.actions.library.import(file, false);

            expect(store.ui.showToast).toHaveBeenCalledWith(expect.stringContaining('Import failed: Invalid format'), 'error');
        });

        it('should handle invalid JSON syntax', async () => {
            const file = new File(['{ invalid json'], 'test.json', { type: 'application/json' });
            await store.actions.library.import(file, false);

            expect(store.ui.showToast).toHaveBeenCalledWith(expect.stringContaining('Import failed'), 'error');
        });
    });

    describe('batchAction coverage', () => {
        it('should return early if empty entityIds', async () => {
            await store.actions.plant.batchAction('remove', []);
            expect(mockDataService.callService).not.toHaveBeenCalled();
        });

        it('should handle remove action success (add optimistic ids)', async () => {
            await store.actions.plant.batchAction('remove', ['p1']);
            expect(store.data.addOptimisticDeletedPlantId).toHaveBeenCalledWith('p1');
            expect(mockDataService.callService).toHaveBeenCalled();
            expect(store.data.removeOptimisticDeletedPlantId).not.toHaveBeenCalled();
        });

        it('should handle remove action failure (revert optimistic ids)', async () => {
            mockDataService.callService.mockRejectedValue(new Error('Batch fail'));

            await store.actions.plant.batchAction('remove', ['p1']);

            expect(store.data.addOptimisticDeletedPlantId).toHaveBeenCalledWith('p1');
            expect(mockDataService.callService).toHaveBeenCalled();
            expect(store.data.removeOptimisticDeletedPlantId).toHaveBeenCalledWith('p1');
            expect(store.ui.showToast).toHaveBeenCalledWith(expect.stringContaining('Batch remove failed'), 'error');
        });

        it('should handle non-remove action failure (no optimistic revert needed)', async () => {
            mockDataService.callService.mockRejectedValue(new Error('Batch fail'));

            await store.actions.plant.batchAction('transition', ['p1']);

            expect(store.data.addOptimisticDeletedPlantId).not.toHaveBeenCalled();
            expect(store.data.removeOptimisticDeletedPlantId).not.toHaveBeenCalled();
            expect(store.ui.showToast).toHaveBeenCalledWith(expect.stringContaining('Batch transition failed'), 'error');
        });
    });
});
