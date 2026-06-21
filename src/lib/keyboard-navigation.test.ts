/**
 * Unit tests for the keyboard navigation glue (relocated from the retired
 * store/system/keyboard-actions.ts). Drives the public functions against the real
 * UI / Grid / Grid-interaction slice atoms; the Plant slice's deletePlant mutator
 * is mocked so no backend call is attempted.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleKeyboardNavigation, deleteSelectedPlants } from './keyboard-navigation';
import { deletePlant } from '../slices/plant';
import {
  isEditMode$,
  selectedPlants$,
  focusedPlantIndex$,
  setEditMode,
} from '../slices/ui';
import { devices$, selectedDeviceId$, addOptimisticDeletedPlantId, clearOptimisticDeletedPlantIds } from '../slices/grid';
import { gridInteraction$, cancel } from '../slices/grid-interaction';

vi.mock('../slices/plant', () => ({
  deletePlant: vi.fn().mockResolvedValue(undefined),
}));

function makePlant(plantId: string, row: number, col: number) {
  return {
    entity_id: `sensor.${plantId}`,
    attributes: { plant_id: plantId, row, col, growspace_id: 'gs1' },
  } as any;
}

describe('keyboard-navigation', () => {
  beforeEach(() => {
    vi.mocked(deletePlant).mockClear();
    devices$.set([{ deviceId: 'gs1', plants: [makePlant('p1', 0, 0), makePlant('p2', 0, 1)] } as any]);
    selectedDeviceId$.set('gs1');
    focusedPlantIndex$.set(0);
    selectedPlants$.set(new Set());
    setEditMode(false);
    clearOptimisticDeletedPlantIds();
    cancel();
  });

  it('ArrowRight advances the focused index (wrapping)', () => {
    handleKeyboardNavigation('ArrowRight');
    expect(focusedPlantIndex$.get()).toBe(1);
    handleKeyboardNavigation('ArrowRight');
    expect(focusedPlantIndex$.get()).toBe(0); // wraps from 1 → 0 (2 plants)
  });

  it('ArrowLeft moves the focused index back (wrapping)', () => {
    focusedPlantIndex$.set(0);
    handleKeyboardNavigation('ArrowLeft');
    expect(focusedPlantIndex$.get()).toBe(1);
  });

  it('Enter selects the focused plant via grid-interaction', () => {
    focusedPlantIndex$.set(1);
    handleKeyboardNavigation('Enter');
    const state = gridInteraction$.get();
    expect(state.status).toBe('selected');
    expect((state as { status: 'selected'; plantId: string }).plantId).toBe('p2');
  });

  it('Delete removes the focused plant via the Plant slice', () => {
    focusedPlantIndex$.set(0);
    handleKeyboardNavigation('Delete');
    expect(deletePlant).toHaveBeenCalledWith('p1');
  });

  it('Delete with no focus but a selection removes the selected plants', () => {
    focusedPlantIndex$.set(-1);
    selectedPlants$.set(new Set(['p1', 'p2']));
    handleKeyboardNavigation('Backspace');
    expect(deletePlant).toHaveBeenCalledWith('p1');
    expect(deletePlant).toHaveBeenCalledWith('p2');
  });

  it('Escape exits edit mode', () => {
    setEditMode(true);
    handleKeyboardNavigation('Escape');
    expect(isEditMode$.get()).toBe(false);
  });

  it('does nothing when no plants are visible', () => {
    selectedDeviceId$.set(null);
    handleKeyboardNavigation('ArrowRight');
    expect(focusedPlantIndex$.get()).toBe(0);
    expect(deletePlant).not.toHaveBeenCalled();
  });

  it('excludes optimistically-deleted plants from navigation', () => {
    addOptimisticDeletedPlantId('p1');
    focusedPlantIndex$.set(0);
    // Only p2 visible now → Enter selects p2 at index 0.
    handleKeyboardNavigation('Enter');
    const state = gridInteraction$.get();
    expect((state as { status: 'selected'; plantId: string }).plantId).toBe('p2');
  });

  it('deleteSelectedPlants deletes every selected plant', () => {
    selectedPlants$.set(new Set(['p1', 'p2']));
    deleteSelectedPlants();
    expect(deletePlant).toHaveBeenCalledWith('p1');
    expect(deletePlant).toHaveBeenCalledWith('p2');
  });

  it('deleteSelectedPlants is a no-op with an empty selection', () => {
    selectedPlants$.set(new Set());
    deleteSelectedPlants();
    expect(deletePlant).not.toHaveBeenCalled();
  });
});
