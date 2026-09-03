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
 *   - saveIrrigationRecipe / updateIrrigationRecipe / removeIrrigationRecipe /
 *     applyIrrigationRecipe: the Irrigation Recipe library
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { IrrigationConfig, IrrigationStrategy, IrrigationTank } from '../../services/types';
import { createGrowspaceDevice } from '../../services/types';
import * as hassCall from '../../services/hass-call';
import { devices$, setDevices } from '../grid';
import {
  irrigationConfigs$,
  irrigationStrategies$,
  tankLevels$,
  cropSteeringHistory$,
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
  applySteeringMode,
  saveIrrigationSettings,
  setSteeringPhase,
  logDrainReading,
  configureDrainMonitoring,
  setEcTargetRanges,
  runIrrigationCycle,
  fetchCropSteeringHistory,
  getIrrigationAnalytics,
  irrigationRecipes$,
  setIrrigationRecipes,
  saveIrrigationRecipe,
  updateIrrigationRecipe,
  removeIrrigationRecipe,
  applyIrrigationRecipe,
  irrigationPrograms$,
  setIrrigationPrograms,
  saveIrrigationProgram,
  removeIrrigationProgram,
  assignIrrigationProgram,
  setProgramAutoAdvance,
} from './index';
import { CropSteeringHistorySchema } from '../../schemas/api-schema';
import {
  IrrigationModeSchema,
  SetIrrigationStrategyPayloadSchema,
  SaveIrrigationSettingsPayloadSchema,
  SetSteeringPhasePayloadSchema,
  AddIrrigationTimePayloadSchema,
  RemoveIrrigationTimePayloadSchema,
  AddDrainTimePayloadSchema,
  RemoveDrainTimePayloadSchema,
  LogDrainReadingPayloadSchema,
  ConfigureDrainMonitoringPayloadSchema,
  RunIrrigationCyclePayloadSchema,
  PhaseWindowSchema,
  PhaseWindowsSchema,
  SaveIrrigationRecipePayloadSchema,
  ApplyIrrigationRecipePayloadSchema,
  SaveIrrigationProgramPayloadSchema,
  AssignIrrigationProgramPayloadSchema,
} from './schema';

vi.mock('../../services/hass-call', () => ({
  callService: vi.fn().mockResolvedValue(undefined),
  hassCall: vi.fn().mockResolvedValue({}),
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
  cropSteeringHistory$.set(new Map());
  irrigationRecipes$.set([]);
  irrigationPrograms$.set([]);
  devices$.set([]);
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

  it('derives the p0 window starting at lightsOnMin', () => {
    const windows = computePhaseWindows(
      makeStrategy({
        lightsOnTime: '06:00',
        p0DurationMinutes: 60,
      }),
      18
    );
    // P0 (Activation): lightsOnMin to lightsOnMin + p0DurationMinutes. P1 starts
    // where it ends, at the first shot — not at lights-on.
    expect(windows?.phases.map((p) => p.id)).toEqual(['p0', 'p1', 'p2', 'p3']);
    expect(windows?.phases[0]).toMatchObject({ id: 'p0', start: 360, end: 420 });
    expect(windows?.phases[1]).toMatchObject({ id: 'p1', start: 420 });
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
    expect(windows?.phases[3].id).toBe('p3');
    expect(windows?.phases[3].end).toBe(lightsOffMin);
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

    // Default p0DurationMinutes 60 -> p0End = 360 + 60 = 420
    expect(windows?.phases[0].end).toBe(420);

    // Default p2StopBeforeLightsOffMinutes 120 -> p3Start = 1440 - 120 = 1320
    expect(windows?.phases[3].start).toBe(1320);

    // Default maintenanceDrybackPercent 3 -> label incorporates '−3% VWC'
    expect(windows?.phases[3].target).toBe('−3% VWC');
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

  it('cross-slice bridge: also patches devices$.irrigationConfig optimistically', async () => {
    setDevices([createGrowspaceDevice({ deviceId: 'gs1', name: 'G1' })]);
    setIrrigationConfig('gs1', makeConfig());

    await addIrrigationTime('gs1', '08:00', 60);

    const device = devices$.get().find((d) => d.deviceId === 'gs1');
    expect(device?.irrigationConfig.irrigationTimes).toContainEqual(
      expect.objectContaining({ time: '08:00' })
    );
  });

  it('cross-slice bridge: reverts devices$.irrigationConfig on rollback', async () => {
    setDevices([createGrowspaceDevice({ deviceId: 'gs1', name: 'G1' })]);
    setIrrigationConfig('gs1', makeConfig());
    vi.mocked(hassCall.callService).mockRejectedValueOnce(new Error('fail'));

    await expect(addIrrigationTime('gs1', '08:00', 60)).rejects.toThrow();

    const device = devices$.get().find((d) => d.deviceId === 'gs1');
    expect(device?.irrigationConfig.irrigationTimes).toHaveLength(0);
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

  it('cross-slice bridge: also removes from devices$.irrigationConfig optimistically', async () => {
    setDevices([
      createGrowspaceDevice({
        deviceId: 'gs1',
        name: 'G1',
        irrigationConfig: {
          irrigationTimes: [
            { time: '08:00', duration: 60 },
            { time: '14:00', duration: 60 },
          ],
          drainTimes: [],
        },
      }),
    ]);

    await removeIrrigationTime('gs1', '08:00');

    const device = devices$.get().find((d) => d.deviceId === 'gs1');
    expect(device?.irrigationConfig.irrigationTimes).not.toContainEqual(
      expect.objectContaining({ time: '08:00' })
    );
    expect(device?.irrigationConfig.irrigationTimes).toHaveLength(1);
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

  it('cross-slice bridge: also patches devices$.irrigationConfig.drainTimes optimistically', async () => {
    setDevices([createGrowspaceDevice({ deviceId: 'gs1', name: 'G1' })]);
    setIrrigationConfig('gs1', makeConfig());

    await addDrainTime('gs1', '18:00', 30);

    const device = devices$.get().find((d) => d.deviceId === 'gs1');
    expect(device?.irrigationConfig.drainTimes).toContainEqual(
      expect.objectContaining({ time: '18:00' })
    );
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

  it('cross-slice bridge: also removes from devices$.irrigationConfig.drainTimes', async () => {
    setDevices([
      createGrowspaceDevice({
        deviceId: 'gs1',
        name: 'G1',
        irrigationConfig: { irrigationTimes: [], drainTimes: [{ time: '18:00', duration: 30 }] },
      }),
    ]);

    await removeDrainTime('gs1', '18:00');

    const device = devices$.get().find((d) => d.deviceId === 'gs1');
    expect(device?.irrigationConfig.drainTimes).toHaveLength(0);
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

  it('serializes per-phase shot and sizing-mode fields to the payload', async () => {
    setIrrigationStrategy('gs1', makeStrategy());

    await updateIrrigationStrategy('gs1', {
      p1ShotDurationSeconds: 12,
      p1ShotIntervalMinutes: 20,
      p2ShotDurationSeconds: 18,
      p2ShotIntervalMinutes: 30,
      p1ShotVolumePercent: 3.5,
      p2ShotVolumePercent: 5,
      shotSizingMode: 'volume',
    });

    expect(hassCall.callService).toHaveBeenCalledWith(
      'growspace_manager',
      'set_irrigation_strategy',
      expect.objectContaining({
        growspace_id: 'gs1',
        p1_shot_duration_seconds: 12,
        p1_shot_interval_minutes: 20,
        p2_shot_duration_seconds: 18,
        p2_shot_interval_minutes: 30,
        p1_shot_volume_percent: 3.5,
        p2_shot_volume_percent: 5,
        shot_sizing_mode: 'volume',
      })
    );
  });

  it('serializes Adaptive Shot Control fields to the payload', async () => {
    setIrrigationStrategy('gs1', makeStrategy());

    await updateIrrigationStrategy('gs1', {
      dynamicShotEnabled: false,
      dynamicAggressiveness: 1.5,
      dynamicRecovery: 0.2,
      dynamicShotSizeFloor: 0.4,
      dynamicIntervalCeiling: 2.0,
    });

    expect(hassCall.callService).toHaveBeenCalledWith(
      'growspace_manager',
      'set_irrigation_strategy',
      expect.objectContaining({
        growspace_id: 'gs1',
        dynamic_shot_enabled: false,
        dynamic_aggressiveness: 1.5,
        dynamic_recovery: 0.2,
        dynamic_shot_size_floor: 0.4,
        dynamic_interval_ceiling: 2.0,
      })
    );
  });

  it('serializes substrate profile to flat keys and band/modulation fields', async () => {
    setIrrigationStrategy('gs1', makeStrategy());

    await updateIrrigationStrategy('gs1', {
      substrateProfile: { mediaType: 'rockwool', litersPerPot: 6.5 },
      poreEcTargetMin: 2.5,
      poreEcTargetMax: 4.0,
      ecModulationEnabled: true,
    });

    expect(hassCall.callService).toHaveBeenCalledWith(
      'growspace_manager',
      'set_irrigation_strategy',
      expect.objectContaining({
        growspace_id: 'gs1',
        substrate_media_type: 'rockwool',
        substrate_liters_per_pot: 6.5,
        pore_ec_target_min: 2.5,
        pore_ec_target_max: 4.0,
        ec_modulation_enabled: true,
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
// applySteeringMode
// ---------------------------------------------------------------------------

describe('applySteeringMode', () => {
  it('calls the apply_steering_mode WS command with the chosen mode', async () => {
    setIrrigationStrategy('gs1', makeStrategy());

    await applySteeringMode('gs1', 'generative');

    expect(hassCall.hassCall).toHaveBeenCalledWith(
      'growspace_manager/apply_steering_mode',
      { growspace_id: 'gs1', steering_mode: 'generative' },
      expect.anything()
    );
  });

  it('reflects the selected mode optimistically', async () => {
    setIrrigationStrategy('gs1', makeStrategy({ declaredSteeringMode: null }));

    await applySteeringMode('gs1', 'vegetative');

    expect(irrigationStrategies$.get().get('gs1')?.declaredSteeringMode).toBe('vegetative');
  });

  it('rolls back the declared mode on failure', async () => {
    setIrrigationStrategy('gs1', makeStrategy({ declaredSteeringMode: 'balanced' }));
    vi.mocked(hassCall.hassCall).mockRejectedValueOnce(new Error('fail'));

    await expect(applySteeringMode('gs1', 'generative')).rejects.toThrow();

    expect(irrigationStrategies$.get().get('gs1')?.declaredSteeringMode).toBe('balanced');
  });
});

// ---------------------------------------------------------------------------
// saveIrrigationSettings
// ---------------------------------------------------------------------------

describe('saveIrrigationSettings', () => {
  it('patches irrigationPumpEntity immediately (optimistic)', async () => {
    setIrrigationConfig(
      'gs1',
      makeConfig({ irrigationPumpEntity: 'switch.old_pump', pumpFlowRateMlPerSec: 10 })
    );

    await saveIrrigationSettings('gs1', {
      irrigationPumpEntity: 'switch.new_pump',
      drainPumpEntity: '',
      irrigationDuration: 90,
      drainDuration: 45,
    });

    expect(irrigationConfigs$.get().get('gs1')?.irrigationPumpEntity).toBe('switch.new_pump');
    expect(irrigationConfigs$.get().get('gs1')?.pumpFlowRateMlPerSec).toBe(10);
  });

  it('calls set_irrigation_settings service with serialized payload', async () => {
    setIrrigationConfig('gs1', makeConfig());

    await saveIrrigationSettings('gs1', {
      irrigationPumpEntity: 'switch.pump',
      pumpFlowRateMlPerSec: 12.5,
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
        pump_flow_rate_ml_per_sec: 12.5,
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
      pumpFlowRateMlPerSec: 12.5,
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
    });

    expect(hassCall.callService).toHaveBeenCalledWith(
      'growspace_manager',
      'set_irrigation_settings',
      expect.objectContaining({
        growspace_id: 'gs1',
        irrigation_pump_entity: 'switch.pump',
        pump_flow_rate_ml_per_sec: 12.5,
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
      })
    );
  });

  it('never carries the steering phase: that is set_steering_phase alone', async () => {
    setIrrigationConfig('gs1', makeConfig());

    await saveIrrigationSettings('gs1', {
      irrigationPumpEntity: 'switch.pump',
      drainPumpEntity: 'switch.drain',
      irrigationDuration: 60,
      drainDuration: 30,
    });

    const payload = vi.mocked(hassCall.callService).mock.calls[0][2] as Record<string, unknown>;
    expect(payload).not.toHaveProperty('active_steering_phase');
    expect(payload).not.toHaveProperty('steering_phase');
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

  it('cross-slice bridge: also patches devices$.irrigationConfig pump entity optimistically', async () => {
    setDevices([
      createGrowspaceDevice({
        deviceId: 'gs1',
        name: 'G1',
        irrigationConfig: {
          irrigationTimes: [],
          drainTimes: [],
          irrigationPumpEntity: 'switch.old',
        },
      }),
    ]);
    setIrrigationConfig('gs1', makeConfig({ irrigationPumpEntity: 'switch.old' }));

    await saveIrrigationSettings('gs1', {
      irrigationPumpEntity: 'switch.new',
      drainPumpEntity: 'switch.drain',
      irrigationDuration: 60,
      drainDuration: 30,
    });

    const device = devices$.get().find((d) => d.deviceId === 'gs1');
    expect(device?.irrigationConfig.irrigationPumpEntity).toBe('switch.new');
  });
});

// ---------------------------------------------------------------------------
// setSteeringPhase
// ---------------------------------------------------------------------------

describe('setSteeringPhase', () => {
  it('calls set_steering_phase and patches the phase optimistically', async () => {
    setIrrigationConfig('gs1', makeConfig({ activeSteeringPhase: 'p2' }));

    await setSteeringPhase('gs1', 'p3');

    expect(hassCall.callService).toHaveBeenCalledWith('growspace_manager', 'set_steering_phase', {
      growspace_id: 'gs1',
      steering_phase: 'p3',
    });
    expect(irrigationConfigs$.get().get('gs1')?.activeSteeringPhase).toBe('p3');
  });

  it('restores the previous phase when the service refuses', async () => {
    setIrrigationConfig('gs1', makeConfig({ activeSteeringPhase: 'p2' }));
    vi.mocked(hassCall.callService).mockRejectedValueOnce(new Error('fail'));

    await expect(setSteeringPhase('gs1', 'p3')).rejects.toThrow();

    expect(irrigationConfigs$.get().get('gs1')?.activeSteeringPhase).toBe('p2');
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

describe('setEcTargetRanges', () => {
  it('does not call the service when the ranges array is empty', async () => {
    await setEcTargetRanges('gs1', []);

    expect(hassCall.callService).not.toHaveBeenCalled();
  });

  it('calls set_ec_target_range once per range, remapping min/max to feed_ec bounds', async () => {
    await setEcTargetRanges('gs1', [
      { stage: 'veg', minEc: 1.2, maxEc: 1.8 },
      { stage: 'flower_early', minEc: 1.5, maxEc: 2.2 },
    ]);

    expect(hassCall.callService).toHaveBeenCalledTimes(2);
    expect(hassCall.callService).toHaveBeenNthCalledWith(
      1,
      'growspace_manager',
      'set_ec_target_range',
      {
        growspace_id: 'gs1',
        stage: 'veg',
        feed_ec_min: 1.2,
        feed_ec_max: 1.8,
      }
    );
    expect(hassCall.callService).toHaveBeenNthCalledWith(
      2,
      'growspace_manager',
      'set_ec_target_range',
      {
        growspace_id: 'gs1',
        stage: 'flower_early',
        feed_ec_min: 1.5,
        feed_ec_max: 2.2,
      }
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
      };
      expect(SaveIrrigationSettingsPayloadSchema.parse(payload)).toEqual(payload);
    });
  });

  describe('SetSteeringPhasePayloadSchema', () => {
    it('validates the manual phase override payload', () => {
      const payload = { growspace_id: 'gs1', steering_phase: 'p2' };
      expect(SetSteeringPhasePayloadSchema.parse(payload)).toEqual(payload);
    });

    it('rejects invalid phase enum', () => {
      expect(
        SetSteeringPhasePayloadSchema.safeParse({
          growspace_id: 'gs1',
          steering_phase: 'invalid-phase',
        }).success
      ).toBe(false);
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

// ---------------------------------------------------------------------------
// CropSteeringHistorySchema
// ---------------------------------------------------------------------------

const minimalHistory = {
  growspace_id: 'gs1',
  lights_on: '2024-06-01T06:00:00+00:00',
  soil_moisture: [
    { timestamp: '2024-06-01T04:00:00+00:00', value: 42.5 },
    { timestamp: '2024-06-01T04:05:00+00:00', value: null },
  ],
};

describe('CropSteeringHistorySchema', () => {
  it('parses a minimal response (no pore_ec / bulk_ec)', () => {
    const result = CropSteeringHistorySchema.parse(minimalHistory);
    expect(result.growspace_id).toBe('gs1');
    expect(result.lights_on).toBe('2024-06-01T06:00:00+00:00');
    expect(result.soil_moisture).toHaveLength(2);
    expect(result.soil_moisture[0]).toEqual({
      timestamp: '2024-06-01T04:00:00+00:00',
      value: 42.5,
    });
    expect(result.soil_moisture[1]).toEqual({
      timestamp: '2024-06-01T04:05:00+00:00',
      value: null,
    });
    expect(result.pore_ec).toBeUndefined();
    expect(result.bulk_ec).toBeUndefined();
  });

  it('parses a response with optional pore_ec and bulk_ec arrays', () => {
    const full = {
      ...minimalHistory,
      pore_ec: [{ timestamp: '2024-06-01T04:00:00+00:00', value: 3.1 }],
      bulk_ec: [{ timestamp: '2024-06-01T04:00:00+00:00', value: 2.8 }],
    };
    const result = CropSteeringHistorySchema.parse(full);
    expect(result.pore_ec).toHaveLength(1);
    expect(result.bulk_ec).toHaveLength(1);
  });

  it('rejects when soil_moisture is missing', () => {
    const { soil_moisture: _sm, ...bad } = minimalHistory;
    expect(() => CropSteeringHistorySchema.parse(bad)).toThrow();
  });

  it('rejects when lights_on is missing', () => {
    const { lights_on: _lo, ...bad } = minimalHistory;
    expect(() => CropSteeringHistorySchema.parse(bad)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// fetchCropSteeringHistory
// ---------------------------------------------------------------------------

describe('fetchCropSteeringHistory', () => {
  it('calls hassCall with get_crop_steering_history and the growspace_id', async () => {
    vi.mocked(hassCall.hassCall).mockResolvedValueOnce(minimalHistory);

    await fetchCropSteeringHistory('gs1');

    expect(hassCall.hassCall).toHaveBeenCalledWith(
      'growspace_manager/get_crop_steering_history',
      { growspace_id: 'gs1' },
      expect.anything()
    );
  });

  it('updates cropSteeringHistory$ keyed by growspace_id on success', async () => {
    vi.mocked(hassCall.hassCall).mockResolvedValueOnce(minimalHistory);

    await fetchCropSteeringHistory('gs1');

    expect(cropSteeringHistory$.get().get('gs1')).toMatchObject({ growspace_id: 'gs1' });
  });

  it('re-throws on failure and leaves existing atom entry unchanged', async () => {
    vi.mocked(hassCall.hassCall).mockRejectedValueOnce(new Error('ws error'));

    await expect(fetchCropSteeringHistory('gs1')).rejects.toThrow('ws error');
    expect(cropSteeringHistory$.get().get('gs1')).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// getIrrigationAnalytics
// ---------------------------------------------------------------------------

describe('getIrrigationAnalytics', () => {
  it('calls hassCall with irrigation_analytics command and growspace_id', async () => {
    vi.mocked(hassCall.hassCall).mockResolvedValueOnce({
      growspace_id: 'gs1',
      stage_aggregates: { veg: 1.5, flower: 2.1 },
    });

    await getIrrigationAnalytics('gs1');

    expect(hassCall.hassCall).toHaveBeenCalledWith(
      'growspace_manager/irrigation_analytics',
      { growspace_id: 'gs1' },
      expect.anything()
    );
  });

  it('returns the analytics payload on success', async () => {
    const payload = { growspace_id: 'gs1', stage_aggregates: { veg: 1.5 } };
    vi.mocked(hassCall.hassCall).mockResolvedValueOnce(payload);

    const result = await getIrrigationAnalytics('gs1');

    expect(result).toEqual(payload);
  });

  it('returns null when hassCall throws', async () => {
    vi.mocked(hassCall.hassCall).mockRejectedValueOnce(new Error('network error'));

    const result = await getIrrigationAnalytics('gs1');

    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Irrigation Recipes
// ---------------------------------------------------------------------------

const WIRE_RECIPE = {
  id: 'r1',
  name: 'Flower week 3',
  kind: 'crop_steering' as const,
  provenance: {
    media_type: 'rockwool' as const,
    liters_per_pot: 7.5,
    pump_flow_rate_ml_per_sec: 13.5,
    stage: 'flower',
    week: 3,
  },
  crop_steering: null,
  schedule: null,
  created_at: '2026-08-04T09:00:00+00:00',
};

describe('saveIrrigationRecipe', () => {
  it('sends the growspace, the name and the half being captured', async () => {
    vi.mocked(hassCall.hassCall).mockResolvedValueOnce(WIRE_RECIPE);

    await saveIrrigationRecipe({
      growspaceId: 'gs1',
      name: 'Flower week 3',
      kind: 'crop_steering',
    });

    expect(hassCall.hassCall).toHaveBeenCalledWith(
      'growspace_manager/save_irrigation_recipe',
      { growspace_id: 'gs1', name: 'Flower week 3', kind: 'crop_steering' },
      expect.anything()
    );
  });

  it('sends recipe_id only when overwriting an existing recipe', async () => {
    vi.mocked(hassCall.hassCall).mockResolvedValueOnce(WIRE_RECIPE);

    await saveIrrigationRecipe({
      growspaceId: 'gs1',
      name: 'Flower week 3',
      kind: 'crop_steering',
      recipeId: 'r1',
    });

    expect(hassCall.hassCall).toHaveBeenCalledWith(
      'growspace_manager/save_irrigation_recipe',
      expect.objectContaining({ recipe_id: 'r1' }),
      expect.anything()
    );
  });

  it('merges the saved recipe into the library, name-ordered', async () => {
    setIrrigationRecipes([
      {
        id: 'z',
        name: 'Zulu',
        kind: 'crop_steering',
        provenance: {
          mediaType: 'coco',
          litersPerPot: 5,
          pumpFlowRateMlPerSec: 11,
          stage: 'veg',
          week: 2,
        },
        cropSteering: null,
        schedule: null,
        createdAt: '2026-08-01T00:00:00+00:00',
      },
    ]);
    vi.mocked(hassCall.hassCall).mockResolvedValueOnce(WIRE_RECIPE);

    await saveIrrigationRecipe({
      growspaceId: 'gs1',
      name: 'Flower week 3',
      kind: 'crop_steering',
    });

    expect(irrigationRecipes$.get().map((r) => r.id)).toEqual(['r1', 'z']);
    expect(irrigationRecipes$.get()[0].provenance).toEqual({
      mediaType: 'rockwool',
      litersPerPot: 7.5,
      pumpFlowRateMlPerSec: 13.5,
      stage: 'flower',
      week: 3,
    });
  });

  it('replaces rather than duplicates when the same recipe is saved again', async () => {
    vi.mocked(hassCall.hassCall).mockResolvedValueOnce(WIRE_RECIPE);
    await saveIrrigationRecipe({
      growspaceId: 'gs1',
      name: 'Flower week 3',
      kind: 'crop_steering',
    });
    vi.mocked(hassCall.hassCall).mockResolvedValueOnce({ ...WIRE_RECIPE, name: 'Renamed' });
    await saveIrrigationRecipe({
      growspaceId: 'gs1',
      name: 'Renamed',
      kind: 'crop_steering',
      recipeId: 'r1',
    });

    expect(irrigationRecipes$.get().map((r) => r.name)).toEqual(['Renamed']);
  });

  it('leaves the library untouched when the backend refuses the capture', async () => {
    vi.mocked(hassCall.hassCall).mockRejectedValueOnce(
      new Error('no pump flow rate is configured')
    );

    await expect(
      saveIrrigationRecipe({ growspaceId: 'gs1', name: 'Nope', kind: 'crop_steering' })
    ).rejects.toThrow('no pump flow rate is configured');
    expect(irrigationRecipes$.get()).toEqual([]);
  });
});

describe('applyIrrigationRecipe', () => {
  const REPLY = {
    growspace_id: 'gs1',
    applied_recipe_id: 'r1',
    recipe_applied_at: '2026-08-10T07:15:00+00:00',
    warning: null,
  };

  it('calls the apply_irrigation_recipe WS command with the growspace and recipe', async () => {
    setIrrigationStrategy('gs1', makeStrategy());
    vi.mocked(hassCall.hassCall).mockResolvedValueOnce(REPLY);

    await applyIrrigationRecipe('gs1', 'r1');

    expect(hassCall.hassCall).toHaveBeenCalledWith(
      'growspace_manager/apply_irrigation_recipe',
      { growspace_id: 'gs1', recipe_id: 'r1' },
      expect.anything()
    );
  });

  it('records the stamp on the device and clears the drift verdict', async () => {
    setDevices([
      createGrowspaceDevice({ deviceId: 'gs1', name: 'G1', irrigationStrategy: makeStrategy() }),
    ]);
    setIrrigationStrategy('gs1', makeStrategy());
    vi.mocked(hassCall.hassCall).mockResolvedValueOnce(REPLY);

    await applyIrrigationRecipe('gs1', 'r1');

    const device = devices$.get().find((d) => d.deviceId === 'gs1');
    expect(device?.irrigationStrategy?.appliedRecipeId).toBe('r1');
    expect(device?.irrigationStrategy?.recipeAppliedAt).toBe('2026-08-10T07:15:00+00:00');
    expect(device?.appliedRecipeDrifted).toBe(false);
  });

  it('returns the backend notice so a cross-media apply can be surfaced', async () => {
    setIrrigationStrategy('gs1', makeStrategy());
    vi.mocked(hassCall.hassCall).mockResolvedValueOnce({
      ...REPLY,
      warning:
        "Irrigation recipe 'Flower week 3' was authored in rockwool and applied to a coco growspace.",
    });

    const result = await applyIrrigationRecipe('gs1', 'r1');

    expect(result.warning).toContain('rockwool');
  });

  it('rolls the stamp back when the apply is refused', async () => {
    setDevices([
      createGrowspaceDevice({
        deviceId: 'gs1',
        name: 'G1',
        irrigationStrategy: makeStrategy({ appliedRecipeId: 'previous' }),
      }),
    ]);
    setIrrigationStrategy('gs1', makeStrategy({ appliedRecipeId: 'previous' }));
    vi.mocked(hassCall.hassCall).mockRejectedValueOnce(new Error('kind mismatch'));

    await expect(applyIrrigationRecipe('gs1', 'r1')).rejects.toThrow();

    expect(irrigationStrategies$.get().get('gs1')?.appliedRecipeId).toBe('previous');
    expect(devices$.get()[0].irrigationStrategy?.appliedRecipeId).toBe('previous');
  });
});

describe('Irrigation Recipe payload schemas', () => {
  it('validates the save payload, with recipe_id only when overwriting', () => {
    const create = { growspace_id: 'gs1', name: 'Flower week 3', kind: 'crop_steering' as const };
    expect(SaveIrrigationRecipePayloadSchema.parse(create)).toEqual(create);

    const overwrite = { ...create, recipe_id: 'r1' };
    expect(SaveIrrigationRecipePayloadSchema.parse(overwrite)).toEqual(overwrite);
  });

  it('rejects a save payload carrying a key the backend does not accept', () => {
    expect(
      SaveIrrigationRecipePayloadSchema.safeParse({
        growspace_id: 'gs1',
        name: 'Flower week 3',
        kind: 'crop_steering',
        recipeId: 'r1',
      }).success
    ).toBe(false);
  });

  it('rejects a kind that is neither half a recipe can carry', () => {
    expect(
      SaveIrrigationRecipePayloadSchema.safeParse({
        growspace_id: 'gs1',
        name: 'Both',
        kind: 'both',
      }).success
    ).toBe(false);
  });

  it('validates the apply payload', () => {
    const payload = { growspace_id: 'gs1', recipe_id: 'r1' };
    expect(ApplyIrrigationRecipePayloadSchema.parse(payload)).toEqual(payload);
    expect(ApplyIrrigationRecipePayloadSchema.safeParse({ growspace_id: 'gs1' }).success).toBe(
      false
    );
  });
});

describe('updateIrrigationRecipe', () => {
  it('sends only what changed — a rename carries no values', async () => {
    vi.mocked(hassCall.hassCall).mockResolvedValueOnce({
      ...WIRE_RECIPE,
      name: 'Flower week 4',
    });

    await updateIrrigationRecipe({ recipeId: 'r1', name: 'Flower week 4' });

    expect(hassCall.hassCall).toHaveBeenCalledWith(
      'growspace_manager/update_irrigation_recipe',
      { recipe_id: 'r1', name: 'Flower week 4' },
      expect.anything()
    );
  });

  it('sends the half wire-shaped, sparsely', async () => {
    vi.mocked(hassCall.hassCall).mockResolvedValueOnce(WIRE_RECIPE);

    await updateIrrigationRecipe({
      recipeId: 'r1',
      cropSteering: { p1_shot_volume_percent: 7.5 },
    });

    expect(hassCall.hassCall).toHaveBeenCalledWith(
      'growspace_manager/update_irrigation_recipe',
      { recipe_id: 'r1', crop_steering: { p1_shot_volume_percent: 7.5 } },
      expect.anything()
    );
  });

  it('replaces the edited recipe in the library, keeping the name order', async () => {
    setIrrigationRecipes([
      {
        id: 'r1',
        name: 'Flower week 3',
        kind: 'crop_steering',
        provenance: {
          mediaType: 'rockwool',
          litersPerPot: 7.5,
          pumpFlowRateMlPerSec: 13.5,
          stage: 'flower',
          week: 3,
        },
        cropSteering: null,
        schedule: null,
        createdAt: '2026-08-04T09:00:00+00:00',
      },
      {
        id: 'z',
        name: 'Alpha',
        kind: 'crop_steering',
        provenance: {
          mediaType: 'coco',
          litersPerPot: 5,
          pumpFlowRateMlPerSec: 11,
          stage: 'veg',
          week: 2,
        },
        cropSteering: null,
        schedule: null,
        createdAt: '2026-08-01T00:00:00+00:00',
      },
    ]);
    vi.mocked(hassCall.hassCall).mockResolvedValueOnce({
      ...WIRE_RECIPE,
      name: 'Zulu week 4',
    });

    const edited = await updateIrrigationRecipe({ recipeId: 'r1', name: 'Zulu week 4' });

    expect(edited.name).toBe('Zulu week 4');
    expect(irrigationRecipes$.get().map((r) => r.name)).toEqual(['Alpha', 'Zulu week 4']);
    expect(irrigationRecipes$.get()).toHaveLength(2);
  });

  it('carries the edited half back into the library', async () => {
    vi.mocked(hassCall.hassCall).mockResolvedValueOnce({
      ...WIRE_RECIPE,
      crop_steering: {
        lights_on_time: '06:00:00',
        p0_duration_minutes: 60,
        p2_stop_before_lights_off_minutes: 120,
        target_vwc_percent: 55,
        maintenance_dryback_percent: 2,
        p1_shot_volume_percent: 7.5,
        p1_shot_interval_minutes: 15,
        p2_shot_volume_percent: 3,
        p2_shot_interval_minutes: 20,
        auto_light_tracking: false,
        dynamic_shot_enabled: true,
        dynamic_aggressiveness: 1,
        dynamic_recovery: 0.1,
        dynamic_shot_size_floor: 0.5,
        dynamic_interval_ceiling: 1.5,
        pore_ec_target_min: null,
        pore_ec_target_max: null,
        ec_modulation_enabled: false,
      },
    });

    const edited = await updateIrrigationRecipe({
      recipeId: 'r1',
      cropSteering: { p1_shot_volume_percent: 7.5 },
    });

    expect(edited.cropSteering?.p1_shot_volume_percent).toBe(7.5);
  });

  it('leaves the library alone when the command is refused', async () => {
    setIrrigationRecipes([]);
    vi.mocked(hassCall.hassCall).mockRejectedValueOnce(new Error('not part of'));

    await expect(updateIrrigationRecipe({ recipeId: 'r1', name: 'x' })).rejects.toThrow(
      'not part of'
    );
    expect(irrigationRecipes$.get()).toEqual([]);
  });
});

describe('removeIrrigationRecipe', () => {
  it('sends the recipe id and drops it from the library', async () => {
    setIrrigationRecipes([
      {
        id: 'r1',
        name: 'Flower week 3',
        kind: 'crop_steering',
        provenance: {
          mediaType: 'coco',
          litersPerPot: 5,
          pumpFlowRateMlPerSec: 11,
          stage: 'flower',
          week: 3,
        },
        cropSteering: null,
        schedule: null,
        createdAt: '2026-08-04T09:00:00+00:00',
      },
    ]);
    vi.mocked(hassCall.hassCall).mockResolvedValueOnce(undefined);

    await removeIrrigationRecipe('r1');

    expect(hassCall.hassCall).toHaveBeenCalledWith(
      'growspace_manager/remove_irrigation_recipe',
      { recipe_id: 'r1' },
      expect.anything()
    );
    expect(irrigationRecipes$.get()).toEqual([]);
  });

  it('keeps the recipe when the command fails', async () => {
    setIrrigationRecipes([
      {
        id: 'r1',
        name: 'Flower week 3',
        kind: 'crop_steering',
        provenance: {
          mediaType: 'coco',
          litersPerPot: 5,
          pumpFlowRateMlPerSec: 11,
          stage: 'flower',
          week: 3,
        },
        cropSteering: null,
        schedule: null,
        createdAt: '2026-08-04T09:00:00+00:00',
      },
    ]);
    vi.mocked(hassCall.hassCall).mockRejectedValueOnce(new Error('boom'));

    await expect(removeIrrigationRecipe('r1')).rejects.toThrow('boom');
    expect(irrigationRecipes$.get()).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Irrigation Programs
// ---------------------------------------------------------------------------

const WIRE_PROGRAM = {
  id: 'p1',
  name: 'Full run — coco',
  slots: [
    { stage: 'veg', week: 1, recipe_id: 'r-veg' },
    { stage: 'flower', week: 3, recipe_id: 'r-flower' },
  ],
  created_at: '2026-08-06T09:00:00+00:00',
};

describe('saveIrrigationProgram', () => {
  it('sends the whole plan, wire-shaped, because the save replaces the slot list', async () => {
    vi.mocked(hassCall.hassCall).mockResolvedValueOnce(WIRE_PROGRAM);

    await saveIrrigationProgram({
      name: 'Full run — coco',
      slots: [
        { stage: 'veg', week: 1, recipeId: 'r-veg' },
        { stage: 'flower', week: 3, recipeId: 'r-flower' },
      ],
    });

    expect(hassCall.hassCall).toHaveBeenCalledWith(
      'growspace_manager/save_irrigation_program',
      {
        name: 'Full run — coco',
        slots: [
          { stage: 'veg', week: 1, recipe_id: 'r-veg' },
          { stage: 'flower', week: 3, recipe_id: 'r-flower' },
        ],
      },
      expect.anything()
    );
  });

  it('sends program_id only when overwriting an existing plan', async () => {
    vi.mocked(hassCall.hassCall).mockResolvedValueOnce(WIRE_PROGRAM);

    await saveIrrigationProgram({ name: 'Full run — coco', slots: [], programId: 'p1' });

    expect(hassCall.hassCall).toHaveBeenCalledWith(
      'growspace_manager/save_irrigation_program',
      expect.objectContaining({ program_id: 'p1' }),
      expect.anything()
    );
  });

  it('merges the saved program into the library, name-ordered', async () => {
    setIrrigationPrograms([
      { id: 'z', name: 'Zulu', slots: [], createdAt: '2026-08-01T00:00:00+00:00' },
    ]);
    vi.mocked(hassCall.hassCall).mockResolvedValueOnce(WIRE_PROGRAM);

    await saveIrrigationProgram({ name: 'Full run — coco', slots: [] });

    expect(irrigationPrograms$.get().map((p) => p.name)).toEqual(['Full run — coco', 'Zulu']);
    // Slots arrive camelised and in the run order the backend put them in.
    expect(irrigationPrograms$.get()[0].slots).toEqual([
      { stage: 'veg', week: 1, recipeId: 'r-veg' },
      { stage: 'flower', week: 3, recipeId: 'r-flower' },
    ]);
  });

  it('writes nothing to any growspace — a plan holds recipes by reference', async () => {
    setIrrigationStrategy('gs1', makeStrategy());
    setDevices([
      createGrowspaceDevice({ deviceId: 'gs1', name: 'G1', irrigationStrategy: makeStrategy() }),
    ]);
    vi.mocked(hassCall.hassCall).mockResolvedValueOnce(WIRE_PROGRAM);

    await saveIrrigationProgram({ name: 'Full run — coco', slots: [] });

    expect(hassCall.callService).not.toHaveBeenCalled();
    expect(devices$.get()[0].irrigationStrategy).toEqual(makeStrategy());
  });
});

describe('removeIrrigationProgram', () => {
  it('sends the program id and drops it from the library', async () => {
    setIrrigationPrograms([
      { id: 'p1', name: 'Full run', slots: [], createdAt: '2026-08-06T09:00:00+00:00' },
    ]);
    vi.mocked(hassCall.hassCall).mockResolvedValueOnce(undefined);

    await removeIrrigationProgram('p1');

    expect(hassCall.hassCall).toHaveBeenCalledWith(
      'growspace_manager/remove_irrigation_program',
      { program_id: 'p1' },
      expect.anything()
    );
    expect(irrigationPrograms$.get()).toEqual([]);
  });

  it('keeps the program when the command fails', async () => {
    setIrrigationPrograms([
      { id: 'p1', name: 'Full run', slots: [], createdAt: '2026-08-06T09:00:00+00:00' },
    ]);
    vi.mocked(hassCall.hassCall).mockRejectedValueOnce(new Error('boom'));

    await expect(removeIrrigationProgram('p1')).rejects.toThrow('boom');
    expect(irrigationPrograms$.get()).toHaveLength(1);
  });
});

describe('assignIrrigationProgram', () => {
  it('calls the assign command with the growspace and the program', async () => {
    setIrrigationStrategy('gs1', makeStrategy());
    vi.mocked(hassCall.hassCall).mockResolvedValueOnce({
      growspace_id: 'gs1',
      irrigation_program_id: 'p1',
    });

    await assignIrrigationProgram('gs1', 'p1');

    expect(hassCall.hassCall).toHaveBeenCalledWith(
      'growspace_manager/assign_irrigation_program',
      { growspace_id: 'gs1', program_id: 'p1' },
      expect.anything()
    );
  });

  it('moves the binding and nothing else — assigning writes no setpoint', async () => {
    const before = makeStrategy({ targetVwcPercent: 65, appliedRecipeId: 'r-old' });
    setIrrigationStrategy('gs1', before);
    setDevices([
      createGrowspaceDevice({ deviceId: 'gs1', name: 'G1', irrigationStrategy: before }),
    ]);
    vi.mocked(hassCall.hassCall).mockResolvedValueOnce({
      growspace_id: 'gs1',
      irrigation_program_id: 'p1',
    });

    await assignIrrigationProgram('gs1', 'p1');

    const after = devices$.get()[0].irrigationStrategy;
    expect(after?.irrigationProgramId).toBe('p1');
    // Everything the growspace was actually running is untouched.
    expect({ ...after, irrigationProgramId: undefined }).toEqual({
      ...before,
      irrigationProgramId: undefined,
    });
  });

  it('unbinding clears the resolved position too — there is no plan to have one', async () => {
    setIrrigationStrategy('gs1', makeStrategy({ irrigationProgramId: 'p1' }));
    setDevices([
      createGrowspaceDevice({
        deviceId: 'gs1',
        name: 'G1',
        irrigationStrategy: makeStrategy({ irrigationProgramId: 'p1' }),
        irrigationProgram: {
          programId: 'p1',
          name: 'Full run',
          stage: 'flower',
          week: 3,
          slot: null,
          recipe: null,
          autoAdvance: false,
          progression: { state: 'held', hold: 'no_slot', detail: 'nothing changes' },
        },
      }),
    ]);
    vi.mocked(hassCall.hassCall).mockResolvedValueOnce({
      growspace_id: 'gs1',
      irrigation_program_id: null,
    });

    await assignIrrigationProgram('gs1', null);

    expect(devices$.get()[0].irrigationProgram).toBeNull();
    expect(devices$.get()[0].irrigationStrategy?.irrigationProgramId).toBeNull();
  });

  it('rolls the binding back when the assign is refused', async () => {
    setIrrigationStrategy('gs1', makeStrategy({ irrigationProgramId: 'previous' }));
    setDevices([
      createGrowspaceDevice({
        deviceId: 'gs1',
        name: 'G1',
        irrigationStrategy: makeStrategy({ irrigationProgramId: 'previous' }),
      }),
    ]);
    vi.mocked(hassCall.hassCall).mockRejectedValueOnce(new Error('no such program'));

    await expect(assignIrrigationProgram('gs1', 'p1')).rejects.toThrow();

    expect(irrigationStrategies$.get().get('gs1')?.irrigationProgramId).toBe('previous');
    expect(devices$.get()[0].irrigationStrategy?.irrigationProgramId).toBe('previous');
  });
});

describe('setProgramAutoAdvance', () => {
  it('sends one field beside the growspace id — not the whole settings form', async () => {
    setIrrigationConfig('gs1', makeConfig());

    await setProgramAutoAdvance('gs1', true);

    expect(hassCall.callService).toHaveBeenCalledWith(
      'growspace_manager',
      'set_irrigation_settings',
      { growspace_id: 'gs1', program_auto_advance: true }
    );
  });

  it('reflects the new value on the config and the device at once', async () => {
    setIrrigationConfig('gs1', makeConfig());
    setDevices([
      createGrowspaceDevice({ deviceId: 'gs1', name: 'G1', irrigationConfig: makeConfig() }),
    ]);

    await setProgramAutoAdvance('gs1', true);

    expect(irrigationConfigs$.get().get('gs1')?.programAutoAdvance).toBe(true);
    expect(devices$.get()[0].irrigationConfig?.programAutoAdvance).toBe(true);
  });

  it('rolls back to the previous opt-in when the write is refused', async () => {
    setIrrigationConfig('gs1', makeConfig({ programAutoAdvance: false }));
    setDevices([
      createGrowspaceDevice({
        deviceId: 'gs1',
        name: 'G1',
        irrigationConfig: makeConfig({ programAutoAdvance: false }),
      }),
    ]);
    vi.mocked(hassCall.callService).mockRejectedValueOnce(new Error('boom'));

    await expect(setProgramAutoAdvance('gs1', true)).rejects.toThrow();

    expect(irrigationConfigs$.get().get('gs1')?.programAutoAdvance).toBe(false);
    expect(devices$.get()[0].irrigationConfig?.programAutoAdvance).toBe(false);
  });
});

describe('Irrigation Program payload schemas', () => {
  it('validates the save payload, with program_id only when overwriting', () => {
    const create = {
      name: 'Full run',
      slots: [{ stage: 'flower', week: 3, recipe_id: 'r1' }],
    };
    expect(SaveIrrigationProgramPayloadSchema.parse(create)).toEqual(create);
    expect(SaveIrrigationProgramPayloadSchema.parse({ ...create, program_id: 'p1' })).toEqual({
      ...create,
      program_id: 'p1',
    });
  });

  it('refuses a slot key the backend does not know', () => {
    expect(() =>
      SaveIrrigationProgramPayloadSchema.parse({
        name: 'Full run',
        slots: [{ stage: 'flower', week: 3, recipe_id: 'r1', note: 'nope' }],
      })
    ).toThrow();
  });

  it('accepts a null program id — that is how a growspace is unbound', () => {
    expect(
      AssignIrrigationProgramPayloadSchema.parse({ growspace_id: 'gs1', program_id: null })
    ).toEqual({ growspace_id: 'gs1', program_id: null });
  });
});
