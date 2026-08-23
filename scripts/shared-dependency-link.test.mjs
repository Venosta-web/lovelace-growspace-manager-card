import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  assertInstallIsDeliberate,
  assertLinkedDependenciesMatch,
  inspectSharedDependencyLink,
} from './shared-dependency-link.mjs';

async function checkout(root, name, lockfile) {
  const directory = path.join(root, name);
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, 'package-lock.json'), lockfile);
  return directory;
}

/**
 * A source checkout with a real dependency tree, and a worktree borrowing it
 * through a single link — the shape hub setup leaves behind.
 */
async function linkedPair(t, { sourceLockfile, worktreeLockfile = sourceLockfile }) {
  const root = await mkdtemp(path.join(tmpdir(), 'growspace-dependency-link-'));
  t.after(() => rm(root, { recursive: true, force: true }));

  const source = await checkout(root, 'source', sourceLockfile);
  const worktree = await checkout(root, 'worktree', worktreeLockfile);
  await mkdir(path.join(source, 'node_modules'));
  await symlink(path.join(source, 'node_modules'), path.join(worktree, 'node_modules'));

  return { root, source, worktree };
}

test('a link whose lockfiles still agree passes', async (t) => {
  const { source, worktree } = await linkedPair(t, { sourceLockfile: '{"lockfileVersion":3}\n' });

  const link = await assertLinkedDependenciesMatch(worktree);
  assert.equal(link.state, 'linked');
  assert.equal(link.sourceCheckout, source);
  assert.equal(link.matches, true);
});

test('a link whose lockfiles have drifted apart is refused, naming the source and the fix', async (t) => {
  const { source, worktree } = await linkedPair(t, {
    sourceLockfile: '{"lockfileVersion":3}\n',
    worktreeLockfile: '{"lockfileVersion":3,"packages":{}}\n',
  });

  await assert.rejects(assertLinkedDependenciesMatch(worktree), (error) => {
    assert.match(error.message, /Shared dependency link is stale/);
    assert.match(error.message, new RegExp(source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(error.message, /rm node_modules && npm ci/);
    return true;
  });
});

test('refusing leaves the link exactly as it found it', async (t) => {
  const { worktree } = await linkedPair(t, {
    sourceLockfile: '{"lockfileVersion":3}\n',
    worktreeLockfile: '{"lockfileVersion":3,"packages":{}}\n',
  });

  await assert.rejects(assertLinkedDependenciesMatch(worktree));

  const link = await inspectSharedDependencyLink(worktree);
  assert.equal(link.state, 'linked');
});

test('a private node_modules directory is nothing to compare and passes', async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), 'growspace-dependency-link-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const worktree = await checkout(root, 'worktree', '{"lockfileVersion":3}\n');
  await mkdir(path.join(worktree, 'node_modules'));

  assert.equal((await assertLinkedDependenciesMatch(worktree)).state, 'private');
});

test('an absent node_modules passes, so a fresh CI checkout is unaffected', async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), 'growspace-dependency-link-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const worktree = await checkout(root, 'worktree', '{"lockfileVersion":3}\n');

  assert.equal((await assertLinkedDependenciesMatch(worktree)).state, 'absent');
});

test('a dangling link is refused rather than treated as absent', async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), 'growspace-dependency-link-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const worktree = await checkout(root, 'worktree', '{"lockfileVersion":3}\n');
  await symlink(path.join(root, 'gone', 'node_modules'), path.join(worktree, 'node_modules'));

  await assert.rejects(assertLinkedDependenciesMatch(worktree), /link is broken/);
});

test('installing through a link is refused so the conversion is deliberate', async (t) => {
  const { source, worktree } = await linkedPair(t, { sourceLockfile: '{"lockfileVersion":3}\n' });

  await assert.rejects(assertInstallIsDeliberate(worktree), (error) => {
    assert.match(error.message, /Refusing to install through a shared dependency link/);
    assert.match(error.message, new RegExp(source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(error.message, /rm node_modules && npm ci/);
    return true;
  });
});

test('installing is inert in the main checkout and in a fresh CI checkout', async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), 'growspace-dependency-link-'));
  t.after(() => rm(root, { recursive: true, force: true }));

  const mainCheckout = await checkout(root, 'main', '{"lockfileVersion":3}\n');
  await mkdir(path.join(mainCheckout, 'node_modules'));
  assert.equal((await assertInstallIsDeliberate(mainCheckout)).state, 'private');

  const ciCheckout = await checkout(root, 'ci', '{"lockfileVersion":3}\n');
  assert.equal((await assertInstallIsDeliberate(ciCheckout)).state, 'absent');
});
