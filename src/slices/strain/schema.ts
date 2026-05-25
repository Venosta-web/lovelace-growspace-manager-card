/**
 * Strain slice — zod schemas for WebSocket and service-call response validation.
 *
 * Mirrors the strain-related schemas from `schemas/api-schema.ts` and adds
 * typed output shapes for each WS command.
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Raw response shapes (WS: growspace_manager/get_strain_library)
// ---------------------------------------------------------------------------

export const StrainPhenotypeSchema = z
  .object({
    description: z.string().optional(),
    image_path: z.string().optional(),
    image_crop_meta: z.unknown().optional(),
    images: z.array(z.unknown()).optional(),
    flower_days_min: z.number().optional(),
    flower_days_max: z.number().optional(),
  })
  .passthrough();

export const StrainDataSchema = z
  .object({
    meta: z
      .object({
        breeder: z.string().optional(),
        breeder_logo: z.string().optional(),
        type: z.string().optional(),
        lineage: z.string().optional(),
        lineage_tree: z
          .array(z.object({ name: z.string(), source: z.string(), phenotype: z.string().optional() }))
          .optional(),
        sex: z.string().optional(),
        sativa_percentage: z.number().optional(),
        indica_percentage: z.number().optional(),
        is_stub: z.boolean().optional(),
      })
      .optional()
      .default({}),
    phenotypes: z.record(z.string(), StrainPhenotypeSchema).optional().default({}),
  })
  .passthrough();

export const StrainLibrarySchema = z.record(z.string(), StrainDataSchema);

export const StrainLibraryWrapperSchema = z.object({
  strains: StrainLibrarySchema,
  strain_list: z.array(z.string()).optional(),
});

export type StrainLibraryResponse = z.infer<typeof StrainLibraryWrapperSchema>;
export type StrainLibrary = z.infer<typeof StrainLibrarySchema>;
