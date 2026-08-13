import { spawnSync } from 'node:child_process';
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { BROWSER_TEST_BATCHES } from './browser-test-batches.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const reportsDirectory = path.join(root, 'node_modules', '.cache', 'browser-test-batches');
const vitest = path.join(root, 'node_modules', 'vitest', 'vitest.mjs');
const forwardedArguments = process.argv.slice(2);

await rm(reportsDirectory, { recursive: true, force: true });
await mkdir(reportsDirectory, { recursive: true });

let batchFailed = false;

for (const [index, batch] of BROWSER_TEST_BATCHES.entries()) {
  process.stdout.write(`\n[${index + 1}/${BROWSER_TEST_BATCHES.length}] ${batch.label}\n`);

  const result = spawnSync(
    process.execPath,
    [
      vitest,
      'run',
      ...forwardedArguments,
      '--reporter=blob',
      `--outputFile=${path.join(reportsDirectory, `${batch.id}.json`)}`,
    ],
    {
      cwd: root,
      env: { ...process.env, VITEST_BROWSER_BATCH: batch.id },
      stdio: 'inherit',
    }
  );

  if (result.status !== 0) {
    batchFailed = true;
  }
}

process.stdout.write('\nComplete browser suite\n');
const mergeResult = spawnSync(
  process.execPath,
  [vitest, 'run', ...forwardedArguments, `--merge-reports=${reportsDirectory}`],
  { cwd: root, stdio: 'inherit' }
);

process.exitCode = batchFailed || mergeResult.status !== 0 ? 1 : 0;
