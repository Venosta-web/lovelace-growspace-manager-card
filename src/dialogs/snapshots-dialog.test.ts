import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type {
  CaptureSnapshotResponse,
  GetSnapshotsResponse,
  GetVisionHistoryResponse,
  Snapshot,
  VisionCheckupResult,
} from '../slices/camera';
import type { SnapshotsDialog } from './snapshots-dialog';

vi.mock('../slices/camera', () => ({
  getSnapshots: vi.fn(),
  captureSnapshot: vi.fn(),
  getVisionHistory: vi.fn(),
  getVisionHistoryV2: vi.fn(),
  getVisionStatus: vi.fn(),
  resolveVisionImage: vi.fn(),
  triggerVisionCheckup: vi.fn(),
}));

// `showToast` is re-exported here for the alert slice, which the Vision evidence
// surface imports transitively. A mock missing it does not fail as an undefined
// call — the module graph refuses to link at all.
vi.mock('../slices/ui', () => ({
  withToast: vi.fn(async (fn: () => Promise<unknown>) => fn()),
  showToast: vi.fn(),
}));

vi.mock('../slices/ai-insight', async () => {
  const { atom } = await import('nanostores');
  return {
    aiAlerts$: atom(new Map()),
    fetchAlerts: vi.fn().mockResolvedValue(undefined),
  };
});

import * as cameraSlice from '../slices/camera';
import * as aiInsightSlice from '../slices/ai-insight';
import './snapshots-dialog';

// ---------------------------------------------------------------------------
// HA element stand-ins — the card renders against the real HA frontend at runtime.
// ---------------------------------------------------------------------------

const defineStub = (tag: string, props: Record<string, unknown> = {}) => {
  if (customElements.get(tag)) return;
  customElements.define(
    tag,
    class extends HTMLElement {
      constructor() {
        super();
        Object.assign(this, props);
      }
    }
  );
};

defineStub('ha-dialog', { open: false, heading: '', hideActions: false });
defineStub('ha-svg-icon', { path: '' });
defineStub('ha-circular-progress', { active: false });

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const CAM = 'camera_grow_cam';

const snap = (timestamp: string): Snapshot => ({
  path: `/local/growspace_manager/snapshots/gs1/${timestamp}_${CAM}.jpg`,
  filename: `${timestamp}_${CAM}.jpg`,
  timestamp,
});

/** Two days, four frames, all inside a 06:00 + 12 h photoperiod except the last. */
const SNAPSHOTS = [
  snap('20260825_220000'),
  snap('20260825_140000'),
  snap('20260825_100000'),
  snap('20260824_140000'),
];

const FINDING: VisionCheckupResult = {
  timestamp: '20260825_140000',
  check_type: 'mid',
  analysis: 'Lower leaves are yellowing. Likely a nitrogen shortfall.',
  issues_detected: ['nitrogen_deficiency'],
  severity: 'medium',
  recommendations: ['Raise nitrogen by 10%', 'Recheck in 48h'],
  snapshot_paths: [snap('20260825_140000').path],
};

const flush = async (element: SnapshotsDialog) => {
  await element.updateComplete;
  await new Promise((resolve) => setTimeout(resolve, 0));
  await element.updateComplete;
};

const q = (element: SnapshotsDialog, selector: string) =>
  element.shadowRoot?.querySelector(selector) as HTMLElement | null;

const qa = (element: SnapshotsDialog, selector: string) =>
  Array.from(element.shadowRoot?.querySelectorAll(selector) ?? []) as HTMLElement[];

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((_resolve) => {
    resolve = _resolve;
  });
  return { promise, resolve };
};

describe('SnapshotsDialog', () => {
  let element: SnapshotsDialog;
  let showToast: ReturnType<typeof vi.fn>;

  const mount = async (snapshots = SNAPSHOTS, history: VisionCheckupResult[] = [FINDING]) => {
    vi.mocked(cameraSlice.getSnapshots).mockResolvedValue({
      growspace_id: 'gs1',
      snapshots,
      total: snapshots.length,
    });
    vi.mocked(cameraSlice.getVisionHistory).mockResolvedValue({
      history,
      total: history.length,
    });
    element.dialogState = { growspaceId: 'gs1' };
    element.open = true;
    await flush(element);
  };

  beforeEach(async () => {
    vi.mocked(cameraSlice.captureSnapshot).mockResolvedValue({
      growspace_id: 'gs1',
      timestamp: '',
      snapshots: [],
    });
    vi.mocked(cameraSlice.triggerVisionCheckup).mockResolvedValue(FINDING);
    // The Vision evidence surface loads alongside the captures browser; without
    // defaults every capture test would drown in its unhandled rejections.
    vi.mocked(cameraSlice.getVisionHistoryV2).mockResolvedValue({
      history: [],
      total: 0,
      capture_total: 0,
    });
    vi.mocked(cameraSlice.getVisionStatus).mockResolvedValue({
      availability: 'ready',
      connection_source: 'supervisor',
      vision_schema_version: 1,
      model: { id: 'dinov2', version: '1.0.0', dimension: 384 },
    });
    vi.mocked(cameraSlice.resolveVisionImage).mockResolvedValue('/media/local/x.jpg?authSig=abc');
    aiInsightSlice.aiAlerts$.set(new Map());

    showToast = vi.fn();
    element = document.createElement('snapshots-dialog') as SnapshotsDialog;
    (element as unknown as { store: unknown }).store = {
      ui: { showToast },
      refreshData: vi.fn().mockResolvedValue(undefined),
    };
    (element as unknown as { hass: unknown }).hass = {
      states: { 'camera.grow_cam': { attributes: { friendly_name: 'Grow Cam' } } },
    };
    element.growspaceName = 'Tent A';
    element.device = {
      irrigationStrategy: { lightsOnTime: '06:00' },
      irrigationConfig: { resolvedDayHours: 12 },
    } as never;

    document.body.appendChild(element);
    await element.updateComplete;
  });

  it('keeps the desktop hero stage at least 300px tall', async () => {
    await mount();

    expect(window.matchMedia('(min-width: 861px)').matches).toBe(true);
    expect(getComputedStyle(q(element, '.stage') as HTMLElement).minHeight).toBe('300px');
  });

  afterEach(() => {
    element.remove();
    vi.clearAllMocks();
  });

  // ── Loading and empty ──────────────────────────────────────────────────────

  it('shows a spinner while the first fetch is in flight', async () => {
    vi.mocked(cameraSlice.getSnapshots).mockReturnValue(new Promise(() => {}));
    vi.mocked(cameraSlice.getVisionHistory).mockReturnValue(new Promise(() => {}));
    element.dialogState = { growspaceId: 'gs1' };
    element.open = true;
    await element.updateComplete;

    expect(q(element, 'ha-circular-progress')).toBeTruthy();
    expect(q(element, '[role="status"]')?.textContent).toContain('Loading camera snapshots');
  });

  it('shows a recoverable error when the initial fetch fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(cameraSlice.getSnapshots).mockRejectedValue(new Error('offline'));
    vi.mocked(cameraSlice.getVisionHistory).mockRejectedValue(new Error('offline'));
    element.dialogState = { growspaceId: 'gs1' };
    element.open = true;
    await flush(element);

    expect(q(element, '[role="alert"] h3')?.textContent).toBe('Camera snapshots unavailable');
    expect(q(element, '.retry-btn')).toBeTruthy();

    vi.mocked(cameraSlice.getSnapshots).mockResolvedValue({
      growspace_id: 'gs1',
      snapshots: SNAPSHOTS,
      total: SNAPSHOTS.length,
    });
    vi.mocked(cameraSlice.getVisionHistory).mockResolvedValue({ history: [], total: 0 });
    q(element, '.retry-btn')?.click();
    await flush(element);
    expect(qa(element, '.thumb')).toHaveLength(4);
    consoleSpy.mockRestore();
  });

  it('shows the empty state when the growspace has no captures', async () => {
    await mount([], []);
    expect(q(element, '.empty-state h3')?.textContent).toBe('No Snapshots Found');
  });

  it('loads snapshots and vision history together, not behind a tab', async () => {
    await mount();
    expect(cameraSlice.getSnapshots).toHaveBeenCalledWith('gs1');
    expect(cameraSlice.getVisionHistory).toHaveBeenCalledWith('gs1');
  });

  it('re-fetches when the growspace changes while open', async () => {
    await mount();
    vi.mocked(cameraSlice.getSnapshots).mockClear();
    element.dialogState = { growspaceId: 'gs2' };
    await flush(element);
    expect(cameraSlice.getSnapshots).toHaveBeenCalledWith('gs2');
  });

  it('ignores a stale response after the growspace changes', async () => {
    const oldSnapshots = deferred<GetSnapshotsResponse>();
    const oldHistory = deferred<GetVisionHistoryResponse>();
    const current = snap('20260826_090000');
    vi.mocked(cameraSlice.getSnapshots)
      .mockReturnValueOnce(oldSnapshots.promise)
      .mockResolvedValueOnce({ growspace_id: 'gs2', snapshots: [current], total: 1 });
    vi.mocked(cameraSlice.getVisionHistory)
      .mockReturnValueOnce(oldHistory.promise)
      .mockResolvedValueOnce({ history: [], total: 0 });

    element.dialogState = { growspaceId: 'gs1' };
    element.open = true;
    await element.updateComplete;
    element.dialogState = { growspaceId: 'gs2' };
    await flush(element);
    expect(q(element, '.hero-label')?.textContent).toBe('2026-08-26 09:00');

    oldSnapshots.resolve({ growspace_id: 'gs1', snapshots: SNAPSHOTS, total: SNAPSHOTS.length });
    oldHistory.resolve({ history: [FINDING], total: 1 });
    await flush(element);
    expect(q(element, '.hero-label')?.textContent).toBe('2026-08-26 09:00');
  });

  it('toasts when the snapshot fetch fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(cameraSlice.getSnapshots).mockRejectedValue(new Error('nope'));
    vi.mocked(cameraSlice.getVisionHistory).mockResolvedValue({ history: [], total: 0 });
    element.dialogState = { growspaceId: 'gs1' };
    element.open = true;
    await flush(element);

    expect(showToast).toHaveBeenCalledWith('Failed to load snapshots', 'error');
    consoleSpy.mockRestore();
  });

  it('still renders the frames when only the vision history fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(cameraSlice.getSnapshots).mockResolvedValue({
      growspace_id: 'gs1',
      snapshots: SNAPSHOTS,
      total: SNAPSHOTS.length,
    });
    vi.mocked(cameraSlice.getVisionHistory).mockRejectedValue(new Error('nope'));
    element.dialogState = { growspaceId: 'gs1' };
    element.open = true;
    await flush(element);

    expect(qa(element, '.thumb')).toHaveLength(4);
    expect(showToast).toHaveBeenCalledWith('Failed to load vision history', 'error');
    consoleSpy.mockRestore();
  });

  // ── Rail and hero ──────────────────────────────────────────────────────────

  it('groups the rail into day rows, newest day first', async () => {
    await mount();
    const days = qa(element, '.rail-day-date').map((el) => el.textContent);
    expect(days).toEqual(['2026-08-25', '2026-08-24']);
    expect(qa(element, '.thumb')).toHaveLength(4);
  });

  it('opens on the newest frame', async () => {
    await mount();
    expect(q(element, '.hero-label')?.textContent).toBe('2026-08-25 22:00');
  });

  it('selecting a rail thumbnail moves the hero', async () => {
    await mount();
    qa(element, '.thumb')[2].click();
    await element.updateComplete;
    expect(q(element, '.hero-label')?.textContent).toBe('2026-08-25 10:00');
  });

  it('steps frames with the arrow keys', async () => {
    await mount();
    q(element, '.viewer')?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true })
    );
    await element.updateComplete;
    expect(q(element, '.hero-label')?.textContent).toBe('2026-08-25 14:00');

    q(element, '.viewer')?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })
    );
    await element.updateComplete;
    expect(q(element, '.hero-label')?.textContent).toBe('2026-08-25 22:00');
  });

  it('disables next on the newest frame and prev on the oldest', async () => {
    await mount();
    expect((q(element, '.stage-nav.next') as HTMLButtonElement).disabled).toBe(true);
    qa(element, '.thumb')[3].click();
    await element.updateComplete;
    expect((q(element, '.stage-nav.prev') as HTMLButtonElement).disabled).toBe(true);
  });

  it('marks a capture taken with the lights off', async () => {
    await mount();
    expect(q(element, '.chip.night')?.textContent?.trim()).toBe('Lights off');
    expect(qa(element, '.thumb-night')).toHaveLength(1);
  });

  it('hides dark frames on request and falls back to the newest lit frame', async () => {
    await mount();
    q(element, '.dark-toggle')?.click();
    await element.updateComplete;
    expect(qa(element, '.thumb')).toHaveLength(3);
    expect(q(element, '.hero-label')?.textContent).toBe('2026-08-25 14:00');
    expect(q(element, '.dark-toggle')?.textContent?.trim()).toBe('Show dark');
  });

  it('hides the dark filter entirely when no photoperiod is known', async () => {
    element.device = undefined;
    await mount();
    expect(q(element, '.dark-toggle')).toBeNull();
  });

  // ── Timeline ───────────────────────────────────────────────────────────────

  it('renders one timeline tick per frame, coloured by finding severity', async () => {
    await mount();
    expect(qa(element, '.tick')).toHaveLength(4);
    expect(qa(element, '.tick.medium')).toHaveLength(1);
  });

  it('selects a frame from its timeline tick', async () => {
    await mount();
    qa(element, '.tick')[0].click();
    await element.updateComplete;
    expect(q(element, '.hero-label')?.textContent).toBe('2026-08-24 14:00');
  });

  // ── Findings strip ─────────────────────────────────────────────────────────

  it('attaches the checkup finding to the frame it analysed', async () => {
    await mount();
    expect(q(element, '.findings')).toBeNull();

    qa(element, '.thumb')[1].click();
    await element.updateComplete;

    expect(q(element, '.severity-chip')?.textContent).toBe('MEDIUM');
    expect(q(element, '.findings-text')?.textContent).toBe('Lower leaves are yellowing.');
    expect(q(element, '.analysis-text')?.textContent).toContain('nitrogen shortfall');
    expect(qa(element, '.issue-chip')).toHaveLength(1);
    expect(qa(element, '.recommendation-item')).toHaveLength(2);
  });

  it('collapses the findings detail on request', async () => {
    await mount();
    qa(element, '.thumb')[1].click();
    await element.updateComplete;

    q(element, '.findings-summary')?.click();
    await element.updateComplete;

    expect(q(element, '.findings-detail')).toBeNull();
    expect(q(element, '.findings-summary')).toBeTruthy();
  });

  // ── Compare ────────────────────────────────────────────────────────────────

  it('opens the second-frame picker from a thumbnail', async () => {
    await mount();
    q(element, '.thumb .thumb-compare')?.click();
    await element.updateComplete;

    expect(q(element, '.picker')).toBeTruthy();
    expect(q(element, '.picker-sub')?.textContent).toContain('2026-08-25 22:00');
    expect(qa(element, '.picker-item')).toHaveLength(4);
  });

  it('treats the frame picker as a modal and restores focus when cancelled', async () => {
    await mount();
    const trigger = q(element, '.thumb .thumb-compare')!;
    trigger.focus();
    trigger.click();
    await flush(element);

    const picker = q(element, '.overlay')!;
    expect(picker.getAttribute('role')).toBe('dialog');
    expect(picker.getAttribute('aria-modal')).toBe('true');
    expect(element.shadowRoot?.activeElement).toBe(q(element, '.picker-cancel'));

    q(element, '.picker-cancel')?.click();
    await flush(element);
    expect(element.shadowRoot?.activeElement).toBe(trigger);
  });

  it('compares the picked pair with a centred wipe', async () => {
    await mount();
    q(element, '.thumb .thumb-compare')?.click();
    await element.updateComplete;
    qa(element, '.picker-item')[2].click();
    await element.updateComplete;

    expect(q(element, '.compare-label')?.textContent).toBe('2026-08-25 22:00 → 2026-08-25 10:00');
    expect(q(element, '.cmp-handle')?.style.left).toBe('50%');
    expect(q(element, '.cmp-a')?.style.clipPath).toBe('inset(0px 50% 0px 0px)');
  });

  it('moves the wipe with the range input', async () => {
    await mount();
    q(element, '.thumb .thumb-compare')?.click();
    await element.updateComplete;
    qa(element, '.picker-item')[2].click();
    await element.updateComplete;

    const range = q(element, '.cmp-range') as HTMLInputElement;
    range.value = '20';
    range.dispatchEvent(new Event('input'));
    await element.updateComplete;

    expect(q(element, '.cmp-handle')?.style.left).toBe('20%');
    expect(q(element, '.cmp-a')?.style.clipPath).toBe('inset(0px 80% 0px 0px)');
  });

  it('leaves compare from its exit control', async () => {
    await mount();
    q(element, '.thumb .thumb-compare')?.click();
    await element.updateComplete;
    qa(element, '.picker-item')[2].click();
    await element.updateComplete;

    q(element, '.compare-exit')?.click();
    await element.updateComplete;

    expect(q(element, '.compare')).toBeNull();
    expect(q(element, '.hero-image')).toBeTruthy();
  });

  it('cancels the picker on Escape without closing the dialog', async () => {
    await mount();
    const closeSpy = vi.fn();
    element.addEventListener('close', closeSpy);

    q(element, '.thumb .thumb-compare')?.click();
    await element.updateComplete;

    const ev = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    window.dispatchEvent(ev);
    await element.updateComplete;

    expect(q(element, '.picker')).toBeNull();
    expect(ev.defaultPrevented).toBe(true);
    expect(closeSpy).not.toHaveBeenCalled();
  });

  // ── Lightbox ───────────────────────────────────────────────────────────────

  it('enlarges the hero frame and dismisses on Escape', async () => {
    await mount();
    const closeSpy = vi.fn();
    element.addEventListener('close', closeSpy);

    qa(element, '.glass-btn')[0].click();
    await flush(element);
    expect((q(element, '.lightbox-image') as HTMLImageElement).getAttribute('src')).toBe(
      SNAPSHOTS[0].path
    );
    expect(q(element, '.lightbox-backdrop')?.getAttribute('role')).toBe('dialog');
    expect(q(element, '.lightbox-backdrop')?.getAttribute('aria-modal')).toBe('true');
    expect(element.shadowRoot?.activeElement).toBe(q(element, '.lightbox-close'));

    const ev = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    window.dispatchEvent(ev);
    await element.updateComplete;

    expect(q(element, '.lightbox-backdrop')).toBeNull();
    expect(closeSpy).not.toHaveBeenCalled();
    expect(element.open).toBe(true);
  });

  it('does not dismiss the lightbox when the enlarged image is clicked', async () => {
    await mount();
    qa(element, '.glass-btn')[0].click();
    await element.updateComplete;

    q(element, '.lightbox-image')?.click();
    await element.updateComplete;

    expect(q(element, '.lightbox-backdrop')).toBeTruthy();
  });

  // ── Header actions ─────────────────────────────────────────────────────────

  it('captures a snapshot and reloads', async () => {
    await mount();
    vi.mocked(cameraSlice.getSnapshots).mockClear();

    q(element, '.capture-btn')?.click();
    await element.updateComplete;
    expect(q(element, '.capture-btn')?.textContent?.trim()).toBe('Capturing...');

    await flush(element);
    expect(cameraSlice.captureSnapshot).toHaveBeenCalledWith('gs1');
    expect(cameraSlice.getSnapshots).toHaveBeenCalledTimes(1);
  });

  it('does not apply a capture completion to a different growspace', async () => {
    await mount();
    const capture = deferred<CaptureSnapshotResponse>();
    vi.mocked(cameraSlice.captureSnapshot).mockReturnValue(capture.promise);
    vi.mocked(cameraSlice.getSnapshots).mockClear();

    q(element, '.capture-btn')?.click();
    await element.updateComplete;
    element.dialogState = { growspaceId: 'gs2' };
    await flush(element);
    expect((q(element, '.capture-btn') as HTMLButtonElement).disabled).toBe(false);

    capture.resolve({ growspace_id: 'gs1', timestamp: '', snapshots: [] });
    await flush(element);
    expect(cameraSlice.getSnapshots).not.toHaveBeenCalledWith('gs1');
  });

  it('toasts when the capture fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await mount();
    vi.mocked(cameraSlice.captureSnapshot).mockRejectedValue(new Error('no cameras'));

    q(element, '.capture-btn')?.click();
    await flush(element);

    expect(showToast).toHaveBeenCalledWith('Failed to capture snapshot', 'error');
    consoleSpy.mockRestore();
  });

  it('runs a vision checkup and reloads the findings', async () => {
    await mount();
    vi.mocked(cameraSlice.getVisionHistory).mockClear();

    q(element, '.run-checkup-btn')?.click();
    await element.updateComplete;
    expect(q(element, '.run-checkup-btn')?.textContent?.trim()).toBe('Running...');

    await flush(element);
    expect(cameraSlice.triggerVisionCheckup).toHaveBeenCalledWith('gs1');
    expect(cameraSlice.getVisionHistory).toHaveBeenCalled();
  });

  it('recovers the vision action after a failed checkup', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await mount();
    vi.mocked(cameraSlice.triggerVisionCheckup).mockRejectedValue(new Error('offline'));

    q(element, '.run-checkup-btn')?.click();
    await flush(element);

    expect((q(element, '.run-checkup-btn') as HTMLButtonElement).disabled).toBe(false);
    expect(q(element, '.inline-status[role="alert"]')?.textContent).toContain(
      "vision checkup couldn't run"
    );
    consoleSpy.mockRestore();
  });

  it('refreshes from the header control', async () => {
    await mount();
    vi.mocked(cameraSlice.getSnapshots).mockClear();
    q(element, 'button[title="Refresh"]')?.click();
    expect(cameraSlice.getSnapshots).toHaveBeenCalledWith('gs1');
  });

  it('emits close when gs-dialog closes', async () => {
    await mount();
    const closeSpy = vi.fn();
    element.addEventListener('close', closeSpy);
    q(element, 'gs-dialog')?.dispatchEvent(
      new CustomEvent('close', { bubbles: true, composed: true })
    );
    expect(closeSpy).toHaveBeenCalled();
  });

  // ── Vision evidence surface ────────────────────────────────────────────────

  const A_CHECKUP = {
    result_schema: 'evidence_v1' as const,
    checkup_id: 'chk-1',
    growspace_id: 'gs1',
    trigger_source: 'scheduled' as const,
    light_window: 'mid' as const,
    started_at: '2026-09-01T14:00:00+00:00',
    completed_at: '2026-09-01T14:03:00+00:00',
    status: 'completed' as const,
    captures: [
      {
        capture_id: 'cap-1',
        camera_id: 'camera.grow_cam',
        captured_at: '2026-09-01T14:02:00+00:00',
        analysis_state: 'analyzed' as const,
        image: { available: true, media_content_id: 'media-source://media_source/local/a.jpg' },
        quality: { accepted: true, reasons: [] },
        provenance: { model_id: 'dinov2', model_version: '1.0.0' },
        visual: {
          outcome: 'scored' as const,
          baseline_state: 'ready' as const,
          samples_collected: 30,
          samples_required: 30,
          raw_distance: 0.184,
          anomaly_score: 0.9,
          verdict: 'normal' as const,
          comparison_confidence: 0.82,
          unavailable_reasons: [],
        },
        environment: {
          verdict: 'within_evaluated_range' as const,
          stress_reasons: [],
          mold_reasons: [],
        },
        fusion: {
          state: 'no_detected_change' as const,
          confidence: 'confirmed' as const,
          coverage: 'complete' as const,
          unavailable_reasons: [],
        },
        trend: [],
      },
    ],
  };

  const showEvidence = async () => {
    qa(element, '.view-tab')
      .find((tab) => tab.textContent?.includes('Vision evidence'))
      ?.click();
    await flush(element);
  };

  it('offers both surfaces as tabs and opens on the captures browser', async () => {
    await mount();
    const tabs = qa(element, '.view-tab');

    expect(tabs.map((tab) => tab.textContent?.trim())).toEqual(['Captures', 'Vision evidence']);
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    expect(q(element, '.view-switch')?.getAttribute('role')).toBe('tablist');
  });

  it('loads evidence alongside the captures browser, not only when switched to', async () => {
    await mount();
    expect(cameraSlice.getVisionHistoryV2).toHaveBeenCalledWith('gs1');
    expect(cameraSlice.getVisionStatus).toHaveBeenCalled();
    expect(aiInsightSlice.fetchAlerts).toHaveBeenCalledWith('gs1');
  });

  it('reaches the evidence surface even when there is not a single snapshot file', async () => {
    vi.mocked(cameraSlice.getVisionHistoryV2).mockResolvedValue({
      history: [A_CHECKUP],
      total: 1,
      capture_total: 1,
    });
    await mount([], []);
    await showEvidence();

    expect(q(element, 'growspace-vision-evidence')).toBeTruthy();
    expect(q(element, '.stage')).toBeNull();
  });

  it('resolves each capture frame through Home Assistant rather than a /local/ path', async () => {
    vi.mocked(cameraSlice.getVisionHistoryV2).mockResolvedValue({
      history: [A_CHECKUP],
      total: 1,
      capture_total: 1,
    });
    await mount();

    expect(cameraSlice.resolveVisionImage).toHaveBeenCalledWith(
      'media-source://media_source/local/a.jpg'
    );
  });

  it('keeps the panel usable when a frame will not resolve', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(cameraSlice.getVisionHistoryV2).mockResolvedValue({
      history: [A_CHECKUP],
      total: 1,
      capture_total: 1,
    });
    vi.mocked(cameraSlice.resolveVisionImage).mockRejectedValue(new Error('expired'));
    await mount();
    await showEvidence();

    expect(q(element, 'growspace-vision-evidence')).toBeTruthy();
    consoleSpy.mockRestore();
  });

  it('passes only this camera-continuity alert kind to the panel', async () => {
    vi.mocked(cameraSlice.getVisionHistoryV2).mockResolvedValue({
      history: [A_CHECKUP],
      total: 1,
      capture_total: 1,
    });
    aiInsightSlice.aiAlerts$.set(
      new Map([
        [
          'gs1',
          [
            { id: 'a1', type: 'capture_continuity_break', camera_id: 'camera.grow_cam' },
            { id: 'a2', type: 'stress' },
          ],
        ],
      ]) as never
    );
    await mount();

    const alerts = (element as unknown as { _continuityAlerts: { type: string }[] })
      ._continuityAlerts;
    expect(alerts.map((alert) => alert.type)).toEqual(['capture_continuity_break']);
  });

  it('reports an evidence failure on its own surface, leaving the captures browser alone', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(cameraSlice.getVisionHistoryV2).mockRejectedValue(new Error('offline'));
    await mount();

    expect(q(element, '.stage')).toBeTruthy();
    expect(q(element, '.inline-status[role="alert"]')).toBeNull();

    await showEvidence();
    expect((element as unknown as { _evidenceError: string | null })._evidenceError).toContain(
      "Vision evidence couldn't be loaded"
    );
    consoleSpy.mockRestore();
  });

  it('discards an in-flight evidence response once the dialog has moved growspace', async () => {
    const late = deferred<{ history: unknown[]; total: number; capture_total: number }>();
    vi.mocked(cameraSlice.getVisionHistoryV2).mockReturnValueOnce(late.promise as never);
    element.dialogState = { growspaceId: 'gs1' };
    element.open = true;
    await element.updateComplete;

    // Move to another growspace, then let gs1's request finally answer.
    element.dialogState = { growspaceId: 'gs2' };
    await flush(element);
    late.resolve({ history: [A_CHECKUP], total: 1, capture_total: 1 });
    await flush(element);

    expect((element as unknown as { _evidence: unknown[] })._evidence).toHaveLength(0);
  });
});
