import { atom } from 'nanostores';
import { GrowspaceDevice, StrainEntry, GrowspaceManagerCardConfig } from '../types';

// Domain Data Atoms
export const $devices = atom<GrowspaceDevice[]>([]);
export const $strainLibrary = atom<StrainEntry[]>([]);
export const $config = atom<GrowspaceManagerCardConfig>({} as GrowspaceManagerCardConfig);
export const $optimisticDeletedPlantIds = atom<Set<string>>(new Set());

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
