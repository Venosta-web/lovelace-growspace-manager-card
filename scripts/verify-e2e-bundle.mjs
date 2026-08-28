#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import * as dotenv from 'dotenv';

import {
  assertLocalBundle,
  assertServedBundle,
  computeSourceFingerprint,
} from './e2e-build-state.mjs';

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const bundlePath = path.join(rootDirectory, 'dist', 'growspace-manager-card.js');
const envPath =
  process.env.GROWSPACE_E2E_ENV_PATH ?? path.join(rootDirectory, 'tests', 'e2e', '.env.test');

dotenv.config({ path: envPath, quiet: true });

function waitTimeout() {
  const argument = process.argv.slice(2).find((value) => value.startsWith('--wait='));
  if (!argument) return 0;
  const milliseconds = Number(argument.slice('--wait='.length));
  if (!Number.isFinite(milliseconds) || milliseconds < 0) {
    throw new Error(`Invalid --wait timeout: ${argument}`);
  }
  return milliseconds;
}

function servedBundleUrl() {
  const baseUrl = process.env.HA_BASE_URL || 'http://localhost:8123';
  const resourcePath =
    process.env.E2E_CARD_URL ||
    '/local/community/lovelace-growspace-manager-card/growspace-manager-card.js';
  return new URL(resourcePath, `${baseUrl.replace(/\/$/, '')}/`);
}

async function readLocalBundle() {
  try {
    return await readFile(bundlePath, 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT') {
      throw new Error(
        'E2E bundle preflight failed: dist/growspace-manager-card.js is missing.\n' +
          'Run `npm run build`, then restart Home Assistant because the build replaces the dist/ directory.'
      );
    }
    throw error;
  }
}

async function fetchServedBundle(url) {
  const requestUrl = new URL(url);
  requestUrl.searchParams.set('_growspace_e2e_build', `${Date.now()}`);
  let response;
  try {
    response = await fetch(requestUrl, {
      cache: 'no-store',
      signal: AbortSignal.timeout(5_000),
    });
  } catch (error) {
    throw new Error(
      `E2E bundle preflight failed: could not load the card bundle from ${url}.\n` +
        `Home Assistant must be running and serving the e2e card resource (${error.message}).`
    );
  }
  if (!response.ok) {
    // A 404 when a local bundle exists is nearly always the bind-mount inode
    // trap, not a misconfigured resource: rollup deletes and recreates dist/,
    // and Docker keeps serving the old, deleted directory until the container
    // is recreated. Lead with that; the registration causes are far rarer and
    // send you looking in the wrong place.
    const likelyCauses =
      response.status === 404
        ? 'Most likely the build replaced dist/ and Home Assistant is still mounting the old, deleted\n' +
          'directory. Recreate the container (`./scripts/ha dev restart` in the workspace hub, or\n' +
          '`node scripts/restart-e2e-ha.mjs`).\n' +
          'If that does not fix it, the container may be mounting a different checkout entirely —\n' +
          'check `docker inspect growspace-ha-dev` for the dist/ mount source. Only then suspect\n' +
          'E2E_CARD_URL or the Lovelace resource registration.'
        : 'Check that Home Assistant is healthy, then E2E_CARD_URL and the Lovelace resource registration.';

    throw new Error(
      `E2E bundle preflight failed: ${url} returned HTTP ${response.status}.\n${likelyCauses}`
    );
  }
  return response.text();
}

async function verifyServedWithRetry(url, localMarker, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let lastError;

  do {
    try {
      const servedBundle = await fetchServedBundle(url);
      assertServedBundle(servedBundle, localMarker, url);
      return;
    } catch (error) {
      lastError = error;
      if (Date.now() >= deadline) break;
      await new Promise((resolve) => setTimeout(resolve, 1_000));
    }
  } while (true);

  throw lastError;
}

try {
  const timeoutMs = waitTimeout();
  const expectedSourceFingerprint = await computeSourceFingerprint(rootDirectory);
  const localMarker = assertLocalBundle(
    await readLocalBundle(),
    expectedSourceFingerprint,
    'dist/growspace-manager-card.js'
  );
  const url = servedBundleUrl();

  if (timeoutMs > 0) {
    console.log(
      `Waiting up to ${Math.ceil(timeoutMs / 1_000)}s for Home Assistant to serve build ${localMarker.buildId}...`
    );
  }
  await verifyServedWithRetry(url, localMarker, timeoutMs);
  console.log(
    `E2E bundle preflight passed: Home Assistant serves build ${localMarker.buildId} from source ${localMarker.sourceFingerprint}.`
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
