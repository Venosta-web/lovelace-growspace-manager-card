import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  assertChunksBindToLoadedEntry,
  assertSelfContainedEntry,
  declaredCardTypes,
  staticDependencies,
} from './entry-bundle-shape.mjs';

const facade = "export { ew as GrowspaceManagerCard } from './growspace-index-VO19Dq7J.js';\n";

const selfContained = [
  "const load = () => import('./growspace-heatmap-3d-BAq03O_e.js');",
  "window.customCards.push({ type: 'growspace-manager-card' }, { type: 'growspace-grid-card' });",
  'export { load };',
].join('\n');

const entrySource = [
  'window.customCards.push(',
  "  { type: 'growspace-manager-card', name: 'Growspace Manager' },",
  "  { type: 'growspace-grid-card', name: 'Growspace Grid' }",
  ');',
].join('\n');

test('the shipped source entry declares every card type it registers', async () => {
  const types = declaredCardTypes(await readFile('src/index.ts', 'utf8'));
  assert.ok(types.includes('growspace-manager-card'));
  assert.equal(new Set(types).size, types.length);
});

test('a source entry that registers nothing is a parse failure, not a pass', () => {
  assert.throws(() => declaredCardTypes('export const nothing = true;\n'), /No window.customCards/);
});

test('dynamic imports are not static dependencies', () => {
  assert.deepEqual(staticDependencies(selfContained), []);
  assert.deepEqual(staticDependencies(facade), ['./growspace-index-VO19Dq7J.js']);
});

test('a re-export facade fails the release', () => {
  assert.throws(
    () =>
      assertSelfContainedEntry({
        entryBundle: facade,
        entrySource,
        entryPath: 'dist/growspace-manager-card.js',
      }),
    /re-export facade/
  );
});

test('an entry whose registration moved into a chunk fails the release', () => {
  assert.throws(
    () =>
      assertSelfContainedEntry({
        entryBundle: "window.customCards.push({ type: 'growspace-manager-card' });",
        entrySource,
        entryPath: 'dist/growspace-manager-card.js',
      }),
    /does not register growspace-grid-card/
  );
});

test('an entry carrying the eager path passes', () => {
  assertSelfContainedEntry({
    entryBundle: selfContained,
    entrySource,
    entryPath: 'dist/growspace-manager-card.js',
  });
});

test('a chunk that statically imports the entry fails the release', () => {
  assert.throws(
    () =>
      assertChunksBindToLoadedEntry({
        chunks: [{ fileName: 'dist/growspace-heatmap-3d-x.js', source: facade }],
        entryFileName: 'growspace-index-VO19Dq7J.js',
      }),
    /statically imports/
  );
});

test('a chunk that binds to the loaded entry passes', () => {
  assertChunksBindToLoadedEntry({
    chunks: [
      {
        fileName: 'dist/growspace-heatmap-3d-x.js',
        source: 'const { a } = await import(window.__growspaceEntryUrl);\n',
      },
    ],
    entryFileName: 'growspace-manager-card.js',
  });
});
