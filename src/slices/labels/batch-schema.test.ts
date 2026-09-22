/**
 * The batch payloads, parsed by the schemas that will meet them.
 *
 * Each fixture is the backend's own recorded response (growspace_manager
 * `tests/labels/test_label_batch_wire.py`): a preflight of two plants in two
 * copies, the refusal of printing it without consent, the job that started,
 * the job once one copy had failed, and the retry of that copy.
 */

import { describe, expect, it } from 'vitest';

import jobFixture from '../../../tests/fixtures/contract/label_batch_job_v1.json';
import preflightFixture from '../../../tests/fixtures/contract/label_batch_preflight_v1.json';
import refusedFixture from '../../../tests/fixtures/contract/label_batch_refused_v1.json';
import retryFixture from '../../../tests/fixtures/contract/label_batch_retry_v1.json';
import startedFixture from '../../../tests/fixtures/contract/label_batch_started_v1.json';
import { BatchJobAnswerSchema, BatchPreflightAnswerSchema } from './batch-schema';

describe('the recorded batch payloads', () => {
  it('parses a preflight whose plan is copy-major', () => {
    const parsed = BatchPreflightAnswerSchema.parse(preflightFixture);

    expect(parsed.outcome).toBe('ok');
    if (parsed.outcome !== 'ok') return;
    expect(parsed.preflight_id).toBeTruthy();
    expect(parsed.preflight.records.map((record) => record.subject)).toEqual(['A', 'W']);
    expect(
      parsed.preflight.attempts.map((attempt) => `${attempt.subject}${attempt.copy_index}`)
    ).toEqual(['A1', 'W1', 'A2', 'W2']);
    expect(parsed.preflight.acknowledgement_required).toBe(true);
    expect(parsed.preflight.diagnostics.every((item) => item.subject)).toBe(true);
  });

  it('parses a print refused for want of consent, with its recovery', () => {
    const parsed = BatchJobAnswerSchema.parse(refusedFixture);

    expect(parsed.outcome).toBe('refused');
    if (parsed.outcome !== 'refused') return;
    expect(parsed.refusal.blocked_by).toEqual(['warning_acknowledgement_required']);
    expect(parsed.refusal.recovery).toBe('acknowledge_warnings');
  });

  it('parses a started job with every attempt pending', () => {
    const parsed = BatchJobAnswerSchema.parse(startedFixture);

    expect(parsed.outcome).toBe('ok');
    if (parsed.outcome !== 'ok') return;
    expect(parsed.job.state).toBe('running');
    expect(new Set(parsed.job.attempts.map((attempt) => attempt.status))).toEqual(
      new Set(['pending'])
    );
  });

  it('parses a finished job with one failed copy and the printer’s words', () => {
    const parsed = BatchJobAnswerSchema.parse(jobFixture);

    expect(parsed.outcome).toBe('ok');
    if (parsed.outcome !== 'ok') return;
    expect(parsed.job.attempts.map((attempt) => attempt.status)).toEqual([
      'printed',
      'failed',
      'printed',
      'printed',
    ]);
    expect(parsed.job.attempts[1].error).toMatch(/out of labels/);
    expect(parsed.job.attempts[0].raster_identity).toBeTruthy();
  });

  it('parses a retry that selects only the failed copy', () => {
    const parsed = BatchJobAnswerSchema.parse(retryFixture);

    expect(parsed.outcome).toBe('ok');
    if (parsed.outcome !== 'ok') return;
    expect(parsed.job.retry_of).toBeTruthy();
    expect(parsed.job.selected).toHaveLength(1);
    expect(parsed.job.attempts.map((attempt) => attempt.status)).toEqual([
      'printed',
      'pending',
      'printed',
      'printed',
    ]);
  });
});
