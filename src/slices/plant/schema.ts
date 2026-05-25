/**
 * Plant slice — zod schemas for service call payloads.
 *
 * These schemas are the authoritative contracts for Plant-domain HA service
 * calls.  They replace the Plant-related schemas that lived in the monolithic
 * `schemas/api-schema.ts`.
 *
 * All schemas are private to the Plant slice unless re-exported here.
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

const plantIdPayload = z.object({ plant_id: z.string() });

const optionalDates = z.object({
  veg_start: z.string().optional(),
  flower_start: z.string().optional(),
  seedling_start: z.string().optional(),
  mother_start: z.string().optional(),
  clone_start: z.string().optional(),
  dry_start: z.string().optional(),
  cure_start: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Add plant
// ---------------------------------------------------------------------------

export const AddPlantPayloadSchema = z
  .object({
    growspace_id: z.string(),
    row: z.number().int(),
    col: z.number().int(),
    strain: z.string(),
    phenotype: z.string().optional(),
  })
  .merge(optionalDates);

export type AddPlantPayload = z.infer<typeof AddPlantPayloadSchema>;

// ---------------------------------------------------------------------------
// Batch add plants
// ---------------------------------------------------------------------------

export const AddPlantsPayloadSchema = z
  .object({
    growspace_id: z.string(),
    strain: z.string(),
    amount: z.number().int().positive(),
    start_number: z.number().int().optional(),
    phenotype: z.string().optional(),
  })
  .merge(optionalDates);

export type AddPlantsPayload = z.infer<typeof AddPlantsPayloadSchema>;

// ---------------------------------------------------------------------------
// Update plant
// ---------------------------------------------------------------------------

export const UpdatePlantPayloadSchema = plantIdPayload
  .extend({
    strain: z.string().optional(),
    phenotype: z.string().optional(),
    row: z.number().int().optional(),
    col: z.number().int().optional(),
    growspace_id: z.string().optional(),
  })
  .merge(optionalDates)
  .passthrough();

export type UpdatePlantPayload = z.infer<typeof UpdatePlantPayloadSchema>;

// ---------------------------------------------------------------------------
// Remove plant
// ---------------------------------------------------------------------------

export const RemovePlantPayloadSchema = plantIdPayload;
export type RemovePlantPayload = z.infer<typeof RemovePlantPayloadSchema>;

// ---------------------------------------------------------------------------
// Harvest plant
// ---------------------------------------------------------------------------

export const HarvestPlantPayloadSchema = plantIdPayload.extend({
  target_growspace_id: z.string(),
  wet_weight: z.number().nullable().optional(),
  dry_weight: z.number().nullable().optional(),
  trim_weight: z.number().nullable().optional(),
  thc_percentage: z.number().nullable().optional(),
  cbd_percentage: z.number().nullable().optional(),
  terpene_profile: z.string().nullable().optional(),
});

export type HarvestPlantPayload = z.infer<typeof HarvestPlantPayloadSchema>;

// ---------------------------------------------------------------------------
// Move plant / move clone
// ---------------------------------------------------------------------------

export const MovePlantPayloadSchema = plantIdPayload.extend({
  target_growspace_id: z.string(),
  transition_date: z.string().optional(),
});

export type MovePlantPayload = z.infer<typeof MovePlantPayloadSchema>;

// ---------------------------------------------------------------------------
// Swap plants
// ---------------------------------------------------------------------------

export const SwapPlantsPayloadSchema = z.object({
  plant1_id: z.string(),
  plant2_id: z.string(),
});

export type SwapPlantsPayload = z.infer<typeof SwapPlantsPayloadSchema>;

// ---------------------------------------------------------------------------
// Take clone
// ---------------------------------------------------------------------------

export const TakeClonePayloadSchema = z.object({
  mother_plant_id: z.string(),
  num_clones: z.number().int().positive().optional(),
  target_growspace_id: z.string().optional(),
});

export type TakeClonePayload = z.infer<typeof TakeClonePayloadSchema>;

// ---------------------------------------------------------------------------
// Water plant
// ---------------------------------------------------------------------------

export const WaterPlantPayloadSchema = plantIdPayload.extend({
  amount: z.number().positive(),
  nutrients: z.record(z.string(), z.number()).optional(),
  preset_id: z.string().optional(),
});

export type WaterPlantPayload = z.infer<typeof WaterPlantPayloadSchema>;

// ---------------------------------------------------------------------------
// Print label
// ---------------------------------------------------------------------------

export const PrintLabelPayloadSchema = z.object({
  plant_id: z.string().optional(),
  strain: z.string().optional(),
  phenotype: z.string().optional(),
  breeder: z.string().optional(),
  lineage: z.string().optional(),
  breeder_logo: z.string().optional(),
  device_id: z.string().optional(),
  preview: z.boolean().optional(),
  base_url: z.string().optional(),
});

export type PrintLabelPayload = z.infer<typeof PrintLabelPayloadSchema>;

// ---------------------------------------------------------------------------
// Update harvest metrics
// ---------------------------------------------------------------------------

export const UpdateHarvestMetricsPayloadSchema = plantIdPayload.extend({
  wet_weight: z.number().nullable().optional(),
  dry_weight: z.number().nullable().optional(),
  trim_weight: z.number().nullable().optional(),
  thc_percentage: z.number().nullable().optional(),
  cbd_percentage: z.number().nullable().optional(),
  terpene_profile: z.string().nullable().optional(),
});

export type UpdateHarvestMetricsPayload = z.infer<typeof UpdateHarvestMetricsPayloadSchema>;

// ---------------------------------------------------------------------------
// Score plant
// ---------------------------------------------------------------------------

export const ScorePlantPayloadSchema = plantIdPayload.extend({
  vigor: z.number().nullable().optional(),
  structure: z.number().nullable().optional(),
  aroma: z.number().nullable().optional(),
  resin: z.number().nullable().optional(),
  pest_resistance: z.number().nullable().optional(),
  internodal_spacing: z.number().nullable().optional(),
  terpene_intensity: z.number().nullable().optional(),
  mold_resistance: z.number().nullable().optional(),
  yield_potential: z.number().nullable().optional(),
  keeper: z.boolean().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export type ScorePlantPayload = z.infer<typeof ScorePlantPayloadSchema>;

// ---------------------------------------------------------------------------
// Log drying weight
// ---------------------------------------------------------------------------

export const LogDryingWeightPayloadSchema = plantIdPayload.extend({
  weight_grams: z.number().positive(),
  date: z.string().optional(),
});

export type LogDryingWeightPayload = z.infer<typeof LogDryingWeightPayloadSchema>;

// ---------------------------------------------------------------------------
// Log moisture reading
// ---------------------------------------------------------------------------

export const LogMoistureReadingPayloadSchema = plantIdPayload.extend({
  moisture_percent: z.number().min(0).max(100),
  date: z.string().optional(),
});

export type LogMoistureReadingPayload = z.infer<typeof LogMoistureReadingPayloadSchema>;

// ---------------------------------------------------------------------------
// Set visual tag
// ---------------------------------------------------------------------------

export const SetVisualTagPayloadSchema = plantIdPayload.extend({
  visual_tag: z.string().nullable(),
});

export type SetVisualTagPayload = z.infer<typeof SetVisualTagPayloadSchema>;
