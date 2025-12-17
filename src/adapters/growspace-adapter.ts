import { HassEntity } from 'home-assistant-js-websocket';
import {
  GrowspaceDevice,
  GrowspaceType,
  PlantEntity,
  createGrowspaceDevice,
  PlantStage,
  GrowspaceAPIResponse,
  GrowspaceOverviewEntity,
  IrrigationTime,
  IrrigationStrategy,
} from '../types';

export class GrowspaceAdapter {
  static transformGrowspace(
    overview: GrowspaceOverviewEntity,
    wsData: GrowspaceAPIResponse | null = null
  ): GrowspaceDevice | null {
    const attributes = overview.attributes;
    const growspace_id = attributes.growspace_id;
    const name = attributes.friendly_name || `Growspace ${growspace_id}`;

    // Default type if unknown
    const type: GrowspaceType = (attributes.type as GrowspaceType) || 'normal';

    // 1. Missing WebSocket Data -> Return Loading/Skeleton State
    // The UI should see this as a valid device but with empty/loading data.
    if (!wsData) {
      return createGrowspaceDevice({
        device_id: growspace_id,
        overview_entity_id: overview.entity_id,
        name,
        type,
        plants: [],
        rows: attributes.rows || 3,
        plants_per_row: attributes.plants_per_row || 3,
        last_updated: 'Loading...',
        biological_metrics: {
          vpd_status: 'unknown',
          granular_stage: 'unknown',
          is_day: false,
          vpd_target_min: 0,
          vpd_target_max: 0,
          vpd_danger_min: 0,
          vpd_danger_max: 0,
          veg_week: 0,
          flower_week: 0,
          air_exchange: '0',
        },
        irrigation_times: [],
        drain_times: [],
        irrigation_config: {
          irrigation_pump_entity: '',
          drain_pump_entity: '',
          irrigation_duration: 0,
          drain_duration: 0,
        },
        environment_attributes: {},
        stats: {
          max_veg_days: 0,
          max_flower_days: 0,
          veg_week: 0,
          flower_week: 0,
          total_plants: 0,
          max_stage_summary: '',
        },
      });
    }

    // 2. Map Flat API Data STRICTLY
    const {
      // Root Props
      grid,
      rows,
      plants_per_row,
      notification_target,

      // Configs
      irrigation_config,
      irrigation_strategy,

      // Statistics (Root -> Stats)
      max_veg_days,
      max_flower_days,
      veg_week,
      flower_week,
      max_stage_summary,
      total_plants,

      // Biological Metrics (Root -> Bio)
      vpd_status,
      vpd_target_min,
      vpd_target_max,
      vpd_danger_min,
      vpd_danger_max,
      granular_stage,
      is_day,
      air_exchange,

      // Environment Sensors (Root -> Env)
      temperature_sensor,
      humidity_sensor,
      vpd_sensor,
      co2_sensor,
      soil_moisture_sensor,
      exhaust_sensor,
      humidifier_sensor,
      light_sensor,

      // Environment States (Root -> Env)
      dehumidifier_entity,
      dehumidifier_state,
      dehumidifier_humidity,
      dehumidifier_current_humidity,
      dehumidifier_mode,
      dehumidifier_control_enabled,
      exhaust_entity,
      exhaust_state,
      humidifier_entity,
      humidifier_state,
      circulation_fan_entity,
      circulation_fan_state,
    } = wsData;

    // --- Plants Mapping ---
    const plants: PlantEntity[] = [];
    if (grid) {
      Object.entries(grid).forEach(([key, slot]) => {
        if (slot) {
          plants.push({
            entity_id: slot.entity_id,
            state: slot.stage || 'unknown',
            attributes: {
              ...slot,
              growspace_id,
              friendly_name: `${slot.strain} ${slot.phenotype}`,
              stage: slot.stage as PlantStage,
            },
            last_changed: '',
            last_updated: '',
            context: { id: '', parent_id: null, user_id: null },
          });
        }
      });
    }

    // --- Biological Metrics Grouping ---
    const biological_metrics = {
      vpd_status,
      vpd_target_min,
      vpd_target_max,
      vpd_danger_min,
      vpd_danger_max,
      granular_stage,
      is_day,
      veg_week,
      flower_week,
      air_exchange,
    };

    // --- Environment Attributes Grouping ---
    const environment_attributes = {
      temperature_sensor,
      humidity_sensor,
      vpd_sensor,
      co2_sensor,
      soil_moisture_sensor,
      exhaust_sensor,
      humidifier_sensor,
      light_sensor,
      dehumidifier_entity,
      dehumidifier_state,
      dehumidifier_humidity,
      dehumidifier_current_humidity,
      dehumidifier_mode,
      dehumidifier_control_enabled,
      exhaust_entity,
      exhaust_state,
      humidifier_entity,
      humidifier_state,
      circulation_fan_entity,
      circulation_fan_state,
    };

    // --- Stats Grouping ---
    const stats = {
      max_veg_days,
      max_flower_days,
      veg_week,
      flower_week,
      total_plants,
      max_stage_summary,
    };

    // --- Irrigation (Strictly from config) ---
    const irrigation_times = irrigation_config?.irrigation_times || [];
    const drain_times = irrigation_config?.drain_times || [];

    return createGrowspaceDevice({
      device_id: growspace_id,
      overview_entity_id: overview.entity_id,
      name,
      plants,
      rows: rows,
      plants_per_row: plants_per_row,
      type: type as GrowspaceType,
      last_updated: overview.last_updated,
      biological_metrics,
      irrigation_times,
      drain_times,
      irrigation_config,
      irrigation_strategy: irrigation_strategy || undefined,
      environment_attributes,
      stats,
      // Top-level stats (optional, but requested for strict match if interface demands)
      max_veg_days,
      max_flower_days,
      total_plants,
      max_stage_summary
    });
  }

  /**
   * @deprecated Relies on attributes that are often empty. Use DataService.getGrowspaceDevices instead which uses WS data.
   */
  static transformToDevices(allStates: HassEntity[]): GrowspaceDevice[] {
    // Legacy method stub - effectively disabled or returning empty if we enforce strict WS usage
    return [];
  }
}
