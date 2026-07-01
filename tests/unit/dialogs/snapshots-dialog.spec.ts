import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SnapshotsDialog } from '../../../src/dialogs/snapshots-dialog';
import type { VisionCheckupResult } from '../../../src/lib/types/dialog';
import '../../../src/dialogs/snapshots-dialog';

// Mock the camera slice — snapshots-dialog calls getSnapshots / captureSnapshot directly
vi.mock('../../../src/slices/camera', () => ({
  getSnapshots: vi.fn().mockResolvedValue({ growspace_id: 'gs1', snapshots: [], total: 0 }),
  captureSnapshot: vi.fn().mockResolvedValue({ growspace_id: 'gs1', timestamp: '', snapshots: [] }),
  getVisionHistory: vi.fn().mockResolvedValue({ history: [], total: 0 }),
  triggerVisionCheckup: vi.fn().mockResolvedValue(undefined),
  setSnapshots: vi.fn(),
  snapshots$: { get: vi.fn(() => []), set: vi.fn(), subscribe: vi.fn() },
}));

import * as cameraSlice from '../../../src/slices/camera';

// Mock ha-dialog if not already defined
if (!customElements.get('ha-dialog')) {
    class HaDialogMock extends HTMLElement {
        open = false;
        heading = '';
        hideActions = false;
    }
    customElements.define('ha-dialog', HaDialogMock);
}

// Mock ha-icon-button
if (!customElements.get('ha-icon-button')) {
    class HaIconButtonMock extends HTMLElement {
        path = '';
        disabled = false;
        title = '';
    }
    customElements.define('ha-icon-button', HaIconButtonMock);
}

// Mock ha-circular-progress
if (!customElements.get('ha-circular-progress')) {
    class HaCircularProgressMock extends HTMLElement {
        active = false;
    }
    customElements.define('ha-circular-progress', HaCircularProgressMock);
}

// Mock ha-svg-icon
if (!customElements.get('ha-svg-icon')) {
    class HaSvgIconMock extends HTMLElement {
        path = '';
    }
    customElements.define('ha-svg-icon', HaSvgIconMock);
}

// Mock md3-button
if (!customElements.get('md3-button')) {
    class Md3ButtonMock extends HTMLElement {
        disabled = false;
    }
    customElements.define('md3-button', Md3ButtonMock);
}

describe('SnapshotsDialog', () => {
    let element: SnapshotsDialog;
    let mockStore: any;
    let mockSnapshotsActions: any;
    let mockUi: any;

    beforeEach(async () => {
        vi.mocked(cameraSlice.getSnapshots).mockResolvedValue({ growspace_id: 'gs1', snapshots: [], total: 0 });
        vi.mocked(cameraSlice.captureSnapshot).mockResolvedValue({ growspace_id: 'gs1', timestamp: '', snapshots: [] });

        mockSnapshotsActions = {
            visionHistory: vi.fn(),
            triggerCheckup: vi.fn(),
        };

        mockUi = {
            closeDialog: vi.fn(),
            showToast: vi.fn(),
        };

        mockStore = {
            actions: { snapshots: mockSnapshotsActions },
            ui: mockUi,
        };

        element = new SnapshotsDialog();
        // Manually inject mocks since we're not using a real context in this unit test
        (element as any).store = mockStore;
        (element as any).hass = {
            states: {},
            connection: {
                sendMessagePromise: vi.fn(),
            },
        } as any;

        document.body.appendChild(element);
        await element.updateComplete;
        vi.clearAllMocks();
        vi.mocked(cameraSlice.getSnapshots).mockResolvedValue({ growspace_id: 'gs1', snapshots: [], total: 0 });
        vi.mocked(cameraSlice.captureSnapshot).mockResolvedValue({ growspace_id: 'gs1', timestamp: '', snapshots: [] });
    });

    afterEach(() => {
        if (element && element.isConnected) {
            document.body.removeChild(element);
        }
    });

    it('should show loading state when fetching snapshots', async () => {
        vi.mocked(cameraSlice.getSnapshots).mockReturnValue(new Promise(() => { })); // Never resolves
        element.dialogState = { growspaceId: 'gs1' };
        element.open = true;
        await element.updateComplete;

        const progress = element.shadowRoot?.querySelector('ha-circular-progress');
        expect(progress).toBeTruthy();
    });

    it('should render snapshots grid when snapshots are available', async () => {
        const mockSnapshots = [
            { path: '/local/snap1.jpg', filename: 'snap1.jpg', timestamp: '20240101_123456' },
            { path: '/local/snap2.jpg', filename: 'snap2.jpg', timestamp: '20240101_133456' },
        ];
        vi.mocked(cameraSlice.getSnapshots).mockResolvedValue({ growspace_id: 'gs1', snapshots: mockSnapshots, total: 2 });

        element.dialogState = { growspaceId: 'gs1' };
        element.open = true;
        await element.updateComplete;
        // Wait for microtasks (the async fetch)
        await new Promise(resolve => setTimeout(resolve, 0));
        await element.updateComplete;

        const cards = element.shadowRoot?.querySelectorAll('.snapshot-card');
        expect(cards?.length).toBe(2);

        const timestamp = element.shadowRoot?.querySelector('.snapshot-info span');
        expect(timestamp?.textContent).toBe('2024-01-01 12:34');
    });

    it('should show empty state when no snapshots are found', async () => {
        vi.mocked(cameraSlice.getSnapshots).mockResolvedValue({ growspace_id: 'gs1', snapshots: [], total: 0 });

        element.dialogState = { growspaceId: 'gs1' };
        element.open = true;
        await element.updateComplete;
        await new Promise(resolve => setTimeout(resolve, 0));
        await element.updateComplete;

        const emptyState = element.shadowRoot?.querySelector('.empty-state');
        expect(emptyState).toBeTruthy();
        expect(emptyState?.querySelector('h3')?.textContent).toBe('No Snapshots Found');
    });

    it('should handle fetch error and show toast', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        vi.mocked(cameraSlice.getSnapshots).mockRejectedValue(new Error('Fetch Failed'));

        element.dialogState = { growspaceId: 'gs1' };
        element.open = true;
        await element.updateComplete;
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(mockUi.showToast).toHaveBeenCalledWith('Failed to load snapshots', 'error');
        consoleSpy.mockRestore();
    });

    it('should capture snapshot and refresh the list', async () => {
        vi.mocked(cameraSlice.captureSnapshot).mockResolvedValue({ growspace_id: 'gs1', timestamp: '', snapshots: [] });
        vi.mocked(cameraSlice.getSnapshots).mockResolvedValue({ growspace_id: 'gs1', snapshots: [], total: 0 });

        element.dialogState = { growspaceId: 'gs1' };
        element.open = true;
        await element.updateComplete;

        const captureBtn = element.shadowRoot?.querySelector('md3-button');
        (captureBtn as HTMLElement).click();

        // Wait for Lit to render the capturing state
        await element.updateComplete;
        expect(element.shadowRoot?.innerHTML).toContain('Capturing...');

        await new Promise(resolve => setTimeout(resolve, 0));

        expect(cameraSlice.captureSnapshot).toHaveBeenCalledWith('gs1');
        expect(cameraSlice.getSnapshots).toHaveBeenCalledTimes(2); // Initial open + after capture
    });

    it('should handle capture error and show toast', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        vi.mocked(cameraSlice.captureSnapshot).mockRejectedValue(new Error('Fail'));

        element.dialogState = { growspaceId: 'gs1' };
        element.open = true;
        await element.updateComplete;

        const captureBtn = element.shadowRoot?.querySelector('md3-button');
        (captureBtn as HTMLElement).click();
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(mockUi.showToast).toHaveBeenCalledWith('Failed to capture snapshot', 'error');
        consoleSpy.mockRestore();
    });

    it('should fetch snapshots when refresh button is clicked', async () => {
        element.open = true;
        element.dialogState = { growspaceId: 'gs1' };
        await element.updateComplete;

        const refreshBtn = element.shadowRoot?.querySelector('button[title="Refresh"]') as HTMLButtonElement;
        refreshBtn.click();

        expect(cameraSlice.getSnapshots).toHaveBeenCalledWith('gs1');
    });

    it('should close dialog when close button is clicked', async () => {
        element.open = true;
        await element.updateComplete;

        const closeSpy = vi.fn();
        element.addEventListener('close', closeSpy);

        const gsDialog = element.shadowRoot?.querySelector('gs-dialog');
        const closeBtn = (gsDialog as any)?.shadowRoot?.querySelector('button.dialog-close-btn') as HTMLButtonElement;
        closeBtn.click();
        expect(closeSpy).toHaveBeenCalled();
    });

    it('should close dialog when gs-dialog emits close event', async () => {
        element.open = true;
        await element.updateComplete;

        const closeSpy = vi.fn();
        element.addEventListener('close', closeSpy);

        const gsDialog = element.shadowRoot?.querySelector('gs-dialog');
        gsDialog?.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));

        expect(closeSpy).toHaveBeenCalled();
    });

    it('should re-fetch if growspaceId changes while open', async () => {
        element.dialogState = { growspaceId: 'gs1' };
        element.open = true;
        await element.updateComplete;

        vi.mocked(cameraSlice.getSnapshots).mockClear();
        vi.mocked(cameraSlice.getSnapshots).mockResolvedValue({ growspace_id: 'gs2', snapshots: [], total: 0 });
        element.dialogState = { growspaceId: 'gs2' };
        await element.updateComplete;

        expect(cameraSlice.getSnapshots).toHaveBeenCalledWith('gs2');
    });

    it('should handle short or invalid timestamps in _formatDate', () => {
        // Accessing private method for coverage
        const result = (element as any)._formatDate('short');
        expect(result).toBe('short');
    });
});

describe('Vision Checkup tab', () => {
  let element: SnapshotsDialog;
  let mockStore: any;
  let mockUi: any;
  let mockVisionHistory: VisionCheckupResult[];

  beforeEach(async () => {
    vi.mocked(cameraSlice.getSnapshots).mockResolvedValue({ growspace_id: 'gs1', snapshots: [], total: 0 });
    vi.mocked(cameraSlice.captureSnapshot).mockResolvedValue({ growspace_id: 'gs1', timestamp: '', snapshots: [] });

    mockUi = {
      closeDialog: vi.fn(),
      showToast: vi.fn(),
    };

    mockStore = {
      ui: mockUi,
      refreshData: vi.fn().mockResolvedValue(undefined),
    };

    mockVisionHistory = [
      {
        timestamp: '20240101_120000',
        check_type: 'manual',
        analysis: 'Plants look healthy overall.',
        issues_detected: ['slight_nitrogen_deficiency'],
        severity: 'low',
        recommendations: ['Increase nitrogen by 10%', 'Monitor for 48h'],
        snapshot_paths: [],
      },
      {
        timestamp: '20240101_060000',
        check_type: 'early',
        analysis: 'Good canopy coverage.',
        issues_detected: [],
        severity: 'none',
        recommendations: [],
        snapshot_paths: [],
      },
    ];
    vi.mocked(cameraSlice.getVisionHistory).mockResolvedValue({ history: mockVisionHistory, total: 2 } as any);
    vi.mocked(cameraSlice.triggerVisionCheckup).mockResolvedValue(undefined as any);

    element = new SnapshotsDialog();
    (element as any).store = mockStore;
    (element as any).hass = {
      states: {},
      connection: {
        sendMessagePromise: vi.fn(),
      },
    } as any;

    document.body.appendChild(element);
    await element.updateComplete;
  });

  afterEach(() => {
    if (element && element.isConnected) {
      document.body.removeChild(element);
    }
  });

  it('renders tab bar with Snapshots and Vision Checkup tabs', async () => {
    element.open = true;
    await element.updateComplete;
    const tabs = element.shadowRoot?.querySelectorAll('.tab-btn');
    expect(tabs?.length).toBe(2);
    expect(tabs?.[0].textContent?.trim()).toContain('Snapshots');
    expect(tabs?.[1].textContent?.trim()).toContain('Vision Checkup');
  });

  it('shows Vision Checkup tab content when clicked', async () => {
    element.open = true;
    await element.updateComplete;
    const tabs = element.shadowRoot?.querySelectorAll('.tab-btn');
    (tabs?.[1] as HTMLElement).click();
    await element.updateComplete;
    const visionTab = element.shadowRoot?.querySelector('.vision-tab');
    expect(visionTab).toBeTruthy();
  });

  it('fetches vision history when Vision tab is opened', async () => {
    element.dialogState = { growspaceId: 'gs1' };
    element.open = true;
    await element.updateComplete;
    const tabs = element.shadowRoot?.querySelectorAll('.tab-btn');
    (tabs?.[1] as HTMLElement).click();
    await element.updateComplete;
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(vi.mocked(cameraSlice.getVisionHistory)).toHaveBeenCalledWith('gs1');
  });

  it('renders latest result panel with severity chip and analysis', async () => {
    element.dialogState = { growspaceId: 'gs1' };
    element.open = true;
    await element.updateComplete;
    const tabs = element.shadowRoot?.querySelectorAll('.tab-btn');
    (tabs?.[1] as HTMLElement).click();
    await element.updateComplete;
    await new Promise(resolve => setTimeout(resolve, 0));
    await element.updateComplete;

    const chip = element.shadowRoot?.querySelector('.severity-chip');
    expect(chip?.textContent?.trim().toLowerCase()).toContain('low');
    const analysis = element.shadowRoot?.querySelector('.analysis-text');
    expect(analysis?.textContent).toContain('Plants look healthy');
  });

  it('renders issues as chips', async () => {
    element.dialogState = { growspaceId: 'gs1' };
    element.open = true;
    await element.updateComplete;
    const tabs = element.shadowRoot?.querySelectorAll('.tab-btn');
    (tabs?.[1] as HTMLElement).click();
    await element.updateComplete;
    await new Promise(resolve => setTimeout(resolve, 0));
    await element.updateComplete;

    const chips = element.shadowRoot?.querySelectorAll('.issue-chip');
    expect(chips?.length).toBe(1);
    expect(chips?.[0].textContent?.trim()).toBe('slight_nitrogen_deficiency');
  });

  it('renders recommendations as numbered list', async () => {
    element.dialogState = { growspaceId: 'gs1' };
    element.open = true;
    await element.updateComplete;
    const tabs = element.shadowRoot?.querySelectorAll('.tab-btn');
    (tabs?.[1] as HTMLElement).click();
    await element.updateComplete;
    await new Promise(resolve => setTimeout(resolve, 0));
    await element.updateComplete;

    const recs = element.shadowRoot?.querySelectorAll('.recommendation-item');
    expect(recs?.length).toBe(2);
  });

  it('renders a persisted /local/ snapshot as an image in the result detail view', async () => {
    mockVisionHistory[0].snapshot_paths = [
      '/local/growspace_manager/snapshots/gs1/20240101_120000_cam1_processed.jpg',
    ];
    element.dialogState = { growspaceId: 'gs1' };
    element.open = true;
    await element.updateComplete;
    const tabs = element.shadowRoot?.querySelectorAll('.tab-btn');
    (tabs?.[1] as HTMLElement).click();
    await element.updateComplete;
    await new Promise(resolve => setTimeout(resolve, 0));
    await element.updateComplete;

    const images = element.shadowRoot?.querySelectorAll('.vision-snapshot-grid img.snapshot-image');
    expect(images?.length).toBe(1);
    expect((images?.[0] as HTMLImageElement).getAttribute('src')).toBe(
      '/local/growspace_manager/snapshots/gs1/20240101_120000_cam1_processed.jpg'
    );
  });

  it('renders no snapshot grid when snapshot_paths is empty', async () => {
    // mockVisionHistory[0].snapshot_paths defaults to []
    element.dialogState = { growspaceId: 'gs1' };
    element.open = true;
    await element.updateComplete;
    const tabs = element.shadowRoot?.querySelectorAll('.tab-btn');
    (tabs?.[1] as HTMLElement).click();
    await element.updateComplete;
    await new Promise(resolve => setTimeout(resolve, 0));
    await element.updateComplete;

    const grid = element.shadowRoot?.querySelector('.vision-snapshot-grid');
    expect(grid).toBeNull();
  });

  it('renders no image for raw media-source:// fallback paths', async () => {
    mockVisionHistory[0].snapshot_paths = ['media-source://camera/camera.grow_cam'];
    element.dialogState = { growspaceId: 'gs1' };
    element.open = true;
    await element.updateComplete;
    const tabs = element.shadowRoot?.querySelectorAll('.tab-btn');
    (tabs?.[1] as HTMLElement).click();
    await element.updateComplete;
    await new Promise(resolve => setTimeout(resolve, 0));
    await element.updateComplete;

    const grid = element.shadowRoot?.querySelector('.vision-snapshot-grid');
    expect(grid).toBeNull();
    const images = element.shadowRoot?.querySelectorAll('.vision-snapshot-grid img.snapshot-image');
    expect(images?.length).toBe(0);
  });

  it('renders only /local/ images when mixed with a media-source:// fallback', async () => {
    mockVisionHistory[0].snapshot_paths = [
      '/local/growspace_manager/snapshots/gs1/a_cam1_processed.jpg',
      'media-source://camera/camera.grow_cam',
      '/local/growspace_manager/snapshots/gs1/b_cam2_processed.jpg',
    ];
    element.dialogState = { growspaceId: 'gs1' };
    element.open = true;
    await element.updateComplete;
    const tabs = element.shadowRoot?.querySelectorAll('.tab-btn');
    (tabs?.[1] as HTMLElement).click();
    await element.updateComplete;
    await new Promise(resolve => setTimeout(resolve, 0));
    await element.updateComplete;

    const images = element.shadowRoot?.querySelectorAll('.vision-snapshot-grid img.snapshot-image');
    expect(images?.length).toBe(2);
  });

  it('clicking a vision snapshot opens a full-size lightbox overlay of that image', async () => {
    mockVisionHistory[0].snapshot_paths = [
      '/local/growspace_manager/snapshots/gs1/a_cam1_processed.jpg',
    ];
    element.dialogState = { growspaceId: 'gs1' };
    element.open = true;
    await element.updateComplete;
    const tabs = element.shadowRoot?.querySelectorAll('.tab-btn');
    (tabs?.[1] as HTMLElement).click();
    await element.updateComplete;
    await new Promise(resolve => setTimeout(resolve, 0));
    await element.updateComplete;

    const thumb = element.shadowRoot?.querySelector(
      '.vision-snapshot-grid img.snapshot-image'
    ) as HTMLImageElement;
    thumb.click();
    await element.updateComplete;

    const overlay = element.shadowRoot?.querySelector('.lightbox-backdrop');
    expect(overlay).toBeTruthy();
    const full = overlay?.querySelector('img.lightbox-image') as HTMLImageElement;
    expect(full.getAttribute('src')).toBe(
      '/local/growspace_manager/snapshots/gs1/a_cam1_processed.jpg'
    );
  });

  it('enlarges the clicked image in a multi-camera result', async () => {
    mockVisionHistory[0].snapshot_paths = [
      '/local/growspace_manager/snapshots/gs1/a_cam1_processed.jpg',
      '/local/growspace_manager/snapshots/gs1/b_cam2_processed.jpg',
    ];
    element.dialogState = { growspaceId: 'gs1' };
    element.open = true;
    await element.updateComplete;
    const tabs = element.shadowRoot?.querySelectorAll('.tab-btn');
    (tabs?.[1] as HTMLElement).click();
    await element.updateComplete;
    await new Promise(resolve => setTimeout(resolve, 0));
    await element.updateComplete;

    const thumbs = element.shadowRoot?.querySelectorAll(
      '.vision-snapshot-grid img.snapshot-image'
    );
    (thumbs?.[1] as HTMLImageElement).click();
    await element.updateComplete;

    const full = element.shadowRoot?.querySelector(
      '.lightbox-backdrop img.lightbox-image'
    ) as HTMLImageElement;
    expect(full.getAttribute('src')).toBe(
      '/local/growspace_manager/snapshots/gs1/b_cam2_processed.jpg'
    );
  });

  const openLightbox = async () => {
    mockVisionHistory[0].snapshot_paths = [
      '/local/growspace_manager/snapshots/gs1/a_cam1_processed.jpg',
    ];
    element.dialogState = { growspaceId: 'gs1' };
    element.open = true;
    await element.updateComplete;
    const tabs = element.shadowRoot?.querySelectorAll('.tab-btn');
    (tabs?.[1] as HTMLElement).click();
    await element.updateComplete;
    await new Promise(resolve => setTimeout(resolve, 0));
    await element.updateComplete;
    const thumb = element.shadowRoot?.querySelector(
      '.vision-snapshot-grid img.snapshot-image'
    ) as HTMLImageElement;
    thumb.click();
    await element.updateComplete;
  };

  it('dismisses the lightbox on backdrop click', async () => {
    await openLightbox();
    const backdrop = element.shadowRoot?.querySelector('.lightbox-backdrop') as HTMLElement;
    backdrop.click();
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector('.lightbox-backdrop')).toBeNull();
  });

  it('does not dismiss the lightbox when the enlarged image itself is clicked', async () => {
    await openLightbox();
    const full = element.shadowRoot?.querySelector(
      '.lightbox-backdrop img.lightbox-image'
    ) as HTMLImageElement;
    full.click();
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector('.lightbox-backdrop')).toBeTruthy();
  });

  it('dismisses the lightbox via the explicit close control', async () => {
    await openLightbox();
    const closeBtn = element.shadowRoot?.querySelector('.lightbox-close') as HTMLElement;
    closeBtn.click();
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector('.lightbox-backdrop')).toBeNull();
  });

  it('dismisses the lightbox on Escape and intercepts the key from the dialog', async () => {
    await openLightbox();
    const closeSpy = vi.fn();
    element.addEventListener('close', closeSpy);

    const ev = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    window.dispatchEvent(ev);
    await element.updateComplete;

    expect(element.shadowRoot?.querySelector('.lightbox-backdrop')).toBeNull();
    expect(ev.defaultPrevented).toBe(true);
    expect(closeSpy).not.toHaveBeenCalled();
    expect(element.open).toBe(true);
  });

  it('renders history list with compact rows', async () => {
    element.dialogState = { growspaceId: 'gs1' };
    element.open = true;
    await element.updateComplete;
    const tabs = element.shadowRoot?.querySelectorAll('.tab-btn');
    (tabs?.[1] as HTMLElement).click();
    await element.updateComplete;
    await new Promise(resolve => setTimeout(resolve, 0));
    await element.updateComplete;

    const rows = element.shadowRoot?.querySelectorAll('.history-row');
    expect(rows?.length).toBe(2);
  });

  it('clicking history row updates the result panel', async () => {
    element.dialogState = { growspaceId: 'gs1' };
    element.open = true;
    await element.updateComplete;
    const tabs = element.shadowRoot?.querySelectorAll('.tab-btn');
    (tabs?.[1] as HTMLElement).click();
    await element.updateComplete;
    await new Promise(resolve => setTimeout(resolve, 0));
    await element.updateComplete;

    const rows = element.shadowRoot?.querySelectorAll('.history-row');
    (rows?.[1] as HTMLElement).click();
    await element.updateComplete;

    const analysis = element.shadowRoot?.querySelector('.analysis-text');
    expect(analysis?.textContent).toContain('Good canopy coverage');
  });

  it('shows empty state when no vision history', async () => {
    vi.mocked(cameraSlice.getVisionHistory).mockResolvedValue({ history: [], total: 0 } as any);
    element.dialogState = { growspaceId: 'gs1' };
    element.open = true;
    await element.updateComplete;
    const tabs = element.shadowRoot?.querySelectorAll('.tab-btn');
    (tabs?.[1] as HTMLElement).click();
    await element.updateComplete;
    await new Promise(resolve => setTimeout(resolve, 0));
    await element.updateComplete;

    const empty = element.shadowRoot?.querySelector('.vision-empty-state');
    expect(empty).toBeTruthy();
  });

  it('Run Checkup Now button calls triggerVisionCheckup and refreshes', async () => {
    const mockResult = { ...mockVisionHistory[0] };
    vi.mocked(cameraSlice.triggerVisionCheckup).mockResolvedValue(mockResult as any);
    element.dialogState = { growspaceId: 'gs1' };
    element.open = true;
    await element.updateComplete;
    const tabs = element.shadowRoot?.querySelectorAll('.tab-btn');
    (tabs?.[1] as HTMLElement).click();
    await element.updateComplete;

    const runBtn = element.shadowRoot?.querySelector('.run-checkup-btn');
    (runBtn as HTMLElement).click();
    await element.updateComplete;
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(vi.mocked(cameraSlice.triggerVisionCheckup)).toHaveBeenCalledWith('gs1');
    expect(vi.mocked(cameraSlice.getVisionHistory)).toHaveBeenCalled();
  });

  it('handles error from triggerVisionCheckup', async () => {
    vi.mocked(cameraSlice.triggerVisionCheckup).mockRejectedValue(new Error('No cameras'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    element.dialogState = { growspaceId: 'gs1' };
    element.open = true;
    await element.updateComplete;
    const tabs = element.shadowRoot?.querySelectorAll('.tab-btn');
    (tabs?.[1] as HTMLElement).click();
    await element.updateComplete;

    const runBtn = element.shadowRoot?.querySelector('.run-checkup-btn');
    (runBtn as HTMLElement).click();
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(mockUi.showToast).not.toHaveBeenCalled(); // Action handles toast
    consoleSpy.mockRestore();
  });
});
