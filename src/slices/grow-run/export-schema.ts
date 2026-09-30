import { z } from 'zod';

import { RunSnapshotSchema } from './details-schema';
import { RunRefusalSchema } from './schema';

export const ExportGrowRunResultSchema = z.discriminatedUnion('outcome', [
  z.object({
    outcome: z.literal('exported'),
    document: z.object({
      format: z.literal('growspace_manager.grow_run'),
      version: z.literal(1),
      status: z.literal('finalized'),
      snapshot: RunSnapshotSchema.extend({
        metadata: RunSnapshotSchema.shape.metadata.unwrap(),
        // Opaque Region (ADR 0031): harvest metric keys vary per outcome.
        // Keep the archive rows whole, validating their known facts separately.
        harvest_outcomes: z.array(z.record(z.string(), z.unknown())).nullable(),
      }).superRefine((value, ctx) => {
        const result = RunSnapshotSchema.safeParse(value);
        if (!result.success) {
          for (const issue of result.error.issues) {
            ctx.addIssue({ code: 'custom', message: issue.message, path: issue.path });
          }
        }
      }),
    }),
  }),
  z.object({ outcome: z.literal('refused'), refusal: RunRefusalSchema }),
]);
export type ExportGrowRunResult = z.infer<typeof ExportGrowRunResultSchema>;
