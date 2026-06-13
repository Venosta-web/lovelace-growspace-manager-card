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
