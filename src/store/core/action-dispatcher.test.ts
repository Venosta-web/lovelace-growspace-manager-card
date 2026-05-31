import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { atom } from 'nanostores';
import { ActionDispatcher } from './action-dispatcher';
import { ViewMode } from '../../constants';
import { optimisticDeletedPlantIds$ } from '../../slices/grid';

function makeStore() {
  const dataService = new Proxy(
    {},
    {
      get(target: Record<string, unknown>, prop: string) {
        if (!(prop in target)) target[prop] = vi.fn().mockResolvedValue(undefined);
        return target[prop];
      },
    }
  );

  const $selectedPlants = atom<Set<string>>(new Set());
  const $viewMode = atom<ViewMode>(ViewMode.STANDARD);
  const $selectedDevice = atom<string | null>(null);

  const ui = {
    $selectedPlants,
    $viewMode,
    showToast: vi.fn(),
    clearPlantSelection: vi.fn(),
    setEditMode: vi.fn(),
    setViewMode: vi.fn(),
    setActiveDialog: vi.fn(),
    deselectPlants: vi.fn(),
    $activeDialog: atom({ type: 'NONE' }),
  };

  const data = {};

  const grid = { $selectedDevice };

  const history = { toggleEnvGraph: vi.fn().mockReturnValue(true) };

  const refreshData = vi.fn().mockResolvedValue(undefined);
  const closeDialog = vi.fn();

  const context = {
    dataService,
    data,
    ui,
    grid,
    undoRedoManager: { pushAction: vi.fn() } as never,
    optimisticManager: {} as never,
    closeDialog,
    refreshData,
  };

  const store = {
    context,
    history,
    undo: vi.fn().mockResolvedValue(undefined),
    redo: vi.fn().mockResolvedValue(undefined),
    refreshData,
    canUndo: false,
    canRedo: false,
  };

  return { store, dispatcher: new ActionDispatcher(store as never), ui, data, grid, history, dataService };
}

// ─── plant.confirmAdd ────────────────────────────────────────────────────────

describe('plant.confirmAdd', () => {
  it('does nothing when strain is empty', async () => {
    const { dispatcher, ui } = makeStore();
    await dispatcher.plant.confirmAdd({ strain: '', row: 0, col: 0 } as never);
    // confirmAddPlant is never reached — no toast of any kind should appear
    expect(ui.showToast).not.toHaveBeenCalled();
  });

  it('calls confirmAddPlant when strain is set', async () => {
    const { dispatcher, ui } = makeStore();
    // $selectedDevice is null → confirmAddPlant surfaces 'No growspace selected'
    // proving the function was actually invoked
    await dispatcher.plant.confirmAdd({ strain: 'Blue Dream', row: 1, col: 2 } as never);
    expect(ui.showToast).toHaveBeenCalledWith('No growspace selected', 'error');
  });
});

afterEach(() => {
  optimisticDeletedPlantIds$.set(new Set());
});

// ─── plant.batchAction ───────────────────────────────────────────────────────

describe('plant.batchAction', () => {
  let store: ReturnType<typeof makeStore>;

  beforeEach(() => {
    store = makeStore();
  });

  it('does nothing when entityIds is empty', async () => {
    await store.dispatcher.plant.batchAction('remove', []);
    expect((store.dataService as Record<string, ReturnType<typeof vi.fn>>).callService).not.toHaveBeenCalled();
  });

  it('adds optimistic deletes for remove action before the call', async () => {
    await store.dispatcher.plant.batchAction('remove', ['p1', 'p2']);
    expect(optimisticDeletedPlantIds$.get().has('p1')).toBe(true);
    expect(optimisticDeletedPlantIds$.get().has('p2')).toBe(true);
  });

  it('calls callService with correct params', async () => {
    await store.dispatcher.plant.batchAction('transition', ['p1'], { foo: 'bar' });
    expect((store.dataService as Record<string, ReturnType<typeof vi.fn>>).callService).toHaveBeenCalledWith(
      'growspace_manager',
      'batch_action',
      { entity_ids: ['p1'], action: 'transition', data: { foo: 'bar' } }
    );
  });

  it('shows success toast, clears selection, exits edit mode and refreshes on success', async () => {
    await store.dispatcher.plant.batchAction('harvest', ['p1', 'p2']);
    expect(store.ui.showToast).toHaveBeenCalledWith(
      'Batch harvest completed for 2 plant(s)',
      'success'
    );
    expect(store.ui.clearPlantSelection).toHaveBeenCalled();
    expect(store.ui.setEditMode).toHaveBeenCalledWith(false);
    expect(store.store.refreshData).toHaveBeenCalled();
  });

  it('shows error toast on failure', async () => {
    (store.dataService as Record<string, ReturnType<typeof vi.fn>>).callService = vi
      .fn()
      .mockRejectedValue(new Error('network error'));

    await store.dispatcher.plant.batchAction('transition', ['p1']);
    expect(store.ui.showToast).toHaveBeenCalledWith(
      'Batch transition failed: network error',
      'error'
    );
  });

  it('rolls back optimistic deletes on failure for remove action', async () => {
    (store.dataService as Record<string, ReturnType<typeof vi.fn>>).callService = vi
      .fn()
      .mockRejectedValue(new Error('fail'));

    await store.dispatcher.plant.batchAction('remove', ['p1', 'p2']);
    expect(optimisticDeletedPlantIds$.get().has('p1')).toBe(false);
    expect(optimisticDeletedPlantIds$.get().has('p2')).toBe(false);
  });

  it('does not roll back optimistic deletes on failure for non-remove action', async () => {
    (store.dataService as Record<string, ReturnType<typeof vi.fn>>).callService = vi
      .fn()
      .mockRejectedValue(new Error('fail'));

    await store.dispatcher.plant.batchAction('harvest', ['p1']);
    expect(optimisticDeletedPlantIds$.get().has('p1')).toBe(false);
  });
});

// ─── ui.deleteSelectedPlants ─────────────────────────────────────────────────

describe('ui.deleteSelectedPlants', () => {
  it('does nothing when selection is empty', async () => {
    const { dispatcher, dataService } = makeStore();
    await dispatcher.ui.deleteSelectedPlants();
    // handleDeletePlant calls dataService.removePlant — should not happen with empty selection
    expect((dataService as Record<string, ReturnType<typeof vi.fn>>).removePlant).not.toHaveBeenCalled();
  });

  it('calls handleDeletePlant with selected ids', async () => {
    const { dispatcher, ui, dataService } = makeStore();
    ui.$selectedPlants.set(new Set(['p1', 'p2']));
    await dispatcher.ui.deleteSelectedPlants();
    // handleDeletePlant calls dataService.removePlant for each id
    const removePlant = (dataService as Record<string, ReturnType<typeof vi.fn>>).removePlant;
    expect(removePlant).toHaveBeenCalledWith('p1');
    expect(removePlant).toHaveBeenCalledWith('p2');
  });
});

// ─── ui.toggleEnvGraph ───────────────────────────────────────────────────────

describe('ui.toggleEnvGraph', () => {
  it('opens crop steering dialog for crop_steering metric', () => {
    const { dispatcher, grid, ui } = makeStore();
    grid.$selectedDevice.set('gs-1');
    dispatcher.ui.toggleEnvGraph('crop_steering');
    // openCropSteeringDialog calls ctx.ui.setActiveDialog
    expect(ui.setActiveDialog).toHaveBeenCalledWith({
      type: 'CROP_STEERING',
      payload: { growspaceId: 'gs-1' },
    });
  });

  it('does not open crop steering dialog when no device is selected', () => {
    const { dispatcher, ui } = makeStore();
    dispatcher.ui.toggleEnvGraph('crop_steering');
    expect(ui.setActiveDialog).not.toHaveBeenCalled();
  });

  it('does nothing when store.history is falsy', () => {
    const { store, dispatcher } = makeStore();
    (store as Record<string, unknown>).history = null;
    expect(() => dispatcher.ui.toggleEnvGraph('temperature')).not.toThrow();
  });

  it('toggles history graph for regular metrics', () => {
    const { dispatcher, store } = makeStore();
    dispatcher.ui.toggleEnvGraph('temperature');
    expect(store.history.toggleEnvGraph).toHaveBeenCalledWith('temperature');
  });

  it('switches to STANDARD view when graph becomes active in HEADER mode', () => {
    const { dispatcher, store, ui } = makeStore();
    ui.$viewMode.set(ViewMode.HEADER);
    store.history.toggleEnvGraph.mockReturnValue(true);
    dispatcher.ui.toggleEnvGraph('temperature');
    expect(ui.setViewMode).toHaveBeenCalledWith(ViewMode.STANDARD);
  });

  it('does not switch view when graph becomes inactive', () => {
    const { dispatcher, store, ui } = makeStore();
    ui.$viewMode.set(ViewMode.HEADER);
    store.history.toggleEnvGraph.mockReturnValue(false);
    dispatcher.ui.toggleEnvGraph('temperature');
    expect(ui.setViewMode).not.toHaveBeenCalled();
  });
});

// ─── library.import ──────────────────────────────────────────────────────────

describe('library.import', () => {
  it('shows error toast when content is valid JSON but not an array', async () => {
    const { dispatcher, ui } = makeStore();
    const file = new File([JSON.stringify({ strain: 'A' })], 'single.json');
    await dispatcher.library.import(file, false);
    expect(ui.showToast).toHaveBeenCalledWith(expect.stringContaining('Import failed'), 'error');
  });

  it('shows error toast when JSON is not an array', async () => {
    const { dispatcher, ui } = makeStore();
    const file = new File([JSON.stringify({ not: 'array' })], 'bad.json');

    await dispatcher.library.import(file, false);

    expect(ui.showToast).toHaveBeenCalledWith(
      expect.stringContaining('Import failed'),
      'error'
    );
  });

  it('shows error toast when JSON is malformed', async () => {
    const { dispatcher, ui } = makeStore();
    const file = new File(['not json at all'], 'bad.json');

    await dispatcher.library.import(file, false);

    expect(ui.showToast).toHaveBeenCalledWith(
      expect.stringContaining('Import failed'),
      'error'
    );
  });
});

// ─── delegation smoke tests ───────────────────────────────────────────────────
// ESM browser mode prevents vi.spyOn on action module exports; these tests
// exercise the thin wiring via observable side-effects instead.

describe('delegation smoke tests', () => {
  it('history.undo delegates to store.undo', async () => {
    const { dispatcher, store } = makeStore();
    await dispatcher.history.undo();
    expect(store.undo).toHaveBeenCalled();
  });

  it('history.redo delegates to store.redo', async () => {
    const { dispatcher, store } = makeStore();
    await dispatcher.history.redo();
    expect(store.redo).toHaveBeenCalled();
  });

  it('history.canUndo reflects store.canUndo', () => {
    const { store, dispatcher } = makeStore();
    store.canUndo = true;
    expect(dispatcher.history.canUndo()).toBe(true);
  });

  it('history.canRedo reflects store.canRedo', () => {
    const { store, dispatcher } = makeStore();
    store.canRedo = true;
    expect(dispatcher.history.canRedo()).toBe(true);
  });

  it('ui.refreshData delegates to store.refreshData', () => {
    const { dispatcher, store } = makeStore();
    dispatcher.ui.refreshData();
    expect(store.refreshData).toHaveBeenCalled();
  });
});
