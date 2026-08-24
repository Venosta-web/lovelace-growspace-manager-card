import { z } from 'zod';

import { hassCall } from '../../services/hass-call';
import type { PlantLayout } from './task-state';

// Wire positions are 1-based; the card's grid indices are 0-based.
const PlantLayoutResponseSchema = z.object({
  growspace_id: z.string(),
  layout_revision: z.number().int().nonnegative(),
  placements: z.array(
    z.object({
      plant_id: z.string(),
      row: z.number().int().positive(),
      col: z.number().int().positive(),
    })
  ),
});

export type PlantLayoutResponse = z.infer<typeof PlantLayoutResponseSchema>;

/** Authoritative layout echoed by the backend, translated to 0-based grid indices. */
export interface CommittedPlantLayout {
  growspaceId: string;
  layoutRevision: number;
  layout: PlantLayout;
}

export async function commitPlantLayout(
  growspaceId: string,
  expectedLayoutRevision: number,
  layout: PlantLayout
): Promise<CommittedPlantLayout> {
  const response = await hassCall(
    'growspace_manager/set_plant_layout',
    {
      growspace_id: growspaceId,
      expected_layout_revision: expectedLayoutRevision,
      placements: Object.entries(layout).map(([plant_id, placement]) => ({
        plant_id,
        row: placement.row + 1,
        col: placement.col + 1,
      })),
    },
    PlantLayoutResponseSchema
  );

  return {
    growspaceId: response.growspace_id,
    layoutRevision: response.layout_revision,
    layout: Object.fromEntries(
      response.placements.map(({ plant_id, row, col }) => [
        plant_id,
        { row: row - 1, col: col - 1 },
      ])
    ),
  };
}
