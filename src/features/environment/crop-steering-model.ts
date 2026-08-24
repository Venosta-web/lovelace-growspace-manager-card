import type { IrrigationConfig, IrrigationStrategy } from '../../services/types';
import { token } from '../../styles/variables';

export type CropSteeringShot = { time: string; duration: number };

export type CropSteeringPhase = {
  id: string;
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
  isFlower: boolean
): CropSteeringShot[] {
  if (
    !strategy.lightsOnTime ||
    !strategy.shotIntervalMinutes ||
    strategy.shotIntervalMinutes <= 0 ||
    !strategy.shotDurationSeconds
  ) {
    return [];
  }

  const lightHours = isFlower ? 12 : 18;
  const [hh, mm] = strategy.lightsOnTime.split(':').map(Number);
  const lightsOnMin = hh * 60 + (mm || 0);
  const lightsOffMin = lightsOnMin + lightHours * 60;
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
 * Derives the day's P1/P2/P3 phase windows. P3's start prefers the backend's
 * recorded `phaseChangedAt` (Actual P3 Boundary) over the scheduled boundary,
 * when the growspace is currently in P3 — see [[Phase Windows]].
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
  isFlower: boolean,
  irrigationConfig:
    | Pick<IrrigationConfig, 'activeSteeringPhase' | 'phaseChangedAt'>
    | null
    | undefined
): CropSteeringPhases | null {
  const anchorLightsOnTime = strategy.detectedLightsOnTime ?? strategy.lightsOnTime;
  if (!anchorLightsOnTime) return null;

  const lightHours = isFlower ? 12 : 18;
  const [hh, mm] = anchorLightsOnTime.split(':').map(Number);
  const lightsOnMin = hh * 60 + (mm || 0);
  const lightsOffMin = lightsOnMin + lightHours * 60;
  const p1End = lightsOnMin + (strategy.p0DurationMinutes ?? 60);
  const scheduledP3Start = Math.max(
    p1End,
    lightsOffMin - (strategy.p2StopBeforeLightsOffMinutes ?? 120)
  );

  let p3Start = scheduledP3Start;
  if (irrigationConfig?.activeSteeringPhase === 'p3' && irrigationConfig.phaseChangedAt) {
    const d = new Date(irrigationConfig.phaseChangedAt);
    const actualStart = d.getHours() * 60 + d.getMinutes();
    p3Start = Math.max(p1End, Math.min(actualStart, scheduledP3Start));
  }

  return {
    lightsOnMin,
    lightsOffMin,
    lightHours,
    phases: [
      {
        id: 'p1',
        label: 'P1',
        name: 'Saturation',
        start: lightsOnMin,
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
  const p1End = phases.phases[0]?.end ?? lightsOnMin + 60;
  const p2End = phases.phases[1]?.end ?? lightsOffMin - 120;

  // Compare in view-offset space (viewStart anchored at 0) so the photoperiod
  // boundaries stay correctly ordered even when lights-off wraps past midnight.
  const offsetOf = (m: number) => (m - viewStart + 1440) % 1440;
  const lightsOnOffset = offsetOf(lightsOnMin);
  const lightsOffOffset = offsetOf(lightsOffMin);
  const p1EndOffset = offsetOf(p1End);
  const p2EndOffset = offsetOf(p2End);

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
    } else if (off < p1EndOffset) {
      dry = 0.8 / 60;
    } else if (off < p2EndOffset) {
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
