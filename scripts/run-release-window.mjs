/**
 * Prunes superseded prereleases so a stable stays inside HACS's release
 * window; see release-window.mjs.
 *
 *   GITHUB_TOKEN=$(gh auth token) node scripts/run-release-window.mjs [--dry-run] [--keep N]
 *
 * `GITHUB_REPOSITORY` names the repository, as it does on a runner, and
 * defaults to this one. With `GITHUB_STEP_SUMMARY` set, the verdict is appended
 * to it.
 */

import { appendFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';

import {
  HACS_RELEASE_WINDOW,
  PRERELEASES_KEPT,
  createGitHubReleases,
  pruneReleaseWindow,
} from './release-window.mjs';

const { values: options } = parseArgs({
  options: {
    'dry-run': { type: 'boolean', default: false },
    keep: { type: 'string', default: String(PRERELEASES_KEPT) },
  },
});

const summary = async (text) => {
  if (process.env.GITHUB_STEP_SUMMARY) {
    await appendFile(process.env.GITHUB_STEP_SUMMARY, `## Release window\n\n${text}\n`);
  }
};

try {
  const plan = await pruneReleaseWindow({
    releases: createGitHubReleases({
      repository: process.env.GITHUB_REPOSITORY ?? 'Venosta-web/lovelace-growspace-manager-card',
      token: process.env.GITHUB_TOKEN,
    }),
    dryRun: options['dry-run'],
    keep: Number(options.keep),
  });
  await summary(
    `${options['dry-run'] ? 'Would prune' : 'Pruned'} ${plan.pruned.length} prerelease(s). ` +
      `\`${plan.stable.tag}\` is release ${plan.stable.position} of the ${HACS_RELEASE_WINDOW} HACS reads.`
  );
} catch (error) {
  console.error(`::error::${error.message}`);
  await summary(`❌ ${error.message}`);
  process.exitCode = 1;
}
