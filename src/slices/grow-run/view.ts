/**
 * The Grow Run View's reads (GSM#675): a selected Run's details and a Run
 * Comparison of two Finalized Runs.
 *
 * Kept apart from the slice's index so the header's entry bundle carries none
 * of it: only the lazy Grow Run View imports this module.
 */

import { ExportGrowRunResultSchema, type ExportGrowRunResult } from './export-schema';
import { hassCall } from '../../services/hass-call';
import { GetGrowRunResultSchema, type GetGrowRunResult } from './details-schema';
import {
  CompareGrowRunsPayloadSchema,
  CompareGrowRunsResultSchema,
  type CompareGrowRunsResult,
} from './view-schema';

export type { CompareGrowRunsResult, MetricComparison, RunComparison } from './view-schema';

/** Read the selected Run: its Participants, history, metrics and snapshot. */
export function getGrowRun(growspaceId: string, runId: string): Promise<GetGrowRunResult> {
  return hassCall(
    'growspace_manager/get_grow_run',
    { growspace_id: growspaceId, run_id: runId },
    GetGrowRunResultSchema
  );
}

/**
 * Compare two Finalized Runs of one growspace. Without `runIds` the backend
 * compares the newest Finalized Run with its predecessor.
 */
export function compareGrowRuns(
  growspaceId: string,
  runIds?: readonly [string, string]
): Promise<CompareGrowRunsResult> {
  const payload = CompareGrowRunsPayloadSchema.parse({
    growspace_id: growspaceId,
    ...(runIds ? { run_ids: [runIds[0], runIds[1]] } : {}),
  });
  return hassCall('growspace_manager/compare_grow_runs', payload, CompareGrowRunsResultSchema);
}

/** Export the selected Run's frozen snapshot, with a structured refusal otherwise. */
export function exportGrowRun(growspaceId: string, runId: string): Promise<ExportGrowRunResult> {
  return hassCall(
    'growspace_manager/export_grow_run',
    { growspace_id: growspaceId, run_id: runId },
    ExportGrowRunResultSchema
  );
}

/** Start a browser download of exactly the backend's versioned JSON document. */
export function downloadGrowRun(documentValue: unknown, runId: string): void {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(documentValue, null, 2) + '\n'], { type: 'application/json' })
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = `grow-run-${runId.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
