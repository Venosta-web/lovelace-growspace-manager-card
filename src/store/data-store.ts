import { atom } from 'nanostores';
import { GrowspaceDevice, StrainEntry, GrowspaceManagerCardConfig, GrowspaceAPIResponse } from '../types';

// Domain Data Atoms
export const $devices = atom<GrowspaceDevice[]>([]);
export const $strainLibrary = atom<StrainEntry[]>([]);
export const $config = atom<GrowspaceManagerCardConfig>({} as GrowspaceManagerCardConfig);
export const $optimisticDeletedPlantIds = atom<Set<string>>(new Set());
export const $wsDataCache = atom<Record<string, GrowspaceAPIResponse>>({});

// Computed or derived state helpers can go here if needed
export const $selectedDevice = atom<string | null>(null);

// Actions (State setters)

export const setDevices = (devices: GrowspaceDevice[]) => {
    $devices.set(devices);
};

export const setSelectedDevice = (deviceId: string | null) => {
    $selectedDevice.set(deviceId);
};

export const setConfig = (config: GrowspaceManagerCardConfig) => {
    $config.set(config);
};

export const setStrainLibrary = (library: StrainEntry[]) => {
    $strainLibrary.set(library);
};

export const setOptimisticDeletedPlantIds = (ids: Set<string>) => {
    $optimisticDeletedPlantIds.set(ids);
};

export const addOptimisticDeletedPlantId = (id: string) => {
    const current = new Set($optimisticDeletedPlantIds.get());
    current.add(id);
    $optimisticDeletedPlantIds.set(current);
};

export const removeOptimisticDeletedPlantId = (id: string) => {
    const current = new Set($optimisticDeletedPlantIds.get());
    if (current.has(id)) {
        current.delete(id);
        $optimisticDeletedPlantIds.set(current);
    }
};

export const setWsDataCache = (cache: Record<string, GrowspaceAPIResponse>) => {
    $wsDataCache.set(cache);
};

export const updateWsDataCacheGrid = (gsId: string, mutator: (grid: Record<string, any>) => void) => {
    const currentCache = $wsDataCache.get();
    if (!currentCache[gsId]) return;

    const newCache = { ...currentCache };
    newCache[gsId] = { ...newCache[gsId] };
    const newGrid = { ...newCache[gsId].grid };
    newCache[gsId].grid = newGrid;

    mutator(newGrid);

    $wsDataCache.set(newCache);
};

export const removePlantFromWsCache = (plantId: string, growspaceId?: string) => {
    const currentCache = $wsDataCache.get();
    const newCache = { ...currentCache };
    let changed = false;

    const removeFn = (gsId: string) => {
        if (!newCache[gsId] || !newCache[gsId].grid) return;

        let gridChanged = false;
        const newGrid = { ...newCache[gsId].grid };

        Object.keys(newGrid).forEach(key => {
            const plant = newGrid[key];
            if (plant && (plant.plant_id === plantId || plant.entity_id?.endsWith(plantId))) {
                newGrid[key] = null;
                gridChanged = true;
            }
        });

        if (gridChanged) {
            newCache[gsId] = { ...newCache[gsId], grid: newGrid };
            changed = true;
        }
    };

    if (growspaceId) {
        removeFn(growspaceId);
    } else {
        Object.keys(newCache).forEach(gsId => removeFn(gsId));
    }

    if (changed) {
        $wsDataCache.set(newCache);
    }
};
