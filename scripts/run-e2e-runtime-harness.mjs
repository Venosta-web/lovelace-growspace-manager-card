#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { runE2ERuntimeHarness } from './e2e-runtime-harness.mjs';

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [mode, ...playwrightArguments] = process.argv.slice(2);

try {
  process.exitCode = runE2ERuntimeHarness({
    mode,
    rootDirectory,
    playwrightArguments,
    environment: process.env,
  });
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 2;
}
