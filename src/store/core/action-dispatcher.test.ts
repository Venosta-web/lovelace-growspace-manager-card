import { describe, it, expect, beforeEach, vi } from 'vitest';
import { atom } from 'nanostores';
import { ActionDispatcher } from './action-dispatcher';
import { ViewMode } from '../../constants';
import { activeDialog$, __resetUiSliceForTests } from '../../slices/ui';

// library.import loops the Strain slice's addStrain. Stub it so the import
// success path resolves without a live hass (callService) connection.
vi.mock('../../slices/strain', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../slices/strain')>();
  return { ...actual, addStrain: vi.fn().mockResolvedValue(undefined) };
});

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
    $isEditMode: atom<boolean>(false),
    $focusedPlantIndex: atom<number>(-1),
    showToast: vi.fn(),
    clearPlantSelection: vi.fn(),
    setEditMode: vi.fn(),
    setViewMode: vi.fn(),
    setActiveDialog: vi.fn(),
    deselectPlants: vi.fn(),
    setPendingDeepLink: vi.fn(),
    closeDialog: vi.fn(),
    togglePlantSelection: vi.fn(),
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
    closeDialog,
    refreshData,
  };

  const store = {
    context,
    history,
    refreshData,
  };

  return { store, dispatcher: new ActionDispatcher(store as never), ui, data, grid, history, dataService };
}

// ─── ui.toggleEnvGraph ───────────────────────────────────────────────────────

describe('ui.toggleEnvGraph', () => {
  beforeEach(() => __resetUiSliceForTests());

  it('opens crop steering dialog for crop_steering metric', () => {
    const { dispatcher, grid } = makeStore();
    grid.$selectedDevice.set('gs-1');
    dispatcher.ui.toggleEnvGraph('crop_steering');
    // openCropSteeringDialog (slices/ui) writes the activeDialog$ atom.
    expect(activeDialog$.get()).toEqual({
      type: 'CROP_STEERING',
      payload: { growspaceId: 'gs-1' },
    });
  });

  it('does not open crop steering dialog when no device is selected', () => {
    const { dispatcher } = makeStore();
    dispatcher.ui.toggleEnvGraph('crop_steering');
    expect(activeDialog$.get()).toEqual({ type: 'NONE' });
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

  it('uses Unknown error fallback when a non-Error is thrown during import', async () => {
    const { dispatcher, ui } = makeStore();
    // Mock file.text() to throw a non-Error value
    const file = { text: () => Promise.reject('not an error object') } as unknown as File;
    await dispatcher.library.import(file, false);
    expect(ui.showToast).toHaveBeenCalledWith('Import failed: Unknown error', 'error');
  });
});

// ─── delegation smoke tests ───────────────────────────────────────────────────
// ESM browser mode prevents vi.spyOn on action module exports; these tests
// exercise the thin wiring via observable side-effects instead.

// ─── library delegation ───────────────────────────────────────────────────────

describe('library delegation', () => {
  it('updateNutrientStock calls dataService.updateNutrientStock', async () => {
    const { dispatcher, dataService } = makeStore();
    await dispatcher.library.updateNutrientStock('n1', 'CalMag', 500, 1000);
    expect((dataService as Record<string, ReturnType<typeof vi.fn>>).updateNutrientStock).toHaveBeenCalledWith('n1', 'CalMag', 500, 1000);
  });

  it('removeNutrientStock calls dataService.removeNutrientStock', async () => {
    const { dispatcher, dataService } = makeStore();
    await dispatcher.library.removeNutrientStock('n1');
    expect((dataService as Record<string, ReturnType<typeof vi.fn>>).removeNutrientStock).toHaveBeenCalledWith('n1');
  });

  it('fetchECRampCurves calls dataService.fetchECRampCurves', async () => {
    const { dispatcher, dataService } = makeStore();
    await dispatcher.library.fetchECRampCurves();
    expect((dataService as Record<string, ReturnType<typeof vi.fn>>).fetchECRampCurves).toHaveBeenCalled();
  });

  it('saveECRampCurve calls dataService.saveECRampCurve', async () => {
    const { dispatcher, dataService } = makeStore();
    await dispatcher.library.saveECRampCurve({ id: 'c1' } as never);
    expect((dataService as Record<string, ReturnType<typeof vi.fn>>).saveECRampCurve).toHaveBeenCalledWith(expect.objectContaining({ id: 'c1' }));
  });

  it('removeECRampCurve calls dataService.removeECRampCurve', async () => {
    const { dispatcher, dataService } = makeStore();
    await dispatcher.library.removeECRampCurve('c1');
    expect((dataService as Record<string, ReturnType<typeof vi.fn>>).removeECRampCurve).toHaveBeenCalledWith('c1');
  });

  it('import shows success toast for valid array JSON', async () => {
    const { dispatcher, ui } = makeStore();
    const file = new File([JSON.stringify([{ strain: 'Blue Dream' }])], 'strains.json');
    await dispatcher.library.import(file, false);
    expect(ui.showToast).toHaveBeenCalledWith('Library imported successfully', 'success');
  });
});


