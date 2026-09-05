import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { parse } from 'yaml';

const readWorkflow = async (name) =>
  parse(await readFile(new URL(`../.github/workflows/${name}`, import.meta.url), 'utf8'));

const readAction = async (name) =>
  parse(await readFile(new URL(`../.github/actions/${name}/action.yml`, import.meta.url), 'utf8'));

function publishingJobForBranch(workflow, branch) {
  const branchCondition = `github.ref == 'refs/heads/${branch}'`;
  const matches = Object.values(workflow.jobs).filter(
    (job) => job.if === branchCondition && Array.isArray(job.steps)
  );
  assert.equal(matches.length, 1, `${branch} must route to exactly one publishing job`);
  return matches[0];
}

function runCommands(job) {
  return job.steps.filter((step) => step.run).map((step) => step.run);
}

function releaseRuntimeUses(job) {
  return job.steps.filter((step) => step.uses === './.github/actions/setup-release-node');
}

test('the GitHub adapter retains only routing, validation edges, and module invocations', async () => {
  const release = await readWorkflow('release.yml');
  const lint = await readWorkflow('lint.yml');
  const releaseRuntime = await readAction('setup-release-node');

  assert.deepEqual(release.on.push.branches, ['main', 'dev']);

  const stable = publishingJobForBranch(release, 'main');
  assert.deepEqual(
    stable.needs.map((jobName) => release.jobs[jobName].uses),
    [
      './.github/workflows/lint.yml',
      './.github/workflows/test.yml',
      './.github/workflows/contract-fixture.yml',
      './.github/workflows/e2e-frontend.yaml',
    ],
    'stable publishing keeps every explicit validation edge'
  );
  assert.equal(
    stable.if,
    "github.ref == 'refs/heads/main'",
    'the branch condition must retain GitHub default successful-needs behavior'
  );
  assert.equal(stable['continue-on-error'], undefined);
  assert.deepEqual(runCommands(stable), ['npm run publishing:publish -- stable']);

  const prerelease = publishingJobForBranch(release, 'dev');
  assert.equal(prerelease.needs, undefined, 'dev prereleases stay outside stable validation');
  assert.deepEqual(runCommands(prerelease), ['npm run publishing:publish -- prerelease']);

  const verificationJobs = Object.values(lint.jobs).filter((job) =>
    runCommands(job).includes('npm run publishing:verify')
  );
  assert.equal(verificationJobs.length, 1, 'preflight enters the Publishing Interface once');

  for (const job of [stable, prerelease, verificationJobs[0]]) {
    assert.equal(
      releaseRuntimeUses(job).length,
      1,
      'every publishing entry uses the shared runtime'
    );
  }
  assert.equal(releaseRuntime.runs.steps[0].with['node-version'], '22');
  assert.equal(releaseRuntime.runs.steps[0].with.cache, 'npm');
});

test('the public demo deploys only after a successful stable release', async () => {
  const release = await readWorkflow('release.yml');
  const demo = await readWorkflow('demo.yaml');

  assert.equal(
    demo.on.push,
    undefined,
    'an independent main push must not deploy before stable publishing finishes'
  );
  assert.ok('workflow_call' in demo.on, 'the stable release can call the demo workflow');
  assert.deepEqual(demo.on.pull_request.branches, ['main']);

  const deployment = release.jobs['deploy-demo'];
  assert.equal(deployment.if, "github.ref == 'refs/heads/main'");
  assert.equal(deployment.needs, 'stable-release');
  assert.equal(deployment.uses, './.github/workflows/demo.yaml');

  assert.equal(demo.jobs.deploy.needs, 'build');
  assert.equal(
    demo.jobs.deploy.if,
    "github.event_name != 'pull_request'",
    'pull requests verify the assembled demo without publishing Pages'
  );
});

test('the HACS update check follows publishing on both channels and gates neither', async () => {
  const release = await readWorkflow('release.yml');
  const check = await readWorkflow('hacs-update-check.yaml');

  const job = release.jobs['hacs-update-check'];
  assert.deepEqual(
    job.needs,
    ['prerelease', 'stable-release'],
    'the check runs after whichever channel published'
  );
  assert.equal(job.uses, './.github/workflows/hacs-update-check.yaml');

  // A job cannot both depend on publishing and hold it up, and nothing else
  // may depend on this one either — ADR-0025 keeps the dev prerelease path
  // free of validation edges, and an update check is not a release gate.
  for (const [name, other] of Object.entries(release.jobs)) {
    if (name === 'hacs-update-check') continue;
    const needs = other.needs === undefined ? [] : [other.needs].flat();
    assert.ok(!needs.includes('hacs-update-check'), `${name} must not wait on the update check`);
  }
  assert.equal(release.jobs.prerelease.needs, undefined);
  assert.equal(job['continue-on-error'], undefined, 'a broken update graph reports red');

  // Only a publish that produced a tag is worth checking: the extra Release
  // run every publish triggers with its cleanup push produces none.
  assert.equal(
    job.if,
    'always() && (needs.prerelease.outputs.tag || needs.stable-release.outputs.tag)'
  );
  assert.equal(
    job.with.tag,
    '${{ needs.prerelease.outputs.tag || needs.stable-release.outputs.tag }}'
  );
  for (const channel of ['prerelease', 'stable-release']) {
    assert.equal(
      release.jobs[channel].outputs.tag,
      '${{ steps.publish.outputs.tag }}',
      `${channel} reports the tag it published`
    );
  }

  assert.equal(check.on.push, undefined, 'the check never runs outside a publish');
  assert.ok('workflow_call' in check.on, 'the release workflow calls it');
  assert.equal(check.on.workflow_call.inputs.tag.required, true);
});
