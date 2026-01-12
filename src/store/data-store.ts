import { atom, onMount, WritableAtom } from 'nanostores';
import { GrowspaceDevice, StrainEntry, GrowspaceManagerCardConfig, GrowspaceAPIResponse, NutrientPreset, IPMPreset } from '../types';

export class GrowspaceDataStore {
    // Domain Data Atoms
    public readonly $devices: WritableAtom<GrowspaceDevice[]>;
    public readonly $strainLibrary: WritableAtom<StrainEntry[]>;
    public readonly $config: WritableAtom<GrowspaceManagerCardConfig>;
    public readonly $optimisticDeletedPlantIds: WritableAtom<Set<string>>;
    public readonly $wsDataCache: WritableAtom<Record<string, GrowspaceAPIResponse>>;
    public readonly $selectedDevice: WritableAtom<string | null>;
    /** Map from plantId to deviceId for O(1) lookups */
    public readonly $plantToDeviceMap: WritableAtom<Map<string, string>>;
    public readonly $nutrientPresets: WritableAtom<Record<string, NutrientPreset>>;
    public readonly $ipmPresets: WritableAtom<Record<string, IPMPreset>>;

    /** Indicates if store has active subscribers (for lazy loading) */
    private _isActive = false;

    constructor() {
        this.$devices = atom<GrowspaceDevice[]>([]);
        this.$strainLibrary = atom<StrainEntry[]>([]);
        this.$config = atom<GrowspaceManagerCardConfig>({} as GrowspaceManagerCardConfig);
        this.$optimisticDeletedPlantIds = atom<Set<string>>(new Set());
        this.$wsDataCache = atom<Record<string, GrowspaceAPIResponse>>({});
        this.$selectedDevice = atom<string | null>(null);
        this.$plantToDeviceMap = atom<Map<string, string>>(new Map());
        this.$nutrientPresets = atom<Record<string, NutrientPreset>>({});
        this.$ipmPresets = atom<Record<string, IPMPreset>>({});

        // Lazy initialization: only log activity when store has subscribers
        onMount(this.$devices, () => {
            this._isActive = true;
            console.debug('[GrowspaceDataStore] Mounted - subscribers connected');
            return () => {
                this._isActive = false;
                console.debug('[GrowspaceDataStore] Unmounted - cleaning up');
            };
        });
    }

    /** Check if store has active subscribers */
    public get isActive(): boolean {
        return this._isActive;
    }

    // Actions (State setters)

    public setDevices(devices: GrowspaceDevice[]) {
        this.$devices.set(devices);
        // Rebuild plant-to-device map for O(1) lookups
        const map = new Map<string, string>();
        for (const device of devices) {
            if (!device.plants) continue;
            for (const plant of device.plants) {
                const plantId = plant.attributes.plant_id || plant.entity_id.replace('sensor.', '');
                map.set(plantId, device.device_id);
            }
        }
        this.$plantToDeviceMap.set(map);
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

    public setNutrientPresets(presets: Record<string, NutrientPreset>) {
        this.$nutrientPresets.set(presets);
    }

    public setIPMPresets(presets: Record<string, IPMPreset>) {
        this.$ipmPresets.set(presets);
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
        // Optimization: check if data changed before updating cache
        if (JSON.stringify(this.$wsDataCache.get()) === JSON.stringify(cache)) return;
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
            // Optimization: Look up growspace ID from map instead of scanning everything
            const deviceId = this.$plantToDeviceMap.get().get(plantId);

            const probableGrowspaceId = this.$plantToDeviceMap.get().get(plantId);
            if (probableGrowspaceId && newCache[probableGrowspaceId]) {
                removeFn(probableGrowspaceId);
            } else {
                // Fallback if map fails or inconsistent
                Object.keys(newCache).forEach(gsId => removeFn(gsId));
            }
        }

        if (changed) {
            this.$wsDataCache.set(newCache);
        }
    }

    public addPlantEvent(plantId: string, event: import('../types').PlantTimelineEvent) {
        const currentCache = this.$wsDataCache.get();
        const newCache = { ...currentCache };
        let changed = false;

        Object.keys(newCache).forEach(gsId => {
            const grid = newCache[gsId].grid;
            if (!grid) return;

            Object.entries(grid).forEach(([key, plant]) => {
                if (plant && (plant.plant_id === plantId || plant.entity_id?.endsWith(plantId))) {
                    // Create a deep copy of the plant data to avoid mutation
                    const updatedPlant = { ...plant, events: [...(plant['events'] || []), event] };
                    newCache[gsId] = {
                        ...newCache[gsId],
                        grid: {
                            ...newCache[gsId].grid,
                            [key]: updatedPlant
                        }
                    };
                    changed = true;
                }
            });
        });

        if (changed) {
            this.$wsDataCache.set(newCache);
        }
    }
}
