/**
 * Keyboard navigation glue for the growspace grid.
 *
 * Pure navigation that reads/writes UI + Grid-interaction slice atoms and calls
 * the Plant slice's `deletePlant` mutator. Lives in `lib/` (not a slice) because
 * it spans the UI, Grid, Grid-interaction and Plant slices — folding it into any
 * one of them would make that slice a hub (see CONTEXT.md). Replaces the retired
 * `store/system/keyboard-actions.ts`.
 */

import {
  isEditMode$,
  selectedPlants$,
  focusedPlantIndex$,
  setFocusedPlantIndex,
  setEditMode,
  clearPlantSelection,
  deselectPlants,
  showError,
} from '../slices/ui';
import { devices$, optimisticDeletedPlantIds$, selectedDeviceId$ } from '../slices/grid';
import { select } from '../slices/grid-interaction';
import { deletePlant } from '../slices/plant';
import type { PlantEntity } from '../types';

/** Visible plants for the selected device, excluding optimistically-deleted ones. */
function getVisiblePlants(): PlantEntity[] {
  const selectedDevice = selectedDeviceId$.get();
  if (!selectedDevice) return [];
  const device = devices$.get().find((d) => d.deviceId === selectedDevice);
  if (!device) return [];
  return device.plants.filter(
    (p) => !optimisticDeletedPlantIds$.get().has(p.attributes.plant_id || '')
  );
}

/** Delete a set of plants via the Plant slice, then clear their selection. */
function deletePlants(ids: string[]): void {
  if (ids.length === 0) return;
  void Promise.all(ids.map((id) => deletePlant(id)))
    .then(() => deselectPlants(ids))
    .catch((e) => showError(e, 'Failed to delete plant'));
}

/** Delete every currently-selected plant (Delete key / toolbar action). */
export function deleteSelectedPlants(): void {
  deletePlants(Array.from(selectedPlants$.get()));
}

/**
 * Handle a key press for grid navigation: arrows move focus, Enter/Space select
 * the focused plant, Delete/Backspace remove it (or the selection), Escape exits
 * edit mode.
 */
export function handleKeyboardNavigation(key: string): void {
  if (isEditMode$.get() && key === 'Escape') {
    setEditMode(false);
    clearPlantSelection();
    return;
  }

  const plants = getVisiblePlants();
  if (plants.length === 0) return;

  const currentIndex = focusedPlantIndex$.get();

  switch (key) {
    case 'ArrowRight':
      setFocusedPlantIndex((currentIndex + 1) % plants.length);
      break;

    case 'ArrowLeft':
      setFocusedPlantIndex((currentIndex - 1 + plants.length) % plants.length);
      break;

    case 'Enter':
    case ' ': {
      if (currentIndex >= 0 && currentIndex < plants.length) {
        const plantId = plants[currentIndex].attributes.plant_id;
        if (plantId) select(plantId);
      }
      break;
    }

    case 'Delete':
    case 'Backspace':
      if (currentIndex >= 0 && currentIndex < plants.length) {
        const focused = plants[currentIndex];
        deletePlants([focused.attributes.plant_id || focused.entity_id]);
      } else if (selectedPlants$.get().size > 0) {
        deleteSelectedPlants();
      }
      break;
  }
}
