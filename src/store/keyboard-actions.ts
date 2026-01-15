/**
 * Keyboard Actions - Pure functions for keyboard navigation.
 * Encapsulates keyboard shortcuts and navigation logic without coupling to store lifecycle.
 */

import { PlantEntity } from '../types';
import { ActionContext } from './action-context';
import * as uiActions from './ui-actions';
import * as plantActions from './plant-actions';

/**
 * Get the currently visible plants for the selected device.
 * Excludes plants that are marked for optimistic deletion.
 */
function getVisiblePlants(ctx: ActionContext): PlantEntity[] {
    const selectedDevice = ctx.data.$selectedDevice.get();
    if (!selectedDevice) return [];

    const devices = ctx.data.$devices.get();
    const device = devices.find((d) => d.device_id === selectedDevice);
    if (!device) return [];

    return device.plants.filter(
        (p) => !ctx.data.$optimisticDeletedPlantIds.get().has(p.attributes.plant_id || '')
    );
}

/**
 * Handle keyboard navigation for the growspace grid.
 * Supports arrow key navigation, enter/space for selection, and delete/backspace for removal.
 */
export function handleKeyboardNavigation(
    ctx: ActionContext,
    key: string
): void {
    // Escape exits edit mode
    if (ctx.ui.$isEditMode.get() && key === 'Escape') {
        uiActions.exitEditMode(ctx);
        return;
    }

    const plants = getVisiblePlants(ctx);
    if (plants.length === 0) return;

    const currentIndex = ctx.ui.$focusedPlantIndex.get();

    switch (key) {
        case 'ArrowRight':
            ctx.ui.setFocusedPlantIndex((currentIndex + 1) % plants.length);
            break;

        case 'ArrowLeft':
            ctx.ui.setFocusedPlantIndex((currentIndex - 1 + plants.length) % plants.length);
            break;

        case 'Enter':
        case ' ':
            if (currentIndex >= 0 && currentIndex < plants.length) {
                uiActions.handlePlantClick(ctx, plants[currentIndex]);
            }
            break;

        case 'Delete':
        case 'Backspace':
            if (currentIndex >= 0 && currentIndex < plants.length) {
                const focusedPlant = plants[currentIndex];
                const plantId = focusedPlant.attributes.plant_id; // Check if this is the correct ID access
                // logic in plant-actions implies we pass IDs.
                // In plantActions.handleDeletePlant, it expects string or string[].
                // But in original keyboard-actions it passed entity_id. Let's check plant type.
                // Looking at getVisiblePlants above, plants are PlantEntity.
                // PlantEntity has entity_id and attributes. attributes has plant_id.
                // The handleDeletePlant in plant-actions checks for plant_id or entity_id.
                // Let's pass the ID we can find.
                const idToDelete = focusedPlant.attributes.plant_id || focusedPlant.entity_id;
                plantActions.handleDeletePlant(ctx, idToDelete);
            } else if (ctx.ui.$selectedPlants.get().size > 0) {
                // If multiple plants are selected, delete them
                plantActions.handleDeletePlant(ctx, Array.from(ctx.ui.$selectedPlants.get()));
            }
            break;
    }
}
