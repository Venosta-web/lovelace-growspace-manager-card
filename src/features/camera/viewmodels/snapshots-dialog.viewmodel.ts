/**
 * Snapshots Dialog ViewModel (ADR-0019)
 *
 * The pure derivation behind the redesigned Camera Snapshots dialog: a hero
 * viewer, a day-grouped capture rail, and a severity timeline, all built from
 * two backend lists that share no key by design.
 *
 * Three joins happen here and nowhere else:
 *
 *  - **frame → camera.** `get_snapshots` returns no camera field; the capture
 *    writers encode it in the filename as `<ts>_<entity_with_dots_as_underscores>`
 *    (`websocket/vision.py`, `vision_checkup_scheduler.py`). The entity id is
 *    recovered from the slug and resolved to a friendly name by the injected dep.
 *  - **frame → finding.** A vision result's `timestamp` is UTC while a snapshot
 *    filename's is local, so the two are not comparable. The reliable key is
 *    `snapshot_paths`, which holds the very `/local/...` paths the rail renders.
 *  - **frame → light state.** Not stored anywhere. Derived from the growspace's
 *    own photoperiod (`lightsOnTime` + `resolvedDayHours`), which is the same
 *    source the crop-steering phase chips read.
 *
 * Frame ORDER lives here too, because the dark filter changes it. The state
 * machine takes already-resolved paths so the two can never disagree.
 */

import type { Snapshot, VisionCheckupResult } from '../../../slices/camera';
import type { SM } from '../../../dialogs/snapshots-dialog-sm';

// ─── Public shapes ────────────────────────────────────────────────────────────

/** The vision severity ramp, minus `none`, which renders as "no finding". */
export type FindingTone = 'critical' | 'high' | 'medium' | 'low';

export interface FrameViewModel {
  path: string;
  /** Local clock time, `HH:MM`. */
  time: string;
  /** Full stamp, `YYYY-MM-DD HH:MM`. */
  label: string;
  /** Friendly camera name, or the raw slug when the entity is unknown. */
  cam: string;
  /** True when the growspace photoperiod puts this capture in the dark period. */
  dark: boolean;
  tone: FindingTone | null;
  selected: boolean;
}

export interface TimelineTickViewModel {
  path: string;
  title: string;
  tone: FindingTone | null;
  selected: boolean;
}

export interface RailDayViewModel {
  key: string;
  weekday: string;
  date: string;
  /** e.g. `8 frames`. */
  count: string;
  items: FrameViewModel[];
}

export interface TimelineDayViewModel {
  key: string;
  /** e.g. `Tue 25`. */
  short: string;
  ticks: TimelineTickViewModel[];
}

export interface FindingViewModel {
  tone: FindingTone;
  badge: string;
  summary: string;
  analysis: string;
  issues: string[];
  recs: string[];
}

export interface HeroViewModel extends FrameViewModel {
  /** Previous/next capture in time, honouring the dark filter. */
  prevPath: string | null;
  nextPath: string | null;
  /** Nearest capture at the same clock time on the adjacent day, same camera. */
  prevDayPath: string | null;
  nextDayPath: string | null;
  finding: FindingViewModel | null;
}

export interface CompareViewModel {
  a: FrameViewModel;
  b: FrameViewModel;
  /** Wipe position from the left, 0–100. */
  pct: number;
  label: string;
}

export interface PickerItemViewModel {
  path: string;
  short: string;
  label: string;
  isA: boolean;
}

export interface PickerViewModel {
  aLabel: string;
  items: PickerItemViewModel[];
}

export interface LegendEntry {
  tone: FindingTone;
  label: string;
}

/** Complete render input for `<snapshots-dialog>`. */
export interface SnapshotsDialogViewModel {
  subtitle: string;
  hasFrames: boolean;
  hasVisibleFrames: boolean;
  hasDarkFrames: boolean;
  hideDark: boolean;
  darkToggleLabel: string;
  days: RailDayViewModel[];
  timeline: TimelineDayViewModel[];
  legend: LegendEntry[];
  hero: HeroViewModel | null;
  compare: CompareViewModel | null;
  picker: PickerViewModel | null;
  lightboxSrc: string | null;
  panelOpen: boolean;
  playing: boolean;
}

/** Hass/store adapters the dialog injects so the ViewModel stays hass-free. */
export interface SnapshotsViewModelDeps {
  /** `camera.grow_cam` → `Grow Cam`. */
  cameraName: (entityId: string) => string;
  /**
   * The growspace photoperiod, or null when it is unknown — in which case no
   * frame is marked dark and the filter is hidden rather than guessed.
   */
  lightSchedule: { lightsOnMinutes: number; dayHours: number } | null;
}

// ─── Timestamp / filename parsing ─────────────────────────────────────────────

const TIMESTAMP_RE = /^(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})$/;
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export interface ParsedTimestamp {
  /** `YYYY-MM-DD`, the rail's grouping key. */
  dateKey: string;
  minutesOfDay: number;
  /** Local-clock epoch millis, used only for ordering. */
  ms: number;
}

/**
 * Parse the backend's `YYYYMMDD_HHmmss` stamp. Returns null for anything else so
 * a malformed filename drops out of the timeline instead of poisoning the order.
 */
export function parseSnapshotTimestamp(timestamp: string): ParsedTimestamp | null {
  const m = TIMESTAMP_RE.exec(timestamp);
  if (!m) return null;
  const [, y, mo, d, hh, mm, ss] = m.map(Number) as unknown as number[];
  const date = new Date(y, mo - 1, d, hh, mm, ss);
  if (Number.isNaN(date.getTime())) return null;
  return {
    dateKey: `${m[1]}-${m[2]}-${m[3]}`,
    minutesOfDay: hh * 60 + mm,
    ms: date.getTime(),
  };
}

/**
 * Recover the camera entity id a snapshot filename encodes.
 *
 * `20260825_143500_camera_grow_cam.jpg` → `camera.grow_cam`. The optional
 * `_processed` suffix belongs to the vision scheduler's annotated copy.
 */
export function cameraEntityFromFilename(filename: string): string | null {
  const slug = filename
    .slice(16)
    .replace(/\.jpe?g$/i, '')
    .replace(/_processed$/, '');
  if (!slug || !slug.includes('_')) return null;
  return slug.replace('_', '.');
}

/** `YYYYMMDD_HHmmss` → `YYYY-MM-DD HH:MM`, passing anything unparseable through. */
export function formatTimestamp(timestamp: string): string {
  const m = TIMESTAMP_RE.exec(timestamp);
  if (!m) return timestamp;
  return `${m[1]}-${m[2]}-${m[3]} ${m[4]}:${m[5]}`;
}

// ─── Severity ─────────────────────────────────────────────────────────────────

const TONE_BY_SEVERITY: Record<VisionCheckupResult['severity'], FindingTone | null> = {
  none: null,
  low: 'low',
  medium: 'medium',
  high: 'high',
  critical: 'critical',
};

export const SEVERITY_LEGEND: LegendEntry[] = [
  { tone: 'critical', label: 'Critical' },
  { tone: 'high', label: 'High' },
  { tone: 'medium', label: 'Medium' },
  { tone: 'low', label: 'Low' },
];

/** First sentence of the analysis — the findings strip shows it collapsed. */
function firstSentence(text: string): string {
  const trimmed = text.trim();
  const match = /^.*?[.!?](?=\s|$)/.exec(trimmed);
  return (match?.[0] ?? trimmed).trim();
}

function humanizeIssueLabel(label: string): string {
  const words = label.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  return words ? words[0].toLocaleUpperCase() + words.slice(1) : label;
}

function toFindingViewModel(result: VisionCheckupResult): FindingViewModel | null {
  const tone = TONE_BY_SEVERITY[result.severity];
  if (!tone) return null;
  const summary =
    firstSentence(result.analysis) ||
    result.issues_detected.join(', ') ||
    `${result.check_type} check`;
  return {
    tone,
    badge: tone.toUpperCase(),
    summary,
    analysis: result.analysis,
    issues: result.issues_detected.map(humanizeIssueLabel),
    recs: result.recommendations,
  };
}

// ─── Internal frame record ────────────────────────────────────────────────────

interface Frame {
  path: string;
  time: string;
  label: string;
  cam: string;
  dark: boolean;
  camKey: string;
  parsed: ParsedTimestamp;
  finding: FindingViewModel | null;
}

function isDark(minutesOfDay: number, schedule: SnapshotsViewModelDeps['lightSchedule']): boolean {
  if (!schedule) return false;
  const onMinutes = schedule.dayHours * 60;
  if (onMinutes <= 0) return true;
  if (onMinutes >= 1440) return false;
  const offset = (((minutesOfDay - schedule.lightsOnMinutes) % 1440) + 1440) % 1440;
  return offset >= onMinutes;
}

function buildFrames(
  snapshots: Snapshot[],
  visionHistory: VisionCheckupResult[],
  deps: SnapshotsViewModelDeps
): Frame[] {
  // Newest result wins a contested path: `get_vision_history` is newest-first,
  // so the last write in this loop must not overwrite an earlier, fresher one.
  const findingByPath = new Map<string, FindingViewModel | null>();
  for (const result of visionHistory) {
    const finding = toFindingViewModel(result);
    for (const path of result.snapshot_paths) {
      if (!findingByPath.has(path)) findingByPath.set(path, finding);
    }
  }

  const frames: Frame[] = [];
  for (const snapshot of snapshots) {
    const parsed = parseSnapshotTimestamp(snapshot.timestamp);
    if (!parsed) continue;
    const entityId = cameraEntityFromFilename(snapshot.filename);
    const camKey = entityId ?? 'unknown';
    frames.push({
      path: snapshot.path,
      time: formatTimestamp(snapshot.timestamp).slice(11),
      label: formatTimestamp(snapshot.timestamp),
      cam: entityId ? deps.cameraName(entityId) : 'Unknown camera',
      dark: isDark(parsed.minutesOfDay, deps.lightSchedule),
      camKey,
      parsed,
      finding: findingByPath.get(snapshot.path) ?? null,
    });
  }

  // Ascending: every index walk below (prev/next, ±1 day) reads as time moving forward.
  frames.sort((a, b) => a.parsed.ms - b.parsed.ms || a.path.localeCompare(b.path));
  return frames;
}

// ─── Grouping ─────────────────────────────────────────────────────────────────

function groupByDay(frames: Frame[]): { key: string; frames: Frame[] }[] {
  const days: { key: string; frames: Frame[] }[] = [];
  for (const frame of frames) {
    const last = days[days.length - 1];
    if (last && last.key === frame.parsed.dateKey) last.frames.push(frame);
    else days.push({ key: frame.parsed.dateKey, frames: [frame] });
  }
  return days;
}

function weekdayOf(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  return WEEKDAYS[new Date(y, m - 1, d).getDay()];
}

// ─── Navigation ───────────────────────────────────────────────────────────────

/**
 * The nearest capture to `heroMinutes` on `dayFrames`, preferring the hero's own
 * camera so "+1 day" on a two-camera growspace does not swap the viewpoint.
 */
function nearestInDay(dayFrames: Frame[], heroMinutes: number, camKey: string): Frame | null {
  const sameCam = dayFrames.filter((f) => f.camKey === camKey);
  const pool = sameCam.length > 0 ? sameCam : dayFrames;
  let best: Frame | null = null;
  let bestDelta = Infinity;
  for (const frame of pool) {
    const delta = Math.abs(frame.parsed.minutesOfDay - heroMinutes);
    if (delta < bestDelta) {
      best = frame;
      bestDelta = delta;
    }
  }
  return best;
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export interface SnapshotsViewModelInput {
  snapshots: Snapshot[];
  visionHistory: VisionCheckupResult[];
  growspaceName: string;
  sm: SM;
}

/**
 * Pure factory: backend lists + SM + injected hass adapters → one ViewModel.
 * Testable with no DOM and no host.
 */
export function createSnapshotsDialogViewModel(
  input: SnapshotsViewModelInput,
  deps: SnapshotsViewModelDeps
): SnapshotsDialogViewModel {
  const { sm } = input;
  const all = buildFrames(input.snapshots, input.visionHistory, deps);
  const hasDarkFrames = all.some((f) => f.dark);
  const visible = sm.hideDark ? all.filter((f) => !f.dark) : all;

  const selectedPath =
    sm.selectedPath && visible.some((f) => f.path === sm.selectedPath)
      ? sm.selectedPath
      : (visible[visible.length - 1]?.path ?? null);

  const toFrameVM = (frame: Frame): FrameViewModel => ({
    path: frame.path,
    time: frame.time,
    label: frame.label,
    cam: frame.cam,
    dark: frame.dark,
    tone: frame.finding?.tone ?? null,
    selected: frame.path === selectedPath,
  });

  const dayGroups = groupByDay(visible);

  const days: RailDayViewModel[] = dayGroups
    .map((group) => ({
      key: group.key,
      weekday: weekdayOf(group.key),
      date: group.key,
      count: `${group.frames.length} ${group.frames.length === 1 ? 'frame' : 'frames'}`,
      // Rail reads newest-first inside each day, the way a capture log does.
      items: [...group.frames].reverse().map(toFrameVM),
    }))
    .reverse();

  const timeline: TimelineDayViewModel[] = dayGroups.map((group) => ({
    key: group.key,
    short: `${weekdayOf(group.key)} ${group.key.slice(8)}`,
    ticks: group.frames.map((frame) => ({
      path: frame.path,
      title: frame.finding
        ? `${frame.label} · ${frame.cam} · ${frame.finding.badge}`
        : `${frame.label} · ${frame.cam}`,
      tone: frame.finding?.tone ?? null,
      selected: frame.path === selectedPath,
    })),
  }));

  const heroIndex = visible.findIndex((f) => f.path === selectedPath);
  const heroFrame = heroIndex >= 0 ? visible[heroIndex] : null;

  let hero: HeroViewModel | null = null;
  if (heroFrame) {
    const dayIndex = dayGroups.findIndex((g) => g.key === heroFrame.parsed.dateKey);
    const prevDay = dayGroups[dayIndex - 1];
    const nextDay = dayGroups[dayIndex + 1];
    const { minutesOfDay } = heroFrame.parsed;
    hero = {
      ...toFrameVM(heroFrame),
      prevPath: visible[heroIndex - 1]?.path ?? null,
      nextPath: visible[heroIndex + 1]?.path ?? null,
      prevDayPath: prevDay
        ? (nearestInDay(prevDay.frames, minutesOfDay, heroFrame.camKey)?.path ?? null)
        : null,
      nextDayPath: nextDay
        ? (nearestInDay(nextDay.frames, minutesOfDay, heroFrame.camKey)?.path ?? null)
        : null,
      finding: heroFrame.finding,
    };
  }

  const byPath = new Map(visible.map((f) => [f.path, f]));

  let compare: CompareViewModel | null = null;
  if (sm.compare.kind === 'on') {
    const a = byPath.get(sm.compare.aPath);
    const b = byPath.get(sm.compare.bPath);
    if (a && b) {
      compare = {
        a: toFrameVM(a),
        b: toFrameVM(b),
        pct: sm.compare.pct,
        label: `${a.label} → ${b.label}`,
      };
    }
  }

  let picker: PickerViewModel | null = null;
  if (sm.compare.kind === 'picking') {
    const a = byPath.get(sm.compare.aPath);
    if (a) {
      picker = {
        aLabel: a.label,
        items: [...visible].reverse().map((frame) => ({
          path: frame.path,
          short: frame.label,
          label: `${frame.label} · ${frame.cam}`,
          isA: frame.path === a.path,
        })),
      };
    }
  }

  const dayWord = dayGroups.length === 1 ? 'day' : 'days';
  const frameWord = visible.length === 1 ? 'frame' : 'frames';
  const summary =
    visible.length > 0
      ? `${visible.length} ${frameWord} · last ${dayGroups.length} ${dayWord}`
      : 'No captures yet';

  return {
    subtitle: input.growspaceName ? `${input.growspaceName} · ${summary}` : summary,
    hasFrames: all.length > 0,
    hasVisibleFrames: visible.length > 0,
    hasDarkFrames,
    hideDark: sm.hideDark,
    darkToggleLabel: sm.hideDark ? 'Show dark' : 'Hide dark',
    days,
    timeline,
    legend: SEVERITY_LEGEND,
    hero,
    compare,
    picker,
    lightboxSrc: sm.lightboxOpen ? (hero?.path ?? null) : null,
    panelOpen: sm.panelOpen,
    playing: sm.playing,
  };
}
