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
  PairingsResponseSchema,
} from '../../src/slices/tc/schema';
import {
  FactoryTemplatePreviewSchema,
  LabelTemplateCapabilitySchema,
} from '../../src/slices/labels/schema';
import {
  UPDATE_PLANT_EDITABLE_FIELDS,
  UpdatePlantRequestContractSchema,
} from '../../src/slices/plant/schema';
import { IrrigationControllerSchema } from '../../src/slices/safety/schema';

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
    name: 'TC pairings',
    schema: PairingsResponseSchema,
    leadingVariable: 'TC_MAIN_PAIRINGS_FIXTURE',
    releaseVariable: 'TC_RELEASE_PAIRINGS_FIXTURE',
    releaseRequired: false,
  },
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
  // The Label Template capability and its one read-only preview. Both land on
  // `prerelease` first and reach a release tag later, so the release copy is
  // optional: a card that required it could not merge until the backend
  // published, which is the ordering ADR 0029 exists to avoid inverting.
  {
    name: 'Label Template capability',
    schema: LabelTemplateCapabilitySchema,
    leadingVariable: 'GSM_PRERELEASE_LABEL_CAPABILITY_FIXTURE',
    releaseVariable: 'GSM_RELEASE_LABEL_CAPABILITY_FIXTURE',
    releaseRequired: false,
  },
  {
    name: 'Factory Template preview',
    schema: FactoryTemplatePreviewSchema,
    leadingVariable: 'GSM_PRERELEASE_LABEL_PREVIEW_FIXTURE',
    releaseVariable: 'GSM_RELEASE_LABEL_PREVIEW_FIXTURE',
    releaseRequired: false,
  },
  {
    name: 'Factory Template preview refusal',
    schema: FactoryTemplatePreviewSchema,
    leadingVariable: 'GSM_PRERELEASE_LABEL_REFUSAL_FIXTURE',
    releaseVariable: 'GSM_RELEASE_LABEL_REFUSAL_FIXTURE',
    releaseRequired: false,
  },
  // A request rather than a response: the fields update_plant accepts. The key
  // diff keeps its shape honest; the check below holds the card to its values.
  {
    name: 'update_plant request',
    schema: UpdatePlantRequestContractSchema,
    leadingVariable: 'GSM_PRERELEASE_UPDATE_PLANT_REQUEST_FIXTURE',
    releaseVariable: 'GSM_RELEASE_UPDATE_PLANT_REQUEST_FIXTURE',
    releaseRequired: false,
  },
  // The irrigation controller sensor's state and attributes (GSM#783): the
  // safety chip's whole read side. Prerelease-first like the label contracts.
  {
    name: 'Irrigation controller',
    schema: IrrigationControllerSchema,
    leadingVariable: 'GSM_PRERELEASE_IRRIGATION_CONTROLLER_FIXTURE',
    releaseVariable: 'GSM_RELEASE_IRRIGATION_CONTROLLER_FIXTURE',
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

describe('update_plant request', () => {
  it('sends only fields the leading backend accepts', async () => {
    const fixture = await readFixture('GSM_PRERELEASE_UPDATE_PLANT_REQUEST_FIXTURE', true);
    const { editable } = UpdatePlantRequestContractSchema.parse(fixture);

    const refused = UPDATE_PLANT_EDITABLE_FIELDS.filter((field) => !editable.includes(field));
    expect(refused, `the backend refuses: ${refused.join(', ')}`).toEqual([]);
  });
});
