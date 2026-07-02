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

  it('full-replace safety: a sensor-only edit still carries the fan + irrigation fields', () => {
    // Simulate a user who only touched the Sensors tab, but whose draft was
    // seeded complete (envDraftFromDevice). The composed payload must re-send
    // the untouched fan/irrigation config so configure_environment's full
    // replace does not reset them.
    const d = draft();
    d.temperatureSensors = ['sensor.temp'];
    d.circulationFanConfig = { ...d.circulationFanConfig, enabled: true } as typeof d.circulationFanConfig;
    d.exhaustFanConfig = { ...d.exhaustFanConfig, enabled: true } as typeof d.exhaustFanConfig;
    d.feedEcSensors = ['sensor.feed_ec'];
    d.irrigationTanks = [{ sensorEntity: 'sensor.tank', name: 'T', volumeLiters: 50, warningLevel: 20 }];

    const detail = composeEnvironmentConfig(d);

    expect(detail.temperatureSensors).toEqual(['sensor.temp']);
    expect(detail.circulationFanConfig?.enabled).toBe(true);
    expect(detail.exhaustFanConfig?.enabled).toBe(true);
    expect(detail.feedEcSensors).toEqual(['sensor.feed_ec']);
    expect(detail.irrigationTanks).toHaveLength(1);
  });

  it('copies every draft field present in the event-detail contract', () => {
    const detail = composeEnvironmentConfig(draft());
    // A representative spread across air / climate / humidity / monitoring / spatial.
    for (const key of [
      'selectedGrowspaceId',
      'temperatureSensors',
      'humiditySensors',
      'vpdSensors',
      'co2Sensor',
      'lightSensors',
      'soilMoistureSensor',
      'substrateTemperatureSensors',
      'phSensors',
      'poreEcSensors',
      'powerSensors',
      'sensorGroups',
      'sensorCoordinates',
      'circulationFanConfig',
      'exhaustFanConfig',
      'vpdOptimalOverrides',
      'lstOffset',
    ] as const) {
      expect(detail).toHaveProperty(key);
    }
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
