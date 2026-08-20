/**
 * Subarea slice — zod schemas for WebSocket response validation.
 *
 * Replaces the plain TypeScript interfaces that lived in
 * `services/api/subarea-api.ts` and `services/types.ts`.
 */

import { z } from 'zod';
import { VisionCheckupConfigSchema } from '../camera/schema';

const StageVpdOverridesSchema = z
  .record(z.string(), z.object({ day: z.number(), night: z.number() }))
  .optional()
  .default({});

const CirculationFanConfigSchema = z.object({
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
  stage_vpd_overrides: StageVpdOverridesSchema,
});

const ExhaustFanConfigSchema = CirculationFanConfigSchema.omit({
  regulation_mode: true,
  wind_enabled: true,
  wind_period_seconds: true,
  wind_amplitude_pct: true,
});

const AcInfinityDeviceSchema = z.object({
  mode_entity: z.string(),
  speed_entity: z.string(),
  on_speed: z.number().optional().default(10),
});

const AcInfinityGrowLightSchema = z.object({
  mode_entity: z.string(),
  on_time_entity: z.string(),
  off_time_entity: z.string(),
  power_entity: z.string(),
  sunrise_switch_entity: z.string().optional().default(''),
  sunrise_duration_entity: z.string().optional().default(''),
});

const GrowLightConfigSchema = z.object({
  enabled: z.boolean(),
  power: z.number(),
  sunrise_enabled: z.boolean().optional().default(false),
  sunrise_minutes: z.number().optional().default(0),
});

const StageThresholdsSchema = z
  .record(z.string(), z.object({ target: z.number(), tolerance: z.number() }))
  .optional();

const VpdOptimalOverridesSchema = z
  .record(
    z.string(),
    z.object({
      day: z.object({ low: z.number(), high: z.number() }),
      night: z.object({ low: z.number(), high: z.number() }),
    })
  )
  .optional();

// ---------------------------------------------------------------------------
// SensorGroup
// ---------------------------------------------------------------------------

export const SensorGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  x: z.number(),
  y: z.number(),
  z: z.number(),
  // The backend model defaults these to empty lists and `to_dict()` always
  // emits them (`models/growspace.py:85-87`); defaulting here keeps a group
  // usable for its coordinates even if a stored one predates a list.
  temperature_sensors: z.array(z.string()).optional().default([]),
  humidity_sensors: z.array(z.string()).optional().default([]),
  vpd_sensors: z.array(z.string()).optional().default([]),
});

export type SensorGroup = z.infer<typeof SensorGroupSchema>;

// ---------------------------------------------------------------------------
// EnvironmentConfig
// ---------------------------------------------------------------------------

export const EnvironmentConfigSchema = z.object({
  temperature_sensor: z.string().nullish(),
  humidity_sensor: z.string().nullish(),
  vpd_sensor: z.string().nullish(),
  co2_sensor: z.string().nullish(),
  soil_moisture_sensor: z.string().nullish(),
  // Subareas share the backend's EnvironmentConfig model, so its Acceptable
  // Moisture Band fields are serialized here too. Declared for contract
  // completeness only — subareas have no band of their own and nothing reads
  // these; the band is configured per growspace.
  soil_moisture_min: z.number().nullish(),
  soil_moisture_max: z.number().nullish(),
  veg_day_hours: z.number().optional(),
  flower_day_hours: z.number().optional(),
  temperature_sensors: z.array(z.string()).optional(),
  humidity_sensors: z.array(z.string()).optional(),
  vpd_sensors: z.array(z.string()).optional(),
  light_sensors: z.array(z.string()).optional(),
  exhaust_fan_entities: z.array(z.string()).optional(),
  circulation_fan_entities: z.array(z.string()).optional(),
  humidifier_entities: z.array(z.string()).optional(),
  dehumidifier_entities: z.array(z.string()).optional(),
  growlight_entities: z.array(z.string()).optional(),
  exhaust_fan_ac_infinity_devices: z.array(AcInfinityDeviceSchema).optional(),
  circulation_fan_ac_infinity_devices: z.array(AcInfinityDeviceSchema).optional(),
  humidifier_ac_infinity_devices: z.array(AcInfinityDeviceSchema).optional(),
  dehumidifier_ac_infinity_devices: z.array(AcInfinityDeviceSchema).optional(),
  growlight_ac_infinity_devices: z.array(AcInfinityGrowLightSchema).optional(),
  circulation_fan_config: CirculationFanConfigSchema.optional(),
  exhaust_fan_config: ExhaustFanConfigSchema.optional(),
  growlight_config: GrowLightConfigSchema.optional(),
  sensor_coordinates: z
    .record(
      z.string(),
      z.object({ x: z.number(), y: z.number(), z: z.number(), rotation: z.number().optional() })
    )
    .optional(),
  sensor_groups: z.array(SensorGroupSchema).optional(),
  substrate_temperature_sensors: z.array(z.string()).optional(),
  camera_entities: z.array(z.string()).optional(),
  lung_room_temp_sensors: z.array(z.string()).optional(),
  ph_sensors: z.array(z.string()).optional(),
  feed_ec_sensors: z.array(z.string()).optional(),
  bulk_ec_sensors: z.array(z.string()).optional(),
  pore_ec_sensors: z.array(z.string()).optional(),
  runoff_ec_sensors: z.array(z.string()).optional(),
  drain_volume_sensors: z.array(z.string()).optional(),
  irrigation_flow_sensors: z.array(z.string()).optional(),
  power_sensors: z.array(z.string()).optional(),
  energy_sensors: z.array(z.string()).optional(),
  electricity_cost_per_kwh: z.number().optional(),
  dli_target_veg: z.number().optional(),
  dli_target_flower: z.number().optional(),
  lst_offset: z.number().optional(),
  control_dehumidifier: z.boolean().optional(),
  control_humidifier: z.boolean().optional(),
  dehumidifier_thresholds: StageThresholdsSchema,
  humidifier_thresholds: StageThresholdsSchema,
  minimum_source_air_temperature: z.number().optional(),
  bayesian_options: z.record(z.string(), z.unknown()).optional(),
  irrigation_tanks: z.array(z.unknown()).optional(),
  snapshot_interval_hours: z.number().optional(),
  vision_checkup_config: VisionCheckupConfigSchema.optional(),
  vpd_optimal_overrides: VpdOptimalOverridesSchema,
  stress_threshold: z.number().optional(),
  mold_threshold: z.number().optional(),
});

export type EnvironmentConfig = z.infer<typeof EnvironmentConfigSchema>;

// ---------------------------------------------------------------------------
// Subarea
// ---------------------------------------------------------------------------

export const SubareaSchema = z.object({
  id: z.string(),
  name: z.string(),
  environment_config: EnvironmentConfigSchema,
});

export type Subarea = z.infer<typeof SubareaSchema>;

// ---------------------------------------------------------------------------
// Response schemas
// ---------------------------------------------------------------------------

/** get_subareas returns an array of Subarea objects. */
export const GetSubareasResponseSchema = z.array(SubareaSchema);

/** add_subarea and update_subarea return a single Subarea. */
export const SubareaResponseSchema = SubareaSchema;

/** remove_subarea returns nothing meaningful. */
export const RemoveSubareaResponseSchema = z.unknown();
