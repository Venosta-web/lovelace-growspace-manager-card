import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { parse } from 'yaml';

const readWorkflow = async (name) =>
  parse(await readFile(new URL(`../.github/workflows/${name}`, import.meta.url), 'utf8'));

const readAction = async (name) =>
  parse(await readFile(new URL(`../.github/actions/${name}/action.yml`, import.meta.url), 'utf8'));

const branchesFor = (workflow, event) => workflow.on?.[event]?.branches ?? [];
const hasEvent = (workflow, event) => Object.hasOwn(workflow.on ?? {}, event);

test('stable publishing is gated while dev prereleases stay E2E-free', async () => {
  const release = await readWorkflow('release.yml');
  const e2e = await readWorkflow('e2e-frontend.yaml');
  const lint = await readWorkflow('lint.yml');
  const unit = await readWorkflow('test.yml');
  const contract = await readWorkflow('contract-fixture.yml');

  assert.deepEqual(branchesFor(release, 'push'), ['main', 'dev']);
  assert.ok(hasEvent(release, 'workflow_dispatch'), 'release keeps optional manual dispatch');

  const stable = release.jobs['stable-release'];
  assert.ok(stable, 'release defines a dedicated stable-release job');
  assert.deepEqual(stable.needs, ['lint-and-build', 'unit-tests', 'contract-fixture', 'e2e']);
  assert.match(stable.if, /refs\/heads\/main/);
  assert.doesNotMatch(
    stable.if,
    /always\(\)|failure\(\)|cancelled\(\)/,
    'stable publishing must retain the implicit all-needs-succeeded condition'
  );

  const prerelease = release.jobs.prerelease;
  assert.ok(prerelease, 'release defines a dedicated prerelease job');
  assert.equal(prerelease.needs, undefined, 'dev prerelease must not wait for stable validation');
  assert.match(prerelease.if, /refs\/heads\/dev/);

  for (const jobName of ['lint-and-build', 'unit-tests', 'contract-fixture', 'e2e']) {
    assert.match(release.jobs[jobName].if, /refs\/heads\/main/);
  }

  assert.ok(hasEvent(e2e, 'workflow_call'), 'the main release gate can call the E2E workflow');
  assert.ok(hasEvent(e2e, 'workflow_dispatch'), 'E2E keeps optional manual dispatch');
  assert.equal(e2e.on.push, undefined, 'E2E must not independently run for dev or main pushes');
  assert.equal(e2e.on.pull_request, undefined, 'E2E must not run for pull requests');
  for (const [name, workflow] of [
    ['lint', lint],
    ['unit tests', unit],
    ['contract fixture', contract],
  ]) {
    assert.ok(hasEvent(workflow, 'workflow_call'), `${name} is reusable by the release gate`);
  }

  const steps = e2e.jobs['e2e-tests'].steps;
  const checkoutSteps = steps.filter((step) => step.uses?.startsWith('actions/checkout@'));
  assert.equal(checkoutSteps.length, 3, 'the GitHub adapter owns all three checkouts');
  assert.equal(checkoutSteps[0].with, undefined, 'the card uses the triggering checkout');
  assert.deepEqual(
    checkoutSteps.slice(1).map((step) => ({
      repository: step.with.repository,
      ref: step.with.ref,
      path: step.with.path,
    })),
    [
      {
        repository: 'Venosta-web/growspace_manager',
        ref: 'prerelease',
        path: '.e2e/growspace_manager',
      },
      {
        repository: 'Venosta-web/growspace_manager_workspace',
        ref: 'main',
        path: '.e2e/workspace',
      },
    ]
  );

  const nodeSetup = steps.find((step) => step.uses?.startsWith('actions/setup-node@'));
  assert.equal(nodeSetup?.with.cache, 'npm', 'the GitHub adapter retains npm caching');
  assert.ok(
    steps.some((step) => step.run?.includes('playwright install --with-deps chromium')),
    'the GitHub adapter installs the browser and its runner dependencies'
  );

  const commands = steps
    .map((step) => step.run)
    .filter(Boolean)
    .join('\n');
  const harnessSteps = steps.filter((step) => step.run?.includes('npm run test:e2e'));
  assert.equal(harnessSteps.length, 1, 'E2E delegates to one managed runtime-harness invocation');
  assert.match(harnessSteps[0].run, /--integration-root/);
  assert.match(harnessSteps[0].run, /--workspace-root/);
  assert.doesNotMatch(
    commands,
    /docker (?:run|rm|logs)|ci-e2e-environment\.mjs|verify-e2e-bundle\.mjs/,
    'the GitHub adapter must not duplicate runtime lifecycle ordering'
  );

  const rootSelection = steps.find((step) => step.id === 'checkout-roots');
  assert.ok(rootSelection, 'the GitHub adapter selects explicit checkout roots');
  assert.match(rootSelection.run, /manifest\.json/);
  assert.match(rootSelection.run, /e2e_simulated_sensors\.yaml/);

  const artifactUpload = steps.find((step) => step.uses?.startsWith('actions/upload-artifact@'));
  assert.ok(artifactUpload, 'the GitHub adapter uploads harness failure evidence');
  assert.match(artifactUpload.if, /failure\(\)/);
  assert.match(artifactUpload.if, /cancelled\(\)/);
  assert.equal(artifactUpload.with.path, '.artifacts/e2e-managed/');
  assert.equal(artifactUpload.with['if-no-files-found'], 'error');
  assert.equal(e2e.jobs['e2e-tests']['continue-on-error'], undefined);
});

test('the GitHub adapter delegates release preparation to the publishing interface', async () => {
  const release = await readWorkflow('release.yml');
  const lint = await readWorkflow('lint.yml');
  const releaseNode = await readAction('setup-release-node');

  assert.equal(
    releaseNode.runs.steps[0].with['node-version'],
    '22',
    'the release-only Node source remains visible in the GitHub adapter'
  );
  assert.equal(releaseNode.runs.steps[0].with.cache, 'npm');

  const preflightSteps = lint.jobs['release-preflight'].steps;
  assert.equal(
    preflightSteps.filter((step) => step.uses === './.github/actions/setup-release-node').length,
    1
  );
  assert.deepEqual(
    preflightSteps.filter((step) => step.run).map((step) => step.run),
    ['npm run publishing:verify']
  );

  for (const [jobName, channel] of [
    ['stable-release', 'stable'],
    ['prerelease', 'prerelease'],
  ]) {
    const steps = release.jobs[jobName].steps;
    assert.equal(
      steps.filter((step) => step.uses === './.github/actions/setup-release-node').length,
      1
    );
    const commands = steps
      .map((step) => step.run)
      .filter(Boolean)
      .join('\n');
    assert.match(commands, new RegExp(`npm run publishing:publish -- ${channel}`));
    assert.doesNotMatch(
      commands,
      /npm ci|npm run build|validate:hacs-release|npx semantic-release/,
      'the GitHub adapter must not duplicate publishing implementation details'
    );
  }
});
