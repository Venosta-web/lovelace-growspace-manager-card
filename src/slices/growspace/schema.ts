import { z } from 'zod';
import { VisionCheckupConfigSchema } from '../camera/schema';
import { GridApiSchema } from '../grid/schema';
import { SteeringModeSchema } from '../irrigation/schema';
import { TimedNotificationSchema } from '../notification/schema';
import { SubareaSchema } from '../subarea/schema';

const IrrigationScheduleItemSchema = z
  .object({
    time: z.string().optional(),
    start_time: z.string().optional(),
    duration: z.number().nullable().optional(),
    duration_seconds: z.number().nullable().optional(),
  })
  .transform((data) => ({
    time: data.time || data.start_time || '',
    duration: data.duration ?? data.duration_seconds ?? undefined,
  }))
  .refine((data) => data.time !== '', { message: 'Time is required' });

/**
 * The Irrigation Strategy as the backend emits it (ADR 0031: declare every
 * field, strip unknown keys). Everything past the original eight is
 * `.optional()` — the shipped GSM release still serializes only the legacy
 * shape, so the card must parse both it and `prerelease`'s full strategy.
 *
 * `shot_duration_seconds` / `shot_interval_minutes` are the deprecated shared
 * fields; current backends mirror P1 onto them in `__post_serialize__`.
 */
export const IrrigationStrategySchema = z.object({
  enabled: z.boolean(),
  lights_on_time: z.string(),
  p0_duration_minutes: z.number(),
  p2_stop_before_lights_off_minutes: z.number(),
  target_vwc_percent: z.number(),
  maintenance_dryback_percent: z.number(),
  shot_duration_seconds: z.number(),
  shot_interval_minutes: z.number(),
  auto_light_tracking: z.boolean().default(false),
  detected_lights_on_time: z.string().nullable().default(null),
  // Per-phase shot pairs (P1 ramp-up / P2 maintenance). Absent on the legacy
  // shape, where the adapter seeds them from the shared fields above.
  p1_shot_duration_seconds: z.number().optional(),
  p1_shot_interval_minutes: z.number().optional(),
  p2_shot_duration_seconds: z.number().optional(),
  p2_shot_interval_minutes: z.number().optional(),
  // Volume Mode (ADR-0011): shot sizes as a percent of substrate volume.
  p1_shot_volume_percent: z.number().optional(),
  p2_shot_volume_percent: z.number().optional(),
  shot_sizing_mode: z.enum(['seconds', 'volume']).optional(),
  substrate_profile: z
    .object({
      media_type: z.enum(['coco', 'rockwool', 'soil']),
      liters_per_pot: z.number(),
    })
    .optional(),
  // Pore EC Target Band + EC Modulation. Both null => no band configured.
  pore_ec_target_min: z.number().nullable().optional(),
  pore_ec_target_max: z.number().nullable().optional(),
  ec_modulation_enabled: z.boolean().optional(),
  // Declared steering intent (ADR-0012). null means never stamped.
  declared_steering_mode: SteeringModeSchema.nullable().optional(),
  // Adaptive Shot Control (ADR-0014).
  dynamic_shot_enabled: z.boolean().optional(),
  dynamic_aggressiveness: z.number().optional(),
  dynamic_recovery: z.number().optional(),
  dynamic_shot_size_floor: z.number().optional(),
  dynamic_interval_ceiling: z.number().optional(),
});

export type SerializedIrrigationStrategy = z.infer<typeof IrrigationStrategySchema>;

export const IrrigationConfigSchema = z.object({
  irrigation_pump_entity: z.string().nullable().optional(),
  drain_pump_entity: z.string().nullable().optional(),
  irrigation_duration: z.number().nullable().optional(),
  drain_duration: z.number().nullable().optional(),
  irrigation_times: z
    .array(z.union([z.string().transform((t) => ({ time: t })), IrrigationScheduleItemSchema]))
    .optional()
    .default([]),
  drain_times: z
    .array(z.union([z.string().transform((t) => ({ time: t })), IrrigationScheduleItemSchema]))
    .optional()
    .default([]),
  veg_day_hours: z.number().optional(),
  // Emitted by IrrigationConfig.to_dict() (ADR 0028 made it model-complete).
  // pump_flow_rate_ml_per_sec is unread by the card — the backend folds it
  // into volume_mode_capable — but it is declared because it is emitted.
  pump_flow_rate_ml_per_sec: z.number().optional(),
  soil_trigger_percent: z.number().nullable().optional(),
  daily_volume_cap_liters: z.number().nullable().optional(),
  max_cycles_per_day: z.number().nullable().optional(),
  skip_during_dark: z.boolean().optional(),
  pause_on_low_tank: z.boolean().optional(),
  log_to_logbook: z.boolean().optional(),
  ec_target_ranges: z
    .array(
      z.object({
        stage: z.string(),
        feed_ec_min: z.number(),
        feed_ec_max: z.number(),
      })
    )
    .optional()
    .default([]),
  auto_advance_p1_to_p2: z.boolean().optional(),
  auto_advance_p2_to_p3: z.boolean().optional(),
  halt_on_runoff_ec_threshold: z.number().nullable().optional(),
  active_steering_phase: z.enum(['p1', 'p2', 'p3']).optional(),
  phase_changed_at: z.string().nullable().optional(),
});

export type SerializedIrrigationConfig = z.infer<typeof IrrigationConfigSchema>;

export const DrainConfigSchema = z.object({
  enabled: z.boolean(),
  max_ec_delta: z.number(),
  target_runoff_percent: z.number(),
  max_readings: z.number().optional(),
  readings: z
    .array(
      z.object({
        timestamp: z.string(),
        feed_ec: z.number(),
        drain_ec: z.number(),
        drain_volume_ml: z.number().nullable().optional(),
        feed_volume_ml: z.number().nullable().optional(),
      })
    )
    .optional()
    .default([]),
});

export type SerializedDrainConfig = z.infer<typeof DrainConfigSchema>;

const DrybackEventSchema = z.object({
  event_type: z.string().optional(),
  peak_vwc: z.number(),
  trough_vwc: z.number(),
  dryback: z.number(),
  peak_timestamp: z.string().nullable().optional(),
  trough_timestamp: z.string().nullable().optional(),
});

/**
 * `shot_composition_payload()` — the modulation capability and configured band
 * (always present, so the card can explain modulation before the first shot),
 * plus `last_shot`, which is the ShotComposition dataclass and stays null until
 * a P1/P2 shot fires.
 *
 * `infiltration` and `suppressed_by` are typed as loose strings rather than
 * enums: a backend that predates them omits both, and a newer one may add a
 * reason this card has never heard of — neither may fail validation here. The
 * Overview VM maps known values to labels and falls back for the rest.
 */
const ShotCompositionSchema = z.object({
  infiltration: z.string().nullable().optional(),
  suppressed_by: z.string().nullable().optional(),
  ec_modulation_enabled: z.boolean().optional(),
  ec_modulation_available: z.boolean().optional(),
  pore_ec_target_min: z.number().nullable().optional(),
  pore_ec_target_max: z.number().nullable().optional(),
  current_vwc_factor: z.number().optional(),
  current_interval_factor: z.number().optional(),
  dynamic_shot_enabled: z.boolean().optional(),
  last_shot: z
    .object({
      phase: z.string(),
      base_seconds: z.number(),
      vwc_factor: z.number(),
      ec_factor: z.number(),
      ec_modulation_available: z.boolean(),
      composed_seconds: z.number(),
      effective_seconds: z.number(),
      capped: z.boolean(),
      timestamp: z.string(),
    })
    .nullable()
    .optional(),
});

// Measured steering readout (#444/#445/#448): tracker-derived dryback / EC
// fields plus the injected score, Measured Classification, Intent Deviation,
// and shot composition. Measured fields are nullable (no reading yet); a null
// ec_trend with ec_trend_available=false drives the card's unlock hint.
export const SubstrateMetricsSchema = z.object({
  overnight_dryback: z.number().nullable().optional(),
  latest_overnight_event: DrybackEventSchema.nullable().optional(),
  incycle_dryback_count: z.number().optional().default(0),
  incycle_dryback_avg: z.number().nullable().optional(),
  ec_trend: z.enum(['rising', 'stable', 'falling']).nullable().optional(),
  ec_trend_available: z.boolean().optional().default(false),
  ec_trend_detail: z
    .object({
      trend: z.string(),
      day_start_ec: z.number(),
      current_ec: z.number(),
      delta: z.number(),
    })
    .nullable()
    .optional(),
  score: z.number().nullable().optional(),
  measured_classification: z.enum(['vegetative', 'balanced', 'generative']).nullable().optional(),
  intent_deviation: z
    .enum(['on_target', 'more_generative', 'more_vegetative'])
    .nullable()
    .optional(),
  // `infiltration` and `suppressed_by` are typed as loose strings rather than
  // enums: a backend that predates them omits both, and a newer one may add a
  // reason this card has never heard of — neither may fail validation here.
  // The Overview VM maps known values to labels and falls back for the rest.
  shot_composition: ShotCompositionSchema.nullable().optional(),
  // Injected next to the score in view_model_builder.py; unread by the card.
  runoff_score: z.number().nullable().optional(),
});

export type SerializedSubstrateMetrics = z.infer<typeof SubstrateMetricsSchema>;
export type SerializedShotComposition = z.infer<typeof ShotCompositionSchema>;
export type SerializedDrybackEvent = z.infer<typeof DrybackEventSchema>;

/**
 * The reconciled feed/pore EC view (ADR-0015), emitted on the irrigation block
 * by `ec_state_payload()` and null on time-based irrigation. Declared in full
 * though the card reads none of it yet (ADR 0031).
 */
const EcStateSchema = z.object({
  pore_ec: z.number().nullable().optional(),
  recommendation: z.string().optional(),
  active_feed_ec: z.unknown().optional(),
  feed_ec_source: z.string().nullable().optional(),
  runoff_ec: z.number().nullable().optional(),
  feed_to_runoff_delta: z.number().nullable().optional(),
  runoff_percent: z.number().nullable().optional(),
  runoff_pct_target: z.number().nullable().optional(),
  halt_irrigation: z.boolean().optional(),
});

export const CirculationFanConfigSchema = z.object({
  enabled: z.boolean(),
  regulation_mode: z.enum(['vpd', 'humidity', 'temperature']),
  min_speed: z.number(),
  max_speed: z.number(),
  vpd_target: z.number(),
  vpd_tolerance: z.number(),
  humidity_target: z.number(),
  humidity_tolerance: z.number(),
  temperature_target: z.number(),
  temperature_tolerance: z.number(),
  critical_temp_low: z.number().nullable(),
  critical_temp_high: z.number().nullable(),
  critical_temp_hysteresis: z.number(),
  wind_enabled: z.boolean(),
  wind_period_seconds: z.number(),
  wind_amplitude_pct: z.number(),
  stage_vpd_enabled: z.boolean(),
  stage_vpd_overrides: z
    .record(z.string(), z.object({ day: z.number(), night: z.number() }))
    .optional()
    .default({}),
});

export type CirculationFanConfig = z.infer<typeof CirculationFanConfigSchema>;

// Standalone schema mirroring the backend's independent ExhaustFanConfig dataclass
// (not a subclass of CirculationFanConfig). Exhaust demand is always combined, so
// there is no regulation_mode; exhaust has no wind effect either.
export const ExhaustFanConfigSchema = z.object({
  enabled: z.boolean(),
  min_speed: z.number(),
  max_speed: z.number(),
  vpd_target: z.number(),
  vpd_tolerance: z.number(),
  humidity_target: z.number(),
  humidity_tolerance: z.number(),
  temperature_target: z.number(),
  temperature_tolerance: z.number(),
  critical_temp_low: z.number().nullable(),
  critical_temp_high: z.number().nullable(),
  critical_temp_hysteresis: z.number(),
  stage_vpd_enabled: z.boolean(),
  stage_vpd_overrides: z
    .record(z.string(), z.object({ day: z.number(), night: z.number() }))
    .optional()
    .default({}),
});

export type ExhaustFanConfig = z.infer<typeof ExhaustFanConfigSchema>;

// An AC Infinity actuator bundle (ADR-0022 in the integration). A port exposes no
// `fan` entity, so it is driven via a mode `select` + speed `number`. Keys stay
// snake_case end-to-end to match the backend wire shape (no camelCase conversion).
export const AcInfinityDeviceSchema = z.object({
  mode_entity: z.string(),
  speed_entity: z.string(),
  on_speed: z.number().optional().default(10),
});

export type AcInfinityDevice = z.infer<typeof AcInfinityDeviceSchema>;

// Schedule-driven grow light controller config (backend GrowLightConfig). Not
// sensor-regulated: the light holds `power` during the photoperiod.
export const GrowLightConfigSchema = z.object({
  enabled: z.boolean(),
  power: z.number(),
  sunrise_enabled: z.boolean().optional().default(false),
  sunrise_minutes: z.number().optional().default(0),
});

export type GrowLightConfig = z.infer<typeof GrowLightConfigSchema>;

// An AC Infinity grow light port (backend ACInfinityGrowLight). Unlike the fan
// bundle it is a configurator: mode select + on/off `time` entities + on_power,
// plus the native sunrise switch + duration. Keys stay snake_case end-to-end.
export const AcInfinityGrowLightSchema = z.object({
  mode_entity: z.string(),
  on_time_entity: z.string(),
  off_time_entity: z.string(),
  power_entity: z.string(),
  sunrise_switch_entity: z.string().optional().default(''),
  sunrise_duration_entity: z.string().optional().default(''),
});

export type AcInfinityGrowLight = z.infer<typeof AcInfinityGrowLightSchema>;

export const LegacyStageThresholdsSchema = z.record(
  z.string(),
  z.record(z.string(), z.object({ on: z.number(), off: z.number() }))
);

const StageTargetThresholdsSchema = z.record(
  z.string(),
  z.object({ target: z.number(), tolerance: z.number() })
);

const EnvironmentThresholdsSchema = z.union([
  StageTargetThresholdsSchema,
  LegacyStageThresholdsSchema,
]);

// Cumulative water usage for a growspace (backend WaterUsageData), plus the
// `liters_today` figure the view model folds in on top of the dataclass. This
// schema is the single description of the shape — the wire type below is
// derived from it, so a field missing here can no longer be "present" in
// TypeScript while zod strips it at runtime.
export const WaterUsageSchema = z.object({
  total_liters: z.number().optional().default(0),
  cycle_start_date: z.string().optional().default(''),
  // Deliberately left as unknown elements. A stricter element type would make a
  // single malformed entry fail the whole get_data parse (hassCall throws on
  // schema mismatch), trading one missing field for a blank card; the adapter
  // casts instead. The entries' own shape is out of scope for this seam.
  daily_readings: z.array(z.unknown()).optional().default([]),
  // Rolling-window size the backend enforces on daily_readings. Serialized by
  // the dataclass, unused by the card, declared so the shape stays complete.
  max_daily_readings: z.number().optional(),
  // Aggregate Water Use figure. Omitted by the backend when it can't be
  // computed, so the Today's Usage KPI must treat absent and zero differently.
  liters_today: z.number().nullable().optional(),
});

export type SerializedWaterUsage = z.infer<typeof WaterUsageSchema>;

export const GrowspaceAPIResponseSchema = z.object({
  identity: z
    .object({
      growspace_id: z.string(),
      overview_entity_id: z.string().nullish(),
      name: z.string(),
      type: z.enum(['normal', 'mother', 'clone', 'dry', 'cure', 'flower', 'veg']),
      notification_target: z.string().nullable().optional(),
    })
    .optional()
    .default({ growspace_id: '', name: '', type: 'normal' }),

  grid: GridApiSchema,

  environment: z
    .object({
      temperature_sensor: z.string().optional(),
      humidity_sensor: z.string().optional(),
      vpd_sensor: z.string().optional(),
      co2_sensor: z.string().optional(),
      soil_moisture_sensor: z.string().optional(),
      light_sensor: z.string().optional(),
      exhaust_entity: z.string().optional(),
      humidifier_entity: z.string().optional(),
      humidifier_control_enabled: z.boolean().optional(),
      dehumidifier_entity: z.string().optional(),
      dehumidifier_control_enabled: z.boolean().optional(),
      circulation_fan_entity: z.string().optional(),
      circulation_fan_entities: z.array(z.string()).optional().default([]),
      circulation_fan_config: CirculationFanConfigSchema.optional(),
      exhaust_fan_config: ExhaustFanConfigSchema.optional(),
      exhaust_fan_entities: z.array(z.string()).optional().default([]),
      humidifier_entities: z.array(z.string()).optional().default([]),
      dehumidifier_entities: z.array(z.string()).optional().default([]),
      exhaust_fan_ac_infinity_devices: z.array(AcInfinityDeviceSchema).optional().default([]),
      circulation_fan_ac_infinity_devices: z.array(AcInfinityDeviceSchema).optional().default([]),
      humidifier_ac_infinity_devices: z.array(AcInfinityDeviceSchema).optional().default([]),
      dehumidifier_ac_infinity_devices: z.array(AcInfinityDeviceSchema).optional().default([]),
      growlight_entities: z.array(z.string()).optional().default([]),
      growlight_ac_infinity_devices: z.array(AcInfinityGrowLightSchema).optional().default([]),
      growlight_config: GrowLightConfigSchema.optional(),
      light_sensors: z.array(z.string()).optional().default([]),
      // Plural sensor lists. The singular *_sensor keys above are the legacy
      // single-entity form; both are emitted.
      temperature_sensors: z.array(z.string()).optional().default([]),
      humidity_sensors: z.array(z.string()).optional().default([]),
      vpd_sensors: z.array(z.string()).optional().default([]),
      lung_room_temp_sensors: z.array(z.string()).optional().default([]),
      power_sensors: z.array(z.string()).optional().default([]),
      // EC / pH / flow sensor lists — the card uses these for capability
      // detection (e.g. the Pore EC controls unlock on pore_ec_sensors).
      ph_sensors: z.array(z.string()).optional().default([]),
      feed_ec_sensors: z.array(z.string()).optional().default([]),
      bulk_ec_sensors: z.array(z.string()).optional().default([]),
      pore_ec_sensors: z.array(z.string()).optional().default([]),
      runoff_ec_sensors: z.array(z.string()).optional().default([]),
      drain_volume_sensors: z.array(z.string()).optional().default([]),
      irrigation_flow_sensors: z.array(z.string()).optional().default([]),
      vision_checkup_config: VisionCheckupConfigSchema.optional(),
      lst_offset: z.number().optional(),
      stress_threshold: z.number().nullable().optional(),
      mold_threshold: z.number().nullable().optional(),
      vpd: z.string().nullable().optional(),
      soil_moisture_value: z.string().nullable().optional(),
      // Acceptable Moisture Band. The raw pair is the stored override (null =
      // inherited) and survives the sensor being replaced or removed, so the
      // backend emits it unconditionally. `soil_moisture_band` is the resolved
      // effective band; unit + compatibility only exist when a sensor is
      // configured, so absent is not the same as incompatible.
      soil_moisture_min: z.number().nullable().optional(),
      soil_moisture_max: z.number().nullable().optional(),
      soil_moisture_band: z
        .object({
          min: z.number(),
          max: z.number(),
          is_custom: z.boolean(),
        })
        .optional(),
      soil_moisture_unit: z.string().nullable().optional(),
      soil_moisture_band_compatible: z.boolean().optional(),
      // Live actuator/sensor states the serializer reads off hass. Only
      // humidifier_state is read by the card today; the rest are declared
      // because the backend emits them (ADR 0031), not because they are used.
      dehumidifier_state: z.string().nullable().optional(),
      humidifier_state: z.string().nullable().optional(),
      exhaust_state: z.string().nullable().optional(),
      circulation_fan_state: z.string().nullable().optional(),
      temperature: z.string().nullable().optional(),
      humidity: z.string().nullable().optional(),
      // Copied straight off the dehumidifier entity's attributes, so their
      // type is the entity's, not ours. Unread by the card.
      dehumidifier_humidity: z.unknown().optional(),
      dehumidifier_current_humidity: z.unknown().optional(),
      dehumidifier_mode: z.unknown().optional(),
      // Derived pore-EC minus bulk-EC average; only present when both read.
      substrate_ec_delta: z.number().optional(),
      humidifier_thresholds: EnvironmentThresholdsSchema.optional().default({}),
      dehumidifier_thresholds: EnvironmentThresholdsSchema.optional().default({}),
      vpd_optimal_overrides: z
        .record(
          z.string(),
          z.object({
            day: z.object({ low: z.number(), high: z.number() }),
            night: z.object({ low: z.number(), high: z.number() }),
          })
        )
        .optional()
        .default({}),
      electricity_cost_per_kwh: z.number().nullable().optional(),
      substrate_temperature_sensors: z.array(z.string()).optional().default([]),
      camera_entities: z.array(z.string()).optional().default([]),
      energy_sensors: z.array(z.string()).optional().default([]),
      irrigation_tanks: z.array(z.unknown()).optional().default([]),
      irrigation_pump_state: z.string().nullable().optional(),
      drain_pump_state: z.string().nullable().optional(),
      active_events: z.record(z.string(), z.unknown()).optional().default({}),
    })
    .optional()
    .prefault({}),

  sensors: z
    .object({
      sensor_types: z.record(z.string(), z.string()).optional().default({}),
      sensor_coordinates: z
        .record(
          z.string(),
          z.object({
            x: z.number(),
            y: z.number(),
            z: z.number(),
            rotation: z.number().optional(),
          })
        )
        .optional()
        .default({}),
      sensor_groups: z.array(z.unknown()).optional().default([]),
    })
    .optional()
    .prefault({}),

  // Same wire shape as get_subareas (SubareaSchema). Optional: older backends
  // don't include the key in the growspace payload.
  subareas: z.array(SubareaSchema).optional(),

  irrigation: z
    .object({
      irrigation_config: IrrigationConfigSchema.optional().prefault({}),
      irrigation_strategy: IrrigationStrategySchema.nullable().optional().default(null),
      // Server-authoritative Volume Mode gate (ADR-0017): true only when a
      // substrate profile and a positive pump flow rate are both configured.
      // Left `.optional()` with no default so an older backend that omits it
      // stays distinguishable from one that reports false; the adapter's
      // `?? false` is the single place that collapses absence to locked.
      volume_mode_capable: z.boolean().optional(),
      drain_config: DrainConfigSchema.nullable().optional(),
      substrate: SubstrateMetricsSchema.nullable().optional(),
      ec_state: EcStateSchema.nullable().optional(),
      water_usage: WaterUsageSchema.nullable().optional(),
      last_cycle_timestamp: z.string().nullable().optional(),
      next_scheduled_cycle: z.string().nullable().optional(),
      projected_shot_window: z.object({ start: z.string(), end: z.string() }).nullable().optional(),
      cycles_today: z.number().optional().default(0),
      volume_dispensed_today: z.number().optional().default(0),
    })
    .optional()
    .prefault({}),

  metrics: z
    .object({
      vpd_status: z.string().optional().default('unknown'),
      vpd_target_min: z.preprocess(
        (val) => (val === null ? undefined : val),
        z.number().optional().default(0)
      ),
      vpd_target_max: z.preprocess(
        (val) => (val === null ? undefined : val),
        z.number().optional().default(0)
      ),
      vpd_danger_min: z.preprocess(
        (val) => (val === null ? undefined : val),
        z.number().optional().default(0)
      ),
      vpd_danger_max: z.preprocess(
        (val) => (val === null ? undefined : val),
        z.number().optional().default(0)
      ),
      // Per-period VPD bands the analyzer emits alongside the resolved pair
      // above. The hero and metric descriptors prefer day_* when present.
      day_vpd_target_min: z.number().nullable().optional(),
      day_vpd_target_max: z.number().nullable().optional(),
      day_vpd_danger_min: z.number().nullable().optional(),
      day_vpd_danger_max: z.number().nullable().optional(),
      night_vpd_target_min: z.number().nullable().optional(),
      night_vpd_target_max: z.number().nullable().optional(),
      night_vpd_danger_min: z.number().nullable().optional(),
      night_vpd_danger_max: z.number().nullable().optional(),
      // Bayesian stage blend, emitted with the metrics but unread by the card.
      transition_factor: z.number().optional(),
      transition_stages: z.array(z.string()).optional(),
      granular_stage: z.string().optional().default('unknown'),
      is_day: z.boolean().optional().default(false),
      veg_week: z.number().optional().default(0),
      flower_week: z.number().optional().default(0),
      // Emitted next to veg_week/flower_week; unread by the card, which
      // derives the dry/cure weeks per plant.
      dry_week: z.number().optional(),
      cure_week: z.number().optional(),
      max_veg_days: z.number().optional().default(0),
      max_flower_days: z.number().optional().default(0),
      max_dry_days: z.number().optional().default(0),
      max_cure_days: z.number().optional().default(0),
      max_stage_summary: z.string().optional().default(''),
      air_exchange: z
        .union([z.string(), z.number().transform(String)])
        .nullable()
        .optional(),
      energy_tracking: z
        .object({
          cycle_start_date: z.string().nullable().optional(),
          cycle_start_kwh: z.number().nullable().optional(),
          last_kwh_reading: z.number().nullable().optional(),
        })
        .nullable()
        .optional(),
    })
    .optional()
    .prefault({}),

  // Global notification settings duplicated onto every growspace payload so
  // the Config Dialog can seed/round-trip saved values.
  notification_settings: z.record(z.string(), z.number()).optional(),
  ai_auto_alerts: z.boolean().optional(),
  timed_notifications: z.array(TimedNotificationSchema).optional(),

  _ts: z.number().optional(),
});

export type GrowspaceAPISchemaResponse = z.infer<typeof GrowspaceAPIResponseSchema>;

export const GrowspaceAPICollectionSchema = z.record(z.string(), GrowspaceAPIResponseSchema);
export type GrowspaceAPICollection = z.infer<typeof GrowspaceAPICollectionSchema>;

export const GrowReportSchema = z.object({
  summary: z.object({
    plant_count: z.number(),
    strains: z.array(z.string()),
    stages: z.record(z.string(), z.unknown()),
  }),
  harvest: z.object({
    total_wet_weight: z.number(),
    total_dry_weight: z.number(),
    total_trim_weight: z.number(),
    top_thc: z.number().nullable().optional(),
  }),
  environment: z.object({
    temperature_avg: z.number().nullable().optional(),
    humidity_avg: z.number().nullable().optional(),
    vpd_avg: z.number().nullable().optional(),
  }),
});

export type GrowReport = z.infer<typeof GrowReportSchema>;
