/**
 * Irrigation slice — zod schemas for service call payloads.
 *
 * These schemas are the authoritative contracts for Irrigation-domain HA service
 * calls. They replace the Irrigation-related schemas that lived in the monolithic
 * `schemas/api-schema.ts` and the legacy IrrigationAPI class.
 *
 * All schemas are private to the Irrigation slice unless re-exported here.
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

const growspaceIdPayload = z.object({ growspace_id: z.string() });

// ---------------------------------------------------------------------------
// Mode / Strategy
// ---------------------------------------------------------------------------

export const IrrigationModeSchema = z.enum(['manual', 'crop_steering']);
export type IrrigationMode = z.infer<typeof IrrigationModeSchema>;

export const SetIrrigationStrategyPayloadSchema = growspaceIdPayload.extend({
  enabled: z.boolean().optional(),
  lights_on_time: z.string().optional(),
  p0_duration_minutes: z.number().int().optional(),
  p2_stop_before_lights_off_minutes: z.number().int().optional(),
  target_vwc_percent: z.number().optional(),
  maintenance_dryback_percent: z.number().optional(),
  shot_duration_seconds: z.number().int().optional(),
  shot_interval_minutes: z.number().int().optional(),
  auto_light_tracking: z.boolean().optional(),
});

export type SetIrrigationStrategyPayload = z.infer<typeof SetIrrigationStrategyPayloadSchema>;

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export const SaveIrrigationSettingsPayloadSchema = growspaceIdPayload.extend({
  irrigation_pump_entity: z.string(),
  drain_pump_entity: z.string(),
  irrigation_duration: z.number().int(),
  drain_duration: z.number().int(),
  soil_trigger_percent: z.number().nullable().optional(),
  daily_volume_cap_liters: z.number().nullable().optional(),
  max_cycles_per_day: z.number().int().nullable().optional(),
  skip_during_dark: z.boolean().optional(),
  pause_on_low_tank: z.boolean().optional(),
  log_to_logbook: z.boolean().optional(),
  auto_advance_p1_to_p2: z.boolean().optional(),
  auto_advance_p2_to_p3: z.boolean().optional(),
  halt_on_runoff_ec_threshold: z.number().nullable().optional(),
  active_steering_phase: z.enum(['p1', 'p2', 'p3']).optional(),
});

export type SaveIrrigationSettingsPayload = z.infer<typeof SaveIrrigationSettingsPayloadSchema>;

// ---------------------------------------------------------------------------
// Schedule
// ---------------------------------------------------------------------------

export const AddIrrigationTimePayloadSchema = growspaceIdPayload.extend({
  time: z.string(),
  duration: z.number().int().optional(),
});

export type AddIrrigationTimePayload = z.infer<typeof AddIrrigationTimePayloadSchema>;

export const RemoveIrrigationTimePayloadSchema = growspaceIdPayload.extend({
  time: z.string(),
});

export type RemoveIrrigationTimePayload = z.infer<typeof RemoveIrrigationTimePayloadSchema>;

export const AddDrainTimePayloadSchema = growspaceIdPayload.extend({
  time: z.string(),
  duration: z.number().int().optional(),
});

export type AddDrainTimePayload = z.infer<typeof AddDrainTimePayloadSchema>;

export const RemoveDrainTimePayloadSchema = growspaceIdPayload.extend({
  time: z.string(),
});

export type RemoveDrainTimePayload = z.infer<typeof RemoveDrainTimePayloadSchema>;

// ---------------------------------------------------------------------------
// Drain monitoring
// ---------------------------------------------------------------------------

export const LogDrainReadingPayloadSchema = growspaceIdPayload.extend({
  feed_ec: z.number(),
  drain_ec: z.number(),
  feed_volume_ml: z.number().optional(),
  drain_volume_ml: z.number().optional(),
});

export type LogDrainReadingPayload = z.infer<typeof LogDrainReadingPayloadSchema>;

export const ConfigureDrainMonitoringPayloadSchema = growspaceIdPayload.extend({
  enabled: z.boolean().optional(),
  max_ec_delta: z.number().optional(),
  target_runoff_percent: z.number().optional(),
});

export type ConfigureDrainMonitoringPayload = z.infer<typeof ConfigureDrainMonitoringPayloadSchema>;

// ---------------------------------------------------------------------------
// Cycle
// ---------------------------------------------------------------------------

export const RunIrrigationCyclePayloadSchema = growspaceIdPayload.extend({
  duration: z.number().int().optional(),
});

export type RunIrrigationCyclePayload = z.infer<typeof RunIrrigationCyclePayloadSchema>;

// ---------------------------------------------------------------------------
// Phase windows (derived type — not a service payload)
// ---------------------------------------------------------------------------

export const PhaseWindowSchema = z.object({
  id: z.enum(['p0', 'p1', 'p2', 'p3']),
  label: z.string(),
  name: z.string(),
  start: z.number().int(),
  end: z.number().int(),
  color: z.string(),
  target: z.string(),
});

export type PhaseWindow = z.infer<typeof PhaseWindowSchema>;

export const PhaseWindowsSchema = z.object({
  lightsOnMin: z.number().int(),
  lightsOffMin: z.number().int(),
  lightHours: z.number(),
  phases: z.array(PhaseWindowSchema),
});

export type PhaseWindows = z.infer<typeof PhaseWindowsSchema>;
