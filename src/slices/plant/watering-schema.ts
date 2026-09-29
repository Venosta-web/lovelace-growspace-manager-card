import { z } from 'zod';

/** Outgoing hand-watering fields shared by plant and growspace commands. */
const wateringFields = z.object({
  amount: z.number().positive(),
  nutrients: z.record(z.string(), z.number()).optional(),
  preset_id: z.string().optional(),
  watered_at: z.string().optional(),
  from_monitored_tank: z.boolean().optional(),
});

export const WaterPlantPayloadSchema = wateringFields.extend({ plant_id: z.string() });
export const WaterGrowspacePayloadSchema = wateringFields.extend({ growspace_id: z.string() });
