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

  it('rolls back strategy on failure', async () => {
    setIrrigationStrategy('gs1', makeStrategy({ lightsOnTime: '06:00' }));
    vi.mocked(hassCall.callService).mockRejectedValueOnce(new Error('fail'));

    await expect(updateIrrigationStrategy('gs1', { lightsOnTime: '07:00' })).rejects.toThrow();

    expect(irrigationStrategies$.get().get('gs1')?.lightsOnTime).toBe('06:00');
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
