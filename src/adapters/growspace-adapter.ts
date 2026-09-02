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
import type { ECTargetStage, SteeringMetrics, SerializedIrrigationConfig } from '../services/types';
import { ActiveEventSchema, IrrigationTankRowSchema } from '../slices/irrigation/schema';
import { LegacyStageThresholdsSchema } from '../slices/growspace/schema';
import { normalizeTriggerType } from '../slices/notification/triggers';
import { SensorGroupSchema } from '../slices/subarea/schema';
import type { SensorGroup } from '../slices/subarea/schema';

function parseSensorGroups(raw: unknown[] | undefined): SensorGroup[] {
  return (raw ?? []).flatMap((g) => {
    const parsed = SensorGroupSchema.safeParse(g);
    return parsed.success ? [parsed.data] : [];
  });
}

function parseLegacyStageThresholds(raw: unknown) {
  // Current GSM snapshots use target/tolerance, while the editor still writes
  // the legacy day/night on/off model. Do not reinterpret one as the other.
  const parsed = LegacyStageThresholdsSchema.safeParse(raw);
  return parsed.success ? parsed.data : undefined;
}

export class GrowspaceAdapter {
  static transformGrowspace(
    overview: GrowspaceOverviewEntity | null,
    wsData: GrowspaceAPIResponse | null = null
  ): GrowspaceDevice | null {
    if (!wsData && !overview) return null;

    // Destructure the 6 sub-objects with safe fallbacks
    const identity = wsData?.identity;
    const gridData = wsData?.grid;
    const environment = wsData?.environment;
    const sensors = wsData?.sensors;
    const irrigation = wsData?.irrigation;
    const metrics = wsData?.metrics;

    const growspaceId = identity?.growspace_id || overview?.attributes.growspace_id || 'unknown';
    const name = identity?.name || overview?.attributes.friendly_name || `Growspace ${growspaceId}`;
    const overviewEntityId = identity?.overview_entity_id || overview?.entity_id || '';

    // 1. Loading State
    if (!wsData) {
      return createGrowspaceDevice({
        deviceId: growspaceId,
        overviewEntityId: overview!.entity_id,
        name,
        lastUpdated: 'Loading...',
        subareas: [],
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

    // Merge group coordinates.
    // `sensor_groups` is an Opaque Region (ADR 0031): an open-ended, grower-driven
    // collection left unvalidated at the growspace level so one malformed group
    // cannot fail the whole get_data parse. Rows are parsed individually, so a
    // bad group costs its own coordinates and nothing else.
    const sensorGroups = parseSensorGroups(sensors?.sensor_groups);
    sensorGroups.forEach((g) => {
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
    const midY = (gridData?.dimensions?.length ?? gridData?.dimensions?.depth ?? 120) / 2;
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

    environment?.temperature_sensors?.forEach(ensureCoord);
    environment?.humidity_sensors?.forEach(ensureCoord);
    environment?.vpd_sensors?.forEach(ensureCoord);
    environment?.light_sensors?.forEach(ensureCoord);

    // 4. Environment Attributes from environment sub-object
    const environmentAttributes: EnvironmentAttributes = {
      temperatureSensor: environment?.temperature_sensor,
      temperatureSensors: environment?.temperature_sensors,
      humiditySensor: environment?.humidity_sensor,
      humiditySensors: environment?.humidity_sensors,
      vpdSensor: environment?.vpd_sensor,
      vpdSensors: environment?.vpd_sensors,
      co2Sensor: environment?.co2_sensor,
      soilMoistureSensor: environment?.soil_moisture_sensor,
      lightSensor: environment?.light_sensor,
      lightSensors: environment?.light_sensors,
      dehumidifierEntity: environment?.dehumidifier_entity,
      dehumidifierEntities: environment?.dehumidifier_entities,
      dehumidifierControlEnabled: environment?.dehumidifier_control_enabled,
      dehumidifierThresholds: parseLegacyStageThresholds(environment?.dehumidifier_thresholds),
      dehumidifierState: environment?.dehumidifier_state ?? undefined,
      humidifierEntity: environment?.humidifier_entity,
      humidifierEntities: environment?.humidifier_entities,
      humidifierControlEnabled: environment?.humidifier_control_enabled,
      humidifierThresholds: parseLegacyStageThresholds(environment?.humidifier_thresholds),
      exhaustEntity: environment?.exhaust_entity,
      exhaustFanEntities: environment?.exhaust_fan_entities,
      circulationFanEntity: environment?.circulation_fan_entity,
      circulationFanEntities: environment?.circulation_fan_entities,
      circulationFanConfig: environment?.circulation_fan_config,
      exhaustFanConfig: environment?.exhaust_fan_config,
      exhaustFanAcInfinityDevices: environment?.exhaust_fan_ac_infinity_devices,
      circulationFanAcInfinityDevices: environment?.circulation_fan_ac_infinity_devices,
      humidifierAcInfinityDevices: environment?.humidifier_ac_infinity_devices,
      dehumidifierAcInfinityDevices: environment?.dehumidifier_ac_infinity_devices,
      growlightEntities: environment?.growlight_entities,
      growlightAcInfinityDevices: environment?.growlight_ac_infinity_devices,
      growlightConfig: environment?.growlight_config,
      vpd: environment?.vpd ?? undefined,
      soilMoistureValue: environment?.soil_moisture_value ?? undefined,
      // `?? null` not `?? undefined`: null is the meaningful "inherited" state
      // for the band pair, and the dialog seeders rely on it.
      soilMoistureMin: environment?.soil_moisture_min ?? null,
      soilMoistureMax: environment?.soil_moisture_max ?? null,
      soilMoistureBand: environment?.soil_moisture_band,
      soilMoistureUnit: environment?.soil_moisture_unit ?? undefined,
      soilMoistureBandCompatible: environment?.soil_moisture_band_compatible,
      irrigationPumpState: environment?.irrigation_pump_state ?? undefined,
      drainPumpState: environment?.drain_pump_state ?? undefined,
      // `irrigation_tanks` and `active_events` are Opaque Regions (ADR 0031):
      // open-ended, grower-driven collections that stay unvalidated at the
      // growspace level so one malformed entry cannot blank every growspace.
      // The tank rows are still parsed individually here, which keeps the blast
      // radius at one tank while their shape stays schema-described.
      irrigationTanks: environment?.irrigation_tanks?.flatMap((raw) => {
        const row = IrrigationTankRowSchema.safeParse(raw);
        if (!row.success) return [];
        const t = row.data;
        return [
          {
            sensorEntity: t.sensor_entity,
            name: t.name,
            warningLevel: t.warning_level,
            fillLevel: t.fill_level,
            isWarning: t.is_warning,
            hoursRemaining: t.hours_remaining ?? null,
            depletionStatus: t.depletion_status ?? null,
            volumeLiters: t.volume_liters ?? null,
            waterHistory: t.water_history ?? undefined,
          },
        ];
      }),
      activeEvents: environment?.active_events
        ? Object.fromEntries(
            Object.entries(environment.active_events).flatMap(([type, raw]) => {
              const parsed = ActiveEventSchema.safeParse(raw);
              return parsed.success ? [[type, parsed.data] as const] : [];
            })
          )
        : undefined,
      // Sensor lookup data comes from sensors sub-object
      sensorCoordinates,
      sensorTypes: sensors?.sensor_types,
      sensorGroups: sensors?.sensor_groups ? sensorGroups : undefined,
      electricityCostPerKwh: environment?.electricity_cost_per_kwh,
      substrateTemperatureSensors: environment?.substrate_temperature_sensors,
      cameraEntities: environment?.camera_entities,
      visionCheckupConfig: environment?.vision_checkup_config,
      lungroomTempSensors: environment?.lung_room_temp_sensors,
      powerSensors: environment?.power_sensors,
      energySensors: environment?.energy_sensors,
      phSensors: environment?.ph_sensors,
      feedEcSensors: environment?.feed_ec_sensors,
      bulkEcSensors: environment?.bulk_ec_sensors,
      poreEcSensors: environment?.pore_ec_sensors,
      runoffEcSensors: environment?.runoff_ec_sensors,
      drainVolumeSensors: environment?.drain_volume_sensors,
      irrigationFlowSensors: environment?.irrigation_flow_sensors,
      vpdOptimalOverrides: environment?.vpd_optimal_overrides ?? {},
      lstOffset: environment?.lst_offset,
      stressThreshold: environment?.stress_threshold ?? null,
      moldThreshold: environment?.mold_threshold ?? null,
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
    const irrigationConfigRaw: Partial<SerializedIrrigationConfig> =
      irrigation?.irrigation_config ?? {};
    const irrigationConfig: IrrigationConfig = {
      irrigationPumpEntity: irrigationConfigRaw.irrigation_pump_entity,
      pumpFlowRateMlPerSec: irrigationConfigRaw.pump_flow_rate_ml_per_sec,
      drainPumpEntity: irrigationConfigRaw.drain_pump_entity,
      irrigationDuration: irrigationConfigRaw.irrigation_duration,
      drainDuration: irrigationConfigRaw.drain_duration,
      irrigationTimes: irrigationConfigRaw.irrigation_times ?? [],
      drainTimes: irrigationConfigRaw.drain_times ?? [],
      vegDayHours: irrigationConfigRaw.veg_day_hours,
      // Older integrations omit this additive field; match the backend
      // resolver's no-config fallback during the rolling upgrade window.
      resolvedDayHours: irrigationConfigRaw.resolved_day_hours ?? 12,
      soilTriggerPercent: irrigationConfigRaw.soil_trigger_percent,
      dailyVolumeCapLiters: irrigationConfigRaw.daily_volume_cap_liters,
      maxCyclesPerDay: irrigationConfigRaw.max_cycles_per_day,
      skipDuringDark: irrigationConfigRaw.skip_during_dark,
      pauseOnLowTank: irrigationConfigRaw.pause_on_low_tank,
      logToLogbook: irrigationConfigRaw.log_to_logbook,
      autoAdvanceP1ToP2: irrigationConfigRaw.auto_advance_p1_to_p2,
      autoAdvanceP2ToP3: irrigationConfigRaw.auto_advance_p2_to_p3,
      haltOnRunoffEcThreshold: irrigationConfigRaw.halt_on_runoff_ec_threshold,
      activeSteeringPhase: irrigationConfigRaw.active_steering_phase,
      phaseChangedAt: irrigationConfigRaw.phase_changed_at ?? undefined,
      ecTargetRanges: (irrigationConfigRaw.ec_target_ranges ?? []).map(
        (r: { stage: string; feed_ec_min: number; feed_ec_max: number }) => ({
          stage: r.stage as ECTargetStage,
          minEc: r.feed_ec_min,
          maxEc: r.feed_ec_max,
        })
      ),
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
          // Per-phase shot fields fall back to the legacy shared values so
          // strategies stored before the per-phase split still populate P1/P2.
          p1ShotDurationSeconds:
            irrigationStrategyRaw.p1_shot_duration_seconds ??
            irrigationStrategyRaw.shot_duration_seconds,
          p1ShotIntervalMinutes:
            irrigationStrategyRaw.p1_shot_interval_minutes ??
            irrigationStrategyRaw.shot_interval_minutes,
          p2ShotDurationSeconds:
            irrigationStrategyRaw.p2_shot_duration_seconds ??
            irrigationStrategyRaw.shot_duration_seconds,
          p2ShotIntervalMinutes:
            irrigationStrategyRaw.p2_shot_interval_minutes ??
            irrigationStrategyRaw.shot_interval_minutes,
          p1ShotVolumePercent: irrigationStrategyRaw.p1_shot_volume_percent,
          p2ShotVolumePercent: irrigationStrategyRaw.p2_shot_volume_percent,
          shotSizingMode: irrigationStrategyRaw.shot_sizing_mode ?? 'seconds',
          substrateProfile: irrigationStrategyRaw.substrate_profile
            ? {
                mediaType: irrigationStrategyRaw.substrate_profile.media_type,
                litersPerPot: irrigationStrategyRaw.substrate_profile.liters_per_pot,
              }
            : undefined,
          poreEcTargetMin: irrigationStrategyRaw.pore_ec_target_min ?? null,
          poreEcTargetMax: irrigationStrategyRaw.pore_ec_target_max ?? null,
          ecModulationEnabled: irrigationStrategyRaw.ec_modulation_enabled ?? false,
          autoLightTracking: irrigationStrategyRaw.auto_light_tracking,
          detectedLightsOnTime: irrigationStrategyRaw.detected_lights_on_time,
          declaredSteeringMode: irrigationStrategyRaw.declared_steering_mode ?? null,
          // [[Recipe Stamp]] provenance (ADR-0045). `?? null` collapses "the
          // backend omitted the key" onto "never applied" — the same answer for
          // the Recipe tab, which reports both as "no recipe applied yet".
          appliedRecipeId: irrigationStrategyRaw.applied_recipe_id ?? null,
          recipeAppliedAt: irrigationStrategyRaw.recipe_applied_at ?? null,
          // Adaptive Shot Control (ADR-0014). Master toggle defaults on to match
          // the backend default and the previously always-on size feedback.
          dynamicShotEnabled: irrigationStrategyRaw.dynamic_shot_enabled ?? true,
          dynamicAggressiveness: irrigationStrategyRaw.dynamic_aggressiveness,
          dynamicRecovery: irrigationStrategyRaw.dynamic_recovery,
          dynamicShotSizeFloor: irrigationStrategyRaw.dynamic_shot_size_floor,
          dynamicIntervalCeiling: irrigationStrategyRaw.dynamic_interval_ceiling,
        }
      : undefined;

    // The global [[Irrigation Recipe]] library rides every growspace payload.
    // Ordered by name so the Recipe tab has a stable base ordering to sort on
    // top of; the wire shape is a dict, whose key order is not a contract.
    // `undefined` when the backend omits the key entirely (a release predating
    // the feature) — distinct from `{}`, which is a real empty library. The
    // hydration fan-out relies on telling those apart.
    const irrigationRecipes = !irrigation?.recipes
      ? undefined
      : Object.values(irrigation.recipes)
          .map((r) => ({
            id: r.id,
            name: r.name,
            kind: r.kind,
            provenance: {
              mediaType: r.provenance.media_type,
              litersPerPot: r.provenance.liters_per_pot,
              pumpFlowRateMlPerSec: r.provenance.pump_flow_rate_ml_per_sec,
              stage: r.provenance.stage,
              week: r.provenance.week,
            },
            // Carried wire-shaped: the library editor is the only reader and it
            // sends changed fields straight back under these same names.
            cropSteering: r.crop_steering,
            schedule: r.schedule,
            createdAt: r.created_at,
          }))
          .sort((a, b) => a.name.localeCompare(b.name));

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

    const substrateRaw = irrigation?.substrate;
    const overnightEventRaw = substrateRaw?.latest_overnight_event;
    const steeringMetrics: SteeringMetrics | undefined = substrateRaw
      ? {
          overnightDryback: substrateRaw.overnight_dryback ?? null,
          latestOvernightEvent: overnightEventRaw
            ? {
                peakVwc: overnightEventRaw.peak_vwc,
                troughVwc: overnightEventRaw.trough_vwc,
                dryback: overnightEventRaw.dryback,
                peakTimestamp: overnightEventRaw.peak_timestamp ?? null,
                troughTimestamp: overnightEventRaw.trough_timestamp ?? null,
              }
            : null,
          incycleDrybackCount: substrateRaw.incycle_dryback_count ?? 0,
          incycleDrybackAvg: substrateRaw.incycle_dryback_avg ?? null,
          ecTrend: substrateRaw.ec_trend ?? null,
          ecTrendAvailable: substrateRaw.ec_trend_available ?? false,
          score: substrateRaw.score ?? null,
          measuredClassification: substrateRaw.measured_classification ?? null,
          intentDeviation: substrateRaw.intent_deviation ?? null,
          shotComposition: substrateRaw.shot_composition ?? null,
        }
      : undefined;

    const waterUsageRaw = irrigation?.water_usage;
    const waterUsage = waterUsageRaw
      ? {
          totalLiters: waterUsageRaw.total_liters,
          cycleStartDate: waterUsageRaw.cycle_start_date,
          dailyReadings: waterUsageRaw.daily_readings as Array<Record<string, unknown>>,
          ...(waterUsageRaw.liters_today != null
            ? { litersToday: waterUsageRaw.liters_today }
            : {}),
        }
      : null;

    // Global notification settings ride every growspace payload (camelCase keys
    // + a separate ai_auto_alerts flag); fold the flag into the settings object
    // the Config Dialog seeds from. Undefined when the backend omits them.
    const notificationSettings: GrowspaceDevice['notificationSettings'] =
      wsData?.notification_settings
        ? { ...wsData.notification_settings, aiAutoAlerts: wsData.ai_auto_alerts ?? true }
        : undefined;

    // Timed notifications are stored snake_case (backend consumers require it);
    // map to the camelCase shape the Config Dialog seeds from. Legacy trigger
    // words are normalised to the bare stage names the firing path
    // (calculate_days_in_stage) resolves; anything else stays flagged as
    // unrecognised instead of being coerced into a stage it does not mean.
    const timedNotifications: GrowspaceDevice['timedNotifications'] = (
      wsData?.timed_notifications ?? []
    ).map((n) => ({
      id: n.id,
      message: n.message,
      triggerType: normalizeTriggerType(n.trigger_type),
      day: n.day,
      growspaceIds: n.growspace_ids,
    }));

    // 8. Construct Device
    return createGrowspaceDevice({
      deviceId: growspaceId,
      overviewEntityId,
      name,
      type: (identity?.type ?? 'normal') as GrowspaceDevice['type'],
      rows: gridData?.rows ?? 3,
      plantsPerRow: gridData?.plants_per_row ?? 3,
      layoutRevision: wsData?.layout_revision,
      capabilities: wsData?.capabilities
        ? { atomicPlantLayout: wsData.capabilities.atomic_plant_layout ?? false }
        : undefined,
      notificationTarget: identity?.notification_target,
      notificationSettings,
      timedNotifications,
      dimensions: gridData?.dimensions
        ? {
            width: gridData.dimensions.width ?? 120,
            height: gridData.dimensions.height ?? 200,
            length: gridData.dimensions.length ?? gridData.dimensions?.depth ?? 120,
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
      volumeModeCapable: irrigation?.volume_mode_capable ?? false,
      irrigationRecipes,
      // `?? null` keeps "the backend omitted the key" and "the question does not
      // apply" as one answer: both mean the Recipe tab shows no drift verdict.
      appliedRecipeDrifted: irrigation?.applied_recipe_drifted ?? null,
      drainConfig,
      energyTracking,
      waterUsage,
      steeringMetrics,
      subareas: wsData.subareas ?? [],

      // Irrigation cycle telemetry
      lastCycleTimestamp: irrigation?.last_cycle_timestamp ?? null,
      nextScheduledCycle: irrigation?.next_scheduled_cycle ?? null,
      projectedShotWindow: irrigation?.projected_shot_window ?? null,
      cyclesToday: irrigation?.cycles_today ?? 0,
      volumeDispensedToday: irrigation?.volume_dispensed_today ?? 0,
    });
  }

  /** @deprecated */
  static transformToDevices(): GrowspaceDevice[] {
    return [];
  }
}
