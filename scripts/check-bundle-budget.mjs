/**
 * Judges `dist/` against `scripts/bundle-budget.json`; see bundle-budget.mjs.
 *
 *   node scripts/check-bundle-budget.mjs [--base <git ref>]
 *
 * Run it after `npm run build:release`: a development build is refused as
 * unminified before any budget is read, since its sizes would say nothing.
 * `--base` also holds every loosened rule to a new changelog entry, against the
 * budget file as it is at that ref; CI passes the pull request's base branch.
 * With `GITHUB_STEP_SUMMARY` set, the per-chunk table is appended to it.
 */

import { execFile } from 'node:child_process';
import { appendFile, readFile, readdir } from 'node:fs/promises';
import { parseArgs, promisify } from 'node:util';

import {
  EMPTY_BUDGET,
  assertBudgetShape,
  assertChangesAreLogged,
  evaluateBudget,
  measureChunk,
  renderTable,
} from './bundle-budget.mjs';
import { assertMinifiedRelease } from './release-minification.mjs';

const execFileAsync = promisify(execFile);
const budgetPath = 'scripts/bundle-budget.json';
const distDirectory = 'dist';

const { values: options } = parseArgs({ options: { base: { type: 'string' } } });

async function budgetAt(ref) {
  // A ref that does not resolve is a CI misconfiguration, not a branch without
  // a budget, and reading it as one would wave every rule through as new.
  await execFileAsync('git', ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`]).catch(() => {
    throw new Error(`--base ${ref} does not name a commit; fetch it first`);
  });
  try {
    const { stdout } = await execFileAsync('git', ['show', `${ref}:${budgetPath}`], {
      maxBuffer: 1024 * 1024,
    });
    return JSON.parse(stdout);
  } catch {
    return EMPTY_BUDGET;
  }
}

const failures = [];
const budget = JSON.parse(await readFile(budgetPath, 'utf8'));
assertBudgetShape(budget);

if (options.base !== undefined) {
  try {
    assertChangesAreLogged({ base: await budgetAt(options.base), head: budget });
  } catch (error) {
    failures.push(error.message);
  }
}

const fileNames = (await readdir(distDirectory)).filter((file) => file.endsWith('.js')).sort();
const emitted = await Promise.all(
  fileNames.map(async (fileName) => ({
    fileName,
    bytes: await readFile(`${distDirectory}/${fileName}`),
  }))
);
assertMinifiedRelease({
  chunks: emitted.map(({ fileName, bytes }) => ({ fileName, source: bytes.toString('utf8') })),
});

const { rows, failures: excess } = evaluateBudget({
  rules: budget.rules,
  chunks: emitted.map(({ fileName, bytes }) => measureChunk(fileName, bytes)),
});
failures.push(...excess);

const table = renderTable(rows);
console.log(table);

if (process.env.GITHUB_STEP_SUMMARY) {
  const verdict =
    failures.length === 0
      ? 'Every chunk is within budget.'
      : failures.map((failure) => `- ${failure.replaceAll('\n', ' ')}`).join('\n');
  await appendFile(
    process.env.GITHUB_STEP_SUMMARY,
    `## Bundle budget\n\nProduction build, gzip level 9. ⚠ marks a chunk over its Stage 2 target.\n\n` +
      `${table}\n\n${verdict}\n`
  );
}

if (failures.length > 0) {
  console.error(`\n${failures.join('\n')}`);
  process.exitCode = 1;
} else {
  console.log('\nEvery chunk is within budget.');
}
