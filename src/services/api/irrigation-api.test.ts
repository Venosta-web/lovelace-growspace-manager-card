/**
 * IrrigationAPI unit tests.
 *
 * Tests cover:
 *   - setIrrigationSettings: required-only payload, full optional payload, error rethrow
 *   - runIrrigationCycle: with and without duration, error rethrow
 *   - addIrrigationTime: happy path, error rethrow
 *   - removeIrrigationTime: happy path, error rethrow
 *   - addDrainTime: with and without duration, error rethrow
 *   - removeDrainTime: happy path, error rethrow
 *   - setIrrigationStrategy: all optional strategy fields serialised, error rethrow
 *   - waterGrowspace: bare call, with nutrients, with presetId, error rethrow
 *   - configureDrainMonitoring: selective optional fields
 *   - logDrainReading: with and without volume fields
 *   - setEcTargetRanges: iterates over each range
 *   - getIrrigationAnalytics: delegates to sendWebSocketSafe
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IrrigationAPI } from './irrigation-api';
import { DOMAIN, SERVICES } from '../../constants';

// ---------------------------------------------------------------------------
// Test fixture
// ---------------------------------------------------------------------------

function makeApi(): { api: IrrigationAPI; callService: ReturnType<typeof vi.fn> } {
  const callService = vi.fn().mockResolvedValue(undefined);
  const api = new IrrigationAPI();
  // Inject a minimal hass stub
  (api as unknown as { hass: unknown }).hass = {
    callService,
    callWS: vi.fn().mockResolvedValue(null),
  };
  return { api, callService };
}

// ---------------------------------------------------------------------------
// setIrrigationSettings
// ---------------------------------------------------------------------------

describe('setIrrigationSettings', () => {
  it('sends required fields only when optional params are omitted', async () => {
    const { api, callService } = makeApi();
    await api.setIrrigationSettings({
      growspaceId: 'gs1',
      irrigationPumpEntity: 'switch.pump',
      drainPumpEntity: 'switch.drain',
      irrigationDuration: 60,
      drainDuration: 30,
    });

    expect(callService).toHaveBeenCalledWith(DOMAIN, SERVICES.SET_IRRIGATION_SETTINGS, {
      growspace_id: 'gs1',
      irrigation_pump_entity: 'switch.pump',
      drain_pump_entity: 'switch.drain',
      irrigation_duration: 60,
      drain_duration: 30,
    });
  });

  it('includes all optional fields when provided', async () => {
    const { api, callService } = makeApi();
    await api.setIrrigationSettings({
      growspaceId: 'gs1',
      irrigationPumpEntity: 'switch.pump',
      drainPumpEntity: 'switch.drain',
      irrigationDuration: 60,
      drainDuration: 30,
      soilTriggerPercent: 40,
      dailyVolumeCapLiters: 5,
      maxCyclesPerDay: 8,
      skipDuringDark: true,
      pauseOnLowTank: false,
      logToLogbook: true,
      autoAdvanceP1ToP2: true,
      autoAdvanceP2ToP3: false,
      haltOnRunoffEcThreshold: 3.5,
      activeSteeringPhase: 'p2',
    });

    const payload = callService.mock.calls[0][2];
    expect(payload.soil_trigger_percent).toBe(40);
    expect(payload.daily_volume_cap_liters).toBe(5);
    expect(payload.max_cycles_per_day).toBe(8);
    expect(payload.skip_during_dark).toBe(true);
    expect(payload.pause_on_low_tank).toBe(false);
    expect(payload.log_to_logbook).toBe(true);
    expect(payload.auto_advance_p1_to_p2).toBe(true);
    expect(payload.auto_advance_p2_to_p3).toBe(false);
    expect(payload.halt_on_runoff_ec_threshold).toBe(3.5);
    expect(payload.active_steering_phase).toBe('p2');
  });

  it('passes null optional values through (not omitted)', async () => {
    const { api, callService } = makeApi();
    await api.setIrrigationSettings({
      growspaceId: 'gs1',
      irrigationPumpEntity: 'switch.pump',
      drainPumpEntity: 'switch.drain',
      irrigationDuration: 60,
      drainDuration: 30,
      soilTriggerPercent: null,
      dailyVolumeCapLiters: null,
      haltOnRunoffEcThreshold: null,
    });

    const payload = callService.mock.calls[0][2];
    expect(payload.soil_trigger_percent).toBeNull();
    expect(payload.daily_volume_cap_liters).toBeNull();
    expect(payload.halt_on_runoff_ec_threshold).toBeNull();
  });

  it('rethrows errors from callService', async () => {
    const { api, callService } = makeApi();
    callService.mockRejectedValue(new Error('network'));

    await expect(
      api.setIrrigationSettings({
        growspaceId: 'gs1',
        irrigationPumpEntity: 'switch.pump',
        drainPumpEntity: 'switch.drain',
        irrigationDuration: 60,
        drainDuration: 30,
      })
    ).rejects.toThrow('network');
  });
});

// ---------------------------------------------------------------------------
// runIrrigationCycle
// ---------------------------------------------------------------------------

describe('runIrrigationCycle', () => {
  it('sends growspace_id without duration when duration is omitted', async () => {
    const { api, callService } = makeApi();
    await api.runIrrigationCycle({ growspaceId: 'gs1' });

    expect(callService).toHaveBeenCalledWith(DOMAIN, SERVICES.RUN_IRRIGATION_CYCLE, {
      growspace_id: 'gs1',
    });
    expect(callService.mock.calls[0][2]).not.toHaveProperty('duration');
  });

  it('sends duration when provided', async () => {
    const { api, callService } = makeApi();
    await api.runIrrigationCycle({ growspaceId: 'gs1', duration: 120 });

    expect(callService.mock.calls[0][2].duration).toBe(120);
  });

  it('rethrows errors from callService', async () => {
    const { api, callService } = makeApi();
    callService.mockRejectedValue(new Error('fail'));

    await expect(api.runIrrigationCycle({ growspaceId: 'gs1' })).rejects.toThrow('fail');
  });
});

// ---------------------------------------------------------------------------
// addIrrigationTime
// ---------------------------------------------------------------------------

describe('addIrrigationTime', () => {
  it('sends correct payload', async () => {
    const { api, callService } = makeApi();
    await api.addIrrigationTime({ growspaceId: 'gs1', time: '06:00:00', duration: 60 });

    expect(callService).toHaveBeenCalledWith(DOMAIN, SERVICES.ADD_IRRIGATION_TIME, {
      growspace_id: 'gs1',
      time: '06:00:00',
      duration: 60,
    });
  });

  it('rethrows errors from callService', async () => {
    const { api, callService } = makeApi();
    callService.mockRejectedValue(new Error('timeout'));

    await expect(
      api.addIrrigationTime({ growspaceId: 'gs1', time: '06:00:00' })
    ).rejects.toThrow('timeout');
  });
});

// ---------------------------------------------------------------------------
// removeIrrigationTime
// ---------------------------------------------------------------------------

describe('removeIrrigationTime', () => {
  it('sends correct payload', async () => {
    const { api, callService } = makeApi();
    await api.removeIrrigationTime({ growspaceId: 'gs1', time: '06:00:00' });

    expect(callService).toHaveBeenCalledWith(DOMAIN, SERVICES.REMOVE_IRRIGATION_TIME, {
      growspace_id: 'gs1',
      time: '06:00:00',
    });
  });

  it('rethrows errors from callService', async () => {
    const { api, callService } = makeApi();
    callService.mockRejectedValue(new Error('gone'));

    await expect(
      api.removeIrrigationTime({ growspaceId: 'gs1', time: '06:00:00' })
    ).rejects.toThrow('gone');
  });
});

// ---------------------------------------------------------------------------
// addDrainTime
// ---------------------------------------------------------------------------

describe('addDrainTime', () => {
  it('sends correct payload with duration', async () => {
    const { api, callService } = makeApi();
    await api.addDrainTime({ growspaceId: 'gs1', time: '18:00:00', duration: 45 });

    expect(callService).toHaveBeenCalledWith(DOMAIN, SERVICES.ADD_DRAIN_TIME, {
      growspace_id: 'gs1',
      time: '18:00:00',
      duration: 45,
    });
  });

  it('rethrows errors from callService', async () => {
    const { api, callService } = makeApi();
    callService.mockRejectedValue(new Error('drain error'));

    await expect(
      api.addDrainTime({ growspaceId: 'gs1', time: '18:00:00' })
    ).rejects.toThrow('drain error');
  });
});

// ---------------------------------------------------------------------------
// removeDrainTime
// ---------------------------------------------------------------------------

describe('removeDrainTime', () => {
  it('sends correct payload', async () => {
    const { api, callService } = makeApi();
    await api.removeDrainTime({ growspaceId: 'gs1', time: '18:00:00' });

    expect(callService).toHaveBeenCalledWith(DOMAIN, SERVICES.REMOVE_DRAIN_TIME, {
      growspace_id: 'gs1',
      time: '18:00:00',
    });
  });

  it('rethrows errors from callService', async () => {
    const { api, callService } = makeApi();
    callService.mockRejectedValue(new Error('remove drain error'));

    await expect(
      api.removeDrainTime({ growspaceId: 'gs1', time: '18:00:00' })
    ).rejects.toThrow('remove drain error');
  });
});

// ---------------------------------------------------------------------------
// setIrrigationStrategy
// ---------------------------------------------------------------------------

describe('setIrrigationStrategy', () => {
  it('serialises all strategy fields when fully provided', async () => {
    const { api, callService } = makeApi();
    await api.setIrrigationStrategy('gs1', {
      enabled: true,
      lightsOnTime: '06:00',
      p0DurationMinutes: 10,
      p2StopBeforeLightsOffMinutes: 30,
      targetVwcPercent: 65,
      maintenanceDrybackPercent: 5,
      shotDurationSeconds: 15,
      shotIntervalMinutes: 20,
      autoLightTracking: true,
    });

    const payload = callService.mock.calls[0][2];
    expect(payload.growspace_id).toBe('gs1');
    expect(payload.enabled).toBe(true);
    expect(payload.lights_on_time).toBe('06:00');
    expect(payload.p0_duration_minutes).toBe(10);
    expect(payload.p2_stop_before_lights_off_minutes).toBe(30);
    expect(payload.target_vwc_percent).toBe(65);
    expect(payload.maintenance_dryback_percent).toBe(5);
    expect(payload.shot_duration_seconds).toBe(15);
    expect(payload.shot_interval_minutes).toBe(20);
    expect(payload.auto_light_tracking).toBe(true);
  });

  it('omits undefined strategy fields', async () => {
    const { api, callService } = makeApi();
    await api.setIrrigationStrategy('gs1', { enabled: false });

    const payload = callService.mock.calls[0][2];
    expect(payload.enabled).toBe(false);
    expect(payload).not.toHaveProperty('lights_on_time');
    expect(payload).not.toHaveProperty('p0_duration_minutes');
  });

  it('rethrows errors from callService', async () => {
    const { api, callService } = makeApi();
    callService.mockRejectedValue(new Error('strategy error'));

    await expect(api.setIrrigationStrategy('gs1', { enabled: true })).rejects.toThrow(
      'strategy error'
    );
  });
});

// ---------------------------------------------------------------------------
// waterGrowspace
// ---------------------------------------------------------------------------

describe('waterGrowspace', () => {
  it('sends only growspace_id and amount when nutrients and presetId are absent', async () => {
    const { api, callService } = makeApi();
    await api.waterGrowspace('gs1', 2.5);

    expect(callService).toHaveBeenCalledWith(DOMAIN, SERVICES.WATER_GROWSPACE, {
      growspace_id: 'gs1',
      amount: 2.5,
    });
    const payload = callService.mock.calls[0][2];
    expect(payload).not.toHaveProperty('nutrients');
    expect(payload).not.toHaveProperty('preset_id');
  });

  it('includes nutrients when the map is non-empty', async () => {
    const { api, callService } = makeApi();
    await api.waterGrowspace('gs1', 2.5, { 'nutrient.a': 1.2 });

    expect(callService.mock.calls[0][2].nutrients).toEqual({ 'nutrient.a': 1.2 });
  });

  it('omits nutrients when the map is empty', async () => {
    const { api, callService } = makeApi();
    await api.waterGrowspace('gs1', 2.5, {});

    expect(callService.mock.calls[0][2]).not.toHaveProperty('nutrients');
  });

  it('includes preset_id when provided', async () => {
    const { api, callService } = makeApi();
    await api.waterGrowspace('gs1', 2.5, undefined, 'preset-abc');

    expect(callService.mock.calls[0][2].preset_id).toBe('preset-abc');
  });

  it('rethrows errors from callService', async () => {
    const { api, callService } = makeApi();
    callService.mockRejectedValue(new Error('water error'));

    await expect(api.waterGrowspace('gs1', 1)).rejects.toThrow('water error');
  });
});

// ---------------------------------------------------------------------------
// configureDrainMonitoring
// ---------------------------------------------------------------------------

describe('configureDrainMonitoring', () => {
  it('sends only defined optional fields', async () => {
    const { api, callService } = makeApi();
    await api.configureDrainMonitoring('gs1', { enabled: true, maxEcDelta: 0.5 });

    expect(callService).toHaveBeenCalledWith(DOMAIN, SERVICES.CONFIGURE_DRAIN_MONITORING, {
      growspace_id: 'gs1',
      enabled: true,
      max_ec_delta: 0.5,
    });
    expect(callService.mock.calls[0][2]).not.toHaveProperty('target_runoff_percent');
  });

  it('includes targetRunoffPercent when provided', async () => {
    const { api, callService } = makeApi();
    await api.configureDrainMonitoring('gs1', { targetRunoffPercent: 20 });

    expect(callService.mock.calls[0][2].target_runoff_percent).toBe(20);
  });
});

// ---------------------------------------------------------------------------
// logDrainReading
// ---------------------------------------------------------------------------

describe('logDrainReading', () => {
  it('sends required ec fields without volume fields', async () => {
    const { api, callService } = makeApi();
    await api.logDrainReading('gs1', { feedEc: 2.1, drainEc: 1.8 });

    expect(callService).toHaveBeenCalledWith(DOMAIN, SERVICES.LOG_DRAIN_READING, {
      growspace_id: 'gs1',
      feed_ec: 2.1,
      drain_ec: 1.8,
    });
    const payload = callService.mock.calls[0][2];
    expect(payload).not.toHaveProperty('feed_volume_ml');
    expect(payload).not.toHaveProperty('drain_volume_ml');
  });

  it('includes volume fields when provided', async () => {
    const { api, callService } = makeApi();
    await api.logDrainReading('gs1', {
      feedEc: 2.1,
      drainEc: 1.8,
      feedVolumeMl: 500,
      drainVolumeMl: 100,
    });

    const payload = callService.mock.calls[0][2];
    expect(payload.feed_volume_ml).toBe(500);
    expect(payload.drain_volume_ml).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// setEcTargetRanges
// ---------------------------------------------------------------------------

describe('setEcTargetRanges', () => {
  it('calls callService once per range', async () => {
    const { api, callService } = makeApi();
    await api.setEcTargetRanges('gs1', [
      { stage: 'veg', minEc: 1.2, maxEc: 1.8 },
      { stage: 'flower_early', minEc: 1.6, maxEc: 2.2 },
    ]);

    expect(callService).toHaveBeenCalledTimes(2);
    expect(callService.mock.calls[0][2]).toMatchObject({
      growspace_id: 'gs1',
      stage: 'veg',
      feed_ec_min: 1.2,
      feed_ec_max: 1.8,
    });
    expect(callService.mock.calls[1][2]).toMatchObject({
      growspace_id: 'gs1',
      stage: 'flower_early',
      feed_ec_min: 1.6,
      feed_ec_max: 2.2,
    });
  });

  it('makes no calls for an empty array', async () => {
    const { api, callService } = makeApi();
    await api.setEcTargetRanges('gs1', []);

    expect(callService).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// getIrrigationAnalytics
// ---------------------------------------------------------------------------

describe('getIrrigationAnalytics', () => {
  it('returns analytics data when the WebSocket responds', async () => {
    const api = new IrrigationAPI();
    const expected = { growspace_id: 'gs1', stage_aggregates: { veg: 42 } };
    (api as unknown as { hass: unknown }).hass = {
      callWS: vi.fn().mockResolvedValue(expected),
    };

    const result = await api.getIrrigationAnalytics('gs1');

    expect(result).toEqual(expected);
  });

  it('returns null when the WebSocket call fails', async () => {
    const api = new IrrigationAPI();
    (api as unknown as { hass: unknown }).hass = {
      callWS: vi.fn().mockRejectedValue(new Error('ws error')),
    };

    const result = await api.getIrrigationAnalytics('gs1');

    expect(result).toBeNull();
  });
});
