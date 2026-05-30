import { z } from 'zod';

export const SeedBatchSchema = z
  .object({
    batch_id: z.string(),
    strain_name: z.string(),
    breeder: z.string(),
    quantity: z.number(),
    acquisition_date: z.string(),
    generation: z.string(),
    lineage: z.string().default(''),
    parent_1_strain: z.string().nullable().optional(),
    parent_1_phenotype: z.string().nullable().optional(),
    parent_2_strain: z.string().nullable().optional(),
    parent_2_phenotype: z.string().nullable().optional(),
    notes: z.string().default(''),
  })
  .passthrough();

export const PollinationEventSchema = z
  .object({
    event_id: z.string(),
    date: z.string(),
    donor_plant_id: z.string(),
    receiver_plant_id: z.string(),
    notes: z.string().default(''),
    result_seed_batch_id: z.string().nullable().default(null),
  })
  .passthrough();

export const LineageNodeSchema: z.ZodType<unknown> = z.lazy(() =>
  z
    .object({
      id: z.string(),
      name: z.string(),
      type: z.enum(['plant', 'seed_batch', 'strain']),
      phenotype: z.string().optional(),
      generation: z.string().optional(),
      parents: z.array(LineageNodeSchema).optional(),
    })
    .passthrough()
);

export const GeneticsDataSchema = z.object({
  seed_batches: z.record(z.string(), SeedBatchSchema).default({}),
  pollination_events: z.record(z.string(), PollinationEventSchema).default({}),
});

export type GeneticsDataResponse = z.infer<typeof GeneticsDataSchema>;
