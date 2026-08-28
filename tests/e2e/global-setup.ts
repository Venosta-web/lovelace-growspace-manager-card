import { spawnSync } from 'node:child_process';
import * as path from 'node:path';

import {
  E2E_PREFLIGHT_COMPLETE,
  E2E_PREFLIGHT_ENVIRONMENT_VARIABLE,
} from '../../scripts/e2e-runtime-harness.mjs';

export function shouldBypassE2EBundlePreflight(
  environment: Record<string, string | undefined>
): boolean {
  return environment[E2E_PREFLIGHT_ENVIRONMENT_VARIABLE] === E2E_PREFLIGHT_COMPLETE;
}

export default function verifyE2EBundle(): void {
  if (shouldBypassE2EBundlePreflight(process.env)) return;

  const rootDirectory = path.resolve(__dirname, '..', '..');
  const result = spawnSync(
    process.execPath,
    [path.join(rootDirectory, 'scripts', 'verify-e2e-bundle.mjs')],
    {
      cwd: rootDirectory,
      env: process.env,
      stdio: 'inherit',
    }
  );

  if (result.error) {
    throw new Error(`Could not start the e2e bundle preflight: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error('Playwright stopped because the e2e card bundle preflight failed.');
  }
}
