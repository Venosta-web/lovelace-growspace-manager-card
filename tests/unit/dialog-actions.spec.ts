import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    openPlantOverviewDialog,
    openAddPlantDialog,
    openStrainRecommendationDialog,
    openLogbookDialog,
    openStrainLibraryDialog,
    openGrowMasterDialog,
    openIrrigationDialog,
    closeDialog,
} from '../../src/store/dialog-actions';
import * as uiStore from '../../src/store/ui-store';
import * as dataStore from '../../src/store/data-store';
import { PlantEntity } from '../../src/types';

// Mock ui-store
vi.mock('../../src/store/ui-store', async () => {
    const actual = await vi.importActual('../../src/store/ui-store');
    return {
        ...actual,
        setActiveDialog: vi.fn(),
        closeDialog: vi.fn(),
        $activeDialog: { get: vi.fn(() => ({ type: 'NONE' })) },
    };
});

// Mock data-store
vi.mock('../../src/store/data-store', async () => {
    return {
        $selectedDevice: { get: vi.fn(() => 'test-device') },
        $devices: {
            get: vi.fn(() => [
                {
                    device_id: 'test-device',
                    name: 'Test Growspace',
                    rows: 2,
                    plants_per_row: 2,
                    plants: [],
                },
            ]),
        },
        $optimisticDeletedPlantIds: { get: vi.fn(() => new Set()) },
    };
});

describe('dialog-actions', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const mockPlant: PlantEntity = {
        entity_id: 'sensor.plant_test',
        state: 'active',
        last_changed: '',
        last_updated: '',
        context: { id: '1', parent_id: null, user_id: null },
        attributes: {
            plant_id: 'test-plant',
            entity_id: 'sensor.plant_test',
            strain: 'Test Strain',
            phenotype: '',
            stage: 'veg',
            row: 1,
            col: 1,
            position: '1,1',
            seedling_days: 0,
            mother_days: 0,
            clone_days: 0,
            veg_days: 14,
            flower_days: 0,
            dry_days: 0,
            cure_days: 0,
            seedling_start: null,
            mother_start: null,
            clone_start: null,
            veg_start: '2024-01-01',
            flower_start: null,
            dry_start: null,
            cure_start: null,
        },
    };

    describe('openPlantOverviewDialog', () => {
        it('should open plant overview dialog with correct payload', () => {
            openPlantOverviewDialog(mockPlant);

            expect(uiStore.setActiveDialog).toHaveBeenCalledWith({
                type: 'PLANT_OVERVIEW',
                payload: {
                    plant: mockPlant,
                    editedAttributes: { ...mockPlant.attributes },
                    activeTab: 'dashboard',
                    selectedPlantIds: undefined,
                },
            });
        });

        it('should include selectedIds when provided', () => {
            openPlantOverviewDialog(mockPlant, ['plant1', 'plant2']);

            expect(uiStore.setActiveDialog).toHaveBeenCalledWith(
                expect.objectContaining({
                    payload: expect.objectContaining({
                        selectedPlantIds: ['plant1', 'plant2'],
                    }),
                })
            );
        });
    });

    describe('openAddPlantDialog', () => {
        it('should open with specified row/col', () => {
            const result = openAddPlantDialog(3, 4);

            expect(uiStore.setActiveDialog).toHaveBeenCalledWith({
                type: 'ADD_PLANT',
                payload: { row: 3, col: 4 },
            });
            expect(result).toEqual({ row: 3, col: 4 });
        });

        it('should auto-find first empty slot when no coords provided', () => {
            const result = openAddPlantDialog();

            expect(uiStore.setActiveDialog).toHaveBeenCalledWith({
                type: 'ADD_PLANT',
                payload: { row: 0, col: 0 },
            });
            expect(result).toEqual({ row: 0, col: 0 });
        });

        it('should return default when no device selected', () => {
            vi.mocked(dataStore.$selectedDevice.get).mockReturnValue(null);

            const result = openAddPlantDialog();

            expect(result).toEqual({ row: 0, col: 0 });
        });

        it('should skip deleted plants when finding slot', () => {
            vi.mocked(dataStore.$selectedDevice.get).mockReturnValue('test-device');
            vi.mocked(dataStore.$devices.get).mockReturnValue([{
                device_id: 'test-device',
                rows: 2,
                plants_per_row: 2,
                plants: [
                    { attributes: { plant_id: 'p1', row: 1, col: 1 } }
                ]
            } as any]);
            vi.mocked(dataStore.$optimisticDeletedPlantIds.get).mockReturnValue(new Set(['p1']));

            const result = openAddPlantDialog();

            // p1 is at 0,0 (1-1, 1-1) but is deleted. So 0,0 should be free.
            expect(result).toEqual({ row: 0, col: 0 });
        });

        it('should skip occupied slots', () => {
            vi.mocked(dataStore.$devices.get).mockReturnValue([{
                device_id: 'test-device',
                rows: 2,
                plants_per_row: 2,
                plants: [
                    { attributes: { plant_id: 'p1', row: 1, col: 1 } }, // Occupies 0,0
                    { attributes: { plant_id: 'p2', row: 1, col: 2 } }  // Occupies 0,1
                ]
            } as any]);
            vi.mocked(dataStore.$optimisticDeletedPlantIds.get).mockReturnValue(new Set());

            const result = openAddPlantDialog();

            // 0,0 and 0,1 occupied. Next is 1,0.
            expect(result).toEqual({ row: 1, col: 0 });
        });

        it('should handle plant with missing grid attributes (default to 0,0)', () => {
            vi.mocked(dataStore.$selectedDevice.get).mockReturnValue('test-device');
            vi.mocked(dataStore.$devices.get).mockReturnValue([{
                device_id: 'test-device',
                rows: 2,
                plants_per_row: 2,
                plants: [
                    { attributes: { plant_id: 'p1' } } // Missing row/col -> defaults to 1,1 -> 0,0
                ]
            } as any]);
            vi.mocked(dataStore.$optimisticDeletedPlantIds.get).mockReturnValue(new Set());

            const result = openAddPlantDialog();

            // 0,0 occupied by defaulter. Next is 0,1.
            expect(result).toEqual({ row: 0, col: 1 });
        });
    });

    describe('openStrainRecommendationDialog', () => {
        it('should open strain recommendation dialog', () => {
            openStrainRecommendationDialog();

            expect(uiStore.setActiveDialog).toHaveBeenCalledWith({
                type: 'STRAIN_RECOMMENDATION',
                payload: { isLoading: false, response: null },
            });
        });
    });

    describe('openLogbookDialog', () => {
        it('should open logbook dialog when device selected', () => {
            vi.mocked(dataStore.$selectedDevice.get).mockReturnValue('test-device');

            const result = openLogbookDialog();

            expect(result).toBe(true);
            expect(uiStore.setActiveDialog).toHaveBeenCalledWith({
                type: 'LOGBOOK',
                payload: { growspaceId: 'test-device' },
            });
        });

        it('should return false when no device selected', () => {
            vi.mocked(dataStore.$selectedDevice.get).mockReturnValue(null);

            const result = openLogbookDialog();

            expect(result).toBe(false);
            expect(uiStore.setActiveDialog).not.toHaveBeenCalled();
        });
    });

    describe('openStrainLibraryDialog', () => {
        it('should open strain library dialog', () => {
            openStrainLibraryDialog();

            expect(uiStore.setActiveDialog).toHaveBeenCalledWith({
                type: 'STRAIN_LIBRARY',
                payload: { isEditing: false },
            });
        });
    });

    describe('openGrowMasterDialog', () => {
        it('should open grow master dialog when device selected', () => {
            vi.mocked(dataStore.$selectedDevice.get).mockReturnValue('test-device');

            const result = openGrowMasterDialog();

            expect(result).toBe(true);
            expect(uiStore.setActiveDialog).toHaveBeenCalledWith({
                type: 'GROW_MASTER',
                payload: {
                    growspaceId: 'test-device',
                    isLoading: false,
                    response: null,
                    mode: 'single',
                },
            });
        });

        it('should return false when no device selected', () => {
            vi.mocked(dataStore.$selectedDevice.get).mockReturnValue(null);

            const result = openGrowMasterDialog();

            expect(result).toBe(false);
        });
    });

    describe('openIrrigationDialog', () => {
        it('should open irrigation dialog', () => {
            openIrrigationDialog();

            expect(uiStore.setActiveDialog).toHaveBeenCalledWith({
                type: 'IRRIGATION',
                payload: {},
            });
        });
    });

    describe('closeDialog', () => {
        it('should re-export closeDialog from ui-store', () => {
            closeDialog();

            expect(uiStore.closeDialog).toHaveBeenCalled();
        });
    });
});
