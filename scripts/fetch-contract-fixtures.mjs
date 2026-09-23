import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const DEFAULT_BASE_URL = 'https://raw.githubusercontent.com/Venosta-web/growspace_manager';
// Growspace Manager TC is a separate repository that owns its own WebSocket
// contract, and it records its fixtures under the same path.
const DEFAULT_TC_BASE_URL = 'https://raw.githubusercontent.com/Venosta-web/growspace_manager_tc';
const FIXTURE_DIRECTORY = 'tests/fixtures/contract';
const VISION_FIXTURES = [
  'vision_status_response',
  'vision_history_response',
  'trigger_vision_checkup_response',
];
// Every Label Template payload the card parses. They land on `prerelease`
// first — the architecture branch the template work integrates on — and reach
// a release tag later, which is why the release copy is optional: a card that
// required it could not merge until the backend published.
const LABEL_FIXTURES = [
  'label_template_capability_v1',
  'label_factory_template_preview_v1',
  'label_factory_template_preview_refused_v1',
  'label_template_library_v1',
  'label_draft_opened_v1',
  'label_draft_saved_v1',
  'label_draft_conflict_v1',
  'label_draft_preview_v1',
  'label_draft_published_v1',
  'label_calibration_status_v1',
  'label_calibration_sheet_v1',
  'label_calibration_recorded_v1',
  'label_draft_test_print_v1',
  'label_record_preview_v1',
  'label_record_printed_v1',
  'label_print_refused_v1',
  'label_batch_preflight_v1',
  'label_batch_refused_v1',
  'label_batch_started_v1',
  'label_batch_job_v1',
  'label_batch_retry_v1',
  'label_localization_catalogue_v1',
];
// The update_plant request: the fields the backend accepts, which every payload
// the card builds must stay within (GSM#804). It is prerelease-first like the
// label contracts, and no release carries it yet.
const PLANT_FIXTURES = ['update_plant_request_v1'];
// Every payload the card's TC chunk parses, and the local file each is written
// to. One entry per contract, so adding a TC command is one line here rather
// than a fourth copy of the download call.
const TC_FIXTURES = [
  ['tc_manifest_response', 'tc-main-manifest.json'],
  ['tc_culture_media_response', 'tc-main-culture-media.json'],
  ['tc_culture_lines_response', 'tc-main-culture-lines.json'],
  ['tc_maintenance_response', 'tc-main-maintenance.json'],
  ['tc_pairings_response', 'tc-main-pairings.json'],
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
  baseUrl = DEFAULT_BASE_URL,
  tcBaseUrl = DEFAULT_TC_BASE_URL,
  fetchImpl = fetch,
}) {
  if (!releaseTag) throw new Error('RELEASE_TAG must name the published prerelease');
  if (!outputDirectory) throw new Error('RUNNER_TEMP must name the fixture directory');
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
      refs: ['prerelease'],
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

  for (const fixture of [...LABEL_FIXTURES, ...PLANT_FIXTURES]) {
    await downloadFixture({
      baseUrl,
      fetchImpl,
      fixture,
      output: path.join(outputDirectory, `gsm-prerelease-${fixture}.json`),
      refs: ['prerelease'],
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

  // TC integrates on `main` and has published no release yet, so there is no
  // backward-safety ref to check against: nothing is installed that a card
  // change could strand. These are required, not optional — a missing fixture
  // means the TC contract has not landed, which is exactly when the card must
  // not merge.
  for (const [fixture, output] of TC_FIXTURES) {
    await downloadFixture({
      baseUrl: tcBaseUrl,
      fetchImpl,
      fixture,
      output: path.join(outputDirectory, output),
      refs: ['main'],
    });
  }
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  await fetchContractFixtures({
    releaseTag: process.env.RELEASE_TAG,
    outputDirectory: process.env.RUNNER_TEMP,
  });
}
