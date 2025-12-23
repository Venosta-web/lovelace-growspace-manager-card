/**
 * Dialog Actions - Functions for opening and managing dialogs.
 * These are thin wrappers around uiStore.setActiveDialog() to provide
 * a cleaner API and centralize dialog opening logic.
 */

import { PlantEntity, GrowspaceDevice } from '../types';
import { setActiveDialog, closeDialog as closeDialogAction, $activeDialog } from './ui-store';
import { $selectedDevice, $devices, $optimisticDeletedPlantIds } from './data-store';

/**
 * Open the plant overview dialog for viewing/editing a plant.
 */
export function openPlantOverviewDialog(plant: PlantEntity, selectedIds?: string[]): void {
    setActiveDialog({
        type: 'PLANT_OVERVIEW',
        payload: {
            plant,
            editedAttributes: { ...plant.attributes },
            activeTab: 'dashboard',
            selectedPlantIds: selectedIds,
        },
    });
}

/**
 * Open the add plant dialog at a specific grid position.
 * If row/col not provided, finds the first empty slot automatically.
 */
export function openAddPlantDialog(row?: number, col?: number): { row: number; col: number } {
    // If row/col specified, use them
    if (row !== undefined && col !== undefined) {
        setActiveDialog({
            type: 'ADD_PLANT',
            payload: { row, col },
        });
        return { row, col };
    }

    const selectedDeviceId = $selectedDevice.get();
    if (!selectedDeviceId) {
        return { row: 0, col: 0 };
    }

    // Auto-find first empty slot
    const devices = $devices.get();
    const device = devices.find(d => d.device_id === selectedDeviceId);

    let targetRow = 0;
    let targetCol = 0;

    if (device) {
        const occupied = new Set<string>();
        const deleted = $optimisticDeletedPlantIds.get();

        device.plants.forEach(p => {
            const pId = p.attributes.plant_id || p.entity_id.replace('sensor.', '');
            if (deleted.has(pId)) return;

            // Attributes are 1-based, grid is 0-based
            const r = (p.attributes.row !== undefined ? p.attributes.row : 1) - 1;
            const c = (p.attributes.col !== undefined ? p.attributes.col : 1) - 1;
            occupied.add(`${r},${c}`);
        });

        let found = false;
        const rows = device.rows || 4;
        const cols = device.plants_per_row || 4;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (!occupied.has(`${r},${c}`)) {
                    targetRow = r;
                    targetCol = c;
                    found = true;
                    break;
                }
            }
            if (found) break;
        }
    }

    setActiveDialog({
        type: 'ADD_PLANT',
        payload: { row: targetRow, col: targetCol },
    });

    return { row: targetRow, col: targetCol };
}

/**
 * Open the strain recommendation dialog.
 */
export function openStrainRecommendationDialog(): void {
    setActiveDialog({
        type: 'STRAIN_RECOMMENDATION',
        payload: { isLoading: false, response: null },
    });
}

/**
 * Open the logbook dialog for the currently selected growspace.
 */
export function openLogbookDialog(): boolean {
    const growspaceId = $selectedDevice.get();
    if (growspaceId) {
        setActiveDialog({
            type: 'LOGBOOK',
            payload: { growspaceId },
        });
        return true;
    }
    return false;
}

/**
 * Open the strain library dialog.
 */
export function openStrainLibraryDialog(): void {
    setActiveDialog({
        type: 'STRAIN_LIBRARY',
        payload: { isEditing: false },
    });
}

/**
 * Open the Grow Master AI dialog.
 */
export function openGrowMasterDialog(): boolean {
    const growspaceId = $selectedDevice.get();
    if (!growspaceId) return false;

    setActiveDialog({
        type: 'GROW_MASTER',
        payload: {
            growspaceId,
            isLoading: false,
            response: null,
            mode: 'single',
        },
    });
    return true;
}

/**
 * Open the irrigation settings dialog.
 */
export function openIrrigationDialog(): void {
    setActiveDialog({
        type: 'IRRIGATION',
        payload: {},
    });
}

// Re-export closeDialog for convenience
export { closeDialogAction as closeDialog };
