/**
 * Starting a Grow Run (GSM#668), now or on an earlier day (GSM#670).
 *
 * The write side is one WebSocket command. It names the Run Revision the card
 * decided on, and every refusal comes back as a result carrying the current
 * revision and Active Run, so a stale Start is answered with what is really
 * there rather than an error. A start on an earlier day is previewed first by
 * a second, read-only command.
 *
 * Only the start dialog imports this, and it is a lazy chunk; keeping the
 * start side out of `./index` keeps it out of the entry bundle.
 */

import { hassCall } from '../../services/hass-call';
import { localizeWithParams } from '../../localize/localize';
import {
  PreviewGrowRunStartPayloadSchema,
  PreviewGrowRunStartResultSchema,
  StartGrowRunPayloadSchema,
  StartGrowRunResultSchema,
  type PreviewGrowRunStartResult,
  type StartConflict,
  type StartGrowRunResult,
} from './start-schema';
import type { RunRefusal } from './schema';

export type { RunRefusal } from './schema';
export type {
  CoverageGap,
  PreviewGrowRunStartResult,
  StartGrowRunResult,
  StartPreview,
} from './start-schema';

/**
 * Start the growspace's Active Run on the revision the card decided on.
 *
 * With `startedOn` (an ISO local date) the Run starts at that day's midnight
 * and claims the growspace's Unattributed Activity since (GSM#670).
 */
export function startGrowRun(
  growspaceId: string,
  expectedRevision: number,
  metadata: { label?: string; goals?: string; startedOn?: string } = {}
): Promise<StartGrowRunResult> {
  const label = metadata.label?.trim();
  const goals = metadata.goals?.trim();
  const payload = StartGrowRunPayloadSchema.parse({
    growspace_id: growspaceId,
    expected_run_revision: expectedRevision,
    ...(label ? { label } : {}),
    ...(goals ? { goals } : {}),
    ...(metadata.startedOn ? { started_on: metadata.startedOn } : {}),
  });
  return hassCall('growspace_manager/start_grow_run', payload, StartGrowRunResultSchema);
}

/** What starting on an earlier day would claim. Nothing is written. */
export function previewGrowRunStart(
  growspaceId: string,
  startedOn: string
): Promise<PreviewGrowRunStartResult> {
  const payload = PreviewGrowRunStartPayloadSchema.parse({
    growspace_id: growspaceId,
    started_on: startedOn,
  });
  return hassCall(
    'growspace_manager/preview_grow_run_start',
    payload,
    PreviewGrowRunStartResultSchema
  );
}

/**
 * Today's date where the Run Timezone is, as `YYYY-MM-DD`: the day a start
 * without a date begins on, and the latest a backdated one may name. Falls
 * back to the browser's zone when Home Assistant's is unknown or invalid.
 */
export function localToday(timeZone: string | undefined, now: Date = new Date()): string {
  const format = (zone: string | undefined) =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone: zone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now);
  try {
    return format(timeZone);
  } catch {
    return format(undefined);
  }
}

const KNOWN_REFUSALS = new Set([
  'grow_run.revision_conflict',
  'grow_run.already_active',
  'grow_run.not_authorized',
  'grow_run.store_unreadable',
  'grow_run.beyond_retention',
  'grow_run.boundary_conflict',
  'grow_run.not_active',
  'grow_run.irrigation_delivering',
  'grow_run.acknowledgement_required',
  'grow_run.not_found',
  'grow_run.not_completed',
  'grow_run.not_finalized',
  'grow_run.insufficient_history',
  'grow_run.same_run',
]);

/**
 * A refusal in the viewer's words. A code this card does not know yet is
 * shown in the backend's own words, which are written for the grower; so is
 * `already_active` when the refusal does not say which Run is active.
 */
function refusalWords(
  code: string,
  message: string,
  activeRunNumber: number | null,
  language: string
): string {
  if (
    !KNOWN_REFUSALS.has(code) ||
    (code === 'grow_run.already_active' && activeRunNumber === null)
  ) {
    return localizeWithParams('grow_run.refused', { message }, language);
  }
  return localizeWithParams(
    `grow_run.refusal_${code.slice('grow_run.'.length)}`,
    { number: activeRunNumber ?? '' },
    language
  );
}

/** A start refusal in the viewer's words. */
export function refusalText(refusal: RunRefusal, language = 'en'): string {
  return refusalWords(
    refusal.code,
    refusal.message,
    refusal.active_run?.sequence_number ?? null,
    language
  );
}

/**
 * A backdated start's conflicting boundary, in the words the confirmation
 * would be refused with.
 */
export function conflictText(conflict: StartConflict, language = 'en'): string {
  return refusalWords(conflict.code, conflict.message, null, language);
}
