import { BaseAPI } from '../base-api';
import { HistorySensorState } from '../../types';
import { WS_TYPE_GET_HISTORY_STATS } from '../../constants';
import { HistoryStatsResponseSchema } from '../../schemas/api-schema';

/**
 * API service for history and statistics operations.
 * Handles fetching historical sensor data via REST and WebSocket APIs.
 */
export class HistoryAPI extends BaseAPI {
    /**
     * Fetch history for a single entity using Home Assistant REST API.
     * @param entityId - Entity ID to fetch history for
     * @param startTime - Start time for history
     * @param endTime - Optional end time
     * @returns Array of historical states
     */
    async getHistory(
        entityId: string,
        startTime: Date,
        endTime?: Date
    ): Promise<HistorySensorState[]> {
        if (!this.hass) return [];

        const startStr = startTime.toISOString();
        let url = `history/period/${startStr}?filter_entity_id=${entityId}`;
        if (endTime) {
            url += `&end_time=${endTime.toISOString()}`;
        }

        try {
            const res = await this.hass.callApi<HistorySensorState[][]>('GET', url);
            return res && res.length > 0 ? res[0] : [];
        } catch (err) {
            console.error('Error fetching history:', err);
            return [];
        }
    }

    /**
     * Fetch history for multiple entities in a single optimized request.
     * @param entityIds - Array of entity IDs
     * @param startTime - Start time for history
     * @param endTime - Optional end time
     * @returns Map of entity ID to historical states
     */
    async getBatchHistory(
        entityIds: string[],
        startTime: Date,
        endTime?: Date
    ): Promise<Record<string, HistorySensorState[]>> {
        if (!this.hass || entityIds.length === 0) return {};

        const startStr = startTime.toISOString();
        const entityList = entityIds.join(',');

        // OPTIMIZATION: Request all entities in ONE call
        let url = `history/period/${startStr}?filter_entity_id=${entityList}&minimal_response`;

        if (endTime) {
            url += `&end_time=${endTime.toISOString()}`;
        }

        const duration = endTime
            ? (endTime.getTime() - startTime.getTime()) / 1000
            : 'undefined';
        console.log(
            `[HistoryAPI.getBatchHistory] entities=${entityIds.length}, start=${startStr}, end=${endTime?.toISOString() || 'undefined'}, duration=${duration}s, url=${url}`
        );
        console.log(`[HistoryAPI.getBatchHistory] About to call API with URL: ${url}`);

        try {
            // HA returns an array of arrays (one array per entity)
            const res = await this.hass.callApi<HistorySensorState[][]>('GET', url);

            const resultMap: Record<string, HistorySensorState[]> = {};

            if (res) {
                res.forEach((entityHistory) => {
                    if (entityHistory && entityHistory.length > 0) {
                        // Map back to entity_id from the first record
                        const id = entityHistory[0].entity_id;
                        resultMap[id] = entityHistory;
                    }
                });
            }
            return resultMap;
        } catch (err) {
            console.error('[HistoryAPI] Error fetching batch history:', err);
            return {};
        }
    }

    /**
     * Fetch history with downsampled statistics via WebSocket API.
     * Falls back to REST batch history if WebSocket fails.
     * @param entityIds - Array of entity IDs
     * @param startTime - Start time for history
     * @param endTime - Optional end time
     * @param intervalMinutes - Downsampling interval in minutes (default: 15)
     * @param significantChangesOnly - Only include significant changes (default: true)
     * @returns Map of entity ID to downsampled historical states
     */
    async getHistoryStats(
        entityIds: string[],
        startTime: Date,
        endTime?: Date,
        intervalMinutes: number = 15,
        significantChangesOnly: boolean = true
    ): Promise<Record<string, HistorySensorState[]>> {
        if (!this.hass || entityIds.length === 0) return {};

        try {
            const result = await this.hass.callWS<unknown>({
                type: WS_TYPE_GET_HISTORY_STATS,
                entity_ids: entityIds,
                start_time: startTime.toISOString(),
                end_time: endTime?.toISOString(),
                interval_minutes: intervalMinutes,
                significant_changes_only: significantChangesOnly,
            });

            const parsed = HistoryStatsResponseSchema.safeParse(result);
            if (!parsed.success) {
                console.warn('[HistoryAPI] History Stats Validation Failed:', parsed.error.format());
                // Fallback or empty? Fallback to batch history might be better if WS returns garbage.
                throw new Error('Validation Failed');
            }

            // Map compact format back to standard formats for ChartUtils compatibility
            const mappedResult: Record<string, HistorySensorState[]> = {};
            for (const [entityId, points] of Object.entries(parsed.data)) {
                mappedResult[entityId] = points.map((p) => ({
                    entity_id: entityId,
                    state: p.s,
                    last_changed: p.lu,
                    last_updated: p.lu,
                    attributes: p.a || {},
                }));
            }
            return mappedResult;
        } catch (err) {
            console.warn(
                '[HistoryAPI] getHistoryStats WS failed, falling back to REST batch. Error:',
                err
            );
            console.log(
                `[HistoryAPI] Fallback params: start=${startTime.toISOString()}, end=${endTime?.toISOString() || 'undefined'}`
            );
            return this.getBatchHistory(entityIds, startTime, endTime);
        }
    }
}
