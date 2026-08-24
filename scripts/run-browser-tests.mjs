import { spawnSync } from 'node:child_process';
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { BROWSER_TEST_BATCHES } from './browser-test-batches.mjs';
import { parseBatchRetries, runBatchWithRetries } from './batch-retry.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Reports are mutable and each checkout owns its own run, even when the hub
// safely shares the read-only dependency tree.
const reportsDirectory = path.join(root, '.cache', 'browser-test-batches');
const vitest = path.join(root, 'node_modules', 'vitest', 'vitest.mjs');
const forwardedArguments = process.argv.slice(2);

await rm(reportsDirectory, { recursive: true, force: true });
await mkdir(reportsDirectory, { recursive: true });

let batchRetries;
try {
  batchRetries = parseBatchRetries(process.env.BROWSER_TEST_BATCH_RETRIES);
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exit(2);
}

function runBatch(batch) {
  return spawnSync(
    process.execPath,
    [
      vitest,
      'run',
      '--configLoader=runner',
      ...forwardedArguments,
      '--reporter=blob',
      `--outputFile=${path.join(reportsDirectory, `${batch.id}.json`)}`,
    ],
    {
      cwd: root,
      env: { ...process.env, VITEST_BROWSER_BATCH: batch.id },
      stdio: 'inherit',
    }
  ).status;
}

let batchFailed = false;

for (const [index, batch] of BROWSER_TEST_BATCHES.entries()) {
  process.stdout.write(`\n[${index + 1}/${BROWSER_TEST_BATCHES.length}] ${batch.label}\n`);

  // A retry overwrites this batch's blob report, so the merged report reflects
  // the attempt that decided the batch.
  const status = runBatchWithRetries(
    () => runBatch(batch),
    batchRetries,
    (attempt) =>
      process.stdout.write(
        `\n[${index + 1}/${BROWSER_TEST_BATCHES.length}] ${batch.label} — failed, re-running in a fresh process (${attempt}/${batchRetries}, issue #453)\n`
      )
  );

  if (status !== 0) {
    batchFailed = true;
  }
}

process.stdout.write('\nComplete browser suite\n');
const mergeResult = spawnSync(
  process.execPath,
  [
    vitest,
    'run',
    '--configLoader=runner',
    ...forwardedArguments,
    `--merge-reports=${reportsDirectory}`,
  ],
  { cwd: root, stdio: 'inherit' }
);

process.exitCode = batchFailed || mergeResult.status !== 0 ? 1 : 0;
