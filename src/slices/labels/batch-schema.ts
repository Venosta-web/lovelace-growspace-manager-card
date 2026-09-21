/**
 * The batch wire: one reviewed preflight, a job that prints it, and a retry
 * of the failures.
 *
 * Every answer is `ok` or `refused`, like the single-print commands beside
 * it. What is new is that the **preflight is held**: `preflight_label_batch`
 * answers with a `preflight_id`, and a print names that ID and — when the
 * review had warnings — the preflight `identity` it consented to. The card
 * never sends a record back, because every raster carries the instant the
 * batch was captured and no second request could reproduce it.
 *
 * Printing is a **job**, read back while it runs: each attempt is `pending`,
 * `printed` or `failed`, in the copy-major order the preflight planned.
 *
 * Every field the backend emits is declared (ADR 0031).
 */

import { z } from 'zod';

import { answer } from './draft-schema';
import { PrintSourceSchema, ResolvedTemplateSchema } from './printing-schema';
import {
  CapabilityProfileSchema,
  DiagnosticSchema,
  OperationEligibilitySchema,
  RenderResultSchema,
} from './schema';

/** One captured plant and the authoritative raster the preflight produced. */
export const BatchRecordSchema = z.object({
  /** Zero-based, in the order the plants were submitted. */
  index: z.number().int(),
  /** The plant ID this record captured. */
  subject: z.string(),
  snapshot_identity: z.string(),
  decision: OperationEligibilitySchema,
  render: RenderResultSchema,
});
export type BatchRecord = z.infer<typeof BatchRecordSchema>;

/**
 * One physical label in the plan: one record, one copy.
 *
 * `status` is a string rather than an enum for the reason calibration state
 * is: a newer backend's word must not blank a batch mid-print. The card
 * treats anything it does not know as not yet printed.
 */
export const BatchAttemptSchema = z.object({
  id: z.string(),
  /** Zero-based position in the copy-major plan: A1, B1, A2, B2. */
  position: z.number().int(),
  record_index: z.number().int(),
  subject: z.string(),
  snapshot_identity: z.string(),
  /** One-based. */
  copy_index: z.number().int(),
  status: z.string(),
});
export type BatchAttempt = z.infer<typeof BatchAttemptSchema>;

/** One render diagnostic, attributed to the record it came from. */
export const BatchDiagnosticSchema = z.object({
  record_index: z.number().int(),
  subject: z.string(),
  snapshot_identity: z.string(),
  diagnostic: DiagnosticSchema,
});
export type BatchDiagnostic = z.infer<typeof BatchDiagnosticSchema>;

/** The printer settings and calibration the whole batch was judged against. */
export const BatchPrinterSchema = z.object({
  device_id: z.string(),
  density: z.string(),
  firmware: z.string().nullable(),
  calibration_identity: z.string().nullable(),
  calibration_state: z.string(),
  calibration_stale_reasons: z.array(z.string()),
  /** Advice that needs acknowledging like any other batch warning. */
  calibration_warnings: z.array(z.string()),
});

/** The complete, immutable review boundary for one batch. */
export const BatchPreflightSchema = z.object({
  /** What warning consent is bound to. Any change to the batch changes it. */
  identity: z.string(),
  /** Whether every record authorizes the batch as a whole. */
  allowed: z.boolean(),
  acknowledgement_required: z.boolean(),
  /** Every distinct hard refusal across the records. */
  blocked_by: z.array(z.string()),
  source: PrintSourceSchema,
  profile: CapabilityProfileSchema,
  printer: BatchPrinterSchema,
  records: z.array(BatchRecordSchema),
  attempts: z.array(BatchAttemptSchema),
  diagnostics: z.array(BatchDiagnosticSchema),
});
export type BatchPreflight = z.infer<typeof BatchPreflightSchema>;

export const BatchPreflightAnswerSchema = answer({
  template: ResolvedTemplateSchema,
  preflight_id: z.string(),
  /** The one correction to make first, or `none`. */
  recovery: z.string(),
  preflight: BatchPreflightSchema,
});
export type BatchPreflightAnswer = z.infer<typeof BatchPreflightAnswerSchema>;

/** One attempt as a job reports it: the plan entry and its latest outcome. */
export const BatchJobAttemptSchema = BatchAttemptSchema.extend({
  /** The printer's own words when it failed. Shown as detail, never as copy. */
  error: z.string().nullable(),
  /** What reached paper, once it did. */
  raster_identity: z.string().nullable(),
  raster_input_digest: z.string().nullable(),
});
export type BatchJobAttempt = z.infer<typeof BatchJobAttemptSchema>;

/** A whole-batch gate that refused after the job had started. */
export const BatchJobRefusalSchema = z.object({
  operation: z.string(),
  blocked_by: z.array(z.string()),
  reason: z.string(),
  recovery: z.string(),
});

/** One print or retry of a held preflight, as it stands right now. */
export const BatchJobSchema = z.object({
  id: z.string(),
  preflight_id: z.string(),
  preflight_identity: z.string(),
  /** The job this one retries, or `null` for the first print. */
  retry_of: z.string().nullable(),
  /** `running`, `finished` or `refused`; open for the reason `status` is. */
  state: z.string(),
  /** The attempts this job sends, in plan order. */
  selected: z.array(z.string()),
  /** Every attempt of the plan, not only the selected ones. */
  attempts: z.array(BatchJobAttemptSchema),
  refusal: BatchJobRefusalSchema.nullable(),
});
export type BatchJob = z.infer<typeof BatchJobSchema>;

export const BatchJobAnswerSchema = answer({ job: BatchJobSchema });
export type BatchJobAnswer = z.infer<typeof BatchJobAnswerSchema>;
