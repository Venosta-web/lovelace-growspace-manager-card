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
      MetricKey.EXHAUST,
      windowOf(4, 4)
    );

    expect(pane?.bars.map((bar) => bar.value)).toEqual([100, 0, 50, 25]);
    expect(pane?.peak).toBe(100);
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
      MetricKey.EXHAUST,
      windowOf(4, 4)
    );

    expect(pane).toBeUndefined();
  });
});
