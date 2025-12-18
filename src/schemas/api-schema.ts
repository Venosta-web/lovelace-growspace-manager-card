import { z } from 'zod';

const PlantSlotSchema = z.object({
    entity_id: z.string().optional().default(''), // Ensure default if missing
    plant_id: z.string().optional().default(''),
    stage: z.string().optional().default('unknown'),
    strain: z.string().optional().default(''),
    phenotype: z.string().optional().default(''),
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
    type: z.enum(['normal', 'mother', 'clone', 'dry', 'cure']),
    rows: z.number(),
    plants_per_row: z.number(),
    total_plants: z.number().optional().default(0),
    notification_target: z.string().nullable().optional(),

    // Grid
    grid: z.record(z.string(), PlantSlotSchema).nullable().optional().transform(v => v ?? {}),

    // Configs
    irrigation_config: z.object({
        irrigation_times: z.array(z.any()).optional(),
        drain_times: z.array(z.any()).optional(),
    }).optional().default({}),
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
    circulation_fan_entity: z.string().optional(),

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
}).catchall(z.any()); // Allow extra fields to pass through without error

export type GrowspaceAPIResponse = z.infer<typeof GrowspaceAPIResponseSchema>;

export const GrowspaceAPICollectionSchema = z.record(z.string(), GrowspaceAPIResponseSchema);
export type GrowspaceAPICollection = z.infer<typeof GrowspaceAPICollectionSchema>;
