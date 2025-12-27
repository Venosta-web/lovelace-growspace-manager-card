/**
 * Keyboard Actions - Pure functions for keyboard navigation.
 * Encapsulates keyboard shortcuts and navigation logic without coupling to store lifecycle.
 */

import { PlantEntity } from '../types';
import { GrowspaceUIStore } from './ui-store';
import { GrowspaceDataStore } from './data-store';

export interface KeyboardActionContext {
    exitEditMode: () => void;
    handlePlantClick: (plant: PlantEntity) => void;
    handleDeletePlant: (plantId: string | string[]) => void;
}

/**
 * Get the currently visible plants for the selected device.
 * Excludes plants that are marked for optimistic deletion.
 */
function getVisiblePlants(dataStore: GrowspaceDataStore): PlantEntity[] {
    const selectedDevice = dataStore.$selectedDevice.get();
    if (!selectedDevice) return [];

    const devices = dataStore.$devices.get();
    const device = devices.find((d) => d.device_id === selectedDevice);
    if (!device) return [];

    return device.plants.filter(
        (p) => !dataStore.$optimisticDeletedPlantIds.get().has(p.attributes.plant_id || '')
    );
}

/**
 * Handle keyboard navigation for the growspace grid.
 * Supports arrow key navigation, enter/space for selection, and delete/backspace for removal.
 */
export function handleKeyboardNavigation(
    ctx: KeyboardActionContext,
    key: string,
    uiStore: GrowspaceUIStore,
    dataStore: GrowspaceDataStore
): void {
    // Escape exits edit mode
    if (uiStore.$isEditMode.get() && key === 'Escape') {
        ctx.exitEditMode();
        return;
    }

    const plants = getVisiblePlants(dataStore);
    if (plants.length === 0) return;

    const currentIndex = uiStore.$focusedPlantIndex.get();

    switch (key) {
        case 'ArrowRight':
            uiStore.setFocusedPlantIndex((currentIndex + 1) % plants.length);
            break;

        case 'ArrowLeft':
            uiStore.setFocusedPlantIndex((currentIndex - 1 + plants.length) % plants.length);
            break;

        case 'Enter':
        case ' ':
            if (currentIndex >= 0 && currentIndex < plants.length) {
                ctx.handlePlantClick(plants[currentIndex]);
            }
            break;

        case 'Delete':
        case 'Backspace':
            if (currentIndex >= 0 && currentIndex < plants.length) {
                const focusedPlant = plants[currentIndex];
                if (focusedPlant) {
                    ctx.handleDeletePlant(focusedPlant.entity_id);
                }
            } else if (uiStore.$selectedPlants.get().size > 0) {
                // If multiple plants are selected, delete them
                ctx.handleDeletePlant(Array.from(uiStore.$selectedPlants.get()));
            }
            break;
    }
}
