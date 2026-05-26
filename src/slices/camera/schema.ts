/**
 * Camera slice — zod schemas for WebSocket response validation.
 *
 * Replaces the plain TypeScript interfaces that lived in
 * `services/api/camera-api.ts`.
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
