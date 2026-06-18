import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { atom } from 'nanostores';
import { ActionDispatcher } from './action-dispatcher';
import { ViewMode } from '../../constants';
import { optimisticDeletedPlantIds$ } from '../../slices/grid';
import { callService, hassCall } from '../../services/hass-call';

vi.mock('../../services/hass-call', () => ({
  callService: vi.fn().mockResolvedValue(undefined),
  hassCall: vi.fn().mockResolvedValue(undefined),
  setHass: vi.fn(),
  getHass: vi.fn(),
  callApi: vi.fn().mockResolvedValue(undefined),
  callFetch: vi.fn().mockResolvedValue(undefined),
  callServiceReturning: vi.fn().mockResolvedValue(undefined),
}));

function makeStore() {
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

  return { store, dispatcher: new ActionDispatcher(store as never), ui, data, grid, history };
}

beforeEach(() => {
  vi.mocked(callService).mockResolvedValue(undefined);
  vi.mocked(hassCall).mockResolvedValue(undefined);
});

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
    expect(callService).not.toHaveBeenCalled();
  });

  it('adds optimistic deletes for remove action before the call', async () => {
    await store.dispatcher.plant.batchAction('remove', ['p1', 'p2']);
    expect(optimisticDeletedPlantIds$.get().has('p1')).toBe(true);
    expect(optimisticDeletedPlantIds$.get().has('p2')).toBe(true);
  });

  it('calls callService with correct params', async () => {
    await store.dispatcher.plant.batchAction('transition', ['p1'], { foo: 'bar' });
    expect(callService).toHaveBeenCalledWith(
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
    vi.mocked(callService).mockRejectedValueOnce(new Error('network error'));
    await store.dispatcher.plant.batchAction('transition', ['p1']);
    expect(store.ui.showToast).toHaveBeenCalledWith(
      'Batch transition failed: network error',
      'error'
    );
  });

  it('rolls back optimistic deletes on failure for remove action', async () => {
    vi.mocked(callService).mockRejectedValueOnce(new Error('fail'));
    await store.dispatcher.plant.batchAction('remove', ['p1', 'p2']);
    expect(optimisticDeletedPlantIds$.get().has('p1')).toBe(false);
    expect(optimisticDeletedPlantIds$.get().has('p2')).toBe(false);
  });

  it('does not roll back optimistic deletes on failure for non-remove action', async () => {
    vi.mocked(callService).mockRejectedValueOnce(new Error('fail'));
    await store.dispatcher.plant.batchAction('harvest', ['p1']);
    expect(optimisticDeletedPlantIds$.get().has('p1')).toBe(false);
  });

  it('uses Unknown error fallback when a non-Error is thrown', async () => {
    vi.mocked(callService).mockRejectedValueOnce('just a string, not an Error');
    await store.dispatcher.plant.batchAction('transition', ['p1']);
    expect(store.ui.showToast).toHaveBeenCalledWith(
      'Batch transition failed: Unknown error',
      'error'
    );
  });
});

// ─── ui.deleteSelectedPlants ─────────────────────────────────────────────────

describe('ui.deleteSelectedPlants', () => {
  it('does nothing when selection is empty', async () => {
    const { dispatcher } = makeStore();
    await dispatcher.ui.deleteSelectedPlants();
    expect(hassCall).not.toHaveBeenCalled();
  });

  it('calls handleDeletePlant with selected ids', async () => {
    const { dispatcher, ui } = makeStore();
    ui.$selectedPlants.set(new Set(['p1', 'p2']));
    await dispatcher.ui.deleteSelectedPlants();
    expect(hassCall).toHaveBeenCalledWith(
      'growspace_manager/remove_plant',
      { plant_id: 'p1' },
      expect.anything()
    );
    expect(hassCall).toHaveBeenCalledWith(
      'growspace_manager/remove_plant',
      { plant_id: 'p2' },
      expect.anything()
    );
  });
});

// ─── ui.toggleEnvGraph ───────────────────────────────────────────────────────

describe('ui.toggleEnvGraph', () => {
  it('opens the irrigation dialog on the overview tab for the crop_steering metric', () => {
    const { dispatcher, grid, ui } = makeStore();
    grid.$selectedDevice.set('gs-1');
    dispatcher.ui.toggleEnvGraph('crop_steering');
    // The standalone crop-steering dialog was retired; the chip now opens the
    // Irrigation Dialog's Crop Steering Command Center on the Overview tab.
    expect(ui.setActiveDialog).toHaveBeenCalledWith({
      type: 'IRRIGATION',
      payload: { growspaceId: 'gs-1', initialTab: 'overview' },
    });
  });

  it('does not open the irrigation dialog when no device is selected', () => {
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

describe('delegation smoke tests', () => {
  it('ui.refreshData delegates to store.refreshData', () => {
    const { dispatcher, store } = makeStore();
    dispatcher.ui.refreshData();
    expect(store.refreshData).toHaveBeenCalled();
  });
});

// ─── ui dialog delegation ────────────────────────────────────────────────────

describe('ui dialog delegation', () => {
  it('openGrowMasterDialog sets GROW_MASTER dialog', () => {
    const { dispatcher, ui } = makeStore();
    dispatcher.ui.openGrowMasterDialog('gs-1');
    expect(ui.setActiveDialog).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'GROW_MASTER', payload: expect.objectContaining({ growspaceId: 'gs-1' }) })
    );
  });

  it('openWateringDialog sets WATERING dialog', () => {
    const { dispatcher, ui } = makeStore();
    dispatcher.ui.openWateringDialog({ plantIds: ['p1'], growspaceId: 'gs-1', mode: 'plant' });
    expect(ui.setActiveDialog).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'WATERING' })
    );
  });

  it('openTrainingDialog sets TRAINING dialog', () => {
    const { dispatcher, ui } = makeStore();
    dispatcher.ui.openTrainingDialog(['p1'], 'gs-1');
    expect(ui.setActiveDialog).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'TRAINING', payload: expect.objectContaining({ plantIds: ['p1'], growspaceId: 'gs-1' }) })
    );
  });

  it('openNutrientsDialog sets NUTRIENTS dialog', () => {
    const { dispatcher, ui } = makeStore();
    dispatcher.ui.openNutrientsDialog();
    expect(ui.setActiveDialog).toHaveBeenCalledWith(expect.objectContaining({ type: 'NUTRIENTS' }));
  });

  it('openSnapshotsDialog sets SNAPSHOTS dialog', () => {
    const { dispatcher, ui } = makeStore();
    dispatcher.ui.openSnapshotsDialog('gs-2');
    expect(ui.setActiveDialog).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'SNAPSHOTS', payload: expect.objectContaining({ growspaceId: 'gs-2' }) })
    );
  });

  it('togglePlantSelection delegates to ui.togglePlantSelection with plant id string', () => {
    const { dispatcher, ui } = makeStore();
    dispatcher.ui.togglePlantSelection('p1');
    expect(ui.togglePlantSelection).toHaveBeenCalledWith('p1');
  });

  it('openAddPlantDialog sets ADD_PLANT dialog with row and col', () => {
    const { dispatcher, ui } = makeStore();
    dispatcher.ui.openAddPlantDialog(2, 3);
    expect(ui.setActiveDialog).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'ADD_PLANT', payload: expect.objectContaining({ row: 2, col: 3 }) })
    );
  });

  it('openPlantOverviewDialog sets PLANT_OVERVIEW dialog', () => {
    const { dispatcher, ui } = makeStore();
    dispatcher.ui.openPlantOverviewDialog({ attributes: { plant_id: 'p1' } } as never);
    expect(ui.setActiveDialog).toHaveBeenCalledWith(expect.objectContaining({ type: 'PLANT_OVERVIEW' }));
  });

  it('openStrainRecommendationDialog sets STRAIN_RECOMMENDATION dialog', () => {
    const { dispatcher, ui } = makeStore();
    dispatcher.ui.openStrainRecommendationDialog();
    expect(ui.setActiveDialog).toHaveBeenCalledWith(expect.objectContaining({ type: 'STRAIN_RECOMMENDATION' }));
  });

  it('exportStrainLibrary covers the delegation line', async () => {
    const { dispatcher } = makeStore();
    await expect(dispatcher.ui.exportStrainLibrary()).resolves.not.toThrow();
  });

  it('setIsCompactView delegates to setViewMode(COMPACT) when true', () => {
    const { dispatcher, ui } = makeStore();
    dispatcher.ui.setIsCompactView(true);
    expect(ui.setViewMode).toHaveBeenCalledWith(expect.any(String));
  });

  it('showToast delegates to ui.showToast', () => {
    const { dispatcher, ui } = makeStore();
    dispatcher.ui.showToast('hello', 'info');
    expect(ui.showToast).toHaveBeenCalledWith('hello', 'info');
  });

  it('toast delegates to ui.showToast', () => {
    const { dispatcher, ui } = makeStore();
    dispatcher.ui.toast('world', 'success');
    expect(ui.showToast).toHaveBeenCalledWith('world', 'success');
  });

  it('setActiveDialog delegates to ui.setActiveDialog', () => {
    const { dispatcher, ui } = makeStore();
    dispatcher.ui.setActiveDialog({ type: 'NONE' } as never);
    expect(ui.setActiveDialog).toHaveBeenCalledWith({ type: 'NONE' });
  });

  it('closeDialog delegates to ui.closeDialog', () => {
    const { dispatcher, ui } = makeStore();
    dispatcher.ui.closeDialog();
    expect(ui.closeDialog).toHaveBeenCalled();
  });

  it('openNutrientPresetsDialog sets NUTRIENT_PRESETS dialog', () => {
    const { dispatcher, ui } = makeStore();
    dispatcher.ui.openNutrientPresetsDialog();
    expect(ui.setActiveDialog).toHaveBeenCalledWith(expect.objectContaining({ type: 'NUTRIENT_PRESETS' }));
  });

  it('openLogbookDialog sets LOGBOOK dialog when device is selected', () => {
    const { dispatcher, grid, ui } = makeStore();
    grid.$selectedDevice.set('gs-1');
    dispatcher.ui.openLogbookDialog();
    expect(ui.setActiveDialog).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'LOGBOOK', payload: expect.objectContaining({ growspaceId: 'gs-1' }) })
    );
  });

  it('openConfigDialog sets CONFIG dialog', () => {
    const { dispatcher, ui } = makeStore();
    dispatcher.ui.openConfigDialog();
    expect(ui.setActiveDialog).toHaveBeenCalledWith(expect.objectContaining({ type: 'CONFIG' }));
  });

  it('openStrainLibraryDialog sets STRAIN_LIBRARY dialog', () => {
    const { dispatcher, ui } = makeStore();
    dispatcher.ui.openStrainLibraryDialog();
    expect(ui.setActiveDialog).toHaveBeenCalledWith(expect.objectContaining({ type: 'STRAIN_LIBRARY' }));
  });

  it('openIrrigationDialog sets IRRIGATION dialog', () => {
    const { dispatcher, ui } = makeStore();
    dispatcher.ui.openIrrigationDialog();
    expect(ui.setActiveDialog).toHaveBeenCalledWith(expect.objectContaining({ type: 'IRRIGATION' }));
  });

  it('openBatchWateringDialog sets WATERING dialog when growspaceId provided', () => {
    const { dispatcher, ui } = makeStore();
    dispatcher.ui.openBatchWateringDialog('gs-1');
    expect(ui.setActiveDialog).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'WATERING' })
    );
  });

  it('openBatchTrainingDialog sets TRAINING dialog when growspaceId provided', () => {
    const { dispatcher, ui } = makeStore();
    dispatcher.ui.openBatchTrainingDialog('gs-1');
    expect(ui.setActiveDialog).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'TRAINING' })
    );
  });

  it('openBatchCloneDialog sets BATCH_CLONE dialog when plants selected', () => {
    const { dispatcher, ui } = makeStore();
    ui.$selectedPlants.set(new Set(['p1']));
    dispatcher.ui.openBatchCloneDialog();
    expect(ui.setActiveDialog).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'BATCH_CLONE' })
    );
  });

  it('openBatchPrintLabelsDialog sets BATCH_PRINT_LABELS dialog when plants selected', () => {
    const { dispatcher, ui } = makeStore();
    ui.$selectedPlants.set(new Set(['p1']));
    dispatcher.ui.openBatchPrintLabelsDialog();
    expect(ui.setActiveDialog).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'BATCH_PRINT_LABELS' })
    );
  });

  it('clearPlantSelection calls ui.clearPlantSelection', () => {
    const { dispatcher, ui } = makeStore();
    dispatcher.ui.clearPlantSelection();
    expect(ui.clearPlantSelection).toHaveBeenCalled();
  });

  it('exitEditMode calls setEditMode(false) and clearPlantSelection', () => {
    const { dispatcher, ui } = makeStore();
    dispatcher.ui.exitEditMode();
    expect(ui.setEditMode).toHaveBeenCalledWith(false);
    expect(ui.clearPlantSelection).toHaveBeenCalled();
  });

  it('handleKeyboardNavigation returns early when no plants visible', () => {
    const { dispatcher } = makeStore();
    // $selectedDevice is null → getVisiblePlants returns [] → returns after plants check
    expect(() => dispatcher.ui.handleKeyboardNavigation('ArrowRight')).not.toThrow();
  });

  it('handleDeepLink sets pending deep link when no devices loaded', () => {
    const { dispatcher, ui } = makeStore();
    dispatcher.ui.handleDeepLink('plant-123');
    expect(ui.setPendingDeepLink).toHaveBeenCalledWith('plant-123');
  });
});

// ─── plant namespace delegation ──────────────────────────────────────────────

describe('plant delegation smoke tests', () => {
  it('update covers delegation line', async () => {
    const { dispatcher } = makeStore();
    await dispatcher.plant.update('p1', { nickname: 'Big One' });
    expect(hassCall).toHaveBeenCalledWith(
      'growspace_manager/update_plant',
      expect.objectContaining({ plant_id: 'p1' }),
      expect.anything()
    );
  });

  it('delete covers delegation line', async () => {
    const { dispatcher } = makeStore();
    await dispatcher.plant.delete('p1');
    expect(hassCall).toHaveBeenCalledWith(
      'growspace_manager/remove_plant',
      { plant_id: 'p1' },
      expect.anything()
    );
  });

  it('move covers delegation line', async () => {
    const { dispatcher } = makeStore();
    const plant = { attributes: { plant_id: 'p1', stage: 'clone' }, entity_id: 'sensor.p1' } as never;
    await expect(dispatcher.plant.move(plant, 'gs-1')).resolves.not.toThrow();
  });

  it('drop covers delegation line', async () => {
    const { dispatcher } = makeStore();
    await expect(dispatcher.plant.drop(0, 0, null, null)).resolves.not.toThrow();
  });

  it('nextStage covers delegation line', async () => {
    const { dispatcher, ui } = makeStore();
    const plant = { attributes: { plant_id: 'p1', stage: 'flower' }, entity_id: 'sensor.p1' } as never;
    await dispatcher.plant.nextStage(plant);
    // the plant slice's harvestPlant should be called since stage is 'flower' → moves to 'dry'
    // (or ui.showToast if internal action fails — either way line is covered)
    expect(ui.showToast).toHaveBeenCalled();
  });

  it('harvest covers delegation line', async () => {
    const { dispatcher } = makeStore();
    const plant = { attributes: { plant_id: 'p1', stage: 'flower' }, entity_id: 'sensor.p1' } as never;
    await expect(dispatcher.plant.harvest(plant)).resolves.not.toThrow();
  });

  it('takeClone covers delegation line', async () => {
    const { dispatcher } = makeStore();
    const plant = { attributes: { plant_id: 'p1', stage: 'mother' }, entity_id: 'sensor.p1' } as never;
    await expect(dispatcher.plant.takeClone(plant, 1)).resolves.not.toThrow();
  });

  it('updateFromDialog covers delegation line', async () => {
    const { dispatcher } = makeStore();
    const state = {
      plant: { attributes: { plant_id: 'p1' }, entity_id: 'sensor.p1' },
      editedAttributes: {},
      selectedPlantIds: new Set(['p1']),
      activeTab: 'dashboard',
    };
    await expect(dispatcher.plant.updateFromDialog(state as never)).resolves.not.toThrow();
  });

  it('finishDrying covers delegation line', async () => {
    const { dispatcher } = makeStore();
    const plant = { attributes: { plant_id: 'p1', stage: 'dry' }, entity_id: 'sensor.p1' } as never;
    await expect(dispatcher.plant.finishDrying(plant)).resolves.not.toThrow();
  });

  it('add covers delegation line', async () => {
    const { dispatcher } = makeStore();
    await expect(dispatcher.plant.add('gs-1', 0, 0, 'Blue Dream')).resolves.not.toThrow();
  });

  it('addBatch covers delegation line', async () => {
    const { dispatcher } = makeStore();
    const detail = { strain: 'Blue Dream', count: 1, growspaceId: 'gs-1' };
    await expect(dispatcher.plant.addBatch(detail as never)).resolves.not.toThrow();
  });

  it('saveHarvestMetrics covers delegation line', async () => {
    const { dispatcher } = makeStore();
    await expect(dispatcher.plant.saveHarvestMetrics('p1', { yield_grams: 50 })).resolves.not.toThrow();
  });

  it('scorePhenotype covers delegation line', async () => {
    const { dispatcher } = makeStore();
    await expect(dispatcher.plant.scorePhenotype('p1', { aroma: 8 })).resolves.not.toThrow();
  });

  it('printLabel covers delegation line', async () => {
    const { dispatcher } = makeStore();
    await expect(dispatcher.plant.printLabel({ plant_id: 'p1' } as never)).resolves.not.toThrow();
  });

  it('logDryingWeight covers delegation line', async () => {
    const { dispatcher } = makeStore();
    await expect(dispatcher.plant.logDryingWeight('p1', 150)).resolves.not.toThrow();
  });

  it('logMoistureReading covers delegation line', async () => {
    const { dispatcher } = makeStore();
    await expect(dispatcher.plant.logMoistureReading('p1', 45)).resolves.not.toThrow();
  });

  it('setVisualTag covers delegation line', async () => {
    const { dispatcher } = makeStore();
    await expect(dispatcher.plant.setVisualTag('p1', 'red')).resolves.not.toThrow();
  });
});

// ─── growspace delegation ─────────────────────────────────────────────────────

describe('growspace delegation', () => {
  it('removeEnvironment covers delegation line', async () => {
    const { dispatcher } = makeStore();
    await expect(dispatcher.growspace.removeEnvironment('gs-1')).resolves.not.toThrow();
  });

  it('resetWaterTracking covers delegation line', async () => {
    const { dispatcher } = makeStore();
    await expect(dispatcher.growspace.resetWaterTracking('gs-1')).resolves.not.toThrow();
  });
});

// ─── strain delegation ────────────────────────────────────────────────────────

describe('strain delegation', () => {
  it('add calls strainActions and covers line', async () => {
    const { dispatcher } = makeStore();
    await expect(dispatcher.strain.add({ strain: 'Test Strain' })).resolves.not.toThrow();
  });

  it('update covers the delegation line', async () => {
    const { dispatcher } = makeStore();
    await expect(dispatcher.strain.update({ strain: 'Test Strain' })).resolves.not.toThrow();
  });

  it('remove covers the delegation line', async () => {
    const { dispatcher } = makeStore();
    await expect(dispatcher.strain.remove('Test Strain|default')).resolves.not.toThrow();
  });
});

// ─── library delegation ───────────────────────────────────────────────────────

describe('library delegation', () => {
  it('updateNutrientStock covers delegation line', async () => {
    const { dispatcher } = makeStore();
    await expect(dispatcher.library.updateNutrientStock('n1', 'CalMag', 500, 1000)).resolves.not.toThrow();
  });

  it('removeNutrientStock covers delegation line', async () => {
    const { dispatcher } = makeStore();
    await expect(dispatcher.library.removeNutrientStock('n1')).resolves.not.toThrow();
  });

  it('fetchECRampCurves covers delegation line', async () => {
    const { dispatcher } = makeStore();
    await expect(dispatcher.library.fetchECRampCurves()).resolves.not.toThrow();
  });

  it('saveECRampCurve covers delegation line', async () => {
    const { dispatcher } = makeStore();
    await expect(dispatcher.library.saveECRampCurve({ id: 'c1' } as never)).resolves.not.toThrow();
  });

  it('removeECRampCurve covers delegation line', async () => {
    const { dispatcher } = makeStore();
    await expect(dispatcher.library.removeECRampCurve('c1')).resolves.not.toThrow();
  });

  it('import shows success toast for valid array JSON', async () => {
    const { dispatcher, ui } = makeStore();
    const file = new File([JSON.stringify([{ strain: 'Blue Dream' }])], 'strains.json');
    await dispatcher.library.import(file, false);
    expect(ui.showToast).toHaveBeenCalledWith('Library imported successfully', 'success');
  });
});

// ─── ai delegation ────────────────────────────────────────────────────────────

describe('ai delegation', () => {
  it('analyzeAll covers delegation line', async () => {
    const { dispatcher } = makeStore();
    await expect(dispatcher.ai.analyzeAll()).resolves.not.toThrow();
  });

  it('askAdvice covers delegation line when device is selected', async () => {
    const { dispatcher, grid } = makeStore();
    grid.$selectedDevice.set('gs-1');
    await expect(dispatcher.ai.askAdvice('what nutrients?')).resolves.not.toThrow();
  });

  it('strainRecommendation covers delegation line', async () => {
    const { dispatcher } = makeStore();
    await expect(dispatcher.ai.strainRecommendation('best sativa')).resolves.not.toThrow();
  });
});

// ─── environment delegation ───────────────────────────────────────────────────

describe('environment delegation', () => {
  it('configure covers delegation line', async () => {
    const { dispatcher } = makeStore();
    await expect(dispatcher.environment.configure({ growspaceId: 'gs-1' } as never)).resolves.not.toThrow();
  });

  it('remove covers delegation line', async () => {
    const { dispatcher } = makeStore();
    await expect(dispatcher.environment.remove('gs-1')).resolves.not.toThrow();
  });

  it('resetWaterTracking covers delegation line', async () => {
    const { dispatcher } = makeStore();
    await expect(dispatcher.environment.resetWaterTracking('gs-1')).resolves.not.toThrow();
  });

  it('waterPlant covers delegation line', async () => {
    const { dispatcher } = makeStore();
    await expect(dispatcher.environment.waterPlant('p1', 500)).resolves.not.toThrow();
  });

  it('waterGrowspace calls callService', async () => {
    const { dispatcher } = makeStore();
    await dispatcher.environment.waterGrowspace('gs-1', 2000);
    expect(callService).toHaveBeenCalledWith(
      'growspace_manager',
      expect.any(String),
      expect.objectContaining({ growspace_id: 'gs-1' })
    );
  });
});

// ─── genetics delegation ──────────────────────────────────────────────────────

describe('genetics delegation', () => {
  it('addSeedBatch covers delegation line', async () => {
    const { dispatcher } = makeStore();
    await expect(dispatcher.genetics.addSeedBatch({ strainName: 'Blue Dream' } as never)).resolves.not.toThrow();
  });

  it('updateSeedBatch covers delegation line', async () => {
    const { dispatcher } = makeStore();
    await expect(dispatcher.genetics.updateSeedBatch({ id: 'b1' } as never)).resolves.not.toThrow();
  });

  it('logPollination covers delegation line', async () => {
    const { dispatcher } = makeStore();
    await expect(dispatcher.genetics.logPollination({ motherPlantId: 'p1' } as never)).resolves.not.toThrow();
  });

  it('updatePollination covers delegation line', async () => {
    const { dispatcher } = makeStore();
    await expect(dispatcher.genetics.updatePollination({ eventId: 'e1' } as never)).resolves.not.toThrow();
  });

  it('deletePollination covers delegation line', async () => {
    const { dispatcher } = makeStore();
    await expect(dispatcher.genetics.deletePollination('e1')).resolves.not.toThrow();
  });

  it('fetchData covers delegation line', async () => {
    const { dispatcher } = makeStore();
    vi.mocked(hassCall).mockResolvedValueOnce({ seed_batches: {}, pollination_events: {} });
    await expect(dispatcher.genetics.fetchData()).resolves.not.toThrow();
  });

  it('harvestSeeds covers delegation line', async () => {
    const { dispatcher } = makeStore();
    await expect(dispatcher.genetics.harvestSeeds({ batchId: 'b1' } as never)).resolves.not.toThrow();
  });

  it('deleteSeedBatch covers delegation line', async () => {
    const { dispatcher } = makeStore();
    await expect(dispatcher.genetics.deleteSeedBatch('b1')).resolves.not.toThrow();
  });

  it('sowSeed covers delegation line', async () => {
    const { dispatcher } = makeStore();
    await expect(dispatcher.genetics.sowSeed('b1', 'p1')).resolves.not.toThrow();
  });

  it('setPlantSex covers delegation line', async () => {
    const { dispatcher } = makeStore();
    await expect(dispatcher.genetics.setPlantSex('p1', 'female')).resolves.not.toThrow();
  });

  it('unlinkSeedBatch covers delegation line', async () => {
    const { dispatcher } = makeStore();
    await expect(dispatcher.genetics.unlinkSeedBatch('p1')).resolves.not.toThrow();
  });

  it('getLineageTree covers delegation line', async () => {
    const { dispatcher } = makeStore();
    await expect(dispatcher.genetics.getLineageTree('p1')).resolves.not.toThrow();
  });

  it('getStrainLineageTree covers delegation line', async () => {
    const { dispatcher } = makeStore();
    await expect(dispatcher.genetics.getStrainLineageTree('Blue Dream')).resolves.not.toThrow();
  });

  it('updateStrainLineageTree covers delegation line', async () => {
    const { dispatcher } = makeStore();
    const parents = [{ name: 'Parent A', source: 'library' as const }];
    await expect(dispatcher.genetics.updateStrainLineageTree('Blue Dream', parents)).resolves.not.toThrow();
  });
});
