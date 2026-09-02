import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const DEFAULT_BASE_URL = 'https://raw.githubusercontent.com/Venosta-web/growspace_manager';
const FIXTURE_DIRECTORY = 'tests/fixtures/contract';
const VISION_FIXTURES = [
  'vision_status_response',
  'vision_history_response',
  'trigger_vision_checkup_response',
];

async function fetchWithRetry(url, fetchImpl, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetchImpl(url);
      if (response.status < 500 || attempt === attempts) return response;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
      if (attempt === attempts) throw error;
    }
  }
  throw lastError;
}

async function downloadFixture({ baseUrl, fetchImpl, fixture, output, refs, optional = false }) {
  for (const ref of refs) {
    const url = `${baseUrl}/${ref}/${FIXTURE_DIRECTORY}/${fixture}.json`;
    const response = await fetchWithRetry(url, fetchImpl);
    if (response.ok) {
      await writeFile(output, Buffer.from(await response.arrayBuffer()));
      return ref;
    }
    if (response.status !== 404) {
      throw new Error(`${fixture} fetch from ${ref} failed with HTTP ${response.status}`);
    }
  }

  await rm(output, { force: true });
  if (optional) return null;
  throw new Error(`${fixture} was not found at refs: ${refs.join(', ')}`);
}

export async function fetchContractFixtures({
  releaseTag,
  outputDirectory,
  visionBootstrapRef,
  baseUrl = DEFAULT_BASE_URL,
  fetchImpl = fetch,
}) {
  if (!releaseTag) throw new Error('RELEASE_TAG must name the published prerelease');
  if (!outputDirectory) throw new Error('RUNNER_TEMP must name the fixture directory');
  if (!visionBootstrapRef) {
    throw new Error('GSM_VISION_BOOTSTRAP_REF must pin the backend fixture commit');
  }
  await mkdir(outputDirectory, { recursive: true });

  await downloadFixture({
    baseUrl,
    fetchImpl,
    fixture: 'growspace_payload',
    output: path.join(outputDirectory, 'gsm-main-growspace.json'),
    refs: ['main'],
  });
  await downloadFixture({
    baseUrl,
    fetchImpl,
    fixture: 'growspace_payload',
    output: path.join(outputDirectory, 'gsm-release-growspace.json'),
    refs: [releaseTag],
  });

  for (const fixture of VISION_FIXTURES) {
    await downloadFixture({
      baseUrl,
      fetchImpl,
      fixture,
      output: path.join(outputDirectory, `gsm-prerelease-${fixture}.json`),
      refs: ['prerelease', visionBootstrapRef],
    });
    await downloadFixture({
      baseUrl,
      fetchImpl,
      fixture,
      output: path.join(outputDirectory, `gsm-release-${fixture}.json`),
      refs: [releaseTag],
      optional: true,
    });
  }
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  await fetchContractFixtures({
    releaseTag: process.env.RELEASE_TAG,
    outputDirectory: process.env.RUNNER_TEMP,
    visionBootstrapRef: process.env.GSM_VISION_BOOTSTRAP_REF,
  });
}
