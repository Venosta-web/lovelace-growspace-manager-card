import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { parse } from 'yaml';

const readWorkflow = async (name) =>
  parse(await readFile(new URL(`../.github/workflows/${name}`, import.meta.url), 'utf8'));

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

  const e2eCommands = e2e.jobs['e2e-tests'].steps
    .map((step) => step.run)
    .filter(Boolean)
    .join('\n');
  assert.match(e2eCommands, /npm run test:(?:e2e|ha)/, 'E2E runs the Home Assistant suite');
});
