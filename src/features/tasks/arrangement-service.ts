import { z } from 'zod';

import { hassCall } from '../../services/hass-call';
import type { PlantLayout } from './task-state';

const PlantLayoutResponseSchema = z.object({
  growspace_id: z.string(),
  layout_revision: z.number().int().nonnegative(),
  placements: z.array(
    z.object({
      plant_id: z.string(),
      row: z.number().int().nonnegative(),
      col: z.number().int().nonnegative(),
    })
  ),
});

export type PlantLayoutResponse = z.infer<typeof PlantLayoutResponseSchema>;

export async function commitPlantLayout(
  growspaceId: string,
  expectedLayoutRevision: number,
  layout: PlantLayout
): Promise<PlantLayoutResponse> {
  return hassCall(
    'growspace_manager/set_plant_layout',
    {
      growspace_id: growspaceId,
      expected_layout_revision: expectedLayoutRevision,
      placements: Object.entries(layout).map(([plant_id, placement]) => ({
        plant_id,
        ...placement,
      })),
    },
    PlantLayoutResponseSchema
  );
}
