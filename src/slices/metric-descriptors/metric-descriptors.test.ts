import { describe, it, expect } from 'vitest';
import { computeMetricDescriptors } from './index';
import { ChartType, METRIC_CONFIG, MetricKey } from '../../features/environment/constants';

describe('computeMetricDescriptors', () => {
  it('describes temperature as an auto-scaled line', () => {
    const descriptor = computeMetricDescriptors()[MetricKey.TEMPERATURE];

    expect(descriptor).toEqual({
      key: MetricKey.TEMPERATURE,
      title: METRIC_CONFIG[MetricKey.TEMPERATURE].title,
      color: METRIC_CONFIG[MetricKey.TEMPERATURE].color,
      unit: METRIC_CONFIG[MetricKey.TEMPERATURE].unit,
      icon: METRIC_CONFIG[MetricKey.TEMPERATURE].icon,
      chartType: ChartType.LINE,
      axis: 'auto',
    });
  });

  it('omits metrics that have not been migrated yet', () => {
    const descriptors = computeMetricDescriptors();

    // Consumers treat an absent key as "still on the legacy derivation".
    expect(descriptors[MetricKey.VPD]).toBeUndefined();
    expect(descriptors[MetricKey.EXHAUST]).toBeUndefined();
    expect(Object.keys(descriptors)).toEqual([MetricKey.TEMPERATURE]);
  });
});
