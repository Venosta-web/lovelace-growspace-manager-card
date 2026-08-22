// Batch-level retry for the browser-mode suite (issue #453).
//
// Browser mode intermittently fails to apply a file's hoisted vi.mock factory
// (vitest-dev/vitest#8339). The poisoned module graph lives for that file's
// whole run, so per-test `retry` cannot clear it — only a fresh process can.
// Each batch in run-browser-tests.mjs is already its own process, so re-running
// just the failed batch is the smallest unit that gets a clean graph.
//
// Deliberately finer-grained than the whole-suite retry in test.yml: that one
// re-rolls all five batches, so a batch that was fine can be poisoned on the
// second pass. Here a batch is fatal only when it is poisoned twice in a row,
// which also makes a red run much stronger evidence of a real failure.

export const DEFAULT_BATCH_RETRIES = 1;

/**
 * Parse BROWSER_TEST_BATCH_RETRIES. Absent means the default; 0 disables the
 * retry so the Flake Hunter can measure the raw rate.
 *
 * @throws {Error} if set to anything but a non-negative integer — a typo here
 *   would otherwise silently coerce to NaN and skip the retry entirely.
 */
export function parseBatchRetries(raw) {
  if (raw === undefined || raw === '') return DEFAULT_BATCH_RETRIES;

  if (!/^\d+$/.test(raw.trim())) {
    throw new Error(
      `BROWSER_TEST_BATCH_RETRIES must be a non-negative integer, got: ${JSON.stringify(raw)}`
    );
  }

  return Number.parseInt(raw.trim(), 10);
}

/**
 * Run one batch, re-running it while it fails, up to `retries` extra attempts.
 *
 * @param {() => number} run       runs the batch once, returns its exit status
 * @param {number} retries         extra attempts after the first
 * @param {(attempt: number) => void} [onRetry] called before each re-run
 * @returns {number} the status of the attempt that decided the batch
 */
export function runBatchWithRetries(run, retries, onRetry) {
  let status = run();

  for (let attempt = 1; status !== 0 && attempt <= retries; attempt++) {
    onRetry?.(attempt);
    status = run();
  }

  return status;
}
