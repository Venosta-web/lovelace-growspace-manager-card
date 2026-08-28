#!/usr/bin/env node
import { runPublishing } from './publishing.mjs';

const [mode, channel, ...extraArguments] = process.argv.slice(2);

try {
  if (extraArguments.length > 0 || (mode === 'verify' && channel !== undefined)) {
    throw new Error('Usage: run-publishing.mjs verify | publish <stable|prerelease>');
  }
  await runPublishing({ mode, channel });
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = error.status ?? 2;
}
