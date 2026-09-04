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
  // [[Skip P2]] (#131): a phase-transition rule, never an edit of the P2 pair.
  skip_p2_after_p1: z.boolean().optional(),
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
});

export type SaveIrrigationSettingsPayload = z.infer<typeof SaveIrrigationSettingsPayloadSchema>;

/**
 * The manual phase override (ADR-0012) — its own action, because the phase is
 * the backend steering machine's to decide and a settings save must not be
 * able to carry a stale one. Named `steering_phase` on the wire, beside
 * `steering_mode`; the growspace payload reports it as `active_steering_phase`.
 */
export const SetSteeringPhasePayloadSchema = growspaceIdPayload.extend({
  steering_phase: z.enum(['p1', 'p2', 'p3']),
});

export type SetSteeringPhasePayload = z.infer<typeof SetSteeringPhasePayloadSchema>;

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

// ---------------------------------------------------------------------------
// Irrigation Programs (read — the global library and a growspace's position in
// the program it is bound to, plus the three write commands)
// ---------------------------------------------------------------------------

/**
 * The live stages an [[Irrigation Program]] slot may be keyed by, in run order.
 *
 * The backend's `LIVE_STAGE_ORDER` verbatim: it is the set of stages
 * `resolve_feed_stage_week` can ever answer with, so a slot keyed by anything
 * else could never resolve and the save is refused naming it. The card needs
 * the same list to lay out the editor's grid and the same *order* to say which
 * slot comes next.
 */
export const PROGRAM_STAGES = ['seedling', 'clone', 'mother', 'veg', 'flower'] as const;
export type ProgramStage = (typeof PROGRAM_STAGES)[number];

/**
 * One `(stage, week)` slot. `recipe_id` may name a recipe the library no longer
 * holds — deleting a recipe empties slots rather than cascading — so a reader
 * resolves it and treats a miss as a gap rather than as an error.
 */
export const ProgramSlotSchema = z.object({
  stage: z.string(),
  week: z.number(),
  recipe_id: z.string(),
});

export type SerializedProgramSlot = z.infer<typeof ProgramSlotSchema>;

/** One [[Irrigation Program]] as the backend emits it, slots already in run order. */
export const IrrigationProgramSchema = z.object({
  id: z.string(),
  name: z.string(),
  slots: z.array(ProgramSlotSchema),
  created_at: z.string(),
});

export type SerializedIrrigationProgram = z.infer<typeof IrrigationProgramSchema>;

/**
 * The global program library as it rides every growspace payload at
 * `irrigation.programs`, keyed by program id — global exactly as the recipe
 * library beside it is.
 */
export const IrrigationProgramLibrarySchema = z.record(z.string(), IrrigationProgramSchema);

export type IrrigationProgramLibrary = z.infer<typeof IrrigationProgramLibrarySchema>;

/**
 * Why a [[Program Hold]] is holding — the backend's `ProgramHold` values.
 *
 * Declared as a list the card narrows against rather than as a `z.enum` on the
 * wire, for the reason `RecipeProvenance.stage` is a bare string: the set has
 * already grown once (three causes in ADR-0045, six once the rule had to act
 * rather than only report), and a seventh must not fail the parse of the whole
 * growspace payload. An unrecognised cause degrades to the backend's own
 * `detail` sentence, which is written for the grower anyway.
 */
export const PROGRAM_HOLDS = [
  'no_position',
  'no_slot',
  'program_complete',
  'recipe_missing',
  'drifted',
  'not_applicable',
] as const;

export type ProgramHold = (typeof PROGRAM_HOLDS)[number];

/** What the program layer will do about a growspace's position, same caveat. */
export const PROGRAM_PROGRESSION_STATES = ['up_to_date', 'available', 'due', 'held'] as const;

export type ProgramProgressionState = (typeof PROGRAM_PROGRESSION_STATES)[number];

export function asProgramHold(value: string | null | undefined): ProgramHold | null {
  return (PROGRAM_HOLDS as readonly string[]).includes(value ?? '') ? (value as ProgramHold) : null;
}

export function asProgramProgressionState(value: string): ProgramProgressionState | null {
  return (PROGRAM_PROGRESSION_STATES as readonly string[]).includes(value)
    ? (value as ProgramProgressionState)
    : null;
}

/**
 * Where a bound growspace currently sits in its [[Irrigation Program]], at
 * `irrigation.program`.
 *
 * `stage`/`week` are reported even when nothing matched, so the card can say
 * *which* week found no slot. `slot` and `recipe` are null independently of one
 * another: a defined position may simply have no slot, and a slot may name a
 * recipe the library no longer holds.
 */
export const GrowspaceProgramStateSchema = z.object({
  program_id: z.string(),
  name: z.string(),
  stage: z.string().nullable(),
  week: z.number(),
  slot: ProgramSlotSchema.nullable(),
  recipe: IrrigationRecipeSchema.nullable(),
  auto_advance: z.boolean(),
  progression: z.object({
    state: z.string(),
    hold: z.string().nullable(),
    detail: z.string(),
  }),
});

export type SerializedGrowspaceProgramState = z.infer<typeof GrowspaceProgramStateSchema>;

/**
 * `save_irrigation_program` replaces the program's whole slot list rather than
 * merging into it, so the editor always sends the plan it is showing.
 */
export const SaveIrrigationProgramPayloadSchema = z.strictObject({
  name: z.string(),
  // Strict per slot, mirroring the backend's own refusal: a slot naming a key
  // it does not know is rejected rather than silently dropped, so a card
  // sending one finds out here instead of storing a plan it thinks it made.
  slots: z.array(z.strictObject(ProgramSlotSchema.shape)),
  /** Present only when overwriting an existing program. */
  program_id: z.string().optional(),
});

export type SaveIrrigationProgramPayload = z.infer<typeof SaveIrrigationProgramPayloadSchema>;

export const RemoveIrrigationProgramPayloadSchema = z.strictObject({
  program_id: z.string(),
});

export type RemoveIrrigationProgramPayload = z.infer<typeof RemoveIrrigationProgramPayloadSchema>;

/** Omitting `program_id` unbinds. Binding writes that one id and no setpoint. */
export const AssignIrrigationProgramPayloadSchema = z.strictObject({
  growspace_id: z.string(),
  program_id: z.string().nullable().optional(),
});

export type AssignIrrigationProgramPayload = z.infer<typeof AssignIrrigationProgramPayloadSchema>;

/** Result of the assign command — what the growspace now holds. */
export const AssignIrrigationProgramResultSchema = z.object({
  growspace_id: z.string(),
  irrigation_program_id: z.string().nullable(),
});

export type AssignIrrigationProgramResult = z.infer<typeof AssignIrrigationProgramResultSchema>;
