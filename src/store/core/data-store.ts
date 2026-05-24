import { atom, onMount, WritableAtom, computed, ReadableAtom } from 'nanostores';
import {
  GrowspaceDevice,
  StrainEntry,
  GrowspaceManagerCardConfig,
  GrowspaceAPIResponse,
  NutrientPreset,
  IPMPreset,
} from '../../types';

export interface NutrientDataState {
  nutrientPresets: Record<string, NutrientPreset>;
  nutrientInventory: import('../../types').NutrientInventory | null;
  ecRampCurves: Record<string, import('../../schemas/api-schema').ECRampCurve>;
  isLoading: boolean;
}

export class GrowspaceDataStore {
  // Domain Data Atoms
  public readonly $devices: WritableAtom<GrowspaceDevice[]>;
  public readonly $strainLibrary: WritableAtom<StrainEntry[]>;
  public readonly $config: WritableAtom<GrowspaceManagerCardConfig>;
  public readonly $optimisticDeletedPlantIds: WritableAtom<Set<string>>;
  public readonly $wsDataCache: WritableAtom<Record<string, GrowspaceAPIResponse>>;
  /** Map from plantId to deviceId for O(1) lookups */
  public readonly $plantToDeviceMap: WritableAtom<Map<string, string>>;
  public readonly $nutrientPresets: WritableAtom<Record<string, NutrientPreset>>;
  public readonly $ipmPresets: WritableAtom<Record<string, IPMPreset>>;
  public readonly $nutrientInventory: WritableAtom<import('../../types').NutrientInventory | null>;
  public readonly $ecRampCurves: WritableAtom<Record<string, import('../../schemas/api-schema').ECRampCurve>>;
  public readonly $nutrientDataState: ReadableAtom<NutrientDataState>;
  /** Incremented by GrowspaceSharedStore when a push event requires a full data refresh. */
  public readonly $staleCounter: WritableAtom<number>;

  /** Indicates if store has active subscribers (for lazy loading) */
  private _isActive = false;

  constructor() {
    this.$devices = atom<GrowspaceDevice[]>([]);
    this.$staleCounter = atom<number>(0);
    this.$strainLibrary = atom<StrainEntry[]>([]);
    this.$config = atom<GrowspaceManagerCardConfig>({} as GrowspaceManagerCardConfig);
    this.$optimisticDeletedPlantIds = atom<Set<string>>(new Set());
    this.$wsDataCache = atom<Record<string, GrowspaceAPIResponse>>({});
    this.$plantToDeviceMap = atom<Map<string, string>>(new Map());
    this.$nutrientPresets = atom<Record<string, NutrientPreset>>({});
    this.$ipmPresets = atom<Record<string, IPMPreset>>({});
    this.$nutrientInventory = atom<import('../../types').NutrientInventory | null>(null);
    this.$ecRampCurves = atom<Record<string, import('../../schemas/api-schema').ECRampCurve>>({});

    this.$nutrientDataState = computed(
      [this.$nutrientPresets, this.$nutrientInventory, this.$ecRampCurves],
      (nutrientPresets, nutrientInventory, ecRampCurves) => ({
        nutrientPresets,
        nutrientInventory,
        ecRampCurves,
        isLoading: Object.keys(nutrientPresets).length === 0 && nutrientInventory === null,
      })
    );

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
        map.set(plantId, device.deviceId);
      }
    }
    this.$plantToDeviceMap.set(map);
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

  public setECRampCurves(curves: Record<string, import('../../schemas/api-schema').ECRampCurve>) {
    this.$ecRampCurves.set(curves);
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

  public patchDeviceIrrigationConfig(
    growspaceId: string,
    patch: Partial<import('../../services/types').IrrigationConfig>
  ) {
    const devices = this.$devices.get();
    const idx = devices.findIndex((d) => d.deviceId === growspaceId);
    if (idx === -1) return;
    const updated = devices.map((d, i) =>
      i === idx
        ? { ...d, irrigationConfig: { ...d.irrigationConfig, ...patch } }
        : d
    );
    this.$devices.set(updated);
  }

  public setWsDataCache(cache: Record<string, GrowspaceAPIResponse>) {
    const current = this.$wsDataCache.get();
    if (current === cache) return;

    const keysA = Object.keys(current);
    const keysB = Object.keys(cache);

    let changed = false;
    if (keysA.length !== keysB.length) {
      changed = true;
    } else {
      for (const key of keysB) {
        const valA = current[key];
        const valB = cache[key];

        if (!valA) {
          changed = true;
          break;
        }

        // Optimization: Use scalar timestamp check if available (O(1))
        if (valA._ts !== undefined && valB._ts !== undefined) {
          if (valA._ts !== valB._ts) {
            changed = true;
            break;
          }
        } else {
          // Fallback: Deep comparison for legacy data or if _ts missing (O(N))
          if (JSON.stringify(valA) !== JSON.stringify(valB)) {
            changed = true;
            break;
          }
        }
      }
    }

    if (changed) {
      this.$wsDataCache.set(cache);
    }
  }

  public updateWsDataCacheGrid(gsId: string, mutator: (grid: Record<string, any>) => void) {
    const currentCache = this.$wsDataCache.get();
    if (!currentCache[gsId]) return;

    const newCache = { ...currentCache };
    const gsEntry = newCache[gsId];
    const newPlantGrid = { ...gsEntry.grid?.grid };

    mutator(newPlantGrid);

    newCache[gsId] = {
      ...gsEntry,
      grid: { ...gsEntry.grid, grid: newPlantGrid },
    };
    this.$wsDataCache.set(newCache);
  }

  public removePlantFromWsCache(plantId: string, growspaceId?: string) {
    const currentCache = this.$wsDataCache.get();
    const newCache = { ...currentCache };
    let changed = false;

    const removeFn = (gsId: string) => {
      if (!newCache[gsId] || !newCache[gsId].grid?.grid) return;

      let gridChanged = false;
      const newGrid = { ...newCache[gsId].grid.grid };

      Object.keys(newGrid).forEach((key) => {
        const plant = newGrid[key];
        if (plant && (plant.plant_id === plantId || plant.entity_id?.endsWith(plantId))) {
          newGrid[key] = null;
          gridChanged = true;
        }
      });

      if (gridChanged) {
        newCache[gsId] = {
          ...newCache[gsId],
          grid: { ...newCache[gsId].grid, grid: newGrid },
        };
        changed = true;
      }
    };

    if (growspaceId) {
      removeFn(growspaceId);
    } else {
      // Optimization: Look up growspace ID from map instead of scanning everything

      const probableGrowspaceId = this.$plantToDeviceMap.get().get(plantId);
      if (probableGrowspaceId && newCache[probableGrowspaceId]) {
        removeFn(probableGrowspaceId);
      } else {
        // Fallback if map fails or inconsistent
        Object.keys(newCache).forEach((gsId) => removeFn(gsId));
      }
    }

    if (changed) {
      this.$wsDataCache.set(newCache);
    }
  }

  public addPlantEvent(plantId: string, event: import('../../types').PlantTimelineEvent) {
    const currentCache = this.$wsDataCache.get();
    const newCache = { ...currentCache };
    let changed = false;

    Object.keys(newCache).forEach((gsId) => {
      const grid = newCache[gsId].grid?.grid;
      if (!grid) return;

      Object.entries(grid).forEach(([key, plant]) => {
        if (plant && (plant.plant_id === plantId || plant.entity_id?.endsWith(plantId))) {
          // Create a deep copy of the plant data to avoid mutation
          const updatedPlant = { ...plant, events: [...(plant.events || []), event] };
          newCache[gsId] = {
            ...newCache[gsId],
            grid: {
              ...newCache[gsId].grid,
              grid: {
                ...newCache[gsId].grid.grid,
                [key]: updatedPlant,
              },
            },
          };
          changed = true;
        }
      });
    });

    if (changed) {
      this.$wsDataCache.set(newCache);
    }
  }

  public setNutrientInventory(inventory: import('../../types').NutrientInventory | null) {
    this.$nutrientInventory.set(inventory);
  }
}
