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
const RunSummarySchema = z.object({
  run_id: z.string(),
  sequence_number: z.number().int().min(1),
  label: z.string().nullable(),
  started_at: z.string(),
  timezone: z.string(),
  participant_count: z.number().int().min(0),
  run_revision: z.number().int().min(0),
});

/**
 * Every refusal is a result, carrying where the ledger really is. `code`
 * stays a string so a refusal a newer backend adds still renders in the
 * backend's own words.
 */
const RunRefusalSchema = z.object({
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
