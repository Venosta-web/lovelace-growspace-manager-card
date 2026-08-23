import { describe, it, expect } from 'vitest';
import {
  fmtMinuteOfDay,
  computeCropSteeringCycle,
  computePhases,
  generateSubstrateProjection,
} from './crop-steering-model';

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
    expect(computeCropSteeringCycle({ ...baseStrategy, lightsOnTime: '' }, false)).toEqual([]);
  });

  it('generates shots from the first-shot time to the P2→P3 cutoff', () => {
    // Veg (18h): lights-on 06:00 + p0 30min = first shot 06:30; lights-off 00:00,
    // cutoff 120min before = 22:00. Hourly shots from 06:30 to (exclusive) 22:00.
    const shots = computeCropSteeringCycle(baseStrategy, false);

    expect(shots[0]).toEqual({ time: '06:30:00', duration: 30 });
    expect(shots[shots.length - 1].time).toBe('21:30:00');
    expect(shots.every((s) => s.duration === 30)).toBe(true);
  });

  it('uses a shorter 12h photoperiod for flowering plants', () => {
    // Flower (12h): lights-off 18:00, cutoff 120min before = 16:00 → last shot 15:30
    const shots = computeCropSteeringCycle(baseStrategy, true);

    expect(shots[shots.length - 1].time).toBe('15:30:00');
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
    expect(computePhases({ ...baseStrategy, lightsOnTime: '' }, false, null)).toBeNull();
  });

  it('derives P1/P2/P3 windows from lights-on time and photoperiod (veg, 18h)', () => {
    const result = computePhases(baseStrategy, false, null);

    // lights-on 06:00 (360min), p0 60min → P1 ends 07:00 (420min)
    // lights-off 00:00 next day (1440min), p2Stop 120min → scheduled P3 at 22:00 (1320min)
    expect(result).not.toBeNull();
    expect(result!.lightsOnMin).toBe(360);
    expect(result!.lightsOffMin).toBe(1440);
    expect(result!.phases.map((p) => p.id)).toEqual(['p1', 'p2', 'p3']);
    expect(result!.phases[0]).toMatchObject({ start: 360, end: 420 });
    expect(result!.phases[1]).toMatchObject({ start: 420, end: 1320 });
    expect(result!.phases[2]).toMatchObject({ start: 1320, end: 1440 });
  });

  it('prefers detectedLightsOnTime over the configured lightsOnTime as the anchor', () => {
    const result = computePhases(
      { ...baseStrategy, lightsOnTime: '06:00', detectedLightsOnTime: '06:30' },
      false,
      null
    );

    expect(result!.lightsOnMin).toBe(390);
  });

  it('clamps the P3 start to the recorded phaseChangedAt when currently in P3 (Actual P3 Boundary)', () => {
    // Scheduled P3 at 22:00 (1320min). Backend recorded an earlier auto-advance at 21:00.
    const phaseChangedAt = new Date();
    phaseChangedAt.setHours(21, 0, 0, 0);

    const result = computePhases(baseStrategy, false, {
      activeSteeringPhase: 'p3',
      phaseChangedAt: phaseChangedAt.toISOString(),
    });

    expect(result!.phases[1].end).toBe(21 * 60); // P2 ends where the actual P3 boundary starts
    expect(result!.phases[2].start).toBe(21 * 60);
  });

  it('ignores phaseChangedAt when the growspace is not currently in P3', () => {
    const phaseChangedAt = new Date();
    phaseChangedAt.setHours(21, 0, 0, 0);

    const result = computePhases(baseStrategy, false, {
      activeSteeringPhase: 'p2',
      phaseChangedAt: phaseChangedAt.toISOString(),
    });

    expect(result!.phases[2].start).toBe(1320); // falls back to the scheduled boundary
  });
});

describe('generateSubstrateProjection', () => {
  const phases = {
    lightsOnMin: 360,
    lightsOffMin: 1440,
    phases: [
      {
        id: 'p1',
        label: 'P1',
        name: 'Saturation',
        start: 360,
        end: 420,
        color: '#4CAF50',
        target: '',
      },
      {
        id: 'p2',
        label: 'P2',
        name: 'Maintenance',
        start: 420,
        end: 1320,
        color: '#2196F3',
        target: '',
      },
      {
        id: 'p3',
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
