/**
 * GrowspaceAdapter — irrigation strategy deserialization.
 *
 * Focused on the per-phase shot fields, Shot Sizing Mode, and declared Steering
 * Mode added in #443/#448, including the legacy shared-shot fallback.
 */

import { describe, it, expect } from 'vitest';
import { GrowspaceAdapter } from './growspace-adapter';
import type { GrowspaceAPIResponse } from '../services/types';
import { GrowspaceAPIResponseSchema } from '../slices/growspace/schema';

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

  // The shape the shipped GSM release emits. Current backends always serialize
  // substrate_profile (default_factory), so the undefined case below only
  // occurs against that older payload.
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

/**
 * The hydration path as it actually runs: the backend payload is parsed by the
 * slice schema at the hassCall seam *before* the adapter sees it. Feeding the
 * adapter a hand-built object (as the tests above do) skips the seam, so it
 * cannot catch a field the schema strips — these tests go through both.
 */
describe('GrowspaceAdapter irrigation strategy through the wire schema', () => {
  function hydrate(strategy: Record<string, unknown>) {
    const parsed = GrowspaceAPIResponseSchema.parse({
      identity: {
        growspace_id: 'gs1',
        name: 'Tent',
        overview_entity_id: 'sensor.gs1',
        type: 'normal',
      },
      irrigation: { irrigation_strategy: strategy },
    });
    return GrowspaceAdapter.transformGrowspace(null, parsed as unknown as GrowspaceAPIResponse)
      ?.irrigationStrategy;
  }

  const fullStrategy = {
    enabled: true,
    lights_on_time: '07:30:00',
    p0_duration_minutes: 45,
    p2_stop_before_lights_off_minutes: 90,
    target_vwc_percent: 62,
    maintenance_dryback_percent: 3.5,
    // Legacy mirror of P1 (__post_serialize__) — the value a stripped p1_* would
    // silently fall back to.
    shot_duration_seconds: 8,
    shot_interval_minutes: 12,
    p1_shot_duration_seconds: 8,
    p1_shot_interval_minutes: 12,
    p2_shot_duration_seconds: 14,
    p2_shot_interval_minutes: 25,
    p1_shot_volume_percent: 5.5,
    p2_shot_volume_percent: 2.5,
    shot_sizing_mode: 'volume',
    substrate_profile: { media_type: 'rockwool', liters_per_pot: 6.5 },
    pore_ec_target_min: 4.2,
    pore_ec_target_max: 7.8,
    ec_modulation_enabled: true,
    auto_light_tracking: true,
    detected_lights_on_time: '07:28:00',
    declared_steering_mode: 'generative',
    dynamic_shot_enabled: false,
    dynamic_aggressiveness: 1.4,
    dynamic_recovery: 0.25,
    dynamic_shot_size_floor: 0.35,
    dynamic_interval_ceiling: 1.9,
  };

  it('survives a Pore EC band, Substrate Profile, sizing mode, and declared mode', () => {
    const strat = hydrate(fullStrategy);

    expect(strat?.poreEcTargetMin).toBe(4.2);
    expect(strat?.poreEcTargetMax).toBe(7.8);
    expect(strat?.ecModulationEnabled).toBe(true);
    expect(strat?.substrateProfile).toEqual({ mediaType: 'rockwool', litersPerPot: 6.5 });
    expect(strat?.shotSizingMode).toBe('volume');
    expect(strat?.declaredSteeringMode).toBe('generative');
  });

  it('survives the dynamic_* tunables, including a disabled master toggle', () => {
    const strat = hydrate(fullStrategy);

    expect(strat?.dynamicShotEnabled).toBe(false);
    expect(strat?.dynamicAggressiveness).toBe(1.4);
    expect(strat?.dynamicRecovery).toBe(0.25);
    expect(strat?.dynamicShotSizeFloor).toBe(0.35);
    expect(strat?.dynamicIntervalCeiling).toBe(1.9);
  });

  it('keeps a per-phase shot duration that a stripped field would fake via the legacy value', () => {
    // P2 differs from the legacy mirror; if the schema strips p2_*, the adapter
    // reports the plausible legacy 8/12 instead of the stored 14/25.
    const strat = hydrate(fullStrategy);

    expect(strat?.p2ShotDurationSeconds).toBe(14);
    expect(strat?.p2ShotIntervalMinutes).toBe(25);
    expect(strat?.p1ShotDurationSeconds).toBe(8);
    expect(strat?.p1ShotIntervalMinutes).toBe(12);
  });

  it('still seeds both phases from the legacy fields when the backend omits per-phase keys', () => {
    const strat = hydrate({
      enabled: true,
      lights_on_time: '06:00:00',
      p0_duration_minutes: 60,
      p2_stop_before_lights_off_minutes: 120,
      target_vwc_percent: 55,
      maintenance_dryback_percent: 2,
      shot_duration_seconds: 25,
      shot_interval_minutes: 18,
    });

    expect(strat?.p1ShotDurationSeconds).toBe(25);
    expect(strat?.p2ShotDurationSeconds).toBe(25);
    expect(strat?.p1ShotIntervalMinutes).toBe(18);
    expect(strat?.p2ShotIntervalMinutes).toBe(18);
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
    const device = GrowspaceAdapter.transformGrowspace(null, {
      identity: { growspace_id: 'gs1', name: 'Tent' },
      irrigation: {},
    } as unknown as GrowspaceAPIResponse);
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
      wsWithEnvironment({ lst_offset: -3.5 })
    );
    expect(device?.environmentAttributes?.lstOffset).toBe(-3.5);
  });

  it('leaves lstOffset undefined when backend omits it', () => {
    const device = GrowspaceAdapter.transformGrowspace(null, wsWithEnvironment({}));
    expect(device?.environmentAttributes?.lstOffset).toBeUndefined();
  });

  it('maps optional stress and mold thresholds', () => {
    const device = GrowspaceAdapter.transformGrowspace(
      null,
      wsWithEnvironment({ stress_threshold: 0.7, mold_threshold: 0.75 })
    );
    expect(device?.environmentAttributes?.stressThreshold).toBe(0.7);
    expect(device?.environmentAttributes?.moldThreshold).toBe(0.75);
  });

  it('uses null thresholds when an older backend omits them', () => {
    const device = GrowspaceAdapter.transformGrowspace(null, wsWithEnvironment({}));
    expect(device?.environmentAttributes?.stressThreshold).toBeNull();
    expect(device?.environmentAttributes?.moldThreshold).toBeNull();
  });
});

// ─── Notification settings (Config Dialog round-trip) ────────────────────────

describe('GrowspaceAdapter notification settings', () => {
  function wsWithNotifications(extra: Partial<GrowspaceAPIResponse>): GrowspaceAPIResponse {
    return {
      identity: { growspace_id: 'gs1', name: 'Tent', overview_entity_id: 'sensor.gs1' },
      ...extra,
    } as unknown as GrowspaceAPIResponse;
  }

  it('maps notification_settings + ai_auto_alerts onto device.notificationSettings', () => {
    const device = GrowspaceAdapter.transformGrowspace(
      null,
      wsWithNotifications({
        notification_settings: { criticalCooldownMinutes: 7, warningCooldownMinutes: 45 },
        ai_auto_alerts: false,
      } as unknown as Partial<GrowspaceAPIResponse>)
    );

    expect(device?.notificationSettings?.criticalCooldownMinutes).toBe(7);
    expect(device?.notificationSettings?.warningCooldownMinutes).toBe(45);
    expect(device?.notificationSettings?.aiAutoAlerts).toBe(false);
  });

  it('leaves notificationSettings undefined when the backend omits the settings', () => {
    const device = GrowspaceAdapter.transformGrowspace(null, wsWithNotifications({}));
    expect(device?.notificationSettings).toBeUndefined();
  });

  it('maps timed_notifications (snake_case) onto device.timedNotifications (camelCase)', () => {
    const device = GrowspaceAdapter.transformGrowspace(
      null,
      wsWithNotifications({
        timed_notifications: [
          { id: 'n1', message: 'Feed me', trigger_type: 'veg', day: 3, growspace_ids: ['gs-1'] },
        ],
      } as unknown as Partial<GrowspaceAPIResponse>)
    );

    expect(device?.timedNotifications).toEqual([
      { id: 'n1', message: 'Feed me', triggerType: 'veg', day: 3, growspaceIds: ['gs-1'] },
    ]);
  });

  it.each([
    { id: 'veg_start', stored: 'veg_start', expected: 'veg' },
    { id: 'flower_start', stored: 'flower_start', expected: 'flower' },
    { id: 'days_since_flip', stored: 'days_since_flip', expected: 'flower' },
    { id: 'bare stage', stored: 'dry', expected: 'dry' },
  ])('normalises the legacy trigger "$id" to the bare stage that fires', ({ stored, expected }) => {
    const device = GrowspaceAdapter.transformGrowspace(
      null,
      wsWithNotifications({
        timed_notifications: [
          { id: 'n1', message: 'Old', trigger_type: stored, day: 3, growspace_ids: [] },
        ],
      } as unknown as Partial<GrowspaceAPIResponse>)
    );

    expect(device?.timedNotifications?.[0].triggerType).toBe(expected);
  });

  it.each([
    { id: 'days_since_germination', stored: 'days_since_germination' },
    { id: 'nonsense', stored: 'whenever_i_feel_like_it' },
  ])('flags the unrecognised trigger "$id" instead of coercing it', ({ stored }) => {
    const device = GrowspaceAdapter.transformGrowspace(
      null,
      wsWithNotifications({
        timed_notifications: [
          { id: 'n1', message: 'Odd', trigger_type: stored, day: 3, growspace_ids: [] },
        ],
      } as unknown as Partial<GrowspaceAPIResponse>)
    );

    expect(device?.timedNotifications?.[0].triggerType).toEqual({ raw: stored });
  });

  it('leaves timedNotifications as an empty list when the backend omits them', () => {
    const device = GrowspaceAdapter.transformGrowspace(null, wsWithNotifications({}));
    expect(device?.timedNotifications).toEqual([]);
  });
});

// ─── Grow light (Config Dialog round-trip) ───────────────────────────────────

describe('GrowspaceAdapter grow light', () => {
  function wsWithEnvironment(env: Record<string, unknown>): GrowspaceAPIResponse {
    return {
      identity: { growspace_id: 'gs1', name: 'Tent', overview_entity_id: 'sensor.gs1' },
      environment: env,
    } as unknown as GrowspaceAPIResponse;
  }

  it('maps grow light entities, config, and AC Infinity bundle', () => {
    const device = GrowspaceAdapter.transformGrowspace(
      null,
      wsWithEnvironment({
        growlight_entities: ['switch.grow'],
        growlight_config: { enabled: true, power: 80, sunrise_enabled: false, sunrise_minutes: 0 },
        growlight_ac_infinity_devices: [
          {
            mode_entity: 'select.m',
            on_time_entity: 'time.on',
            off_time_entity: 'time.off',
            power_entity: 'number.p',
            sunrise_switch_entity: '',
            sunrise_duration_entity: '',
          },
        ],
      })
    );
    expect(device?.environmentAttributes?.growlightEntities).toEqual(['switch.grow']);
    expect(device?.environmentAttributes?.growlightConfig?.power).toBe(80);
    expect(device?.environmentAttributes?.growlightAcInfinityDevices?.[0].off_time_entity).toBe(
      'time.off'
    );
  });
});

describe('GrowspaceAdapter irrigation tanks through the wire schema', () => {
  const REAL_TANK = {
    sensor_entity: 'sensor.tank_level',
    name: 'Res A',
    warning_level: 30,
    fill_level: 62.5,
    is_warning: false,
    hours_remaining: 18.25,
    depletion_status: 'depleting',
    volume_liters: 200,
    water_history: {
      buckets_24h: [{ ts: '2026-08-11T05:00:00+00:00', liters: 0.4125 }],
      daily_7d: [{ date: '2026-08-10', consumed: 6.125, refilled: 0 }],
      recent_refills: [
        {
          timestamp: '2026-08-09T18:02:11+00:00',
          event_type: 'refill',
          pct_delta: 41.5,
          liters: 83,
        },
      ],
    },
  };

  function hydrate(tanks: unknown[]) {
    const parsed = GrowspaceAPIResponseSchema.parse({
      identity: {
        growspace_id: 'gs1',
        name: 'Tent',
        overview_entity_id: 'sensor.gs1',
        type: 'normal',
      },
      environment: { irrigation_tanks: tanks },
    });
    return GrowspaceAdapter.transformGrowspace(null, parsed as unknown as GrowspaceAPIResponse)
      ?.environmentAttributes?.irrigationTanks;
  }

  it('maps a row the backend really emits, water history included', () => {
    const tanks = hydrate([REAL_TANK]);
    expect(tanks).toHaveLength(1);
    expect(tanks?.[0]).toEqual({
      sensorEntity: 'sensor.tank_level',
      name: 'Res A',
      warningLevel: 30,
      fillLevel: 62.5,
      isWarning: false,
      hoursRemaining: 18.25,
      depletionStatus: 'depleting',
      volumeLiters: 200,
      waterHistory: REAL_TANK.water_history,
    });
  });

  it('keeps a null fill_level distinct from a zero reading', () => {
    // The view model emits null when the sensor is missing or unparseable, and
    // is_warning is false in that case rather than "below the warning level".
    const tanks = hydrate([{ ...REAL_TANK, fill_level: null, is_warning: false }]);
    expect(tanks?.[0].fillLevel).toBeNull();
  });

  it('drops only the malformed row, so one bad tank cannot blank the growspace', () => {
    const tanks = hydrate([
      REAL_TANK,
      { name: 'No sensor entity' },
      { ...REAL_TANK, name: 'Res B' },
    ]);
    expect(tanks?.map((t) => t.name)).toEqual(['Res A', 'Res B']);
  });

  it('omits the optional keys the backend leaves off a row', () => {
    const tanks = hydrate([
      {
        sensor_entity: 'sensor.t',
        name: 'Bare',
        warning_level: 30,
        fill_level: 10,
        is_warning: true,
      },
    ]);
    expect(tanks?.[0].hoursRemaining).toBeNull();
    expect(tanks?.[0].depletionStatus).toBeNull();
    expect(tanks?.[0].waterHistory).toBeUndefined();
  });
});

// ─── Acceptable Moisture Band (contract adaptation) ──────────────────────────

describe('GrowspaceAdapter acceptable moisture band', () => {
  function wsWithEnv(env: Record<string, unknown>): GrowspaceAPIResponse {
    return {
      identity: { growspace_id: 'gs1', name: 'Tent', overview_entity_id: 'sensor.gs1' },
      environment: env,
    } as unknown as GrowspaceAPIResponse;
  }

  it('maps a stored custom pair and the effective band', () => {
    const device = GrowspaceAdapter.transformGrowspace(
      null,
      wsWithEnv({
        soil_moisture_min: 32.5,
        soil_moisture_max: 54,
        soil_moisture_band: { min: 32.5, max: 54, is_custom: true },
      })
    );
    const attrs = device?.environmentAttributes;
    expect(attrs?.soilMoistureMin).toBe(32.5);
    expect(attrs?.soilMoistureMax).toBe(54);
    expect(attrs?.soilMoistureBand).toEqual({ min: 32.5, max: 54, is_custom: true });
  });

  it('maps an inherited band as null bounds, not as the defaults', () => {
    const device = GrowspaceAdapter.transformGrowspace(
      null,
      wsWithEnv({
        soil_moisture_min: null,
        soil_moisture_max: null,
        soil_moisture_band: { min: 20, max: 60, is_custom: false },
      })
    );
    const attrs = device?.environmentAttributes;
    expect(attrs?.soilMoistureMin).toBeNull();
    expect(attrs?.soilMoistureMax).toBeNull();
    expect(attrs?.soilMoistureBand?.is_custom).toBe(false);
  });

  it('maps sensor unit and compatibility when a sensor is configured', () => {
    const device = GrowspaceAdapter.transformGrowspace(
      null,
      wsWithEnv({
        soil_moisture_sensor: 'sensor.soil',
        soil_moisture_unit: '%',
        soil_moisture_band_compatible: true,
      })
    );
    expect(device?.environmentAttributes?.soilMoistureUnit).toBe('%');
    expect(device?.environmentAttributes?.soilMoistureBandCompatible).toBe(true);
  });

  it('degrades to an inherited band against a backend that predates the field', () => {
    // Card releases can outrun the integration; an absent band must read as
    // inherited rather than throwing or inventing a custom override.
    const device = GrowspaceAdapter.transformGrowspace(null, wsWithEnv({}));
    const attrs = device?.environmentAttributes;
    expect(attrs?.soilMoistureMin).toBeNull();
    expect(attrs?.soilMoistureMax).toBeNull();
    expect(attrs?.soilMoistureBand).toBeUndefined();
    expect(attrs?.soilMoistureBandCompatible).toBeUndefined();
  });
});
