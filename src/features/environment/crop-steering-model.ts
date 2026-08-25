import type { IrrigationConfig, IrrigationStrategy } from '../../services/types';
import { token } from '../../styles/variables';

export type CropSteeringShot = { time: string; duration: number };

/** The four daily [[Phase Windows]] a Crop Steering day is built from. */
export type CropSteeringPhaseId = 'p0' | 'p1' | 'p2' | 'p3';

/** One measured Substrate VWC reading, timestamped absolutely. */
export type VwcSample = { atMs: number; vwc: number };

export type CropSteeringPhase = {
  id: CropSteeringPhaseId;
  label: string;
  name: string;
  start: number;
  end: number;
  color: string;
  target: string;
};

export type CropSteeringPhases = {
  lightsOnMin: number;
  lightsOffMin: number;
  lightHours: number;
  phases: CropSteeringPhase[];
};

export type SubstrateProjectionPoint = { offset: number; vwc: number; pore: number; bulk: number };

/** Formats a minute-of-day (0-1439) as `HH:MM`, wrapping past midnight. */
export function fmtMinuteOfDay(minutes: number): string {
  const h = Math.floor((minutes / 60) % 24);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Generates the day's irrigation shot cycle (P1 ramp-up through the P2→P3 cutoff). */
export function computeCropSteeringCycle(
  strategy: Pick<
    IrrigationStrategy,
    | 'lightsOnTime'
    | 'shotIntervalMinutes'
    | 'shotDurationSeconds'
    | 'p0DurationMinutes'
    | 'p2StopBeforeLightsOffMinutes'
  >,
  dayHours: number
): CropSteeringShot[] {
  if (
    !strategy.lightsOnTime ||
    !strategy.shotIntervalMinutes ||
    strategy.shotIntervalMinutes <= 0 ||
    !strategy.shotDurationSeconds
  ) {
    return [];
  }

  const [hh, mm] = strategy.lightsOnTime.split(':').map(Number);
  const lightsOnMin = hh * 60 + (mm || 0);
  const lightsOffMin = lightsOnMin + dayHours * 60;
  const firstShotMin = lightsOnMin + (strategy.p0DurationMinutes ?? 0);
  const cutoffMin = lightsOffMin - (strategy.p2StopBeforeLightsOffMinutes ?? 0);

  const shots: CropSteeringShot[] = [];
  for (let t = firstShotMin; t < cutoffMin; t += strategy.shotIntervalMinutes) {
    const h = Math.floor(t / 60) % 24;
    const m = t % 60;
    shots.push({
      time: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`,
      duration: strategy.shotDurationSeconds,
    });
  }
  return shots;
}

/**
 * Minute-of-day at which measured VWC first reached the Saturation Target inside
 * `[windowStartMs, windowEndMs]`, or null when the series never crosses it.
 *
 * This is the [[Phase Windows]] P1→P2 boundary. The backend decides it at runtime
 * — `SteeringPhaseMachine` flips to P2 the tick VWC reaches `target_vwc_percent`
 * — and, unlike the P3 transition, never stamps the moment on `phase_changed_at`.
 * So the card re-derives it from the same measurement the backend watched, and
 * feeds it to `computePhases` as `saturationReachedAt`.
 *
 * Absolute-ms samples and bounds deliberately: minute-of-day alone cannot say
 * which photoperiod cycle a reading belongs to once lights-off wraps midnight.
 */
export function findSaturationCrossing(
  samples: readonly VwcSample[],
  targetVwcPercent: number,
  windowStartMs: number,
  windowEndMs: number
): number | null {
  let earliestMs: number | null = null;
  for (const s of samples) {
    if (s.atMs < windowStartMs || s.atMs > windowEndMs) continue;
    if (Number.isNaN(s.vwc) || s.vwc < targetVwcPercent) continue;
    if (earliestMs === null || s.atMs < earliestMs) earliestMs = s.atMs;
  }
  if (earliestMs === null) return null;
  const d = new Date(earliestMs);
  return d.getHours() * 60 + d.getMinutes();
}

/**
 * The P1→P2 boundary (minute-of-day) for the photoperiod cycle containing `nowMs`,
 * or null when the measured VWC never reached the Saturation Target in it.
 *
 * The one entry point the views use: it resolves the cycle's lights-on, derives the
 * shot window from it, and runs `findSaturationCrossing` over that. Pass `lightsOnMs`
 * when the caller holds the backend's own lights-on for the cycle (the crop-steering
 * history reports one); otherwise it is resolved from the strategy's anchor time.
 */
export function resolveSaturationCrossing(
  strategy: Pick<
    IrrigationStrategy,
    'lightsOnTime' | 'detectedLightsOnTime' | 'p0DurationMinutes' | 'targetVwcPercent'
  >,
  dayHours: number,
  samples: readonly VwcSample[],
  nowMs: number,
  lightsOnMs?: number | null
): number | null {
  if (!samples.length) return null;

  let onMs = lightsOnMs ?? NaN;
  if (Number.isNaN(onMs)) {
    const anchorLightsOnTime = strategy.detectedLightsOnTime ?? strategy.lightsOnTime;
    if (!anchorLightsOnTime) return null;
    const [hh, mm] = anchorLightsOnTime.split(':').map(Number);
    const now = new Date(nowMs);
    const midnightMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    onMs = midnightMs + (hh * 60 + (mm || 0)) * 60000;
    // Before today's lights-on, "now" still belongs to yesterday's cycle.
    if (onMs > nowMs) onMs -= 24 * 60 * 60 * 1000;
  }

  return findSaturationCrossing(
    samples,
    strategy.targetVwcPercent ?? 45,
    onMs + (strategy.p0DurationMinutes ?? 60) * 60000,
    onMs + dayHours * 3600000
  );
}

/**
 * Derives the day's P0/P1/P2/P3 phase windows — see [[Phase Windows]].
 *
 * Two of the three boundaries are clock-driven and derive from the strategy alone:
 * P0 runs `p0DurationMinutes` from lights-on (no shots fire in it; the first shot
 * lands at its end), and P3 starts `p2StopBeforeLightsOffMinutes` before lights-off.
 * P3's start prefers the backend's recorded `phaseChangedAt` (Actual P3 Boundary)
 * over that scheduled one when the growspace is currently in P3.
 *
 * The P1→P2 boundary is threshold-driven, not clock-driven: pass the minute-of-day
 * from `findSaturationCrossing`. Without one, nothing has been observed reaching
 * the Saturation Target, so P1 owns the whole shot window and P2 has not begun
 * (it is returned as a zero-width window at P3's start rather than dropped, so
 * legends and chip rows keep all four phases).
 *
 * Minutes are returned in the cycle's own space anchored on lights-on, so
 * `lightsOffMin` and the later boundaries may exceed 1440 when the photoperiod
 * wraps past midnight. Callers normalise with `% 1440`.
 */
export function computePhases(
  strategy: Pick<
    IrrigationStrategy,
    | 'lightsOnTime'
    | 'detectedLightsOnTime'
    | 'p0DurationMinutes'
    | 'p2StopBeforeLightsOffMinutes'
    | 'maintenanceDrybackPercent'
  >,
  dayHours: number,
  irrigationConfig:
    | Pick<IrrigationConfig, 'activeSteeringPhase' | 'phaseChangedAt'>
    | null
    | undefined,
  saturationReachedAt?: number | null
): CropSteeringPhases | null {
  const anchorLightsOnTime = strategy.detectedLightsOnTime ?? strategy.lightsOnTime;
  if (!anchorLightsOnTime) return null;

  const [hh, mm] = anchorLightsOnTime.split(':').map(Number);
  const lightsOnMin = hh * 60 + (mm || 0);
  const lightsOffMin = lightsOnMin + dayHours * 60;
  const p0End = lightsOnMin + (strategy.p0DurationMinutes ?? 60);
  const scheduledP3Start = Math.max(
    p0End,
    lightsOffMin - (strategy.p2StopBeforeLightsOffMinutes ?? 120)
  );

  let p3Start = scheduledP3Start;
  if (irrigationConfig?.activeSteeringPhase === 'p3' && irrigationConfig.phaseChangedAt) {
    const d = new Date(irrigationConfig.phaseChangedAt);
    const actualStart = d.getHours() * 60 + d.getMinutes();
    p3Start = Math.max(p0End, Math.min(actualStart, scheduledP3Start));
  }

  // Lift the crossing into this cycle's minute space (it arrives as a plain
  // minute-of-day) before clamping it inside the shot window.
  const p1End =
    saturationReachedAt == null
      ? p3Start
      : Math.min(p0End + ((((saturationReachedAt - p0End) % 1440) + 1440) % 1440), p3Start);

  return {
    lightsOnMin,
    lightsOffMin,
    lightHours: dayHours,
    phases: [
      {
        id: 'p0',
        label: 'P0',
        name: 'Activation',
        start: lightsOnMin,
        end: p0End,
        color: token['--phase-p0'],
        target: 'No shots',
      },
      {
        id: 'p1',
        label: 'P1',
        name: 'Saturation',
        start: p0End,
        end: p1End,
        color: token['--phase-p1'],
        target: 'Reach FC',
      },
      {
        id: 'p2',
        label: 'P2',
        name: 'Maintenance',
        start: p1End,
        end: p3Start,
        color: token['--phase-p2'],
        target: 'Runoff target',
      },
      {
        id: 'p3',
        label: 'P3',
        name: 'Dryback',
        start: p3Start,
        end: lightsOffMin,
        color: token['--phase-p3'],
        target: `−${strategy.maintenanceDrybackPercent ?? 3}% VWC`,
      },
    ],
  };
}

/**
 * Synthesizes the dashed "projected" tail of the Substrate Model trace from `nowOffset`
 * to end-of-day, modelling dryback rate per phase and shot-driven VWC/EC recovery.
 */
export function generateSubstrateProjection(
  nowOffset: number,
  shots: CropSteeringShot[],
  phases: Pick<CropSteeringPhases, 'lightsOnMin' | 'lightsOffMin' | 'phases'>,
  seedVwc: number,
  seedPoreEc: number,
  viewStart: number,
  targetVwcPercent: number
): SubstrateProjectionPoint[] {
  const { lightsOnMin, lightsOffMin } = phases;
  const target = targetVwcPercent ?? 45;
  const vwcLo = Math.max(0, target - 18);
  const vwcHi = target + 8;
  const step = 3;
  // The two dryback-rate boundaries, looked up by phase id: substrate dries
  // slowly through P0, faster once the shot window is running, fastest in P3.
  // (By id, not by array position — the windows gained P0 at index 0.)
  const byId = (id: CropSteeringPhaseId) => phases.phases.find((p) => p.id === id);
  const shotWindowStart = byId('p0')?.end ?? lightsOnMin + 60;
  const shotWindowEnd = byId('p3')?.start ?? lightsOffMin - 120;
  // Ramp shots recover more than maintenance shots, so the projection needs the
  // P1→P2 boundary too. With no measured crossing P1 spans the shot window —
  // nothing has reached the Saturation Target, so every projected shot is a ramp shot.
  const p1End = byId('p1')?.end ?? shotWindowEnd;

  // Compare in view-offset space (viewStart anchored at 0) so the photoperiod
  // boundaries stay correctly ordered even when lights-off wraps past midnight.
  const offsetOf = (m: number) => (m - viewStart + 1440) % 1440;
  const lightsOnOffset = offsetOf(lightsOnMin);
  const lightsOffOffset = offsetOf(lightsOffMin);
  const shotWindowStartOffset = offsetOf(shotWindowStart);
  const shotWindowEndOffset = offsetOf(shotWindowEnd);
  const p1EndOffset = offsetOf(p1End);

  const shotMins = shots.map((s) => {
    const [hh, mm] = s.time.split(':').map(Number);
    return hh * 60 + mm;
  });

  const pts: SubstrateProjectionPoint[] = [];
  let vwc = seedVwc;
  let pore = seedPoreEc;

  for (let off = nowOffset; off <= 1440; off += step) {
    let dry: number;
    if (off < lightsOnOffset || off >= lightsOffOffset) {
      dry = 0.3 / 60;
    } else if (off < shotWindowStartOffset) {
      dry = 0.8 / 60;
    } else if (off < shotWindowEndOffset) {
      dry = 2.6 / 60;
    } else {
      dry = 3.0 / 60;
    }

    vwc -= dry * step;
    pore += dry * step * 0.18;

    for (const shotMin of shotMins) {
      const shotOff = (shotMin - viewStart + 1440) % 1440;
      if (shotOff > nowOffset && shotOff >= off && shotOff < off + step) {
        const isP1 = off < p1EndOffset;
        vwc += isP1 ? 2.8 : 1.05;
        pore -= isP1 ? 0.3 : 0.18;
      }
    }

    vwc = Math.max(vwcLo, Math.min(vwcHi, vwc));
    pore = Math.max(1.5, Math.min(5.5, pore));
    const bulk = Math.max(0.8, pore * (vwc / 100) * 1.32);
    pts.push({ offset: off, vwc, pore, bulk });
  }

  return pts;
}
