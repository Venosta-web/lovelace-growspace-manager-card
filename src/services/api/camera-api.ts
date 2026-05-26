import { BaseAPI } from '../base-api';
import { WS_TYPE_CAPTURE_SNAPSHOT, WS_TYPE_GET_SNAPSHOTS } from '../../constants';

export interface Snapshot {
  path: string;
  filename: string;
  timestamp: string;
}

export interface GetSnapshotsResponse {
  growspace_id: string;
  snapshots: Snapshot[];
  total: number;
}

export interface CaptureSnapshotResponse {
  growspace_id: string;
  timestamp: string;
  snapshots: string[]; // Paths of captured snapshots
}

export class CameraAPI extends BaseAPI {
  /**
   * Captures snapshots from all configured cameras for a growspace.
   * @param growspaceId The ID of the growspace
   * @returns A promise that resolves to the capture response
   */
  async captureSnapshot(growspaceId: string): Promise<CaptureSnapshotResponse | null> {
    if (!this.hass) return null;

    try {
      const response = await this.hass.connection.sendMessagePromise<CaptureSnapshotResponse>({
        type: WS_TYPE_CAPTURE_SNAPSHOT,
        growspace_id: growspaceId,
      });
      return response;
    } catch (error) {
      console.error(`[CameraAPI] Failed to capture snapshot for ${growspaceId}:`, error);
      throw error;
    }
  }

  /**
   * Retrieves paginated snapshots for a growspace.
   * @param growspaceId The ID of the growspace
   * @param limit Maximum number of snapshots to return (default: 50)
   * @param offset Offset to start from (default: 0)
   * @returns A promise that resolves to the get snapshots response
   */
  async getSnapshots(
    growspaceId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<GetSnapshotsResponse | null> {
    if (!this.hass) return null;

    try {
      const response = await this.hass.connection.sendMessagePromise<GetSnapshotsResponse>({
        type: WS_TYPE_GET_SNAPSHOTS,
        growspace_id: growspaceId,
        limit,
        offset,
      });
      return response;
    } catch (error) {
      console.error(`[CameraAPI] Failed to get snapshots for ${growspaceId}:`, error);
      throw error;
    }
  }
}
