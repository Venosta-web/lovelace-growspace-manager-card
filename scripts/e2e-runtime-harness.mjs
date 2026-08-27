import { spawnSync } from 'node:child_process';
import path from 'node:path';

export const E2E_PREFLIGHT_ENVIRONMENT_VARIABLE = 'GROWSPACE_E2E_PREFLIGHT';
export const E2E_PREFLIGHT_COMPLETE = 'runtime-harness-complete';

function commandStatus(result, phase) {
  if (result.error) {
    process.stderr.write(`Could not start the E2E ${phase}: ${result.error.message}\n`);
    return 1;
  }
  if (result.status === null) {
    process.stderr.write(`The E2E ${phase} stopped after receiving ${result.signal}.\n`);
    return 1;
  }
  return result.status;
}

export function runE2ERuntimeHarness({
  mode,
  rootDirectory,
  playwrightArguments = [],
  environment = process.env,
}) {
  if (mode !== 'attached') {
    throw new Error(`Unsupported E2E runtime mode: ${mode}`);
  }

  const preflightEnvironment = { ...environment };
  delete preflightEnvironment[E2E_PREFLIGHT_ENVIRONMENT_VARIABLE];
  const preflight = spawnSync(
    process.execPath,
    [path.join(rootDirectory, 'scripts', 'verify-e2e-bundle.mjs')],
    {
      cwd: rootDirectory,
      env: preflightEnvironment,
      stdio: 'inherit',
    }
  );
  const preflightStatus = commandStatus(preflight, 'bundle preflight');
  if (preflightStatus !== 0) return preflightStatus;

  const playwright = spawnSync(
    process.platform === 'win32' ? 'npm.cmd' : 'npm',
    [
      '--prefix',
      path.join(rootDirectory, 'tests', 'e2e'),
      'run',
      'test',
      '--',
      ...playwrightArguments,
    ],
    {
      cwd: rootDirectory,
      env: {
        ...environment,
        [E2E_PREFLIGHT_ENVIRONMENT_VARIABLE]: E2E_PREFLIGHT_COMPLETE,
      },
      stdio: 'inherit',
    }
  );
  return commandStatus(playwright, 'Playwright run');
}
