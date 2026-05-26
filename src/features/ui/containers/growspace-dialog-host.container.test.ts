/**
 * GrowspaceDialogHost – watering submit handler
 *
 * Verifies that the watering submit handler closes the dialog and shows a
 * success toast on completion, and shows an error toast (instead of a silent
 * console.error) when the API call fails.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { waterPlant as mockWaterPlant } from '../../../slices/plant';
import './growspace-dialog-host.container';
import type { GrowspaceDialogHost } from './growspace-dialog-host.container';

// Mock sliceWaterPlant so no real API calls are made
vi.mock('../../../slices/plant', () => ({
  waterPlant: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMockStore() {
  return {
    ui: {
      closeDialog: vi.fn(),
      showToast: vi.fn(),
      setActiveDialog: vi.fn(),
      $activeDialog: { get: vi.fn().mockReturnValue({ type: 'WATERING' }) },
    },
    actions: {
      ui: {
        showToast: vi.fn(),
        setActiveDialog: vi.fn(),
        closeDialog: vi.fn(),
        refreshData: vi.fn(),
      },
      environment: {
        waterGrowspace: vi.fn().mockResolvedValue(undefined),
      },
    },
    $dialogHostState: { subscribe: vi.fn(() => () => {}), get: vi.fn() },
    refreshData: vi.fn(),
  };
}

function createElement(): GrowspaceDialogHost {
  const el = document.createElement('growspace-dialog-host') as GrowspaceDialogHost;
  (el as any).store = makeMockStore();
  return el;
}

function makeSubmitEvent(detail: Record<string, unknown> = {}): CustomEvent {
  return new CustomEvent('submit-watering', {
    detail: { volume: 2.0, nutrients: [{ name: 'CalMag', concentration: 1.5 }], presetId: '', ...detail },
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GrowspaceDialogHost – _handleWateringSubmit', () => {
  let el: GrowspaceDialogHost;
  let store: ReturnType<typeof makeMockStore>;

  beforeEach(() => {
    vi.clearAllMocks();
    el = createElement();
    store = (el as any).store;
    vi.mocked(mockWaterPlant).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── Success path ──────────────────────────────────────────────────────────

  it('closes the dialog after a successful plant-mode watering', async () => {
    const payload = { mode: 'plant', plantIds: ['plant-1'], growspaceId: 'gs-1' };
    const event = makeSubmitEvent();

    await (el as any)._handleWateringSubmit(event, payload);

    expect(store.ui.closeDialog).toHaveBeenCalledOnce();
  });

  it('shows a success toast after a successful plant-mode watering', async () => {
    const payload = { mode: 'plant', plantIds: ['plant-1'], growspaceId: 'gs-1' };
    const event = makeSubmitEvent();

    await (el as any)._handleWateringSubmit(event, payload);

    expect(store.actions.ui.showToast).toHaveBeenCalledWith('Watering recorded', 'success');
  });

  it('calls waterPlant for each plant id in plant mode', async () => {
    const payload = { mode: 'plant', plantIds: ['p1', 'p2'], growspaceId: 'gs-1' };
    const event = makeSubmitEvent({ volume: 1.5, nutrients: [], presetId: 'preset-x' });

    await (el as any)._handleWateringSubmit(event, payload);

    expect(mockWaterPlant).toHaveBeenCalledTimes(2);
  });

  it('shows success toast after growspace-mode watering', async () => {
    const payload = { mode: 'growspace', growspaceId: 'gs-1' };
    const event = makeSubmitEvent();

    await (el as any)._handleWateringSubmit(event, payload, 'gs-1');

    expect(store.actions.ui.showToast).toHaveBeenCalledWith('Watering recorded', 'success');
    expect(store.ui.closeDialog).toHaveBeenCalledOnce();
  });

  // ── Error path ────────────────────────────────────────────────────────────

  it('shows an error toast when watering fails instead of only logging', async () => {
    vi.mocked(mockWaterPlant).mockRejectedValue(new Error('Network timeout'));
    const payload = { mode: 'plant', plantIds: ['plant-1'] };
    const event = makeSubmitEvent();

    await (el as any)._handleWateringSubmit(event, payload);

    expect(store.actions.ui.showToast).toHaveBeenCalledWith(
      expect.stringContaining('Network timeout'),
      'error'
    );
  });

  it('does not close the dialog when watering fails', async () => {
    vi.mocked(mockWaterPlant).mockRejectedValue(new Error('Server error'));
    const payload = { mode: 'plant', plantIds: ['plant-1'] };
    const event = makeSubmitEvent();

    await (el as any)._handleWateringSubmit(event, payload);

    expect(store.ui.closeDialog).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// IPM submit handler
// ---------------------------------------------------------------------------

function makeMockStoreWithIPM() {
  return {
    ui: {
      closeDialog: vi.fn(),
      showToast: vi.fn(),
    },
    actions: {
      ui: {
        showToast: vi.fn(),
        closeDialog: vi.fn(),
        refreshData: vi.fn(),
      },
      ipm: {
        apply: vi.fn().mockResolvedValue(undefined),
      },
    },
    $dialogHostState: { subscribe: vi.fn(() => () => {}), get: vi.fn() },
    refreshData: vi.fn(),
  };
}

describe('GrowspaceDialogHost – _handleApplyIPM', () => {
  let el: GrowspaceDialogHost;
  let store: ReturnType<typeof makeMockStoreWithIPM>;

  beforeEach(() => {
    vi.clearAllMocks();
    el = document.createElement('growspace-dialog-host') as GrowspaceDialogHost;
    store = makeMockStoreWithIPM();
    (el as any).store = store;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls ipm.apply with preset_id, growspace_id, plant_ids and notes', async () => {
    const event = new CustomEvent('apply-ipm', {
      detail: { presetId: 'preset-1', notes: 'test notes' },
    });

    await (el as any)._handleApplyIPM(event, 'gs-1', ['plant-a', 'plant-b']);

    expect(store.actions.ipm.apply).toHaveBeenCalledWith({
      preset_id: 'preset-1',
      growspace_id: 'gs-1',
      plant_ids: ['plant-a', 'plant-b'],
      notes: 'test notes',
    });
  });

  it('closes the dialog after a successful apply', async () => {
    const event = new CustomEvent('apply-ipm', {
      detail: { presetId: 'preset-1', notes: '' },
    });

    await (el as any)._handleApplyIPM(event, 'gs-1', []);

    expect(store.ui.closeDialog).toHaveBeenCalledOnce();
  });

  it('shows a success toast after a successful apply', async () => {
    const event = new CustomEvent('apply-ipm', {
      detail: { presetId: 'preset-1', notes: '' },
    });

    await (el as any)._handleApplyIPM(event, 'gs-1', []);

    expect(store.actions.ui.showToast).toHaveBeenCalledWith('IPM treatment applied', 'success');
  });

  it('shows an error toast when apply fails instead of only logging', async () => {
    store.actions.ipm.apply = vi.fn().mockRejectedValue(new Error('API down'));
    const event = new CustomEvent('apply-ipm', {
      detail: { presetId: 'preset-1', notes: '' },
    });

    await (el as any)._handleApplyIPM(event, 'gs-1', []);

    expect(store.actions.ui.showToast).toHaveBeenCalledWith(
      expect.stringContaining('API down'),
      'error'
    );
  });

  it('does not close the dialog when apply fails', async () => {
    store.actions.ipm.apply = vi.fn().mockRejectedValue(new Error('Server error'));
    const event = new CustomEvent('apply-ipm', {
      detail: { presetId: 'preset-1', notes: '' },
    });

    await (el as any)._handleApplyIPM(event, 'gs-1', []);

    expect(store.ui.closeDialog).not.toHaveBeenCalled();
  });
});
