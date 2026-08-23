import { createHash, randomBytes } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const BUILD_INPUT_FILES = [
  'package-lock.json',
  'package.json',
  'rollup.config.js',
  'scripts/bare-module-specifiers.mjs',
  'scripts/e2e-build-state.mjs',
  'tsconfig.json',
];

const BUILD_MARKER_PATTERN =
  /\/\*! growspace-e2e-build source=([a-f0-9]{64}) id=([a-f0-9]{32}) \*\//;

function isRuntimeSource(relativePath) {
  const normalized = relativePath.split(path.sep).join('/');
  return !normalized.includes('/__screenshots__/') && !/\.(?:test|spec)\.ts$/.test(normalized);
}

async function runtimeSourceFiles(rootDirectory) {
  const sourceDirectory = path.join(rootDirectory, 'src');
  const files = [];

  async function visit(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await visit(absolutePath);
      } else if (entry.isFile()) {
        const relativePath = path.relative(rootDirectory, absolutePath);
        if (isRuntimeSource(relativePath)) {
          files.push(relativePath);
        }
      }
    }
  }

  await visit(sourceDirectory);
  return files;
}

export async function computeSourceFingerprint(rootDirectory = process.cwd()) {
  const inputFiles = [...BUILD_INPUT_FILES, ...(await runtimeSourceFiles(rootDirectory))].sort();
  const hash = createHash('sha256');

  for (const relativePath of inputFiles) {
    hash.update(relativePath.split(path.sep).join('/'));
    hash.update('\0');
    hash.update(await readFile(path.join(rootDirectory, relativePath)));
    hash.update('\0');
  }

  return hash.digest('hex');
}

export function createBuildBanner(sourceFingerprint) {
  return `/*! growspace-e2e-build source=${sourceFingerprint} id=${randomBytes(16).toString('hex')} */`;
}

export function parseBuildMarker(bundleText) {
  const match = bundleText.match(BUILD_MARKER_PATTERN);
  return match ? { sourceFingerprint: match[1], buildId: match[2] } : undefined;
}

export function assertLocalBundle(
  bundleText,
  expectedSourceFingerprint,
  bundlePath = 'dist/growspace-manager-card.js'
) {
  const marker = parseBuildMarker(bundleText);
  if (!marker) {
    throw new Error(
      `E2E bundle preflight failed: ${bundlePath} has no source-state marker and is stale or was not produced by the current build tooling.\n` +
        'Run `npm run build`, then restart Home Assistant because the build replaces the dist/ directory.'
    );
  }
  if (marker.sourceFingerprint !== expectedSourceFingerprint) {
    throw new Error(
      `E2E bundle preflight failed: ${bundlePath} is stale for the current source tree.\n` +
        `  current source: ${expectedSourceFingerprint}\n` +
        `  local bundle:  ${marker.sourceFingerprint}\n` +
        'Run `npm run build`, then restart Home Assistant because the build replaces the dist/ directory.'
    );
  }
  return marker;
}

export function assertServedBundle(bundleText, localMarker, servedUrl) {
  const marker = parseBuildMarker(bundleText);
  if (!marker) {
    throw new Error(
      `E2E bundle preflight failed: Home Assistant is serving an unmarked, stale bundle from ${servedUrl}.\n` +
        'Restart Home Assistant so Docker remounts the current dist/ directory.'
    );
  }
  if (
    marker.sourceFingerprint !== localMarker.sourceFingerprint ||
    marker.buildId !== localMarker.buildId
  ) {
    throw new Error(
      `E2E bundle preflight failed: Home Assistant is not serving the current local build from ${servedUrl}.\n` +
        `  local build:  ${localMarker.buildId} (source ${localMarker.sourceFingerprint})\n` +
        `  served build: ${marker.buildId} (source ${marker.sourceFingerprint})\n` +
        'The build replaces dist/ and Docker can keep serving the deleted directory by inode. Restart Home Assistant to remount it.'
    );
  }
  return marker;
}
