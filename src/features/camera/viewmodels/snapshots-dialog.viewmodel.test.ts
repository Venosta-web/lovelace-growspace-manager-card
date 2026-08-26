import { describe, it, expect } from 'vitest';
import type { Snapshot, VisionCheckupResult } from '../../../slices/camera';
import { createInitialSM, transition, type SM } from '../../../dialogs/snapshots-dialog-sm';
import {
  cameraEntityFromFilename,
  createSnapshotsDialogViewModel,
  formatTimestamp,
  parseSnapshotTimestamp,
  type SnapshotsViewModelDeps,
} from './snapshots-dialog.viewmodel';

// 2026-08-24 is a Monday, 2026-08-25 a Tuesday.
const CAM = 'camera_grow_cam';
const CAM2 = 'camera_side_cam';

const snap = (timestamp: string, cam = CAM): Snapshot => ({
  path: `/local/growspace_manager/snapshots/gs1/${timestamp}_${cam}.jpg`,
  filename: `${timestamp}_${cam}.jpg`,
  timestamp,
});

const result = (over: Partial<VisionCheckupResult> = {}): VisionCheckupResult => ({
  timestamp: '20260825_120000',
  check_type: 'mid',
  analysis: 'Lower leaves are yellowing. Likely a nitrogen shortfall.',
  issues_detected: ['nitrogen_deficiency'],
  severity: 'medium',
  recommendations: ['Raise nitrogen by 10%', 'Recheck in 48h'],
  snapshot_paths: [],
  ...over,
});

/** Lights on 06:00 for 12 h, so 06:00–17:59 is day and everything else dark. */
const DEPS: SnapshotsViewModelDeps = {
  cameraName: (entityId) => (entityId === 'camera.grow_cam' ? 'Grow Cam' : 'Side Cam'),
  lightSchedule: { lightsOnMinutes: 360, dayHours: 12 },
};

const build = (
  snapshots: Snapshot[],
  visionHistory: VisionCheckupResult[] = [],
  sm: SM = createInitialSM(),
  deps: SnapshotsViewModelDeps = DEPS
) =>
  createSnapshotsDialogViewModel({ snapshots, visionHistory, growspaceName: 'Tent A', sm }, deps);

// ---------------------------------------------------------------------------
// Parsing helpers
// ---------------------------------------------------------------------------

describe('parseSnapshotTimestamp', () => {
  it('splits the backend YYYYMMDD_HHmmss stamp', () => {
    expect(parseSnapshotTimestamp('20260825_143500')).toMatchObject({
      dateKey: '2026-08-25',
      minutesOfDay: 14 * 60 + 35,
    });
  });

  it('returns null for anything else, so it drops out of the timeline', () => {
    expect(parseSnapshotTimestamp('short')).toBeNull();
    expect(parseSnapshotTimestamp('2026-08-25 14:35')).toBeNull();
  });
});

describe('cameraEntityFromFilename', () => {
  it('recovers the entity id the capture writer encoded', () => {
    expect(cameraEntityFromFilename('20260825_143500_camera_grow_cam.jpg')).toBe('camera.grow_cam');
  });

  it('ignores the vision scheduler _processed suffix', () => {
    expect(cameraEntityFromFilename('20260825_143500_camera_grow_cam_processed.jpg')).toBe(
      'camera.grow_cam'
    );
  });

  it('returns null when the filename carries no camera slug', () => {
    expect(cameraEntityFromFilename('20260825_143500.jpg')).toBeNull();
  });
});

describe('formatTimestamp', () => {
  it('formats to minute precision', () => {
    expect(formatTimestamp('20260825_143500')).toBe('2026-08-25 14:35');
  });

  it('passes an unparseable stamp through untouched', () => {
    expect(formatTimestamp('whatever')).toBe('whatever');
  });
});

// ---------------------------------------------------------------------------
// Frames, ordering and grouping
// ---------------------------------------------------------------------------

describe('snapshots ViewModel — frames', () => {
  it('groups the rail by day, newest day first', () => {
    const vm = build([snap('20260824_100000'), snap('20260825_100000')]);
    expect(vm.days.map((d) => d.date)).toEqual(['2026-08-25', '2026-08-24']);
    expect(vm.days[0].weekday).toBe('Tue');
    expect(vm.days[1].weekday).toBe('Mon');
  });

  it('orders each rail day newest-first, the way a capture log reads', () => {
    const vm = build([snap('20260825_080000'), snap('20260825_100000')]);
    expect(vm.days[0].items.map((i) => i.time)).toEqual(['10:00', '08:00']);
  });

  it('runs the timeline oldest-first, the way a time axis reads', () => {
    const vm = build([snap('20260825_100000'), snap('20260824_100000')]);
    expect(vm.timeline.map((d) => d.key)).toEqual(['2026-08-24', '2026-08-25']);
    expect(vm.timeline[0].short).toBe('Mon 24');
  });

  it('pluralises the day frame count', () => {
    const single = build([snap('20260825_100000')]);
    expect(single.days[0].count).toBe('1 frame');
    const many = build([snap('20260825_100000'), snap('20260825_110000')]);
    expect(many.days[0].count).toBe('2 frames');
  });

  it('drops a snapshot whose timestamp does not parse', () => {
    const vm = build([snap('20260825_100000'), { ...snap('20260825_110000'), timestamp: 'x' }]);
    expect(vm.days[0].items).toHaveLength(1);
  });

  it('summarises the growspace, frame count and span in the subtitle', () => {
    const vm = build([snap('20260824_100000'), snap('20260825_100000')]);
    expect(vm.subtitle).toBe('Tent A · 2 frames · last 2 days');
  });

  it('resolves the camera friendly name from the filename slug', () => {
    const vm = build([snap('20260825_100000', CAM2)]);
    expect(vm.days[0].items[0].cam).toBe('Side Cam');
  });
});

// ---------------------------------------------------------------------------
// Light schedule
// ---------------------------------------------------------------------------

describe('snapshots ViewModel — dark frames', () => {
  it('marks a capture taken outside the photoperiod as dark', () => {
    const vm = build([snap('20260825_100000'), snap('20260825_220000')]);
    const byTime = Object.fromEntries(vm.days[0].items.map((i) => [i.time, i.dark]));
    expect(byTime['10:00']).toBe(false);
    expect(byTime['22:00']).toBe(true);
  });

  it('handles a photoperiod that wraps past midnight', () => {
    const vm = build([snap('20260825_020000'), snap('20260825_120000')], [], createInitialSM(), {
      ...DEPS,
      lightSchedule: { lightsOnMinutes: 20 * 60, dayHours: 12 },
    });
    const byTime = Object.fromEntries(vm.days[0].items.map((i) => [i.time, i.dark]));
    expect(byTime['02:00']).toBe(false);
    expect(byTime['12:00']).toBe(true);
  });

  it('marks nothing dark and hides the filter when the schedule is unknown', () => {
    const vm = build([snap('20260825_220000')], [], createInitialSM(), {
      ...DEPS,
      lightSchedule: null,
    });
    expect(vm.days[0].items[0].dark).toBe(false);
    expect(vm.hasDarkFrames).toBe(false);
  });

  it('filters dark frames out of the rail and the navigation when asked', () => {
    const sm = transition(createInitialSM(), { type: 'DarkFilterToggled' });
    const vm = build([snap('20260825_100000'), snap('20260825_220000')], [], sm);
    expect(vm.days[0].items.map((i) => i.time)).toEqual(['10:00']);
    expect(vm.hero?.nextPath).toBeNull();
    expect(vm.darkToggleLabel).toBe('Show dark');
  });
});

// ---------------------------------------------------------------------------
// Findings
// ---------------------------------------------------------------------------

describe('snapshots ViewModel — findings', () => {
  it('attaches a checkup to the frames it names in snapshot_paths', () => {
    const a = snap('20260825_100000');
    const b = snap('20260825_110000');
    const vm = build([a, b], [result({ snapshot_paths: [b.path] })]);
    const byTime = Object.fromEntries(vm.days[0].items.map((i) => [i.time, i.tone]));
    expect(byTime['11:00']).toBe('medium');
    expect(byTime['10:00']).toBeNull();
  });

  it('leaves a "none" severity unmarked', () => {
    const a = snap('20260825_100000');
    const vm = build([a], [result({ severity: 'none', snapshot_paths: [a.path] })]);
    expect(vm.days[0].items[0].tone).toBeNull();
    expect(vm.hero?.finding).toBeNull();
  });

  it('lets the newest checkup win a frame both name', () => {
    const a = snap('20260825_100000');
    const vm = build(
      [a],
      [
        result({ severity: 'critical', snapshot_paths: [a.path] }),
        result({ severity: 'low', snapshot_paths: [a.path] }),
      ]
    );
    expect(vm.hero?.finding?.tone).toBe('critical');
  });

  it('collapses the analysis to its first sentence for the strip summary', () => {
    const a = snap('20260825_100000');
    const vm = build([a], [result({ snapshot_paths: [a.path] })]);
    expect(vm.hero?.finding?.summary).toBe('Lower leaves are yellowing.');
    expect(vm.hero?.finding?.badge).toBe('MEDIUM');
    expect(vm.hero?.finding?.issues).toEqual(['Nitrogen deficiency']);
    expect(vm.hero?.finding?.recs).toHaveLength(2);
  });

  it('names the finding on the timeline tick tooltip', () => {
    const a = snap('20260825_100000');
    const vm = build([a], [result({ snapshot_paths: [a.path] })]);
    expect(vm.timeline[0].ticks[0].title).toBe('2026-08-25 10:00 · Grow Cam · MEDIUM');
    expect(vm.timeline[0].ticks[0].tone).toBe('medium');
  });
});

// ---------------------------------------------------------------------------
// Hero and navigation
// ---------------------------------------------------------------------------

describe('snapshots ViewModel — hero', () => {
  it('defaults to the newest frame', () => {
    const vm = build([snap('20260825_100000'), snap('20260825_140000')]);
    expect(vm.hero?.time).toBe('14:00');
    expect(vm.hero?.nextPath).toBeNull();
  });

  it('honours an explicit selection', () => {
    const target = snap('20260825_100000');
    const sm = transition(createInitialSM(), { type: 'FrameSelected', path: target.path });
    const vm = build([target, snap('20260825_140000')], [], sm);
    expect(vm.hero?.time).toBe('10:00');
    expect(vm.hero?.prevPath).toBeNull();
  });

  it('falls back to the newest frame when the selection is not visible', () => {
    const hidden = snap('20260825_220000');
    let sm = transition(createInitialSM(), { type: 'FrameSelected', path: hidden.path });
    sm = { ...sm, hideDark: true };
    const vm = build([snap('20260825_100000'), hidden], [], sm);
    expect(vm.hero?.time).toBe('10:00');
  });

  it('steps ±1 day to the nearest capture at the same clock time', () => {
    const vm = build([snap('20260824_080000'), snap('20260824_140000'), snap('20260825_133000')]);
    expect(vm.hero?.time).toBe('13:30');
    const prevDay = vm.days[1].items.find((i) => i.path === vm.hero?.prevDayPath);
    expect(prevDay?.time).toBe('14:00');
    expect(vm.hero?.nextDayPath).toBeNull();
  });

  it('keeps the same camera when stepping a day, so the viewpoint holds', () => {
    const target = snap('20260825_120000', CAM2);
    const sm = transition(createInitialSM(), { type: 'FrameSelected', path: target.path });
    const vm = build(
      [
        snap('20260824_120500', CAM), // closer in time, wrong camera
        snap('20260824_130000', CAM2),
        target,
      ],
      [],
      sm
    );
    expect(vm.hero?.prevDayPath).toBe(snap('20260824_130000', CAM2).path);
  });
});

// ---------------------------------------------------------------------------
// Compare and picker
// ---------------------------------------------------------------------------

describe('snapshots ViewModel — compare', () => {
  const a = snap('20260825_100000');
  const b = snap('20260825_140000');

  const comparing = () =>
    transition(transition(createInitialSM(), { type: 'CompareRequested', path: a.path }), {
      type: 'CompareBPicked',
      path: b.path,
    });

  it('projects both frames and the wipe position', () => {
    const vm = build([a, b], [], comparing());
    expect(vm.compare?.a.time).toBe('10:00');
    expect(vm.compare?.b.time).toBe('14:00');
    expect(vm.compare?.pct).toBe(50);
    expect(vm.compare?.label).toBe('2026-08-25 10:00 → 2026-08-25 14:00');
  });

  it('drops the compare view when a frame stops being visible', () => {
    const sm = { ...comparing(), hideDark: true };
    const dark = snap('20260825_220000');
    const smWithDark = transition(sm, { type: 'CompareRequested', path: dark.path });
    const vm = build([a, dark], [], smWithDark);
    expect(vm.picker).toBeNull();
  });

  it('lists every visible frame in the picker and marks A', () => {
    const sm = transition(createInitialSM(), { type: 'CompareRequested', path: a.path });
    const vm = build([a, b], [], sm);
    expect(vm.picker?.aLabel).toBe('2026-08-25 10:00');
    expect(vm.picker?.items.map((i) => i.isA)).toEqual([false, true]);
  });
});

// ---------------------------------------------------------------------------
// Empty and overlay states
// ---------------------------------------------------------------------------

describe('snapshots ViewModel — edges', () => {
  it('reports no frames and no hero for an empty growspace', () => {
    const vm = build([]);
    expect(vm.hasFrames).toBe(false);
    expect(vm.hero).toBeNull();
    expect(vm.subtitle).toBe('Tent A · No captures yet');
  });

  it('reports frames but no visible ones when the filter hides them all', () => {
    const sm = transition(createInitialSM(), { type: 'DarkFilterToggled' });
    const vm = build([snap('20260825_220000')], [], sm);
    expect(vm.hasFrames).toBe(true);
    expect(vm.hasVisibleFrames).toBe(false);
    expect(vm.hero).toBeNull();
  });

  it('exposes the hero path as the lightbox source only while it is open', () => {
    const frames = [snap('20260825_100000')];
    expect(build(frames).lightboxSrc).toBeNull();
    const open = transition(createInitialSM(), { type: 'LightboxOpened' });
    expect(build(frames, [], open).lightboxSrc).toBe(frames[0].path);
  });
});
