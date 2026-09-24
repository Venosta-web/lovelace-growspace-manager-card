/** Gate npm's shipped dependency tree and report the full tree on every run. */
import { spawnSync } from 'node:child_process';
import { appendFile } from 'node:fs/promises';

import {
  advisoryLines,
  githubError,
  parseAudit,
  summaryTable,
  totalFindings,
} from './dependency-audit.mjs';

function audit(args) {
  const result = spawnSync('npm', ['audit', '--json', ...args], {
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  return parseAudit(result.stdout, result.stderr, result.status);
}

let shipped;
let shippedError;
try {
  shipped = audit(['--omit=dev']);
} catch (error) {
  shippedError = error.message;
}

// Tooling findings and even a failed tooling audit are informational. Always
// attempt it so the job summary shows the next backlog on every run.
let full;
let fullError;
try {
  full = audit([]);
} catch (error) {
  fullError = error.message;
}

const summary = summaryTable(shipped, full, fullError);
console.log(summary);
if (process.env.GITHUB_STEP_SUMMARY) {
  await appendFile(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`);
}

if (shippedError) {
  console.error(githubError(`Shipped dependency audit could not run: ${shippedError}`));
  process.exitCode = 1;
} else if (totalFindings(shipped) > 0) {
  const lines = advisoryLines(shipped.vulnerabilities);
  for (const line of lines) console.error(githubError(line));
  if (lines.length === 0) {
    console.error(
      githubError(`${totalFindings(shipped)} shipped dependency findings; inspect npm audit output`)
    );
  }
  process.exitCode = 1;
} else {
  console.log('No shipped dependency advisories.');
}

if (fullError) console.warn(`Full-tree audit unavailable (informational): ${fullError}`);
