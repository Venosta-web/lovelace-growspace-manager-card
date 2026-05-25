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

export const PlantSlotSchema = z
  .object({
    entity_id: z.string().optional().default(''),
    plant_id: z.string().optional().default(''),
    stage: z.string().optional().default('unknown'),
    strain: z.string().optional().default(''),
    phenotype: z.union([z.string(), z.unknown()]).optional().default(''),
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

    last_ipm: z.string().nullable().optional().default(null),
    last_ipm_type: z.string().nullable().optional().default(null),
    phi_clearance_date: z.string().nullable().optional().default(null),
    phi_days_remaining: z.number().nullable().optional().default(null),

    // Start dates
    seedling_start: z.string().nullable().optional().default(null),
    mother_start: z.string().nullable().optional().default(null),
    clone_start: z.string().nullable().optional().default(null),
    veg_start: z.string().nullable().optional().default(null),
    flower_start: z.string().nullable().optional().default(null),
    dry_start: z.string().nullable().optional().default(null),
    cure_start: z.string().nullable().optional().default(null),
  })
  .catchall(z.unknown())
  .nullable();

// ---------------------------------------------------------------------------
// Grid dimensions — physical size metadata for a growspace grid
// ---------------------------------------------------------------------------

export const GridDimensionsSchema = z
  .object({
    length: z.number().optional(),
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
  .default({});

export type PlantSlot = z.infer<typeof PlantSlotSchema>;
export type GridApi = z.infer<typeof GridApiSchema>;
