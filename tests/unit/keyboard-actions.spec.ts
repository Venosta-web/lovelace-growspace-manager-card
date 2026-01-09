import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as keyboardActions from '../../src/store/keyboard-actions';
import { GrowspaceUIStore } from '../../src/store/ui-store';
import { GrowspaceDataStore } from '../../src/store/data-store';
import { GrowspaceStore } from '../../src/store/growspace-store';
import { PlantEntity } from '../../src/types';

// Mock the stores (ensure they are instantiated correctly)
vi.mock('../../src/store/ui-store', () => {
    const mocks = {
        $isEditMode: { get: vi.fn(), set: vi.fn(), subscribe: vi.fn() },
        $focusedPlantIndex: { get: vi.fn(), set: vi.fn(), subscribe: vi.fn() },
        $selectedPlants: { get: vi.fn(), set: vi.fn(), subscribe: vi.fn() },
        setFocusedPlantIndex: vi.fn(),
    };
    return {
        GrowspaceUIStore: class {
            constructor() { Object.assign(this, mocks); }
        }
    };
});

vi.mock('../../src/store/data-store', () => {
    const mocks = {
        $selectedDevice: { get: vi.fn(), set: vi.fn(), subscribe: vi.fn() },
        $devices: { get: vi.fn(), set: vi.fn(), subscribe: vi.fn() },
        $optimisticDeletedPlantIds: { get: vi.fn(), set: vi.fn(), subscribe: vi.fn() },
    };
    return {
        GrowspaceDataStore: class {
            constructor() { Object.assign(this, mocks); }
        }
    };
});

describe('keyboard-actions', () => {
    let mockContext: keyboardActions.KeyboardActionContext;
    let mockPlants: PlantEntity[];
    let store: GrowspaceStore;

    beforeEach(() => {
        vi.clearAllMocks();

        // Create store instance
        store = new GrowspaceStore();

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
                attributes: { plant_id: 'p1', strain: 'OG Kush', phenotype: 'default', stage: 'flower', row: 0, col: 0, entity_id: 'sensor.plant_1', position: '0', seedling_days: 0, mother_days: 0, clone_days: 0, veg_days: 0, flower_days: 0, dry_days: 0, cure_days: 0, seedling_start: null, mother_start: null, clone_start: null, veg_start: null, flower_start: null, dry_start: null, cure_start: null, friendly_name: '', days_since_last_watering: 0 },
            },
            {
                entity_id: 'sensor.plant_2',
                state: 'active',
                last_changed: '',
                last_updated: '',
                context: { id: '2', parent_id: null, user_id: null },
                attributes: { plant_id: 'p2', strain: 'Blue Dream', phenotype: 'default', stage: 'flower', row: 0, col: 1, entity_id: 'sensor.plant_2', position: '1', seedling_days: 0, mother_days: 0, clone_days: 0, veg_days: 0, flower_days: 0, dry_days: 0, cure_days: 0, seedling_start: null, mother_start: null, clone_start: null, veg_start: null, flower_start: null, dry_start: null, cure_start: null, friendly_name: '', days_since_last_watering: 0 },
            },
        ];

        // Access mocked atoms via the store instance
        vi.mocked(store.ui.$isEditMode.get).mockReturnValue(false);
        vi.mocked(store.ui.$focusedPlantIndex.get).mockReturnValue(0);
        vi.mocked(store.ui.$selectedPlants.get).mockReturnValue(new Set<string>());
        vi.mocked(store.data.$selectedDevice.get).mockReturnValue('device1');
        vi.mocked(store.data.$devices.get).mockReturnValue([
            { device_id: 'device1', name: 'Tent 1', plants: mockPlants } as any,
        ]);
        vi.mocked(store.data.$optimisticDeletedPlantIds.get).mockReturnValue(new Set<string>());
    });

    describe('handleKeyboardNavigation', () => {
        it('should exit edit mode on Escape when in edit mode', () => {
            vi.mocked(store.ui.$isEditMode.get).mockReturnValue(true);

            keyboardActions.handleKeyboardNavigation(mockContext, 'Escape', store.ui, store.data);

            expect(mockContext.exitEditMode).toHaveBeenCalled();
        });

        it('should not exit edit mode on Escape when not in edit mode', () => {
            vi.mocked(store.ui.$isEditMode.get).mockReturnValue(false);

            keyboardActions.handleKeyboardNavigation(mockContext, 'Escape', store.ui, store.data);

            expect(mockContext.exitEditMode).not.toHaveBeenCalled();
        });

        it('should navigate to next plant on ArrowRight', () => {
            vi.mocked(store.ui.$focusedPlantIndex.get).mockReturnValue(0);

            keyboardActions.handleKeyboardNavigation(mockContext, 'ArrowRight', store.ui, store.data);

            expect(store.ui.setFocusedPlantIndex).toHaveBeenCalledWith(1);
        });

        it('should wrap around on ArrowRight at the end', () => {
            vi.mocked(store.ui.$focusedPlantIndex.get).mockReturnValue(1); // Last plant

            keyboardActions.handleKeyboardNavigation(mockContext, 'ArrowRight', store.ui, store.data);

            expect(store.ui.setFocusedPlantIndex).toHaveBeenCalledWith(0);
        });

        it('should navigate to previous plant on ArrowLeft', () => {
            vi.mocked(store.ui.$focusedPlantIndex.get).mockReturnValue(1);

            keyboardActions.handleKeyboardNavigation(mockContext, 'ArrowLeft', store.ui, store.data);

            expect(store.ui.setFocusedPlantIndex).toHaveBeenCalledWith(0);
        });

        it('should wrap around on ArrowLeft at the beginning', () => {
            vi.mocked(store.ui.$focusedPlantIndex.get).mockReturnValue(0); // First plant

            keyboardActions.handleKeyboardNavigation(mockContext, 'ArrowLeft', store.ui, store.data);

            expect(store.ui.setFocusedPlantIndex).toHaveBeenCalledWith(1);
        });

        it('should trigger plant click on Enter', () => {
            vi.mocked(store.ui.$focusedPlantIndex.get).mockReturnValue(0);

            keyboardActions.handleKeyboardNavigation(mockContext, 'Enter', store.ui, store.data);

            expect(mockContext.handlePlantClick).toHaveBeenCalledWith(mockPlants[0]);
        });

        it('should trigger plant click on Space', () => {
            vi.mocked(store.ui.$focusedPlantIndex.get).mockReturnValue(1);

            keyboardActions.handleKeyboardNavigation(mockContext, ' ', store.ui, store.data);

            expect(mockContext.handlePlantClick).toHaveBeenCalledWith(mockPlants[1]);
        });

        it('should delete focused plant on Delete', () => {
            vi.mocked(store.ui.$focusedPlantIndex.get).mockReturnValue(0);

            keyboardActions.handleKeyboardNavigation(mockContext, 'Delete', store.ui, store.data);

            expect(mockContext.handleDeletePlant).toHaveBeenCalledWith('sensor.plant_1');
        });

        it('should delete focused plant on Backspace', () => {
            vi.mocked(store.ui.$focusedPlantIndex.get).mockReturnValue(1);

            keyboardActions.handleKeyboardNavigation(mockContext, 'Backspace', store.ui, store.data);

            expect(mockContext.handleDeletePlant).toHaveBeenCalledWith('sensor.plant_2');
        });

        it('should delete selected plants when no focused plant on Delete', () => {
            vi.mocked(store.ui.$focusedPlantIndex.get).mockReturnValue(-1); // No focus
            vi.mocked(store.ui.$selectedPlants.get).mockReturnValue(new Set(['p1', 'p2']));

            keyboardActions.handleKeyboardNavigation(mockContext, 'Delete', store.ui, store.data);

            expect(mockContext.handleDeletePlant).toHaveBeenCalledWith(['p1', 'p2']);
        });

        it('should do nothing on Delete when no plant focused and no selection', () => {
            vi.mocked(store.ui.$focusedPlantIndex.get).mockReturnValue(-1);
            vi.mocked(store.ui.$selectedPlants.get).mockReturnValue(new Set());

            keyboardActions.handleKeyboardNavigation(mockContext, 'Delete', store.ui, store.data);

            expect(mockContext.handleDeletePlant).not.toHaveBeenCalled();
        });

        it('should do nothing when no device is selected', () => {
            vi.mocked(store.data.$selectedDevice.get).mockReturnValue(null);

            keyboardActions.handleKeyboardNavigation(mockContext, 'ArrowRight', store.ui, store.data);

            expect(store.ui.setFocusedPlantIndex).not.toHaveBeenCalled();
        });

        it('should do nothing when no plants exist', () => {
            vi.mocked(store.data.$devices.get).mockReturnValue([
                { device_id: 'device1', name: 'Tent 1', plants: [] } as any,
            ]);

            keyboardActions.handleKeyboardNavigation(mockContext, 'ArrowRight', store.ui, store.data);

            expect(store.ui.setFocusedPlantIndex).not.toHaveBeenCalled();
        });

        it('should exclude optimistically deleted plants', () => {
            vi.mocked(store.data.$optimisticDeletedPlantIds.get).mockReturnValue(new Set(['p1']));
            vi.mocked(store.ui.$focusedPlantIndex.get).mockReturnValue(0);

            keyboardActions.handleKeyboardNavigation(mockContext, 'ArrowRight', store.ui, store.data);

            // With only one visible plant, wrapping should stay at 0
            expect(store.ui.setFocusedPlantIndex).toHaveBeenCalledWith(0);
        });

        it('should not trigger plant click on Enter when index is out of bounds', () => {
            vi.mocked(store.ui.$focusedPlantIndex.get).mockReturnValue(-1); // Invalid index

            keyboardActions.handleKeyboardNavigation(mockContext, 'Enter', store.ui, store.data);

            expect(mockContext.handlePlantClick).not.toHaveBeenCalled();
        });

        it('should not trigger plant click on Space when index exceeds plants length', () => {
            vi.mocked(store.ui.$focusedPlantIndex.get).mockReturnValue(99); // Out of bounds

            keyboardActions.handleKeyboardNavigation(mockContext, ' ', store.ui, store.data);

            expect(mockContext.handlePlantClick).not.toHaveBeenCalled();
        });

        it('should do nothing when selected device is not found in devices list', () => {
            vi.mocked(store.data.$selectedDevice.get).mockReturnValue('nonexistent');
            vi.mocked(store.data.$devices.get).mockReturnValue([]);

            keyboardActions.handleKeyboardNavigation(mockContext, 'ArrowRight', store.ui, store.data);

            expect(store.ui.setFocusedPlantIndex).not.toHaveBeenCalled();
        });

        it('should handle plant without plant_id during filtering', () => {
            const plantNoId = { ...mockPlants[0], attributes: { ...mockPlants[0].attributes, plant_id: undefined } };
            vi.mocked(store.data.$devices.get).mockReturnValue([
                { device_id: 'device1', name: 'Tent 1', plants: [plantNoId] } as any,
            ]);
            vi.mocked(store.data.$optimisticDeletedPlantIds.get).mockReturnValue(new Set(['p1'])); // p1 won't match our plant since it has no id

            keyboardActions.handleKeyboardNavigation(mockContext, 'ArrowRight', store.ui, store.data);

            // Plant should still be visible because it has no plant_id to match the deleted set
            // With 1 plant, setFocusedPlantIndex(0)
            expect(store.ui.setFocusedPlantIndex).toHaveBeenCalledWith(0);
        });
    });
});
