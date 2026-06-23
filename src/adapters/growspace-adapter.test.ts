/**
 * GrowspaceAdapter — irrigation strategy deserialization.
 *
 * Focused on the per-phase shot fields, Shot Sizing Mode, and declared Steering
 * Mode added in #443/#448, including the legacy shared-shot fallback.
 */

import { describe, it, expect } from 'vitest';
import { GrowspaceAdapter } from './growspace-adapter';
import type { GrowspaceAPIResponse } from '../services/types';

function wsWithStrategy(strategy: Record<string, unknown>): GrowspaceAPIResponse {
  return {
    identity: { growspace_id: 'gs1', name: 'Tent', overview_entity_id: 'sensor.gs1' },
    irrigation: { irrigation_strategy: strategy },
  } as unknown as GrowspaceAPIResponse;
}

describe('GrowspaceAdapter irrigation strategy', () => {
  it('deserializes per-phase shot, sizing-mode, and declared-mode fields', () => {
    const device = GrowspaceAdapter.transformGrowspace(
      null,
      wsWithStrategy({
        enabled: true,
        lights_on_time: '06:00:00',
        p0_duration_minutes: 60,
        p2_stop_before_lights_off_minutes: 120,
        target_vwc_percent: 55,
        maintenance_dryback_percent: 2,
        shot_duration_seconds: 10,
        shot_interval_minutes: 15,
        p1_shot_duration_seconds: 12,
        p1_shot_interval_minutes: 20,
        p2_shot_duration_seconds: 18,
        p2_shot_interval_minutes: 30,
        p1_shot_volume_percent: 4,
        p2_shot_volume_percent: 6,
        shot_sizing_mode: 'volume',
        declared_steering_mode: 'generative',
        dynamic_shot_enabled: false,
        dynamic_aggressiveness: 1.5,
        dynamic_recovery: 0.2,
        dynamic_shot_size_floor: 0.4,
        dynamic_interval_ceiling: 2.0,
      })
    );

    const strat = device?.irrigationStrategy;
    expect(strat?.p1ShotDurationSeconds).toBe(12);
    expect(strat?.p1ShotIntervalMinutes).toBe(20);
    expect(strat?.p2ShotDurationSeconds).toBe(18);
    expect(strat?.p2ShotIntervalMinutes).toBe(30);
    expect(strat?.p1ShotVolumePercent).toBe(4);
    expect(strat?.p2ShotVolumePercent).toBe(6);
    expect(strat?.shotSizingMode).toBe('volume');
    expect(strat?.declaredSteeringMode).toBe('generative');
    expect(strat?.dynamicShotEnabled).toBe(false);
    expect(strat?.dynamicAggressiveness).toBe(1.5);
    expect(strat?.dynamicRecovery).toBe(0.2);
    expect(strat?.dynamicShotSizeFloor).toBe(0.4);
    expect(strat?.dynamicIntervalCeiling).toBe(2.0);
  });

  it('falls back to legacy shared shot values when per-phase fields are absent', () => {
    const device = GrowspaceAdapter.transformGrowspace(
      null,
      wsWithStrategy({
        enabled: true,
        lights_on_time: '06:00:00',
        p0_duration_minutes: 60,
        p2_stop_before_lights_off_minutes: 120,
        target_vwc_percent: 55,
        maintenance_dryback_percent: 2,
        shot_duration_seconds: 25,
        shot_interval_minutes: 18,
      })
    );

    const strat = device?.irrigationStrategy;
    expect(strat?.p1ShotDurationSeconds).toBe(25);
    expect(strat?.p1ShotIntervalMinutes).toBe(18);
    expect(strat?.p2ShotDurationSeconds).toBe(25);
    expect(strat?.p2ShotIntervalMinutes).toBe(18);
    expect(strat?.shotSizingMode).toBe('seconds');
    expect(strat?.declaredSteeringMode ?? null).toBeNull();
    // Adaptive Shot Control defaults on when the backend omits the field, matching
    // the previously always-on size feedback.
    expect(strat?.dynamicShotEnabled).toBe(true);
  });

  it('deserializes substrate profile, pore-EC band, and EC modulation', () => {
    const device = GrowspaceAdapter.transformGrowspace(
      null,
      wsWithStrategy({
        enabled: true,
        substrate_profile: { media_type: 'rockwool', liters_per_pot: 6.5 },
        pore_ec_target_min: 2.5,
        pore_ec_target_max: 4.0,
        ec_modulation_enabled: true,
      })
    );

    const strat = device?.irrigationStrategy;
    expect(strat?.substrateProfile).toEqual({ mediaType: 'rockwool', litersPerPot: 6.5 });
    expect(strat?.poreEcTargetMin).toBe(2.5);
    expect(strat?.poreEcTargetMax).toBe(4.0);
    expect(strat?.ecModulationEnabled).toBe(true);
  });

  it('defaults band to null and modulation to false when absent', () => {
    const device = GrowspaceAdapter.transformGrowspace(null, wsWithStrategy({ enabled: true }));
    const strat = device?.irrigationStrategy;
    expect(strat?.poreEcTargetMin ?? null).toBeNull();
    expect(strat?.poreEcTargetMax ?? null).toBeNull();
    expect(strat?.ecModulationEnabled).toBe(false);
    expect(strat?.substrateProfile).toBeUndefined();
  });

  it('reads volume_mode_capable from the irrigation payload onto the device', () => {
    const capable = GrowspaceAdapter.transformGrowspace(null, {
      identity: { growspace_id: 'gs1', name: 'Tent', overview_entity_id: 'sensor.gs1' },
      irrigation: { irrigation_strategy: { enabled: true }, volume_mode_capable: true },
    } as unknown as GrowspaceAPIResponse);
    expect(capable?.volumeModeCapable).toBe(true);

    const notCapable = GrowspaceAdapter.transformGrowspace(null, wsWithStrategy({ enabled: true }));
    expect(notCapable?.volumeModeCapable).toBe(false);
  });
});

function wsWithSubstrate(substrate: Record<string, unknown>): GrowspaceAPIResponse {
  return {
    identity: { growspace_id: 'gs1', name: 'Tent', overview_entity_id: 'sensor.gs1' },
    irrigation: { substrate },
  } as unknown as GrowspaceAPIResponse;
}

describe('GrowspaceAdapter substrate steering metrics', () => {
  it('deserializes the measured steering readout from the substrate payload', () => {
    const device = GrowspaceAdapter.transformGrowspace(
      null,
      wsWithSubstrate({
        overnight_dryback: 12.5,
        latest_overnight_event: {
          event_type: 'overnight',
          peak_vwc: 55.2,
          trough_vwc: 42.7,
          dryback: 12.5,
          peak_timestamp: '2026-06-13T06:00:00+00:00',
          trough_timestamp: '2026-06-13T18:00:00+00:00',
        },
        incycle_dryback_count: 4,
        incycle_dryback_avg: 3.1,
        ec_trend: 'rising',
        ec_trend_available: true,
        score: 0.6,
        measured_classification: 'generative',
        intent_deviation: 'more_generative',
        shot_composition: { ec_modulation_enabled: true, last_shot: null },
      })
    );

    const metrics = device?.steeringMetrics;
    expect(metrics?.overnightDryback).toBe(12.5);
    expect(metrics?.latestOvernightEvent?.peakVwc).toBe(55.2);
    expect(metrics?.latestOvernightEvent?.troughVwc).toBe(42.7);
    expect(metrics?.incycleDrybackCount).toBe(4);
    expect(metrics?.incycleDrybackAvg).toBe(3.1);
    expect(metrics?.ecTrend).toBe('rising');
    expect(metrics?.ecTrendAvailable).toBe(true);
    expect(metrics?.score).toBe(0.6);
    expect(metrics?.measuredClassification).toBe('generative');
    expect(metrics?.intentDeviation).toBe('more_generative');
    expect(metrics?.shotComposition).toEqual({
      ec_modulation_enabled: true,
      last_shot: null,
    });
  });

  it('marks EC trend unavailable when the backend reports no pore-EC reading', () => {
    const device = GrowspaceAdapter.transformGrowspace(
      null,
      wsWithSubstrate({
        ec_trend: null,
        ec_trend_available: false,
        score: null,
        measured_classification: null,
        intent_deviation: null,
      })
    );

    const metrics = device?.steeringMetrics;
    expect(metrics?.ecTrend).toBeNull();
    expect(metrics?.ecTrendAvailable).toBe(false);
    expect(metrics?.score).toBeNull();
    expect(metrics?.measuredClassification).toBeNull();
    expect(metrics?.intentDeviation).toBeNull();
  });

  it('leaves steeringMetrics undefined when the payload omits substrate', () => {
    const device = GrowspaceAdapter.transformGrowspace(
      null,
      { identity: { growspace_id: 'gs1', name: 'Tent' }, irrigation: {} } as unknown as GrowspaceAPIResponse
    );
    expect(device?.steeringMetrics).toBeUndefined();
  });
});

// ─── LST Offset ──────────────────────────────────────────────────────────────

describe('GrowspaceAdapter lst_offset', () => {
  function wsWithEnvironment(env: Record<string, unknown>): GrowspaceAPIResponse {
    return {
      identity: { growspace_id: 'gs1', name: 'Tent', overview_entity_id: 'sensor.gs1' },
      environment: env,
    } as unknown as GrowspaceAPIResponse;
  }

  it('maps environment.lst_offset to environmentAttributes.lstOffset', () => {
    const device = GrowspaceAdapter.transformGrowspace(
      null,
      wsWithEnvironment({ lst_offset: -3.5 }),
    );
    expect(device?.environmentAttributes?.lstOffset).toBe(-3.5);
  });

  it('leaves lstOffset undefined when backend omits it', () => {
    const device = GrowspaceAdapter.transformGrowspace(
      null,
      wsWithEnvironment({}),
    );
    expect(device?.environmentAttributes?.lstOffset).toBeUndefined();
  });
});
