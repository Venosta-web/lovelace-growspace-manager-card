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
import type { ECTargetStage } from '../services/types';

export class GrowspaceAdapter {
  static transformGrowspace(
    overview: GrowspaceOverviewEntity | null,
    wsData: GrowspaceAPIResponse | null = null,
  ): GrowspaceDevice | null {
    if (!wsData && !overview) return null;

    // Destructure the 6 sub-objects with safe fallbacks
    const identity = wsData?.identity;
    const gridData = wsData?.grid;
    const environment = wsData?.environment;
    const sensors = wsData?.sensors;
    const irrigation = wsData?.irrigation;
    const metrics = wsData?.metrics;

    const growspaceId =
      identity?.growspace_id || overview?.attributes.growspace_id || 'unknown';
    const name =
      identity?.name || overview?.attributes.friendly_name || `Growspace ${growspaceId}`;
    const overviewEntityId = identity?.overview_entity_id || overview?.entity_id || '';

    // 1. Loading State
    if (!wsData) {
      return createGrowspaceDevice({
        deviceId: growspaceId,
        overviewEntityId: overview!.entity_id,
        name,
        lastUpdated: 'Loading...',
      });
    }

    // 2. Biological Metrics from metrics sub-object
    const biologicalMetrics: BiologicalMetrics = {
      vpdStatus: metrics?.vpd_status ?? 'unknown',
      vpdTargetMin: metrics?.vpd_target_min ?? 0,
      vpdTargetMax: metrics?.vpd_target_max ?? 0,
      vpdDangerMin: metrics?.vpd_danger_min ?? 0,
      vpdDangerMax: metrics?.vpd_danger_max ?? 0,
      granularStage: metrics?.granular_stage ?? 'unknown',
      isDay: metrics?.is_day ?? false,
      vegWeek: metrics?.veg_week ?? 0,
      flowerWeek: metrics?.flower_week ?? 0,
      airExchange: metrics?.air_exchange,
    };

    // 3. Sensor Coordinates — merge group coords, then backfill defaults
    const sensorCoordinates = { ...(sensors?.sensor_coordinates ?? {}) };

    // Merge group coordinates
    (sensors?.sensor_groups ?? []).forEach((g: any) => {
      const groupCoords = { x: g.x, y: g.y, z: g.z };
      [
        ...(g.temperature_sensors || []),
        ...(g.humidity_sensors || []),
        ...(g.vpd_sensors || []),
      ].forEach((id: string) => {
        if (!sensorCoordinates[id]) {
          sensorCoordinates[id] = groupCoords;
        }
      });
    });

    // Backfill defaults for known sensors that have no coordinate
    const midX = (gridData?.dimensions?.width ?? 120) / 2;
    const midY =
      (gridData?.dimensions?.length ?? (gridData?.dimensions as any)?.depth ?? 120) / 2;
    const defaultCoords = { x: midX, y: midY, z: 0 };

    const ensureCoord = (id: string | null | undefined) => {
      if (id && !sensorCoordinates[id]) {
        sensorCoordinates[id] = { ...defaultCoords };
      }
    };

    ensureCoord(environment?.temperature_sensor);
    ensureCoord(environment?.humidity_sensor);
    ensureCoord(environment?.vpd_sensor);
    ensureCoord(environment?.co2_sensor);
    ensureCoord(environment?.soil_moisture_sensor);
    ensureCoord(environment?.light_sensor);

    (environment as any)?.temperature_sensors?.forEach(ensureCoord);
    (environment as any)?.humidity_sensors?.forEach(ensureCoord);
    (environment as any)?.vpd_sensors?.forEach(ensureCoord);
    (environment as any)?.co2_sensors?.forEach(ensureCoord);
    (environment as any)?.light_sensors?.forEach(ensureCoord);
    (environment as any)?.soil_moisture_sensors?.forEach(ensureCoord);

    // 4. Environment Attributes from environment sub-object
    const environmentAttributes: EnvironmentAttributes = {
      temperatureSensor: environment?.temperature_sensor,
      temperatureSensors: (environment as any)?.temperature_sensors,
      humiditySensor: environment?.humidity_sensor,
      humiditySensors: (environment as any)?.humidity_sensors,
      vpdSensor: environment?.vpd_sensor,
      vpdSensors: (environment as any)?.vpd_sensors,
      co2Sensor: environment?.co2_sensor,
      co2Sensors: (environment as any)?.co2_sensors,
      soilMoistureSensor: environment?.soil_moisture_sensor,
      soilMoistureSensors: (environment as any)?.soil_moisture_sensors,
      lightSensor: environment?.light_sensor,
      lightSensors: (environment as any)?.light_sensors,
      dehumidifierEntity: environment?.dehumidifier_entity,
      dehumidifierEntities: (environment as any)?.dehumidifier_entities,
      dehumidifierControlEnabled: environment?.dehumidifier_control_enabled,
      dehumidifierThresholds: (environment as any)?.dehumidifier_thresholds,
      dehumidifierState: (environment as any)?.dehumidifier_state,
      humidifierEntity: environment?.humidifier_entity,
      humidifierEntities: (environment as any)?.humidifier_entities,
      humidifierControlEnabled: environment?.humidifier_control_enabled,
      humidifierThresholds: (environment as any)?.humidifier_thresholds,
      exhaustEntity: (environment as any)?.exhaust_entity,
      exhaustFanEntities: (environment as any)?.exhaust_fan_entities,
      circulationFanEntity: (environment as any)?.circulation_fan_entity,
      circulationFanEntities: (environment as any)?.circulation_fan_entities,
      vpd: (environment as any)?.vpd,
      soilMoistureValue: (environment as any)?.soil_moisture_value,
      exhaustSensor: (environment as any)?.exhaust_sensor,
      humidifierSensor: (environment as any)?.humidifier_sensor,
      irrigationPumpState: (environment as any)?.irrigation_pump_state,
      drainPumpState: (environment as any)?.drain_pump_state,
      irrigationTanks: (environment as any)?.irrigation_tanks?.map((t: any) => ({
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
      activeEvents: (environment as any)?.active_events,
      // Sensor lookup data comes from sensors sub-object
      sensorCoordinates,
      sensorTypes: sensors?.sensor_types,
      sensorGroups: sensors?.sensor_groups as any,
      electricityCostPerKwh: (environment as any)?.electricity_cost_per_kwh,
      substrateTemperatureSensors: (environment as any)?.substrate_temperature_sensors,
      cameraEntities: (environment as any)?.camera_entities,
      lungroomTempSensors: (environment as any)?.lung_room_temp_sensors,
      powerSensors: (environment as any)?.power_sensors,
      energySensors: (environment as any)?.energy_sensors,
      phSensors: (environment as any)?.ph_sensors,
      feedEcSensors: (environment as any)?.feed_ec_sensors,
      substrateEcSensors: (environment as any)?.substrate_ec_sensors,
      runoffEcSensors: (environment as any)?.runoff_ec_sensors,
      drainVolumeSensors: (environment as any)?.drain_volume_sensors,
      irrigationFlowSensors: (environment as any)?.irrigation_flow_sensors,
    };

    // 5. Stats from metrics sub-object
    const stats: GrowspaceStats = {
      maxVegDays: metrics?.max_veg_days ?? 0,
      maxFlowerDays: metrics?.max_flower_days ?? 0,
      vegWeek: metrics?.veg_week ?? 0,
      flowerWeek: metrics?.flower_week ?? 0,
      maxStageSummary: metrics?.max_stage_summary ?? '',
      totalPlants: gridData?.total_plants ?? 0,
    };

    // 6. Plants from grid sub-object
    const plants: PlantEntity[] = [];
    if (gridData?.grid) {
      Object.values(gridData.grid).forEach((slot) => {
        if (slot) {
          plants.push({
            entity_id: slot.entity_id,
            state: slot.stage || 'unknown',
            attributes: {
              ...slot,
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

    // 7. Irrigation from irrigation sub-object
    const irrigationConfigRaw = irrigation?.irrigation_config ?? {};
    const irrigationConfig: IrrigationConfig = {
      irrigationPumpEntity: (irrigationConfigRaw as any).irrigation_pump_entity,
      drainPumpEntity: (irrigationConfigRaw as any).drain_pump_entity,
      irrigationDuration: (irrigationConfigRaw as any).irrigation_duration,
      drainDuration: (irrigationConfigRaw as any).drain_duration,
      irrigationTimes: (irrigationConfigRaw as any).irrigation_times ?? [],
      drainTimes: (irrigationConfigRaw as any).drain_times ?? [],
      vegDayHours: (irrigationConfigRaw as any).veg_day_hours,
      soilTriggerPercent: (irrigationConfigRaw as any).soil_trigger_percent,
      dailyVolumeCapLiters: (irrigationConfigRaw as any).daily_volume_cap_liters,
      maxCyclesPerDay: (irrigationConfigRaw as any).max_cycles_per_day,
      skipDuringDark: (irrigationConfigRaw as any).skip_during_dark,
      pauseOnLowTank: (irrigationConfigRaw as any).pause_on_low_tank,
      logToLogbook: (irrigationConfigRaw as any).log_to_logbook,
      autoAdvanceP1ToP2: (irrigationConfigRaw as any).auto_advance_p1_to_p2,
      autoAdvanceP2ToP3: (irrigationConfigRaw as any).auto_advance_p2_to_p3,
      haltOnRunoffEcThreshold: (irrigationConfigRaw as any).halt_on_runoff_ec_threshold,
      activeSteeringPhase: (irrigationConfigRaw as any).active_steering_phase,
      ecTargetRanges: (
        (irrigationConfigRaw as any).ec_target_ranges ?? []
      ).map((r: { stage: string; min_ec: number; max_ec: number }) => ({
        stage: r.stage as ECTargetStage,
        minEc: r.min_ec,
        maxEc: r.max_ec,
      })),
    };

    const irrigationStrategyRaw = irrigation?.irrigation_strategy;
    const irrigationStrategy: IrrigationStrategy | undefined = irrigationStrategyRaw
      ? {
          enabled: irrigationStrategyRaw.enabled,
          lightsOnTime: irrigationStrategyRaw.lights_on_time,
          p0DurationMinutes: irrigationStrategyRaw.p0_duration_minutes,
          p2StopBeforeLightsOffMinutes: irrigationStrategyRaw.p2_stop_before_lights_off_minutes,
          targetVwcPercent: irrigationStrategyRaw.target_vwc_percent,
          maintenanceDrybackPercent: irrigationStrategyRaw.maintenance_dryback_percent,
          shotDurationSeconds: irrigationStrategyRaw.shot_duration_seconds,
          shotIntervalMinutes: irrigationStrategyRaw.shot_interval_minutes,
          autoLightTracking: irrigationStrategyRaw.auto_light_tracking,
          detectedLightsOnTime: irrigationStrategyRaw.detected_lights_on_time,
        }
      : undefined;

    const drainConfigRaw = irrigation?.drain_config;
    const drainConfig = drainConfigRaw
      ? {
          enabled: drainConfigRaw.enabled,
          maxEcDelta: drainConfigRaw.max_ec_delta,
          targetRunoffPercent: drainConfigRaw.target_runoff_percent,
          readings: (drainConfigRaw.readings || []).map((r) => ({
            timestamp: r.timestamp,
            feedEc: r.feed_ec,
            drainEc: r.drain_ec,
            drainVolumeMl: r.drain_volume_ml,
            feedVolumeMl: r.feed_volume_ml,
          })),
        }
      : null;

    const energyTrackingRaw = metrics?.energy_tracking;
    const energyTracking = energyTrackingRaw
      ? {
          cycleStartDate: energyTrackingRaw.cycle_start_date,
          cycleStartKwh: energyTrackingRaw.cycle_start_kwh,
        }
      : null;

    const waterUsageRaw = irrigation?.water_usage;
    const waterUsage = waterUsageRaw
      ? {
          totalLiters: waterUsageRaw.total_liters,
          cycleStartDate: waterUsageRaw.cycle_start_date,
          dailyReadings: waterUsageRaw.daily_readings as Array<Record<string, unknown>>,
        }
      : null;

    // 8. Construct Device
    return createGrowspaceDevice({
      deviceId: growspaceId,
      overviewEntityId,
      name,
      type: (identity?.type ?? 'normal') as GrowspaceDevice['type'],
      rows: gridData?.rows ?? 3,
      plantsPerRow: gridData?.plants_per_row ?? 3,
      notificationTarget: identity?.notification_target,
      dimensions: gridData?.dimensions
        ? {
            width: gridData.dimensions.width ?? 120,
            height: gridData.dimensions.height ?? 200,
            length:
              gridData.dimensions.length ??
              (gridData.dimensions as any)?.depth ??
              120,
            unit: gridData.dimensions.unit ?? 'cm',
          }
        : undefined,
      lastUpdated: overview?.last_updated || new Date().toISOString(),

      // Structural Data
      plants,
      grid: gridData?.grid ?? {},

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

      // Irrigation cycle telemetry
      lastCycleTimestamp: irrigation?.last_cycle_timestamp ?? null,
      nextScheduledCycle: irrigation?.next_scheduled_cycle ?? null,
      cyclesToday: irrigation?.cycles_today ?? 0,
      volumeDispensedToday: irrigation?.volume_dispensed_today ?? 0,
    });
  }

  /** @deprecated */
  static transformToDevices(): GrowspaceDevice[] {
    return [];
  }
}
