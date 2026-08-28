import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmod, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  E2E_PREFLIGHT_COMPLETE,
  E2E_PREFLIGHT_ENVIRONMENT_VARIABLE,
  runE2ERuntimeHarness,
} from './e2e-runtime-harness.mjs';

async function fixture({ preflightStatus = 0 } = {}) {
  const rootDirectory = await mkdtemp(path.join(tmpdir(), 'growspace-e2e-harness-'));
  const scriptsDirectory = path.join(rootDirectory, 'scripts');
  const e2eDirectory = path.join(rootDirectory, 'tests', 'e2e');
  const executionLog = path.join(rootDirectory, 'execution.jsonl');
  const harnessAdapter = path.join(rootDirectory, 'run-harness.mjs');

  await mkdir(scriptsDirectory, { recursive: true });
  await mkdir(e2eDirectory, { recursive: true });
  await writeFile(
    path.join(scriptsDirectory, 'verify-e2e-bundle.mjs'),
    `import { appendFileSync } from 'node:fs';
appendFileSync(process.env.E2E_HARNESS_EXECUTION_LOG, JSON.stringify({ phase: 'preflight' }) + '\\n');
if (${preflightStatus} !== 0) {
  process.stderr.write('The served card bundle is stale; rebuild and remount it.\\n');
  process.exit(${preflightStatus});
}
`
  );
  await writeFile(
    path.join(scriptsDirectory, 'playwright-stand-in.mjs'),
    `import { appendFileSync } from 'node:fs';
appendFileSync(
  process.env.E2E_HARNESS_EXECUTION_LOG,
  JSON.stringify({
    phase: 'playwright',
    arguments: process.argv.slice(2),
    preflight: process.env.${E2E_PREFLIGHT_ENVIRONMENT_VARIABLE},
  }) + '\\n'
);
`
  );
  await writeFile(
    path.join(e2eDirectory, 'package.json'),
    JSON.stringify({
      private: true,
      scripts: { test: 'node ../../scripts/playwright-stand-in.mjs' },
    })
  );
  await writeFile(
    harnessAdapter,
    `import { runE2ERuntimeHarness } from ${JSON.stringify(
      new URL('./e2e-runtime-harness.mjs', import.meta.url).href
    )};
process.exitCode = await runE2ERuntimeHarness({
  mode: 'attached',
  rootDirectory: process.env.E2E_HARNESS_FIXTURE_ROOT,
  playwrightArguments: process.argv.slice(2),
  environment: process.env,
});
`
  );

  return {
    executionLog,
    harnessAdapter,
    rootDirectory,
    async executions() {
      try {
        return (await readFile(executionLog, 'utf8'))
          .trim()
          .split('\n')
          .filter(Boolean)
          .map((line) => JSON.parse(line));
      } catch (error) {
        if (error?.code === 'ENOENT') return [];
        throw error;
      }
    },
  };
}

test('attached runs preflight before Playwright and forward targeted arguments', async (t) => {
  const runtime = await fixture();
  t.after(() => rm(runtime.rootDirectory, { recursive: true, force: true }));

  const status = await runE2ERuntimeHarness({
    mode: 'attached',
    rootDirectory: runtime.rootDirectory,
    playwrightArguments: ['specs/smoke.spec.ts', '--grep', 'camera profile'],
    environment: {
      ...process.env,
      E2E_HARNESS_EXECUTION_LOG: runtime.executionLog,
    },
  });

  assert.equal(status, 0);
  assert.deepEqual(await runtime.executions(), [
    { phase: 'preflight' },
    {
      phase: 'playwright',
      arguments: ['specs/smoke.spec.ts', '--grep', 'camera profile'],
      preflight: E2E_PREFLIGHT_COMPLETE,
    },
  ]);
});

test('attached runs stop before Playwright when bundle preflight fails', async (t) => {
  const runtime = await fixture({ preflightStatus: 23 });
  t.after(() => rm(runtime.rootDirectory, { recursive: true, force: true }));

  const result = spawnSync(process.execPath, [runtime.harnessAdapter, 'specs/smoke.spec.ts'], {
    encoding: 'utf8',
    env: {
      ...process.env,
      E2E_HARNESS_EXECUTION_LOG: runtime.executionLog,
      E2E_HARNESS_FIXTURE_ROOT: runtime.rootDirectory,
    },
  });

  assert.equal(result.status, 23);
  assert.match(result.stderr, /served card bundle is stale; rebuild and remount it/);
  assert.deepEqual(await runtime.executions(), [{ phase: 'preflight' }]);
});

test('attached, headed, and debug entry points adapt to the runtime harness', async () => {
  const packageJson = JSON.parse(
    await readFile(new URL('../package.json', import.meta.url), 'utf8')
  );

  assert.deepEqual(
    {
      attached: packageJson.scripts['test:ha'],
      headed: packageJson.scripts['test:ha:headed'],
      debug: packageJson.scripts['test:ha:debug'],
      managed: packageJson.scripts['test:e2e'],
    },
    {
      attached: 'node scripts/run-e2e-runtime-harness.mjs attached',
      headed: 'node scripts/run-e2e-runtime-harness.mjs attached --headed',
      debug: 'node scripts/run-e2e-runtime-harness.mjs attached --debug',
      managed: 'node scripts/run-e2e-runtime-harness.mjs managed',
    }
  );
});

async function managedFixture() {
  const rootDirectory = await mkdtemp(path.join(tmpdir(), 'growspace-managed-harness-'));
  const integrationDirectory = path.join(rootDirectory, 'integration');
  const workspaceDirectory = path.join(rootDirectory, 'workspace');
  const artifactDirectory = path.join(rootDirectory, '.artifacts', 'e2e-managed');
  const executionLog = path.join(rootDirectory, 'managed-execution.jsonl');
  const binDirectory = path.join(rootDirectory, 'bin');
  const paths = [
    path.join(integrationDirectory, 'custom_components', 'growspace_manager'),
    path.join(workspaceDirectory, 'ha-dev', 'packages'),
    path.join(rootDirectory, 'tests', 'e2e', 'ha-config'),
    path.join(rootDirectory, 'tests', 'e2e', 'fixtures'),
    path.join(rootDirectory, 'brand'),
    path.join(rootDirectory, 'scripts'),
    binDirectory,
  ];
  await Promise.all(paths.map((directory) => mkdir(directory, { recursive: true })));

  const files = new Map([
    [
      path.join(integrationDirectory, 'custom_components', 'growspace_manager', 'manifest.json'),
      '{}',
    ],
    [
      path.join(workspaceDirectory, 'ha-dev', 'packages', 'e2e_simulated_sensors.yaml'),
      'homeassistant:',
    ],
    [
      path.join(rootDirectory, 'tests', 'e2e', 'ha-config', 'ci-configuration.yaml'),
      'default_config:',
    ],
    [path.join(rootDirectory, 'brand', 'icon.png'), 'image'],
    [
      path.join(rootDirectory, 'tests', 'e2e', 'fixtures', 'e2e-entity-coverage.generated.json'),
      '{"profiles":[],"entities":[]}',
    ],
    [path.join(rootDirectory, 'tests', 'e2e', 'fixtures', 'e2e-setup.ts'), '// fixture'],
    [path.join(rootDirectory, 'package.json'), '{"type":"module"}'],
  ]);
  for (const [file, contents] of files) await writeFile(file, contents);

  const lifecycleProgram = `import { appendFileSync, writeFileSync } from 'node:fs';
appendFileSync(
  process.env.E2E_HARNESS_EXECUTION_LOG,
  JSON.stringify({
    phase: process.argv[2],
    baseUrl: process.env.HA_BASE_URL,
    envPath: process.env.GROWSPACE_E2E_ENV_PATH,
  }) + '\\n'
);
if (process.argv[2] === 'bootstrap') {
  writeFileSync(process.env.GROWSPACE_E2E_ENV_PATH, 'HA_ACCESS_TOKEN=fake\\n');
}
`;
  await writeFile(path.join(rootDirectory, 'scripts', 'ci-e2e-environment.mjs'), lifecycleProgram);
  await writeFile(
    path.join(rootDirectory, 'scripts', 'verify-e2e-bundle.mjs'),
    `import { appendFileSync } from 'node:fs';
appendFileSync(process.env.E2E_HARNESS_EXECUTION_LOG, JSON.stringify({
  phase: 'preflight',
  baseUrl: process.env.HA_BASE_URL,
}) + '\\n');
`
  );

  const standIn = `#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
const command = path.basename(process.argv[1]);
const args = process.argv.slice(2);
const record = (value) => fs.appendFileSync(
  process.env.E2E_HARNESS_EXECUTION_LOG,
  JSON.stringify({ command, args, ...value }) + '\\n'
);

if (command === 'npm' && args[0] === 'run' && args[1] === 'build') {
  record({ phase: 'build' });
  fs.mkdirSync(path.join(process.cwd(), 'dist'), { recursive: true });
  fs.writeFileSync(path.join(process.cwd(), 'dist', 'growspace-manager-card.js'), 'built');
} else if (command === 'npm' && args[0] === '--prefix') {
  record({
    phase: 'playwright',
    baseUrl: process.env.HA_BASE_URL,
    preflight: process.env.GROWSPACE_E2E_PREFLIGHT,
  });
  fs.mkdirSync(path.join(process.env.GROWSPACE_E2E_PLAYWRIGHT_OUTPUT_ROOT, 'test-results'), {
    recursive: true,
  });
  fs.writeFileSync(
    path.join(process.env.GROWSPACE_E2E_PLAYWRIGHT_OUTPUT_ROOT, 'test-results', 'result.txt'),
    'playwright evidence'
  );
  process.exit(Number(process.env.E2E_FAKE_PLAYWRIGHT_STATUS ?? 0));
} else if (command === 'docker' && args[0] === 'version') {
  record({ phase: 'docker-version' });
  console.log('2026.1');
} else if (command === 'docker' && args[0] === 'run' && args.includes('--entrypoint')) {
  record({ phase: 'runtime-permission-cleanup' });
} else if (command === 'docker' && args[0] === 'run') {
  record({ phase: 'docker-run' });
  console.log('fake-container-id');
} else if (command === 'docker' && args[0] === 'port') {
  record({ phase: 'docker-port' });
  console.log('127.0.0.1:49123');
} else if (command === 'docker' && args[0] === 'logs') {
  record({ phase: 'docker-logs' });
  console.log('home assistant evidence');
} else if (command === 'docker' && args[0] === 'rm') {
  record({ phase: 'docker-rm' });
  process.exit(Number(process.env.E2E_FAKE_CLEANUP_STATUS ?? 0));
} else if (command === 'npx') {
  record({ phase: 'compile' });
  const outDirectory = args[args.indexOf('--outDir') + 1];
  fs.mkdirSync(outDirectory, { recursive: true });
  fs.writeFileSync(
    path.join(outDirectory, 'e2e-setup.js'),
    "const fs = require('node:fs');\\n" +
      "fs.appendFileSync(process.env.E2E_HARNESS_EXECUTION_LOG, " +
      "JSON.stringify({ phase: 'seed', baseUrl: process.env.HA_BASE_URL }) + '\\\\n');\\n"
  );
} else {
  record({ phase: 'unexpected' });
  process.exit(91);
}
`;
  for (const command of ['npm', 'npx', 'docker']) {
    const executable = path.join(binDirectory, command);
    await writeFile(executable, standIn);
    await chmod(executable, 0o755);
  }

  return {
    artifactDirectory,
    executionLog,
    integrationDirectory,
    rootDirectory,
    workspaceDirectory,
    environment(overrides = {}) {
      return {
        ...process.env,
        PATH: `${binDirectory}${path.delimiter}${process.env.PATH}`,
        E2E_HARNESS_EXECUTION_LOG: executionLog,
        ...overrides,
      };
    },
    async executions() {
      return (await readFile(executionLog, 'utf8'))
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line));
    },
  };
}

test('managed runs own the full lifecycle and clean successful diagnostics', async (t) => {
  const runtime = await managedFixture();
  t.after(() => rm(runtime.rootDirectory, { recursive: true, force: true }));

  const status = await runE2ERuntimeHarness({
    mode: 'managed',
    rootDirectory: runtime.rootDirectory,
    playwrightArguments: ['specs/smoke.spec.ts', '--grep', 'renders'],
    environment: runtime.environment(),
    managedOptions: {
      integrationDirectory: runtime.integrationDirectory,
      workspaceDirectory: runtime.workspaceDirectory,
    },
  });

  assert.equal(status, 0);
  const executions = await runtime.executions();
  assert.deepEqual(
    executions.map((execution) => execution.phase),
    [
      'build',
      'docker-version',
      'docker-run',
      'docker-port',
      'bootstrap',
      'compile',
      'seed',
      'dashboards',
      'preflight',
      'playwright',
      'docker-rm',
      'runtime-permission-cleanup',
    ]
  );
  const dockerRun = executions.find((execution) => execution.phase === 'docker-run');
  assert.match(dockerRun.args[dockerRun.args.indexOf('--name') + 1], /^growspace-card-e2e-/);
  assert.equal(dockerRun.args[dockerRun.args.indexOf('--publish') + 1], '127.0.0.1::8123');
  const playwright = executions.find((execution) => execution.phase === 'playwright');
  assert.equal(playwright.baseUrl, 'http://127.0.0.1:49123');
  assert.equal(playwright.preflight, E2E_PREFLIGHT_COMPLETE);
  assert.deepEqual(playwright.args.slice(-3), ['specs/smoke.spec.ts', '--grep', 'renders']);
  await assert.rejects(readFile(runtime.artifactDirectory), { code: 'ENOENT' });
});

test('managed failures preserve evidence, clean up, and keep the primary status', async (t) => {
  const runtime = await managedFixture();
  t.after(() => rm(runtime.rootDirectory, { recursive: true, force: true }));

  const status = await runE2ERuntimeHarness({
    mode: 'managed',
    rootDirectory: runtime.rootDirectory,
    environment: runtime.environment({
      E2E_FAKE_PLAYWRIGHT_STATUS: '17',
      E2E_FAKE_CLEANUP_STATUS: '29',
    }),
    managedOptions: {
      integrationDirectory: runtime.integrationDirectory,
      workspaceDirectory: runtime.workspaceDirectory,
    },
  });

  assert.equal(status, 17);
  const phases = (await runtime.executions()).map((execution) => execution.phase);
  assert.deepEqual(phases.slice(-3), ['playwright', 'docker-logs', 'docker-rm']);
  assert.match(
    await readFile(path.join(runtime.artifactDirectory, 'home-assistant.log'), 'utf8'),
    /home assistant evidence/
  );
  assert.equal(
    await readFile(
      path.join(runtime.artifactDirectory, 'playwright', 'test-results', 'result.txt'),
      'utf8'
    ),
    'playwright evidence'
  );
  assert.match(
    await readFile(path.join(runtime.artifactDirectory, 'failure.txt'), 'utf8'),
    /exit code 17/
  );
});

test('managed cleanup failures fail an otherwise successful run', async (t) => {
  const runtime = await managedFixture();
  t.after(() => rm(runtime.rootDirectory, { recursive: true, force: true }));

  const status = await runE2ERuntimeHarness({
    mode: 'managed',
    rootDirectory: runtime.rootDirectory,
    environment: runtime.environment({ E2E_FAKE_CLEANUP_STATUS: '29' }),
    managedOptions: {
      integrationDirectory: runtime.integrationDirectory,
      workspaceDirectory: runtime.workspaceDirectory,
    },
  });

  assert.equal(status, 1);
  const phases = (await runtime.executions()).map((execution) => execution.phase);
  assert.equal(phases.at(-1), 'docker-rm');
  await assert.rejects(readFile(runtime.artifactDirectory), { code: 'ENOENT' });
});

test('managed runs validate checkout inputs before invoking Docker', async (t) => {
  const runtime = await managedFixture();
  t.after(() => rm(runtime.rootDirectory, { recursive: true, force: true }));
  await rm(
    path.join(runtime.workspaceDirectory, 'ha-dev', 'packages', 'e2e_simulated_sensors.yaml')
  );

  const status = await runE2ERuntimeHarness({
    mode: 'managed',
    rootDirectory: runtime.rootDirectory,
    environment: runtime.environment(),
    managedOptions: {
      integrationDirectory: runtime.integrationDirectory,
      workspaceDirectory: runtime.workspaceDirectory,
    },
  });

  assert.equal(status, 1);
  await assert.rejects(readFile(runtime.executionLog), { code: 'ENOENT' });
});
