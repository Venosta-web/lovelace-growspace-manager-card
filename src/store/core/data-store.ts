import { atom, onMount, WritableAtom, computed, ReadableAtom } from 'nanostores';
import {
  GrowspaceDevice,
  StrainEntry,
  GrowspaceManagerCardConfig,
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
  /** Map from plantId to deviceId for O(1) lookups */
  public readonly $plantToDeviceMap: WritableAtom<Map<string, string>>;
  public readonly $nutrientPresets: WritableAtom<Record<string, NutrientPreset>>;
  public readonly $ipmPresets: WritableAtom<Record<string, IPMPreset>>;
  public readonly $nutrientInventory: WritableAtom<import('../../types').NutrientInventory | null>;
  public readonly $ecRampCurves: WritableAtom<
    Record<string, import('../../schemas/api-schema').ECRampCurve>
  >;
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
      i === idx ? { ...d, irrigationConfig: { ...d.irrigationConfig, ...patch } } : d
    );
    this.$devices.set(updated);
  }

  public setNutrientInventory(inventory: import('../../types').NutrientInventory | null) {
    this.$nutrientInventory.set(inventory);
  }
}
