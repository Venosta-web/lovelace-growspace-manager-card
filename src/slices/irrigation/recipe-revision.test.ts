import { GrowspaceAdapter } from '../../adapters/growspace-adapter';
import { GrowspaceAPIResponseSchema } from '../growspace/schema';
import { describe, expect, it } from 'vitest';
import {
  AppliedRecipeSchema,
  ApplyIrrigationRecipeResultSchema,
  IrrigationRecipeSchema,
} from './schema';

const schedule = { irrigation_times: [{ time: '08:00', duration: 10 }], irrigation_duration: 10 };
const applied = { id: 'r1', revision: 1, values: schedule };
const recipe = {
  id: 'r1',
  name: 'Morning',
  revision: 2,
  kind: 'schedule',
  provenance: {
    media_type: 'coco',
    liters_per_pot: 5,
    pump_flow_rate_ml_per_sec: 11,
    stage: 'flower',
    week: 3,
  },
  crop_steering: null,
  schedule,
  created_at: '2026-10-01T08:00:00Z',
};

describe('recipe revision wire contract', () => {
  it('retains revision and the zone-owned applied schedule values', () => {
    expect(IrrigationRecipeSchema.parse(recipe).revision).toBe(2);
    expect(AppliedRecipeSchema.parse(applied)).toEqual(applied);
    expect(
      ApplyIrrigationRecipeResultSchema.parse({
        growspace_id: 'g1',
        applied_recipe: applied,
        recipe_applied_at: null,
        warning: null,
      }).applied_recipe
    ).toEqual(applied);
  });
  it('rejects invalid revisions and malformed stamped values', () => {
    expect(IrrigationRecipeSchema.safeParse({ ...recipe, revision: 0 }).success).toBe(false);
    expect(AppliedRecipeSchema.safeParse({ ...applied, revision: 1.5 }).success).toBe(false);
    expect(AppliedRecipeSchema.safeParse({ ...applied, values: {} }).success).toBe(false);
  });
  it('keeps legacy recipes without revision readable', () => {
    const { revision: _revision, ...legacy } = recipe;
    expect(IrrigationRecipeSchema.safeParse(legacy).success).toBe(true);
  });
});

it('retains zone revision, drift and update facts through parsing and hydration', () => {
  const zone = {
    id: 'z1',
    name: '',
    applied_recipe: applied,
    recipe_updated: true,
    applied_recipe_drifted: false,
  };
  const parsed = GrowspaceAPIResponseSchema.parse({
    identity: { growspace_id: 'g1', name: 'Tent', type: 'normal' },
    grid: {},
    irrigation: { zones: [zone], recipes: { r1: recipe } },
  });
  const device = GrowspaceAdapter.transformGrowspace(null, parsed);
  expect(device?.irrigationZones).toEqual([zone]);
  expect(device?.irrigationRecipes?.[0].revision).toBe(2);
});
