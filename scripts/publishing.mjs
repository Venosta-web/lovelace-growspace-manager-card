import { spawn } from 'node:child_process';

import { createReleaseConfig } from '../release.config.js';

const RELEASE_BRANCHES = {
  stable: 'main',
  prerelease: 'dev',
};
const RELEASE_CHANNELS = Object.keys(RELEASE_BRANCHES);
const BUNDLE_PATTERN = 'dist/*.js';
const VERSIONED_ASSETS = ['package.json', 'CHANGELOG.md'];

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

export async function runPublishing({
  mode,
  channel,
  rootDirectory = process.cwd(),
  environment = process.env,
  commandRunner = executeCommand,
  releaseConfigFactory = createReleaseConfig,
  writeOutput = (message) => process.stdout.write(message),
}) {
  if (!['verify', 'publish'].includes(mode)) {
    throw new Error(`Unsupported publishing mode: ${mode}`);
  }
  if (mode === 'publish' && !RELEASE_CHANNELS.includes(channel)) {
    throw new Error(`Unsupported release channel: ${channel}`);
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
  try {
    for (const releaseChannel of channels) {
      verifyArtifactPlan(releaseChannel, releaseConfigFactory);
    }
  } catch (error) {
    throw publishingFailure('artifact-verification', error);
  }

  if (mode === 'verify') {
    writeOutput('verified\n');
    return { outcome: 'verified', channels };
  }

  await run({
    command: 'npx',
    arguments: ['semantic-release'],
    stage: 'publishing',
    rootDirectory,
    environment: { ...environment, GITHUB_REF_NAME: RELEASE_BRANCHES[channel] },
  });
  return { outcome: 'published', channel };
}
