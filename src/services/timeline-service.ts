import { HomeAssistant } from 'custom-card-helpers';
import type { GrowspaceEvent } from '../types';
import { WS_TYPE_GET_LOG, WS_TYPE_GET_ALERTS } from '../constants';

/**
 * Payload for creating a new timeline note
 */
export interface NotePayload {
    notes: string;
    images?: string[];
    tags?: string[];
    transitionDate?: string;
}

/**
 * Service for timeline and event log operations
 * Centralizes all backend API calls related to timelines
 */
export class TimelineService {
    constructor(private hass: HomeAssistant) { }

    /**
     * Fetch growspace event log
     * @param growspaceId - The growspace ID to fetch events for
     * @param limit - Maximum number of events to fetch (default: 50)
     */
    async fetchGrowspaceEvents(
        growspaceId: string,
        limit = 50
    ): Promise<GrowspaceEvent[]> {
        try {
            // Fetch both logs (user/system) and alerts (environmental) concurrently
            const [logsResponse, alertsResponse] = await Promise.all([
                this.hass.callWS<Record<string, GrowspaceEvent[]>>({
                    type: WS_TYPE_GET_LOG,
                    growspace_id: growspaceId,
                    limit, // User logs are less frequent, standard limit ok
                }),
                this.hass.callWS<Record<string, GrowspaceEvent[]>>({
                    type: WS_TYPE_GET_ALERTS,
                    growspace_id: growspaceId,
                    limit: 300, // Alerts are frequent, need higher limit to not miss recent ones
                })
            ]);

            const logs = logsResponse?.[growspaceId] || [];
            const alerts = alertsResponse?.[growspaceId] || [];

            // Combine and sort by timestamp descending
            const combined = [...logs, ...alerts].sort((a, b) => {
                const tA = new Date(a.timestamp || a.start_time).getTime();
                const tB = new Date(b.timestamp || b.start_time).getTime();
                return tB - tA; // Newest first
            });

            return combined;
        } catch (e) {
            console.error('Error fetching growspace events:', e);
            throw e;
        }
    }

    /**
     * Add a note to a plant timeline
     * @param plantId - The plant ID to add the note to
     * @param payload - Note data including text, images, and tags
     */
    async addPlantNote(plantId: string, payload: NotePayload): Promise<void> {
        await this.hass.callWS({
            type: 'growspace_manager/add_timeline_note',
            plant_id: plantId,
            notes: payload.notes,
            images: payload.images || [],
            transition_date: payload.transitionDate || new Date().toISOString(),
        });
    }

    /**
     * Delete a timeline event
     * @param eventId - The event ID to delete
     */
    async deleteEvent(eventId: string | number): Promise<void> {
        await this.hass.callWS({
            type: 'growspace_manager/remove_timeline_event',
            event_id: eventId,
        });
    }
}

/**
 * Singleton factory for TimelineService
 * Ensures only one instance exists per HASS instance
 */
let _instance: TimelineService | null = null;

export function getTimelineService(hass: HomeAssistant): TimelineService {
    // Create new instance if none exists or HASS instance changed
    if (!_instance || (_instance as any).hass !== hass) {
        _instance = new TimelineService(hass);
    }
    return _instance;
}
