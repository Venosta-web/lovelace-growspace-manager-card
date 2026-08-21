import { execFile } from 'node:child_process';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const bundlePath = 'dist/growspace-manager-card.js';
const bundlePattern = 'dist/*.js';
const releaseConfig = JSON.parse(await readFile('.releaserc.json', 'utf8'));
const releaseWorkflow = await readFile('.github/workflows/release.yml', 'utf8');
const hacsConfig = JSON.parse(await readFile('hacs.json', 'utf8'));

const cleanupCommit = releaseWorkflow.match(
  /commit -m (['"])([^'"\n]*untrack built bundle[^'"\n]*)\1/
)?.[2];
if (!cleanupCommit) {
  throw new Error('Release workflow must commit the built-bundle cleanup');
}
if (/\[(?:skip ci|ci skip|no ci|skip actions|actions skip)\]/i.test(cleanupCommit)) {
  throw new Error('Release cleanup commit must run required checks');
}

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
if (!gitAssets.includes(bundlePattern)) {
  throw new Error(
    `${bundlePattern} must be committed by semantic-release so HACS can install the entry and chunks`
  );
}

const githubAssets = pluginOptions('@semantic-release/github').assets;
if (!githubAssets.some((asset) => asset.path === bundlePattern)) {
  throw new Error(`${bundlePattern} must be uploaded as GitHub release assets`);
}

if (path.basename(bundlePath) !== hacsConfig.filename) {
  throw new Error(
    `HACS filename ${hacsConfig.filename} does not match release bundle ${bundlePath}`
  );
}

if (!process.argv.includes('--config-only')) {
  const bundlePaths = (await readdir('dist'))
    .filter((file) => file.endsWith('.js'))
    .map((file) => `dist/${file}`);
  if (!bundlePaths.includes(bundlePath) || bundlePaths.length < 3) {
    throw new Error('The build must emit the entry bundle plus lazy 3D and secondary chunks');
  }
  for (const prefix of ['dist/growspace-heatmap-3d-', 'dist/growspace-growspace-dialog-host.']) {
    if (!bundlePaths.some((emittedPath) => emittedPath.startsWith(prefix))) {
      throw new Error(`Missing required lazy chunk: ${prefix}*.js`);
    }
  }

  for (const emittedPath of bundlePaths) {
    const bundle = await stat(emittedPath);
    if (bundle.size === 0) throw new Error(`${emittedPath} is empty`);
  }

  const { stdout: releaseCandidates } = await execFileAsync('git', [
    'ls-files',
    '-m',
    '-o',
    '--',
    ...bundlePaths,
  ]);
  const candidatePaths = new Set(releaseCandidates.trim().split('\n'));
  for (const emittedPath of bundlePaths) {
    if (!candidatePaths.has(emittedPath)) {
      throw new Error(
        `${emittedPath} is not visible to @semantic-release/git as a release candidate`
      );
    }
  }
}
