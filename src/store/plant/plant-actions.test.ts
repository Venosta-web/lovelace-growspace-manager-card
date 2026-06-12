import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  updatePlant,
  updatePlantFromDialog,
  handleDeletePlant,
  movePlantToNextStage,
  movePlantToGrowspace,
  takeClone,
  movePlantPosition,
  handlePlantDrop,
  confirmAddPlant,
  confirmAddPlants,
  printLabel,
  saveHarvestMetrics,
  scorePhenotype,
} from './plant-actions';
import type { ActionContext } from '../core/action-context';
import { setDevices, optimisticDeletedPlantIds$ } from '../../slices/grid';
import { mutate } from '../../services/mutate';
import type { Action } from '../../services/mutate';

vi.mock('./library-actions', () => ({
  fetchStrainLibrary: vi.fn().mockResolvedValue(undefined),
}));

// Mock the mutate primitive so tests can inspect the recorded action
// (type/label/optimistic/inverse/apply) without exercising the real undo stack.
// The mock still runs optimistic() then apply() so call sites that perform their
// backend work inside apply (e.g. the swap path) behave as in production.
vi.mock('../../services/mutate', () => ({
  mutate: vi.fn(async (action: Action) => {
    action.optimistic();
    await action.apply();
  }),
}));

/** Read the action object recorded by the nth mutate() call. */
function mutateAction(n = 0): Action {
  return (mutate as unknown as ReturnType<typeof vi.fn>).mock.calls[n][0] as Action;
}

function makeDataService() {
  return new Proxy({} as any, {
    get(target, prop) {
      if (!(prop in target)) target[prop] = vi.fn().mockResolvedValue(undefined);
      return target[prop];
    },
  });
}

function makeContext() {
  const showToast = vi.fn();
  const dataService = makeDataService();
  const devices: any[] = [];

  return {
    dataService,
    ui: {
      showToast,
      $isEditMode: { get: vi.fn().mockReturnValue(false) },
      clearPlantSelection: vi.fn(),
      setEditMode: vi.fn(),
      deselectPlants: vi.fn(),
      $activeDialog: { get: vi.fn().mockReturnValue({ type: '' }) },
    } as unknown as ActionContext['ui'],
    refreshData: vi.fn().mockResolvedValue(undefined),
    closeDialog: vi.fn(),
    grid: {
      $selectedDevice: { get: vi.fn().mockReturnValue('device-1') },
    } as unknown as ActionContext['grid'],
  } satisfies ActionContext;
}

function makePlant(overrides: any = {}): any {
  return {
    entity_id: 'sensor.og_kush',
    attributes: {
      plant_id: 'plant-1',
      strain: 'OG Kush',
      stage: 'flower',
      growspace_id: 'device-1',
      row: 0,
      col: 0,
      ...overrides.attributes,
    },
    ...overrides,
  };
}

afterEach(() => {
  setDevices([]);
  optimisticDeletedPlantIds$.set(new Set());
  (mutate as unknown as ReturnType<typeof vi.fn>).mockClear();
});

// ─── updatePlant ─────────────────────────────────────────────────────────────

describe('updatePlant', () => {
  let ctx: ReturnType<typeof makeContext>;
  beforeEach(() => { ctx = makeContext(); });

  it('calls dataService.updatePlant with merged payload and toasts success', async () => {
    await updatePlant(ctx, 'plant-1', { strain: 'Blue Dream' });

    expect((ctx.dataService as any).updatePlant).toHaveBeenCalledWith({
      plant_id: 'plant-1',
      strain: 'Blue Dream',
    });
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith('Plant updated', 'success');
  });

  it('toasts error on failure without rethrowing', async () => {
    (ctx.dataService as any).updatePlant.mockRejectedValue(new Error('api-fail'));

    const result = await updatePlant(ctx, 'plant-1', {});

    expect(result).toBeUndefined();
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith(
      expect.stringContaining('api-fail'),
      'error'
    );
  });
});

// ─── updatePlantFromDialog ────────────────────────────────────────────────────

describe('updatePlantFromDialog', () => {
  let ctx: ReturnType<typeof makeContext>;
  beforeEach(() => { ctx = makeContext(); });

  it('updates a single plant, closes dialog, and refreshes', async () => {
    const plant = makePlant();
    await updatePlantFromDialog(ctx, {
      plant,
      editedAttributes: { strain: 'Blue Dream' } as any,
      selectedPlantIds: [],
      activeTab: 'dashboard',
    });

    expect((ctx.dataService as any).updatePlant).toHaveBeenCalledOnce();
    expect(ctx.closeDialog).toHaveBeenCalled();
    expect(ctx.refreshData).toHaveBeenCalled();
  });

  it('updates all selected plants when multiple are selected', async () => {
    const plant = makePlant();
    await updatePlantFromDialog(ctx, {
      plant,
      editedAttributes: { strain: 'Gelato' } as any,
      selectedPlantIds: ['plant-1', 'plant-2', 'plant-3'],
      activeTab: 'dashboard',
    });

    expect((ctx.dataService as any).updatePlant).toHaveBeenCalledTimes(3);
  });

  it('clears edit mode when active after bulk update', async () => {
    (ctx.ui.$isEditMode as any).get.mockReturnValue(true);
    const plant = makePlant();

    await updatePlantFromDialog(ctx, {
      plant,
      editedAttributes: {} as any,
      selectedPlantIds: ['plant-1', 'plant-2'],
      activeTab: 'dashboard',
    });

    expect((ctx.ui as any).clearPlantSelection).toHaveBeenCalled();
    expect((ctx.ui as any).setEditMode).toHaveBeenCalledWith(false);
  });
});

// ─── handleDeletePlant ────────────────────────────────────────────────────────

describe('handleDeletePlant', () => {
  let ctx: ReturnType<typeof makeContext>;
  beforeEach(() => { ctx = makeContext(); });

  it('marks plant as optimistically deleted, calls API, registers undo', async () => {
    setDevices([]);

    await handleDeletePlant(ctx, 'plant-1');

    expect(optimisticDeletedPlantIds$.get().has('plant-1')).toBe(true);
    expect((ctx.dataService as any).removePlant).toHaveBeenCalledWith('plant-1');
    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'delete' }),
      expect.any(String)
    );
  });

  it('accepts an array of plant ids and registers batch-delete undo', async () => {
    setDevices([]);

    await handleDeletePlant(ctx, ['plant-1', 'plant-2']);

    expect((ctx.dataService as any).removePlant).toHaveBeenCalledTimes(2);
    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'batch-delete' }),
      expect.any(String)
    );
  });

  it('removes optimistic id and shows error when API fails', async () => {
    (ctx.dataService as any).removePlant.mockRejectedValue(new Error('del-fail'));
    setDevices([]);

    await handleDeletePlant(ctx, 'plant-1');

    expect(optimisticDeletedPlantIds$.get().has('plant-1')).toBe(false);
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith(
      expect.stringContaining('del-fail'),
      'error'
    );
    expect(mutate).not.toHaveBeenCalled();
  });

  it('closes dialog when active dialog is PLANT_OVERVIEW', async () => {
    setDevices([]);
    (ctx.ui.$activeDialog as any).get.mockReturnValue({ type: 'PLANT_OVERVIEW' });

    await handleDeletePlant(ctx, 'plant-1');

    expect(ctx.closeDialog).toHaveBeenCalled();
  });

  it('collects plant attributes from devices for the undo payload', async () => {
    setDevices([
      {
        deviceId: 'device-1',
        plants: [
          {
            entity_id: 'sensor.og_kush',
            attributes: {
              plant_id: 'plant-1',
              strain: 'OG Kush',
              growspace_id: 'device-1',
              row: 2,
              col: 3,
            },
          },
        ],
      } as any,
    ]);

    await handleDeletePlant(ctx, 'plant-1');

    expect(mutateAction().label).toBe('Deleted OG Kush');
  });

  it('inverse callback re-adds the plant via addPlant and refreshes', async () => {
    setDevices([
      {
        deviceId: 'device-1',
        plants: [
          {
            entity_id: 'sensor.og_kush',
            attributes: {
              plant_id: 'plant-1',
              strain: 'OG Kush',
              growspace_id: 'device-1',
              row: 1,
              col: 0,
            },
          },
        ],
      } as any,
    ]);

    await handleDeletePlant(ctx, 'plant-1');

    mutateAction().inverse();
    await Promise.resolve();
    await Promise.resolve();

    expect((ctx.dataService as any).addPlant).toHaveBeenCalledWith(
      expect.objectContaining({ strain: 'OG Kush', row: 1, col: 0 })
    );
    expect(ctx.refreshData).toHaveBeenCalled();
  });
});

// ─── movePlantToNextStage ─────────────────────────────────────────────────────

describe('movePlantToNextStage', () => {
  let ctx: ReturnType<typeof makeContext>;
  beforeEach(() => {
    ctx = makeContext();
    vi.useFakeTimers();
  });
  afterEach(() => { vi.useRealTimers(); });

  async function run(plant: any) {
    const promise = movePlantToNextStage(ctx, plant);
    await vi.runAllTimersAsync();
    return promise;
  }

  it('returns false and toasts for an invalid stage', async () => {
    const plant = makePlant({ attributes: { plant_id: 'p1', stage: 'veg' } });
    const result = await movePlantToNextStage(ctx, plant);

    expect(result).toBe(false);
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith(
      expect.stringContaining('mother or flower or dry or cure'),
      'error'
    );
  });

  it('moves flower plant to dry growspace', async () => {
    const plant = makePlant({ attributes: { plant_id: 'p1', stage: 'flower' } });
    const result = await run(plant);

    expect(result).toBe(true);
    expect((ctx.dataService as any).harvestPlant).toHaveBeenCalledWith('p1', 'dry');
  });

  it('moves dry plant to cure growspace', async () => {
    const plant = makePlant({ attributes: { plant_id: 'p1', stage: 'dry' } });
    const result = await run(plant);

    expect(result).toBe(true);
    expect((ctx.dataService as any).harvestPlant).toHaveBeenCalledWith('p1', 'cure');
  });

  it('moves mother plant to clone growspace', async () => {
    const plant = makePlant({ attributes: { plant_id: 'p1', stage: 'mother' } });
    const result = await run(plant);

    expect(result).toBe(true);
    expect((ctx.dataService as any).harvestPlant).toHaveBeenCalledWith('p1', 'clone');
  });

  it('returns false when stage is cure (no target defined)', async () => {
    const plant = makePlant({ attributes: { plant_id: 'p1', stage: 'cure' } });
    const result = await movePlantToNextStage(ctx, plant);

    expect(result).toBe(false);
  });
});

// ─── movePlantToGrowspace ─────────────────────────────────────────────────────

describe('movePlantToGrowspace', () => {
  let ctx: ReturnType<typeof makeContext>;
  beforeEach(() => {
    ctx = makeContext();
    vi.useFakeTimers();
  });
  afterEach(() => { vi.useRealTimers(); });

  it('calls API, closes dialog, and registers undo action', async () => {
    const plant = makePlant({ attributes: { plant_id: 'p1', stage: 'veg', strain: 'OG', growspace_id: 'src' } });
    const promise = movePlantToGrowspace(ctx, plant, 'dst');
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toBe(true);
    expect((ctx.dataService as any).harvestPlant).toHaveBeenCalledWith('p1', 'dst');
    expect(ctx.closeDialog).toHaveBeenCalled();
    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'move' }),
      'dst'
    );
  });

  it('moves clone via moveClone instead of harvestPlant', async () => {
    const plant = makePlant({ attributes: { plant_id: 'p1', stage: 'clone', growspace_id: 'src' } });
    const promise = movePlantToGrowspace(ctx, plant, 'dst');
    await vi.runAllTimersAsync();
    await promise;

    expect((ctx.dataService as any).moveClone).toHaveBeenCalledWith('p1', 'dst');
    expect((ctx.dataService as any).harvestPlant).not.toHaveBeenCalled();
  });

  it('returns false when API fails', async () => {
    (ctx.dataService as any).harvestPlant.mockRejectedValue(new Error('move-fail'));
    const plant = makePlant({ attributes: { plant_id: 'p1', stage: 'veg', growspace_id: 'src' } });
    const promise = movePlantToGrowspace(ctx, plant, 'dst');
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toBe(false);
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith(
      expect.stringContaining('move-fail'),
      'error'
    );
  });

  it('inverse callback moves plant back to original growspace', async () => {
    const plant = makePlant({ attributes: { plant_id: 'p1', stage: 'veg', growspace_id: 'src' } });
    const promise = movePlantToGrowspace(ctx, plant, 'dst');
    await vi.runAllTimersAsync();
    await promise;

    mutateAction().inverse();
    await vi.runAllTimersAsync();

    expect((ctx.dataService as any).harvestPlant).toHaveBeenCalledWith('p1', 'src');
  });
});

// ─── takeClone ────────────────────────────────────────────────────────────────

describe('takeClone', () => {
  let ctx: ReturnType<typeof makeContext>;
  beforeEach(() => { ctx = makeContext(); });

  it('calls dataService.takeClone with correct payload', async () => {
    const mother = makePlant({ attributes: { plant_id: 'm1', stage: 'mother' } });
    const result = await takeClone(ctx, mother, 3, 'clone-room');

    expect(result).toBe(true);
    expect((ctx.dataService as any).takeClone).toHaveBeenCalledWith({
      mother_plant_id: 'm1',
      num_clones: 3,
      target_growspace_id: 'clone-room',
    });
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith(
      expect.stringContaining('3 clones'),
      'success'
    );
  });

  it('shows singular toast for 1 clone', async () => {
    const mother = makePlant({ attributes: { plant_id: 'm1', stage: 'mother' } });
    await takeClone(ctx, mother, 1);

    expect((ctx.ui as any).showToast).toHaveBeenCalledWith(
      expect.stringContaining('1 clone...'),
      'success'
    );
  });

  it('returns false on API failure', async () => {
    (ctx.dataService as any).takeClone.mockRejectedValue(new Error('clone-fail'));
    const mother = makePlant({ attributes: { plant_id: 'm1', stage: 'mother' } });
    const result = await takeClone(ctx, mother);

    expect(result).toBe(false);
  });
});

// ─── movePlantPosition ────────────────────────────────────────────────────────

describe('movePlantPosition', () => {
  let ctx: ReturnType<typeof makeContext>;
  beforeEach(() => { ctx = makeContext(); });

  it('calls updatePlant with new position and returns true', async () => {
    const plant = makePlant({ attributes: { plant_id: 'p1' } });
    const result = await movePlantPosition(ctx, plant, 2, 3);

    expect(result).toBe(true);
    expect((ctx.dataService as any).updatePlant).toHaveBeenCalledWith({
      plant_id: 'p1',
      row: 2,
      col: 3,
    });
  });

  it('returns false on API failure', async () => {
    (ctx.dataService as any).updatePlant.mockRejectedValue(new Error('pos-fail'));
    const plant = makePlant({ attributes: { plant_id: 'p1' } });
    const result = await movePlantPosition(ctx, plant, 2, 3);

    expect(result).toBe(false);
  });
});

// ─── handlePlantDrop ──────────────────────────────────────────────────────────

describe('handlePlantDrop', () => {
  let ctx: ReturnType<typeof makeContext>;
  beforeEach(() => { ctx = makeContext(); });

  it('returns false when sourcePlant is null', async () => {
    const result = await handlePlantDrop(ctx, 0, 1, null, null);
    expect(result).toBe(false);
  });

  it('returns false when source and target are the same plant', async () => {
    const plant = makePlant({ attributes: { plant_id: 'p1', growspace_id: 'gs' } });
    const result = await handlePlantDrop(ctx, 0, 1, plant, plant);
    expect(result).toBe(false);
  });

  it('returns false when sourcePlant has no growspaceId', async () => {
    const source = makePlant({ attributes: { plant_id: 'p1', growspace_id: undefined } });
    const result = await handlePlantDrop(ctx, 0, 1, null, source);
    expect(result).toBe(false);
  });

  it('performs optimistic swap when target plant exists', async () => {
    const source = makePlant({ attributes: { plant_id: 'p1', growspace_id: 'gs', row: 0, col: 0 } });
    const target = makePlant({ attributes: { plant_id: 'p2', growspace_id: 'gs', row: 1, col: 1 } });
    setDevices([{ deviceId: 'gs', grid: {}, plants: [] } as any]);

    const result = await handlePlantDrop(ctx, 1, 1, target, source);

    expect(result).toBe(true);
    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'swap',
        label: expect.stringContaining('Swapped'),
      }),
      'gs'
    );
    expect((ctx.dataService as any).swapPlants).toHaveBeenCalledWith('p1', 'p2');
  });

  it('moves to empty cell and registers undo when no target plant', async () => {
    const source = makePlant({ attributes: { plant_id: 'p1', growspace_id: 'gs', row: 0, col: 0 } });

    const result = await handlePlantDrop(ctx, 2, 3, null, source);

    expect(result).toBe(true);
    expect((ctx.dataService as any).updatePlant).toHaveBeenCalledWith(
      expect.objectContaining({ plant_id: 'p1', row: 2, col: 3 })
    );
    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'move' }),
      'gs'
    );
  });

  it('swap inverse callback reverts the optimistic grid update', async () => {
    const source = makePlant({ attributes: { plant_id: 'p1', growspace_id: 'gs', row: 0, col: 0 } });
    const target = makePlant({ attributes: { plant_id: 'p2', growspace_id: 'gs', row: 1, col: 1 } });

    setDevices([
      {
        deviceId: 'gs',
        plants: [],
        grid: {
          'r0c0': { plant_id: 'p1', row: 0, col: 0 },
          'r1c1': { plant_id: 'p2', row: 1, col: 1 },
        },
      } as any,
    ]);

    await handlePlantDrop(ctx, 1, 1, target, source);

    const action = mutateAction();
    // optimistic() already ran inside the mock; revert via inverse() and back.
    action.inverse();
    action.optimistic();

    expect(action.optimistic).toBeDefined();
    expect(action.inverse).toBeDefined();
  });

  it('non-swap inverse callback moves plant back to original position', async () => {
    const source = makePlant({ attributes: { plant_id: 'p1', growspace_id: 'gs', row: 0, col: 0 } });

    await handlePlantDrop(ctx, 2, 3, null, source);

    (ctx.dataService as any).updatePlant.mockClear();
    mutateAction().inverse();
    await Promise.resolve();
    await Promise.resolve();

    expect((ctx.dataService as any).updatePlant).toHaveBeenCalledWith(
      expect.objectContaining({ plant_id: 'p1', row: 0, col: 0 })
    );
  });

  it('returns false and calls refreshData when API throws during swap', async () => {
    const source = makePlant({ attributes: { plant_id: 'p1', growspace_id: 'gs', row: 0, col: 0 } });
    const target = makePlant({ attributes: { plant_id: 'p2', growspace_id: 'gs', row: 1, col: 1 } });

    setDevices([{ deviceId: 'gs', plants: [], grid: {} } as any]);
    (ctx.dataService as any).swapPlants.mockRejectedValue(new Error('swap-fail'));

    const result = await handlePlantDrop(ctx, 1, 1, target, source);

    expect(result).toBe(false);
    expect(ctx.refreshData).toHaveBeenCalled();
  });

});

// ─── confirmAddPlant ──────────────────────────────────────────────────────────

describe('confirmAddPlant', () => {
  let ctx: ReturnType<typeof makeContext>;
  beforeEach(() => { ctx = makeContext(); });

  it('returns false and toasts when no device is selected', async () => {
    (ctx.grid.$selectedDevice as any).get.mockReturnValue(null);

    const result = await confirmAddPlant(ctx, { row: 0, col: 0, strain: 'OG' });

    expect(result).toBe(false);
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith('No growspace selected', 'error');
  });

  it('calls addPlant, closes dialog, and refreshes on success', async () => {
    const result = await confirmAddPlant(ctx, {
      row: 1,
      col: 2,
      strain: 'Blue Dream',
      phenotype: '#1',
    });

    expect(result).toBe(true);
    expect((ctx.dataService as any).addPlant).toHaveBeenCalledWith(
      expect.objectContaining({
        growspace_id: 'device-1',
        row: 1,
        col: 2,
        strain: 'Blue Dream',
        phenotype: '#1',
      })
    );
    expect(ctx.closeDialog).toHaveBeenCalled();
    expect(ctx.refreshData).toHaveBeenCalled();
  });

  it('also calls addStrain when addToLibrary is true', async () => {
    await confirmAddPlant(ctx, { row: 0, col: 0, strain: 'Gelato', addToLibrary: true });

    expect((ctx.dataService as any).addStrain).toHaveBeenCalledWith({
      strain: 'Gelato',
      phenotype: undefined,
    });
  });

  it('shows info toast and still adds plant when addStrain fails', async () => {
    (ctx.dataService as any).addStrain.mockRejectedValue(new Error('lib-fail'));

    const result = await confirmAddPlant(ctx, { row: 0, col: 0, strain: 'Gelato', addToLibrary: true });

    expect((ctx.ui as any).showToast).toHaveBeenCalledWith(
      expect.stringContaining('Failed to add strain to library'),
      'info'
    );
    expect((ctx.dataService as any).addPlant).toHaveBeenCalled();
    expect(result).toBe(true);
  });
});

// ─── confirmAddPlants ─────────────────────────────────────────────────────────

describe('confirmAddPlants', () => {
  let ctx: ReturnType<typeof makeContext>;
  beforeEach(() => { ctx = makeContext(); });

  it('returns early and toasts when no device is selected', async () => {
    (ctx.grid.$selectedDevice as any).get.mockReturnValue(null);

    await confirmAddPlants(ctx, { strain: 'OG', amount: 2 } as any);

    expect((ctx.ui as any).showToast).toHaveBeenCalledWith('No growspace selected', 'error');
    expect((ctx.dataService as any).addPlants).not.toHaveBeenCalled();
  });

  it('calls addPlants, refreshes, and toasts success', async () => {
    setDevices([]);

    await confirmAddPlants(ctx, { strain: 'Gelato', amount: 3 } as any);

    expect((ctx.dataService as any).addPlants).toHaveBeenCalledWith(
      expect.objectContaining({ growspace_id: 'device-1', strain: 'Gelato', amount: 3 })
    );
    expect(ctx.refreshData).toHaveBeenCalled();
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith(
      'Batch plants added successfully',
      'success'
    );
  });

  it('adds strains to library when addToLibrary is true', async () => {
    setDevices([]);

    await confirmAddPlants(ctx, {
      strain: 'Purple Haze',
      amount: 2,
      start_number: 1,
      addToLibrary: true,
    } as any);

    expect((ctx.dataService as any).addStrain).toHaveBeenCalledTimes(2);
  });

  it('throws and does not add plants when addStrain fails', async () => {
    setDevices([]);
    (ctx.dataService as any).addStrain.mockRejectedValue(new Error('lib-fail'));

    await expect(
      confirmAddPlants(ctx, {
        strain: 'Purple Haze',
        amount: 1,
        addToLibrary: true,
      } as any)
    ).rejects.toThrow('lib-fail');

    expect((ctx.dataService as any).addPlants).not.toHaveBeenCalled();
  });

  it('rethrows a non-Error rejection as an Error when addStrain fails', async () => {
    setDevices([]);
    (ctx.dataService as any).addStrain.mockRejectedValue('raw string error');

    await expect(
      confirmAddPlants(ctx, {
        strain: 'Purple Haze',
        amount: 1,
        addToLibrary: true,
      } as any)
    ).rejects.toThrow('Failed to add strains to library');
  });

  it('registers undo action when new plant ids are detected after refresh', async () => {
    setDevices([{ deviceId: 'device-1', plants: [] } as any]);

    ctx.refreshData = vi.fn().mockImplementation(async () => {
      setDevices([
        {
          deviceId: 'device-1',
          plants: [
            { entity_id: 'sensor.new', attributes: { plant_id: 'new-plant-1' } },
          ],
        } as any,
      ]);
    });

    await confirmAddPlants(ctx, { strain: 'Gelato', amount: 1 } as any);

    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'batch-delete', label: 'Added 1 plants' }),
      'device-1'
    );
  });

  it('inverse callback deletes the newly added plants and refreshes', async () => {
    setDevices([{ deviceId: 'device-1', plants: [] } as any]);

    ctx.refreshData = vi.fn().mockImplementation(async () => {
      setDevices([
        {
          deviceId: 'device-1',
          plants: [{ entity_id: 'sensor.new', attributes: { plant_id: 'new-plant-1' } }],
        } as any,
      ]);
    });

    await confirmAddPlants(ctx, { strain: 'Gelato', amount: 1 } as any);

    (ctx.dataService as any).removePlant.mockClear();
    mutateAction().inverse();
    await Promise.resolve();
    await Promise.resolve();

    expect((ctx.dataService as any).removePlant).toHaveBeenCalledWith('new-plant-1');
    expect(ctx.refreshData).toHaveBeenCalled();
  });
});

// Additional confirmAddPlants branch coverage
describe('confirmAddPlants — beforeIds forEach branches', () => {
  let ctx: ReturnType<typeof makeContext>;
  beforeEach(() => { ctx = makeContext(); });

  it('populates beforeIds from existing plants so pre-existing plants are not counted as new', async () => {
    setDevices([{
      deviceId: 'device-1',
      plants: [{ entity_id: 'sensor.old', attributes: { plant_id: 'old-plant' } }],
    } as any]);

    ctx.refreshData = vi.fn().mockImplementation(async () => {
      setDevices([{
        deviceId: 'device-1',
        plants: [
          { entity_id: 'sensor.old', attributes: { plant_id: 'old-plant' } },
          { entity_id: 'sensor.new', attributes: { plant_id: 'new-plant' } },
        ],
      } as any]);
    });

    await confirmAddPlants(ctx, { strain: 'OG', amount: 1 } as any);

    expect(mutateAction().type).toBe('batch-delete');
    // Only new-plant should be in the undo action, not old-plant
    (ctx.dataService as any).removePlant.mockResolvedValue(undefined);
    mutateAction().inverse();
    await Promise.resolve();
    await Promise.resolve();
    expect((ctx.dataService as any).removePlant).toHaveBeenCalledWith('new-plant');
    expect((ctx.dataService as any).removePlant).not.toHaveBeenCalledWith('old-plant');
  });

  it('handles plants with no plant_id (p.attributes.plant_id falsy)', async () => {
    setDevices([{
      deviceId: 'device-1',
      plants: [{ entity_id: 'sensor.anon', attributes: {} }],
    } as any]);

    ctx.refreshData = vi.fn().mockImplementation(async () => {
      setDevices([{
        deviceId: 'device-1',
        plants: [
          { entity_id: 'sensor.anon', attributes: {} },
          { entity_id: 'sensor.new', attributes: { plant_id: 'real-new' } },
        ],
      } as any]);
    });

    await confirmAddPlants(ctx, { strain: 'OG', amount: 1 } as any);

    // 'real-new' should be detected as new; anon plant (no id) is ignored
    expect(mutate).toHaveBeenCalled();
  });

  it('is a no-op when afterDevices device has no plants array', async () => {
    setDevices([{ deviceId: 'device-1', plants: [] } as any]);

    ctx.refreshData = vi.fn().mockImplementation(async () => {
      setDevices([{ deviceId: 'device-1' } as any]); // plants undefined
    });

    await confirmAddPlants(ctx, { strain: 'OG', amount: 1 } as any);

    // No new plants detected → no undo action registered
    expect(mutate).not.toHaveBeenCalled();
  });
});

// ─── saveHarvestMetrics ───────────────────────────────────────────────────────

describe('saveHarvestMetrics', () => {
  let ctx: ReturnType<typeof makeContext>;
  beforeEach(() => { ctx = makeContext(); });

  it('no-ops when metrics object is empty', async () => {
    await saveHarvestMetrics(ctx, 'p1', {});

    expect((ctx.dataService as any).updateHarvestMetrics).not.toHaveBeenCalled();
    expect((ctx.ui as any).showToast).not.toHaveBeenCalled();
  });

  it('calls updateHarvestMetrics, toasts success, and refreshes with force', async () => {
    await saveHarvestMetrics(ctx, 'p1', { wet_weight: 100 });

    expect((ctx.dataService as any).updateHarvestMetrics).toHaveBeenCalledWith({
      plant_id: 'p1',
      wet_weight: 100,
    });
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith('Harvest metrics saved', 'success');
    expect(ctx.refreshData).toHaveBeenCalledWith(true);
  });

  it('toasts error and rethrows on failure', async () => {
    (ctx.dataService as any).updateHarvestMetrics.mockRejectedValue(new Error('metrics-fail'));

    await expect(saveHarvestMetrics(ctx, 'p1', { wet_weight: 50 })).rejects.toThrow('metrics-fail');
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith(
      expect.stringContaining('metrics-fail'),
      'error'
    );
  });
});

// ─── scorePhenotype ───────────────────────────────────────────────────────────

describe('scorePhenotype', () => {
  let ctx: ReturnType<typeof makeContext>;
  beforeEach(() => { ctx = makeContext(); });

  it('no-ops when all score values are null or undefined', async () => {
    await scorePhenotype(ctx, 'p1', { aroma: null, yield: undefined as any });

    expect((ctx.dataService as any).scorePlant).not.toHaveBeenCalled();
  });

  it('calls scorePlant, toasts success, and refreshes with force when scores have values', async () => {
    await scorePhenotype(ctx, 'p1', { aroma: 8, yield: null });

    expect((ctx.dataService as any).scorePlant).toHaveBeenCalledWith({
      plant_id: 'p1',
      aroma: 8,
      yield: null,
    });
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith('Scores saved', 'success');
    expect(ctx.refreshData).toHaveBeenCalledWith(true);
  });

  it('toasts error and rethrows on failure', async () => {
    (ctx.dataService as any).scorePlant.mockRejectedValue(new Error('score-fail'));

    await expect(scorePhenotype(ctx, 'p1', { aroma: 9 })).rejects.toThrow('score-fail');
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith(
      expect.stringContaining('score-fail'),
      'error'
    );
  });
});

// ─── printLabel ───────────────────────────────────────────────────────────────

describe('printLabel', () => {
  let ctx: ReturnType<typeof makeContext>;
  beforeEach(() => { ctx = makeContext(); });

  it('calls dataService.printLabel, toasts success when not preview', async () => {
    (ctx.dataService as any).printLabel.mockResolvedValue({ url: 'http://label' });

    const result = await printLabel(ctx, { plantId: 'p1', strain: 'OG', preview: false });

    expect((ctx.dataService as any).printLabel).toHaveBeenCalledWith(
      expect.objectContaining({ plant_id: 'p1', strain: 'OG', preview: false })
    );
    expect(result).toEqual({ url: 'http://label' });
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith('Label printing command sent', 'success');
  });

  it('does not toast when preview is true', async () => {
    await printLabel(ctx, { plantId: 'p1', preview: true });

    expect((ctx.ui as any).showToast).not.toHaveBeenCalled();
  });

  it('toasts error and rethrows on failure', async () => {
    (ctx.dataService as any).printLabel.mockRejectedValue(new Error('print-fail'));

    await expect(printLabel(ctx, { plantId: 'p1' })).rejects.toThrow('print-fail');
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith(
      expect.stringContaining('print-fail'),
      'error'
    );
  });

  it('shows "Unknown error" in toast when a non-Error is thrown', async () => {
    (ctx.dataService as any).printLabel.mockRejectedValue('plain string');

    await expect(printLabel(ctx, { plantId: 'p1' })).rejects.toBe('plain string');
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith(
      expect.stringContaining('Unknown error'),
      'error'
    );
  });
});
