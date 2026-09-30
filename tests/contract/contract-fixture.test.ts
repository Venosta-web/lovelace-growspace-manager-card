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
import { ActiveRunSensorSchema, ListGrowRunsResultSchema } from '../../src/slices/grow-run/schema';
import { GetGrowRunResultSchema } from '../../src/slices/grow-run/details-schema';
import {
  FinalizeGrowRunResultSchema,
  PreviewFinalizationResultSchema,
} from '../../src/slices/grow-run/finalization-schema';
import {
  PreviewGrowRunStartResultSchema,
  StartGrowRunResultSchema,
} from '../../src/slices/grow-run/start-schema';
import {
  CompleteGrowRunResultSchema,
  PreviewCompletionResultSchema,
} from '../../src/slices/grow-run/completion-schema';
import { ExportGrowRunResultSchema } from '../../src/slices/grow-run/export-schema';
import { CompareGrowRunsResultSchema } from '../../src/slices/grow-run/view-schema';
import {
  DiscardGrowRunResultSchema,
  ReopenGrowRunResultSchema,
} from '../../src/slices/grow-run/correction-schema';

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

// The fixture carries the sensor both ways: with an Active Run and without.
const ActiveRunSensorFixtureSchema = z
  .object({
    active: ActiveRunSensorSchema,
    none: ActiveRunSensorSchema,
  })
  .strict();

// A backdated start's preview both ways: one that may start, one in conflict.
const StartPreviewFixtureSchema = z
  .object({
    clear: PreviewGrowRunStartResultSchema,
    conflict: PreviewGrowRunStartResultSchema,
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
  // The Active Run Sensor and start_grow_run's two outcomes (GSM#668): the run
  // chip's read side and its one command. Prerelease-first like the above.
  {
    name: 'Active Run Sensor',
    schema: ActiveRunSensorFixtureSchema,
    leadingVariable: 'GSM_PRERELEASE_ACTIVE_RUN_SENSOR_FIXTURE',
    releaseVariable: 'GSM_RELEASE_ACTIVE_RUN_SENSOR_FIXTURE',
    releaseRequired: false,
  },
  {
    name: 'Grow Run started',
    schema: StartGrowRunResultSchema,
    leadingVariable: 'GSM_PRERELEASE_GROW_RUN_STARTED_FIXTURE',
    releaseVariable: 'GSM_RELEASE_GROW_RUN_STARTED_FIXTURE',
    releaseRequired: false,
  },
  {
    name: 'Grow Run refused',
    schema: StartGrowRunResultSchema,
    leadingVariable: 'GSM_PRERELEASE_GROW_RUN_REFUSED_FIXTURE',
    releaseVariable: 'GSM_RELEASE_GROW_RUN_REFUSED_FIXTURE',
    releaseRequired: false,
  },
  {
    name: 'Grow Run details',
    schema: GetGrowRunResultSchema,
    leadingVariable: 'GSM_PRERELEASE_GROW_RUN_DETAILS_FIXTURE',
    releaseVariable: 'GSM_RELEASE_GROW_RUN_DETAILS_FIXTURE',
    releaseRequired: false,
  },
  // Starting a Run on an earlier day (GSM#670).
  {
    name: 'Grow Run start preview',
    schema: StartPreviewFixtureSchema,
    leadingVariable: 'GSM_PRERELEASE_GROW_RUN_START_PREVIEW_FIXTURE',
    releaseVariable: 'GSM_RELEASE_GROW_RUN_START_PREVIEW_FIXTURE',
    releaseRequired: false,
  },
  {
    name: 'Grow Run beyond retention',
    schema: StartGrowRunResultSchema,
    leadingVariable: 'GSM_PRERELEASE_GROW_RUN_BEYOND_RETENTION_FIXTURE',
    releaseVariable: 'GSM_RELEASE_GROW_RUN_BEYOND_RETENTION_FIXTURE',
    releaseRequired: false,
  },
  // Completing a Run (GSM#671): the preview, both outcomes of the command, and
  // a Completed Run's details with its Pending metrics.
  {
    name: 'Grow Run completion preview',
    schema: PreviewCompletionResultSchema,
    leadingVariable: 'GSM_PRERELEASE_GROW_RUN_COMPLETION_PREVIEW_FIXTURE',
    releaseVariable: 'GSM_RELEASE_GROW_RUN_COMPLETION_PREVIEW_FIXTURE',
    releaseRequired: false,
  },
  {
    name: 'Grow Run completed',
    schema: CompleteGrowRunResultSchema,
    leadingVariable: 'GSM_PRERELEASE_GROW_RUN_COMPLETED_FIXTURE',
    releaseVariable: 'GSM_RELEASE_GROW_RUN_COMPLETED_FIXTURE',
    releaseRequired: false,
  },
  {
    name: 'Grow Run completion refused',
    schema: CompleteGrowRunResultSchema,
    leadingVariable: 'GSM_PRERELEASE_GROW_RUN_COMPLETION_REFUSED_FIXTURE',
    releaseVariable: 'GSM_RELEASE_GROW_RUN_COMPLETION_REFUSED_FIXTURE',
    releaseRequired: false,
  },
  {
    name: 'Completed Grow Run details',
    schema: GetGrowRunResultSchema,
    leadingVariable: 'GSM_PRERELEASE_GROW_RUN_COMPLETED_DETAILS_FIXTURE',
    releaseVariable: 'GSM_RELEASE_GROW_RUN_COMPLETED_DETAILS_FIXTURE',
    releaseRequired: false,
  },
  // Finalizing a Run (GSM#673): the snapshot preview, both outcomes of the
  // command, a Finalized Run's details, and the Run list the chip reads.
  {
    name: 'Grow Run finalization preview',
    schema: PreviewFinalizationResultSchema,
    leadingVariable: 'GSM_PRERELEASE_GROW_RUN_FINALIZATION_PREVIEW_FIXTURE',
    releaseVariable: 'GSM_RELEASE_GROW_RUN_FINALIZATION_PREVIEW_FIXTURE',
    releaseRequired: false,
  },
  {
    name: 'Grow Run finalized',
    schema: FinalizeGrowRunResultSchema,
    leadingVariable: 'GSM_PRERELEASE_GROW_RUN_FINALIZED_FIXTURE',
    releaseVariable: 'GSM_RELEASE_GROW_RUN_FINALIZED_FIXTURE',
    releaseRequired: false,
  },
  {
    name: 'Grow Run finalization refused',
    schema: FinalizeGrowRunResultSchema,
    leadingVariable: 'GSM_PRERELEASE_GROW_RUN_FINALIZATION_REFUSED_FIXTURE',
    releaseVariable: 'GSM_RELEASE_GROW_RUN_FINALIZATION_REFUSED_FIXTURE',
    releaseRequired: false,
  },
  {
    name: 'Finalized Grow Run details',
    schema: GetGrowRunResultSchema,
    leadingVariable: 'GSM_PRERELEASE_GROW_RUN_FINALIZED_DETAILS_FIXTURE',
    releaseVariable: 'GSM_RELEASE_GROW_RUN_FINALIZED_DETAILS_FIXTURE',
    releaseRequired: false,
  },
  {
    name: 'Finalized Grow Run export',
    schema: ExportGrowRunResultSchema,
    leadingVariable: 'GSM_PRERELEASE_GROW_RUN_EXPORTED_FIXTURE',
    releaseVariable: 'GSM_RELEASE_GROW_RUN_EXPORTED_FIXTURE',
    releaseRequired: false,
  },
  {
    name: 'Grow Run list',
    schema: ListGrowRunsResultSchema,
    leadingVariable: 'GSM_PRERELEASE_GROW_RUN_LIST_FIXTURE',
    releaseVariable: 'GSM_RELEASE_GROW_RUN_LIST_FIXTURE',
    releaseRequired: false,
  },
  // Comparing two Finalized Runs (GSM#675): the Grow Run View's Compare tab.
  {
    name: 'Grow Run comparison',
    schema: CompareGrowRunsResultSchema,
    leadingVariable: 'GSM_PRERELEASE_GROW_RUN_COMPARISON_FIXTURE',
    releaseVariable: 'GSM_RELEASE_GROW_RUN_COMPARISON_FIXTURE',
    releaseRequired: false,
  },
  {
    name: 'Grow Run comparison refused',
    schema: CompareGrowRunsResultSchema,
    leadingVariable: 'GSM_PRERELEASE_GROW_RUN_COMPARISON_REFUSED_FIXTURE',
    releaseVariable: 'GSM_RELEASE_GROW_RUN_COMPARISON_REFUSED_FIXTURE',
    releaseRequired: false,
  },
  // Correcting a Run (GSM#917): reopening, a superseded snapshot, discarding.
  {
    name: 'Grow Run reopened',
    schema: ReopenGrowRunResultSchema,
    leadingVariable: 'GSM_PRERELEASE_GROW_RUN_REOPENED_FIXTURE',
    releaseVariable: 'GSM_RELEASE_GROW_RUN_REOPENED_FIXTURE',
    releaseRequired: false,
  },
  {
    name: 'Grow Run reopen refused',
    schema: ReopenGrowRunResultSchema,
    leadingVariable: 'GSM_PRERELEASE_GROW_RUN_REOPEN_REFUSED_FIXTURE',
    releaseVariable: 'GSM_RELEASE_GROW_RUN_REOPEN_REFUSED_FIXTURE',
    releaseRequired: false,
  },
  {
    name: 'Finalized-again Grow Run details',
    schema: GetGrowRunResultSchema,
    leadingVariable: 'GSM_PRERELEASE_GROW_RUN_REFINALIZED_DETAILS_FIXTURE',
    releaseVariable: 'GSM_RELEASE_GROW_RUN_REFINALIZED_DETAILS_FIXTURE',
    releaseRequired: false,
  },
  {
    name: 'Grow Run discarded',
    schema: DiscardGrowRunResultSchema,
    leadingVariable: 'GSM_PRERELEASE_GROW_RUN_DISCARDED_FIXTURE',
    releaseVariable: 'GSM_RELEASE_GROW_RUN_DISCARDED_FIXTURE',
    releaseRequired: false,
  },
  {
    name: 'Grow Run discard refused',
    schema: DiscardGrowRunResultSchema,
    leadingVariable: 'GSM_PRERELEASE_GROW_RUN_DISCARD_REFUSED_FIXTURE',
    releaseVariable: 'GSM_RELEASE_GROW_RUN_DISCARD_REFUSED_FIXTURE',
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
