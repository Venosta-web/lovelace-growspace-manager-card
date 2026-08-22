import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_BATCH_RETRIES,
  parseBatchRetries,
  runBatchWithRetries,
} from './batch-retry.mjs';

/** A runner that returns the given statuses in order, and counts its calls. */
function runnerReturning(...statuses) {
  const calls = { count: 0 };
  const run = () => {
    const status = statuses[calls.count] ?? statuses.at(-1);
    calls.count += 1;
    return status;
  };
  return { run, calls };
}

test('a passing batch runs once and is not retried', () => {
  const { run, calls } = runnerReturning(0);
  const retries = [];

  const status = runBatchWithRetries(run, 1, (attempt) => retries.push(attempt));

  assert.equal(status, 0);
  assert.equal(calls.count, 1);
  assert.deepEqual(retries, []);
});

test('a batch poisoned once is re-run and passes — the #453 case', () => {
  const { run, calls } = runnerReturning(1, 0);
  const retries = [];

  const status = runBatchWithRetries(run, 1, (attempt) => retries.push(attempt));

  assert.equal(status, 0, 'the retry decides the batch');
  assert.equal(calls.count, 2);
  assert.deepEqual(retries, [1], 'the retry is announced once');
});

test('a genuinely broken batch still fails after its retry', () => {
  const { run, calls } = runnerReturning(1, 1);

  const status = runBatchWithRetries(run, 1);

  assert.notEqual(status, 0, 'two poisonings in a row must stay red');
  assert.equal(calls.count, 2, 'and must not retry beyond the budget');
});

test('retries=0 disables the re-run, so the raw rate stays measurable', () => {
  const { run, calls } = runnerReturning(1, 0);
  const retries = [];

  const status = runBatchWithRetries(run, 0, (attempt) => retries.push(attempt));

  assert.notEqual(status, 0);
  assert.equal(calls.count, 1, 'the passing second attempt must never happen');
  assert.deepEqual(retries, []);
});

test('a larger budget keeps retrying until the batch passes', () => {
  const { run, calls } = runnerReturning(1, 1, 0);

  const status = runBatchWithRetries(run, 2);

  assert.equal(status, 0);
  assert.equal(calls.count, 3);
});

test('onRetry is optional', () => {
  const { run } = runnerReturning(1, 0);
  assert.doesNotThrow(() => runBatchWithRetries(run, 1));
});

test('parseBatchRetries defaults when unset or empty', () => {
  assert.equal(parseBatchRetries(undefined), DEFAULT_BATCH_RETRIES);
  assert.equal(parseBatchRetries(''), DEFAULT_BATCH_RETRIES);
});

test('parseBatchRetries accepts non-negative integers, including 0', () => {
  assert.equal(parseBatchRetries('0'), 0);
  assert.equal(parseBatchRetries('1'), 1);
  assert.equal(parseBatchRetries(' 2 '), 2);
});

test('parseBatchRetries rejects anything that would silently become NaN', () => {
  for (const raw of ['abc', '-1', '1.5', 'true', '1x']) {
    assert.throws(
      () => parseBatchRetries(raw),
      /non-negative integer/,
      `expected ${JSON.stringify(raw)} to be rejected`
    );
  }
});
