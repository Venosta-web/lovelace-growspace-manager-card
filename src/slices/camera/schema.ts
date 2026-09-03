/**
 * Camera slice — zod schemas for WebSocket response validation.
 *
 * Replaces the plain TypeScript interfaces that lived in
 * `services/api/camera-api.ts` and `lib/types/dialog.ts`.
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Snapshot
// ---------------------------------------------------------------------------

export const SnapshotSchema = z.object({
  path: z.string(),
  filename: z.string(),
  timestamp: z.string(),
});

export type Snapshot = z.infer<typeof SnapshotSchema>;

// ---------------------------------------------------------------------------
// get_snapshots response
// ---------------------------------------------------------------------------

export const GetSnapshotsResponseSchema = z.object({
  growspace_id: z.string(),
  snapshots: z.array(SnapshotSchema),
  total: z.number().int(),
});

export type GetSnapshotsResponse = z.infer<typeof GetSnapshotsResponseSchema>;

// ---------------------------------------------------------------------------
// capture_snapshot response
// ---------------------------------------------------------------------------

export const CaptureSnapshotResponseSchema = z.object({
  growspace_id: z.string(),
  timestamp: z.string(),
  snapshots: z.array(z.string()),
});

export type CaptureSnapshotResponse = z.infer<typeof CaptureSnapshotResponseSchema>;

// ---------------------------------------------------------------------------
// Vision checkup config
// ---------------------------------------------------------------------------

export const VisionCheckupConfigSchema = z.object({
  enabled: z.boolean(),
  early_check_offset_minutes: z.number(),
  mid_check_hours: z.number(),
  late_check_offset_minutes: z.number(),
  history_limit: z.number().optional(),
});

export type VisionCheckupConfig = z.infer<typeof VisionCheckupConfigSchema>;

// ---------------------------------------------------------------------------
// Vision checkup result
// ---------------------------------------------------------------------------

export const VisionCheckupResultSchema = z.object({
  timestamp: z.string(),
  check_type: z.enum(['early', 'mid', 'late', 'manual']),
  analysis: z.string(),
  issues_detected: z.array(z.string()),
  severity: z.enum(['none', 'low', 'medium', 'high', 'critical']),
  recommendations: z.array(z.string()),
  snapshot_paths: z.array(z.string()),
});

export type VisionCheckupResult = z.infer<typeof VisionCheckupResultSchema>;

// ---------------------------------------------------------------------------
// Vision evidence V1 (ADR 0043)
// ---------------------------------------------------------------------------

export const VisionStatusSchema = z
  .object({
    availability: z.enum(['ready', 'unavailable', 'incompatible']),
    reason: z
      .enum([
        'not_installed',
        'not_running',
        'not_configured',
        'unreachable',
        'schema_mismatch',
        'model_unavailable',
      ])
      .optional(),
    connection_source: z.enum(['supervisor', 'manual']),
    service_version: z.string().optional(),
    vision_schema_version: z.number().int().optional(),
    model: z
      .object({
        id: z.string(),
        version: z.string(),
        dimension: z.number().int().positive(),
      })
      .strict()
      .optional(),
  })
  .strict();

export type VisionStatus = z.infer<typeof VisionStatusSchema>;

const VisionQualitySchema = z
  .object({
    accepted: z.boolean(),
    reasons: z.array(z.string()),
    metrics: z
      .object({
        mean_luminance: z.number().nullable(),
        clipped_pixel_fraction: z.number().nullable(),
        mean_absolute_gradient: z.number().nullable(),
      })
      .strict()
      .optional(),
  })
  .strict();

const VisionProvenanceSchema = z
  .object({
    vision_schema_version: z.number().int().optional(),
    service_version: z.string().optional(),
    model_id: z.string().optional(),
    model_version: z.string().optional(),
    scoring_policy_version: z.number().int().optional(),
  })
  .strict();

const VisionVisualSchema = z
  .object({
    outcome: z.enum(['scored', 'monitoring', 'unavailable']),
    baseline_state: z.enum(['monitoring', 'ready', 'stale']).optional(),
    samples_collected: z.number().int().optional(),
    samples_required: z.number().int().optional(),
    raw_distance: z.number().optional(),
    anomaly_score: z.number().optional(),
    verdict: z.enum(['normal', 'uncertain', 'material_scene_change']).optional(),
    comparison_confidence: z.number().optional(),
    unavailable_reasons: z.array(z.string()),
  })
  .strict();

const VisionEnvironmentSchema = z
  .object({
    verdict: z.enum(['risk', 'within_evaluated_range', 'unavailable']),
    evaluated_at: z.string().optional(),
    stress_reasons: z.array(z.string()),
    mold_reasons: z.array(z.string()),
  })
  .strict();

const VisionFusionSchema = z
  .object({
    state: z
      .enum([
        'no_detected_change',
        'environmental_risk',
        'visual_anomaly',
        'concurrent_environmental_risk_and_visual_anomaly',
        'persistent_visual_anomaly',
      ])
      .optional(),
    confidence: z.enum(['confirmed', 'monitor']).optional(),
    coverage: z.enum(['complete', 'partial']).optional(),
    unavailable_reasons: z.array(z.string()),
  })
  .strict();

const VisionTrendPointSchema = z
  .object({
    evaluated_at: z.string(),
    anomaly_score: z.number().nullable(),
    verdict: z.enum(['normal', 'uncertain', 'material_scene_change']).nullable(),
    fusion_state: z
      .enum([
        'no_detected_change',
        'environmental_risk',
        'visual_anomaly',
        'concurrent_environmental_risk_and_visual_anomaly',
        'persistent_visual_anomaly',
      ])
      .optional(),
  })
  .strict();

const VisionReportSchema = z
  .object({
    observation: z.string(),
    environmental_risk: z.string(),
    hypothesis: z.string(),
    recommendations: z.array(z.string()),
  })
  .strict();

export const VisionCaptureResultSchema = z
  .object({
    capture_id: z.string(),
    camera_id: z.string(),
    captured_at: z.string(),
    analysis_state: z.enum(['pending', 'analyzed', 'rejected', 'failed']),
    image: z
      .object({
        available: z.boolean(),
        media_content_id: z.string().optional(),
      })
      .strict(),
    quality: VisionQualitySchema,
    provenance: VisionProvenanceSchema,
    visual: VisionVisualSchema,
    environment: VisionEnvironmentSchema,
    fusion: VisionFusionSchema,
    trend: z.array(VisionTrendPointSchema),
    report: VisionReportSchema.optional(),
  })
  .strict();

export type VisionCaptureResult = z.infer<typeof VisionCaptureResultSchema>;

export const VisionCheckupSchema = z
  .object({
    result_schema: z.literal('evidence_v1'),
    checkup_id: z.string(),
    growspace_id: z.string(),
    trigger_source: z.enum(['scheduled', 'manual']),
    light_window: z.enum(['early', 'mid', 'late', 'manual']),
    started_at: z.string().nullable(),
    completed_at: z.string().nullable(),
    status: z.enum(['completed', 'partial', 'failed']).nullable(),
    captures: z.array(VisionCaptureResultSchema),
  })
  .strict();

export type VisionCheckup = z.infer<typeof VisionCheckupSchema>;

export const LegacyVisionCheckupResultSchema = VisionCheckupResultSchema.extend({
  result_schema: z.literal('legacy_cloud_v1'),
}).strict();

export type LegacyVisionCheckupResult = z.infer<typeof LegacyVisionCheckupResultSchema>;

export const VisionHistoryItemSchema = z.discriminatedUnion('result_schema', [
  VisionCheckupSchema,
  LegacyVisionCheckupResultSchema,
]);

export type VisionHistoryItem = z.infer<typeof VisionHistoryItemSchema>;

export const GetVisionHistoryV2ResponseSchema = z
  .object({
    history: z.array(VisionHistoryItemSchema),
    total: z.number().int(),
    capture_total: z.number().int(),
  })
  .strict();

export type GetVisionHistoryV2Response = z.infer<typeof GetVisionHistoryV2ResponseSchema>;

// ---------------------------------------------------------------------------
// media_source/resolve_media response
// ---------------------------------------------------------------------------

/**
 * Home Assistant's own command, not a `growspace_manager` one.
 *
 * `evidence_v1` never puts an image path on the wire — a capture carries a
 * `media-source://` identifier, which only Home Assistant can turn into a
 * signed, expiring URL. Non-strict on purpose: this payload belongs to the
 * frontend, and a future field of theirs must not fail our parse.
 */
export const ResolvedMediaSchema = z.object({
  url: z.string(),
  mime_type: z.string().optional(),
});

export type ResolvedMedia = z.infer<typeof ResolvedMediaSchema>;

// ---------------------------------------------------------------------------
// get_vision_history response
// ---------------------------------------------------------------------------

export const GetVisionHistoryResponseSchema = z.object({
  history: z.array(VisionCheckupResultSchema),
  total: z.number().int(),
});

export type GetVisionHistoryResponse = z.infer<typeof GetVisionHistoryResponseSchema>;

// ---------------------------------------------------------------------------
// trigger_vision_checkup response
// ---------------------------------------------------------------------------

export const TriggerVisionCheckupResponseSchema = VisionCheckupResultSchema.extend({
  growspace_id: z.string().optional(),
  checkup_id: z.string().optional(),
  status: z.enum(['completed', 'partial', 'failed']).optional(),
  checkup: VisionCheckupSchema.optional(),
});

export type TriggerVisionCheckupResponse = z.infer<typeof TriggerVisionCheckupResponseSchema>;

// ---------------------------------------------------------------------------
// update_vision_checkup_config response
// ---------------------------------------------------------------------------

export const UpdateVisionCheckupConfigResponseSchema = z.object({
  success: z.boolean(),
});

export type UpdateVisionCheckupConfigResponse = z.infer<
  typeof UpdateVisionCheckupConfigResponseSchema
>;
