import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as keyboardActions from '../../src/store/keyboard-actions';
import * as uiStore from '../../src/store/ui-store';
import * as dataStore from '../../src/store/data-store';
import { PlantEntity } from '../../src/types';

// Mock the stores
vi.mock('../../src/store/ui-store', () => ({
    $isEditMode: { get: vi.fn() },
    $focusedPlantIndex: { get: vi.fn() },
    $selectedPlants: { get: vi.fn() },
    setFocusedPlantIndex: vi.fn(),
}));

vi.mock('../../src/store/data-store', () => ({
    $selectedDevice: { get: vi.fn() },
    $devices: { get: vi.fn() },
    $optimisticDeletedPlantIds: { get: vi.fn() },
}));

describe('keyboard-actions', () => {
    let mockContext: keyboardActions.KeyboardActionContext;
    let mockPlants: PlantEntity[];

    beforeEach(() => {
        vi.clearAllMocks();

        mockContext = {
            exitEditMode: vi.fn(),
            handlePlantClick: vi.fn(),
            handleDeletePlant: vi.fn(),
        };

        mockPlants = [
            {
                entity_id: 'sensor.plant_1',
                state: 'active',
                last_changed: '',
                last_updated: '',
                context: { id: '1', parent_id: null, user_id: null },
                attributes: { plant_id: 'p1', strain: 'OG Kush', phenotype: 'default', stage: 'flower', row: 0, col: 0, entity_id: 'sensor.plant_1', position: '0', seedling_days: 0, mother_days: 0, clone_days: 0, veg_days: 0, flower_days: 0, dry_days: 0, cure_days: 0, seedling_start: null, mother_start: null, clone_start: null, veg_start: null, flower_start: null, dry_start: null, cure_start: null, friendly_name: '' },
            },
            {
                entity_id: 'sensor.plant_2',
                state: 'active',
                last_changed: '',
                last_updated: '',
                context: { id: '2', parent_id: null, user_id: null },
                attributes: { plant_id: 'p2', strain: 'Blue Dream', phenotype: 'default', stage: 'flower', row: 0, col: 1, entity_id: 'sensor.plant_2', position: '1', seedling_days: 0, mother_days: 0, clone_days: 0, veg_days: 0, flower_days: 0, dry_days: 0, cure_days: 0, seedling_start: null, mother_start: null, clone_start: null, veg_start: null, flower_start: null, dry_start: null, cure_start: null, friendly_name: '' },
            },
        ];

        // Default mock setup
        vi.mocked(uiStore.$isEditMode.get).mockReturnValue(false);
        vi.mocked(uiStore.$focusedPlantIndex.get).mockReturnValue(0);
        vi.mocked(uiStore.$selectedPlants.get).mockReturnValue(new Set<string>());
        vi.mocked(dataStore.$selectedDevice.get).mockReturnValue('device1');
        vi.mocked(dataStore.$devices.get).mockReturnValue([
            { device_id: 'device1', name: 'Tent 1', plants: mockPlants } as any,
        ]);
        vi.mocked(dataStore.$optimisticDeletedPlantIds.get).mockReturnValue(new Set<string>());
    });

    describe('handleKeyboardNavigation', () => {
        it('should exit edit mode on Escape when in edit mode', () => {
            vi.mocked(uiStore.$isEditMode.get).mockReturnValue(true);

            keyboardActions.handleKeyboardNavigation(mockContext, 'Escape');

            expect(mockContext.exitEditMode).toHaveBeenCalled();
        });

        it('should not exit edit mode on Escape when not in edit mode', () => {
            vi.mocked(uiStore.$isEditMode.get).mockReturnValue(false);

            keyboardActions.handleKeyboardNavigation(mockContext, 'Escape');

            expect(mockContext.exitEditMode).not.toHaveBeenCalled();
        });

        it('should navigate to next plant on ArrowRight', () => {
            vi.mocked(uiStore.$focusedPlantIndex.get).mockReturnValue(0);

            keyboardActions.handleKeyboardNavigation(mockContext, 'ArrowRight');

            expect(uiStore.setFocusedPlantIndex).toHaveBeenCalledWith(1);
        });

        it('should wrap around on ArrowRight at the end', () => {
            vi.mocked(uiStore.$focusedPlantIndex.get).mockReturnValue(1); // Last plant

            keyboardActions.handleKeyboardNavigation(mockContext, 'ArrowRight');

            expect(uiStore.setFocusedPlantIndex).toHaveBeenCalledWith(0);
        });

        it('should navigate to previous plant on ArrowLeft', () => {
            vi.mocked(uiStore.$focusedPlantIndex.get).mockReturnValue(1);

            keyboardActions.handleKeyboardNavigation(mockContext, 'ArrowLeft');

            expect(uiStore.setFocusedPlantIndex).toHaveBeenCalledWith(0);
        });

        it('should wrap around on ArrowLeft at the beginning', () => {
            vi.mocked(uiStore.$focusedPlantIndex.get).mockReturnValue(0); // First plant

            keyboardActions.handleKeyboardNavigation(mockContext, 'ArrowLeft');

            expect(uiStore.setFocusedPlantIndex).toHaveBeenCalledWith(1);
        });

        it('should trigger plant click on Enter', () => {
            vi.mocked(uiStore.$focusedPlantIndex.get).mockReturnValue(0);

            keyboardActions.handleKeyboardNavigation(mockContext, 'Enter');

            expect(mockContext.handlePlantClick).toHaveBeenCalledWith(mockPlants[0]);
        });

        it('should trigger plant click on Space', () => {
            vi.mocked(uiStore.$focusedPlantIndex.get).mockReturnValue(1);

            keyboardActions.handleKeyboardNavigation(mockContext, ' ');

            expect(mockContext.handlePlantClick).toHaveBeenCalledWith(mockPlants[1]);
        });

        it('should delete focused plant on Delete', () => {
            vi.mocked(uiStore.$focusedPlantIndex.get).mockReturnValue(0);

            keyboardActions.handleKeyboardNavigation(mockContext, 'Delete');

            expect(mockContext.handleDeletePlant).toHaveBeenCalledWith('sensor.plant_1');
        });

        it('should delete focused plant on Backspace', () => {
            vi.mocked(uiStore.$focusedPlantIndex.get).mockReturnValue(1);

            keyboardActions.handleKeyboardNavigation(mockContext, 'Backspace');

            expect(mockContext.handleDeletePlant).toHaveBeenCalledWith('sensor.plant_2');
        });

        it('should delete selected plants when no focused plant on Delete', () => {
            vi.mocked(uiStore.$focusedPlantIndex.get).mockReturnValue(-1); // No focus
            vi.mocked(uiStore.$selectedPlants.get).mockReturnValue(new Set(['p1', 'p2']));

            keyboardActions.handleKeyboardNavigation(mockContext, 'Delete');

            expect(mockContext.handleDeletePlant).toHaveBeenCalledWith(['p1', 'p2']);
        });

        it('should do nothing when no device is selected', () => {
            vi.mocked(dataStore.$selectedDevice.get).mockReturnValue(null);

            keyboardActions.handleKeyboardNavigation(mockContext, 'ArrowRight');

            expect(uiStore.setFocusedPlantIndex).not.toHaveBeenCalled();
        });

        it('should do nothing when no plants exist', () => {
            vi.mocked(dataStore.$devices.get).mockReturnValue([
                { device_id: 'device1', name: 'Tent 1', plants: [] } as any,
            ]);

            keyboardActions.handleKeyboardNavigation(mockContext, 'ArrowRight');

            expect(uiStore.setFocusedPlantIndex).not.toHaveBeenCalled();
        });

        it('should exclude optimistically deleted plants', () => {
            vi.mocked(dataStore.$optimisticDeletedPlantIds.get).mockReturnValue(new Set(['p1']));
            vi.mocked(uiStore.$focusedPlantIndex.get).mockReturnValue(0);

            keyboardActions.handleKeyboardNavigation(mockContext, 'ArrowRight');

            // With only one visible plant, wrapping should stay at 0
            expect(uiStore.setFocusedPlantIndex).toHaveBeenCalledWith(0);
        });
    });
});
