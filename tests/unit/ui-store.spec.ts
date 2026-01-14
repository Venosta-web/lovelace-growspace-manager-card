import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GrowspaceUIStore } from '../../src/store/ui-store';
import { ViewMode, GridOverlayMode } from '../../src/constants';

describe('UI Store', () => {
    let store: GrowspaceUIStore;

    beforeEach(() => {
        store = new GrowspaceUIStore();
        // Reset defaults if needed, but new instance should be fresh
    });

    describe('Atoms', () => {
        it('should have correct default values', () => {
            expect(store.$viewMode.get()).toBe('standard');
            expect(store.$isLoading.get()).toBe(true);
            expect(store.$activeDialog.get()).toEqual({ type: 'NONE' });
            expect(store.$isEditMode.get()).toBe(false);
            expect(store.$selectedPlants.get()).toEqual(new Set());
            expect(store.$focusedPlantIndex.get()).toBe(-1);
            expect(store.$menuOpen.get()).toBe(false);
            expect(store.$notification.get()).toBeNull();
            expect(store.$defaultApplied.get()).toBe(false);
            expect(store.$gridOverlayMode.get()).toBe('none');

        });

        it('should compute $isCompactView correctly', () => {
            expect(store.$isCompactView.get()).toBe(false);

            store.$viewMode.set(ViewMode.COMPACT);
            expect(store.$isCompactView.get()).toBe(true);

            store.$viewMode.set(ViewMode.STANDARD);
            expect(store.$isCompactView.get()).toBe(false);
        });
    });

    describe('setViewMode', () => {
        it('should update $viewMode', () => {
            store.setViewMode(ViewMode.COMPACT);
            expect(store.$viewMode.get()).toBe(ViewMode.COMPACT);

            store.setViewMode(ViewMode.HEADER);
            expect(store.$viewMode.get()).toBe(ViewMode.HEADER);

            store.setViewMode(ViewMode.STANDARD);
            expect(store.$viewMode.get()).toBe(ViewMode.STANDARD);
        });
    });

    describe('setGridOverlayMode', () => {
        it('should update $gridOverlayMode', () => {
            store.setGridOverlayMode(GridOverlayMode.VPD);
            expect(store.$gridOverlayMode.get()).toBe(GridOverlayMode.VPD);

            store.setGridOverlayMode(GridOverlayMode.TEMPERATURE);
            expect(store.$gridOverlayMode.get()).toBe(GridOverlayMode.TEMPERATURE);

            store.setGridOverlayMode(GridOverlayMode.NONE);
            expect(store.$gridOverlayMode.get()).toBe(GridOverlayMode.NONE);


        });
    });

    describe('setIsLoading', () => {
        it('should update $isLoading', () => {
            store.setIsLoading(false);
            expect(store.$isLoading.get()).toBe(false);

            store.setIsLoading(true);
            expect(store.$isLoading.get()).toBe(true);
        });
    });

    describe('setActiveDialog', () => {
        it('should update $activeDialog', () => {
            const dialog = { type: 'PLANT_OVERVIEW' as const, payload: { plant: {} } };
            store.setActiveDialog(dialog as any);
            expect(store.$activeDialog.get()).toEqual(dialog);
        });
    });

    describe('closeDialog', () => {
        it('should reset $activeDialog to NONE', () => {
            store.$activeDialog.set({ type: 'ADD_PLANT', payload: { row: 0, col: 0 } });
            expect(store.$activeDialog.get().type).toBe('ADD_PLANT');

            store.closeDialog();
            expect(store.$activeDialog.get()).toEqual({ type: 'NONE' });
        });
    });

    describe('setEditMode', () => {
        it('should update $isEditMode', () => {
            store.setEditMode(true);
            expect(store.$isEditMode.get()).toBe(true);

            store.setEditMode(false);
            expect(store.$isEditMode.get()).toBe(false);
        });

        it('should clear plant selection when exiting edit mode', () => {
            store.setEditMode(true);
            store.$selectedPlants.set(new Set(['plant1', 'plant2']));
            expect(store.$selectedPlants.get().size).toBe(2);

            store.setEditMode(false);
            expect(store.$selectedPlants.get().size).toBe(0);
        });

        it('should NOT clear selection when entering edit mode', () => {
            store.$selectedPlants.set(new Set(['plant1']));

            store.setEditMode(true);
            expect(store.$selectedPlants.get().size).toBe(1);
        });
    });

    describe('togglePlantSelection', () => {
        it('should add plant to selection if not present', () => {
            store.togglePlantSelection('plant1');
            expect(store.$selectedPlants.get().has('plant1')).toBe(true);
        });

        it('should remove plant from selection if already present', () => {
            store.$selectedPlants.set(new Set(['plant1', 'plant2']));

            store.togglePlantSelection('plant1');
            expect(store.$selectedPlants.get().has('plant1')).toBe(false);
            expect(store.$selectedPlants.get().has('plant2')).toBe(true);
        });

        it('should handle multiple toggles', () => {
            store.togglePlantSelection('plant1');
            expect(store.$selectedPlants.get().size).toBe(1);

            store.togglePlantSelection('plant2');
            expect(store.$selectedPlants.get().size).toBe(2);

            store.togglePlantSelection('plant1');
            expect(store.$selectedPlants.get().size).toBe(1);
            expect(store.$selectedPlants.get().has('plant2')).toBe(true);
        });
    });

    describe('deselectPlants', () => {
        it('should remove specific plants from selection', () => {
            store.$selectedPlants.set(new Set(['p1', 'p2', 'p3']));

            store.deselectPlants(['p1', 'p3']);

            const selected = store.$selectedPlants.get();
            expect(selected.size).toBe(1);
            expect(selected.has('p2')).toBe(true);
            expect(selected.has('p1')).toBe(false);
            expect(selected.has('p3')).toBe(false);
        });

        it('should handle IDs not in selection', () => {
            store.$selectedPlants.set(new Set(['p1']));

            store.deselectPlants(['p2']);

            expect(store.$selectedPlants.get().size).toBe(1);
            expect(store.$selectedPlants.get().has('p1')).toBe(true);
        });
    });

    describe('selectAllPlants', () => {
        it('should set all provided plant IDs as selected', () => {
            store.selectAllPlants(['plant1', 'plant2', 'plant3']);

            const selected = store.$selectedPlants.get();
            expect(selected.size).toBe(3);
            expect(selected.has('plant1')).toBe(true);
            expect(selected.has('plant2')).toBe(true);
            expect(selected.has('plant3')).toBe(true);
        });

        it('should replace existing selection', () => {
            store.$selectedPlants.set(new Set(['old1', 'old2']));

            store.selectAllPlants(['new1']);

            expect(store.$selectedPlants.get().size).toBe(1);
            expect(store.$selectedPlants.get().has('new1')).toBe(true);
            expect(store.$selectedPlants.get().has('old1')).toBe(false);
        });

        it('should handle empty array', () => {
            store.$selectedPlants.set(new Set(['plant1']));

            store.selectAllPlants([]);
            expect(store.$selectedPlants.get().size).toBe(0);
        });
    });

    describe('clearPlantSelection', () => {
        it('should clear all selected plants', () => {
            store.$selectedPlants.set(new Set(['plant1', 'plant2', 'plant3']));
            expect(store.$selectedPlants.get().size).toBe(3);

            store.clearPlantSelection();
            expect(store.$selectedPlants.get().size).toBe(0);
        });
    });

    describe('setFocusedPlantIndex', () => {
        it('should update $focusedPlantIndex', () => {
            store.setFocusedPlantIndex(5);
            expect(store.$focusedPlantIndex.get()).toBe(5);

            store.setFocusedPlantIndex(-1);
            expect(store.$focusedPlantIndex.get()).toBe(-1);

            store.setFocusedPlantIndex(0);
            expect(store.$focusedPlantIndex.get()).toBe(0);
        });
    });

    describe('setMenuOpen', () => {
        it('should update $menuOpen', () => {
            store.setMenuOpen(true);
            expect(store.$menuOpen.get()).toBe(true);

            store.setMenuOpen(false);
            expect(store.$menuOpen.get()).toBe(false);
        });
    });

    describe('showToast', () => {
        it('should set notification with message and type', () => {
            store.showToast('Test message', 'success');

            const notification = store.$notification.get();
            expect(notification).toEqual({
                message: 'Test message',
                type: 'success',
                action: undefined
            });
        });

        it('should default to info type', () => {
            store.showToast('Info message');

            const notification = store.$notification.get();
            expect(notification).toEqual({
                message: 'Info message',
                type: 'info',
                action: undefined
            });
        });

        it('should handle error type', () => {
            store.showToast('Error occurred', 'error');

            expect(store.$notification.get()?.type).toBe('error');
        });

        it('should handle action parameter', () => {
            const callback = vi.fn();
            store.showToast('Message with action', 'info', { label: 'Click', callback });

            const notification = store.$notification.get();
            expect(notification?.action).toEqual({ label: 'Click', callback });

            notification?.action?.callback();
            expect(callback).toHaveBeenCalled();
        });
    });

    describe('Computed Stores', () => {
        it('should compute $cardViewState correctly', () => {
            const state = store.$cardViewState.get();
            expect(state).toEqual({
                viewMode: 'standard',
                isLoading: true,
                isEditMode: false,
                isCompact: false,
                activeDialog: { type: 'NONE' },
                notification: null,
                focusedPlantIndex: -1
            });
        });

        it('should update $cardViewState when dependencies change', () => {
            store.setViewMode(ViewMode.COMPACT);
            store.setIsLoading(false);
            store.setEditMode(true);
            store.setActiveDialog({ type: 'IPM', payload: { plantIds: ['p1'] } });
            store.showToast('test', 'success');
            store.setFocusedPlantIndex(2);

            const state = store.$cardViewState.get();
            expect(state.viewMode).toBe('compact');
            expect(state.isLoading).toBe(false);
            expect(state.isEditMode).toBe(true);
            expect(state.isCompact).toBe(true);
            expect(state.activeDialog.type).toBe('IPM');
            expect(state.notification?.message).toBe('test');
            expect(state.focusedPlantIndex).toBe(2);
        });
    });

    describe('clearToast', () => {
        it('should clear notification', () => {
            store.$notification.set({ message: 'Test', type: 'info' });
            expect(store.$notification.get()).not.toBeNull();

            store.clearToast();
            expect(store.$notification.get()).toBeNull();
        });
    });

    describe('setDefaultApplied', () => {
        it('should update $defaultApplied', () => {
            store.setDefaultApplied(true);
            expect(store.$defaultApplied.get()).toBe(true);

            store.setDefaultApplied(false);
            expect(store.$defaultApplied.get()).toBe(false);
        });
    });

    describe('setError', () => {
        it('should update $error with a string', () => {
            store.setError('Something went wrong');
            expect(store.$error.get()).toBe('Something went wrong');
        });

        it('should clear $error when set to null', () => {
            store.setError('Error message');
            expect(store.$error.get()).not.toBeNull();

            store.setError(null);
            expect(store.$error.get()).toBeNull();
        });
    });

});
