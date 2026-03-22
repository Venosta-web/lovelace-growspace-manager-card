import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SnapshotsDialog } from '../../../src/dialogs/snapshots-dialog';
import type { VisionCheckupResult } from '../../../src/lib/types/dialog';
import '../../../src/dialogs/snapshots-dialog';

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
    let mockDataService: any;
    let mockUi: any;

    beforeEach(async () => {
        mockDataService = {
            getSnapshots: vi.fn(),
            captureSnapshot: vi.fn(),
        };

        mockUi = {
            closeDialog: vi.fn(),
            showToast: vi.fn(),
        };

        mockStore = {
            dataService: mockDataService,
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
    });

    afterEach(() => {
        if (element && element.isConnected) {
            document.body.removeChild(element);
        }
    });

    it('should show loading state when fetching snapshots', async () => {
        mockDataService.getSnapshots.mockReturnValue(new Promise(() => { })); // Never resolves
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
        mockDataService.getSnapshots.mockResolvedValue({ snapshots: mockSnapshots });

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
        mockDataService.getSnapshots.mockResolvedValue({ snapshots: [] });

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
        mockDataService.getSnapshots.mockRejectedValue(new Error('Fetch Failed'));

        element.dialogState = { growspaceId: 'gs1' };
        element.open = true;
        await element.updateComplete;
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(mockUi.showToast).toHaveBeenCalledWith('Failed to load snapshots', 'error');
        consoleSpy.mockRestore();
    });

    it('should capture snapshot and refresh the list', async () => {
        mockDataService.captureSnapshot.mockResolvedValue({});
        mockDataService.getSnapshots.mockResolvedValue({ snapshots: [] });

        element.dialogState = { growspaceId: 'gs1' };
        element.open = true;
        await element.updateComplete;

        const captureBtn = element.shadowRoot?.querySelector('md3-button');
        (captureBtn as HTMLElement).click();

        // Wait for Lit to render the capturing state
        await element.updateComplete;
        expect(element.shadowRoot?.innerHTML).toContain('Capturing...');

        await new Promise(resolve => setTimeout(resolve, 0));

        expect(mockDataService.captureSnapshot).toHaveBeenCalledWith('gs1');
        expect(mockUi.showToast).toHaveBeenCalledWith('Snapshot captured successfully', 'success');
        expect(mockDataService.getSnapshots).toHaveBeenCalledTimes(2); // Initial open + after capture
    });

    it('should handle capture error "no_cameras"', async () => {
        mockDataService.captureSnapshot.mockRejectedValue({ code: 'no_cameras' });

        element.dialogState = { growspaceId: 'gs1' };
        element.open = true;
        await element.updateComplete;

        const captureBtn = element.shadowRoot?.querySelector('md3-button');
        (captureBtn as HTMLElement).click();
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(mockUi.showToast).toHaveBeenCalledWith('No cameras configured for this growspace.', 'error');
    });

    it('should handle generic capture error', async () => {
        mockDataService.captureSnapshot.mockRejectedValue(new Error('Fail'));

        element.dialogState = { growspaceId: 'gs1' };
        element.open = true;
        await element.updateComplete;

        const captureBtn = element.shadowRoot?.querySelector('md3-button');
        (captureBtn as HTMLElement).click();
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(mockUi.showToast).toHaveBeenCalledWith('Failed to capture snapshot', 'error');
    });

    it('should refresh when clicking refresh button', async () => {
        element.dialogState = { growspaceId: 'gs1' };
        element.open = true;
        await element.updateComplete;

        mockDataService.getSnapshots.mockClear();

        const iconBtns = element.shadowRoot?.querySelectorAll('ha-icon-button');
        const refreshBtn = iconBtns?.[0];
        (refreshBtn as HTMLElement).click();

        expect(mockDataService.getSnapshots).toHaveBeenCalledWith('gs1');
    });

    it('should close dialog when clicking close button', async () => {
        element.open = true;
        await element.updateComplete;

        const closeSpy = vi.fn();
        element.addEventListener('close', closeSpy);

        const iconBtns = element.shadowRoot?.querySelectorAll('ha-icon-button');
        const closeBtn = iconBtns?.[1];
        (closeBtn as HTMLElement).click();

        expect(closeSpy).toHaveBeenCalled();
    });

    it('should close dialog when ha-dialog fires closed event', async () => {
        element.open = true;
        await element.updateComplete;

        const closeSpy = vi.fn();
        element.addEventListener('close', closeSpy);

        const dialog = element.shadowRoot?.querySelector('ha-dialog');
        dialog?.dispatchEvent(new CustomEvent('closed'));

        expect(closeSpy).toHaveBeenCalled();
    });

    it('should re-fetch if growspaceId changes while open', async () => {
        element.dialogState = { growspaceId: 'gs1' };
        element.open = true;
        await element.updateComplete;

        mockDataService.getSnapshots.mockClear();
        element.dialogState = { growspaceId: 'gs2' };
        await element.updateComplete;

        expect(mockDataService.getSnapshots).toHaveBeenCalledWith('gs2');
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
  let mockDataService: any;
  let mockUi: any;
  let mockVisionHistory: VisionCheckupResult[];

  beforeEach(async () => {
    mockDataService = {
      getSnapshots: vi.fn().mockResolvedValue({ snapshots: [] }),
      captureSnapshot: vi.fn(),
    };

    mockUi = {
      closeDialog: vi.fn(),
      showToast: vi.fn(),
    };

    mockStore = {
      dataService: mockDataService,
      ui: mockUi,
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
    mockDataService.getVisionHistory = vi.fn().mockResolvedValue({ history: mockVisionHistory, total: 2 });
    mockDataService.triggerVisionCheckup = vi.fn();

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
    expect(mockDataService.getVisionHistory).toHaveBeenCalledWith('gs1');
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
    mockDataService.getVisionHistory = vi.fn().mockResolvedValue({ history: [], total: 0 });
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
    mockDataService.triggerVisionCheckup = vi.fn().mockResolvedValue(mockResult);
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

    expect(mockDataService.triggerVisionCheckup).toHaveBeenCalledWith('gs1');
    expect(mockDataService.getVisionHistory).toHaveBeenCalled();
  });

  it('handles error from triggerVisionCheckup', async () => {
    mockDataService.triggerVisionCheckup = vi.fn().mockRejectedValue(new Error('No cameras'));
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

    expect(mockUi.showToast).toHaveBeenCalledWith('Failed to run vision checkup', 'error');
    consoleSpy.mockRestore();
  });
});
