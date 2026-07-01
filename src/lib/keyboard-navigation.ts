/**
 * Keyboard navigation glue for the growspace grid.
 *
 * Pure navigation that reads/writes UI + Grid-interaction slice atoms and calls
 * the Plant slice's `deletePlant` mutator. Lives in `lib/` (not a slice) because
 * it spans the UI, Grid, Grid-interaction and Plant slices — folding it into any
 * one of them would make that slice a hub (see CONTEXT.md). Replaces the retired
 * `store/system/keyboard-actions.ts`.
 */

import { focusedPlantIndex$, setFocusedPlantIndex, showError } from '../slices/ui';
import { select } from '../slices/grid-interaction';
import { deletePlant } from '../slices/plant';
import type { GrowspaceStore } from '../store/core/growspace-store';
import type { PlantEntity } from '../types';

/**
 * Visible plants for this card's selected device, excluding
 * optimistically-deleted ones. Reads the card's per-card grid slice so
 * navigation follows the card the keypress came from.
 */
function getVisiblePlants(store: GrowspaceStore): PlantEntity[] {
  const selectedDevice = store.grid.$selectedDevice.get();
  if (!selectedDevice) return [];
  const device = store.grid.$activeDevices.get().find((d) => d.deviceId === selectedDevice);
  if (!device) return [];
  return device.plants;
}

/** Delete a set of plants via the Plant slice, then clear their selection. */
function deletePlants(store: GrowspaceStore, ids: string[]): void {
  if (ids.length === 0) return;
  void Promise.all(ids.map((id) => deletePlant(id)))
    .then(() => store.ui.deselectPlants(ids))
    .catch((e) => showError(e, 'Failed to delete plant'));
}

/** Delete every plant selected on this card (Delete key / toolbar action). */
export function deleteSelectedPlants(store: GrowspaceStore): void {
  deletePlants(store, Array.from(store.ui.$selectedPlants.get()));
}

/**
 * Handle a key press for grid navigation: arrows move focus, Enter/Space select
 * the focused plant, Delete/Backspace remove it (or the selection), Escape exits
 * edit mode. Selection and edit mode are read/written through the card's store
 * so keyboard actions stay scoped to the card that has focus.
 */
export function handleKeyboardNavigation(key: string, store: GrowspaceStore): void {
  if (store.ui.$isEditMode.get() && key === 'Escape') {
    store.ui.setEditMode(false);
    return;
  }

  const plants = getVisiblePlants(store);
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
        deletePlants(store, [focused.attributes.plant_id || focused.entity_id]);
      } else if (store.ui.$selectedPlants.get().size > 0) {
        deleteSelectedPlants(store);
      }
      break;
  }
}
