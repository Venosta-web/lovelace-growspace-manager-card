/**
 * Camera slice — atoms and mutators for snapshot and vision checkup data.
 *
 * Public API (atoms):
 *   snapshots$          — read: snapshots for the most-recently queried growspace
 *   setSnapshots()      — write: replace snapshot list (called by bootstrap/sync)
 *   visionHistory$      — read: vision checkup history for the most-recently queried growspace
 *   setVisionHistory()  — write: replace vision history (called by bootstrap/sync)
 *
 * Public API (mutators):
 *   getSnapshots(growspaceId, limit?, offset?)           — fetch paginated snapshots, updates snapshots$
 *   captureSnapshot(growspaceId)                         — trigger camera capture, returns response
 *   getVisionHistory(growspaceId, limit?)                — fetch vision history, updates visionHistory$
 *   triggerVisionCheckup(growspaceId)                    — trigger a vision checkup, returns result
 *   updateVisionCheckupConfig(growspaceId, config)       — update vision checkup config
 *
 * Zod schemas and response types are in ./schema.ts and private to this module
 * except where re-exported for consumer type use.
 */

import { atom } from 'nanostores';
import { hassCall, callServiceReturning } from '../../services/hass-call';
import {
  type Snapshot,
  type GetSnapshotsResponse,
  type CaptureSnapshotResponse,
  type VisionCheckupConfig,
  type VisionCheckupResult,
  type GetVisionHistoryResponse,
  type TriggerVisionCheckupResponse,
  type UpdateVisionCheckupConfigResponse,
  GetSnapshotsResponseSchema,
  CaptureSnapshotResponseSchema,
  GetVisionHistoryResponseSchema,
  TriggerVisionCheckupResponseSchema,
  UpdateVisionCheckupConfigResponseSchema,
} from './schema';

// Re-export types for consumers migrating away from CameraAPI / dialog.ts
export type {
  Snapshot,
  GetSnapshotsResponse,
  CaptureSnapshotResponse,
  VisionCheckupConfig,
  VisionCheckupResult,
  GetVisionHistoryResponse,
  TriggerVisionCheckupResponse,
  UpdateVisionCheckupConfigResponse,
};

// ---------------------------------------------------------------------------
// Atoms (public)
// ---------------------------------------------------------------------------

export const snapshots$ = atom<Snapshot[]>([]);
export const visionHistory$ = atom<VisionCheckupResult[]>([]);

// ---------------------------------------------------------------------------
// Bootstrap writes (called by SyncService when fresh data arrives)
// ---------------------------------------------------------------------------

export function setSnapshots(snapshots: Snapshot[]): void {
  snapshots$.set(snapshots);
}

export function setVisionHistory(history: VisionCheckupResult[]): void {
  visionHistory$.set(history);
}

// ---------------------------------------------------------------------------
// Mutators (public)
// ---------------------------------------------------------------------------

/**
 * Fetch paginated snapshots for a growspace.
 *
 * Updates snapshots$ with the returned list on success.
 * Re-throws on backend errors without mutating snapshots$.
 *
 * @param growspaceId - The growspace to query
 * @param limit       - Maximum results to return (default 50)
 * @param offset      - Pagination offset (default 0)
 */
export async function getSnapshots(
  growspaceId: string,
  limit: number = 50,
  offset: number = 0
): Promise<GetSnapshotsResponse> {
  const response = await hassCall(
    'growspace_manager/get_snapshots',
    { growspace_id: growspaceId, limit, offset },
    GetSnapshotsResponseSchema
  );
  snapshots$.set(response.snapshots);
  return response;
}

/**
 * Trigger a camera capture for all configured cameras in a growspace.
 *
 * No optimistic state — capture is a backend-authoritative operation.
 * Re-throws on backend errors.
 *
 * @param growspaceId - The growspace whose cameras to trigger
 */
export async function captureSnapshot(growspaceId: string): Promise<CaptureSnapshotResponse> {
  return hassCall(
    'growspace_manager/capture_snapshot',
    { growspace_id: growspaceId },
    CaptureSnapshotResponseSchema
  );
}

/**
 * Fetch vision checkup history for a growspace.
 *
 * Updates visionHistory$ with the returned list on success.
 * Re-throws on backend errors without mutating visionHistory$.
 *
 * @param growspaceId - The growspace to query
 * @param limit       - Maximum results to return (default 10)
 */
export async function getVisionHistory(
  growspaceId: string,
  limit: number = 10
): Promise<GetVisionHistoryResponse> {
  const response = await hassCall(
    'growspace_manager/get_vision_history',
    { growspace_id: growspaceId, limit },
    GetVisionHistoryResponseSchema
  );
  visionHistory$.set(response.history);
  return response;
}

/**
 * Trigger a vision checkup for a growspace.
 *
 * No optimistic state — checkup is a backend-authoritative operation.
 * Re-throws on backend errors.
 *
 * @param growspaceId - The growspace whose cameras to analyse
 */
export async function triggerVisionCheckup(
  growspaceId: string
): Promise<TriggerVisionCheckupResponse> {
  return callServiceReturning(
    'growspace_manager',
    'trigger_vision_checkup',
    { growspace_id: growspaceId },
    TriggerVisionCheckupResponseSchema
  );
}

/**
 * Update the vision checkup configuration for a growspace.
 *
 * Re-throws on backend errors.
 *
 * @param growspaceId - The growspace to configure
 * @param config      - The new vision checkup configuration
 */
export async function updateVisionCheckupConfig(
  growspaceId: string,
  config: VisionCheckupConfig
): Promise<UpdateVisionCheckupConfigResponse> {
  return hassCall(
    'growspace_manager/update_vision_checkup_config',
    { growspace_id: growspaceId, ...config },
    UpdateVisionCheckupConfigResponseSchema
  );
}
