// Batch-level retry for the browser-mode suite (issue #453).
//
// Browser mode intermittently fails to apply a file's hoisted vi.mock factory
// (vitest-dev/vitest#8339). The poisoned module graph lives for that file's
// whole run, so per-test retries cannot clear it. Re-running just the failed
// batch is the smallest unit that starts a fresh Vitest process and module graph.

export const DEFAULT_BATCH_RETRIES = 1;

/**
 * Parse BROWSER_TEST_BATCH_RETRIES. Zero disables the mitigation so Flake
 * Hunter can continue measuring the raw upstream failure rate.
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
 * Run one batch and retry failures up to `retries` times.
 *
 * The caller supplies the process boundary: run-browser-tests.mjs spawns a new
 * Vitest process on every invocation.
 */
export function runBatchWithRetries(run, retries, onRetry) {
  let status = run();

  for (let attempt = 1; status !== 0 && attempt <= retries; attempt += 1) {
    onRetry?.(attempt);
    status = run();
  }

  return status;
}
