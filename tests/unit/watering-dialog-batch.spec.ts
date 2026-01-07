import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WateringDialog } from '../../src/dialogs/watering-dialog';
import { GrowspaceStore } from '../../src/store/growspace-store';
import { DataService } from '../../src/data-service';

// Mock dependencies
const mockShowToast = vi.fn();
const mockRefreshData = vi.fn();

// Mock DataService class
const mockWaterPlant = vi.fn();
const mockWaterGrowspace = vi.fn();

vi.mock('../../src/data-service', () => {
    return {
        DataService: class {
            waterPlant = mockWaterPlant;
            waterGrowspace = mockWaterGrowspace;
        }
    };
});

describe('WateringDialog Batch Submission', () => {
    let dialog: WateringDialog;
    let mockStore: any;

    beforeEach(() => {
        vi.clearAllMocks();

        dialog = new WateringDialog();

        // Mock Store
        mockStore = {
            showToast: mockShowToast,
            refreshData: mockRefreshData,
            data: {
                $devices: {
                    get: () => []
                }
            }
        };
        dialog.store = mockStore;

        // Inject mocked DataService manually as it's private and usually created in willUpdate
        (dialog as any)._dataService = new DataService({} as any);
    });

    it('should submit water_plant calls for each selected plant in batch mode', async () => {
        // Setup dialog state for batch plant watering
        dialog.dialogState = {
            mode: 'plant',
            plantIds: ['p1', 'p2', 'p3'],
            growspaceId: undefined
        };
        // Set volume
        (dialog as any)._volume = 1.5;

        // Call submit (private)
        await (dialog as any)._submit();

        expect(mockWaterPlant).toHaveBeenCalledTimes(3);
        expect(mockWaterPlant).toHaveBeenCalledWith('p1', 1.5, undefined, undefined);
        expect(mockWaterPlant).toHaveBeenCalledWith('p2', 1.5, undefined, undefined);
        expect(mockWaterPlant).toHaveBeenCalledWith('p3', 1.5, undefined, undefined);

        expect(mockShowToast).toHaveBeenCalledWith('Watered 3 plant(s)', 'success');
        expect(mockRefreshData).toHaveBeenCalled();
    });

    it('should pass preset_id if selected', async () => {
        dialog.dialogState = {
            mode: 'plant',
            plantIds: ['p1'],
            growspaceId: 'gs1'
        };
        (dialog as any)._volume = 1.0;
        (dialog as any)._selectedPresetId = 'preset_123';

        await (dialog as any)._submit();

        expect(mockWaterPlant).toHaveBeenCalledWith('p1', 1.0, undefined, 'preset_123');
    });

    it('should handle nutrients and volume', async () => {
        dialog.dialogState = {
            mode: 'plant',
            plantIds: ['p1'],
            growspaceId: undefined
        };
        (dialog as any)._volume = 2.0;
        (dialog as any)._nutrients = [{ name: 'A', concentration: 1.0 }];

        await (dialog as any)._submit();

        expect(mockWaterPlant).toHaveBeenCalledWith('p1', 2.0, { 'A': 1.0 }, undefined);
    });

    it('should call water_growspace when mode is growspace', async () => {
        dialog.dialogState = {
            mode: 'growspace',
            growspaceId: 'gs1'
        };
        (dialog as any)._volume = 1.0;

        await (dialog as any)._submit();

        expect(mockWaterGrowspace).toHaveBeenCalledWith('gs1', 1.0, undefined, undefined);
        expect(mockWaterPlant).not.toHaveBeenCalled();
    });
});
