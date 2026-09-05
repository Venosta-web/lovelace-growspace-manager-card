import { readFile } from 'node:fs/promises';
import { z } from 'zod';
import { describe, expect, it } from 'vitest';
import {
  GetVisionHistoryV2ResponseSchema,
  GrowspaceAPIResponseSchema,
  TriggerVisionCheckupResponseSchema,
  VisionStatusSchema,
} from '../../src/schemas/api-schema';
import {
  diffContractKeys,
  formatContractDrift,
  type ContractVerdict,
} from '../../src/contract-fixture/key-set-diff';
import {
  CultureLinesResponseSchema,
  CultureMediaResponseSchema,
  MaintenanceHistoryResponseSchema,
  TcManifestSchema,
} from '../../src/slices/tc/schema';

interface FixtureContract {
  name: string;
  schema: z.ZodType;
  leadingVariable: string;
  releaseVariable: string;
  releaseRequired: boolean;
}

const VisionStatusFixtureSchema = z
  .object({
    ready: VisionStatusSchema,
    unavailable: VisionStatusSchema,
  })
  .strict();

const CONTRACTS: FixtureContract[] = [
  {
    name: 'growspace payload',
    schema: GrowspaceAPIResponseSchema,
    leadingVariable: 'GSM_MAIN_GROWSPACE_FIXTURE',
    releaseVariable: 'GSM_RELEASE_GROWSPACE_FIXTURE',
    releaseRequired: true,
  },
  {
    name: 'Vision status',
    schema: VisionStatusFixtureSchema,
    leadingVariable: 'GSM_PRERELEASE_VISION_STATUS_FIXTURE',
    releaseVariable: 'GSM_RELEASE_VISION_STATUS_FIXTURE',
    releaseRequired: false,
  },
  {
    name: 'Vision history',
    schema: GetVisionHistoryV2ResponseSchema,
    leadingVariable: 'GSM_PRERELEASE_VISION_HISTORY_FIXTURE',
    releaseVariable: 'GSM_RELEASE_VISION_HISTORY_FIXTURE',
    releaseRequired: false,
  },
  {
    name: 'Vision trigger response',
    schema: TriggerVisionCheckupResponseSchema,
    leadingVariable: 'GSM_PRERELEASE_VISION_TRIGGER_FIXTURE',
    releaseVariable: 'GSM_RELEASE_VISION_TRIGGER_FIXTURE',
    releaseRequired: false,
  },
  // Growspace Manager TC is a separate repository that owns its own WebSocket
  // contract and integrates on `main`. It has published no release yet, so
  // there is no installed card-facing shape to stay backward-safe with; the
  // release variable stays unset until it publishes one.
  {
    name: 'TC manifest',
    schema: TcManifestSchema,
    leadingVariable: 'TC_MAIN_MANIFEST_FIXTURE',
    releaseVariable: 'TC_RELEASE_MANIFEST_FIXTURE',
    releaseRequired: false,
  },
  {
    name: 'TC culture media',
    schema: CultureMediaResponseSchema,
    leadingVariable: 'TC_MAIN_CULTURE_MEDIA_FIXTURE',
    releaseVariable: 'TC_RELEASE_CULTURE_MEDIA_FIXTURE',
    releaseRequired: false,
  },
  {
    name: 'TC culture lines',
    schema: CultureLinesResponseSchema,
    leadingVariable: 'TC_MAIN_CULTURE_LINES_FIXTURE',
    releaseVariable: 'TC_RELEASE_CULTURE_LINES_FIXTURE',
    releaseRequired: false,
  },
  {
    name: 'TC maintenance history',
    schema: MaintenanceHistoryResponseSchema,
    leadingVariable: 'TC_MAIN_MAINTENANCE_FIXTURE',
    releaseVariable: 'TC_RELEASE_MAINTENANCE_FIXTURE',
    releaseRequired: false,
  },
];

async function readFixture(variable: string, required: boolean): Promise<unknown | null> {
  const path = process.env[variable];
  if (!path) {
    if (required) throw new Error(`${variable} must name a fetched GSM contract fixture`);
    return null;
  }
  try {
    return JSON.parse(await readFile(path, 'utf8')) as unknown;
  } catch (error) {
    if (!required && (error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

async function expectFixtureToMatch(
  contract: FixtureContract,
  variable: string,
  verdict: ContractVerdict,
  required: boolean
): Promise<void> {
  const fixture = await readFixture(variable, required);
  if (fixture === null) return;
  const parsed = contract.schema.safeParse(fixture);
  expect(parsed.success, `${contract.name}: ${parsed.error?.message}`).toBe(true);
  const drift = diffContractKeys(contract.schema, fixture, verdict);
  const diagnostic = drift.map(formatContractDrift).join('\n');
  expect(drift, `${contract.name}: ${diagnostic}`).toEqual([]);
}

describe('GSM contract fixtures', () => {
  it('checks prerelease completeness and released-backend safety', async () => {
    for (const contract of CONTRACTS) {
      await expectFixtureToMatch(contract, contract.leadingVariable, 'completeness', true);
      await expectFixtureToMatch(
        contract,
        contract.releaseVariable,
        'backward-safety',
        contract.releaseRequired
      );
    }
  });
});
