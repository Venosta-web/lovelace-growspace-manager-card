import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { fetchContractFixtures } from './fetch-contract-fixtures.mjs';

const BOOTSTRAP_REF = '9f2446af7141ccd16eb814059cfed6e74f51c859';

test('missing prerelease Vision fixtures fall back to the pinned backend commit', async (t) => {
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

  await fetchContractFixtures({
    releaseTag: 'v1.2.3',
    outputDirectory,
    visionBootstrapRef: BOOTSTRAP_REF,
    baseUrl: 'https://fixtures.example',
    fetchImpl,
  });

  const statusFixture = JSON.parse(
    await readFile(path.join(outputDirectory, 'gsm-prerelease-vision_status_response.json'), 'utf8')
  );
  assert.match(statusFixture.source, new RegExp(`/${BOOTSTRAP_REF}/`));
  assert.deepEqual(
    urls.filter((url) => url.endsWith('/vision_status_response.json')),
    [
      'https://fixtures.example/prerelease/tests/fixtures/contract/vision_status_response.json',
      `https://fixtures.example/${BOOTSTRAP_REF}/tests/fixtures/contract/vision_status_response.json`,
      'https://fixtures.example/v1.2.3/tests/fixtures/contract/vision_status_response.json',
    ]
  );
});

test('a non-404 prerelease failure does not silently use the bootstrap fixture', async (t) => {
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
      visionBootstrapRef: BOOTSTRAP_REF,
      baseUrl: 'https://fixtures.example',
      fetchImpl,
    }),
    /fetch from prerelease failed with HTTP 403/
  );
  assert.equal(
    urls.some((url) => url.includes(`/${BOOTSTRAP_REF}/`)),
    false
  );
});
