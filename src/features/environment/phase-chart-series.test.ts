import { describe, it, expect } from 'vitest';
import {
  computePhaseChartSeries,
  computePhaseWindowSegments,
  samplePhaseChartAt,
} from './phase-chart-series';
import { computePhases } from './crop-steering-model';
import type { RawHistoryDataPoint } from '../../adapters/hass-types';
import type { IrrigationStrategy } from '../../services/types';

const TARGET_VWC = 45;
const TRIGGER_VWC = 35;

/** Local wall-clock, because every phase boundary is a local minute-of-day. */
function at(day: number, hour: number, minute = 0): number {
  return new Date(2026, 4, day, hour, minute).getTime();
}

function reading(atMs: number, state: string): RawHistoryDataPoint {
  return { state, last_changed: new Date(atMs).toISOString() };
}

function seriesOf(...points: RawHistoryDataPoint[]) {
  return computePhaseChartSeries(points, TARGET_VWC, TRIGGER_VWC);
}

/** A series over an explicit window, values irrelevant to the assertion. */
function seriesSpanning(startMs: number, endMs: number) {
  const series = seriesOf(reading(startMs, '40'), reading(endMs, '42'));
  if (!series) throw new Error('fixture should produce a series');
  return series;
}

// Lights on 06:00 for 12 h, P0 an hour long, P2 stopping two hours before
// lights-off, saturation reached at 08:00 — so P0 [360,420), P1 [420,480),
// P2 [480,960), P3 [960,1080), lights-off at 1080.
const PHASES = computePhases(
  {
    lightsOnTime: '06:00',
    detectedLightsOnTime: null,
    p0DurationMinutes: 60,
    p2StopBeforeLightsOffMinutes: 120,
    maintenanceDrybackPercent: 10,
  } as unknown as IrrigationStrategy,
  12,
  null,
  480
)!;

describe('computePhaseChartSeries', () => {
  it('returns no series for missing or empty history', () => {
    expect(computePhaseChartSeries(undefined, TARGET_VWC, TRIGGER_VWC)).toBeNull();
    expect(computePhaseChartSeries([], TARGET_VWC, TRIGGER_VWC)).toBeNull();
  });

  it('returns no series for a single reading', () => {
    expect(seriesOf(reading(at(1, 8), '40'))).toBeNull();
  });

  it('returns no series when only one reading parses', () => {
    expect(seriesOf(reading(at(1, 8), 'unavailable'), reading(at(1, 9), '40'))).toBeNull();
  });

  it('orders the trace oldest-first and spans it with the window', () => {
    const series = seriesOf(reading(at(1, 20), '38'), reading(at(1, 8), '44'))!;

    expect(series.points).toEqual([
      { atMs: at(1, 8), vwc: 44 },
      { atMs: at(1, 20), vwc: 38 },
    ]);
    expect(series.window).toEqual({ startMs: at(1, 8), spanMs: 12 * 60 * 60 * 1000 });
    expect(series.currentVwc).toBe(38);
  });

  it('holds the axis open around the reference levels', () => {
    const series = seriesOf(reading(at(1, 8), '40'), reading(at(1, 9), '41'))!;

    expect(series.min).toBe(TRIGGER_VWC - 5);
    expect(series.max).toBe(TARGET_VWC + 5);
    expect(series.targetVwc).toBe(TARGET_VWC);
    expect(series.triggerVwc).toBe(TRIGGER_VWC);
  });

  it('widens the axis to a measurement that runs past them', () => {
    const series = seriesOf(reading(at(1, 8), '12'), reading(at(1, 9), '80'))!;

    expect(series.min).toBe(12);
    expect(series.max).toBe(80);
  });

  it('never reports a zero-length window', () => {
    const series = seriesOf(reading(at(1, 8), '40'), reading(at(1, 8), '41'))!;

    expect(series.window.spanMs).toBe(1);
  });
});

describe('samplePhaseChartAt', () => {
  const series = seriesOf(
    reading(at(1, 8), '40'),
    reading(at(1, 12), '50'),
    reading(at(1, 16), '30')
  )!;

  it('reads the trace ends at the window edges', () => {
    expect(samplePhaseChartAt(series, 0)).toEqual({
      atMs: at(1, 8),
      minuteOfDay: 480,
      vwc: 40,
    });
    expect(samplePhaseChartAt(series, 1)).toEqual({
      atMs: at(1, 16),
      minuteOfDay: 960,
      vwc: 30,
    });
  });

  it('interpolates between the two readings that bracket the position', () => {
    // A quarter across an 8 h window is 10:00 — halfway from 40 % to 50 %.
    expect(samplePhaseChartAt(series, 0.25)).toEqual({
      atMs: at(1, 10),
      minuteOfDay: 600,
      vwc: 45,
    });
  });

  it('clamps a position outside the window', () => {
    expect(samplePhaseChartAt(series, -1)).toEqual(samplePhaseChartAt(series, 0));
    expect(samplePhaseChartAt(series, 2)).toEqual(samplePhaseChartAt(series, 1));
  });

  it('does not divide by a zero-length gap between coincident readings', () => {
    const coincident = seriesOf(
      reading(at(1, 8), '40'),
      reading(at(1, 8), '60'),
      reading(at(1, 9), '50')
    )!;

    expect(samplePhaseChartAt(coincident, 0).vwc).toBe(40);
  });
});

describe('computePhaseWindowSegments', () => {
  describe('over a single-day window', () => {
    // 08:00 → 20:00 on the 1st: every phase boundary lifts onto that same day.
    const series = seriesSpanning(at(1, 8), at(1, 20));
    const segments = computePhaseWindowSegments(series, PHASES, '24h');

    it('draws the dark bookends around P0–P2', () => {
      expect(segments.map((s) => s.key)).toEqual(['dark-pre', 'p0', 'p1', 'p2', 'dark-post']);
      expect(segments.map((s) => s.label)).toEqual([null, 'P0', 'P1', 'P2', null]);
    });

    it('places each block on the day the window covers', () => {
      expect(segments.map((s) => [s.startMs, s.endMs])).toEqual([
        [at(1, 0), at(1, 6)],
        [at(1, 6), at(1, 7)],
        [at(1, 7), at(1, 8)],
        [at(1, 8), at(1, 16)],
        [at(1, 18), at(2, 0)],
      ]);
    });

    it('lifts a block onto the previous day when that is the nearer one', () => {
      // 20:00 → 04:00 across midnight: lights-off at 18:00 belongs to the day
      // that just ended, not to the one the window ends in.
      const overnight = seriesSpanning(at(1, 20), at(2, 4));
      const overnightSegments = computePhaseWindowSegments(overnight, PHASES, '6h');
      const darkPost = overnightSegments.find((s) => s.key === 'dark-post')!;

      expect(darkPost.startMs).toBe(at(1, 18));
      expect(darkPost.endMs).toBe(at(2, 0));
      expect(darkPost.endMs).toBeGreaterThan(darkPost.startMs);
    });
  });

  describe('over the 7d window', () => {
    // 28 Apr 10:00 → 1 May 15:00 touches four calendar days.
    const series = seriesSpanning(new Date(2026, 3, 28, 10).getTime(), at(1, 15));
    const segments = computePhaseWindowSegments(series, PHASES, '7d');

    it('repeats every block on each calendar day it touches', () => {
      expect(segments).toHaveLength(20);
      expect(segments.map((s) => s.key).slice(0, 5)).toEqual([
        'dark-pre-0',
        'p0-0',
        'p1-0',
        'p2-0',
        'dark-post-0',
      ]);
      expect(segments[segments.length - 1].key).toBe('dark-post-3');
    });

    it('places each repeat on its own day', () => {
      const p1s = segments.filter((s) => s.key.startsWith('p1-'));

      expect(p1s.map((s) => s.startMs)).toEqual([
        new Date(2026, 3, 28, 7).getTime(),
        new Date(2026, 3, 29, 7).getTime(),
        new Date(2026, 3, 30, 7).getTime(),
        at(1, 7),
      ]);
    });

    it('captions only the last day, so the bar stays readable', () => {
      const labelled = segments.filter((s) => s.label !== null);

      expect(labelled.map((s) => s.key)).toEqual(['p0-3', 'p1-3', 'p2-3']);
      expect(labelled.map((s) => s.label)).toEqual(['P0', 'P1', 'P2']);
    });
  });
});
