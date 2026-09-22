/**
 * Irrigation Command — the card's one compiler and executor for irrigation
 * configuration writes.
 *
 * These are interface tests, not schema tests. They exercise what a caller can
 * actually reach — the compiler that turns a domain change into the existing
 * wire payload, and the named mutators that run one — rather than asserting
 * that a zod object accepts an object shaped like itself, which is what the
 * outbound payload schemas used to be covered by.
 *
 * Covers:
 *   - omission: an undefined field leaves the growspace's stored value alone
 *   - clearing: null clears where the actions define a clear, compiles to the
 *     empty string for a pump entity, and is refused everywhere else
 *   - field ownership: server- and stamp-owned strategy fields are dropped, and
 *     the nested Substrate Profile flattens onto the action's two keys
 *   - strict outbound validation, before any projection or transport
 *   - the optimistic transaction: both models forward, both models back
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { IrrigationConfig, IrrigationStrategy } from '../../services/types';
import { createGrowspaceDevice } from '../../services/types';
import * as hassCall from '../../services/hass-call';
import { devices$, setDevices } from '../grid';
import { compileIrrigationCommand, IrrigationCommandError } from './irrigation-command';
import { irrigationConfigs$, irrigationStrategies$ } from './read-model';
import * as irrigationSlice from './index';
import {
  applySteeringMode,
  saveIrrigationSettings,
  setIrrigationConfig,
  setIrrigationStrategy,
  setSteeringPhase,
  toggleIrrigationMode,
  updateIrrigationStrategy,
} from './index';

vi.mock('../../services/hass-call', () => ({
  callService: vi.fn().mockResolvedValue(undefined),
  hassCall: vi.fn().mockResolvedValue({}),
  setHass: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeConfig(overrides: Partial<IrrigationConfig> = {}): IrrigationConfig {
  return { irrigationTimes: [], drainTimes: [], ...overrides };
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

/** The whole-form save's four required hardware fields, so a case can name one. */
const HARDWARE = {
  irrigationPumpEntity: 'switch.pump',
  drainPumpEntity: 'switch.drain',
  irrigationDuration: 60,
  drainDuration: 30,
} as const;

function lastServicePayload(): Record<string, unknown> {
  const calls = vi.mocked(hassCall.callService).mock.calls;
  return calls[calls.length - 1][2] as Record<string, unknown>;
}

beforeEach(() => {
  irrigationConfigs$.set(new Map());
  irrigationStrategies$.set(new Map());
  devices$.set([]);
  vi.clearAllMocks();
  vi.mocked(hassCall.callService).mockResolvedValue(undefined);
  vi.mocked(hassCall.hassCall).mockResolvedValue({});
});

// ---------------------------------------------------------------------------
// The preserved interface
// ---------------------------------------------------------------------------

describe('Irrigation Command — what the slice exposes', () => {
  it('keeps the command module internal: callers get named mutators, not a union', () => {
    // The whole point of the named interface is that a component asks for the
    // change it means. Re-exporting the executor would make the union reachable
    // and the names optional (ADR-0054).
    const exported = Object.keys(irrigationSlice);
    expect(exported).not.toContain('runIrrigationCommand');
    expect(exported).not.toContain('compileIrrigationCommand');
    expect(exported).toEqual(
      expect.arrayContaining([
        'saveIrrigationSettings',
        'updateIrrigationStrategy',
        'toggleIrrigationMode',
        'setProgramAutoAdvance',
        'setSteeringPhase',
        'applySteeringMode',
      ])
    );
  });
});

// ---------------------------------------------------------------------------
// Omission, clearing, and field ownership
// ---------------------------------------------------------------------------

describe('Irrigation Command — omission and clearing', () => {
  it('omits an undefined field, so a sparse change names only what it writes', () => {
    const plan = compileIrrigationCommand({
      kind: 'settings',
      type: 'test',
      growspaceId: 'gs1',
      settings: { maxCyclesPerDay: 8 },
    });

    expect(plan.payload).toEqual({ growspace_id: 'gs1', max_cycles_per_day: 8 });
    expect(plan.configPatch).toEqual({ maxCyclesPerDay: 8 });
  });

  it('clears the four settings the action defines a clear for', () => {
    const plan = compileIrrigationCommand({
      kind: 'settings',
      type: 'test',
      growspaceId: 'gs1',
      settings: {
        soilTriggerPercent: null,
        dailyVolumeCapLiters: null,
        maxCyclesPerDay: null,
        haltOnRunoffEcThreshold: null,
      },
    });

    expect(plan.payload).toEqual({
      growspace_id: 'gs1',
      soil_trigger_percent: null,
      daily_volume_cap_liters: null,
      max_cycles_per_day: null,
      halt_on_runoff_ec_threshold: null,
    });
  });

  it('compiles a null pump entity to the empty string the action reads as "no pump"', () => {
    const plan = compileIrrigationCommand({
      kind: 'settings',
      type: 'test',
      growspaceId: 'gs1',
      settings: { irrigationPumpEntity: null, drainPumpEntity: null },
    });

    expect(plan.payload).toEqual({
      growspace_id: 'gs1',
      irrigation_pump_entity: '',
      drain_pump_entity: '',
    });
    // The read model keeps the domain spelling; only the wire says empty string.
    expect(plan.configPatch).toEqual({ irrigationPumpEntity: null, drainPumpEntity: null });
  });

  it('refuses a settings clear the backend does not define', () => {
    expect(() =>
      compileIrrigationCommand({
        kind: 'settings',
        type: 'test',
        growspaceId: 'gs1',
        settings: { irrigationDuration: null as unknown as number },
      })
    ).toThrow(IrrigationCommandError);
  });

  it('clears both edges of the Pore EC Target Band', () => {
    const plan = compileIrrigationCommand({
      kind: 'strategy',
      type: 'test',
      growspaceId: 'gs1',
      strategy: { poreEcTargetMin: null, poreEcTargetMax: null },
    });

    expect(plan.payload).toEqual({
      growspace_id: 'gs1',
      pore_ec_target_min: null,
      pore_ec_target_max: null,
    });
  });

  it('refuses a strategy clear the backend does not define', () => {
    expect(() =>
      compileIrrigationCommand({
        kind: 'strategy',
        type: 'test',
        growspaceId: 'gs1',
        strategy: { targetVwcPercent: null as unknown as number },
      })
    ).toThrow(IrrigationCommandError);
  });

  it('flattens the nested Substrate Profile onto the action’s two keys', () => {
    const plan = compileIrrigationCommand({
      kind: 'strategy',
      type: 'test',
      growspaceId: 'gs1',
      strategy: { substrateProfile: { mediaType: 'rockwool', litersPerPot: 6.5 } },
    });

    expect(plan.payload).toEqual({
      growspace_id: 'gs1',
      substrate_media_type: 'rockwool',
      substrate_liters_per_pot: 6.5,
    });
    // Nested at both ends of the read path; flat only on this wire.
    expect(plan.strategyPatch).toEqual({
      substrateProfile: { mediaType: 'rockwool', litersPerPot: 6.5 },
    });
  });

  it('refuses a cleared Substrate Profile: a growspace always has a medium', () => {
    expect(() =>
      compileIrrigationCommand({
        kind: 'strategy',
        type: 'test',
        growspaceId: 'gs1',
        strategy: { substrateProfile: null as unknown as undefined },
      })
    ).toThrow(IrrigationCommandError);
  });

  it('drops the strategy fields another operation owns rather than refusing them', () => {
    // The Steering tab's draft is seeded from the whole strategy, so a save
    // legitimately arrives carrying fields a strategy write may not name.
    const plan = compileIrrigationCommand({
      kind: 'strategy',
      type: 'test',
      growspaceId: 'gs1',
      strategy: {
        lightsOnTime: '07:00',
        detectedLightsOnTime: null,
        declaredSteeringMode: null,
        appliedRecipeId: 'recipe-1',
        recipeAppliedAt: '2026-01-01T00:00:00Z',
        irrigationProgramId: 'program-1',
      },
    });

    expect(plan.payload).toEqual({ growspace_id: 'gs1', lights_on_time: '07:00' });
    // Nor may they be projected: a settings save that wrote declaredSteeringMode
    // would blank a stamped mode locally until the next device sync.
    expect(plan.strategyPatch).toEqual({ lightsOnTime: '07:00' });
  });

  it('refuses a change that names no field at all', () => {
    expect(() =>
      compileIrrigationCommand({
        kind: 'strategy',
        type: 'test',
        growspaceId: 'gs1',
        strategy: { declaredSteeringMode: 'balanced' },
      })
    ).toThrow(IrrigationCommandError);
  });
});

// ---------------------------------------------------------------------------
// Strict outbound validation
// ---------------------------------------------------------------------------

describe('Irrigation Command — strict outbound validation', () => {
  it('refuses a duration that is not a number', () => {
    expect(() =>
      compileIrrigationCommand({
        kind: 'settings',
        type: 'test',
        growspaceId: 'gs1',
        settings: { irrigationDuration: '60' as unknown as number },
      })
    ).toThrow(IrrigationCommandError);
  });

  it('refuses a NaN a number input can produce', () => {
    expect(() =>
      compileIrrigationCommand({
        kind: 'strategy',
        type: 'test',
        growspaceId: 'gs1',
        strategy: { targetVwcPercent: Number.NaN },
      })
    ).toThrow(IrrigationCommandError);
  });

  it('refuses a Shot Sizing Mode outside the enum', () => {
    expect(() =>
      compileIrrigationCommand({
        kind: 'strategy',
        type: 'test',
        growspaceId: 'gs1',
        strategy: { shotSizingMode: 'litres' as unknown as 'volume' },
      })
    ).toThrow(IrrigationCommandError);
  });

  it('refuses a steering phase outside the enum', () => {
    expect(() =>
      compileIrrigationCommand({
        kind: 'steering-phase',
        type: 'test',
        growspaceId: 'gs1',
        phase: 'p4' as unknown as 'p3',
      })
    ).toThrow(IrrigationCommandError);
  });

  it('refuses a Steering Mode outside the enum', () => {
    expect(() =>
      compileIrrigationCommand({
        kind: 'steering-mode',
        type: 'test',
        growspaceId: 'gs1',
        mode: 'aggressive' as unknown as 'generative',
      })
    ).toThrow(IrrigationCommandError);
  });

  it('refuses before any projection or transport', async () => {
    setIrrigationConfig('gs1', makeConfig({ irrigationDuration: 60 }));

    await expect(
      saveIrrigationSettings('gs1', { ...HARDWARE, irrigationDuration: Number.NaN })
    ).rejects.toThrow();

    expect(irrigationConfigs$.get().get('gs1')?.irrigationDuration).toBe(60);
    expect(hassCall.callService).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// The named mutators compile the existing wire payload
// ---------------------------------------------------------------------------

describe('Irrigation Command — the wire payload each named mutator sends', () => {
  it('updateIrrigationStrategy maps the whole steering form', async () => {
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
      {
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
      }
    );
  });

  it('updateIrrigationStrategy maps the per-phase shot and sizing-mode fields', async () => {
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

    expect(lastServicePayload()).toEqual({
      growspace_id: 'gs1',
      p1_shot_duration_seconds: 12,
      p1_shot_interval_minutes: 20,
      p2_shot_duration_seconds: 18,
      p2_shot_interval_minutes: 30,
      p1_shot_volume_percent: 3.5,
      p2_shot_volume_percent: 5,
      shot_sizing_mode: 'volume',
    });
  });

  it('updateIrrigationStrategy sends Skip P2 without touching the P2 pair', async () => {
    setIrrigationStrategy('gs1', makeStrategy());

    await updateIrrigationStrategy('gs1', { skipP2AfterP1: true });

    // A sparse patch: skipping P2 never writes its timing, so the stored values
    // survive to come back when the option is cleared.
    expect(lastServicePayload()).toEqual({ growspace_id: 'gs1', skip_p2_after_p1: true });
  });

  it('updateIrrigationStrategy maps the Adaptive Shot Control fields', async () => {
    setIrrigationStrategy('gs1', makeStrategy());

    await updateIrrigationStrategy('gs1', {
      dynamicShotEnabled: false,
      dynamicAggressiveness: 1.5,
      dynamicRecovery: 0.2,
      dynamicShotSizeFloor: 0.4,
      dynamicIntervalCeiling: 2.0,
    });

    expect(lastServicePayload()).toEqual({
      growspace_id: 'gs1',
      dynamic_shot_enabled: false,
      dynamic_aggressiveness: 1.5,
      dynamic_recovery: 0.2,
      dynamic_shot_size_floor: 0.4,
      dynamic_interval_ceiling: 2.0,
    });
  });

  it('updateIrrigationStrategy maps the profile, the band and EC modulation together', async () => {
    setIrrigationStrategy('gs1', makeStrategy());

    await updateIrrigationStrategy('gs1', {
      substrateProfile: { mediaType: 'rockwool', litersPerPot: 6.5 },
      poreEcTargetMin: 2.5,
      poreEcTargetMax: 4.0,
      ecModulationEnabled: true,
    });

    expect(lastServicePayload()).toEqual({
      growspace_id: 'gs1',
      substrate_media_type: 'rockwool',
      substrate_liters_per_pot: 6.5,
      pore_ec_target_min: 2.5,
      pore_ec_target_max: 4.0,
      ec_modulation_enabled: true,
    });
  });

  it('toggleIrrigationMode sends the flipped enabled flag and nothing else', async () => {
    setIrrigationStrategy('gs1', makeStrategy({ enabled: false }));

    await toggleIrrigationMode('gs1');

    expect(lastServicePayload()).toEqual({ growspace_id: 'gs1', enabled: true });
  });

  it('saveIrrigationSettings maps the whole settings form', async () => {
    setIrrigationConfig('gs1', makeConfig());

    await saveIrrigationSettings('gs1', {
      ...HARDWARE,
      pumpFlowRateMlPerSec: 12.5,
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

    expect(lastServicePayload()).toEqual({
      growspace_id: 'gs1',
      irrigation_pump_entity: 'switch.pump',
      drain_pump_entity: 'switch.drain',
      irrigation_duration: 60,
      drain_duration: 30,
      pump_flow_rate_ml_per_sec: 12.5,
      soil_trigger_percent: 55,
      daily_volume_cap_liters: 12.5,
      max_cycles_per_day: 8,
      skip_during_dark: true,
      pause_on_low_tank: true,
      log_to_logbook: true,
      auto_advance_p1_to_p2: true,
      auto_advance_p2_to_p3: true,
      halt_on_runoff_ec_threshold: 4.2,
    });
  });

  it('saveIrrigationSettings never carries the steering phase: that is its own action', async () => {
    setIrrigationConfig('gs1', makeConfig({ activeSteeringPhase: 'p2' }));

    await saveIrrigationSettings('gs1', HARDWARE);

    const payload = lastServicePayload();
    expect(payload).not.toHaveProperty('active_steering_phase');
    expect(payload).not.toHaveProperty('steering_phase');
  });

  it('setSteeringPhase sends the manual override on its own action', async () => {
    setIrrigationConfig('gs1', makeConfig({ activeSteeringPhase: 'p2' }));

    await setSteeringPhase('gs1', 'p3');

    expect(hassCall.callService).toHaveBeenCalledWith('growspace_manager', 'set_steering_phase', {
      growspace_id: 'gs1',
      steering_phase: 'p3',
    });
  });

  it('applySteeringMode names the mode and nothing else', async () => {
    setIrrigationStrategy('gs1', makeStrategy());

    await applySteeringMode('gs1', 'generative');

    expect(hassCall.hassCall).toHaveBeenCalledWith(
      'growspace_manager/apply_steering_mode',
      { growspace_id: 'gs1', steering_mode: 'generative' },
      expect.anything()
    );
  });
});

// ---------------------------------------------------------------------------
// The optimistic transaction
// ---------------------------------------------------------------------------

describe('Irrigation Command — the optimistic transaction', () => {
  it('projects a settings change onto the read model and the device at once', async () => {
    setIrrigationConfig('gs1', makeConfig({ irrigationPumpEntity: 'switch.old' }));
    setDevices([
      createGrowspaceDevice({
        deviceId: 'gs1',
        name: 'G1',
        irrigationConfig: makeConfig({ irrigationPumpEntity: 'switch.old' }),
      }),
    ]);

    await saveIrrigationSettings('gs1', { ...HARDWARE, irrigationPumpEntity: 'switch.new' });

    expect(irrigationConfigs$.get().get('gs1')?.irrigationPumpEntity).toBe('switch.new');
    expect(devices$.get()[0].irrigationConfig.irrigationPumpEntity).toBe('switch.new');
  });

  it('restores both models when the settings transport fails', async () => {
    setIrrigationConfig('gs1', makeConfig({ irrigationPumpEntity: 'switch.old' }));
    setDevices([
      createGrowspaceDevice({
        deviceId: 'gs1',
        name: 'G1',
        irrigationConfig: makeConfig({ irrigationPumpEntity: 'switch.old' }),
      }),
    ]);
    vi.mocked(hassCall.callService).mockRejectedValueOnce(new Error('refused'));

    await expect(
      saveIrrigationSettings('gs1', { ...HARDWARE, irrigationPumpEntity: 'switch.new' })
    ).rejects.toThrow();

    expect(irrigationConfigs$.get().get('gs1')?.irrigationPumpEntity).toBe('switch.old');
    expect(devices$.get()[0].irrigationConfig.irrigationPumpEntity).toBe('switch.old');
  });

  it('projects a strategy change onto the read model and the device at once', async () => {
    setIrrigationStrategy('gs1', makeStrategy({ lightsOnTime: '06:00' }));
    setDevices([
      createGrowspaceDevice({
        deviceId: 'gs1',
        name: 'G1',
        irrigationStrategy: makeStrategy({ lightsOnTime: '06:00' }),
      }),
    ]);

    await updateIrrigationStrategy('gs1', { lightsOnTime: '07:00' });

    expect(irrigationStrategies$.get().get('gs1')?.lightsOnTime).toBe('07:00');
    expect(devices$.get()[0].irrigationStrategy?.lightsOnTime).toBe('07:00');
  });

  it('restores both models when the strategy transport fails', async () => {
    setIrrigationStrategy('gs1', makeStrategy({ lightsOnTime: '06:00' }));
    setDevices([
      createGrowspaceDevice({
        deviceId: 'gs1',
        name: 'G1',
        irrigationStrategy: makeStrategy({ lightsOnTime: '06:00' }),
      }),
    ]);
    vi.mocked(hassCall.callService).mockRejectedValueOnce(new Error('refused'));

    await expect(updateIrrigationStrategy('gs1', { lightsOnTime: '07:00' })).rejects.toThrow();

    expect(irrigationStrategies$.get().get('gs1')?.lightsOnTime).toBe('06:00');
    expect(devices$.get()[0].irrigationStrategy?.lightsOnTime).toBe('06:00');
  });

  it('restores a field the projection added back to absent, not to a stale value', async () => {
    setIrrigationConfig('gs1', makeConfig());
    setDevices([
      createGrowspaceDevice({ deviceId: 'gs1', name: 'G1', irrigationConfig: makeConfig() }),
    ]);
    vi.mocked(hassCall.callService).mockRejectedValueOnce(new Error('refused'));

    await expect(
      saveIrrigationSettings('gs1', { ...HARDWARE, maxCyclesPerDay: 8 })
    ).rejects.toThrow();

    expect(irrigationConfigs$.get().get('gs1')?.maxCyclesPerDay).toBeUndefined();
    expect(devices$.get()[0].irrigationConfig.maxCyclesPerDay).toBeUndefined();
  });

  it('leaves an omitted field alone rather than projecting it as undefined', async () => {
    setIrrigationConfig('gs1', makeConfig({ pumpFlowRateMlPerSec: 10 }));

    await saveIrrigationSettings('gs1', HARDWARE);

    expect(irrigationConfigs$.get().get('gs1')?.pumpFlowRateMlPerSec).toBe(10);
  });

  it('reflects a Steering Mode stamp as intent on both models, and rolls it back', async () => {
    setIrrigationStrategy('gs1', makeStrategy({ declaredSteeringMode: 'balanced' }));
    setDevices([
      createGrowspaceDevice({
        deviceId: 'gs1',
        name: 'G1',
        irrigationStrategy: makeStrategy({ declaredSteeringMode: 'balanced' }),
      }),
    ]);

    await applySteeringMode('gs1', 'generative');

    expect(irrigationStrategies$.get().get('gs1')?.declaredSteeringMode).toBe('generative');
    expect(devices$.get()[0].irrigationStrategy?.declaredSteeringMode).toBe('generative');

    vi.mocked(hassCall.hassCall).mockRejectedValueOnce(new Error('refused'));
    await expect(applySteeringMode('gs1', 'vegetative')).rejects.toThrow();

    expect(irrigationStrategies$.get().get('gs1')?.declaredSteeringMode).toBe('generative');
    expect(devices$.get()[0].irrigationStrategy?.declaredSteeringMode).toBe('generative');
  });

  it('projects and rolls back the manual phase override on both models', async () => {
    setIrrigationConfig('gs1', makeConfig({ activeSteeringPhase: 'p2' }));
    setDevices([
      createGrowspaceDevice({
        deviceId: 'gs1',
        name: 'G1',
        irrigationConfig: makeConfig({ activeSteeringPhase: 'p2' }),
      }),
    ]);

    await setSteeringPhase('gs1', 'p3');
    expect(irrigationConfigs$.get().get('gs1')?.activeSteeringPhase).toBe('p3');
    expect(devices$.get()[0].irrigationConfig.activeSteeringPhase).toBe('p3');

    vi.mocked(hassCall.callService).mockRejectedValueOnce(new Error('refused'));
    await expect(setSteeringPhase('gs1', 'p1')).rejects.toThrow();

    expect(irrigationConfigs$.get().get('gs1')?.activeSteeringPhase).toBe('p3');
    expect(devices$.get()[0].irrigationConfig.activeSteeringPhase).toBe('p3');
  });
});
