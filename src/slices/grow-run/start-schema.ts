/**
 * The start side of Grow Runs: the start command, its refusals, and the
 * preview of a start on an earlier day (GSM#668, GSM#670).
 *
 * Its own module, apart from `schema.ts`, because only the lazily loaded
 * start dialog parses these; the header, which the entry renders, needs the
 * Active Run Sensor and the Run details alone.
 */

import { z } from 'zod';

import { MovementFactSchema, ParticipationSchema, RunSummarySchema } from './schema';

/**
 * Every refusal is a result, carrying where the ledger really is. `code`
 * stays a string so a refusal a newer backend adds still renders in the
 * backend's own words.
 */
const RunRefusalSchema = z.object({
  code: z.string().min(1),
  message: z.string(),
  current_revision: z.number().int().min(0).nullable(),
  active_run: RunSummarySchema.nullable(),
});
export type RunRefusal = z.infer<typeof RunRefusalSchema>;

export const StartGrowRunResultSchema = z.discriminatedUnion('outcome', [
  z.object({
    outcome: z.literal('started'),
    run_revision: z.number().int().min(0),
    active_run: RunSummarySchema,
  }),
  z.object({
    outcome: z.literal('refused'),
    refusal: RunRefusalSchema,
  }),
]);
export type StartGrowRunResult = z.infer<typeof StartGrowRunResultSchema>;

/** A local calendar day, as the backend's `started_on` takes it (GSM#670). */
const IsoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** The bounds are the backend's; the card refuses first rather than send them. */
export const StartGrowRunPayloadSchema = z.strictObject({
  growspace_id: z.string().min(1),
  expected_run_revision: z.number().int().min(0),
  label: z.string().max(80).optional(),
  goals: z.string().max(2000).optional(),
  started_on: IsoDateSchema.optional(),
});

/**
 * Part of a backdated Run with nothing recorded for it (GSM#670). `reason`
 * stays a string so a kind a newer backend adds still renders.
 */
const CoverageGapSchema = z.object({
  start: z.string(),
  end: z.string(),
  reason: z.string(),
});
export type CoverageGap = z.infer<typeof CoverageGapSchema>;

const DailySummarySchema = z.object({
  date: IsoDateSchema,
  plant_ids: z.array(z.string()),
  entries: z.number().int().min(0),
  exits: z.number().int().min(0),
});

/** The first boundary a backdated start runs into; confirming it is refused. */
const StartConflictSchema = z.object({
  code: z.string().min(1),
  message: z.string(),
  boundary: z.string().nullable(),
});
export type StartConflict = z.infer<typeof StartConflictSchema>;

/**
 * What a start on an earlier day would claim from the Unattributed Activity
 * Ledger (GSM#670): who takes part and when, the movement and days it takes,
 * what nothing recorded, and whether it may start at all.
 */
const StartPreviewSchema = z.object({
  started_on: IsoDateSchema,
  started_at: z.string(),
  timezone: z.string(),
  run_revision: z.number().int().min(0),
  retention_days: z.number().int().min(1),
  retention_horizon: z.string(),
  covered_since: z.string().nullable(),
  covered_from: z.string(),
  participant_count: z.number().int().min(0),
  participations: z.array(ParticipationSchema.extend({ name: z.string().nullable() })),
  claimed_facts: z.array(MovementFactSchema),
  claimed_days: z.array(DailySummarySchema),
  gaps: z.array(CoverageGapSchema),
  conflict: StartConflictSchema.nullable(),
});
export type StartPreview = z.infer<typeof StartPreviewSchema>;

export const PreviewGrowRunStartResultSchema = z.discriminatedUnion('outcome', [
  z.object({ outcome: z.literal('preview'), preview: StartPreviewSchema }),
  z.object({ outcome: z.literal('refused'), refusal: RunRefusalSchema }),
]);
export type PreviewGrowRunStartResult = z.infer<typeof PreviewGrowRunStartResultSchema>;

export const PreviewGrowRunStartPayloadSchema = z.strictObject({
  growspace_id: z.string().min(1),
  started_on: IsoDateSchema,
});
