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

/** One Run's compact summary at one Run Revision, as the WS commands return it. */
export const RunSummarySchema = z.object({
  run_id: z.string(),
  sequence_number: z.number().int().min(1),
  label: z.string().nullable(),
  started_at: z.string(),
  timezone: z.string(),
  participant_count: z.number().int().min(0),
  run_revision: z.number().int().min(0),
});

export const ParticipationSchema = z.object({
  plant_id: z.string(),
  opened_at: z.string(),
  closed_at: z.string().nullable(),
});

export const MovementFactSchema = z.object({
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

export const GetGrowRunResultSchema = z.discriminatedUnion('outcome', [
  z.object({ outcome: z.literal('not_found') }),
  z.object({
    outcome: z.literal('found'),
    run: RunSummarySchema.extend({
      participations: z.array(ParticipationSchema),
      movement_history: z.array(MovementFactSchema),
    }),
  }),
]);
export type GetGrowRunResult = z.infer<typeof GetGrowRunResultSchema>;
