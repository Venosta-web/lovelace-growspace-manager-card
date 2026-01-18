import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GrowspaceStore } from '../../src/store/growspace-store';
import { GrowspaceDevice, PlantEntity } from '../../src/types';

// Mock dependencies
const mockShowToast = vi.fn();
const mockCloseDialog = vi.fn();
const mockSetActiveDialog = vi.fn();
const mockSetIsLoading = vi.fn();

const mockDataServiceInstance = {
    updateHass: vi.fn(),
    fetchGrowspaceData: vi.fn().mockResolvedValue({}),
    getGrowspaceDevices: vi.fn().mockReturnValue([]),
};

vi.mock('../../src/data-service', () => {
    return {
        DataService: class {
            constructor() {
                return mockDataServiceInstance;
            }
        }
    };
});

// Helper to create mock plant
const createMockPlant = (id: string, stage: string, growspaceId: string) => ({
    entity_id: `sensor.plant_${id}`,
    state: 'ok',
    attributes: {
        plant_id: id,
        stage: stage,
        strain: 'Test Strain',
        phenotype: 'Test Pheno',
        days_in_stage: 10,
        growspace_id: growspaceId
    },
    last_changed: '2023-01-01',
    last_updated: '2023-01-01',
    context: { id: '1', parent_id: null, user_id: null }
} as PlantEntity);

describe('Batch Actions', () => {
    let store: GrowspaceStore;
    let mockDevices: GrowspaceDevice[];

    beforeEach(() => {
        vi.clearAllMocks();
        store = new GrowspaceStore();

        // Mock UI store methods
        store.ui.showToast = mockShowToast;
        store.ui.closeDialog = mockCloseDialog;
        store.ui.setActiveDialog = mockSetActiveDialog;
        store.ui.setIsLoading = mockSetIsLoading;

        // Setup mock data
        const plant1 = createMockPlant('p1', 'veg', 'gs1');
        const plant2 = createMockPlant('p2', 'veg', 'gs1');
        const plant3 = createMockPlant('p3', 'flower', 'gs2');

        mockDevices = [
            {
                deviceId: 'gs1',
                name: 'Growspace 1',
                plants: [plant1, plant2],
                sensors: [],
                temp_sensor: 'sensor.temp',
                humiditySensor: 'sensor.hum',
                rows: 2,
                plantsPerRow: 2
            },
            {
                deviceId: 'gs2',
                name: 'Growspace 2',
                plants: [plant3],
                sensors: [],
                temp_sensor: 'sensor.temp',
                humiditySensor: 'sensor.hum',
                rows: 2,
                plantsPerRow: 2
            }
        ] as any;

        store.data.setDevices(mockDevices);
    });

    it('should open batch watering dialog for plants in same growspace', () => {
        // Select p1 and p2 (both in gs1)
        store.ui.togglePlantSelection('p1');
        store.ui.togglePlantSelection('p2');

        store.openBatchWateringDialog();

        expect(mockSetActiveDialog).toHaveBeenCalledWith({
            type: 'WATERING',
            payload: {
                mode: 'plant',
                plantIds: ['p1', 'p2'],
                growspaceId: 'gs1'
            }
        });
    });

    it('should open batch watering dialog with no growspace context for mixed growspaces', () => {
        // Select p1 (gs1) and p3 (gs2)
        store.ui.togglePlantSelection('p1');
        store.ui.togglePlantSelection('p3');

        store.openBatchWateringDialog();

        // growspaceId should be undefined as they are mixed
        expect(mockSetActiveDialog).toHaveBeenCalledWith({
            type: 'WATERING',
            payload: {
                mode: 'plant',
                plantIds: ['p1', 'p3'],
                growspaceId: undefined
            }
        });
    });

    it('should do nothing if no plants selected', () => {
        store.openBatchWateringDialog();
        expect(mockSetActiveDialog).not.toHaveBeenCalled();
    });
});
