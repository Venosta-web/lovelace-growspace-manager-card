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

// Strain shapes live in the Strain slice, which owns the get_strain_library
// wire contract (ADR 0031: one schema per shape). This module re-exports them
// for the older import path.
export {
  StrainPhenotypeSchema,
  StrainDataSchema,
  StrainLibrarySchema,
  StrainLibraryWrapperSchema,
} from '../slices/strain/schema';

export {
  VisionStatusSchema,
  VisionCaptureResultSchema,
  VisionCheckupSchema,
  LegacyVisionCheckupResultSchema,
  VisionHistoryItemSchema,
  GetVisionHistoryV2ResponseSchema,
  TriggerVisionCheckupResponseSchema,
} from '../slices/camera/schema';
export type {
  VisionStatus,
  VisionCaptureResult,
  VisionCheckup,
  LegacyVisionCheckupResult,
  VisionHistoryItem,
  GetVisionHistoryV2Response,
  TriggerVisionCheckupResponse,
} from '../slices/camera/schema';
export type { StrainLibrary, StrainLibraryResponse } from '../slices/strain/schema';

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

/**
 * A point from Home Assistant's own compact history API — not a GSM shape, so
 * ADR 0031's completeness rule does not apply: the emitted key set is HA's to
 * change and enumerating it here would be a guess. Only the three keys the
 * history store reads are declared; the rest are stripped, which is safe
 * because nothing downstream reaches past them.
 */
export const HistoryPointSchema = z.object({
  s: z.union([z.string(), z.number()]).transform(String),
  lu: z
    .union([z.string(), z.number()])
    .transform((v) => (typeof v === 'number' ? new Date(v * 1000).toISOString() : String(v))),
  a: z.record(z.string(), z.unknown()).optional().default({}), // Attributes
});

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
    errors: result.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`),
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
    errors: result.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`),
  };
}

// ---------------------------------------------------------------------------
// Crop Steering History
// ---------------------------------------------------------------------------

const CropSteeringBucketSchema = z.object({
  timestamp: z.string(),
  value: z.number().nullable(),
});

export const CropSteeringHistorySchema = z.object({
  growspace_id: z.string(),
  lights_on: z.string(),
  soil_moisture: z.array(CropSteeringBucketSchema),
  pore_ec: z.array(CropSteeringBucketSchema).optional(),
  bulk_ec: z.array(CropSteeringBucketSchema).optional(),
});

export type CropSteeringHistory = z.infer<typeof CropSteeringHistorySchema>;
export type CropSteeringBucket = z.infer<typeof CropSteeringBucketSchema>;
