/**
 * Grid slice — zod schemas for grid-domain API payloads.
 *
 * Moved from the monolithic `schemas/api-schema.ts`.  These are the authoritative
 * contracts for the grid portion of the Growspace API response.
 *
 * All schemas are private to the Grid slice unless re-exported here.
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Individual plant slot (the grid cell description returned by the backend)
// ---------------------------------------------------------------------------

const HarvestMetricsSchema = z.object({
  wet_weight: z.number().nullable().optional(),
  dry_weight: z.number().nullable().optional(),
  trim_weight: z.number().nullable().optional(),
  thc_percentage: z.number().nullable().optional(),
  cbd_percentage: z.number().nullable().optional(),
  terpene_profile: z.string().nullable().optional(),
});

const PhenotypeScoreSchema = z.object({
  vigor: z.number().nullable().optional(),
  internodal_spacing: z.number().nullable().optional(),
  terpene_intensity: z.number().nullable().optional(),
  resin: z.number().nullable().optional(),
  mold_resistance: z.number().nullable().optional(),
  yield_potential: z.number().nullable().optional(),
  keeper: z.boolean().optional(),
  notes: z.string().optional(),
  updated_at: z.string().nullable().optional(),
  total_score: z.number().nullable().optional(),
});

/**
 * The complete output of `PlantViewModelBuilder.build`. Every field accepts
 * omission for compatibility with older GSM releases, but unknown fields are
 * stripped so a producer addition becomes visible to the contract sweep.
 */
export const PlantSlotSchema = z
  .object({
    entity_id: z
      .string()
      .nullish()
      .transform((v) => v ?? ''),
    plant_id: z.string().optional().default(''),
    growspace_id: z.string().optional(),
    stage: z.string().optional().default('unknown'),
    strain: z.string().optional().default(''),
    // `Plant.phenotype` is a str property on the backend (the genetics
    // phenotype name, '' when unset). The former z.union([string, unknown])
    // inferred as `unknown` and hid that from every read site.
    // Accepts null defensively: hassCall throws on a parse failure, so one
    // legacy record with a null phenotype would blank every growspace rather
    // than one plant.
    phenotype: z
      .string()
      .nullish()
      .transform((v) => v ?? ''),
    row: z.number().optional().default(0),
    col: z.number().optional().default(0),
    position: z.string().optional().default(''),

    // Days in stage
    seedling_days: z.number().optional().default(0),
    mother_days: z.number().optional().default(0),
    clone_days: z.number().optional().default(0),
    veg_days: z.number().optional().default(0),
    flower_days: z.number().optional().default(0),
    dry_days: z.number().optional().default(0),
    cure_days: z.number().optional().default(0),

    last_watered: z.string().nullable().optional(),
    last_trained: z.string().nullable().optional(),
    last_training_technique: z.string().nullable().optional(),
    last_ipm: z.string().nullable().optional(),
    last_ipm_type: z.string().nullable().optional(),
    phi_clearance_date: z.string().nullable().optional(),
    phi_days_remaining: z.number().nullable().optional(),

    // Start dates
    seedling_start: z.string().nullable().optional().default(null),
    mother_start: z.string().nullable().optional().default(null),
    clone_start: z.string().nullable().optional().default(null),
    veg_start: z.string().nullable().optional().default(null),
    flower_start: z.string().nullable().optional().default(null),
    dry_start: z.string().nullable().optional().default(null),
    cure_start: z.string().nullable().optional().default(null),
    days_since_last_watering: z.number().nullable().optional().default(null),

    drying_weight: z.number().nullable().optional(),
    weight_lost_pct: z.number().nullable().optional(),
    days_to_target: z.number().nullable().optional(),
    visual_tag: z.string().nullable().optional(),
    drying_moisture: z.number().nullable().optional(),
    drying_ready_for_cure: z.boolean().optional(),

    harvest_metrics: HarvestMetricsSchema.optional(),
    phenotype_score: PhenotypeScoreSchema.optional(),
  })
  .nullable();

// ---------------------------------------------------------------------------
// Grid dimensions — physical size metadata for a growspace grid
// ---------------------------------------------------------------------------

export const GridDimensionsSchema = z
  .object({
    length: z.number().optional(),
    // The backend's default dimensions use `depth`, not `length`; the adapter
    // falls back to it when sizing the 3D view.
    depth: z.number().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
    unit: z.string().optional().default('cm'),
  })
  .optional();

// ---------------------------------------------------------------------------
// Grid API object — the `grid` key in a single growspace API response
// ---------------------------------------------------------------------------

export const GridApiSchema = z
  .object({
    rows: z.number().optional().default(3),
    plants_per_row: z.number().optional().default(3),
    total_plants: z.number().optional().default(0),
    dimensions: GridDimensionsSchema,
    grid: z
      .record(z.string(), PlantSlotSchema)
      .nullable()
      .optional()
      .transform((v) => v ?? {}),
  })
  .optional()
  .prefault({});

export type PlantSlot = z.infer<typeof PlantSlotSchema>;
export type GridApi = z.infer<typeof GridApiSchema>;
