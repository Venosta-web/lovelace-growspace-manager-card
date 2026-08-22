#!/usr/bin/env node
import { constants } from 'node:fs';
import { access } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function isWorkspaceHub(directory) {
  try {
    await Promise.all([
      access(path.join(directory, 'docker-compose.yml'), constants.R_OK),
      access(path.join(directory, 'scripts', 'ha'), constants.X_OK),
    ]);
    return true;
  } catch {
    return false;
  }
}

export async function findWorkspaceHub(startDirectory) {
  let directory = path.resolve(startDirectory);
  while (true) {
    for (const candidate of [directory, path.join(directory, 'growspace_manager_workspace')]) {
      if (await isWorkspaceHub(candidate)) return candidate;
    }
    const parent = path.dirname(directory);
    if (parent === directory) return undefined;
    directory = parent;
  }
}

const hubDirectory = await findWorkspaceHub(rootDirectory);
if (!hubDirectory) {
  console.error(
    'E2E setup stopped: npm run build replaced dist/, but the Growspace workspace hub could not be found to restart Home Assistant.\n' +
      `Restart the HA dev runtime with ${path.join(rootDirectory, 'dist')} mounted, then run \`npm run test:ha\`.`
  );
  process.exit(1);
}

console.log(`Recreating Home Assistant with ${path.join(rootDirectory, 'dist')} mounted...`);
const result = spawnSync(path.join(hubDirectory, 'scripts', 'ha'), ['dev', 'restart'], {
  cwd: hubDirectory,
  env: {
    ...process.env,
    GROWSPACE_CARD_DIST: path.join(rootDirectory, 'dist'),
  },
  stdio: 'inherit',
});

if (result.error) {
  console.error(`Could not restart Home Assistant: ${result.error.message}`);
  process.exit(1);
}
process.exit(result.status ?? 1);
