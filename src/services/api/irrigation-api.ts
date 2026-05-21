import { BaseAPI } from '../base-api';
import { DOMAIN, SERVICES } from '../../constants';
import { IrrigationStrategy } from '../../types';

/**
 * API service for irrigation control operations.
 * Handles irrigation settings, scheduling, and strategy configuration.
 */
export class IrrigationAPI extends BaseAPI {
  async setIrrigationSettings(params: {
    growspaceId: string;
    irrigationPumpEntity: string;
    drainPumpEntity: string;
    irrigationDuration: number;
    drainDuration: number;
  }): Promise<void> {
    try {
      const payload = this._serializeSettings(params);
      await this.callService(DOMAIN, SERVICES.SET_IRRIGATION_SETTINGS, payload);
    } catch (err) {
      console.error('[IrrigationAPI:setIrrigationSettings] Error:', err);
      throw err;
    }
  }

  async addIrrigationTime(params: {
    growspaceId: string;
    time: string;
    duration?: number;
  }): Promise<void> {
    try {
      const payload = {
        growspace_id: params.growspaceId,
        time: params.time,
        duration: params.duration,
      };
      await this.callService(DOMAIN, SERVICES.ADD_IRRIGATION_TIME, payload);
    } catch (err) {
      console.error('[IrrigationAPI:addIrrigationTime] Error:', err);
      throw err;
    }
  }

  async removeIrrigationTime(params: { growspaceId: string; time: string }): Promise<void> {
    try {
      const payload = {
        growspace_id: params.growspaceId,
        time: params.time,
      };
      await this.callService(DOMAIN, SERVICES.REMOVE_IRRIGATION_TIME, payload);
    } catch (err) {
      console.error('[IrrigationAPI:removeIrrigationTime] Error:', err);
      throw err;
    }
  }

  async addDrainTime(params: {
    growspaceId: string;
    time: string;
    duration?: number;
  }): Promise<void> {
    try {
      const payload = {
        growspace_id: params.growspaceId,
        time: params.time,
        duration: params.duration,
      };
      await this.callService(DOMAIN, SERVICES.ADD_DRAIN_TIME, payload);
    } catch (err) {
      console.error('[IrrigationAPI:addDrainTime] Error:', err);
      throw err;
    }
  }

  async removeDrainTime(params: { growspaceId: string; time: string }): Promise<void> {
    try {
      const payload = {
        growspace_id: params.growspaceId,
        time: params.time,
      };
      await this.callService(DOMAIN, SERVICES.REMOVE_DRAIN_TIME, payload);
    } catch (err) {
      console.error('[IrrigationAPI:removeDrainTime] Error:', err);
      throw err;
    }
  }

  async setIrrigationStrategy(
    growspaceId: string,
    strategy: Partial<IrrigationStrategy>
  ): Promise<void> {
    try {
      const payload = {
        growspace_id: growspaceId,
        ...this._serializeStrategy(strategy),
      };
      await this.callService(DOMAIN, SERVICES.SET_IRRIGATION_STRATEGY, payload);
    } catch (err) {
      console.error('[IrrigationAPI:setIrrigationStrategy] Error:', err);
      throw err;
    }
  }

  private _serializeSettings(params: {
    growspaceId: string;
    irrigationPumpEntity: string;
    drainPumpEntity: string;
    irrigationDuration: number;
    drainDuration: number;
  }): Record<string, unknown> {
    return {
      growspace_id: params.growspaceId,
      irrigation_pump_entity: params.irrigationPumpEntity,
      drain_pump_entity: params.drainPumpEntity,
      irrigation_duration: params.irrigationDuration,
      drain_duration: params.drainDuration,
    };
  }

  private _serializeStrategy(strategy: Partial<IrrigationStrategy>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    if (strategy.enabled !== undefined) result.enabled = strategy.enabled;
    if (strategy.lightsOnTime !== undefined) result.lights_on_time = strategy.lightsOnTime;
    if (strategy.p0DurationMinutes !== undefined)
      result.p0_duration_minutes = strategy.p0DurationMinutes;
    if (strategy.p2StopBeforeLightsOffMinutes !== undefined)
      result.p2_stop_before_lights_off_minutes = strategy.p2StopBeforeLightsOffMinutes;
    if (strategy.targetVwcPercent !== undefined)
      result.target_vwc_percent = strategy.targetVwcPercent;
    if (strategy.maintenanceDrybackPercent !== undefined)
      result.maintenance_dryback_percent = strategy.maintenanceDrybackPercent;
    if (strategy.shotDurationSeconds !== undefined)
      result.shot_duration_seconds = strategy.shotDurationSeconds;
    if (strategy.shotIntervalMinutes !== undefined)
      result.shot_interval_minutes = strategy.shotIntervalMinutes;
    return result;
  }

  async waterGrowspace(
    growspaceId: string,
    amount: number,
    nutrients?: Record<string, number>,
    presetId?: string
  ): Promise<void> {
    try {
      const payload: Record<string, unknown> = {
        growspace_id: growspaceId,
        amount,
      };
      if (nutrients && Object.keys(nutrients).length > 0) {
        payload.nutrients = nutrients;
      }
      if (presetId) {
        payload.preset_id = presetId;
      }
      await this.callService(DOMAIN, SERVICES.WATER_GROWSPACE, payload);
    } catch (err) {
      console.error('[IrrigationAPI:waterGrowspace] Error:', err);
      throw err;
    }
  }
  async configureDrainMonitoring(
    growspaceId: string,
    params: { enabled?: boolean; maxEcDelta?: number; targetRunoffPercent?: number }
  ): Promise<void> {
    const payload: Record<string, unknown> = { growspace_id: growspaceId };
    if (params.enabled !== undefined) payload.enabled = params.enabled;
    if (params.maxEcDelta !== undefined) payload.max_ec_delta = params.maxEcDelta;
    if (params.targetRunoffPercent !== undefined) payload.target_runoff_percent = params.targetRunoffPercent;
    await this.callService(DOMAIN, SERVICES.CONFIGURE_DRAIN_MONITORING, payload);
  }

  async logDrainReading(
    growspaceId: string,
    params: { feedEc: number; drainEc: number; feedVolumeMl?: number; drainVolumeMl?: number }
  ): Promise<void> {
    const payload: Record<string, unknown> = {
      growspace_id: growspaceId,
      feed_ec: params.feedEc,
      drain_ec: params.drainEc,
    };
    if (params.feedVolumeMl !== undefined) payload.feed_volume_ml = params.feedVolumeMl;
    if (params.drainVolumeMl !== undefined) payload.drain_volume_ml = params.drainVolumeMl;
    await this.callService(DOMAIN, SERVICES.LOG_DRAIN_READING, payload);
  }
}
