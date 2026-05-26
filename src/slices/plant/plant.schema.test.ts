/**
 * Plant slice — schema validation tests.
 *
 * Each exported zod schema is exercised against a valid payload so that:
 *   1. The schema file is included in coverage (currently 0% statements).
 *   2. The contracts are regression-tested — any breaking change to a schema
 *      will fail here before it silently breaks a service call.
 */

import { describe, it, expect } from 'vitest';
import {
  AddPlantPayloadSchema,
  AddPlantsPayloadSchema,
  UpdatePlantPayloadSchema,
  RemovePlantPayloadSchema,
  HarvestPlantPayloadSchema,
  MovePlantPayloadSchema,
  SwapPlantsPayloadSchema,
  TakeClonePayloadSchema,
  WaterPlantPayloadSchema,
  PrintLabelPayloadSchema,
  UpdateHarvestMetricsPayloadSchema,
  ScorePlantPayloadSchema,
  LogDryingWeightPayloadSchema,
  LogMoistureReadingPayloadSchema,
  SetVisualTagPayloadSchema,
} from './schema';

// ---------------------------------------------------------------------------
// AddPlantPayloadSchema
// ---------------------------------------------------------------------------

describe('AddPlantPayloadSchema', () => {
  it('accepts a minimal valid payload', () => {
    const result = AddPlantPayloadSchema.safeParse({
      growspace_id: 'gs1',
      row: 0,
      col: 2,
      strain: 'AK47',
    });
    expect(result.success).toBe(true);
  });

  it('accepts optional date fields', () => {
    const result = AddPlantPayloadSchema.safeParse({
      growspace_id: 'gs1',
      row: 0,
      col: 0,
      strain: 'OG Kush',
      phenotype: 'P1',
      veg_start: '2026-01-01',
      flower_start: '2026-03-01',
      seedling_start: '2025-12-01',
      mother_start: '2025-11-01',
      clone_start: '2025-10-01',
      dry_start: '2026-04-01',
      cure_start: '2026-04-15',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a payload missing required fields', () => {
    const result = AddPlantPayloadSchema.safeParse({ growspace_id: 'gs1' });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// AddPlantsPayloadSchema
// ---------------------------------------------------------------------------

describe('AddPlantsPayloadSchema', () => {
  it('accepts a valid batch-add payload', () => {
    const result = AddPlantsPayloadSchema.safeParse({
      growspace_id: 'gs1',
      strain: 'Blue Dream',
      amount: 5,
    });
    expect(result.success).toBe(true);
  });

  it('accepts start_number and phenotype when provided', () => {
    const result = AddPlantsPayloadSchema.safeParse({
      growspace_id: 'gs1',
      strain: 'Blue Dream',
      amount: 5,
      start_number: 10,
      phenotype: 'P2',
    });
    expect(result.success).toBe(true);
  });

  it('rejects amount of zero', () => {
    const result = AddPlantsPayloadSchema.safeParse({
      growspace_id: 'gs1',
      strain: 'Blue Dream',
      amount: 0,
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// UpdatePlantPayloadSchema
// ---------------------------------------------------------------------------

describe('UpdatePlantPayloadSchema', () => {
  it('accepts a minimal update with just plant_id', () => {
    const result = UpdatePlantPayloadSchema.safeParse({ plant_id: 'abc' });
    expect(result.success).toBe(true);
  });

  it('accepts all optional update fields', () => {
    const result = UpdatePlantPayloadSchema.safeParse({
      plant_id: 'abc',
      strain: 'White Widow',
      phenotype: 'P3',
      row: 1,
      col: 2,
      growspace_id: 'gs2',
      veg_start: '2026-01-01',
    });
    expect(result.success).toBe(true);
  });

  it('passes through unknown keys (passthrough schema)', () => {
    const result = UpdatePlantPayloadSchema.safeParse({
      plant_id: 'abc',
      custom_field: 'extra',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as Record<string, unknown>).custom_field).toBe('extra');
    }
  });
});

// ---------------------------------------------------------------------------
// RemovePlantPayloadSchema
// ---------------------------------------------------------------------------

describe('RemovePlantPayloadSchema', () => {
  it('accepts a valid remove payload', () => {
    const result = RemovePlantPayloadSchema.safeParse({ plant_id: 'abc' });
    expect(result.success).toBe(true);
  });

  it('rejects a payload without plant_id', () => {
    const result = RemovePlantPayloadSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// HarvestPlantPayloadSchema
// ---------------------------------------------------------------------------

describe('HarvestPlantPayloadSchema', () => {
  it('accepts a minimal harvest payload', () => {
    const result = HarvestPlantPayloadSchema.safeParse({
      plant_id: 'abc',
      target_growspace_id: 'dry-room',
    });
    expect(result.success).toBe(true);
  });

  it('accepts all optional metric fields', () => {
    const result = HarvestPlantPayloadSchema.safeParse({
      plant_id: 'abc',
      target_growspace_id: 'dry-room',
      wet_weight: 100,
      dry_weight: 25,
      trim_weight: 5,
      thc_percentage: 22,
      cbd_percentage: 1,
      terpene_profile: 'earthy',
    });
    expect(result.success).toBe(true);
  });

  it('accepts null metric values', () => {
    const result = HarvestPlantPayloadSchema.safeParse({
      plant_id: 'abc',
      target_growspace_id: 'dry-room',
      wet_weight: null,
      dry_weight: null,
    });
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// MovePlantPayloadSchema
// ---------------------------------------------------------------------------

describe('MovePlantPayloadSchema', () => {
  it('accepts a minimal move payload', () => {
    const result = MovePlantPayloadSchema.safeParse({
      plant_id: 'abc',
      target_growspace_id: 'flower-room',
    });
    expect(result.success).toBe(true);
  });

  it('accepts an optional transition_date', () => {
    const result = MovePlantPayloadSchema.safeParse({
      plant_id: 'abc',
      target_growspace_id: 'flower-room',
      transition_date: '2026-06-01',
    });
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// SwapPlantsPayloadSchema
// ---------------------------------------------------------------------------

describe('SwapPlantsPayloadSchema', () => {
  it('accepts a valid swap payload', () => {
    const result = SwapPlantsPayloadSchema.safeParse({
      plant1_id: 'abc',
      plant2_id: 'xyz',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a payload missing one ID', () => {
    const result = SwapPlantsPayloadSchema.safeParse({ plant1_id: 'abc' });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// TakeClonePayloadSchema
// ---------------------------------------------------------------------------

describe('TakeClonePayloadSchema', () => {
  it('accepts a minimal clone payload', () => {
    const result = TakeClonePayloadSchema.safeParse({ mother_plant_id: 'mom' });
    expect(result.success).toBe(true);
  });

  it('accepts num_clones and target_growspace_id', () => {
    const result = TakeClonePayloadSchema.safeParse({
      mother_plant_id: 'mom',
      num_clones: 4,
      target_growspace_id: 'clone-room',
    });
    expect(result.success).toBe(true);
  });

  it('rejects num_clones of zero (must be positive)', () => {
    const result = TakeClonePayloadSchema.safeParse({
      mother_plant_id: 'mom',
      num_clones: 0,
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// WaterPlantPayloadSchema
// ---------------------------------------------------------------------------

describe('WaterPlantPayloadSchema', () => {
  it('accepts a minimal water payload', () => {
    const result = WaterPlantPayloadSchema.safeParse({ plant_id: 'abc', amount: 250 });
    expect(result.success).toBe(true);
  });

  it('accepts optional nutrients and preset_id', () => {
    const result = WaterPlantPayloadSchema.safeParse({
      plant_id: 'abc',
      amount: 300,
      nutrients: { 'cal-mag': 2.5 },
      preset_id: 'feed-week-4',
    });
    expect(result.success).toBe(true);
  });

  it('rejects amount of zero (must be positive)', () => {
    const result = WaterPlantPayloadSchema.safeParse({ plant_id: 'abc', amount: 0 });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// PrintLabelPayloadSchema
// ---------------------------------------------------------------------------

describe('PrintLabelPayloadSchema', () => {
  it('accepts an empty payload (all fields optional)', () => {
    const result = PrintLabelPayloadSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts a full label payload', () => {
    const result = PrintLabelPayloadSchema.safeParse({
      plant_id: 'abc',
      strain: 'AK47',
      phenotype: 'P1',
      breeder: 'Serious Seeds',
      lineage: 'Skunk x Afghani',
      breeder_logo: 'https://example.com/logo.png',
      device_id: 'printer-1',
      preview: true,
      base_url: 'http://homeassistant.local',
    });
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// UpdateHarvestMetricsPayloadSchema
// ---------------------------------------------------------------------------

describe('UpdateHarvestMetricsPayloadSchema', () => {
  it('accepts a minimal payload with just plant_id', () => {
    const result = UpdateHarvestMetricsPayloadSchema.safeParse({ plant_id: 'abc' });
    expect(result.success).toBe(true);
  });

  it('accepts all optional metric fields including nulls', () => {
    const result = UpdateHarvestMetricsPayloadSchema.safeParse({
      plant_id: 'abc',
      wet_weight: 100,
      dry_weight: null,
      trim_weight: 5,
      thc_percentage: null,
      cbd_percentage: 1,
      terpene_profile: 'citrus',
    });
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// ScorePlantPayloadSchema
// ---------------------------------------------------------------------------

describe('ScorePlantPayloadSchema', () => {
  it('accepts a minimal payload with just plant_id', () => {
    const result = ScorePlantPayloadSchema.safeParse({ plant_id: 'abc' });
    expect(result.success).toBe(true);
  });

  it('accepts all scoring fields', () => {
    const result = ScorePlantPayloadSchema.safeParse({
      plant_id: 'abc',
      vigor: 4,
      structure: 3,
      aroma: 5,
      resin: 4,
      pest_resistance: 3,
      internodal_spacing: 2,
      terpene_intensity: 5,
      mold_resistance: 4,
      yield_potential: 3,
      keeper: true,
      notes: 'Excellent resin production',
    });
    expect(result.success).toBe(true);
  });

  it('accepts null values for all scoring fields', () => {
    const result = ScorePlantPayloadSchema.safeParse({
      plant_id: 'abc',
      vigor: null,
      keeper: null,
      notes: null,
    });
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// LogDryingWeightPayloadSchema
// ---------------------------------------------------------------------------

describe('LogDryingWeightPayloadSchema', () => {
  it('accepts a valid drying weight payload', () => {
    const result = LogDryingWeightPayloadSchema.safeParse({
      plant_id: 'abc',
      weight_grams: 150.5,
    });
    expect(result.success).toBe(true);
  });

  it('accepts an optional date', () => {
    const result = LogDryingWeightPayloadSchema.safeParse({
      plant_id: 'abc',
      weight_grams: 150.5,
      date: '2026-05-20',
    });
    expect(result.success).toBe(true);
  });

  it('rejects weight_grams of zero (must be positive)', () => {
    const result = LogDryingWeightPayloadSchema.safeParse({
      plant_id: 'abc',
      weight_grams: 0,
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// LogMoistureReadingPayloadSchema
// ---------------------------------------------------------------------------

describe('LogMoistureReadingPayloadSchema', () => {
  it('accepts a valid moisture reading payload', () => {
    const result = LogMoistureReadingPayloadSchema.safeParse({
      plant_id: 'abc',
      moisture_percent: 65,
    });
    expect(result.success).toBe(true);
  });

  it('accepts boundary values (0 and 100)', () => {
    expect(LogMoistureReadingPayloadSchema.safeParse({ plant_id: 'abc', moisture_percent: 0 }).success).toBe(true);
    expect(LogMoistureReadingPayloadSchema.safeParse({ plant_id: 'abc', moisture_percent: 100 }).success).toBe(true);
  });

  it('rejects values outside 0–100', () => {
    expect(LogMoistureReadingPayloadSchema.safeParse({ plant_id: 'abc', moisture_percent: -1 }).success).toBe(false);
    expect(LogMoistureReadingPayloadSchema.safeParse({ plant_id: 'abc', moisture_percent: 101 }).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// SetVisualTagPayloadSchema
// ---------------------------------------------------------------------------

describe('SetVisualTagPayloadSchema', () => {
  it('accepts a valid visual tag payload', () => {
    const result = SetVisualTagPayloadSchema.safeParse({
      plant_id: 'abc',
      visual_tag: 'keeper',
    });
    expect(result.success).toBe(true);
  });

  it('accepts null to clear the tag', () => {
    const result = SetVisualTagPayloadSchema.safeParse({
      plant_id: 'abc',
      visual_tag: null,
    });
    expect(result.success).toBe(true);
  });
});
