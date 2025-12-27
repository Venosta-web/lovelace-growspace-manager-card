import { atom, WritableAtom } from 'nanostores';
import { GrowspaceDevice, StrainEntry, GrowspaceManagerCardConfig, GrowspaceAPIResponse } from '../types';

export class GrowspaceDataStore {
    // Domain Data Atoms
    public readonly $devices: WritableAtom<GrowspaceDevice[]>;
    public readonly $strainLibrary: WritableAtom<StrainEntry[]>;
    public readonly $config: WritableAtom<GrowspaceManagerCardConfig>;
    public readonly $optimisticDeletedPlantIds: WritableAtom<Set<string>>;
    public readonly $wsDataCache: WritableAtom<Record<string, GrowspaceAPIResponse>>;
    public readonly $selectedDevice: WritableAtom<string | null>;

    constructor() {
        this.$devices = atom<GrowspaceDevice[]>([]);
        this.$strainLibrary = atom<StrainEntry[]>([]);
        this.$config = atom<GrowspaceManagerCardConfig>({} as GrowspaceManagerCardConfig);
        this.$optimisticDeletedPlantIds = atom<Set<string>>(new Set());
        this.$wsDataCache = atom<Record<string, GrowspaceAPIResponse>>({});
        this.$selectedDevice = atom<string | null>(null);
    }

    // Actions (State setters)

    public setDevices(devices: GrowspaceDevice[]) {
        this.$devices.set(devices);
    }

    public setSelectedDevice(deviceId: string | null) {
        this.$selectedDevice.set(deviceId);
    }

    public setConfig(config: GrowspaceManagerCardConfig) {
        this.$config.set(config);
    }

    public setStrainLibrary(library: StrainEntry[]) {
        this.$strainLibrary.set(library);
    }

    public setOptimisticDeletedPlantIds(ids: Set<string>) {
        this.$optimisticDeletedPlantIds.set(ids);
    }

    public addOptimisticDeletedPlantId(id: string) {
        const current = new Set(this.$optimisticDeletedPlantIds.get());
        current.add(id);
        this.$optimisticDeletedPlantIds.set(current);
    }

    public removeOptimisticDeletedPlantId(id: string) {
        const current = new Set(this.$optimisticDeletedPlantIds.get());
        if (current.has(id)) {
            current.delete(id);
            this.$optimisticDeletedPlantIds.set(current);
        }
    }

    public setWsDataCache(cache: Record<string, GrowspaceAPIResponse>) {
        this.$wsDataCache.set(cache);
    }

    public updateWsDataCacheGrid(gsId: string, mutator: (grid: Record<string, any>) => void) {
        const currentCache = this.$wsDataCache.get();
        if (!currentCache[gsId]) return;

        const newCache = { ...currentCache };
        newCache[gsId] = { ...newCache[gsId] };
        const newGrid = { ...newCache[gsId].grid };
        newCache[gsId].grid = newGrid;

        mutator(newGrid);

        this.$wsDataCache.set(newCache);
    }

    public removePlantFromWsCache(plantId: string, growspaceId?: string) {
        const currentCache = this.$wsDataCache.get();
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
            this.$wsDataCache.set(newCache);
        }
    }
}
