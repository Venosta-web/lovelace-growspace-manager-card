import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { rollup } from 'rollup';

import { failOnBareModuleSpecifiers } from './bare-module-specifiers.mjs';

async function lazyExternalFixture(t) {
  const root = await mkdtemp(path.join(tmpdir(), 'growspace-bare-specifier-'));
  t.after(() => rm(root, { recursive: true, force: true }));

  const input = path.join(root, 'index.js');
  await writeFile(
    input,
    "export async function loadLabelPreview() { return import('./label-preview.js'); }\n"
  );
  await writeFile(
    path.join(root, 'label-preview.js'),
    "import qrcode from 'qrcode-generator';\nexport const createCode = () => qrcode(0, 'M');\n"
  );

  return { input, root };
}

async function lazyExternalBundle(t, allowlist = []) {
  const { input } = await lazyExternalFixture(t);

  return rollup({
    input,
    external: ['qrcode-generator'],
    plugins: [failOnBareModuleSpecifiers({ allowlist })],
  });
}

test('build rejects a bare qrcode-generator import in a lazy chunk', async (t) => {
  const { root } = await lazyExternalFixture(t);
  const config = path.join(root, 'rollup.config.mjs');
  const guardModuleUrl = new URL('./bare-module-specifiers.mjs', import.meta.url).href;
  await writeFile(
    config,
    `import { failOnBareModuleSpecifiers } from ${JSON.stringify(guardModuleUrl)};

export default {
  input: './index.js',
  external: ['qrcode-generator'],
  output: { dir: './dist', format: 'es', chunkFileNames: '[name]-[hash].js' },
  plugins: [failOnBareModuleSpecifiers()],
};
`
  );

  const rollupBin = path.resolve('node_modules/rollup/dist/bin/rollup');
  const result = spawnSync(process.execPath, [rollupBin, '--config', config], {
    cwd: root,
    encoding: 'utf8',
  });

  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}\n${result.stderr}`, /qrcode-generator/);
  assert.match(`${result.stdout}\n${result.stderr}`, /label-preview-[\w-]+\.js/);
});

test('build permits an explicitly allowlisted bare module specifier', async (t) => {
  const bundle = await lazyExternalBundle(t, ['qrcode-generator']);
  t.after(() => bundle.close());

  const output = await bundle.generate({ format: 'es', chunkFileNames: '[name]-[hash].js' });
  const lazyChunk = output.output.find(
    (item) => item.type === 'chunk' && item.fileName.startsWith('label-preview-')
  );

  assert.ok(lazyChunk);
  assert.deepEqual(lazyChunk.imports, ['qrcode-generator']);
});
