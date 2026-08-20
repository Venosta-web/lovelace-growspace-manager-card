import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { GrowspaceAPIResponseSchema } from '../../src/slices/growspace/schema';
import {
  diffContractKeys,
  formatContractDrift,
  type ContractVerdict,
} from '../../src/contract-fixture/key-set-diff';

async function readFixture(variable: string): Promise<unknown> {
  const path = process.env[variable];
  if (!path) throw new Error(`${variable} must name a fetched GSM contract fixture`);
  return JSON.parse(await readFile(path, 'utf8')) as unknown;
}

async function expectFixtureToMatch(variable: string, verdict: ContractVerdict): Promise<void> {
  const fixture = await readFixture(variable);
  const parsed = GrowspaceAPIResponseSchema.safeParse(fixture);
  expect(parsed.success, parsed.error?.message).toBe(true);
  const drift = diffContractKeys(GrowspaceAPIResponseSchema, fixture, verdict);
  const diagnostic = drift.map(formatContractDrift).join('\n');
  expect(drift, diagnostic).toEqual([]);
}

describe('GSM contract fixtures', () => {
  it('checks prerelease completeness and latest-release backward safety', async () => {
    await expectFixtureToMatch('GSM_PRERELEASE_FIXTURE', 'completeness');
    await expectFixtureToMatch('GSM_RELEASE_FIXTURE', 'backward-safety');
  });
});
