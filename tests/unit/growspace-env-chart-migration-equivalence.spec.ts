/**
 * ADR-0030 migration equivalence — TEMPORARY.
 *
 * Proves that a metric routed through the Env Series builder produces exactly the
 * `GraphSeries` the legacy `_computeGraphSeries` derivation produced, so the
 * migration is behaviour-preserving rather than merely green.
 *
 * The characterization net in `growspace-env-chart.spec.ts` covers rendering, but
 * only one of its tests drives a migrated metric and it asserts nothing about the
 * derived values — hence this file.
 *
 * **Delete this file in #472**, together with the legacy derivation it compares
 * against. It has no meaning once there is only one path.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
// Side-effect import: the class below is only referenced in type position, so
// without this the module is elided and <growspace-env-chart> never upgrades.
import '../../src/growspace-env-chart';
import type { GrowspaceEnvChart } from '../../src/growspace-env-chart';
import { MetricKey } from '../../src/features/environment/constants';
import type { SensorHistories } from '../../src/features/environment/types';

const WIDTH = 800;
const HEIGHT = 200;

describe('ADR-0030 — Env Series matches the legacy derivation (temperature)', () => {
  let element: GrowspaceEnvChart;

  const mockDevice: any = {
    deviceId: 'd1',
    name: 'Device 1',
    sensors: {},
    overviewEntityId: 'sensor.overview',
  };

  beforeEach(async () => {
    (globalThis as any).ResizeObserver = class {
      observe = vi.fn();
      disconnect = vi.fn();
      unobserve = vi.fn();
    };

    const parent = await fixture(html`
      <div><growspace-env-chart .device=${mockDevice}></growspace-env-chart></div>
    `);
    element = parent.querySelector('growspace-env-chart') as GrowspaceEnvChart;
    await element.updateComplete;
  });

  /** Run both derivations over one fixture, against an identical window. */
  async function bothDerivations(history: SensorHistories, range: '1h' | '6h' | '24h' | '7d') {
    element.metricKey = MetricKey.TEMPERATURE;
    element.range = range;
    element.sensorHistory = history;
    await element.updateComplete;

    const durationMillis = (element as any)._getDurationMillis(range);
    const now = new Date();
    const startTime = new Date(now.getTime() - durationMillis);

    return {
      legacy: (element as any)._computeGraphSeries(WIDTH, HEIGHT, startTime, durationMillis, now),
      migrated: (element as any)._envSeriesToGraphSeries(
        WIDTH,
        HEIGHT,
        startTime,
        durationMillis,
        now
      ),
    };
  }

  function reading(minutesAgo: number, state: string) {
    return {
      entity_id: 'sensor.tent_temperature',
      state,
      attributes: {},
      last_changed: new Date(Date.now() - minutesAgo * 60 * 1000).toISOString(),
    };
  }

  it('routes temperature through the Env Series builder', () => {
    element.metricKey = MetricKey.TEMPERATURE;
    element.sensorHistory = { [MetricKey.TEMPERATURE]: [reading(30, '21')] } as any;

    expect((element as any)._isEnvSeriesMigrated()).toBe(true);
  });

  it.each([
    ['a varying trace', [reading(180, '18'), reading(120, '24'), reading(60, '21')]],
    ['a flat trace', [reading(120, '20'), reading(60, '20')]],
    ['a single reading', [reading(45, '22.5')]],
    ['readings with gaps', [reading(300, '19'), reading(90, 'unavailable'), reading(30, '23')]],
  ])('produces an identical GraphSeries for %s', async (_label, entries) => {
    const { legacy, migrated } = await bothDerivations(
      { [MetricKey.TEMPERATURE]: entries } as any,
      '24h'
    );

    expect(migrated).toHaveLength(legacy.length);
    expect(migrated[0].points).toEqual(legacy[0].points);
    expect(migrated[0].min).toBe(legacy[0].min);
    expect(migrated[0].max).toBe(legacy[0].max);
    expect(migrated[0].avg).toBeCloseTo(legacy[0].avg, 10);
    expect(migrated[0].path).toBe(legacy[0].path);
    expect(migrated[0].title).toBe(legacy[0].title);
    expect(migrated[0].unit).toBe(legacy[0].unit);
    expect(migrated[0].color).toBe(legacy[0].color);
    expect(migrated[0].fillType).toBe(legacy[0].fillType);
  });

  it.each(['1h', '6h', '24h', '7d'] as const)(
    'agrees on the %s window, so points and path share one axis',
    async (range) => {
      const { legacy, migrated } = await bothDerivations(
        {
          [MetricKey.TEMPERATURE]: [reading(400, '17'), reading(200, '25'), reading(20, '21')],
        } as any,
        range
      );

      expect(migrated[0].points).toEqual(legacy[0].points);
      expect(migrated[0].path).toBe(legacy[0].path);
    }
  );

  it('agrees that an empty history yields no series', async () => {
    const { legacy, migrated } = await bothDerivations(
      { [MetricKey.TEMPERATURE]: [] } as any,
      '24h'
    );

    expect(legacy).toEqual([]);
    expect(migrated).toEqual([]);
  });
});
