import { describe, it, expect } from 'vitest';
import { ChartUtils } from '../../../src/utils/chart-utils';
import { MetricKey } from '../../../src/constants';

describe('ChartUtils.normalizeSensorValue', () => {
  it('returns 0 for state "off" with a generic (non-LIGHT, non-DEHUMIDIFIER) key', () => {
    // parseFloat('off') → NaN → enters isNaN branch → s === 'off' → 0
    expect(ChartUtils.normalizeSensorValue({ state: 'off' }, MetricKey.CO2)).toBe(0);
  });

  it('returns 1 for state "on" with a generic key', () => {
    expect(ChartUtils.normalizeSensorValue({ state: 'on' }, MetricKey.CO2)).toBe(1);
  });

  it('returns undefined for an unknown non-numeric state with a generic key', () => {
    expect(ChartUtils.normalizeSensorValue({ state: 'heating' }, MetricKey.CO2)).toBeUndefined();
  });

  it('returns undefined for unavailable state', () => {
    expect(ChartUtils.normalizeSensorValue({ state: 'unavailable' }, MetricKey.TEMPERATURE)).toBeUndefined();
  });

  it('returns undefined for unknown state', () => {
    expect(ChartUtils.normalizeSensorValue({ state: 'unknown' }, MetricKey.TEMPERATURE)).toBeUndefined();
  });

  it('returns numeric value for a parseable float state', () => {
    expect(ChartUtils.normalizeSensorValue({ state: '23.5' }, MetricKey.TEMPERATURE)).toBe(23.5);
  });

  it('returns 1 for LIGHT when state is "on"', () => {
    expect(ChartUtils.normalizeSensorValue({ state: 'on' }, MetricKey.LIGHT)).toBe(1);
  });

  it('returns 0 for LIGHT when state is "off"', () => {
    expect(ChartUtils.normalizeSensorValue({ state: 'off' }, MetricKey.LIGHT)).toBe(0);
  });

  it('returns 1 for LIGHT when numeric state is > 0', () => {
    expect(ChartUtils.normalizeSensorValue({ state: '500' }, MetricKey.LIGHT)).toBe(1);
  });

  it('returns 0 for LIGHT when numeric state is 0', () => {
    expect(ChartUtils.normalizeSensorValue({ state: '0' }, MetricKey.LIGHT)).toBe(0);
  });
});

describe('ChartUtils.normalizeSensorValue — fan entity domain (ADR-0008)', () => {
  it('returns attributes.percentage for a fan.* entity with state "on"', () => {
    expect(
      ChartUtils.normalizeSensorValue(
        { state: 'on', attributes: { percentage: 70 } },
        MetricKey.EXHAUST,
        'fan'
      )
    ).toBe(70);
  });

  it('returns 0 for a fan.* entity with state "off"', () => {
    expect(
      ChartUtils.normalizeSensorValue(
        { state: 'off', attributes: { percentage: 0 } },
        MetricKey.CIRCULATION_FAN,
        'fan'
      )
    ).toBe(0);
  });

  it('returns undefined (skip point) when fan.* entity is "on" but has no percentage attribute', () => {
    expect(
      ChartUtils.normalizeSensorValue({ state: 'on', attributes: {} }, MetricKey.EXHAUST, 'fan')
    ).toBeUndefined();
  });

  it('returns 0 when fan.* entity is "off" with no percentage attribute', () => {
    expect(
      ChartUtils.normalizeSensorValue({ state: 'off', attributes: {} }, MetricKey.EXHAUST, 'fan')
    ).toBe(0);
  });

  it('falls back to existing on/off behaviour when no entityDomain is provided', () => {
    expect(ChartUtils.normalizeSensorValue({ state: 'on' }, MetricKey.EXHAUST)).toBe(1);
    expect(ChartUtils.normalizeSensorValue({ state: 'off' }, MetricKey.EXHAUST)).toBe(0);
  });

  it('returns raw numeric value for a speed sensor (non-fan domain)', () => {
    expect(
      ChartUtils.normalizeSensorValue({ state: '5' }, MetricKey.CIRCULATION_FAN, 'sensor')
    ).toBe(5);
  });
});
