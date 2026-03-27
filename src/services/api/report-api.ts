import { BaseAPI } from '../base-api';
import { DOMAIN, SERVICES } from '../../constants';

/**
 * Output shape for a summarized grow report from backend API
 */
export interface GrowReportData {
  summary?: {
    plant_count: number;
    strains: string[];
    stages: Record<string, number>;
  };
  harvest?: {
    total_wet_weight: number;
    total_dry_weight: number;
    total_trim_weight: number;
    top_thc: number;
  };
  environment?: {
    temperature_avg: number;
    humidity_avg: number;
    vpd_avg: number;
  };
}

export class ReportAPI extends BaseAPI {
  /**
   * Generates and triggers export of a grow report for a specific growspace.
   * Based on format (json or pdf), the backend handles file generation.
   */
  async exportGrowReport(growspaceId: string, format: string = 'json'): Promise<void> {
    try {
      await this.callService(DOMAIN, SERVICES.EXPORT_GROW_REPORT, {
        growspace_id: growspaceId,
        format,
      });
    } catch (err) {
      console.error('[ReportAPI:exportGrowReport] Error:', err);
      throw err;
    }
  }

  /**
   * Fetches JSON grow report data over WebSocket if supported.
   */
  async fetchGrowReport(growspaceId: string): Promise<GrowReportData> {
    console.log(`[ReportAPI:fetchGrowReport] Fetching report for ${growspaceId}`);
    try {
      const response = await this.hass.connection.sendMessagePromise<GrowReportData>({
        type: 'growspace_manager/get_grow_report',
        growspace_id: growspaceId,
      });
      console.log('[ReportAPI:fetchGrowReport] WS call completed', response);
      return response;
    } catch (err) {
      console.error('[ReportAPI:fetchGrowReport] Error:', err);
      throw err;
    }
  }
}
