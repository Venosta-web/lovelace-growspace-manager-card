import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { GrowspaceStore } from '../store/core/growspace-store';
import { openBatchCloneDialog } from '../store/ui/ui-actions';
import { GrowspaceUIStore } from '../store/ui/ui-store';
import { BatchCloneDialog } from './batch-clone-dialog';
import './batch-clone-dialog';

// ---------------------------------------------------------------------------
// openBatchCloneDialog action
// ---------------------------------------------------------------------------

describe('openBatchCloneDialog', () => {
  let ui: GrowspaceUIStore;
  let ctx: { ui: GrowspaceUIStore };

  beforeEach(() => {
    ui = new GrowspaceUIStore();
    ctx = { ui } as any;
  });

  it('opens BATCH_CLONE dialog with selected plant IDs', () => {
    ui.$selectedPlants.set(new Set(['plant-1', 'plant-2', 'plant-3']));

    openBatchCloneDialog(ctx as any);

    const active = ui.$activeDialog.get();
    expect(active.type).toBe('BATCH_CLONE');
    if (active.type === 'BATCH_CLONE') {
      expect(active.payload.plantIds).toHaveLength(3);
      expect(active.payload.plantIds).toContain('plant-1');
      expect(active.payload.plantIds).toContain('plant-2');
      expect(active.payload.plantIds).toContain('plant-3');
    }
  });

  it('does nothing when no plants are selected', () => {
    ui.$selectedPlants.set(new Set());

    openBatchCloneDialog(ctx as any);

    expect(ui.$activeDialog.get().type).toBe('NONE');
  });

  it('opens dialog with a single selected plant', () => {
    ui.$selectedPlants.set(new Set(['solo-plant']));

    openBatchCloneDialog(ctx as any);

    const active = ui.$activeDialog.get();
    expect(active.type).toBe('BATCH_CLONE');
    if (active.type === 'BATCH_CLONE') {
      expect(active.payload.plantIds).toEqual(['solo-plant']);
    }
  });
});

// ---------------------------------------------------------------------------
// GrowspaceStore.openBatchCloneDialog
// ---------------------------------------------------------------------------

describe('GrowspaceStore.openBatchCloneDialog', () => {
  let store: GrowspaceStore;

  beforeEach(() => {
    store = new GrowspaceStore();
  });

  it('opens BATCH_CLONE dialog via store method', () => {
    store.ui.$selectedPlants.set(new Set(['p1', 'p2']));

    store.openBatchCloneDialog();

    const active = store.ui.$activeDialog.get();
    expect(active.type).toBe('BATCH_CLONE');
    if (active.type === 'BATCH_CLONE') {
      expect(active.payload.plantIds).toContain('p1');
      expect(active.payload.plantIds).toContain('p2');
    }
  });

  it('does not open dialog when no plants are selected', () => {
    store.openBatchCloneDialog();

    expect(store.ui.$activeDialog.get().type).toBe('NONE');
  });

  it('dialog payload contains all selected plants', () => {
    const ids = ['alpha', 'beta', 'gamma', 'delta'];
    store.ui.$selectedPlants.set(new Set(ids));

    store.openBatchCloneDialog();

    const active = store.ui.$activeDialog.get();
    if (active.type === 'BATCH_CLONE') {
      expect(active.payload.plantIds).toHaveLength(ids.length);
      for (const id of ids) {
        expect(active.payload.plantIds).toContain(id);
      }
    }
  });

  it('reflects dialogHostState after opening', () => {
    store.ui.$selectedPlants.set(new Set(['p1']));

    store.openBatchCloneDialog();

    expect(store.$dialogHostState.get().activeDialog.type).toBe('BATCH_CLONE');
  });
});

// ---------------------------------------------------------------------------
// BatchCloneDialog component
// ---------------------------------------------------------------------------

const mockTags = ['ha-dialog', 'ha-svg-icon', 'md3-select'];
for (const tag of mockTags) {
  if (!customElements.get(tag)) {
    customElements.define(tag, class extends HTMLElement {});
  }
}

function makePlant(plantId: string) {
  return {
    entity_id: `sensor.${plantId}`,
    attributes: {
      plant_id: plantId,
      strain: 'Test Strain',
      phenotype: 'A',
    },
  };
}

function makeMockStore(plantIds: string[] = [], overrides: Record<string, unknown> = {}) {
  const plants = plantIds.map(makePlant);
  return {
    handleTakeClone: vi.fn().mockResolvedValue(true),
    showToast: vi.fn(),
    data: {
      $devices: {
        get: vi.fn().mockReturnValue([{ deviceId: 'gs-1', plants }]),
      },
    },
    ...overrides,
  };
}

function createElement(
  mockStore = makeMockStore(),
  growspaceOptions: Record<string, string> = { 'gs-1': 'Veg Tent', 'gs-2': 'Clone Tent' }
) {
  const el = document.createElement('batch-clone-dialog') as BatchCloneDialog;
  (el as any).store = mockStore;
  (el as any).growspaceOptions = growspaceOptions;
  return el;
}

describe('BatchCloneDialog – _resetForm', () => {
  afterEach(() => vi.restoreAllMocks());

  it('resets numClones, isSubmitting and progress to defaults', () => {
    const el = createElement();
    (el as any)._numClones = 5;
    (el as any)._isSubmitting = true;
    (el as any)._progress = 80;

    (el as any)._resetForm();

    expect((el as any)._numClones).toBe(1);
    expect((el as any)._isSubmitting).toBe(false);
    expect((el as any)._progress).toBe(0);
  });

  it('auto-selects the first growspace when none is selected', () => {
    const el = createElement();
    (el as any)._targetGrowspaceId = '';

    (el as any)._resetForm();

    expect((el as any)._targetGrowspaceId).toBe('gs-1');
  });
});

describe('BatchCloneDialog – _close', () => {
  afterEach(() => vi.restoreAllMocks());

  it('dispatches a "close" CustomEvent', () => {
    const el = createElement();
    const events: Event[] = [];
    el.addEventListener('close', (e) => events.push(e));

    (el as any)._close();

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('close');
  });
});

describe('BatchCloneDialog – _submit', () => {
  afterEach(() => vi.restoreAllMocks());

  it('does nothing when store is missing', async () => {
    const el = createElement();
    (el as any).store = null;
    (el as any).dialogState = { plantIds: ['p1'] };

    await (el as any)._submit();

    expect((el as any)._isSubmitting).toBe(false);
  });

  it('does nothing when dialogState is missing', async () => {
    const el = createElement();
    (el as any).dialogState = undefined;

    await (el as any)._submit();

    expect((el as any)._isSubmitting).toBe(false);
  });

  it('does nothing when plantIds is empty', async () => {
    const mockStore = makeMockStore();
    const el = createElement(mockStore);
    (el as any).dialogState = { plantIds: [] };
    (el as any)._targetGrowspaceId = 'gs-1';

    await (el as any)._submit();

    expect(mockStore.handleTakeClone).not.toHaveBeenCalled();
  });

  it('does nothing when no target growspace is set', async () => {
    const mockStore = makeMockStore(['plant-1']);
    const el = createElement(mockStore);
    (el as any).dialogState = { plantIds: ['plant-1'] };
    (el as any)._targetGrowspaceId = '';

    await (el as any)._submit();

    expect(mockStore.handleTakeClone).not.toHaveBeenCalled();
  });

  it('calls handleTakeClone once per selected plant', async () => {
    const mockStore = makeMockStore(['plant-1', 'plant-2']);
    const el = createElement(mockStore);
    (el as any).dialogState = { plantIds: ['plant-1', 'plant-2'] };
    (el as any)._targetGrowspaceId = 'gs-2';
    (el as any)._numClones = 1;

    await (el as any)._submit();

    expect(mockStore.handleTakeClone).toHaveBeenCalledTimes(2);
  });

  it('passes numClones and targetGrowspaceId to handleTakeClone', async () => {
    const mockStore = makeMockStore(['plant-1']);
    const el = createElement(mockStore);
    (el as any).dialogState = { plantIds: ['plant-1'] };
    (el as any)._targetGrowspaceId = 'gs-2';
    (el as any)._numClones = 3;

    await (el as any)._submit();

    expect(mockStore.handleTakeClone).toHaveBeenCalledWith(
      expect.objectContaining({ attributes: expect.objectContaining({ plant_id: 'plant-1' }) }),
      3,
      'gs-2'
    );
  });

  it('shows success toast when all clones succeed', async () => {
    const mockStore = makeMockStore(['plant-1', 'plant-2']);
    const el = createElement(mockStore);
    (el as any).dialogState = { plantIds: ['plant-1', 'plant-2'] };
    (el as any)._targetGrowspaceId = 'gs-2';
    (el as any)._numClones = 2;

    await (el as any)._submit();

    expect(mockStore.showToast).toHaveBeenCalledWith('Created 4 clone(s) successfully', 'success');
  });

  it('shows error toast when some clones fail', async () => {
    const mockStore = makeMockStore(['plant-1', 'plant-2']);
    mockStore.handleTakeClone = vi.fn()
      .mockResolvedValueOnce(true)
      .mockRejectedValueOnce(new Error('clone error'));
    const el = createElement(mockStore);
    (el as any).dialogState = { plantIds: ['plant-1', 'plant-2'] };
    (el as any)._targetGrowspaceId = 'gs-2';
    (el as any)._numClones = 1;

    await (el as any)._submit();

    expect(mockStore.showToast).toHaveBeenCalledWith(
      expect.stringContaining('1 error'),
      'error'
    );
  });

  it('counts plant as error when not found in any device', async () => {
    const mockStore = makeMockStore([]);
    const el = createElement(mockStore);
    (el as any).dialogState = { plantIds: ['ghost-plant'] };
    (el as any)._targetGrowspaceId = 'gs-2';

    await (el as any)._submit();

    expect(mockStore.handleTakeClone).not.toHaveBeenCalled();
    expect(mockStore.showToast).toHaveBeenCalledWith(
      expect.stringContaining('1 error'),
      'error'
    );
  });

  it('reaches 100% progress after all plants are processed', async () => {
    const mockStore = makeMockStore(['p1', 'p2', 'p3']);
    const el = createElement(mockStore);
    (el as any).dialogState = { plantIds: ['p1', 'p2', 'p3'] };
    (el as any)._targetGrowspaceId = 'gs-1';
    (el as any)._numClones = 1;

    await (el as any)._submit();

    expect((el as any)._progress).toBe(100);
  });

  it('dispatches close event after submission completes', async () => {
    const mockStore = makeMockStore(['p1']);
    const el = createElement(mockStore);
    (el as any).dialogState = { plantIds: ['p1'] };
    (el as any)._targetGrowspaceId = 'gs-1';
    const events: Event[] = [];
    el.addEventListener('close', (e) => events.push(e));

    await (el as any)._submit();

    expect(events).toHaveLength(1);
  });

  it('resets isSubmitting to false after completion', async () => {
    const mockStore = makeMockStore(['p1']);
    const el = createElement(mockStore);
    (el as any).dialogState = { plantIds: ['p1'] };
    (el as any)._targetGrowspaceId = 'gs-1';

    await (el as any)._submit();

    expect((el as any)._isSubmitting).toBe(false);
  });
});
