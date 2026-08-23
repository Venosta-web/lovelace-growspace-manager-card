import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  assertLocalBundle,
  assertServedBundle,
  computeSourceFingerprint,
  createBuildBanner,
  parseBuildMarker,
} from './e2e-build-state.mjs';

async function fixture() {
  const root = await mkdtemp(path.join(tmpdir(), 'growspace-build-state-'));
  await mkdir(path.join(root, 'scripts'), { recursive: true });
  await mkdir(path.join(root, 'src'), { recursive: true });
  for (const file of [
    'package-lock.json',
    'package.json',
    'rollup.config.js',
    'scripts/bare-module-specifiers.mjs',
    'scripts/e2e-build-state.mjs',
    'tsconfig.json',
  ]) {
    await writeFile(path.join(root, file), `${file}\n`);
  }
  await writeFile(path.join(root, 'src', 'index.ts'), 'export const value = 1;\n');
  return root;
}

test('source fingerprint changes with runtime source state but ignores test-only files', async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));

  const initial = await computeSourceFingerprint(root);
  await writeFile(path.join(root, 'src', 'index.test.ts'), 'test only\n');
  assert.equal(await computeSourceFingerprint(root), initial);

  await writeFile(path.join(root, 'src', 'index.ts'), 'export const value = 2;\n');
  assert.notEqual(await computeSourceFingerprint(root), initial);
});

test('source fingerprint includes build configuration', async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));

  const initial = await computeSourceFingerprint(root);
  await writeFile(path.join(root, 'rollup.config.js'), 'changed build config\n');
  assert.notEqual(await computeSourceFingerprint(root), initial);
});

test('source fingerprint includes the bare-module-specifier build guard', async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));

  const initial = await computeSourceFingerprint(root);
  await writeFile(path.join(root, 'scripts', 'bare-module-specifiers.mjs'), 'changed guard\n');
  assert.notEqual(await computeSourceFingerprint(root), initial);
});

test('build markers identify the source and each exact build', () => {
  const sourceFingerprint = 'a'.repeat(64);
  const first = parseBuildMarker(createBuildBanner(sourceFingerprint));
  const second = parseBuildMarker(createBuildBanner(sourceFingerprint));

  assert.equal(first.sourceFingerprint, sourceFingerprint);
  assert.match(first.buildId, /^[a-f0-9]{32}$/);
  assert.notEqual(first.buildId, second.buildId);
});

test('local and served assertions reject stale bundles with actionable errors', () => {
  const sourceFingerprint = 'a'.repeat(64);
  const localBundle = createBuildBanner(sourceFingerprint);
  const localMarker = assertLocalBundle(localBundle, sourceFingerprint);

  assert.throws(
    () => assertLocalBundle(localBundle, 'b'.repeat(64)),
    /dist\/growspace-manager-card\.js is stale/
  );
  assert.throws(
    () =>
      assertServedBundle(createBuildBanner(sourceFingerprint), localMarker, 'http://ha/card.js'),
    /Docker can keep serving the deleted directory by inode/
  );
});
