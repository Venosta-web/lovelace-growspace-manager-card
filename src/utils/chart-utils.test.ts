import { describe, it, expect } from 'vitest';
import { ChartUtils } from './chart-utils';

// ---------------------------------------------------------------------------
// ChartUtils.normalizeSensorValue
// ---------------------------------------------------------------------------

describe('ChartUtils.normalizeSensorValue — fan domain (issue #225)', () => {
  it('returns the percentage attribute value for an on fan entity', () => {
    const result = ChartUtils.normalizeSensorValue(
      { state: 'on', attributes: { percentage: 70 } },
      'exhaust',
      'fan.exhaust',
    );
    expect(result).toBe(70);
  });

  it('returns 0 for an off fan entity', () => {
    const result = ChartUtils.normalizeSensorValue(
      { state: 'off', attributes: { percentage: 0 } },
      'exhaust',
      'fan.exhaust',
    );
    expect(result).toBe(0);
  });

  it('returns 100 (not undefined) for a fan entity missing the percentage attribute', () => {
    const result = ChartUtils.normalizeSensorValue(
      { state: 'on' },
      'exhaust',
      'fan.exhaust',
    );
    expect(result).toBe(100);
  });

  it('does not affect non-fan entities', () => {
    const result = ChartUtils.normalizeSensorValue(
      { state: '5' },
      'exhaust',
    );
    expect(result).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// ChartUtils.normalizeHistory — entityUnit threading (issue #226)
// ---------------------------------------------------------------------------

describe('ChartUtils.normalizeHistory — entityUnit threading', () => {
  const makePoint = (state: string, last_changed = '2024-01-01T00:00:00Z') => ({
    state,
    last_changed,
    attributes: {},
  });

  it('normalizes percentage-unit light sensor history correctly', () => {
    const history = [makePoint('75'), makePoint('50', '2024-01-01T01:00:00Z')];

    const result = ChartUtils.normalizeHistory(history, 'light', undefined, '%');

    expect(result).toHaveLength(2);
    expect(result[0].value).toBe(75);
    expect(result[1].value).toBe(50);
  });

  it('still works for callers that omit entityUnit', () => {
    const history = [makePoint('22.5')];

    const result = ChartUtils.normalizeHistory(history, 'temperature');

    expect(result).toHaveLength(1);
    expect(result[0].value).toBe(22.5);
  });
});
