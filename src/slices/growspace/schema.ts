import { z } from 'zod';
import { GridApiSchema } from '../grid/schema';
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

const IrrigationStrategySchema = z.object({
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
});

const IrrigationConfigSchema = z
  .object({
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
  })
  .passthrough()
  .optional()
  .prefault({});

const DrainConfigSchema = z
  .object({
    enabled: z.boolean(),
    max_ec_delta: z.number(),
    target_runoff_percent: z.number(),
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
  })
  .nullable()
  .optional();

const DrybackEventSchema = z.object({
  event_type: z.string().optional(),
  peak_vwc: z.number(),
  trough_vwc: z.number(),
  dryback: z.number(),
  peak_timestamp: z.string().nullable().optional(),
  trough_timestamp: z.string().nullable().optional(),
});

// Measured steering readout (#444/#445/#448): tracker-derived dryback / EC
// fields plus the injected score, Measured Classification, Intent Deviation,
// and shot composition. Measured fields are nullable (no reading yet); a null
// ec_trend with ec_trend_available=false drives the card's unlock hint.
const SubstrateMetricsSchema = z
  .object({
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
    measured_classification: z
      .enum(['vegetative', 'balanced', 'generative'])
      .nullable()
      .optional(),
    intent_deviation: z
      .enum(['on_target', 'more_generative', 'more_vegetative'])
      .nullable()
      .optional(),
    // `infiltration` and `suppressed_by` are typed as loose strings rather than
    // enums: a backend that predates them omits both, and a newer one may add a
    // reason this card has never heard of — neither may fail validation here.
    // The Overview VM maps known values to labels and falls back for the rest.
    shot_composition: z
      .object({
        infiltration: z.string().nullable().optional(),
        suppressed_by: z.string().nullable().optional(),
      })
      .passthrough()
      .nullable()
      .optional(),
  })
  .passthrough()
  .nullable()
  .optional();

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

export const GrowspaceAPIResponseSchema = z
  .object({
    identity: z
      .object({
        growspace_id: z.string(),
        overview_entity_id: z.string().optional(),
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
        exhaust_fan_ac_infinity_devices: z
          .array(AcInfinityDeviceSchema)
          .optional()
          .default([]),
        circulation_fan_ac_infinity_devices: z
          .array(AcInfinityDeviceSchema)
          .optional()
          .default([]),
        humidifier_ac_infinity_devices: z
          .array(AcInfinityDeviceSchema)
          .optional()
          .default([]),
        dehumidifier_ac_infinity_devices: z
          .array(AcInfinityDeviceSchema)
          .optional()
          .default([]),
        growlight_entities: z.array(z.string()).optional().default([]),
        growlight_ac_infinity_devices: z
          .array(AcInfinityGrowLightSchema)
          .optional()
          .default([]),
        growlight_config: GrowLightConfigSchema.optional(),
        light_sensors: z.array(z.string()).optional().default([]),
        vpd: z.string().nullable().optional(),
        soil_moisture_value: z.string().nullable().optional(),
        dehumidifier_state: z.string().nullable().optional(),
        humidifier_thresholds: z
          .record(z.string(), z.record(z.string(), z.object({ on: z.number(), off: z.number() })))
          .optional()
          .default({}),
        dehumidifier_thresholds: z
          .record(z.string(), z.record(z.string(), z.object({ on: z.number(), off: z.number() })))
          .optional()
          .default({}),
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
      .passthrough()
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
        irrigation_config: IrrigationConfigSchema,
        irrigation_strategy: IrrigationStrategySchema.nullable().optional().default(null),
        drain_config: DrainConfigSchema,
        substrate: SubstrateMetricsSchema,
        water_usage: WaterUsageSchema.nullable().optional(),
        last_cycle_timestamp: z.string().nullable().optional(),
        next_scheduled_cycle: z.string().nullable().optional(),
        projected_shot_window: z
          .object({ start: z.string(), end: z.string() })
          .nullable()
          .optional(),
        cycles_today: z.number().optional().default(0),
        volume_dispensed_today: z.number().optional().default(0),
      })
      .optional()
      .prefault({}),

    metrics: z
      .object({
        vpd_status: z.string().optional().default('unknown'),
        vpd_target_min: z.preprocess((val) => (val === null ? undefined : val), z.number().optional().default(0)),
        vpd_target_max: z.preprocess((val) => (val === null ? undefined : val), z.number().optional().default(0)),
        vpd_danger_min: z.preprocess((val) => (val === null ? undefined : val), z.number().optional().default(0)),
        vpd_danger_max: z.preprocess((val) => (val === null ? undefined : val), z.number().optional().default(0)),
        granular_stage: z.string().optional().default('unknown'),
        is_day: z.boolean().optional().default(false),
        veg_week: z.number().optional().default(0),
        flower_week: z.number().optional().default(0),
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
          })
          .nullable()
          .optional(),
      })
      .passthrough()
      .optional()
      .prefault({}),

    // Global notification settings duplicated onto every growspace payload so
    // the Config Dialog can seed/round-trip saved values.
    notification_settings: z.record(z.string(), z.number()).optional(),
    ai_auto_alerts: z.boolean().optional(),
    timed_notifications: z
      .array(
        z.object({
          id: z.string(),
          message: z.string(),
          trigger_type: z.string(),
          day: z.number(),
          growspace_ids: z.array(z.string()),
        })
      )
      .optional(),

    _ts: z.number().optional(),
  })
  .passthrough();

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
