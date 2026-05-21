import { BaseAPI } from '../base-api';
import { GrowspaceDevice, GrowspaceAPIResponse } from '../../types';
import {
  GrowspaceAPICollection,
  GrowspaceAPIResponseSchema,
  GrowspaceAPICollectionSchema,
} from '../../schemas/api-schema';
import { GrowspaceAdapter } from '../../adapters/growspace-adapter';
import { DOMAIN, SERVICES, WS_TYPE_GET_DATA, WS_TYPE_UPDATE_SENSOR_COORDINATES } from '../../constants';

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
          const data = (result as unknown) as GrowspaceAPIResponse;
          this._cache.set(cacheKey, { data, timestamp: Date.now() });
          return data;
        }
        const data = (parsed.data as unknown) as GrowspaceAPIResponse;
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

          const data = (result as unknown) as GrowspaceAPICollection;
          this._cache.set(cacheKey, { data, timestamp: Date.now() });
          return data;
        }
        const data = (parsed.data as unknown) as GrowspaceAPICollection;
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
    plantsPerRow: number;
    notificationService?: string;
  }): Promise<void> {

    try {
      const payload = {
        name: data.name,
        rows: data.rows,
        plants_per_row: data.plantsPerRow,
        notification_target: data.notificationService, // Map to backend field
      };
      await this.callService(DOMAIN, SERVICES.ADD_GROWSPACE, payload);

    } catch (err) {
      console.error('[GrowspaceAPI:addGrowspace] Error:', err);
      throw err;
    }
  }

  async updateGrowspace(data: {
    growspaceId: string;
    name?: string;
    rows?: number;
    plantsPerRow?: number;
    notificationService?: string;
  }): Promise<void> {

    try {
      const payload: Record<string, unknown> = {
        growspace_id: data.growspaceId,
      };
      if (data.name) payload.name = data.name;
      if (data.rows) payload.rows = data.rows;
      if (data.plantsPerRow) payload.plants_per_row = data.plantsPerRow;
      if (data.notificationService) payload.notification_target = data.notificationService;

      await this.callService(DOMAIN, SERVICES.UPDATE_GROWSPACE, payload);

    } catch (err) {
      console.error('[GrowspaceAPI:updateGrowspace] Error:', err);
      throw err;
    }
  }

  async removeGrowspace(growspaceId: string): Promise<void> {

    try {
      await this.callService(DOMAIN, SERVICES.REMOVE_GROWSPACE, {
        growspace_id: growspaceId,
      });

    } catch (err) {
      console.error('[GrowspaceAPI:removeGrowspace] Error:', err);
      throw err;
    }
  }

  async configureEnvironment(data: {
    growspaceId: string;
    temperatureSensors?: string[];
    humiditySensors?: string[];
    vpdSensors?: string[];
    co2Sensor?: string;
    circulationFanEntity?: string;
    circulationFanEntities?: string[];
    stressThreshold?: number;
    moldThreshold?: number;
    lightSensor?: string;
    lightSensors?: string[];
    exhaustEntity?: string;
    exhaustFanEntities?: string[];
    humidifierEntity?: string;
    humidifierEntities?: string[];
    humidifierThresholds?: Record<string, Record<string, { on: number; off: number }>>;
    controlHumidifier?: boolean;
    dehumidifierEntity?: string;
    dehumidifierEntities?: string[];
    dehumidifierThresholds?: Record<string, Record<string, { on: number; off: number }>>;
    soilMoistureSensor?: string;
    controlDehumidifier?: boolean;
    vegDayHours?: number;
    flowerEarlyDayHours?: number;
    flowerMidDayHours?: number;
    flowerLateDayHours?: number;
    minimumSourceAirTemperature?: number;
    sensorGroups?: import('../../types').SensorGroup[];
    sensorCoordinates?: Record<string, { x: number; y: number; z: number; rotation?: number }>;
    irrigationTanks?: any[];
    cameraEntities?: string[];
    substrateTemperatureSensors?: string[];
    phSensors?: string[];
    feedEcSensors?: string[];
    substrateEcSensors?: string[];
    runoffEcSensors?: string[];
    drainVolumeSensors?: string[];
    irrigationFlowSensors?: string[];
    powerSensors?: string[];
    energySensors?: string[];
  }): Promise<void> {

    try {
      // Map camelCase to snake_case for API
      const payload: Record<string, unknown> = {
        growspace_id: data.growspaceId,
      };

      if (data.temperatureSensors?.length) payload.temperature_sensors = data.temperatureSensors;
      if (data.humiditySensors?.length) payload.humidity_sensors = data.humiditySensors;
      if (data.vpdSensors?.length) payload.vpd_sensors = data.vpdSensors;
      if (data.co2Sensor) payload.co2_sensor = data.co2Sensor;
      if (data.circulationFanEntity) payload.circulation_fan_entity = data.circulationFanEntity;
      if (data.circulationFanEntities)
        payload.circulation_fan_entities = data.circulationFanEntities;
      if (data.stressThreshold) payload.stress_threshold = data.stressThreshold;
      if (data.moldThreshold) payload.mold_threshold = data.moldThreshold;
      if (data.lightSensor) payload.light_sensor = data.lightSensor;
      if (data.lightSensors) payload.light_sensors = data.lightSensors;
      if (data.exhaustEntity) payload.exhaust_entity = data.exhaustEntity;
      if (data.exhaustFanEntities) payload.exhaust_fan_entities = data.exhaustFanEntities;
      if (data.humidifierEntity) payload.humidifier_entity = data.humidifierEntity;
      if (data.humidifierEntities) payload.humidifier_entities = data.humidifierEntities;
      if (data.humidifierThresholds) payload.humidifier_thresholds = data.humidifierThresholds;
      if (data.controlHumidifier !== undefined) payload.control_humidifier = data.controlHumidifier;
      if (data.dehumidifierEntity) payload.dehumidifier_entity = data.dehumidifierEntity;
      if (data.dehumidifierEntities) payload.dehumidifier_entities = data.dehumidifierEntities;
      if (data.dehumidifierThresholds)
        payload.dehumidifier_thresholds = data.dehumidifierThresholds;
      if (data.soilMoistureSensor) payload.soil_moisture_sensor = data.soilMoistureSensor;
      if (data.controlDehumidifier !== undefined)
        payload.control_dehumidifier = data.controlDehumidifier;
      if (data.vegDayHours) payload.veg_day_hours = data.vegDayHours;
      if (data.flowerEarlyDayHours) payload.flower_early_day_hours = data.flowerEarlyDayHours;
      if (data.flowerMidDayHours) payload.flower_mid_day_hours = data.flowerMidDayHours;
      if (data.flowerLateDayHours) payload.flower_late_day_hours = data.flowerLateDayHours;
      if (data.minimumSourceAirTemperature)
        payload.minimum_source_air_temperature = data.minimumSourceAirTemperature;
      if (data.sensorGroups) payload.sensor_groups = data.sensorGroups;
      if (data.sensorCoordinates) payload.sensor_coordinates = data.sensorCoordinates;
      if (data.irrigationTanks && data.irrigationTanks.length > 0) {
        payload.irrigation_tanks = data.irrigationTanks.map((t: any) => ({
          sensor_entity: t.sensorEntity,
          name: t.name,
          warning_level: t.warningLevel,
          ...(t.volumeLiters != null ? { volume_liters: t.volumeLiters } : {}),
        }));
      }
      if (data.cameraEntities) payload.camera_entities = data.cameraEntities;
      if (data.substrateTemperatureSensors?.length)
        payload.substrate_temperature_sensors = data.substrateTemperatureSensors;
      if (data.phSensors?.length) payload.ph_sensors = data.phSensors;
      if (data.feedEcSensors?.length) payload.feed_ec_sensors = data.feedEcSensors;
      if (data.substrateEcSensors?.length) payload.substrate_ec_sensors = data.substrateEcSensors;
      if (data.runoffEcSensors?.length) payload.runoff_ec_sensors = data.runoffEcSensors;
      if (data.drainVolumeSensors?.length) payload.drain_volume_sensors = data.drainVolumeSensors;
      if (data.irrigationFlowSensors?.length)
        payload.irrigation_flow_sensors = data.irrigationFlowSensors;
      if (data.powerSensors?.length) payload.power_sensors = data.powerSensors;
      if (data.energySensors?.length) payload.energy_sensors = data.energySensors;

      await this.callService(DOMAIN, SERVICES.CONFIGURE_ENVIRONMENT, payload);

    } catch (err) {
      console.error('[GrowspaceAPI:configureEnvironment] Error:', err);
      throw err;
    }
  }

  async setDehumidifierControl(growspaceId: string, enabled: boolean): Promise<void> {

    try {
      await this.callService(DOMAIN, SERVICES.SET_DEHUMIDIFIER_CONTROL, {
        growspace_id: growspaceId,
        enabled,
      });

    } catch (err) {
      console.error('[GrowspaceAPI:setDehumidifierControl] Error:', err);
      throw err;
    }
  }

  async removeEnvironment(growspaceId: string): Promise<void> {

    try {
      await this.callService(DOMAIN, SERVICES.REMOVE_ENVIRONMENT, {
        growspace_id: growspaceId,
      });

    } catch (err) {
      console.error('[GrowspaceAPI:removeEnvironment] Error:', err);
      throw err;
    }
  }

  async resetWaterTracking(growspaceId: string): Promise<void> {

    try {
      await this.callService(DOMAIN, SERVICES.RESET_WATER_TRACKING, {
        growspace_id: growspaceId,
      });

    } catch (err) {
      console.error('[GrowspaceAPI:resetWaterTracking] Error:', err);
      throw err;
    }
  }

  /**
   * Update the 3D coordinates of a sensor in a growspace.
   * Write-only WS call — no caching needed.
   */
  async updateSensorCoordinates(
    growspaceId: string,
    entityId: string,
    x: number,
    y: number,
    z: number,
    rotation?: number
  ): Promise<void> {
    await this.sendWebSocket(WS_TYPE_UPDATE_SENSOR_COORDINATES, {
      growspace_id: growspaceId,
      entity_id: entityId,
      x: Math.round(x),
      y: Math.round(y),
      z: Math.round(z),
      rotation: rotation !== undefined ? Math.round(rotation) : undefined,
    });
  }
}
