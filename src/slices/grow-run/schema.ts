import { z } from 'zod';

/**
 * The compact attributes of `sensor.<growspace>_active_run` (GSM#668). The key
 * set is fixed whatever the state; without an Active Run every value but
 * `run_revision` is null, because the revision is what a Start must name.
 * Home Assistant's own attributes (`friendly_name`, `icon`) are not part of
 * this contract and are stripped rather than declared.
 */
const ActiveRunAttributesSchema = z.object({
  run_id: z.string().nullable(),
  label: z.string().nullable(),
  started_at: z.string().nullable(),
  duration_days: z.number().int().nullable(),
  participant_count: z.number().int().nullable(),
  run_revision: z.number().int().min(0),
});

/** The sensor's state is the Run Sequence Number, or `none`. */
export const ActiveRunSensorSchema = z.object({
  state: z.union([z.literal('none'), z.string().regex(/^[1-9]\d*$/)]),
  attributes: ActiveRunAttributesSchema,
});

/**
 * Which metrics a Run's status gives it (GSM#671): Live Run Metrics while
 * Active, Pending Run Metrics once Completed, a frozen snapshot once Finalized.
 */
const MetricsStateSchema = z.enum(['live', 'pending', 'frozen', 'excluded']);

const RunStatusSchema = z.enum(['active', 'completed', 'finalized', 'voided']);

/**
 * One Run's compact summary at one Run Revision, as the WS commands return it.
 * `status`, `completed_at` and `metrics_state` arrived with completion
 * (GSM#671); a backend before it omits them, and every Run it knows is Active.
 */
export const RunSummarySchema = z.object({
  run_id: z.string(),
  sequence_number: z.number().int().min(1),
  label: z.string().nullable(),
  status: RunStatusSchema.optional(),
  started_at: z.string(),
  completed_at: z.string().nullable().optional(),
  timezone: z.string(),
  participant_count: z.number().int().min(0),
  metrics_state: MetricsStateSchema.optional(),
  run_revision: z.number().int().min(0),
});
export type RunSummary = z.infer<typeof RunSummarySchema>;

/**
 * Every refusal is a result, carrying where the ledger really is. `code`
 * stays a string so a refusal a newer backend adds still renders in the
 * backend's own words.
 */
export const RunRefusalSchema = z.object({
  code: z.string().min(1),
  message: z.string(),
  current_revision: z.number().int().min(0).nullable(),
  active_run: RunSummarySchema.nullable(),
});
export type RunRefusal = z.infer<typeof RunRefusalSchema>;

export const StartGrowRunResultSchema = z.discriminatedUnion('outcome', [
  z.object({
    outcome: z.literal('started'),
    run_revision: z.number().int().min(0),
    active_run: RunSummarySchema,
  }),
  z.object({
    outcome: z.literal('refused'),
    refusal: RunRefusalSchema,
  }),
]);
export type StartGrowRunResult = z.infer<typeof StartGrowRunResultSchema>;

/** The bounds are the backend's; the card refuses first rather than send them. */
export const StartGrowRunPayloadSchema = z.strictObject({
  growspace_id: z.string().min(1),
  expected_run_revision: z.number().int().min(0),
  label: z.string().max(80).optional(),
  goals: z.string().max(2000).optional(),
});

export const ParticipationSchema = z.object({
  plant_id: z.string(),
  opened_at: z.string(),
  closed_at: z.string().nullable(),
});

const MovementFactSchema = z.object({
  fact_id: z.string(),
  plant_id: z.string(),
  at: z.string(),
  kind: z.string(),
  source_growspace_id: z.string().nullable(),
  target_growspace_id: z.string().nullable(),
  source_run_id: z.string().nullable(),
  target_run_id: z.string().nullable(),
  projected: z.boolean(),
});

const HarvestOutcomeSchema = z.object({
  plant_id: z.string(),
  strain: z.string(),
  phenotype: z.string(),
  source_growspace_id: z.string(),
  state: z.enum(['pending', 'recorded', 'no_usable_yield', 'incomplete']),
  reason: z.string().nullable(),
  metrics: z.object({
    wet_weight: z.number().nullable().optional(),
    dry_weight: z.number().nullable().optional(),
    trim_weight: z.number().nullable().optional(),
    thc_percentage: z.number().nullable().optional(),
    cbd_percentage: z.number().nullable().optional(),
    terpene_profile: z.string().nullable().optional(),
  }),
  quality_score: z.number().nullable(),
});

export const GetGrowRunResultSchema = z.discriminatedUnion('outcome', [
  z.object({ outcome: z.literal('not_found') }),
  z.object({
    outcome: z.literal('found'),
    run: RunSummarySchema.extend({
      notes: z.string().nullable().optional(),
      participations: z.array(ParticipationSchema),
      movement_history: z.array(MovementFactSchema),
      harvest_outcomes: z.array(HarvestOutcomeSchema).optional().default([]),
    }),
  }),
]);
export type GetGrowRunResult = z.infer<typeof GetGrowRunResultSchema>;
