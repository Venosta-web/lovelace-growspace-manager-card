/**
 * The card sends update_plant only fields Growspace Manager accepts (GSM#804).
 *
 * The backend refuses any other key by name, so a payload shape the card builds
 * with one extra field would fail every save. `update_plant_request_v1` is the
 * backend's own list, generated from its WebSocket schema; this holds the card's
 * schema and every payload builder to it. The contract-fixture job checks the
 * same thing against the copy on GSM's leading branch.
 */

import { describe, expect, it } from 'vitest';
import fixture from '../../../tests/fixtures/contract/update_plant_request_v1.json';
import { PlantUtils } from '../../utils/plant-utils';
import {
  UPDATE_PLANT_EDITABLE_FIELDS,
  UpdatePlantPayloadSchema,
  UpdatePlantRequestContractSchema,
} from './schema';

const contract = UpdatePlantRequestContractSchema.parse(fixture);

// Everything the plant overview dialog can hold, including fields that are on a
// plant but are not the grower's to edit. The mapper must leave those behind.
const EDITED_ATTRIBUTES: Record<string, unknown> = {
  strain: 'Blue Dream',
  phenotype: 'Keeper #2',
  row: '2',
  col: '3',
  growspace_id: 'veg_tent',
  stage: 'veg',
  seedling_start: '2026-08-01T09:00',
  mother_start: '',
  clone_start: null,
  veg_start: '2026-08-15T09:00',
  flower_start: '2026-09-01T18:30',
  dry_start: '',
  cure_start: '',
  stage_history: [{ stage: 'mother', start: '2026-08-01T09:00:00', end: null }],
  harvest_metrics: { wet_weight: 120 },
  phenotype_score: { vigor: 4 },
  notes: 'topped twice',
  position: 'A1',
  type: 'mother',
  days_in_stage: 12,
};

describe('update_plant request contract', () => {
  it('names the same fields the card can send', () => {
    expect(contract.required).toEqual(['plant_id']);
    expect([...UPDATE_PLANT_EDITABLE_FIELDS]).toEqual(contract.editable);
  });

  it('lets the card clear exactly the dates the backend clears', () => {
    const cleared = Object.fromEntries(contract.clearable_with_null.map((field) => [field, null]));

    expect(UpdatePlantPayloadSchema.safeParse({ plant_id: 'p1', ...cleared }).success).toBe(true);
    expect(UpdatePlantPayloadSchema.safeParse({ plant_id: 'p1', strain: null }).success).toBe(
      false
    );
  });

  it.each([
    ['one plant', false],
    ['a bulk edit', true],
  ])('maps the dialog for %s onto accepted fields only', (_label, isBulkEdit) => {
    const payload = PlantUtils.mapDialogToApiPayload(EDITED_ATTRIBUTES, isBulkEdit);

    for (const field of Object.keys(payload)) expect(contract.editable).toContain(field);
    expect(UpdatePlantPayloadSchema.safeParse({ plant_id: 'p1', ...payload }).success).toBe(true);
  });

  it('accepts the transplant and move payloads the card builds', () => {
    const transplant = { row: 1, col: 1, growspace_id: 'veg_tent', veg_start: '2026-09-20' };
    const move = { row: 2, col: 1 };

    for (const payload of [transplant, move]) {
      for (const field of Object.keys(payload)) expect(contract.editable).toContain(field);
      expect(UpdatePlantPayloadSchema.safeParse({ plant_id: 'p1', ...payload }).success).toBe(true);
    }
  });
});
