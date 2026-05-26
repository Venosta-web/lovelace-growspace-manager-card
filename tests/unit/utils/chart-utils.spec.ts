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
