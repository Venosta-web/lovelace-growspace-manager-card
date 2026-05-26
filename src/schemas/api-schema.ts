import { z } from 'zod';
import { GridApiSchema, PlantSlotSchema } from '../slices/grid/schema';

const IrrigationScheduleItemSchema = z
  .object({
    time: z.string().optional(),
    start_time: z.string().optional(),
    duration: z.number().nullable().optional(), // Allow nullable for Python None
    duration_seconds: z.number().nullable().optional(), // Alias
  })
  .transform((data) => ({
    time: data.time || data.start_time || '',
    duration: data.duration ?? data.duration_seconds ?? undefined,
  }))
  .refine((data) => data.time !== '', { message: 'Time is required' });

const IrrigationStrategySchema = z.object({
  enabled: z.boolean(),
  lights_on_time: z.string(),
  p0_duration_minutes: z.number(),
  p2_stop_before_lights_off_minutes: z.number(),
  target_vwc_percent: z.number(),
  maintenance_dryback_percent: z.number(),
  shot_duration_seconds: z.number(),
  shot_interval_minutes: z.number(),
  auto_light_tracking: z.boolean().default(false),
  detected_lights_on_time: z.string().nullable().default(null),
});

const IrrigationConfigSchema = z
  .object({
    irrigation_pump_entity: z.string().nullable().optional(),
    drain_pump_entity: z.string().nullable().optional(),
    irrigation_duration: z.number().nullable().optional(),
    drain_duration: z.number().nullable().optional(),
    irrigation_times: z
      .array(z.union([z.string().transform((t) => ({ time: t })), IrrigationScheduleItemSchema]))
      .optional()
      .default([]),
    drain_times: z
      .array(z.union([z.string().transform((t) => ({ time: t })), IrrigationScheduleItemSchema]))
      .optional()
      .default([]),
    veg_day_hours: z.number().optional(),
  })
  .passthrough()
  .optional()
  .default({});

const DrainConfigSchema = z
  .object({
    enabled: z.boolean(),
    max_ec_delta: z.number(),
    target_runoff_percent: z.number(),
    readings: z
      .array(
        z.object({
          timestamp: z.string(),
          feed_ec: z.number(),
          drain_ec: z.number(),
          drain_volume_ml: z.number().nullable().optional(),
          feed_volume_ml: z.number().nullable().optional(),
        })
      )
      .optional()
      .default([]),
  })
  .nullable()
  .optional();

export const GrowspaceAPIResponseSchema = z
  .object({
    identity: z
      .object({
        growspace_id: z.string(),
        overview_entity_id: z.string().optional(),
        name: z.string(),
        type: z.enum(['normal', 'mother', 'clone', 'dry', 'cure', 'flower', 'veg']),
        notification_target: z.string().nullable().optional(),
      })
      .optional()
      .default({ growspace_id: '', name: '', type: 'normal' }),

    grid: GridApiSchema,

    environment: z
      .object({
        temperature_sensor: z.string().optional(),
        humidity_sensor: z.string().optional(),
        vpd_sensor: z.string().optional(),
        co2_sensor: z.string().optional(),
        soil_moisture_sensor: z.string().optional(),
        light_sensor: z.string().optional(),
        exhaust_entity: z.string().optional(),
        humidifier_entity: z.string().optional(),
        humidifier_control_enabled: z.boolean().optional(),
        dehumidifier_entity: z.string().optional(),
        dehumidifier_control_enabled: z.boolean().optional(),
        circulation_fan_entity: z.string().optional(),
        circulation_fan_entities: z.array(z.string()).optional().default([]),
        exhaust_fan_entities: z.array(z.string()).optional().default([]),
        humidifier_entities: z.array(z.string()).optional().default([]),
        dehumidifier_entities: z.array(z.string()).optional().default([]),
        light_sensors: z.array(z.string()).optional().default([]),
        vpd: z.string().nullable().optional(),
        soil_moisture_value: z.string().nullable().optional(),
        dehumidifier_state: z.string().nullable().optional(),
        humidifier_thresholds: z
          .record(z.string(), z.record(z.string(), z.object({ on: z.number(), off: z.number() })))
          .optional()
          .default({}),
        dehumidifier_thresholds: z
          .record(z.string(), z.record(z.string(), z.object({ on: z.number(), off: z.number() })))
          .optional()
          .default({}),
        electricity_cost_per_kwh: z.number().nullable().optional(),
        substrate_temperature_sensors: z.array(z.string()).optional().default([]),
        camera_entities: z.array(z.string()).optional().default([]),
        energy_sensors: z.array(z.string()).optional().default([]),
        irrigation_tanks: z.array(z.unknown()).optional().default([]),
        irrigation_pump_state: z.string().nullable().optional(),
        drain_pump_state: z.string().nullable().optional(),
        active_events: z.record(z.unknown()).optional().default({}),
      })
      .passthrough()
      .optional()
      .default({}),

    sensors: z
      .object({
        sensor_types: z.record(z.string(), z.string()).optional().default({}),
        sensor_coordinates: z
          .record(
            z.string(),
            z.object({
              x: z.number(),
              y: z.number(),
              z: z.number(),
              rotation: z.number().optional(),
            })
          )
          .optional()
          .default({}),
        sensor_groups: z.array(z.unknown()).optional().default([]),
      })
      .optional()
      .default({}),

    irrigation: z
      .object({
        irrigation_config: IrrigationConfigSchema,
        irrigation_strategy: IrrigationStrategySchema.nullable().optional().default(null),
        drain_config: DrainConfigSchema,
        water_usage: z
          .object({
            total_liters: z.number().optional().default(0),
            cycle_start_date: z.string().optional().default(''),
            daily_readings: z.array(z.unknown()).optional().default([]),
          })
          .nullable()
          .optional(),
        last_cycle_timestamp: z.string().nullable().optional(),
        next_scheduled_cycle: z.string().nullable().optional(),
        cycles_today: z.number().optional().default(0),
        volume_dispensed_today: z.number().optional().default(0),
      })
      .optional()
      .default({}),

    metrics: z
      .object({
        vpd_status: z.string().optional().default('unknown'),
        vpd_target_min: z.number().optional().default(0),
        vpd_target_max: z.number().optional().default(0),
        vpd_danger_min: z.number().optional().default(0),
        vpd_danger_max: z.number().optional().default(0),
        granular_stage: z.string().optional().default('unknown'),
        is_day: z.boolean().optional().default(false),
        veg_week: z.number().optional().default(0),
        flower_week: z.number().optional().default(0),
        max_veg_days: z.number().optional().default(0),
        max_flower_days: z.number().optional().default(0),
        max_dry_days: z.number().optional().default(0),
        max_cure_days: z.number().optional().default(0),
        max_stage_summary: z.string().optional().default(''),
        air_exchange: z
          .union([z.string(), z.number().transform(String)])
          .nullable()
          .optional(),
        energy_tracking: z
          .object({
            cycle_start_date: z.string().nullable().optional(),
            cycle_start_kwh: z.number().nullable().optional(),
          })
          .nullable()
          .optional(),
      })
      .passthrough()
      .optional()
      .default({}),

    _ts: z.number().optional(),
  })
  .passthrough(); // Allow extra fields

export type GrowspaceAPISchemaResponse = z.infer<typeof GrowspaceAPIResponseSchema>;

export const GrowspaceAPICollectionSchema = z.record(z.string(), GrowspaceAPIResponseSchema);
export type GrowspaceAPICollection = z.infer<typeof GrowspaceAPICollectionSchema>;

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

export const NutrientPresetsSchema = z.record(
  z.string(),
  z
    .object({
      id: z.string(),
      name: z.string(),
      nutrients: z.array(
        z.object({
          name: z.string(),
          dose_ml_l: z.number(),
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
    .passthrough()
);

export type NutrientPresetsResponse = z.infer<typeof NutrientPresetsSchema>;

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
  z.array(z.any()).transform(() => ({})), // Backend sometimes defaults to [] if empty
]);

export type ECRampPoint = z.infer<typeof ECRampPointSchema>;
export type ECRampCurve = z.infer<typeof ECRampCurveSchema>;
export type ECRampCurvesResponse = Record<string, ECRampCurve>;

export const NutrientStockSchema = z.object({
  nutrient_id: z.string(),
  name: z.string(),
  current_ml: z.number(),
  initial_ml: z.number(),
  last_updated: z.string(),
});

export const NutrientInventorySchema = z.object({
  stocks: z.record(z.string(), NutrientStockSchema),
});

export type NutrientInventoryResponse = z.infer<typeof NutrientInventorySchema>;

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
