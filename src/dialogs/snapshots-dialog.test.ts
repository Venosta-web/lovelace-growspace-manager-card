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
  triggerVisionCheckup: vi.fn(),
}));

vi.mock('../slices/ui', () => ({
  withToast: vi.fn(async (fn: () => Promise<unknown>) => fn()),
}));

import * as cameraSlice from '../slices/camera';
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
});
