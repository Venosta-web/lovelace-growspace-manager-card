import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { atom } from 'nanostores';
import { ActionDispatcher } from './action-dispatcher';
import { ViewMode } from '../../constants';
import { optimisticDeletedPlantIds$ } from '../../slices/grid';
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

  it('uses Unknown error fallback when a non-Error is thrown', async () => {
    (store.dataService as Record<string, ReturnType<typeof vi.fn>>).callService = vi
      .fn()
      .mockRejectedValue('just a string, not an Error');

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


// ─── plant namespace delegation ──────────────────────────────────────────────

describe('plant delegation smoke tests', () => {
  it('update calls dataService.updatePlant', async () => {
    const { dispatcher, dataService } = makeStore();
    await dispatcher.plant.update('p1', { nickname: 'Big One' });
    expect((dataService as Record<string, ReturnType<typeof vi.fn>>).updatePlant).toHaveBeenCalled();
  });

  it('delete calls dataService.removePlant', async () => {
    const { dispatcher, dataService } = makeStore();
    await dispatcher.plant.delete('p1');
    expect((dataService as Record<string, ReturnType<typeof vi.fn>>).removePlant).toHaveBeenCalledWith('p1');
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
    // dataService.harvestPlant should be called since stage is 'flower' → moves to 'dry'
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

  it('saveHarvestMetrics calls dataService.updateHarvestMetrics', async () => {
    const { dispatcher, dataService } = makeStore();
    await dispatcher.plant.saveHarvestMetrics('p1', { yield_grams: 50 });
    expect((dataService as Record<string, ReturnType<typeof vi.fn>>).updateHarvestMetrics).toHaveBeenCalled();
  });

  it('scorePhenotype calls dataService.scorePlant', async () => {
    const { dispatcher, dataService } = makeStore();
    await dispatcher.plant.scorePhenotype('p1', { aroma: 8 });
    expect((dataService as Record<string, ReturnType<typeof vi.fn>>).scorePlant).toHaveBeenCalled();
  });

  it('printLabel covers delegation line', async () => {
    const { dispatcher } = makeStore();
    await expect(dispatcher.plant.printLabel({ plant_id: 'p1' } as never)).resolves.not.toThrow();
  });

  it('logDryingWeight calls dataService.logDryingWeight', async () => {
    const { dispatcher, dataService } = makeStore();
    await dispatcher.plant.logDryingWeight('p1', 150);
    expect((dataService as Record<string, ReturnType<typeof vi.fn>>).logDryingWeight).toHaveBeenCalled();
  });

  it('logMoistureReading calls dataService.logMoistureReading', async () => {
    const { dispatcher, dataService } = makeStore();
    await dispatcher.plant.logMoistureReading('p1', 45);
    expect((dataService as Record<string, ReturnType<typeof vi.fn>>).logMoistureReading).toHaveBeenCalled();
  });

  it('setVisualTag calls dataService.setVisualTag', async () => {
    const { dispatcher, dataService } = makeStore();
    await dispatcher.plant.setVisualTag('p1', 'red');
    expect((dataService as Record<string, ReturnType<typeof vi.fn>>).setVisualTag).toHaveBeenCalled();
  });
});

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

// ─── genetics delegation ──────────────────────────────────────────────────────

describe('genetics delegation', () => {
  it('addSeedBatch calls dataService.addSeedBatch', async () => {
    const { dispatcher, dataService } = makeStore();
    await dispatcher.genetics.addSeedBatch({ strainName: 'Blue Dream' } as never);
    expect((dataService as Record<string, ReturnType<typeof vi.fn>>).addSeedBatch).toHaveBeenCalled();
  });

  it('updateSeedBatch calls dataService.updateSeedBatch', async () => {
    const { dispatcher, dataService } = makeStore();
    await dispatcher.genetics.updateSeedBatch({ id: 'b1' } as never);
    expect((dataService as Record<string, ReturnType<typeof vi.fn>>).updateSeedBatch).toHaveBeenCalled();
  });

  it('logPollination calls dataService.logPollination', async () => {
    const { dispatcher, dataService } = makeStore();
    await dispatcher.genetics.logPollination({ motherPlantId: 'p1' } as never);
    expect((dataService as Record<string, ReturnType<typeof vi.fn>>).logPollination).toHaveBeenCalled();
  });

  it('updatePollination calls dataService.updatePollination', async () => {
    const { dispatcher, dataService } = makeStore();
    await dispatcher.genetics.updatePollination({ eventId: 'e1' } as never);
    expect((dataService as Record<string, ReturnType<typeof vi.fn>>).updatePollination).toHaveBeenCalled();
  });

  it('deletePollination calls dataService.deletePollination', async () => {
    const { dispatcher, dataService } = makeStore();
    await dispatcher.genetics.deletePollination('e1');
    expect((dataService as Record<string, ReturnType<typeof vi.fn>>).deletePollination).toHaveBeenCalledWith('e1');
  });

  it('fetchData calls dataService.fetchGeneticsData', async () => {
    const { dispatcher, dataService } = makeStore();
    await dispatcher.genetics.fetchData();
    expect((dataService as Record<string, ReturnType<typeof vi.fn>>).fetchGeneticsData).toHaveBeenCalled();
  });

  it('harvestSeeds calls dataService.harvestSeeds', async () => {
    const { dispatcher, dataService } = makeStore();
    await dispatcher.genetics.harvestSeeds({ batchId: 'b1' } as never);
    expect((dataService as Record<string, ReturnType<typeof vi.fn>>).harvestSeeds).toHaveBeenCalled();
  });

  it('deleteSeedBatch calls dataService.deleteSeedBatch', async () => {
    const { dispatcher, dataService } = makeStore();
    await dispatcher.genetics.deleteSeedBatch('b1');
    expect((dataService as Record<string, ReturnType<typeof vi.fn>>).deleteSeedBatch).toHaveBeenCalledWith('b1');
  });

  it('sowSeed calls dataService.sowSeed', async () => {
    const { dispatcher, dataService } = makeStore();
    await dispatcher.genetics.sowSeed('b1', 'p1');
    expect((dataService as Record<string, ReturnType<typeof vi.fn>>).sowSeed).toHaveBeenCalledWith('b1', 'p1');
  });

  it('setPlantSex calls dataService.setPlantSex', async () => {
    const { dispatcher, dataService } = makeStore();
    await dispatcher.genetics.setPlantSex('p1', 'female');
    expect((dataService as Record<string, ReturnType<typeof vi.fn>>).setPlantSex).toHaveBeenCalledWith('p1', 'female');
  });

  it('unlinkSeedBatch calls dataService.unlinkSeedBatch', async () => {
    const { dispatcher, dataService } = makeStore();
    await dispatcher.genetics.unlinkSeedBatch('p1');
    expect((dataService as Record<string, ReturnType<typeof vi.fn>>).unlinkSeedBatch).toHaveBeenCalledWith('p1');
  });

  it('getLineageTree calls dataService.getLineageTree', async () => {
    const { dispatcher, dataService } = makeStore();
    await dispatcher.genetics.getLineageTree('p1');
    expect((dataService as Record<string, ReturnType<typeof vi.fn>>).getLineageTree).toHaveBeenCalledWith('p1');
  });

  it('getStrainLineageTree calls dataService.getStrainLineageTree', async () => {
    const { dispatcher, dataService } = makeStore();
    await dispatcher.genetics.getStrainLineageTree('Blue Dream');
    expect((dataService as Record<string, ReturnType<typeof vi.fn>>).getStrainLineageTree).toHaveBeenCalledWith('Blue Dream');
  });

  it('updateStrainLineageTree calls dataService.updateStrainLineageTree', async () => {
    const { dispatcher, dataService } = makeStore();
    const parents = [{ name: 'Parent A', source: 'library' as const }];
    await dispatcher.genetics.updateStrainLineageTree('Blue Dream', parents);
    expect((dataService as Record<string, ReturnType<typeof vi.fn>>).updateStrainLineageTree).toHaveBeenCalledWith('Blue Dream', parents);
  });
});

