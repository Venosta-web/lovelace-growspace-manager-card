/**
 * The recovery wire: calibration, test printing and one production print.
 *
 * Every answer is `ok` or `refused`, like the draft commands beside it. What
 * is new is **the approval**: a preview answers with an `approval_id` naming
 * what the backend held of it, and a print names that ID and the raster
 * identity the operator approved. The card never sends the content back — the
 * content's capture instant is part of the raster identity, so a second
 * capture could never reproduce the picture on screen.
 *
 * Every field the backend emits is declared (ADR 0031), including the ones
 * the card only shows in a log or never reads; a comment says so where that
 * is the case.
 */

import { z } from 'zod';

import { answer, LabelDocumentSchema } from './draft-schema';
import { CapabilityProfileSchema, OperationEligibilitySchema, RenderResultSchema } from './schema';

/** Where one label reached paper from. Shown, never compared. */
export const PrintSourceSchema = z.object({
  kind: z.string(),
  reference: z.string(),
  published: z.boolean(),
});

/** One label that reached paper, and everything that authorized it. */
export const PrintOutcomeSchema = z.object({
  operation: z.string(),
  source: PrintSourceSchema,
  raster_identity: z.string(),
  /** The digest of the exact payload the printer adapter was handed. */
  raster_input_digest: z.string().nullable(),
  decision: OperationEligibilitySchema,
  result: RenderResultSchema,
});
export type PrintOutcome = z.infer<typeof PrintOutcomeSchema>;

/** The five numbers read off a calibration label, in millimetres. */
export const PlacementMeasurementSchema = z.object({
  top_mm: z.number(),
  right_mm: z.number(),
  bottom_mm: z.number(),
  left_mm: z.number(),
  /** Signed: positive where the media ran long. */
  feed_mm: z.number(),
});
export type PlacementMeasurement = z.infer<typeof PlacementMeasurementSchema>;

/** The printer, stock and mounting a measurement is of. */
export const CalibrationScopeSchema = z.object({
  device_id: z.string(),
  printer_class: z.string(),
  label_size_id: z.string(),
  orientation: z.string(),
});

/**
 * Everything a measurement silently depended on.
 *
 * Unread beyond `scope`: the backend compares it and names what moved in
 * `stale_reasons`, which is the only form the card shows it in.
 */
export const CalibrationDependenciesSchema = z.object({
  scope: CalibrationScopeSchema,
  feed_axis: z.string(),
  dpi: z.number(),
  printhead_pixels: z.number(),
  printable_origin_x_mm: z.number(),
  printable_origin_y_mm: z.number(),
  printable_width_mm: z.number(),
  printable_height_mm: z.number(),
  safe_area_inset_mm: z.number(),
  density_levels: z.record(z.string(), z.number()),
  limits_digest: z.string(),
  sheet_version: z.string(),
  compiler_version: z.string(),
  renderer_version: z.string(),
  adapter_version: z.string(),
  text_toolchain_version: z.string(),
  qr_model_version: z.string(),
  safety_policy_version: z.string(),
  binding_catalogue_version: z.string(),
  style_token_catalogue_version: z.string(),
  label_size_catalogue_version: z.string(),
  capability_generation: z.number().int(),
  /** Font file to digest. Opaque Region (ADR 0031): keyed by whatever fonts ship. */
  font_identity: z.record(z.string(), z.string()),
  firmware: z.string().nullable(),
});

/** One immutable Local Calibration record. */
export const CalibrationRecordSchema = z.object({
  id: z.string(),
  identity: z.string(),
  recorded_at: z.string(),
  recorded_by: z.string().nullable(),
  measurement: PlacementMeasurementSchema,
  dependencies: CalibrationDependenciesSchema,
  sheet_raster_identity: z.string(),
  printed_density: z.string(),
  notes: z.string().nullable(),
});
export type CalibrationRecord = z.infer<typeof CalibrationRecordSchema>;

/**
 * Whether one printer's newest measurement still holds.
 *
 * `state` is a string rather than an enum on purpose: an unknown state from a
 * newer backend must not blank the card, and the card treats anything other
 * than `current` as "not authorized to print".
 */
export const CalibrationStatusSchema = z.object({
  state: z.string(),
  identity: z.string().nullable(),
  /** The dependencies that moved since the measurement. Blocking. */
  stale_reasons: z.array(z.string()),
  /** Advice, never a refusal: `calibration_older_than_recommended`. */
  warnings: z.array(z.string()),
  age_days: z.number().int().nullable(),
  record: CalibrationRecordSchema.nullable(),
});
export type CalibrationStatus = z.infer<typeof CalibrationStatusSchema>;

/** The geometry the five numbers are checked against. */
export const MeasurementBoundsSchema = z.object({
  printable_width_mm: z.number(),
  printable_height_mm: z.number(),
  feed_axis: z.string(),
  quantum_mm: z.number(),
});
export type MeasurementBounds = z.infer<typeof MeasurementBoundsSchema>;

export const CalibrationStatusAnswerSchema = answer({
  profile: CapabilityProfileSchema,
  device_id: z.string(),
  calibration: CalibrationStatusSchema,
  bounds: MeasurementBoundsSchema,
});
export type CalibrationStatusAnswer = z.infer<typeof CalibrationStatusAnswerSchema>;

export const CalibrationSheetAnswerSchema = answer({
  sheet_id: z.string(),
  sheet_raster_identity: z.string(),
  bounds: MeasurementBoundsSchema,
  print: PrintOutcomeSchema,
});
export type CalibrationSheetAnswer = z.infer<typeof CalibrationSheetAnswerSchema>;

export const CalibrationRecordedAnswerSchema = answer({
  record: CalibrationRecordSchema,
  calibration: CalibrationStatusSchema,
});
export type CalibrationRecordedAnswer = z.infer<typeof CalibrationRecordedAnswerSchema>;

export const PrintedAnswerSchema = answer({ print: PrintOutcomeSchema });
export type PrintedAnswer = z.infer<typeof PrintedAnswerSchema>;

/** One published revision, pinned for the whole of one print. */
export const ResolvedTemplateSchema = z.object({
  ref: z.object({ kind: z.string(), id: z.string() }),
  revision: z.number().int(),
  name: z.string(),
  label_size_id: z.string(),
  layout_digest: z.string(),
  /** Unread: the raster is the preview, never a drawing of this. */
  document: LabelDocumentSchema,
  /** How it was resolved: `explicit` here, or a default's route. */
  via: z.string(),
});

export const RecordPreviewAnswerSchema = answer({
  template: ResolvedTemplateSchema,
  subject: z.string(),
  approval_id: z.string(),
  calibration: CalibrationStatusSchema,
  /** The production print's own answer: the render's plus provenance. */
  decision: OperationEligibilitySchema,
  /** The one correction to make first, or `none`. */
  recovery: z.string(),
  render: RenderResultSchema,
});
export type RecordPreviewAnswer = z.infer<typeof RecordPreviewAnswerSchema>;
