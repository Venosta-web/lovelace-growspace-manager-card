/**
 * The four batch calls: preflight, print, watch, retry.
 *
 * Contract-gated through the same {@link gated} as the single-print calls,
 * and under the same rule: nothing here retries on its own. A refused batch
 * was refused under one preflight identity; printing it again under another
 * is a new review, and "retry" means only the attempts that failed.
 */

import { gated } from './gated';
import {
  BatchJobAnswerSchema,
  BatchPreflightAnswerSchema,
  type BatchJobAnswer,
  type BatchPreflightAnswer,
} from './batch-schema';

export const WS_PREFLIGHT_LABEL_BATCH = 'growspace_manager/preflight_label_batch';
export const WS_PRINT_LABEL_BATCH = 'growspace_manager/print_label_batch';
export const WS_GET_LABEL_BATCH_JOB = 'growspace_manager/get_label_batch_job';
export const WS_RETRY_LABEL_BATCH = 'growspace_manager/retry_label_batch';

/** The backend's bounds on one preflight. */
export const MAX_BATCH_RECORDS = 100;
export const MAX_BATCH_COPIES = 10;

/** What to print, for which plants, on what. */
export interface BatchRequest {
  template: { kind: string; id: string; revision?: number | null };
  plantIds: string[];
  copies: number;
  profileId?: string | null;
  deviceId: string;
  density?: string;
  locale?: string;
}

/** Capture and render every plant, and hold the review. Prints nothing. */
export function preflightLabelBatch(request: BatchRequest): Promise<BatchPreflightAnswer> {
  return gated(
    WS_PREFLIGHT_LABEL_BATCH,
    {
      template: request.template,
      plant_ids: request.plantIds,
      copies: request.copies,
      ...(request.profileId ? { profile_id: request.profileId } : {}),
      device_id: request.deviceId,
      ...(request.density ? { density: request.density } : {}),
      ...(request.locale ? { locale: request.locale } : {}),
    },
    BatchPreflightAnswerSchema
  );
}

/**
 * Start printing the reviewed batch.
 *
 * `acknowledgement` is the preflight identity the user consented to, sent
 * only when they did; the backend refuses consent that belongs to another
 * review. `override` is the same identity, sent only when the user chose to
 * print past an unproven printer.
 */
export function printLabelBatch(
  preflightId: string,
  acknowledgement: string | null,
  override: string | null = null
): Promise<BatchJobAnswer> {
  return gated(
    WS_PRINT_LABEL_BATCH,
    { preflight_id: preflightId, ...consent(acknowledgement, override) },
    BatchJobAnswerSchema
  );
}

function consent(acknowledgement: string | null, override: string | null): Record<string, string> {
  return {
    ...(acknowledgement ? { acknowledgement } : {}),
    ...(override ? { override } : {}),
  };
}

/** Read one job as it stands. */
export function fetchLabelBatchJob(jobId: string): Promise<BatchJobAnswer> {
  return gated(WS_GET_LABEL_BATCH_JOB, { job_id: jobId }, BatchJobAnswerSchema);
}

/** Print one finished job's failed attempts again, from the same review. */
export function retryLabelBatch(
  jobId: string,
  acknowledgement: string | null,
  override: string | null = null
): Promise<BatchJobAnswer> {
  return gated(
    WS_RETRY_LABEL_BATCH,
    { job_id: jobId, ...consent(acknowledgement, override) },
    BatchJobAnswerSchema
  );
}
