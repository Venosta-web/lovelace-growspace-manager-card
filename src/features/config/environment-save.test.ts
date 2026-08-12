import { describe, it, expect } from 'vitest';
import { composeEnvironmentConfig, needsExhaustCall } from './environment-save';
import { createInitialSM } from '../../dialogs/config-dialog-sm';
import type { EnvironmentDraft } from '../../dialogs/config-dialog-sm';

function draft(): EnvironmentDraft {
  return createInitialSM().environmentDraft;
}

describe('composeEnvironmentConfig', () => {
  it('carries the two control flags from the draft', () => {
    const d = draft();
    d.humidifierControlEnabled = true;
    d.dehumidifierControlEnabled = true;
    const detail = composeEnvironmentConfig(d);
    expect(detail.humidifierControlEnabled).toBe(true);
    expect(detail.dehumidifierControlEnabled).toBe(true);
  });

  it('passes grow light fields through', () => {
    const d = draft();
    d.growlightEntities = ['switch.grow'];
    d.growlightConfig = { enabled: true, power: 80, sunrise_enabled: true, sunrise_minutes: 15 };
    d.growlightAcInfinityDevices = [
      {
        mode_entity: 'select.m',
        on_time_entity: 'time.on',
        off_time_entity: 'time.off',
        power_entity: 'number.p',
        sunrise_switch_entity: '',
        sunrise_duration_entity: '',
      },
    ];
    const detail = composeEnvironmentConfig(d);
    expect(detail.growlightEntities).toEqual(['switch.grow']);
    expect(detail.growlightConfig?.power).toBe(80);
    expect(detail.growlightAcInfinityDevices?.[0].off_time_entity).toBe('time.off');
  });

  it('full-replace safety: a sensor-only edit still carries the fan + irrigation fields', () => {
    // Simulate a user who only touched the Sensors tab, but whose draft was
    // seeded complete (envDraftFromDevice). The composed payload must re-send
    // the untouched fan/irrigation config so configure_environment's full
    // replace does not reset them.
    const d = draft();
    d.temperatureSensors = ['sensor.temp'];
    d.circulationFanConfig = {
      ...d.circulationFanConfig,
      enabled: true,
    } as typeof d.circulationFanConfig;
    d.exhaustFanConfig = { ...d.exhaustFanConfig, enabled: true } as typeof d.exhaustFanConfig;
    d.feedEcSensors = ['sensor.feed_ec'];
    d.irrigationTanks = [
      { sensorEntity: 'sensor.tank', name: 'T', volumeLiters: 50, warningLevel: 20 },
    ];

    const detail = composeEnvironmentConfig(d);

    expect(detail.temperatureSensors).toEqual(['sensor.temp']);
    expect(detail.circulationFanConfig?.enabled).toBe(true);
    expect(detail.exhaustFanConfig?.enabled).toBe(true);
    expect(detail.feedEcSensors).toEqual(['sensor.feed_ec']);
    expect(detail.irrigationTanks).toHaveLength(1);
  });

  it('keeps composer keys in parity with the environment draft', () => {
    const d = draft();
    const detail = composeEnvironmentConfig(d);
    const independentlySavedVisionFields = new Set([
      'visionEnabled',
      'visionEarlyOffset',
      'visionMidHours',
      'visionLateOffset',
    ]);
    const composedDraftKeys = Object.keys(d).filter(
      (key) => !independentlySavedVisionFields.has(key)
    );
    expect(Object.keys(detail).sort()).toEqual(composedDraftKeys.sort());
  });
});

describe('needsExhaustCall', () => {
  it('is true when the payload carries an exhaust fan config', () => {
    const detail = composeEnvironmentConfig(draft());
    expect(needsExhaustCall(detail)).toBe(true);
  });

  it('is false when no exhaust fan config is present', () => {
    expect(needsExhaustCall({ exhaustFanConfig: undefined })).toBe(false);
  });
});

describe('composeEnvironmentConfig — Acceptable Moisture Band', () => {
  it('sends both bounds for a complete custom pair', () => {
    const d = draft();
    d.soilMoistureMin = 32.5;
    d.soilMoistureMax = 54;
    const detail = composeEnvironmentConfig(d);
    expect(detail.soilMoistureMin).toBe(32.5);
    expect(detail.soilMoistureMax).toBe(54);
  });

  it('sends both bounds as null to clear a stored override', () => {
    const d = draft();
    d.soilMoistureMin = null;
    d.soilMoistureMax = null;
    const detail = composeEnvironmentConfig(d);
    expect(detail.soilMoistureMin).toBeNull();
    expect(detail.soilMoistureMax).toBeNull();
  });

  it('keeps a zero minimum instead of dropping it as falsy', () => {
    const d = draft();
    d.soilMoistureMin = 0;
    d.soilMoistureMax = 45;
    const detail = composeEnvironmentConfig(d);
    expect(detail.soilMoistureMin).toBe(0);
    expect(detail.soilMoistureMax).toBe(45);
  });

  it.each([
    ['half pair', 30, null],
    ['inverted pair', 70, 30],
  ])('omits both keys for a %s so the stored band survives', (_l, min, max) => {
    const d = draft();
    d.soilMoistureMin = min;
    d.soilMoistureMax = max;
    const detail = composeEnvironmentConfig(d);
    expect('soilMoistureMin' in detail).toBe(false);
    expect('soilMoistureMax' in detail).toBe(false);
  });

  it('never emits one bound without the other', () => {
    const pairs: Array<[number | null, number | null]> = [
      [null, null],
      [30, null],
      [null, 70],
      [30, 70],
      [70, 30],
      [0, 100],
    ];
    for (const [min, max] of pairs) {
      const d = draft();
      d.soilMoistureMin = min;
      d.soilMoistureMax = max;
      const detail = composeEnvironmentConfig(d);
      expect('soilMoistureMin' in detail).toBe('soilMoistureMax' in detail);
    }
  });
});
