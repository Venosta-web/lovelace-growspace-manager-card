import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { rollup } from 'rollup';

import { bindChunkToEntryInstance, bindLazyChunksToEntry } from './lazy-chunk-entry-binding.mjs';

const entryFileName = 'growspace-manager-card.js';

async function build(t, { publishesEntryUrl = true } = {}) {
  const root = await mkdtemp(path.join(tmpdir(), 'growspace-entry-binding-'));
  t.after(() => rm(root, { recursive: true, force: true }));

  await writeFile(
    path.join(root, 'index.js'),
    [
      publishesEntryUrl ? 'window.__growspaceEntryUrl ??= import.meta.url;' : '',
      "export const shared = 'runtime';",
      // A side effect, so dropping the entry signature cannot tree-shake the
      // dynamic import that creates the chunk under test.
      "window.openDialog = () => import('./dialog.js');",
    ].join('\n')
  );
  await writeFile(
    path.join(root, 'dialog.js'),
    "import { shared } from './index.js';\nexport const label = () => shared;\n"
  );

  const bundle = await rollup({
    input: path.join(root, 'index.js'),
    preserveEntrySignatures: false,
    plugins: [bindLazyChunksToEntry({ entryFileName })],
  });
  t.after(() => bundle.close());

  const { output } = await bundle.generate({
    format: 'es',
    entryFileNames: entryFileName,
    chunkFileNames: 'growspace-[name].js',
  });
  return output;
}

test('a chunk binds to the entry instance instead of importing it', async (t) => {
  const output = await build(t);
  const chunk = output.find((emitted) => emitted.fileName !== entryFileName);

  assert.match(chunk.code, /await import\(window\.__growspaceEntryUrl/);
  assert.doesNotMatch(chunk.code, new RegExp(`from ['"]\\./${entryFileName}['"]`));
});

test('the build fails when the entry stops publishing its own URL', async (t) => {
  await assert.rejects(build(t, { publishesEntryUrl: false }), /does not publish/);
});

test('aliased and plain specifiers become a destructuring', () => {
  assert.equal(
    bindChunkToEntryInstance(`import { a as b, c } from './${entryFileName}';\n`, entryFileName),
    `const { a: b, c } = await import(window.__growspaceEntryUrl ?? './${entryFileName}');\n`
  );
});

test('the rewrite stays on one line so the chunk source map survives', () => {
  const chunk = `import { a } from './${entryFileName}';\nconst first = a;\n`;
  assert.equal(
    bindChunkToEntryInstance(chunk, entryFileName).split('\n').length,
    chunk.split('\n').length
  );
});

test('an import form the rewrite cannot bind fails the build', () => {
  assert.throws(
    () => bindChunkToEntryInstance(`import * as entry from './${entryFileName}';\n`, entryFileName),
    /cannot bind/
  );
});
