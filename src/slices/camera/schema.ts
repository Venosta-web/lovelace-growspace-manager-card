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

export const TriggerVisionCheckupResponseSchema = VisionCheckupResultSchema;

export type TriggerVisionCheckupResponse = VisionCheckupResult;

// ---------------------------------------------------------------------------
// update_vision_checkup_config response
// ---------------------------------------------------------------------------

export const UpdateVisionCheckupConfigResponseSchema = z.object({
  success: z.boolean(),
});

export type UpdateVisionCheckupConfigResponse = z.infer<
  typeof UpdateVisionCheckupConfigResponseSchema
>;
