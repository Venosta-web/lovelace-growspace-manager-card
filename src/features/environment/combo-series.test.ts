import { describe, it, expect } from 'vitest';
import { computeComboIntervalPane } from './combo-series';
import { computeMetricDescriptors } from '../../slices/metric-descriptors';
import { MetricKey } from './constants';
import type { HistorySensorState, SensorHistories } from './types';
import type { DeviceSnapshot } from '../../slices/device-state';
import type { GrowspaceDevice } from '../../services/types';

const NOW = new Date('2026-05-01T12:00:00.000Z');
const HOUR_MS = 60 * 60 * 1000;

/** A history entry `hoursAgo` before NOW. */
function reading(hoursAgo: number, state: string): HistorySensorState {
  return {
    entity_id: 'sensor.tent_exhaust_speed',
    state,
    attributes: {},
    last_changed: new Date(NOW.getTime() - hoursAgo * HOUR_MS).toISOString(),
  };
}

function exhaustHistory(...entries: HistorySensorState[]): SensorHistories {
  return { [MetricKey.EXHAUST]: entries };
}

/** A snapshot whose exhaust slot is a 0–10 speed sensor. */
function exhaustSnapshot(entityId = 'sensor.tent_exhaust_speed'): DeviceSnapshot {
  return {
    lightSensors: null,
    exhaustFans: { entityIds: [entityId], value: undefined, icon: '' },
    circulationFans: null,
    humidifiers: null,
    dehumidifiers: null,
  };
}

/** A growspace whose exhaust slot is wired to `entityId`, or to nothing. */
function device(entityId?: string): GrowspaceDevice {
  return {
    deviceId: 'gs-1',
    name: 'Tent',
    environmentAttributes: entityId ? { exhaustSensor: entityId } : {},
  } as unknown as GrowspaceDevice;
}

const DESCRIPTORS = computeMetricDescriptors(
  exhaustSnapshot(),
  {},
  undefined,
  device('sensor.tent_exhaust_speed')
);

function windowOf(hours: number, barCount: number) {
  return { startTimeMs: NOW.getTime() - hours * HOUR_MS, nowMs: NOW.getTime(), barCount };
}

describe('computeComboIntervalPane — exhaust duty', () => {
  it('aggregates the secondary metric over each bucket as duty', () => {
    // Four one-hour buckets, each held at one speed for its whole hour. A
    // speed-sensor fan runs 0–10, so 10 is full duty and 2.5 is a quarter of it.
    const pane = computeComboIntervalPane(
      DESCRIPTORS,
      exhaustHistory(reading(5, '10'), reading(3, '0'), reading(2, '5'), reading(1, '2.5')),
      { metric: MetricKey.EXHAUST },
      windowOf(4, 4)
    );

    expect(pane?.bars.map((bar) => bar.value)).toEqual([100, 0, 50, 25]);
    expect(pane?.scale).toBe(100);
  });

  it('scales the pane against 0-100 rather than against its own peak', () => {
    // A fan that never left 55% is a fan at a bit over half effort. Scaled to
    // its own peak it would fill the pane exactly as a fan pinned at 100% does,
    // so the two duty panes of a humidity combo would read the same and no pane
    // would be comparable with itself across time ranges. Duty states what full
    // is; the pane uses it.
    const pane = computeComboIntervalPane(
      DESCRIPTORS,
      exhaustHistory(reading(5, '5.5')),
      { metric: MetricKey.EXHAUST },
      windowOf(4, 4)
    );

    expect(pane?.bars.map((bar) => bar.value)).toEqual([
      expect.closeTo(55),
      expect.closeTo(55),
      expect.closeTo(55),
      expect.closeTo(55),
    ]);
    expect(pane?.scale).toBe(100);
  });

  it('scales past full when the metric reports above its own axis', () => {
    // The axis says where full is, not what the sensor may report. A bar that
    // does not fit is a worse reading than a scale stretched to hold it.
    const pane = computeComboIntervalPane(
      DESCRIPTORS,
      exhaustHistory(reading(5, '11')),
      { metric: MetricKey.EXHAUST },
      windowOf(4, 4)
    );

    expect(pane?.scale).toBeCloseTo(110);
  });
});

describe('computeComboIntervalPane — degrading to the primary alone', () => {
  it('yields no pane when the secondary metric has no configured sensor', () => {
    // A history can outlive the configuration that produced it — the store
    // caches per metric key and stops refetching rather than clearing. Duty
    // for a fan the growspace no longer has is a stale claim, not context.
    const unconfigured = computeMetricDescriptors(null, {}, undefined, device());

    const pane = computeComboIntervalPane(
      unconfigured,
      exhaustHistory(reading(2, '10')),
      { metric: MetricKey.EXHAUST },
      windowOf(4, 4)
    );

    expect(pane).toBeUndefined();
  });
});

describe('computeComboIntervalPane — a secondary with no full scale', () => {
  /** A growspace reporting instantaneous draw on one power sensor. */
  const POWER_SENSOR = 'sensor.tent_power';

  function powerDevice(): GrowspaceDevice {
    return {
      deviceId: 'gs-1',
      name: 'Tent',
      environmentAttributes: { powerSensors: [POWER_SENSOR] },
    } as unknown as GrowspaceDevice;
  }

  function powerReading(hoursAgo: number, state: string): HistorySensorState {
    return {
      entity_id: POWER_SENSOR,
      state,
      attributes: {},
      last_changed: new Date(NOW.getTime() - hoursAgo * HOUR_MS).toISOString(),
    };
  }

  it('reports the bucket mean in the metric own unit', () => {
    // Power scales to its data — there is no full scale for a draw to be a
    // percentage of — so duty is meaningless here and the bars carry watts.
    const pane = computeComboIntervalPane(
      computeMetricDescriptors(null, {}, undefined, powerDevice()),
      {
        [MetricKey.POWER]: [
          powerReading(5, '100'),
          powerReading(3, '400'),
          powerReading(2, '200'),
          powerReading(1, '300'),
        ],
      },
      { metric: MetricKey.POWER },
      windowOf(4, 4)
    );

    expect(pane?.unit).toBe('W');
    expect(pane?.bars.map((bar) => bar.value)).toEqual([100, 400, 200, 300]);
    // No full scale means no ceiling to hold headroom for, so the tallest bar
    // spends the whole box and the peak is the scale.
    expect(pane?.scale).toBe(400);
  });
});

describe('computeComboIntervalPane — a secondary read relative to another', () => {
  const FEED_SENSOR = 'sensor.tent_feed_ec';
  const RUNOFF_SENSOR = 'sensor.tent_runoff_ec';

  function ecDevice(runoff = true): GrowspaceDevice {
    return {
      deviceId: 'gs-1',
      name: 'Tent',
      environmentAttributes: {
        feedEcSensors: [FEED_SENSOR],
        ...(runoff ? { runoffEcSensors: [RUNOFF_SENSOR] } : {}),
      },
    } as unknown as GrowspaceDevice;
  }

  function ecReading(entityId: string, hoursAgo: number, state: string): HistorySensorState {
    return {
      entity_id: entityId,
      state,
      attributes: {},
      last_changed: new Date(NOW.getTime() - hoursAgo * HOUR_MS).toISOString(),
    };
  }

  it('reports the delta between the two metrics, bucket by bucket', () => {
    // The delta between feed and runoff is the diagnostic — the substrate is
    // either accumulating salt or it is not, and neither absolute trace says
    // which on its own.
    const pane = computeComboIntervalPane(
      computeMetricDescriptors(null, {}, undefined, ecDevice()),
      {
        [MetricKey.FEED_EC]: [ecReading(FEED_SENSOR, 4, '1.5')],
        [MetricKey.RUNOFF_EC]: [ecReading(RUNOFF_SENSOR, 4, '2'), ecReading(RUNOFF_SENSOR, 2, '3')],
      },
      { metric: MetricKey.RUNOFF_EC, relativeTo: MetricKey.FEED_EC },
      windowOf(4, 2)
    );

    expect(pane?.unit).toBe('mS/cm');
    expect(pane?.bars.map((bar) => bar.value)).toEqual([0.5, 1.5]);
    // Percentage points are not duty, so a delta has no full scale either and
    // keeps the peak.
    expect(pane?.scale).toBe(1.5);
  });

  it('takes a configured limit as the scale, and stretches past a breach', () => {
    // The whole point of the pane is whether the bars cross the ceiling, so the
    // ceiling is what they are read against — until one crosses it, which still
    // has to fit.
    const histories = {
      [MetricKey.FEED_EC]: [ecReading(FEED_SENSOR, 4, '1.5')],
      [MetricKey.RUNOFF_EC]: [ecReading(RUNOFF_SENSOR, 4, '2'), ecReading(RUNOFF_SENSOR, 2, '3')],
    };
    const secondary = { metric: MetricKey.RUNOFF_EC, relativeTo: MetricKey.FEED_EC };
    const descriptors = computeMetricDescriptors(null, {}, undefined, ecDevice());

    const withHeadroom = computeComboIntervalPane(descriptors, histories, secondary, {
      ...windowOf(4, 2),
      limit: 3,
    });
    const breached = computeComboIntervalPane(descriptors, histories, secondary, {
      ...windowOf(4, 2),
      limit: 1,
    });

    expect(withHeadroom?.scale).toBe(3);
    expect(breached?.scale).toBe(1.5);
  });

  it('yields no pane when the metric it is read against has no sensor', () => {
    const pane = computeComboIntervalPane(
      computeMetricDescriptors(null, {}, undefined, ecDevice(false)),
      { [MetricKey.FEED_EC]: [ecReading(FEED_SENSOR, 4, '1.5')] },
      { metric: MetricKey.RUNOFF_EC, relativeTo: MetricKey.FEED_EC },
      windowOf(4, 2)
    );

    expect(pane).toBeUndefined();
  });
});
