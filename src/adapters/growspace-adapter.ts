import {
  GrowspaceDevice,
  GrowspaceType,
  PlantEntity,
  createGrowspaceDevice,
  PlantStage,
  GrowspaceAPIResponse,
  GrowspaceOverviewEntity,
  BiologicalMetrics,
  EnvironmentAttributes,
  GrowspaceStats,
  IrrigationConfig,
  IrrigationStrategy,
} from '../types';

export class GrowspaceAdapter {
  static transformGrowspace(
    overview: GrowspaceOverviewEntity | null,
    wsData: GrowspaceAPIResponse | null = null
  ): GrowspaceDevice | null {
    if (!wsData && !overview) return null;

    const growspace_id = wsData?.growspace_id || overview?.attributes.growspace_id || 'unknown';
    const name = wsData?.name || overview?.attributes.friendly_name || `Growspace ${growspace_id}`;
    const overviewEntityId = wsData?.overview_entity_id || overview?.entity_id || '';

    // 1. Loading State
    if (!wsData) {
      return createGrowspaceDevice({
        deviceId: growspace_id,
        overviewEntityId: overview!.entity_id,
        name,
        lastUpdated: 'Loading...',
      });
    }

    // 2. Map Groups to camelCase
    const biologicalMetrics: BiologicalMetrics = {
      vpdStatus: wsData.vpd_status,
      vpdTargetMin: wsData.vpd_target_min,
      vpdTargetMax: wsData.vpd_target_max,
      vpdDangerMin: wsData.vpd_danger_min,
      vpdDangerMax: wsData.vpd_danger_max,
      granularStage: wsData.granular_stage,
      isDay: wsData.is_day,
      vegWeek: wsData.veg_week,
      flowerWeek: wsData.flower_week,
      airExchange: wsData.air_exchange,
    };

    const environmentAttributes: EnvironmentAttributes = {
      temperatureSensor: wsData.temperature_sensor,
      humiditySensor: wsData.humidity_sensor,
      vpdSensor: wsData.vpd_sensor,
      co2Sensor: wsData.co2_sensor,
      soilMoistureSensor: wsData.soil_moisture_sensor,
      lightSensor: wsData.light_sensor,
      lightSensors: wsData.light_sensors,
      dehumidifierEntity: wsData.dehumidifier_entity,
      dehumidifierEntities: wsData.dehumidifier_entities,
      dehumidifierControlEnabled: wsData.dehumidifier_control_enabled,
      dehumidifierThresholds: wsData.dehumidifier_thresholds,
      dehumidifierState: wsData.dehumidifier_state,
      humidifierEntity: wsData.humidifier_entity,
      humidifierEntities: wsData.humidifier_entities,
      exhaustEntity: wsData.exhaust_entity,
      exhaustFanEntities: wsData.exhaust_fan_entities,
      circulationFanEntity: wsData.circulation_fan_entity,
      circulationFanEntities: wsData.circulation_fan_entities,
      vpd: wsData.vpd,
      soilMoistureValue: wsData.soil_moisture_value,
      exhaustSensor: wsData.exhaust_sensor,
      humidifierSensor: wsData.humidifier_sensor,
    };

    const stats: GrowspaceStats = {
      maxVegDays: wsData.max_veg_days,
      maxFlowerDays: wsData.max_flower_days,
      vegWeek: wsData.veg_week,
      flowerWeek: wsData.flower_week,
      maxStageSummary: wsData.max_stage_summary,
      totalPlants: wsData.total_plants,
    };

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

    // 4. Map Configs
    const irrigationConfigRaw = wsData.irrigation_config || {};
    const irrigationConfig: IrrigationConfig = {
      irrigationPumpEntity: irrigationConfigRaw.irrigation_pump_entity,
      drainPumpEntity: irrigationConfigRaw.drain_pump_entity,
      irrigationDuration: irrigationConfigRaw.irrigation_duration,
      drainDuration: irrigationConfigRaw.drain_duration,
      irrigationTimes: irrigationConfigRaw.irrigation_times,
      drainTimes: irrigationConfigRaw.drain_times,
      vegDayHours: irrigationConfigRaw.veg_day_hours,
    };

    const irrigationStrategy: IrrigationStrategy | undefined = wsData.irrigation_strategy ? {
      enabled: wsData.irrigation_strategy.enabled,
      lightsOnTime: wsData.irrigation_strategy.lights_on_time,
      p0DurationMinutes: wsData.irrigation_strategy.p0_duration_minutes,
      p2StopBeforeLightsOffMinutes: wsData.irrigation_strategy.p2_stop_before_lights_off_minutes,
      targetVwcPercent: wsData.irrigation_strategy.target_vwc_percent,
      maintenanceDrybackPercent: wsData.irrigation_strategy.maintenance_dryback_percent,
      shotDurationSeconds: wsData.irrigation_strategy.shot_duration_seconds,
      shotIntervalMinutes: wsData.irrigation_strategy.shot_interval_minutes,
    } : undefined;

    // 5. Construct Device
    return createGrowspaceDevice({
      deviceId: growspace_id,
      overviewEntityId,
      name,
      type: wsData.type || 'normal',
      rows: wsData.rows,
      plantsPerRow: wsData.plants_per_row,
      notificationTarget: wsData.notification_target,
      lastUpdated: overview?.last_updated || new Date().toISOString(),

      // Structural Data
      plants,
      grid: wsData.grid,

      // Grouped Data
      biologicalMetrics,
      environmentAttributes,
      stats,

      // Configs
      irrigationConfig,
      irrigationStrategy,
    });
  }

  /** @deprecated */
  static transformToDevices(): GrowspaceDevice[] {
    return [];
  }
}
