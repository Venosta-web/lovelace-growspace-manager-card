import type { GrowspaceViewMode, PlantEntity } from '../../types';

export type CardTaskKind = 'arrange' | 'compare' | 'select_plants';

export interface PlantPlacement {
  row: number;
  col: number;
}

export type PlantLayout = Record<string, PlantPlacement>;

export interface ArrangeTaskState {
  kind: 'arrange';
  previousViewMode: GrowspaceViewMode;
  expectedLayoutRevision: number;
  original: PlantLayout;
  draft: PlantLayout;
  pickedPlantId: string | null;
  status: 'editing' | 'saving' | 'stale';
  error: string | null;
}

export interface CompareTaskState {
  kind: 'compare';
  comparisonId: string | null;
  originalMetrics: string[];
  draftMetrics: string[];
  expectedRecordRevision: number;
  status: 'editing' | 'saving';
  error: string | null;
}

export interface SelectPlantsTaskState {
  kind: 'select_plants';
}

export type CardTaskState =
  | { kind: 'idle' }
  | ArrangeTaskState
  | CompareTaskState
  | SelectPlantsTaskState;

export function plantIdOf(plant: PlantEntity): string {
  return plant.attributes.plant_id || plant.entity_id.replace('sensor.', '');
}

export function placementsFromPlants(plants: PlantEntity[]): PlantLayout {
  return Object.fromEntries(
    plants.map((plant) => [
      plantIdOf(plant),
      { row: Number(plant.attributes.row), col: Number(plant.attributes.col) },
    ])
  );
}

export function layoutsEqual(left: PlantLayout, right: PlantLayout): boolean {
  const ids = Object.keys(left);
  return (
    ids.length === Object.keys(right).length &&
    ids.every((id) => left[id]?.row === right[id]?.row && left[id]?.col === right[id]?.col)
  );
}

export function gridFromLayout(
  plants: PlantEntity[],
  rows: number,
  cols: number,
  layout: PlantLayout
): (PlantEntity | null)[][] {
  const grid = Array.from({ length: rows }, () => Array<PlantEntity | null>(cols).fill(null));
  for (const plant of plants) {
    const placement = layout[plantIdOf(plant)];
    if (!placement) continue;
    if (placement.row < 0 || placement.row >= rows || placement.col < 0 || placement.col >= cols) {
      continue;
    }
    grid[placement.row][placement.col] = plant;
  }
  return grid;
}
