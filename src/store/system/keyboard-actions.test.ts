import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { atom } from 'nanostores';
import * as uiActions from '../ui/ui-actions';
import * as plantActions from '../plant/plant-actions';
import { select } from '../../slices/grid-interaction';
import type { ActionContext } from '../core/action-context';
import { setDevices, devices$, optimisticDeletedPlantIds$ } from '../../slices/grid';
import { GrowspaceUIStore } from '../ui/ui-store';
import type { PlantEntity } from '../../types';
import { handleKeyboardNavigation } from './keyboard-actions';

vi.mock('../ui/ui-actions', () => ({ exitEditMode: vi.fn() }));
vi.mock('../plant/plant-actions', () => ({ handleDeletePlant: vi.fn() }));
vi.mock('../../slices/grid-interaction', () => ({ select: vi.fn(), cancel: vi.fn() }));

function makePlant(id: string): PlantEntity {
  return { entity_id: `sensor.${id}`, attributes: { plant_id: id } } as unknown as PlantEntity;
}

function makeContext(plants: PlantEntity[] = []): ActionContext {
  const ui = new GrowspaceUIStore();
  const $selectedDevice = atom<string | null>(null);

  if (plants.length > 0) {
    $selectedDevice.set('device-1');
    setDevices([
      { deviceId: 'device-1', plants } as unknown as import('../../types').GrowspaceDevice,
    ]);
  }

  return {
    ui,
    grid: { $selectedDevice } as unknown as ActionContext['grid'],
    dataService: {} as ActionContext['dataService'],
    undoRedoManager: {} as ActionContext['undoRedoManager'],
    optimisticManager: {} as ActionContext['optimisticManager'],
    closeDialog: () => {},
    refreshData: async () => {},
  } satisfies ActionContext;
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  setDevices([]);
  optimisticDeletedPlantIds$.set(new Set());
});

describe('handleKeyboardNavigation — Escape', () => {
  it('calls exitEditMode when in edit mode', () => {
    const ctx = makeContext();
    ctx.ui.$isEditMode.set(true);

    handleKeyboardNavigation(ctx, 'Escape');

    expect(uiActions.exitEditMode).toHaveBeenCalledWith(ctx);
  });

  it('does not call exitEditMode when not in edit mode', () => {
    const ctx = makeContext([makePlant('p1')]);
    ctx.ui.$isEditMode.set(false);

    handleKeyboardNavigation(ctx, 'Escape');

    expect(uiActions.exitEditMode).not.toHaveBeenCalled();
  });
});

describe('handleKeyboardNavigation — ArrowRight', () => {
  it('increments the focused plant index', () => {
    const ctx = makeContext([makePlant('p1'), makePlant('p2')]);
    ctx.ui.setFocusedPlantIndex(0);

    handleKeyboardNavigation(ctx, 'ArrowRight');

    expect(ctx.ui.$focusedPlantIndex.get()).toBe(1);
  });

  it('wraps from the last plant back to the first', () => {
    const ctx = makeContext([makePlant('p1'), makePlant('p2')]);
    ctx.ui.setFocusedPlantIndex(1);

    handleKeyboardNavigation(ctx, 'ArrowRight');

    expect(ctx.ui.$focusedPlantIndex.get()).toBe(0);
  });
});

describe('handleKeyboardNavigation — ArrowLeft', () => {
  it('decrements the focused plant index', () => {
    const ctx = makeContext([makePlant('p1'), makePlant('p2')]);
    ctx.ui.setFocusedPlantIndex(1);

    handleKeyboardNavigation(ctx, 'ArrowLeft');

    expect(ctx.ui.$focusedPlantIndex.get()).toBe(0);
  });

  it('wraps from the first plant back to the last', () => {
    const ctx = makeContext([makePlant('p1'), makePlant('p2')]);
    ctx.ui.setFocusedPlantIndex(0);

    handleKeyboardNavigation(ctx, 'ArrowLeft');

    expect(ctx.ui.$focusedPlantIndex.get()).toBe(1);
  });
});

describe('handleKeyboardNavigation — Enter / Space', () => {
  it('Enter calls select with the focused plant id', () => {
    const ctx = makeContext([makePlant('p1')]);
    ctx.ui.setFocusedPlantIndex(0);

    handleKeyboardNavigation(ctx, 'Enter');

    expect(select).toHaveBeenCalledWith('p1');
  });

  it('Space calls select with the focused plant id', () => {
    const ctx = makeContext([makePlant('p1')]);
    ctx.ui.setFocusedPlantIndex(0);

    handleKeyboardNavigation(ctx, ' ');

    expect(select).toHaveBeenCalledWith('p1');
  });
});

describe('handleKeyboardNavigation — Delete / Backspace', () => {
  it('Delete with a focused plant calls handleDeletePlant with that plant id', () => {
    const ctx = makeContext([makePlant('p1'), makePlant('p2')]);
    ctx.ui.setFocusedPlantIndex(0);

    handleKeyboardNavigation(ctx, 'Delete');

    expect(plantActions.handleDeletePlant).toHaveBeenCalledWith(ctx, 'p1');
  });

  it('Backspace with a focused plant calls handleDeletePlant with that plant id', () => {
    const ctx = makeContext([makePlant('p1')]);
    ctx.ui.setFocusedPlantIndex(0);

    handleKeyboardNavigation(ctx, 'Backspace');

    expect(plantActions.handleDeletePlant).toHaveBeenCalledWith(ctx, 'p1');
  });

  it('Delete with selected plants and no focus deletes all selected ids', () => {
    const ctx = makeContext([makePlant('p1'), makePlant('p2')]);
    ctx.ui.$selectedPlants.set(new Set(['p1', 'p2']));
    ctx.ui.setFocusedPlantIndex(-1);

    handleKeyboardNavigation(ctx, 'Delete');

    expect(plantActions.handleDeletePlant).toHaveBeenCalledWith(
      ctx,
      expect.arrayContaining(['p1', 'p2'])
    );
  });
});

describe('handleKeyboardNavigation — empty plant list', () => {
  it('navigation keys are no-ops when there are no visible plants', () => {
    const ctx = makeContext([]);

    handleKeyboardNavigation(ctx, 'ArrowRight');
    handleKeyboardNavigation(ctx, 'ArrowLeft');
    handleKeyboardNavigation(ctx, 'Enter');
    handleKeyboardNavigation(ctx, 'Delete');

    expect(ctx.ui.$focusedPlantIndex.get()).toBe(-1);
    expect(select).not.toHaveBeenCalled();
    expect(plantActions.handleDeletePlant).not.toHaveBeenCalled();
  });
});

describe('handleKeyboardNavigation — getVisiblePlants edge cases', () => {
  it('returns no plants when selectedDevice is set but device not found in devices$', () => {
    const ctx = makeContext([]);
    // Set a device ID but don't populate devices$ with it
    ctx.grid.$selectedDevice.set('ghost-device');

    // ArrowRight is a no-op when no visible plants
    handleKeyboardNavigation(ctx, 'ArrowRight');

    expect(ctx.ui.$focusedPlantIndex.get()).toBe(-1);
  });

  it('filters out plants marked in optimisticDeletedPlantIds$', () => {
    const ctx = makeContext([makePlant('p1'), makePlant('p2')]);
    optimisticDeletedPlantIds$.set(new Set(['p1', 'p2']));

    // Both plants are filtered out, so navigation is a no-op
    handleKeyboardNavigation(ctx, 'ArrowRight');

    expect(ctx.ui.$focusedPlantIndex.get()).toBe(-1);
    expect(select).not.toHaveBeenCalled();
  });
});

describe('handleKeyboardNavigation — Enter/Space guard branches', () => {
  it('Enter is a no-op when currentIndex is out of bounds', () => {
    const ctx = makeContext([makePlant('p1')]);
    ctx.ui.setFocusedPlantIndex(-1);

    handleKeyboardNavigation(ctx, 'Enter');

    expect(select).not.toHaveBeenCalled();
  });

  it('Enter does not call select when focused plant has no plant_id', () => {
    const plantWithoutId: PlantEntity = {
      entity_id: 'sensor.anon',
      attributes: {},
    } as unknown as PlantEntity;
    const ctx = makeContext([plantWithoutId]);
    ctx.ui.setFocusedPlantIndex(0);

    handleKeyboardNavigation(ctx, 'Enter');

    expect(select).not.toHaveBeenCalled();
  });
});

describe('handleKeyboardNavigation — Delete guard branches', () => {
  it('Delete is a no-op when currentIndex is out of bounds and selectedPlants is empty', () => {
    const ctx = makeContext([makePlant('p1')]);
    ctx.ui.setFocusedPlantIndex(-1);
    ctx.ui.$selectedPlants.set(new Set());

    handleKeyboardNavigation(ctx, 'Delete');

    expect(plantActions.handleDeletePlant).not.toHaveBeenCalled();
  });

  it('Delete falls back to entity_id when focused plant has no plant_id', () => {
    const plantNoId: PlantEntity = {
      entity_id: 'sensor.fallback',
      attributes: {},
    } as unknown as PlantEntity;
    const ctx = makeContext([plantNoId]);
    ctx.ui.setFocusedPlantIndex(0);

    handleKeyboardNavigation(ctx, 'Delete');

    expect(plantActions.handleDeletePlant).toHaveBeenCalledWith(ctx, 'sensor.fallback');
  });
});
