import { BaseAPI } from '../base-api';
import {
  WS_TYPE_GET_VISION_HISTORY,
  WS_TYPE_UPDATE_VISION_CHECKUP_CONFIG,
  SERVICES,
} from '../../lib/constants';
import type { VisionCheckupResult, VisionCheckupConfig } from '../../lib/types/dialog';

export interface GetVisionHistoryResponse {
  history: VisionCheckupResult[];
  total: number;
}

export class VisionAPI extends BaseAPI {
  async getVisionHistory(
    growspaceId: string,
    limit = 10
  ): Promise<GetVisionHistoryResponse | null> {
    if (!this.hass) return null;
    try {
      return await this.hass.connection.sendMessagePromise<GetVisionHistoryResponse>({
        type: WS_TYPE_GET_VISION_HISTORY,
        growspace_id: growspaceId,
        limit,
      });
    } catch (error) {
      console.error(`[VisionAPI] Failed to get vision history for ${growspaceId}:`, error);
      throw error;
    }
  }

  async triggerVisionCheckup(growspaceId: string): Promise<VisionCheckupResult | null> {
    if (!this.hass) return null;
    try {
      return await this.hass.connection.sendMessagePromise<VisionCheckupResult>({
        type: 'call_service',
        domain: 'growspace_manager',
        service: SERVICES.TRIGGER_VISION_CHECKUP,
        service_data: { growspace_id: growspaceId },
        return_response: true,
      });
    } catch (error) {
      console.error(`[VisionAPI] Failed to trigger vision checkup for ${growspaceId}:`, error);
      throw error;
    }
  }

  async updateVisionCheckupConfig(
    growspaceId: string,
    config: VisionCheckupConfig
  ): Promise<{ success: boolean } | null> {
    if (!this.hass) return null;
    try {
      return await this.hass.connection.sendMessagePromise<{ success: boolean }>({
        type: WS_TYPE_UPDATE_VISION_CHECKUP_CONFIG,
        growspace_id: growspaceId,
        ...config,
      });
    } catch (error) {
      console.error(`[VisionAPI] Failed to update vision config for ${growspaceId}:`, error);
      throw error;
    }
  }
}
