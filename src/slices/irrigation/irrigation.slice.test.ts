/**
 * Irrigation slice — unit tests.
 *
 * Covers:
 *   - computeIrrigationMode: mode derivation from strategy.enabled
 *   - computePhaseWindows: P0–P3 phase derivation from strategy
 *   - setIrrigationConfig / setIrrigationStrategy / setTankLevels: bootstrap writes
 *   - toggleIrrigationMode: optimistic toggle + service call + rollback
 *   - addIrrigationTime / removeIrrigationTime: optimistic schedule edits + rollback
 *   - addDrainTime / removeDrainTime: optimistic drain edits + rollback
 *   - updateIrrigationStrategy: optimistic strategy update + rollback
 *   - saveIrrigationSettings: optimistic settings patch + rollback
 *   - logDrainReading / configureDrainMonitoring / runIrrigationCycle: fire-and-forget calls
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { IrrigationConfig, IrrigationStrategy, IrrigationTank } from '../../services/types';
import * as hassCall from '../../services/hass-call';
import {
  irrigationConfigs$,
  irrigationStrategies$,
  tankLevels$,
  setIrrigationConfig,
  setIrrigationStrategy,
  setTankLevels,
  computeIrrigationMode,
  computePhaseWindows,
  toggleIrrigationMode,
  addIrrigationTime,
  removeIrrigationTime,
  addDrainTime,
  removeDrainTime,
  updateIrrigationStrategy,
  saveIrrigationSettings,
  logDrainReading,
  configureDrainMonitoring,
  runIrrigationCycle,
} from './index';
import {
  IrrigationModeSchema,
  SetIrrigationStrategyPayloadSchema,
  SaveIrrigationSettingsPayloadSchema,
  AddIrrigationTimePayloadSchema,
  RemoveIrrigationTimePayloadSchema,
  AddDrainTimePayloadSchema,
  RemoveDrainTimePayloadSchema,
  LogDrainReadingPayloadSchema,
  ConfigureDrainMonitoringPayloadSchema,
  RunIrrigationCyclePayloadSchema,
  PhaseWindowSchema,
  PhaseWindowsSchema,
} from './schema';

vi.mock('../../services/hass-call', () => ({
  callService: vi.fn().mockResolvedValue(undefined),
  setHass: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeConfig(overrides: Partial<IrrigationConfig> = {}): IrrigationConfig {
  return {
    irrigationTimes: [],
    drainTimes: [],
    ...overrides,
  };
}

function makeStrategy(overrides: Partial<IrrigationStrategy> = {}): IrrigationStrategy {
  return {
    enabled: true,
    lightsOnTime: '06:00',
    p0DurationMinutes: 60,
    p2StopBeforeLightsOffMinutes: 120,
    targetVwcPercent: 65,
    maintenanceDrybackPercent: 3,
    shotDurationSeconds: 30,
    shotIntervalMinutes: 15,
    ...overrides,
  };
}

beforeEach(() => {
  irrigationConfigs$.set(new Map());
  irrigationStrategies$.set(new Map());
  tankLevels$.set(new Map());
  vi.clearAllMocks();
  vi.mocked(hassCall.callService).mockResolvedValue(undefined);
});

// ---------------------------------------------------------------------------
// computeIrrigationMode (pure)
// ---------------------------------------------------------------------------

describe('computeIrrigationMode', () => {
  it('returns "crop_steering" when strategy.enabled is true', () => {
    expect(computeIrrigationMode(makeStrategy({ enabled: true }))).toBe('crop_steering');
  });

  it('returns "manual" when strategy.enabled is false', () => {
    expect(computeIrrigationMode(makeStrategy({ enabled: false }))).toBe('manual');
  });

  it('returns "manual" when strategy is undefined', () => {
    expect(computeIrrigationMode(undefined)).toBe('manual');
  });
});

// ---------------------------------------------------------------------------
// computePhaseWindows (pure)
// ---------------------------------------------------------------------------

describe('computePhaseWindows', () => {
  it('returns null when strategy is disabled', () => {
    expect(computePhaseWindows(makeStrategy({ enabled: false }))).toBeNull();
  });

  it('returns null when strategy is undefined', () => {
    expect(computePhaseWindows(undefined)).toBeNull();
  });

  it('derives lightsOnMin from lightsOnTime', () => {
    const windows = computePhaseWindows(
      makeStrategy({ lightsOnTime: '06:00', p0DurationMinutes: 60 })
    );
    expect(windows?.lightsOnMin).toBe(360); // 6 * 60
  });

  it('derives p1 window starting at lightsOnMin', () => {
    const windows = computePhaseWindows(
      makeStrategy({
        lightsOnTime: '06:00',
        p0DurationMinutes: 60,
      }),
      18
    );
    // P1 (Saturation): lightsOnMin to lightsOnMin + p0DurationMinutes
    expect(windows?.phases[0].id).toBe('p1');
    expect(windows?.phases[0].start).toBe(360);
    expect(windows?.phases[0].end).toBe(420); // 360 + 60
  });

  it('derives p3 window ending at lightsOffMin', () => {
    const windows = computePhaseWindows(
      makeStrategy({
        lightsOnTime: '06:00',
        p0DurationMinutes: 60,
        p2StopBeforeLightsOffMinutes: 120,
      }),
      18
    );
    // lightsOffMin = 360 + 18*60 = 1440
    const lightsOffMin = 360 + 18 * 60;
    expect(windows?.phases[2].id).toBe('p3');
    expect(windows?.phases[2].end).toBe(lightsOffMin);
  });

  it('uses default 18h photoperiod when vegDayHours not specified', () => {
    const windows = computePhaseWindows(makeStrategy({ lightsOnTime: '06:00' }));
    expect(windows?.lightsOffMin).toBe(360 + 18 * 60);
  });

  it('uses default fallback values when strategy fields are undefined', () => {
    const windows = computePhaseWindows({
      enabled: true,
      lightsOnTime: undefined,
      p0DurationMinutes: undefined,
      p2StopBeforeLightsOffMinutes: undefined,
      maintenanceDrybackPercent: undefined,
    } as any);

    expect(windows).not.toBeNull();
    // Default lightsOnTime '06:00' -> 360
    expect(windows?.lightsOnMin).toBe(360);
    // Default photoperiod 18h -> lightsOffMin = 360 + 18 * 60 = 1440
    expect(windows?.lightsOffMin).toBe(1440);

    // Default p0DurationMinutes 60 -> p1End = 360 + 60 = 420
    expect(windows?.phases[0].end).toBe(420);

    // Default p2StopBeforeLightsOffMinutes 120 -> p3Start = 1440 - 120 = 1320
    expect(windows?.phases[2].start).toBe(1320);

    // Default maintenanceDrybackPercent 3 -> label incorporates '−3% VWC'
    expect(windows?.phases[2].target).toBe('−3% VWC');
  });
});

// ---------------------------------------------------------------------------
// Bootstrap writes
// ---------------------------------------------------------------------------

describe('setIrrigationConfig', () => {
  it('stores the config keyed by growspaceId', () => {
    const cfg = makeConfig({ irrigationTimes: [{ time: '08:00', duration: 60 }] });
    setIrrigationConfig('gs1', cfg);

    expect(irrigationConfigs$.get().get('gs1')).toEqual(cfg);
  });

  it('preserves configs for other growspaces', () => {
    setIrrigationConfig('gs1', makeConfig());
    setIrrigationConfig('gs2', makeConfig({ drainTimes: [{ time: '18:00', duration: 30 }] }));

    expect(irrigationConfigs$.get().has('gs1')).toBe(true);
    expect(irrigationConfigs$.get().has('gs2')).toBe(true);
  });
});

describe('setIrrigationStrategy', () => {
  it('stores the strategy keyed by growspaceId', () => {
    const strat = makeStrategy({ enabled: true, lightsOnTime: '07:00' });
    setIrrigationStrategy('gs1', strat);

    expect(irrigationStrategies$.get().get('gs1')).toEqual(strat);
  });
});

describe('setTankLevels', () => {
  it('stores tanks keyed by growspaceId', () => {
    const tanks: IrrigationTank[] = [
      {
        sensorEntity: 'sensor.tank1',
        name: 'Tank 1',
        warningLevel: 20,
        fillLevel: 80,
        isWarning: false,
      },
    ];
    setTankLevels('gs1', tanks);

    expect(tankLevels$.get().get('gs1')).toEqual(tanks);
  });
});

// ---------------------------------------------------------------------------
// toggleIrrigationMode
// ---------------------------------------------------------------------------

describe('toggleIrrigationMode', () => {
  it('switches from manual to crop_steering (sets strategy.enabled = true)', async () => {
    setIrrigationStrategy('gs1', makeStrategy({ enabled: false }));

    await toggleIrrigationMode('gs1');

    expect(irrigationStrategies$.get().get('gs1')?.enabled).toBe(true);
  });

  it('switches from crop_steering to manual (sets strategy.enabled = false)', async () => {
    setIrrigationStrategy('gs1', makeStrategy({ enabled: true }));

    await toggleIrrigationMode('gs1');

    expect(irrigationStrategies$.get().get('gs1')?.enabled).toBe(false);
  });

  it('calls set_irrigation_strategy service with the updated enabled flag', async () => {
    setIrrigationStrategy('gs1', makeStrategy({ enabled: false }));

    await toggleIrrigationMode('gs1');

    expect(hassCall.callService).toHaveBeenCalledWith(
      'growspace_manager',
      'set_irrigation_strategy',
      expect.objectContaining({ growspace_id: 'gs1', enabled: true })
    );
  });

  it('rolls back optimistic update when service call fails', async () => {
    setIrrigationStrategy('gs1', makeStrategy({ enabled: false }));
    vi.mocked(hassCall.callService).mockRejectedValueOnce(new Error('backend error'));

    await expect(toggleIrrigationMode('gs1')).rejects.toThrow();

    expect(irrigationStrategies$.get().get('gs1')?.enabled).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// addIrrigationTime
// ---------------------------------------------------------------------------

describe('addIrrigationTime', () => {
  it('appends the new time to the config immediately (optimistic)', async () => {
    setIrrigationConfig('gs1', makeConfig());

    await addIrrigationTime('gs1', '08:00', 60);

    expect(irrigationConfigs$.get().get('gs1')?.irrigationTimes).toContainEqual(
      expect.objectContaining({ time: '08:00', duration: 60 })
    );
  });

  it('calls add_irrigation_time service with correct payload', async () => {
    setIrrigationConfig('gs1', makeConfig());

    await addIrrigationTime('gs1', '08:00', 60);

    expect(hassCall.callService).toHaveBeenCalledWith(
      'growspace_manager',
      'add_irrigation_time',
      expect.objectContaining({ growspace_id: 'gs1', time: '08:00', duration: 60 })
    );
  });

  it('sorts irrigation times after adding', async () => {
    setIrrigationConfig('gs1', makeConfig({ irrigationTimes: [{ time: '12:00', duration: 60 }] }));

    await addIrrigationTime('gs1', '06:00', 60);

    const times = irrigationConfigs$.get().get('gs1')?.irrigationTimes ?? [];
    expect(times[0].time).toBe('06:00');
    expect(times[1].time).toBe('12:00');
  });

  it('rolls back when service call fails', async () => {
    setIrrigationConfig('gs1', makeConfig());
    vi.mocked(hassCall.callService).mockRejectedValueOnce(new Error('fail'));

    await expect(addIrrigationTime('gs1', '08:00', 60)).rejects.toThrow();

    expect(irrigationConfigs$.get().get('gs1')?.irrigationTimes).toHaveLength(0);
  });

  it('uses default duration of 60 when not provided', async () => {
    setIrrigationConfig('gs1', makeConfig());

    await addIrrigationTime('gs1', '08:00');

    expect(irrigationConfigs$.get().get('gs1')?.irrigationTimes).toContainEqual(
      expect.objectContaining({ duration: 60 })
    );
  });

  it('handles sorting when some times are undefined (branch fallback)', async () => {
    setIrrigationConfig(
      'gs1',
      makeConfig({
        irrigationTimes: [{ duration: 60 } as any, { time: '12:00', duration: 60 }],
      })
    );

    await addIrrigationTime('gs1', '08:00', 60);

    const times = irrigationConfigs$.get().get('gs1')?.irrigationTimes ?? [];
    expect(times[0].time).toBeUndefined();
    expect(times[1].time).toBe('08:00');
    expect(times[2].time).toBe('12:00');
  });

  it('handles sorting when multiple times are undefined (branch fallback)', async () => {
    setIrrigationConfig(
      'gs1',
      makeConfig({
        irrigationTimes: [{ duration: 60 } as any, { duration: 120 } as any],
      })
    );

    await addIrrigationTime('gs1', '08:00', 60);

    const times = irrigationConfigs$.get().get('gs1')?.irrigationTimes ?? [];
    expect(times[0].time).toBeUndefined();
    expect(times[1].time).toBeUndefined();
    expect(times[2].time).toBe('08:00');
  });

  it('handles addition when growspace has no config (uses fallback)', async () => {
    // irrigationConfigs$ starts empty, so _getConfig will return the default fallback
    await addIrrigationTime('new_gs', '09:00', 45);

    const config = irrigationConfigs$.get().get('new_gs');
    expect(config?.irrigationTimes).toEqual([{ time: '09:00', duration: 45 }]);
  });
});

// ---------------------------------------------------------------------------
// removeIrrigationTime
// ---------------------------------------------------------------------------

describe('removeIrrigationTime', () => {
  beforeEach(() => {
    setIrrigationConfig(
      'gs1',
      makeConfig({
        irrigationTimes: [
          { time: '08:00', duration: 60 },
          { time: '14:00', duration: 60 },
        ],
      })
    );
  });

  it('removes the matching time immediately (optimistic)', async () => {
    await removeIrrigationTime('gs1', '08:00');

    const times = irrigationConfigs$.get().get('gs1')?.irrigationTimes ?? [];
    expect(times).not.toContainEqual(expect.objectContaining({ time: '08:00' }));
    expect(times).toHaveLength(1);
  });

  it('calls remove_irrigation_time service with correct payload', async () => {
    await removeIrrigationTime('gs1', '08:00');

    expect(hassCall.callService).toHaveBeenCalledWith(
      'growspace_manager',
      'remove_irrigation_time',
      expect.objectContaining({ growspace_id: 'gs1', time: '08:00' })
    );
  });

  it('restores the time on failure', async () => {
    vi.mocked(hassCall.callService).mockRejectedValueOnce(new Error('fail'));

    await expect(removeIrrigationTime('gs1', '08:00')).rejects.toThrow();

    const times = irrigationConfigs$.get().get('gs1')?.irrigationTimes ?? [];
    expect(times).toContainEqual(expect.objectContaining({ time: '08:00' }));
  });
});

// ---------------------------------------------------------------------------
// addDrainTime
// ---------------------------------------------------------------------------

describe('addDrainTime', () => {
  it('appends drain time immediately (optimistic)', async () => {
    setIrrigationConfig('gs1', makeConfig());

    await addDrainTime('gs1', '18:00', 30);

    expect(irrigationConfigs$.get().get('gs1')?.drainTimes).toContainEqual(
      expect.objectContaining({ time: '18:00', duration: 30 })
    );
  });

  it('calls add_drain_time service with correct payload', async () => {
    setIrrigationConfig('gs1', makeConfig());

    await addDrainTime('gs1', '18:00', 30);

    expect(hassCall.callService).toHaveBeenCalledWith(
      'growspace_manager',
      'add_drain_time',
      expect.objectContaining({ growspace_id: 'gs1', time: '18:00', duration: 30 })
    );
  });

  it('rolls back drain time on failure', async () => {
    setIrrigationConfig('gs1', makeConfig());
    vi.mocked(hassCall.callService).mockRejectedValueOnce(new Error('fail'));

    await expect(addDrainTime('gs1', '18:00', 30)).rejects.toThrow();

    expect(irrigationConfigs$.get().get('gs1')?.drainTimes).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// removeDrainTime
// ---------------------------------------------------------------------------

describe('removeDrainTime', () => {
  beforeEach(() => {
    setIrrigationConfig(
      'gs1',
      makeConfig({
        drainTimes: [{ time: '18:00', duration: 30 }],
      })
    );
  });

  it('removes drain time immediately (optimistic)', async () => {
    await removeDrainTime('gs1', '18:00');

    expect(irrigationConfigs$.get().get('gs1')?.drainTimes).toHaveLength(0);
  });

  it('calls remove_drain_time service', async () => {
    await removeDrainTime('gs1', '18:00');

    expect(hassCall.callService).toHaveBeenCalledWith(
      'growspace_manager',
      'remove_drain_time',
      expect.objectContaining({ growspace_id: 'gs1', time: '18:00' })
    );
  });

  it('restores drain time on failure', async () => {
    vi.mocked(hassCall.callService).mockRejectedValueOnce(new Error('fail'));

    await expect(removeDrainTime('gs1', '18:00')).rejects.toThrow();

    expect(irrigationConfigs$.get().get('gs1')?.drainTimes).toContainEqual(
      expect.objectContaining({ time: '18:00' })
    );
  });
});

// ---------------------------------------------------------------------------
// updateIrrigationStrategy
// ---------------------------------------------------------------------------

describe('updateIrrigationStrategy', () => {
  it('patches strategy fields immediately (optimistic)', async () => {
    setIrrigationStrategy('gs1', makeStrategy({ lightsOnTime: '06:00' }));

    await updateIrrigationStrategy('gs1', { lightsOnTime: '07:00' });

    expect(irrigationStrategies$.get().get('gs1')?.lightsOnTime).toBe('07:00');
  });

  it('calls set_irrigation_strategy service with serialized payload', async () => {
    setIrrigationStrategy('gs1', makeStrategy());

    await updateIrrigationStrategy('gs1', { lightsOnTime: '07:00', p0DurationMinutes: 90 });

    expect(hassCall.callService).toHaveBeenCalledWith(
      'growspace_manager',
      'set_irrigation_strategy',
      expect.objectContaining({
        growspace_id: 'gs1',
        lights_on_time: '07:00',
        p0_duration_minutes: 90,
      })
    );
  });

  it('calls set_irrigation_strategy service with all fields mapped to payload', async () => {
    setIrrigationStrategy('gs1', makeStrategy());

    await updateIrrigationStrategy('gs1', {
      enabled: true,
      lightsOnTime: '07:30',
      p0DurationMinutes: 45,
      p2StopBeforeLightsOffMinutes: 180,
      targetVwcPercent: 62.5,
      maintenanceDrybackPercent: 4.5,
      shotDurationSeconds: 40,
      shotIntervalMinutes: 25,
      autoLightTracking: true,
    });

    expect(hassCall.callService).toHaveBeenCalledWith(
      'growspace_manager',
      'set_irrigation_strategy',
      expect.objectContaining({
        growspace_id: 'gs1',
        enabled: true,
        lights_on_time: '07:30',
        p0_duration_minutes: 45,
        p2_stop_before_lights_off_minutes: 180,
        target_vwc_percent: 62.5,
        maintenance_dryback_percent: 4.5,
        shot_duration_seconds: 40,
        shot_interval_minutes: 25,
        auto_light_tracking: true,
      })
    );
  });

  it('rolls back strategy on failure', async () => {
    setIrrigationStrategy('gs1', makeStrategy({ lightsOnTime: '06:00' }));
    vi.mocked(hassCall.callService).mockRejectedValueOnce(new Error('fail'));

    await expect(updateIrrigationStrategy('gs1', { lightsOnTime: '07:00' })).rejects.toThrow();

    expect(irrigationStrategies$.get().get('gs1')?.lightsOnTime).toBe('06:00');
  });

  it('calls set_irrigation_strategy service without lightsOnTime', async () => {
    setIrrigationStrategy('gs1', makeStrategy());

    await updateIrrigationStrategy('gs1', { enabled: false });

    expect(hassCall.callService).toHaveBeenCalledWith(
      'growspace_manager',
      'set_irrigation_strategy',
      {
        growspace_id: 'gs1',
        enabled: false,
      }
    );
  });

  it('handles update when growspace has no strategy (uses fallback)', async () => {
    // irrigationStrategies$ starts empty, so _getStrategy will return the default fallback
    await updateIrrigationStrategy('new_gs', { enabled: true, lightsOnTime: '08:00' });

    const strategy = irrigationStrategies$.get().get('new_gs');
    expect(strategy).toEqual({
      enabled: true,
      lightsOnTime: '08:00',
      p0DurationMinutes: 60,
      p2StopBeforeLightsOffMinutes: 120,
      targetVwcPercent: 65,
      maintenanceDrybackPercent: 3,
      shotDurationSeconds: 30,
      shotIntervalMinutes: 15,
    });
  });
});

// ---------------------------------------------------------------------------
// saveIrrigationSettings
// ---------------------------------------------------------------------------

describe('saveIrrigationSettings', () => {
  it('patches irrigationPumpEntity immediately (optimistic)', async () => {
    setIrrigationConfig('gs1', makeConfig({ irrigationPumpEntity: 'switch.old_pump' }));

    await saveIrrigationSettings('gs1', {
      irrigationPumpEntity: 'switch.new_pump',
      drainPumpEntity: '',
      irrigationDuration: 90,
      drainDuration: 45,
    });

    expect(irrigationConfigs$.get().get('gs1')?.irrigationPumpEntity).toBe('switch.new_pump');
  });

  it('calls set_irrigation_settings service with serialized payload', async () => {
    setIrrigationConfig('gs1', makeConfig());

    await saveIrrigationSettings('gs1', {
      irrigationPumpEntity: 'switch.pump',
      drainPumpEntity: 'switch.drain',
      irrigationDuration: 60,
      drainDuration: 30,
    });

    expect(hassCall.callService).toHaveBeenCalledWith(
      'growspace_manager',
      'set_irrigation_settings',
      expect.objectContaining({
        growspace_id: 'gs1',
        irrigation_pump_entity: 'switch.pump',
        drain_pump_entity: 'switch.drain',
        irrigation_duration: 60,
        drain_duration: 30,
      })
    );
  });

  it('calls set_irrigation_settings service with all options included in payload', async () => {
    setIrrigationConfig('gs1', makeConfig());

    await saveIrrigationSettings('gs1', {
      irrigationPumpEntity: 'switch.pump',
      drainPumpEntity: 'switch.drain',
      irrigationDuration: 60,
      drainDuration: 30,
      soilTriggerPercent: 55,
      dailyVolumeCapLiters: 12.5,
      maxCyclesPerDay: 8,
      skipDuringDark: true,
      pauseOnLowTank: true,
      logToLogbook: true,
      autoAdvanceP1ToP2: true,
      autoAdvanceP2ToP3: true,
      haltOnRunoffEcThreshold: 4.2,
      activeSteeringPhase: 'p3',
    });

    expect(hassCall.callService).toHaveBeenCalledWith(
      'growspace_manager',
      'set_irrigation_settings',
      expect.objectContaining({
        growspace_id: 'gs1',
        irrigation_pump_entity: 'switch.pump',
        drain_pump_entity: 'switch.drain',
        irrigation_duration: 60,
        drain_duration: 30,
        soil_trigger_percent: 55,
        daily_volume_cap_liters: 12.5,
        max_cycles_per_day: 8,
        skip_during_dark: true,
        pause_on_low_tank: true,
        log_to_logbook: true,
        auto_advance_p1_to_p2: true,
        auto_advance_p2_to_p3: true,
        halt_on_runoff_ec_threshold: 4.2,
        active_steering_phase: 'p3',
      })
    );
  });

  it('rolls back settings on failure', async () => {
    setIrrigationConfig('gs1', makeConfig({ irrigationPumpEntity: 'switch.old' }));
    vi.mocked(hassCall.callService).mockRejectedValueOnce(new Error('fail'));

    await expect(
      saveIrrigationSettings('gs1', {
        irrigationPumpEntity: 'switch.new',
        drainPumpEntity: '',
        irrigationDuration: 60,
        drainDuration: 30,
      })
    ).rejects.toThrow();

    expect(irrigationConfigs$.get().get('gs1')?.irrigationPumpEntity).toBe('switch.old');
  });
});

// ---------------------------------------------------------------------------
// Fire-and-forget mutators
// ---------------------------------------------------------------------------

describe('logDrainReading', () => {
  it('calls log_drain_reading service with correct payload', async () => {
    await logDrainReading('gs1', { feedEc: 2.0, drainEc: 2.4 });

    expect(hassCall.callService).toHaveBeenCalledWith(
      'growspace_manager',
      'log_drain_reading',
      expect.objectContaining({ growspace_id: 'gs1', feed_ec: 2.0, drain_ec: 2.4 })
    );
  });

  it('includes optional volume fields when provided', async () => {
    await logDrainReading('gs1', {
      feedEc: 2.0,
      drainEc: 2.4,
      feedVolumeMl: 500,
      drainVolumeMl: 150,
    });

    expect(hassCall.callService).toHaveBeenCalledWith(
      'growspace_manager',
      'log_drain_reading',
      expect.objectContaining({ feed_volume_ml: 500, drain_volume_ml: 150 })
    );
  });
});

describe('configureDrainMonitoring', () => {
  it('calls configure_drain_monitoring service with correct payload', async () => {
    await configureDrainMonitoring('gs1', {
      enabled: true,
      maxEcDelta: 0.5,
      targetRunoffPercent: 10,
    });

    expect(hassCall.callService).toHaveBeenCalledWith(
      'growspace_manager',
      'configure_drain_monitoring',
      expect.objectContaining({
        growspace_id: 'gs1',
        enabled: true,
        max_ec_delta: 0.5,
        target_runoff_percent: 10,
      })
    );
  });

  it('calls configure_drain_monitoring with empty options object', async () => {
    await configureDrainMonitoring('gs1', {});

    expect(hassCall.callService).toHaveBeenCalledWith(
      'growspace_manager',
      'configure_drain_monitoring',
      { growspace_id: 'gs1' }
    );
  });
});

describe('runIrrigationCycle', () => {
  it('calls run_irrigation_cycle service with growspace_id', async () => {
    await runIrrigationCycle('gs1');

    expect(hassCall.callService).toHaveBeenCalledWith(
      'growspace_manager',
      'run_irrigation_cycle',
      expect.objectContaining({ growspace_id: 'gs1' })
    );
  });

  it('includes optional duration when provided', async () => {
    await runIrrigationCycle('gs1', 90);

    expect(hassCall.callService).toHaveBeenCalledWith(
      'growspace_manager',
      'run_irrigation_cycle',
      expect.objectContaining({ growspace_id: 'gs1', duration: 90 })
    );
  });
});

// ---------------------------------------------------------------------------
// Zod Schema Validations
// ---------------------------------------------------------------------------

describe('Zod Schema Validations', () => {
  describe('IrrigationModeSchema', () => {
    it('validates manual and crop_steering modes', () => {
      expect(IrrigationModeSchema.parse('manual')).toBe('manual');
      expect(IrrigationModeSchema.parse('crop_steering')).toBe('crop_steering');
    });

    it('rejects invalid modes', () => {
      expect(IrrigationModeSchema.safeParse('invalid_mode').success).toBe(false);
    });
  });

  describe('SetIrrigationStrategyPayloadSchema', () => {
    it('validates a valid payload with optional fields', () => {
      const payload = {
        growspace_id: 'gs1',
        enabled: true,
        lights_on_time: '06:00',
        p0_duration_minutes: 60,
        p2_stop_before_lights_off_minutes: 120,
        target_vwc_percent: 65,
        maintenance_dryback_percent: 3,
        shot_duration_seconds: 30,
        shot_interval_minutes: 15,
        auto_light_tracking: false,
      };
      expect(SetIrrigationStrategyPayloadSchema.parse(payload)).toEqual(payload);
    });

    it('rejects payload with invalid types', () => {
      const payload = {
        growspace_id: 'gs1',
        enabled: 'not-a-boolean',
      };
      expect(SetIrrigationStrategyPayloadSchema.safeParse(payload).success).toBe(false);
    });
  });

  describe('SaveIrrigationSettingsPayloadSchema', () => {
    it('validates a valid settings payload', () => {
      const payload = {
        growspace_id: 'gs1',
        irrigation_pump_entity: 'switch.pump',
        drain_pump_entity: 'switch.drain',
        irrigation_duration: 60,
        drain_duration: 30,
        soil_trigger_percent: 45,
        daily_volume_cap_liters: 10,
        max_cycles_per_day: 5,
        skip_during_dark: true,
        pause_on_low_tank: true,
        log_to_logbook: true,
        auto_advance_p1_to_p2: true,
        auto_advance_p2_to_p3: true,
        halt_on_runoff_ec_threshold: 3.5,
        active_steering_phase: 'p2',
      };
      expect(SaveIrrigationSettingsPayloadSchema.parse(payload)).toEqual(payload);
    });

    it('rejects invalid phase enum', () => {
      const payload = {
        growspace_id: 'gs1',
        irrigation_pump_entity: 'switch.pump',
        drain_pump_entity: 'switch.drain',
        irrigation_duration: 60,
        drain_duration: 30,
        active_steering_phase: 'invalid-phase',
      };
      expect(SaveIrrigationSettingsPayloadSchema.safeParse(payload).success).toBe(false);
    });
  });

  describe('AddIrrigationTimePayloadSchema & RemoveIrrigationTimePayloadSchema', () => {
    it('validates add irrigation time payload', () => {
      const payload = { growspace_id: 'gs1', time: '12:00', duration: 45 };
      expect(AddIrrigationTimePayloadSchema.parse(payload)).toEqual(payload);
    });

    it('validates remove irrigation time payload', () => {
      const payload = { growspace_id: 'gs1', time: '12:00' };
      expect(RemoveIrrigationTimePayloadSchema.parse(payload)).toEqual(payload);
    });
  });

  describe('AddDrainTimePayloadSchema & RemoveDrainTimePayloadSchema', () => {
    it('validates add drain time payload', () => {
      const payload = { growspace_id: 'gs1', time: '18:00', duration: 30 };
      expect(AddDrainTimePayloadSchema.parse(payload)).toEqual(payload);
    });

    it('validates remove drain time payload', () => {
      const payload = { growspace_id: 'gs1', time: '18:00' };
      expect(RemoveDrainTimePayloadSchema.parse(payload)).toEqual(payload);
    });
  });

  describe('LogDrainReadingPayloadSchema', () => {
    it('validates log drain reading payload', () => {
      const payload = {
        growspace_id: 'gs1',
        feed_ec: 2.1,
        drain_ec: 2.5,
        feed_volume_ml: 600,
        drain_volume_ml: 120,
      };
      expect(LogDrainReadingPayloadSchema.parse(payload)).toEqual(payload);
    });
  });

  describe('ConfigureDrainMonitoringPayloadSchema', () => {
    it('validates configure drain monitoring payload', () => {
      const payload = {
        growspace_id: 'gs1',
        enabled: true,
        max_ec_delta: 0.5,
        target_runoff_percent: 15,
      };
      expect(ConfigureDrainMonitoringPayloadSchema.parse(payload)).toEqual(payload);
    });
  });

  describe('RunIrrigationCyclePayloadSchema', () => {
    it('validates run irrigation cycle payload', () => {
      const payload = { growspace_id: 'gs1', duration: 90 };
      expect(RunIrrigationCyclePayloadSchema.parse(payload)).toEqual(payload);
    });
  });

  describe('PhaseWindowSchema & PhaseWindowsSchema', () => {
    it('validates phase window and array of windows', () => {
      const singleWindow = {
        id: 'p1',
        label: 'P1',
        name: 'Saturation',
        start: 360,
        end: 420,
        color: '#4CAF50',
        target: 'Reach FC',
      };
      expect(PhaseWindowSchema.parse(singleWindow)).toEqual(singleWindow);

      const windows = {
        lightsOnMin: 360,
        lightsOffMin: 1440,
        lightHours: 18,
        phases: [singleWindow],
      };
      expect(PhaseWindowsSchema.parse(windows)).toEqual(windows);
    });
  });
});
