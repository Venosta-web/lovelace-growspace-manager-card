import { execFile } from 'node:child_process';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

import {
  assertChunksBindToLoadedEntry,
  assertSelfContainedEntry,
  declaredCardTypes,
} from './entry-bundle-shape.mjs';

const execFileAsync = promisify(execFile);

const bundlePath = 'dist/growspace-manager-card.js';
const hacsConfig = JSON.parse(await readFile('hacs.json', 'utf8'));

if (path.basename(bundlePath) !== hacsConfig.filename) {
  throw new Error(
    `HACS filename ${hacsConfig.filename} does not match release bundle ${bundlePath}`
  );
}

const entrySource = await readFile('src/index.ts', 'utf8');
const cardTypes = declaredCardTypes(entrySource);

if (!process.argv.includes('--config-only')) {
  const bundlePaths = (await readdir('dist'))
    .filter((file) => file.endsWith('.js'))
    .map((file) => `dist/${file}`);
  if (!bundlePaths.includes(bundlePath) || bundlePaths.length < 3) {
    throw new Error('The build must emit the entry bundle plus lazy 3D and secondary chunks');
  }
  // Everything the first render does not need stays behind a dynamic import, so
  // the entry the dashboard blocks on carries the render path and nothing else.
  const lazyChunkPrefixes = [
    'dist/growspace-heatmap-3d-',
    'dist/growspace-growspace-dialog-host.',
    'dist/growspace-config-dialog-',
    ...cardTypes.map((type) => `dist/growspace-${type}-editor-`),
  ];
  for (const prefix of lazyChunkPrefixes) {
    if (!bundlePaths.some((emittedPath) => emittedPath.startsWith(prefix))) {
      throw new Error(`Missing required lazy chunk: ${prefix}*.js`);
    }
  }

  assertSelfContainedEntry({
    entryBundle: await readFile(bundlePath, 'utf8'),
    entrySource,
    entryPath: bundlePath,
  });

  assertChunksBindToLoadedEntry({
    chunks: await Promise.all(
      bundlePaths
        .filter((emittedPath) => emittedPath !== bundlePath)
        .map(async (emittedPath) => ({
          fileName: emittedPath,
          source: await readFile(emittedPath, 'utf8'),
        }))
    ),
    entryFileName: path.basename(bundlePath),
  });

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
