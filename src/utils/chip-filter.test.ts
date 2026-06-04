import { describe, it, expect } from 'vitest';
import { MetricKey } from '../features/environment/constants';
import type { HeaderChip } from './metrics-utils';
import { filterChips } from './chip-filter';

function makeChip(key: MetricKey): HeaderChip {
  return {
    key,
    icon: '',
    value: '0',
    active: false,
    linked: false,
    groupIndex: 0,
  };
}

describe('filterChips', () => {
  it('returns all chips when hiddenKeys is undefined', () => {
    const chips = [makeChip(MetricKey.LIGHT), makeChip(MetricKey.TEMPERATURE)];
    expect(filterChips(chips, undefined)).toEqual(chips);
  });

  it('removes the chip matching a hidden MetricKey', () => {
    const chips = [makeChip(MetricKey.LIGHT), makeChip(MetricKey.TEMPERATURE)];
    const result = filterChips(chips, [MetricKey.LIGHT]);
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe(MetricKey.TEMPERATURE);
  });

  it('removes multiple chips when multiple keys are hidden', () => {
    const chips = [
      makeChip(MetricKey.LIGHT),
      makeChip(MetricKey.EXHAUST),
      makeChip(MetricKey.TEMPERATURE),
    ];
    const result = filterChips(chips, [MetricKey.LIGHT, MetricKey.EXHAUST]);
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe(MetricKey.TEMPERATURE);
  });
});
