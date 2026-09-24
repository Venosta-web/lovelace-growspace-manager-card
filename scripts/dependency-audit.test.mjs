import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { advisoryLines, parseAudit, summaryTable, totalFindings } from './dependency-audit.mjs';

const counts = (high = 0, moderate = 0) => ({
  critical: 0,
  high,
  moderate,
  low: 0,
  info: 0,
  total: high + moderate,
});
const report = (high = 0, moderate = 0, vulnerabilities = {}) =>
  JSON.stringify({ metadata: { vulnerabilities: counts(high, moderate) }, vulnerabilities });

test('accepts npm audit exit 1 as findings and names the advisory', () => {
  const finding = {
    'example-package': {
      severity: 'high',
      range: '<1.2.3',
      via: [{ title: 'Unsafe parsing', url: 'https://example.com/advisory' }],
    },
  };
  const parsed = parseAudit(report(1, 0, finding), '', 1);
  assert.equal(totalFindings(parsed), 1);
  assert.match(
    advisoryLines(parsed.vulnerabilities)[0],
    /example-package \(high, <1\.2\.3\): Unsafe parsing/
  );
});

test('rejects registry errors instead of treating them as a clean tree', () => {
  assert.throws(
    () => parseAudit('{"error":{"summary":"registry unavailable"}}', '', 1),
    /registry unavailable/
  );
  assert.throws(() => parseAudit(report(), 'network failed', 2), /exited 2/);
  assert.throws(() => parseAudit('not json', 'network failed', 1), /did not return JSON/);
});

test('summary shows tooling findings separately from the shipped gate', () => {
  const shipped = parseAudit(report(), '', 0);
  const full = parseAudit(report(2, 1), '', 1);
  const table = summaryTable(shipped, full);
  assert.match(table, /\| high \| 0 \| 2 \| 2 \|/);
  assert.match(table, /\| \*\*Total\*\* \| \*\*0\*\* \| \*\*3\*\* \| \*\*3\*\* \|/);
});

test('CI script fails for shipped findings, but never for tooling findings', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'card-audit-'));
  try {
    const npm = join(dir, 'npm');
    const summary = join(dir, 'summary.md');
    await writeFile(
      npm,
      '#!/usr/bin/env node\n' +
        "const shipped = process.argv.includes('--omit=dev');\n" +
        "process.stdout.write(process.env[shipped ? 'FAKE_SHIPPED' : 'FAKE_FULL']);\n" +
        "process.exit(Number(process.env[shipped ? 'FAKE_SHIPPED_EXIT' : 'FAKE_FULL_EXIT']));\n",
      { mode: 0o755 }
    );
    const run = (shipped, shippedExit, full, fullExit) =>
      spawnSync(
        process.execPath,
        [new URL('./check-dependency-audit.mjs', import.meta.url).pathname],
        {
          encoding: 'utf8',
          env: {
            ...process.env,
            PATH: `${dir}:${process.env.PATH}`,
            GITHUB_STEP_SUMMARY: summary,
            FAKE_SHIPPED: shipped,
            FAKE_SHIPPED_EXIT: String(shippedExit),
            FAKE_FULL: full,
            FAKE_FULL_EXIT: String(fullExit),
          },
        }
      );

    const clean = run(report(), 0, report(1), 1);
    assert.equal(clean.status, 0, clean.stderr);
    assert.match(await readFile(summary, 'utf8'), /\| high \| 0 \| 1 \| 1 \|/);

    const toolingRegistryFailure = run(
      report(),
      0,
      '{"error":{"summary":"tooling registry unavailable"}}',
      1
    );
    assert.equal(toolingRegistryFailure.status, 0, toolingRegistryFailure.stderr);
    assert.match(toolingRegistryFailure.stdout, /Full-tree audit could not be reported/);

    const finding = {
      vulnerable: {
        severity: 'high',
        range: '<2',
        via: [{ title: 'Bad input', url: 'https://example.com/advisory' }],
      },
    };
    const vulnerable = run(report(1, 0, finding), 1, report(1, 0, finding), 1);
    assert.equal(vulnerable.status, 1);
    assert.match(
      vulnerable.stderr,
      /::error title=Shipped dependency advisory::vulnerable .*Bad input/
    );

    const registryFailure = run('{"error":{"summary":"registry unavailable"}}', 1, report(), 0);
    assert.equal(registryFailure.status, 1);
    assert.match(registryFailure.stderr, /registry unavailable/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
