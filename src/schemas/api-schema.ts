import { z } from 'zod';

const PlantSlotSchema = z.object({
    entity_id: z.string(),
    stage: z.string().optional(),
    strain: z.string().optional(),
    phenotype: z.string().optional(),
    row: z.number().optional(),
    col: z.number().optional(),
    // Add other known plant fields as optional to be safe, or allow pass-through
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
    irrigation_strategy: z.any().optional().nullable().default(null),

    // New nested environment config
    environment_config: z.record(z.any()).optional().default({}),

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
