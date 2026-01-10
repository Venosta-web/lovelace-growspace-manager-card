import {
  GrowspaceDevice,
  GrowspaceType,
  PlantEntity,
  createGrowspaceDevice,
  PlantStage,
  GrowspaceAPIResponse,
  GrowspaceOverviewEntity,
  SerializedBiologicalMetrics,
  SerializedEnvironmentAttributes,
  SerializedStats,
} from '../types';

// Define keys for automatic extraction (DRY)
// These must match the keys produced by serializers.py
const BIO_KEYS: (keyof SerializedBiologicalMetrics)[] = [
  'vpd_status', 'vpd_target_min', 'vpd_target_max', 'vpd_danger_min',
  'vpd_danger_max', 'granular_stage', 'is_day', 'veg_week', 'flower_week', 'air_exchange'
];

const ENV_KEYS: (keyof SerializedEnvironmentAttributes)[] = [
  'temperature_sensor', 'humidity_sensor', 'vpd_sensor', 'co2_sensor',
  'soil_moisture_sensor', 'light_sensor', 'exhaust_entity', 'humidifier_entity',
  'dehumidifier_entity', 'dehumidifier_control_enabled', 'circulation_fan_entity',
  'dehumidifier_state', 'dehumidifier_thresholds', 'vpd', 'soil_moisture_value'
];

const STAT_KEYS: (keyof SerializedStats)[] = [
  'max_veg_days', 'max_flower_days', 'veg_week', 'flower_week',
  'max_stage_summary', 'total_plants'
];

export class GrowspaceAdapter {
  static transformGrowspace(
    overview: GrowspaceOverviewEntity | null,
    wsData: GrowspaceAPIResponse | null = null
  ): GrowspaceDevice | null {
    if (!wsData && !overview) return null;

    const growspace_id = wsData?.growspace_id || overview?.attributes.growspace_id || 'unknown';
    const name = wsData?.name || overview?.attributes.friendly_name || `Growspace ${growspace_id}`;
    const overview_entity_id = wsData?.overview_entity_id || overview?.entity_id || '';

    // 1. Loading State
    if (!wsData) {
      return createGrowspaceDevice({
        device_id: growspace_id,
        overview_entity_id: overview!.entity_id,
        name,
        last_updated: 'Loading...',
      });
    }

    // 2. Extract Groups using Utility Helper
    const biological_metrics = this.extractSubset<SerializedBiologicalMetrics>(wsData, BIO_KEYS);
    const environment_attributes = this.extractSubset<SerializedEnvironmentAttributes>(wsData, ENV_KEYS);
    const stats = this.extractSubset<SerializedStats>(wsData, STAT_KEYS);

    // 3. Transform Grid Dictionary to Plant Entity Array
    const plants: PlantEntity[] = [];
    if (wsData.grid) {
      Object.values(wsData.grid).forEach((slot) => {
        if (slot) {
          plants.push({
            entity_id: slot.entity_id,
            state: slot.stage || 'unknown',
            attributes: {
              ...slot, // Spread raw plant data
              row: Number(slot.row),
              col: Number(slot.col),
              growspace_id,
              friendly_name: `${slot.strain} ${slot.phenotype}`,
              stage: (slot.stage as PlantStage) || 'unknown',
            },
            last_changed: '',
            last_updated: '',
            context: { id: '', parent_id: null, user_id: null },
          });
        }
      });
    }

    // 4. Construct Device
    return createGrowspaceDevice({
      device_id: growspace_id,
      overview_entity_id,
      name,
      type: wsData.type || 'normal',
      rows: wsData.rows,
      plants_per_row: wsData.plants_per_row,
      notification_target: wsData.notification_target,
      last_updated: overview?.last_updated || new Date().toISOString(),

      // Structural Data
      plants,
      grid: wsData.grid,

      // Grouped Data
      biological_metrics,
      environment_attributes,
      stats,

      // Configs
      irrigation_config: wsData.irrigation_config,
      irrigation_strategy: wsData.irrigation_strategy || undefined,
      nutrient_presets: wsData.nutrient_presets,
      ipm_presets: wsData.ipm_presets,
    });
  }

  /**
   * Helper to extract specific keys from the flattened API response into a typed object.
   */
  private static extractSubset<T>(source: object, keys: (keyof T)[]): T {
    const result = {} as T;
    const src = source as Record<string, unknown>;
    keys.forEach((key) => {
      if (key in source) {
        result[key] = src[key as string] as T[keyof T];
      }
    });
    return result;
  }

  /** @deprecated */
  static transformToDevices(): GrowspaceDevice[] {
    return [];
  }
}
