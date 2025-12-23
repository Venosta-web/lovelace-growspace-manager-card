import { computed } from 'nanostores';
import { $devices, $selectedDevice, $optimisticDeletedPlantIds } from './data-store';
import { PlantUtils } from '../utils/plant-utils';
import { GrowspaceDevice, PlantEntity } from '../types';

/**
 * Derived list of devices whose plants exclude any optimistically deleted IDs.
 */
export const $activeDevices = computed(
    [$devices, $optimisticDeletedPlantIds],
    (devices, deletedIds): GrowspaceDevice[] => {
        return devices.map((d) => ({
            ...d,
            plants: d.plants.filter((p) => {
                const pId = p.attributes.plant_id || p.entity_id.replace('sensor.', '');
                return !deletedIds.has(pId);
            }),
        }));
    }
);

/**
 * Map of growspace device_id → device name for dropdown options, etc.
 */
export const $growspaceOptions = computed(
    $activeDevices,
    (devices): Record<string, string> => {
        const options: Record<string, string> = {};
        for (const d of devices) {
            options[d.device_id] = d.name;
        }
        return options;
    }
);

export interface GridLayout {
    effectiveRows: number;
    grid: (PlantEntity | null)[][];
}

/**
 * Computed grid layout for the currently selected device.
 */
export const $gridLayout = computed(
    [$activeDevices, $selectedDevice],
    (devices, selectedId): GridLayout => {
        if (!selectedId) {
            return { effectiveRows: 0, grid: [] };
        }
        const device = devices.find((d) => d.device_id === selectedId);
        if (!device) {
            return { effectiveRows: 0, grid: [] };
        }
        const effectiveRows = PlantUtils.calculateEffectiveRows(device);
        const { grid } = PlantUtils.createGridLayout(
            device.plants,
            effectiveRows,
            device.plants_per_row
        );
        return { effectiveRows, grid };
    }
);
