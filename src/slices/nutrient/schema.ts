import { z } from 'zod';

// ---------------------------------------------------------------------------
// Nutrient Presets
// ---------------------------------------------------------------------------

export const NutrientPresetsSchema = z.record(
  z.string(),
  z
    .object({
      id: z.string(),
      name: z.string(),
      nutrients: z.array(
        z.object({
          nutrient_id: z.string(),
          dose_ml_l: z.number(),
          name: z.string().optional(),
        })
      ),
      stage: z
        .string()
        .nullish()
        .transform((v) => v || undefined),
      min_days_in_stage: z
        .number()
        .nullish()
        .transform((v) => v || undefined),
      week: z.number().int().min(1).optional().default(1),
      ec_target: z.number().min(0).nullish().transform((v) => v ?? undefined),
      ph_target: z.number().min(0).max(14).nullish().transform((v) => v ?? undefined),
    })
    .passthrough()
);

export type NutrientPresetsResponse = z.infer<typeof NutrientPresetsSchema>;

// ---------------------------------------------------------------------------
// IPM Presets
// ---------------------------------------------------------------------------

export const IPMPresetSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    type: z.enum(['foliar', 'drench', 'beneficials']),
    items: z.array(
      z.object({
        name: z.string(),
        dose_amount: z.number(),
        dose_unit: z.string(),
        phi_days: z.number().optional().default(0),
      })
    ),
    stage: z
      .string()
      .nullish()
      .transform((v) => v || undefined),
    min_days_in_stage: z
      .number()
      .nullish()
      .transform((v) => v || undefined),
  })
  .passthrough();

export const IPMPresetsSchema = z.record(z.string(), IPMPresetSchema);

export type IPMPreset = z.infer<typeof IPMPresetSchema>;
export type IPMPresetsResponse = z.infer<typeof IPMPresetsSchema>;

// ---------------------------------------------------------------------------
// EC Ramp Curves
// ---------------------------------------------------------------------------

export const ECRampPointSchema = z
  .object({
    week: z.number().optional(),
    ec_min: z.number().optional(),
    ec_max: z.number().optional(),
    day: z.number().optional(),
    target_ec: z.number().optional(),
  })
  .transform((data) => ({
    day: data.day ?? ((data.week ?? 1) - 1) * 7 + 1,
    target_ec: data.target_ec ?? data.ec_min ?? 0,
  }));

export const ECRampCurveSchema = z.object({
  id: z.string(),
  name: z.string(),
  stage: z.string().optional().default('flower'),
  points: z.array(ECRampPointSchema),
});

export const ECRampCurvesSchema = z.union([
  z.record(z.string(), ECRampCurveSchema),
  z.array(z.any()).transform(() => ({})),
]);

export type ECRampPoint = z.infer<typeof ECRampPointSchema>;
export type ECRampCurve = z.infer<typeof ECRampCurveSchema>;
export type ECRampCurvesResponse = Record<string, ECRampCurve>;

// ---------------------------------------------------------------------------
// Nutrient Inventory
// ---------------------------------------------------------------------------

export const NUTRIENT_STOCK_TYPES = [
  'base',
  'bloom',
  'calmag',
  'root',
  'additive',
  'microbe',
] as const;

export type NutrientStockType = (typeof NUTRIENT_STOCK_TYPES)[number];

export const NutrientStockSchema = z.object({
  nutrient_id: z.string(),
  name: z.string(),
  current_ml: z.number(),
  initial_ml: z.number(),
  last_updated: z.string(),
  brand: z.string().optional().default(''),
  type: z.enum(NUTRIENT_STOCK_TYPES).optional().default('base'),
  npk: z.string().optional().default(''),
  dose_ml_l: z.number().optional().default(0),
  notes: z.string().optional().default(''),
});

export const NutrientInventorySchema = z.object({
  stocks: z.record(z.string(), NutrientStockSchema),
});

export type NutrientStock = z.infer<typeof NutrientStockSchema>;
export type NutrientInventoryResponse = z.infer<typeof NutrientInventorySchema>;
