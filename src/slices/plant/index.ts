/**
 * Plant slice — atoms and mutators for Plant domain data.
 *
 * Public API:
 *   plants$          — read: all plant entities for the active growspace
 *   selectedPlant$   — read: the currently-selected plant (null if none)
 *   setPlants()      — write: replace the plants array (called by bootstrap/sync)
 *   waterPlant()     — write: water a plant by ID (optimistic-safe, undo-able)
 *
 * Action type and zod schemas are private to this module.
 */

import { atom } from 'nanostores';
import type { PlantEntity } from '../../features/plants/types';
import { mutate } from '../../services/mutate';
import { callService } from '../../services/hass-call';

// ---------------------------------------------------------------------------
// Atoms (public read)
// ---------------------------------------------------------------------------

export const plants$ = atom<PlantEntity[]>([]);
export const selectedPlant$ = atom<PlantEntity | null>(null);

// ---------------------------------------------------------------------------
// Bootstrap write (called by SyncService when fresh data arrives)
// ---------------------------------------------------------------------------

export function setPlants(plants: PlantEntity[]): void {
  plants$.set(plants);
}

// ---------------------------------------------------------------------------
// Mutators (public write)
// ---------------------------------------------------------------------------

/**
 * Water a plant.
 *
 * Optimistic: no local atom change (plant state is authoritative from backend).
 * Apply: calls growspace_manager.water_plant service.
 * Inverse: no-op (service call is not reversible, but undo stack entry is kept).
 */
export async function waterPlant(
  plantId: string,
  amountMl: number,
  nutrients?: Record<string, number>,
  presetId?: string,
): Promise<void> {
  const payload: Record<string, unknown> = {
    plant_id: plantId,
    amount: amountMl,
  };
  if (nutrients && Object.keys(nutrients).length > 0) {
    payload.nutrients = nutrients;
  }
  if (presetId) {
    payload.preset_id = presetId;
  }

  await mutate({
    type: 'waterPlant',
    optimistic: () => {
      // No optimistic atom update for watering — backend is authoritative.
      // A future iteration could set a "watering in progress" flag here.
    },
    inverse: () => {
      // Watering is not reversible at the backend level; this is a no-op undo.
    },
    apply: () => callService('growspace_manager', 'water_plant', payload),
  });
}
