/**
 * Finalizing a Grow Run (GSM#673): the snapshot it would freeze, and the command.
 *
 * Kept apart from the slice's index so the header's entry bundle carries none
 * of it: only the lazy finalization dialog imports this module.
 */

import { hassCall } from '../../services/hass-call';
import {
  FINALIZATION_WARNINGS,
  FinalizeGrowRunPayloadSchema,
  FinalizeGrowRunResultSchema,
  PreviewFinalizationPayloadSchema,
  PreviewFinalizationResultSchema,
  type FinalizeGrowRunResult,
  type PreviewFinalizationResult,
} from './finalization-schema';

export type { FinalizationPreview } from './finalization-schema';

/** Preview freezing a Completed Run now; nothing is written. */
export function previewGrowRunFinalization(
  growspaceId: string,
  runId: string
): Promise<PreviewFinalizationResult> {
  const payload = PreviewFinalizationPayloadSchema.parse({
    growspace_id: growspaceId,
    run_id: runId,
  });
  return hassCall(
    'growspace_manager/preview_grow_run_finalization',
    payload,
    PreviewFinalizationResultSchema
  );
}

type FinalizationWarning = (typeof FINALIZATION_WARNINGS)[number];

function isFinalizationWarning(code: string): code is FinalizationWarning {
  return (FINALIZATION_WARNINGS as readonly string[]).includes(code);
}

/**
 * Finalize on the revision the card decided on, acknowledging exactly the
 * warnings the grower ticked.
 */
export function finalizeGrowRun(
  growspaceId: string,
  runId: string,
  expectedRevision: number,
  acknowledged: readonly string[]
): Promise<FinalizeGrowRunResult> {
  const payload = FinalizeGrowRunPayloadSchema.parse({
    growspace_id: growspaceId,
    run_id: runId,
    expected_run_revision: expectedRevision,
    acknowledged_warnings: acknowledged.filter(isFinalizationWarning),
  });
  return hassCall('growspace_manager/finalize_grow_run', payload, FinalizeGrowRunResultSchema);
}
