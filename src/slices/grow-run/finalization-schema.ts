import { z } from 'zod';

import { RunRefusalSchema, RunSnapshotSchema, RunSummarySchema } from './schema';

/** The one warning a finalization acknowledges: the snapshot lacks a fact. */
export const FINALIZATION_WARNINGS = ['incomplete_snapshot'] as const;

const RefusedSchema = z.object({
  outcome: z.literal('refused'),
  refusal: RunRefusalSchema,
});

/**
 * What finalizing a Completed Run now would freeze (GSM#673). `warnings`
 * stays a string list so one a newer backend adds still renders.
 */
const FinalizationPreviewSchema = z.object({
  run: RunSummarySchema,
  snapshot: RunSnapshotSchema,
  warnings: z.array(z.string()),
});
export type FinalizationPreview = z.infer<typeof FinalizationPreviewSchema>;

export const PreviewFinalizationResultSchema = z.discriminatedUnion('outcome', [
  z.object({ outcome: z.literal('preview'), preview: FinalizationPreviewSchema }),
  RefusedSchema,
]);
export type PreviewFinalizationResult = z.infer<typeof PreviewFinalizationResultSchema>;

export const FinalizeGrowRunResultSchema = z.discriminatedUnion('outcome', [
  z.object({
    outcome: z.literal('finalized'),
    run_revision: z.number().int().min(0),
    run: RunSummarySchema,
    snapshot: RunSnapshotSchema,
  }),
  RefusedSchema,
]);
export type FinalizeGrowRunResult = z.infer<typeof FinalizeGrowRunResultSchema>;

export const PreviewFinalizationPayloadSchema = z.strictObject({
  growspace_id: z.string().min(1),
  run_id: z.string().min(1),
});

export const FinalizeGrowRunPayloadSchema = z.strictObject({
  growspace_id: z.string().min(1),
  run_id: z.string().min(1),
  expected_run_revision: z.number().int().min(0),
  acknowledged_warnings: z.array(z.enum(FINALIZATION_WARNINGS)),
});
