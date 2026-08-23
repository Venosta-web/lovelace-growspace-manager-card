import assert from 'node:assert/strict';
import test from 'node:test';

import { DEFAULT_BATCH_RETRIES, parseBatchRetries, runBatchWithRetries } from './batch-retry.mjs';

function runnerReturning(...statuses) {
  const calls = { count: 0 };
  const run = () => {
    const status = statuses[calls.count] ?? statuses.at(-1);
    calls.count += 1;
    return status;
  };
  return { run, calls };
}

test('a passing batch runs once', () => {
  const { run, calls } = runnerReturning(0);
  const retries = [];

  const status = runBatchWithRetries(run, 1, (attempt) => retries.push(attempt));

  assert.equal(status, 0);
  assert.equal(calls.count, 1);
  assert.deepEqual(retries, []);
});

test('a batch poisoned once is rerun and passes — the #453 regression', () => {
  const { run, calls } = runnerReturning(1, 0);
  const retries = [];

  const status = runBatchWithRetries(run, 1, (attempt) => retries.push(attempt));

  assert.equal(status, 0, 'the fresh-process retry decides the batch');
  assert.equal(calls.count, 2);
  assert.deepEqual(retries, [1]);
});

test('a genuinely broken batch remains red after its retry', () => {
  const { run, calls } = runnerReturning(1, 1);

  const status = runBatchWithRetries(run, 1);

  assert.notEqual(status, 0);
  assert.equal(calls.count, 2, 'the retry budget is not exceeded');
});

test('zero retries exposes the raw flake rate', () => {
  const { run, calls } = runnerReturning(1, 0);

  const status = runBatchWithRetries(run, 0);

  assert.notEqual(status, 0);
  assert.equal(calls.count, 1, 'the passing second attempt is not run');
});

test('a larger budget retries until the batch passes', () => {
  const { run, calls } = runnerReturning(1, 1, 0);

  const status = runBatchWithRetries(run, 2);

  assert.equal(status, 0);
  assert.equal(calls.count, 3);
});

test('parseBatchRetries defaults when unset or empty', () => {
  assert.equal(parseBatchRetries(undefined), DEFAULT_BATCH_RETRIES);
  assert.equal(parseBatchRetries(''), DEFAULT_BATCH_RETRIES);
});

test('parseBatchRetries accepts non-negative integers', () => {
  assert.equal(parseBatchRetries('0'), 0);
  assert.equal(parseBatchRetries('1'), 1);
  assert.equal(parseBatchRetries(' 2 '), 2);
});

test('parseBatchRetries rejects invalid values', () => {
  for (const raw of ['abc', '-1', '1.5', 'true', '1x']) {
    assert.throws(
      () => parseBatchRetries(raw),
      /non-negative integer/,
      `expected ${JSON.stringify(raw)} to be rejected`
    );
  }
});
