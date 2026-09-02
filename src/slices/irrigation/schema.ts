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
  p1_shot_duration_seconds: z.number().int().optional(),
  p1_shot_interval_minutes: z.number().int().optional(),
  p2_shot_duration_seconds: z.number().int().optional(),
  p2_shot_interval_minutes: z.number().int().optional(),
  p1_shot_volume_percent: z.number().optional(),
  p2_shot_volume_percent: z.number().optional(),
  shot_sizing_mode: z.enum(['seconds', 'volume']).optional(),
  // Substrate Profile (#446): the backend accepts flat keys and folds them into
  // the nested substrate_profile server-side (read side stays nested).
  substrate_media_type: z.enum(['coco', 'rockwool', 'soil']).optional(),
  substrate_liters_per_pot: z.number().optional(),
  // Pore EC Target Band + EC Modulation (#447). null clears a band edge.
  pore_ec_target_min: z.number().nullable().optional(),
  pore_ec_target_max: z.number().nullable().optional(),
  ec_modulation_enabled: z.boolean().optional(),
  auto_light_tracking: z.boolean().optional(),
  // Adaptive Shot Control (ADR-0014).
  dynamic_shot_enabled: z.boolean().optional(),
  dynamic_aggressiveness: z.number().optional(),
  dynamic_recovery: z.number().optional(),
  dynamic_shot_size_floor: z.number().optional(),
  dynamic_interval_ceiling: z.number().optional(),
});

export type SetIrrigationStrategyPayload = z.infer<typeof SetIrrigationStrategyPayloadSchema>;

export const SteeringModeSchema = z.enum(['vegetative', 'balanced', 'generative']);
export type SteeringMode = z.infer<typeof SteeringModeSchema>;

/** Result of the apply_steering_mode WS command (server stamps the preset). */
export const ApplySteeringModeResultSchema = z.object({
  growspace_id: z.string(),
  declared_steering_mode: SteeringModeSchema,
});

export type ApplySteeringModeResult = z.infer<typeof ApplySteeringModeResultSchema>;

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export const SaveIrrigationSettingsPayloadSchema = growspaceIdPayload.extend({
  irrigation_pump_entity: z.string(),
  pump_flow_rate_ml_per_sec: z.number().nonnegative().optional(),
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

// ---------------------------------------------------------------------------
// In-flight cycles (read — the values of the `environment.active_events` Opaque Region)
// ---------------------------------------------------------------------------

/**
 * One in-flight irrigation or drain cycle
 * (`irrigation_coordinator.py:507-510`). The record is keyed by event type
 * (`'irrigation'` or `'drain'`) and its entries are popped when the cycle ends,
 * so it holds only what is running right now.
 */
export const ActiveEventSchema = z.object({
  /** UTC ISO-8601 start. */
  start: z.string(),
  /** Cycle length in **seconds**. */
  duration: z.number().int(),
});

export type ActiveEvent = z.infer<typeof ActiveEventSchema>;

// ---------------------------------------------------------------------------
// Tank rows (read — the elements of the `environment.irrigation_tanks` Opaque Region)
// ---------------------------------------------------------------------------

/**
 * A refill entry in `water_history.recent_refills` — the raw event dict the
 * tracker built, passed through by reference (`growspace_view_model.py:90`,
 * `tank_water_tracker.py:242-246`). Only refills are shipped, so the
 * `growth_stage` the tracker adds on the consumption branch cannot appear here.
 */
export const TankWaterEventSchema = z.object({
  timestamp: z.string(),
  event_type: z.enum(['consumption', 'refill']),
  pct_delta: z.number(),
  liters: z.number(),
});

export type TankWaterEvent = z.infer<typeof TankWaterEventSchema>;

/** One day of the 7-day summary (`growspace_view_model.py:95-99`). */
export const TankDailyEntrySchema = z.object({
  date: z.string(),
  consumed: z.number(),
  refilled: z.number(),
});

export type TankDailyEntry = z.infer<typeof TankDailyEntrySchema>;

/** A 15-minute consumption bucket (`tank_water_tracker.py:118`). */
export const TankConsumptionBucketSchema = z.object({
  /** ISO-8601 start of the bucket. */
  ts: z.string(),
  /** Liters consumed in this bucket. */
  liters: z.number(),
});

export type TankConsumptionBucket = z.infer<typeof TankConsumptionBucketSchema>;

/**
 * The tank's water history, which is *only* the three computed summaries:
 * `growspace_view_model.py:640-648` folds in `_compute_tank_water_summaries`
 * and deliberately omits the raw `snapshots` and `events` that the
 * `TankWaterHistory` model carries, to stay inside the attribute-size budget.
 * They were declared here as "kept for forward compatibility"; nothing reads
 * them and the backend has no branch that emits them, so they are gone.
 */
export const TankWaterHistorySchema = z.object({
  buckets_24h: z.array(TankConsumptionBucketSchema).optional(),
  daily_7d: z.array(TankDailyEntrySchema).optional(),
  recent_refills: z.array(TankWaterEventSchema).optional(),
});

export type TankWaterHistory = z.infer<typeof TankWaterHistorySchema>;

export const TankDepletionStatusSchema = z.enum([
  'depleting',
  'refilling',
  'static',
  'insufficient_data',
]);

export type TankDepletionStatus = z.infer<typeof TankDepletionStatusSchema>;

/**
 * One row of `environment.irrigation_tanks` (`growspace_view_model.py:630-641`).
 *
 * The array itself stays an Opaque Region in the growspace payload (ADR 0031,
 * opaque-by-arity: the row count is grower-driven, and a stricter element type
 * would fail the whole `get_data` parse over one malformed tank). The row shape
 * is not opaque, though — the adapter parses each row with this schema and drops
 * only the rows that fail, so the blast radius stays one tank while the shape is
 * still described exactly once.
 *
 * `enable_prediction`, `enable_lights_bias`, `enable_vpd_weighting`,
 * `last_recorded_level` and `peak_level` exist on the backend model
 * (`models/irrigation.py:279-284`) but are not emitted on these rows.
 */
export const IrrigationTankRowSchema = z.object({
  sensor_entity: z.string(),
  name: z.string(),
  warning_level: z.number(),
  /** null when the sensor is missing or its state does not parse. */
  fill_level: z.number().nullable(),
  is_warning: z.boolean(),
  hours_remaining: z.number().nullable().optional(),
  depletion_status: TankDepletionStatusSchema.nullable().optional(),
  volume_liters: z.number().nullable().optional(),
  water_history: TankWaterHistorySchema.optional(),
});

export type SerializedIrrigationTank = z.infer<typeof IrrigationTankRowSchema>;

// ---------------------------------------------------------------------------
// Irrigation analytics (read — not a service payload)
// ---------------------------------------------------------------------------

export const IrrigationAnalyticsSchema = z.object({
  growspace_id: z.string(),
  stage_aggregates: z.record(z.string(), z.number()),
});

export type IrrigationAnalytics = z.infer<typeof IrrigationAnalyticsSchema>;

// ---------------------------------------------------------------------------
// Irrigation Recipes (read — the global library, plus its two write commands)
// ---------------------------------------------------------------------------

/**
 * One schedule row inside a [[Schedule Recipe]] — the backend's
 * `IrrigationScheduleItem` TypedDict verbatim. Declared separately from the
 * growspace payload's transforming twin so this slice owns its own shape and
 * the two schema files stay acyclic; a recipe's rows are never read as times by
 * the card, only carried, so no `time`/`start_time` reconciliation is needed.
 */
const RecipeScheduleItemSchema = z.object({
  time: z.string().optional(),
  duration: z.number().nullable().optional(),
  start_time: z.string().optional(),
  duration_seconds: z.number().nullable().optional(),
});

export const IrrigationRecipeKindSchema = z.enum(['crop_steering', 'schedule']);
export type IrrigationRecipeKind = z.infer<typeof IrrigationRecipeKindSchema>;

/**
 * [[Recipe Provenance]] — the authoring context stamped onto a recipe at save
 * time. Purely descriptive: it sorts and pre-selects the picker and names the
 * authoring medium in a cross-media warning. It never gates an apply.
 *
 * `stage` is null (and `week` 0) when the authoring growspace held no live
 * plants. `stage` stays a bare string rather than an enum because the backend
 * types it as one — a new live stage must not fail the whole payload parse.
 */
export const RecipeProvenanceSchema = z.object({
  media_type: z.enum(['coco', 'rockwool', 'soil']),
  liters_per_pot: z.number(),
  pump_flow_rate_ml_per_sec: z.number(),
  stage: z.string().nullable(),
  week: z.number(),
});

export type RecipeProvenance = z.infer<typeof RecipeProvenanceSchema>;

/**
 * The crop-steering half of a recipe. Declared complete per ADR-0031 and
 * **unread by the card**: applying is a server-side stamp, so these setpoints
 * only ever travel through GSM. Shot sizes are percents of substrate volume,
 * never pump seconds ([[Substrate-Relative Shot Storage]]).
 */
export const CropSteeringRecipeSchema = z.object({
  lights_on_time: z.string(),
  p0_duration_minutes: z.number(),
  p2_stop_before_lights_off_minutes: z.number(),
  target_vwc_percent: z.number(),
  maintenance_dryback_percent: z.number(),
  p1_shot_volume_percent: z.number(),
  p1_shot_interval_minutes: z.number(),
  p2_shot_volume_percent: z.number(),
  p2_shot_interval_minutes: z.number(),
  auto_light_tracking: z.boolean(),
  dynamic_shot_enabled: z.boolean(),
  dynamic_aggressiveness: z.number(),
  dynamic_recovery: z.number(),
  dynamic_shot_size_floor: z.number(),
  dynamic_interval_ceiling: z.number(),
  pore_ec_target_min: z.number().nullable(),
  pore_ec_target_max: z.number().nullable(),
  ec_modulation_enabled: z.boolean(),
});

/** The crop-steering half's stored values, in the backend's own field names. */
export type CropSteeringRecipeValues = z.infer<typeof CropSteeringRecipeSchema>;

/**
 * The time-schedule half of a recipe. Declared complete per ADR-0031 and
 * unread by the card, for the same reason as its crop-steering twin.
 */
export const ScheduleRecipeSchema = z.object({
  irrigation_times: z.array(RecipeScheduleItemSchema),
  drain_times: z.array(RecipeScheduleItemSchema),
  irrigation_duration: z.number().nullable(),
  drain_duration: z.number().nullable(),
  daily_volume_cap_liters: z.number().nullable(),
  max_cycles_per_day: z.number().nullable(),
  skip_during_dark: z.boolean(),
});

/** The schedule half's stored values, in the backend's own field names. */
export type ScheduleRecipeValues = z.infer<typeof ScheduleRecipeSchema>;

/**
 * One [[Irrigation Recipe]] as the backend emits it. Exactly one of
 * `crop_steering` / `schedule` is populated, matching `kind` — the library
 * refuses to store any other combination, so the card can read `kind` alone.
 */
export const IrrigationRecipeSchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: IrrigationRecipeKindSchema,
  provenance: RecipeProvenanceSchema,
  crop_steering: CropSteeringRecipeSchema.nullable(),
  schedule: ScheduleRecipeSchema.nullable(),
  created_at: z.string(),
});

export type SerializedIrrigationRecipe = z.infer<typeof IrrigationRecipeSchema>;

/**
 * The global library as it rides every growspace payload at
 * `irrigation.recipes`, keyed by recipe id. Global, not per-growspace: a recipe
 * saved from one tent is listed from every other.
 */
export const IrrigationRecipeLibrarySchema = z.record(z.string(), IrrigationRecipeSchema);

export type IrrigationRecipeLibrary = z.infer<typeof IrrigationRecipeLibrarySchema>;

export const SaveIrrigationRecipePayloadSchema = z.strictObject({
  growspace_id: z.string(),
  name: z.string(),
  kind: IrrigationRecipeKindSchema,
  /** Present only when overwriting an existing recipe. */
  recipe_id: z.string().optional(),
});

export type SaveIrrigationRecipePayload = z.infer<typeof SaveIrrigationRecipePayloadSchema>;

/**
 * The sparse edit payload for `update_irrigation_recipe`.
 *
 * Everything but the id is optional and an unnamed field keeps what the recipe
 * stores, so a rename carries no values and a value correction carries no name.
 * The half must be the one the recipe's `kind` holds; neither `kind` itself nor
 * any [[Recipe Provenance]] field is writable, because provenance records where
 * the recipe came from rather than what it should say.
 */
export const UpdateIrrigationRecipePayloadSchema = z.strictObject({
  recipe_id: z.string(),
  name: z.string().optional(),
  crop_steering: CropSteeringRecipeSchema.partial().optional(),
  schedule: ScheduleRecipeSchema.partial().optional(),
});

export type UpdateIrrigationRecipePayload = z.infer<typeof UpdateIrrigationRecipePayloadSchema>;

export const ApplyIrrigationRecipePayloadSchema = z.strictObject({
  growspace_id: z.string(),
  recipe_id: z.string(),
});

export type ApplyIrrigationRecipePayload = z.infer<typeof ApplyIrrigationRecipePayloadSchema>;

/**
 * Result of the apply_irrigation_recipe WS command (the server stamps the
 * recipe's values into the ordinary strategy/config fields).
 *
 * It echoes what was recorded so the caller need not re-read the growspace.
 * `warning` is the media-mismatch notice: the apply **succeeded** and the
 * values were deliberately not scaled, because pot size normalises across
 * growspaces and media does not.
 */
export const ApplyIrrigationRecipeResultSchema = z.object({
  growspace_id: z.string(),
  applied_recipe_id: z.string().nullable(),
  recipe_applied_at: z.string().nullable(),
  warning: z.string().nullable(),
});

export type ApplyIrrigationRecipeResult = z.infer<typeof ApplyIrrigationRecipeResultSchema>;
