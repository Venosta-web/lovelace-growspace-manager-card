import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

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

// The module above is only a guard while package.json runs it. The #742
// back-merge dropped both entries and nothing noticed for a month: the module and
// its tests kept passing while no npm command called it. These tests read the
// wiring itself and run each entry the way npm would, against a checkout it must
// refuse, so losing either entry fails CI.
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const guardModule = fileURLToPath(new URL('./shared-dependency-link.mjs', import.meta.url));

async function wiredScript(name) {
  const { scripts = {} } = JSON.parse(await readFile(path.join(repoRoot, 'package.json'), 'utf8'));
  const command = scripts[name];
  assert.ok(command, `package.json no longer wires "${name}" to the shared dependency link guard`);

  const [program, script, ...args] = command.trim().split(/\s+/);
  assert.equal(program, 'node', `"${name}" should run the guard with node: ${command}`);
  assert.equal(
    path.resolve(repoRoot, script),
    guardModule,
    `"${name}" should run scripts/shared-dependency-link.mjs: ${command}`
  );
  return { script: path.resolve(repoRoot, script), args };
}

/** Run a wired entry as npm would, with the checkout under test as its cwd. */
async function runWired(name, cwd) {
  const { script, args } = await wiredScript(name);
  try {
    const { stderr } = await promisify(execFile)(process.execPath, [script, ...args], { cwd });
    return { code: 0, stderr };
  } catch (error) {
    return { code: error.code, stderr: error.stderr };
  }
}

test('package.json wires pretest and preinstall to the guard', async () => {
  assert.deepEqual((await wiredScript('pretest')).args, ['pretest']);
  assert.deepEqual((await wiredScript('preinstall')).args, ['preinstall']);
});

test('the wired pretest refuses a drifted link with the unlink-then-npm-ci recipe', async (t) => {
  const { worktree } = await linkedPair(t, {
    sourceLockfile: '{"lockfileVersion":3}\n',
    worktreeLockfile: '{"lockfileVersion":3,"packages":{}}\n',
  });

  const { code, stderr } = await runWired('pretest', worktree);
  assert.equal(code, 1);
  assert.match(stderr, /Shared dependency link is stale/);
  assert.match(stderr, /rm node_modules && npm ci/);
});

test('the wired preinstall refuses to install through a link', async (t) => {
  const { worktree } = await linkedPair(t, { sourceLockfile: '{"lockfileVersion":3}\n' });

  const { code, stderr } = await runWired('preinstall', worktree);
  assert.equal(code, 1);
  assert.match(stderr, /Refusing to install through a shared dependency link/);
  assert.match(stderr, /rm node_modules && npm ci/);
});

test('both wired entries do nothing with a private or absent node_modules', async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), 'growspace-dependency-link-'));
  t.after(() => rm(root, { recursive: true, force: true }));

  const mainCheckout = await checkout(root, 'main', '{"lockfileVersion":3}\n');
  await mkdir(path.join(mainCheckout, 'node_modules'));
  const ciCheckout = await checkout(root, 'ci', '{"lockfileVersion":3}\n');

  for (const name of ['pretest', 'preinstall']) {
    for (const cwd of [mainCheckout, ciCheckout]) {
      assert.deepEqual(await runWired(name, cwd), { code: 0, stderr: '' }, `${name} in ${cwd}`);
    }
  }
});
