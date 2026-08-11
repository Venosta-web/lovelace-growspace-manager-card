import { execFile } from 'node:child_process';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const bundlePath = 'dist/growspace-manager-card.js';
const releaseConfig = JSON.parse(await readFile('.releaserc.json', 'utf8'));
const hacsConfig = JSON.parse(await readFile('hacs.json', 'utf8'));

const pluginOptions = (pluginName) => {
  const plugin = releaseConfig.plugins.find(
    (candidate) => Array.isArray(candidate) && candidate[0] === pluginName
  );

  if (!plugin) {
    throw new Error(`Missing ${pluginName} configuration`);
  }

  return plugin[1];
};

const gitAssets = pluginOptions('@semantic-release/git').assets;
if (!gitAssets.includes(bundlePath)) {
  throw new Error(
    `${bundlePath} must be committed by semantic-release so HACS can install from the release tag`
  );
}

const githubAssets = pluginOptions('@semantic-release/github').assets;
if (!githubAssets.some((asset) => asset.path === bundlePath)) {
  throw new Error(`${bundlePath} must be uploaded as a GitHub release asset`);
}

if (path.basename(bundlePath) !== hacsConfig.filename) {
  throw new Error(
    `HACS filename ${hacsConfig.filename} does not match release bundle ${bundlePath}`
  );
}

if (!process.argv.includes('--config-only')) {
  const bundle = await stat(bundlePath);
  if (bundle.size === 0) {
    throw new Error(`${bundlePath} is empty`);
  }

  const { stdout: releaseCandidates } = await execFileAsync('git', [
    'ls-files',
    '-m',
    '-o',
    '--',
    bundlePath,
  ]);
  if (!releaseCandidates.split('\n').includes(bundlePath)) {
    throw new Error(`${bundlePath} is not visible to @semantic-release/git as a release candidate`);
  }
}
