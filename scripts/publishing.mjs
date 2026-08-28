import { spawn } from 'node:child_process';

import { createReleaseConfig } from '../release.config.js';

const RELEASE_BRANCHES = {
  stable: 'main',
  prerelease: 'dev',
};
const RELEASE_CHANNELS = Object.keys(RELEASE_BRANCHES);
const BUNDLE_PATTERN = 'dist/*.js';
const VERSIONED_ASSETS = ['package.json', 'CHANGELOG.md'];
const CLEANUP_COMMIT_MESSAGE = 'chore(release): untrack built bundle';
const GIT_AUTHOR = 'github-actions[bot]';
const GIT_AUTHOR_EMAIL = 'github-actions[bot]@users.noreply.github.com';

class CommandFailure extends Error {
  constructor(message, status = 1) {
    super(message);
    this.status = status;
  }
}

function commandName(command, arguments_) {
  return [command, ...arguments_].join(' ');
}

function pluginOptions(releaseConfig, pluginName) {
  const plugin = releaseConfig.plugins.find(
    (candidate) => Array.isArray(candidate) && candidate[0] === pluginName
  );
  if (!plugin) throw new Error(`Missing ${pluginName} configuration`);
  return plugin[1];
}

function verifyArtifactPlan(channel, releaseConfigFactory) {
  const releaseConfig = releaseConfigFactory(RELEASE_BRANCHES[channel]);
  const gitAssets = pluginOptions(releaseConfig, '@semantic-release/git').assets;
  if (!gitAssets.includes(BUNDLE_PATTERN)) {
    throw new Error(`${BUNDLE_PATTERN} must be committed on ${channel}`);
  }
  const githubAssets = pluginOptions(releaseConfig, '@semantic-release/github').assets;
  if (!githubAssets.some((asset) => asset.path === BUNDLE_PATTERN)) {
    throw new Error(`${BUNDLE_PATTERN} must be uploaded on ${channel}`);
  }

  for (const versionedAsset of VERSIONED_ASSETS) {
    if (channel === 'stable' && !gitAssets.includes(versionedAsset)) {
      throw new Error(`${versionedAsset} must be committed on stable`);
    }
    if (channel === 'prerelease' && gitAssets.includes(versionedAsset)) {
      throw new Error(`${versionedAsset} must not be committed on prerelease`);
    }
  }

  return releaseConfig;
}

function publishingFailure(stage, error) {
  const failure = new Error(`Publishing ${stage} failed: ${error.message}`);
  failure.status = error.status ?? 1;
  return failure;
}

function executeCommand({ command, arguments: arguments_, rootDirectory, environment }) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, arguments_, {
      cwd: rootDirectory,
      env: environment,
      stdio: 'inherit',
    });

    child.on('error', (error) => {
      reject(
        new CommandFailure(`Could not start ${commandName(command, arguments_)}: ${error.message}`)
      );
    });
    child.on('close', (status, signal) => {
      if (status === 0) {
        resolve();
        return;
      }
      const detail = status === null ? `received ${signal}` : `exited with status ${status}`;
      reject(new CommandFailure(`${commandName(command, arguments_)} ${detail}`, status ?? 1));
    });
  });
}

function captureCommand({ command, arguments: arguments_, rootDirectory, environment }) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, arguments_, {
      cwd: rootDirectory,
      env: environment,
      stdio: ['ignore', 'pipe', 'inherit'],
    });
    let output = '';
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk) => (output += chunk));
    child.on('error', (error) => {
      reject(
        new CommandFailure(`Could not start ${commandName(command, arguments_)}: ${error.message}`)
      );
    });
    child.on('close', (status, signal) => {
      if (status === 0) {
        resolve(output);
        return;
      }
      const detail = status === null ? `received ${signal}` : `exited with status ${status}`;
      reject(new CommandFailure(`${commandName(command, arguments_)} ${detail}`, status ?? 1));
    });
  });
}

const productionSemanticReleaseAdapter = {
  async publish({ releaseConfig, rootDirectory, environment }) {
    const { default: semanticRelease } = await import('semantic-release');
    return semanticRelease(releaseConfig, { cwd: rootDirectory, env: environment });
  },
};

const productionGitAdapter = {
  async commitBundleCleanup({ commitMessage, rootDirectory, environment }) {
    const trackedBundles = await captureCommand({
      command: 'git',
      arguments: ['ls-files', '-z', '--', BUNDLE_PATTERN],
      rootDirectory,
      environment,
    });
    if (trackedBundles.length === 0) return false;

    await executeCommand({
      command: 'git',
      arguments: ['rm', '--cached', '--', BUNDLE_PATTERN],
      rootDirectory,
      environment,
    });
    await executeCommand({
      command: 'git',
      arguments: [
        '-c',
        `user.name=${GIT_AUTHOR}`,
        '-c',
        `user.email=${GIT_AUTHOR_EMAIL}`,
        'commit',
        '-m',
        commitMessage,
      ],
      rootDirectory,
      environment,
    });
    return true;
  },

  pushCleanup({ branch, rootDirectory, environment }) {
    return executeCommand({
      command: 'git',
      arguments: ['push', 'origin', `HEAD:${branch}`],
      rootDirectory,
      environment,
    });
  },
};

export async function runPublishing({
  mode,
  channel,
  rootDirectory = process.cwd(),
  environment = process.env,
  commandRunner = executeCommand,
  releaseConfigFactory = createReleaseConfig,
  semanticReleaseAdapter = productionSemanticReleaseAdapter,
  gitAdapter = productionGitAdapter,
  writeOutput = (message) => process.stdout.write(message),
}) {
  if (!['verify', 'publish'].includes(mode)) {
    throw new Error(`Unsupported publishing mode: ${mode}`);
  }
  if (mode === 'publish' && !RELEASE_CHANNELS.includes(channel)) {
    throw new Error(`Unsupported release channel: ${channel}`);
  }
  if (
    mode === 'publish' &&
    environment.GITHUB_REF_NAME !== undefined &&
    environment.GITHUB_REF_NAME !== RELEASE_BRANCHES[channel]
  ) {
    throw new Error(
      `Unsupported publishing branch: ${environment.GITHUB_REF_NAME}; ${channel} publishes from ${RELEASE_BRANCHES[channel]}`
    );
  }

  const run = async (execution) => {
    try {
      await commandRunner(execution);
    } catch (error) {
      throw publishingFailure(execution.stage, error);
    }
  };

  for (const arguments_ of [['ci'], ['run', 'build']]) {
    await run({
      command: 'npm',
      arguments: arguments_,
      stage: 'preparation',
      rootDirectory,
      environment,
    });
  }

  const channels = mode === 'verify' ? RELEASE_CHANNELS : [channel];
  await run({
    command: 'npm',
    arguments: ['run', 'validate:hacs-release'],
    stage: 'artifact-verification',
    rootDirectory,
    environment,
  });
  const releasePlans = new Map();
  try {
    for (const releaseChannel of channels) {
      releasePlans.set(releaseChannel, verifyArtifactPlan(releaseChannel, releaseConfigFactory));
    }
  } catch (error) {
    throw publishingFailure('artifact-verification', error);
  }

  if (mode === 'verify') {
    writeOutput('verified\n');
    return { outcome: 'verified', channels };
  }

  const branch = RELEASE_BRANCHES[channel];
  const releaseEnvironment = { ...environment, GITHUB_REF_NAME: branch };
  let release;
  try {
    release = await semanticReleaseAdapter.publish({
      branch,
      releaseConfig: releasePlans.get(channel),
      rootDirectory,
      environment: releaseEnvironment,
    });
  } catch (error) {
    throw publishingFailure('publishing', error);
  }

  let cleanupCommitted;
  try {
    cleanupCommitted = await gitAdapter.commitBundleCleanup({
      commitMessage: CLEANUP_COMMIT_MESSAGE,
      rootDirectory,
      environment: releaseEnvironment,
    });
  } catch (error) {
    throw publishingFailure('cleanup-commit', error);
  }

  if (cleanupCommitted) {
    try {
      await gitAdapter.pushCleanup({ branch, rootDirectory, environment: releaseEnvironment });
    } catch (error) {
      throw publishingFailure('cleanup-push', error);
    }
  }

  const outcome = release ? 'published' : 'no-release';
  writeOutput(`${outcome}\n`);
  return { outcome, channel };
}
