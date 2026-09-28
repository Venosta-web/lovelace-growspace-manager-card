import { z } from 'zod';

import { ParticipationSchema, RunRefusalSchema, RunSummarySchema } from './schema';

/** The warnings a completion must acknowledge. Unknown ones still render. */
export const COMPLETION_WARNINGS = [
  'plants_present',
  'missing_outcomes',
  'attribution_gaps',
] as const;

const RefusedSchema = z.object({
  outcome: z.literal('refused'),
  refusal: RunRefusalSchema,
});

/**
 * The Run Completion Preview (GSM#671): what completing the Active Run now
 * would close, and what it leaves at risk. `coverage` is one row per Run
 * metric; none is measured yet, so it is empty until metrics land.
 */
const CompletionPreviewSchema = z.object({
  run: RunSummarySchema,
  completed_at: z.string(),
  duration_days: z.number().int().min(0),
  closing_participations: z.array(ParticipationSchema),
  plants_present: z.array(
    z.object({
      plant_id: z.string(),
      strain_name: z.string(),
      phenotype_name: z.string(),
      stage: z.string(),
    })
  ),
  // The Run's Harvest Outcomes still `pending` a dry weight or recorded
  // `incomplete` (GSM#672). `state` stays a string so a new one still renders.
  missing_outcomes: z.array(
    z.object({
      plant_id: z.string(),
      strain: z.string(),
      phenotype: z.string(),
      state: z.string(),
    })
  ),
  coverage: z.array(
    z.object({
      metric: z.string(),
      coverage_percent: z.number(),
    })
  ),
  attribution_gaps: z.array(
    z.object({
      kind: z.string(),
      plant_id: z.string(),
      fact_id: z.string().nullable(),
      at: z.string().nullable(),
    })
  ),
  retrospective_note: z.string().nullable(),
  delivering_outputs: z.array(z.string()),
  warnings: z.array(z.string()),
  blockers: z.array(z.string()),
});
export type CompletionPreview = z.infer<typeof CompletionPreviewSchema>;

export const PreviewCompletionResultSchema = z.discriminatedUnion('outcome', [
  z.object({ outcome: z.literal('preview'), preview: CompletionPreviewSchema }),
  RefusedSchema,
]);
export type PreviewCompletionResult = z.infer<typeof PreviewCompletionResultSchema>;

export const CompleteGrowRunResultSchema = z.discriminatedUnion('outcome', [
  z.object({
    outcome: z.literal('completed'),
    run_revision: z.number().int().min(0),
    run: RunSummarySchema,
  }),
  RefusedSchema,
]);
export type CompleteGrowRunResult = z.infer<typeof CompleteGrowRunResultSchema>;

export const PreviewCompletionPayloadSchema = z.strictObject({
  growspace_id: z.string().min(1),
});

export const CompleteGrowRunPayloadSchema = z.strictObject({
  growspace_id: z.string().min(1),
  run_id: z.string().min(1),
  expected_run_revision: z.number().int().min(0),
  acknowledged_warnings: z.array(z.enum(COMPLETION_WARNINGS)),
  retrospective_note: z.string().max(2000).nullable().optional(),
});
