import {
  GrowspaceDevice,
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

    const growspaceId = wsData?.growspace_id || overview?.attributes.growspace_id || 'unknown';
    const name = wsData?.name || overview?.attributes.friendly_name || `Growspace ${growspaceId}`;
    const overviewEntityId = wsData?.overview_entity_id || overview?.entity_id || '';

    // 1. Loading State
    if (!wsData) {
      return createGrowspaceDevice({
        deviceId: growspaceId,
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


    // Normalize Coordinates (Merge Group ones into main map for UI consumption)
    const sensorCoordinates = { ...wsData.sensor_coordinates };

    // 1. Merge Group Coordinates
    wsData.sensor_groups?.forEach((g: any) => {
      const groupCoords = { x: g.x, y: g.y, z: g.z };
      [...(g.temperature_sensors || []), ...(g.humidity_sensors || []), ...(g.vpd_sensors || [])].forEach(id => {
        if (!sensorCoordinates[id]) {
          sensorCoordinates[id] = groupCoords;
        }
      });
    });

    // 2. Backfill Defaults for missing known sensors (Lights, CO2, etc.)
    // This ensures they appear in SceneManager/SensorRenderer even if not explicitly positioned
    const midX = (wsData.dimensions?.width || 120) / 2;
    const midY = (wsData.dimensions?.length || (wsData.dimensions as any)?.depth || 120) / 2;
    const defaultCoords = { x: midX, y: midY, z: 0 };

    const ensureCoord = (id: string | null | undefined) => {
      if (id && !sensorCoordinates[id]) {
        sensorCoordinates[id] = { ...defaultCoords };
      }
    };

    // Singles
    ensureCoord(wsData.temperature_sensor);
    ensureCoord(wsData.humidity_sensor);
    ensureCoord(wsData.vpd_sensor);
    ensureCoord(wsData.co2_sensor);
    ensureCoord(wsData.soil_moisture_sensor);
    ensureCoord(wsData.light_sensor);

    // Arrays
    wsData.temperature_sensors?.forEach(ensureCoord);
    wsData.humidity_sensors?.forEach(ensureCoord);
    wsData.vpd_sensors?.forEach(ensureCoord);
    wsData.co2_sensors?.forEach(ensureCoord);
    wsData.light_sensors?.forEach(ensureCoord);
    wsData.soil_moisture_sensors?.forEach(ensureCoord);


    const environmentAttributes: EnvironmentAttributes = {
      temperatureSensor: wsData.temperature_sensor,
      temperatureSensors: wsData.temperature_sensors,
      humiditySensor: wsData.humidity_sensor,
      humiditySensors: wsData.humidity_sensors,
      vpdSensor: wsData.vpd_sensor,
      vpdSensors: wsData.vpd_sensors,
      co2Sensor: wsData.co2_sensor,
      co2Sensors: wsData.co2_sensors,
      soilMoistureSensor: wsData.soil_moisture_sensor,
      soilMoistureSensors: wsData.soil_moisture_sensors,
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
      irrigationPumpState: wsData.irrigation_pump_state,
      drainPumpState: wsData.drain_pump_state,
      irrigationTanks: wsData.irrigation_tanks?.map((t: any) => ({
        sensorEntity: t.sensor_entity,
        name: t.name,
        warningLevel: t.warning_level,
        fillLevel: t.fill_level,
        isWarning: t.is_warning,
        hoursRemaining: t.hours_remaining ?? null,
        depletionStatus: t.depletion_status ?? null,
        volumeLiters: t.volume_liters ?? null,
        waterHistory: t.water_history ?? undefined,
      })),
      activeEvents: wsData.active_events,
      sensorCoordinates,
      sensorTypes: wsData.sensor_types,
      sensorGroups: wsData.sensor_groups,
      electricityCostPerKwh: wsData.electricity_cost_per_kwh,
      substrateTemperatureSensors: wsData.substrate_temperature_sensors,
      cameraEntities: wsData.camera_entities,
      energySensors: wsData.energy_sensors,
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
              growspace_id: growspaceId,
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

    const irrigationStrategy: IrrigationStrategy | undefined = wsData.irrigation_strategy
      ? {
        enabled: wsData.irrigation_strategy.enabled,
        lightsOnTime: wsData.irrigation_strategy.lights_on_time,
        p0DurationMinutes: wsData.irrigation_strategy.p0_duration_minutes,
        p2StopBeforeLightsOffMinutes:
          wsData.irrigation_strategy.p2_stop_before_lights_off_minutes,
        targetVwcPercent: wsData.irrigation_strategy.target_vwc_percent,
        maintenanceDrybackPercent: wsData.irrigation_strategy.maintenance_dryback_percent,
        shotDurationSeconds: wsData.irrigation_strategy.shot_duration_seconds,
        shotIntervalMinutes: wsData.irrigation_strategy.shot_interval_minutes,
      }
      : undefined;

    const drainConfig = wsData.drain_config
      ? {
        enabled: wsData.drain_config.enabled,
        maxEcDelta: wsData.drain_config.max_ec_delta,
        targetRunoffPercent: wsData.drain_config.target_runoff_percent,
        readings: (wsData.drain_config.readings || []).map((r) => ({
          timestamp: r.timestamp,
          feedEc: r.feed_ec,
          drainEc: r.drain_ec,
          drainVolumeMl: r.drain_volume_ml,
          feedVolumeMl: r.feed_volume_ml,
        })),
      }
      : null;


    const energyTracking = wsData.energy_tracking
      ? {
        dailyKwh: wsData.energy_tracking.daily_kwh,
        costTotal: wsData.energy_tracking.cost_total,
        costPerGram: wsData.energy_tracking.cost_per_gram,
        cycleStartDate: wsData.energy_tracking.cycle_start_date,
      }
      : null;

    const waterUsage = wsData.water_usage
      ? {
        litersPerPlantPerDay: wsData.water_usage.liters_per_plant_per_day,
        litersToday: wsData.water_usage.liters_today,
        waterEfficiency: wsData.water_usage.water_efficiency,
      }
      : null;

    // 5. Construct Device
    return createGrowspaceDevice({
      deviceId: growspaceId,
      overviewEntityId,
      name,
      type: wsData.type || 'normal',
      rows: wsData.rows,
      plantsPerRow: wsData.plants_per_row,
      notificationTarget: wsData.notification_target,
      dimensions: wsData.dimensions ? {
        width: wsData.dimensions.width,
        height: wsData.dimensions.height,
        length: wsData.dimensions.length || (wsData.dimensions as any).depth || 120,
        unit: wsData.dimensions.unit || 'cm'
      } : undefined,
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
      drainConfig,
      energyTracking,
      waterUsage,
    });
  }

  /** @deprecated */
  static transformToDevices(): GrowspaceDevice[] {
    return [];
  }
}
