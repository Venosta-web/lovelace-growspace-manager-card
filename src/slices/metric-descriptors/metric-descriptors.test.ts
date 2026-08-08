import { describe, it, expect } from 'vitest';
import { computeMetricDescriptors } from './index';
import { ChartType, METRIC_CONFIG, MetricKey } from '../../features/environment/constants';
import { DEFAULTS } from '../../lib/constants';

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
    expect(descriptors[MetricKey.EXHAUST]).toBeUndefined();
    expect(Object.keys(descriptors)).toEqual([MetricKey.TEMPERATURE, MetricKey.VPD]);
  });

  it('reads explicit day and night VPD thresholds from the overview entity', () => {
    const descriptor = computeMetricDescriptors({
      attributes: {
        day_vpd_target_min: 1,
        day_vpd_target_max: 2,
        day_vpd_danger_min: 0.5,
        day_vpd_danger_max: 2.5,
        night_vpd_target_min: 0.4,
        night_vpd_target_max: 0.6,
        night_vpd_danger_min: 0.2,
        night_vpd_danger_max: 0.8,
      },
    })[MetricKey.VPD];

    expect(descriptor.vpdThresholds).toEqual({
      day: { targetMin: 1, targetMax: 2, dangerMin: 0.5, dangerMax: 2.5 },
      night: { targetMin: 0.4, targetMax: 0.6, dangerMin: 0.2, dangerMax: 0.8 },
    });
  });

  it('falls day thresholds back through legacy values to defaults', () => {
    const legacy = computeMetricDescriptors({
      attributes: {
        vpd_target_min: 0.9,
        vpd_target_max: 1.3,
        vpd_danger_min: 0.3,
        vpd_danger_max: 1.7,
      },
    })[MetricKey.VPD].vpdThresholds;
    const defaults = computeMetricDescriptors()[MetricKey.VPD].vpdThresholds;

    expect(legacy?.day).toEqual({
      targetMin: 0.9,
      targetMax: 1.3,
      dangerMin: 0.3,
      dangerMax: 1.7,
    });
    expect(defaults?.day).toEqual({
      targetMin: DEFAULTS.VPD.TARGET_MIN,
      targetMax: DEFAULTS.VPD.TARGET_MAX,
      dangerMin: DEFAULTS.VPD.DANGER_MIN,
      dangerMax: DEFAULTS.VPD.DANGER_MAX,
    });
  });

  it('falls each missing night threshold back to its resolved day value', () => {
    const thresholds = computeMetricDescriptors({
      attributes: {
        day_vpd_target_min: 1,
        vpd_target_max: 2,
        day_vpd_danger_min: 0.5,
        vpd_danger_max: 2.5,
        night_vpd_target_max: 1.8,
      },
    })[MetricKey.VPD].vpdThresholds;

    expect(thresholds?.night).toEqual({
      targetMin: 1,
      targetMax: 1.8,
      dangerMin: 0.5,
      dangerMax: 2.5,
    });
  });
});
