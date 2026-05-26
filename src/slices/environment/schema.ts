/**
 * Zod schemas for Environment slice payloads.
 *
 * Private to this module — not exported from the public slice API.
 * Used for runtime validation of backend responses in future mutators.
 */

import { z } from 'zod';

const SensorReadingsSchema = z.object({
  avg: z.number().nullable(),
  perSensor: z.array(z.number().nullable()),
  entityIds: z.array(z.string()),
});

export const EnvSnapshotSchema = z.object({
  temperature: z.number().nullable(),
  humidity: z.number().nullable(),
  vpd: z.number().nullable(),
  vpdStatus: z.enum(['optimal', 'warning', 'danger']).nullable(),
  co2: z.number().nullable(),
  isLightsOn: z.boolean().nullable(),
  hasLightSensor: z.boolean(),
  dli: z.number().nullable(),
  optimalConditions: z.object({ isOptimal: z.boolean(), reasons: z.array(z.string()) }).nullable(),
  soilMoisture: SensorReadingsSchema.nullable(),
  substrateTemperature: SensorReadingsSchema.nullable(),
  ph: SensorReadingsSchema.nullable(),
  feedEc: SensorReadingsSchema.nullable(),
  substrateEc: SensorReadingsSchema.nullable(),
  runoffEc: SensorReadingsSchema.nullable(),
  drainVolume: SensorReadingsSchema.nullable(),
  irrigationFlow: SensorReadingsSchema.nullable(),
  power: SensorReadingsSchema.nullable(),
  energy: SensorReadingsSchema.nullable(),
});

export type EnvSnapshotSchema = z.infer<typeof EnvSnapshotSchema>;
