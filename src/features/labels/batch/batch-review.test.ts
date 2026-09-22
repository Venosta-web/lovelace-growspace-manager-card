import { describe, expect, it } from 'vitest';

import jobFixture from '../../../../tests/fixtures/contract/label_batch_job_v1.json';
import preflightFixture from '../../../../tests/fixtures/contract/label_batch_preflight_v1.json';
import retryFixture from '../../../../tests/fixtures/contract/label_batch_retry_v1.json';
import {
  BatchJobAnswerSchema,
  BatchPreflightAnswerSchema,
  type BatchDiagnostic,
  type BatchJob,
  type BatchPreflight,
} from '../../../slices/labels/batch-schema';
import {
  acknowledgementState,
  batchBlockers,
  failedAttempts,
  initialFocus,
  jobProgress,
  mayPrint,
  mayRetry,
  nextFlagged,
  recordDiagnostics,
  recordSeverity,
  severityCounts,
  warningCount,
} from './batch-review';

function recorded(): BatchPreflight {
  const parsed = BatchPreflightAnswerSchema.parse(structuredClone(preflightFixture));
  if (parsed.outcome !== 'ok') throw new Error('fixture is not ok');
  return parsed.preflight;
}

function job(fixture: unknown): BatchJob {
  const parsed = BatchJobAnswerSchema.parse(structuredClone(fixture));
  if (parsed.outcome !== 'ok') throw new Error('fixture is not ok');
  return parsed.job;
}

/** Five records, the recorded first one repeated, with chosen problems. */
function batch(severities: Array<'error' | 'warning' | 'ok'>): BatchPreflight {
  const base = recorded();
  const template = base.records[0];
  const warning = base.diagnostics.find((item) => item.diagnostic.severity === 'warning')!;
  const diagnostics: BatchDiagnostic[] = [];
  const records = severities.map((severity, index) => {
    if (severity !== 'ok') {
      diagnostics.push({
        ...warning,
        record_index: index,
        subject: `P${index}`,
        diagnostic: { ...warning.diagnostic, severity },
      });
    }
    return { ...template, index, subject: `P${index}` };
  });
  return {
    ...base,
    records,
    diagnostics,
    printer: { ...base.printer, calibration_warnings: [] },
  };
}

describe('where review starts', () => {
  it('focuses the first error before any warning', () => {
    expect(initialFocus(batch(['ok', 'warning', 'ok', 'error', 'error']))).toBe(3);
  });

  it('focuses the first warning when nothing is an error', () => {
    expect(initialFocus(batch(['ok', 'ok', 'warning']))).toBe(2);
  });

  it('focuses the first record of a clean batch', () => {
    expect(initialFocus(batch(['ok', 'ok']))).toBe(0);
  });

  it('reads a record with no picture as an error', () => {
    const preflight = batch(['ok', 'ok']);
    preflight.records[1] = {
      ...preflight.records[1],
      render: { ...preflight.records[1].render, raster: null },
    };
    expect(recordSeverity(preflight, 1)).toBe('error');
    expect(initialFocus(preflight)).toBe(1);
  });

  it('counts records by their worst problem', () => {
    expect(severityCounts(batch(['ok', 'warning', 'error', 'warning']))).toEqual({
      error: 1,
      warning: 2,
      ok: 1,
    });
  });
});

describe('one record’s problems', () => {
  it('lists errors before warnings, keeping the backend’s order within each', () => {
    const preflight = batch(['warning', 'ok']);
    const [warning] = preflight.diagnostics;
    preflight.diagnostics = [
      { ...warning, diagnostic: { ...warning.diagnostic, code: 'w1' } },
      { ...warning, diagnostic: { ...warning.diagnostic, code: 'e1', severity: 'error' } },
      { ...warning, diagnostic: { ...warning.diagnostic, code: 'w2' } },
      { ...warning, record_index: 1, diagnostic: { ...warning.diagnostic, code: 'other' } },
    ];
    expect(recordDiagnostics(preflight, 0).map((item) => item.diagnostic.code)).toEqual([
      'e1',
      'w1',
      'w2',
    ]);
  });
});

describe('jumping between problems', () => {
  const preflight = batch(['warning', 'ok', 'error', 'warning', 'error']);

  it('moves to the next and previous record of one severity, wrapping', () => {
    expect(nextFlagged(preflight, 2, 'error', 1)).toBe(4);
    expect(nextFlagged(preflight, 4, 'error', 1)).toBe(2);
    expect(nextFlagged(preflight, 0, 'warning', -1)).toBe(3);
    expect(nextFlagged(preflight, 1, 'warning', 1)).toBe(3);
  });

  it('says there is nowhere to go when the only one is the current one', () => {
    const single = batch(['ok', 'error', 'ok']);
    expect(nextFlagged(single, 1, 'error', 1)).toBeNull();
    expect(nextFlagged(single, 1, 'warning', 1)).toBeNull();
  });
});

describe('consent to one exact review', () => {
  it('is required for the recorded batch and bound to its identity', () => {
    const preflight = recorded();
    expect(acknowledgementState(preflight, null)).toBe('missing');
    expect(acknowledgementState(preflight, preflight.identity)).toBe('current');
    expect(acknowledgementState(preflight, 'sha256:an-earlier-review')).toBe('stale');
    expect(warningCount(preflight)).toBe(12);
  });

  it('is not asked for when there is nothing to acknowledge', () => {
    const preflight = { ...recorded(), acknowledgement_required: false };
    expect(acknowledgementState(preflight, null)).toBe('not_required');
    expect(mayPrint(preflight, null, false)).toBe(true);
  });

  it('allows printing only with current consent and an unchanged review', () => {
    const preflight = recorded();
    expect(mayPrint(preflight, null, false)).toBe(false);
    expect(mayPrint(preflight, 'sha256:an-earlier-review', false)).toBe(false);
    expect(mayPrint(preflight, preflight.identity, false)).toBe(true);
    expect(mayPrint(preflight, preflight.identity, true)).toBe(false);
  });

  it('never allows a batch with a hard error, consent or not', () => {
    const preflight = { ...recorded(), allowed: false, blocked_by: ['blocking_diagnostics'] };
    expect(mayPrint(preflight, preflight.identity, false)).toBe(false);
    expect(batchBlockers(preflight)).toEqual([]);
  });

  it('prints anyway only past an unproven printer, and never without consent', () => {
    const unproven = {
      ...recorded(),
      allowed: false,
      blocked_by: ['local_calibration_missing'],
      override_available: true,
    };
    expect(mayPrint(unproven, unproven.identity, false)).toBe(false);
    expect(mayPrint(unproven, unproven.identity, false, true)).toBe(true);
    expect(mayPrint(unproven, null, false, true)).toBe(false);
    expect(mayPrint(unproven, unproven.identity, true, true)).toBe(false);

    const broken = { ...unproven, blocked_by: ['no_raster'], override_available: false };
    expect(mayPrint(broken, broken.identity, false, true)).toBe(false);
  });

  it('separates batch-wide blockers from a record’s own', () => {
    const preflight = {
      ...recorded(),
      allowed: false,
      blocked_by: ['blocking_diagnostics', 'profile_not_product_verified'],
    };
    expect(batchBlockers(preflight)).toEqual(['profile_not_product_verified']);
  });
});

describe('progress and retry', () => {
  it('counts a finished job with one failed copy', () => {
    const finished = job(jobFixture);
    expect(jobProgress(finished)).toEqual({
      selected: 4,
      printed: 3,
      failed: 1,
      pending: 0,
      printedOverall: 3,
      total: 4,
      finished: true,
    });
    expect(mayRetry(finished)).toBe(true);
    expect(failedAttempts(finished).map((a) => `${a.subject}${a.copy_index}`)).toEqual(['W1']);
  });

  it('counts a retry over the failures only, keeping earlier prints', () => {
    const retrying = job(retryFixture);
    expect(jobProgress(retrying)).toMatchObject({
      selected: 1,
      printed: 0,
      pending: 1,
      printedOverall: 3,
      finished: false,
    });
    expect(mayRetry(retrying)).toBe(false);
  });

  it('offers no retry after a refusal', () => {
    const refused = { ...job(jobFixture), state: 'refused' };
    expect(mayRetry(refused)).toBe(false);
  });
});
