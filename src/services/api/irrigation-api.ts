import { BaseAPI } from '../base-api';
import { DOMAIN, SERVICES } from '../../constants';
import { IrrigationStrategy } from '../../types';
import type { ECTargetRange } from '../types';

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
    soilTriggerPercent?: number | null;
    dailyVolumeCapLiters?: number | null;
    maxCyclesPerDay?: number | null;
    skipDuringDark?: boolean;
    pauseOnLowTank?: boolean;
    logToLogbook?: boolean;
    autoAdvanceP1ToP2?: boolean;
    autoAdvanceP2ToP3?: boolean;
    haltOnRunoffEcThreshold?: number | null;
    activeSteeringPhase?: 'p1' | 'p2' | 'p3';
  }): Promise<void> {
    try {
      const payload = this._serializeSettings(params);
      await this.callService(DOMAIN, SERVICES.SET_IRRIGATION_SETTINGS, payload);
    } catch (err) {
      console.error('[IrrigationAPI:setIrrigationSettings] Error:', err);
      throw err;
    }
  }

  async runIrrigationCycle(params: { growspaceId: string; duration?: number }): Promise<void> {
    try {
      const payload: Record<string, unknown> = { growspace_id: params.growspaceId };
      if (params.duration !== undefined) {
        payload.duration = params.duration;
      }
      await this.callService(DOMAIN, SERVICES.RUN_IRRIGATION_CYCLE, payload);
    } catch (err) {
      console.error('[IrrigationAPI:runIrrigationCycle] Error:', err);
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
    soilTriggerPercent?: number | null;
    dailyVolumeCapLiters?: number | null;
    maxCyclesPerDay?: number | null;
    skipDuringDark?: boolean;
    pauseOnLowTank?: boolean;
    logToLogbook?: boolean;
    autoAdvanceP1ToP2?: boolean;
    autoAdvanceP2ToP3?: boolean;
    haltOnRunoffEcThreshold?: number | null;
    activeSteeringPhase?: 'p1' | 'p2' | 'p3';
  }): Record<string, unknown> {
    const result: Record<string, unknown> = {
      growspace_id: params.growspaceId,
      irrigation_pump_entity: params.irrigationPumpEntity,
      drain_pump_entity: params.drainPumpEntity,
      irrigation_duration: params.irrigationDuration,
      drain_duration: params.drainDuration,
    };
    if (params.soilTriggerPercent !== undefined) result.soil_trigger_percent = params.soilTriggerPercent;
    if (params.dailyVolumeCapLiters !== undefined) result.daily_volume_cap_liters = params.dailyVolumeCapLiters;
    if (params.maxCyclesPerDay !== undefined) result.max_cycles_per_day = params.maxCyclesPerDay;
    if (params.skipDuringDark !== undefined) result.skip_during_dark = params.skipDuringDark;
    if (params.pauseOnLowTank !== undefined) result.pause_on_low_tank = params.pauseOnLowTank;
    if (params.logToLogbook !== undefined) result.log_to_logbook = params.logToLogbook;
    if (params.autoAdvanceP1ToP2 !== undefined) result.auto_advance_p1_to_p2 = params.autoAdvanceP1ToP2;
    if (params.autoAdvanceP2ToP3 !== undefined) result.auto_advance_p2_to_p3 = params.autoAdvanceP2ToP3;
    if (params.haltOnRunoffEcThreshold !== undefined) result.halt_on_runoff_ec_threshold = params.haltOnRunoffEcThreshold;
    if (params.activeSteeringPhase !== undefined) result.active_steering_phase = params.activeSteeringPhase;
    return result;
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
    if (strategy.autoLightTracking !== undefined)
      result.auto_light_tracking = strategy.autoLightTracking;
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

  async setEcTargetRanges(growspaceId: string, ranges: ECTargetRange[]): Promise<void> {
    for (const r of ranges) {
      const payload = {
        growspace_id: growspaceId,
        stage: r.stage,
        feed_ec_min: r.minEc,
        feed_ec_max: r.maxEc,
      };
      await this.callService(DOMAIN, SERVICES.SET_EC_TARGET_RANGE, payload);
    }
  }

  async getIrrigationAnalytics(
    growspaceId: string
  ): Promise<{ growspace_id: string; stage_aggregates: Record<string, number> } | null> {
    return this.sendWebSocket(`${DOMAIN}/irrigation_analytics`, { growspace_id: growspaceId });
  }
}
