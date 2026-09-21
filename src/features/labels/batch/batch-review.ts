/**
 * What a batch review, a running job and a retry mean — without a DOM.
 *
 * The view renders what these decide. Kept apart because every rule here is
 * a claim the ticket makes about the batch (where review starts, what consent
 * covers, what retry sends) and each is easier to hold in a unit test than
 * behind a dialog.
 */

import type {
  BatchDiagnostic,
  BatchJob,
  BatchJobAttempt,
  BatchPreflight,
} from '../../../slices/labels/batch-schema';

export type RecordSeverity = 'error' | 'warning' | 'ok';

/**
 * Blockers about the whole batch rather than about one record.
 *
 * A record's own problems are its diagnostics; these are the printer, the
 * profile and the calibration, identical for every record, so they are shown
 * once above the records instead of making every record read as broken.
 */
const RECORD_BLOCKERS = new Set(['blocking_diagnostics', 'no_raster']);

const SEVERITY_ORDER: Record<string, number> = { error: 0, warning: 1, info: 2 };

/**
 * The diagnostics of one record, errors first.
 *
 * Within a severity the backend's own order is kept; across them, the one
 * thing that stops the batch is never below a list of things that do not.
 */
export function recordDiagnostics(preflight: BatchPreflight, index: number): BatchDiagnostic[] {
  return preflight.diagnostics
    .filter((item) => item.record_index === index)
    .map((item, order) => ({ item, order }))
    .sort(
      (a, b) =>
        (SEVERITY_ORDER[a.item.diagnostic.severity] ?? 3) -
          (SEVERITY_ORDER[b.item.diagnostic.severity] ?? 3) || a.order - b.order
    )
    .map(({ item }) => item);
}

/** The worst thing about one record. A record with no picture is an error. */
export function recordSeverity(preflight: BatchPreflight, index: number): RecordSeverity {
  const record = preflight.records[index];
  if (!record) return 'ok';
  const diagnostics = recordDiagnostics(preflight, index);
  if (
    record.render.raster === null ||
    record.decision.blocked_by.some((blocker) => RECORD_BLOCKERS.has(blocker)) ||
    diagnostics.some((item) => item.diagnostic.severity === 'error')
  ) {
    return 'error';
  }
  return diagnostics.some((item) => item.diagnostic.severity === 'warning') ? 'warning' : 'ok';
}

/** The batch-wide reasons the whole job cannot print, in correction order. */
export function batchBlockers(preflight: BatchPreflight): string[] {
  return preflight.blocked_by.filter((blocker) => !RECORD_BLOCKERS.has(blocker));
}

/** How many records carry an error, and how many only a warning. */
export function severityCounts(preflight: BatchPreflight): Record<RecordSeverity, number> {
  const counts: Record<RecordSeverity, number> = { error: 0, warning: 0, ok: 0 };
  preflight.records.forEach((_, index) => {
    counts[recordSeverity(preflight, index)] += 1;
  });
  return counts;
}

/** Where review starts: the first error, else the first warning, else the first record. */
export function initialFocus(preflight: BatchPreflight): number {
  const severities = preflight.records.map((_, index) => recordSeverity(preflight, index));
  const error = severities.indexOf('error');
  if (error >= 0) return error;
  const warning = severities.indexOf('warning');
  return warning >= 0 ? warning : 0;
}

/**
 * The next record of one severity from `from`, wrapping, or `null` if none.
 *
 * Wrapping because "next warning" from the last one should reach the first
 * rather than stop, and `null` rather than `from` so the view can disable the
 * control when there is nowhere else to go.
 */
export function nextFlagged(
  preflight: BatchPreflight,
  from: number,
  severity: Exclude<RecordSeverity, 'ok'>,
  direction: 1 | -1
): number | null {
  const count = preflight.records.length;
  for (let step = 1; step <= count; step += 1) {
    const index = (((from + direction * step) % count) + count) % count;
    if (recordSeverity(preflight, index) === severity) {
      return index === from ? null : index;
    }
  }
  return null;
}

/**
 * Whether consent has been given to *this* review.
 *
 * - `not_required`: nothing to acknowledge.
 * - `missing`: warnings, and no consent yet.
 * - `current`: consent to exactly this preflight identity.
 * - `stale`: consent was given — to an earlier review. Shown as such rather
 *   than silently cleared, so the user sees why the box is empty again.
 */
export type AcknowledgementState = 'not_required' | 'missing' | 'current' | 'stale';

export function acknowledgementState(
  preflight: BatchPreflight,
  acknowledged: string | null
): AcknowledgementState {
  if (!preflight.acknowledgement_required) return 'not_required';
  if (acknowledged === null) return 'missing';
  return acknowledged === preflight.identity ? 'current' : 'stale';
}

/** How many warnings consent covers: every record warning and calibration advice. */
export function warningCount(preflight: BatchPreflight): number {
  return (
    preflight.diagnostics.filter((item) => item.diagnostic.severity === 'warning').length +
    preflight.printer.calibration_warnings.length
  );
}

/** Whether printing may be asked for; the backend decides again regardless. */
export function mayPrint(
  preflight: BatchPreflight,
  acknowledged: string | null,
  changedSinceReview: boolean
): boolean {
  if (changedSinceReview || !preflight.allowed) return false;
  const consent = acknowledgementState(preflight, acknowledged);
  return consent === 'not_required' || consent === 'current';
}

export interface JobProgress {
  /** The attempts this job sends. */
  selected: number;
  printed: number;
  failed: number;
  /** Selected and not yet answered. */
  pending: number;
  /** Every attempt in the plan, printed by this job or an earlier one. */
  printedOverall: number;
  total: number;
  finished: boolean;
}

/** Where one job is, counted over the attempts it sends. */
export function jobProgress(job: BatchJob): JobProgress {
  const selected = new Set(job.selected);
  let printed = 0;
  let failed = 0;
  let pending = 0;
  let printedOverall = 0;
  for (const attempt of job.attempts) {
    if (attempt.status === 'printed') printedOverall += 1;
    if (!selected.has(attempt.id)) continue;
    if (attempt.status === 'printed') printed += 1;
    else if (attempt.status === 'failed') failed += 1;
    else pending += 1;
  }
  return {
    selected: selected.size,
    printed,
    failed,
    pending,
    printedOverall,
    total: job.attempts.length,
    finished: job.state !== 'running',
  };
}

/** The attempts a retry would send, in their original order. */
export function failedAttempts(job: BatchJob): BatchJobAttempt[] {
  return job.attempts.filter((attempt) => attempt.status === 'failed');
}

/** Whether a retry may be asked for. */
export function mayRetry(job: BatchJob): boolean {
  return job.state === 'finished' && failedAttempts(job).length > 0;
}
