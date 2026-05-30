import { z } from 'zod';
import {
  GrowspaceAPIResponseSchema,
  GrowspaceAPICollectionSchema,
} from '../slices/growspace/schema';
import type {
  GrowspaceAPISchemaResponse,
  GrowspaceAPICollection,
} from '../slices/growspace/schema';

export { GrowspaceAPIResponseSchema, GrowspaceAPICollectionSchema };
export type {
  GrowspaceAPISchemaResponse,
  GrowspaceAPICollection,
} from '../slices/growspace/schema';

export const StrainPhenotypeSchema = z
  .object({
    description: z
      .string()
      .nullable()
      .optional()
      .transform((v) => v ?? undefined),
    image_path: z
      .string()
      .nullable()
      .optional()
      .transform((v) => v ?? undefined),
    image_crop_meta: z
      .object({ x: z.number(), y: z.number(), scale: z.number() })
      .nullable()
      .optional()
      .transform((v) => v ?? undefined),
    flower_days_min: z
      .number()
      .nullable()
      .optional()
      .transform((v) => v ?? undefined),
    flower_days_max: z
      .number()
      .nullable()
      .optional()
      .transform((v) => v ?? undefined),
  })
  .catchall(z.unknown());

export const StrainDataSchema = z
  .object({
    meta: z
      .object({
        breeder: z
          .string()
          .nullable()
          .optional()
          .transform((v) => v ?? undefined),
        breeder_logo: z
          .string()
          .nullable()
          .optional()
          .transform((v) => v ?? undefined),
        type: z
          .string()
          .nullable()
          .optional()
          .transform((v) => v ?? undefined),
        lineage: z
          .string()
          .nullable()
          .optional()
          .transform((v) => v ?? undefined),
        sex: z
          .string()
          .nullable()
          .optional()
          .transform((v) => v ?? undefined),
        sativa_percentage: z
          .number()
          .nullable()
          .optional()
          .transform((v) => v ?? undefined),
        indica_percentage: z
          .number()
          .nullable()
          .optional()
          .transform((v) => v ?? undefined),
        is_stub: z.boolean().optional(),
      })
      .passthrough()
      .optional()
      .default({}),
    phenotypes: z.record(z.string(), StrainPhenotypeSchema).optional().default({}),
  })
  .passthrough();

export const StrainLibrarySchema = z.record(z.string(), StrainDataSchema);
export const StrainLibraryWrapperSchema = z
  .object({
    strains: StrainLibrarySchema,
    strain_list: z.array(z.string()).optional(),
  })
  .passthrough();

export type StrainLibrary = z.infer<typeof StrainLibrarySchema>;
export type StrainLibraryResponse = z.infer<typeof StrainLibraryWrapperSchema>;

// Nutrient schemas live in the Nutrient slice — re-exported here for backwards compatibility.
export {
  NutrientPresetsSchema,
  IPMPresetSchema,
  IPMPresetsSchema,
  ECRampPointSchema,
  ECRampCurveSchema,
  ECRampCurvesSchema,
  NutrientStockSchema,
  NutrientInventorySchema,
} from '../slices/nutrient/schema';
export type {
  NutrientPresetsResponse,
  IPMPreset,
  IPMPresetsResponse,
  ECRampPoint,
  ECRampCurve,
  ECRampCurvesResponse,
  NutrientStock,
  NutrientInventoryResponse,
} from '../slices/nutrient/schema';

export const HistoryPointSchema = z
  .object({
    s: z.union([z.string(), z.number()]).transform(String),
    lu: z
      .union([z.string(), z.number()])
      .transform((v) => (typeof v === 'number' ? new Date(v * 1000).toISOString() : String(v))),
    a: z.record(z.unknown()).optional().default({}), // Attributes
  })
  .passthrough();

export const HistoryStatsResponseSchema = z.record(z.string(), z.array(HistoryPointSchema));
export type HistoryStatsResponse = z.infer<typeof HistoryStatsResponseSchema>;

/**
 * API Validation Helpers - Corrupted data firewall at API boundary
 */

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: string[];
}

/**
 * Validates a single growspace API response.
 * Returns parsed data on success, or logs errors and returns null on failure.
 */
export function validateGrowspaceResponse(
  data: unknown
): ValidationResult<GrowspaceAPISchemaResponse> {
  const result = GrowspaceAPIResponseSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  console.error('[API Validation Failed for Growspace]', result.error.flatten());
  return {
    success: false,
    errors: result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
  };
}

/**
 * Validates a collection of growspace API responses.
 */
export function validateGrowspaceCollection(
  data: unknown
): ValidationResult<GrowspaceAPICollection> {
  const result = GrowspaceAPICollectionSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  console.error('[API Validation Failed for Collection (All Data)]', result.error.flatten());
  return {
    success: false,
    errors: result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
  };
}

/**
 * Validates strain library response.
 */
export function validateStrainLibrary(data: unknown): ValidationResult<StrainLibraryResponse> {
  const result = StrainLibraryWrapperSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  console.error('[API Validation Failed for Strain Library]', result.error.flatten());
  return {
    success: false,
    errors: result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
  };
}
