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
    expect(descriptors[MetricKey.HUMIDITY]).toBeUndefined();
  });

  it.each([
    [MetricKey.OPTIMAL, ChartType.STEP, { min: 0, max: 1 }],
    [MetricKey.DEHUMIDIFIER, ChartType.STEP, { min: 0, max: 1 }],
    [MetricKey.HUMIDIFIER, ChartType.LINE, { min: 0, max: 10 }],
    [MetricKey.IRRIGATION, ChartType.STEP, { min: 0, max: 1 }],
    [MetricKey.DRAIN, ChartType.STEP, { min: 0, max: 1 }],
  ])('describes %s with its chart shape and fixed axis', (key, chartType, axis) => {
    expect(computeMetricDescriptors()[key]).toMatchObject({ key, chartType, axis });
  });

  it('describes raw light as a binary step and percentage light as a bounded line', () => {
    expect(computeMetricDescriptors()[MetricKey.LIGHT]).toMatchObject({
      unit: METRIC_CONFIG[MetricKey.LIGHT].unit,
      chartType: ChartType.STEP,
      axis: { min: 0, max: 1 },
    });
    expect(computeMetricDescriptors({ lightUnit: '%' })[MetricKey.LIGHT]).toMatchObject({
      unit: '%',
      chartType: ChartType.LINE,
      axis: { min: 0, max: 100 },
    });
  });
});
