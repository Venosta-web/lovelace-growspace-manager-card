import { z } from 'zod';

// ---------------------------------------------------------------------------
// Nutrient Presets
// ---------------------------------------------------------------------------

export const NutrientItemSchema = z.object({
  nutrient_id: z.string(),
  dose_ml_l: z.number(),
  name: z.string().optional(),
});

export const NutrientPresetSchema = z.object({
  id: z.string(),
  name: z.string(),
  nutrients: z.array(NutrientItemSchema),
  stage: z
    .string()
    .nullish()
    .transform((v) => v || undefined),
  min_days_in_stage: z
    .number()
    .nullish()
    .transform((v) => v || undefined),
  week: z.number().int().min(1).optional().default(1),
  ec_target: z
    .number()
    .min(0)
    .nullish()
    .transform((v) => v ?? undefined),
  ph_target: z
    .number()
    .min(0)
    .max(14)
    .nullish()
    .transform((v) => v ?? undefined),
  // Stamped by BasePreset on every preset; unread by the card.
  created_at: z.string().optional(),
});

export const NutrientPresetsSchema = z.record(z.string(), NutrientPresetSchema);

export type NutrientItem = z.infer<typeof NutrientItemSchema>;
export type NutrientPreset = z.infer<typeof NutrientPresetSchema>;
export type NutrientPresetsResponse = z.infer<typeof NutrientPresetsSchema>;

// ---------------------------------------------------------------------------
// IPM Presets
// ---------------------------------------------------------------------------

export const IPMTypeSchema = z.enum(['foliar', 'drench', 'beneficials']);

export const IPMItemSchema = z.object({
  name: z.string(),
  dose_amount: z.number(),
  dose_unit: z.string(),
  phi_days: z.number().optional().default(0),
});

export const IPMPresetSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: IPMTypeSchema,
  items: z.array(IPMItemSchema),
  stage: z
    .string()
    .nullish()
    .transform((v) => v || undefined),
  min_days_in_stage: z
    .number()
    .nullish()
    .transform((v) => v || undefined),
  // Stamped by BasePreset on every preset; unread by the card.
  created_at: z.string().optional(),
});

export const IPMPresetsSchema = z.record(z.string(), IPMPresetSchema);

export type IPMType = z.infer<typeof IPMTypeSchema>;
export type IPMItem = z.infer<typeof IPMItemSchema>;
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

/**
 * A curve is owned by exactly one growspace (ADR-0046) and drives only that
 * growspace's feed EC target. `growspace_id` defaults to '' rather than being
 * required because curves stored before the binding existed carry no owner —
 * they are inert, and Home Assistant raises a repair asking for a re-save.
 */
export const ECRampCurveSchema = z.object({
  id: z.string(),
  growspace_id: z.string().optional().default(''),
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
export type NutrientInventory = z.infer<typeof NutrientInventorySchema>;
export type NutrientInventoryResponse = NutrientInventory;
