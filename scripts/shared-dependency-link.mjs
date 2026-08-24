#!/usr/bin/env node
// Refuse to work through a shared dependency link that no longer holds.
//
// A hub-managed worktree borrows the main checkout's node_modules through a
// single symlink, established once at worktree setup while both lockfiles
// agreed. Two ordinary events break that agreement afterwards: the source
// checkout installing a new dependency, or this worktree's branch changing its
// own lockfile. Either way the suite keeps running — and keeps passing —
// against a dependency plan matching nobody's lockfile.
//
// This check compares, reports, and stops. It never creates, repairs, or
// removes a link: whether one checkout's dependencies may back another is
// worktree setup's decision, not a validation command's. See the hub's
// docs/adr/0001-guarded-shared-card-dependencies.md.
//
// It needs no knowledge of the hub. A link resolves to the source checkout's
// node_modules, and that checkout's package-lock.json sits beside it.
import { createHash } from 'node:crypto';
import { lstat, readFile, readlink, realpath } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RECIPE = 'rm node_modules && npm ci';

async function lockfileHash(lockfilePath) {
  try {
    return createHash('sha256')
      .update(await readFile(lockfilePath))
      .digest('hex');
  } catch (error) {
    if (error?.code === 'ENOENT') return undefined;
    throw error;
  }
}

function describeHash(hash) {
  return hash ? hash.slice(0, 12) : 'missing';
}

/**
 * Classify this checkout's node_modules as `absent`, `private` (a real
 * directory), `broken` (a dangling link), or `linked` to a source checkout.
 */
export async function inspectSharedDependencyLink(rootDirectory = process.cwd()) {
  const linkPath = path.join(rootDirectory, 'node_modules');

  let entry;
  try {
    entry = await lstat(linkPath);
  } catch (error) {
    if (error?.code === 'ENOENT') return { state: 'absent', linkPath };
    throw error;
  }

  if (!entry.isSymbolicLink()) return { state: 'private', linkPath };

  let target;
  try {
    target = await realpath(linkPath);
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
    return { state: 'broken', linkPath, target: await readlink(linkPath) };
  }

  const sourceCheckout = path.dirname(target);
  const sourceLock = await lockfileHash(path.join(sourceCheckout, 'package-lock.json'));
  const localLock = await lockfileHash(path.join(rootDirectory, 'package-lock.json'));

  return {
    state: 'linked',
    linkPath,
    target,
    sourceCheckout,
    sourceLock,
    localLock,
    matches: sourceLock !== undefined && sourceLock === localLock,
  };
}

/**
 * `pretest`: refuse to run the suite against a link whose two lockfiles have
 * drifted apart. A private directory or no directory at all is nothing to
 * compare — pass silently.
 */
export async function assertLinkedDependenciesMatch(rootDirectory = process.cwd()) {
  const link = await inspectSharedDependencyLink(rootDirectory);

  if (link.state === 'broken') {
    throw new Error(
      `Shared dependency link is broken: node_modules points at ${link.target}, which does not exist.\n` +
        `Give this checkout its own dependencies:\n  ${RECIPE}`
    );
  }

  if (link.state === 'linked' && !link.matches) {
    throw new Error(
      'Shared dependency link is stale: this checkout borrows node_modules from\n' +
        `${link.sourceCheckout}\n` +
        `whose package-lock.json (${describeHash(link.sourceLock)}) no longer matches this checkout's ` +
        `(${describeHash(link.localLock)}).\n` +
        "Running the suite against it would resolve another branch's dependency tree and pass\n" +
        'without meaning it.\n' +
        `Give this checkout its own dependencies:\n  ${RECIPE}\n` +
        'This check never re-links — sharing one checkout with another is worktree setup\'s call.'
    );
  }

  return link;
}

/**
 * `preinstall`: npm runs this before it removes anything, so a shared link is
 * still intact here. Installing would delete it and leave a private install in
 * its place — recoverable, but it silently converts a hub-managed worktree into
 * a standalone one. Refuse, so that conversion is a deliberate act.
 */
export async function assertInstallIsDeliberate(rootDirectory = process.cwd()) {
  const link = await inspectSharedDependencyLink(rootDirectory);
  if (link.state !== 'linked' && link.state !== 'broken') return link;

  throw new Error(
    `Refusing to install through a shared dependency link.\n` +
      `node_modules is a link to ${link.sourceCheckout ?? link.target}.\n` +
      'npm would delete the link and leave a private install in its place, turning this\n' +
      'hub-managed worktree into a standalone one without saying so.\n' +
      `If that is what you want, remove the link first:\n  ${RECIPE}`
  );
}

const MODES = {
  pretest: assertLinkedDependenciesMatch,
  preinstall: assertInstallIsDeliberate,
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const mode = process.argv[2];
  const assertMode = Object.hasOwn(MODES, mode ?? '') ? MODES[mode] : undefined;

  if (!assertMode) {
    console.error(
      `Usage: node scripts/shared-dependency-link.mjs <${Object.keys(MODES).join('|')}>`
    );
    process.exit(2);
  }

  try {
    await assertMode();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
