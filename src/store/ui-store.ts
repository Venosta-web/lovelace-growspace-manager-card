import { atom, computed, WritableAtom, ReadableAtom } from 'nanostores';
import { GrowspaceViewMode } from '../types';
import { ActiveDialogState } from '../ui-state';

export class GrowspaceUIStore {
    // Definition of atoms
    public readonly $viewMode: WritableAtom<GrowspaceViewMode>;
    public readonly $isLoading: WritableAtom<boolean>;
    public readonly $activeDialog: WritableAtom<ActiveDialogState>;
    public readonly $isEditMode: WritableAtom<boolean>;
    public readonly $selectedPlants: WritableAtom<Set<string>>;
    public readonly $focusedPlantIndex: WritableAtom<number>;
    public readonly $menuOpen: WritableAtom<boolean>;
    public readonly $notification: WritableAtom<{ message: string; type: 'info' | 'error' | 'success' } | null>;
    public readonly $error: WritableAtom<string | null>;
    public readonly $defaultApplied: WritableAtom<boolean>;

    // Computed stores
    public readonly $isCompactView: ReadableAtom<boolean>;

    constructor() {
        this.$viewMode = atom<GrowspaceViewMode>('standard');
        this.$isLoading = atom<boolean>(true);
        this.$activeDialog = atom<ActiveDialogState>({ type: 'NONE' });
        this.$isEditMode = atom<boolean>(false);
        this.$selectedPlants = atom<Set<string>>(new Set());
        this.$focusedPlantIndex = atom<number>(-1);
        this.$menuOpen = atom<boolean>(false);
        this.$notification = atom<{ message: string; type: 'info' | 'error' | 'success' } | null>(null);
        this.$error = atom<string | null>(null);
        this.$defaultApplied = atom<boolean>(false);

        this.$isCompactView = computed(this.$viewMode, (mode) => mode === 'compact');
    }

    // Actions
    public setViewMode(mode: GrowspaceViewMode) {
        this.$viewMode.set(mode);
    }

    public setIsLoading(loading: boolean) {
        this.$isLoading.set(loading);
    }

    public setActiveDialog(dialog: ActiveDialogState) {
        this.$activeDialog.set(dialog);
    }

    public closeDialog() {
        this.$activeDialog.set({ type: 'NONE' });
    }

    public setEditMode(isEdit: boolean) {
        this.$isEditMode.set(isEdit);
        // Clear selection when exiting edit mode
        if (!isEdit) {
            this.$selectedPlants.set(new Set());
        }
    }

    public togglePlantSelection(plantId: string) {
        const current = new Set(this.$selectedPlants.get());
        if (current.has(plantId)) {
            current.delete(plantId);
        } else {
            current.add(plantId);
        }
        this.$selectedPlants.set(current);
    }

    public selectAllPlants(plantIds: string[]) {
        this.$selectedPlants.set(new Set(plantIds));
    }

    public clearPlantSelection() {
        this.$selectedPlants.set(new Set());
    }

    public setFocusedPlantIndex(index: number) {
        this.$focusedPlantIndex.set(index);
    }

    public setMenuOpen(isOpen: boolean) {
        this.$menuOpen.set(isOpen);
    }

    public showToast(message: string, type: 'info' | 'error' | 'success' = 'info') {
        this.$notification.set({ message, type });
    }

    public clearToast() {
        this.$notification.set(null);
    }

    public setDefaultApplied(applied: boolean) {
        this.$defaultApplied.set(applied);
    }

    public setError(error: string | null) {
        this.$error.set(error);
    }
}
