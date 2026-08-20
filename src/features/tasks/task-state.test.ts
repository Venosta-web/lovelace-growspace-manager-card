import { describe, expect, it } from 'vitest';

import type { PlantEntity } from '../../types';
import { gridFromLayout, placementsFromPlants } from './task-state';

const plants = [
  { entity_id: 'sensor.one', attributes: { plant_id: 'one', row: 1, col: 1 } },
  { entity_id: 'sensor.two', attributes: { plant_id: 'two', row: 2, col: 3 } },
] as PlantEntity[];

describe('placementsFromPlants', () => {
  it('seeds the draft with 0-based indices from 1-based backend attributes', () => {
    expect(placementsFromPlants(plants)).toEqual({
      one: { row: 0, col: 0 },
      two: { row: 1, col: 2 },
    });
  });

  it('keeps a plant with missing position attributes inside the grid', () => {
    const orphan = [{ entity_id: 'sensor.x', attributes: { plant_id: 'x' } }] as PlantEntity[];
    expect(placementsFromPlants(orphan)).toEqual({ x: { row: 0, col: 0 } });
  });
});

describe('gridFromLayout', () => {
  it('renders the seeded layout in the cells the backend reported', () => {
    const grid = gridFromLayout(plants, 2, 3, placementsFromPlants(plants));

    expect(grid[0][0]).toBe(plants[0]);
    expect(grid[1][2]).toBe(plants[1]);
  });
});
