import { atom, computed, ReadableAtom, WritableAtom } from 'nanostores';
import { GrowspaceDataStore } from '../core/data-store';
import { PlantUtils } from '../../utils/plant-utils';
import { GrowspaceDevice, PlantEntity } from '../../types';

export interface GridLayout {
  effectiveRows: number;
  grid: (PlantEntity | null)[][];
}

export interface GridViewState {
  devices: GrowspaceDevice[];
  selectedDevice: string | null;
  gridLayout: GridLayout;
  growspaceOptions: Record<string, string>;
}

export class GrowspaceGridStore {
  /**
   * The currently selected growspace device ID. Kept per-card so that multiple
   * card instances on the same dashboard (e.g. a standalone card and a carousel
   * card) don't share selection state via the singleton shared store.
   */
  public readonly $selectedDevice: WritableAtom<string | null>;

  /**
   * Derived list of devices whose plants exclude any optimistically deleted IDs.
   */
  public readonly $activeDevices: ReadableAtom<GrowspaceDevice[]>;

  /**
   * Map of growspace device_id → device name for dropdown options, etc.
   */
  public readonly $growspaceOptions: ReadableAtom<Record<string, string>>;

  /**
   * Computed grid layout for the currently selected device.
   */
  public readonly $gridLayout: ReadableAtom<GridLayout>;

  /**
   * Single combined atom for all grid-related state. Replaces three separate
   * StoreController subscriptions in the root card — all three derived atoms
   * recompute together when devices change, so a single subscriber is correct.
   */
  public readonly $gridViewState: ReadableAtom<GridViewState>;

  constructor(dataStore: GrowspaceDataStore) {
    this.$selectedDevice = atom<string | null>(null);

    this.$activeDevices = computed(
      [dataStore.$devices, dataStore.$optimisticDeletedPlantIds],
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

    this.$growspaceOptions = computed(this.$activeDevices, (devices): Record<string, string> => {
      const options: Record<string, string> = {};
      for (const d of devices) {
        options[d.deviceId] = d.name;
      }
      return options;
    });

    this.$gridLayout = computed(
      [this.$activeDevices, this.$selectedDevice],
      (devices, selectedId): GridLayout => {
        if (!selectedId) {
          return { effectiveRows: 0, grid: [] };
        }
        const device = devices.find((d) => d.deviceId === selectedId);
        if (!device) {
          return { effectiveRows: 0, grid: [] };
        }
        const effectiveRows = PlantUtils.calculateEffectiveRows(device);
        const { grid } = PlantUtils.createGridLayout(
          device.plants,
          effectiveRows,
          device.plantsPerRow
        );
        return { effectiveRows, grid };
      }
    );

    this.$gridViewState = computed(
      [this.$activeDevices, this.$gridLayout, this.$growspaceOptions, this.$selectedDevice],
      (devices, gridLayout, growspaceOptions, selectedDevice): GridViewState => ({
        devices,
        selectedDevice,
        gridLayout,
        growspaceOptions,
      })
    );
  }

  public setSelectedDevice(deviceId: string | null): void {
    this.$selectedDevice.set(deviceId);
  }
}
