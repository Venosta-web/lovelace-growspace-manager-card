import { describe, expect, it } from 'vitest';
import { PlantSlotSchema } from './schema';

describe('PlantSlotSchema', () => {
  it('round-trips every field emitted by PlantViewModelBuilder', () => {
    const payload = {
      plant_id: 'plant-1',
      growspace_id: 'growspace-1',
      entity_id: 'sensor.plant_1',
      strain: 'Northern Lights',
      phenotype: 'Pine',
      seedling_days: 1,
      mother_days: 2,
      clone_days: 3,
      veg_days: 4,
      flower_days: 5,
      dry_days: 6,
      cure_days: 7,
      seedling_start: '2026-01-01',
      mother_start: null,
      clone_start: null,
      veg_start: '2026-01-08',
      flower_start: '2026-02-01',
      dry_start: null,
      cure_start: null,
      last_watered: '2026-02-10',
      last_trained: '2026-02-09',
      last_ipm: '2026-02-08',
      row: 1,
      col: 2,
      position: 'Row 1, Plant 2',
      stage: 'flower',
      last_training_technique: 'topping',
      last_ipm_type: 'spray',
      days_since_last_watering: 1,
      drying_weight: null,
      weight_lost_pct: null,
      days_to_target: null,
      visual_tag: null,
      drying_moisture: null,
      drying_ready_for_cure: false,
      phi_clearance_date: '2026-02-12',
      phi_days_remaining: 2,
      harvest_metrics: {
        wet_weight: null,
        dry_weight: null,
        trim_weight: null,
        thc_percentage: null,
        cbd_percentage: null,
        terpene_profile: null,
      },
      phenotype_score: {
        vigor: 8,
        internodal_spacing: null,
        terpene_intensity: null,
        resin: null,
        mold_resistance: null,
        yield_potential: null,
        keeper: true,
        notes: 'Strong candidate',
        updated_at: '2026-02-10T12:00:00+00:00',
        total_score: 8,
      },
    };

    expect(PlantSlotSchema.parse(payload)).toEqual(payload);
  });

  it('strips undeclared fields instead of reopening the wire shape', () => {
    expect(PlantSlotSchema.parse({ plant_id: 'plant-1', undeclared: true })).not.toHaveProperty(
      'undeclared'
    );
  });
});
