import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
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
process.exitCode = runE2ERuntimeHarness({
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

  const status = runE2ERuntimeHarness({
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
    },
    {
      attached: 'node scripts/run-e2e-runtime-harness.mjs attached',
      headed: 'node scripts/run-e2e-runtime-harness.mjs attached --headed',
      debug: 'node scripts/run-e2e-runtime-harness.mjs attached --debug',
    }
  );
});
