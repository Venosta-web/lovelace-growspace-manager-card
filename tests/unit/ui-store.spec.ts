import { describe, it, expect, beforeEach } from 'vitest';
import {
    $viewMode,
    $isLoading,
    $activeDialog,
    $isEditMode,
    $selectedPlants,
    $focusedPlantIndex,
    $menuOpen,
    $notification,
    $defaultApplied,
    $isCompactView,
    setViewMode,
    setIsLoading,
    setActiveDialog,
    closeDialog,
    setEditMode,
    togglePlantSelection,
    selectAllPlants,
    clearPlantSelection,
    setFocusedPlantIndex,
    setMenuOpen,
    showToast,
    clearToast,
    setDefaultApplied
} from '../../src/store/ui-store';

describe('UI Store', () => {
    beforeEach(() => {
        // Reset all atoms to default values before each test
        $viewMode.set('standard');
        $isLoading.set(true);
        $activeDialog.set({ type: 'NONE' });
        $isEditMode.set(false);
        $selectedPlants.set(new Set());
        $focusedPlantIndex.set(-1);
        $menuOpen.set(false);
        $notification.set(null);
        $defaultApplied.set(false);
    });

    describe('Atoms', () => {
        it('should have correct default values', () => {
            expect($viewMode.get()).toBe('standard');
            expect($isLoading.get()).toBe(true);
            expect($activeDialog.get()).toEqual({ type: 'NONE' });
            expect($isEditMode.get()).toBe(false);
            expect($selectedPlants.get()).toEqual(new Set());
            expect($focusedPlantIndex.get()).toBe(-1);
            expect($menuOpen.get()).toBe(false);
            expect($notification.get()).toBeNull();
            expect($defaultApplied.get()).toBe(false);
        });

        it('should compute $isCompactView correctly', () => {
            expect($isCompactView.get()).toBe(false);

            $viewMode.set('compact');
            expect($isCompactView.get()).toBe(true);

            $viewMode.set('standard');
            expect($isCompactView.get()).toBe(false);
        });
    });

    describe('setViewMode', () => {
        it('should update $viewMode', () => {
            setViewMode('compact');
            expect($viewMode.get()).toBe('compact');

            setViewMode('header');
            expect($viewMode.get()).toBe('header');

            setViewMode('standard');
            expect($viewMode.get()).toBe('standard');
        });
    });

    describe('setIsLoading', () => {
        it('should update $isLoading', () => {
            setIsLoading(false);
            expect($isLoading.get()).toBe(false);

            setIsLoading(true);
            expect($isLoading.get()).toBe(true);
        });
    });

    describe('setActiveDialog', () => {
        it('should update $activeDialog', () => {
            const dialog = { type: 'PLANT_OVERVIEW' as const, payload: { plant: {} } };
            setActiveDialog(dialog as any);
            expect($activeDialog.get()).toEqual(dialog);
        });
    });

    describe('closeDialog', () => {
        it('should reset $activeDialog to NONE', () => {
            $activeDialog.set({ type: 'ADD_PLANT', payload: { row: 0, col: 0 } });
            expect($activeDialog.get().type).toBe('ADD_PLANT');

            closeDialog();
            expect($activeDialog.get()).toEqual({ type: 'NONE' });
        });
    });

    describe('setEditMode', () => {
        it('should update $isEditMode', () => {
            setEditMode(true);
            expect($isEditMode.get()).toBe(true);

            setEditMode(false);
            expect($isEditMode.get()).toBe(false);
        });

        it('should clear plant selection when exiting edit mode', () => {
            // Enter edit mode and select some plants
            setEditMode(true);
            $selectedPlants.set(new Set(['plant1', 'plant2']));
            expect($selectedPlants.get().size).toBe(2);

            // Exit edit mode - should clear selection
            setEditMode(false);
            expect($selectedPlants.get().size).toBe(0);
        });

        it('should NOT clear selection when entering edit mode', () => {
            // Pre-select some plants (unusual case, but testing behavior)
            $selectedPlants.set(new Set(['plant1']));

            setEditMode(true);
            // Selection should remain (not cleared when entering)
            expect($selectedPlants.get().size).toBe(1);
        });
    });

    describe('togglePlantSelection', () => {
        it('should add plant to selection if not present', () => {
            togglePlantSelection('plant1');
            expect($selectedPlants.get().has('plant1')).toBe(true);
        });

        it('should remove plant from selection if already present', () => {
            $selectedPlants.set(new Set(['plant1', 'plant2']));

            togglePlantSelection('plant1');
            expect($selectedPlants.get().has('plant1')).toBe(false);
            expect($selectedPlants.get().has('plant2')).toBe(true);
        });

        it('should handle multiple toggles', () => {
            togglePlantSelection('plant1');
            expect($selectedPlants.get().size).toBe(1);

            togglePlantSelection('plant2');
            expect($selectedPlants.get().size).toBe(2);

            togglePlantSelection('plant1');
            expect($selectedPlants.get().size).toBe(1);
            expect($selectedPlants.get().has('plant2')).toBe(true);
        });
    });

    describe('selectAllPlants', () => {
        it('should set all provided plant IDs as selected', () => {
            selectAllPlants(['plant1', 'plant2', 'plant3']);

            const selected = $selectedPlants.get();
            expect(selected.size).toBe(3);
            expect(selected.has('plant1')).toBe(true);
            expect(selected.has('plant2')).toBe(true);
            expect(selected.has('plant3')).toBe(true);
        });

        it('should replace existing selection', () => {
            $selectedPlants.set(new Set(['old1', 'old2']));

            selectAllPlants(['new1']);

            expect($selectedPlants.get().size).toBe(1);
            expect($selectedPlants.get().has('new1')).toBe(true);
            expect($selectedPlants.get().has('old1')).toBe(false);
        });

        it('should handle empty array', () => {
            $selectedPlants.set(new Set(['plant1']));

            selectAllPlants([]);
            expect($selectedPlants.get().size).toBe(0);
        });
    });

    describe('clearPlantSelection', () => {
        it('should clear all selected plants', () => {
            $selectedPlants.set(new Set(['plant1', 'plant2', 'plant3']));
            expect($selectedPlants.get().size).toBe(3);

            clearPlantSelection();
            expect($selectedPlants.get().size).toBe(0);
        });
    });

    describe('setFocusedPlantIndex', () => {
        it('should update $focusedPlantIndex', () => {
            setFocusedPlantIndex(5);
            expect($focusedPlantIndex.get()).toBe(5);

            setFocusedPlantIndex(-1);
            expect($focusedPlantIndex.get()).toBe(-1);

            setFocusedPlantIndex(0);
            expect($focusedPlantIndex.get()).toBe(0);
        });
    });

    describe('setMenuOpen', () => {
        it('should update $menuOpen', () => {
            setMenuOpen(true);
            expect($menuOpen.get()).toBe(true);

            setMenuOpen(false);
            expect($menuOpen.get()).toBe(false);
        });
    });

    describe('showToast', () => {
        it('should set notification with message and type', () => {
            showToast('Test message', 'success');

            const notification = $notification.get();
            expect(notification).toEqual({
                message: 'Test message',
                type: 'success'
            });
        });

        it('should default to info type', () => {
            showToast('Info message');

            const notification = $notification.get();
            expect(notification).toEqual({
                message: 'Info message',
                type: 'info'
            });
        });

        it('should handle error type', () => {
            showToast('Error occurred', 'error');

            expect($notification.get()?.type).toBe('error');
        });
    });

    describe('clearToast', () => {
        it('should clear notification', () => {
            $notification.set({ message: 'Test', type: 'info' });
            expect($notification.get()).not.toBeNull();

            clearToast();
            expect($notification.get()).toBeNull();
        });
    });

    describe('setDefaultApplied', () => {
        it('should update $defaultApplied', () => {
            setDefaultApplied(true);
            expect($defaultApplied.get()).toBe(true);

            setDefaultApplied(false);
            expect($defaultApplied.get()).toBe(false);
        });
    });
});
