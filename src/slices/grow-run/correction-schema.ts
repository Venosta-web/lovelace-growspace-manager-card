import { z } from 'zod';

import { RunRefusalSchema, RunSummarySchema } from './schema';

/** The longest reason the backend keeps, as for any Run note. */
export const MAX_REASON_LENGTH = 2000;

/**
 * Why an Active Run is not activity-free (GSM#917), in the order a refusal
 * lists them. A reason a newer backend adds is shown in its own words.
 */
export const DISCARD_BLOCKERS = [
  'activity_facts',
  'participants_changed',
  'harvest_outcomes',
] as const;

const RefusedSchema = z.object({
  outcome: z.literal('refused'),
  refusal: RunRefusalSchema,
});

/** A Finalized Run back to Completed; its snapshot is superseded, not lost. */
export const ReopenGrowRunResultSchema = z.discriminatedUnion('outcome', [
  z.object({
    outcome: z.literal('reopened'),
    run_revision: z.number().int().min(0),
    run: RunSummarySchema,
  }),
  RefusedSchema,
]);
export type ReopenGrowRunResult = z.infer<typeof ReopenGrowRunResultSchema>;

/** An activity-free Active Run removed; its number is never reused. */
export const DiscardGrowRunResultSchema = z.discriminatedUnion('outcome', [
  z.object({
    outcome: z.literal('discarded'),
    run_revision: z.number().int().min(0),
    run_id: z.string(),
    sequence_number: z.number().int().min(1),
  }),
  RefusedSchema,
]);
export type DiscardGrowRunResult = z.infer<typeof DiscardGrowRunResultSchema>;

export const ReopenGrowRunPayloadSchema = z.strictObject({
  growspace_id: z.string().min(1),
  run_id: z.string().min(1),
  expected_run_revision: z.number().int().min(0),
  reason: z.string().max(MAX_REASON_LENGTH),
});

export const DiscardGrowRunPayloadSchema = z.strictObject({
  growspace_id: z.string().min(1),
  run_id: z.string().min(1),
  expected_run_revision: z.number().int().min(0),
  reason: z.string().max(MAX_REASON_LENGTH).optional(),
});
