import { atom, computed } from 'nanostores';
import { GrowspaceViewMode } from '../types';
import { ActiveDialogState } from '../ui-state';

// Definition of atoms
export const $viewMode = atom<GrowspaceViewMode>('standard');
export const $isLoading = atom<boolean>(true);
export const $activeDialog = atom<ActiveDialogState>({ type: 'NONE' });
export const $isEditMode = atom<boolean>(false);
export const $selectedPlants = atom<Set<string>>(new Set());
export const $focusedPlantIndex = atom<number>(-1);
export const $menuOpen = atom<boolean>(false);
export const $notification = atom<{ message: string; type: 'info' | 'error' | 'success' } | null>(null);
export const $defaultApplied = atom<boolean>(false);

// Computed stores
export const $isCompactView = computed($viewMode, (mode) => mode === 'compact');

// Actions
export const setViewMode = (mode: GrowspaceViewMode) => {
    $viewMode.set(mode);
};

export const setIsLoading = (loading: boolean) => {
    $isLoading.set(loading);
};

export const setActiveDialog = (dialog: ActiveDialogState) => {
    $activeDialog.set(dialog);
};

export const closeDialog = () => {
    $activeDialog.set({ type: 'NONE' });
};

export const setEditMode = (isEdit: boolean) => {
    $isEditMode.set(isEdit);
    // Clear selection when exiting edit mode
    if (!isEdit) {
        $selectedPlants.set(new Set());
    }
};

export const togglePlantSelection = (plantId: string) => {
    const current = new Set($selectedPlants.get());
    if (current.has(plantId)) {
        current.delete(plantId);
    } else {
        current.add(plantId);
    }
    $selectedPlants.set(current);
};

export const selectAllPlants = (plantIds: string[]) => {
    $selectedPlants.set(new Set(plantIds));
};

export const clearPlantSelection = () => {
    $selectedPlants.set(new Set());
};

export const setFocusedPlantIndex = (index: number) => {
    $focusedPlantIndex.set(index);
};

export const setMenuOpen = (isOpen: boolean) => {
    $menuOpen.set(isOpen);
};

export const showToast = (message: string, type: 'info' | 'error' | 'success' = 'info') => {
    $notification.set({ message, type });
    // Auto-dismiss logic could be here or in component, but typically atoms just hold state.
    // The component usually handles the duration behavior using setTimeout.
};

export const clearToast = () => {
    $notification.set(null);
};

export const setDefaultApplied = (applied: boolean) => {
    $defaultApplied.set(applied);
};
