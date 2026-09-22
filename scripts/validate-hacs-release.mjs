import { execFile } from 'node:child_process';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

import {
  assertChunksBindToLoadedEntry,
  assertOnDemandChunksAreNotImported,
  assertSelfContainedEntry,
  declaredCardTypes,
  declaredLazyChunkNames,
  declaredOnDemandOnlyChunkNames,
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
const registrySource = await readFile('src/lib/lazy-chunk.ts', 'utf8');

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
    ...new Set([
      'dist/growspace-heatmap-3d-',
      'dist/growspace-growspace-dialog-host.',
      'dist/growspace-config-dialog-',
      ...cardTypes.map((type) => `dist/growspace-${type}-editor-`),
      // Each chunk the card offers to name when it fails to load must be one
      // the build actually emits under that name.
      ...declaredLazyChunkNames(registrySource).map((name) => `dist/growspace-${name}-`),
    ]),
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

  const emitted = await Promise.all(
    bundlePaths.map(async (emittedPath) => ({
      fileName: emittedPath,
      source: await readFile(emittedPath, 'utf8'),
    }))
  );

  assertChunksBindToLoadedEntry({
    chunks: emitted.filter((chunk) => chunk.fileName !== bundlePath),
    entryFileName: path.basename(bundlePath),
  });

  // A chunk that declares itself on-demand-only is one a dashboard without the
  // feature must never download, so nothing may reach it except an `import()`.
  assertOnDemandChunksAreNotImported({
    chunks: emitted,
    onDemandFileNames: declaredOnDemandOnlyChunkNames(registrySource).map((name) => {
      const prefix = `dist/growspace-${name}-`;
      const matches = bundlePaths.filter((emittedPath) => emittedPath.startsWith(prefix));
      if (matches.length !== 1) {
        throw new Error(
          `${prefix}*.js matches ${matches.length} emitted files; ` +
            'an on-demand-only chunk must resolve to exactly one'
        );
      }
      return path.basename(matches[0]);
    }),
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
