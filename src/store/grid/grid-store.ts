import { computed, ReadableAtom } from 'nanostores';
import { GrowspaceDataStore } from '../core/data-store';
import { PlantUtils } from '../../utils/plant-utils';
import { GrowspaceDevice, PlantEntity } from '../../types';

export interface GridLayout {
  effectiveRows: number;
  grid: (PlantEntity | null)[][];
}

export class GrowspaceGridStore {
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

  constructor(dataStore: GrowspaceDataStore) {
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
      [this.$activeDevices, dataStore.$selectedDevice],
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
  }
}
