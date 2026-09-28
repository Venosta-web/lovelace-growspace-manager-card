/**
 * Completing a Grow Run (GSM#671): the Run Completion Preview and the command.
 *
 * Kept apart from the slice's index so the header's entry bundle carries none
 * of it: only the lazy completion dialog imports this module.
 */

import { hassCall } from '../../services/hass-call';
import {
  COMPLETION_WARNINGS,
  CompleteGrowRunPayloadSchema,
  CompleteGrowRunResultSchema,
  PreviewCompletionPayloadSchema,
  PreviewCompletionResultSchema,
  type CompleteGrowRunResult,
  type PreviewCompletionResult,
} from './completion-schema';

export type {
  CompleteGrowRunResult,
  CompletionPreview,
  PreviewCompletionResult,
} from './completion-schema';

/** Preview completing the growspace's Active Run now (GSM#671). */
export function previewGrowRunCompletion(growspaceId: string): Promise<PreviewCompletionResult> {
  const payload = PreviewCompletionPayloadSchema.parse({ growspace_id: growspaceId });
  return hassCall(
    'growspace_manager/preview_grow_run_completion',
    payload,
    PreviewCompletionResultSchema
  );
}

type CompletionWarning = (typeof COMPLETION_WARNINGS)[number];

/** Whether a warning is one the card can acknowledge. */
function isCompletionWarning(code: string): code is CompletionWarning {
  return (COMPLETION_WARNINGS as readonly string[]).includes(code);
}

/**
 * Complete the Active Run on the revision the card decided on, acknowledging
 * exactly the warnings the grower ticked. A blank note clears it.
 */
export function completeGrowRun(
  growspaceId: string,
  runId: string,
  expectedRevision: number,
  acknowledged: readonly string[],
  retrospectiveNote: string
): Promise<CompleteGrowRunResult> {
  const note = retrospectiveNote.trim();
  const payload = CompleteGrowRunPayloadSchema.parse({
    growspace_id: growspaceId,
    run_id: runId,
    expected_run_revision: expectedRevision,
    acknowledged_warnings: acknowledged.filter(isCompletionWarning),
    retrospective_note: note || null,
  });
  return hassCall('growspace_manager/complete_grow_run', payload, CompleteGrowRunResultSchema);
}
