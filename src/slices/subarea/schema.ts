/**
 * Subarea slice — zod schemas for WebSocket response validation.
 *
 * Replaces the plain TypeScript interfaces that lived in
 * `services/api/subarea-api.ts` and `services/types.ts`.
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// SensorGroup
// ---------------------------------------------------------------------------

export const SensorGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  x: z.number(),
  y: z.number(),
  z: z.number(),
  temperature_sensors: z.array(z.string()),
  humidity_sensors: z.array(z.string()),
  vpd_sensors: z.array(z.string()),
});

// ---------------------------------------------------------------------------
// EnvironmentConfig
// ---------------------------------------------------------------------------

export const EnvironmentConfigSchema = z.object({
  temperature_sensor: z.string().nullish(),
  humidity_sensor: z.string().nullish(),
  vpd_sensor: z.string().nullish(),
  co2_sensor: z.string().nullish(),
  soil_moisture_sensor: z.string().nullish(),
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
  sensor_coordinates: z
    .record(z.object({ x: z.number(), y: z.number(), z: z.number(), rotation: z.number().optional() }))
    .optional(),
  sensor_groups: z.array(SensorGroupSchema).optional(),
  substrate_temperature_sensors: z.array(z.string()).optional(),
  camera_entities: z.array(z.string()).optional(),
  lung_room_temp_sensors: z.array(z.string()).optional(),
  ph_sensors: z.array(z.string()).optional(),
  feed_ec_sensors: z.array(z.string()).optional(),
  substrate_ec_sensors: z.array(z.string()).optional(),
  runoff_ec_sensors: z.array(z.string()).optional(),
  drain_volume_sensors: z.array(z.string()).optional(),
  irrigation_flow_sensors: z.array(z.string()).optional(),
  power_sensors: z.array(z.string()).optional(),
  energy_sensors: z.array(z.string()).optional(),
  electricity_cost_per_kwh: z.number().optional(),
  dli_target_veg: z.number().optional(),
  dli_target_flower: z.number().optional(),
  control_dehumidifier: z.boolean().optional(),
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
