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

/**
 * A phenotype row as `StrainLibrary._load()` assembles it. None values are
 * filtered out before the payload is built, so every field is optional rather
 * than nullable.
 *
 * `images` and `harvests` are Opaque Regions (ADR 0031): open-ended,
 * user-driven collections whose rows stay unvalidated so one malformed entry
 * cannot fail the whole library parse.
 */
export const StrainPhenotypeSchema = z.object({
  phenotype_id: z.number().optional(),
  description: z
    .string()
    .nullish()
    .transform((v) => v ?? undefined),
  image_path: z
    .string()
    .nullish()
    .transform((v) => v ?? undefined),
  image_crop_meta: z
    .unknown()
    .nullish()
    .transform((v) => v ?? undefined),
  images: z.array(z.unknown()).optional(),
  flower_days_min: z
    .number()
    .nullish()
    .transform((v) => v ?? undefined),
  flower_days_max: z
    .number()
    .nullish()
    .transform((v) => v ?? undefined),
  harvests: z.array(z.unknown()).optional(),
});

export const StrainDataSchema = z.object({
  meta: z
    .object({
      breeder: z
        .string()
        .nullish()
        .transform((v) => v ?? undefined),
      breeder_logo: z
        .string()
        .nullish()
        .transform((v) => v ?? undefined),
      type: z
        .string()
        .nullish()
        .transform((v) => v ?? undefined),
      lineage: z
        .string()
        .nullish()
        .transform((v) => v ?? undefined),
      lineage_tree: z
        .array(z.object({ name: z.string(), source: z.string(), phenotype: z.string().optional() }))
        .optional(),
      sex: z
        .string()
        .nullish()
        .transform((v) => v ?? undefined),
      sativa_percentage: z
        .number()
        .nullish()
        .transform((v) => v ?? undefined),
      indica_percentage: z
        .number()
        .nullish()
        .transform((v) => v ?? undefined),
      is_stub: z.boolean().optional(),
      // Remaining columns of the `strains` table, emitted with every entry.
      // The card builds its StrainEntry from the fields above and reads none
      // of these off this payload, but the backend sends them.
      generation: z.string().optional(),
      yield_potential: z.string().optional(),
      height: z.string().optional(),
      // REAL columns, but SQLite is dynamically typed and `import_library`
      // writes raw JSON straight through `add_strain`, bypassing the service
      // schema's vol.Coerce(float). The card reads none of these off this
      // payload, so accept either rather than fail the whole library parse on
      // one imported strain with a string THC.
      thc: z.union([z.number(), z.string()]).optional(),
      cbd: z.union([z.number(), z.string()]).optional(),
      cbg: z.union([z.number(), z.string()]).optional(),
      description: z
        .string()
        .nullish()
        .transform((v) => v ?? undefined),
      // Stored as TEXT and JSON-decoded on read, so their parsed shape is
      // whatever was imported. Declared as unknown rather than guessed at:
      // hassCall throws on a parse failure, and a wrong guess here would
      // fail the whole library rather than one strain.
      awards: z.unknown().optional(),
      effects: z.unknown().optional(),
      aroma: z.unknown().optional(),
      taste: z.unknown().optional(),
    })
    .optional()
    // `.prefault` rather than `.default`: the meta fields transform null to
    // undefined, so the output type carries them as present-but-undefined and
    // an output-side default of {} no longer satisfies it.
    .prefault({}),
  phenotypes: z.record(z.string(), StrainPhenotypeSchema).optional().default({}),
});

export const StrainLibrarySchema = z.record(z.string(), StrainDataSchema);

export const StrainLibraryWrapperSchema = z.object({
  strains: StrainLibrarySchema,
  strain_list: z.array(z.string()).optional(),
});

export type StrainLibraryResponse = z.infer<typeof StrainLibraryWrapperSchema>;
export type StrainLibrary = z.infer<typeof StrainLibrarySchema>;
