/**
 * Camera slice — atoms and mutators for snapshot data.
 *
 * Public API (atoms):
 *   snapshots$          — read: snapshots for the most-recently queried growspace
 *   setSnapshots()      — write: replace snapshot list (called by bootstrap/sync)
 *
 * Public API (mutators):
 *   getSnapshots(growspaceId, limit?, offset?)  — fetch paginated snapshots, updates snapshots$
 *   captureSnapshot(growspaceId)                — trigger camera capture, returns response
 *
 * Zod schemas and response types are in ./schema.ts and private to this module
 * except where re-exported for consumer type use.
 */

import { atom } from 'nanostores';
import { hassCall } from '../../services/hass-call';
import {
  type Snapshot,
  type GetSnapshotsResponse,
  type CaptureSnapshotResponse,
  GetSnapshotsResponseSchema,
  CaptureSnapshotResponseSchema,
} from './schema';

// Re-export types for consumers migrating away from CameraAPI
export type { Snapshot, GetSnapshotsResponse, CaptureSnapshotResponse };

// ---------------------------------------------------------------------------
// Atoms (public)
// ---------------------------------------------------------------------------

export const snapshots$ = atom<Snapshot[]>([]);

// ---------------------------------------------------------------------------
// Bootstrap write (called by SyncService when fresh data arrives)
// ---------------------------------------------------------------------------

export function setSnapshots(snapshots: Snapshot[]): void {
  snapshots$.set(snapshots);
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
  offset: number = 0,
): Promise<GetSnapshotsResponse> {
  const response = await hassCall(
    'growspace_manager/get_snapshots',
    { growspace_id: growspaceId, limit, offset },
    GetSnapshotsResponseSchema,
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
    CaptureSnapshotResponseSchema,
  );
}
