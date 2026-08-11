import { z } from 'zod';

export const SeedBatchSchema = z.object({
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
});

export const PollinationEventSchema = z.object({
  event_id: z.string(),
  date: z.string(),
  donor_plant_id: z.string(),
  receiver_plant_id: z.string(),
  notes: z.string().default(''),
  result_seed_batch_id: z.string().nullable().default(null),
});

/**
 * A node of the lineage tree returned by `get_lineage_tree` and
 * `get_strain_lineage_tree`.
 *
 * Two independent backend builders produce nodes and `websocket/lineage.py:69-79`
 * grafts them together — the genetics manager builds the root, and its `parents`
 * may be replaced wholesale by strain-library children — so one response mixes
 * key sets and only `name` is emitted by every variety:
 *
 * | variety                                  | name | parents | generation | source    | phenotype |
 * | ---------------------------------------- | ---- | ------- | ---------- | --------- | --------- |
 * | genetics root (`genetics.py:524-527`)    | ✓    | ✓       | ✓          | —         | —         |
 * | genetics receiver leaf (`genetics.py:552`)| ✓   | `[]`    | —          | —         | —         |
 * | strain-library node (`lineage.py:73-78`) | ✓    | ✓       | ✓          | `library` | when set  |
 * | manual leaf (`lineage.py:101-103`)       | ✓    | `[]`    | —          | `manual`  | when set  |
 *
 * `id`, `type` and `sex` were declared here and required, but no builder emits
 * them — the parse failed for every real tree, `hassCall` threw, and both call
 * sites swallowed it into `null`, so the Genetics tree rendered empty. `url`
 * likewise exists only on seedfinder *input* trees (`lineage.py:31`), never on
 * an emitted node.
 */
const LineageNodeFieldsSchema = z.object({
  name: z.string(),
  source: z.enum(['library', 'manual']).optional(),
  generation: z.string().optional(),
  phenotype: z.string().optional(),
});

/**
 * Only the recursive edge is written by hand: zod cannot infer the type of a
 * self-referential schema, so `z.ZodType` needs an annotation to close the
 * cycle. Every leaf field still comes from the schema via `z.infer`, and the
 * annotation is checked against it — a field declared in one and not the other
 * fails to compile.
 */
export type LineageNode = z.infer<typeof LineageNodeFieldsSchema> & {
  parents?: LineageNode[];
};

export const LineageNodeSchema: z.ZodType<LineageNode> = LineageNodeFieldsSchema.extend({
  get parents() {
    return z.array(LineageNodeSchema).optional();
  },
});

export const GeneticsDataSchema = z.object({
  seed_batches: z.record(z.string(), SeedBatchSchema).default({}),
  pollination_events: z.record(z.string(), PollinationEventSchema).default({}),
});

export type GeneticsDataResponse = z.infer<typeof GeneticsDataSchema>;
