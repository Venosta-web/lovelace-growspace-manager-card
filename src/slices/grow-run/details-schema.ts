import { z } from 'zod';

import { RunSummarySchema } from './schema';

/**
 * A selected Run's details: its Participants, movement, harvest outcomes,
 * audit, metrics and a Finalized Run's frozen snapshot.
 *
 * Apart from `./schema` because the header's entry bundle reads only the
 * Active Run Sensor and the Run list; everything here is parsed by the lazy
 * Grow Run View and the finalization dialog (GSM#675).
 */

export const ParticipationSchema = z.object({
  plant_id: z.string(),
  opened_at: z.string(),
  closed_at: z.string().nullable(),
});

export const MovementFactSchema = z.object({
  fact_id: z.string(),
  plant_id: z.string(),
  at: z.string(),
  kind: z.string(),
  source_growspace_id: z.string().nullable(),
  target_growspace_id: z.string().nullable(),
  source_run_id: z.string().nullable(),
  target_run_id: z.string().nullable(),
  projected: z.boolean(),
});

const HarvestOutcomeSchema = z.object({
  plant_id: z.string(),
  strain: z.string(),
  phenotype: z.string(),
  source_growspace_id: z.string(),
  state: z.enum(['pending', 'recorded', 'no_usable_yield', 'incomplete']),
  reason: z.string().nullable(),
  metrics: z.object({
    wet_weight: z.number().nullable().optional(),
    dry_weight: z.number().nullable().optional(),
    trim_weight: z.number().nullable().optional(),
    thc_percentage: z.number().nullable().optional(),
    cbd_percentage: z.number().nullable().optional(),
    terpene_profile: z.string().nullable().optional(),
  }),
  quality_score: z.number().nullable(),
  // When the Plant entered dry: the Harvest Window's source (GSM#673).
  entered_dry_at: z.string().nullable().optional(),
});

/** A fact a snapshot needed and lacked; `kind` stays a string for new ones. */
const MissingFactSchema = z.object({
  kind: z.string(),
  plant_id: z.string().nullable(),
});

/**
 * One Run metric: frozen in a snapshot, or a Live or Pending value in a Run's
 * details (GSM#675). A metric fed by a missing fact has no `value` at all;
 * `missing` says which facts, and never becomes a zero.
 */
export const RunMetricSchema = z.object({
  metric: z.string(),
  unit: z.string(),
  definition_version: z.number().int().min(1),
  value: z.number().nullable(),
  complete: z.boolean(),
  missing: z.array(MissingFactSchema),
});
export type RunMetric = z.infer<typeof RunMetricSchema>;

const WaterApplicationSchema = z.object({
  application_id: z.string(),
  at: z.string(),
  source: z.enum(['manual', 'pump_estimate', 'metered', 'unknown']),
  liters: z.number().nullable(),
});

const SafetyFactSchema = z.object({
  fact_id: z.string(),
  growspace_id: z.string().optional(),
  at: z.string().optional(),
  kind: z.string().optional(),
  fault_id: z.string().nullable().optional(),
  reason_code: z.string().nullable().optional(),
  // Opaque diagnostics: each safety fault kind supplies its own detail keys.
  details: z.record(z.string(), z.unknown()).optional(),
});

const ReliabilitySchema = z.object({
  state: z.enum(['live', 'pending', 'final', 'not_recorded']),
  definition_version: z.number().int().min(1).nullable(),
  coverage_started_at: z.string().optional(),
  complete: z.boolean().optional(),
  counts: z.record(z.string(), z.number().int().min(0)).optional(),
  latest_fault: SafetyFactSchema.extend({
    at: z.string(),
    reason_code: z.string().nullable(),
    acknowledged: z.boolean(),
  })
    .nullable()
    .optional(),
});
export type ReliabilitySummary = z.infer<typeof ReliabilitySchema>;

/** Who a Run Participant was: a Participant Identity Snapshot (GSM#673). */
const ParticipantIdentitySchema = z.object({
  plant_id: z.string(),
  plant_name: z.string(),
  strain_id: z.number().int().nullable(),
  strain_name: z.string(),
  phenotype_id: z.number().int().nullable(),
  phenotype_name: z.string(),
});
export type ParticipantIdentity = z.infer<typeof ParticipantIdentitySchema>;

/**
 * The Run Finalization Snapshot (GSM#673): a Finalized Run's facts, frozen
 * and read from the Run alone. A metric fed by a missing fact has no `value`
 * at all; `missing` says which facts, and never becomes a zero.
 */
export const RunSnapshotSchema = z.object({
  metadata: z
    .object({
      label: z.string().nullable(),
      tags: z.array(z.string()),
      goals: z.string().nullable(),
      notes: z.string().nullable(),
    })
    .nullable()
    .optional(),
  harvest_outcomes: z.array(HarvestOutcomeSchema).nullable().optional(),
  format: z.number().int().min(1),
  finalized_at: z.string(),
  run_id: z.string(),
  growspace_id: z.string(),
  growspace_name: z.string(),
  sequence_number: z.number().int().min(1),
  timezone: z.string(),
  started_at: z.string(),
  completed_at: z.string(),
  duration_days: z.number().int().min(0),
  harvest_window: z.object({ first: z.string(), last: z.string() }).nullable(),
  participants: z.array(ParticipantIdentitySchema),
  counts: z.object({
    participants: z.number().int().min(0),
    harvest_source_plants: z.number().int().min(0),
    recorded: z.number().int().min(0),
    no_usable_yield: z.number().int().min(0),
    missing_outcomes: z.number().int().min(0),
  }),
  strains: z.array(
    z.object({
      strain_id: z.number().int().nullable(),
      strain_name: z.string(),
      participants: z.number().int().min(0),
      harvest_source_plants: z.number().int().min(0),
    })
  ),
  metrics: z.array(RunMetricSchema),
  water_applications: z.array(WaterApplicationSchema).optional().default([]),
  reliability: ReliabilitySchema.nullable().optional(),
  coverage: z.array(z.object({ metric: z.string(), coverage_percent: z.number() })),
  uncovered_gaps: z.array(z.object({ start: z.string(), end: z.string(), reason: z.string() })),
  missing: z.array(MissingFactSchema),
  complete: z.boolean(),
});
export type RunSnapshot = z.infer<typeof RunSnapshotSchema>;

/**
 * One Run Audit Entry: a lifecycle or metadata command, who, and when. `reason`
 * (GSM#917) is why, for a command given one — every reopening is.
 */
const RunAuditEntrySchema = z.object({
  at: z.string(),
  command: z.string(),
  command_id: z.string(),
  actor_user_id: z.string().nullable(),
  prior_revision: z.number().int().min(0),
  resulting_revision: z.number().int().min(1),
  changed_fields: z.array(z.string()),
  reason: z.string().nullable().optional(),
});

/**
 * A snapshot Run Reopening set aside (GSM#917), kept whole beside the Run
 * Revision that froze it and the one that reopened it.
 */
const SupersededSnapshotSchema = z.object({
  finalized_revision: z.number().int().min(1),
  superseded_revision: z.number().int().min(1),
  snapshot: RunSnapshotSchema,
});

export const GetGrowRunResultSchema = z.discriminatedUnion('outcome', [
  z.object({ outcome: z.literal('not_found') }),
  z.object({
    outcome: z.literal('found'),
    run: RunSummarySchema.extend({
      notes: z.string().nullable().optional(),
      participations: z.array(ParticipationSchema),
      movement_history: z.array(MovementFactSchema),
      water_applications: z.array(WaterApplicationSchema).optional().default([]),
      reliability: ReliabilitySchema.optional(),
      safety_facts: z.array(SafetyFactSchema).optional().default([]),
      water_coverage_started_at: z.string().nullable().optional(),
      harvest_outcomes: z.array(HarvestOutcomeSchema).optional().default([]),
      // GSM#673: the Run's description, its audit, and a Finalized Run's
      // frozen snapshot (null until then). An older backend sends none.
      tags: z.array(z.string()).optional().default([]),
      goals: z.string().nullable().optional(),
      audit: z.array(RunAuditEntrySchema).optional().default([]),
      snapshot: RunSnapshotSchema.nullable().optional(),
      // GSM#675: who took part as named now, and the metrics `metrics_state`
      // marks Live, Pending or frozen. An older backend sends neither.
      participant_identities: z.array(ParticipantIdentitySchema).optional().default([]),
      metrics: z.array(RunMetricSchema).optional().default([]),
      coverage: z
        .array(z.object({ metric: z.string(), coverage_percent: z.number() }))
        .optional()
        .default([]),
      // GSM#917: every snapshot a reopening superseded, oldest first.
      superseded_snapshots: z.array(SupersededSnapshotSchema).optional().default([]),
    }),
  }),
]);
export type GetGrowRunResult = z.infer<typeof GetGrowRunResultSchema>;
