import assert from 'node:assert/strict';
import test from 'node:test';

import { runPublishing } from './publishing.mjs';

const CHANNELS = [
  {
    channel: 'stable',
    branch: 'main',
    version: '1.3.0',
    gitAssets: ['package.json', 'CHANGELOG.md', 'dist/*.js'],
  },
  {
    channel: 'prerelease',
    branch: 'dev',
    version: '1.3.0-next.1',
    gitAssets: ['dist/*.js'],
  },
];

const SUCCESSFUL_PUBLISHING_STAGES = [
  'command:npm ci',
  'command:npm run build',
  'command:npm run validate:hacs-release',
];

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

function pluginOptions(releaseConfig, name) {
  return releaseConfig.plugins.find((plugin) => Array.isArray(plugin) && plugin[0] === name)[1];
}

function createMockAdapters({
  release = { nextRelease: { version: '1.3.0' } },
  cleanupCommitted = true,
  failureStage,
} = {}) {
  const calls = {
    events: [],
    commands: [],
    semanticRelease: [],
    cleanupCommits: [],
    cleanupPushes: [],
    output: '',
  };
  const failure = Object.assign(new Error(`${failureStage} adapter diagnostic`), { status: 17 });

  return {
    calls,
    commandRunner: async (execution) => {
      calls.commands.push(execution);
      calls.events.push(`command:${execution.command} ${execution.arguments.join(' ')}`);
      if (execution.stage === failureStage) throw failure;
    },
    semanticReleaseAdapter: {
      publish: async (options) => {
        calls.semanticRelease.push(options);
        calls.events.push(`semantic-release:${options.branch}`);
        if (failureStage === 'publishing') throw failure;
        return release;
      },
    },
    gitAdapter: {
      commitBundleCleanup: async (options) => {
        calls.cleanupCommits.push(options);
        calls.events.push('cleanup-commit');
        if (failureStage === 'cleanup-commit') throw failure;
        return cleanupCommitted;
      },
      pushCleanup: async (options) => {
        calls.cleanupPushes.push(options);
        calls.events.push(`cleanup-push:${options.branch}`);
        if (failureStage === 'cleanup-push') throw failure;
      },
    },
    writeOutput: (message) => (calls.output += message),
  };
}

function publishingOptions(mockAdapters) {
  return {
    commandRunner: mockAdapters.commandRunner,
    semanticReleaseAdapter: mockAdapters.semanticReleaseAdapter,
    gitAdapter: mockAdapters.gitAdapter,
    writeOutput: mockAdapters.writeOutput,
  };
}

test('verify prepares once and verifies both channel plans without publishing or Git mutation', async () => {
  const plannedBranches = [];
  const mockAdapters = createMockAdapters();

  const result = await runPublishing({
    mode: 'verify',
    ...publishingOptions(mockAdapters),
    releaseConfigFactory: (branch) => {
      plannedBranches.push(branch);
      return releaseConfigFor(branch);
    },
  });

  assert.deepEqual(result, {
    outcome: 'verified',
    channels: ['stable', 'prerelease'],
  });
  assert.deepEqual(mockAdapters.calls.events, SUCCESSFUL_PUBLISHING_STAGES);
  assert.deepEqual(plannedBranches, ['main', 'dev']);
  assert.equal(mockAdapters.calls.semanticRelease.length, 0);
  assert.equal(mockAdapters.calls.cleanupCommits.length, 0);
  assert.equal(mockAdapters.calls.cleanupPushes.length, 0);
  assert.equal(mockAdapters.calls.output, 'verified\n');
});

test('verify accepts the repository stable and prerelease artifact plans', async () => {
  const mockAdapters = createMockAdapters();

  const result = await runPublishing({
    mode: 'verify',
    ...publishingOptions(mockAdapters),
  });

  assert.deepEqual(result, {
    outcome: 'verified',
    channels: ['stable', 'prerelease'],
  });
});

for (const { channel, branch, version, gitAssets } of CHANNELS) {
  test(`publish ${channel} owns channel assets and orders release before cleanup`, async () => {
    const mockAdapters = createMockAdapters({ release: { nextRelease: { version } } });

    const result = await runPublishing({
      mode: 'publish',
      channel,
      environment: { RELEASE_TEST: 'present' },
      ...publishingOptions(mockAdapters),
      releaseConfigFactory: releaseConfigFor,
    });

    assert.deepEqual(result, { outcome: 'published', channel });
    assert.deepEqual(mockAdapters.calls.events, [
      ...SUCCESSFUL_PUBLISHING_STAGES,
      `semantic-release:${branch}`,
      'cleanup-commit',
      `cleanup-push:${branch}`,
    ]);

    const releaseCall = mockAdapters.calls.semanticRelease[0];
    assert.equal(releaseCall.branch, branch);
    assert.deepEqual(releaseCall.environment, {
      RELEASE_TEST: 'present',
      GITHUB_REF_NAME: branch,
    });
    assert.deepEqual(
      pluginOptions(releaseCall.releaseConfig, '@semantic-release/git').assets,
      gitAssets
    );
    assert.deepEqual(pluginOptions(releaseCall.releaseConfig, '@semantic-release/github').assets, [
      { path: 'dist/*.js' },
    ]);

    assert.equal(
      mockAdapters.calls.cleanupCommits[0].commitMessage,
      'chore(release): untrack built bundle'
    );
    assert.doesNotMatch(mockAdapters.calls.cleanupCommits[0].commitMessage, /skip ci/i);
    assert.equal(mockAdapters.calls.cleanupPushes[0].branch, branch);
    assert.equal(mockAdapters.calls.output, 'published\n');
  });

  test(`publish ${channel} finishes pending cleanup after semantic-release reports no release`, async () => {
    const mockAdapters = createMockAdapters({ release: false });

    const result = await runPublishing({
      mode: 'publish',
      channel,
      environment: { GITHUB_REF_NAME: branch },
      ...publishingOptions(mockAdapters),
      releaseConfigFactory: releaseConfigFor,
    });

    assert.deepEqual(result, { outcome: 'no-release', channel });
    assert.deepEqual(mockAdapters.calls.events, [
      ...SUCCESSFUL_PUBLISHING_STAGES,
      `semantic-release:${branch}`,
      'cleanup-commit',
      `cleanup-push:${branch}`,
    ]);
    assert.equal(mockAdapters.calls.output, 'no-release\n');
  });

  test(`cleanup-triggered ${channel} retry is an idempotent no-release`, async () => {
    const mockAdapters = createMockAdapters({ release: false, cleanupCommitted: false });

    const result = await runPublishing({
      mode: 'publish',
      channel,
      environment: { GITHUB_REF_NAME: branch },
      ...publishingOptions(mockAdapters),
      releaseConfigFactory: releaseConfigFor,
    });

    assert.deepEqual(result, { outcome: 'no-release', channel });
    assert.deepEqual(mockAdapters.calls.events, [
      ...SUCCESSFUL_PUBLISHING_STAGES,
      `semantic-release:${branch}`,
      'cleanup-commit',
    ]);
    assert.equal(mockAdapters.calls.cleanupCommits.length, 1);
    assert.equal(mockAdapters.calls.cleanupPushes.length, 0);
    assert.equal(mockAdapters.calls.output, 'no-release\n');
  });

  for (const failedStage of [
    'preparation',
    'artifact-verification',
    'publishing',
    'cleanup-commit',
    'cleanup-push',
  ]) {
    test(`publish ${channel} preserves ${failedStage} adapter diagnostics`, async () => {
      const mockAdapters = createMockAdapters({ failureStage: failedStage });

      await assert.rejects(
        runPublishing({
          mode: 'publish',
          channel,
          environment: { GITHUB_REF_NAME: branch },
          ...publishingOptions(mockAdapters),
          releaseConfigFactory: releaseConfigFor,
        }),
        (error) => {
          assert.equal(error.status, 17);
          assert.equal(
            error.message,
            `Publishing ${failedStage} failed: ${failedStage} adapter diagnostic`
          );
          return true;
        }
      );

      assert.equal(mockAdapters.calls.output, '');
    });
  }
}

test('publish rejects a branch that does not match the selected channel before adapters run', async () => {
  const mockAdapters = createMockAdapters();

  await assert.rejects(
    runPublishing({
      mode: 'publish',
      channel: 'prerelease',
      environment: { GITHUB_REF_NAME: 'feature/not-dev' },
      ...publishingOptions(mockAdapters),
    }),
    /Unsupported publishing branch: feature\/not-dev; prerelease publishes from dev/
  );

  assert.deepEqual(mockAdapters.calls.events, []);
});

test('verify rejects a prerelease plan that would commit stable-only artifacts', async () => {
  const mockAdapters = createMockAdapters();

  await assert.rejects(
    runPublishing({
      mode: 'verify',
      ...publishingOptions(mockAdapters),
      releaseConfigFactory: (branch) =>
        releaseConfigFor(branch, { includePrereleaseVersionedAssets: branch === 'dev' }),
    }),
    /Publishing artifact-verification failed: package\.json must not be committed on prerelease/
  );

  assert.equal(mockAdapters.calls.output, '');
});

for (const failedStage of ['preparation', 'artifact-verification']) {
  test(`verify preserves ${failedStage} adapter diagnostics`, async () => {
    const mockAdapters = createMockAdapters({ failureStage: failedStage });

    await assert.rejects(
      runPublishing({
        mode: 'verify',
        ...publishingOptions(mockAdapters),
      }),
      (error) => {
        assert.equal(error.status, 17);
        assert.equal(
          error.message,
          `Publishing ${failedStage} failed: ${failedStage} adapter diagnostic`
        );
        return true;
      }
    );

    assert.equal(mockAdapters.calls.semanticRelease.length, 0);
    assert.equal(mockAdapters.calls.cleanupCommits.length, 0);
    assert.equal(mockAdapters.calls.cleanupPushes.length, 0);
    assert.equal(mockAdapters.calls.output, '');
  });
}
