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
} from './plant-actions';
import type { ActionContext } from '../core/action-context';
import { setDevices, optimisticDeletedPlantIds$ } from '../../slices/grid';

vi.mock('./library-actions', () => ({
  fetchStrainLibrary: vi.fn().mockResolvedValue(undefined),
}));

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
    undoRedoManager: { pushAction: vi.fn() } as any,
    optimisticManager: {
      applyOptimisticUpdate: vi.fn().mockResolvedValue('action-id'),
      confirmUpdate: vi.fn(),
    } as any,
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
    expect((ctx.undoRedoManager as any).pushAction).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'delete' })
    );
  });

  it('accepts an array of plant ids and registers batch-delete undo', async () => {
    setDevices([]);

    await handleDeletePlant(ctx, ['plant-1', 'plant-2']);

    expect((ctx.dataService as any).removePlant).toHaveBeenCalledTimes(2);
    expect((ctx.undoRedoManager as any).pushAction).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'batch-delete' })
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
    expect((ctx.undoRedoManager as any).pushAction).not.toHaveBeenCalled();
  });

  it('closes dialog when active dialog is PLANT_OVERVIEW', async () => {
    setDevices([]);
    (ctx.ui.$activeDialog as any).get.mockReturnValue({ type: 'PLANT_OVERVIEW' });

    await handleDeletePlant(ctx, 'plant-1');

    expect(ctx.closeDialog).toHaveBeenCalled();
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
    expect((ctx.undoRedoManager as any).pushAction).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'move' })
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
    expect((ctx.optimisticManager as any).applyOptimisticUpdate).toHaveBeenCalledWith(
      'swap',
      expect.objectContaining({ sourceId: 'p1', targetId: 'p2' }),
      expect.any(Function),
      expect.any(Function)
    );
    expect((ctx.dataService as any).swapPlants).toHaveBeenCalledWith('p1', 'p2');
    expect((ctx.optimisticManager as any).confirmUpdate).toHaveBeenCalledWith(
      'action-id',
      expect.objectContaining({ description: expect.stringContaining('Swapped') })
    );
  });

  it('moves to empty cell and registers undo when no target plant', async () => {
    const source = makePlant({ attributes: { plant_id: 'p1', growspace_id: 'gs', row: 0, col: 0 } });

    const result = await handlePlantDrop(ctx, 2, 3, null, source);

    expect(result).toBe(true);
    expect((ctx.dataService as any).updatePlant).toHaveBeenCalledWith(
      expect.objectContaining({ plant_id: 'p1', row: 2, col: 3 })
    );
    expect((ctx.undoRedoManager as any).pushAction).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'move' })
    );
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
});
