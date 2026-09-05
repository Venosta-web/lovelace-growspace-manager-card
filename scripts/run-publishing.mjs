#!/usr/bin/env node
import { appendFileSync } from 'node:fs';

import { runPublishing } from './publishing.mjs';

const [mode, channel, ...extraArguments] = process.argv.slice(2);

/*
 * Forge coupling belongs at the entry point, not in the Publishing Interface.
 * A publish that produced a release names its tag as a step output so a
 * post-publish job can pick it up; a run that produced none names nothing, and
 * that emptiness is what keeps the HACS update check off the extra Release run
 * every publish triggers when it pushes its bundle-cleanup commit.
 */
function reportPublishedTag({ outcome, tag }) {
  if (!process.env.GITHUB_OUTPUT || outcome !== 'published' || !tag) return;
  appendFileSync(process.env.GITHUB_OUTPUT, `tag=${tag}\n`);
}

try {
  if (extraArguments.length > 0 || (mode === 'verify' && channel !== undefined)) {
    throw new Error('Usage: run-publishing.mjs verify | publish <stable|prerelease>');
  }
  reportPublishedTag(await runPublishing({ mode, channel }));
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = error.status ?? 2;
}
