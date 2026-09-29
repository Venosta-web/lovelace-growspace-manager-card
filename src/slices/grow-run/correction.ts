/**
 * Correcting Grow Runs (GSM#917): reopening a Finalized Run, and discarding
 * an Active Run that recorded nothing.
 *
 * Kept apart from the slice's index so the header's entry bundle carries none
 * of it: only the lazy finalization and discard dialogs import this module.
 */

import { hassCall } from '../../services/hass-call';
import {
  DiscardGrowRunPayloadSchema,
  DiscardGrowRunResultSchema,
  ReopenGrowRunPayloadSchema,
  ReopenGrowRunResultSchema,
  type DiscardGrowRunResult,
  type ReopenGrowRunResult,
} from './correction-schema';

/**
 * Return a Finalized Run to Completed so its facts can be corrected. Only a
 * Home Assistant administrator may, and only with a reason.
 */
export function reopenGrowRun(
  growspaceId: string,
  runId: string,
  expectedRevision: number,
  reason: string
): Promise<ReopenGrowRunResult> {
  const payload = ReopenGrowRunPayloadSchema.parse({
    growspace_id: growspaceId,
    run_id: runId,
    expected_run_revision: expectedRevision,
    reason,
  });
  return hassCall('growspace_manager/reopen_grow_run', payload, ReopenGrowRunResultSchema);
}

/** Remove the Active Run as if it never started; a blank reason is left out. */
export function discardGrowRun(
  growspaceId: string,
  runId: string,
  expectedRevision: number,
  reason = ''
): Promise<DiscardGrowRunResult> {
  const trimmed = reason.trim();
  const payload = DiscardGrowRunPayloadSchema.parse({
    growspace_id: growspaceId,
    run_id: runId,
    expected_run_revision: expectedRevision,
    ...(trimmed ? { reason: trimmed } : {}),
  });
  return hassCall('growspace_manager/discard_grow_run', payload, DiscardGrowRunResultSchema);
}
