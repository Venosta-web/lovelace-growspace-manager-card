import { describe, it, expect } from 'vitest';
import {
  fmtMinuteOfDay,
  computeCropSteeringCycle,
  computePhases,
  findSaturationCrossing,
  generateSubstrateProjection,
  resolveSaturationCrossing,
  type VwcSample,
} from './crop-steering-model';

/** A VWC sample at `HH:MM` on the day `dayOffset` days from today, in local time. */
function sampleAt(hh: number, mm: number, vwc: number, dayOffset = 0): VwcSample {
  const d = new Date();
  d.setHours(hh, mm, 0, 0);
  d.setDate(d.getDate() + dayOffset);
  return { atMs: d.getTime(), vwc };
}

describe('fmtMinuteOfDay', () => {
  it('formats minute-of-day as HH:MM', () => {
    expect(fmtMinuteOfDay(7 * 60 + 30)).toBe('07:30');
  });

  it('wraps minutes past midnight back into 0-23h', () => {
    expect(fmtMinuteOfDay(25 * 60)).toBe('01:00');
  });
});

describe('computeCropSteeringCycle', () => {
  const baseStrategy = {
    lightsOnTime: '06:00',
    shotIntervalMinutes: 60,
    shotDurationSeconds: 30,
    p0DurationMinutes: 30,
    p2StopBeforeLightsOffMinutes: 120,
  };

  it('returns an empty cycle when required strategy fields are missing', () => {
    expect(computeCropSteeringCycle({ ...baseStrategy, lightsOnTime: '' }, 12)).toEqual([]);
  });

  it('generates shots from the first-shot time to the P2→P3 cutoff', () => {
    // Veg (18h): lights-on 06:00 + p0 30min = first shot 06:30; lights-off 00:00,
    // cutoff 120min before = 22:00. Hourly shots from 06:30 to (exclusive) 22:00.
    const shots = computeCropSteeringCycle(baseStrategy, 18);

    expect(shots[0]).toEqual({ time: '06:30:00', duration: 30 });
    expect(shots[shots.length - 1].time).toBe('21:30:00');
    expect(shots.every((s) => s.duration === 30)).toBe(true);
  });

  it('uses the resolved photoperiod for the shot cutoff', () => {
    // 11h: lights-off 17:00, cutoff 120min before = 15:00 → last shot 14:30
    const shots = computeCropSteeringCycle(baseStrategy, 11);

    expect(shots[shots.length - 1].time).toBe('14:30:00');
  });
});

describe('computePhases', () => {
  const baseStrategy = {
    lightsOnTime: '06:00',
    detectedLightsOnTime: undefined,
    p0DurationMinutes: 60,
    p2StopBeforeLightsOffMinutes: 120,
    maintenanceDrybackPercent: 3,
  };

  it('returns null when no lights-on time is configured', () => {
    expect(computePhases({ ...baseStrategy, lightsOnTime: '' }, 12, null)).toBeNull();
  });

  it('derives P0/P1/P2/P3 windows from lights-on time and photoperiod (veg, 18h)', () => {
    const result = computePhases(baseStrategy, 18, null);

    // lights-on 06:00 (360min), p0 60min → P0 ends 07:00 (420min), where the
    // first shot lands. lights-off 00:00 next day (1440min), p2Stop 120min →
    // scheduled P3 at 22:00 (1320min).
    expect(result).not.toBeNull();
    expect(result!.lightsOnMin).toBe(360);
    expect(result!.lightsOffMin).toBe(1440);
    expect(result!.phases.map((p) => p.id)).toEqual(['p0', 'p1', 'p2', 'p3']);
    expect(result!.phases[0]).toMatchObject({ id: 'p0', start: 360, end: 420 });
    expect(result!.phases[3]).toMatchObject({ id: 'p3', start: 1320, end: 1440 });
  });

  it('gives P0 the window the first shot waits out, not P1', () => {
    // The regression this shape fixes: P0 used to be missing from the strip
    // entirely, its minutes labelled "P1 · Saturation".
    const result = computePhases(baseStrategy, 18, null);
    const p0 = result!.phases.find((p) => p.id === 'p0')!;
    const firstShot = computeCropSteeringCycle(
      { ...baseStrategy, shotIntervalMinutes: 60, shotDurationSeconds: 30 },
      18
    )[0];

    expect(p0).toMatchObject({ label: 'P0', start: 360, end: 420 });
    expect(firstShot.time).toBe('07:00:00');
  });

  it('hands P1 the whole shot window when no Saturation Target crossing is known', () => {
    const result = computePhases(baseStrategy, 18, null);

    expect(result!.phases.find((p) => p.id === 'p1')).toMatchObject({ start: 420, end: 1320 });
    // P2 has not begun — kept as a zero-width window so every phase still has a chip.
    expect(result!.phases.find((p) => p.id === 'p2')).toMatchObject({ start: 1320, end: 1320 });
  });

  it('splits P1 from P2 at the measured Saturation Target crossing', () => {
    const result = computePhases(baseStrategy, 18, null, 9 * 60 + 20);

    expect(result!.phases.find((p) => p.id === 'p1')).toMatchObject({ start: 420, end: 560 });
    expect(result!.phases.find((p) => p.id === 'p2')).toMatchObject({ start: 560, end: 1320 });
  });

  it('clamps a crossing past the P3 boundary back to it', () => {
    // A late spike cannot start P2 after P3 already began.
    const result = computePhases(baseStrategy, 18, null, 23 * 60);

    expect(result!.phases.find((p) => p.id === 'p1')!.end).toBe(1320);
    expect(result!.phases.find((p) => p.id === 'p2')).toMatchObject({ start: 1320, end: 1320 });
  });

  it('prefers detectedLightsOnTime over the configured lightsOnTime as the anchor', () => {
    const result = computePhases(
      { ...baseStrategy, lightsOnTime: '06:00', detectedLightsOnTime: '06:30' },
      18,
      null
    );

    expect(result!.lightsOnMin).toBe(390);
  });

  it('clamps the P3 start to the recorded phaseChangedAt when currently in P3 (Actual P3 Boundary)', () => {
    // Scheduled P3 at 22:00 (1320min). Backend recorded an earlier auto-advance at 21:00.
    const phaseChangedAt = new Date();
    phaseChangedAt.setHours(21, 0, 0, 0);

    const result = computePhases(baseStrategy, 18, {
      activeSteeringPhase: 'p3',
      phaseChangedAt: phaseChangedAt.toISOString(),
    });

    expect(result!.phases.find((p) => p.id === 'p2')!.end).toBe(21 * 60);
    expect(result!.phases.find((p) => p.id === 'p3')!.start).toBe(21 * 60);
  });

  it('ignores phaseChangedAt when the growspace is not currently in P3', () => {
    const phaseChangedAt = new Date();
    phaseChangedAt.setHours(21, 0, 0, 0);

    const result = computePhases(baseStrategy, 18, {
      activeSteeringPhase: 'p2',
      phaseChangedAt: phaseChangedAt.toISOString(),
    });

    // falls back to the scheduled boundary
    expect(result!.phases.find((p) => p.id === 'p3')!.start).toBe(1320);
  });

  it('derives every boundary from a non-default resolved photoperiod', () => {
    const result = computePhases(baseStrategy, 11, null);

    expect(result).toMatchObject({
      lightsOnMin: 360,
      lightsOffMin: 1020,
      lightHours: 11,
    });
    expect(result!.phases.find((p) => p.id === 'p0')!.end).toBe(420);
    expect(result!.phases.find((p) => p.id === 'p3')).toMatchObject({ start: 900, end: 1020 });
  });
});

describe('generateSubstrateProjection', () => {
  const phases = {
    lightsOnMin: 360,
    lightsOffMin: 1440,
    phases: [
      {
        id: 'p0' as const,
        label: 'P0',
        name: 'Activation',
        start: 360,
        end: 420,
        color: '#7E57C2',
        target: '',
      },
      {
        id: 'p1' as const,
        label: 'P1',
        name: 'Saturation',
        start: 420,
        end: 900,
        color: '#4CAF50',
        target: '',
      },
      {
        id: 'p2' as const,
        label: 'P2',
        name: 'Maintenance',
        start: 900,
        end: 1320,
        color: '#2196F3',
        target: '',
      },
      {
        id: 'p3' as const,
        label: 'P3',
        name: 'Dryback',
        start: 1320,
        end: 1440,
        color: '#FF9800',
        target: '',
      },
    ],
  };

  it('starts the projection at the seed values and the given offset', () => {
    const pts = generateSubstrateProjection(600, [], phases, 60, 3.2, 240, 45);

    expect(pts[0].offset).toBe(600);
    // First step applies one tick of dryback before recording the point
    expect(pts[0].vwc).toBeLessThan(60);
    expect(pts[0].pore).toBeGreaterThan(3.2);
  });

  it('keeps VWC and EC values within their clamped physical ranges', () => {
    const pts = generateSubstrateProjection(0, [], phases, 45, 3, 240, 45);

    for (const p of pts) {
      expect(p.vwc).toBeGreaterThanOrEqual(0);
      expect(p.pore).toBeGreaterThanOrEqual(1.5);
      expect(p.pore).toBeLessThanOrEqual(5.5);
      expect(p.bulk).toBeGreaterThanOrEqual(0.8);
    }
  });

  it('bumps VWC up and pore EC down at shot times after the current offset', () => {
    const shots = [{ time: '07:00:00', duration: 30 }]; // 420min → offset 180 (viewStart 240)
    const withShot = generateSubstrateProjection(177, shots, phases, 50, 3, 240, 45);
    const withoutShot = generateSubstrateProjection(177, [], phases, 50, 3, 240, 45);

    const atShot = withShot.find((p) => p.offset === 180)!;
    const noShotAtSameOffset = withoutShot.find((p) => p.offset === 180)!;

    expect(atShot.vwc).toBeGreaterThan(noShotAtSameOffset.vwc);
    expect(atShot.pore).toBeLessThan(noShotAtSameOffset.pore);
  });
});

describe('findSaturationCrossing', () => {
  const window = { start: sampleAt(7, 0, 0).atMs, end: sampleAt(22, 0, 0).atMs };

  it('returns the minute-of-day of the first reading at or above the target', () => {
    const crossing = findSaturationCrossing(
      [sampleAt(8, 0, 61), sampleAt(9, 20, 65), sampleAt(10, 0, 68)],
      65,
      window.start,
      window.end
    );

    expect(crossing).toBe(9 * 60 + 20);
  });

  it('returns null when the series never reaches the target', () => {
    const crossing = findSaturationCrossing(
      [sampleAt(8, 0, 55), sampleAt(12, 0, 61)],
      65,
      window.start,
      window.end
    );

    expect(crossing).toBeNull();
  });

  it('ignores readings outside the shot window', () => {
    // A spike during P0 and one after the P3 boundary are not P1→P2 transitions.
    const crossing = findSaturationCrossing(
      [sampleAt(6, 30, 70), sampleAt(23, 0, 70)],
      65,
      window.start,
      window.end
    );

    expect(crossing).toBeNull();
  });

  it("does not confuse yesterday's crossing with today's", () => {
    const crossing = findSaturationCrossing([sampleAt(9, 0, 70, -1)], 65, window.start, window.end);

    expect(crossing).toBeNull();
  });
});

describe('resolveSaturationCrossing', () => {
  const strategy = {
    lightsOnTime: '06:00',
    detectedLightsOnTime: undefined,
    p0DurationMinutes: 60,
    targetVwcPercent: 65,
  };

  it('anchors the shot window on the cycle containing now and finds the crossing', () => {
    const now = sampleAt(12, 0, 0).atMs;
    const crossing = resolveSaturationCrossing(
      strategy,
      18,
      [sampleAt(8, 0, 60), sampleAt(9, 30, 66)],
      now
    );

    expect(crossing).toBe(9 * 60 + 30);
  });

  it('prefers a caller-supplied lights-on over the strategy anchor', () => {
    // The backend reported lights-on at 10:00, so 09:30 falls in P0, not P1.
    const now = sampleAt(14, 0, 0).atMs;
    const crossing = resolveSaturationCrossing(
      strategy,
      18,
      [sampleAt(9, 30, 66), sampleAt(13, 0, 66)],
      now,
      sampleAt(10, 0, 0).atMs
    );

    expect(crossing).toBe(13 * 60);
  });

  it('returns null with no samples at all', () => {
    expect(resolveSaturationCrossing(strategy, 18, [], sampleAt(12, 0, 0).atMs)).toBeNull();
  });
});
