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
