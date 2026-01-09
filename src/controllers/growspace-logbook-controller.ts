import { HomeAssistant } from 'custom-card-helpers';
import { GrowspaceEvent } from '../types';

export class GrowspaceLogbookController {
  async fetchEventLog(hass: HomeAssistant, growspaceId: string, limit?: number): Promise<GrowspaceEvent[]> {
    if (!hass) {
      console.warn('Home Assistant instance not available');
      return [];
    }

    try {
      const response = await hass.callWS<Record<string, GrowspaceEvent[]>>({
        type: 'growspace_manager/get_log',
        growspace_id: growspaceId,
        limit,
      });

      return response[growspaceId] || [];
    } catch (e) {
      console.error('Error fetching event log:', e);
      return [];
    }
  }
}
