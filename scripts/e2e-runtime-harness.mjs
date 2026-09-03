import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { access, copyFile, cp, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

export const E2E_PREFLIGHT_ENVIRONMENT_VARIABLE = 'GROWSPACE_E2E_PREFLIGHT';
export const E2E_PREFLIGHT_COMPLETE = 'runtime-harness-complete';

const DEFAULT_HOME_ASSISTANT_IMAGE = 'homeassistant/home-assistant:stable';
const MANAGED_ENVIRONMENT_PATH = 'GROWSPACE_E2E_ENV_PATH';
const PLAYWRIGHT_OUTPUT_ROOT = 'GROWSPACE_E2E_PLAYWRIGHT_OUTPUT_ROOT';

class CommandFailure extends Error {
  constructor(message, status = 1) {
    super(message);
    this.status = status;
  }
}

function signalStatus(signal) {
  return signal === 'SIGINT' ? 130 : signal === 'SIGTERM' ? 143 : 1;
}

function commandName(command, arguments_) {
  return [command, ...arguments_].join(' ');
}

function runCommand(
  command,
  arguments_,
  { cwd, environment, phase, capture = false, signal } = {}
) {
  return new Promise((resolve, reject) => {
    let child;
    try {
      child = spawn(command, arguments_, {
        cwd,
        env: environment,
        signal,
        stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
      });
    } catch (error) {
      reject(new CommandFailure(`Could not start the E2E ${phase}: ${error.message}`));
      return;
    }

    let stdout = '';
    let stderr = '';
    let settled = false;
    if (capture) {
      child.stdout.setEncoding('utf8');
      child.stderr.setEncoding('utf8');
      child.stdout.on('data', (chunk) => (stdout += chunk));
      child.stderr.on('data', (chunk) => (stderr += chunk));
    }

    const fail = (error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };

    child.on('error', (error) => {
      if (error?.code === 'ABORT_ERR') {
        fail(new CommandFailure(`The E2E ${phase} was interrupted.`, 130));
      } else {
        fail(new CommandFailure(`Could not start the E2E ${phase}: ${error.message}`));
      }
    });
    child.on('close', (status, childSignal) => {
      if (settled) return;
      settled = true;
      if (status === 0) {
        resolve({ stdout, stderr });
        return;
      }
      if (capture && stderr) process.stderr.write(stderr);
      const detail =
        status === null
          ? `stopped after receiving ${childSignal}`
          : `failed with exit code ${status}`;
      reject(
        new CommandFailure(
          `The E2E ${phase} ${detail}: ${commandName(command, arguments_)}`,
          status ?? signalStatus(childSignal)
        )
      );
    });
  });
}

function candidateAncestors(startDirectory) {
  const candidates = [];
  let current = path.resolve(startDirectory);
  while (true) {
    candidates.push(current);
    const parent = path.dirname(current);
    if (parent === current) return candidates;
    current = parent;
  }
}

function discoverPath({ rootDirectory, override, environmentName, marker, candidates }) {
  if (override) return path.resolve(rootDirectory, override);
  const found = candidates.find((candidate) => existsSync(path.join(candidate, marker)));
  if (found) return found;
  throw new Error(
    `Could not discover the local ${environmentName.toLowerCase().replaceAll('_', ' ')} checkout. ` +
      `Set ${environmentName} to an explicit path.`
  );
}

async function resolveManagedInputs({ rootDirectory, environment, managedOptions }) {
  const ancestors = candidateAncestors(rootDirectory);
  const integrationDirectory = discoverPath({
    rootDirectory,
    override: managedOptions.integrationDirectory ?? environment.GROWSPACE_E2E_INTEGRATION_ROOT,
    environmentName: 'GROWSPACE_E2E_INTEGRATION_ROOT',
    marker: path.join('custom_components', 'growspace_manager', 'manifest.json'),
    candidates: [
      path.resolve(rootDirectory, '..', 'growspace_manager'),
      path.resolve(rootDirectory, '..', 'backend'),
      ...ancestors.map((ancestor) => path.join(ancestor, 'growspace_manager')),
    ],
  });
  const workspaceDirectory = discoverPath({
    rootDirectory,
    override: managedOptions.workspaceDirectory ?? environment.GROWSPACE_E2E_WORKSPACE_ROOT,
    environmentName: 'GROWSPACE_E2E_WORKSPACE_ROOT',
    marker: path.join('ha-dev', 'packages', 'e2e_simulated_sensors.yaml'),
    candidates: [
      path.resolve(rootDirectory, '..', 'growspace_manager_workspace'),
      ...ancestors.flatMap((ancestor) => [
        ancestor,
        path.join(ancestor, 'growspace_manager_workspace'),
      ]),
    ],
  });

  return {
    integrationDirectory: path.resolve(integrationDirectory),
    workspaceDirectory: path.resolve(workspaceDirectory),
  };
}

async function requireInputs(inputs) {
  for (const [description, inputPath] of inputs) {
    try {
      await access(inputPath);
    } catch {
      throw new Error(`Managed E2E input is missing (${description}): ${inputPath}`);
    }
  }
}

async function validateManagedInputs({ rootDirectory, integrationDirectory, workspaceDirectory }) {
  await requireInputs([
    [
      'integration manifest',
      path.join(integrationDirectory, 'custom_components', 'growspace_manager', 'manifest.json'),
    ],
    [
      'workspace simulated sensors',
      path.join(workspaceDirectory, 'ha-dev', 'packages', 'e2e_simulated_sensors.yaml'),
    ],
    [
      'Home Assistant configuration',
      path.join(rootDirectory, 'tests', 'e2e', 'ha-config', 'ci-configuration.yaml'),
    ],
    ['camera fixture image', path.join(rootDirectory, 'brand', 'icon.png')],
    [
      'entity coverage manifest',
      path.join(rootDirectory, 'tests', 'e2e', 'fixtures', 'e2e-entity-coverage.generated.json'),
    ],
    [
      'growspace setup program',
      path.join(rootDirectory, 'tests', 'e2e', 'fixtures', 'e2e-setup.ts'),
    ],
    [
      'Home Assistant bootstrap program',
      path.join(rootDirectory, 'scripts', 'ci-e2e-environment.mjs'),
    ],
    ['bundle verification program', path.join(rootDirectory, 'scripts', 'verify-e2e-bundle.mjs')],
  ]);
}

async function assembleHomeAssistantConfiguration({
  rootDirectory,
  workspaceDirectory,
  configDirectory,
}) {
  const packageDirectory = path.join(configDirectory, 'packages');
  const cameraDirectory = path.join(configDirectory, 'www', 'e2e-camera-assets');
  await mkdir(packageDirectory, { recursive: true });
  await mkdir(cameraDirectory, { recursive: true });
  await copyFile(
    path.join(workspaceDirectory, 'ha-dev', 'packages', 'e2e_simulated_sensors.yaml'),
    path.join(packageDirectory, 'e2e_simulated_sensors.yaml')
  );
  await copyFile(
    path.join(rootDirectory, 'tests', 'e2e', 'ha-config', 'ci-configuration.yaml'),
    path.join(configDirectory, 'configuration.yaml')
  );
  await Promise.all(
    ['e2e_vision_1.jpg', 'e2e_vision_2.jpg'].map((filename) =>
      copyFile(path.join(rootDirectory, 'brand', 'icon.png'), path.join(cameraDirectory, filename))
    )
  );
}

function publishedPort(dockerPortOutput) {
  const match = dockerPortOutput.trim().match(/127\.0\.0\.1:(\d+)$/m);
  if (!match) {
    throw new Error(`Docker did not report the managed Home Assistant port: ${dockerPortOutput}`);
  }
  return Number(match[1]);
}

async function captureFailureArtifacts({
  artifactDirectory,
  containerName,
  containerStarted,
  environment,
  failure,
  playwrightOutputDirectory,
  rootDirectory,
}) {
  await mkdir(artifactDirectory, { recursive: true });
  await writeFile(path.join(artifactDirectory, 'failure.txt'), `${failure.message}\n`);

  if (containerStarted) {
    try {
      const logs = await runCommand('docker', ['logs', containerName], {
        cwd: rootDirectory,
        environment,
        phase: 'Home Assistant log capture',
        capture: true,
      });
      await writeFile(
        path.join(artifactDirectory, 'home-assistant.log'),
        `${logs.stdout}${logs.stderr}`
      );
    } catch (error) {
      await writeFile(
        path.join(artifactDirectory, 'home-assistant.log'),
        `Could not capture Home Assistant logs: ${error.message}\n`
      );
    }
  }

  if (existsSync(playwrightOutputDirectory)) {
    await cp(playwrightOutputDirectory, path.join(artifactDirectory, 'playwright'), {
      recursive: true,
    });
  }
}

async function runAttached({ rootDirectory, playwrightArguments, environment }) {
  const preflightEnvironment = { ...environment };
  delete preflightEnvironment[E2E_PREFLIGHT_ENVIRONMENT_VARIABLE];
  await runCommand(
    process.execPath,
    [path.join(rootDirectory, 'scripts', 'verify-e2e-bundle.mjs')],
    {
      cwd: rootDirectory,
      environment: preflightEnvironment,
      phase: 'bundle preflight',
    }
  );
  await runCommand(
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
      environment: {
        ...environment,
        [E2E_PREFLIGHT_ENVIRONMENT_VARIABLE]: E2E_PREFLIGHT_COMPLETE,
      },
      phase: 'Playwright run',
    }
  );
}

async function runManaged({ rootDirectory, playwrightArguments, environment, managedOptions }) {
  const inputs = await resolveManagedInputs({ rootDirectory, environment, managedOptions });
  await validateManagedInputs({ rootDirectory, ...inputs });

  const artifactDirectory = path.join(rootDirectory, '.artifacts', 'e2e-managed');
  const homeAssistantImage =
    managedOptions.homeAssistantImage ??
    environment.GROWSPACE_E2E_HOME_ASSISTANT_IMAGE ??
    DEFAULT_HOME_ASSISTANT_IMAGE;
  await rm(artifactDirectory, { recursive: true, force: true });
  const runtimeDirectory = await mkdtemp(path.join(tmpdir(), 'growspace-card-e2e-'));
  const configDirectory = path.join(runtimeDirectory, 'ha-config');
  const managedEnvironmentPath = path.join(runtimeDirectory, '.env.test');
  const playwrightOutputDirectory = path.join(runtimeDirectory, 'playwright');
  const compiledDirectory = path.join(runtimeDirectory, 'compiled');
  const containerName = `growspace-card-e2e-${process.pid}-${randomUUID().slice(0, 8)}`;
  const abortController = new AbortController();
  let receivedSignal;
  let containerStarted = false;
  let primaryFailure;
  const cleanupFailures = [];

  const interrupt = (signal) => {
    if (receivedSignal) return;
    receivedSignal = signal;
    abortController.abort();
  };
  const onInterrupt = () => interrupt('SIGINT');
  const onTerminate = () => interrupt('SIGTERM');
  process.once('SIGINT', onInterrupt);
  process.once('SIGTERM', onTerminate);

  try {
    await runCommand(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build'], {
      cwd: rootDirectory,
      environment,
      phase: 'card build',
      signal: abortController.signal,
    });
    await requireInputs([
      ['built card bundle', path.join(rootDirectory, 'dist', 'growspace-manager-card.js')],
    ]);
    await assembleHomeAssistantConfiguration({
      rootDirectory,
      workspaceDirectory: inputs.workspaceDirectory,
      configDirectory,
    });
    await runCommand('docker', ['version', '--format', '{{.Server.Version}}'], {
      cwd: rootDirectory,
      environment,
      phase: 'Docker availability check',
      capture: true,
      signal: abortController.signal,
    });

    await runCommand(
      'docker',
      [
        'run',
        '--detach',
        '--name',
        containerName,
        '--publish',
        '127.0.0.1::8123',
        '--volume',
        `${configDirectory}:/config`,
        '--volume',
        `${path.join(inputs.integrationDirectory, 'custom_components', 'growspace_manager')}:/config/custom_components/growspace_manager:ro`,
        '--volume',
        `${path.join(rootDirectory, 'dist')}:/config/www/community/lovelace-growspace-manager-card:ro`,
        '--env',
        'TZ=UTC',
        homeAssistantImage,
      ],
      {
        cwd: rootDirectory,
        environment,
        phase: 'managed Home Assistant startup',
        capture: true,
        signal: abortController.signal,
      }
    );
    containerStarted = true;

    const portResult = await runCommand('docker', ['port', containerName, '8123/tcp'], {
      cwd: rootDirectory,
      environment,
      phase: 'managed Home Assistant port discovery',
      capture: true,
      signal: abortController.signal,
    });
    const baseUrl = `http://127.0.0.1:${publishedPort(portResult.stdout)}`;
    const managedEnvironment = {
      ...environment,
      HA_BASE_URL: baseUrl,
      [MANAGED_ENVIRONMENT_PATH]: managedEnvironmentPath,
      [PLAYWRIGHT_OUTPUT_ROOT]: playwrightOutputDirectory,
      GROWSPACE_E2E_COVERAGE_PATH: path.join(
        rootDirectory,
        'tests',
        'e2e',
        'fixtures',
        'e2e-entity-coverage.generated.json'
      ),
    };

    await runCommand(
      process.execPath,
      [path.join(rootDirectory, 'scripts', 'ci-e2e-environment.mjs'), 'bootstrap'],
      {
        cwd: rootDirectory,
        environment: managedEnvironment,
        phase: 'Home Assistant bootstrap',
        signal: abortController.signal,
      }
    );
    await runCommand(
      process.platform === 'win32' ? 'npx.cmd' : 'npx',
      [
        '--no-install',
        'tsc',
        path.join(rootDirectory, 'tests', 'e2e', 'fixtures', 'e2e-setup.ts'),
        '--ignoreConfig',
        '--module',
        'commonjs',
        '--target',
        'es2022',
        '--types',
        'node',
        '--esModuleInterop',
        '--skipLibCheck',
        '--outDir',
        compiledDirectory,
      ],
      {
        cwd: rootDirectory,
        environment: managedEnvironment,
        phase: 'growspace setup compilation',
        signal: abortController.signal,
      }
    );
    await runCommand(process.execPath, [path.join(compiledDirectory, 'e2e-setup.js')], {
      cwd: rootDirectory,
      environment: managedEnvironment,
      phase: 'growspace seeding',
      signal: abortController.signal,
    });
    await runCommand(
      process.execPath,
      [path.join(rootDirectory, 'scripts', 'ci-e2e-environment.mjs'), 'dashboards'],
      {
        cwd: rootDirectory,
        environment: managedEnvironment,
        phase: 'dashboard creation',
        signal: abortController.signal,
      }
    );
    await runCommand(
      process.execPath,
      [path.join(rootDirectory, 'scripts', 'verify-e2e-bundle.mjs'), '--wait=120000'],
      {
        cwd: rootDirectory,
        environment: managedEnvironment,
        phase: 'bundle preflight',
        signal: abortController.signal,
      }
    );
    await runCommand(
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
        environment: {
          ...managedEnvironment,
          [E2E_PREFLIGHT_ENVIRONMENT_VARIABLE]: E2E_PREFLIGHT_COMPLETE,
        },
        phase: 'Playwright run',
        signal: abortController.signal,
      }
    );
  } catch (error) {
    primaryFailure =
      receivedSignal && error.status === 130
        ? new CommandFailure(
            `The managed E2E run was interrupted by ${receivedSignal}.`,
            signalStatus(receivedSignal)
          )
        : error;
    try {
      await captureFailureArtifacts({
        artifactDirectory,
        containerName,
        containerStarted,
        environment,
        failure: primaryFailure,
        playwrightOutputDirectory,
        rootDirectory,
      });
    } catch (artifactError) {
      cleanupFailures.push(new Error(`Failure artifact capture failed: ${artifactError.message}`));
    }
  } finally {
    process.removeListener('SIGINT', onInterrupt);
    process.removeListener('SIGTERM', onTerminate);
    let containerRemoved = !containerStarted;
    if (containerStarted) {
      try {
        await runCommand('docker', ['rm', '--force', containerName], {
          cwd: rootDirectory,
          environment,
          phase: 'managed Home Assistant cleanup',
          capture: true,
        });
        containerRemoved = true;
      } catch (error) {
        cleanupFailures.push(error);
      }
    }
    if (containerStarted && containerRemoved) {
      try {
        await runCommand(
          'docker',
          [
            'run',
            '--rm',
            '--volume',
            `${runtimeDirectory}:/runtime`,
            '--entrypoint',
            'sh',
            homeAssistantImage,
            '-c',
            'find /runtime -mindepth 1 -delete',
          ],
          {
            cwd: rootDirectory,
            environment,
            phase: 'temporary runtime permission cleanup',
            capture: true,
          }
        );
      } catch (error) {
        cleanupFailures.push(error);
      }
    }
    try {
      await rm(runtimeDirectory, { recursive: true, force: true });
    } catch (error) {
      cleanupFailures.push(new Error(`Temporary runtime cleanup failed: ${error.message}`));
    }
  }

  if (primaryFailure) {
    process.stderr.write(`${primaryFailure.message}\n`);
    if (existsSync(artifactDirectory)) {
      process.stderr.write(`Managed E2E failure artifacts: ${artifactDirectory}\n`);
    }
  }
  for (const cleanupFailure of cleanupFailures) {
    process.stderr.write(`Managed E2E cleanup warning: ${cleanupFailure.message}\n`);
  }
  if (primaryFailure) return primaryFailure.status ?? 1;
  return cleanupFailures.length === 0 ? 0 : 1;
}

export async function runE2ERuntimeHarness({
  mode,
  rootDirectory,
  playwrightArguments = [],
  environment = process.env,
  managedOptions = {},
}) {
  try {
    if (mode === 'attached') {
      await runAttached({ rootDirectory, playwrightArguments, environment });
      return 0;
    }
    if (mode === 'managed') {
      return await runManaged({
        rootDirectory,
        playwrightArguments,
        environment,
        managedOptions,
      });
    }
    throw new Error(`Unsupported E2E runtime mode: ${mode}`);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    return error.status ?? 1;
  }
}
