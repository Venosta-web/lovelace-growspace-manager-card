import { BaseAPI } from '../base-api';
import { GrowspaceDevice, GrowspaceAPIResponse } from '../../types';
import { GrowspaceAPICollection } from '../../schemas/api-schema';
import { GrowspaceAdapter } from '../../adapters/growspace-adapter';
import { DOMAIN, SERVICES, WS_TYPE_GET_DATA } from '../../constants';
import {
    GrowspaceAPIResponseSchema,
    GrowspaceAPICollectionSchema,
} from '../../schemas/api-schema';

/**
 * API service for growspace operations.
 * Handles growspace data fetching, CRUD, environment configuration, and caching.
 */
export class GrowspaceAPI extends BaseAPI {
    private static readonly CACHE_TTL_MS = 30_000; // 30 seconds
    private _cache = new Map<
        string,
        { data: GrowspaceAPIResponse | GrowspaceAPICollection; timestamp: number }
    >();

    /**
     * Invalidate cache for a specific growspace or all growspaces.
     * Call this when receiving GROWSPACE_UPDATED WebSocket events.
     */
    invalidateCache(growspaceId?: string): void {
        if (growspaceId) {
            this._cache.delete(growspaceId);
            this._cache.delete('__all__'); // Also invalidate collection cache
        } else {
            this._cache.clear();
        }
        console.debug('[GrowspaceAPI] Cache invalidated:', growspaceId || 'all');
    }

    /**
     * Check if cached data is still valid (within TTL).
     */
    private _isCacheValid(key: string): boolean {
        const cached = this._cache.get(key);
        if (!cached) return false;
        return Date.now() - cached.timestamp < GrowspaceAPI.CACHE_TTL_MS;
    }

    async fetchGrowspaceData(
        growspaceId?: string
    ): Promise<GrowspaceAPIResponse | GrowspaceAPICollection | null> {
        if (!this.hass) return null;

        // Check cache first
        const cacheKey = growspaceId || '__all__';
        if (this._isCacheValid(cacheKey)) {
            const cached = this._cache.get(cacheKey);
            console.debug(`[GrowspaceAPI] Returning cached data for ${cacheKey}`);
            return cached!.data;
        }

        try {
            const result = await this.hass.connection.sendMessagePromise<unknown>({
                type: WS_TYPE_GET_DATA,
                growspace_id: growspaceId,
            });

            // Runtime Validation
            if (growspaceId) {
                // Expect Single Response
                const parsed = GrowspaceAPIResponseSchema.safeParse(result);
                if (!parsed.success) {
                    console.error(
                        `[GrowspaceAPI] API Validation Failed for ${growspaceId}: `,
                        parsed.error.format()
                    );
                    const data = result as GrowspaceAPIResponse;
                    this._cache.set(cacheKey, { data, timestamp: Date.now() });
                    return data;
                }
                const data = parsed.data as unknown as GrowspaceAPIResponse;
                this._cache.set(cacheKey, { data, timestamp: Date.now() });
                return data;
            } else {
                // Expect Collection
                const parsed = GrowspaceAPICollectionSchema.safeParse(result);
                if (!parsed.success) {
                    console.error(
                        '[GrowspaceAPI] API Validation Failed for Collection (All Data):',
                        JSON.stringify(parsed.error.format(), null, 2)
                    );

                    // Log which growspace ID failed if we can find it
                    if (typeof result === 'object' && result !== null) {
                        for (const [gid, gdata] of Object.entries(result)) {
                            const itemParsed = GrowspaceAPIResponseSchema.safeParse(gdata);
                            if (!itemParsed.success) {
                                console.error(
                                    `[GrowspaceAPI] -> Found problematic item: ${gid}`,
                                    JSON.stringify(itemParsed.error.format(), null, 2)
                                );
                            }
                        }
                    }

                    const data = result as GrowspaceAPICollection;
                    this._cache.set(cacheKey, { data, timestamp: Date.now() });
                    return data;
                }
                const data = parsed.data as unknown as GrowspaceAPICollection;
                this._cache.set(cacheKey, { data, timestamp: Date.now() });
                return data;
            }
        } catch (err) {
            console.error('[GrowspaceAPI:fetchGrowspaceData] Error:', err);
            return null;
        }
    }

    /**
     * Pure transformation: converts WebSocket data map to GrowspaceDevice array.
     * Stateless - no internal caching. Caller (GrowspaceStore) is responsible for caching.
     */
    getGrowspaceDevices(wsDataMap: Record<string, GrowspaceAPIResponse> = {}): GrowspaceDevice[] {
        if (!wsDataMap) return [];

        return Object.values(wsDataMap)
            .map((wsData) => GrowspaceAdapter.transformGrowspace(null, wsData))
            .filter((d): d is GrowspaceDevice => d !== null);
    }

    async addGrowspace(data: {
        name: string;
        rows: number;
        plants_per_row: number;
        notification_service?: string;
    }): Promise<void> {
        console.log('[GrowspaceAPI:addGrowspace] Adding growspace:', data);
        try {
            const payload = {
                name: data.name,
                rows: data.rows,
                plants_per_row: data.plants_per_row,
                notification_target: data.notification_service, // Map to backend field
            };
            await this.callService(DOMAIN, SERVICES.ADD_GROWSPACE, payload);
            console.log('[GrowspaceAPI:addGrowspace] Service Called');
        } catch (err) {
            console.error('[GrowspaceAPI:addGrowspace] Error:', err);
            throw err;
        }
    }

    async updateGrowspace(data: {
        growspace_id: string;
        name?: string;
        rows?: number;
        plants_per_row?: number;
        notification_service?: string;
    }): Promise<void> {
        console.log('[GrowspaceAPI:updateGrowspace] Updating growspace:', data);
        try {
            const payload: Record<string, unknown> = {
                growspace_id: data.growspace_id,
            };
            if (data.name) payload.name = data.name;
            if (data.rows) payload.rows = data.rows;
            if (data.plants_per_row) payload.plants_per_row = data.plants_per_row;
            if (data.notification_service) payload.notification_target = data.notification_service;

            await this.callService(DOMAIN, SERVICES.UPDATE_GROWSPACE, payload);
            console.log('[GrowspaceAPI:updateGrowspace] Service Called');
        } catch (err) {
            console.error('[GrowspaceAPI:updateGrowspace] Error:', err);
            throw err;
        }
    }

    async removeGrowspace(growspaceId: string): Promise<void> {
        console.log('[GrowspaceAPI:removeGrowspace] Removing growspace:', growspaceId);
        try {
            await this.callService(DOMAIN, SERVICES.REMOVE_GROWSPACE, {
                growspace_id: growspaceId,
            });
            console.log('[GrowspaceAPI:removeGrowspace] Service Called');
        } catch (err) {
            console.error('[GrowspaceAPI:removeGrowspace] Error:', err);
            throw err;
        }
    }

    async configureEnvironment(data: {
        growspace_id: string;
        temperature_sensor: string;
        humidity_sensor: string;
        vpd_sensor?: string;
        co2_sensor?: string;
        circulation_fan_entity?: string;
        stress_threshold?: number;
        mold_threshold?: number;
        light_sensor?: string;
        exhaust_entity?: string;
        humidifier_entity?: string;
        dehumidifier_entity?: string;
        dehumidifier_thresholds?: Record<string, Record<string, { on: number; off: number }>>;
        soil_moisture_sensor?: string;
        control_dehumidifier?: boolean;
        veg_day_hours?: number;
        flower_early_day_hours?: number;
        flower_mid_day_hours?: number;
        flower_late_day_hours?: number;
        minimum_source_air_temperature?: number;
    }): Promise<void> {
        console.log('[GrowspaceAPI:configureEnvironment] Configuring sensors:', data);
        try {
            await this.callService(DOMAIN, SERVICES.CONFIGURE_ENVIRONMENT, data);
            console.log('[GrowspaceAPI:configureEnvironment] Service Called');
        } catch (err) {
            console.error('[GrowspaceAPI:configureEnvironment] Error:', err);
            throw err;
        }
    }

    async setDehumidifierControl(growspaceId: string, enabled: boolean): Promise<void> {
        console.log(
            `[GrowspaceAPI:setDehumidifierControl] Setting dehumidifier control for ${growspaceId} to ${enabled}`
        );
        try {
            await this.callService(DOMAIN, SERVICES.SET_DEHUMIDIFIER_CONTROL, {
                growspace_id: growspaceId,
                enabled,
            });
            console.log('[GrowspaceAPI:setDehumidifierControl] Service Called');
        } catch (err) {
            console.error('[GrowspaceAPI:setDehumidifierControl] Error:', err);
            throw err;
        }
    }
}
