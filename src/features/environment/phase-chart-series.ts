/**
 * Phase Chart Series — the pure derivation behind the [[Steering Phase Chip]]'s
 * VWC chart, in value space (ADR-0030's shape, applied to the second chart that
 * never made the move).
 *
 * Turns the Substrate VWC history plus the strategy's reference levels into
 * timestamps and domain units: the trace, the value range its axis spans, the
 * scrub lookup, and the [[Phase Windows]] laid out over the chart's own time
 * window. **No pixels and no SVG paths** — `growspace-header-hero-ui` owns the
 * chart's width and height and turns this into SVG at render time.
 *
 * The trace is `VwcSample[]` rather than a shape of its own so the same points
 * feed `resolveSaturationCrossing`, which is what decides the P1→P2 boundary the
 * phase bar then draws. One parse of the history, one series, no chance of the
 * bar disagreeing with the line above it.
 */

import type { RawHistoryDataPoint } from '../../adapters/hass-types';
import type { CropSteeringPhases, VwcSample } from './crop-steering-model';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** The wall-clock window the chart spans, taken from the history itself. */
export interface PhaseChartWindow {
  startMs: number;
  /** Always ≥ 1, so a single-instant window cannot divide by zero downstream. */
  spanMs: number;
}

/** The value-space render input of the Steering Phase Chip's VWC chart. */
export interface PhaseChartSeries {
  /** The trace, oldest first. Doubles as the sample set for phase resolution. */
  points: VwcSample[];
  window: PhaseChartWindow;
  /** Lower bound of the VWC axis, padded to keep the P2 trigger line on-chart. */
  min: number;
  /** Upper bound of the VWC axis, padded to keep the target line on-chart. */
  max: number;
  targetVwc: number;
  triggerVwc: number;
  /** The most recent reading — what the header reads out when nothing is hovered. */
  currentVwc: number;
}

/** One reading looked up by scrub position, in domain units and clock terms. */
export interface PhaseChartSample {
  atMs: number;
  /** Minute-of-day (0–1439) of `atMs`, which is the space [[Phase Windows]] use. */
  minuteOfDay: number;
  vwc: number;
}

/** One block of the phase bar, positioned in time rather than in pixels. */
export interface PhaseChartSegment {
  key: string;
  startMs: number;
  endMs: number;
  color: string;
  /** Null when the block carries no caption — the dark bookends, and every
   *  repeated day but the last one in a multi-day window. */
  label: string | null;
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;
const MINUTES_PER_DAY = 1440;

/** How far past the reference levels the axis is held open, in VWC percent. */
const AXIS_PADDING_PERCENT = 5;

/** The lights-off bookends. Not a phase, so it takes no colour from the model. */
const DARK_FILL = 'rgba(255,255,255,0.07)';

function minuteOfDay(atMs: number): number {
  const d = new Date(atMs);
  return d.getHours() * 60 + d.getMinutes();
}

/** Midnight local to `atMs` — the day reference a minute-of-day is lifted onto. */
function midnightOf(atMs: number): number {
  const d = new Date(atMs);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Derives the chart's series from raw Substrate VWC history.
 *
 * Returns null when fewer than two readings survive parsing: one point is a dot,
 * not a trace, and the chart has nothing to scale an axis against.
 */
export function computePhaseChartSeries(
  history: RawHistoryDataPoint[] | undefined,
  targetVwc: number,
  triggerVwc: number
): PhaseChartSeries | null {
  if (!history || history.length < 2) return null;

  const points: VwcSample[] = history
    .map((d) => ({ atMs: new Date(d.last_changed).getTime(), vwc: parseFloat(d.state) }))
    .filter((p) => !Number.isNaN(p.atMs) && !Number.isNaN(p.vwc))
    .sort((a, b) => a.atMs - b.atMs);
  if (points.length < 2) return null;

  let minVwc = Infinity;
  let maxVwc = -Infinity;
  for (const p of points) {
    if (p.vwc < minVwc) minVwc = p.vwc;
    if (p.vwc > maxVwc) maxVwc = p.vwc;
  }

  const startMs = points[0].atMs;
  const endMs = points[points.length - 1].atMs;

  return {
    points,
    window: { startMs, spanMs: endMs - startMs || 1 },
    // Both reference lines stay inside the axis even when the measurement never
    // approaches them, so the chart keeps saying what the strategy is aiming at.
    min: Math.min(minVwc, triggerVwc - AXIS_PADDING_PERCENT),
    max: Math.max(maxVwc, targetVwc + AXIS_PADDING_PERCENT),
    targetVwc,
    triggerVwc,
    currentVwc: points[points.length - 1].vwc,
  };
}

/**
 * The reading at a scrub position — `0` at the window's left edge, `1` at its
 * right — linearly interpolated between the two points that bracket it.
 *
 * Position rather than a timestamp because that is what a pointer gives the
 * chart; it is a fraction of the window, not a pixel offset, so the lookup is
 * independent of how wide the element happens to be rendered.
 */
export function samplePhaseChartAt(series: PhaseChartSeries, position: number): PhaseChartSample {
  const clamped = Math.max(0, Math.min(1, position));
  const atMs = series.window.startMs + clamped * series.window.spanMs;
  const points = series.points;

  // The series is sorted during derivation, so scrubbing can find the first
  // point at or after the pointer in logarithmic time even at minute-resolution 7d.
  let low = 1;
  let high = points.length - 1;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (points[middle].atMs < atMs) low = middle + 1;
    else high = middle;
  }

  const before = points[low - 1];
  const after = points[low];
  const span = after.atMs - before.atMs;
  const fraction = span > 0 ? (atMs - before.atMs) / span : 0;
  const vwc = before.vwc + fraction * (after.vwc - before.vwc);

  return { atMs, minuteOfDay: minuteOfDay(atMs), vwc };
}

/**
 * Lays the day's [[Phase Windows]] over the chart's own time window.
 *
 * Phase boundaries are minutes-of-day, so each has to be lifted onto a calendar
 * day before it can sit next to the trace. Which day depends on how much of one
 * the window covers, hence the two branches:
 *
 * - A **multi-day** window (`7d`) enumerates every calendar day it touches and
 *   repeats the blocks on each, captioning only the last so the bar stays
 *   readable at that density.
 * - A **single-day** window picks, per block, whichever of today or yesterday
 *   puts its *start* nearer the middle of the window. The whole block follows
 *   that one reference: choosing per boundary would let a block whose end minute
 *   has already passed midnight resolve to a different day than its start and
 *   come out inverted.
 *
 * Only P0–P2 are drawn, and that is the pre-existing shape of this bar, not a
 * choice made here — P3's window shows as bare track between the last block and
 * the lights-off bookend.
 */
export function computePhaseWindowSegments(
  series: PhaseChartSeries,
  phases: CropSteeringPhases,
  timeRange: string
): PhaseChartSegment[] {
  const { lightsOnMin, lightsOffMin, phases: ph } = phases;
  const { startMs, spanMs } = series.window;
  const endMs = startMs + spanMs;

  const blocks = (
    dayRefFor: (startMin: number) => number,
    keySuffix: string,
    labelled: boolean
  ): PhaseChartSegment[] => {
    const seg = (
      key: string,
      startMin: number,
      endMin: number,
      color: string,
      label: string | null
    ): PhaseChartSegment => {
      const ref = dayRefFor(startMin);
      return {
        key: keySuffix ? `${key}-${keySuffix}` : key,
        startMs: ref + startMin * MINUTE_MS,
        endMs: ref + endMin * MINUTE_MS,
        color,
        label: labelled ? label : null,
      };
    };

    return [
      seg('dark-pre', 0, lightsOnMin, DARK_FILL, null),
      seg(ph[0].id, ph[0].start, ph[0].end, ph[0].color, ph[0].label),
      seg(ph[1].id, ph[1].start, ph[1].end, ph[1].color, ph[1].label),
      seg(ph[2].id, ph[2].start, ph[2].end, ph[2].color, ph[2].label),
      seg('dark-post', lightsOffMin, MINUTES_PER_DAY, DARK_FILL, null),
    ];
  };

  if (timeRange === '7d') {
    const segments: PhaseChartSegment[] = [];
    let dayRef = midnightOf(startMs);
    let dayIndex = 0;
    while (dayRef <= endMs) {
      const isLastDay = dayRef + DAY_MS > endMs;
      segments.push(...blocks(() => dayRef, String(dayIndex), isLastDay));
      dayRef += DAY_MS;
      dayIndex++;
    }
    return segments;
  }

  const todayMidnight = midnightOf(endMs);
  const middleMs = startMs + spanMs / 2;
  const dayRefFor = (startMin: number): number => {
    const today = todayMidnight + startMin * MINUTE_MS;
    const yesterday = today - DAY_MS;
    return Math.abs(today - middleMs) <= Math.abs(yesterday - middleMs)
      ? todayMidnight
      : todayMidnight - DAY_MS;
  };

  return blocks(dayRefFor, '', true);
}
