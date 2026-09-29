import { z } from 'zod';

import { RunMetricSchema, RunSnapshotSchema } from './details-schema';
import { RunRefusalSchema, RunSummarySchema } from './schema';

/**
 * One side of a Run Comparison (GSM#675): the Run and its frozen snapshot,
 * which carries every context row — Participants, Strains, Harvest Source
 * Plants, duration, coverage and loss.
 */
const ComparedRunSchema = z.object({
  run: RunSummarySchema,
  snapshot: RunSnapshotSchema,
});

/**
 * One metric of two Finalized Runs. Only a `comparable` row has a direction;
 * `state` stays a string so a reason a newer backend adds still renders.
 * `judgment` is null for a neutral metric, whatever way it moved.
 */
const MetricComparisonSchema = z.object({
  metric: z.string(),
  goal: z.string(),
  state: z.string(),
  earlier: RunMetricSchema.nullable(),
  later: RunMetricSchema.nullable(),
  delta: z.number().nullable(),
  direction: z.enum(['increase', 'decrease', 'equal']).nullable(),
  judgment: z.string().nullable(),
});
export type MetricComparison = z.infer<typeof MetricComparisonSchema>;

const RunComparisonSchema = z.object({
  earlier: ComparedRunSchema,
  later: ComparedRunSchema,
  metrics: z.array(MetricComparisonSchema),
});
export type RunComparison = z.infer<typeof RunComparisonSchema>;

export const CompareGrowRunsResultSchema = z.discriminatedUnion('outcome', [
  z.object({
    outcome: z.literal('compared'),
    run_revision: z.number().int().min(0),
    // Every Finalized Run, newest first: what either picker may choose.
    finalized: z.array(RunSummarySchema),
    comparison: RunComparisonSchema,
  }),
  z.object({ outcome: z.literal('refused'), refusal: RunRefusalSchema }),
]);
export type CompareGrowRunsResult = z.infer<typeof CompareGrowRunsResultSchema>;

export const CompareGrowRunsPayloadSchema = z.strictObject({
  growspace_id: z.string().min(1),
  run_ids: z.tuple([z.string().min(1), z.string().min(1)]).optional(),
});
