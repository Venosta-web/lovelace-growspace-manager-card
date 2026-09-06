import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  assertChunksBindToLoadedEntry,
  assertOnDemandChunksAreNotImported,
  assertSelfContainedEntry,
  declaredCardTypes,
  declaredLazyChunkNames,
  declaredOnDemandOnlyChunkNames,
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

test('the lazy chunk registry declares names the build can emit', async () => {
  const names = declaredLazyChunkNames(await readFile('src/lib/lazy-chunk.ts', 'utf8'));
  assert.ok(names.includes('heatmap-3d'));
  assert.ok(names.includes('growspace-dialog-host.container'));
  assert.equal(new Set(names).size, names.length);
});

test('a registry with no chunk names fails the release', () => {
  assert.throws(() => declaredLazyChunkNames('export const LAZY_CHUNKS = {};\n'), /No LAZY_CHUNKS/);
});

const registry = [
  'export const LAZY_CHUNKS = {',
  '  configDialog: {',
  "    name: 'config-dialog',",
  "    feature: 'The growspace configuration dialog',",
  '  },',
  '  tcView: {',
  "    name: 'tc',",
  "    feature: 'The tissue culture view',",
  '    onDemandOnly: true,',
  '  },',
  '} as const satisfies Record<string, LazyChunk>;',
].join('\n');

const dialogHost = (imports) =>
  imports.map((file) => `import './${file}';`).join('\n') + '\nexport { host };\n';

test('the registry declares the tissue culture view on demand only', async () => {
  const names = declaredOnDemandOnlyChunkNames(await readFile('src/lib/lazy-chunk.ts', 'utf8'));
  assert.deepEqual(names, ['tc']);
});

test('an entry without the flag is not declared on demand only', () => {
  assert.deepEqual(declaredOnDemandOnlyChunkNames(registry), ['tc']);
});

test('a registry that declares nothing on demand only is legal', () => {
  assert.deepEqual(declaredOnDemandOnlyChunkNames('export const LAZY_CHUNKS = {};\n'), []);
});

test('a chunk that statically imports an on-demand-only chunk fails the release', () => {
  assert.throws(
    () =>
      assertOnDemandChunksAreNotImported({
        chunks: [
          {
            fileName: 'dist/growspace-growspace-dialog-host.container-DHBYBlgG.js',
            source: dialogHost(['growspace-config-dialog-N3Q3MwtR.js', 'growspace-tc-EFmqwtip.js']),
          },
          { fileName: 'dist/growspace-tc-EFmqwtip.js', source: 'export { view };\n' },
        ],
        onDemandFileNames: ['growspace-tc-EFmqwtip.js'],
      }),
    /growspace-dialog-host\.container-DHBYBlgG\.js statically imports growspace-tc-EFmqwtip\.js[\s\S]*dynamic import\(\)/
  );
});

test('a chunk that reaches an on-demand-only chunk dynamically passes', () => {
  assert.doesNotThrow(() =>
    assertOnDemandChunksAreNotImported({
      chunks: [
        {
          fileName: 'dist/growspace-growspace-dialog-host.container-DHBYBlgG.js',
          source: [
            "import './growspace-config-dialog-N3Q3MwtR.js';",
            "const view = () => import('./growspace-tc-EFmqwtip.js');",
            'export { view };',
          ].join('\n'),
        },
        { fileName: 'dist/growspace-tc-EFmqwtip.js', source: 'export { view };\n' },
      ],
      onDemandFileNames: ['growspace-tc-EFmqwtip.js'],
    })
  );
});

test('ordinary chunk-to-chunk static imports are not the thing being banned', () => {
  assert.doesNotThrow(() =>
    assertOnDemandChunksAreNotImported({
      chunks: [
        {
          fileName: 'dist/growspace-growspace-dialog-host.container-DHBYBlgG.js',
          source: dialogHost([
            'growspace-config-dialog-N3Q3MwtR.js',
            'growspace-environment-ramp-BQrnoVW8.js',
          ]),
        },
        {
          fileName: 'dist/growspace-heatmap-3d-BQZ9YvFt.js',
          source: dialogHost(['growspace-environment-ramp-BQrnoVW8.js']),
        },
      ],
      onDemandFileNames: ['growspace-tc-EFmqwtip.js'],
    })
  );
});
