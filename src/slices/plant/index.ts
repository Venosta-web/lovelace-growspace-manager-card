/**
 * Plant slice — atoms and mutators for Plant domain data.
 *
 * Public API (atoms):
 *   plants$          — read: all plant entities for the active growspace
 *   selectedPlant$   — read: the currently-selected plant (null if none)
 *   setPlants()      — write: replace the plants array (called by bootstrap/sync)
 *
 * Public API (mutators):
 *   waterPlant()          — water a plant (pilot mutator)
 *   addPlant()            — add a single plant to a growspace
 *   addPlants()           — batch-add plants to a growspace
 *   updatePlant()         — update attributes on a plant (optimistic)
 *   deletePlant()         — remove a plant (optimistic)
 *   harvestPlant()        — move a plant to its harvest target
 *   movePlantToGrowspace() — move/transplant a plant to any growspace
 *   swapPlants()          — swap grid positions of two plants (optimistic)
 *   takeClone()           — take clones from a mother plant
 *   printLabel()          — fire-and-forget: print a plant label
 *   saveHarvestMetrics()  — persist yield metrics on a harvested plant
 *   scorePlant()          — score phenotype traits on a plant
 *   logDryingWeight()     — log a drying weight reading
 *   logMoistureReading()  — log a substrate moisture reading
 *   setVisualTag()        — attach or clear a visual tag on a plant
 *
 * Action type, payload shapes, and zod schemas are private to this module.
 * Cross-slice side-effects via Grid slice sibling setters are wired below.
 */

import { atom } from 'nanostores';
import type { PlantEntity } from '../../features/plants/types';
import { mutate } from '../../services/mutate';
import { callService } from '../../services/hass-call';
import {
  addOptimisticDeletedPlantId,
  removeOptimisticDeletedPlantId,
} from '../grid';

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
// Private helpers
// ---------------------------------------------------------------------------

/** Resolve the growspace_id for a plant by its plant_id from plants$. Returns '' if not found. */
function _growspaceIdFor(plantId: string): string {
  const plant = plants$
    .get()
    .find((p) => (p.attributes.plant_id ?? p.entity_id.replace('sensor.', '')) === plantId);
  return plant?.attributes.growspace_id ?? '';
}

/** Replace a single plant in plants$ by plant_id, merging attribute updates. */
function _patchPlant(id: string, updates: Partial<PlantEntity['attributes']>): PlantEntity[] {
  return plants$.get().map((p) => {
    const pid = p.attributes.plant_id ?? p.entity_id.replace('sensor.', '');
    if (pid !== id) return p;
    return { ...p, attributes: { ...p.attributes, ...updates } };
  });
}

/** Swap the row/col of two plants in plants$ by their IDs. */
function _swapPositions(id1: string, id2: string): PlantEntity[] {
  const current = plants$.get();
  const p1 = current.find((p) => (p.attributes.plant_id ?? p.entity_id.replace('sensor.', '')) === id1);
  const p2 = current.find((p) => (p.attributes.plant_id ?? p.entity_id.replace('sensor.', '')) === id2);
  if (!p1 || !p2) return current;
  const [r1, c1] = [p1.attributes.row, p1.attributes.col];
  const [r2, c2] = [p2.attributes.row, p2.attributes.col];
  return current.map((p) => {
    const pid = p.attributes.plant_id ?? p.entity_id.replace('sensor.', '');
    if (pid === id1) return { ...p, attributes: { ...p.attributes, row: r2, col: c2 } };
    if (pid === id2) return { ...p, attributes: { ...p.attributes, row: r1, col: c1 } };
    return p;
  });
}

// ---------------------------------------------------------------------------
// Mutators (public write)
// ---------------------------------------------------------------------------

/**
 * Water a plant.
 *
 * Optimistic: none (backend is authoritative for watering state).
 * Apply: calls growspace_manager.water_plant.
 * Inverse: no-op.
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

  await mutate(
    {
      type: 'waterPlant',
      optimistic: () => { },
      inverse: () => { },
      apply: () => callService('growspace_manager', 'water_plant', payload),
    },
    _growspaceIdFor(plantId),
  );
}

/**
 * Add a single plant to a growspace.
 *
 * Optimistic: none (no ID assigned until backend responds).
 * Apply: calls growspace_manager.add_plant.
 * Inverse: no-op.
 */
export async function addPlant(params: {
  growspace_id: string;
  row: number;
  col: number;
  strain: string;
  phenotype?: string;
  veg_start?: string;
  flower_start?: string;
  seedling_start?: string;
  mother_start?: string;
  clone_start?: string;
  dry_start?: string;
  cure_start?: string;
}): Promise<void> {
  const payload: Record<string, unknown> = { ...params };

  await mutate(
    {
      type: 'addPlant',
      optimistic: () => { },
      inverse: () => { },
      apply: () => callService('growspace_manager', 'add_plant', payload),
    },
    params.growspace_id,
  );
}

/**
 * Batch-add plants to a growspace.
 *
 * Optimistic: none.
 * Apply: calls growspace_manager.add_plants.
 * Inverse: no-op.
 */
export async function addPlants(params: {
  growspace_id: string;
  strain: string;
  amount: number;
  start_number?: number;
  phenotype?: string;
  veg_start?: string;
  flower_start?: string;
  seedling_start?: string;
  mother_start?: string;
  clone_start?: string;
  dry_start?: string;
  cure_start?: string;
}): Promise<void> {
  const payload: Record<string, unknown> = { ...params };

  await mutate(
    {
      type: 'addPlants',
      optimistic: () => { },
      inverse: () => { },
      apply: () => callService('growspace_manager', 'add_plants', payload),
    },
    params.growspace_id,
  );
}

/**
 * Update attributes on a plant.
 *
 * Optimistic: patches plants$ immediately with the new attributes.
 * Apply: calls growspace_manager.update_plant.
 * Inverse: restores the original plant in plants$.
 */
export async function updatePlant(
  plantId: string,
  updates: Partial<PlantEntity['attributes']>,
): Promise<void> {
  const originalList = plants$.get();
  const patched = _patchPlant(plantId, updates);

  await mutate(
    {
      type: 'updatePlant',
      optimistic: () => plants$.set(patched),
      inverse: () => plants$.set(originalList),
      apply: () =>
        callService('growspace_manager', 'update_plant', { plant_id: plantId, ...updates }),
    },
    _growspaceIdFor(plantId),
  );
}

/**
 * Remove a plant from its growspace.
 *
 * Optimistic: removes the plant from plants$ immediately; adds to Grid slice's
 *   optimisticDeletedPlantIds so the cell clears in the grid layout.
 * Apply: calls growspace_manager.remove_plant.
 * Inverse: restores the plant to plants$ and removes from optimistic deletes.
 */
export async function deletePlant(plantId: string): Promise<void> {
  const originalList = plants$.get();
  const filtered = originalList.filter(
    (p) => (p.attributes.plant_id ?? p.entity_id.replace('sensor.', '')) !== plantId,
  );

  await mutate(
    {
      type: 'deletePlant',
      optimistic: () => {
        plants$.set(filtered);
        addOptimisticDeletedPlantId(plantId);
      },
      inverse: () => {
        plants$.set(originalList);
        removeOptimisticDeletedPlantId(plantId);
      },
      apply: () => callService('growspace_manager', 'remove_plant', { plant_id: plantId }),
    },
    _growspaceIdFor(plantId),
  );
}

/**
 * Move a plant to its next harvest stage (flower→dry, dry→cure, etc.).
 *
 * Optimistic: none (backend decides the new stage/location).
 * Apply: calls growspace_manager.harvest_plant.
 * Inverse: no-op.
 *
 * TODO(slice-logbook): record a harvest event in the Logbook slice.
 */
export async function harvestPlant(
  plantId: string,
  targetGrowspaceId: string,
  metrics?: {
    wet_weight?: number;
    dry_weight?: number;
    trim_weight?: number;
    thc_percentage?: number;
    cbd_percentage?: number;
    terpene_profile?: string;
  },
): Promise<void> {
  const payload: Record<string, unknown> = {
    plant_id: plantId,
    target_growspace_id: targetGrowspaceId,
  };
  if (metrics) {
    if (metrics.wet_weight != null) payload.wet_weight = metrics.wet_weight;
    if (metrics.dry_weight != null) payload.dry_weight = metrics.dry_weight;
    if (metrics.trim_weight != null) payload.trim_weight = metrics.trim_weight;
    if (metrics.thc_percentage != null) payload.thc_percentage = metrics.thc_percentage;
    if (metrics.cbd_percentage != null) payload.cbd_percentage = metrics.cbd_percentage;
    if (metrics.terpene_profile) payload.terpene_profile = metrics.terpene_profile;
  }

  await mutate(
    {
      type: 'harvestPlant',
      optimistic: () => { },
      inverse: () => { },
      apply: () => callService('growspace_manager', 'harvest_plant', payload),
    },
    _growspaceIdFor(plantId),
  );
}

/**
 * Move or transplant a plant to a specific growspace.
 *
 * Uses move_clone for clone-stage plants; move_plant for all others.
 *
 * Optimistic: adds plant to Grid slice's optimisticDeletedPlantIds to clear its source cell.
 * Apply: calls growspace_manager.move_clone or move_plant.
 * Inverse: removes from optimistic deletes to restore the source cell.
 */
export async function movePlantToGrowspace(
  plant: PlantEntity,
  targetGrowspaceId: string,
  transitionDate?: string,
): Promise<void> {
  const plantId = plant.attributes.plant_id ?? plant.entity_id.replace('sensor.', '');
  const isClone = plant.attributes.stage === 'clone';

  const service = isClone ? 'move_clone' : 'move_plant';
  const payload: Record<string, unknown> = {
    plant_id: plantId,
    target_growspace_id: targetGrowspaceId,
  };
  if (transitionDate) {
    payload.transition_date = transitionDate;
  }

  const sourceGrowspaceId = _growspaceIdFor(plantId);

  await mutate(
    {
      type: 'movePlantToGrowspace',
      optimistic: () => {
        addOptimisticDeletedPlantId(plantId);
      },
      inverse: () => {
        removeOptimisticDeletedPlantId(plantId);
      },
      apply: () => callService('growspace_manager', service, payload),
    },
    sourceGrowspaceId,
  );
}

/**
 * Swap the grid positions of two plants.
 *
 * Optimistic: swaps row/col for both plants in plants$.
 * Apply: calls growspace_manager.switch_plants.
 * Inverse: swaps back on failure.
 *
 * The Grid slice's gridLayout$ is derived from devices$ which updates on the next
 * SyncService refresh; plants$ carries the optimistic swap for immediate render.
 */
export async function swapPlants(plantId1: string, plantId2: string): Promise<void> {
  const originalList = plants$.get();
  const swapped = _swapPositions(plantId1, plantId2);

  await mutate(
    {
      type: 'swapPlants',
      optimistic: () => plants$.set(swapped),
      inverse: () => plants$.set(originalList),
      apply: () =>
        callService('growspace_manager', 'switch_plants', {
          plant1_id: plantId1,
          plant2_id: plantId2,
        }),
    },
    _growspaceIdFor(plantId1),
  );
}

/**
 * Take clones from a mother plant.
 *
 * Optimistic: none.
 * Apply: calls growspace_manager.take_clone.
 * Inverse: no-op.
 */
export async function takeClone(
  motherPlant: PlantEntity,
  numClones?: number,
  targetGrowspaceId?: string,
): Promise<void> {
  const plantId = motherPlant.attributes.plant_id ?? motherPlant.entity_id.replace('sensor.', '');
  const payload: Record<string, unknown> = { mother_plant_id: plantId };
  if (numClones !== undefined) payload.num_clones = numClones;
  if (targetGrowspaceId) payload.target_growspace_id = targetGrowspaceId;

  await mutate(
    {
      type: 'takeClone',
      optimistic: () => { },
      inverse: () => { },
      apply: () => callService('growspace_manager', 'take_clone', payload),
    },
    _growspaceIdFor(plantId),
  );
}

/**
 * Print a label for a plant or strain (fire-and-forget, no undo).
 *
 * Not wrapped in mutate — label printing is a side-effect-only operation.
 */
export async function printLabel(params: {
  plantId?: string;
  strain?: string;
  phenotype?: string;
  breeder?: string;
  lineage?: string;
  breederLogo?: string;
  deviceId?: string;
  preview?: boolean;
}): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (params.plantId !== undefined) payload.plant_id = params.plantId;
  if (params.strain !== undefined) payload.strain = params.strain;
  if (params.phenotype !== undefined) payload.phenotype = params.phenotype;
  if (params.breeder !== undefined) payload.breeder = params.breeder;
  if (params.lineage !== undefined) payload.lineage = params.lineage;
  if (params.breederLogo !== undefined) payload.breeder_logo = params.breederLogo;
  if (params.deviceId !== undefined) payload.device_id = params.deviceId;
  if (params.preview !== undefined) payload.preview = params.preview;

  await callService('growspace_manager', 'print_label', payload);
}

/**
 * Persist harvest yield metrics on a harvested plant.
 *
 * No-ops silently when the metrics object has no keys.
 * Optimistic: none.
 * Apply: calls growspace_manager.update_harvest_metrics.
 * Inverse: no-op.
 */
export async function saveHarvestMetrics(
  plantId: string,
  metrics: Record<string, unknown>,
): Promise<void> {
  if (Object.keys(metrics).length === 0) return;

  await mutate(
    {
      type: 'saveHarvestMetrics',
      optimistic: () => { },
      inverse: () => { },
      apply: () =>
        callService('growspace_manager', 'update_harvest_metrics', {
          plant_id: plantId,
          ...metrics,
        }),
    },
    _growspaceIdFor(plantId),
  );
}

/**
 * Score phenotype traits on a plant.
 *
 * No-ops silently when every value in the scores map is null or undefined.
 * Optimistic: none.
 * Apply: calls growspace_manager.score_plant.
 * Inverse: no-op.
 */
export async function scorePlant(
  plantId: string,
  scores: Record<string, number | null>,
): Promise<void> {
  const hasValue = Object.values(scores).some((v) => v !== null && v !== undefined);
  if (!hasValue) return;

  const payload: Record<string, unknown> = { plant_id: plantId, ...scores };

  await mutate(
    {
      type: 'scorePlant',
      optimistic: () => { },
      inverse: () => { },
      apply: () => callService('growspace_manager', 'score_plant', payload),
    },
    _growspaceIdFor(plantId),
  );
}

/**
 * Log a drying weight reading for a plant.
 *
 * Optimistic: none.
 * Apply: calls growspace_manager.log_drying_weight.
 * Inverse: no-op.
 */
export async function logDryingWeight(
  plantId: string,
  weightGrams: number,
  date?: string,
): Promise<void> {
  const payload: Record<string, unknown> = { plant_id: plantId, weight_grams: weightGrams };
  if (date) payload.date = date;

  await mutate(
    {
      type: 'logDryingWeight',
      optimistic: () => { },
      inverse: () => { },
      apply: () => callService('growspace_manager', 'log_drying_weight', payload),
    },
    _growspaceIdFor(plantId),
  );
}

/**
 * Log a substrate moisture reading for a plant.
 *
 * Optimistic: none.
 * Apply: calls growspace_manager.log_moisture_reading.
 * Inverse: no-op.
 */
export async function logMoistureReading(
  plantId: string,
  moisturePercent: number,
  date?: string,
): Promise<void> {
  const payload: Record<string, unknown> = { plant_id: plantId, moisture_percent: moisturePercent };
  if (date) payload.date = date;

  await mutate(
    {
      type: 'logMoistureReading',
      optimistic: () => { },
      inverse: () => { },
      apply: () => callService('growspace_manager', 'log_moisture_reading', payload),
    },
    _growspaceIdFor(plantId),
  );
}

/**
 * Attach or clear a visual tag on a plant.
 *
 * Optimistic: none.
 * Apply: calls growspace_manager.set_visual_tag.
 * Inverse: no-op.
 */
export async function setVisualTag(plantId: string, visualTag: string | null): Promise<void> {
  await mutate(
    {
      type: 'setVisualTag',
      optimistic: () => { },
      inverse: () => { },
      apply: () =>
        callService('growspace_manager', 'set_visual_tag', {
          plant_id: plantId,
          visual_tag: visualTag,
        }),
    },
    _growspaceIdFor(plantId),
  );
}
