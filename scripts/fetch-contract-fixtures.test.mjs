import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { fetchContractFixtures } from './fetch-contract-fixtures.mjs';

test('missing prerelease Vision fixtures fail at the current backend boundary', async (t) => {
  const outputDirectory = await mkdtemp(path.join(os.tmpdir(), 'gsm-fixtures-'));
  t.after(() => rm(outputDirectory, { recursive: true, force: true }));
  const urls = [];
  const fetchImpl = async (url) => {
    urls.push(url);
    if (url.includes('/prerelease/') && url.includes('/vision_')) {
      return new Response('not found', { status: 404 });
    }
    if (url.includes('/prerelease/') && url.includes('/trigger_vision_')) {
      return new Response('not found', { status: 404 });
    }
    if (url.includes('/v1.2.3/') && url.includes('vision')) {
      return new Response('not found', { status: 404 });
    }
    return new Response(JSON.stringify({ source: url }), { status: 200 });
  };

  await assert.rejects(
    fetchContractFixtures({
      releaseTag: 'v1.2.3',
      outputDirectory,
      baseUrl: 'https://fixtures.example',
      fetchImpl,
    }),
    /vision_status_response was not found at refs: prerelease/
  );

  assert.deepEqual(
    urls.filter((url) => url.endsWith('/vision_status_response.json')),
    ['https://fixtures.example/prerelease/tests/fixtures/contract/vision_status_response.json']
  );
});

test('a non-404 prerelease failure stays attributed to the current backend', async (t) => {
  const outputDirectory = await mkdtemp(path.join(os.tmpdir(), 'gsm-fixtures-'));
  t.after(() => rm(outputDirectory, { recursive: true, force: true }));
  const urls = [];
  const fetchImpl = async (url) => {
    urls.push(url);
    if (url.includes('/prerelease/')) return new Response('forbidden', { status: 403 });
    return new Response('{}', { status: 200 });
  };

  await assert.rejects(
    fetchContractFixtures({
      releaseTag: 'v1.2.3',
      outputDirectory,
      baseUrl: 'https://fixtures.example',
      fetchImpl,
    }),
    /fetch from prerelease failed with HTTP 403/
  );
  assert.equal(
    urls.some((url) => /\/[0-9a-f]{40}\//.test(url)),
    false
  );
});
