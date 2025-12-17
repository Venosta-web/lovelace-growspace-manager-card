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

    // 1. Fallback / Check
    // If we have no WS data, we might try attributes, but strict mode prefers WS.
    // If WS data is missing, we return null or minimal data.
    // However, for immediate UI feedback we might need attributes.
    // Given the strict refactor request, we prioritize mapping wsData.

    if (!wsData) {
      // Legacy fallback or just return null if we enforce strict data?
      // "Input: sensorEntity ... and wsData"
      // Detailed mapping depends on wsData structure.
      // If wsData is null, let's look at attributes minimally or return null.
      // Current behavior was: return null if attributes.grid is also empty.
      return null;
    }

    const {
      growspace_id,
      name,
      type,
      rows,
      plants_per_row,
      notification_target,
      grid,
      // Configs
      irrigation_config,
      irrigation_strategy,
      // Stats
      max_veg_days,
      max_flower_days,
      veg_week,
      flower_week,
      max_stage_summary,
      // Biological Metrics (Spread)
      vpd_status,
      vpd_target_min,
      vpd_target_max,
      vpd_danger_min,
      vpd_danger_max,
      granular_stage,
      is_day,
      air_exchange,
      // Environment Sensors
      temperature_sensor,
      humidity_sensor,
      vpd_sensor,
      co2_sensor,
      soil_moisture_sensor,
      exhaust_sensor,
      humidifier_sensor,
      light_sensor,
      // Environment States
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
              // Ensure stage enum match if possible, or string fallback
              stage: slot.stage as PlantStage,
              // Backend sends row/col in slot now
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
      total_plants: wsData.total_plants,
      max_stage_summary,
    };

    // --- Legacy compatibility for irrigation times (from config) ---
    const irrigation_times = irrigation_config?.irrigation_times || [];
    const drain_times = irrigation_config?.drain_times || [];

    return createGrowspaceDevice({
      device_id: growspace_id,
      overview_entity_id: overview.entity_id, // Use the sensor entity ID
      name,
      plants,
      rows,
      plants_per_row,
      type: type as GrowspaceType,
      last_updated: overview.last_updated, // Or current time?
      biological_metrics,
      irrigation_times,
      drain_times,
      irrigation_config,
      irrigation_strategy: irrigation_strategy || undefined, // Strict null to undefined if interface asks optional?
      environment_attributes,
      stats,
      // Provide top-level backwards compat if needed, or rely on stats grouping
      max_veg_days,
      max_flower_days,
      total_plants: wsData.total_plants,
      max_stage_summary,
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
