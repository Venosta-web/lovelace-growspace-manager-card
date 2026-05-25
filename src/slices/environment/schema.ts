/**
 * Zod schemas for Environment slice payloads.
 *
 * Private to this module — not exported from the public slice API.
 * Used for runtime validation of backend responses in future mutators.
 */

import { z } from 'zod';

export const EnvSnapshotSchema = z.object({
  temperature: z.number().nullable(),
  humidity: z.number().nullable(),
  vpd: z.number().nullable(),
  vpdStatus: z.enum(['optimal', 'warning', 'danger']).nullable(),
  co2: z.number().nullable(),
  isLightsOn: z.boolean().nullable(),
  hasLightSensor: z.boolean(),
  dli: z.number().nullable(),
});

export type EnvSnapshotSchema = z.infer<typeof EnvSnapshotSchema>;
