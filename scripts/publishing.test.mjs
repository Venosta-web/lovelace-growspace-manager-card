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
      semanticReleaseAdapter: {
        publish: async ({ environment }) => {
          executions.push({
            command: 'semantic-release',
            arguments: [],
            stage: 'publishing',
            environment,
          });
          return { nextRelease: { version: '1.3.0' } };
        },
      },
      gitAdapter: {
        commitBundleCleanup: async () => false,
        pushCleanup: async () => assert.fail('completed cleanup must not be pushed'),
      },
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
        { command: 'semantic-release', arguments: [], stage: 'publishing' },
      ]
    );
    assert.deepEqual(executions.at(-1).environment, {
      RELEASE_TEST: 'present',
      GITHUB_REF_NAME: branch,
    });
  });
}

test('publish rejects a branch that does not match the selected channel', async () => {
  await assert.rejects(
    runPublishing({
      mode: 'publish',
      channel: 'prerelease',
      environment: { GITHUB_REF_NAME: 'feature/not-dev' },
      commandRunner: async () => assert.fail('unsupported branches must fail before preparation'),
      semanticReleaseAdapter: {
        publish: async () => assert.fail('unsupported branches must not publish'),
      },
      gitAdapter: {
        commitBundleCleanup: async () => assert.fail('unsupported branches must not clean up'),
        pushCleanup: async () => assert.fail('unsupported branches must not push'),
      },
    }),
    /Unsupported publishing branch: feature\/not-dev; prerelease publishes from dev/
  );
});

test('publish prerelease reports publication after committing and pushing bundle cleanup', async () => {
  const events = [];
  let output = '';

  const result = await runPublishing({
    mode: 'publish',
    channel: 'prerelease',
    environment: { GITHUB_REF_NAME: 'dev' },
    commandRunner: async ({ stage }) => events.push(stage),
    releaseConfigFactory: releaseConfigFor,
    semanticReleaseAdapter: {
      publish: async ({ branch }) => {
        events.push(`semantic-release:${branch}`);
        return { nextRelease: { version: '1.3.0-next.1' } };
      },
    },
    gitAdapter: {
      commitBundleCleanup: async ({ commitMessage }) => {
        assert.equal(commitMessage, 'chore(release): untrack built bundle');
        assert.doesNotMatch(commitMessage, /skip ci/i);
        events.push('cleanup-commit');
        return true;
      },
      pushCleanup: async ({ branch }) => events.push(`cleanup-push:${branch}`),
    },
    writeOutput: (message) => (output += message),
  });

  assert.deepEqual(result, { outcome: 'published', channel: 'prerelease' });
  assert.deepEqual(events, [
    'preparation',
    'preparation',
    'artifact-verification',
    'semantic-release:dev',
    'cleanup-commit',
    'cleanup-push:dev',
  ]);
  assert.equal(output, 'published\n');
});

test('publish prerelease reports no-release after safely pushing pending bundle cleanup', async () => {
  const events = [];
  let output = '';

  const result = await runPublishing({
    mode: 'publish',
    channel: 'prerelease',
    environment: { GITHUB_REF_NAME: 'dev' },
    commandRunner: async () => {},
    releaseConfigFactory: releaseConfigFor,
    semanticReleaseAdapter: {
      publish: async () => {
        events.push('semantic-release:no-release');
        return false;
      },
    },
    gitAdapter: {
      commitBundleCleanup: async () => {
        events.push('cleanup-commit');
        return true;
      },
      pushCleanup: async ({ branch }) => events.push(`cleanup-push:${branch}`),
    },
    writeOutput: (message) => (output += message),
  });

  assert.deepEqual(result, { outcome: 'no-release', channel: 'prerelease' });
  assert.deepEqual(events, ['semantic-release:no-release', 'cleanup-commit', 'cleanup-push:dev']);
  assert.equal(output, 'no-release\n');
});

test('a cleanup-triggered prerelease invocation completes without another commit', async () => {
  let cleanupChecks = 0;

  const result = await runPublishing({
    mode: 'publish',
    channel: 'prerelease',
    environment: { GITHUB_REF_NAME: 'dev' },
    commandRunner: async () => {},
    releaseConfigFactory: releaseConfigFor,
    semanticReleaseAdapter: { publish: async () => false },
    gitAdapter: {
      commitBundleCleanup: async () => {
        cleanupChecks += 1;
        return false;
      },
      pushCleanup: async () => assert.fail('completed cleanup must not be pushed'),
    },
    writeOutput: () => {},
  });

  assert.deepEqual(result, { outcome: 'no-release', channel: 'prerelease' });
  assert.equal(cleanupChecks, 1);
});

for (const [failedStage, diagnostic] of [
  ['artifact-verification', 'Missing required lazy chunk: dist/growspace-analytics-*.js'],
  ['publishing', 'semantic-release could not upload growspace-manager-card.js'],
  ['cleanup-commit', 'git commit rejected the cleanup tree'],
  ['cleanup-push', 'remote rejected HEAD:dev'],
]) {
  test(`publish prerelease reports the ${failedStage} stage with adapter diagnostics`, async () => {
    const adapterFailure = new Error(diagnostic);
    adapterFailure.status = 17;

    await assert.rejects(
      runPublishing({
        mode: 'publish',
        channel: 'prerelease',
        environment: { GITHUB_REF_NAME: 'dev' },
        commandRunner: async ({ stage }) => {
          if (stage === failedStage) throw adapterFailure;
        },
        releaseConfigFactory: releaseConfigFor,
        semanticReleaseAdapter: {
          publish: async () => {
            if (failedStage === 'publishing') throw adapterFailure;
            return { nextRelease: { version: '1.3.0-next.1' } };
          },
        },
        gitAdapter: {
          commitBundleCleanup: async () => {
            if (failedStage === 'cleanup-commit') throw adapterFailure;
            return true;
          },
          pushCleanup: async () => {
            if (failedStage === 'cleanup-push') throw adapterFailure;
          },
        },
        writeOutput: () => assert.fail('failed publication must not report an outcome'),
      }),
      (error) => {
        assert.equal(error.status, 17);
        assert.match(error.message, new RegExp(`Publishing ${failedStage} failed:`));
        assert.match(error.message, new RegExp(diagnostic.replaceAll('*', '\\*')));
        return true;
      }
    );
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
