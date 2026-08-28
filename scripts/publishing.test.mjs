import assert from 'node:assert/strict';
import test from 'node:test';

import { runPublishing } from './publishing.mjs';

function releaseConfigFor(branch, { includePrereleaseVersionedAssets = false } = {}) {
  const versionedAssets =
    branch === 'main' || includePrereleaseVersionedAssets ? ['package.json', 'CHANGELOG.md'] : [];
  return {
    plugins: [
      ['@semantic-release/git', { assets: [...versionedAssets, 'dist/*.js'] }],
      ['@semantic-release/github', { assets: [{ path: 'dist/*.js' }] }],
    ],
  };
}

test('verify prepares once and verifies both release channels without publishing', async () => {
  const executions = [];
  const plannedBranches = [];
  let output = '';

  const result = await runPublishing({
    mode: 'verify',
    commandRunner: async (execution) => executions.push(execution),
    releaseConfigFactory: (branch) => {
      plannedBranches.push(branch);
      return releaseConfigFor(branch);
    },
    writeOutput: (message) => (output += message),
  });

  assert.deepEqual(result, {
    outcome: 'verified',
    channels: ['stable', 'prerelease'],
  });
  assert.deepEqual(
    executions.map(({ command, arguments: arguments_, stage }) => ({
      command,
      arguments: arguments_,
      stage,
    })),
    [
      { command: 'npm', arguments: ['ci'], stage: 'preparation' },
      { command: 'npm', arguments: ['run', 'build'], stage: 'preparation' },
      {
        command: 'npm',
        arguments: ['run', 'validate:hacs-release'],
        stage: 'artifact-verification',
      },
    ]
  );
  assert.deepEqual(plannedBranches, ['main', 'dev']);
  assert.equal(output, 'verified\n');
});

test('verify accepts the repository stable and prerelease artifact plans', async () => {
  const result = await runPublishing({
    mode: 'verify',
    commandRunner: async () => {},
    writeOutput: () => {},
  });

  assert.deepEqual(result, {
    outcome: 'verified',
    channels: ['stable', 'prerelease'],
  });
});

for (const [channel, branch] of [
  ['stable', 'main'],
  ['prerelease', 'dev'],
]) {
  test(`publish ${channel} uses the verified preparation path before semantic-release`, async () => {
    const executions = [];

    const result = await runPublishing({
      mode: 'publish',
      channel,
      environment: { RELEASE_TEST: 'present' },
      commandRunner: async (execution) => executions.push(execution),
      releaseConfigFactory: releaseConfigFor,
      writeOutput: () => {},
    });

    assert.deepEqual(result, { outcome: 'published', channel });
    assert.deepEqual(
      executions.map(({ command, arguments: arguments_, stage }) => ({
        command,
        arguments: arguments_,
        stage,
      })),
      [
        { command: 'npm', arguments: ['ci'], stage: 'preparation' },
        { command: 'npm', arguments: ['run', 'build'], stage: 'preparation' },
        {
          command: 'npm',
          arguments: ['run', 'validate:hacs-release'],
          stage: 'artifact-verification',
        },
        { command: 'npx', arguments: ['semantic-release'], stage: 'publishing' },
      ]
    );
    assert.deepEqual(executions.at(-1).environment, {
      RELEASE_TEST: 'present',
      GITHUB_REF_NAME: branch,
    });
  });
}

test('verify rejects a prerelease plan that would commit stable-only artifacts', async () => {
  await assert.rejects(
    runPublishing({
      mode: 'verify',
      commandRunner: async () => {},
      releaseConfigFactory: (branch) =>
        releaseConfigFor(branch, { includePrereleaseVersionedAssets: branch === 'dev' }),
      writeOutput: () => assert.fail('failed verification must not report verified'),
    }),
    /Publishing artifact-verification failed: package\.json must not be committed on prerelease/
  );
});

for (const [failedStage, diagnostic] of [
  ['preparation', 'npm ERR! lockfile is not installable'],
  ['artifact-verification', 'Missing required lazy chunk: dist/growspace-heatmap-3d-*.js'],
]) {
  test(`verify reports the ${failedStage} stage and preserves command diagnostics`, async () => {
    const executions = [];

    await assert.rejects(
      runPublishing({
        mode: 'verify',
        commandRunner: async (execution) => {
          executions.push(execution);
          if (execution.stage === failedStage) throw new Error(diagnostic);
        },
        writeOutput: () => assert.fail('failed verification must not report verified'),
      }),
      new RegExp(`Publishing ${failedStage} failed: .*${diagnostic.replaceAll('*', '\\*')}`)
    );

    assert.equal(executions.at(-1).stage, failedStage);
    assert.ok(
      executions.every(({ command }) => command !== 'npx'),
      'verification never invokes semantic-release'
    );
  });
}
