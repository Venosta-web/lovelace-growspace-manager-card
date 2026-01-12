import { z } from 'zod';

const PlantSlotSchema = z.object({
    entity_id: z.string().optional().default(''), // Ensure default if missing
    plant_id: z.string().optional().default(''),
    stage: z.string().optional().default('unknown'),
    strain: z.string().optional().default(''),
    phenotype: z.union([z.string(), z.any()]).optional().default(''),
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

    // Start dates
    seedling_start: z.string().nullable().optional().default(null),
    mother_start: z.string().nullable().optional().default(null),
    clone_start: z.string().nullable().optional().default(null),
    veg_start: z.string().nullable().optional().default(null),
    flower_start: z.string().nullable().optional().default(null),
    dry_start: z.string().nullable().optional().default(null),
    cure_start: z.string().nullable().optional().default(null),
}).catchall(z.any()).nullable();

export const GrowspaceAPIResponseSchema = z.object({
    // Root Identity
    growspace_id: z.string(),
    name: z.string(),
    type: z.enum(['normal', 'mother', 'clone', 'dry', 'cure', 'flower', 'veg']),
    rows: z.number(),
    plants_per_row: z.number(),
    total_plants: z.number().optional().default(0),
    notification_target: z.string().nullable().optional(),

    // Grid
    grid: z.record(z.string(), PlantSlotSchema).nullable().optional().transform(v => v ?? {}),

    // Configs
    irrigation_config: z.object({
        irrigation_pump_entity: z.string().nullable().optional(),
        drain_pump_entity: z.string().nullable().optional(),
        irrigation_duration: z.number().nullable().optional(),
        drain_duration: z.number().nullable().optional(),
        irrigation_times: z.array(z.any()).optional(),
        drain_times: z.array(z.any()).optional(),
        veg_day_hours: z.number().optional(),
    }).passthrough().optional().default({}),
    irrigation_strategy: z.any().nullable().default(null),

    // Flattened Environment Config (Root Level)
    temperature_sensor: z.string().optional(),
    humidity_sensor: z.string().optional(),
    vpd_sensor: z.string().optional(),
    co2_sensor: z.string().optional(),
    soil_moisture_sensor: z.string().optional(),
    light_sensor: z.string().optional(),
    exhaust_entity: z.string().optional(),
    humidifier_entity: z.string().optional(),
    dehumidifier_entity: z.string().optional(),
    dehumidifier_control_enabled: z.boolean().optional(),
    circulation_fan_entity: z.string().optional(),
    vpd: z.string().nullable().optional(),
    soil_moisture_value: z.string().nullable().optional(),
    dehumidifier_state: z.string().nullable().optional(),
    dehumidifier_thresholds: z.record(z.string(), z.record(z.string(), z.object({ on: z.number(), off: z.number() }))).optional().default({}),

    // Statistics
    max_veg_days: z.number().optional().default(0),
    max_flower_days: z.number().optional().default(0),
    veg_week: z.number().optional().default(0),
    flower_week: z.number().optional().default(0),
    max_stage_summary: z.string().optional().default(''),

    // Biological Metrics
    vpd_status: z.string().optional().default('unknown'),
    vpd_target_min: z.number().optional().default(0),
    vpd_target_max: z.number().optional().default(0),
    vpd_danger_min: z.number().optional().default(0),
    vpd_danger_max: z.number().optional().default(0),
    granular_stage: z.string().optional().default('unknown'),
    is_day: z.boolean().optional().default(false),
    air_exchange: z.union([z.string(), z.number().transform(String)]).nullable().optional(), // Default handled by optionality
}).passthrough(); // Allow extra fields at root

export type GrowspaceAPIResponse = z.infer<typeof GrowspaceAPIResponseSchema>;

export const GrowspaceAPICollectionSchema = z.record(z.string(), GrowspaceAPIResponseSchema);
export type GrowspaceAPICollection = z.infer<typeof GrowspaceAPICollectionSchema>;

export const StrainPhenotypeSchema = z.object({
    description: z.string().optional(),
    image_path: z.string().optional(),
    image_crop_meta: z.object({ x: z.number(), y: z.number(), scale: z.number() }).optional(),
    flower_days_min: z.number().optional(),
    flower_days_max: z.number().optional()
}).catchall(z.any());

export const StrainDataSchema = z.object({
    meta: z.object({
        breeder: z.string().optional(),
        type: z.string().optional(),
        lineage: z.string().optional(),
        sex: z.string().optional(),
        sativa_percentage: z.number().optional(),
        indica_percentage: z.number().optional()
    }).passthrough().optional().default({}),
    phenotypes: z.record(z.string(), StrainPhenotypeSchema).optional().default({})
}).passthrough();

export const StrainLibrarySchema = z.record(z.string(), StrainDataSchema);
export const StrainLibraryWrapperSchema = z.object({
    strains: StrainLibrarySchema,
    strain_list: z.array(z.string()).optional()
}).passthrough();

export type StrainLibrary = z.infer<typeof StrainLibrarySchema>;
export type StrainLibraryResponse = z.infer<typeof StrainLibraryWrapperSchema>;

export const NutrientPresetsSchema = z.record(z.string(), z.object({
    id: z.string(),
    name: z.string(),
    nutrients: z.array(z.object({
        name: z.string(),
        dose_ml_l: z.number(),
    })),
    stage: z.string().nullish().transform(v => v || undefined),
    min_days_in_stage: z.number().nullish().transform(v => v || undefined),
}).passthrough());

export const IPMPresetSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.enum(['foliar', 'drench', 'beneficials']),
    items: z.array(z.object({
        name: z.string(),
        dose_amount: z.number(),
        dose_unit: z.string(),
    })),
    stage: z.string().nullish().transform(v => v || undefined),
    min_days_in_stage: z.number().nullish().transform(v => v || undefined),
}).passthrough();

export const IPMPresetsSchema = z.record(z.string(), IPMPresetSchema);

export type NutrientPresetsResponse = z.infer<typeof NutrientPresetsSchema>;
export type IPMPresetsResponse = z.infer<typeof IPMPresetsSchema>;

export const HistoryPointSchema = z.object({
    s: z.union([z.string(), z.number()]).transform(String),
    lu: z.union([z.string(), z.number()]).transform(v => typeof v === 'number' ? new Date(v * 1000).toISOString() : String(v))
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
export function validateGrowspaceResponse(data: unknown): ValidationResult<GrowspaceAPIResponse> {
    const result = GrowspaceAPIResponseSchema.safeParse(data);
    if (result.success) {
        return { success: true, data: result.data };
    }
    console.error('[API Validation Failed for Growspace]', result.error.flatten());
    return { success: false, errors: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`) };
}

/**
 * Validates a collection of growspace API responses.
 */
export function validateGrowspaceCollection(data: unknown): ValidationResult<GrowspaceAPICollection> {
    const result = GrowspaceAPICollectionSchema.safeParse(data);
    if (result.success) {
        return { success: true, data: result.data };
    }
    console.error('[API Validation Failed for Collection (All Data)]', result.error.flatten());
    return { success: false, errors: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`) };
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
    return { success: false, errors: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`) };
}
